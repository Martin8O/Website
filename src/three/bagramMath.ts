/**
 * BAGRAM MATH — pure choreography for the chapter-03 base-ops beat: the 3D
 * flying actors of the Bagram desert scene (C-17 departure, Apache pair
 * arrival, Mi-17 departure, F-16 holding pattern), flown over the panning 2D
 * base. Hybrid climb-style: the 2D desert keeps painting the whole
 * environment; only its four FLYING aircraft step aside while this layer is
 * live (owned3d HERO_3D 'desert').
 *
 * SPACE: camera-glued room space (the SkyPatrols/CruiseBallet convention —
 * +x right, +y up, −z away down the view axis), poses authored as SCREEN
 * anchors (sx/sy viewport fractions + camera distance) and back-projected
 * through the 55° stage FOV (patrolMath.anchorPoint). Screen-anchored
 * authoring is the aspect-proof variant of the climb's contain projection:
 * the composition ("near the tower", "exits the right edge") holds on every
 * viewport by construction, which is exactly what the 2D-drawn heliports
 * need to line up under the 3D skids.
 *
 * GROUND MODEL: the 2D desert paints an elevated view of the base — horizon
 * at 0.6 h, layered bands below it. Those bands agree with ONE flat ground
 * plane seen from CAM_H units up (tower band: rate 0.2 w/tr at its depth,
 * apron: 0.3 w/tr — both ≈ PAN_K/d, one world pan velocity), so the ground
 * at distance d sits at y = −2·(0.6−0.5)·T·d − CAM_H. Ground-locked actors
 * (pads, parked/landing rotorcraft, the take-off roll) inherit the pan drift
 * PAN_K/d so they stay glued to the streaming 2D world.
 *
 * SCALE: 1 room unit = 5 m (SCALE_M). Every actor's display size is its real
 * dimension / SCALE_M, so the C-17 dwarfs the F-16 exactly as in life and
 * the approach growth reads true. Time, though, is scroll — the scene is a
 * compressed diorama (a real 2-minute departure plays over ~5 % of scroll),
 * so speed-radius-bank cannot all be literal at once. What IS kept honest:
 * the ORDER and SHAPE of every maneuver (accelerating roll → rotate → climb
 * FIRST → then bank; helicopter decel → flare → settle; lift → nose-over →
 * accelerate), attitudes derived from the actual path tangent, and bank
 * growing with the actual path curvature (a scaled coordinated-turn model,
 * capped at type-realistic angles).
 *
 * Everything scroll-driven is a pure function of the desert run's window-t;
 * the F-16 holding pattern alone is TIME-driven (the offer scene's ambient
 * ATC precedent) — it keeps circling while the visitor reads, and freezes
 * trivially under reduced motion because the 3D layer never mounts there.
 * Three-free by contract; unit-tested.
 */

import { clamp01, lerp, smoothstep } from '../canvas/toolkit'
import { FOV_TAN, anchorPoint } from './patrolMath'

/** Metres per room unit — the beat's world scale. */
export const SCALE_M = 5

/** The 2D desert's horizon line (mountain feet / runway vanish), viewport
 *  fraction. */
export const HORIZON_SY = 0.6

/** Camera height above the base's ground plane, room units (~32 m — the 2D
 *  scene's elevated vantage; derived from the apron bands' screen heights). */
export const CAM_H = 6.5

/** One world pan velocity behind the 2D layer drifts: a band at depth d
 *  drifts PAN_K/d viewport fractions per unit tRaw (tower 0.2 @ d 62,
 *  apron 0.3 @ d ≈ 41 — both ≈ 12.4/d). */
export const PAN_K = 12.4

/** Display sizes (longest GLB side, room units) = real metres / SCALE_M:
 *  C-17 53.0 m · AH-64E 17.2 m (incl. tail rotor) · F-16 14.9 m ·
 *  Mi-17 25.5 m (rotors turning). */
export const SIZE = { c17: 10.6, apache: 3.44, f16: 2.98, mi17: 5.1 } as const

/** Ground-plane height (room y) at camera distance d. */
export function groundY(d: number): number {
  return -2 * (HORIZON_SY - 0.5) * FOV_TAN * d - CAM_H
}

/** Where the ground at distance d sits on screen (viewport fraction). */
export function groundSy(d: number): number {
  return HORIZON_SY + CAM_H / (2 * d * FOV_TAN)
}

// ---------------------------------------------------------------------------
// pose
// ---------------------------------------------------------------------------

export type BagramPose = {
  x: number
  y: number
  z: number
  /** Yaw about +y; 0 = nose −z (away). Nose direction = (−sin h, 0, −cos h). */
  heading: number
  /** Positive = nose up. */
  pitch: number
  /** Positive = LEFT wing down (three 'YXZ' euler convention with nose −z). */
  bank: number
  /** The pose's own visibility envelope (life window); multiply by presence. */
  alpha: number
}

export function createBagramPose(): BagramPose {
  return { x: 0, y: 0, z: 0, heading: 0, pitch: 0, bank: 0, alpha: 0 }
}

/** Heading whose nose vector points down the horizontal direction (dx, dz). */
export function headingOf(dx: number, dz: number): number {
  return Math.atan2(-dx, -dz)
}

// ---------------------------------------------------------------------------
// heliports — the single source of truth the 2D scene draws and the 3D
// rotorcraft land on / depart from; they cannot desync.
// ---------------------------------------------------------------------------

export type Pad = {
  /** Camera distance of the pad centre. */
  d: number
  /** Screen x at tRaw = 0. */
  sx0: number
  /** Leftward drift, viewport fractions per unit tRaw — the 2D band rate the
   *  pad rides (tower band 0.2, apron band 0.3). */
  rate: number
  /** Pad radius, room units. */
  r: number
}

/** The two HELO STANDS live side by side on the rotary line RIGHT of the
 *  tower — the OPEN apron between the tent city and the taxiway/runway that
 *  runs under the control tower (Martin R6: lift them off that runway so they
 *  sit clear, on their own patch between the runway and the tents). At d 74
 *  the slab's foreshortened bottom edge clears the taxiway band and the top
 *  sits just under the tent rows. The Mi-17 pair waits on the LEFT stand (its
 *  departure corridor to the left stays clear), the Apache pair lands on the
 *  RIGHT one. Radius 16 m each (a Mi-17 rotor is 21 m — generous squares,
 *  drawn as real stands). Drift = the ground-lock pan at their depth
 *  (PAN_K/d ≈ 0.17). */
export const PAD_MI17: Pad = { d: 74, sx0: 0.74, rate: 0.17, r: 6.8 }

export const PAD_APACHE: Pad = { d: 74, sx0: 0.92, rate: 0.17, r: 6.8 }

// --- aspect-aware pair spread (mobile audit — the Bagram 2D overlap fix) -----
// A stand's screen SIZE scales with viewport HEIGHT (`rx·h`), but its authored
// centre (`sx0`) is a viewport-WIDTH fraction — so on a narrow portrait phone
// the two stands are drawn wide yet placed close, and collapse onto each other
// ("Mi-17 and Apache on the SAME pad"). The fix spreads the pair apart and
// nudges it left as the aspect narrows, so the two stands never coincide.
// Because the SAME `padSx` feeds the 2D drawing AND the 3D helo touchdown marks
// (`padMarkSx` → `markPoint`), both move together — the 2D/3D contract
// (ADR-047: helo wheels sit on the drawn marks) can never desync.
/** Pair midpoint of the two stands at the reference aspect (½·(0.74+0.92)). */
const PAD_PAIR_MID = 0.83
/** At/above this viewport aspect the stands sit at their authored `sx0` — the
 *  shipped desktop composition is byte-for-byte unchanged. */
const PAD_REF_ASPECT = 1.5
/** Clamp the narrowness factor so extreme aspects don't over-spread. */
const PAD_MAX_NARROW = 2.6
/** How hard the pair's gap widens per unit of narrowness. */
const PAD_SPREAD_GAIN = 0.7
/** How far the pair centre drifts LEFT per unit narrowness (keeps the right
 *  stand from running further off the edge as the gap grows). */
const PAD_MID_SHIFT = 0.055

/** The stand's screen-x centre at this aspect: the authored `sx0` on wide
 *  screens, spread apart + nudged left on narrow ones. */
function padCenter(pad: Pad, aspect: number): number {
  const narrow = Math.min(Math.max(PAD_REF_ASPECT / Math.max(aspect, 0.2), 1), PAD_MAX_NARROW) - 1
  const grow = 1 + narrow * PAD_SPREAD_GAIN
  const mid = PAD_PAIR_MID - narrow * PAD_MID_SHIFT
  return mid + (pad.sx0 - PAD_PAIR_MID) * grow
}

export function padSx(pad: Pad, tRaw: number, aspect: number = PAD_REF_ASPECT): number {
  return padCenter(pad, aspect) - pad.rate * tRaw
}

export function padSy(pad: Pad): number {
  return groundSy(pad.d)
}

/** Half the spacing between a pair's two touchdown marks, as a fraction of
 *  the stand's RADIUS (room-space) — the lead sits on the left mark, the
 *  wingman on the right (Martin: wheels touch two spots on the stand). Being
 *  a fraction of the SLAB, the marks stay the same distance inside the drawn
 *  concrete on EVERY viewport aspect — the R6 fix for marks that poked past
 *  the edge on wide screens (they used to be a fixed fraction of WIDTH while
 *  the slab is a fraction of HEIGHT). 0.5·r + the mark ring (0.34·r) ⇒ the
 *  outer edge lands at 0.84·r, comfortably inside the slab. The ONE
 *  definition the 2D marks and the 3D parking both read. */
export const MARK_HALF_R = 0.5

/** Screen-x of a ship's touchdown mark on a stand at tRaw (ship 0 = left) —
 *  the pad centre plus the mark's room-x offset (±MARK_HALF_R·r) projected at
 *  the pad depth (so it is the same fraction of the slab at any aspect). */
export function padMarkSx(pad: Pad, tRaw: number, ship: 0 | 1, aspect: number): number {
  const off = (MARK_HALF_R * pad.r) / (2 * pad.d * FOV_TAN * aspect)
  return padSx(pad, tRaw, aspect) + (ship === 0 ? -off : off)
}

/** Room-space touchdown mark (on the ground plane) for a ship — the ONE
 *  point both the 2D stand mark and the 3D helo's wheels sit on. */
function markPoint(pad: Pad, tRaw: number, aspect: number, ship: 0 | 1, out: [number, number, number]): void {
  anchorPoint(padMarkSx(pad, tRaw, ship, aspect), padSy(pad), pad.d, aspect, out)
}

export type PadScreen = {
  sx: number
  sy: number
  /** Pad radius as a fraction of viewport HEIGHT (screen px = rx · h; the
   *  projection is isotropic, x extent in px is the same number). */
  rx: number
  /** Vertical squash of the ground ellipse (ry = rx · squash). */
  squash: number
}

/** The pad as the 2D layer draws it. `aspect` (w/h) spreads the pair apart on
 *  narrow screens so the two stands never collapse together — the 3D helo
 *  marks read the same aspect-aware centre, so the two layers stay locked. */
export function padScreen(pad: Pad, tRaw: number, out: PadScreen, aspect: number = PAD_REF_ASPECT): PadScreen {
  out.sx = padSx(pad, tRaw, aspect)
  out.sy = padSy(pad)
  out.rx = pad.r / (2 * pad.d * FOV_TAN)
  out.squash = CAM_H / pad.d
  return out
}

// ---------------------------------------------------------------------------
// shared helpers
// ---------------------------------------------------------------------------

const _a: [number, number, number] = [0, 0, 0]
const _c: [number, number, number] = [0, 0, 0]
const _d: [number, number, number] = [0, 0, 0]
const _e: [number, number, number] = [0, 0, 0]
const _tan: [number, number, number] = [0, 0, 0]
/** Throwaway pose for probing curve speeds (never returned). */
const _POSE_SCRATCH = createBagramPose()

/** Quadratic Bézier point + tangent (derivative wrt u), allocation-free. */
function bezier(
  p0: readonly [number, number, number],
  c: readonly [number, number, number],
  p1: readonly [number, number, number],
  u: number,
  out: BagramPose,
  tan: [number, number, number],
): void {
  const v = 1 - u
  out.x = v * v * p0[0] + 2 * v * u * c[0] + u * u * p1[0]
  out.y = v * v * p0[1] + 2 * v * u * c[1] + u * u * p1[1]
  out.z = v * v * p0[2] + 2 * v * u * c[2] + u * u * p1[2]
  tan[0] = 2 * v * (c[0] - p0[0]) + 2 * u * (p1[0] - c[0])
  tan[1] = 2 * v * (c[1] - p0[1]) + 2 * u * (p1[1] - c[1])
  tan[2] = 2 * v * (c[2] - p0[2]) + 2 * u * (p1[2] - c[2])
}

/** Curvature of a quadratic Bézier at u (|B′×B″| / |B′|³). */
function bezierCurvature(
  p0: readonly [number, number, number],
  c: readonly [number, number, number],
  p1: readonly [number, number, number],
  u: number,
): number {
  const v = 1 - u
  const dx = 2 * v * (c[0] - p0[0]) + 2 * u * (p1[0] - c[0])
  const dy = 2 * v * (c[1] - p0[1]) + 2 * u * (p1[1] - c[1])
  const dz = 2 * v * (c[2] - p0[2]) + 2 * u * (p1[2] - c[2])
  const ax = 2 * (p1[0] - 2 * c[0] + p0[0])
  const ay = 2 * (p1[1] - 2 * c[1] + p0[1])
  const az = 2 * (p1[2] - 2 * c[2] + p0[2])
  const cx = dy * az - dz * ay
  const cy = dz * ax - dx * az
  const cz = dx * ay - dy * ax
  const num = Math.hypot(cx, cy, cz)
  const den = Math.pow(dx * dx + dy * dy + dz * dz, 1.5)
  return den > 1e-9 ? num / den : 0
}

/** Heading + pitch from a tangent, written into the pose. */
function attitudeFromTangent(tan: readonly [number, number, number], pose: BagramPose): void {
  const horiz = Math.hypot(tan[0], tan[2])
  pose.heading = headingOf(tan[0], tan[2])
  pose.pitch = Math.atan2(tan[1], Math.max(horiz, 1e-6))
}

/** The pan drift every ground-locked actor inherits, in screen-x fractions
 *  at its own depth: Δsx = PAN_K / d · Δt. */
function panSx(d: number, dt: number): number {
  return (PAN_K / d) * dt
}

// ---------------------------------------------------------------------------
// C-17 DEPARTURE — Martin's red-line choreography: the take-off ROLL runs
// LEFT→RIGHT along the drawn runway band (screen-parallel, constant depth,
// drifting with the band's own pan), it rotates and climbs STRAIGHT AHEAD
// still eastbound, then a real RIGHT turn brings it toward the viewer — the
// sweep dives down-right across the frame and it exits the right edge low,
// close and huge (small at take-off → grows the whole approach → banks
// away). The turn is a quadratic Bézier whose control point continues the
// climb tangent at the climb's speed (λ = v·dur/2 → C1 continuity); bank is
// derived from the curve's real centripetal acceleration, right-wing-down.
// ---------------------------------------------------------------------------

export const C17 = {
  // A short roll buried in the fade-in, then it lifts off EARLY (before the
  // scene reads) and CLIMBS up onto the runway strip / low mountains, flying
  // it high and clear before the diving turn (Martin R6: don't leave it low,
  // small and dark-on-dark against the foothill mound — get it UP, above the
  // mounds/tower, silhouetted against the light haze, its shadow sweeping the
  // base early). The roll is deliberately gentle (low exit speed) so the climb
  // keeps accelerating monotonically — no dart-right-then-back.
  rollStart: -0.24,
  liftoff: -0.1,
  bankStart: 0.04,
  exit: 0.4,
  /** Alpha kill once it is off the bottom edge. */
  gone: 0.41,
  /** The departure band's camera distance — the FAR runway under the
   *  mountains (Martin R7: not from the hangar — take off from the more
   *  DISTANT strip, so it starts higher in the frame and keeps GREATER
   *  absolute altitude above the terrain the whole flight). At d 140 the roll
   *  sits on the far strip (~7 % of frame height), the tall climb lifts it up
   *  onto the low mountains, and the right-turn dive still brings it huge past
   *  the viewer (~65 %). */
  runwayD: 450,
  /** Wheels on the ground plane at that depth (groundSy(450)). The FAR runway
   *  STRIP up by the horizon, lifted one airframe-height clear of the tent
   *  tops (Martin R11: nudge the take-off UP by its own height so it sits ON
   *  the runway, not touching the tents). Needs the raised Stage3D far plane
   *  (480) so the airframe (tail at z ≈ −455) is not clipped. */
  runwaySy: 0.614,
  /** Roll / rotation / end-of-climb screen x — a SHORT ground roll (kept
   *  gentle so the climb stays faster than the roll and never reverses in x),
   *  then the climb-out to where the right turn begins. */
  startSx: 0.45,
  liftSx: 0.54,
  climbEndSx: 0.7,
  /** Exit: the right turn CLIMBS it up and toward the viewer (Martin R10: fly
   *  HIGHER, up into the centre-top of the frame, NOT down over the fence) —
   *  it banks right and climbs OUT the top edge, growing as it nears but
   *  staying high. Upper-right sx, above-frame sy, moderate depth. */
  exitSx: 0.82,
  exitSy: -0.05,
  exitD: 35,
  /** Altitude gained over the straight climb (units) — a TALL climb (Martin
   *  R9: much higher, not low over the base) that lifts it from the far roll
   *  (sy ≈ 0.621) HIGH up into the sky above the tower and mountains. */
  climbAlt: 30,
  /** Max bank in the sweep (~29° — an honest transport departure bank). */
  bankMax: 0.5,
  /** Rotation pitch at liftoff / extra AOA over the path angle. */
  pitchRot: 0.2,
  aoa: 0.05,
} as const

export function c17PoseAt(tRaw: number, aspect: number, out: BagramPose): BagramPose {
  const T = C17
  out.alpha = tRaw >= T.rollStart && tRaw <= T.gone ? 1 : 0
  if (out.alpha <= 0) return out

  const rollDur = T.liftoff - T.rollStart
  const climbDur = T.bankStart - T.liftoff
  const turnDur = T.exit - T.bankStart

  // The whole ground+climb line lives at ONE depth (the runway band is
  // screen-parallel) and drifts with the band's own pan while the jet is
  // tied to the runway heading; airborne in the turn it flies world-free.
  const drift = panSx(T.runwayD, Math.min(tRaw, T.bankStart) - T.rollStart)
  const kx = 2 * T.runwayD * FOV_TAN * aspect // room-x per unit sx at depth
  const x0 = (T.startSx - drift - 0.5) * kx
  const yRwy = (0.5 - T.runwaySy) * 2 * T.runwayD * FOV_TAN
  const rollLen = (T.liftSx - T.startSx) * kx
  const climbLen = (T.climbEndSx - T.liftSx) * kx
  /** Speed at the end of the accelerating roll (s = L·u² → v = 2L/dur). */
  const v0 = (2 * rollLen) / rollDur
  const east = headingOf(1, 0)

  if (tRaw <= T.liftoff) {
    // --- accelerating take-off roll LEFT→RIGHT (v grows linearly, s ∝ u²) --
    const u = clamp01((tRaw - T.rollStart) / rollDur)
    out.x = x0 + rollLen * u * u
    out.y = yRwy
    out.z = -T.runwayD
    out.heading = east
    // Rotation: the nose comes up over the last stretch of the roll.
    out.pitch = T.pitchRot * smoothstep(0.86, 1, u)
    out.bank = 0
    return out
  }

  // Shared climb-phase quantities.
  const accel = (2 * (climbLen - v0 * climbDur)) / (climbDur * climbDur)
  const v1 = v0 + accel * climbDur

  if (tRaw <= T.bankStart) {
    // --- climb STRAIGHT ahead first (never bank off the ground) -----------
    // Altitude runs a smoothstep (zero slope at both ends): the rotation
    // blends into the climb and the jet levels off accelerating just
    // before the bank — then the turn carries it away.
    const tau = tRaw - T.liftoff
    const q = tau / climbDur
    out.x = x0 + rollLen + v0 * tau + 0.5 * accel * tau * tau
    out.y = yRwy + T.climbAlt * q * q * (3 - 2 * q)
    out.z = -T.runwayD
    out.heading = east
    const horizV = v0 + accel * tau
    const vs = (T.climbAlt * 6 * q * (1 - q)) / climbDur
    out.pitch = Math.atan2(vs, horizV) + lerp(T.pitchRot, T.aoa, smoothstep(0, 0.5, q))
    out.bank = 0
    return out
  }

  // --- the RIGHT turn toward the viewer, arcing forward to CENTRE-bottom --
  // Entry state at bankStart (level, eastbound, accelerating):
  _c[0] = x0 + rollLen + climbLen
  _c[1] = yRwy + T.climbAlt
  _c[2] = -T.runwayD
  // Control point continues the entry tangent at the entry speed (C1).
  const lam = (v1 * turnDur) / 2
  _d[0] = _c[0] + lam
  _d[1] = _c[1]
  _d[2] = _c[2]
  // Exit: central, huge, diving off the bottom edge (through the viewer).
  anchorPoint(T.exitSx, T.exitSy, T.exitD, aspect, _e)

  const u = clamp01((tRaw - T.bankStart) / turnDur)
  bezier(_c, _d, _e, u, out, _tan)
  attitudeFromTangent(_tan, out)
  out.pitch += T.aoa
  // Coordinated bank from the curve's REAL centripetal acceleration κ·v²
  // (v = |B′|/dur), normalized so the tightest point of the sweep banks
  // exactly bankMax; a short roll-in eases the wing down off level flight.
  // NEGATIVE = right wing down — it turns through its right (Martin's arc).
  let acMax = 1e-6
  for (const us of [0.3, 0.5, 0.7, 0.9]) {
    bezier(_c, _d, _e, us, _POSE_SCRATCH, _tan)
    const sp = Math.hypot(_tan[0], _tan[1], _tan[2]) / turnDur
    acMax = Math.max(acMax, bezierCurvature(_c, _d, _e, us) * sp * sp)
  }
  bezier(_c, _d, _e, u, _POSE_SCRATCH, _tan)
  const spd = Math.hypot(_tan[0], _tan[1], _tan[2]) / turnDur
  const ac = bezierCurvature(_c, _d, _e, u) * spd * spd
  // Once rolled in, the wing HOLDS through the turn (floor at half of max)
  // and only shallows toward the rollout — the viewer catches it still
  // banked as it blasts past (Martin's mid-bank exit).
  out.bank =
    -Math.atan(Math.tan(T.bankMax) * (0.5 + 0.5 * Math.min(ac / acMax, 1))) *
    smoothstep(0, 0.2, u)
  return out
}

// ---------------------------------------------------------------------------
// APACHE PAIR — blasts in THROUGH the viewer from the FRONT (Martin: the same
// wow as the landing-break jets in the sunset scene, NOT from the left): the
// pair slides in over the top edge HUGE, right over the observer's head, and
// rushes FORWARD into the base — shrinking as it recedes toward the stand,
// its shadow sweeping the ground below — then eases to the hover gate and
// settles: flare (nose up, rate killed), vertical drop, wheels onto the mark.
// The wingman flies the same profile delayed and lands on the second mark.
// ---------------------------------------------------------------------------

export const APACHE = {
  in: 0.06,
  flare: 0.38,
  touch: 0.46,
  /** Wingman's delay (t). */
  wingDelay: 0.05,
  /** Transit anchors (lead): ENTER huge over the top edge, right over the
   *  viewer (close = fills the frame), and rush FORWARD along a plain
   *  quadratic bezier — control `ctrl` shapes a smooth descending arc that
   *  curves toward the stand (right + down) — to the hover gate over the
   *  mark. Enter u 0 → gate u 1; the control is NOT interpolated (a
   *  through-mid interpolation overshot left against the far gate). */
  enter: { sx: 0.4, sy: 0.0, d: 4 },
  ctrl: { sx: 0.6, sy: 0.42, d: 20 },
  /** Hover gate height above the mark (units). Wheels touch via the runtime
   *  wheelLift (measured off the GLB) — groundOff stays 0 here. */
  gateAlt: 3.4,
  groundOff: 0,
  /** Flare pitch pulse (nose-up, rad) and transit nose-down attitude. */
  flarePitch: 0.2,
  cruisePitch: -0.1,
  /** Max transit bank (curvature-scaled). */
  bankMax: 0.18,
  /** Wingman's transit offset (echelon left, a touch low and deeper) — the
   *  PARKED spot is the second stand mark, not this. */
  wingOff: { sx: -0.05, sy: 0.03, d: 2.2 },
} as const

export type ApacheShip = 0 | 1

export function apachePoseAt(tRaw: number, aspect: number, ship: ApacheShip, out: BagramPose): BagramPose {
  const T = APACHE
  const t = ship === 0 ? tRaw : tRaw - T.wingDelay
  out.alpha = t >= T.in ? 1 : 0
  if (out.alpha <= 0) return out

  // The touchdown mark this ship lands on (rides the LIVE pan for both).
  markPoint(PAD_APACHE, tRaw, aspect, ship, _c)

  if (t >= T.touch) {
    // --- parked on its mark, rotors turning, riding the pan --------------
    out.x = _c[0]
    out.y = _c[1] + T.groundOff
    out.z = _c[2]
    out.heading = headingOf(0.32, -0.95) // parked facing away, a touch right
    out.pitch = 0
    out.bank = 0
    return out
  }

  const woSx = ship === 1 ? T.wingOff.sx : 0
  anchorPoint(T.enter.sx + woSx, T.enter.sy + (ship === 1 ? T.wingOff.sy : 0), T.enter.d + (ship === 1 ? T.wingOff.d : 0), aspect, _a)
  anchorPoint(T.ctrl.sx + woSx, T.ctrl.sy, T.ctrl.d, aspect, _d)

  if (t <= T.flare) {
    // --- the FORWARD RUSH through the viewer: a plain quadratic bezier
    // enter → ctrl → gate. It punches in huge over the head (enter, u 0),
    // rushes forward and curves toward the stand (ctrl), easing to the hover
    // gate (u 1). A decelerating time-warp makes it fast in, slow at the
    // gate — a real Apache arrival. -----------------------------------------
    const p = clamp01((t - T.in) / (T.flare - T.in))
    const u = 1 - Math.pow(1 - p, 2)
    _e[0] = _c[0]
    _e[1] = _c[1] + T.gateAlt
    _e[2] = _c[2]
    bezier(_a, _d, _e, u, out, _tan)
    attitudeFromTangent(_tan, out)
    // Rotorcraft attitude: nose-down hauling, easing level as speed bleeds.
    out.pitch = lerp(T.cruisePitch, 0, smoothstep(0.55, 1, u))
    const kMax = Math.max(bezierCurvature(_a, _d, _e, 0.5), 1e-6)
    const roll = Math.min(bezierCurvature(_a, _d, _e, u) / kMax, 1)
    // Banks into its bow, wings level for the gate.
    out.bank = T.bankMax * roll * (1 - smoothstep(0.7, 1, u))
    return out
  }

  // --- flare + vertical settle onto the mark ------------------------------
  const q = clamp01((t - T.flare) / (T.touch - T.flare))
  const ease = 1 - (1 - q) * (1 - q) // decelerating descent → zero rate
  out.x = _c[0]
  out.z = _c[2] - (1 - ease) * 1.6 // the last forward slide dies in the flare
  out.y = _c[1] + T.groundOff + T.gateAlt * (1 - ease)
  out.heading = headingOf(0.32, -0.95)
  // The flare pulse: nose comes up hard early, settles level for touchdown.
  out.pitch = T.flarePitch * Math.sin(Math.min(q * 1.35, 1) * Math.PI)
  out.bank = 0
  return out
}

// ---------------------------------------------------------------------------
// Mi-17 DEPARTURE — a PAIR (the ride out flies as a two-ship): both wait on
// the left helo stand, rotors turning, dead still until the departure —
// then a real rotorcraft lift-off in sequence: vertical lift, nose-over,
// accelerate LEFT and away off the frame in trail, passing well behind the
// Apache arrival (depth-separated flows; asserted by tests).
// ---------------------------------------------------------------------------

export const MI17 = {
  // The pair SITS through the whole Apache overflight (Martin: they wait on
  // the stand, wheels on the marks, rotors turning, and only depart once the
  // Apaches have passed over them and are settling — lift > APACHE.touch) —
  // then one continuous lift → nose-over → sprint, no hover parade.
  lift: 0.5,
  noseOver: 0.555,
  out: 0.9,
  gone: 0.92,
  /** The wingman's lift delay. On the ground each ship sits on its own stand
   *  mark; in flight the delay keeps the wingman in trail. */
  wingDelay: 0.035,
  /** Vertical lift height (units) before the nose-over. */
  hover: 2.6,
  /** Climb reached by frame exit. */
  exitAlt: 8,
  /** Departure direction (unit x/z): left, a touch toward the viewer. */
  dir: [-0.96, 0.28] as const,
  /** Total departure distance (units). Reaches clear off the left edge from
   *  the farther d74 stand (the deeper the start, the more room-run one screen
   *  width costs). */
  run: 80,
  noseDown: -0.16,
  cruisePitch: -0.07,
  /** Wheels touch via the runtime wheelLift (measured off the GLB) —
   *  groundOff stays 0 (the mark IS the ground). */
  groundOff: 0,
  /** Small left lean while accelerating. */
  leanBank: 0.07,
} as const

export type Mi17Ship = 0 | 1

export function mi17PoseAt(tRaw: number, aspect: number, ship: Mi17Ship, out: BagramPose): BagramPose {
  const T = MI17
  const t = ship === 0 ? tRaw : tRaw - T.wingDelay
  out.alpha = t <= T.gone ? 1 : 0
  if (out.alpha <= 0) return out

  // Each ship sits on / lifts from its OWN stand mark, riding the LIVE pan
  // (tRaw for both). In flight the wingman's delay keeps it in trail.
  markPoint(PAD_MI17, tRaw, aspect, ship, _a)
  out.heading = headingOf(T.dir[0], T.dir[1])
  out.bank = 0
  out.pitch = 0

  if (t <= T.lift) {
    // --- parked on the stand, rotors on, riding the pan — the FIRST
    // movement is the departure itself (Martin's beat) -----------------------
    out.x = _a[0]
    out.y = _a[1] + T.groundOff
    out.z = _a[2]
    return out
  }

  if (t <= T.noseOver) {
    // --- vertical lift off the stand ---------------------------------------
    const u = smoothstep(0, 1, (t - T.lift) / (T.noseOver - T.lift))
    out.x = _a[0]
    out.y = _a[1] + T.groundOff + T.hover * u
    out.z = _a[2]
    // The nose starts dropping right at the top of the lift.
    out.pitch = T.noseDown * smoothstep(0.82, 1, u)
    return out
  }

  // --- nose-over, accelerate left, climb away -----------------------------
  const p = clamp01((t - T.noseOver) / (T.out - T.noseOver))
  // Accelerating sprint: quadratic blend into a linear run.
  const s = T.run * (p * p * (1.6 - 0.6 * p))
  out.x = _a[0] + T.dir[0] * s
  out.z = _a[2] + T.dir[1] * s
  out.y = _a[1] + T.groundOff + T.hover + (T.exitAlt - T.hover) * smoothstep(0.08, 1, p)
  // Nose-over deepest at the start of the acceleration, easing to cruise.
  out.pitch = lerp(T.noseDown, T.cruisePitch, smoothstep(0.15, 0.6, p))
  out.bank = -T.leanBank * Math.sin(Math.min(p * 2.2, 1) * Math.PI)
  return out
}

// ---------------------------------------------------------------------------
// F-16 HOLDING PATTERN — a two-ship racetrack high over the base, far and
// small (others fly them here). TIME-driven: it keeps circling while the
// visitor reads (the ambient-ATC precedent); under prefers-reduced-motion
// the 3D layer never mounts, so the pattern never moves there. Legs run
// screen-parallel, the turns curve through depth with a coordinated bank.
// ---------------------------------------------------------------------------

export const F16 = {
  /** Near/far leg camera distances — the pattern sits CLOSE now (Martin,
   *  twice: bigger/nearer) and both legs stay clearly readable. */
  dNear: 50,
  dFar: 95,
  /** The near leg spans this sx range (screen-authored → aspect-proof). */
  sxHalf: 0.26,
  sxCentre: 0.525,
  /** Pattern altitude above the camera (units). */
  altY: 19,
  /** Speed, room units per second (≈ 90 m/s — the far pattern is the one
   *  place absolute time exists, so this one IS real). */
  v: 18,
  /** Bank in the turns (capped — see the diorama note in the header). */
  bankMax: 0.9,
  /** Nose-up trim through the turns. */
  turnPitch: 0.04,
} as const

export type F16Ship = 0 | 1

/** Racetrack perimeter for an aspect (the legs are screen-authored). */
export function f16Perimeter(aspect: number): number {
  const L = 2 * F16.sxHalf * 2 * F16.dNear * FOV_TAN * aspect
  const r = (F16.dFar - F16.dNear) / 2
  return 2 * L + 2 * Math.PI * r
}

/** Lap time in seconds (the test's closed-loop assertion base). */
export function f16Lap(aspect: number): number {
  return f16Perimeter(aspect) / F16.v
}

export function f16PoseAt(time: number, tRaw: number, aspect: number, ship: F16Ship, out: BagramPose): BagramPose {
  const T = F16
  const L = 2 * T.sxHalf * 2 * T.dNear * FOV_TAN * aspect
  const r = (T.dFar - T.dNear) / 2
  const P = 2 * L + 2 * Math.PI * r
  const arc = Math.PI * r

  let s = (time * T.v + (ship === 1 ? P / 2 : 0)) % P
  if (s < 0) s += P

  // World-pan drift of the whole pattern (depth-free in units).
  const xPan = -2 * FOV_TAN * aspect * PAN_K * (tRaw - 0.25)
  const cx = (T.sxCentre - 0.5) * 2 * T.dNear * FOV_TAN * aspect + xPan
  const zNear = -T.dNear
  const zFar = -T.dFar
  const zMid = (zNear + zFar) / 2

  out.alpha = 1
  out.y = T.altY
  out.pitch = 0
  let turn = -1 // 0..1 inside a turn, else -1

  // Turn circles: centre at the leg end / zMid; θ runs θ0 − a·π so the
  // semicircle bulges OUTWARD (past the leg end) and the tangent stays
  // continuous with both legs: pos = centre + (cosθ, sinθ)·r, dir ∝
  // (sinθ, −cosθ). Near leg enters the right-end turn at θ0 = π/2 (z
  // = zMid + r = zNear), the far leg enters the left-end at θ0 = −π/2.
  if (s < L) {
    // near leg: left → right
    out.x = cx - L / 2 + s
    out.z = zNear
    out.heading = headingOf(1, 0)
  } else if (s < L + arc) {
    // right-end turn, curving away through depth
    const a = (s - L) / arc
    const ang = Math.PI / 2 - a * Math.PI
    out.x = cx + L / 2 + Math.cos(ang) * r
    out.z = zMid + Math.sin(ang) * r
    out.heading = headingOf(Math.sin(ang), -Math.cos(ang))
    turn = a
  } else if (s < 2 * L + arc) {
    // far leg: right → left
    const q = s - L - arc
    out.x = cx + L / 2 - q
    out.z = zFar
    out.heading = headingOf(-1, 0)
  } else {
    // left-end turn, curving back toward the viewer
    const a = (s - 2 * L - arc) / arc
    const ang = -Math.PI / 2 - a * Math.PI
    out.x = cx - L / 2 + Math.cos(ang) * r
    out.z = zMid + Math.sin(ang) * r
    out.heading = headingOf(Math.sin(ang), -Math.cos(ang))
    turn = a
  }

  if (turn >= 0) {
    // Coordinated bank, rolled in/out over the turn's shoulders. The
    // racetrack curves one rotational way, so the bank sign is one (left
    // wing down — the pattern turns through its own left).
    const env = smoothstep(0, 0.2, turn) * (1 - smoothstep(0.8, 1, turn))
    out.bank = T.bankMax * env
    out.pitch = T.turnPitch * env
  } else {
    out.bank = 0
  }
  return out
}

// ---------------------------------------------------------------------------
// presence + ground fx
// ---------------------------------------------------------------------------

export type SlotLike = { sky: string | undefined; alpha: number }

/**
 * The desert run's share of the frame, composed exactly like the 2D stage
 * paints its slots (incoming over base) — the climb's skyPresence pattern
 * at sky-mood granularity.
 */
export function desertPresence(slots: readonly SlotLike[], count: number): number {
  if (count === 0) return 0
  const base = slots[0]
  if (count === 1) return base.sky === 'desert' ? 1 : 0
  const inc = slots[1]
  if (base.sky === 'desert') return inc.sky === 'desert' ? 1 : 1 - inc.alpha
  return inc.sky === 'desert' ? inc.alpha : 0
}

/** The ground plane's slope in room space (y = GROUND_SLOPE·z − CAM_H) —
 *  the 3D layer stretches its REAL shadow-catcher plane along it, so every
 *  actor's shadow falls exactly where the 2D bands say the ground is. */
export const GROUND_SLOPE = 2 * (HORIZON_SY - 0.5) * FOV_TAN
