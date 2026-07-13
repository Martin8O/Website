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
import * as THREE from 'three'
import { CHAPTER_WEIGHTS, type Chapter, type Theme } from '../data/chapters'
import { chapterPosition } from '../timeline'
import { getScrollProgress } from '../scroll/scrollStore'
import { buildRuns, resolveSceneFrame } from '../canvas/sceneTimeline'
import { RENDERERS_3D, type FlightRig } from './registry3d'
import { buildFlightPath, flightPoseAt, createPose } from './flightMath'
import { createFrame3D, writeSlot3D, type Frame3D } from './frame3d'
import { STAGE_FOV } from './scenes3d/Starfield'
import styles from './Stage3D.module.css'

/** Camera micro-parallax, world units at full pointer presence. A pure
 *  TRANSLATION (never a re-aim): near stars answer more than far ones —
 *  that difference IS the depth read. Applied along the camera's own
 *  right/up axes, so it composes with any flight heading. */
const PARALLAX_X = 0.55
const PARALLAX_Y = 0.4

export function Stage3D({ chapters }: { chapters: readonly Chapter[] }) {
  const frame = useRef(createFrame3D()).current
  const runs = useMemo(() => buildRuns(chapters), [chapters])
  // The shared world's flight rig (E2): one scroll-driven camera path, baked
  // once — every scene anchors its world-space volume on it.
  const flight = useMemo<FlightRig>(
    () => ({ path: buildFlightPath(runs, chapters.length), runs, count: chapters.length }),
    [runs, chapters.length],
  )
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
        // Real shadow maps for the hero beats (ballet noon rig, climb
        // morning key). MUST be the prop, not a scene effect: R3F's
        // configure() re-asserts `shadowMap.enabled = !!shadows` on every
        // Canvas re-render, silently switching off anything an effect set.
        // Costs nothing outside the beats — only their keys cast, and they
        // are culled/off with the scenes.
        shadows
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: false, powerPreference: 'high-performance' }}
        camera={{ fov: STAGE_FOV, near: 0.1, far: 130, position: [0, 0, 0] }}
      >
        <FrameController flight={flight} frame={frame} />
        {themes.map((theme) => {
          const Scene = RENDERERS_3D[theme]!
          return <Scene key={theme} theme={theme} frame={frame} flight={flight} />
        })}
      </Canvas>
    </div>
  )
}

// Hot-path scratch — module-level so the frame loop allocates nothing.
const _pose = createPose()
const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _rolledUp = new THREE.Vector3()
const _lookM = new THREE.Matrix4()
const _ZERO = new THREE.Vector3(0, 0, 0)
const _WORLD_UP = new THREE.Vector3(0, 1, 0)

/**
 * Resolves the scene timeline once per frame — priority −1, so every scene's
 * own useFrame reads a snapshot that is already this frame's truth — and
 * flies the camera: flight-path pose first (E2), then the pointer
 * micro-parallax as a translation along the pose's own right/up axes.
 */
function FrameController({ flight, frame }: { flight: FlightRig; frame: Frame3D }) {
  const { runs, count } = flight
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
    const pos = chapterPosition(getScrollProgress(), count, CHAPTER_WEIGHTS)
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

    // Ease the pointer with the 2D engine's constants.
    ptr.x += (ptr.tx - ptr.x) * 0.1
    ptr.y += (ptr.ty - ptr.y) * 0.1
    ptr.a += (ptr.ta - ptr.a) * 0.06
    frame.pointer.x = ptr.x
    frame.pointer.y = ptr.y
    frame.pointer.a = ptr.a

    // Fly the path: pose at this scroll position → shared snapshot + camera.
    flightPoseAt(flight.path, pos, _pose)
    frame.camera.x = _pose.x
    frame.camera.y = _pose.y
    frame.camera.z = _pose.z
    frame.camera.fx = _pose.fx
    frame.camera.fy = _pose.fy
    frame.camera.fz = _pose.fz
    frame.camera.roll = _pose.roll

    // Orientation from the pose alone (never from the parallax-offset eye —
    // the micro-parallax stays a pure translation): aim −z down the forward,
    // then bank by rolling the up vector around it.
    _fwd.set(_pose.fx, _pose.fy, _pose.fz)
    _right.crossVectors(_fwd, _WORLD_UP).normalize()
    _up.crossVectors(_right, _fwd)
    _rolledUp
      .copy(_up)
      .multiplyScalar(Math.cos(_pose.roll))
      .addScaledVector(_right, Math.sin(_pose.roll))
    _lookM.lookAt(_ZERO, _fwd, _rolledUp)
    state.camera.quaternion.setFromRotationMatrix(_lookM)

    const ox = (ptr.x - 0.5) * PARALLAX_X * ptr.a
    const oy = -(ptr.y - 0.5) * PARALLAX_Y * ptr.a
    state.camera.position.set(
      _pose.x + _right.x * ox + _up.x * oy,
      _pose.y + _right.y * ox + _up.y * oy,
      _pose.z + _right.z * ox + _up.z * oy,
    )
  }, -1)

  return null
}
