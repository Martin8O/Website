/**
 * Jet-hero choreography (E3) — pure, three-free, unit-tested. Every fly-by in
 * the pilot arc is a spec here: a Catmull-Rom path in ANCHOR-LOCAL space (the
 * scene window's own frame — x right, y up, −z down the window chord the
 * camera flies along), a presence window in the run's localT, roll keyframes,
 * and a trail spec. Everything derives from scroll (`tRaw`) — scroll = time;
 * scrubbing backwards rewinds a pass, exactly like every 2D beat.
 *
 * The windows encode the story's HARD GATES: the sunset farewell is gone
 * before the belly sweep blacks the screen (0.53); airshow passes finish
 * before the 2D farewell flares (tRaw 0.995+); desert has NO flights —
 * Martin wasn't flying at Bagram, the empty sky is the point. The CLIMB has
 * no parametric passes at all: its heroes are the real GLB aircraft of the
 * authored Part-1 sequence (`climbMath.ts` / `ClimbHeroes`, E3b).
 */

import type { Sky } from '../data/chapters'
import { clamp01, smoothstep } from '../canvas/toolkit'
import type { FlightPose } from './flightMath'
import type { JetVariant } from './jetGeometry'

export type JetTrailSpec = {
  /** sRGB hex, fed raw (the `flat` stage matches 2D CSS hexes). */
  color: string
  /** Ribbon half-width at the head, world units. */
  width: number
  /** Trail length behind the head, in path-progress units (0..1). */
  len: number
  /** Peak opacity. */
  alpha: number
  /** How much the ribbon widens as it ages (× width). */
  grow: number
}

export type JetFlightSpec = {
  id: string
  variant: JetVariant
  /** World-unit length of the jet. */
  size: number
  /** Presence window in the run's UNCLAMPED localT (tRaw) — may run past 1
   *  to ride a cross-fade, like the 2D airshow display does. */
  window: readonly [number, number]
  fadeIn: number
  fadeOut: number
  /** Anchor-local Catmull-Rom stops the jet flies through. */
  stops: ReadonlyArray<readonly [number, number, number]>
  /** Roll keyframes [pathProgress, radians], piecewise-lerped. */
  roll?: ReadonlyArray<readonly [number, number]>
  trail?: JetTrailSpec
  /** Ambient-bob phase offset (time-driven wobble, story stays scroll-only). */
  phase: number
}

/** 2D display-smoke hexes (airshow.ts) — the 3D pair streams the same pair. */
const SMOKE_WHITE = '#fbfbf8'
const SMOKE_RED = '#e0483f'

/**
 * The choreography. Screen zones are chosen against the 2D scenes' focal
 * points (the 2D hero flies center-left in climb, center in cruise, over the
 * runway in airshow, pinned center in sunset) — the 3D passes live in the
 * depth axis the 2D cannot use, never on top of the painted hero.
 */
export const JET_FLIGHTS: Partial<Record<Sky, readonly JetFlightSpec[]>> = {
  // climb: intentionally ABSENT — the climb's heroes are the REAL GLB
  // aircraft of the authored Part-1 sequence (climbMath / ClimbHeroes,
  // E3b): Ulla → Z-142 → L-39 own that whole window, so no parametric
  // pass may share the sky with them.
  cruise: [
    // The wingman holding loose echelon off the right wing — he keeps the
    // camera's pace (his path parallels the chord), then breaks away down
    // and right as the chapter ends. THE formation-depth read of the arc.
    {
      id: 'cruise-wingman',
      variant: 'l159',
      size: 0.95,
      window: [0.1, 0.88],
      fadeIn: 0.08,
      fadeOut: 0.07,
      // LEFT echelon — the chapter card is right-aligned; the wingman keeps
      // the free left half and breaks away down and out as the run ends.
      stops: [
        [-2.3, -0.4, -2.9],
        [-2.25, -0.35, -5.1],
        [-2.2, -0.4, -7.4],
        [-2.9, -0.9, -9.3],
        [-4.2, -1.9, -11.0],
      ],
      roll: [
        [0, 0],
        [0.6, -0.04],
        [0.78, -0.55],
        [1, -0.95],
      ],
      trail: { color: '#e6eefb', width: 0.05, len: 0.5, alpha: 0.45, grow: 1.2 },
      phase: 2.4,
    },
  ],
  // desert: intentionally ABSENT — liaison officer, not flying (facts §3).
  airshow: [
    // The head-on split pass: the display pair comes out of the deep sky and
    // splits AROUND the camera — the beat the flat 2D display physically
    // cannot do. Lead streams white, wingman red (the 2D display's smoke
    // hexes), one full roll closing in, done before the farewell flares.
    {
      id: 'airshow-lead',
      variant: 'l159',
      size: 0.9,
      window: [0.3, 0.64],
      fadeIn: 0.04,
      fadeOut: 0.05,
      stops: [
        [-0.5, 0.9, -24],
        [-1.0, 0.7, -13],
        [-1.9, 0.5, -5.5],
        [-2.9, 0.55, 1.5],
      ],
      roll: [
        [0.15, 0],
        [0.5, Math.PI * 2],
        [1, Math.PI * 2],
      ],
      trail: { color: SMOKE_WHITE, width: 0.15, len: 0.55, alpha: 0.85, grow: 2.0 },
      phase: 0.9,
    },
    {
      id: 'airshow-wing',
      variant: 'l159',
      size: 0.9,
      window: [0.32, 0.66],
      fadeIn: 0.04,
      fadeOut: 0.05,
      stops: [
        [0.6, 1.1, -25],
        [1.1, 0.85, -14],
        [2.0, 0.6, -6],
        [3.0, 0.6, 1.2],
      ],
      roll: [
        [0.15, 0],
        [0.5, -Math.PI * 2],
        [1, -Math.PI * 2],
      ],
      trail: { color: SMOKE_RED, width: 0.15, len: 0.55, alpha: 0.8, grow: 2.0 },
      phase: 3.8,
    },
  ],
  sunset: [
    // Two jets receding toward the setting sun — the farewell. Long, thin,
    // warm contrails; tiny by design; gone before the landing takes the
    // frame (belly sweep at 0.53 → both end ≤ 0.5). The window starts where
    // the sunset scene actually ENTERS the frame (its enterFade holds it
    // back to tRaw ≈ 0.26 — an earlier window would never be seen).
    {
      id: 'sunset-lead',
      variant: 'l159',
      size: 0.6,
      window: [0.28, 0.48],
      fadeIn: 0.07,
      fadeOut: 0.08,
      stops: [
        [2.6, 0.6, -3.2],
        [5.5, 1.7, -12],
        [9.5, 3.1, -24],
      ],
      trail: { color: '#ffe2b8', width: 0.03, len: 0.95, alpha: 0.5, grow: 1.6 },
      phase: 1.2,
    },
    {
      id: 'sunset-wing',
      variant: 'l159',
      size: 0.55,
      window: [0.3, 0.5],
      fadeIn: 0.07,
      fadeOut: 0.08,
      stops: [
        [3.2, 0.4, -4.4],
        [6.1, 1.5, -13.2],
        [10.1, 2.9, -25.2],
      ],
      trail: { color: '#ffd9a0', width: 0.026, len: 0.95, alpha: 0.45, grow: 1.6 },
      phase: 4.6,
    },
  ],
}

/** Presence envelope over the run's tRaw: eased in/out inside the window,
 *  exactly zero outside it. */
export function flightEnvelope(spec: JetFlightSpec, t: number): number {
  const [t0, t1] = spec.window
  return smoothstep(t0, t0 + spec.fadeIn, t) * (1 - smoothstep(t1 - spec.fadeOut, t1, t))
}

/** Path progress 0..1 through the flight window (clamped — a faded-out jet
 *  parks at its path end). */
export function flightProgress(spec: JetFlightSpec, t: number): number {
  const [t0, t1] = spec.window
  if (t1 <= t0) return 0
  return clamp01((t - t0) / (t1 - t0))
}

/** Uniform Catmull-Rom value+derivative on one axis over the spec's stops —
 *  the flightMath curve shape, self-contained so the camera path stays
 *  untouched. Ends clamp by index (the curve passes through every stop). */
function cr(
  stops: JetFlightSpec['stops'],
  axis: number,
  i: number,
  t: number,
): readonly [number, number] {
  const n = stops.length
  const p0 = stops[Math.max(i - 1, 0)][axis]
  const p1 = stops[i][axis]
  const p2 = stops[Math.min(i + 1, n - 1)][axis]
  const p3 = stops[Math.min(i + 2, n - 1)][axis]
  const a = -p0 + 3 * p1 - 3 * p2 + p3
  const bb = 2 * p0 - 5 * p1 + 4 * p2 - p3
  const c = -p0 + p2
  return [
    0.5 * (2 * p1 + c * t + bb * t * t + a * t * t * t),
    0.5 * (c + 2 * bb * t + 3 * a * t * t),
  ]
}

/** Roll at path progress `s` from the spec's keyframes (piecewise lerp). */
export function rollAt(spec: JetFlightSpec, s: number): number {
  const keys = spec.roll
  if (!keys || keys.length === 0) return 0
  if (s <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    if (s <= keys[i][0]) {
      const [s0, r0] = keys[i - 1]
      const [s1, r1] = keys[i]
      const f = s1 > s0 ? (s - s0) / (s1 - s0) : 1
      return r0 + (r1 - r0) * f
    }
  }
  return keys[keys.length - 1][1]
}

/** Evaluate the jet's pose at path progress `s` (0..1): anchor-local
 *  position, unit forward down the path tangent, roll from the keyframes.
 *  Allocation-free — writes into `out`. */
export function jetPoseAt(spec: JetFlightSpec, s: number, out: FlightPose): FlightPose {
  const n = spec.stops.length
  const u = clamp01(s) * (n - 1)
  let i = Math.floor(u)
  if (i >= n - 1) i = n - 2
  const t = u - i
  const [x, dx] = cr(spec.stops, 0, i, t)
  const [y, dy] = cr(spec.stops, 1, i, t)
  const [z, dz] = cr(spec.stops, 2, i, t)
  out.x = x
  out.y = y
  out.z = z
  const len = Math.hypot(dx, dy, dz)
  if (len < 1e-9) {
    out.fx = 0
    out.fy = 0
    out.fz = -1
  } else {
    out.fx = dx / len
    out.fy = dy / len
    out.fz = dz / len
  }
  out.roll = rollAt(spec, s)
  return out
}

export type RibbonBuffers = {
  /** Path centre per vertex (2 verts per sample). */
  centers: Float32Array
  /** Unit path tangent per vertex. */
  tangents: Float32Array
  /** Path progress per vertex (0..1) — the shader reveals aT ≤ uHead. */
  ts: Float32Array
  /** ±1 ribbon side per vertex. */
  sides: Float32Array
  indices: Uint16Array
}

/** Bake the trail ribbon along the WHOLE flight path (2 × samples vertices,
 *  a triangle strip as indexed triangles). The head-reveal + age-fade live in
 *  the shader off `uHead`, so the bake is static and scrub-safe. */
export function bakeRibbon(spec: JetFlightSpec, samples = 96): RibbonBuffers {
  const centers = new Float32Array(samples * 2 * 3)
  const tangents = new Float32Array(samples * 2 * 3)
  const ts = new Float32Array(samples * 2)
  const sides = new Float32Array(samples * 2)
  const indices = new Uint16Array((samples - 1) * 6)
  const pose: FlightPose = { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: -1, roll: 0 }
  for (let i = 0; i < samples; i++) {
    const s = i / (samples - 1)
    jetPoseAt(spec, s, pose)
    for (let v = 0; v < 2; v++) {
      const j = (i * 2 + v) * 3
      centers[j] = pose.x
      centers[j + 1] = pose.y
      centers[j + 2] = pose.z
      tangents[j] = pose.fx
      tangents[j + 1] = pose.fy
      tangents[j + 2] = pose.fz
      ts[i * 2 + v] = s
      sides[i * 2 + v] = v === 0 ? 1 : -1
    }
    if (i < samples - 1) {
      const a = i * 2
      const k = i * 6
      indices[k] = a
      indices[k + 1] = a + 1
      indices[k + 2] = a + 2
      indices[k + 3] = a + 1
      indices[k + 4] = a + 3
      indices[k + 5] = a + 2
    }
  }
  return { centers, tangents, ts, sides, indices }
}
