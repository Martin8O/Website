/**
 * The 3D augmentation stage (L2 / E1) — a transparent R3F canvas riding one
 * layer ABOVE the 2D world and still under every DOM layer. The 2D stage
 * keeps painting every scene (it is the fallback by design); this layer adds
 * true depth for the themes registered in `RENDERERS_3D`.
 *
 * Engine duties mirror `CanvasStage`: DPR capped at 2, zero per-frame React
 * (the frame controller reads `scrollProgress` imperatively and mutates one
 * shared snapshot), the same eased-pointer semantics, and `flat` rendering
 * (no tone mapping) so shader hexes match the 2D palette exactly. Mounted
 * ONLY when `useWorldMode()` says '3d' — reduced motion / no WebGL2 /
 * `?world=2d` never even fetch this chunk.
 */

import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Chapter, Theme } from '../data/chapters'
import { chapterPosition } from '../timeline'
import { getScrollProgress } from '../scroll/scrollStore'
import { buildRuns, resolveSceneFrame, type SceneRun } from '../canvas/sceneTimeline'
import { RENDERERS_3D } from './registry3d'
import { createFrame3D, writeSlot3D, type Frame3D } from './frame3d'
import { STAGE_FOV } from './scenes3d/Starfield'
import styles from './Stage3D.module.css'

/** Camera micro-parallax, world units at full pointer presence. A pure
 *  TRANSLATION (never a re-aim): near stars answer more than far ones —
 *  that difference IS the depth read. */
const PARALLAX_X = 0.55
const PARALLAX_Y = 0.4

export function Stage3D({ chapters }: { chapters: readonly Chapter[] }) {
  const frame = useRef(createFrame3D()).current
  const runs = useMemo(() => buildRuns(chapters), [chapters])
  // One scene instance per REGISTERED theme present in the story — themes
  // mapped to null are carried by the 2D world alone.
  const themes = useMemo(() => {
    const seen: Theme[] = []
    for (const run of runs) {
      if (RENDERERS_3D[run.theme] && !seen.includes(run.theme)) seen.push(run.theme)
    }
    return seen
  }, [runs])

  return (
    <div className={styles.stage} aria-hidden="true">
      <Canvas
        // No tone mapping: additive star hexes must match the 2D CSS palette.
        flat
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: STAGE_FOV, near: 0.1, far: 130, position: [0, 0, 0] }}
      >
        <FrameController runs={runs} count={chapters.length} frame={frame} />
        {themes.map((theme) => {
          const Scene = RENDERERS_3D[theme]!
          return <Scene key={theme} theme={theme} frame={frame} />
        })}
      </Canvas>
    </div>
  )
}

/**
 * Resolves the scene timeline once per frame — priority −1, so every scene's
 * own useFrame reads a snapshot that is already this frame's truth — and owns
 * the pointer channel + camera micro-parallax.
 */
function FrameController({
  runs,
  count,
  frame,
}: {
  runs: readonly SceneRun[]
  count: number
  frame: Frame3D
}) {
  // Pointer channel — the CanvasStage semantics: target on move, presence
  // fades in on arrival / out on leave, blur and touch lift; positions are
  // viewport-normalized so no resize handling is needed.
  const ptr = useRef({ tx: 0.5, ty: 0.5, ta: 0, x: 0.5, y: 0.5, a: 0 }).current

  // Dev-only verification hook (the __paintFrame idiom): tooling reads the
  // live frame snapshot to assert the 3D layer tracks the 2D timeline.
  // Stripped from prod builds.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const host = window as unknown as { __frame3d?: Frame3D }
    host.__frame3d = frame
    return () => {
      delete host.__frame3d
    }
  }, [frame])

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      ptr.tx = e.clientX / Math.max(window.innerWidth, 1)
      ptr.ty = e.clientY / Math.max(window.innerHeight, 1)
      if (ptr.ta === 0 && ptr.a < 0.01) {
        // Arriving from nothing: snap the position, ease only the presence.
        ptr.x = ptr.tx
        ptr.y = ptr.ty
      }
      ptr.ta = 1
    }
    const onPointerGone = () => {
      ptr.ta = 0
    }
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') ptr.ta = 0
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerup', onPointerUp, { passive: true })
    window.addEventListener('pointercancel', onPointerGone, { passive: true })
    window.addEventListener('blur', onPointerGone)
    document.documentElement.addEventListener('pointerleave', onPointerGone)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerGone)
      window.removeEventListener('blur', onPointerGone)
      document.documentElement.removeEventListener('pointerleave', onPointerGone)
    }
  }, [ptr])

  useFrame((state) => {
    const pos = chapterPosition(getScrollProgress(), count)
    const resolved = resolveSceneFrame(pos, runs, count)
    frame.pos = pos
    frame.time = state.clock.elapsedTime
    let n = 0
    if (resolved) {
      writeSlot3D(frame.slots[0], resolved.base)
      n = 1
      if (resolved.incoming) {
        writeSlot3D(frame.slots[1], resolved.incoming)
        n = 2
      }
    }
    frame.count = n

    // Ease the pointer with the 2D engine's constants, then sway the camera.
    ptr.x += (ptr.tx - ptr.x) * 0.1
    ptr.y += (ptr.ty - ptr.y) * 0.1
    ptr.a += (ptr.ta - ptr.a) * 0.06
    frame.pointer.x = ptr.x
    frame.pointer.y = ptr.y
    frame.pointer.a = ptr.a

    state.camera.position.x = (ptr.x - 0.5) * PARALLAX_X * ptr.a
    state.camera.position.y = -(ptr.y - 0.5) * PARALLAX_Y * ptr.a
  }, -1)

  return null
}
