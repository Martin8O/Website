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
 * the pixel count. The glass HUD and the 3D layer keep their own resolution.
 *
 * Measures behaviour, never claims (the runtime FPS watchdog idiom): no
 * browser sniffing, and a capable device — or one whose frame rate is merely
 * capped — never sees a change.
 */

/** Backing-store scale relative to the capped device ratio, per step. */
export const RES_STEPS = [1, 0.75, 0.625] as const

/** A frame slower than this counts as slow (≈ under 50 fps) — the floor of
 *  the threshold; see PACE_CADENCE_SLACK for the cadence-relative part. */
export const PACE_SLOW_MS = 20
/** A frame also has to be this much slower than the device's own cadence
 *  (the fastest window median seen so far) to count as slow. A display or
 *  power mode that caps the frame rate (Low Power Mode at 30 fps, a 48 Hz
 *  panel) is a steady cadence, not a struggling canvas — lowering the
 *  resolution there would only soften the image. */
export const PACE_CADENCE_SLACK = 1.25
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
}

export function createPace(): PaceState {
  return { warm: 0, frames: 0, dts: new Float32Array(PACE_WINDOW), cadence: Infinity }
}

/**
 * Feeds one frame interval. Returns true when the window just closed slow
 * enough to justify a step down (the window then restarts, so the next step
 * is judged on frames painted at the new resolution). `excused` frames (a 3D
 * hero build in flight) are skipped: that jank is loading, not rendering.
 *
 * "Slow" is relative to what this device has already shown it can do: the
 * cadence is folded in BEFORE a window is judged, so a steady capped rate
 * never reads as slow — only a window clearly slower than an earlier, faster
 * stretch of the story does.
 */
export function tickPace(s: PaceState, dtMs: number, excused = false): boolean {
  if (dtMs > PACE_MAX_DT_MS || excused) return false
  if (s.warm < PACE_WARMUP) {
    s.warm++
    return false
  }
  s.dts[s.frames++] = dtMs
  if (s.frames < PACE_WINDOW) return false
  s.frames = 0
  const sorted = Float32Array.from(s.dts).sort()
  s.cadence = Math.min(s.cadence, sorted[PACE_WINDOW >> 1])
  const limit = Math.max(PACE_SLOW_MS, s.cadence * PACE_CADENCE_SLACK)
  let slow = 0
  for (const dt of s.dts) if (dt > limit) slow++
  return slow >= PACE_WINDOW * PACE_SLOW_SHARE
}
