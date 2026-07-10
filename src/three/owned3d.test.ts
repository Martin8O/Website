import { describe, expect, it } from 'vitest'
import type { Theme } from '../data/chapters'
import { OWNED_3D, paints2D } from './owned3d'

const ALL_THEMES: Theme[] = ['origin', 'sky', 'calm', 'bitcoin', 'dev', 'offer', 'contact']

describe('paints2D', () => {
  it('ships with an EMPTY owned set — no scene has flipped to 3D-owned', () => {
    expect(OWNED_3D.size).toBe(0)
  })

  it('in 2d mode the 2D stage paints everything, whatever is owned', () => {
    const owned = new Set<Theme>(['contact'])
    for (const theme of ALL_THEMES) {
      expect(paints2D(theme, '2d', owned)).toBe(true)
    }
  })

  it('in 3d mode only owned themes are skipped', () => {
    const owned = new Set<Theme>(['contact'])
    expect(paints2D('contact', '3d', owned)).toBe(false)
    for (const theme of ALL_THEMES.filter((t) => t !== 'contact')) {
      expect(paints2D(theme, '3d', owned)).toBe(true)
    }
  })

  it('with the shipped set, 3d mode still paints everything', () => {
    for (const theme of ALL_THEMES) {
      expect(paints2D(theme, '3d')).toBe(true)
    }
  })
})
