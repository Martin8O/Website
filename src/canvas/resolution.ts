/**
 * Adaptive resolution for the 2D world canvas — pure logic, no DOM.
 *
 * Some browsers raster the 2D canvas largely on the CPU, where the cost of a
 * frame scales with the number of device pixels. On a large high-DPI screen
 * that can drop the story well under its frame rate on otherwise fast
 * hardware. The engine starts at the full (≤ 2) device ratio and, only if the
 * frame pace stays slow for a sustained window, steps the world canvas down —
 * the painted environments are soft gradients and glows, so a lower backing
 * resolution reads as near-identical while the frame cost falls roughly with
 * the pixel count. The 3D layer follows the same step (its canvas ratio, and
 * its shadow maps from the first step); the glass HUD keeps full resolution.
 *
 * Measures behaviour, never claims (the runtime FPS watchdog idiom): no
 * browser sniffing, and a capable device — or one whose frame rate is merely
 * capped — never sees a change.
 */

/** Backing-store scale relative to the capped device ratio, per step. */
export const RES_STEPS = [1, 0.75, 0.625] as const

/** A frame slower than this counts as slow (≈ under 45 fps; a 48 Hz panel's
 *  20.8 ms stays clear of it). */
export const PACE_SLOW_MS = 22
/** A device whose best window ran this slow or slower is treated as frame-
 *  rate CAPPED (Low Power Mode holds 30 fps): it only counts as slow when it
 *  falls clearly below that cap (PACE_CADENCE_SLACK). Lowering the resolution
 *  of a steady capped rate would only soften the image. A faster best — any
 *  normal display rate — keeps the plain threshold, so a device that runs the
 *  opening smoothly and then sinks into the heavier chapters always qualifies. */
export const PACE_CAP_MS = 30
export const PACE_CADENCE_SLACK = 1.25
/** Hero-build frames are excused (loading, not rendering) — but only up to
 *  this much excused time per visit, so a background build that never settles
 *  can delay the judgement, never disable it (the FPS-watchdog budget). */
export const PACE_EXCUSE_BUDGET_MS = 15000
/** Frames per judging window. */
export const PACE_WINDOW = 90
/** Share of slow frames in a window that triggers a step down. */
export const PACE_SLOW_SHARE = 0.6
/** Frames ignored after start (mount, first paints, lazy chunks). */
export const PACE_WARMUP = 90
/** A gap longer than this is a pause (tab-away, stopped loop), not a slow frame. */
export const PACE_MAX_DT_MS = 250

/** The world canvas's effective device ratio: the device ratio capped at 2,
 *  scaled by the current step, never below 1 (a sub-1 backing store would
 *  blur below even a standard-density screen). */
export function canvasDpr(deviceDpr: number, step: number): number {
  const cap = Math.min(deviceDpr || 1, 2)
  const scale = RES_STEPS[Math.max(0, Math.min(step, RES_STEPS.length - 1))]
  return Math.max(1, cap * scale)
}

/** Whether stepping down from `step` would actually lower the resolution. */
export function canStepDown(deviceDpr: number, step: number): boolean {
  return step < RES_STEPS.length - 1 && canvasDpr(deviceDpr, step + 1) < canvasDpr(deviceDpr, step)
}

export interface PaceState {
  warm: number
  frames: number
  /** This window's frame intervals (judged when it closes). */
  dts: Float32Array
  /** The device's cadence: the fastest window median seen so far (ms). */
  cadence: number
  /** Excused (hero-build) time spent so far (ms). */
  excusedMs: number
}

export function createPace(): PaceState {
  return { warm: 0, frames: 0, dts: new Float32Array(PACE_WINDOW), cadence: Infinity, excusedMs: 0 }
}

/** The slow-frame threshold for a device with this best cadence. */
export function paceLimit(cadence: number): number {
  return cadence >= PACE_CAP_MS ? cadence * PACE_CADENCE_SLACK : PACE_SLOW_MS
}

/**
 * Feeds one frame interval. Returns true when the window just closed slow
 * enough to justify a step down (the window then restarts, so the next step
 * is judged on frames painted at the new resolution). `excused` frames (a 3D
 * hero build in flight) are skipped — within PACE_EXCUSE_BUDGET_MS: that jank
 * is loading, not rendering.
 *
 * The cadence is folded in BEFORE a window is judged, so a device that is
 * capped from the start (see PACE_CAP_MS) never reads as slow.
 */
export function tickPace(s: PaceState, dtMs: number, excused = false): boolean {
  if (dtMs > PACE_MAX_DT_MS) return false
  if (excused && s.excusedMs < PACE_EXCUSE_BUDGET_MS) {
    s.excusedMs += dtMs
    return false
  }
  if (s.warm < PACE_WARMUP) {
    s.warm++
    return false
  }
  s.dts[s.frames++] = dtMs
  if (s.frames < PACE_WINDOW) return false
  s.frames = 0
  const sorted = Float32Array.from(s.dts).sort()
  s.cadence = Math.min(s.cadence, sorted[PACE_WINDOW >> 1])
  const limit = paceLimit(s.cadence)
  let slow = 0
  for (const dt of s.dts) if (dt > limit) slow++
  return slow >= PACE_WINDOW * PACE_SLOW_SHARE
}

// ---------------------------------------------------------------------------
// The shared step — decided by the 2D engine's pace guard, followed by the 3D
// layer. Module-level, no React in the hot path (the glass.ts idiom).
// ---------------------------------------------------------------------------

let sharedStep = 0
const stepListeners = new Set<() => void>()

export function getResStep(): number {
  return sharedStep
}

export function setResStep(step: number): void {
  if (step === sharedStep) return
  sharedStep = step
  for (const fn of stepListeners) fn()
}

export function subscribeResStep(fn: () => void): () => void {
  stepListeners.add(fn)
  return () => {
    stepListeners.delete(fn)
  }
}

/** Shadow-map edge scale for a step: halved from the first step on (the
 *  shadows soften slightly; only a device that is already struggling). */
export function shadowScale(step: number): number {
  return step > 0 ? 0.5 : 1
}
