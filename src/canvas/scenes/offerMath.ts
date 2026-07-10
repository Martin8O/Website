/**
 * Pure math for the flight-plan scene (chapter 09 — "Your flight plan"): a
 * night-mode IFR-style enroute/SID chart with a route plotted across it —
 * departure top-left (LKCV, Martin's base) through FOUR numbered waypoints,
 * one per mission panel, to the destination: the visitor's project. The
 * route order IS the reading order: panel N pops the moment the plotted
 * head reaches waypoint N (Martin's brief), so the panel windows are
 * DERIVED from the route geometry — one timing source for canvas + DOM.
 */

import { clamp01, smoothstep } from '../toolkit'

/** The plotted route, in viewport fractions — FOUR points flowing across the
 *  chart from START (upper-left) to DESTINATION (lower-right), one beside
 *  each mission card in reading order (Martin's layout): node 0 = START
 *  (card 01, upper-left) → node 1 (card 02, lower-left) → node 2 (card 03,
 *  centre) → node 3 = DESTINATION (card 04, right). */
export const ROUTE: readonly { x: number; y: number }[] = [
  { x: 0.36, y: 0.24 },
  { x: 0.445, y: 0.68 },
  { x: 0.56, y: 0.6 },
  { x: 0.67, y: 0.85 },
] as const

/** Scene choreography, in scene localT (run window [chapter−0.5,
 *  chapter+0.5]; the scene cross-fades in over 0.2..0.47 — enterFade
 *  [0.7, 0.97] of the dev chapter). The chart materializes while the dev
 *  city dissolves; the route is plotted once the frame is ours. */
export const OFFER = {
  /** The chart's layers fade in (graticule → airways/zones → labels). */
  chartIn0: 0.18,
  chartIn1: 0.44,
  /** The route is drawn (the "plotting") across this window. */
  plot0: 0.46,
  plot1: 0.93,
  /** Panels hold until here (pos offset), clearing before the galaxy. */
  holdEnd: 0.6,
} as const

/** Cumulative normalized arc-length of each ROUTE node (0 at departure,
 *  1 at destination) — legs draw at constant ground speed. */
export const ROUTE_ARCS: readonly number[] = (() => {
  const d: number[] = [0]
  let total = 0
  for (let i = 1; i < ROUTE.length; i++) {
    total += Math.hypot(ROUTE[i].x - ROUTE[i - 1].x, ROUTE[i].y - ROUTE[i - 1].y)
    d.push(total)
  }
  return d.map((v) => v / total)
})()

/** How much of the chart is up (0..1) — the renderer staggers its layers
 *  inside this. */
export function chartIn(t: number): number {
  return smoothstep(OFFER.chartIn0, OFFER.chartIn1, clamp01(t))
}

/** Route-plotting progress 0..1 (arc-length fraction of the drawn line). */
export function plotProgress(t: number): number {
  return smoothstep(OFFER.plot0, OFFER.plot1, clamp01(t))
}

/** The pencil head: the point on the route at arc-fraction `s` (0..1). */
export function routePoint(s: number): { x: number; y: number } {
  const u = clamp01(s)
  for (let i = 1; i < ROUTE.length; i++) {
    if (u <= ROUTE_ARCS[i]) {
      const span = ROUTE_ARCS[i] - ROUTE_ARCS[i - 1]
      const k = span > 0 ? (u - ROUTE_ARCS[i - 1]) / span : 1
      return {
        x: ROUTE[i - 1].x + (ROUTE[i].x - ROUTE[i - 1].x) * k,
        y: ROUTE[i - 1].y + (ROUTE[i].y - ROUTE[i - 1].y) * k,
      }
    }
  }
  return ROUTE[ROUTE.length - 1]
}

/** The leg index the head is on at arc-fraction `s` (0..legs−1). */
export function legAt(s: number): number {
  const u = clamp01(s)
  for (let i = 1; i < ROUTE.length; i++) if (u <= ROUTE_ARCS[i]) return i - 1
  return ROUTE.length - 2
}

/** Waypoint reveal: 0→1 as the plotted head reaches node `i` (0..3 — one per
 *  corner panel) — the numbered marker pops right behind the pencil, and
 *  with it its panel. Node 0 (START) reveals as the plotting begins. */
export function wpReveal(i: number, t: number): number {
  const arrive = OFFER.plot0 + ROUTE_ARCS[i] * (OFFER.plot1 - OFFER.plot0)
  return smoothstep(arrive - 0.008, arrive + 0.03, clamp01(t))
}

/** The scene-localT at which node `i`'s reveal completes. The DOM converts
 *  it to a pos-offset (pos = chapter − 0.5 + localT). */
export function wpAt(i: number): number {
  return OFFER.plot0 + ROUTE_ARCS[i] * (OFFER.plot1 - OFFER.plot0) + 0.03
}

/** Node `i`'s reveal moment as a POS OFFSET from the chapter index — the
 *  unit `cardOpacityWindowed` speaks. */
function wpOffset(i: number): number {
  return wpAt(i) - 0.5
}

/**
 * The four panels' opacity windows, in POS OFFSETS from the offer chapter's
 * index (the `cardOpacityWindowed` contract) — DERIVED from the route:
 * panel N rises the moment the plotted head reaches waypoint N. Desktop:
 * every panel then holds beside the chart until they all clear together
 * before the contact galaxy blooms (contact enters from pos +0.7). */
export const PANEL_FULL: readonly (readonly [number, number])[] = [0, 1, 2, 3].map(
  (i) => [wpOffset(i), OFFER.holdEnd] as const,
)

/** Mobile (<720): one panel at a time in the central slot — each rises at
 *  ITS waypoint (same beats as desktop) and yields just before the next
 *  one lands; the last holds like desktop. */
export const PANEL_FULL_MOBILE: readonly (readonly [number, number])[] = [0, 1, 2, 3].map(
  (i) =>
    [
      wpOffset(i),
      i === 3 ? OFFER.holdEnd : Math.max(wpOffset(i) + 0.02, wpOffset(i + 1) - 0.03),
    ] as const,
)

export const PANEL_EASE = 0.08
export const PANEL_EASE_MOBILE = 0.05

/** The windows for a viewport class — one accessor so callers can't mix the
 *  pair up. */
export function panelWindows(mobile: boolean): {
  full: readonly (readonly [number, number])[]
  ease: number
} {
  return mobile
    ? { full: PANEL_FULL_MOBILE, ease: PANEL_EASE_MOBILE }
    : { full: PANEL_FULL, ease: PANEL_EASE }
}

/**
 * Ambient ATC traffic — five airliners flying multi-leg airways across the
 * chart, radar-style, TURNING at their junctions. Position is a PURE
 * function of `time` (seconds): a contact advances along its polyline by
 * arc length at a rate proportional to its own airspeed, so a 388 kt tag
 * visibly outruns a 268 kt one and the on-screen pace matches the number on
 * the label. Under reduced motion (time frozen at 0) they hold still at
 * their `offset` positions. Each path enters and exits off-plate, wrapping
 * unseen. Registrations are fictional Czech OK- marks (a couple nodding to
 * Martin) — decoration, never a claim of real flights.
 */
export type Traffic = {
  /** Registration / callsign shown on the data tag. */
  reg: string
  /** Airspeed in knots (250–400) — drives BOTH the tag and the pace. */
  speedKts: number
  /** Transponder code (4 octal digits). */
  squawk: string
  /** Airway polyline in viewport fractions; the ends sit off-plate. */
  path: readonly { x: number; y: number }[]
  /** Starting fraction 0..1 of total path length (frozen position at t=0). */
  offset: number
}

/** Screen fractions travelled per knot per second — tuned so a ~320 kt
 *  contact crosses the plate in a slow, readable pace and faster tags pull
 *  ahead of slower ones. */
export const TRAFFIC_VSCALE = 9e-5

// Every contact makes TWO turns (4-point path) — switching airways at
// junctions, each turn continuing broadly forward (never doubling back).
// One rides the bottom corridor past LEMBI + USUPA, edge to edge.
export const TRAFFIC: readonly Traffic[] = [
  { reg: 'OK-MJS', speedKts: 322, squawk: '2200', offset: 0.05, path: [{ x: -0.1, y: 0.15 }, { x: 0.36, y: 0.3 }, { x: 0.64, y: 0.46 }, { x: 1.1, y: 0.74 }] },
  { reg: 'OK-159', speedKts: 268, squawk: '4271', offset: 0.42, path: [{ x: 1.1, y: 0.22 }, { x: 0.7, y: 0.4 }, { x: 0.4, y: 0.56 }, { x: -0.1, y: 0.82 }] },
  { reg: 'OK-CTU', speedKts: 355, squawk: '1000', offset: 0.7, path: [{ x: -0.1, y: 0.9 }, { x: 0.415, y: 0.9 }, { x: 0.66, y: 0.895 }, { x: 1.1, y: 0.87 }] },
  { reg: 'OK-BTC', speedKts: 291, squawk: '3607', offset: 0.2, path: [{ x: -0.1, y: 0.86 }, { x: 0.4, y: 0.6 }, { x: 0.66, y: 0.42 }, { x: 1.1, y: 0.14 }] },
  { reg: 'OK-DEV', speedKts: 388, squawk: '5216', offset: 0.85, path: [{ x: 0.38, y: -0.1 }, { x: 0.47, y: 0.36 }, { x: 0.56, y: 0.62 }, { x: 0.66, y: 1.1 }] },
]

/** Cumulative segment lengths of a path (index-aligned; last = total). */
function pathCum(path: readonly { x: number; y: number }[]): number[] {
  const cum = [0]
  for (let i = 1; i < path.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y))
  }
  return cum
}

/** Position (viewport fractions) + the current leg's direction of a contact
 *  at `time` — advanced by arc length at its own airspeed, wrapping around
 *  the (off-plate) path ends. `heading` is the fraction-space angle;
 *  `segDx`/`segDy` are the raw fraction-space leg deltas so a caller can
 *  build the SCREEN-space heading `atan2(h·segDy, w·segDx)` — that is what
 *  keeps the drawn marker, its speed vector and its history exactly ON the
 *  flown line even though the viewport is not square. Both turn at each
 *  junction. */
export function trafficPos(
  tr: Traffic,
  time: number,
): { x: number; y: number; heading: number; segDx: number; segDy: number } {
  const p = tr.path
  const cum = pathCum(p)
  const total = cum[cum.length - 1]
  let d = (tr.offset * total + time * tr.speedKts * TRAFFIC_VSCALE) % total
  if (d < 0) d += total
  for (let i = 1; i < p.length; i++) {
    if (d <= cum[i] || i === p.length - 1) {
      const seg = cum[i] - cum[i - 1]
      const k = seg > 0 ? (d - cum[i - 1]) / seg : 0
      const segDx = p[i].x - p[i - 1].x
      const segDy = p[i].y - p[i - 1].y
      return {
        x: p[i - 1].x + segDx * k,
        y: p[i - 1].y + segDy * k,
        heading: Math.atan2(segDy, segDx),
        segDx,
        segDy,
      }
    }
  }
  return { x: p[0].x, y: p[0].y, heading: 0, segDx: 1, segDy: 0 }
}
