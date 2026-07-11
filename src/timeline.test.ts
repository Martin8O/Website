import { describe, it, expect } from 'vitest'
import {
  VH_PER_CHAPTER,
  trackHeightVh,
  chapterPosition,
  buildChapterWeights,
  posFromProgress,
  progressFromPos,
  resolveTimeline,
  nearestChapter,
  activeEra,
  cardOpacity,
  cardOpacityWindowed,
} from './timeline'
import { CHAPTERS, CHAPTER_WEIGHTS, EXTRA_ERAS } from './data/chapters'

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
  it('drives the real story eras — L-39 at 21 %, L-159 at 26 %, sunset at 57 %', () => {
    // The real story rides the WEIGHTED map (climb scrollWeight 2).
    const en = CHAPTERS
    const eraOf = (id: string) => en.find((c) => c.id === id)?.era
    expect(activeEra(0.16, en, EXTRA_ERAS, CHAPTER_WEIGHTS)).toBe(eraOf('sky-climb'))
    expect(activeEra(0.22, en, EXTRA_ERAS, CHAPTER_WEIGHTS)).toBe('2005–2012 · L-39') // pos 2.0 stop
    expect(activeEra(0.27, en, EXTRA_ERAS, CHAPTER_WEIGHTS)).toBe(eraOf('sky-cruise')) // pos 2.3
    expect(activeEra(0.56, en, EXTRA_ERAS, CHAPTER_WEIGHTS)).toBe(eraOf('sky-airshow')) // holds to 57 %
    expect(activeEra(0.58, en, EXTRA_ERAS, CHAPTER_WEIGHTS)).toBe(eraOf('sky-sunset'))
    // The mission chapter (09) carries no era of its own — the HUD keeps
    // dev's "from 2026" across it until the finale's "now".
    expect(activeEra(0.9, en, EXTRA_ERAS, CHAPTER_WEIGHTS)).toBe(eraOf('dev-explosion'))
    expect(activeEra(0.96, en, EXTRA_ERAS, CHAPTER_WEIGHTS)).toBe(eraOf('contact-now'))
  })
})

describe('scroll weights (the climb stretch, E3b)', () => {
  it('bakes the real story to total 12 (climb doubles its unit span)', () => {
    expect(CHAPTER_WEIGHTS.total).toBeCloseTo(12, 10)
    expect(CHAPTER_WEIGHTS.w[2]).toBe(2)
  })

  it('maps the knots of the climb span exactly', () => {
    // climb owns pos [1.5, 2.5]; weight 2 → progress [1.5/12, 3.5/12]
    expect(progressFromPos(1.5, CHAPTER_WEIGHTS)).toBeCloseTo(1.5 / 12, 10)
    expect(progressFromPos(2.5, CHAPTER_WEIGHTS)).toBeCloseTo(3.5 / 12, 10)
    // outside the climb the line shifts by exactly the extra unit
    expect(progressFromPos(1.0, CHAPTER_WEIGHTS)).toBeCloseTo(1 / 12, 10)
    expect(progressFromPos(6.2, CHAPTER_WEIGHTS)).toBeCloseTo(7.2 / 12, 10)
    expect(progressFromPos(11, CHAPTER_WEIGHTS)).toBe(1)
  })

  it('posFromProgress inverts progressFromPos across the whole line', () => {
    for (let pos = 0; pos <= 11; pos += 0.37) {
      expect(posFromProgress(progressFromPos(pos, CHAPTER_WEIGHTS), CHAPTER_WEIGHTS)).toBeCloseTo(
        pos,
        8,
      )
    }
  })

  it('is the identity when every weight is 1', () => {
    const uniform = buildChapterWeights(Array.from({ length: 12 }, () => ({})))
    for (const p of [0, 0.25, 0.5, 0.99, 1]) {
      expect(posFromProgress(p, uniform)).toBeCloseTo(p * 11, 10)
      expect(chapterPosition(p, 12, uniform)).toBeCloseTo(chapterPosition(p, 12), 10)
    }
  })

  it('grows the track by exactly the extra weight (others keep their pace)', () => {
    expect(trackHeightVh(12, CHAPTER_WEIGHTS)).toBe(Math.round(12 * VH_PER_CHAPTER * (12 / 11)))
    const uniform = buildChapterWeights(Array.from({ length: 12 }, () => ({})))
    expect(trackHeightVh(12, uniform)).toBe(12 * VH_PER_CHAPTER)
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
