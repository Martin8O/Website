import { describe, expect, it } from 'vitest'
import {
  STARFIELDS,
  contactStarPresence,
  genStars,
  originStarPresence,
  starPresence,
} from './starfieldMath'

const ORIGIN = STARFIELDS.origin!
const CONTACT = STARFIELDS.contact!

describe('genStars', () => {
  it('bakes buffers of the right shape', () => {
    const s = genStars(ORIGIN)
    expect(s.positions.length).toBe(ORIGIN.count * 3)
    expect(s.colors.length).toBe(ORIGIN.count * 3)
    expect(s.sizes.length).toBe(ORIGIN.count)
    expect(s.phases.length).toBe(ORIGIN.count)
  })

  it('is deterministic — same seed, same sky', () => {
    const a = genStars(CONTACT)
    const b = genStars(CONTACT)
    expect(a.positions).toEqual(b.positions)
    expect(a.colors).toEqual(b.colors)
    expect(a.sizes).toEqual(b.sizes)
  })

  it('keeps every star inside the view cone and depth band', () => {
    const s = genStars(ORIGIN)
    for (let i = 0; i < ORIGIN.count; i++) {
      const x = s.positions[i * 3]
      const y = s.positions[i * 3 + 1]
      const z = s.positions[i * 3 + 2]
      const dist = -z
      expect(dist).toBeGreaterThanOrEqual(ORIGIN.near)
      expect(dist).toBeLessThanOrEqual(ORIGIN.far)
      expect(Math.abs(x)).toBeLessThanOrEqual(ORIGIN.tanX * dist + 1e-6)
      expect(Math.abs(y)).toBeLessThanOrEqual(ORIGIN.tanY * dist + 1e-6)
    }
  })

  it('bakes finite, positive sizes and 0..1 colors/phases', () => {
    const s = genStars(CONTACT)
    for (let i = 0; i < CONTACT.count; i++) {
      expect(s.sizes[i]).toBeGreaterThan(0)
      expect(s.sizes[i]).toBeLessThanOrEqual(CONTACT.sizeMax * CONTACT.anchorBoost + 1e-6)
      expect(s.phases[i]).toBeGreaterThanOrEqual(0)
      expect(s.phases[i]).toBeLessThan(1)
    }
    for (const c of s.colors) {
      expect(c).toBeGreaterThanOrEqual(0)
      expect(c).toBeLessThanOrEqual(1)
    }
  })
})

describe('presence curves', () => {
  it('origin: full night at the start, dead once the dawn brightens', () => {
    expect(originStarPresence(0)).toBe(1)
    expect(originStarPresence(0.1)).toBeGreaterThan(0.95)
    // 2D dawn is golden morning by mid-run — the deep stars must be gone.
    expect(originStarPresence(0.6)).toBeLessThan(0.1)
    expect(originStarPresence(1)).toBe(0)
  })

  it('origin: monotonically yields to daylight', () => {
    let prev = originStarPresence(0)
    for (let t = 0.05; t <= 1.001; t += 0.05) {
      const cur = originStarPresence(t)
      expect(cur).toBeLessThanOrEqual(prev + 1e-9)
      prev = cur
    }
  })

  it('contact: arrives ahead of the galaxy bloom (bloomT0 = 0.44) and holds', () => {
    expect(contactStarPresence(0)).toBe(0)
    expect(contactStarPresence(0.44)).toBe(1)
    expect(contactStarPresence(1)).toBe(1)
  })

  it('dispatches by theme; unregistered themes stay dark', () => {
    expect(starPresence('origin', 0)).toBe(1)
    expect(starPresence('contact', 1)).toBe(1)
    expect(starPresence('sky', 0.5)).toBe(0)
    expect(starPresence('dev', 0.5)).toBe(0)
  })
})
