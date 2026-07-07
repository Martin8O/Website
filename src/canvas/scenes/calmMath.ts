/**
 * CALM — pure math for the healing scene (B3a). The scene is built from
 * Martin's own mojecestakezdravi.cz motifs: the light that slowly rises
 * (a "lifelong" diagnosis becoming a gift), the stepping-stone path across
 * still water ("krok za krokem" — the site's footprint logo), the ripple
 * every step sends out, and the small tree that grows on the shore (his
 * bonsai-in-hands image).
 *
 * Everything here is a deterministic pure function — no DOM, no state — so
 * the renderer stays a thin painter and this file carries the unit tests.
 * Story motion derives from scroll `t`; only `breath` runs on ambient
 * seconds and must look complete frozen at time 0 (reduced motion).
 */

import { clamp01, hash1, lerp, smoothstep } from '../toolkit'

export const CALM = {
  /** The pre-dawn light rises across this scroll window. */
  lightStart: 0.05,
  lightEnd: 0.8,
  /** A warm blush low over the horizon late in the run — the promise of
   *  sunrise, never the sun itself (origin owns the actual sunrise). */
  blushStart: 0.58,
  blushEnd: 0.95,
  /** The stepping stones: how many, and the scroll window in which they
   *  surface one by one. All story marks below are SCENE t (pos − 6.5);
   *  Martin directs in global HUD % — pos = 9·%, t = pos − 6.5. Stones run
   *  ~76.5→79 % so nothing pre-runs while the scene is still fading in. */
  stones: 14,
  stoneStart: 0.38,
  stoneEnd: 0.66,
  /** One stone's rise (scale/alpha ramp) in scroll units. */
  stoneRamp: 0.035,
  /** A step's ripple ring: lifetime in scroll units. */
  rippleLife: 0.12,
  /** The breathing stillness — one inhale+exhale in seconds. */
  breathPeriod: 7.5,
  /** Once the path reaches the island, the tree grows its FINE outgrowth
   *  (the base tree stands from the scene's first frame). ~79→82.7 %. */
  treeStart: 0.66,
  treeEnd: 0.93,
  /** The aurora's life (Martin: appears 76 %, peaks 79 %, dissolved 83 % —
   *  the opposite arc to the tree's growth and flowering). */
  auroraRise: [0.34, 0.61],
  auroraFall: [0.61, 0.97],
} as const

/** The scene's two light phases: `light` = the cyan pre-dawn rising,
 *  `blush` = the warm hint above the horizon near the end. */
export function calmLight(t: number): { light: number; blush: number } {
  return {
    light: smoothstep(CALM.lightStart, CALM.lightEnd, t),
    blush: smoothstep(CALM.blushStart, CALM.blushEnd, t),
  }
}

/** The breathing stillness, 0 (exhaled) .. 1 (inhaled): a cosine cycle with
 *  gentle holds at both ends. Frozen at 0 it rests exhaled — a complete,
 *  still frame for reduced motion. */
export function breath(time: number): number {
  const s = 0.5 - 0.5 * Math.cos(((time % CALM.breathPeriod) / CALM.breathPeriod) * Math.PI * 2)
  return smoothstep(0.06, 0.94, s)
}

/** Scroll moment stone `i` touches the water. */
function stoneLandT(i: number): number {
  return lerp(CALM.stoneStart, CALM.stoneEnd, i / (CALM.stones - 1))
}

/** Stone `i`'s rise at scroll `t` (0 hidden → 1 settled on the surface).
 *  Pure in (i, t) — scrub-safe in both directions. */
export function stoneReveal(i: number, t: number): number {
  return smoothstep(stoneLandT(i), stoneLandT(i) + CALM.stoneRamp, t)
}

export type RippleRing = {
  /** Ring radius, 0..1 of the disturbance's full reach. */
  r: number
  /** Ring strength — decays with age AND with the radius it has spread to. */
  a: number
  /** Relative line weight — rings thin as they run out. */
  lw: number
}

/**
 * A dispersive ripple train — the physics read of a real stone-drop: the
 * leading ring launches first and runs fastest (decelerating as the energy
 * spreads, amplitude falling off ~1/r); trailing rings follow with a short
 * delay, stay tighter and die sooner. Pure in `dt` (time since the drop,
 * in scroll units) — scrub-safe.
 */
export function rippleTrainAt(dt: number): RippleRing[] {
  const out: RippleRing[] = []
  for (let j = 0; j < 4; j++) {
    const age = clamp01((dt - j * 0.016) / CALM.rippleLife)
    if (age <= 0 || age >= 1) continue
    const rEase = 1 - (1 - age) * (1 - age)
    const r = rEase * (1 - j * 0.13)
    const a =
      Math.pow(1 - age, 1.55) * (0.9 / (1 + 2.6 * rEase)) * (1 - j * 0.18) * clamp01(age * 8)
    out.push({ r, a, lw: Math.max(0.5, 1.6 - rEase * 0.7 - j * 0.15) })
  }
  return out
}

/** The ripple train stone `i`'s landing sends out at scroll `t`. */
export function rippleTrain(i: number, t: number): RippleRing[] {
  return rippleTrainAt(t - stoneLandT(i))
}

/** The renderer's water-perspective exponent and the horizon line (fraction
 *  of viewport height) — shared here so the stone schedule can reason about
 *  actual screen geometry. Horizon at 0.6 ≈ the photographic golden split:
 *  more water than sky, the mirror carries the scene. */
export const WATER_POW = 1.8
export const HORIZON = 0.6

/** The island the stones lead to (present from the scene's first frame),
 *  and where the horizon light stands — small and far, deeper in the lake. */
export const ISLAND = { x: 0.26, d: 0.62 } as const

/** A stone's radius at depth `d`, in units of min(w, h) — shared with the
 *  spacing solver so gaps can scale with the stones they separate. */
export function stoneRadius(d: number): number {
  return 0.006 + 0.028 * Math.pow(1 - d, 1.7)
}

/** Screen y (fraction of viewport height) of water depth `d`. */
export function waterY(d: number): number {
  return HORIZON + (1 - HORIZON) * Math.pow(1 - d, WATER_POW)
}

/**
 * The stone path, solved so the SLANT distance between neighbouring stones
 * is perceptually constant: the path from the meditator's near island
 * (bottom-right) to the tree island is re-parametrized by screen arc length
 * WEIGHTED by the local stone size — equal strides in the world the
 * perspective is depicting, so near gaps are wider in pixels and far gaps
 * tighter, exactly in step with the stones themselves. Pure in `aspect`
 * (w/h); positions come back as {x: fraction of w, d: depth}.
 */
export function stonePath(aspect: number): Array<{ x: number; d: number }> {
  const xAt = (s: number) => lerp(0.72, 0.335, s) + 0.02 * Math.sin(s * Math.PI)
  const dAt = (s: number) => lerp(0.05, 0.585, s)
  const N = 240
  const cum: number[] = [0]
  let px = xAt(0) * aspect
  let py = waterY(dAt(0))
  for (let i = 1; i <= N; i++) {
    const s = i / N
    const nx = xAt(s) * aspect
    const ny = waterY(dAt(s))
    cum.push(cum[i - 1] + Math.hypot(nx - px, ny - py) / stoneRadius(dAt(s - 0.5 / N)))
    px = nx
    py = ny
  }
  const total = cum[N]
  const out: Array<{ x: number; d: number }> = []
  for (let k = 0; k < CALM.stones; k++) {
    const target = (k / (CALM.stones - 1)) * total
    let i = 1
    while (i < N && cum[i] < target) i++
    const f = cum[i] === cum[i - 1] ? 0 : (target - cum[i - 1]) / (cum[i] - cum[i - 1])
    const s = (i - 1 + f) / N
    out.push({ x: xAt(s), d: dAt(s) })
  }
  return out
}

/** The fine outgrowth of the island tree (0 = the standing base tree,
 *  1 = every delicate outer twig extended). Starts once the path arrives. */
export function treeGrow(t: number): number {
  return smoothstep(CALM.treeStart, CALM.treeEnd, t)
}

export type Branch = {
  /** Unit coords: trunk base at (0,0), y grows UP, trunk length ~0.75. */
  x0: number
  y0: number
  x1: number
  y1: number
  /** Quadratic control point — every branch carries a gentle organic bow. */
  cx: number
  cy: number
  /** Taper: full width at the base / at the tip, in trunk-length units. */
  w0: number
  w1: number
  /** 0 = trunk. */
  depth: number
  /** Growth stage (0..1) at which this branch starts extending. */
  birth: number
  /** Outer twig — carries blossoms once the tree flowers. */
  leaf: boolean
}

export const TREE_MAX_DEPTH = 7

/** Depths below this stand fully grown from the scene's first frame — the
 *  island's tree is already old and rich (trunk, boughs, a dense fine
 *  skeleton). Depths from here up are the DELICATE outgrowth that extends
 *  only once the stone path arrives. */
export const TREE_FINE_DEPTH = 5

/** How far branch `b` has extended at fine-growth `g` (0..1 of its length).
 *  The base tree (depth < TREE_FINE_DEPTH) is always complete; the fine
 *  depths sprout in staggered waves that overlap organically. */
export function branchExtent(b: Branch, g: number): number {
  if (b.depth < TREE_FINE_DEPTH) return 1
  return clamp01((g - b.birth) * 3.2)
}

/** Width ladder (base → tip) per depth, in trunk-length units — a strong
 *  old tree: a thick rooted trunk through spreading boughs into the most
 *  delicate outer twigs. */
const TREE_W0 = [0.11, 0.056, 0.034, 0.02, 0.011, 0.006, 0.003, 0.0016] as const
const TREE_W1 = [0.056, 0.034, 0.02, 0.011, 0.006, 0.003, 0.0016, 0.0007] as const

/**
 * Grow a deterministic tree: the trunk splits into four spreading boughs,
 * each branching on — seven depth levels down to the most delicate twigs;
 * every branch bows gently (quadratic control point) and tapers. Angles are
 * clamped so nothing droops below its base. Same seed → the same tree,
 * every frame, both scroll directions.
 */
export function buildTree(seed: number, maxDepth = TREE_MAX_DEPTH): Branch[] {
  const out: Branch[] = []
  let n = 0
  const grow = (x: number, y: number, ang: number, len: number, depth: number): void => {
    const x1 = x + Math.sin(ang) * len
    const y1 = y + Math.cos(ang) * len
    const bow = (hash1(seed + n * 6.7) - 0.5) * 0.36 * len
    const d = Math.min(depth, maxDepth)
    out.push({
      x0: x, y0: y, x1, y1,
      cx: (x + x1) / 2 + Math.cos(ang) * bow,
      cy: (y + y1) / 2 - Math.sin(ang) * bow,
      w0: TREE_W0[d], w1: TREE_W1[d],
      depth,
      birth: Math.max(0, depth - TREE_FINE_DEPTH) * 0.3,
      leaf: depth >= maxDepth,
    })
    if (depth >= maxDepth) return
    // Rich low structure, disciplined deep structure — depth 7 would explode
    // combinatorially with 3-child fans all the way out.
    const kids = depth === 0 ? 4 : depth < 4 ? (hash1(seed + n * 3.1) > 0.6 ? 3 : 2) : 2
    for (let k = 0; k < kids; k++) {
      n++
      const fan = (k / Math.max(kids - 1, 1) - 0.5) * 2 // -1..1 across the fan
      const jitter = (hash1(seed + n * 2.3) - 0.5) * 0.26
      const spread = depth === 0 ? 0.62 + hash1(seed + n * 5.3) * 0.42 : 0.42 + hash1(seed + n * 5.3) * 0.4
      const nAng = Math.max(-1.32, Math.min(1.32, ang + fan * spread + jitter))
      const nLen = len * (0.6 + hash1(seed + n * 9.1) * 0.16)
      grow(x1, y1, nAng, nLen, depth + 1)
    }
  }
  // A slight lean into the light (the path/glow sits to the tree's left).
  grow(0, 0, -0.07, 0.75, 0)
  return out
}

/** The flowering at the end of the healing — blossoms pop across the crown
 *  tip by tip (stagger per tip against this ramp in the renderer). */
export function bloom(t: number): number {
  return smoothstep(0.7, 0.98, t)
}
