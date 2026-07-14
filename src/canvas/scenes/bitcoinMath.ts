/**
 * BITCOIN — pure math for the living-blockchain world (chapter 07,
 * "Bitcoin"). No DOM, no clock, no state: every function is deterministic in
 * its inputs so the scene stays scrubbable and unit-testable.
 *
 * The world is a 3D valley seen from a raised camera: a wireframe TERRAIN
 * (heightfield of summed sines with a flattened clearing at its heart), a
 * scattered peer NETWORK living on that terrain (deterministic layout +
 * k-nearest edges), and the central ₿ node above the clearing whose
 * HEARTBEAT and expanding BLOCK WAVES pulse through everything. The camera
 * answers the pointer (`camFromPointer`) — that plus the screen-space
 * cursor bump is the scene's interactive layer.
 *
 * Coordinates: x runs left→right (≈ −1.7..1.7), z runs near→far (0..1),
 * y is height. `project` returns normalized screen offsets (nx/ny in units
 * of the renderer's scale factor) plus a perspective size factor `s`.
 */

import { TAU, clamp01, hash1, lerp, smoothstep } from '../toolkit'

export type Vec3 = { x: number; y: number; z: number }
export type Cam = { yaw: number; pitch: number }
export type NetNode = {
  x: number
  z: number
  /** Visual weight 0.55..1 — dot radius / brightness multiplier. */
  size: number
  /** Personal breathing phase (radians). */
  phase: number
  /** A "full node" — drawn heavier, with a ring. */
  major: boolean
  /** Weighted distance from the pad — drives the ignition order. */
  dist: number
}
export type Edge = { a: number; b: number; len: number }

/** Where the ₿ stands — the flattened clearing the network radiates from. */
export const PAD = { x: 0, z: 0.55 } as const

/** Story beats (scene localT) + ambient rhythm (seconds). The bitcoin scene
 *  spans global HUD 75→85 % (localT 0→1). Choreography (rev15 — beats spread
 *  later so the climax fills 80→83 % instead of finishing at 80 % and leaving
 *  a dead 80→85 % plateau): the bare MOUNTAINS trace in alone over ~75.5→79 %;
 *  at ~80 % (t = impactT) the genesis IMPULSE strikes the centre — the world
 *  map pops on and the impact wave rolls outward over the terrain, igniting
 *  peers and their links as it passes, finishing its unhurried sweep by ~83 %
 *  just as the dev world begins to enter; the chip materializes out of the
 *  impact right behind the front. */
export const BTC = {
  traceT0: 0.05,
  traceT1: 0.42,
  /** The genesis impulse lands (t): ~80 % global. */
  impactT: 0.48,
  /** The impact wave has crossed the whole valley by here (~83 % global) —
   *  an even, unhurried sweep that fills the old dead stretch and hands off
   *  to the dev world as it enters (rev15). */
  waveEndT: 0.82,
  /** World radius the impact wave reaches at waveEndT. */
  storyWaveMax: 1.9,
  /** Coin heartbeat period, seconds. */
  beatPeriod: 3.2,
  /** An ambient block wave launches every `wavePeriod`s, travelling
   *  `waveTravel`s (active only once the impact wave has passed). */
  wavePeriod: 9,
  waveTravel: 3.4,
  /** World radius the ambient wave front reaches at the end of its travel. */
  waveRadius: 2.1,
} as const

/** Camera rig: raised, pitched down at the valley, orbiting around the pad. */
export const CAM = {
  dist: 1.5,
  elev: 0.42,
  basePitch: 0.3,
  fov: 1.15,
  orbitZ: PAD.z,
} as const

/** Terrain sampling grid (vertices) — dense, per the `btc animuj` reference. */
export const GRID = { nx: 116, nz: 58, x0: -1.7, x1: 1.7, z0: 0.03, z1: 1 } as const

/** Network distance metric — z is compressed vs x, so weight it up to keep
 *  visual spacing honest in the foreshortened world. */
export function netDist(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(ax - bx, (az - bz) * 1.6)
}

/**
 * The heightfield: rolling near ground swelling into a far mountain wall,
 * with a radial clearing flattening everything around the pad so the ₿
 * stands on calm ground. Deterministic; range ≈ [0, 0.5].
 */
export function terrainHeight(x: number, z: number): number {
  const p1 = hash1(31.7) * TAU
  const p2 = hash1(77.1) * TAU
  const p3 = hash1(11.3) * TAU
  const p4 = hash1(53.9) * TAU
  // Far wall: peaky (folded) ridges that only stand up beyond mid-depth —
  // sharpened + double-folded per the dense `btc animuj` data-mountains.
  const ridge =
    0.5 * Math.abs(Math.sin(x * 2.1 + z * 3.7 + p1)) +
    0.32 * Math.abs(Math.sin(x * 4.7 - z * 2.3 + p2)) +
    0.22 * Math.abs(Math.sin(x * 7.9 - z * 4.1 + p4)) +
    0.18 * Math.sin(x * 9.3 + z * 7.1 + p3) * 0.5
  const wall = smoothstep(0.42, 0.95, z) * 0.52 * Math.pow(clamp01(ridge * 0.85), 1.6)
  // High-frequency relief that grows with depth (fine data-noise texture).
  const detail = 0.035 * Math.sin(x * 12.3 + z * 9.1 + p2) * Math.sin(x * 5.1 - z * 13.7 + p3) * smoothstep(0.25, 0.8, z)
  // Gentle near-field roll so the foreground is alive, never flat.
  const roll = 0.045 * Math.sin(x * 3.1 + p4) * Math.sin(z * 9.7 + p1) + 0.02 * Math.sin(x * 7.7 + z * 5.3 + p2)
  // The clearing: flatten a disc around the pad.
  const clearing = smoothstep(0.1, 0.38, netDist(x, z, PAD.x, PAD.z))
  return Math.max(0, (roll + detail + 0.02) * clearing + wall * smoothstep(0.16, 0.5, netDist(x, z, PAD.x, PAD.z)))
}

/** Camera from the smoothed pointer: nx/ny are the pointer offset from the
 *  screen centre in −1..1, `a` its presence 0..1. Gentle: ±≈7.5° yaw. */
export function camFromPointer(nx: number, ny: number, a: number): Cam {
  const k = clamp01(a)
  return {
    yaw: clamp(nx, -1, 1) * 0.13 * k,
    pitch: CAM.basePitch + clamp(ny, -1, 1) * 0.055 * k,
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n
}

/** A projected point — screen offsets from the projection centre in
 *  normalized units + the perspective factor `s`. */
export type Projected = { nx: number; ny: number; s: number }

/**
 * Perspective projection through the camera rig. Returns screen offsets from
 * the projection centre in normalized units (multiply by the renderer's
 * scale) and the perspective factor `s` (world size → screen size). Pass
 * `out` to reuse a scratch object — the renderer projects thousands of
 * vertices per frame, and per-call result objects were pure GC churn.
 */
export function project(p: Vec3, cam: Cam, out?: Projected): Projected {
  const cy = Math.cos(cam.yaw)
  const sy = Math.sin(cam.yaw)
  const x1 = p.x * cy - (p.z - CAM.orbitZ) * sy
  const z1 = p.x * sy + (p.z - CAM.orbitZ) * cy
  const y1 = p.y - CAM.elev
  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)
  const y2 = y1 * cp + z1 * sp
  const z2 = -y1 * sp + z1 * cp
  const s = CAM.fov / Math.max(z2 + CAM.dist, 0.12)
  if (out) {
    out.nx = x1 * s
    out.ny = -y2 * s
    out.s = s
    return out
  }
  return { nx: x1 * s, ny: -y2 * s, s }
}

/** Deterministic peer layout: hash-driven rejection sampling with a minimum
 *  separation, kept off the pad's clearing. Same seed → same network. */
export function buildNodes(count = 64, seed = 11, minSep = 0.14): NetNode[] {
  const nodes: NetNode[] = []
  for (let k = 1; nodes.length < count && k < 6000; k++) {
    const x = lerp(-1.5, 1.5, hash1(seed + k * 7.31))
    const z = lerp(0.07, 0.96, hash1(seed + k * 13.77 + 3.1))
    const dPad = netDist(x, z, PAD.x, PAD.z)
    if (dPad < 0.24) continue
    let clear = true
    for (const n of nodes) {
      if (netDist(x, z, n.x, n.z) < minSep) {
        clear = false
        break
      }
    }
    if (!clear) continue
    const hs = hash1(seed + k * 3.9 + 7.7)
    nodes.push({
      x,
      z,
      size: 0.55 + 0.45 * hs,
      phase: hash1(seed + k * 5.3 + 1.9) * TAU,
      major: hs > 0.8,
      dist: dPad,
    })
  }
  return nodes
}

/** k-nearest edges (deduped) + a sparse sprinkle of long-range links so the
 *  mesh reads as one connected net, not local clusters. `k` may be a
 *  per-node function — small peripheral peers keep only one link (rev12). */
export function buildEdges(nodes: readonly NetNode[], k: number | ((i: number) => number) = 2): Edge[] {
  const seen = new Set<string>()
  const edges: Edge[] = []
  const add = (i: number, j: number) => {
    if (i === j) return
    const key = i < j ? `${i}:${j}` : `${j}:${i}`
    if (seen.has(key)) return
    seen.add(key)
    edges.push({ a: i, b: j, len: netDist(nodes[i].x, nodes[i].z, nodes[j].x, nodes[j].z) })
  }
  for (let i = 0; i < nodes.length; i++) {
    const ki = typeof k === 'number' ? k : k(i)
    const near = nodes
      .map((n, j) => ({ j, d: netDist(nodes[i].x, nodes[i].z, n.x, n.z) }))
      .filter((e) => e.j !== i)
      .sort((a, b) => a.d - b.d)
    for (let m = 0; m < Math.min(ki, near.length); m++) add(i, near[m].j)
  }
  for (let i = 0; i < nodes.length; i += 5) {
    const j = (i * 13 + 29) % nodes.length
    if (netDist(nodes[i].x, nodes[i].z, nodes[j].x, nodes[j].z) > 0.6) add(i, j)
  }
  return edges
}

/** Connection count per node — drives the tiered node icons (rev12). */
export function nodeDegrees(count: number, edges: readonly Edge[]): number[] {
  const deg = new Array<number>(count).fill(0)
  for (const e of edges) {
    deg[e.a]++
    deg[e.b]++
  }
  return deg
}

/** Indices of the `m` peers nearest the pad — the coin's backbone links. */
export function coinPeers(nodes: readonly NetNode[], m = 5): number[] {
  return nodes
    .map((n, j) => ({ j, d: n.dist }))
    .sort((a, b) => a.d - b.d)
    .slice(0, m)
    .map((e) => e.j)
}

/** The impact wave's world radius at scene time `t` — null before the
 *  impulse lands. SCROLL-driven (scrub-safe): the wave front IS the story. */
export function storyWaveR(t: number): number | null {
  if (t < BTC.impactT) return null
  return clamp01((t - BTC.impactT) / (BTC.waveEndT - BTC.impactT)) * BTC.storyWaveMax
}

/** How lit a peer at pad-distance `dist` is at scene time `t`: dark until
 *  the impact front reaches it, then on for good. */
export function nodeLit(dist: number, t: number): number {
  const r = storyWaveR(t)
  if (r === null) return 0
  return smoothstep(-0.03, 0.09, r - dist)
}

/** Terrain trace-in: how revealed a vertex at pad-distance `d` is at scene
 *  time `t` (0 hidden → 1 drawn). The wireframe draws outward from the pad. */
export function traceReveal(d: number, t: number): number {
  const t0 = BTC.traceT0 + clamp01(d / 2.3) * (BTC.traceT1 - BTC.traceT0)
  return smoothstep(t0, t0 + 0.06, t)
}

/** The coin's heartbeat — a lub-dub envelope, 0..1, restarting every
 *  `beatPeriod`. Full at time 0 so the reduced-motion frame glows. */
export function heartbeat(time: number): number {
  const ph = ((time / BTC.beatPeriod) % 1 + 1) % 1
  return Math.min(1, Math.exp(-14 * ph * ph) + 0.45 * Math.exp(-70 * (ph - 0.3) * (ph - 0.3)))
}

/** The expanding block wave: every `wavePeriod`s a front leaves the pad and
 *  travels for `waveTravel`s. Returns its world radius + strength, or null
 *  when no wave is in flight (including at time 0 — the reduced-motion
 *  frame must not freeze a half-ring). */
export function blockWave(time: number): { r: number; k: number } | null {
  const ph = (((time + BTC.wavePeriod * 0.62) / BTC.wavePeriod) % 1 + 1) % 1
  const u = (ph * BTC.wavePeriod) / BTC.waveTravel
  if (u >= 1) return null
  return { r: u * BTC.waveRadius, k: 1 - u }
}

/** How strongly the wave front at radius `r` excites a point at pad-distance
 *  `d` — a travelling band of half-width `w`. */
export function waveBand(d: number, r: number, w = 0.09): number {
  const x = Math.abs(d - r) / w
  return x >= 1 ? 0 : 1 - x * x
}

/** Phase 0..1 of the light pulse travelling edge `i` — staggered speeds and
 *  offsets so the net never strobes in sync. */
export function pulsePhase(i: number, time: number): number {
  const speed = 0.16 + 0.22 * hash1(i * 5.1 + 2.2)
  return ((hash1(i * 3.7 + 0.4) + time * speed) % 1 + 1) % 1
}

/** Screen-space cursor influence: a smooth gaussian falloff of distance `d`
 *  against radius `r` (0 beyond ≈2r). */
export function cursorBoost(d: number, r: number): number {
  if (r <= 0) return 0
  const e = Math.exp(-(d * d) / (0.5 * r * r))
  return e < 0.01 ? 0 : e
}
