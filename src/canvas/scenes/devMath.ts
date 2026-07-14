/**
 * DEV — pure math for the creative-explosion world (chapter 08, "Solo
 * developer"): the Claude-Code month, five real apps shipped one after
 * another. No DOM, no clock, no state — every function is deterministic in
 * its inputs so the scene stays scrubbable and unit-testable.
 *
 * The world is a neon "vibecoding" night: a perspective CIRCUIT-BOARD FLOOR
 * receding to a horizon, a digital city on it, and a CREATIVE CORE at centre
 * from which the five project WINDOWS are born — bursting out one by one and
 * settling into a constellation that frames the title. The story clock is
 * scene `localT`; `time` only breathes and flows.
 *
 * Screen coords are normalized 0..1 (x across, y down). The floor uses a
 * ground-plane perspective: `u` runs across (−1..1 world), `d` is depth with
 * 0 = the far horizon and 1 = the near bottom edge.
 */

import { clamp01, hash1 } from '../toolkit'

/** A window's resting slot in the constellation (normalized screen). `w` is
 *  its width as a fraction of the smaller viewport dimension; `depth` is its
 *  parallax/scale weight (0 = far/small, 1 = near/big). */
export type WindowSlot = { x: number; y: number; w: number; depth: number }

/** Where the floor lives + how wide it spreads (renderer-supplied geometry). */
export type FloorGeom = {
  horizonY: number
  h: number
  cx: number
  /** Half-width in px the floor reaches at the near edge (d = 1). */
  spread: number
}

/** Story beats (scene localT) + ambient rhythm (seconds). The scene owns the
 *  scroll tail: t = 0 at ~94 % global, t = 1 at 100 % (the very end). */
export const DEV = {
  /** Scene horizon as a fraction of height — city + core sit on it, the
   *  circuit floor fills below, the windows + sky above. */
  horizon: 0.6,
  /** The explosion is a STAIRCASE (rev7, Martin's spec): five scroll steps
   *  across the 96→100 % stretch. Card i launches at step i and spends
   *  (5−i) steps in flight — at 96 % card 1 is 1/5 of the way out, at 97 %
   *  card 1 is at 2/5 and card 2 at 1/4, … and at 100 % all five touch
   *  down TOGETHER. */
  spawnT0: 0.1, // scene-t of step 0 = 96 % global
  stepT: 0.18, // one scroll-step (1 % global) in scene-t
  /** The city + floor + core assemble over this opening stretch. */
  buildIn: 0.14,
  /** Creative-core pulse period, seconds (the build "commit" rhythm). */
  pulsePeriod: 2.4,
  /** Floor perspective exponent — rows bunch toward the horizon (>1). */
  floorPow: 2.6,
  windows: 5,
} as const

/** The curated constellation: five slots framing the centred card, never in
 *  its central box (x≈0.30–0.70, y≈0.28–0.72). Two big near ones flank the
 *  lower corners, one rides high over the title, two mid-height on the sides. */
const SLOTS: readonly WindowSlot[] = [
  { x: 0.205, y: 0.30, w: 0.245, depth: 0.55 }, // upper-left
  { x: 0.405, y: 0.145, w: 0.265, depth: 0.78 }, // top-centre, high over the title
  { x: 0.80, y: 0.255, w: 0.235, depth: 0.5 }, // upper-right
  { x: 0.135, y: 0.62, w: 0.285, depth: 0.85 }, // lower-left (RL Lab, wide + near)
  { x: 0.86, y: 0.63, w: 0.285, depth: 0.9 }, // lower-right, nearest/big
]

/** Resolve the window constellation for this viewport. On wider screens the
 *  flanking windows push outward so the centre stays clear of the card. */
export function windowLayout(aspect: number): WindowSlot[] {
  // Portrait (phones): the centred card fills the middle of a tall screen, so
  // the two lower windows — RL Lab (slot 3) and BrainQuest (slot 4) — drop into
  // the bottom corners, below the copy and just above the GitHub dashboard,
  // instead of sitting over the text (Martin's mobile call). The upper three
  // stay in the sky above the card.
  if (aspect < 1) {
    return SLOTS.map((s, i) =>
      i >= 3 ? { ...s, x: i === 3 ? 0.19 : 0.81, y: 0.73 } : s,
    )
  }
  // aspect = w/h; 1.78 (16:9) → no extra spread, wider → gently more.
  const spread = 1 + clamp01((aspect - 1.5) / 1.6) * 0.14
  return SLOTS.map((s) => ({ ...s, x: 0.5 + (s.x - 0.5) * spread }))
}

/** How far window i is along its flight at scene time t (0 = not yet born,
 *  1 = arrived). The staircase: in step units s = (t − spawnT0) / stepT,
 *  card i launches at s = i and crosses linearly in (windows − i) steps, so
 *  every card's position reads as a clean fraction at each scroll step and
 *  ALL cards arrive together at s = windows (100 %). */
export function windowSpawn(i: number, t: number): number {
  const s = (t - DEV.spawnT0) / DEV.stepT
  return clamp01((s - i) / (DEV.windows - i))
}

/** The birth flare for window i — a sharp 0→1→0 spike at the core as the
 *  window leaves it (fires over the first half-step of its flight). */
export function spawnFlash(i: number, t: number): number {
  const s = (t - DEV.spawnT0) / DEV.stepT
  const x = (s - i) / 0.5
  if (x <= 0 || x >= 1) return 0
  return Math.sin(x * Math.PI)
}

/** easeOutBack: overshoots past 1 then settles — the window "pops" into its
 *  slot instead of easing in flatly. u clamped to 0..1. */
export function easeOutBack(u: number, s = 1.70158): number {
  const x = clamp01(u) - 1
  return 1 + (s + 1) * x * x * x + s * x * x
}

/** A ground-plane point on the circuit floor. `u` across (−1..1 world), `d`
 *  depth (0 = far horizon, 1 = near bottom). Rows bunch toward the horizon
 *  and columns converge on the vanishing point (cx, horizonY). */
export function floorPoint(u: number, d: number, g: FloorGeom): { x: number; y: number } {
  const k = Math.pow(clamp01(d), DEV.floorPow) // 0 at horizon → 1 near
  return {
    x: g.cx + u * g.spread * k,
    y: g.horizonY + (g.h - g.horizonY) * k,
  }
}

/** The creative core's pulse — a double-tap "commit" envelope, 0..1, full at
 *  time 0 so the reduced-motion frame glows. */
export function corePulse(time: number): number {
  const ph = (((time / DEV.pulsePeriod) % 1) + 1) % 1
  return Math.min(1, Math.exp(-10 * ph * ph) + 0.5 * Math.exp(-42 * (ph - 0.26) * (ph - 0.26)))
}

/** Phase 0..1 of a light token travelling stream/trace `i` — staggered
 *  speeds + offsets so nothing flows in lockstep. */
export function streamPhase(i: number, time: number, speed = 0.35): number {
  const sp = speed * (0.7 + 0.6 * hash1(i * 5.1 + 2.2))
  return (((hash1(i * 3.7 + 0.4) + time * sp) % 1) + 1) % 1
}

/**
 * Gravitational-lens warp around the singularity: a screen point within
 * reach is pulled toward the core (space pinches) and slightly rotated
 * around it (frame-dragging), with a gaussian falloff so far geometry is
 * untouched. The renderer runs every floor vertex, stream token and the
 * horizon light-line through this — light visibly BENDS around the core.
 * `r` is the influence radius, `k` the max pull fraction (0..<1), `swirl`
 * the max rotation in radians. Identity at the core itself and far away.
 */
export function lensWarp(
  x: number,
  y: number,
  cx: number,
  cy: number,
  r: number,
  k: number,
  swirl = 0,
): { x: number; y: number } {
  if (r <= 0) return { x, y }
  const dx = x - cx
  const dy = y - cy
  const d2 = dx * dx + dy * dy
  // Beyond 3 radii the gaussian is < e^-9 — skip the trig entirely.
  if (d2 >= r * r * 9) return { x, y }
  const g = Math.exp(-d2 / (r * r))
  const s = 1 - k * g
  const a = swirl * g
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  return { x: cx + (dx * ca - dy * sa) * s, y: cy + (dx * sa + dy * ca) * s }
}
