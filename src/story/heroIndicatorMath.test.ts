import { describe, expect, it } from 'vitest'
import { CHAPTERS } from '../data/chapters'
import { buildRuns } from '../canvas/sceneTimeline'
import type { HeroLoadSnapshot } from '../three/heroLoad'
import { HERO_HORIZON, buildHeroWindows, pickHeroIndicator } from './heroIndicatorMath'

const WINDOWS = buildHeroWindows(buildRuns(CHAPTERS))

const snap = (over: Partial<Record<keyof HeroLoadSnapshot, HeroLoadSnapshot['climb']>>): HeroLoadSnapshot => ({
  climb: { phase: 'idle', progress: 0 },
  cruise: { phase: 'idle', progress: 0 },
  desert: { phase: 'idle', progress: 0 },
  patrol: { phase: 'idle', progress: 0 },
  ...over,
})

describe('buildHeroWindows (real chapters)', () => {
  it('yields the four pipelines in story order, flypasts merged', () => {
    expect(WINDOWS.map((w) => w.key)).toEqual(['climb', 'cruise', 'desert', 'patrol'])
  })

  it('windows are the runs ownership spans (±0.5 chapter)', () => {
    const climb = WINDOWS[0]
    expect(climb.end - climb.start).toBeCloseTo(1) // one-chapter run
    const patrol = WINDOWS[3]
    expect(patrol.end - patrol.start).toBeCloseTo(2) // airshow + sunset merged
    for (let i = 1; i < WINDOWS.length; i++) {
      expect(WINDOWS[i].start).toBeGreaterThan(WINDOWS[i - 1].start)
    }
  })
})

describe('pickHeroIndicator', () => {
  const climb = WINDOWS[0]

  it('is quiet when nothing is loading', () => {
    expect(pickHeroIndicator(0, WINDOWS, snap({}))).toBe(null)
    expect(pickHeroIndicator(0, WINDOWS, snap({ climb: { phase: 'ready', progress: 1 } }))).toBe(null)
    expect(pickHeroIndicator(0, WINDOWS, snap({ climb: { phase: 'failed', progress: 0.3 } }))).toBe(null)
  })

  it('narrates the first hero from one scene out, through its whole beat', () => {
    const s = snap({ climb: { phase: 'loading', progress: 0.4 } })
    // The intro promise: on screen a full chapter before the climb owns the frame.
    expect(pickHeroIndicator(climb.start - HERO_HORIZON + 0.01, WINDOWS, s)).toBe('climb')
    expect(pickHeroIndicator(climb.end - 0.01, WINDOWS, s)).toBe('climb')
  })

  it('stays quiet about a hero that is still TWO scenes away', () => {
    const s = snap({ climb: { phase: 'loading', progress: 0.4 } })
    expect(pickHeroIndicator(climb.start - HERO_HORIZON - 0.2, WINDOWS, s)).toBe(null)
  })

  // Martin's Pixel report: standing mid-ch-01 with the climb and the ballet
  // already 3D, the chip still showed the Bagram build at 55 % — a progress
  // bar two scenes out reads as "wait here" when you could safely scroll on.
  it('never narrates a hero two scenes ahead while the nearer beats are ready', () => {
    const s = snap({
      climb: { phase: 'ready', progress: 1 },
      cruise: { phase: 'ready', progress: 1 },
      desert: { phase: 'loading', progress: 0.55 },
    })
    const desert = WINDOWS[2]
    const midClimb = (climb.start + climb.end) / 2
    expect(pickHeroIndicator(midClimb, WINDOWS, s)).toBe(null)
    // ...but it speaks up as soon as the visitor is ONE scene away.
    expect(pickHeroIndicator(desert.start - HERO_HORIZON + 0.01, WINDOWS, s)).toBe('desert')
  })

  it('never narrates a beat the visitor already left', () => {
    const s = snap({ desert: { phase: 'loading', progress: 0.5 } })
    const desert = WINDOWS[2]
    expect(pickHeroIndicator(desert.end + 0.01, WINDOWS, s)).toBe(null)
  })

  it('skips a ready hero and narrates the next loading one in range', () => {
    const s = snap({
      climb: { phase: 'ready', progress: 1 },
      cruise: { phase: 'loading', progress: 0.2 },
    })
    const cruise = WINDOWS[1]
    // Just inside the cruise horizon: the chip hands over to cruise.
    expect(pickHeroIndicator(cruise.start - HERO_HORIZON + 0.01, WINDOWS, s)).toBe('cruise')
    // Far before the horizon: quiet.
    expect(pickHeroIndicator(cruise.start - HERO_HORIZON - 0.5, WINDOWS, s)).toBe(null)
  })

  it('prefers the nearer of two loading heroes', () => {
    const s = snap({
      cruise: { phase: 'loading', progress: 0.5 },
      desert: { phase: 'loading', progress: 0.1 },
    })
    const cruise = WINDOWS[1]
    expect(pickHeroIndicator(cruise.start + 0.1, WINDOWS, s)).toBe('cruise')
  })
})
