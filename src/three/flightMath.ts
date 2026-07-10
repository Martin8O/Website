/**
 * Scroll-flight camera rig (E2) — pure, three-free, unit-tested. One in-code
 * Catmull-Rom path through the shared 3D world space: `scrollProgress` →
 * chapter `pos` → camera pose. The camera translates down the path as the
 * story scrolls (scroll = time = distance flown); scenes stop being
 * camera-space fields and become world-space places the camera flies through.
 *
 * Per-run easing lives in the STOP SPACING, not in a time warp: inside a
 * registered theme's scene window the camera advances exactly that theme's
 * `TRAVEL` distance (the E1 dolly — the depth read is identical, the motion
 * just belongs to the camera now), and it cruises between scenes. Catmull-Rom
 * through those stops C1-smooths the pace changes, and because every window
 * edge lands on the 0.5-pos stop grid, the travel across a window is EXACT.
 *
 * All of it derives from the SAME `runWindow` the 2D timeline uses, so the
 * flight can never disagree with the story about where a scene lives.
 */

import type { Theme } from '../data/chapters'
import { runWindow, type SceneRun } from '../canvas/sceneTimeline'

/** World units the camera travels THROUGH a registered theme's scene window.
 *  These are the E1 per-theme dolly distances verbatim. */
export const TRAVEL: Partial<Record<Theme, number>> = {
  origin: 5,
  contact: 8,
}

/** Cruise pace between 3D scenes, world units per chapter. */
export const CRUISE = 6

/** Stop grid in `pos` space. Must divide every window edge (edges sit on
 *  ±0.5-chapter boundaries), so pace is constant between adjacent stops and
 *  the cumulative travel at a window edge is exact. */
const STEP = 0.5

/** Gentle lateral weave — the "flight" in the flight path. Amplitudes and
 *  frequencies are picked so the worst-case yaw (max lateral slope over the
 *  SLOWEST pace, origin's ~3.33/chapter) stays ≤ ~8.5°, inside the padded
 *  star-cone slack (StarfieldSpec tanX/tanY carry the margin). */
const WEAVE_X_AMP = 0.6
const WEAVE_X_FREQ = 0.8
const WEAVE_X_PHASE = 0.7
const WEAVE_Y_AMP = 0.25
const WEAVE_Y_FREQ = 0.5
const WEAVE_Y_PHASE = 2.1

/** Bank into the turn: roll = −yaw × BANK_RATIO (a fraction of the heading
 *  change reads as wing-drop — subtle, never a horizon tilt). */
const BANK_RATIO = 0.6

export type FlightPath = {
  /** Stop spacing in `pos` units. */
  step: number
  /** xyz per stop; stop k sits at pos = k·step. z is cumulative −travel. */
  stops: Float32Array
  /** Chapter count — the pose domain is pos ∈ [0, count−1]. */
  count: number
}

/** A camera pose on the path: position, unit forward, and bank roll (rad). */
export type FlightPose = {
  x: number
  y: number
  z: number
  fx: number
  fy: number
  fz: number
  roll: number
}

export function createPose(): FlightPose {
  return { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: -1, roll: 0 }
}

/** Forward pace at `pos`, world units per chapter: a registered window's
 *  travel spread over its length, cruise everywhere else. */
export function paceAt(pos: number, runs: readonly SceneRun[], count: number): number {
  for (const run of runs) {
    const travel = TRAVEL[run.theme]
    if (travel === undefined) continue
    const [winStart, winEnd] = runWindow(run, count)
    if (winEnd > winStart && pos >= winStart && pos < winEnd) {
      return travel / (winEnd - winStart)
    }
  }
  return CRUISE
}

/** Bake the flight path for a story. Deterministic — pure function of the
 *  runs (same story, same flight). */
export function buildFlightPath(runs: readonly SceneRun[], count: number): FlightPath {
  const lastPos = Math.max(count - 1, 0)
  const n = Math.max(Math.round(lastPos / STEP), 0) + 1
  const stops = new Float32Array(n * 3)
  let z = 0
  for (let k = 0; k < n; k++) {
    const pos = k * STEP
    stops[k * 3] = WEAVE_X_AMP * Math.sin(pos * WEAVE_X_FREQ + WEAVE_X_PHASE)
    stops[k * 3 + 1] = WEAVE_Y_AMP * Math.sin(pos * WEAVE_Y_FREQ + WEAVE_Y_PHASE)
    stops[k * 3 + 2] = z
    // Pace is constant across [pos, pos+STEP) — its edges sit on the grid.
    if (k < n - 1) z -= paceAt(pos + STEP * 0.5, runs, count) * STEP
  }
  return { step: STEP, stops, count }
}

/** Uniform Catmull-Rom value + derivative on one axis. `t` in [0,1] across
 *  the segment; the derivative is per segment (divide by `step` for
 *  per-pos). Ends are clamped by index, so the curve passes through every
 *  stop and stays inside the baked corridor. */
function catmullRom(
  stops: Float32Array,
  axis: number,
  i0: number,
  i1: number,
  i2: number,
  i3: number,
  t: number,
): readonly [value: number, derivative: number] {
  const p0 = stops[i0 * 3 + axis]
  const p1 = stops[i1 * 3 + axis]
  const p2 = stops[i2 * 3 + axis]
  const p3 = stops[i3 * 3 + axis]
  const a = -p0 + 3 * p1 - 3 * p2 + p3
  const b = 2 * p0 - 5 * p1 + 4 * p2 - p3
  const c = -p0 + p2
  const value = 0.5 * (2 * p1 + c * t + b * t * t + a * t * t * t)
  const derivative = 0.5 * (c + 2 * b * t + 3 * a * t * t)
  return [value, derivative]
}

/**
 * Evaluate the camera pose at a chapter position. Allocation-free: writes
 * into `out` (the hot-path idiom — one pose object lives per caller).
 */
export function flightPoseAt(path: FlightPath, pos: number, out: FlightPose): FlightPose {
  const n = path.stops.length / 3
  const lastPos = (n - 1) * path.step
  const p = Math.min(Math.max(pos, 0), lastPos)
  const s = p / path.step
  let i = Math.floor(s)
  if (i >= n - 1) i = n - 2
  const t = s - i
  const i0 = Math.max(i - 1, 0)
  const i2 = Math.min(i + 1, n - 1)
  const i3 = Math.min(i + 2, n - 1)

  const [x, dx] = catmullRom(path.stops, 0, i0, i, i2, i3, t)
  const [y, dy] = catmullRom(path.stops, 1, i0, i, i2, i3, t)
  const [z, dz] = catmullRom(path.stops, 2, i0, i, i2, i3, t)
  out.x = x
  out.y = y
  out.z = z

  const len = Math.hypot(dx, dy, dz)
  if (len < 1e-9) {
    out.fx = 0
    out.fy = 0
    out.fz = -1
    out.roll = 0
    return out
  }
  out.fx = dx / len
  out.fy = dy / len
  out.fz = dz / len
  // Bank into lateral motion: yaw off the straight-ahead −z, signed by x.
  const yaw = Math.atan2(dx, Math.max(-dz, 1e-9))
  out.roll = -yaw * BANK_RATIO
  return out
}

/**
 * World anchor for a scene window: the pose at the window START, with the
 * forward replaced by the window's CHORD (start → end) — a volume spanning
 * the whole window wants one stable orientation, not the start tangent.
 * Allocates (called once per scene mount, never per frame).
 */
export function flightAnchorAt(
  path: FlightPath,
  winStart: number,
  winEnd: number,
  out: FlightPose,
): FlightPose {
  flightPoseAt(path, winStart, out)
  const end = createPose()
  flightPoseAt(path, winEnd, end)
  const cx = end.x - out.x
  const cy = end.y - out.y
  const cz = end.z - out.z
  const len = Math.hypot(cx, cy, cz)
  if (len > 1e-9) {
    out.fx = cx / len
    out.fy = cy / len
    out.fz = cz / len
  }
  out.roll = 0
  return out
}
