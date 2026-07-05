import { describe, expect, it } from 'vitest'
import {
  GRADUATION,
  TOUCHDOWN,
  cloudPunch,
  graduationAt,
  helixPoint,
  landingPose,
  sunArc,
} from './skyMath'

describe('graduationAt', () => {
  it('starts on the ultralight with no pulse', () => {
    expect(graduationAt(0)).toEqual({ index: 0, pulse: 0 })
    expect(graduationAt(0.05).index).toBe(0)
  })

  it('steps up to the L-39C in ladder order — the L-159 belongs to cruise', () => {
    const indices = [0, 0.15, 0.29, 1].map((t) => graduationAt(t).index)
    expect(indices).toEqual([0, 1, 2, 2])
    expect(GRADUATION[GRADUATION.length - 1].craft).toBe('l39')
  })

  it('never steps down as t grows', () => {
    let prev = 0
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const { index } = graduationAt(t)
      expect(index).toBeGreaterThanOrEqual(prev)
      prev = index
    }
  })

  it('pulses at each swap and decays shortly after', () => {
    for (const rung of GRADUATION.slice(1)) {
      expect(graduationAt(rung.at).pulse).toBe(1)
      expect(graduationAt(rung.at + 0.08).pulse).toBe(0)
    }
  })

  it('completes the ladder before the cloud-punch begins', () => {
    const lastSwap = GRADUATION[GRADUATION.length - 1].at
    expect(cloudPunch(lastSwap).fog).toBe(0)
  })
})

describe('cloudPunch', () => {
  it('is clear below and above the layer, white inside', () => {
    expect(cloudPunch(0.2).fog).toBe(0)
    expect(cloudPunch(0.54).fog).toBe(1)
    expect(cloudPunch(0.8).fog).toBe(0)
  })

  it('cuts out of the white-out hard — no long dissolve', () => {
    // Full white right up to the cut point, gone within a few % of scroll.
    expect(cloudPunch(0.6).fog).toBe(1)
    expect(cloudPunch(0.63).fog).toBe(0)
  })

  it('swaps the world entirely inside the white-out window', () => {
    // Wherever the swap is in progress, fog must already be heavy.
    for (let t = 0; t <= 1.0001; t += 0.005) {
      const { fog, above } = cloudPunch(t)
      if (above > 0 && above < 1) expect(fog).toBeGreaterThan(0.85)
    }
    expect(cloudPunch(0.4).above).toBe(0)
    expect(cloudPunch(0.62).above).toBe(1)
  })

  it('approach rises monotonically toward the deck', () => {
    let prev = -1
    for (let t = 0; t <= 0.44; t += 0.02) {
      const { approach } = cloudPunch(t)
      expect(approach).toBeGreaterThanOrEqual(prev)
      prev = approach
    }
    expect(cloudPunch(0).approach).toBe(0)
    expect(cloudPunch(0.44).approach).toBe(1)
  })
})

describe('helixPoint', () => {
  it('keeps the two jets on opposite sides of the axis, same height', () => {
    for (const turns of [0, 0.13, 0.5, 0.77, 1.4]) {
      const a = helixPoint(turns, 0)
      const b = helixPoint(turns, Math.PI)
      expect(a.x).toBeCloseTo(-b.x, 10)
      expect(a.z).toBeCloseTo(-b.z, 10)
    }
  })

  it('stays on the unit cylinder and alternates near/far with the turns', () => {
    for (const turns of [0, 0.2, 0.6, 1.1]) {
      const p = helixPoint(turns, 0)
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(1, 10)
    }
    expect(helixPoint(0, 0).z).toBeCloseTo(1, 10) // starts nearest
    expect(helixPoint(0.5, 0).z).toBeCloseTo(-1, 10) // half a turn → far side
  })
})

describe('sunArc', () => {
  it('is continuous — no jump anywhere along the section', () => {
    for (let p = 1.8; p <= 6.6; p += 0.01) {
      const a = sunArc(p)
      const b = sunArc(p + 0.01)
      expect(Math.abs(b.x - a.x)).toBeLessThan(0.01)
      expect(Math.abs(b.y - a.y)).toBeLessThan(0.01)
    }
  })

  it('never stalls mid-section: x strictly grows between the endpoints', () => {
    for (let p = 2.05; p < 6.25; p += 0.05) {
      expect(sunArc(p + 0.05).x).toBeGreaterThan(sunArc(p).x)
    }
  })

  it('starts upper-left, hands over at the seams, sets low right', () => {
    expect(sunArc(2)).toEqual({ x: 0.32, y: 0.15 })
    expect(sunArc(2.5)).toEqual({ x: 0.44, y: 0.15 })
    expect(sunArc(5.5)).toEqual({ x: 0.76, y: 0.38 })
    // Fully set: below the 0.70 horizon by the end of the landing roll.
    expect(sunArc(6.4).y).toBeGreaterThan(0.7)
  })
})

describe('landingPose', () => {
  it('descends monotonically to the runway and stays down', () => {
    let prev = Infinity
    for (let t = 0; t < TOUCHDOWN; t += 0.01) {
      const { alt } = landingPose(t)
      expect(alt).toBeLessThanOrEqual(prev)
      prev = alt
    }
    expect(landingPose(0).alt).toBe(1)
    for (let t = TOUCHDOWN; t <= 1.0001; t += 0.05) {
      expect(landingPose(t).alt).toBe(0)
    }
  })

  it('moves forward continuously through touchdown', () => {
    let prev = -Infinity
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const { x } = landingPose(t)
      expect(x).toBeGreaterThanOrEqual(prev)
      prev = x
    }
    // No jump at the touchdown seam.
    expect(landingPose(TOUCHDOWN - 1e-9).x).toBeCloseTo(0, 6)
    expect(landingPose(TOUCHDOWN).x).toBeCloseTo(0, 6)
  })

  it('rolls out to a stop, nose settling', () => {
    expect(landingPose(1).speed).toBe(0)
    expect(landingPose(1).pitch).toBe(0)
    expect(landingPose(TOUCHDOWN).pitch).toBeGreaterThan(0)
  })
})
