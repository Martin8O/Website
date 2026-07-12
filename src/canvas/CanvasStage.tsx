import { useEffect, useRef } from 'react'
import { THEME_ACCENT, type Chapter } from '../data/chapters'
import { chapterPosition } from '../timeline'
import { CHAPTER_WEIGHTS } from '../data/chapters'
import { getScrollProgress, setScrollProgress } from '../scroll/scrollStore'
import { paints2D, paintsHero2D } from '../three/owned3d'
import type { WorldMode } from '../three/worldMode'
import { getGlassCanvas } from './glass'
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
 *
 * `worldMode` (E2): themes in the 3D layer's `OWNED_3D` set are skipped here
 * while the mode is '3d' — read through a ref so a mode flip never re-inits
 * the render loop. In '2d' mode this stage paints everything, always.
 */
export function CanvasStage({
  chapters,
  worldMode = '2d',
}: {
  chapters: readonly Chapter[]
  worldMode?: WorldMode
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const modeRef = useRef(worldMode)
  modeRef.current = worldMode

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
    let lastParX = ''
    let lastParY = ''

    // Cockpit glass (see glass.ts): the overlay canvas mounts on its own
    // schedule (Suspense), so it is picked up and sized lazily per frame.
    let glassCtx: CanvasRenderingContext2D | null = null
    let glassFor: HTMLCanvasElement | null = null
    let glassW = 0
    let glassH = 0
    let glassDirty = false
    const ensureGlass = (): CanvasRenderingContext2D | null => {
      const el = getGlassCanvas()
      if (!el) {
        glassCtx = null
        glassFor = null
        return null
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (el !== glassFor) {
        glassFor = el
        glassCtx = el.getContext('2d')
        glassW = 0
      }
      if (glassCtx && (glassW !== w || glassH !== h)) {
        glassW = w
        glassH = h
        el.width = Math.round(w * dpr)
        el.height = Math.round(h * dpr)
        glassCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
      }
      return glassCtx
    }

    // Scroll-velocity gate for trembling beats (the landing shake): eases
    // to 1 while the story is actually moving and back to 0 on a parked
    // frame — a wheel stop can land ANYWHERE on the pixel grid, so a
    // t-anchored window alone can never keep a shake off a parked frame
    // (Martin: the near-black screen must never hang there trembling).
    let shakeGate = 0
    let gateProgress = -1

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
      // Floor at 1px: a 0-sized viewport (hidden embed, minimized restore)
      // would give scenes degenerate geometry — a thrown frame kills the loop.
      w = Math.max(1, window.innerWidth)
      h = Math.max(1, window.innerHeight)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      // Scenes draw in CSS px; the transform owns the DPR scale.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      glassW = 0 // re-size the glass on the next frame (DPR may have changed)
      needsPaint = true
    }

    const drawSlot = (
      slot: SceneSlot,
      time: number,
      glass: CanvasRenderingContext2D | null,
      cover: number,
    ) => {
      // A 3D-owned theme's frame belongs to the Stage3D layer (empty set
      // today — the explicit flip mechanism, see owned3d.ts).
      if (!paints2D(slot.run.theme, modeRef.current)) return
      const cfg: SceneConfig = {
        w,
        h,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        accent: THEME_ACCENT[slot.run.theme],
        sky: slot.run.sky,
        tRaw: slot.tRaw,
        reducedMotion,
        // Hero-level flip (E3b): true only while the 3D hero scene is LIVE —
        // until the models are decoded (and again if the layer unmounts) the
        // 2D hero keeps flying, so the story never shows a hole.
        hero3d: !paintsHero2D(slot.run.sky, modeRef.current),
        pointer: { x: ptrX, y: ptrY, a: reducedMotion ? 0 : ptrA },
        glass: glass ?? undefined,
        cover,
        shakeGate: reducedMotion ? 0 : shakeGate,
      }
      RENDERERS[slot.run.theme](ctx, slot.alpha, slot.t, time, cfg)
      // The glass carries content only while a sky scene paints its HUD —
      // mark it for a wipe so nothing lingers once the section is left.
      if (glass && slot.run.theme === 'sky') glassDirty = true
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

      // The shake gate follows the actual scroll velocity: near-INSTANT to
      // rise when the story moves (a glide through the narrow blink must
      // shake at full strength from its first frame — Martin), easing out
      // over ~half a second once parked.
      if (gateProgress < 0) gateProgress = progress
      const gateTarget = Math.min(1, Math.abs(progress - gateProgress) / 0.00005)
      gateProgress = progress
      shakeGate += (gateTarget - shakeGate) * (gateTarget > shakeGate ? 0.8 : 0.08)
      if (shakeGate < 0.001) shakeGate = 0

      const frame = resolveSceneFrame(chapterPosition(progress, count, CHAPTER_WEIGHTS), runs, count)

      // Cockpit glass: wiped whenever the last frame left symbology on it,
      // then handed to the scenes below the frame's slots.
      const glass = ensureGlass()
      if (glass && glassDirty) {
        glass.clearRect(0, 0, w, h)
        glassDirty = false
      }

      // Safety floor — scenes contract to paint opaque, but never flash white.
      ctx.fillStyle = '#06070a'
      ctx.fillRect(0, 0, w, h)
      if (frame) {
        drawSlot(frame.base, time, glass, frame.incoming?.alpha ?? 0)
        if (frame.incoming) drawSlot(frame.incoming, time, glass, 0)
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
          // Gated by scroll velocity — a parked frame never trembles.
          const amp = Math.min(w, h) * 0.011 * shakeGate
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

      // C4 micro-parallax: the text cards drift a few px AGAINST the pointer
      // (the world underneath answers it in the scenes, so the layers read
      // as depth). Rides the same eased pointer channel; presence `ptrA`
      // fades it out on leave/touch, reduced motion never enters. Quantised
      // to 0.1 px so the style write only happens when the eye could tell.
      let parX = '0.0'
      let parY = '0.0'
      if (!reducedMotion && w > 0 && h > 0) {
        parX = ((ptrX / w - 0.5) * ptrA * -9).toFixed(1)
        parY = ((ptrY / h - 0.5) * ptrA * -7).toFixed(1)
      }
      if (parX !== lastParX || parY !== lastParY) {
        lastParX = parX
        lastParY = parY
        const rs = document.documentElement.style
        rs.setProperty('--par-x', `${parX}px`)
        rs.setProperty('--par-y', `${parY}px`)
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
      document.documentElement.style.removeProperty('--par-x')
      document.documentElement.style.removeProperty('--par-y')
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
