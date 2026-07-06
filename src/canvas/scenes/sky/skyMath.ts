/**
 * Pure math for the SKY family — no canvas, no DOM. The story beats that need
 * to be *right* (the graduation ladder, the cloud-punch white-out, the
 * one-circle fight, the sunset landing) live here as pure functions of scroll,
 * so they unit-test cleanly and any renderer can reuse them (L1 canvas today,
 * L2 later).
 */

import { TAU, clamp01, smoothstep } from '../../toolkit'
import { ROLL_BANKS_DEG } from './silhouettes'

// ---------------------------------------------------------------------------
// CLIMB — the aircraft "graduation" ladder + the cloud-punch
// ---------------------------------------------------------------------------

export type Craft = 'ultralight' | 'z142' | 'l39' | 'l159'

/** The leveling-up ladder (facts §6b): one elegant step-up per craft, all
 *  completed before the cloud-punch swallows the view at t ≈ 0.42.
 *  Ends at the L-39C — the "CTU → Brno" years; the L-159 came in 2012, so
 *  its unlock belongs to the cruise chapter (era 2003–2012), not here. */
export const GRADUATION: ReadonlyArray<{ craft: Craft; label: string; at: number }> = [
  { craft: 'ultralight', label: 'ULTRALIGHT', at: 0 },
  { craft: 'z142', label: 'Z-142', at: 0.14 },
  { craft: 'l39', label: 'L-39C', at: 0.28 },
]

export type GraduationState = {
  /** Which rung of the ladder is flying right now. */
  index: number
  /** 1 at the swap instant → 0 shortly after — drives the "unlock" ring. */
  pulse: number
}

export function graduationAt(t: number): GraduationState {
  let index = 0
  for (let i = GRADUATION.length - 1; i >= 0; i--) {
    if (t >= GRADUATION[i].at) {
      index = i
      break
    }
  }
  const since = t - GRADUATION[index].at
  const pulse = index === 0 ? 0 : clamp01(1 - since / 0.07)
  return { index, pulse }
}

export type PunchState = {
  /** White-out strength 0..1 — ≈1 while inside the cloud layer. */
  fog: number
  /** 0 below the layer → 1 above; the world swap hides under peak fog. */
  above: number
  /** How close the deck overhead is during the below phase (0..1). */
  approach: number
}

/** The cloud-punch (facts §6b): approach the deck, fly INTO it (pure white,
 *  all detail gone) — then a hard CUT out into the clear air above, the way
 *  a real punch-out feels (Martin: no gradual dissolve on the way out). The
 *  below→above swap still hides entirely inside the white-out window. */
export function cloudPunch(t: number): PunchState {
  const fog = smoothstep(0.42, 0.52, t) * (1 - smoothstep(0.6, 0.63, t))
  const above = smoothstep(0.55, 0.6, t)
  const approach = smoothstep(0.06, 0.44, t)
  return { fog, above, approach }
}

// ---------------------------------------------------------------------------
// THE SECTION SUN — one shared trajectory for the whole Air-Force arc
// ---------------------------------------------------------------------------

/** Waypoints of the sun's single left→right run across the sky section, in
 *  story position (chapters) → screen fractions. Every sky scene evaluates
 *  THIS function at its continuous position (window start + tRaw), so the
 *  sun never freezes at a hand-over and never ghosts — it is one object. */
const SUN_KNOTS: ReadonlyArray<readonly [number, number, number]> = [
  [2.0, 0.32, 0.15], // punch-out into the morning, upper left
  [2.5, 0.44, 0.15], // climb → cruise hand-over
  [3.5, 0.64, 0.22], // cruise → desert (afternoon begins)
  [4.5, 0.7, 0.28], // desert → airshow
  [5.5, 0.76, 0.38], // airshow → sunset
  [5.9, 0.83, 0.52], // sinking, sliding west…
  [6.3, 0.888, 0.755], // …below the horizon (fully set)
]

export type SunPoint = { x: number; y: number }

export function sunArc(pos: number): SunPoint {
  const first = SUN_KNOTS[0]
  const last = SUN_KNOTS[SUN_KNOTS.length - 1]
  if (pos <= first[0]) return { x: first[1], y: first[2] }
  if (pos >= last[0]) return { x: last[1], y: last[2] }
  for (let i = 1; i < SUN_KNOTS.length; i++) {
    if (pos <= SUN_KNOTS[i][0]) {
      const [p0, x0, y0] = SUN_KNOTS[i - 1]
      const [p1, x1, y1] = SUN_KNOTS[i]
      const f = (pos - p0) / (p1 - p0)
      return { x: x0 + (x1 - x0) * f, y: y0 + (y1 - y0) * f }
    }
  }
  return { x: last[1], y: last[2] }
}

// ---------------------------------------------------------------------------
// CRUISE — the one-circle fight as a VERTICAL HELIX
// (`local/ode mne/siluety/1 circle fight principle.png`: two jets corkscrew
// down a shared vertical axis, their paths interleaving like a double helix)
// ---------------------------------------------------------------------------

export type HelixPoint = {
  /** Horizontal offset from the axis, unit circle (-1..1). */
  x: number
  /** Depth: +1 nearest the viewer, -1 on the far side of the axis. */
  z: number
}

/** Position around the shared axis at `turns` revolutions; the second jet
 *  flies at phase π — same height, opposite side, paths weaving. The caller
 *  owns the vertical descent (height = turns × pitch) and the projection. */
export function helixPoint(turns: number, phase: number): HelixPoint {
  const a = turns * TAU + phase
  return { x: Math.sin(a), z: Math.cos(a) }
}

// ---------------------------------------------------------------------------
// THE ROLL — mapping a continuous bank angle onto the traced frame ladder
// (`L159_ROLL`, Martin's model photos: level → 30° → 45° → 70° → planform)
// ---------------------------------------------------------------------------

export type RollPose = {
  /** Index into `L159_ROLL`. */
  frame: number
  /** Render mirrored about the flight axis — the inverted half of the roll. */
  flipY: boolean
}

/** Fold a roll angle (radians, any sign) into the traced [0°, 90°] range and
 *  pick the nearest frame; the far half of the roll renders as a y-flip, so
 *  one full turn reads level → knife-edge → inverted → knife-edge → level
 *  with no pop at the quarter points (the planform is its own mirror). */
export function rollFrame(bank: number): RollPose {
  const p = ((bank % TAU) + TAU) % TAU
  let fold: number
  let flipY: boolean
  if (p <= Math.PI / 2) {
    fold = p
    flipY = false
  } else if (p <= Math.PI) {
    fold = Math.PI - p
    flipY = true
  } else if (p <= Math.PI * 1.5) {
    fold = p - Math.PI
    flipY = true
  } else {
    fold = TAU - p
    flipY = false
  }
  const deg = (fold * 180) / Math.PI
  let frame = 0
  for (let i = 1; i < ROLL_BANKS_DEG.length; i++) {
    if (Math.abs(ROLL_BANKS_DEG[i] - deg) < Math.abs(ROLL_BANKS_DEG[frame] - deg)) frame = i
  }
  return { frame, flipY }
}

// ---------------------------------------------------------------------------
// SUNSET — the landing
// ---------------------------------------------------------------------------

/** Scroll t of the touchdown moment. */
export const TOUCHDOWN = 0.55

export type LandingPose = {
  /** Along-runway position: −1 far on approach → 0 at touchdown → grows
   *  through the rollout (units of the glide length). */
  x: number
  /** Height above the runway, 1 at scene start → 0 on the wheels. */
  alt: number
  /** Nose-up attitude in radians (jets land slightly nose-high). */
  pitch: number
  /** Ground speed through the rollout, 1 → 0 at a stop. */
  speed: number
}

export function landingPose(t: number): LandingPose {
  if (t < TOUCHDOWN) {
    const p = clamp01(t / TOUCHDOWN)
    const alt = Math.pow(1 - p, 1.15)
    const flare = smoothstep(0.8, 1, p)
    return { x: -1 + p, alt, pitch: 0.05 + flare * 0.09, speed: 1 }
  }
  const r = clamp01((t - TOUCHDOWN) / (1 - TOUCHDOWN))
  const speed = Math.pow(1 - r, 1.6)
  // Rollout distance = the integral of that deceleration (closed form).
  const x = (1 - Math.pow(1 - r, 2.6)) / 2.6
  return { x, alt: 0, pitch: 0.14 * Math.pow(1 - r, 1.8), speed }
}
