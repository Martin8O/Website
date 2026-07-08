import { describe, it, expect } from 'vitest'
import {
  VH_PER_CHAPTER,
  trackHeightVh,
  chapterPosition,
  resolveTimeline,
  nearestChapter,
  activeEra,
  cardOpacity,
  cardOpacityWindowed,
} from './timeline'
import { CHAPTERS } from './data/chapters'

describe('trackHeightVh', () => {
  it('scales linearly with chapter count', () => {
    expect(trackHeightVh(10)).toBe(10 * VH_PER_CHAPTER)
    expect(trackHeightVh(1)).toBe(VH_PER_CHAPTER)
  })
  it('never collapses below one screen of travel', () => {
    expect(trackHeightVh(0)).toBe(VH_PER_CHAPTER)
  })
})

describe('chapterPosition', () => {
  it('maps progress 0..1 across the full chapter range', () => {
    expect(chapterPosition(0, 5)).toBe(0)
    expect(chapterPosition(1, 5)).toBe(4)
    expect(chapterPosition(0.5, 5)).toBe(2)
  })
  it('clamps out-of-range progress', () => {
    expect(chapterPosition(-1, 5)).toBe(0)
    expect(chapterPosition(2, 5)).toBe(4)
  })
  it('parks on the single chapter when count is 1', () => {
    expect(chapterPosition(0.7, 1)).toBe(0)
  })
})

describe('resolveTimeline', () => {
  it('starts in chapter 0 at localT 0', () => {
    expect(resolveTimeline(0, 5)).toEqual({ pos: 0, index: 0, localT: 0 })
  })
  it('ends in the last chapter', () => {
    const { index, localT } = resolveTimeline(1, 5)
    expect(index).toBe(4)
    expect(localT).toBe(0)
  })
  it('reports index + fractional localT mid-chapter', () => {
    // 5 chapters -> pos = 0.375 * 4 = 1.5 -> index 1, halfway through
    const { index, localT } = resolveTimeline(0.375, 5)
    expect(index).toBe(1)
    expect(localT).toBeCloseTo(0.5, 5)
  })
})

describe('nearestChapter', () => {
  it('rounds to the closest chapter for the HUD', () => {
    expect(nearestChapter(0, 5)).toBe(0)
    expect(nearestChapter(1, 5)).toBe(4)
    // pos = 0.4 * 4 = 1.6 -> rounds to 2
    expect(nearestChapter(0.4, 5)).toBe(2)
  })
})

describe('cardOpacity', () => {
  it('is fully opaque at its own center', () => {
    expect(cardOpacity(3, 3)).toBe(1)
  })
  it('fades to zero beyond the falloff', () => {
    expect(cardOpacity(0, 3)).toBe(0)
    expect(cardOpacity(5, 3)).toBe(0)
  })
  it('is symmetric around the center', () => {
    expect(cardOpacity(2.7, 3)).toBeCloseTo(cardOpacity(3.3, 3), 10)
  })
})

describe('cardOpacityWindowed', () => {
  // The Selfhealing shape: full from index-0.12 to index+0.47.
  const FULL = [-0.12, 0.47] as const

  it('holds at FULL strength across the whole window', () => {
    expect(cardOpacityWindowed(6.88, 7, FULL)).toBe(1)
    expect(cardOpacityWindowed(7, 7, FULL)).toBe(1)
    expect(cardOpacityWindowed(7.47, 7, FULL)).toBe(1)
  })

  it('is gone just outside the eased edges', () => {
    expect(cardOpacityWindowed(6.7, 7, FULL)).toBe(0)
    expect(cardOpacityWindowed(7.61, 7, FULL)).toBe(0)
  })

  it('eases through the edges monotonically', () => {
    const mid = cardOpacityWindowed(7.535, 7, FULL)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1)
    expect(cardOpacityWindowed(7.5, 7, FULL)).toBeGreaterThan(mid)
  })
})

describe('activeEra', () => {
  // Six evenly-spaced chapters (span = 5); default midpoints at 0.1, 0.3, 0.5…
  const plain = [
    { era: '' }, // intro, no era
    { era: 'A' },
    { era: 'B' },
    { era: 'C' },
    { era: 'D' },
    { era: 'E' },
  ]
  it('reproduces nearest-chapter switch points with no overrides', () => {
    expect(activeEra(0.0, plain)).toBe('') // before A's 0.1 midpoint
    expect(activeEra(0.2, plain)).toBe('A') // A active 0.1–0.3
    expect(activeEra(0.35, plain)).toBe('B') // B active 0.3–0.5
    expect(activeEra(1.0, plain)).toBe('E')
  })
  it('honours an eraFrom override, holding the prior era until it', () => {
    const over = [{ era: 'A' }, { era: 'B', eraFrom: 0.585 }, { era: 'C' }]
    expect(activeEra(0.58, over)).toBe('A') // B held back past its 0.25 midpoint
    expect(activeEra(0.585, over)).toBe('B') // flips exactly at the override
  })
  it('drives the real story eras — L-159 label at 24 %, sunset at 59 %', () => {
    const en = CHAPTERS
    const eraOf = (id: string) => en.find((c) => c.id === id)?.era
    expect(activeEra(0.235, en)).toBe(eraOf('sky-climb')) // still the Decision label
    expect(activeEra(0.24, en)).toBe(eraOf('sky-cruise')) // "2005–2010" as the L-159 leads
    expect(activeEra(0.58, en)).toBe(eraOf('sky-airshow')) // "2016–2017" holds through 58 %
    expect(activeEra(0.59, en)).toBe(eraOf('sky-sunset')) // "2020–2026" from 59 %
  })
})

describe('chapter data integrity', () => {
  it('has chapters to tell the story', () => {
    expect(CHAPTERS.length).toBeGreaterThan(0)
  })
  it('gives every chapter a unique id', () => {
    const ids = CHAPTERS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('sets a sky variant exactly on sky chapters', () => {
    for (const c of CHAPTERS) {
      if (c.theme === 'sky') expect(c.sky).toBeTruthy()
      else expect(c.sky).toBeUndefined()
    }
  })
})
