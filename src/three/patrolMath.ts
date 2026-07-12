/**
 * PATROL MATH — pure choreography for the two L-159 flypast beats (locked for
 * the site independently of the climb re-choreo):
 *
 *  - AIRSHOW HEAD-ON PASS: once the 2D display pair has flown off (airshow
 *    tRaw ≈ 1.17), a bare two-ship in echelon left comes straight at the
 *    crowd trailing display smoke (white lead / red wing — the 2D team's own
 *    colours), fires a simultaneous 3/4 roll and breaks OPPOSITE ways: on
 *    screen the paths cross, and only the echelon's longitudinal split makes
 *    it a near-miss — the display-flying optical illusion, aerodynamically
 *    honest: a 3/4 roll to the pilot's right ends at 90° LEFT bank, and the
 *    pull from that knife-edge IS a hard left turn (our right).
 *
 *  - LANDING BREAK: two scroll-ticks after the sunset landing's overhead
 *    shake, an ARMED pair sweeps in over the observer on the landing heading
 *    (echelon left, settling on the ~40 %-of-screen-height line) and breaks
 *    RIGHT over the airfield onto the downwind — leader first, wingman one
 *    tick later — the 180° coming out spatially right of the control tower
 *    while Martin's own jet brakes on the runway: the base flies on.
 *
 * Everything is a pure function of the run's local t — scroll IS the clock —
 * in CAMERA-GLUED room space (the ClimbHeroes convention: +x right, +y up,
 * −z away down the view axis). Poses are authored as screen anchors (sx, sy
 * viewport fractions + camera distance d) and back-projected through the
 * stage FOV, so the composition ("the 40 % line", "right of the tower")
 * holds at any viewport. Three-free by contract; unit-tested.
 */

import { TAU, clamp01, lerp, smoothstep } from '../canvas/toolkit'

/** tan(STAGE_FOV / 2) — mirrors Stage3D's 55° vertical FOV (Starfield.tsx
 *  owns the constant; this module stays three-free, so the value is pinned
 *  here with the projection tests guarding the round trip). */
export const FOV_TAN = Math.tan((55 * Math.PI) / 360)

export type PatrolPose = {
  x: number
  y: number
  z: number
  /** Unit forward — the flight direction the nose points down. */
  fx: number
  fy: number
  fz: number
  /** Roll about the forward axis, radians. Positive = the PILOT's right
   *  roll (right wing drops). */
  bank: number
  /** The pose's own visibility envelope 0..1 (entry fade / hard kill). */
  alpha: number
}

export function createPatrolPose(): PatrolPose {
  return { x: 0, y: 0, z: 0, fx: 0, fy: 0, fz: -1, bank: 0, alpha: 0 }
}

/** Screen anchor → camera-glued room space. sx/sy are viewport fractions
 *  ((0,0) = top-left, like the 2D canvas), d = distance down the view axis. */
export function anchorPoint(
  sx: number,
  sy: number,
  d: number,
  aspect: number,
  out: [number, number, number],
): [number, number, number] {
  const half = d * FOV_TAN
  out[0] = (sx - 0.5) * 2 * half * aspect
  out[1] = (0.5 - sy) * 2 * half
  out[2] = -d
  return out
}

/** Room-space point → viewport fractions (the anchor inverse) — the probe /
 *  test projection. Valid for z < 0 (in front of the camera). */
export function screenOf(
  x: number,
  y: number,
  z: number,
  aspect: number,
): { sx: number; sy: number } {
  const half = Math.max(-z, 1e-6) * FOV_TAN
  return { sx: 0.5 + x / (2 * half * aspect), sy: 0.5 - y / (2 * half) }
}

// ---------------------------------------------------------------------------
// AIRSHOW — the head-on pass with the crossing break
// ---------------------------------------------------------------------------

/** Timings ride the airshow run's UNCLAMPED tRaw (the 2D display's own clock:
 *  its farewell exits by ≈ 1.17; the sunset scene owns the frame from ≈ 1.48
 *  under the retuned enterFade — the pass lives entirely in between). */
export const PASS = {
  in: 1.175,
  inFull: 1.215,
  rollStart: 1.33,
  rollEnd: 1.39,
  out: 1.455,
  /** Approach: far speck → close-in at the roll. */
  dFar: 72,
  dRoll: 15.5,
  dOut: 7,
  /** Half the head-on lateral split, screen fraction — wide enough that the
   *  pair stays TWO silhouettes through the roll, close enough to read as a
   *  near-collision the moment the breaks cross. */
  gapX: 0.046,
  /** …and the wider split the approach STARTS from — the pair converges on
   *  the display centre as it closes, so the smoke trails fan out from
   *  behind the airframes instead of hiding dead behind them. */
  gapFar: 0.092,
  /** Wingman's longitudinal split (world units) — THE near-miss margin. */
  aft: 5.6,
  /** Wingman a hair low — the echelon step, screen fraction. */
  stepDown: 0.006,
  /** How far past the vertical centreline the break sweeps (screen frac —
   *  past ±0.5 the jet is off-frame). */
  sweep: 0.78,
  /** The 3/4 vykrut. */
  rollTurns: 0.75,
  sy0: 0.505,
  sy1: 0.44,
} as const

/** Jet index: 0 = leader (screen LEFT — the wingman holds echelon left, which
 *  head-on reads as our right). */
export type PassJet = 0 | 1

function passPoint(
  tRaw: number,
  aspect: number,
  jet: PassJet,
  out: [number, number, number],
): [number, number, number] {
  const T = PASS
  const side = jet === 0 ? 1 : -1 // leader breaks to OUR right, wingman left
  let d: number
  let sx: number
  let sy: number
  if (tRaw < T.rollStart) {
    const p = clamp01((tRaw - T.in) / (T.rollStart - T.in))
    d = lerp(T.dFar, T.dRoll, Math.pow(p, 1.55)) // slow far, fast near
    sx = 0.5 - side * lerp(T.gapFar, T.gapX, p)
    sy = lerp(T.sy0, T.sy1, p)
  } else if (tRaw < T.rollEnd) {
    const p = (tRaw - T.rollStart) / (T.rollEnd - T.rollStart)
    d = lerp(T.dRoll, T.dRoll - 1.6, p)
    sx = 0.5 - side * T.gapX
    sy = T.sy1
  } else {
    const q = clamp01((tRaw - T.rollEnd) / (T.out - T.rollEnd))
    d = lerp(T.dRoll - 1.6, T.dOut, q)
    // The knife-edge pull: each jet sweeps across the other's side and off
    // the frame — the screen paths CROSS just after the break bites.
    sx = 0.5 - side * T.gapX + side * Math.pow(q, 1.35) * T.sweep
    sy = T.sy1 - Math.pow(q, 1.4) * 0.02
  }
  if (jet === 1) {
    d += T.aft
    sy += T.stepDown
  }
  return anchorPoint(sx, sy, d, aspect, out)
}

const _pp0: [number, number, number] = [0, 0, 0]
const _pp1: [number, number, number] = [0, 0, 0]

/** The full pass pose. Forward comes from the rail's own derivative, so the
 *  noses always fly the path (incl. the sideways streak of the break). */
export function airshowPassPose(
  tRaw: number,
  aspect: number,
  jet: PassJet,
  out: PatrolPose,
): PatrolPose {
  const T = PASS
  if (tRaw <= T.in || tRaw >= T.out + 0.02) {
    out.alpha = 0
    return out
  }
  passPoint(tRaw, aspect, jet, _pp0)
  const eps = 0.0022
  passPoint(Math.min(tRaw + eps, T.out + 0.02), aspect, jet, _pp1)
  let dx = _pp1[0] - _pp0[0]
  let dy = _pp1[1] - _pp0[1]
  let dz = _pp1[2] - _pp0[2]
  const len = Math.hypot(dx, dy, dz)
  if (len > 1e-6) {
    dx /= len
    dy /= len
    dz /= len
  } else {
    dx = 0
    dy = 0
    dz = 1
  }
  out.x = _pp0[0]
  out.y = _pp0[1]
  out.z = _pp0[2]
  out.fx = dx
  out.fy = dy
  out.fz = dz
  // The simultaneous 3/4 vykrut: leader to the PILOT's right (+), wingman
  // mirrored — both end knife-edged toward their own break side and hold it
  // through the pull.
  const side = jet === 0 ? 1 : -1
  out.bank = side * smoothstep(T.rollStart, T.rollEnd, tRaw) * T.rollTurns * TAU
  out.alpha = smoothstep(T.in, T.inFull, tRaw)
  return out
}

/** Rail parameter 0..1 over the whole pass — the smoke ribbon's axis. */
export function passU(tRaw: number): number {
  return clamp01((tRaw - PASS.in) / (PASS.out - PASS.in))
}

/** Sample the rail at u (0..1) for the ribbon bake. */
export function passRailPoint(
  u: number,
  aspect: number,
  jet: PassJet,
  out: [number, number, number],
): [number, number, number] {
  return passPoint(PASS.in + u * (PASS.out - PASS.in), aspect, jet, out)
}

// ---------------------------------------------------------------------------
// SUNSET — the landing break onto the downwind
// ---------------------------------------------------------------------------

/** Timings in the sunset run's local t. The pair BLASTS IN FROM BEHIND the
 *  observer exactly like the landing jet did (Martin: first seen much
 *  closer/bigger, real forward rush — never a fade-in in place): phase A is
 *  a WORLD-SPACE line from just over the shoulder to the break fix, so the
 *  screen position converges as they recede. The whole maneuver runs FAST —
 *  shorter windows, a farther fix — and everything is gone well before the
 *  healing hand-over veils the frame (t 0.98). */
export const BREAK = {
  /** BOTH jets punch through the frame here TOGETHER (Martin: the pair
   *  must already hang CLOSE and BIG at the FIRST 57 % stop — the beauty,
   *  lighting and detail first), in a tight echelon. t 0.653 = 56.5 %, so
   *  the first parked stop inside the 57-step shows them at d ≈ 8–10. */
  enter: 0.653,
  /** Leader's break — much FARTHER out (58 %): the pair rushes away and
   *  only turns once it has shrunk well past the first cut's size. */
  breakAt: 0.7565,
  /** The wingman turns over the same fix this much later. */
  wingDelay: 0.045,
  /** The 180° turn's length in t — a quick, energetic break. */
  arcLen: 0.055,
  /** Leader clear of the frame (wingman rides +wingDelay). */
  exit: 0.9,
  /** Hard stop before the healing hand-over veil. */
  kill: 0.955,
  /** Where the pass through the observer starts, world units: right of and
   *  above the camera, just ahead — the airframes sweep in over the top
   *  edge, huge, and rush down-sky toward the fix. */
  entry: [0.9, 2.6, -2.2],
  dBreak: 68,
  /** The break fix: on the "40 % of screen height measured from the bottom"
   *  line, a touch right of the runway heading. */
  sxBreak: 0.514,
  syBreak: 0.6,
  /** Turn radius in world units AT 16:9 — scaled by aspect so the rollout
   *  lands right of the 2D tower (a w-fraction landmark) on any viewport. */
  radius: 18,
  refAspect: 16 / 9,
  /** Downwind leg: slight outward drift while closing the camera fast. */
  drift: 4,
  run: 46,
  /** ~72° into the break turn. */
  bank: 1.26,
  /** Wingman's TIGHT echelon-left offset (left / a hair low / barely aft —
   *  Martin: much closer longitudinally), melting away across his arc. */
  echelon: [-2, -0.2, 1.6],
} as const

export type BreakJet = 0 | 1

function breakRadius(aspect: number): number {
  return Math.min(20, Math.max(6, BREAK.radius * (aspect / BREAK.refAspect)))
}

/** The break rail, parameterized by the jet's OWN break time: both jets fly
 *  the same entry line TOGETHER (tight echelon), and each turns over the
 *  same fix when its `brk` arrives — leader first, wingman `wingDelay`
 *  later (his approach leg just runs that touch longer). */
function breakRail(
  t: number,
  aspect: number,
  brk: number,
  out: [number, number, number],
): [number, number, number] {
  const B = BREAK
  if (t < brk) {
    // Initial: the pass THROUGH the observer — a straight world-space line
    // from over the shoulder to the fix. Constant-speed geometry already
    // reads violent up close and calm far out (real perspective); the ease
    // just sharpens the first instants of the rush.
    const p = clamp01((t - B.enter) / (brk - B.enter))
    const pe = 1 - Math.pow(1 - p, 1.45)
    anchorPoint(B.sxBreak, B.syBreak, B.dBreak, aspect, out)
    out[0] = lerp(B.entry[0], out[0], pe)
    out[1] = lerp(B.entry[1], out[1], pe)
    out[2] = lerp(B.entry[2], out[2], pe)
    return out
  }
  anchorPoint(B.sxBreak, B.syBreak, B.dBreak, aspect, out)
  const R = breakRadius(aspect)
  const cx = out[0] + R
  const cz = out[2]
  const arcEnd = brk + B.arcLen
  if (t < arcEnd) {
    // The 180° level break, curving right and away before coming back.
    const phi = Math.PI * clamp01((t - brk) / B.arcLen)
    out[0] = cx - R * Math.cos(phi)
    out[2] = cz - R * Math.sin(phi)
    return out
  }
  // Downwind: reciprocal heading, right of the tower, closing the camera.
  const q = clamp01((t - arcEnd) / (B.exit + (brk - B.breakAt) - arcEnd))
  out[0] = cx + R + B.drift * q
  out[2] = cz + B.run * q
  return out
}

const _bp0: [number, number, number] = [0, 0, 0]
const _bp1: [number, number, number] = [0, 0, 0]

export function landingBreakPose(
  t: number,
  aspect: number,
  jet: BreakJet,
  out: PatrolPose,
): PatrolPose {
  const B = BREAK
  const delay = jet === 1 ? B.wingDelay : 0
  const brk = B.breakAt + delay
  const lastT = B.exit + delay
  if (t <= B.enter - 0.004 || t >= Math.min(lastT, B.kill) + 0.01) {
    out.alpha = 0
    return out
  }
  breakRail(t, aspect, brk, _bp0)
  const eps = 0.002
  breakRail(t + eps, aspect, brk, _bp1)
  let dx = _bp1[0] - _bp0[0]
  let dy = _bp1[1] - _bp0[1]
  let dz = _bp1[2] - _bp0[2]
  const len = Math.hypot(dx, dy, dz)
  if (len > 1e-6) {
    dx /= len
    dy /= len
    dz /= len
  } else {
    dx = 0
    dy = 0
    dz = -1
  }
  out.x = _bp0[0]
  out.y = _bp0[1]
  out.z = _bp0[2]
  out.fx = dx
  out.fy = dy
  out.fz = dz
  if (jet === 1) {
    // Tight echelon left of the leader until the wingman's own break bites.
    const hold = 1 - smoothstep(brk, brk + B.arcLen * 0.55, t)
    out.x += B.echelon[0] * hold
    out.y += B.echelon[1] * hold
    out.z += B.echelon[2] * hold
  }
  // Roll into ~72° right bank through the turn, out on the rollout.
  const arcEnd = brk + B.arcLen
  const rollIn = smoothstep(brk - 0.01, brk + 0.011, t)
  const rollOut = 1 - smoothstep(arcEnd - 0.014, arcEnd + 0.005, t)
  out.bank = B.bank * Math.min(rollIn, rollOut)
  // NO fade-in at all: both jets arrive from off-frame, and any opacity < 1
  // on the big close airframes turns them see-through (pylons through the
  // tanks, guts through the fuselage — transparent self-overlap has no
  // self-occlusion; Martin's catch). Binary on; only the hand-over kill
  // fades, long after they have left the frame.
  out.alpha = t > B.enter ? 1 - smoothstep(B.kill - 0.025, B.kill, t) : 0
  return out
}
