/**
 * BITCOIN — the living blockchain (chapter 07, "Bitcoin rabbit hole"):
 * Martin's years inside the technology, the economics and the philosophy of
 * hard money. Deliberately NOT a coin — the centre is a ₿ CHIP in the PCB
 * style of his references (`OIP`, `bitcoin-network-oil-painting`,
 * `bitcoin-1813503`): the authentic tilted ₿ TRACED from the 1813503 photo
 * (btcGlyph.ts, GENERATED — never free-handed), dark on an amber pad, on a
 * pinned silicon substrate with circuit filigree.
 *
 * The world around it, back to front: a DOT-MATRIX WORLD MAP with glowing
 * exchange-city nodes and travelling arcs (his `btc network` reference,
 * logos omitted; worldMap.ts baked from a NASA-derived equirectangular
 * land mask); faint hash-rain; blue silhouettes of MODERN CITIES rising
 * behind the far ridge (the `OIP` / `Bitcoin je budoucnost` skylines); a
 * DENSE 3D wireframe data-terrain (`btc animuj` reference); and the peer
 * NETWORK living on it — technical node markers (diamonds + mini-chips,
 * not colored circles), k-nearest edges, travelling light pulses.
 *
 * Choreography (Martin directs in global HUD %; scene t = pos − 7.5): the
 * healing lake sinks into night over 84→88 % while this world materializes
 * — terrain traces outward from the centre, peers ignite in a radiating
 * wave, and the chip assembles LAST (complete by ~88 %). At the card (89 %)
 * everything is alive: heartbeat, pulses, a block wave every few seconds.
 * From 92 % the dev world enters and the brights dim under a veil.
 *
 * INTERACTIVE layer (the pointer channel): the camera yaws/pitches toward
 * the cursor (true 3D re-projection), the terrain swells under it, and
 * nearby peers link to it — the visitor becomes a node. Scaled by pointer
 * presence, so touch and reduced motion see the complete calm scene.
 *
 * Story motion derives from `localT`; `time` only breathes. The frame is
 * complete frozen at time 0.
 */

import type { Renderer } from '../types'
import {
  TAU,
  drawGlow,
  drawStars,
  fillVerticalGradient,
  hash1,
  lerp,
  mixHex,
  rgba,
  smoothstep,
} from '../toolkit'
import {
  BTC,
  GRID,
  PAD,
  blockWave,
  buildEdges,
  buildNodes,
  camFromPointer,
  coinPeers,
  cursorBoost,
  heartbeat,
  netDist,
  nodeDegrees,
  nodeLit,
  project,
  pulsePhase,
  storyWaveR,
  terrainHeight,
  traceReveal,
  waveBand,
  type Cam,
  type Projected,
  type Vec3,
} from './bitcoinMath'
import { WORLD_COLS, WORLD_ROWS, worldCell, worldLand } from './worldMap'

/** Night-valley ink (matches the engine's safety floor family). */
const INK = '#030509'
const SKY_MID = '#071020'
const SKY_LOW = '#0d1a33'
/** Wireframe blues — valley floor to lit peaks. */
const WIRE_LO = '#16345c'
const WIRE_HI = '#35d0e0'
/** Edge strokes (steel lifted toward pale so the mesh reads as a NET),
 *  light-pulse gold, node amber, cursor pale, map-dot steel. */
const EDGE_COLOR = '#6f8fc2'
const GOLD = '#ffcf7a'
const AMBER = '#ffb454'
const PALE = '#cfe8ff'
const MAP_DOT = '#cfdff8'
// (rev13: there is NO central chip/logo object — the epicentre is pure
// energy: the strike, the breathing ground glow, the circuit traces and the
// wave itself.)

// --- Deterministic world, built once at module scope ------------------------

// 96 peers (rev12): designated HUBS (every 12th of the core 64) link to
// their 7 nearest, ordinary peers to 2, and the extra 32 are small
// peripheral peers holding a single link — so the tiered icons reflect
// REAL connection counts, not chance (rev14).
const NODES = buildNodes(96, 11, 0.115)
const EDGES = buildEdges(NODES, (i) => (i < 64 ? (i % 12 === 0 ? 7 : 2) : 1))
const DEG = nodeDegrees(NODES.length, EDGES)
const PEERS = coinPeers(NODES, 5)

const NX = GRID.nx
const NZ = GRID.nz
const NV = NX * NZ
const GXa = new Float64Array(NV)
const GZa = new Float64Array(NV)
const GHa = new Float64Array(NV)
const GDa = new Float64Array(NV)
for (let iz = 0; iz < NZ; iz++) {
  for (let ix = 0; ix < NX; ix++) {
    const i = iz * NX + ix
    const x = lerp(GRID.x0, GRID.x1, ix / (NX - 1))
    const z = lerp(GRID.z0, GRID.z1, iz / (NZ - 1))
    GXa[i] = x
    GZa[i] = z
    GHa[i] = terrainHeight(x, z)
    GDa[i] = netDist(x, z, PAD.x, PAD.z)
  }
}

/** Row stroke tint rises from deep blue toward cyan with the row's relief. */
const ROW_COLOR: string[] = []
for (let iz = 0; iz < NZ; iz++) {
  let sum = 0
  for (let ix = 0; ix < NX; ix++) sum += GHa[iz * NX + ix]
  ROW_COLOR.push(mixHex(WIRE_LO, WIRE_HI, 0.18 + Math.min(0.6, (sum / NX) * 2.6)))
}
const COL_COLOR = mixHex(WIRE_LO, WIRE_HI, 0.42)

/** The world-map dot matrix (land cells only), as [ix, iy] pairs. */
const MAP_DOTS: Array<readonly [number, number]> = []
for (let iy = 0; iy < WORLD_ROWS; iy++) {
  for (let ix = 0; ix < WORLD_COLS; ix++) {
    if (worldLand(ix, iy)) MAP_DOTS.push([ix, iy])
  }
}
/** Node cities pinned on the map (lat, lon → grid cells) — a world of
 *  peers, Prague (Martin's node) and San Salvador included. */
const CITIES = [
  { lat: 37.8, lon: -122.4 }, // 0 San Francisco
  { lat: 30.3, lon: -97.7 }, // 1 Austin
  { lat: 40.7, lon: -74 }, // 2 New York
  { lat: 25.8, lon: -80.2 }, // 3 Miami
  { lat: 13.7, lon: -89.2 }, // 4 San Salvador
  { lat: -23.5, lon: -46.6 }, // 5 São Paulo
  { lat: -34.6, lon: -58.4 }, // 6 Buenos Aires
  { lat: 51.5, lon: -0.1 }, // 7 London
  { lat: 52.5, lon: 13.4 }, // 8 Berlin
  { lat: 47.4, lon: 8.5 }, // 9 Zurich
  { lat: 50.1, lon: 14.4 }, // 10 Prague — Martin's node lives here
  { lat: 6.5, lon: 3.4 }, // 11 Lagos
  { lat: -33.9, lon: 18.4 }, // 12 Cape Town
  { lat: -1.3, lon: 36.8 }, // 13 Nairobi
  { lat: 25.2, lon: 55.3 }, // 14 Dubai
  { lat: 19.1, lon: 72.9 }, // 15 Mumbai
  { lat: 1.35, lon: 103.8 }, // 16 Singapore
  { lat: 22.3, lon: 114.2 }, // 17 Hong Kong
  { lat: 37.6, lon: 127 }, // 18 Seoul
  { lat: 35.7, lon: 139.7 }, // 19 Tokyo
  { lat: -33.9, lon: 151.2 }, // 20 Sydney
  { lat: 43.7, lon: -79.4 }, // 21 Toronto
  { lat: 19.4, lon: -99.1 }, // 22 Mexico City
  { lat: 4.7, lon: -74.1 }, // 23 Bogotá
  { lat: 40.4, lon: -3.7 }, // 24 Madrid
  { lat: 48.9, lon: 2.35 }, // 25 Paris
  { lat: 52.4, lon: 4.9 }, // 26 Amsterdam
  { lat: 59.3, lon: 18.1 }, // 27 Stockholm
  { lat: 52.2, lon: 21 }, // 28 Warsaw
  { lat: 48.2, lon: 16.4 }, // 29 Vienna
  { lat: 41, lon: 29 }, // 30 Istanbul
  { lat: 30, lon: 31.2 }, // 31 Cairo
  { lat: 32.1, lon: 34.8 }, // 32 Tel Aviv
  { lat: 13.8, lon: 100.5 }, // 33 Bangkok
  { lat: 25, lon: 121.5 }, // 34 Taipei
  { lat: 14.6, lon: 121 }, // 35 Manila
  { lat: 34.7, lon: 135.5 }, // 36 Osaka
  { lat: -36.8, lon: 174.8 }, // 37 Auckland
  { lat: 5.6, lon: -0.2 }, // 38 Accra
].map((c) => worldCell(c.lat, c.lon))
/** Great arcs between city pairs; several staggered lights travel each —
 *  the map must SEETHE with activity (rev11). */
const MAP_ARCS: Array<readonly [number, number]> = [
  [0, 19], [0, 2], [1, 3], [2, 7], [3, 4], [4, 5], [5, 6], [2, 5],
  [7, 8], [8, 10], [9, 10], [7, 10], [7, 11], [11, 12], [12, 13], [13, 14],
  [14, 15], [15, 16], [16, 17], [17, 18], [18, 19], [19, 20], [16, 20],
  [14, 7], [2, 10], [0, 16], [9, 14], [5, 12],
  [21, 2], [21, 7], [21, 0], [22, 1], [22, 4], [23, 3], [23, 5],
  [24, 7], [24, 25], [24, 31], [25, 9], [25, 26], [26, 7], [27, 26],
  [27, 10], [28, 10], [29, 10], [29, 30], [30, 14], [31, 14], [32, 30],
  [33, 16], [34, 17], [35, 16], [36, 19], [36, 18], [37, 20], [38, 11],
]

/** Minor map nodes (rev12): scattered over the land mask with density
 *  following modern civilization — USA, Europe, East + SE Asia densest,
 *  then India / Gulf / South America / Oceania / South Africa. */
function regionWeight(lat: number, lon: number): number {
  const box = (la0: number, la1: number, lo0: number, lo1: number) =>
    lat >= la0 && lat <= la1 && lon >= lo0 && lon <= lo1
  if (box(25, 50, -125, -65)) return 1 // USA + southern Canada
  if (box(35, 60, -10, 30)) return 1 // Europe
  if (box(20, 45, 100, 145)) return 0.9 // East Asia
  if (box(-10, 20, 95, 125)) return 0.85 // SE Asia
  if (box(8, 30, 68, 90)) return 0.6 // India
  if (box(12, 35, 30, 60)) return 0.55 // Gulf / MENA
  if (box(-35, 0, -65, -35)) return 0.5 // Brazil → Río de la Plata
  if (box(-40, -25, 140, 155)) return 0.5 // SE Australia
  if (box(-35, -25, 15, 32)) return 0.45 // South Africa
  return 0.08
}
const MAP_MINORS: Array<{ x: number; y: number; hub: number }> = []
{
  const latOf = (iy: number) => 85 - ((iy + 0.5) / WORLD_ROWS) * 145
  const lonOf = (ix: number) => -180 + ((ix + 0.5) / WORLD_COLS) * 360
  for (let k = 1; MAP_MINORS.length < 170 && k < 9000; k++) {
    const cell = MAP_DOTS[Math.floor(hash1(k * 3.17) * MAP_DOTS.length)]
    if (hash1(k * 7.91 + 1.7) > regionWeight(latOf(cell[1]), lonOf(cell[0]))) continue
    const x = cell[0] + (hash1(k * 5.3) - 0.5) * 0.8
    const y = cell[1] + (hash1(k * 9.7) - 0.5) * 0.8
    let hub = 0
    let hd = 1e9
    for (let c = 0; c < CITIES.length; c++) {
      const dd = Math.hypot(CITIES[c].x - x, CITIES[c].y - y)
      if (dd < hd) {
        hd = dd
        hub = c
      }
    }
    MAP_MINORS.push({ x, y, hub })
  }
}

/** The two far-ridge dips that frame the horizon city skylines. */
function wallDip(xa: number, xb: number): number {
  let bestX = xa
  let bestH = 1e9
  for (let x = xa; x <= xb; x += 0.02) {
    const hh = terrainHeight(x, 0.97)
    if (hh < bestH) {
      bestH = hh
      bestX = x
    }
  }
  return bestX
}
const CITY_XS = [wallDip(-1.35, -0.2), wallDip(0.2, 1.35)]

// Allocation-free projection scratch: the frame projects thousands of
// points, so the wrappers below reuse one Vec3 + two output slots (the
// terrain/node loops project a second, cursor-bumped point while the first
// result must stay readable — see NSS).
const PV: Vec3 = { x: 0, y: 0, z: 0 }
const POUT_A: Projected = { nx: 0, ny: 0, s: 0 }
const POUT_B: Projected = { nx: 0, ny: 0, s: 0 }

// Per-frame scratch (reused buffers, not cross-frame state).
const SXa = new Float64Array(NV)
const SYa = new Float64Array(NV)
const SBa = new Float64Array(NV)
const SRa = new Float64Array(NV)
const NSX = new Float64Array(NODES.length)
const NSY = new Float64Array(NODES.length)
const NSS = new Float64Array(NODES.length)
const NSB = new Float64Array(NODES.length)
const NLIT = new Float64Array(NODES.length)

// --- Hash-rain / label glyph atlas (lazy, browser only) ----------------------

const HEX_CHARS = '0123456789ABCDEF'
const RAIN_GW = 22
const RAIN_GH = 30
let rainAtlas: HTMLCanvasElement | null = null
let rainAtlasRebuildHooked = false
function getRainAtlas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  if (!rainAtlas) {
    const c = document.createElement('canvas')
    c.width = RAIN_GW * 16
    c.height = RAIN_GH * 2
    const g = c.getContext('2d')
    if (!g) return null
    g.font = '600 22px "Chakra Petch", ui-monospace, monospace'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    for (let row = 0; row < 2; row++) {
      g.fillStyle = row === 0 ? '#8fb0d8' : AMBER
      for (let i = 0; i < 16; i++) {
        g.fillText(HEX_CHARS[i], RAIN_GW * (i + 0.5), RAIN_GH * (row + 0.5))
      }
    }
    rainAtlas = c
    // Chakra Petch may not be ready on the very first frames — rebuild once
    // the real font is in so the glyphs don't keep a fallback face.
    if (!rainAtlasRebuildHooked && 'fonts' in document) {
      rainAtlasRebuildHooked = true
      void document.fonts.ready.then(() => {
        rainAtlas = null
      })
    }
  }
  return rainAtlas
}

// --- World-map dot layer cache (lazy, browser only) --------------------------
// ~8 900 land dots at the rev13 resolution never move — bake them once per
// viewport; the live shimmer rides on a sparse subset drawn over the cache.
let mapCache: HTMLCanvasElement | null = null
let mapCacheKey = ''
function getMapLayer(
  mapW: number,
  cellW: number,
  cellH: number,
  fadeY0: number,
  fadeY1: number,
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  const key = `${mapW.toFixed(1)}:${cellH.toFixed(2)}:${fadeY0.toFixed(1)}`
  if (mapCache && mapCacheKey === key) return mapCache
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(mapW))
  c.height = Math.max(1, Math.ceil(Math.min(cellH * WORLD_ROWS, fadeY1)))
  const g = c.getContext('2d')
  if (!g) return null
  g.fillStyle = MAP_DOT
  const dot = Math.max(1, cellW * 0.42)
  for (let k = 0; k < MAP_DOTS.length; k++) {
    const [ix, iy] = MAP_DOTS[k]
    const dy = iy * cellH
    const hf = 1 - smoothstep(fadeY0, fadeY1, dy)
    if (hf <= 0.01) continue
    g.globalAlpha = hf * (0.16 + 0.12 * hash1(ix * 7.3 + iy * 13.1))
    g.fillRect(ix * cellW, dy, dot, dot)
  }
  mapCache = c
  mapCacheKey = key
  return c
}

/** Quadratic Bézier at parameter s. */
const quadAt = (a: number, c: number, b: number, s: number): number =>
  (1 - s) * (1 - s) * a + 2 * (1 - s) * s * c + s * s * b

export const renderBitcoin: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h, accent } = cfg
  const unit = Math.min(w, h)
  const tExit = cfg.tRaw ?? t

  // The genesis impulse lands at 87 % global (t = impactT). Before it, the
  // scene is bare mountains — no map, no peers, and NO pointer response.
  const mapOn = smoothstep(BTC.impactT, BTC.impactT + 0.015, t)

  // Pointer (presence-scaled enhancement; a = 0 on touch/reduced motion,
  // and gated off entirely until the impulse has landed).
  const pa = (cfg.pointer?.a ?? 0) * mapOn
  const px = cfg.pointer?.x ?? w * 0.5
  const py = cfg.pointer?.y ?? h * 0.5
  const pnx = Math.max(-1, Math.min(1, (px - w * 0.5) / (w * 0.5)))
  const pny = Math.max(-1, Math.min(1, (py - h * 0.5) / (h * 0.5)))

  // Hand-over to the dev world: brights ease down, then a night veil.
  const veil = smoothstep(0.85, 1.12, tExit)
  const glow = 1 - veil * 0.85

  // Camera: pointer parallax + a slow ambient orbit sway.
  const cam: Cam = camFromPointer(pnx, pny, pa)
  cam.yaw += Math.sin(time * 0.07) * 0.02

  // Screen mapping (the card sits LEFT, so the world centres slightly right).
  const scale = unit * 1.05
  const cx = w * 0.54
  const cy = h * 0.44
  const toX = (p: { nx: number }) => cx + p.nx * scale
  const toY = (p: { ny: number }) => cy + p.ny * scale
  // Two projection slots: `proj` for the primary point, `projB` for the
  // cursor-bumped re-projection taken while the primary must stay readable.
  const proj = (x: number, y: number, z: number) => {
    PV.x = x
    PV.y = y
    PV.z = z
    return project(PV, cam, POUT_A)
  }
  const projB = (x: number, y: number, z: number) => {
    PV.x = x
    PV.y = y
    PV.z = z
    return project(PV, cam, POUT_B)
  }

  const beat = heartbeat(time)
  // The epicentre energy (ground glow, circuit traces, backbone) breathes
  // to life right after the impact.
  const epi = smoothstep(BTC.impactT, BTC.impactT + 0.05, t)
  // The impact wave (scroll-driven story): strength envelope fading with
  // distance, a soft end-fade so it dissolves at the valley rim, and the
  // strike flash right at the landing instant.
  const storyR = storyWaveR(t)
  const storyK = storyR === null ? 0 : 1 - (storyR / BTC.storyWaveMax) * 0.55
  const storyEnd = storyR === null ? 0 : 1 - smoothstep(BTC.storyWaveMax * 0.86, BTC.storyWaveMax, storyR)
  const strike = Math.exp(-Math.pow((t - (BTC.impactT + 0.006)) / 0.018, 2))
  // Ambient block waves take over once the impact wave has crossed.
  const ambGate = smoothstep(0.53, 0.59, t)
  const waveRaw = blockWave(time)
  const wave = waveRaw && ambGate > 0.01 ? { r: waveRaw.r, k: waveRaw.k * ambGate } : null

  // --- Sky ------------------------------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      [0, INK],
      [0.45, SKY_MID],
      [1, SKY_LOW],
    ],
    alpha,
  )
  drawStars(ctx, {
    w,
    h: h * 0.42,
    count: 54,
    seed: 41,
    alpha: alpha * 0.24,
    size: 1.2,
    time,
    twinkle: 0.45,
  })

  const horizon = proj(0, 0, 1)
  const horizonY = toY(horizon)
  // The far glow of the network's light behind the terrain wall.
  drawGlow(ctx, cx, horizonY, unit * 0.55, accent, alpha * 0.055 * glow)

  // --- The digital world map (btc-network reference, logos omitted) ----------
  // Full screen width (rev11), gently squashed to fit above the terrain and
  // fading out where the mountains take over — a sky MADE of the network.
  // It pops on INSTANTLY with the genesis impulse (rev12), glowing
  // white-blue, and seethes: hubs + civilization-weighted minor nodes.
  const mapA = mapOn * glow * alpha
  if (mapA > 0.01) {
    const mx0 = w * 0.01
    const mapW = w * 0.98
    // On phones the map is pushed down so it clears the top nav pill (the
    // continents used to sit under it); desktop keeps it hugging the top.
    const my0 = (w < 720 ? 0.11 : 0.02) * h
    const cellW = mapW / WORLD_COLS
    const cellH = Math.min(cellW, (horizonY - h * 0.06 - my0) / WORLD_ROWS)
    const dot = Math.max(1, cellW * 0.42)
    const fadeY0 = horizonY - h * 0.12
    const fadeY1 = horizonY - h * 0.02
    const mapFade = (y: number) => 1 - smoothstep(fadeY0, fadeY1, y)
    ctx.save()
    // The static continents come from the baked layer (the fade is keyed to
    // the pointer-free horizon so the cache never rebuilds mid-hover)…
    const baseHorizon = cy + project({ x: 0, y: 0, z: 1 }, camFromPointer(0, 0, 0)).ny * scale
    const layer = getMapLayer(mapW, cellW, cellH, baseHorizon - h * 0.12 - my0, baseHorizon - h * 0.02 - my0)
    // The planet BREATHES — a slow, visible swell in the continents'
    // brightness, on its own clock, never on scroll (rev14).
    const mapBreath = 0.8 + 0.2 * Math.sin(time * 1.25)
    if (layer) {
      ctx.globalAlpha = mapA * mapBreath
      ctx.drawImage(layer, mx0, my0)
    }
    // …and a sparse subset shimmers live on top, so the matrix sparkles.
    ctx.fillStyle = MAP_DOT
    for (let k = 0; k < MAP_DOTS.length; k += 5) {
      const [ix, iy] = MAP_DOTS[k]
      const dy = my0 + iy * cellH
      const hf = mapFade(dy)
      if (hf <= 0.01) continue
      const hd = hash1(ix * 7.3 + iy * 13.1)
      const shimmer = 0.5 + 0.5 * Math.sin(time * (0.5 + hd * 0.8) + hd * TAU)
      ctx.globalAlpha = mapA * hf * 0.34 * shimmer * mapBreath
      ctx.fillRect(mx0 + ix * cellW, dy, dot, dot)
    }
    // Minor nodes — civilization-weighted; every other one links to its hub.
    for (let k = 0; k < MAP_MINORS.length; k++) {
      const mn = MAP_MINORS[k]
      const nx2 = mx0 + mn.x * cellW
      const ny2 = my0 + mn.y * cellH
      const hf = mapFade(ny2)
      if (hf <= 0.01) continue
      const hm = hash1(k * 4.9 + 2.3)
      const tw = 0.7 + 0.3 * Math.sin(time * (0.6 + hm) + hm * TAU)
      ctx.globalAlpha = mapA * hf * (0.4 + 0.3 * hm) * tw
      ctx.fillStyle = PALE
      ctx.fillRect(nx2 - 0.9, ny2 - 0.9, 1.8, 1.8)
      if (k % 2 === 0) {
        const hx = mx0 + CITIES[mn.hub].x * cellW
        const hy = my0 + CITIES[mn.hub].y * cellH
        const mxc = (nx2 + hx) / 2
        const myc = Math.max(h * 0.005, Math.min(ny2, hy) - Math.abs(hx - nx2) * 0.14 - h * 0.008)
        ctx.strokeStyle = rgba('#9fc2ec', 0.09 * mapA * hf)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(nx2, ny2)
        ctx.quadraticCurveTo(mxc, myc, hx, hy)
        ctx.stroke()
        // One fast light EACH WAY per feeder, at the same pixel speed as
        // every other transaction — photons don't do ballistics (rev14).
        const lenM = Math.hypot(hx - nx2, hy - ny2) + 1
        for (let pu = 0; pu < 2; pu++) {
          const ph0 = (((hash1(701 + k * 3.3 + pu * 11.1) + (time * unit * 0.33) / lenM) % 1) + 1) % 1
          const u = pu === 0 ? ph0 : 1 - ph0
          ctx.fillStyle = rgba(GOLD, 0.5 * mapA * hf)
          ctx.fillRect(quadAt(nx2, mxc, hx, u) - 1, quadAt(ny2, myc, hy, u) - 1, 2, 2)
        }
      }
    }
    // City nodes: an amber core + a slow ping ring each.
    for (let k = 0; k < CITIES.length; k++) {
      const nx2 = mx0 + CITIES[k].x * cellW
      const ny2 = my0 + CITIES[k].y * cellH
      const hf = mapFade(ny2)
      if (hf <= 0.01) continue
      const ping = ((time * 0.7 + hash1(k * 3.7)) % 1 + 1) % 1
      ctx.globalAlpha = mapA * hf * 0.9
      ctx.fillStyle = AMBER
      ctx.fillRect(nx2 - 1.4, ny2 - 1.4, 2.8, 2.8)
      ctx.strokeStyle = rgba(AMBER, (1 - ping) * 0.55 * mapA * hf)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(nx2, ny2, 2 + ping * cellW * 1.6, 0, TAU)
      ctx.stroke()
    }
    // Great arcs, each carrying THREE staggered lights with little tails —
    // the network never rests.
    for (let k = 0; k < MAP_ARCS.length; k++) {
      const [ia, ib] = MAP_ARCS[k]
      const ax = mx0 + CITIES[ia].x * cellW
      const ay = my0 + CITIES[ia].y * cellH
      const bx = mx0 + CITIES[ib].x * cellW
      const by = my0 + CITIES[ib].y * cellH
      const hfArc = Math.min(mapFade(ay), mapFade(by))
      if (hfArc <= 0.01) continue
      const mxc = (ax + bx) / 2
      const myc = Math.max(h * 0.005, Math.min(ay, by) - Math.abs(bx - ax) * 0.16 - h * 0.02)
      ctx.strokeStyle = rgba(GOLD, 0.13 * mapA * hfArc)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(ax, ay)
      ctx.quadraticCurveTo(mxc, myc, bx, by)
      ctx.stroke()
      // Constant PIXEL speed on every arc — short hops fly exactly as fast
      // as ocean crossings — and the lights run BOTH ways (rev14).
      const arcLen = Math.hypot(bx - ax, by - ay) + 1
      const tailPh = 8 / arcLen
      for (let pu = 0; pu < 4; pu++) {
        const up = pu % 2 === 0
        const ph0 = (((hash1(k * 13.7 + pu * 7.3) + (time * unit * 0.33) / arcLen) % 1) + 1) % 1
        const ph = up ? ph0 : 1 - ph0
        const lx = quadAt(ax, mxc, bx, ph)
        const ly = quadAt(ay, myc, by, ph)
        ctx.fillStyle = rgba(GOLD, 0.6 * mapA * hfArc)
        ctx.fillRect(lx - 1.2, ly - 1.2, 2.4, 2.4)
        // Two dimming tail dots trailing the head.
        for (let tr = 1; tr <= 2; tr++) {
          const pht = Math.max(0, Math.min(1, ph + (up ? -1 : 1) * tr * tailPh))
          const tx = quadAt(ax, mxc, bx, pht)
          const ty = quadAt(ay, myc, by, pht)
          ctx.fillStyle = rgba(GOLD, 0.6 * mapA * hfArc * (0.45 - tr * 0.16))
          ctx.fillRect(tx - 0.9, ty - 0.9, 1.8, 1.8)
        }
      }
    }
    ctx.restore()
  }

  // --- Hash rain (behind the terrain) ----------------------------------------
  const rain = getRainAtlas()
  const rainA = mapOn * glow * 0.8
  if (rain && rainA > 0.01) {
    const gw = unit * 0.0125
    const gh = gw * (RAIN_GH / RAIN_GW)
    const step = gh * 1.12
    ctx.save()
    for (let c = 0; c < 16; c++) {
      const h1 = hash1(400 + c * 7.7)
      const h2 = hash1(410 + c * 3.3)
      const h3 = hash1(420 + c * 9.1)
      const colX = (h1 * 1.04 - 0.02) * w
      const fall = unit * (0.045 + 0.075 * h2)
      const span = h * 0.9 + step * 12
      const headY = ((h3 * 977 + time * fall) % span) - step * 11
      const amberCol = hash1(430 + c * 5.9) > 0.82
      for (let gi = 0; gi < 10; gi++) {
        const gy = headY - gi * step
        if (gy < -gh || gy > h) continue
        const hf = 1 - smoothstep(horizonY - h * 0.05, horizonY + h * 0.12, gy)
        if (hf <= 0.01) continue
        const chI = Math.floor(hash1(c * 31.7 + gi * 7.3 + Math.floor(time * (1.5 + h2 * 2.5))) * 16)
        ctx.globalAlpha = alpha * rainA * hf * (gi === 0 ? 0.2 : 0.1 * (1 - gi / 10))
        ctx.drawImage(rain, chI * RAIN_GW, amberCol ? RAIN_GH : 0, RAIN_GW, RAIN_GH, colX, gy, gw, gh)
      }
    }
    ctx.restore()
  }

  // --- Modern-city silhouettes behind the far ridge ---------------------------
  if (mapOn > 0.02) {
    ctx.save()
    for (let ci = 0; ci < CITY_XS.length; ci++) {
      const cxw = CITY_XS[ci]
      const base = proj(cxw, terrainHeight(cxw, 0.985), 0.985)
      const bX = toX(base)
      const bY = toY(base)
      const ss = base.s * scale
      const cityA = alpha * mapOn * 0.85
      // The haze of the city's own light.
      drawGlow(ctx, bX, bY - ss * 0.05, ss * 0.34, WIRE_HI, cityA * 0.05)
      let off = -0.3
      for (let b = 0; b < 15; b++) {
        const hb = hash1(800 + ci * 100 + b * 7.9)
        const hw = hash1(810 + ci * 100 + b * 5.3)
        const bw = 0.022 + 0.034 * hw
        const bh = 0.045 + 0.125 * hb * hb
        const x0 = bX + off * ss
        const y0 = bY - bh * ss
        const wpx = bw * ss
        const hpx = bh * ss
        ctx.globalAlpha = cityA * (0.55 + 0.25 * hb)
        ctx.fillStyle = mixHex('#0b1a30', WIRE_HI, 0.1 + 0.08 * hw)
        ctx.fillRect(x0, y0, wpx, hpx)
        // Lit windows — sparse dot columns.
        ctx.fillStyle = WIRE_HI
        for (let wy = y0 + 3; wy < bY - 2; wy += 5) {
          for (let wx = x0 + 1.5; wx < x0 + wpx - 1; wx += 3.4) {
            if (hash1(wx * 3.1 + wy * 7.7 + b) < 0.26) {
              ctx.globalAlpha = cityA * 0.32
              ctx.fillRect(wx, wy, 1, 1)
            }
          }
        }
        // Antenna on the tall ones.
        if (bh > 0.13) {
          ctx.globalAlpha = cityA * 0.7
          ctx.strokeStyle = mixHex('#0b1a30', WIRE_HI, 0.3)
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x0 + wpx / 2, y0)
          ctx.lineTo(x0 + wpx / 2, y0 - ss * 0.03)
          ctx.stroke()
          ctx.fillStyle = PALE
          ctx.globalAlpha = cityA * (0.4 + 0.3 * Math.sin(time * 1.3 + b))
          ctx.fillRect(x0 + wpx / 2 - 0.8, y0 - ss * 0.03 - 0.8, 1.6, 1.6)
        }
        off += bw + 0.006 + 0.01 * hash1(820 + b * 3.3)
      }
    }
    ctx.restore()
  }

  // --- Terrain: project every vertex (wave lift + cursor bump) ---------------
  const bumpR = unit * 0.17
  for (let i = 0; i < NV; i++) {
    let y = GHa[i]
    let boost = 0
    if (wave) {
      const band = waveBand(GDa[i], wave.r)
      if (band > 0) {
        y += band * wave.k * 0.035
        boost += band * wave.k
      }
    }
    // The impact front carried by the terrain itself (rev13): a crest at
    // the wave with a shallow TROUGH trailing it — the ground visibly
    // deepens and rebounds as the wave rolls outward.
    if (storyR !== null && storyEnd > 0.01) {
      const crest = waveBand(GDa[i], storyR, 0.16)
      const trough = waveBand(GDa[i], storyR - 0.19, 0.2)
      if (crest > 0 || trough > 0) {
        y += (crest * 0.085 - trough * 0.05) * storyK * storyEnd
        boost += crest * storyK * 1.3 * storyEnd
      }
    }
    const p = proj(GXa[i], y, GZa[i])
    let sx = toX(p)
    let sy = toY(p)
    if (pa > 0.02) {
      const bump = cursorBoost(Math.hypot(sx - px, sy - py), bumpR) * pa
      if (bump > 0.015) {
        const p2 = projB(GXa[i], y + bump * 0.065, GZa[i])
        sx = toX(p2)
        sy = toY(p2)
        boost += bump
      }
    }
    SXa[i] = sx
    SYa[i] = sy
    SBa[i] = boost
    SRa[i] = traceReveal(GDa[i], t)
  }

  // Rows (constant z): the main relief lines, tinted by their own relief.
  ctx.save()
  ctx.lineWidth = 0.8
  for (let iz = 0; iz < NZ; iz++) {
    const zRow = GZa[iz * NX]
    const rowA = alpha * (0.2 + 0.3 * (1 - zRow * 0.6))
    if (rowA <= 0.01) continue
    ctx.strokeStyle = ROW_COLOR[iz]
    ctx.globalAlpha = rowA
    ctx.beginPath()
    let open = false
    for (let ix = 0; ix < NX - 1; ix++) {
      const i = iz * NX + ix
      if (Math.min(SRa[i], SRa[i + 1]) >= 0.5) {
        if (!open) {
          ctx.moveTo(SXa[i], SYa[i])
          open = true
        }
        ctx.lineTo(SXa[i + 1], SYa[i + 1])
      } else {
        open = false
      }
    }
    ctx.stroke()
  }
  // Columns (constant x): quieter cross-hatch that completes the mesh.
  ctx.strokeStyle = COL_COLOR
  ctx.lineWidth = 0.8
  for (let ix = 0; ix < NX; ix += 1) {
    ctx.globalAlpha = alpha * 0.22
    ctx.beginPath()
    let open = false
    for (let iz = 0; iz < NZ - 1; iz++) {
      const i = iz * NX + ix
      const j = i + NX
      if (Math.min(SRa[i], SRa[j]) >= 0.5) {
        if (!open) {
          ctx.moveTo(SXa[i], SYa[i])
          open = true
        }
        ctx.lineTo(SXa[j], SYa[j])
      } else {
        open = false
      }
    }
    ctx.stroke()
  }
  // Excited segments (wave band + cursor swell) re-drawn bright on top.
  ctx.lineWidth = 1
  for (let iz = 0; iz < NZ; iz++) {
    for (let ix = 0; ix < NX - 1; ix++) {
      const i = iz * NX + ix
      const b = (SBa[i] + SBa[i + 1]) * 0.5
      if (b <= 0.05 || Math.min(SRa[i], SRa[i + 1]) < 0.5) continue
      ctx.globalAlpha = Math.min(0.9, b) * 0.7 * alpha
      ctx.strokeStyle = mixHex(WIRE_HI, '#ffffff', Math.min(1, b) * 0.35)
      ctx.beginPath()
      ctx.moveTo(SXa[i], SYa[i])
      ctx.lineTo(SXa[i + 1], SYa[i + 1])
      ctx.stroke()
    }
  }
  // The drawing frontier while the world traces itself in.
  if (t > BTC.traceT0 && t < BTC.traceT1 + 0.1) {
    ctx.fillStyle = GOLD
    for (let i = 0; i < NV; i += 2) {
      if (SRa[i] > 0.12 && SRa[i] < 0.88) {
        ctx.globalAlpha = alpha * 0.55 * (1 - Math.abs(SRa[i] - 0.5) * 2)
        ctx.fillRect(SXa[i] - 1, SYa[i] - 1, 2, 2)
      }
    }
  }
  ctx.restore()

  // --- The pad: the chip's light pooling on the ground -------------------------
  const padGround = proj(PAD.x, terrainHeight(PAD.x, PAD.z), PAD.z)
  const padX = toX(padGround)
  const padY = toY(padGround)
  // The epicentre breathes — the heartbeat lives in the ground itself.
  drawGlow(ctx, padX, padY, unit * 0.3, accent, (0.11 + 0.08 * beat) * epi * alpha * glow)

  // PCB traces radiating on the ground: right-angle runs with via dots.
  if (epi > 0.02) {
    ctx.save()
    ctx.lineWidth = 1
    for (let ring = 0; ring < 2; ring++) {
      const rw = ring === 0 ? 0.16 : 0.26
      ctx.strokeStyle = rgba(accent, 0.22 * epi * alpha)
      let open = false
      ctx.beginPath()
      for (let k = 0; k <= 48; k++) {
        const th = (k / 48) * TAU
        if (hash1(ring * 53.7 + Math.floor(k / 6) * 3.3) < 0.32) {
          open = false
          continue
        }
        const gx = PAD.x + rw * Math.cos(th)
        const gz = PAD.z + rw * Math.sin(th) * 0.75
        const p = proj(gx, terrainHeight(gx, gz) + 0.006, gz)
        if (!open) {
          ctx.moveTo(toX(p), toY(p))
          open = true
        } else {
          ctx.lineTo(toX(p), toY(p))
        }
      }
      ctx.stroke()
    }
    for (let ray = 0; ray < 10; ray++) {
      const th = (ray / 10) * TAU + 0.3
      const jog = (hash1(700 + ray * 3.1) - 0.5) * 0.42
      const rEnd = 0.3 + hash1(710 + ray * 5.7) * 0.1
      const rMid = 0.12 + hash1(720 + ray * 7.3) * 0.08
      const pts = [
        [0.055, th],
        [rMid, th],
        [rMid, th + jog],
        [rEnd, th + jog],
      ] as const
      ctx.strokeStyle = rgba(accent, 0.17 * epi * alpha)
      ctx.beginPath()
      let lastX = 0
      let lastY = 0
      pts.forEach(([r, a2], k) => {
        const gx = PAD.x + r * Math.cos(a2)
        const gz = PAD.z + r * Math.sin(a2) * 0.75
        const p = proj(gx, terrainHeight(gx, gz) + 0.006, gz)
        lastX = toX(p)
        lastY = toY(p)
        if (k === 0) ctx.moveTo(lastX, lastY)
        else ctx.lineTo(lastX, lastY)
      })
      ctx.stroke()
      // A via pad at the trace end (PCB-style terminal).
      ctx.fillStyle = rgba(accent, 0.35 * epi * alpha)
      ctx.beginPath()
      ctx.arc(lastX, lastY, 1.6, 0, TAU)
      ctx.fill()
      // An outward light pulse on every other trace.
      if (ray % 2 === 0) {
        const ph = pulsePhase(200 + ray, time)
        const r = lerp(0.055, rEnd, ph)
        const a2 = r < rMid ? th : th + jog
        const gx = PAD.x + r * Math.cos(a2)
        const gz = PAD.z + r * Math.sin(a2) * 0.75
        const p = proj(gx, terrainHeight(gx, gz) + 0.008, gz)
        ctx.fillStyle = rgba(GOLD, (1 - ph) * 0.5 * epi * alpha * glow)
        const rr = 1.6 * p.s
        ctx.fillRect(toX(p) - rr / 2, toY(p) - rr / 2, rr, rr)
      }
    }
    ctx.restore()
  }

  // --- Network: peers on the terrain -----------------------------------------
  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i]
    let y = terrainHeight(n.x, n.z) + 0.012
    let boost = 0
    if (wave) {
      const band = waveBand(n.dist, wave.r)
      if (band > 0) {
        y += band * wave.k * 0.03
        boost += band * wave.k
      }
    }
    if (storyR !== null && storyEnd > 0.01) {
      const band = waveBand(n.dist, storyR, 0.16)
      if (band > 0) {
        y += band * storyK * 0.06 * storyEnd
        boost += band * storyK * storyEnd
      }
    }
    // `p` stays in slot A while the bump re-projects into slot B — NSS below
    // reads the UN-bumped perspective factor, exactly as before.
    const p = proj(n.x, y, n.z)
    let sx = toX(p)
    let sy = toY(p)
    if (pa > 0.02) {
      const bump = cursorBoost(Math.hypot(sx - px, sy - py), bumpR) * pa
      if (bump > 0.015) {
        const p2 = projB(n.x, y + bump * 0.05, n.z)
        sx = toX(p2)
        sy = toY(p2)
        boost += bump
      }
    }
    NSX[i] = sx
    NSY[i] = sy
    NSS[i] = p.s
    NSB[i] = boost
    NLIT[i] = nodeLit(n.dist, t)
  }

  // Edges + travelling light pulses.
  ctx.save()
  ctx.lineWidth = 1
  for (let e = 0; e < EDGES.length; e++) {
    const { a: ia, b: ib } = EDGES[e]
    const lit = Math.min(NLIT[ia], NLIT[ib])
    if (lit <= 0.02) continue
    const fog = 0.9 - 0.35 * ((NODES[ia].z + NODES[ib].z) * 0.5)
    ctx.strokeStyle = EDGE_COLOR
    ctx.globalAlpha = alpha * (0.13 + 0.2 * lit) * fog
    ctx.beginPath()
    ctx.moveTo(NSX[ia], NSY[ia])
    ctx.lineTo(NSX[ib], NSY[ib])
    ctx.stroke()
    if (lit > 0.5) {
      // Constant WORLD speed regardless of edge length (rev14; retuned rev16).
      const ph = (((hash1(e * 3.7 + 0.4) + time * (0.3 / Math.max(0.3, EDGES[e].len))) % 1) + 1) % 1
      const dir = hash1(e * 11.3 + 5.5) > 0.5
      const u = dir ? ph : 1 - ph
      const lx = lerp(NSX[ia], NSX[ib], u)
      const ly = lerp(NSY[ia], NSY[ib], u)
      const blink = 0.5 + 0.5 * Math.sin(time * 0.7 + e * 1.7)
      const aP = alpha * lit * glow * (0.22 + 0.45 * blink) * fog
      if (aP > 0.02) {
        const rr = 2 + 1.4 * NSS[ia]
        ctx.fillStyle = rgba(GOLD, aP)
        ctx.fillRect(lx - rr / 2, ly - rr / 2, rr, rr)
      }
    }
  }
  // Backbone: the chip's own peers, brighter, pulsing both ways.
  for (let k = 0; k < PEERS.length; k++) {
    const j = PEERS[k]
    const lit = NLIT[j] * epi
    if (lit <= 0.02) continue
    ctx.strokeStyle = mixHex(accent, GOLD, 0.4)
    ctx.globalAlpha = alpha * 0.2 * lit
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(padX, padY)
    ctx.lineTo(NSX[j], NSY[j])
    ctx.stroke()
    const ph = pulsePhase(300 + k, time)
    const u = k % 2 === 0 ? ph : 1 - ph
    const lx = lerp(padX, NSX[j], u)
    const ly = lerp(padY, NSY[j], u)
    ctx.fillStyle = rgba(GOLD, 0.55 * lit * alpha * glow)
    ctx.fillRect(lx - 1.4, ly - 1.4, 2.8, 2.8)
  }
  ctx.restore()

  // Tiered node markers (rev12): the icon LEVEL follows the connection
  // count — hairline cross → diamond → framed diamond → pinned mini-chip —
  // and the size grows with it. Crisp strokes, no soft colored circles.
  const labelAtlas = getRainAtlas()
  for (let i = 0; i < NODES.length; i++) {
    const n = NODES[i]
    const lit = NLIT[i]
    if (lit <= 0.01) continue
    const deg = DEG[i]
    // The impact front flashes each peer awake as it passes.
    const flash = storyR !== null ? waveBand(n.dist, storyR, 0.12) : 0
    const breathe = 0.75 + 0.25 * Math.sin(time * 0.9 + n.phase)
    const boost = Math.min(1, NSB[i])
    const tier = deg <= 1 ? 0 : deg <= 3 ? 1 : deg <= 5 ? 2 : 3
    const color =
      tier === 3 ? AMBER : tier === 2 ? mixHex(PALE, AMBER, 0.3) : mixHex(PALE, WIRE_HI, hash1(i * 3.3) * 0.7)
    const r = (0.0045 + 0.0016 * Math.min(deg, 8)) * NSS[i] * scale * (1 + boost * 0.3)
    ctx.save()
    ctx.strokeStyle = rgba(color, alpha * lit * (0.5 + 0.25 * breathe + 0.25 * boost))
    ctx.lineWidth = 1
    // Circular level ladder (rev13): ring → ring+core → double ring →
    // double ring with radial ticks + hex tag.
    ctx.beginPath()
    ctx.arc(NSX[i], NSY[i], tier === 0 ? r * 0.75 : r, 0, TAU)
    ctx.stroke()
    if (tier >= 2) {
      // Level 2 — the outer orbit ring.
      ctx.beginPath()
      ctx.arc(NSX[i], NSY[i], r * 1.5, 0, TAU)
      ctx.stroke()
    }
    if (tier === 3) {
      // Level 3 — four radial ticks + a hex tag: a full node, machine-named.
      const fr = r * 1.5
      ctx.beginPath()
      for (let q = 0; q < 4; q++) {
        const qa = (q / 4) * TAU
        ctx.moveTo(NSX[i] + Math.cos(qa) * (fr + 1), NSY[i] + Math.sin(qa) * (fr + 1))
        ctx.lineTo(NSX[i] + Math.cos(qa) * (fr + 3.8), NSY[i] + Math.sin(qa) * (fr + 3.8))
      }
      ctx.stroke()
      if (labelAtlas) {
        const lg = 6.5
        const lgh = lg * (RAIN_GH / RAIN_GW)
        const c1 = Math.floor(hash1(i * 7.7 + 1.1) * 16)
        const c2 = Math.floor(hash1(i * 9.3 + 2.2) * 16)
        ctx.globalAlpha = alpha * lit * 0.4
        ctx.drawImage(labelAtlas, c1 * RAIN_GW, 0, RAIN_GW, RAIN_GH, NSX[i] + fr + 5.5, NSY[i] - lgh / 2, lg, lgh)
        ctx.drawImage(labelAtlas, c2 * RAIN_GW, 0, RAIN_GW, RAIN_GH, NSX[i] + fr + 5.5 + lg, NSY[i] - lgh / 2, lg, lgh)
        ctx.globalAlpha = 1
      }
    }
    // The core — a hard little light, sized with the tier.
    const cr = tier === 0 ? 0.7 : 1 + tier * 0.2
    ctx.fillStyle = rgba(color, alpha * lit * (0.55 + 0.35 * breathe + 0.1 * boost))
    ctx.beginPath()
    ctx.arc(NSX[i], NSY[i], cr, 0, TAU)
    ctx.fill()
    // Birth: a crisp circular ring expanding away as the front passes.
    if (flash > 0.02) {
      ctx.strokeStyle = rgba(color, alpha * flash * 0.8)
      ctx.beginPath()
      ctx.arc(NSX[i], NSY[i], r * (0.8 + (1 - flash) * 3.4), 0, TAU)
      ctx.stroke()
    }
    ctx.restore()
  }

  // --- Wave fronts rolling over the terrain -----------------------------------
  // `hot` = 1 for the genesis impact front (brighter, wider); 0 for the
  // ambient block waves that follow.
  const drawWaveRing = (r: number, k: number, hot: number) => {
    if (r <= 0.02 || k <= 0.01) return
    ctx.save()
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = rgba(GOLD, (pass === 0 ? 0.12 : 0.45) * (1 + hot * 0.5) * k * alpha * glow)
      ctx.lineWidth = (pass === 0 ? 8 : 1.8) * (1 + hot * 0.4)
      ctx.beginPath()
      let open = false
      for (let k2 = 0; k2 <= 72; k2++) {
        const th = (k2 / 72) * TAU
        const gx = PAD.x + r * Math.cos(th)
        const gz = PAD.z + r * Math.sin(th) * 0.75
        if (gz < GRID.z0 || gz > GRID.z1 || Math.abs(gx) > 1.9) {
          open = false
          continue
        }
        const p = proj(gx, terrainHeight(gx, gz) + 0.012, gz)
        if (!open) {
          ctx.moveTo(toX(p), toY(p))
          open = true
        } else {
          ctx.lineTo(toX(p), toY(p))
        }
      }
      ctx.stroke()
    }
    ctx.restore()
  }
  if (wave) drawWaveRing(wave.r, wave.k, 0)
  if (storyR !== null && storyEnd > 0.01) drawWaveRing(storyR, storyK * storyEnd, 1)

  // --- The genesis strike: a quiet bolt from the zenith, rounded where it
  // meets the ground (rev13 — far more transparent than the first cut).
  if (strike > 0.02) {
    ctx.save()
    ctx.lineCap = 'round'
    const g = ctx.createLinearGradient(padX, 0, padX, padY)
    g.addColorStop(0, rgba(GOLD, 0))
    g.addColorStop(0.7, rgba(GOLD, 0.16 * strike * alpha))
    g.addColorStop(1, rgba('#ffe9c4', 0.28 * strike * alpha))
    ctx.strokeStyle = g
    ctx.lineWidth = 4.5
    ctx.beginPath()
    ctx.moveTo(padX, -4)
    ctx.lineTo(padX, padY - 2)
    ctx.stroke()
    drawGlow(ctx, padX, padY, unit * 0.16, '#ffffff', 0.1 * strike * alpha)
    drawGlow(ctx, padX, padY, unit * 0.36, accent, 0.14 * strike * alpha)
    ctx.restore()
  }


  // --- The visitor joins the network (cursor layer) ---------------------------
  if (pa > 0.03) {
    const reach = unit * 0.24
    ctx.save()
    ctx.lineWidth = 1
    for (let i = 0; i < NODES.length; i++) {
      if (NLIT[i] < 0.5) continue
      const d = Math.hypot(NSX[i] - px, NSY[i] - py)
      if (d >= reach) continue
      // A soft orange, a touch heavier than the mesh — the visitor's links
      // must read at a glance (rev11).
      ctx.lineWidth = 1.7
      ctx.strokeStyle = rgba('#ffbe78', (1 - d / reach) * 0.6 * pa * alpha)
      ctx.beginPath()
      ctx.moveTo(NSX[i], NSY[i])
      ctx.lineTo(px, py)
      ctx.stroke()
    }
    ctx.restore()
    drawGlow(ctx, px, py, unit * 0.05, PALE, 0.22 * pa * alpha)
    ctx.strokeStyle = rgba(PALE, 0.3 * pa * alpha)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(px, py, unit * 0.011, 0, TAU)
    ctx.stroke()
  }

  // --- Grounding fade + the hand-over veil ------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    h * 0.88,
    w,
    h * 0.12,
    [
      [0, rgba(INK, 0)],
      [1, rgba(INK, 0.85)],
    ],
    alpha,
  )
  if (veil > 0.003) {
    ctx.save()
    ctx.globalAlpha = alpha * veil * 0.8
    ctx.fillStyle = INK
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }
}
