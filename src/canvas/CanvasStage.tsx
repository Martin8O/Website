import { useEffect, useRef } from 'react'
import { THEME_ACCENT, type Chapter } from '../data/chapters'
import { chapterPosition } from '../timeline'
import { getScrollProgress, setScrollProgress } from '../scroll/scrollStore'
import { RENDERERS } from './registry'
import { landingShake } from './scenes/sky/skyMath'
import { buildRuns, resolveSceneFrame, type SceneSlot } from './sceneTimeline'
import { makeGrainTile } from './toolkit'
import type { SceneConfig } from './types'
import styles from './CanvasStage.module.css'

/**
 * The one fixed 2D canvas behind the story — the whole visual world.
 *
 * One rAF loop: each frame it reads the global `scrollProgress` imperatively
 * (no React re-render per frame), resolves which scene(s) own the frame via
 * the pure scene timeline, and dispatches to the theme registry. Engine
 * duties: DPR-capped sizing (≤2), rebuild on resize, pause when the tab is
 * hidden, freeze ambient time under reduced motion (and skip repaints there
 * unless scroll moved), and a filmic grain pass over the composed frame.
 */
export function CanvasStage({ chapters }: { chapters: readonly Chapter[] }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const runs = buildRuns(chapters)
    const count = chapters.length
    const grain = ctx.createPattern(makeGrainTile(160), 'repeat')

    let w = 0
    let h = 0
    let rafId = 0
    let needsPaint = true
    let lastProgress = -1
    let lastShakeX = 0
    let lastShakeY = 0

    // Pointer channel (B3b): scenes are pure, so the smoothing lives here —
    // the target updates on pointermove, and every painted frame eases the
    // published position/presence toward it. Presence `a` fades in on the
    // first move and back out on leave/blur (and on touch lift), so scenes
    // can scale their pointer response by one scalar.
    let ptrTX = 0
    let ptrTY = 0
    let ptrTA = 0
    let ptrX = 0
    let ptrY = 0
    let ptrA = 0
    const onPointerMove = (e: PointerEvent) => {
      ptrTX = e.clientX
      ptrTY = e.clientY
      if (ptrTA === 0 && ptrA < 0.01) {
        // Arriving from nothing: snap the position, ease only the presence.
        ptrX = ptrTX
        ptrY = ptrTY
      }
      ptrTA = 1
    }
    const onPointerGone = () => {
      ptrTA = 0
    }
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') ptrTA = 0
    }

    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    let reducedMotion = media.matches
    const onMedia = () => {
      reducedMotion = media.matches
      needsPaint = true
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      // Scenes draw in CSS px; the transform owns the DPR scale.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      needsPaint = true
    }

    const drawSlot = (slot: SceneSlot, time: number) => {
      const cfg: SceneConfig = {
        w,
        h,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        accent: THEME_ACCENT[slot.run.theme],
        sky: slot.run.sky,
        tRaw: slot.tRaw,
        reducedMotion,
        pointer: { x: ptrX, y: ptrY, a: reducedMotion ? 0 : ptrA },
      }
      RENDERERS[slot.run.theme](ctx, slot.alpha, slot.t, time, cfg)
    }

    const paint = (now: number) => {
      const progress = getScrollProgress()
      // Static under reduced motion → repaint only when scroll actually moved.
      if (reducedMotion && !needsPaint && progress === lastProgress) return
      needsPaint = false
      lastProgress = progress

      const time = reducedMotion ? 0 : now / 1000
      if (!reducedMotion) {
        ptrX += (ptrTX - ptrX) * 0.1
        ptrY += (ptrTY - ptrY) * 0.1
        ptrA += (ptrTA - ptrA) * 0.06
      }
      const frame = resolveSceneFrame(chapterPosition(progress, count), runs, count)

      // Safety floor — scenes contract to paint opaque, but never flash white.
      ctx.fillStyle = '#06070a'
      ctx.fillRect(0, 0, w, h)
      if (frame) {
        drawSlot(frame.base, time)
        if (frame.incoming) drawSlot(frame.incoming, time)
      }

      // The B2.3d overhead pass rocks the DOM text along with the canvas —
      // the cards live outside the canvas, so the same shake signal rides
      // two CSS variables (zeroed the instant the window closes; always
      // still under reduced motion).
      let shakeX = 0
      let shakeY = 0
      if (!reducedMotion && frame) {
        const sunsetSlot =
          frame.incoming?.run.sky === 'sunset'
            ? frame.incoming
            : frame.base.run.sky === 'sunset'
              ? frame.base
              : null
        if (sunsetSlot) {
          const s = landingShake(sunsetSlot.t, time)
          const amp = Math.min(w, h) * 0.011
          shakeX = s.x * amp
          shakeY = s.y * amp
        }
      }
      if (shakeX !== lastShakeX || shakeY !== lastShakeY) {
        lastShakeX = shakeX
        lastShakeY = shakeY
        const rs = document.documentElement.style
        rs.setProperty('--cam-shake-x', `${shakeX.toFixed(2)}px`)
        rs.setProperty('--cam-shake-y', `${shakeY.toFixed(2)}px`)
      }

      if (grain) {
        const jitter = reducedMotion ? 0 : Math.floor(now / 120)
        const ox = (jitter * 53) % 160
        const oy = (jitter * 97) % 160
        ctx.save()
        ctx.translate(-ox, -oy)
        ctx.globalAlpha = 0.05
        ctx.globalCompositeOperation = 'overlay'
        ctx.fillStyle = grain
        ctx.fillRect(0, 0, w + 160, h + 160)
        ctx.restore()
      }
    }

    const loop = (now: number) => {
      paint(now)
      rafId = requestAnimationFrame(loop)
    }
    const start = () => {
      if (rafId === 0) rafId = requestAnimationFrame(loop)
    }
    const stop = () => {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    const onVisibility = () => {
      if (document.hidden) {
        stop()
      } else {
        needsPaint = true
        start()
      }
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerGone, { passive: true })
    window.addEventListener('blur', onPointerGone)
    document.documentElement.addEventListener('pointerleave', onPointerGone)
    document.addEventListener('visibilitychange', onVisibility)
    media.addEventListener('change', onMedia)
    start()

    // Dev-only headless-verification hook: hidden tabs never fire rAF (and
    // the loop above stops on purpose), so tooling can set a scroll progress
    // and paint exactly one frame by hand — optionally with a settled
    // pointer at (px, py). Stripped from prod builds.
    const hookHost = window as unknown as {
      __paintFrame?: (progress: number, ms: number, px?: number, py?: number) => void
    }
    if (import.meta.env.DEV) {
      hookHost.__paintFrame = (progress, ms, px, py) => {
        setScrollProgress(progress)
        if (px !== undefined && py !== undefined) {
          ptrX = ptrTX = px
          ptrY = ptrTY = py
          ptrA = ptrTA = 1
        }
        needsPaint = true
        paint(ms)
      }
    }

    return () => {
      stop()
      if (import.meta.env.DEV) delete hookHost.__paintFrame
      document.documentElement.style.removeProperty('--cam-shake-x')
      document.documentElement.style.removeProperty('--cam-shake-y')
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerGone)
      window.removeEventListener('blur', onPointerGone)
      document.documentElement.removeEventListener('pointerleave', onPointerGone)
      document.removeEventListener('visibilitychange', onVisibility)
      media.removeEventListener('change', onMedia)
    }
  }, [chapters])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}
