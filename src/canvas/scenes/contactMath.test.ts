import { describe, expect, it } from 'vitest'
import { TAU, hash1 } from '../toolkit'
import {
  CONTACT,
  DUST,
  STORY_SEGMENTS,
  bloomAlpha,
  bloomReach,
  breath,
  breathWave,
  dust,
  filamentAngle,
  filamentGlow,
  fract,
  petalReach,
  pulse,
  spore,
  storyMix,
} from './contactMath'

describe('fract', () => {
  it('wraps into [0,1) for negatives too', () => {
    expect(fract(1.25)).toBeCloseTo(0.25)
    expect(fract(-0.25)).toBeCloseTo(0.75)
    expect(fract(3)).toBe(0)
  })
})

describe('breath', () => {
  it('stays in [0,1] across many cycles', () => {
    for (let i = 0; i < 300; i++) {
      const b = breath(i * 0.37)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(1)
    }
  })

  it('is periodic in breathPeriod', () => {
    for (const t of [0, 1.3, 4.9, 7.7]) {
      expect(breath(t + CONTACT.breathPeriod)).toBeCloseTo(breath(t), 10)
    }
  })

  it('is near-full at time 0 — the reduced-motion static frame', () => {
    expect(breath(0)).toBeGreaterThan(0.75)
  })

  it('reaches both a full and an empty moment each cycle', () => {
    let min = 1
    let max = 0
    for (let i = 0; i < 200; i++) {
      const b = breath((i / 200) * CONTACT.breathPeriod)
      min = Math.min(min, b)
      max = Math.max(max, b)
    }
    expect(min).toBeLessThan(0.02)
    expect(max).toBeGreaterThan(0.98)
  })

  it('inhales faster than it exhales (asymmetric cycle)', () => {
    // Rise completes inside the inhale fraction; the release takes the rest.
    const rise = CONTACT.inhale * CONTACT.breathPeriod
    const t0 = (1 - CONTACT.breathPhase0) * CONTACT.breathPeriod // phase 0
    expect(breath(t0 + rise)).toBeCloseTo(1, 5)
    expect(breath(t0 + rise + (CONTACT.breathPeriod - rise) / 2)).toBeCloseTo(0.5, 5)
  })
})

describe('breathWave', () => {
  it('is TAU-periodic in angle', () => {
    for (const a of [0.3, 2.1, 4.4]) {
      expect(breathWave(3.3, a + TAU)).toBeCloseTo(breathWave(3.3, a), 10)
    }
  })

  it('different angles breathe out of phase', () => {
    const t = 2.2
    expect(Math.abs(breathWave(t, 0) - breathWave(t, Math.PI / 2))).toBeGreaterThan(0.05)
  })
})

describe('bloom', () => {
  it('reach grows monotonically from the seed to full', () => {
    let prev = -1
    for (let i = 0; i <= 50; i++) {
      const r = bloomReach(i / 50)
      expect(r).toBeGreaterThanOrEqual(prev)
      prev = r
    }
    expect(bloomReach(0)).toBeCloseTo(0.22)
    expect(bloomReach(1)).toBeCloseTo(1)
  })

  it('presence arrives before the reach finishes growing', () => {
    const mid = CONTACT.bloomT0 + 0.22
    expect(bloomAlpha(mid)).toBeCloseTo(1, 5)
    expect(bloomReach(mid)).toBeLessThan(0.7)
  })

  it('is quiet before the bloom window (the dev world still owns the frame)', () => {
    expect(bloomAlpha(CONTACT.bloomT0 - 0.05)).toBe(0)
    expect(bloomReach(0.2)).toBeCloseTo(0.22)
  })
})

describe('petalReach', () => {
  it('is deterministic, clamped to [0.3, 1] and TAU-periodic', () => {
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * TAU
      const r = petalReach(a, 7)
      expect(r).toBe(petalReach(a, 7))
      expect(r).toBeGreaterThanOrEqual(0.45)
      expect(r).toBeLessThanOrEqual(1)
      expect(petalReach(a + TAU, 7)).toBeCloseTo(r, 10)
    }
  })

  it('has real lobes and valleys — never a clean circle', () => {
    let min = 1
    let max = 0
    for (let i = 0; i < 240; i++) {
      const r = petalReach((i / 240) * TAU, 7)
      min = Math.min(min, r)
      max = Math.max(max, r)
    }
    expect(max - min).toBeGreaterThan(0.18)
  })
})

describe('filamentAngle', () => {
  it('fans the full circle with jitter but no collisions', () => {
    const n = CONTACT.filaments
    const angles = Array.from({ length: n }, (_, i) => filamentAngle(i, n))
    for (const a of angles) {
      expect(a).toBeGreaterThanOrEqual(0)
      expect(a).toBeLessThan(TAU)
    }
    const sorted = [...angles].sort((a, b) => a - b)
    // Coverage: no gap wider than 3 nominal steps anywhere on the ring.
    for (let i = 1; i < n; i++) {
      expect(sorted[i] - sorted[i - 1]).toBeLessThan((TAU / n) * 3)
    }
  })
})

describe('filamentGlow', () => {
  it('keeps the centre lit but modest, tips still carrying light', () => {
    // Rev7: no blazing nucleus — the arms own the mass.
    expect(filamentGlow(0)).toBeGreaterThan(0.15)
    expect(filamentGlow(0)).toBeLessThan(0.45)
    expect(filamentGlow(1)).toBeGreaterThan(0.02)
    expect(filamentGlow(1)).toBeLessThan(0.25)
  })

  it('peaks in a band around halfway out the strand', () => {
    let peakS = 0
    let peak = 0
    for (let i = 0; i <= 100; i++) {
      const g = filamentGlow(i / 100)
      if (g > peak) {
        peak = g
        peakS = i / 100
      }
    }
    expect(peakS).toBeGreaterThan(0.35)
    expect(peakS).toBeLessThan(0.75)
    expect(peak).toBeGreaterThan(0.95)
  })
})

describe('spore', () => {
  it('is deterministic and drifts outward through its life', () => {
    const s = spore(4, 2.5)
    expect(s).toEqual(spore(4, 2.5))
    // Pin the same spore at two known phases of its own cycle: invert the
    // hash offset so ph = 0.2 and 0.7 exactly, then the drift must be out.
    const h = hash1(4 * 3.7 + 0.4)
    const at = (ph: number) => spore(4, fract(ph - h) * CONTACT.sporePeriod)
    expect(at(0.7).r).toBeGreaterThan(at(0.2).r)
    for (let i = 0; i < 40; i++) {
      const sp = spore(i, i * 1.3)
      expect(sp.a).toBeGreaterThanOrEqual(0)
      expect(sp.a).toBeLessThanOrEqual(1)
      expect(sp.r).toBeGreaterThanOrEqual(0.7)
      expect(sp.r).toBeLessThanOrEqual(1.8)
    }
  })

  it('fades at both ends of the drift (born + dies invisible)', () => {
    // a = sin²(π·ph) → 0 somewhere in every cycle; scan one full period.
    let min = 1
    for (let i = 0; i < 400; i++) {
      min = Math.min(min, spore(11, i * (CONTACT.sporePeriod / 400)).a)
    }
    expect(min).toBeLessThan(0.01)
  })
})

describe('dust', () => {
  it('is deterministic with all fields in range', () => {
    for (let i = 0; i < 80; i++) {
      const d = dust(i, i * 2.7)
      expect(d).toEqual(dust(i, i * 2.7))
      expect(d.ux).toBeGreaterThanOrEqual(-1.6)
      expect(d.ux).toBeLessThanOrEqual(1.6)
      expect(d.uy).toBeGreaterThanOrEqual(-1.15)
      expect(d.uy).toBeLessThanOrEqual(1.15)
      expect(d.z).toBeGreaterThan(0)
      expect(d.z).toBeLessThanOrEqual(1)
      expect(d.tint).toBeGreaterThanOrEqual(0)
      expect(d.tint).toBeLessThan(1)
    }
  })

  it('drifts toward the camera and recycles after one period', () => {
    const before = dust(7, 3)
    const after = dust(7, 4)
    // Approaching (z falls) unless the mote wrapped to the far plane.
    expect(after.z < before.z || after.z > 0.9).toBe(true)
    const cycled = dust(7, 3 + DUST.period)
    expect(cycled.z).toBeCloseTo(before.z, 6)
    // The plane position never changes — the camera moves, not the mote.
    expect(cycled.ux).toBe(before.ux)
    expect(cycled.uy).toBe(before.uy)
  })
})

describe('storyMix', () => {
  it('anchors segment 0 at the top of the wheel and is TAU-periodic', () => {
    const top = storyMix(-Math.PI / 2)
    expect(top.seg).toBe(0)
    expect(top.t).toBeCloseTo(0, 10)
    for (const a of [0.4, 2.2, 5.1]) {
      const once = storyMix(a)
      const wrapped = storyMix(a + TAU)
      expect(wrapped.seg).toBe(once.seg)
      expect(wrapped.t).toBeCloseTo(once.t, 10)
    }
  })

  it('walks all segments exactly once around the ring, t in [0,1)', () => {
    const seen = new Set<number>()
    let prev = -1
    for (let i = 0; i < 400; i++) {
      const { seg, t } = storyMix(-Math.PI / 2 + (i / 400) * TAU)
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThan(1)
      expect(seg === prev || seg === prev + 1 || (prev === -1 && seg === 0)).toBe(true)
      seen.add(seg)
      prev = seg
    }
    expect(seen.size).toBe(STORY_SEGMENTS)
  })
})

describe('pulse', () => {
  it('is quiet at time 0 (static frame holds no half-born ring)', () => {
    expect(pulse(0).a).toBe(0)
  })

  it('runs a fading front once per period', () => {
    let seenStrong = false
    let seenQuiet = false
    for (let i = 0; i < 100; i++) {
      const p = pulse(i * (CONTACT.pulsePeriod / 100))
      expect(p.r01).toBeGreaterThanOrEqual(0)
      expect(p.r01).toBeLessThanOrEqual(1)
      expect(p.a).toBeGreaterThanOrEqual(0)
      expect(p.a).toBeLessThanOrEqual(1)
      if (p.a > 0.6) seenStrong = true
      if (p.a === 0) seenQuiet = true
    }
    expect(seenStrong).toBe(true)
    expect(seenQuiet).toBe(true)
  })

  it('the front expands while it lives', () => {
    // Find the birth of a pulse and sample forward inside the travel window.
    const birth = (1 - CONTACT.pulsePhase0) * CONTACT.pulsePeriod
    const early = pulse(birth + 0.5)
    const late = pulse(birth + CONTACT.pulseTravel * 0.8)
    expect(early.a).toBeGreaterThan(late.a)
    expect(late.r01).toBeGreaterThan(early.r01)
  })
})
