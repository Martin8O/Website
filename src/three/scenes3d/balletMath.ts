/**
 * BALLET MATH — pure choreography for the chapter-02 one-circle fight flown
 * as a REAL 3D climbing double helix (the l159-ballet-3d showcase, ported):
 * two stores-laden L-159s corkscrew a shared vertical axis on opposite
 * phases, weaving over/under each other, breathing apart and back together.
 *
 * The whole point (do not regress): every attitude is DERIVED from the
 * flight path by a coordinated-turn model — the required aerodynamic
 * specific force is `a − g`, the lift (body-up) points along its component
 * perpendicular to the flight path, and the bank is the signed angle about
 * the path from gravity-up to that lift direction. The jets bank INTO the
 * helix exactly as much as the turn + the climb demand, the way real
 * aircraft must — never a scripted pose.
 *
 * Scroll IS the clock. The beat windows are authored in HUD % (Martin
 * directs in the bottom-left readout: the L-159 + its label appear ~23 %,
 * the 3rd step after that starts the fade-in, the ballet flies 6 steps,
 * fade-out at the end of the 6th) and converted ONCE through the live
 * weight map into the cruise run's localT — so a future re-weighting of
 * the chapter moves every beat with it instead of silently breaking it.
 *
 * Three-free by contract: the 2D `cruise.ts` (main bundle) imports the
 * windows + the cloud-sink curve so both worlds share one timing source.
 */

import { CHAPTER_WEIGHTS } from '../../data/chapters'
import { posFromProgress } from '../../timeline'
import { FOV_TAN } from '../patrolMath'

const TAU = Math.PI * 2

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

function smoothstep(a: number, b: number, x: number): number {
  const u = clamp01((x - a) / (b - a))
  return u * u * (3 - 2 * u)
}

/** The cruise scene's run window start on the pos line (chapter 3 is a
 *  single-chapter run → `runWindow` = [2.5, 3.5], length 1, so the run's
 *  localT is simply `pos − 2.5`). Guarded by the round-trip unit test —
 *  if the story ever reorders, the test fails instead of the beats drifting. */
const CRUISE_WIN0 = 2.5

/** HUD % (bottom-left readout = progress × 100) → cruise-run localT,
 *  through the live scroll-weight map. */
function tAtHud(hud: number): number {
  return posFromProgress(hud / 100, CHAPTER_WEIGHTS) - CRUISE_WIN0
}

/**
 * The beat windows, in cruise-run localT (Martin's direction, HUD %):
 *  - 19 %: the hard cut — the complete 02 scene (solo L-159, HUD, card)
 *    replaces the climb in one instant (the chapter's enterFade)
 *  - 21 %: the ballet POPS IN, full presence, and the solo vanishes the
 *    same frame — Martin: instant swaps, never a half-ghost overlap
 *  - 21→28 %: the one-circle fight (seven percent, 2.5 revolutions)
 *  - 28.0 %: the pair POPS OUT off its final frame — full motion to the
 *    last instant — while the COMAO lead is just nosing into the frame
 * `in1`/`out1` bound the maneuver bookkeeping (flow/turns span in0→out0;
 * presence itself is BINARY — see balletPresence).
 */
export const BALLET = {
  in0: tAtHud(21),
  in1: tAtHud(22),
  out0: tAtHud(28),
  out1: tAtHud(29),
} as const

/** The instant the pair pops out: exactly the end of the sixth step at
 *  28.0 — the fight flies at full speed to its very last frame and then is
 *  GONE (Martin: a stop at 28 still shows the pair; one scroll later the
 *  ballet has vanished completely — no frozen half-motion hang). The COMAO
 *  lead is nosing past the left frame edge at that same instant (its run
 *  starts off-screen at 27.7), so the sky is never empty. */
const BALLET_KILL = BALLET.out0

/** The 2D COMAO package (Gripens + L-159 pair + Mi-17s) flies in FROM THE
 *  LEFT at full intensity and ONE constant speed (the renderer maps this
 *  window linearly, with only a SHORT terminal braking arc onto the marks —
 *  Martin: every leg of the approach must move equally fast; without the
 *  braking, whatever sliver of motion was left before the marks snapped
 *  through in a blink at the start of a glide). The run starts off-screen
 *  at 27.7, the lead noses into frame right as the ballet pops out at 28.0,
 *  and the package stands on its marks at 29.7 — then it OWNS the frame
 *  before Bagram (sweep from 31.3). */
export const COMAO = {
  in0: tAtHud(27.7),
  in1: tAtHud(29.7),
} as const

/** The maneuver — the showcase's locked values (HANDOFF-l159-ballet §3).
 *  If `R0` ever changes, re-tune `G` proportionally to keep the peak bank
 *  a graceful ~60–65°. */
export const CFG = {
  /** Base helix radius — WIDE, so the pair reads small with real air
   *  between them. */
  R0: 18.2,
  /** ± fraction the radius breathes → they close & extend. */
  breatheAmp: 0.34,
  breathePeriod: 8.0,
  /** Flow-seconds per revolution around the axis. */
  orbitPeriod: 6.2,
  /** World units / flow-s the corkscrew gains — the climb the 2D clouds
   *  answer by sinking. */
  climbRate: 3.4,
  /** Opposite vertical stagger → true 3D crossings (the near-miss). */
  stagger: 2.4,
  staggerPeriod: 6.2,
  /** Load reference for the coordinated-turn bank (larger = shallower). */
  G: 16.0,
  /** A touch of angle-of-attack — jets fly nose-high. */
  aoaDeg: 3.2,
  /** Revolutions across the LIVE window (in0→out0, seven percent) — the
   *  showcase's locked pace. The clock FREEZES through the fade-out (see
   *  balletFlow), so the pair always dissolves on the same final pose. */
  revs: 2.5,
} as const

/** Flow-seconds across the whole beat window. */
export const FLOW_SPAN = CFG.revs * CFG.orbitPeriod

/** The ballet's visibility (multiply by the slot alpha) — BINARY, the
 *  landing-break idiom: the pair IS there or it is not. Any partial alpha
 *  on the big airframes either turned them see-through (classic blending,
 *  no self-occlusion) or into noise (hashed dissolve) — Martin killed
 *  both; the site's beloved swaps are instant. */
export function balletPresence(t: number): number {
  return t >= BALLET.in0 && t <= BALLET_KILL ? 1 : 0
}

/** The maneuver clock: scroll → flow-seconds, linear across the LIVE
 *  window and FROZEN through the fade-out — the jets hold their final pose
 *  and dissolve in place. (They used to keep corkscrewing under the fade,
 *  so the "last image" depended on where the visitor's glide happened to
 *  sample the window — one pass ended near the viewer, another in the
 *  text. Deterministic per position, but perceived as random; Martin's
 *  catch. Now every pass ends on the same frame.) */
export function balletFlow(t: number): number {
  return clamp01((t - BALLET.in0) / (BALLET.out0 - BALLET.in0)) * FLOW_SPAN
}

/** Revolutions flown at scroll t — the 2D fallback corkscrew turns on the
 *  SAME clock, so the two worlds fly the same fight. */
export function balletTurns(t: number): number {
  return balletFlow(t) / CFG.orbitPeriod
}

/**
 * How far the 2D cloud sea has sunk (0..1): the pair climbs through the
 * whole ballet, so the deck drops away below them — eased across the
 * window, holding once the fight tops out (the desert crossfade covers
 * the reset). The SUN stays where `sunArc` puts it — it is one object
 * across every flying scene.
 */
export function cloudSink(t: number): number {
  return smoothstep(BALLET.in0, BALLET.out0, t)
}

/** The cruise cockpit readouts — ONE source for the 2D glass HUD and the
 *  3D mid-depth HUD billboard, so the hand-over between them is invisible.
 *  The altitude climbs with the fight (the sinking deck is the same story). */
export function cruiseHud(t: number): { mach: number; altFt: number; hdg: number } {
  return {
    mach: 0.74 + smoothstep(0.8, 0.95, t) * 0.08,
    altFt: 21500 + 5200 * cloudSink(t),
    hdg: 139,
  }
}

// ---------------------------------------------------------------------------
//  THE PHYSICS — analytic helix + coordinated-turn bank (pure array math;
//  the three.js binding in CruiseBallet.tsx only assembles quaternions).
// ---------------------------------------------------------------------------

type V3 = [number, number, number]

/** Position of jet k (0 lead, 1 wing — π apart) at flow-time tt, into `out`.
 *  Radius breathes; the opposite vertical stagger makes the crossings truly
 *  three-dimensional (near-miss in depth, not just in projection). */
export function helixPos(tt: number, k: 0 | 1, out: V3): V3 {
  const phase = k * Math.PI
  const u = (TAU / CFG.orbitPeriod) * tt + phase
  const R = CFG.R0 * (1 + CFG.breatheAmp * Math.sin((TAU / CFG.breathePeriod) * tt))
  const yStag = CFG.stagger * Math.sin((TAU / CFG.staggerPeriod) * tt + phase)
  out[0] = R * Math.sin(u)
  out[1] = CFG.climbRate * tt + yStag
  out[2] = R * Math.cos(u)
  return out
}

export type BalletPose = {
  /** World position on the helix. */
  p: V3
  /** Unit forward — the flight-path tangent the nose flies down. */
  f: V3
  /** Unit lift direction (body-up before AoA) — the coordinated-turn
   *  result; also the axis pair for the AoA pitch (right = f × lift). */
  lift: V3
  /** Signed roll about `f` from wings-level to `lift`, radians. */
  bank: number
}

export function createBalletPose(): BalletPose {
  return { p: [0, 0, 0], f: [0, 0, -1], lift: [0, 1, 0], bank: 0 }
}

// Scratch — the hot path allocates nothing.
const _p0: V3 = [0, 0, 0]
const _p1: V3 = [0, 0, 0]
const _p2: V3 = [0, 0, 0]
const _v: V3 = [0, 0, 0]
const _a: V3 = [0, 0, 0]
const _sf: V3 = [0, 0, 0]
const _upRef: V3 = [0, 0, 0]

const DT = 1 / 240

function dot(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function norm(v: V3): number {
  const l = Math.hypot(v[0], v[1], v[2])
  if (l > 1e-9) {
    v[0] /= l
    v[1] /= l
    v[2] /= l
  }
  return l
}

/**
 * Write jet k's pose at flow-time tt. Velocity/acceleration come from
 * analytic finite differences of the helix (no frame-rate jitter), the bank
 * from the coordinated-turn model:
 *   sf = a − g   (required specific force; g = (0, −G, 0))
 *   lift ∝ sf − (sf·f)f   (the component ⟂ to the flight path)
 *   bank = signed angle about f from gravity-up-projected to lift.
 */
export function balletPose(k: 0 | 1, tt: number, out: BalletPose): BalletPose {
  helixPos(tt - DT, k, _p0)
  helixPos(tt, k, _p1)
  helixPos(tt + DT, k, _p2)
  for (let i = 0; i < 3; i++) {
    _v[i] = (_p2[i] - _p0[i]) / (2 * DT)
    _a[i] = (_p2[i] - 2 * _p1[i] + _p0[i]) / (DT * DT)
    out.p[i] = _p1[i]
    out.f[i] = _v[i]
  }
  norm(out.f)

  // Required specific force, perpendicular to the path.
  _sf[0] = _a[0]
  _sf[1] = _a[1] + CFG.G
  _sf[2] = _a[2]
  const sfF = dot(_sf, out.f)
  _sf[0] -= sfF * out.f[0]
  _sf[1] -= sfF * out.f[1]
  _sf[2] -= sfF * out.f[2]
  if (dot(_sf, _sf) < 1e-6) {
    out.lift[0] = 0
    out.lift[1] = 1
    out.lift[2] = 0
    out.bank = 0
    return out
  }
  out.lift[0] = _sf[0]
  out.lift[1] = _sf[1]
  out.lift[2] = _sf[2]
  norm(out.lift)

  // Wings-level reference: world up projected ⟂ to the path.
  _upRef[0] = -out.f[1] * out.f[0]
  _upRef[1] = 1 - out.f[1] * out.f[1]
  _upRef[2] = -out.f[1] * out.f[2]
  if (dot(_upRef, _upRef) < 1e-6) {
    out.bank = 0
    return out
  }
  norm(_upRef)
  const cosA = Math.min(1, Math.max(-1, dot(_upRef, out.lift)))
  // (upRef × lift) · f — the signed rotation about +f.
  const sinA =
    (_upRef[1] * out.lift[2] - _upRef[2] * out.lift[1]) * out.f[0] +
    (_upRef[2] * out.lift[0] - _upRef[0] * out.lift[2]) * out.f[1] +
    (_upRef[0] * out.lift[1] - _upRef[1] * out.lift[0]) * out.f[2]
  out.bank = Math.atan2(sinA, cosA)
  return out
}

// ---------------------------------------------------------------------------
//  THE ORBIT CAMERA — the showcase's cinematic auto-orbit, expressed as a
//  virtual camera the CruiseBallet group inverts into camera-glued room
//  space. Martin picked "vzdálenost 46" on the showcase slider; the
//  showcase rendered at 44° vertical FOV while the site's Stage3D flies
//  55°, so the distance converts through the FOV ratio to keep the framing
//  he chose (same screen coverage at the nearest pass).
// ---------------------------------------------------------------------------

/** Martin's locked framing (46 at fov 44°) through the 44°→55° conversion. */
const BASE_D = (46 * Math.tan((44 * Math.PI) / 360)) / FOV_TAN

/** Widest lateral reach of the fight: breathing-max radius + a halfspan of
 *  airframe + margin — the fit criterion "the L-159s must NEVER leave the
 *  frame" (Martin) is checked against this. */
const REACH = CFG.R0 * (1 + CFG.breatheAmp) + 2.6

/** Keep 10 % of screen margin outside the widest pass. */
const FIT_MARGIN = 0.9

/** Depths are compressed back under this by a uniform world-scale about the
 *  camera origin (screen-identical — similar triangles), so a far narrow-
 *  viewport camera never pushes the fight past the stage far plane. */
const DEPTH_CAP = 40

export type BalletCam = {
  /** Virtual-camera distance from the fight. */
  r: number
  /** Orbit azimuth / elevation, radians. */
  az: number
  el: number
  /** The pair's climbing centroid height — the orbit tracks it, which is
   *  exactly why the 2D clouds must sink: the camera climbs too. */
  cy: number
  /** Uniform world scale (≤ 1) applied about the camera origin. */
  scale: number
}

export function createBalletCam(): BalletCam {
  return { r: BASE_D, az: 0, el: 0, cy: 0, scale: 1 }
}

/** The auto-orbit at flow-time `flow` for this viewport aspect: a slow
 *  drift around the fight with a gentle sway, elevation breathing a touch,
 *  always looking at the climbing centroid. Pure f(scroll) — no wall clock,
 *  so scrubbing backwards replays it exactly. */
export function balletCam(flow: number, aspect: number, out: BalletCam): BalletCam {
  // Fit: the widest pass must stay inside the horizontal frustum.
  const fitD = REACH / (FOV_TAN * Math.max(aspect, 0.2) * FIT_MARGIN)
  out.r = Math.max(BASE_D, fitD)
  out.scale = Math.min(1, DEPTH_CAP / out.r)
  out.az = 0.6 + 0.045 * flow + Math.sin(flow * 0.11) * 0.25
  out.el = 0.14 + Math.sin(flow * 0.07) * 0.05
  out.cy = CFG.climbRate * flow
  return out
}
