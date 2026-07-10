import { describe, expect, it } from 'vitest'
import {
  OFFER,
  PANEL_EASE,
  PANEL_EASE_MOBILE,
  PANEL_FULL,
  PANEL_FULL_MOBILE,
  ROUTE,
  ROUTE_ARCS,
  TRAFFIC,
  TRAFFIC_VSCALE,
  chartIn,
  legAt,
  panelWindows,
  plotProgress,
  routePoint,
  trafficPos,
  wpAt,
  wpReveal,
} from './offerMath'

describe('route geometry', () => {
  it('normalizes cumulative arc-lengths from 0 to 1, strictly increasing', () => {
    expect(ROUTE_ARCS).toHaveLength(ROUTE.length)
    expect(ROUTE_ARCS[0]).toBe(0)
    expect(ROUTE_ARCS[ROUTE_ARCS.length - 1]).toBeCloseTo(1, 10)
    for (let i = 1; i < ROUTE_ARCS.length; i++) {
      expect(ROUTE_ARCS[i]).toBeGreaterThan(ROUTE_ARCS[i - 1])
    }
  })

  it('interpolates the head exactly onto the nodes', () => {
    ROUTE.forEach((p, i) => {
      const q = routePoint(ROUTE_ARCS[i])
      expect(q.x).toBeCloseTo(p.x, 10)
      expect(q.y).toBeCloseTo(p.y, 10)
    })
  })

  it('flows START(1) upper-left → 2 → 3 → DEST(4) lower-right, rightward', () => {
    expect(ROUTE).toHaveLength(4)
    const [start, , , dest] = ROUTE
    expect(start.x).toBeLessThan(0.45) // 1 = start, upper-left
    expect(start.y).toBeLessThan(0.4)
    expect(dest.x).toBeGreaterThan(0.6) // 4 = destination, lower-right
    expect(dest.y).toBeGreaterThan(0.6)
    // Overall the route marches rightward (each node further right).
    for (let i = 1; i < ROUTE.length; i++) {
      expect(ROUTE[i].x).toBeGreaterThan(ROUTE[i - 1].x)
    }
  })

  it('keeps every node on the plate, distinct from its neighbours', () => {
    for (let i = 0; i < ROUTE.length; i++) {
      expect(ROUTE[i].x).toBeGreaterThan(0)
      expect(ROUTE[i].x).toBeLessThan(1)
      expect(ROUTE[i].y).toBeGreaterThan(0)
      expect(ROUTE[i].y).toBeLessThan(1)
      if (i > 0) {
        const d = Math.hypot(ROUTE[i].x - ROUTE[i - 1].x, ROUTE[i].y - ROUTE[i - 1].y)
        expect(d).toBeGreaterThan(0.1)
      }
    }
  })

  it('reports the leg under the head', () => {
    expect(legAt(0)).toBe(0)
    expect(legAt(1)).toBe(ROUTE.length - 2)
    for (let i = 1; i < ROUTE.length; i++) {
      const mid = (ROUTE_ARCS[i - 1] + ROUTE_ARCS[i]) / 2
      expect(legAt(mid)).toBe(i - 1)
    }
  })
})

describe('choreography', () => {
  it('chart materializes before the plotting starts', () => {
    expect(OFFER.chartIn1).toBeLessThanOrEqual(OFFER.plot0)
    expect(chartIn(OFFER.chartIn0)).toBe(0)
    expect(chartIn(OFFER.chartIn1)).toBe(1)
    expect(plotProgress(OFFER.plot0)).toBe(0)
    expect(plotProgress(OFFER.plot1)).toBe(1)
  })

  it('plots monotonically and finishes before the scene hands over', () => {
    let prev = -1
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const v = plotProgress(t)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
    expect(OFFER.plot1).toBeLessThan(1)
  })

  it('reveals waypoints in route order, right behind the pencil', () => {
    for (let i = 1; i < ROUTE.length; i++) {
      expect(wpAt(i)).toBeGreaterThan(wpAt(i - 1))
    }
    // Node 0 (START) is up as the plotting begins; node 3 (DEST) last.
    expect(wpReveal(2, OFFER.plot0)).toBe(0)
    expect(wpReveal(2, wpAt(2))).toBe(1)
    expect(wpReveal(ROUTE.length - 1, 1)).toBe(1)
    // The destination is reached while the scene still owns the frame.
    expect(wpAt(ROUTE.length - 1)).toBeLessThan(1)
  })
})

describe('panel windows (derived from the route)', () => {
  it('panel N rises exactly at its own corner waypoint N', () => {
    for (const [full, label] of [
      [PANEL_FULL, 'desktop'],
      [PANEL_FULL_MOBILE, 'mobile'],
    ] as const) {
      expect(full, label).toHaveLength(4)
      full.forEach(([start], i) => {
        expect(start).toBeCloseTo(wpAt(i) - 0.5, 10)
      })
    }
  })

  it('windows are ordered and valid', () => {
    for (const full of [PANEL_FULL, PANEL_FULL_MOBILE]) {
      full.forEach(([a, b], i) => {
        expect(a).toBeLessThan(b)
        if (i > 0) expect(a).toBeGreaterThan(full[i - 1][0])
      })
    }
  })

  it('mobile panels yield before the next waypoint lands', () => {
    for (let i = 0; i < PANEL_FULL_MOBILE.length - 1; i++) {
      expect(PANEL_FULL_MOBILE[i][1]).toBeLessThanOrEqual(PANEL_FULL_MOBILE[i + 1][0])
    }
  })

  it('clears the frame before the contact galaxy blooms (~ pos +0.72)', () => {
    for (const full of [PANEL_FULL, PANEL_FULL_MOBILE]) {
      for (const [, end] of full) expect(end + PANEL_EASE).toBeLessThanOrEqual(0.7)
    }
  })

  it('panelWindows returns the matching pair', () => {
    expect(panelWindows(false)).toEqual({ full: PANEL_FULL, ease: PANEL_EASE })
    expect(panelWindows(true)).toEqual({ full: PANEL_FULL_MOBILE, ease: PANEL_EASE_MOBILE })
  })
})

describe('ambient traffic', () => {
  /** Total path length of a contact (sum of its leg lengths). */
  const pathLen = (tr: (typeof TRAFFIC)[number]) =>
    tr.path.reduce(
      (s, p, i) => (i === 0 ? 0 : s + Math.hypot(p.x - tr.path[i - 1].x, p.y - tr.path[i - 1].y)),
      0,
    )

  it('freezes at the offset position under reduced motion (time 0)', () => {
    for (const tr of TRAFFIC) {
      const at0 = trafficPos(tr, 0)
      const again = trafficPos(tr, 0)
      expect(at0).toEqual(again)
      // offset 0 sits exactly on the first node.
      if (tr.offset === 0) {
        expect(at0.x).toBeCloseTo(tr.path[0].x, 10)
        expect(at0.y).toBeCloseTo(tr.path[0].y, 10)
      }
    }
  })

  it('wraps around the path after one full traversal', () => {
    for (const tr of TRAFFIC) {
      const period = pathLen(tr) / (tr.speedKts * TRAFFIC_VSCALE)
      const a = trafficPos(tr, 7)
      const b = trafficPos(tr, 7 + period)
      expect(b.x).toBeCloseTo(a.x, 8)
      expect(b.y).toBeCloseTo(a.y, 8)
    }
  })

  it('faster contacts cover more ground per second', () => {
    // Arc-length advanced in one second (fraction of the path), by speed.
    const advance = (tr: (typeof TRAFFIC)[number]) =>
      (TRAFFIC_VSCALE * tr.speedKts) / pathLen(tr)
    const fastest = [...TRAFFIC].sort((a, b) => b.speedKts - a.speedKts)[0]
    const slowest = [...TRAFFIC].sort((a, b) => a.speedKts - b.speedKts)[0]
    expect(advance(fastest)).toBeGreaterThan(advance(slowest))
  })

  it('heading follows the current leg (turns at junctions)', () => {
    // A path with a bend must report different headings on its two legs.
    const bent = TRAFFIC.find((t) => t.path.length >= 3)!
    const cum = bent.path.reduce<number[]>(
      (a, p, i) => [...a, i === 0 ? 0 : a[i - 1] + Math.hypot(p.x - bent.path[i - 1].x, p.y - bent.path[i - 1].y)],
      [],
    )
    const total = cum[cum.length - 1]
    // Sample deep inside leg 0 and leg 1 by choosing offsets, time 0.
    const midLeg0 = { ...bent, offset: cum[1] / total / 2 }
    const midLeg1 = { ...bent, offset: (cum[1] + cum[2]) / total / 2 }
    const h0 = trafficPos(midLeg0, 0).heading
    const h1 = trafficPos(midLeg1, 0).heading
    expect(h0).not.toBeCloseTo(h1, 3)
  })

  it('gives every contact a fictional OK- reg, 250–400 kt speed, squawk and TWO turns', () => {
    expect(TRAFFIC.length).toBe(5)
    for (const tr of TRAFFIC) {
      expect(tr.reg).toMatch(/^OK-/)
      expect(tr.speedKts).toBeGreaterThanOrEqual(250)
      expect(tr.speedKts).toBeLessThanOrEqual(400)
      expect(tr.squawk).toMatch(/^\d{4}$/)
      // 4 points = 3 legs = two junction turns (Martin).
      expect(tr.path).toHaveLength(4)
    }
  })

  it('exposes the leg delta so callers can build an aspect-correct heading', () => {
    for (const tr of TRAFFIC) {
      const p = trafficPos(tr, 3)
      expect(Math.hypot(p.segDx, p.segDy)).toBeGreaterThan(0)
      // heading is the fraction-space angle of that same delta.
      expect(p.heading).toBeCloseTo(Math.atan2(p.segDy, p.segDx), 10)
    }
  })
})
