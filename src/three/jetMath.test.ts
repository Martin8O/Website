import { describe, expect, it } from 'vitest'
import { createPose } from './flightMath'
import {
  JET_FLIGHTS,
  bakeRibbon,
  flightEnvelope,
  flightProgress,
  jetPoseAt,
  rollAt,
  type JetFlightSpec,
} from './jetMath'

const ALL_FLIGHTS = Object.values(JET_FLIGHTS).flat()

const SPEC: JetFlightSpec = {
  id: 'test',
  variant: 'l39',
  size: 1,
  window: [0.2, 0.8],
  fadeIn: 0.1,
  fadeOut: 0.1,
  stops: [
    [0, 0, 0],
    [1, 1, -4],
    [2, 0, -8],
    [3, -1, -12],
  ],
  roll: [
    [0, 0],
    [0.5, 1],
    [1, 0.5],
  ],
  phase: 0,
}

describe('flightEnvelope / flightProgress', () => {
  it('is zero outside the window, full inside, eased at the edges', () => {
    expect(flightEnvelope(SPEC, 0.1)).toBe(0)
    expect(flightEnvelope(SPEC, 0.2)).toBe(0)
    expect(flightEnvelope(SPEC, 0.5)).toBe(1)
    expect(flightEnvelope(SPEC, 0.8)).toBe(0)
    expect(flightEnvelope(SPEC, 0.95)).toBe(0)
    expect(flightEnvelope(SPEC, 0.25)).toBeGreaterThan(0)
    expect(flightEnvelope(SPEC, 0.25)).toBeLessThan(1)
  })

  it('progress maps the window onto 0..1, clamped', () => {
    expect(flightProgress(SPEC, 0.0)).toBe(0)
    expect(flightProgress(SPEC, 0.2)).toBe(0)
    expect(flightProgress(SPEC, 0.5)).toBeCloseTo(0.5, 10)
    expect(flightProgress(SPEC, 0.8)).toBe(1)
    expect(flightProgress(SPEC, 1.5)).toBe(1)
  })
})

describe('story hard gates (the choreography table)', () => {
  it('climb has no parametric flights — the GLB heroes own that window', () => {
    // E3b: the climb is flown by the REAL aircraft of the authored Part-1
    // sequence (climbMath); a parametric pass may not share its sky.
    expect(JET_FLIGHTS.climb).toBeUndefined()
  })

  it('sunset farewell is gone before the belly sweep blacks the screen', () => {
    // LANDING.sweepIn = 0.53 — the landing owns the frame from there. (And
    // the scene only ENTERS at tRaw ≈ 0.26, so windows start after that.)
    for (const f of JET_FLIGHTS.sunset!) {
      expect(f.window[0], f.id).toBeGreaterThanOrEqual(0.26)
      expect(f.window[1], f.id).toBeLessThanOrEqual(0.5)
      expect(flightEnvelope(f, 0.52), f.id).toBe(0)
      expect(flightEnvelope(f, 0.7), f.id).toBe(0)
    }
  })

  it('airshow passes finish before the 2D farewell flares (tRaw 0.995+)', () => {
    for (const f of JET_FLIGHTS.airshow!) {
      expect(f.window[1], f.id).toBeLessThanOrEqual(0.9)
      expect(flightEnvelope(f, 0.95), f.id).toBe(0)
    }
  })

  it('desert has no flights — the empty sky is the story', () => {
    expect(JET_FLIGHTS.desert).toBeUndefined()
  })

  it('every window is well-formed and fades fit inside it', () => {
    for (const f of ALL_FLIGHTS) {
      expect(f.window[1], f.id).toBeGreaterThan(f.window[0])
      expect(f.fadeIn + f.fadeOut, f.id).toBeLessThan(f.window[1] - f.window[0])
      expect(f.stops.length, f.id).toBeGreaterThanOrEqual(2)
    }
  })
})

describe('jetPoseAt', () => {
  it('passes through every stop at its grid parameter', () => {
    const pose = createPose()
    const n = SPEC.stops.length
    for (let k = 0; k < n; k++) {
      jetPoseAt(SPEC, k / (n - 1), pose)
      expect(pose.x).toBeCloseTo(SPEC.stops[k][0], 6)
      expect(pose.y).toBeCloseTo(SPEC.stops[k][1], 6)
      expect(pose.z).toBeCloseTo(SPEC.stops[k][2], 6)
    }
  })

  it('keeps the forward unit-length and the path continuous', () => {
    const a = createPose()
    const b = createPose()
    for (let i = 0; i <= 100; i++) {
      const s = i / 100
      jetPoseAt(SPEC, s, a)
      const len = Math.hypot(a.fx, a.fy, a.fz)
      expect(len).toBeGreaterThan(0.999)
      expect(len).toBeLessThan(1.001)
      if (i > 0) {
        jetPoseAt(SPEC, s - 0.01, b)
        const step = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
        expect(step).toBeLessThan(0.5) // no teleports across the whole path
      }
    }
  })

  it('clamps outside 0..1', () => {
    const pose = createPose()
    jetPoseAt(SPEC, -1, pose)
    expect(pose.x).toBeCloseTo(SPEC.stops[0][0], 6)
    jetPoseAt(SPEC, 2, pose)
    expect(pose.x).toBeCloseTo(SPEC.stops[SPEC.stops.length - 1][0], 6)
  })
})

describe('rollAt', () => {
  it('hits keyframes exactly and lerps between them', () => {
    expect(rollAt(SPEC, 0)).toBe(0)
    expect(rollAt(SPEC, 0.5)).toBe(1)
    expect(rollAt(SPEC, 1)).toBe(0.5)
    expect(rollAt(SPEC, 0.25)).toBeCloseTo(0.5, 10)
    expect(rollAt(SPEC, 0.75)).toBeCloseTo(0.75, 10)
  })

  it('clamps beyond the keyframe range and defaults to 0 without keys', () => {
    expect(rollAt(SPEC, -0.5)).toBe(0)
    expect(rollAt(SPEC, 1.5)).toBe(0.5)
    expect(rollAt({ ...SPEC, roll: undefined }, 0.5)).toBe(0)
  })
})

describe('bakeRibbon', () => {
  it('bakes a well-formed strip: pairs, ascending progress, unit tangents', () => {
    const r = bakeRibbon(SPEC, 48)
    expect(r.centers.length).toBe(48 * 2 * 3)
    expect(r.ts.length).toBe(48 * 2)
    expect(r.indices.length).toBe(47 * 6)
    for (let i = 0; i < 48; i++) {
      expect(r.ts[i * 2]).toBe(r.ts[i * 2 + 1]) // pair shares progress
      if (i > 0) expect(r.ts[i * 2]).toBeGreaterThan(r.ts[(i - 1) * 2])
      expect(r.sides[i * 2]).toBe(1)
      expect(r.sides[i * 2 + 1]).toBe(-1)
    }
    expect(r.ts[0]).toBe(0)
    expect(r.ts[r.ts.length - 1]).toBe(1)
    for (let i = 0; i < r.tangents.length; i += 3) {
      const len = Math.hypot(r.tangents[i], r.tangents[i + 1], r.tangents[i + 2])
      expect(len).toBeGreaterThan(0.999)
      expect(len).toBeLessThan(1.001)
    }
    for (const idx of r.indices) expect(idx).toBeLessThan(48 * 2)
  })
})
