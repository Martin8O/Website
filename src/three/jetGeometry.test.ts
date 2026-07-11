import { describe, expect, it } from 'vitest'
import { bakeJet, type JetVariant } from './jetGeometry'

const VARIANTS: JetVariant[] = ['l39', 'l159']

/** Multiset key for a vertex, tolerant of float noise and −0. */
const key = (x: number, y: number, z: number): string =>
  `${Math.round(x * 10000) || 0},${Math.round(y * 10000) || 0},${Math.round(z * 10000) || 0}`

describe('bakeJet', () => {
  it('bakes consistent non-indexed triangle buffers for both variants', () => {
    for (const v of VARIANTS) {
      const jet = bakeJet(v)
      expect(jet.positions.length).toBeGreaterThan(0)
      expect(jet.positions.length % 9).toBe(0) // whole flat-shaded triangles
      expect(jet.normals.length).toBe(jet.positions.length)
      expect(jet.colors.length).toBe(jet.positions.length)
    }
  })

  it('is deterministic', () => {
    expect(bakeJet('l39')).toEqual(bakeJet('l39'))
  })

  it('produces finite geometry, unit normals, and 0..1 colors', () => {
    for (const v of VARIANTS) {
      const jet = bakeJet(v)
      for (const value of jet.positions) expect(Number.isFinite(value)).toBe(true)
      for (let i = 0; i < jet.normals.length; i += 3) {
        const len = Math.hypot(jet.normals[i], jet.normals[i + 1], jet.normals[i + 2])
        expect(len).toBeGreaterThan(0.999)
        expect(len).toBeLessThan(1.001)
      }
      for (const c of jet.colors) {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThanOrEqual(1)
      }
    }
  })

  it('spans length 1 nose-to-tail and stays inside sane bounds', () => {
    for (const v of VARIANTS) {
      const jet = bakeJet(v)
      let minZ = Infinity
      let maxZ = -Infinity
      for (let i = 0; i < jet.positions.length; i += 3) {
        expect(Math.abs(jet.positions[i])).toBeLessThanOrEqual(0.45) // span
        expect(Math.abs(jet.positions[i + 1])).toBeLessThanOrEqual(0.25) // height
        minZ = Math.min(minZ, jet.positions[i + 2])
        maxZ = Math.max(maxZ, jet.positions[i + 2])
      }
      expect(minZ).toBeCloseTo(-0.5, 2)
      expect(maxZ).toBeCloseTo(0.5, 2)
    }
  })

  it('is mirror-symmetric across the fuselage plane', () => {
    // Vertex-position symmetry (triangulation diagonals repeat vertices
    // unevenly, so this is a set check, not a count check).
    for (const v of VARIANTS) {
      const jet = bakeJet(v)
      const seen = new Set<string>()
      for (let i = 0; i < jet.positions.length; i += 3) {
        seen.add(key(jet.positions[i], jet.positions[i + 1], jet.positions[i + 2]))
      }
      for (let i = 0; i < jet.positions.length; i += 3) {
        const mirrored = key(-jet.positions[i], jet.positions[i + 1], jet.positions[i + 2])
        expect(seen.has(mirrored), `mirror of vertex ${i / 3} (${v})`).toBe(true)
      }
    }
  })

  it('gives the two types distinct silhouettes (tanks vs rails, canopy)', () => {
    const a = bakeJet('l39')
    const b = bakeJet('l159')
    expect(a.positions.length).not.toBe(b.positions.length)
  })
})
