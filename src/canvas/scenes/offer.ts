/**
 * The `offer` scene (chapter 09 — "Your flight plan"): after the dev city
 * collapses, a night-mode DIGITAL ENROUTE CHART materializes out of the
 * dark — the IFR/SID-chart idiom of Martin's world (his reference: the CZ
 * airspace map): a web of blue airways between five-letter waypoints,
 * sector polygons with altitude blocks, round zones, a red reserved area,
 * a VOR compass rose — no terrain, no rivers, no towns (aeronautical
 * charts carry airspace, not geography; Martin's brief).
 *
 * As you scroll, a route is PLOTTED across it in the site's amber:
 * departure top-left (LKCV — his base, ringed by its dashed MCTR) through
 * four numbered waypoints — one per mission panel, in reading order
 * (01 top-left → 02 bottom-left → 03 top-right → 04 bottom-right) — to the
 * double-ringed destination at the bottom centre: the visitor's project.
 * Panel N pops the moment the pencil reaches waypoint N (timing shared
 * with the DOM through `offerMath`). Leg annotations (course · distance)
 * derive from the drawn geometry, so they always match it. Chart labels
 * stay English/diegetic (aviation convention).
 *
 * Pure renderer: story beats ride `localT`, ambient motion rides `time`
 * (0 under reduced motion → complete standing still), pointer is an
 * enhancement-only parallax.
 */

import type { Renderer } from '../types'
import {
  TAU,
  clamp01,
  drawGlow,
  drawStars,
  fillVerticalGradient,
  makeGrainTile,
  rgba,
  smoothstep,
} from '../toolkit'
import {
  ROUTE,
  ROUTE_ARCS,
  TRAFFIC,
  chartIn,
  legAt,
  plotProgress,
  routePoint,
  trafficPos,
  wpReveal,
} from './offerMath'

const AMBER = '#ffb000'
const PALE = '#ffe2ae'
const SLATE = '#7d8aa8' // graticule + rose
const BLUE = '#5b8fd6' // airways / sectors / waypoints
const RED = '#e05555' // reserved areas
const TRAF = '#5fce97' // live ATC traffic (radar green)
const TRAF_INK = '#dff3e8' // traffic tag registration

let grain: HTMLCanvasElement | null = null

/** Chart-style bearing (° from north, screen-up = N) of a route leg. */
function legBearing(i: number): number {
  const dx = ROUTE[i + 1].x - ROUTE[i].x
  const dy = ROUTE[i + 1].y - ROUTE[i].y
  return (Math.atan2(dx, -dy) * 360) / TAU
}

/** A small top-view airliner glyph, nose pointing along `heading` (radians,
 *  screen space). Reused for the plotted-route aircraft and every radar
 *  contact + its fading history copies. */
function drawPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  heading: number,
  size: number,
  color: string,
  alpha: number,
): void {
  if (alpha <= 0.01) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(heading + TAU / 4) // glyph is authored nose-up (−y)
  ctx.fillStyle = rgba(color, alpha)
  const p = size
  ctx.beginPath()
  ctx.moveTo(0, -p)
  ctx.lineTo(p * 0.2, -p * 0.2)
  ctx.lineTo(p * 0.95, p * 0.12)
  ctx.lineTo(p * 0.2, p * 0.24)
  ctx.lineTo(p * 0.3, p * 0.72)
  ctx.lineTo(0, p * 0.56)
  ctx.lineTo(-p * 0.3, p * 0.72)
  ctx.lineTo(-p * 0.2, p * 0.24)
  ctx.lineTo(-p * 0.95, p * 0.12)
  ctx.lineTo(-p * 0.2, -p * 0.2)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** Background airway fixes (the quiet blue web behind the amber route).
 *  Names are real Czech-airspace five-letter fixes (Martin's reference). */
const FIXES: readonly { x: number; y: number; name: string; filled: boolean }[] = [
  { x: 0.47, y: 0.1, name: 'VENOX', filled: true },
  { x: 0.285, y: 0.135, name: 'GOLOP', filled: false },
  { x: 0.585, y: 0.115, name: 'ARTUP', filled: true },
  { x: 0.545, y: 0.52, name: 'BULEK', filled: false },
  { x: 0.415, y: 0.9, name: 'LEMBI', filled: true },
  { x: 0.66, y: 0.895, name: 'USUPA', filled: false },
]

/** Which fixes the background airways connect (indices into FIXES). */
const AIRWAYS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 2],
  [0, 3],
  [3, 4],
  [3, 5],
  [2, 3],
]

export const renderOffer: Renderer = (ctx, alpha, t, time, cfg) => {
  if (alpha <= 0.002) return
  const { w, h } = cfg
  const unit = Math.min(w, h)
  const s = Math.min(1.25, Math.max(0.78, unit / 760))
  const tw = cfg.tRaw ?? t
  const mono = (px: number, weight = 500) =>
    `${weight} ${Math.max(7, Math.round(px * s))}px "Chakra Petch", ui-monospace, monospace`

  // --- The night behind the chart -----------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      [0, '#05060f'],
      [0.55, '#090c1a'],
      [1, '#0b0a1c'],
    ],
    alpha,
  )
  drawStars(ctx, {
    w,
    h,
    count: 130,
    seed: 47,
    alpha: alpha * 0.5,
    size: 1.3,
    time,
    twinkle: 0.5,
    xShift: time * 0.0014,
  })
  drawStars(ctx, {
    w,
    h,
    count: 55,
    seed: 83,
    alpha: alpha * 0.38,
    size: 1.9,
    time,
    twinkle: 0.35,
    color: '#cfe0ff',
    xShift: time * 0.003,
  })

  // The chart dims out as the galaxy blooms over it (contact enters over
  // tRaw 1.2..1.45 — pos +0.7..+0.95).
  const out = 1 - smoothstep(1.2, 1.45, tw)
  const up = chartIn(t)
  if (up <= 0.004 || out <= 0.004) return
  /** Staggered layer arrival inside the materialize window. */
  const stage = (a: number, b: number) => smoothstep(a, b, up) * out

  // --- The chart, FULL-BLEED (no plate, no dark margins — Martin) -----------------
  // The chart fills the whole viewport: a faint blue wash over the night, and
  // every furniture fraction (0..1) maps edge-to-edge. No rounded plate, no
  // inset border — the scene runs to all four edges.
  const mx = 0
  const my0 = 0
  const my1 = h
  const plate = stage(0, 0.3)

  // Pointer parallax: the whole chart drifts a few px against the pointer.
  const pa = cfg.pointer?.a ?? 0
  const pnx =
    pa > 0 ? clamp01(Math.abs((cfg.pointer!.x - w / 2) / (w / 2))) * Math.sign(cfg.pointer!.x - w / 2) : 0
  const pny =
    pa > 0 ? clamp01(Math.abs((cfg.pointer!.y - h / 2) / (h / 2))) * Math.sign(cfg.pointer!.y - h / 2) : 0

  ctx.save()
  // A whole-screen bluish chart wash over the night sky.
  ctx.fillStyle = rgba('#0b0f1e', alpha * plate * 0.55)
  ctx.fillRect(0, 0, w, h)
  ctx.translate(-pnx * 7 * pa, -pny * 5 * pa)

  const X = (fx: number) => w * fx
  const Y = (fy: number) => h * fy
  const A = alpha

  // Paper tooth.
  grain ??= makeGrainTile()
  if (grain) {
    ctx.save()
    ctx.globalAlpha = A * plate * 0.05
    ctx.fillStyle = ctx.createPattern(grain, 'repeat') ?? '#0c1120'
    ctx.fillRect(-20, -20, w + 40, h + 40)
    ctx.restore()
  }

  // --- Graticule + edge coordinates (the real Čáslav-area grid) ------------------
  const gratA = A * stage(0.05, 0.35)
  ctx.strokeStyle = rgba(SLATE, gratA * 0.14)
  ctx.lineWidth = 1
  const lons = [0.22, 0.46, 0.7, 0.94]
  const lats = [0.2, 0.475, 0.75]
  for (const fx of lons) {
    ctx.beginPath()
    ctx.moveTo(X(fx), my0)
    ctx.lineTo(X(fx), my1)
    ctx.stroke()
  }
  for (const fy of lats) {
    ctx.beginPath()
    ctx.moveTo(mx, Y(fy))
    ctx.lineTo(w - mx, Y(fy))
    ctx.stroke()
  }
  ctx.font = mono(8.5)
  ctx.fillStyle = rgba(SLATE, gratA * 0.55)
  ctx.textAlign = 'left'
  const lonLbl = ['E 015°10′', 'E 015°25′', 'E 015°40′', 'E 015°55′']
  lons.forEach((fx, i) => ctx.fillText(lonLbl[i], X(fx) + 4 * s, my0 + 12 * s))
  const latLbl = ['N 50°00′', 'N 49°55′', 'N 49°50′']
  lats.forEach((fy, i) => ctx.fillText(latLbl[i], mx + 6 * s, Y(fy) - 4 * s))

  // --- Airspace sectors: faint polygons + altitude blocks ------------------------
  const secA = A * stage(0.2, 0.5)
  const sector = (pts: readonly (readonly [number, number])[], label: string, lx: number, ly: number, upper: string, lower: string) => {
    ctx.strokeStyle = rgba(BLUE, secA * 0.3)
    ctx.lineWidth = 1.4
    ctx.beginPath()
    pts.forEach(([fx, fy], i) => {
      if (i === 0) ctx.moveTo(X(fx), Y(fy))
      else ctx.lineTo(X(fx), Y(fy))
    })
    ctx.closePath()
    ctx.stroke()
    ctx.fillStyle = rgba(BLUE, secA * 0.05)
    ctx.fill()
    ctx.textAlign = 'center'
    ctx.fillStyle = rgba(BLUE, secA * 0.8)
    ctx.font = mono(8.5, 600)
    ctx.fillText(label, X(lx), Y(ly))
    ctx.font = mono(8)
    ctx.fillStyle = rgba(BLUE, secA * 0.65)
    ctx.fillText(upper, X(lx), Y(ly) + 10 * s)
    ctx.fillText(lower, X(lx), Y(ly) + 19 * s)
  }
  // Two big quiet sectors framing the corridor (labels live in free margins).
  sector(
    [
      [0.02, 0.55],
      [0.3, 0.47],
      [0.42, 0.72],
      [0.36, 0.99],
      [0.02, 0.99],
    ],
    'LKSMA16',
    0.24,
    0.9,
    '3400',
    '(3600)',
  )
  sector(
    [
      [0.6, 0.02],
      [0.98, 0.06],
      [0.98, 0.4],
      [0.68, 0.34],
      [0.55, 0.16],
    ],
    'LKSMA10',
    0.775,
    0.085,
    '2300',
    '(2500)',
  )

  // Round zones — the quiet grey circles of the reference map.
  ctx.strokeStyle = rgba(SLATE, secA * 0.35)
  ctx.lineWidth = 1
  for (const [zx, zy, zr] of [
    [0.44, 0.755, 0.048],
    [0.555, 0.145, 0.042],
    [0.3, 0.445, 0.038],
  ] as const) {
    ctx.beginPath()
    ctx.arc(X(zx), Y(zy), zr * unit, 0, TAU)
    ctx.stroke()
  }

  // LKR 2 — a small red reserved box with hatching, top margin (the plotted
  // route reads as planned AROUND it).
  const rx0 = X(0.3)
  const ry0 = Y(0.048)
  const rx1 = X(0.385)
  const ry1 = Y(0.115)
  ctx.strokeStyle = rgba(RED, secA * 0.7)
  ctx.lineWidth = 1.3
  ctx.strokeRect(rx0, ry0, rx1 - rx0, ry1 - ry0)
  ctx.save()
  ctx.beginPath()
  ctx.rect(rx0, ry0, rx1 - rx0, ry1 - ry0)
  ctx.clip()
  ctx.strokeStyle = rgba(RED, secA * 0.25)
  ctx.lineWidth = 1
  for (let k = -6; k < 12; k++) {
    ctx.beginPath()
    ctx.moveTo(rx0 + k * 9 * s, ry1)
    ctx.lineTo(rx0 + k * 9 * s + (ry1 - ry0), ry0)
    ctx.stroke()
  }
  ctx.restore()
  ctx.fillStyle = rgba(RED, secA * 0.85)
  ctx.font = mono(8, 600)
  ctx.textAlign = 'center'
  ctx.fillText('LKR 2', (rx0 + rx1) / 2, ry1 + 11 * s)

  // --- The background airway web --------------------------------------------------
  const awA = A * stage(0.35, 0.65)
  ctx.strokeStyle = rgba(BLUE, awA * 0.35)
  ctx.lineWidth = 1.1
  for (const [a, b] of AIRWAYS) {
    ctx.beginPath()
    ctx.moveTo(X(FIXES[a].x), Y(FIXES[a].y))
    ctx.lineTo(X(FIXES[b].x), Y(FIXES[b].y))
    ctx.stroke()
  }
  // The bottom corridor — the LEMBI ↔ USUPA airway run OUT to both screen
  // edges (Martin), so a contact can fly it edge to edge.
  ctx.beginPath()
  ctx.moveTo(0, Y(0.9))
  ctx.lineTo(X(FIXES[4].x), Y(FIXES[4].y))
  ctx.lineTo(X(FIXES[5].x), Y(FIXES[5].y))
  ctx.lineTo(w, Y(0.87))
  ctx.stroke()
  const fixTri = (fx: number, fy: number, rr: number, color: string, aMul: number, filled: boolean) => {
    const px = X(fx)
    const py = Y(fy)
    ctx.beginPath()
    ctx.moveTo(px, py - rr)
    ctx.lineTo(px + rr * 0.9, py + rr * 0.7)
    ctx.lineTo(px - rr * 0.9, py + rr * 0.7)
    ctx.closePath()
    if (filled) {
      ctx.fillStyle = rgba(color, aMul)
      ctx.fill()
    } else {
      ctx.strokeStyle = rgba(color, aMul)
      ctx.lineWidth = 1.2
      ctx.stroke()
    }
  }
  for (const f of FIXES) {
    fixTri(f.x, f.y, 4.6 * s, BLUE, awA * 0.75, f.filled)
    ctx.fillStyle = rgba(BLUE, awA * 0.7)
    ctx.font = mono(8, 600)
    ctx.textAlign = 'center'
    ctx.fillText(f.name, X(f.x), Y(f.y) + 15 * s)
  }

  // (The departure aerodrome LKCV is the START waypoint itself — drawn with
  // the plotted route below, so the top-left corner stays uncluttered.)

  // --- VOR compass rose (bottom-centre, clear of route node 2 + the cards) ---------
  const vorA = A * stage(0.55, 0.85)
  const vx = X(0.55)
  const vy = Y(0.78)
  const vr = 0.05 * unit
  ctx.strokeStyle = rgba(SLATE, vorA * 0.5)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(vx, vy, vr, 0, TAU)
  ctx.stroke()
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * TAU - TAU / 4
    const long = k % 9 === 0
    const inner = long ? vr * 0.82 : vr * 0.92
    ctx.beginPath()
    ctx.moveTo(vx + Math.cos(a) * inner, vy + Math.sin(a) * inner)
    ctx.lineTo(vx + Math.cos(a) * vr, vy + Math.sin(a) * vr)
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.moveTo(vx, vy - vr)
  ctx.lineTo(vx, vy - vr - 7 * s)
  ctx.stroke()
  ctx.strokeStyle = rgba(SLATE, vorA * 0.85)
  ctx.beginPath()
  for (let k = 0; k <= 6; k++) {
    const a = (k / 6) * TAU
    const px = vx + Math.cos(a) * 4.6 * s
    const py = vy + Math.sin(a) * 4.6 * s
    if (k === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.fillStyle = rgba(SLATE, vorA * 0.8)
  ctx.font = mono(8, 600)
  ctx.textAlign = 'center'
  ctx.fillText('CLV 114.3', vx, vy + vr + 12 * s)

  // --- Ambient ATC traffic ----------------------------------------------------------
  // Five airliners fly their airways, radar-style — an aircraft marker, a
  // speed vector along the heading, four fading history copies trailing
  // behind (the radar returns), and a data tag (registration · speed ·
  // squawk). They turn at their junctions and their pace tracks their
  // airspeed. Drawn BENEATH the amber plan so the visitor's own route stays
  // the hero.
  const trafA = A * stage(0.6, 0.9)
  if (trafA > 0.01) {
    // Faint range rings — the radar-scope signature, kept subliminal.
    ctx.strokeStyle = rgba(TRAF, trafA * 0.06)
    ctx.lineWidth = 1
    for (const rr of [0.2, 0.36]) {
      ctx.beginPath()
      ctx.arc(X(0.5), Y(0.52), rr * unit, 0, TAU)
      ctx.stroke()
    }

    const inPlate = (bx: number, by: number) =>
      bx > mx && bx < w - mx && by > my0 && by < my1

    for (const tr of TRAFFIC) {
      // The drawn airways this contact follows (its polyline).
      ctx.strokeStyle = rgba(TRAF, trafA * 0.1)
      ctx.lineWidth = 1
      ctx.beginPath()
      tr.path.forEach((pt, i) => (i === 0 ? ctx.moveTo(X(pt.x), Y(pt.y)) : ctx.lineTo(X(pt.x), Y(pt.y))))
      ctx.stroke()

      const pos = trafficPos(tr, time)
      const bx = X(pos.x)
      const by = Y(pos.y)
      if (!inPlate(bx, by)) continue
      // Soft fade near the plate edges so contacts don't pop on/off.
      const edge = Math.min(bx - mx, w - mx - bx, by - my0, my1 - by) / (unit * 0.06)
      const vis = trafA * clamp01(edge)
      if (vis < 0.02) continue
      // SCREEN-space heading from the leg delta (× aspect) — so the marker,
      // its speed vector and its history sit exactly on the drawn track,
      // never peeling off on a non-square viewport.
      const ang = Math.atan2(h * pos.segDy, w * pos.segDx)
      const dx = Math.cos(ang)
      const dy = Math.sin(ang)

      // Radar history — four fading, shrinking copies of the marker, trailing
      // BEHIND along the reverse heading.
      for (let k = 4; k >= 1; k--) {
        drawPlane(
          ctx,
          bx - dx * 8 * s * k,
          by - dy * 8 * s * k,
          ang,
          6 * s * (1 - 0.13 * k),
          TRAF,
          vis * (0.34 - k * 0.06),
        )
      }

      // Speed vector — length scaled by airspeed, pointing where it's going.
      const vlen = (tr.speedKts / 400) * 30 * s
      ctx.strokeStyle = rgba(TRAF, vis * 0.75)
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(bx + dx * vlen, by + dy * vlen)
      ctx.stroke()

      // The aircraft marker.
      drawPlane(ctx, bx, by, ang, 6.4 * s, TRAF, vis)

      // Data tag — registration / speed · squawk — on a short leader.
      const tagX = bx + 11 * s
      const tagY = by - 16 * s
      ctx.strokeStyle = rgba(TRAF, vis * 0.4)
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(bx, by)
      ctx.lineTo(tagX - 2 * s, tagY + 11 * s)
      ctx.stroke()
      ctx.textAlign = 'left'
      ctx.fillStyle = rgba(TRAF_INK, vis * 0.95)
      ctx.font = mono(8, 600)
      ctx.fillText(tr.reg, tagX, tagY)
      ctx.fillStyle = rgba(TRAF, vis * 0.85)
      ctx.font = mono(7.5)
      ctx.fillText(`${tr.speedKts} KTS · ${tr.squawk}`, tagX, tagY + 9 * s)
    }
  }

  // --- THE PLOTTED ROUTE -------------------------------------------------------------
  const plot = plotProgress(t)
  const routeA = A * out
  if (plot > 0.001) {
    const head = routePoint(plot)
    const hx = X(head.x)
    const hy = Y(head.y)

    // The plotting lamp — a warm pool of light travelling with the pencil.
    drawGlow(ctx, hx, hy, unit * 0.2, AMBER, routeA * 0.05)

    // Drawn legs.
    ctx.strokeStyle = rgba(AMBER, routeA * 0.9)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(X(ROUTE[0].x), Y(ROUTE[0].y))
    for (let i = 1; i < ROUTE.length; i++) {
      if (plot >= ROUTE_ARCS[i]) ctx.lineTo(X(ROUTE[i].x), Y(ROUTE[i].y))
      else {
        ctx.lineTo(hx, hy)
        break
      }
    }
    ctx.stroke()

    // Leg annotations — course + distance from the drawn geometry.
    ctx.font = mono(8.5, 600)
    for (let i = 0; i < ROUTE.length - 1; i++) {
      if (plot < ROUTE_ARCS[i + 1] - 0.001) break
      const midX = (X(ROUTE[i].x) + X(ROUTE[i + 1].x)) / 2
      const midY = (Y(ROUTE[i].y) + Y(ROUTE[i + 1].y)) / 2
      const brg = (legBearing(i) + 360) % 360
      const nm = Math.max(
        4,
        Math.round(Math.hypot(ROUTE[i + 1].x - ROUTE[i].x, ROUTE[i + 1].y - ROUTE[i].y) * 64),
      )
      const ang = Math.atan2(Y(ROUTE[i + 1].y) - Y(ROUTE[i].y), X(ROUTE[i + 1].x) - X(ROUTE[i].x))
      const flip = Math.cos(ang) < 0 ? Math.PI : 0
      ctx.save()
      ctx.translate(midX, midY)
      ctx.rotate(ang + flip)
      ctx.fillStyle = rgba(PALE, routeA * 0.75)
      ctx.textAlign = 'center'
      ctx.fillText(`${String(Math.round(brg)).padStart(3, '0')}° · ${nm} NM`, 0, -7 * s)
      ctx.restore()
    }

    // The four corner waypoints — numbered 1..4, one per panel. Node 0 is the
    // START (an origin marker), node 3 the DESTINATION (a double target ring
    // with a quiet breathing halo). Numbers sit toward the panel each belongs
    // to (left corners → label left, right → right).
    for (let i = 0; i < ROUTE.length; i++) {
      const rev = wpReveal(i, t)
      if (rev <= 0.01) continue
      const px = X(ROUTE[i].x)
      const py = Y(ROUTE[i].y)
      const start = i === 0
      const dest = i === ROUTE.length - 1
      // Label side per node, hand-picked toward the free side of its card
      // (nodes 1–3 read to the right; DEST's right is under the proof card).
      const side = [1, 1, 1, -1][i] ?? 1

      if (dest) {
        const ringR = 12 * s * (0.6 + 0.4 * rev)
        ctx.strokeStyle = rgba(AMBER, routeA * rev)
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.arc(px, py, ringR, 0, TAU)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(px, py, ringR * 0.62, 0, TAU)
        ctx.stroke()
        const breatheA = 0.5 + 0.5 * Math.sin(time * 1.1)
        drawGlow(ctx, px, py, unit * 0.06 * (1 + 0.12 * breatheA), AMBER, routeA * rev * 0.22)
      } else if (start) {
        // Origin: a filled dot inside a ring.
        ctx.strokeStyle = rgba(AMBER, routeA * rev * 0.9)
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(px, py, 10.5 * s, 0, TAU)
        ctx.stroke()
        ctx.fillStyle = rgba(AMBER, routeA * rev * 0.95)
        ctx.beginPath()
        ctx.arc(px, py, 3 * s, 0, TAU)
        ctx.fill()
      } else {
        fixTri(ROUTE[i].x, ROUTE[i].y, 6 * s * (0.6 + 0.4 * rev), AMBER, routeA * rev * 0.95, true)
        ctx.strokeStyle = rgba(AMBER, routeA * rev * 0.55)
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(px, py, 10.5 * s, 0, TAU)
        ctx.stroke()
      }

      // Number + optional START / DEST caption, set toward its panel.
      ctx.textAlign = side < 0 ? 'right' : 'left'
      const lx = px + side * 17 * s
      ctx.fillStyle = rgba(AMBER, routeA * rev * 0.95)
      ctx.font = mono(10, 600)
      ctx.fillText(`${i + 1}`, lx, py + 3 * s)
      if (start || dest) {
        ctx.fillStyle = rgba(PALE, routeA * rev * 0.8)
        ctx.font = mono(7, 600)
        ctx.fillText(start ? 'START · LKCV' : 'DEST', lx, py + 13 * s)
      }
    }

    // The aircraft riding the pencil head.
    const leg = legAt(plot)
    const ang = Math.atan2(
      Y(ROUTE[leg + 1].y) - Y(ROUTE[leg].y),
      X(ROUTE[leg + 1].x) - X(ROUTE[leg].x),
    )
    ctx.save()
    ctx.translate(hx, hy)
    ctx.rotate(ang + TAU / 4) // silhouette is authored nose-up
    ctx.fillStyle = rgba(PALE, routeA)
    const ps = 7.2 * s
    ctx.beginPath()
    ctx.moveTo(0, -ps)
    ctx.lineTo(ps * 0.24, -ps * 0.25)
    ctx.lineTo(ps * 0.95, ps * 0.25)
    ctx.lineTo(ps * 0.22, ps * 0.22)
    ctx.lineTo(ps * 0.3, ps * 0.8)
    ctx.lineTo(0, ps * 0.62)
    ctx.lineTo(-ps * 0.3, ps * 0.8)
    ctx.lineTo(-ps * 0.22, ps * 0.22)
    ctx.lineTo(-ps * 0.95, ps * 0.25)
    ctx.lineTo(-ps * 0.24, -ps * 0.25)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  ctx.restore() // end parallax transform
}
