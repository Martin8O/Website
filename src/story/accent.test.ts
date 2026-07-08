import { describe, expect, it } from 'vitest'
import { accentAt, mixHex } from './accent'
import { buildRuns } from '../canvas/sceneTimeline'
import { THEME_ACCENT, type Chapter } from '../data/chapters'

describe('mixHex', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff')
  })

  it('mixes channel-wise at the midpoint', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mixHex('#f7931a', '#f7931a', 0.37)).toBe('#f7931a')
  })

  it('clamps t outside 0..1', () => {
    expect(mixHex('#102030', '#405060', -2)).toBe('#102030')
    expect(mixHex('#102030', '#405060', 3)).toBe('#405060')
  })

  it('pads single-digit channels', () => {
    expect(mixHex('#000000', '#0a0a0a', 1)).toBe('#0a0a0a')
  })
})

// A tiny 3-chapter story: two origin chapters, then calm. The scene
// hand-over lives in the last origin chapter's localT (default 0.3..0.7).
const FIXTURE = [
  { theme: 'origin' },
  { theme: 'origin' },
  { theme: 'calm' },
] as unknown as Chapter[]

describe('accentAt', () => {
  const runs = buildRuns(FIXTURE)
  const count = FIXTURE.length

  it('holds the pure theme accent away from boundaries', () => {
    expect(accentAt(0, runs, count)).toBe(THEME_ACCENT.origin)
    expect(accentAt(1.1, runs, count)).toBe(THEME_ACCENT.origin)
    expect(accentAt(2, runs, count)).toBe(THEME_ACCENT.calm)
  })

  it('blends across the scene cross-fade exactly like the canvas', () => {
    // pos 1.5 = midpoint of the default [0.3, 0.7] fade → smoothstep 0.5.
    expect(accentAt(1.5, runs, count)).toBe(
      mixHex(THEME_ACCENT.origin, THEME_ACCENT.calm, 0.5),
    )
    // Inside the fade it has left the base colour; at the end it has fully
    // arrived. (Right AT the fade edge the smoothstep is so small the mix
    // rounds back to the base hex — that flatness is fine, not a bug.)
    expect(accentAt(1.4, runs, count)).not.toBe(THEME_ACCENT.origin)
    expect(accentAt(1.7, runs, count)).toBe(THEME_ACCENT.calm)
  })

  it('respects a per-chapter enterFade override', () => {
    const late = [
      { theme: 'origin' },
      { theme: 'origin' },
      { theme: 'calm', enterFade: [0.56, 0.88] },
    ] as unknown as Chapter[]
    const lateRuns = buildRuns(late)
    // At 1.5 the late fade has not started — still pure origin.
    expect(accentAt(1.5, lateRuns, count)).toBe(THEME_ACCENT.origin)
    expect(accentAt(1.72, lateRuns, count)).not.toBe(THEME_ACCENT.origin)
  })
})
