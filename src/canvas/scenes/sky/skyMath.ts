/**
 * Pure math for the SKY family — no canvas, no DOM. The story beats that need
 * to be *right* (the graduation ladder, the cloud-punch white-out, the
 * one-circle fight, the sunset landing) live here as pure functions of scroll,
 * so they unit-test cleanly and any renderer can reuse them (L1 canvas today,
 * L2 later).
 */

import { TAU, clamp01, lerp, smoothstep } from '../../toolkit'
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
// THE POSE FOLD — a continuous roll mapped onto the multi-view el ladder
// (`l159poses.ts`, the ANIMACE render set: el −90…+90 with REAL belly views,
// so a roll no longer fakes its far half with a y-flip of the top frames)
// ---------------------------------------------------------------------------

export type PoseFold = {
  /** Camera elevation in the aircraft frame, degrees, CONTINUOUS −90..+90 —
   *  the painter crossfades the two bracketing ladder frames. */
  el: number
  /** Render mirrored about the roll axis — the half of the roll where the
   *  camera looks at the aircraft's right side. */
  flipY: boolean
}

/** Where a roll puts the viewer on the el ladder. Positive bank rolls the
 *  belly toward the viewer first (el dives negative), so one full turn walks
 *  0 → −90 → 0(flipped) → +90 → 0: side → below → inverted → above → side,
 *  every quarter on real traced geometry. flipY flips exactly at the poles,
 *  where the planform is its own mirror — no pop. */
export function poseFold(bank: number): PoseFold {
  const camY = Math.cos(bank) // which side of the jet faces the crowd
  const camZ = -Math.sin(bank) // how far above/below the roll axis we look
  return { el: (Math.asin(camZ) * 180) / Math.PI + 0, flipY: camY < 0 }
}

// ---------------------------------------------------------------------------
// AIRSHOW — the opposing two-ship display (B2.3c)
// Both jets fly the SAME script mirrored about the display centreline: entry
// from opposite runway ends → one full roll each closing head-on → pass →
// mirrored loops on near-coincident circles (they meet inverted at the top
// and again at the feet) → outward exit → 60° climb, half-roll over the top,
// arcing back down (Martin's wingover sketch) → second head-on pass rolling
// THROUGH the cross → pull into an accelerating farewell climb, wing-rocking
// ±45° and streaming flares. The renderer draws jet A from this state and
// jet B as its pixel mirror.
// ---------------------------------------------------------------------------

export type DisplayPose = {
  x: number
  y: number
  /** Screen angle of the velocity vector, radians — continuous mod 2π
   *  across every segment seam (rotation ignores whole turns). */
  heading: number
  /** Roll about the flight axis, radians (0 = upright). */
  bank: number
  /** 1 while the flare dispensers fire (the farewell climb). */
  flare: number
}

/** Segment seams of the display timeline. The scale runs on the airshow's
 *  UNCLAMPED progress (tRaw): the farewell continues past 1 while the scene
 *  still owns the frame, so the pair leaves at full speed instead of hanging
 *  in the corner waiting for the hand-over (Martin's catch). 0.01 of t here
 *  = 0.1 % of chapter = ~1 % of his global-scroll checkpoints. */
export const DISPLAY_T = {
  loopIn: 0.28, // entry + first vykrut ends at the loop foot
  loopOut: 0.53, // one full mirrored loop
  runOut: 0.6, // level acceleration out to the display end
  climbTop: 0.675, // steep climb ends, wingover begins
  wingoverOut: 0.765, // arcing back down toward the low return
  finale: 0.9, // second pass done (60 %) → the long flare climb
  exit: 1.17, // straight run off the top by 63 % global
} as const

/** First-vykrut window (one full roll closing head-on) — slow enough for
 *  every ladder step to read. */
const VYKRUT1: readonly [number, number] = [0.09, 0.225]
/** Half-roll on the return dive (59 %): flying LEFT, upright = the flipped
 *  pose, so this brings the pair out of the wingover's inverted look and
 *  they cross the low 60 % pass in normal attitude. */
const HALFROLL2: readonly [number, number] = [0.81, 0.87]
/** One long roll on the climb-out (61–62.5 %) — the first stretch of the
 *  climb (60–61 %) stays wings-steady upright, then the roll runs and the
 *  pair is back in normal attitude well before the 63 % exit. */
const CLIMB_VYKRUT: readonly [number, number] = [0.99, 1.125]

const ramp = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))

/** Jet A's full display state at scroll t; the display line geometry follows
 *  the airshow scene (horizon 0.72 h, runway 0.829 h). Jet B is this state
 *  mirrored about x = w/2 by the renderer. */
export function opposingDisplay(t: number, w: number, h: number): DisplayPose {
  const y0 = h * 0.735 // the display line — right over the runway, Chinook height
  const R = Math.min(h * 0.2875, w * 0.42) // loop: foot ON the line, top HIGH
  const d = w * 0.018 // half-gap between the two mirrored loop circles
  const footX = w * 0.5 + d // loop entry/exit tangent point
  const T = DISPLAY_T

  // Roll script — shared across segments so seams can't drop a half-turn:
  // one full roll closing in → wings level through the loop → a full roll
  // over the wingover → the 59 % half-roll (flying LEFT, upright = the
  // flipped pose, so the pair crosses the low pass in normal attitude) →
  // one long roll through the flare climb → straight clean exit.
  let bank = 0
  if (t < T.loopIn) {
    bank = TAU * ramp(t, VYKRUT1[0], VYKRUT1[1])
  } else if (t >= T.climbTop && t < T.wingoverOut) {
    // The wingover: half-roll over the top, rolling on out of the arc.
    bank = Math.PI * ramp(t, 0.685, 0.73) + Math.PI * ramp(t, 0.73, 0.765)
  } else if (t >= T.wingoverOut) {
    bank =
      TAU +
      Math.PI * ramp(t, HALFROLL2[0], HALFROLL2[1]) +
      TAU * ramp(t, CLIMB_VYKRUT[0], CLIMB_VYKRUT[1])
  }

  if (t < T.loopIn) {
    // Entry: in from the runway end, barely over the deck, settling down
    // onto the display line.
    const p = t / T.loopIn
    const x = lerp(-w * 0.06, footX, p)
    const y = y0 + h * 0.02 * (1 - p) * (1 - p)
    const heading = Math.atan2(-h * 0.04 * (1 - p), footX + w * 0.06)
    return { x, y, heading, bank, flare: 0 }
  }
  if (t < T.loopOut) {
    // The mirrored loop: one full turn from the foot, pulling UP.
    const p = (t - T.loopIn) / (T.loopOut - T.loopIn)
    const a = Math.PI / 2 - p * TAU
    return {
      x: footX + Math.cos(a) * R,
      y: y0 - R + Math.sin(a) * R,
      heading: -p * TAU, // level right at the foot, one full turn
      bank: 0,
      flare: 0,
    }
  }
  if (t < T.runOut) {
    // Level acceleration out toward the display end.
    const p = (t - T.loopOut) / (T.runOut - T.loopOut)
    return { x: lerp(footX, w * 0.82, Math.pow(p, 1.35)), y: y0, heading: 0, bank: 0, flare: 0 }
  }
  // The steep farewell-side climb — a quadratic bend from the level run into
  // the straight climb line, so the pull-up rotates instead of snapping. It
  // starts on the LOW display line and tops out near the loop's height (the
  // whole vertical figure grew with the B2.3c-rev2 geometry). Horizontal
  // reach capped in w so tall portrait screens keep it on-canvas.
  const c4x = w * 0.87 // pull-up control point, on the display line
  const x4 = c4x + Math.min(h * 0.208, w * 0.1)
  const y4 = y0 - h * 0.36
  if (t < T.climbTop) {
    const p = (t - T.runOut) / (T.climbTop - T.runOut)
    const q = 1 - p
    const x = q * q * w * 0.82 + 2 * q * p * c4x + p * p * x4
    const y = q * q * y0 + 2 * q * p * y0 + p * p * y4
    const tx = q * (c4x - w * 0.82) + p * (x4 - c4x)
    const ty = p * (y4 - y0)
    return { x, y, heading: Math.atan2(ty, tx), bank, flare: 0 }
  }
  // Wingover geometry (shared by the arc and everything after it).
  const th4 = Math.atan2(y4 - y0, x4 - c4x) // heading entering the arc
  const dTh = -(160 * Math.PI) / 180 // nose falls through 160° over the top
  const r5 = Math.min(h * 0.15, w * 0.07)
  const arcX = (th: number): number => x4 - r5 * (Math.sin(th) - Math.sin(th4))
  const arcY = (th: number): number => y4 + r5 * (Math.cos(th) - Math.cos(th4))
  const th5 = th4 + dTh // ≈ −220°: descending, headed back at the centre
  if (t < T.wingoverOut) {
    // Over the top: heading walks the arc while the half-roll happens.
    const p = (t - T.climbTop) / (T.wingoverOut - T.climbTop)
    const th = th4 + dTh * p
    return { x: arcX(th), y: arcY(th), heading: th, bank, flare: 0 }
  }
  // Return dive: a quadratic bend from the arc exit down onto the display
  // line, levelling out headed back at the centre for the second pass.
  const p5x = arcX(th5)
  const p5y = arcY(th5)
  const endX = w * 0.42 // past the centre — the jets DO cross again
  const u = (y0 - p5y) / Math.sin(th5) // tangent meets the display line
  const c6x = p5x + Math.cos(th5) * u
  if (t < T.finale) {
    const p = (t - T.wingoverOut) / (T.finale - T.wingoverOut)
    const q = 1 - p
    const x = q * q * p5x + 2 * q * p * c6x + p * p * endX
    const y = q * q * p5y + 2 * q * p * y0 + p * p * y0
    const tx = q * (c6x - p5x) + p * (endX - c6x)
    const ty = q * (y0 - p5y)
    return { x, y, heading: Math.atan2(ty, tx), bank, flare: 0 }
  }
  // Farewell: pull from level-left into an ACCELERATING climb out the top —
  // flares streaming and one long roll early on, then a straight fast run
  // clean off the screen (62–63 %), never hanging in a corner.
  const p = (t - T.finale) / (T.exit - T.finale)
  const q7 = Math.pow(p, 1.55) // accelerating along the path
  const c7x = w * 0.42 - w * 0.2 // level-left control point
  const e7x = c7x - h * 0.45
  const e7y = y0 - h * 0.85
  const qq = 1 - q7
  const x = qq * qq * endX + 2 * qq * q7 * c7x + q7 * q7 * e7x
  const y = qq * qq * y0 + 2 * qq * q7 * y0 + q7 * q7 * e7y
  const tx = qq * (c7x - endX) + q7 * (e7x - c7x)
  const ty = q7 * (e7y - y0)
  // Flares fire from 61 % all the way to the 63 % exit (p of the climb run).
  return { x, y, heading: Math.atan2(ty, tx), bank, flare: p > 0.32 && p < 0.97 ? 1 : 0 }
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
