import { describe, expect, it } from 'vitest'
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

/** Scene-t of scroll step `s` (step 0 = 96 % global, step 5 = 100 %). */
const tAt = (s: number) => DEV.spawnT0 + s * DEV.stepT

describe('windowSpawn', () => {
  it('is 0 before birth and 1 at the very end for every window', () => {
    for (let i = 0; i < DEV.windows; i++) {
      expect(windowSpawn(i, 0)).toBe(0)
      expect(windowSpawn(i, tAt(DEV.windows))).toBe(1)
    }
  })

  it('rises monotonically through a window flight', () => {
    let prev = -1
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const v = windowSpawn(2, t)
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = v
    }
  })

  it("follows Martin's staircase: 1/5 · then 2/5 + 1/4 · then 3/5 + 2/4 + 1/3 …", () => {
    expect(windowSpawn(0, tAt(1))).toBeCloseTo(1 / 5, 6)
    expect(windowSpawn(0, tAt(2))).toBeCloseTo(2 / 5, 6)
    expect(windowSpawn(1, tAt(2))).toBeCloseTo(1 / 4, 6)
    expect(windowSpawn(0, tAt(3))).toBeCloseTo(3 / 5, 6)
    expect(windowSpawn(1, tAt(3))).toBeCloseTo(2 / 4, 6)
    expect(windowSpawn(2, tAt(3))).toBeCloseTo(1 / 3, 6)
    expect(windowSpawn(3, tAt(4))).toBeCloseTo(1 / 2, 6)
    // The fifth card leaps in its single final step.
    expect(windowSpawn(4, tAt(4))).toBe(0)
    expect(windowSpawn(4, tAt(5))).toBe(1)
  })

  it('lands all five together at 100 %, none earlier', () => {
    for (let i = 0; i < DEV.windows; i++) {
      expect(windowSpawn(i, tAt(4.9))).toBeLessThan(1)
      expect(windowSpawn(i, tAt(5))).toBe(1)
    }
  })

  it('staggers strictly among the born windows', () => {
    const t = tAt(2.5)
    expect(windowSpawn(0, t)).toBeGreaterThan(windowSpawn(1, t))
    expect(windowSpawn(1, t)).toBeGreaterThan(windowSpawn(2, t))
    expect(windowSpawn(3, t)).toBe(0)
  })
})

describe('spawnFlash', () => {
  it('is zero outside the birth burst and peaks mid-burst', () => {
    expect(spawnFlash(0, tAt(0))).toBe(0)
    expect(spawnFlash(0, tAt(0.6))).toBe(0)
    expect(spawnFlash(0, tAt(0.25))).toBeCloseTo(1, 6)
    expect(spawnFlash(2, tAt(2.25))).toBeCloseTo(1, 6)
    expect(spawnFlash(0, 1)).toBe(0)
  })
})

describe('easeOutBack', () => {
  it('pins the endpoints and overshoots between', () => {
    expect(easeOutBack(0)).toBeCloseTo(0, 6)
    expect(easeOutBack(1)).toBeCloseTo(1, 6)
    // Somewhere past the midpoint it exceeds 1 (the pop).
    let over = 0
    for (let u = 0.5; u < 1; u += 0.02) over = Math.max(over, easeOutBack(u))
    expect(over).toBeGreaterThan(1)
  })

  it('clamps its input', () => {
    expect(easeOutBack(-1)).toBeCloseTo(0, 6)
    expect(easeOutBack(2)).toBeCloseTo(1, 6)
  })
})

describe('floorPoint', () => {
  const g: FloorGeom = { horizonY: 300, h: 800, cx: 500, spread: 900 }

  it('collapses to the vanishing point at the horizon', () => {
    const p = floorPoint(0.8, 0, g)
    expect(p.y).toBeCloseTo(g.horizonY, 6)
    expect(p.x).toBeCloseTo(g.cx, 6) // all columns converge on cx at d=0
  })

  it('reaches the near edge at full depth', () => {
    const p = floorPoint(1, 1, g)
    expect(p.y).toBeCloseTo(g.h, 6)
    expect(p.x).toBeCloseTo(g.cx + g.spread, 6)
  })

  it('descends monotonically from horizon to near edge', () => {
    let prev = -1
    for (let d = 0; d <= 1.0001; d += 0.05) {
      const y = floorPoint(0, d, g).y
      expect(y).toBeGreaterThanOrEqual(prev - 1e-9)
      prev = y
    }
  })

  it('spreads columns wider as they near the viewer', () => {
    const far = floorPoint(1, 0.3, g).x - g.cx
    const near = floorPoint(1, 0.9, g).x - g.cx
    expect(near).toBeGreaterThan(far)
  })
})

describe('corePulse', () => {
  it('stays within 0..1 and glows at time 0', () => {
    expect(corePulse(0)).toBeGreaterThan(0.9)
    for (let time = 0; time < 12; time += 0.13) {
      const v = corePulse(time)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('repeats on its period', () => {
    expect(corePulse(0.37)).toBeCloseTo(corePulse(0.37 + DEV.pulsePeriod), 6)
  })
})

describe('streamPhase', () => {
  it('stays in [0,1) and is deterministic', () => {
    for (let i = 0; i < 20; i++) {
      const v = streamPhase(i, 3.2)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
      expect(streamPhase(i, 3.2)).toBe(v)
    }
  })

  it('advances with time', () => {
    expect(streamPhase(4, 0)).not.toBe(streamPhase(4, 0.5))
  })
})

describe('lensWarp', () => {
  const C = { x: 500, y: 300 }

  it('is the identity far from the core, at the core, and with r <= 0', () => {
    expect(lensWarp(500 + 400, 300, C.x, C.y, 100, 0.4, 0.4)).toEqual({ x: 900, y: 300 })
    expect(lensWarp(C.x, C.y, C.x, C.y, 100, 0.4, 0.4)).toEqual({ x: C.x, y: C.y })
    expect(lensWarp(510, 310, C.x, C.y, 0, 0.4, 0.4)).toEqual({ x: 510, y: 310 })
  })

  it('pulls nearby points toward the core (space pinches)', () => {
    const p = lensWarp(C.x + 50, C.y, C.x, C.y, 100, 0.4)
    const d = Math.hypot(p.x - C.x, p.y - C.y)
    expect(d).toBeLessThan(50)
    expect(d).toBeGreaterThan(0)
  })

  it('pulls proportionally harder the closer the point is', () => {
    const frac = (dist: number) => {
      const p = lensWarp(C.x + dist, C.y, C.x, C.y, 100, 0.4)
      return Math.hypot(p.x - C.x, p.y - C.y) / dist
    }
    // Remaining-distance fraction is smaller (stronger pull) nearer the core.
    expect(frac(50)).toBeLessThan(frac(100))
    expect(frac(100)).toBeLessThan(frac(200))
  })

  it('swirl rotates without changing the distance when k = 0', () => {
    const p = lensWarp(C.x + 60, C.y, C.x, C.y, 100, 0, 0.5)
    expect(Math.hypot(p.x - C.x, p.y - C.y)).toBeCloseTo(60, 6)
    expect(p.y).not.toBeCloseTo(C.y, 3)
  })

  it('never flips a point past the core for k < 1', () => {
    for (let d = 5; d <= 300; d += 10) {
      const p = lensWarp(C.x + d, C.y, C.x, C.y, 100, 0.45)
      // The warped point stays on the same side (positive x offset).
      expect(p.x - C.x).toBeGreaterThan(0)
    }
  })
})

describe('windowLayout', () => {
  it('returns one slot per window, deterministically', () => {
    const a = windowLayout(1.78)
    const b = windowLayout(1.78)
    expect(a).toHaveLength(DEV.windows)
    expect(a).toEqual(b)
  })

  it('keeps every window clear of the central card box', () => {
    // Card lives roughly in x 0.30–0.70, y 0.28–0.72; each window's centre
    // must sit outside that box (appro. window half-heights are small).
    for (const s of windowLayout(1.78)) {
      const inX = s.x > 0.3 && s.x < 0.7
      const inY = s.y > 0.28 && s.y < 0.72
      expect(inX && inY).toBe(false)
    }
  })

  it('pushes the flanks outward on wider viewports', () => {
    const narrow = windowLayout(1.3)
    const wide = windowLayout(2.4)
    // The lower-left window (x < 0.5) moves further left on a wide screen.
    expect(wide[3].x).toBeLessThan(narrow[3].x)
    // The lower-right window (x > 0.5) moves further right.
    expect(wide[4].x).toBeGreaterThan(narrow[4].x)
  })

  it('stays on-screen', () => {
    for (const s of windowLayout(2.4)) {
      expect(s.x).toBeGreaterThan(0)
      expect(s.x).toBeLessThan(1)
      expect(s.y).toBeGreaterThan(0)
      expect(s.y).toBeLessThan(1)
    }
  })
})
