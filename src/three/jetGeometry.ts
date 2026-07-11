/**
 * Code-authored jet geometry (E3) — pure, three-free, unit-tested. The L-39
 * and L-159 hero meshes are PARAMETRIC BAKES, not glTF assets: zero licence
 * risk (no verifiable-licence model of these exact types exists to fetch, and
 * a generic fighter would misrepresent the aircraft to the people who flew
 * them), zero network bytes (no loader / Draco decoder in the chunk), and the
 * stylized low-poly faceting matches the site's `flat` palette-matched look
 * the way a photoreal PBR model never would.
 *
 * Conventions: nose down −z, up +y, span ±x, overall length exactly 1 (the
 * flight specs scale). Non-indexed triangles with per-FACE normals (flat
 * facets for free) and per-VERTEX colors (top/belly graduation, glass, radome,
 * inlets). The silhouette carries the type identity: the L-39's long tandem
 * canopy and wingtip TANKS vs the L-159's single-seat canopy, radome nose,
 * wingtip RAILS and centreline tank.
 */

export type JetVariant = 'l39' | 'l159'

export type JetBuffers = {
  positions: Float32Array
  normals: Float32Array
  colors: Float32Array
}

type Vec3 = readonly [number, number, number]

/** sRGB hex → 0..1 RGB triple (fed to the shader raw — the additive stage is
 *  `flat`, colors must match the 2D world's CSS hexes). */
function rgb(hex: string): Vec3 {
  return [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ]
}

const mix = (a: Vec3, b: Vec3, f: number): Vec3 => [
  a[0] + (b[0] - a[0]) * f,
  a[1] + (b[1] - a[1]) * f,
  a[2] + (b[2] - a[2]) * f,
]

/** One fuselage/canopy loft station: an ellipse cross-section at `z` with
 *  half-width `r`, half-height `h`, vertical centre `y`, painted `color`
 *  (belly→top handled by the caller's color function). */
type Station = { z: number; r: number; h: number; y: number; color?: Vec3 }

class MeshBuilder {
  positions: number[] = []
  normals: number[] = []
  colors: number[] = []

  /** Push one triangle with its face normal (flat facet). Degenerate
   *  triangles (loft caps collapse quads) are skipped silently. */
  tri(a: Vec3, b: Vec3, c: Vec3, ca: Vec3, cb: Vec3, cc: Vec3): void {
    const ux = b[0] - a[0]
    const uy = b[1] - a[1]
    const uz = b[2] - a[2]
    const vx = c[0] - a[0]
    const vy = c[1] - a[1]
    const vz = c[2] - a[2]
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    const len = Math.hypot(nx, ny, nz)
    if (len < 1e-12) return
    nx /= len
    ny /= len
    nz /= len
    this.positions.push(...a, ...b, ...c)
    this.normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz)
    this.colors.push(...ca, ...cb, ...cc)
  }

  quad(a: Vec3, b: Vec3, c: Vec3, d: Vec3, ca: Vec3, cb: Vec3, cc: Vec3, cd: Vec3): void {
    this.tri(a, b, c, ca, cb, cc)
    this.tri(a, c, d, ca, cc, cd)
  }

  build(): JetBuffers {
    return {
      positions: new Float32Array(this.positions),
      normals: new Float32Array(this.normals),
      colors: new Float32Array(this.colors),
    }
  }
}

/** Radial segments per loft ring — decagon facets read as crafted low-poly. */
const RING = 10

/** Loft an ellipse-section tube through `stations`, optionally shifted `ox`
 *  off the centreline (wingtip tanks). Per-vertex color blends belly→top on
 *  the ring (unless the station pins its own color — radome, nozzle, glass). */
function loft(b: MeshBuilder, stations: readonly Station[], belly: Vec3, top: Vec3, ox = 0): void {
  const point = (s: Station, k: number): Vec3 => {
    const a = (k / RING) * Math.PI * 2
    return [ox + s.r * Math.cos(a), s.y + s.h * Math.sin(a), s.z]
  }
  const color = (s: Station, k: number): Vec3 => {
    if (s.color) return s.color
    const a = (k / RING) * Math.PI * 2
    return mix(belly, top, 0.5 + 0.5 * Math.sin(a))
  }
  for (let i = 0; i < stations.length - 1; i++) {
    const s0 = stations[i]
    const s1 = stations[i + 1]
    for (let k = 0; k < RING; k++) {
      const k1 = (k + 1) % RING
      b.quad(
        point(s0, k),
        point(s0, k1),
        point(s1, k1),
        point(s1, k),
        color(s0, k),
        color(s0, k1),
        color(s1, k1),
        color(s1, k),
      )
    }
  }
}

/** Axis-aligned box (intakes, tip rails). `faceColors` may pin the −z face —
 *  the dark engine-inlet mouth. */
function box(b: MeshBuilder, min: Vec3, max: Vec3, color: Vec3, frontColor?: Vec3): void {
  const [x0, y0, z0] = min
  const [x1, y1, z1] = max
  const c = color
  const f = frontColor ?? color
  // ±x sides, ±y sides, ±z caps.
  b.quad([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], c, c, c, c)
  b.quad([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], c, c, c, c)
  b.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], c, c, c, c)
  b.quad([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], c, c, c, c)
  b.quad([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], f, f, f, f)
  b.quad([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], c, c, c, c)
}

/** A tapered lifting surface (wing / tailplane / fin) as a thin slab.
 *  `vertical` swaps the span onto +y (the fin). Mirrored by the caller. */
type SurfaceSpec = {
  rootU: number // span start (x, or y for the fin)
  tipU: number
  rootLE: number
  rootTE: number
  tipLE: number
  tipTE: number
  rootV: number // perpendicular centre at the root (y, or x offset for fin)
  tipV: number
  rootT: number // thickness
  tipT: number
}

function surface(b: MeshBuilder, s: SurfaceSpec, sideSign: 1 | -1, vertical: boolean, color: Vec3): void {
  // Corners in (u = span, v = thickness-centre, z = chord) space.
  const p = (u: number, v: number, z: number): Vec3 =>
    vertical ? [v, u, z] : [u * sideSign, v, z]
  const halfR = s.rootT / 2
  const halfT = s.tipT / 2
  // Top surface (v+), bottom (v−), then LE / TE / tip edge strips.
  const rl = [s.rootU, s.rootV, s.rootLE] as const
  const rt = [s.rootU, s.rootV, s.rootTE] as const
  const tl = [s.tipU, s.tipV, s.tipLE] as const
  const tt = [s.tipU, s.tipV, s.tipTE] as const
  const up = (c: readonly [number, number, number], h: number): Vec3 => p(c[0], c[1] + h, c[2])
  const dn = (c: readonly [number, number, number], h: number): Vec3 => p(c[0], c[1] - h, c[2])
  b.quad(up(rl, halfR), up(tl, halfT), up(tt, halfT), up(rt, halfR), color, color, color, color)
  b.quad(dn(rl, halfR), dn(rt, halfR), dn(tt, halfT), dn(tl, halfT), color, color, color, color)
  b.quad(up(rl, halfR), dn(rl, halfR), dn(tl, halfT), up(tl, halfT), color, color, color, color)
  b.quad(up(rt, halfR), up(tt, halfT), dn(tt, halfT), dn(rt, halfR), color, color, color, color)
  b.quad(up(tl, halfT), dn(tl, halfT), dn(tt, halfT), up(tt, halfT), color, color, color, color)
}

/** Per-variant palette + silhouette parameters. Colors are stylized slate
 *  blues in the 2D jets' family (climb/cruise bodies live around #22314e —
 *  the 3D heroes sit a step lighter so shading has room to darken). */
type JetSpec = {
  belly: Vec3
  top: Vec3
  glass: Vec3
  radome: Vec3
  canopy: readonly [z0: number, z1: number, h: number]
  tip: 'tank' | 'rail'
  centerTank: boolean
  noseColorTo: number // stations with z below this take the radome color
}

const INLET = rgb('#0d131f')
const NOZZLE = rgb('#232830')

const JETS: Record<JetVariant, JetSpec> = {
  l39: {
    belly: rgb('#6e7f9a'),
    top: rgb('#313e5c'),
    glass: rgb('#101826'),
    radome: rgb('#2c3650'),
    canopy: [-0.36, -0.1, 0.034],
    tip: 'tank',
    centerTank: false,
    noseColorTo: -0.47,
  },
  l159: {
    belly: rgb('#74808d'),
    top: rgb('#3a4453'),
    glass: rgb('#101826'),
    radome: rgb('#262f3f'),
    canopy: [-0.34, -0.17, 0.032],
    tip: 'rail',
    centerTank: true,
    noseColorTo: -0.4,
  },
}

/** Bake one jet. Deterministic pure function — same variant, same buffers. */
export function bakeJet(variant: JetVariant): JetBuffers {
  const spec = JETS[variant]
  const b = new MeshBuilder()

  // Fuselage — a single loft nose→tail; the L-159's radome paints the first
  // stations its own darker gray, the nozzle darkens the last.
  const fuselage: Station[] = [
    { z: -0.5, r: 0, h: 0, y: -0.012 },
    { z: -0.44, r: 0.021, h: 0.024, y: -0.008 },
    { z: -0.34, r: 0.039, h: 0.044, y: -0.002 },
    { z: -0.18, r: 0.051, h: 0.056, y: 0.004 },
    { z: 0.0, r: 0.053, h: 0.058, y: 0.005 },
    { z: 0.16, r: 0.049, h: 0.052, y: 0.008 },
    { z: 0.32, r: 0.039, h: 0.04, y: 0.012 },
    { z: 0.44, r: 0.025, h: 0.027, y: 0.018, color: NOZZLE },
    { z: 0.5, r: 0.012, h: 0.014, y: 0.02, color: NOZZLE },
  ]
  for (const s of fuselage) if (s.z <= spec.noseColorTo) s.color = spec.radome
  loft(b, fuselage, spec.belly, spec.top)

  // Canopy — a glass blister sunk into the spine; its length IS the tandem
  // (L-39) vs single-seat (L-159) read.
  const [c0, c1, ch] = spec.canopy
  const cMid = (c0 + c1) / 2
  loft(
    b,
    [
      { z: c0, r: 0.001, h: 0.001, y: 0.052, color: spec.glass },
      { z: c0 * 0.7 + c1 * 0.3, r: 0.026, h: ch * 0.85, y: 0.05, color: spec.glass },
      { z: cMid, r: 0.028, h: ch, y: 0.05, color: spec.glass },
      { z: c1, r: 0.02, h: ch * 0.55, y: 0.052, color: spec.glass },
      { z: c1 + 0.05, r: 0.004, h: 0.004, y: 0.054, color: spec.glass },
    ],
    spec.glass,
    spec.glass,
  )

  // Wings — low, straight, slightly tapered with gentle dihedral (both types
  // share the Albatros planform).
  const wing: SurfaceSpec = {
    rootU: 0.04,
    tipU: 0.36,
    rootLE: -0.06,
    rootTE: 0.14,
    tipLE: 0.03,
    tipTE: 0.15,
    rootV: -0.015,
    tipV: 0.012,
    rootT: 0.016,
    tipT: 0.008,
  }
  surface(b, wing, 1, false, mix(spec.top, spec.belly, 0.35))
  surface(b, wing, -1, false, mix(spec.top, spec.belly, 0.35))

  // Tailplane + swept fin.
  const tail: SurfaceSpec = {
    rootU: 0.012,
    tipU: 0.16,
    rootLE: 0.37,
    rootTE: 0.48,
    tipLE: 0.42,
    tipTE: 0.485,
    rootV: 0.022,
    tipV: 0.03,
    rootT: 0.01,
    tipT: 0.006,
  }
  surface(b, tail, 1, false, mix(spec.top, spec.belly, 0.35))
  surface(b, tail, -1, false, mix(spec.top, spec.belly, 0.35))
  const fin: SurfaceSpec = {
    rootU: 0.04,
    tipU: 0.2,
    rootLE: 0.28,
    rootTE: 0.5,
    tipLE: 0.43,
    tipTE: 0.5,
    rootV: 0,
    tipV: 0,
    rootT: 0.012,
    tipT: 0.006,
  }
  surface(b, fin, 1, true, spec.top)

  // Side intakes above the wing root — the mouth is the dark engine face.
  box(b, [0.053, -0.005, -0.13], [0.088, 0.035, 0.03], mix(spec.top, spec.belly, 0.2), INLET)
  box(b, [-0.088, -0.005, -0.13], [-0.053, 0.035, 0.03], mix(spec.top, spec.belly, 0.2), INLET)

  // Wingtip devices — TANKS carry the L-39 silhouette, RAILS the L-159's.
  if (spec.tip === 'tank') {
    for (const sx of [1, -1] as const) {
      loft(
        b,
        [
          { z: -0.04, r: 0, h: 0, y: 0.012 },
          { z: 0.0, r: 0.014, h: 0.014, y: 0.012 },
          { z: 0.07, r: 0.017, h: 0.017, y: 0.012 },
          { z: 0.15, r: 0.011, h: 0.011, y: 0.012 },
          { z: 0.19, r: 0, h: 0, y: 0.012 },
        ],
        spec.belly,
        mix(spec.top, spec.belly, 0.5),
        0.365 * sx,
      )
    }
  } else {
    box(b, [0.358, 0.006, -0.02], [0.372, 0.02, 0.17], mix(spec.top, spec.belly, 0.25))
    box(b, [-0.372, 0.006, -0.02], [-0.358, 0.02, 0.17], mix(spec.top, spec.belly, 0.25))
  }

  // L-159 centreline tank (the 2D `l159` sprite flies with it).
  if (spec.centerTank) {
    loft(
      b,
      [
        { z: -0.08, r: 0, h: 0, y: -0.068 },
        { z: -0.03, r: 0.016, h: 0.016, y: -0.068 },
        { z: 0.08, r: 0.018, h: 0.018, y: -0.068 },
        { z: 0.18, r: 0.01, h: 0.01, y: -0.068 },
        { z: 0.22, r: 0, h: 0, y: -0.068 },
      ],
      spec.belly,
      mix(spec.top, spec.belly, 0.5),
    )
  }

  return b.build()
}
