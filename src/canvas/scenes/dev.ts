/**
 * DEV — the creative-explosion world (chapter 08, "Solo developer"): the
 * Claude-Code month, when Martin shipped five real apps one after another.
 * Built to his `local/ode mne/solodev/` references (rev3): **Tron meets
 * Matrix** — a five-row sci-fi metropolis climbing away from the glass
 * (extruded towers with lit floor-bands, corner light-seams, setback and
 * needle and halo-ring crowns, sky-bridges, rooftop billboards), a deep
 * space sky (galaxy band, ringed planet, meteors, a crossing satellite),
 * and a **SINGULARITY** whose gravity visibly bends the floor grid, the
 * horizon light-line and every travelling token (`devMath.lensWarp`).
 * Electricity buzzes across the etched glass grid in flickering arcs.
 *
 * The rooftop billboards are REAL: the amber contribution heatmap and the
 * monthly-momentum bars are baked from `local/Github Stats/github-stats.json`
 * (599 commits — you + your AI builder — across 11 projects in 88 days) — the
 * city itself advertises the explosion, in the site's amber through-line.
 *
 * From the singularity the five project WINDOWS are born — bursting out in
 * sequence into a constellation that frames the title. Each window shows
 * its app's REAL hero shot (baked from the repo READMEs → `devShots.ts`,
 * decoded lazily; the per-app UI motif remains as the pre-decode fallback),
 * a prominent LINK strip (live domain or GitHub repo), and BrainQuest runs
 * a living knowledge-graph (his `brainquest.png` reference — clustered
 * hubs, wandering nodes, pulses travelling the edges). Each window casts a
 * moving fading reflection into the glass (scratch + destination-out).
 *
 * Choreography (Martin directs in global HUD %; scene t = pos − 8.5): the
 * bitcoin night dims and this world fades up whole; the EXPLOSION births
 * window i at ~t 0.08 + i·0.13 (all five in by ~0.84); then the settled
 * finale floats. INTERACTIVE: depth parallax toward the cursor; a hovered
 * window brightens its tether. Touch + reduced motion see the complete,
 * calm scene — the frame is complete frozen at time 0.
 *
 * The static city is baked into per-row layer caches; the glass mirror is
 * a self-blit of the finished upper half — pixel-exact and cheap.
 */

import type { Renderer } from '../types'
import {
  TAU,
  clamp01,
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
  DEV,
  corePulse,
  easeOutBack,
  floorPoint,
  lensWarp,
  spawnFlash,
  streamPhase,
  windowLayout,
  windowSpawn,
  type FloorGeom,
} from './devMath'
import { DEV_ANIMS } from './devAnims'
import { DEV_SHOTS } from './devShots'
import { DEV_PROJECTS } from '../../data/projects'

// --- Palette: vibecoding neon over Tron steel --------------------------------
const NIGHT_TOP = '#04030c'
const NIGHT_MID = '#0e081e'
const NIGHT_LOW = '#190e2c'
const GLASS_TOP = '#0a0716'
const CYAN = '#25e3ff'
const ICE = '#9fd8ff'
const VIOLET = '#a24dff'
const MAGENTA = '#e0459b'
const CORAL = '#ff6f8f'
const MINT = '#3dffb4'
const AMBER = '#ffb000'
const GLASS = '#0d0a1e'
const PALE = '#eaf0ff'
const STEEL_LO = '#0a1428'
const STEEL_HI = '#1c3a66'

/** The five real apps, in slot order — index i uses layout slot i. The
 *  content (name · real link · badge) is the single source of truth in
 *  `src/data/projects.ts`; here it is flattened to the scene's draw-time
 *  shape: `sub` = the app's real home (drawn as a prominent link strip),
 *  `shot` keys into DEV_SHOTS (the repo README hero), `cropX/Y` bias its
 *  cover-crop, `aspect` overrides the panel ratio (RL Lab runs wide for its
 *  two agents). The clickable anchors over these panels read the same
 *  `DEV_PROJECTS` (see `src/story/DevWindowLinks.tsx`). */
const DEV_WINDOWS = DEV_PROJECTS.map((p) => ({
  name: p.name,
  sub: p.link.display,
  tint: p.window.tint,
  kind: p.window.kind,
  shot: p.window.shot,
  cropX: p.window.cropX,
  cropY: p.window.cropY,
  badge: p.badge,
  aspect: p.window.aspect,
}))

/** Left→right neon hue across the city / floor — the logo's gradient. */
function bandHue(u01: number): string {
  const u = clamp01(u01)
  if (u < 0.34) return mixHex(CYAN, VIOLET, u / 0.34)
  if (u < 0.67) return mixHex(VIOLET, MAGENTA, (u - 0.34) / 0.33)
  return mixHex(MAGENTA, CORAL, (u - 0.67) / 0.33)
}

/** Rounded-rect path (no fill/stroke — caller decides). */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w * 0.5, h * 0.5)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

// --- GitHub reality, baked into the city (billboards) -------------------------
// Real daily commits — you + your AI builder — from `local/Github Stats/
// github-stats.json` (day 0 = 2026-03-26, a Thursday) → a GitHub-style heat
// matrix for the rooftop billboard. Regenerate with the Github Stats tool.
const COMMIT_DAYS: ReadonlyArray<readonly [number, number]> = [
  [22, 35], [23, 7], [25, 11], [26, 14], [27, 12], [28, 20], [33, 5],
  [41, 22], [42, 37], [43, 12], [65, 31], [68, 4], [69, 4], [70, 1],
  [71, 4], [74, 6], [75, 2], [76, 1], [77, 8], [78, 12], [79, 7],
  [80, 3], [81, 12], [82, 11], [83, 14], [84, 12], [85, 6], [86, 2],
  [87, 6], [88, 23], [89, 17], [90, 17], [91, 26], [92, 20], [93, 3],
  [94, 2], [95, 12], [96, 11], [97, 12], [98, 5], [99, 17], [100, 10],
  [101, 6], [102, 13], [103, 14], [104, 29], [105, 11], [106, 9], [107, 6],
  [108, 5], [109, 10],
]
const HEAT_COLS = 17
const HEAT: number[][] = []
for (let c = 0; c < HEAT_COLS; c++) HEAT.push(new Array<number>(7).fill(0))
for (const [d, n] of COMMIT_DAYS) {
  const col = Math.floor((d + 3) / 7)
  if (col < HEAT_COLS) HEAT[col][(d + 3) % 7] = Math.min(1, n / 35)
}
/** Monthly momentum — REAL monthly commit counts (you + your AI builder):
 *  Apr 104 · May 102 · Jun 246 · Jul 147 (July still in progress). Bars
 *  normalized to the peak month. */
const MOM_VALS = [104, 102, 246, 147] as const
const MOM_LABELS = ['APR', 'MAY', 'JUN', 'JUL'] as const
const MOM_TEXT = ['104', '102', '246', '147'] as const
const MOM_MAX = Math.max(...MOM_VALS)

// --- The Tron city: seven depth rows climbing away from the glass -------------
type Tower = {
  u: number // 0..1 across the screen
  bw: number // width, fraction of `unit`
  bh: number // height, fraction of `unit`
  lift: number // baseline raise above the horizon (climbing terrain)
  row: number // 0 farthest … 6 nearest
  rim: string // edge-light colour
  style: 0 | 1 | 2 | 3 // 0 slab · 1 setback tiers · 2 needle · 3 halo ring
  corner: boolean // full-height corner light-seams
  podium: boolean // a wide low annex block at the base
  lift2: boolean // a lit elevator shaft up the front face
  roofbox: boolean // rooftop plant/clutter block
  twinMast: boolean // second antenna mast
  sign: boolean // a hanging neon sign strip on the side face
  door: boolean // a lit entrance slit at the base
  antArray: boolean // a rooftop array of short masts
  crane: boolean // a construction crane on the roof (the city is BUILDING)
  ant: number // antenna mast height, fraction of `unit` (0 = none)
  beam: boolean // projects a vertical light beam (max 2, row 5)
  seed: number
}
const ROWC = [70, 60, 52, 44, 36, 26, 10] as const
const N_ROWS = ROWC.length
const TOWERS: Tower[] = []
{
  const dip = (u: number) => 0.22 + 0.78 * smoothstep(0.05, 0.22, Math.abs(u - 0.5))
  // The amphitheatre: ground rises toward the flanks, strongest in the
  // distance, flat at the near glass edge.
  const edgeK = [1, 0.92, 0.8, 0.62, 0.42, 0.16, 0] as const
  let beams = 0
  let cranes = 0
  for (let row = 0; row < N_ROWS; row++) {
    for (let i = 0; i < ROWC[row]; i++) {
      const k = row * 1000 + i
      const u =
        row === 6
          ? (i % 2 === 0 ? 0.015 + 0.29 * hash1(k * 11.3 + 3) : 0.695 + 0.29 * hash1(k * 11.3 + 3))
          : (i + 0.5) / ROWC[row] + (hash1(k * 3.31) - 0.5) * (1.2 / ROWC[row])
      const hb = hash1(k * 7.93 + 1.1)
      const hw = hash1(k * 5.31 + 2.7)
      const hs = hash1(k * 3.17 + 4.1)
      const hd = hash1(k * 6.73 + 8.3)
      const dipF = row >= 3 ? dip(u) : 0.6 + 0.4 * dip(u)
      const bh =
        [
          0.03 + 0.08 * hb * hb,
          0.04 + 0.1 * hb * hb,
          0.05 + 0.13 * hb * hb,
          0.07 + 0.17 * hb * hb,
          0.09 + 0.2 * hb * hb,
          0.1 + 0.23 * hb * hb,
          0.13 + 0.26 * hb * hb,
        ][row] * dipF
      const lift =
        [0.075 + 0.045 * hw, 0.06 + 0.035 * hw, 0.045 + 0.03 * hw, 0.03 + 0.022 * hw, 0.016 + 0.016 * hw, 0.005 + 0.01 * hw, 0.006 * hw][
          row
        ] +
        0.05 * smoothstep(0.16, 0.48, Math.abs(u - 0.5)) * edgeK[row]
      const style: 0 | 1 | 2 | 3 = hs < 0.4 ? 0 : hs < 0.65 ? 1 : hs < 0.86 ? 2 : 3
      const beam = row === 5 && beams < 2 && bh > 0.2 && Math.abs(u - 0.5) > 0.17 && hb > 0.55
      if (beam) beams++
      const crane = row === 5 && cranes < 2 && style === 0 && bh > 0.14 && hash1(k * 7.7 + 9.1) < 0.12
      if (crane) cranes++
      TOWERS.push({
        u,
        bw: [
          0.005 + 0.007 * hw,
          0.006 + 0.009 * hw,
          0.008 + 0.012 * hw,
          0.012 + 0.014 * hw,
          0.015 + 0.016 * hw,
          0.018 + 0.018 * hw,
          0.026 + 0.034 * hw,
        ][row],
        bh,
        lift,
        row,
        rim: hs < 0.55 ? ICE : hs < 0.78 ? CYAN : bandHue(u),
        style,
        corner: hash1(k * 9.7) < 0.4,
        podium: row >= 4 && hd < 0.35,
        lift2: row >= 3 && hd > 0.78,
        roofbox: row >= 3 && hash1(k * 4.3 + 6.1) < 0.45 && style === 0,
        twinMast: hash1(k * 8.9 + 2.2) < 0.3,
        sign: row >= 4 && hash1(k * 12.3 + 3.7) < 0.18,
        door: row >= 4 && hash1(k * 15.1 + 7.9) < 0.5,
        antArray: row >= 4 && style === 0 && hash1(k * 6.7 + 1.3) < 0.3,
        crane,
        ant: style === 2 || hb > 0.6 ? 0.018 + 0.03 * hw : 0,
        beam,
        seed: k * 13.7 + 97,
      })
    }
  }
  TOWERS.sort((a, b) => a.row - b.row || a.u - b.u)
}

/** Front-face window-grid geometry of a tower (cache px) — shared by the
 *  static bake and the dynamic scan so they align. Rows ≥ 3 are extruded:
 *  the front face is 78 % of the width, the rest is the side face. */
function towerGrid(t: Tower, unit: number) {
  const bw = t.bw * unit
  const bh = t.bh * unit
  const fw = t.row >= 3 ? bw * 0.78 : bw
  const sx = Math.max(2.6, fw * 0.2)
  const sy = Math.max(3.8, bh * 0.055)
  return {
    bw,
    bh,
    fw,
    cols: Math.max(1, Math.floor((fw - 2) / sx)),
    rows: Math.max(1, Math.floor((bh - 5) / sy)),
    sx,
    sy,
  }
}

// Scratch canvas for the window reflections (drawn full-strength, faded via
// destination-out, blitted flipped + squashed — a true fading mirror image).
let winScratch: HTMLCanvasElement | null = null
function getWinScratch(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null
  if (!winScratch) winScratch = document.createElement('canvas')
  return winScratch
}

// Lazy hero-shot / filmstrip decode (browser only; Node stays image-free).
const heroCache = new Map<string, HTMLImageElement>()
function getHero(key: string | undefined): HTMLImageElement | null {
  if (!key || typeof document === 'undefined') return null
  let img = heroCache.get(key)
  if (!img) {
    const s = DEV_SHOTS[key]
    if (!s) return null
    img = new Image()
    img.src = s.url
    heroCache.set(key, img)
  }
  return img.complete && img.naturalWidth > 0 ? img : null
}
const animCache = new Map<string, HTMLImageElement>()
function getAnim(key: string): HTMLImageElement | null {
  if (typeof document === 'undefined') return null
  let img = animCache.get(key)
  if (!img) {
    const s = DEV_ANIMS[key]
    if (!s) return null
    img = new Image()
    img.src = s.url
    animCache.set(key, img)
  }
  return img.complete && img.naturalWidth > 0 ? img : null
}

// The vast soft gradients are the most expensive fills — bake once per
// viewport. Layer `a` breathes with `neb`, layer `b` in counter-phase; the
// galaxy band and the ringed planet are static sky furniture in `a`.
let nebCache: { key: string; a: HTMLCanvasElement; b: HTMLCanvasElement } | null = null
function getNebulaLayers(w: number, h: number, horizonY: number, unit: number) {
  if (typeof document === 'undefined') return null
  const key = `${w.toFixed(0)}:${horizonY.toFixed(0)}`
  if (nebCache && nebCache.key === key) return nebCache
  const mk = () => {
    const c = document.createElement('canvas')
    c.width = Math.ceil(w)
    c.height = Math.ceil(horizonY)
    return c
  }
  const a = mk()
  const b = mk()
  const ga = a.getContext('2d')
  const gb = b.getContext('2d')
  if (!ga || !gb) return null
  drawGlow(ga, w * 0.2, h * 0.2, unit * 0.6, CYAN, 0.075)
  drawGlow(ga, w * 0.82, h * 0.28, unit * 0.62, MAGENTA, 0.08)
  drawGlow(ga, w * 0.38, h * 0.06, unit * 0.38, MINT, 0.035)
  drawGlow(ga, w * 0.65, h * 0.34, unit * 0.34, CORAL, 0.04)
  drawGlow(gb, w * 0.55, h * 0.08, unit * 0.5, VIOLET, 0.06)
  drawGlow(gb, w * 0.08, h * 0.36, unit * 0.4, mixHex(CYAN, MINT, 0.5), 0.045)
  // The galaxy band: an elongated glow + a dense river of micro-stars.
  ga.save()
  ga.translate(w * 0.52, horizonY * 0.42)
  ga.rotate(-0.3)
  ga.scale(3.6, 1)
  drawGlow(ga, 0, 0, unit * 0.17, VIOLET, 0.075)
  drawGlow(ga, 0, 0, unit * 0.1, ICE, 0.07)
  ga.restore()
  ga.save()
  for (let i = 0; i < 680; i++) {
    const along = (hash1(i * 3.7) - 0.5) * 1.35
    const g1 = hash1(i * 7.1 + 1) + hash1(i * 11.3 + 2) - 1 // ~gaussian
    const bx = w * 0.52 + Math.cos(-0.3) * along * w * 0.6 - Math.sin(-0.3) * g1 * h * 0.05
    const by = horizonY * 0.42 + Math.sin(-0.3) * along * w * 0.6 + Math.cos(-0.3) * g1 * h * 0.05
    if (by < 0 || by > horizonY) continue
    const hc = hash1(i * 13.9)
    ga.fillStyle = hc < 0.72 ? PALE : hc < 0.86 ? ICE : hc < 0.94 ? '#ffd9c9' : '#d9c9ff'
    ga.globalAlpha = 0.14 + 0.36 * hash1(i * 5.3)
    const r = 0.4 + hash1(i * 9.1) * 1
    ga.fillRect(bx, by, r, r)
  }
  ga.restore()
  // A dim ringed planet, high right.
  const px2 = w * 0.87
  const py2 = horizonY * 0.2
  const pr = unit * 0.03
  ga.save()
  ga.fillStyle = mixHex(NIGHT_MID, ICE, 0.14)
  ga.beginPath()
  ga.arc(px2, py2, pr, 0, TAU)
  ga.fill()
  ga.strokeStyle = rgba(ICE, 0.4)
  ga.lineWidth = 1.4
  ga.beginPath()
  // Guard the inset ring: on a not-yet-laid-out (≈1px) canvas `unit` collapses
  // to ~1, so `pr - 0.7` would go negative and `arc()` throws (IndexSizeError).
  ga.arc(px2, py2, Math.max(0, pr - 0.7), TAU * 0.52, TAU * 0.9)
  ga.stroke()
  ga.strokeStyle = rgba(ICE, 0.24)
  ga.lineWidth = 1.1
  ga.beginPath()
  ga.ellipse(px2, py2, pr * 1.9, pr * 0.5, -0.42, 0, TAU)
  ga.stroke()
  ga.restore()
  nebCache = { key, a, b }
  return nebCache
}

/** The singularity's bloom (nested glows + the horizontal flare), baked
 *  once — blitted per frame scaled by `coreGlow`. */
let coreCache: { key: string; c: HTMLCanvasElement; half: number } | null = null
function getCoreSprite(unit: number) {
  if (typeof document === 'undefined') return null
  const key = unit.toFixed(0)
  if (coreCache && coreCache.key === key) return coreCache
  const half = Math.ceil(unit * 0.62)
  const c = document.createElement('canvas')
  c.width = c.height = half * 2
  const g = c.getContext('2d')
  if (!g) return null
  drawGlow(g, half, half, unit * 0.55, MAGENTA, 0.1)
  drawGlow(g, half, half, unit * 0.32, VIOLET, 0.1)
  drawGlow(g, half, half, unit * 0.16, CYAN, 0.16)
  g.save()
  g.translate(half, half)
  g.scale(3.4, 1)
  drawGlow(g, 0, 0, unit * 0.13, ICE, 0.16)
  g.restore()
  coreCache = { key, c, half }
  return coreCache
}

// One baked layer per depth row: extruded bodies, floor bands, lit strips,
// window dots, corner seams, crowns, sky-bridges, billboards. The dynamic
// light (beacons, scans, beams, arcs, ships) rides on top per frame.
let cityCache: { key: string; layers: HTMLCanvasElement[]; pad: number; ch: number } | null = null
function getCityLayers(w: number, unit: number) {
  if (typeof document === 'undefined') return null
  const key = `${w.toFixed(0)}:${unit.toFixed(0)}`
  if (cityCache && cityCache.key === key) return cityCache
  const pad = Math.ceil(unit * 0.06)
  const ch = Math.ceil(unit * 0.58)
  const layers: HTMLCanvasElement[] = []
  for (let row = 0; row < N_ROWS; row++) {
    const c = document.createElement('canvas')
    c.width = Math.ceil(w) + pad * 2
    c.height = ch
    const g = c.getContext('2d')
    if (!g) return null
    const rowTowers = TOWERS.filter((t) => t.row === row)
    for (const t of rowTowers) {
      const { bw, bh, fw, cols, rows, sx, sy } = towerGrid(t, unit)
      const bx = pad + t.u * w
      const x0 = bx - bw / 2
      const baseY = ch - 1 - t.lift * unit
      const topY = baseY - bh
      const far = row <= 2
      const body = mixHex(STEEL_LO, STEEL_HI, 0.18 + 0.5 * hash1(t.seed * 3.1))
      g.globalAlpha = far ? 0.8 : 0.96
      if (far) {
        // Distant rows: hazy flat silhouettes with a lit top rim.
        g.fillStyle = mixHex(body, NIGHT_LOW, row === 0 ? 0.68 : row === 1 ? 0.55 : 0.42)
        g.fillRect(x0, topY, bw, bh)
      } else {
        // A wide low podium annex hugging the base (drawn behind).
        if (t.podium) {
          g.fillStyle = mixHex(body, '#01030a', 0.4)
          g.fillRect(bx - bw * 0.95, baseY - bh * 0.12, bw * 1.9, bh * 0.12)
          g.strokeStyle = t.rim
          g.globalAlpha = 0.3
          g.beginPath()
          g.moveTo(bx - bw * 0.95, baseY - bh * 0.12)
          g.lineTo(bx + bw * 0.95, baseY - bh * 0.12)
          g.stroke()
          g.globalAlpha = 0.96
        }
        // Extruded volume: gradient front face + darker side face + top lip.
        const fg = g.createLinearGradient(0, topY, 0, baseY)
        fg.addColorStop(0, mixHex(body, '#3a5f96', 0.22))
        fg.addColorStop(1, mixHex(body, '#01030a', 0.55))
        g.fillStyle = fg
        g.fillRect(x0, topY, fw, bh)
        g.fillStyle = mixHex(body, '#000208', 0.5)
        g.fillRect(x0 + fw, topY + 1.5, bw - fw, bh - 1.5)
        g.fillStyle = mixHex(body, '#5a7fb6', 0.3)
        g.fillRect(x0 + fw, topY, bw - fw, 1.5)
        // Floor separation bands across the front face.
        g.fillStyle = rgba('#020409', 0.5)
        for (let fy = topY + sy; fy < baseY - 2; fy += sy) g.fillRect(x0, fy, fw, 1)
        // A lit elevator shaft riding the front face.
        if (t.lift2) {
          g.globalAlpha = 0.3
          g.fillStyle = t.rim
          g.fillRect(x0 + fw * 0.22, topY + bh * 0.12, 1, bh * 0.78)
          g.globalAlpha = 0.96
        }
        // Rooftop clutter: a plant block + tiny stack.
        if (t.roofbox) {
          g.fillStyle = mixHex(body, '#01030a', 0.3)
          g.fillRect(bx - fw * 0.22, topY - Math.max(3, bh * 0.05), fw * 0.3, Math.max(3, bh * 0.05))
          g.fillRect(bx + fw * 0.05, topY - Math.max(2, bh * 0.03), fw * 0.12, Math.max(2, bh * 0.03))
        }
        // A hanging neon sign strip down the side face (Kowloon-style).
        if (t.sign) {
          const sgx = x0 + fw + (bw - fw) * 0.35
          const sTop = topY + bh * 0.16
          const segs = Math.max(3, Math.floor(bh * 0.36 / 5))
          g.fillStyle = bandHue(t.u)
          for (let s5 = 0; s5 < segs; s5++) {
            g.globalAlpha = 0.4 + 0.25 * hash1(t.seed + s5 * 3.7)
            g.fillRect(sgx, sTop + s5 * 5, 2, 3)
          }
        }
        // A lit entrance slit at the base.
        if (t.door) {
          g.globalAlpha = 0.55
          g.fillStyle = mixHex(ICE, t.rim, 0.4)
          g.fillRect(bx - fw * 0.12, baseY - Math.max(2.5, bh * 0.02), fw * 0.24, Math.max(2, bh * 0.015))
          drawGlow(g, bx, baseY - 1, fw * 0.3, t.rim, 0.12)
        }
        // A rooftop array of short masts.
        if (t.antArray && !t.crane) {
          g.globalAlpha = 0.4
          g.strokeStyle = t.rim
          g.lineWidth = 1
          g.beginPath()
          for (const [ox, mh] of [[-0.26, 0.014], [0.02, 0.024], [0.27, 0.017]] as const) {
            g.moveTo(bx + ox * fw, topY)
            g.lineTo(bx + ox * fw, topY - mh * unit)
          }
          g.stroke()
        }
        // A construction crane — the city is still being built (the month
        // the apps exploded into being).
        if (t.crane) {
          const mastH = unit * 0.045 + bh * 0.1
          const jib = unit * 0.045
          const mTop = topY - mastH
          g.strokeStyle = mixHex(STEEL_HI, ICE, 0.35)
          g.globalAlpha = 0.75
          g.lineWidth = 1.2
          g.beginPath()
          g.moveTo(bx, topY)
          g.lineTo(bx, mTop)
          g.moveTo(bx - jib * 0.3, mTop)
          g.lineTo(bx + jib, mTop)
          g.stroke()
          g.lineWidth = 0.8
          g.beginPath()
          g.moveTo(bx, mTop - unit * 0.008)
          g.lineTo(bx + jib, mTop)
          g.moveTo(bx, mTop - unit * 0.008)
          g.lineTo(bx - jib * 0.3, mTop)
          // The hanging cable + hook.
          g.moveTo(bx + jib * 0.68, mTop)
          g.lineTo(bx + jib * 0.68, mTop + unit * 0.018)
          g.stroke()
          g.fillStyle = mixHex(STEEL_HI, '#000', 0.2)
          g.fillRect(bx - jib * 0.3 - 2, mTop - 2, 4, 4)
          g.fillRect(bx + jib * 0.68 - 1.5, mTop + unit * 0.018, 3, 3)
        }
      }
      // Lit floors: a few full bright strips, the rest sparse window dots.
      if (!far && rows > 0 && cols > 0) {
        for (let rI = 0; rI < rows; rI++) {
          const fy = topY + 4 + rI * sy
          const hf = hash1(t.seed + rI * 7.9)
          if (hf < 0.13) {
            g.globalAlpha = 0.18 + 0.14 * hash1(t.seed + rI * 3.3)
            g.fillStyle = mixHex(ICE, t.rim, 0.35)
            g.fillRect(x0 + 1, fy, fw - 2, 1.6)
          } else if (hf < 0.8) {
            g.fillStyle = mixHex(ICE, t.rim, 0.25)
            for (let cI = 0; cI < cols; cI++) {
              if (hash1(t.seed + cI * 17.3 + rI * 7.9) > 0.3) continue
              g.globalAlpha = 0.45 * (0.4 + 0.6 * hash1(t.seed + cI + rI * 3.1))
              g.fillRect(x0 + 2 + cI * sx, fy, 1.4, 1.4)
            }
          }
        }
      } else if (row === 2 && rows > 0) {
        g.fillStyle = ICE
        for (let rI = 0; rI < rows; rI += 2) {
          if (hash1(t.seed + rI * 5.1) > 0.4) continue
          g.globalAlpha = 0.3
          g.fillRect(x0 + bw * 0.3, topY + 4 + rI * sy, 1.2, 1.2)
        }
      }
      // Edge light: top rim + short side drops; corner seams on some.
      g.globalAlpha = far ? 0.35 : 0.6
      g.strokeStyle = t.rim
      g.lineWidth = 1
      g.beginPath()
      g.moveTo(x0, topY + bh * 0.2)
      g.lineTo(x0, topY)
      g.lineTo(x0 + fw, topY)
      g.lineTo(x0 + fw, topY + bh * 0.2)
      g.stroke()
      if (!far && t.corner) {
        g.globalAlpha = 0.4
        g.beginPath()
        g.moveTo(x0 + 0.5, topY)
        g.lineTo(x0 + 0.5, baseY)
        g.moveTo(x0 + fw - 0.5, topY)
        g.lineTo(x0 + fw - 0.5, baseY)
        g.stroke()
      }
      // Crown.
      g.globalAlpha = far ? 0.7 : 0.95
      if (t.style === 1) {
        const t1w = fw * 0.66
        const t2w = fw * 0.4
        g.fillStyle = mixHex(body, '#3a5f96', 0.18)
        g.fillRect(bx - t1w / 2, topY - bh * 0.13, t1w, bh * 0.13)
        g.fillRect(bx - t2w / 2, topY - bh * 0.21, t2w, bh * 0.08)
        g.strokeStyle = t.rim
        g.globalAlpha = far ? 0.3 : 0.55
        g.strokeRect(bx - t1w / 2, topY - bh * 0.13, t1w, 0.001)
        g.strokeRect(bx - t2w / 2, topY - bh * 0.21, t2w, 0.001)
      } else if (t.style === 2) {
        g.fillStyle = mixHex(body, '#3a5f96', 0.15)
        g.beginPath()
        g.moveTo(x0 + fw * 0.2, topY)
        g.lineTo(bx, topY - bh * 0.32)
        g.lineTo(x0 + fw * 0.8, topY)
        g.closePath()
        g.fill()
      } else if (t.style === 3 && !far) {
        // A floating halo ring above the roof — pure sci-fi jewellery.
        g.strokeStyle = t.rim
        g.globalAlpha = 0.55
        g.lineWidth = 1.2
        g.beginPath()
        g.ellipse(bx, topY - Math.max(6, bw * 0.42), fw * 0.72, fw * 0.2, 0, 0, TAU)
        g.stroke()
      }
      if (t.ant > 0) {
        const antBase = t.style === 2 ? topY - bh * 0.32 : topY - (t.style === 1 ? bh * 0.21 : 0)
        g.globalAlpha = 0.5
        g.strokeStyle = t.rim
        g.beginPath()
        g.moveTo(bx, antBase)
        g.lineTo(bx, antBase - t.ant * unit)
        if (t.twinMast && !far) {
          g.moveTo(bx - fw * 0.24, topY)
          g.lineTo(bx - fw * 0.24, topY - t.ant * unit * 0.6)
        }
        g.stroke()
      }
    }
    // Sky-bridges between close neighbours (near rows only).
    if (row >= 5) {
      let built = 0
      for (let i2 = 1; i2 < rowTowers.length && built < 4; i2++) {
        const a = rowTowers[i2 - 1]
        const b = rowTowers[i2]
        if ((b.u - a.u) > 0.055 || a.bh < 0.1 || b.bh < 0.1) continue
        const ax = pad + a.u * w + (a.bw * unit) / 2
        const bx2 = pad + b.u * w - (b.bw * unit) / 2
        if (bx2 - ax < unit * 0.008) continue
        const ay = ch - 1 - (a.lift + a.bh) * unit
        const by2 = ch - 1 - (b.lift + b.bh) * unit
        const yb = Math.max(ay, by2) + Math.min(a.bh, b.bh) * unit * 0.3
        g.globalAlpha = 0.85
        g.fillStyle = mixHex(STEEL_LO, '#000', 0.3)
        g.fillRect(ax, yb, bx2 - ax, 2.4)
        g.globalAlpha = 0.55
        g.fillStyle = mixHex(a.rim, b.rim, 0.5)
        g.fillRect(ax, yb - 0.8, bx2 - ax, 1)
        built++
      }
    }
    layers.push(c)
  }
  cityCache = { key, layers, pad, ch }
  return cityCache
}

/** Light-ships crossing the sky: lane height above the horizon (fraction
 *  of h), speed, direction, colour. */
const SHIPS = [
  { lane: 0.16, sp: 0.045, dir: 1, col: ICE },
  { lane: 0.24, sp: 0.03, dir: -1, col: ICE },
  { lane: 0.33, sp: 0.055, dir: 1, col: CORAL },
] as const

// --- The BrainQuest knowledge-graph (his brainquest.png: clustered hubs,
// radial fans, cross-links) — laid out once, animated in the window body.
type BqNode = { x: number; y: number; hub: number; r: number; ph: number }
const BQ_HUBS = [
  { x: 0.3, y: 0.34 },
  { x: 0.73, y: 0.28 },
  { x: 0.5, y: 0.74 },
] as const
const BQ_NODES: BqNode[] = []
const BQ_CROSS: Array<readonly [number, number]> = []
{
  for (let i = 0; i < 30; i++) {
    const hh = hash1(i * 7.31 + 0.4)
    const hub = hh < 0.4 ? 0 : hh < 0.74 ? 1 : 2
    const ang = hash1(i * 3.17 + 1.3) * TAU
    const dist = 0.09 + 0.21 * Math.sqrt(hash1(i * 5.77 + 2.9))
    BQ_NODES.push({
      x: Math.min(0.96, Math.max(0.04, BQ_HUBS[hub].x + Math.cos(ang) * dist * 1.15)),
      y: Math.min(0.94, Math.max(0.05, BQ_HUBS[hub].y + Math.sin(ang) * dist)),
      hub,
      r: 0.4 + 0.6 * hash1(i * 9.13 + 3.7),
      ph: hash1(i * 11.7 + 5.1) * TAU,
    })
  }
  for (let k = 0; k < 6; k++) {
    const a = Math.floor(hash1(k * 13.1 + 0.7) * BQ_NODES.length)
    let best = -1
    let bd = 1e9
    for (let j = 0; j < BQ_NODES.length; j++) {
      if (j === a || BQ_NODES[j].hub === BQ_NODES[a].hub) continue
      const d = Math.hypot(BQ_NODES[j].x - BQ_NODES[a].x, BQ_NODES[j].y - BQ_NODES[a].y)
      if (d < bd) {
        bd = d
        best = j
      }
    }
    if (best >= 0) BQ_CROSS.push([a, best])
  }
}
const BQ_COLORS = [MINT, ICE, CORAL] as const

/** The living knowledge-graph inside the BrainQuest window: wobbling
 *  clustered nodes, spoke + cross edges, a learning pulse travelling one
 *  edge at a time, an XP bar. Complete when frozen at time 0. */
function drawBqGraph(
  ctx: CanvasRenderingContext2D,
  ix: number,
  iy: number,
  iw: number,
  ih: number,
  tint: string,
  a: number,
  time: number,
): void {
  const gh = ih * 0.88
  const nx = (n: BqNode, i: number) =>
    ix + (n.x + Math.sin(time * (0.7 + 0.5 * n.r) + n.ph) * 0.03) * iw + i * 0
  const ny = (n: BqNode) =>
    iy + (n.y + Math.cos(time * (0.85 + 0.4 * n.r) + n.ph * 1.7) * 0.026) * gh
  const hx = (k: number) => ix + (BQ_HUBS[k].x + Math.sin(time * 0.5 + k * 2.1) * 0.012) * iw
  const hy = (k: number) => iy + (BQ_HUBS[k].y + Math.cos(time * 0.6 + k * 1.3) * 0.012) * gh
  ctx.lineWidth = 1
  // Spokes + hub↔hub + cross-links.
  for (let i = 0; i < BQ_NODES.length; i++) {
    const n = BQ_NODES[i]
    ctx.strokeStyle = rgba(PALE, a * 0.13)
    ctx.beginPath()
    ctx.moveTo(hx(n.hub), hy(n.hub))
    ctx.lineTo(nx(n, i), ny(n))
    ctx.stroke()
  }
  ctx.strokeStyle = rgba(PALE, a * 0.1)
  for (const [a2, b2] of BQ_CROSS) {
    ctx.beginPath()
    ctx.moveTo(nx(BQ_NODES[a2], a2), ny(BQ_NODES[a2]))
    ctx.lineTo(nx(BQ_NODES[b2], b2), ny(BQ_NODES[b2]))
    ctx.stroke()
  }
  for (let k = 0; k < 3; k++) {
    ctx.strokeStyle = rgba(BQ_COLORS[k], a * 0.18)
    ctx.beginPath()
    ctx.moveTo(hx(k), hy(k))
    ctx.lineTo(hx((k + 1) % 3), hy((k + 1) % 3))
    ctx.stroke()
  }
  // Learning pulses: three spokes at a time light up, sparks racing
  // leaf → hub on staggered clocks.
  for (let pk = 0; pk < 3; pk++) {
    const cyc = 1.1 + 0.3 * pk
    const slot = Math.floor(time / cyc + pk * 0.41)
    const pi = Math.floor(hash1(slot * 7.7 + pk * 13.1 + 0.3) * BQ_NODES.length)
    const pn = BQ_NODES[pi]
    const pph = ((time / cyc + pk * 0.41) % 1 + 1) % 1
    ctx.strokeStyle = rgba(BQ_COLORS[pn.hub], a * 0.5 * Math.sin(Math.PI * pph))
    ctx.beginPath()
    ctx.moveTo(nx(pn, pi), ny(pn))
    ctx.lineTo(hx(pn.hub), hy(pn.hub))
    ctx.stroke()
    ctx.fillStyle = rgba(PALE, a * 0.9)
    ctx.fillRect(
      lerp(nx(pn, pi), hx(pn.hub), pph) - 1.2,
      lerp(ny(pn), hy(pn.hub), pph) - 1.2,
      2.4,
      2.4,
    )
  }
  // A node levels up every few seconds — a burst ring blooms off it.
  {
    const slot = Math.floor(time / 2.7)
    const li = Math.floor(hash1(slot * 9.3 + 1.7) * BQ_NODES.length)
    const ln = BQ_NODES[li]
    const lph = ((time / 2.7) % 1 + 1) % 1
    if (lph < 0.4) {
      const rr = (0.2 + (lph / 0.4) * 1.4) * ih * 0.08
      ctx.strokeStyle = rgba(BQ_COLORS[ln.hub], a * (1 - lph / 0.4) * 0.8)
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.arc(nx(ln, li), ny(ln), rr, 0, TAU)
      ctx.stroke()
      ctx.lineWidth = 1
    }
  }
  // Leaves, then hubs on top.
  for (let i = 0; i < BQ_NODES.length; i++) {
    const n = BQ_NODES[i]
    const rr = Math.max(1, (0.9 + n.r) * ih * 0.016)
    const tw = 0.6 + 0.4 * Math.sin(time * (0.7 + n.r) + n.ph)
    ctx.fillStyle = rgba(BQ_COLORS[n.hub], a * (0.35 + 0.4 * tw))
    ctx.beginPath()
    ctx.arc(nx(n, i), ny(n), rr, 0, TAU)
    ctx.fill()
  }
  for (let k = 0; k < 3; k++) {
    const rr = Math.max(2.4, ih * 0.05)
    const beat2 = 0.75 + 0.25 * Math.sin(time * 1.1 + k * 2.1)
    ctx.fillStyle = rgba(BQ_COLORS[k], a * 0.9 * beat2)
    ctx.beginPath()
    ctx.arc(hx(k), hy(k), rr, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = rgba(BQ_COLORS[k], a * 0.3)
    ctx.beginPath()
    ctx.arc(hx(k), hy(k), rr * 1.8, 0, TAU)
    ctx.stroke()
  }
  // XP bar.
  const xy = iy + ih * 0.94
  ctx.fillStyle = rgba(PALE, a * 0.1)
  roundRect(ctx, ix, xy, iw, ih * 0.05, ih * 0.02)
  ctx.fill()
  ctx.fillStyle = rgba(tint, a * 0.6)
  roundRect(ctx, ix, xy, iw * 0.62, ih * 0.05, ih * 0.02)
  ctx.fill()
}

// --- The window chrome + bodies ------------------------------------------------

/** The window body: the app's REAL hero shot (README capture) once decoded
 *  — portrait pages crop from the top — with a glass grade over it; the
 *  per-app UI motif as the pre-decode fallback; BrainQuest = the graph. */
function drawWindowBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  meta: (typeof DEV_WINDOWS)[number],
  a: number,
  time: number,
): void {
  const tint = meta.tint
  if (meta.kind === 'graph') {
    const pad = w * 0.06
    drawBqGraph(ctx, x + pad, y + pad * 0.7, w - pad * 2, h - pad * 1.5, tint, a, time)
    return
  }
  if (meta.kind === 'anim') {
    // Two trained agents playing side by side (filmstrips on the ambient
    // clock; frame 0 under reduced motion). Falls through to the hero shot
    // until the strips are decoded.
    const car = getAnim('lunarlander')
    const brk = getAnim('breakout')
    if (car && brk) {
      const gapW = Math.max(2, w * 0.015)
      const cell = (img2: HTMLImageElement, key: string, dx: number, dw: number, offset: number) => {
        const s = DEV_ANIMS[key]
        const f = (Math.floor(time * 3.5) + offset) % s.frames
        // Cover-fit the frame into its half-panel.
        const scale = Math.max(dw / s.fw, h / s.fh)
        const sw = dw / scale
        const sh = h / scale
        const sx = f * s.fw + (s.fw - sw) / 2
        const sy = (s.fh - sh) / 2
        ctx.save()
        ctx.globalAlpha = a * 0.95
        ctx.drawImage(img2, sx, sy, sw, sh, dx, y, dw, h)
        ctx.restore()
      }
      const half = (w - gapW) / 2
      cell(car, 'lunarlander', x, half, 0)
      cell(brk, 'breakout', x + half + gapW, half, 4)
      // The seam + a soft tint grade so the two feeds read as one console.
      ctx.fillStyle = rgba(tint, a * 0.35)
      ctx.fillRect(x + half, y, gapW, h)
      const gg = ctx.createLinearGradient(0, y, 0, y + h)
      gg.addColorStop(0, rgba(GLASS, 0.05))
      gg.addColorStop(1, rgba(GLASS, 0.3))
      ctx.fillStyle = gg
      ctx.globalAlpha = a
      ctx.fillRect(x, y, w, h)
      ctx.globalAlpha = 1
      return
    }
  }
  const img = getHero(meta.shot)
  if (img) {
    // Cover-fit; tall page captures pin near their top (the hero header) —
    // `cropY` slides the window down (Těnovice shows its house whole) and
    // `cropX` biases the horizontal crop (ClearFeed keeps its left edge).
    const iw2 = img.naturalWidth
    const ih2 = img.naturalHeight
    const scale = Math.max(w / iw2, h / ih2)
    const sw = w / scale
    const sh = h / scale
    const sx = (iw2 - sw) * (meta.cropX ?? 0.5)
    const sy = ih2 / iw2 > h / w ? (ih2 - sh) * (meta.cropY ?? 0) : (ih2 - sh) / 2
    ctx.save()
    ctx.globalAlpha = a * 0.94
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
    // Glass grade: darker base, a whisper of the app's neon.
    const gg = ctx.createLinearGradient(0, y, 0, y + h)
    gg.addColorStop(0, rgba(GLASS, 0.06))
    gg.addColorStop(1, rgba(GLASS, 0.42))
    ctx.globalAlpha = a
    ctx.fillStyle = gg
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = rgba(tint, 0.045)
    ctx.fillRect(x, y, w, h)
    ctx.restore()
    return
  }
  // ---- Pre-decode fallback motifs ------------------------------------------
  const pad = w * 0.075
  const ix = x + pad
  const iy = y + pad * 0.9
  const iw = w - pad * 2
  const ih = h - pad * 1.8
  const bar = (bx: number, by: number, bw: number, bh: number, col: string, al: number) => {
    ctx.fillStyle = rgba(col, a * al)
    roundRect(ctx, bx, by, Math.max(1, bw), Math.max(1, bh), Math.min(bh, bw) * 0.4)
    ctx.fill()
  }
  if (meta.kind === 'blocklist') {
    const rows = 4
    const rh = ih / rows
    for (let i = 0; i < rows; i++) {
      const by = iy + i * rh + rh * 0.14
      const off = i === 1 || i === 3
      bar(ix, by, rh * 0.46, rh * 0.46, off ? PALE : tint, off ? 0.1 : 0.45)
      bar(ix + rh * 0.64, by, iw * (off ? 0.34 : 0.46), rh * 0.17, PALE, off ? 0.1 : 0.32)
      const tw = iw * 0.15
      const th = rh * 0.3
      const tx = ix + iw - tw
      bar(tx, by + rh * 0.05, tw, th, off ? PALE : tint, off ? 0.12 : 0.55)
      ctx.fillStyle = rgba(PALE, a * (off ? 0.4 : 0.95))
      ctx.beginPath()
      ctx.arc(off ? tx + th * 0.5 : tx + tw - th * 0.5, by + rh * 0.05 + th * 0.5, th * 0.38, 0, TAU)
      ctx.fill()
    }
  } else if (meta.kind === 'fund') {
    bar(ix, iy, iw * 0.32, ih * 0.09, PALE, 0.26)
    bar(ix + iw * 0.68, iy, iw * 0.32, ih * 0.09, tint, 0.55)
    const ty0 = iy + ih * 0.19
    const th = ih * 0.18
    bar(ix, ty0, iw, th, PALE, 0.1)
    bar(ix, ty0, iw * 0.68, th, tint, 0.72)
    for (let i = 0; i < 3; i++) {
      const dy = iy + ih * 0.52 + i * ih * 0.17
      bar(ix, dy, ih * 0.09, ih * 0.09, bandHue(0.3 + i * 0.25), 0.5)
      bar(ix + ih * 0.15, dy, iw * (0.4 - i * 0.06), ih * 0.08, PALE, 0.2)
      bar(ix + iw * 0.78, dy, iw * 0.22, ih * 0.08, tint, 0.4)
    }
  } else if (meta.kind === 'form') {
    bar(ix, iy, iw * 0.4, ih * 0.1, PALE, 0.3)
    const sw2 = iw * 0.26
    bar(ix + iw - sw2, iy, sw2, ih * 0.12, PALE, 0.1)
    bar(ix + iw - sw2, iy, sw2 * 0.5, ih * 0.12, tint, 0.6)
    for (let i = 0; i < 2; i++) {
      const fy = iy + ih * 0.24 + i * ih * 0.28
      bar(ix, fy, iw * 0.3, ih * 0.07, PALE, 0.24)
      ctx.strokeStyle = rgba(tint, a * 0.45)
      ctx.lineWidth = 1
      roundRect(ctx, ix, fy + ih * 0.1, iw, ih * 0.15, ih * 0.05)
      ctx.stroke()
    }
    bar(ix + iw * 0.58, iy + ih * 0.84, iw * 0.42, ih * 0.15, tint, 0.85)
  } else {
    const bl = iy + ih * 0.82
    ctx.strokeStyle = rgba(PALE, a * 0.18)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(ix, iy)
    ctx.lineTo(ix, bl)
    ctx.lineTo(ix + iw, bl)
    ctx.stroke()
    const pts = [0.12, 0.3, 0.26, 0.48, 0.6, 0.68, 0.8]
    ctx.strokeStyle = rgba(tint, a * 0.9)
    ctx.lineWidth = 1.4
    ctx.beginPath()
    pts.forEach((p, i) => {
      const cx2 = ix + (iw * i) / (pts.length - 1)
      const cy2 = bl - (bl - iy) * p
      if (i === 0) ctx.moveTo(cx2, cy2)
      else ctx.lineTo(cx2, cy2)
    })
    ctx.stroke()
  }
}

/** One full project window: glass panel, neon rim, title bar, a prominent
 *  LINK strip (the app's real home), the body (hero shot / graph / motif),
 *  a slow glass sheen. Called twice per window — upright + mirrored. */
function drawProjectWindow(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  Wpx: number,
  Hpx: number,
  meta: (typeof DEV_WINDOWS)[number],
  a: number,
  time: number,
  i: number,
  unit: number,
): void {
  const barH = Hpx * 0.15
  const addrH = Hpx * 0.13
  ctx.save()
  ctx.globalAlpha = a
  ctx.fillStyle = rgba(GLASS, 0.9)
  roundRect(ctx, x0, y0, Wpx, Hpx, Wpx * 0.045)
  ctx.fill()
  const sheenG = ctx.createLinearGradient(0, y0, 0, y0 + Hpx * 0.4)
  sheenG.addColorStop(0, rgba(PALE, 0.06))
  sheenG.addColorStop(1, rgba(PALE, 0))
  ctx.fillStyle = sheenG
  roundRect(ctx, x0, y0, Wpx, Hpx * 0.4, Wpx * 0.045)
  ctx.fill()
  ctx.globalAlpha = a * 0.95
  ctx.strokeStyle = rgba(meta.tint, 0.95)
  ctx.lineWidth = 1.4
  // Bloom the neon rim (canvas shadow) so the window GLOWS at its edges like
  // the DOM tooltip does — no dark edge where the panel meets the scene, just
  // the app's own colour glowing outward (Martin).
  ctx.shadowColor = rgba(meta.tint, 0.9)
  ctx.shadowBlur = unit * 0.03
  roundRect(ctx, x0, y0, Wpx, Hpx, Wpx * 0.045)
  ctx.stroke()
  ctx.globalAlpha = a * 0.45
  ctx.lineWidth = 4
  ctx.shadowBlur = unit * 0.02
  ctx.stroke()
  ctx.shadowBlur = 0
  // Title bar.
  ctx.globalAlpha = a
  ctx.fillStyle = rgba(meta.tint, 0.13)
  roundRect(ctx, x0, y0, Wpx, barH, Wpx * 0.045)
  ctx.fill()
  ctx.strokeStyle = rgba(meta.tint, 0.3)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x0 + 1, y0 + barH)
  ctx.lineTo(x0 + Wpx - 1, y0 + barH)
  ctx.stroke()
  const dotR = Math.max(1.3, barH * 0.17)
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = rgba([CORAL, '#ffd15c', MINT][k], a)
    ctx.beginPath()
    ctx.arc(x0 + barH * 0.55 + k * dotR * 3, y0 + barH * 0.5, dotR, 0, TAU)
    ctx.fill()
  }
  ctx.textBaseline = 'middle'
  // Collaboration disclaimer chip (Těnovice: a friends' project he built
  // WITH them — the solo-dev framing stays honest).
  if (meta.badge) {
    const bf = Math.max(6, Math.round(barH * 0.38))
    ctx.font = `700 ${bf}px "Chakra Petch", ui-monospace, monospace`
    const bw2 = ctx.measureText(meta.badge).width + bf * 1.1
    const bx0 = x0 + barH * 0.55 + 3 * dotR * 3 + barH * 0.25
    ctx.fillStyle = rgba(meta.tint, 0.22 * a)
    roundRect(ctx, bx0, y0 + barH * 0.22, bw2, barH * 0.56, barH * 0.28)
    ctx.fill()
    ctx.strokeStyle = rgba(meta.tint, 0.55 * a)
    ctx.lineWidth = 1
    roundRect(ctx, bx0, y0 + barH * 0.22, bw2, barH * 0.56, barH * 0.28)
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.fillStyle = rgba(PALE, a * 0.9)
    ctx.fillText(meta.badge, bx0 + bw2 / 2, y0 + barH * 0.53)
  }
  ctx.font = `600 ${Math.max(7, Math.round(barH * 0.52))}px "Chakra Petch", ui-monospace, monospace`
  ctx.textAlign = 'right'
  ctx.fillStyle = rgba(PALE, a * 0.95)
  ctx.fillText(meta.name, x0 + Wpx - barH * 0.5, y0 + barH * 0.54)
  // The LINK strip — the app's real home, unmissable: tinted pill, the URL
  // in the app's own neon, an outward arrow. (Real anchors land in C1.)
  const hasAddr = Wpx > unit * 0.1
  if (hasAddr) {
    const ay = y0 + barH + addrH * 0.14
    const ph = addrH * 0.74
    ctx.fillStyle = rgba(meta.tint, 0.09 * a)
    roundRect(ctx, x0 + Wpx * 0.035, ay, Wpx * 0.93, ph, ph * 0.4)
    ctx.fill()
    ctx.strokeStyle = rgba(meta.tint, 0.4 * a)
    ctx.lineWidth = 1
    roundRect(ctx, x0 + Wpx * 0.035, ay, Wpx * 0.93, ph, ph * 0.4)
    ctx.stroke()
    // Shrink-to-fit: the BrainQuest strip names two repos.
    let fs = Math.max(7, Math.round(addrH * 0.52))
    ctx.font = `600 ${fs}px "Chakra Petch", ui-monospace, monospace`
    while (fs > 6 && ctx.measureText(meta.sub).width > Wpx * 0.82 - addrH) {
      fs--
      ctx.font = `600 ${fs}px "Chakra Petch", ui-monospace, monospace`
    }
    ctx.textAlign = 'left'
    ctx.fillStyle = rgba(mixHex(meta.tint, PALE, 0.35), a * 0.95)
    const tx0 = x0 + Wpx * 0.075
    ctx.fillText(meta.sub, tx0, ay + ph * 0.54)
    const tw2 = ctx.measureText(meta.sub).width
    ctx.strokeStyle = rgba(meta.tint, 0.5 * a)
    ctx.beginPath()
    ctx.moveTo(tx0, ay + ph * 0.82)
    ctx.lineTo(tx0 + tw2, ay + ph * 0.82)
    ctx.stroke()
    ctx.textAlign = 'right'
    ctx.fillStyle = rgba(meta.tint, a * 0.95)
    ctx.fillText('↗', x0 + Wpx * 0.935, ay + ph * 0.56)
  }
  // Body, clipped to the PANEL's own rounded outline (intersected with the
  // body band) — content can never bleed past the bottom corner curves.
  const bodyY = y0 + barH + (hasAddr ? addrH : 0)
  ctx.save()
  roundRect(ctx, x0 + 1, y0 + 1, Wpx - 2, Hpx - 2, Wpx * 0.045)
  ctx.clip()
  ctx.beginPath()
  ctx.rect(x0, bodyY, Wpx, y0 + Hpx - bodyY)
  ctx.clip()
  drawWindowBody(ctx, x0 + 1, bodyY, Wpx - 2, y0 + Hpx - bodyY - 1, meta, a, time)
  const shu = ((time * 0.05 + i * 0.23) % 1.5) - 0.25
  const sx0 = x0 + shu * Wpx
  ctx.fillStyle = rgba(PALE, 0.05 * a)
  ctx.beginPath()
  ctx.moveTo(sx0, y0)
  ctx.lineTo(sx0 + Wpx * 0.13, y0)
  ctx.lineTo(sx0 - Wpx * 0.02, y0 + Hpx)
  ctx.lineTo(sx0 - Wpx * 0.15, y0 + Hpx)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
  ctx.restore()
}

export const renderDev: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h } = cfg
  const unit = Math.min(w, h)
  const horizonY = h * DEV.horizon

  const pa = cfg.pointer?.a ?? 0
  const px = cfg.pointer?.x ?? w * 0.5
  const py = cfg.pointer?.y ?? h * 0.5
  const pnx = Math.max(-1, Math.min(1, (px - w * 0.5) / (w * 0.5)))
  const pny = Math.max(-1, Math.min(1, (py - h * 0.5) / (h * 0.5)))
  const par = (d: number) => ({ x: -pnx * unit * 0.028 * d * pa, y: -pny * unit * 0.02 * d * pa })

  const pulse = corePulse(time)
  const cx = w * 0.5
  const coreShift = par(0.2)
  const coreX = cx + coreShift.x
  const coreY = horizonY - h * 0.05 + coreShift.y

  let flare = 0
  for (let i = 0; i < DEV.windows; i++) flare = Math.max(flare, spawnFlash(i, t))
  const coreGlow = 0.55 + 0.45 * pulse + flare * 0.7

  const lensR = unit * 0.26
  const lensK = 0.34 + 0.07 * pulse + 0.1 * flare
  const lens = (x: number, y: number) => lensWarp(x, y, coreX, coreY, lensR, lensK, 0.42)

  // --- The upper world (sky life + city) ---------------------------------------
  const city = getCityLayers(w, unit)
  const drawUpper = (aMul: number) => {
    const neb = 0.85 + 0.15 * Math.sin(time * 0.5)
    const nebL = getNebulaLayers(w, h, horizonY, unit)
    if (nebL) {
      ctx.save()
      ctx.globalAlpha = clamp01(alpha * aMul * neb)
      ctx.drawImage(nebL.a, 0, 0)
      ctx.globalAlpha = clamp01(alpha * aMul * (1.7 - neb))
      ctx.drawImage(nebL.b, 0, 0)
      ctx.restore()
    }
    // Living colour: three vast soft glows slowly wandering the sky.
    const dx1 = w * (0.34 + 0.08 * Math.sin(time * 0.043))
    const dy1 = h * (0.2 + 0.05 * Math.cos(time * 0.031))
    drawGlow(ctx, dx1, dy1, unit * 0.42, CYAN, alpha * aMul * 0.05)
    const dx2 = w * (0.68 - 0.09 * Math.sin(time * 0.037 + 2))
    const dy2 = h * (0.14 + 0.06 * Math.sin(time * 0.049 + 1))
    drawGlow(ctx, dx2, dy2, unit * 0.44, MAGENTA, alpha * aMul * 0.05)
    const dx3 = w * (0.12 + 0.06 * Math.sin(time * 0.029 + 4))
    const dy3 = h * (0.09 + 0.05 * Math.sin(time * 0.041 + 3))
    drawGlow(ctx, dx3, dy3, unit * 0.36, VIOLET, alpha * aMul * 0.055)
    const sky = par(0.05)
    ctx.save()
    ctx.translate(sky.x, sky.y)
    drawStars(ctx, {
      w, h: horizonY * 0.95, count: 150, seed: 61, alpha: alpha * aMul * 0.55, size: 1.1,
      time, twinkle: 0.5, xShift: time * 0.0006,
    })
    drawStars(ctx, {
      w, h: horizonY * 0.9, count: 55, seed: 23, alpha: alpha * aMul * 0.75, size: 1.7,
      time, twinkle: 0.7,
    })
    // Hero stars: a handful of bright coloured sparks with cross-flares.
    for (let k = 0; k < 7; k++) {
      const hx2 = hash1(k * 17.3 + 2.9) * w
      const hy2 = hash1(k * 23.1 + 5.3) * horizonY * 0.75
      const tw2 = 0.45 + 0.55 * Math.sin(time * (0.8 + hash1(k * 3.1)) + k * 2.3)
      const col = k % 3 === 0 ? PALE : k % 3 === 1 ? mixHex(ICE, CYAN, 0.5) : mixHex(PALE, bandHue(hash1(k * 7.7)), 0.45)
      const fl = (2.8 + 3.4 * hash1(k * 9.7)) * (0.6 + 0.4 * tw2)
      ctx.strokeStyle = rgba(col, alpha * aMul * 0.55 * tw2)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(hx2 - fl, hy2)
      ctx.lineTo(hx2 + fl, hy2)
      ctx.moveTo(hx2, hy2 - fl)
      ctx.lineTo(hx2, hy2 + fl)
      ctx.stroke()
      ctx.fillStyle = rgba(col, alpha * aMul * (0.5 + 0.5 * tw2))
      ctx.fillRect(hx2 - 1, hy2 - 1, 2, 2)
      drawGlow(ctx, hx2, hy2, fl * 2.2, col, alpha * aMul * 0.12 * tw2)
    }
    ctx.restore()
    // Meteors: brief bright streaks, one every couple of seconds.
    for (let k = 0; k < 3; k++) {
      const slot = time / 5.5 + k * 0.37
      const ph = ((slot % 1) + 1) % 1
      if (ph < 0.09) {
        const mb = Math.floor(slot)
        const env = Math.sin((Math.PI * ph) / 0.09)
        const mx = hash1(mb * 7.3 + k * 3.1) * w * 0.85
        const my = hash1(mb * 11.7 + k * 5.7) * horizonY * 0.55
        const prog = ph / 0.09
        const hx2 = mx + prog * w * 0.09
        const hy2 = my + prog * w * 0.035
        const mg = ctx.createLinearGradient(hx2 - w * 0.05, hy2 - w * 0.019, hx2, hy2)
        mg.addColorStop(0, rgba(PALE, 0))
        mg.addColorStop(1, rgba(PALE, 0.7 * env * alpha * aMul))
        ctx.strokeStyle = mg
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(hx2 - w * 0.05, hy2 - w * 0.019)
        ctx.lineTo(hx2, hy2)
        ctx.stroke()
        ctx.fillStyle = rgba(PALE, 0.85 * env * alpha * aMul)
        ctx.fillRect(hx2 - 1.2, hy2 - 1.2, 2.4, 2.4)
      }
    }
    // A satellite crawling across the high sky, blinking.
    {
      const ph = ((time / 47) % 1 + 1) % 1
      const sx2 = ph * 1.1 * w - 0.05 * w
      const sy2 = h * 0.07 + Math.sin(ph * 5) * h * 0.03
      const blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(time * 2.6))
      ctx.fillStyle = rgba(ICE, alpha * aMul * 0.5 * blink)
      ctx.fillRect(sx2 - 0.8, sy2 - 0.8, 1.6, 1.6)
    }
    // Digital rain — sparse Matrix code-fall behind the city.
    ctx.save()
    for (let c = 0; c < 10; c++) {
      const hx = hash1(c * 9.31 + 0.7)
      const hs = hash1(c * 5.77 + 2.1)
      const colX = hx * w
      const fall = unit * (0.03 + 0.05 * hs)
      const span = horizonY + 80
      const headY = ((hash1(c * 3.1) * 977 + time * fall) % span) - 40
      const col = hs > 0.7 ? MINT : ICE
      for (let g2 = 0; g2 < 7; g2++) {
        const gy = headY - g2 * 7
        if (gy < -2 || gy > horizonY - 4) continue
        ctx.fillStyle = rgba(col, alpha * aMul * (g2 === 0 ? 0.3 : 0.14 * (1 - g2 / 7)))
        ctx.fillRect(colX, gy, 1.6, 1.6)
      }
    }
    ctx.restore()
    // The city: seven cached rows, far → near, with rising fog between.
    if (city) {
      const rowA = [0.32, 0.42, 0.52, 0.64, 0.76, 0.9, 1]
      const rowPar = [0.03, 0.05, 0.07, 0.1, 0.13, 0.17, 0.22]
      const fogY = [0.095, 0.075, 0.058, 0.042, 0.026, 0.01]
      for (let row = 0; row < N_ROWS; row++) {
        const sh = par(rowPar[row])
        ctx.save()
        ctx.globalAlpha = alpha * aMul * rowA[row]
        ctx.drawImage(city.layers[row], -city.pad + sh.x, horizonY + 1 - city.ch + sh.y * 0.35)
        ctx.restore()
        if (row < N_ROWS - 1) {
          fillVerticalGradient(
            ctx,
            0,
            horizonY - fogY[row] * unit - unit * 0.02,
            w,
            unit * 0.04,
            [
              [0, rgba(NIGHT_LOW, 0)],
              [0.6, rgba(mixHex(NIGHT_LOW, VIOLET, 0.22), 0.1)],
              [1, rgba(NIGHT_LOW, 0)],
            ],
            alpha * aMul,
          )
        }
      }
      // Dynamic city light: beacons, scans, beams, billboards, data links.
      ctx.save()
      for (const t2 of TOWERS) {
        if (t2.row <= 2) continue
        const sh = par(rowPar[t2.row])
        const { bw, bh, fw, cols, rows, sx, sy } = towerGrid(t2, unit)
        const bx = t2.u * w + sh.x
        const baseY = horizonY + 1 + sh.y * 0.35 - t2.lift * unit
        const topY = baseY - bh
        if (t2.ant > 0) {
          const antBase = t2.style === 2 ? topY - bh * 0.32 : topY - (t2.style === 1 ? bh * 0.21 : 0)
          const blink = 0.15 + 0.85 * Math.pow(Math.max(0, Math.sin(time * 1.6 + t2.seed)), 8)
          ctx.fillStyle = rgba(CORAL, alpha * aMul * 0.85 * blink)
          ctx.fillRect(bx - 1.1, antBase - t2.ant * unit - 1.1, 2.2, 2.2)
        }
        // The elevator car riding its lit shaft — a real lift's velocity
        // curve: it accelerates away from a floor, brakes into the next
        // (smoothstep ends = zero velocity), dwells a beat, and every ride
        // picks a NEW random floor (the leg ends where the next begins, so
        // the motion is continuous). Each tower runs its own pace.
        if (t2.lift2) {
          const P = 7 + 5 * hash1(t2.seed * 2.3)
          const tf = time / P + hash1(t2.seed * 3.7) * 9
          const leg = Math.floor(tf)
          const lp = tf - leg
          const stopAt = (m: number) => hash1(t2.seed * 7.1 + m * 13.7)
          const s5 = smoothstep(0.14, 0.86, lp)
          const pos = lerp(stopAt(leg), stopAt(leg + 1), s5)
          const shaftTop = topY + bh * 0.12
          const shaftLen = bh * 0.78
          const carH = Math.max(2.5, bh * 0.028)
          const carY = shaftTop + pos * (shaftLen - carH)
          ctx.fillStyle = rgba(mixHex(t2.rim, PALE, 0.4), alpha * aMul * 0.85)
          ctx.fillRect(bx - bw / 2 + fw * 0.22 - 0.9, carY, 2.8, carH)
        }
        // The crane's tip beacon.
        if (t2.crane) {
          const mastH = unit * 0.045 + bh * 0.1
          const jib = unit * 0.045
          const blink = 0.2 + 0.8 * Math.pow(Math.max(0, Math.sin(time * 1.3 + t2.seed * 3)), 6)
          ctx.fillStyle = rgba(CORAL, alpha * aMul * 0.8 * blink)
          ctx.fillRect(bx + jib - 1, topY - mastH - 1, 2, 2)
        }
        // Window life: on a few towers, a random window flickers awake.
        if (t2.row >= 4 && hash1(t2.seed * 5.9) < 0.28 && cols > 1 && rows > 1) {
          const slot2 = Math.floor(time * 0.6 + hash1(t2.seed) * 9)
          const fI = Math.floor(hash1(t2.seed + slot2 * 3.3) * cols)
          const rIdx = Math.floor(hash1(t2.seed * 1.3 + slot2 * 2.1) * rows)
          const fla = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * 2.4 + t2.seed * 7))
          ctx.fillStyle = rgba(mixHex(ICE, t2.rim, 0.5), alpha * aMul * 0.6 * fla)
          ctx.fillRect(bx - bw / 2 + 2 + fI * sx, topY + 4 + rIdx * sy, 1.6, 1.6)
        }
        if (hash1(t2.seed * 1.7) < 0.2 && cols > 1) {
          const cI = Math.floor(((((time * 0.6 + hash1(t2.seed)) % 1) + 1) % 1) * cols)
          ctx.fillStyle = rgba(mixHex(ICE, t2.rim, 0.4), alpha * aMul * 0.5)
          for (let rI = 0; rI < rows; rI++) {
            ctx.fillRect(bx - bw / 2 + 2 + cI * sx, topY + 4 + rI * sy, 1.4, 1.4)
          }
        }
        if (t2.beam) {
          const len = h * 0.24 * (0.9 + 0.1 * Math.sin(time * 0.7 + t2.seed))
          const bg = ctx.createLinearGradient(0, topY, 0, topY - len)
          bg.addColorStop(0, rgba(ICE, alpha * aMul * 0.14))
          bg.addColorStop(1, rgba(ICE, 0))
          ctx.fillStyle = bg
          ctx.fillRect(bx - fw * 0.22, topY - len, fw * 0.44, len)
        }
      }
      for (let dl = 0; dl < 3; dl++) {
        const ha = hash1(dl * 7.7 + 3.3)
        const y2 = horizonY - unit * (0.06 + 0.08 * ha)
        const xa = w * (0.08 + 0.5 * ha)
        const xb = xa + w * (0.14 + 0.18 * hash1(dl * 5.1))
        ctx.strokeStyle = rgba(CORAL, alpha * aMul * 0.14)
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(xa, y2)
        ctx.lineTo(xb, y2)
        ctx.stroke()
        const ph = streamPhase(40 + dl, time, 0.4)
        ctx.fillStyle = rgba(CORAL, alpha * aMul * 0.6)
        ctx.fillRect(lerp(xa, xb, ph) - 1, y2 - 1, 2, 2)
      }
      ctx.restore()
    }
    // Light-ships with fading trails.
    ctx.save()
    for (let s = 0; s < SHIPS.length; s++) {
      const sp2 = SHIPS[s]
      const sy2 = horizonY - h * sp2.lane
      const ph = (((hash1(s * 3.7) + time * sp2.sp) % 1.3) + 1.3) % 1.3
      const sx2 = (sp2.dir > 0 ? ph - 0.15 : 1.15 - ph) * w
      ctx.fillStyle = rgba(sp2.col, alpha * aMul * 0.8)
      ctx.fillRect(sx2 - 1.5, sy2 - 1, 3, 2)
      for (let tr = 1; tr <= 6; tr++) {
        ctx.fillStyle = rgba(sp2.col, alpha * aMul * 0.5 * (1 - tr / 7))
        ctx.fillRect(sx2 - sp2.dir * tr * 5 - 1, sy2 - 0.7, 2, 1.4)
      }
      drawGlow(ctx, sx2, sy2, unit * 0.014, sp2.col, alpha * aMul * 0.3)
    }
    ctx.restore()
  }

  /** The singularity's light body: the baked bloom sprite, photon rings,
   *  expanding light echoes, the nucleus. */
  const drawCoreLite = (aMul: number) => {
    const spr = getCoreSprite(unit)
    if (spr) {
      ctx.save()
      ctx.globalAlpha = clamp01(alpha * aMul * coreGlow)
      ctx.drawImage(spr.c, coreX - spr.half, coreY - spr.half)
      ctx.restore()
    }
    ctx.save()
    ctx.translate(coreX, coreY)
    ctx.scale(1, 0.88)
    for (let ring = 0; ring < 2; ring++) {
      const rr = unit * (ring === 0 ? 0.055 : 0.078)
      const dir = ring === 0 ? 1 : -1
      ctx.strokeStyle = rgba(
        ring === 0 ? PALE : mixHex(MAGENTA, PALE, 0.35),
        alpha * aMul * (0.22 + 0.3 * pulse + 0.3 * flare),
      )
      ctx.lineWidth = ring === 0 ? 1.5 : 1.1
      for (let arc = 0; arc < 3; arc++) {
        const a0 = time * 0.4 * dir + (arc / 3) * TAU
        ctx.beginPath()
        ctx.arc(0, 0, rr, a0, a0 + 1.65)
        ctx.stroke()
      }
    }
    ctx.restore()
    for (let k = 0; k < 2; k++) {
      const rp = (((time * 0.3 + k / 2) % 1) + 1) % 1
      const rr = unit * (0.06 + rp * 0.2)
      ctx.strokeStyle = rgba(ICE, alpha * aMul * (1 - rp) * 0.22 * coreGlow)
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.arc(coreX, coreY, rr, 0, TAU)
      ctx.stroke()
    }
    drawGlow(ctx, coreX, coreY, unit * 0.05 * (1 + 0.35 * flare), '#ffffff', alpha * aMul * (0.35 + 0.55 * coreGlow))
  }

  // --- 1 · Sky above the glass ---------------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    horizonY,
    [
      [0, NIGHT_TOP],
      [0.55, NIGHT_MID],
      [1, NIGHT_LOW],
    ],
    alpha,
  )

  // --- 2 · The upright world + the singularity's light ----------------------------
  drawUpper(1)
  // God-rays — before the reflection snapshot so the glass mirrors them.
  ctx.save()
  for (let k = 0; k < 5; k++) {
    const ang = -Math.PI / 2 + (k - 2) * 0.42 + Math.sin(time * 0.13 + k * 2.1) * 0.05
    const len = h * 0.42 * (0.8 + 0.25 * hash1(k * 7.1))
    const half = unit * (0.006 + 0.012 * hash1(k * 3.3 + 1))
    const ex = coreX + Math.cos(ang) * len
    const ey = coreY + Math.sin(ang) * len
    const pxp = -Math.sin(ang) * half
    const pyp = Math.cos(ang) * half
    ctx.fillStyle = rgba(ICE, alpha * 0.02 * (0.7 + 0.6 * pulse))
    ctx.beginPath()
    ctx.moveTo(coreX, coreY)
    ctx.lineTo(ex + pxp * 7, ey + pyp * 7)
    ctx.lineTo(ex - pxp * 7, ey - pyp * 7)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  drawCoreLite(1)

  // --- 3 · The glass: the slab, then a TRUE mirror of everything above -----------
  fillVerticalGradient(
    ctx,
    0,
    horizonY,
    w,
    h - horizonY,
    [
      [0, mixHex(GLASS_TOP, NIGHT_LOW, 0.4)],
      [0.4, GLASS_TOP],
      [1, '#040309'],
    ],
    alpha,
  )
  const reflH = h * 0.42
  const cnv = ctx.canvas
  const srcH = Math.min(cnv.height, Math.round((horizonY / h) * cnv.height))
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, horizonY, w, reflH)
  ctx.clip()
  ctx.globalAlpha = 0.5 * alpha
  ctx.translate(0, horizonY * 2)
  ctx.scale(1, -1)
  ctx.drawImage(cnv, 0, 0, cnv.width, srcH, 0, 0, w, horizonY)
  ctx.restore()
  fillVerticalGradient(
    ctx,
    0,
    horizonY,
    w,
    reflH,
    [
      [0, rgba(GLASS_TOP, 0)],
      [0.5, rgba(GLASS_TOP, 0.5)],
      [1, rgba(GLASS_TOP, 0.96)],
    ],
    alpha,
  )

  // --- 4 · The glass surface: etched grid, bent by the singularity ---------------
  const floorShift = par(0.28)
  const geom: FloorGeom = {
    horizonY: horizonY + floorShift.y * 0.4,
    h,
    cx: cx + floorShift.x,
    spread: w * 0.95,
  }
  ctx.save()
  ctx.lineWidth = 1
  for (let j = 1; j <= 10; j++) {
    const d = j / 10
    const rowY = floorPoint(0, d, geom).y
    ctx.strokeStyle = rgba(ICE, alpha * (0.04 + 0.13 * d))
    ctx.beginPath()
    for (let s2 = 0; s2 <= 40; s2++) {
      const p = lens((s2 / 40) * w, rowY)
      if (s2 === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
  const cols = 15
  for (let c = 0; c <= cols; c++) {
    const u = (c / cols) * 2 - 1
    const accentCol = c % 4 === 0
    ctx.strokeStyle = accentCol ? rgba(bandHue((u + 1) / 2), alpha * 0.11) : rgba(ICE, alpha * 0.065)
    ctx.beginPath()
    let open = false
    for (let s2 = 0; s2 <= 26; s2++) {
      const d = 0.03 + (s2 / 26) * 0.97
      const fp = floorPoint(u, d, geom)
      const p = lens(fp.x, fp.y)
      if (!open) {
        ctx.moveTo(p.x, p.y)
        open = true
      } else {
        ctx.lineTo(p.x, p.y)
      }
    }
    ctx.stroke()
  }
  ctx.fillStyle = rgba(PALE, alpha * 0.16)
  for (let c = 0; c <= cols; c++) {
    const u = (c / cols) * 2 - 1
    for (const d of [0.3, 0.5, 0.7, 0.88]) {
      const fp = floorPoint(u, d, geom)
      const p = lens(fp.x, fp.y)
      const r = 1 + d
      ctx.globalAlpha = alpha * (0.08 + 0.14 * d)
      ctx.fillRect(p.x - r / 2, p.y - r / 2, r, r)
    }
  }
  ctx.globalAlpha = 1
  // Light tokens streaming inward, riding the same curved space.
  for (let s2 = 0; s2 < 26; s2++) {
    const u = (hash1(s2 * 9.7) * 2 - 1) * 0.92
    const ph = streamPhase(s2, time, 0.5)
    const d = 1 - ph
    const fp = floorPoint(u, d, geom)
    const p = lens(fp.x, fp.y)
    const aTok = alpha * (0.15 + 0.4 * (1 - d)) * d
    if (aTok <= 0.02) continue
    const hue = bandHue((u + 1) / 2)
    const r = 1 + 1.7 * d
    ctx.fillStyle = rgba(hue, aTok)
    ctx.fillRect(p.x - r / 2, p.y - r / 2, r, r)
    for (let tr = 1; tr <= 2; tr++) {
      const fp2 = floorPoint(u, Math.min(1, d + tr * 0.035), geom)
      const p2 = lens(fp2.x, fp2.y)
      ctx.fillStyle = rgba(hue, aTok * (0.5 - tr * 0.18))
      ctx.fillRect(p2.x - r / 2, p2.y - r / 2, r * 0.8, r * 0.8)
    }
  }
  // Electricity on the grid: light RUNNERS — a bright particle races the
  // FULL length of a row or column and the line lights up under it, then
  // decays with an afterglow (a sharp attack just ahead of the head, an
  // exponential persistence tail behind it). Each runner crosses in ~70 %
  // of its cycle; the rest is pure decay before the next run.
  for (let k = 0; k < 7; k++) {
    const alongRowK = hash1(k * 1.9 + 0.4) < 0.55
    // Full-width rows cross in ~1.75 s, full-depth columns in ~1.25 s.
    const cyc = (alongRowK ? 2.5 : 1.8) + 0.42 * hash1(k * 5.5 + 0.8)
    const tSlot = time / cyc + hash1(k * 3.3 + 1.9) * 7
    const slot = Math.floor(tSlot)
    const ph = tSlot - slot
    const sHead = ph / 0.7
    let pAt: (s: number) => { x: number; y: number }
    if (alongRowK) {
      const j = 2 + Math.floor(hash1(slot * 7.1 + k * 3.3) * 8)
      const rowY = floorPoint(0, j / 10, geom).y
      const dirL = hash1(slot * 9.7 + k) < 0.5
      pAt = (s) => lens((dirL ? s : 1 - s) * w, rowY)
    } else {
      const u = (Math.floor(hash1(slot * 7.9 + k * 2.2) * (cols + 1)) / cols) * 2 - 1
      const down = hash1(slot * 6.1 + k * 4.4) < 0.6
      pAt = (s) => {
        const d = 0.03 + (down ? s : 1 - s) * 0.97
        const fp = floorPoint(u, d, geom)
        return lens(fp.x, fp.y)
      }
    }
    const SEG = 44
    const tail = 0.12 + 0.07 * hash1(k * 7.7 + 3.3)
    ctx.lineWidth = 1.3
    let prev = pAt(0)
    for (let s3 = 1; s3 <= SEG; s3++) {
      const s = s3 / SEG
      const p = pAt(s)
      const behind = sHead - s
      // The illumination envelope: attack just ahead, persistence behind.
      const lit = behind >= 0 ? Math.exp(-behind / tail) : Math.exp(behind / 0.025)
      const aSeg = alpha * 0.6 * lit
      if (aSeg > 0.02) {
        ctx.strokeStyle = rgba(mixHex('#3f9dff', '#d6ecff', lit * 0.6), aSeg)
        ctx.beginPath()
        ctx.moveTo(prev.x, prev.y)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }
      prev = p
    }
    // The particle itself, while it is still on the path.
    if (sHead <= 1) {
      const hp = pAt(sHead)
      drawGlow(ctx, hp.x, hp.y, unit * 0.014, '#3f9dff', alpha * 0.45)
      ctx.fillStyle = rgba('#e8f4ff', alpha * 0.95)
      ctx.fillRect(hp.x - 1.3, hp.y - 1.3, 2.6, 2.6)
    }
  }
  // The horizon light-line — bent around the core.
  for (let pass = 0; pass < 2; pass++) {
    ctx.strokeStyle = pass === 0 ? rgba(ICE, alpha * 0.07) : rgba('#dff4ff', alpha * 0.5)
    ctx.lineWidth = pass === 0 ? 7 : 1.4
    ctx.beginPath()
    for (let s2 = 0; s2 <= 56; s2++) {
      const p = lens((s2 / 56) * w, horizonY)
      if (s2 === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
  }
  ctx.save()
  ctx.translate(coreX, horizonY)
  ctx.scale(5, 1)
  drawGlow(ctx, 0, 0, unit * 0.07, PALE, alpha * 0.2 * coreGlow)
  ctx.restore()
  ctx.restore()

  // --- 5 · The singularity over the glass -----------------------------------------
  drawGlow(ctx, coreX, coreY, unit * 0.05 * (1 + 0.35 * flare), '#ffffff', alpha * (0.2 + 0.3 * coreGlow))
  ctx.save()
  const ringR = unit * 0.058
  const spin = time * 0.45
  ctx.lineWidth = 1.5
  for (let k = 0; k < 16; k++) {
    const ang = spin + (k / 16) * TAU
    const cardinal = k % 4 === 0
    ctx.strokeStyle = rgba(cardinal ? CYAN : MAGENTA, alpha * (cardinal ? 0.5 : 0.26) * coreGlow)
    ctx.beginPath()
    ctx.arc(coreX, coreY, ringR, ang, ang + (cardinal ? 0.26 : 0.14))
    ctx.stroke()
  }
  const oa = time * 1.1
  ctx.fillStyle = rgba(PALE, alpha * 0.6 * coreGlow)
  ctx.fillRect(coreX + Math.cos(oa) * ringR - 1.3, coreY + Math.sin(oa) * ringR * 0.85 - 1.3, 2.6, 2.6)
  ctx.restore()

  // --- 6 · The project windows: born from the core, one after another ------------
  const slots = windowLayout(w / h)
  for (let i = 0; i < DEV.windows; i++) {
    const sp = windowSpawn(i, t)
    if (sp <= 0.001) continue
    const meta = DEV_WINDOWS[i]
    const slot = slots[i]
    const wp = par(slot.depth)
    const sx = slot.x * w + wp.x
    const sy = slot.y * h + wp.y

    // LINEAR travel — the staircase choreography IS the easing: each card's
    // position reads as a clean fraction of its path at every scroll step.
    const travel = sp
    const winA = alpha * smoothstep(0, 0.25, sp)
    const scl = lerp(0.32, 1, Math.min(1.06, easeOutBack(sp)))
    const settled = smoothstep(0.95, 1, sp)
    const bob = Math.sin(time * (0.5 + i * 0.13) + i * 1.7) * unit * 0.006 * settled
    const gx = lerp(coreX, sx, travel)
    const gy = lerp(coreY, sy, travel) + bob

    const Wpx = slot.w * unit * scl
    const Hpx = Wpx * (meta.aspect ?? 0.66)
    const x0 = gx - Wpx / 2
    const y0 = gy - Hpx / 2
    const flash = spawnFlash(i, t)

    const near = pa > 0.02 ? Math.hypot(px - gx, py - gy) < Wpx * 0.85 : false
    const tetherA = winA * (0.1 + 0.5 * flash + (near ? 0.35 * pa : 0))
    if (tetherA > 0.02) {
      const midX = (coreX + gx) / 2
      const midY = Math.min(coreY, gy) - unit * 0.06
      ctx.strokeStyle = rgba(meta.tint, tetherA * 0.5)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(coreX, coreY)
      ctx.quadraticCurveTo(midX, midY, gx, gy)
      ctx.stroke()
      for (let k = 0; k < 3; k++) {
        const ph = streamPhase(i * 4 + k, time, 0.6)
        const q = 1 - ph
        const bx2 = (1 - q) * (1 - q) * coreX + 2 * (1 - q) * q * midX + q * q * gx
        const by2 = (1 - q) * (1 - q) * coreY + 2 * (1 - q) * q * midY + q * q * gy
        ctx.fillStyle = rgba(PALE, tetherA)
        ctx.fillRect(bx2 - 1.2, by2 - 1.2, 2.4, 2.4)
      }
    }

    // Touchdown: an INVISIBLE gravitational wave rolls out from the landing
    // point — no drawn colour, pure spacetime: the already-painted
    // background inside the expanding annulus is re-blitted radially
    // outward (the old screensaver pixel-ripple), so the city, glass and
    // grid visibly BEND away from the card and relax. Rev9: FULL strength,
    // fired strictly AFTER touchdown — all five land at once, so the waves
    // ride the unclamped scene clock (`tRaw`) just past the landing instant,
    // in a quick left-to-right salvo.
    // The whole salvo lives inside the "95 %" HUD readout: last wave dies
    // at progress ≈ 0.955, exactly when the HUD flips to 96 and the card
    // copy reaches full strength — one beat per readout.
    const twv = cfg.tRaw ?? t
    const landA = clamp01((twv - 1 - i * 0.006) / 0.03)
    if (landA > 0.01 && landA < 1) {
      const cnv3 = ctx.canvas
      // Gentle and local: a soft breath around the card, not a far blast —
      // the whole salvo is over by ~95.8 %.
      const R = landA * Wpx * 1.2
      const bandW = Wpx * (0.3 - 0.1 * landA)
      const amp = 0.06 * (1 - landA)
      const SUB = 5
      for (let j = 0; j < SUB; j++) {
        const r0 = Math.max(0.5, R - bandW + (bandW * 2 * j) / SUB)
        const r1 = Math.max(r0 + 1, R - bandW + (bandW * 2 * (j + 1)) / SUB)
        // The wave profile: strongest displacement mid-band.
        const s6 = 1 + amp * Math.sin(((j + 0.5) / SUB) * Math.PI)
        ctx.save()
        ctx.beginPath()
        ctx.ellipse(gx, gy, r1, r1 * 0.85, 0, 0, TAU)
        ctx.ellipse(gx, gy, r0, r0 * 0.85, 0, 0, TAU)
        ctx.clip('evenodd')
        ctx.translate(gx, gy)
        ctx.scale(s6, s6)
        ctx.translate(-gx, -gy)
        ctx.drawImage(cnv3, 0, 0, cnv3.width, cnv3.height, 0, 0, w, h)
        ctx.restore()
      }
    }
    // In flight the card CARTWHEELS home: one half-turn around its vertical
    // axis PER SCROLL STEP (rotateY via cos foreshortening, SIGN KEPT — at
    // every whole step the card faces you exactly mirrored or upright), and
    // it lands face-forward at touchdown. Pure function of scroll.
    const tumble = 1 - travel
    let sxs = 1
    ctx.save()
    if (tumble > 0.002) {
      const theta = tumble * (DEV.windows - i) * Math.PI
      const c8 = Math.cos(theta)
      sxs = (c8 < 0 ? -1 : 1) * Math.max(0.08, Math.abs(c8))
      const sys = 1 - 0.12 * Math.abs(Math.sin(theta))
      const rz = (hash1(i * 17.9) - 0.5) * 0.4 * tumble
      ctx.translate(gx, gy)
      ctx.rotate(rz)
      ctx.scale(sxs, sys)
      ctx.translate(-gx, -gy)
    }
    drawGlow(ctx, gx, gy, Wpx * 0.85, meta.tint, winA * (0.12 + 0.25 * flash + (near ? 0.15 * pa : 0)))
    drawProjectWindow(ctx, x0, y0, Wpx, Hpx, meta, winA, time, i, unit)
    ctx.restore()
    // Its fading mirror image in the glass — only once it would actually
    // land on the glass (the low windows); moves with the window.
    // The glass answers any card flying LOW enough that its mirror lands on
    // the floor (rev9: reflections belong on the ground — a card high in
    // the sky casts nothing visible, so it draws nothing). The mirror
    // follows the whole flight, inheriting the cartwheel via `sxs`.
    const gap = unit * 0.012
    const scr = getWinScratch()
    if (scr && sp > 0.04 && y0 + Hpx + gap > horizonY + h * 0.01) {
      const swp = Math.ceil(Wpx + 24)
      const shp = Math.ceil(Hpx + 24)
      if (scr.width < swp) scr.width = swp
      if (scr.height < shp) scr.height = shp
      const sg = scr.getContext('2d')
      if (sg) {
        sg.clearRect(0, 0, scr.width, scr.height)
        drawProjectWindow(sg, 12, 12, Wpx, Hpx, meta, 1, time, i, unit)
        sg.save()
        sg.globalCompositeOperation = 'destination-out'
        const fg = sg.createLinearGradient(0, 12, 0, 12 + Hpx)
        fg.addColorStop(0, 'rgba(0,0,0,1)')
        fg.addColorStop(0.55, 'rgba(0,0,0,0.85)')
        fg.addColorStop(1, 'rgba(0,0,0,0.2)')
        sg.fillStyle = fg
        sg.fillRect(0, 0, scr.width, scr.height)
        sg.restore()
        ctx.save()
        ctx.globalAlpha = winA * 0.62
        ctx.translate(gx, 0)
        ctx.scale(sxs, 1)
        ctx.translate(-gx, 0)
        ctx.translate(0, (y0 + Hpx) * 1.55 + gap)
        ctx.scale(1, -0.55)
        ctx.drawImage(scr, 0, 0, swp, shp, x0 - 12, y0 - 12, swp, shp)
        ctx.restore()
      }
    }
    if (flash > 0.02) {
      drawGlow(ctx, gx, gy, Wpx * 0.7, PALE, winA * flash * 0.4)
    }
  }

  // --- 7 · Foreground: neon bokeh drifting up -------------------------------------
  ctx.save()
  for (let i = 0; i < 16; i++) {
    const hx = hash1(i * 13.7)
    const hy = hash1(i * 7.1 + 2.3)
    const hz = hash1(i * 3.9 + 5.1)
    const rise = ((hy - time * 0.012 * (0.5 + hz)) % 1 + 1) % 1
    const bx = hx * w + Math.sin(time * 0.3 + i) * w * 0.02
    const by = rise * h
    const r = unit * (0.004 + 0.01 * hz)
    const a = alpha * (0.1 + 0.25 * hz) * (0.4 + 0.6 * Math.sin(time * 0.6 + i * 2.1)) * (1 - rise * 0.5)
    if (a <= 0.02) continue
    drawGlow(ctx, bx, by, r * 2.5, bandHue(hx), a * 0.5)
    ctx.fillStyle = rgba(PALE, a * 0.6)
    ctx.fillRect(bx - 0.7, by - 0.7, 1.4, 1.4)
  }
  ctx.restore()

  // --- 8 · Grounding vignette at the base ------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    h * 0.86,
    w,
    h * 0.14,
    [
      [0, rgba('#070412', 0)],
      [1, rgba('#070412', 0.7)],
    ],
    alpha,
  )

  // --- 9 · The GitHub dashboard -----------------------------------------------------
  // ONE consolidated amber panel, bottom-centre in the foreground: a
  // stat-chip row above two graphs — the daily contribution heatmap with
  // month ticks, and the monthly momentum with values at the bar tips
  // (July runs at PACE: solid = the 88 real commits, ghost = the ~380
  // projection). Numbers are the static `github-stats.json` snapshot.
  // Drawn live (never cached) so the type stays DPR-crisp; labels muted,
  // data amber — the data is the star. It SNAPS ON the instant all five
  // windows have touched down — the receipts arrive with the last landing.
  if (windowSpawn(DEV.windows - 1, t) >= 1) {
    const sh = par(0.24)
    let pw = unit * 0.525
    let ph = unit * 0.231
    const bx = w * 0.5 + sh.x
    // Hug the base of the frame; on short viewports scale down so the
    // panel never climbs into the card text. On phones lift the whole panel
    // above the bottom HUD / footer (the time-axis readout) so the receipts
    // sit clear of the "NOW · %" chip (Martin's mobile call).
    const bottomGap = h * 0.008 + (w < 720 ? h * 0.085 : 0)
    let py = h - ph - bottomGap + sh.y * 0.5
    // Stay below the (compact) card copy on every viewport — the name tag
    // above the border counts too; on short screens it is dropped.
    const capH = 26
    const minTop = h * 0.46 + 265
    if (py - capH < minTop) {
      const k9 = Math.max(0.5, (h - minTop - capH - bottomGap) / ph)
      pw *= k9
      ph *= k9
      py = h - ph - bottomGap + sh.y * 0.5
    }
    const x0b = bx - pw / 2
    const aB = alpha
    ctx.save()
    // The panel's name tag, riding the top border (skipped when the short-
    // viewport clamp has shrunk the panel — no room without the card).
    if (pw >= unit * 0.36) {
      ctx.font = '600 18px "Chakra Petch", ui-monospace, monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = rgba(AMBER, 0.9 * aB)
      ctx.fillText('· GITHUB STATS ·', bx, py - 15)
    }
    // Light legs anchoring the plate to the glass + its glow pool.
    ctx.strokeStyle = rgba(AMBER, 0.16 * aB)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x0b + pw * 0.22, py + ph)
    ctx.lineTo(x0b + pw * 0.22, h)
    ctx.moveTo(x0b + pw * 0.78, py + ph)
    ctx.lineTo(x0b + pw * 0.78, h)
    ctx.stroke()
    drawGlow(ctx, bx, py + ph, pw * 0.5, AMBER, 0.06 * aB)
    drawGlow(ctx, bx, py + ph * 0.5, pw * 0.6, AMBER, 0.06 * aB)
    ctx.fillStyle = rgba('#0a0812', 0.94 * aB)
    ctx.fillRect(x0b, py, pw, ph)
    ctx.strokeStyle = rgba(AMBER, 0.7 * aB)
    ctx.lineWidth = 1.2
    ctx.strokeRect(x0b, py, pw, ph)
    // Stat chips: amber numbers, muted labels. All type scales with the
    // panel (S = 1 at the pre-rev8 size, 1.4 at full).
    const S = pw / (unit * 0.375)
    ctx.textAlign = 'left'
    const chipY = py + ph * 0.12
    let cxp = x0b + 10 * S
    const CHIPS = [
      ['11', 'projects'],
      ['88', 'days'],
      ['599', 'commits'],
      ['1–26', 'days each'],
    ] as const
    for (let ci = 0; ci < CHIPS.length; ci++) {
      ctx.font = `700 ${Math.round(10.5 * S)}px "Chakra Petch", ui-monospace, monospace`
      ctx.fillStyle = rgba(AMBER, 0.95 * aB)
      ctx.fillText(CHIPS[ci][0], cxp, chipY)
      cxp += ctx.measureText(CHIPS[ci][0]).width + 4 * S
      ctx.font = `${Math.round(8 * S)}px "Chakra Petch", ui-monospace, monospace`
      ctx.fillStyle = rgba(PALE, 0.42 * aB)
      ctx.fillText(CHIPS[ci][1], cxp, chipY + 0.5)
      cxp += ctx.measureText(CHIPS[ci][1]).width + 11 * S
      if (ci < CHIPS.length - 1) {
        ctx.fillStyle = rgba(AMBER, 0.35 * aB)
        ctx.fillRect(cxp - 6 * S, chipY - 1.2, 2.4, 2.4)
      }
    }
    // Daily heatmap (left) with muted month ticks under the axis.
    const hx0 = x0b + 10 * S
    const hw3 = pw * 0.5
    const hy0 = py + ph * 0.26
    const hh3 = ph * 0.54
    const cs = hw3 / HEAT_COLS
    const rs = hh3 / 7
    for (let cI = 0; cI < HEAT_COLS; cI++) {
      for (let rI = 0; rI < 7; rI++) {
        const v = HEAT[cI][rI]
        ctx.globalAlpha = aB * (v > 0 ? 0.3 + 0.7 * v : 0.09)
        ctx.fillStyle = v > 0 ? mixHex('#5a3c00', AMBER, v) : '#1c1830'
        ctx.fillRect(hx0 + cI * cs, hy0 + rI * rs, cs - 1, rs - 1)
      }
    }
    const slotB = Math.floor(time * 1.4)
    for (let kk = 0; kk < 3; kk++) {
      const cI = Math.floor(hash1(slotB * 3.3 + kk * 7.7) * HEAT_COLS)
      const rI = Math.floor(hash1(slotB * 5.1 + kk * 11.3) * 7)
      if (HEAT[cI][rI] <= 0) continue
      ctx.globalAlpha = aB * 0.85
      ctx.fillStyle = '#ffe2a0'
      ctx.fillRect(hx0 + cI * cs, hy0 + rI * rs, cs - 1, rs - 1)
    }
    ctx.globalAlpha = 1
    ctx.font = `${Math.round(7.5 * S)}px "Chakra Petch", ui-monospace, monospace`
    ctx.fillStyle = rgba(PALE, 0.42 * aB)
    ctx.textAlign = 'center'
    const monthCols = [4, 7, 12, 15] as const
    for (let mi = 0; mi < 4; mi++) {
      ctx.fillText(MOM_LABELS[mi], hx0 + monthCols[mi] * cs, py + ph * 0.91)
    }
    // Monthly momentum (right): muted labels, amber bars, real values at the
    // tips — 104 · 102 · 246 · 147 (July still in progress).
    const mx0 = x0b + pw * 0.56
    const mw2 = pw * 0.44 - 12 * S
    const my0 = py + ph * 0.28
    const rowH = (ph * 0.6) / 4
    ctx.textAlign = 'left'
    for (let m = 0; m < 4; m++) {
      const yy = my0 + m * rowH
      ctx.font = `${Math.round(7.5 * S)}px "Chakra Petch", ui-monospace, monospace`
      ctx.fillStyle = rgba(PALE, 0.42 * aB)
      ctx.fillText(MOM_LABELS[m], mx0, yy + rowH * 0.42)
      const bx0 = mx0 + 21 * S
      const bw3 = mw2 - 21 * S - 27 * S
      const frac2 = MOM_VALS[m] / MOM_MAX
      ctx.fillStyle = rgba(AMBER, 0.12 * aB)
      ctx.fillRect(bx0, yy, bw3, rowH * 0.6)
      ctx.fillStyle = rgba(AMBER, 0.8 * aB)
      ctx.fillRect(bx0, yy, bw3 * frac2, rowH * 0.6)
      ctx.font = `600 ${Math.round(8 * S)}px "Chakra Petch", ui-monospace, monospace`
      ctx.fillStyle = rgba(AMBER, 0.9 * aB)
      ctx.fillText(MOM_TEXT[m], bx0 + bw3 + 4 * S, yy + rowH * 0.42)
    }
    ctx.restore()
  }
}
