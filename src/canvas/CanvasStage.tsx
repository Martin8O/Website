import { useEffect, useRef } from 'react'
import { THEME_ACCENT, type Chapter } from '../data/chapters'
import { chapterPosition } from '../timeline'
import { getScrollProgress, setScrollProgress } from '../scroll/scrollStore'
import { RENDERERS } from './registry'
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
      const frame = resolveSceneFrame(chapterPosition(progress, count), runs, count)

      // Safety floor — scenes contract to paint opaque, but never flash white.
      ctx.fillStyle = '#06070a'
      ctx.fillRect(0, 0, w, h)
      if (frame) {
        drawSlot(frame.base, time)
        if (frame.incoming) drawSlot(frame.incoming, time)
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
    document.addEventListener('visibilitychange', onVisibility)
    media.addEventListener('change', onMedia)
    start()

    // Dev-only headless-verification hook: hidden tabs never fire rAF (and
    // the loop above stops on purpose), so tooling can set a scroll progress
    // and paint exactly one frame by hand. Stripped from prod builds.
    const hookHost = window as unknown as { __paintFrame?: (progress: number, ms: number) => void }
    if (import.meta.env.DEV) {
      hookHost.__paintFrame = (progress, ms) => {
        setScrollProgress(progress)
        needsPaint = true
        paint(ms)
      }
    }

    return () => {
      stop()
      if (import.meta.env.DEV) delete hookHost.__paintFrame
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      media.removeEventListener('change', onMedia)
    }
  }, [chapters])

  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
}
