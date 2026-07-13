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
  { craft: 'l39', label: 'L-39', at: 0.28 },
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

/**
 * The climb's phase curve while the 3D layer owns its hero (E3b-v2 round 2):
 * Martin's full Part-1 climb flies below the deck; the white-out rises
 * through the L-39's amplified zoom (climbMath: last snap at t ≈ 0.705,
 * right at the top of the rise), HOLDS white through the canopy-rain
 * transit, then the frame PUNCHES OUT above the deck (the restored 2D wow
 * beat): the world swaps below→above under full white at climbMath
 * ABOVE.swap and the white drops across [out, whiteGone] — straight out
 * into the sunlit cumulus sea, where the original 2D above-deck story
 * (L-39 → L-159 unlock → HUD) plays to the ~25.5 % cut. One function used
 * by BOTH the 2D environment (climb.ts) and the 3D heroes' fog-swallow, so
 * the two layers cannot disagree.
 */
export function heroClimbPunch(t: number): PunchState {
  return {
    fog: smoothstep(0.63, 0.703, t) * (1 - smoothstep(0.778, 0.798, t)),
    above: smoothstep(0.772, 0.778, t),
    approach: smoothstep(0.097, 0.64, t),
  }
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
  [6.34, 0.885, 0.695], // half-sunk into the horizon while the jet brakes…
  [6.46, 0.9, 0.795], // …and the last sliver goes right AFTER the roll
  //                     stops (B2.3d beat order: set during, gone after)
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
// SUNSET — the landing seen from the APPROACH AXIS (B2.3d)
// The observer stands ON the extended centreline just short of the Čáslav
// threshold, looking down the runway. The jet comes from BEHIND: the screen
// goes BLACK as it passes right over the observer's head (the wow beat), the
// black lifts on its tail-on view already ahead, then the jet shrinks and
// descends down the perspective to the threshold, touches down and brakes to
// a stop at the runway's physical HALF. The sun sets through the roll and the
// last sliver goes just after the stop.
// ---------------------------------------------------------------------------

/** Story beats of the landing, in scene t. The black-out window brackets the
 *  overhead pass: at full black the painter swaps the sweeping belly planform
 *  for the tail-on view — the swap hides entirely inside it, exactly like the
 *  climb's cloud-punch white-out hides the world swap. */
export const LANDING = {
  // The whole blink is a ~2 vh FLASH centred EXACTLY on the 60↔61 HUD-step
  // BOUNDARY (t 0.5568 → progress 0.6050 on the total-13.3 map with the
  // climb ×2 + cruise ×1.6 + sunset ×1.7 stretches). AND the shake/blink
  // no longer relies on that alone: the engine's scroll-velocity gate
  // (CanvasStage → cfg.shakeGate) kills the trembling on ANY parked frame —
  // wheel stops land on an arbitrary pixel grid, so a t-anchor can never
  // guarantee "between steps" by itself; parked = still frame, gliding =
  // the shake. Widened ×1.6 (Martin: the blink + shake had become nearly
  // invisible in a glide) — still centred on a step boundary, still
  // velocity-gated.
  sweepIn: 0.5488, // the rush arrives — a fast swipe
  blackFull: 0.5548, // screen fully black — the pass-over swap hides here
  blackLift: 0.5588, // the BLINK ends: the jet already fills the whole screen
  reveal: 0.5648, // view clear: the jet shrinking down the line to the piano keys
  touchdown: 0.685,
  stop: 0.875,
} as const

/** Along-runway stations, in units of the observer→threshold gap:
 *  the jet crosses the observer at s = 0, the wheels touch at the threshold
 *  (s = 1) and the roll ends at the runway's physical half. The camera sits
 *  FAR back and high on the glidepath (Martin's review, 2× out again): the
 *  gap doubled, so the same runway spans half as many gap-units — small and
 *  slender behind a LONG approach-light axis. */
export const LANDING_S = { threshold: 1, stop: 2.375, end: 3.75 } as const

/** Perspective-depth warp for the whole POV scene: screen size and drop
 *  below the horizon both scale with 1/depth. The exponent < 1 keeps the
 *  far half of the runway (and the stopped jet) readable — a gentle wide-
 *  angle cheat on true 1/s perspective. */
export const LANDING_DEPTH_K = 0.72

export function landingDepth(s: number): number {
  // The floor only guards the pole at s = 0 — it must sit LOW enough that
  // the just-past-the-camera jet still projects across the whole screen.
  return Math.pow(Math.max(s, 0.004), LANDING_DEPTH_K)
}

/** Camera shake of the overhead pass, unit amplitude — one shared source
 *  for the canvas world AND the DOM text (the whole view rocks together,
 *  Martin's ask). A sub-scroll-step BLINK like the black-out it brackets:
 *  silent before the sweep, dead right after the reveal — it must never
 *  sit humming on one parked HUD step. `time` rumbles it while it lasts;
 *  the scroll-driven terms keep even a parked frame displaced. */
export function landingShake(t: number, time: number): { x: number; y: number } {
  const env =
    smoothstep(LANDING.sweepIn, LANDING.blackFull, t) *
    (1 - smoothstep(LANDING.blackLift, LANDING.reveal, t))
  if (env <= 0.01) return { x: 0, y: 0 }
  const a = env * 0.8
  return {
    x: (Math.sin(time * 87) * 0.6 + Math.sin(t * 913 + 1.7) * 0.4) * a,
    y: (Math.cos(time * 71 + 0.9) * 0.6 + Math.sin(t * 787 + 4.1) * 0.4) * a,
  }
}

export type LandingPov = {
  /** Along-runway distance ahead of the observer (LANDING_S units);
   *  negative while the jet is still behind the observer's head. */
  s: number
  /** Wheel height above the runway, 1 at the overhead pass → 0 on the
   *  wheels at the threshold and through the roll. */
  alt: number
  /** Screen black-out 0..1 — 1 across the whole pass-over swap window. */
  black: number
}

/** Scene t when the jet is exactly overhead (s = 0) — mid black-out. */
const OVERHEAD = (LANDING.blackFull + LANDING.blackLift) / 2

/** Approach progress exponent: right after the pass the jet is still AT the
 *  camera, so s grows slowly at first — the silhouette fills the whole
 *  screen as the blink lifts, then most of the shrink happens over the next
 *  few scroll ticks, the way a real flythrough compresses (Martin: black
 *  blink → jet across the screen → nothing but smooth shrinking). */
const APPROACH_P = 1.77

/** How much of the approach speed survives the touchdown: the brakes BITE
 *  the moment the wheels are down (Martin: the 69–70 % roll read too fast),
 *  and the cubic then eases that reduced speed smoothly into the halfway
 *  stop — one continuous deceleration from the wheels to standstill. */
const BRAKE_BITE = 0.45

export function landingPov(t: number): LandingPov {
  const L = LANDING
  // The veil snaps shut through the second half of the sweep — the swallow
  // reads as a fast swipe, not a hovering shape (relative offset: the blink
  // window is only ~0.01 t wide now).
  const black =
    smoothstep(L.sweepIn + (L.blackFull - L.sweepIn) * 0.3, L.blackFull, t) *
    (1 - smoothstep(L.blackLift, L.reveal, t))
  if (t < L.touchdown) {
    const tau = (t - OVERHEAD) / (L.touchdown - OVERHEAD)
    const s = Math.sign(tau) * Math.pow(Math.abs(tau), APPROACH_P)
    return { s, alt: Math.pow(1 - clamp01(s), 1.12), black }
  }
  // Rollout: the brakes bite AT the wheels (the touchdown is an event — the
  // roll starts at BRAKE_BITE of the approach speed), then a cubic eases
  // that speed monotonically to zero exactly at the runway half.
  const u = clamp01((t - L.touchdown) / (L.stop - L.touchdown))
  const v0 = (APPROACH_P / (L.touchdown - OVERHEAD)) * (L.stop - L.touchdown) * BRAKE_BITE
  const D = LANDING_S.stop - LANDING_S.threshold
  const s =
    LANDING_S.threshold + v0 * u + (3 * D - 2 * v0) * u * u + (v0 - 2 * D) * u * u * u
  return { s, alt: 0, black: 0 }
}
