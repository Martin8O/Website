import { afterEach, describe, expect, it } from 'vitest'
import type { Sky, Theme } from '../data/chapters'
import { HERO_3D, OWNED_3D, paints2D, paintsHero2D, setHero3DReady } from './owned3d'

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

describe('paintsHero2D (the hero-level flip, E3b)', () => {
  const ALL_SKIES: Sky[] = ['climb', 'cruise', 'desert', 'airshow', 'sunset']

  afterEach(() => {
    // readiness is module state — leave it as the site boots: not ready
    for (const sky of ALL_SKIES) setHero3DReady(sky, false)
  })

  it('ships with the climb + cruise flipped (cruise = the ballet corkscrew)', () => {
    expect([...HERO_3D].sort()).toEqual(['climb', 'cruise'])
  })

  it('keeps the 2D hero until the 3D scene reports READY', () => {
    // chunk still loading / GLB fetch failed → the 2D hero must keep flying
    expect(paintsHero2D('climb', '3d')).toBe(true)
    setHero3DReady('climb', true)
    expect(paintsHero2D('climb', '3d')).toBe(false)
    // unmount (reduced-motion flip mid-session) hands the hero straight back
    setHero3DReady('climb', false)
    expect(paintsHero2D('climb', '3d')).toBe(true)
  })

  it('never touches 2d mode, non-flipped moods, or non-sky themes', () => {
    setHero3DReady('climb', true)
    setHero3DReady('cruise', true)
    expect(paintsHero2D('climb', '2d')).toBe(true)
    expect(paintsHero2D('cruise', '2d')).toBe(true)
    expect(paintsHero2D(undefined, '3d')).toBe(true)
    for (const sky of ALL_SKIES.filter((s) => !HERO_3D.has(s))) {
      expect(paintsHero2D(sky, '3d')).toBe(true)
    }
  })
})
