import { describe, expect, it } from 'vitest'
import { CHANGELOG, changelogFor, formatChangelogDate } from './changelog'

describe('changelog data', () => {
  it('is in chronological order', () => {
    const dates = CHANGELOG.map((e) => e.date)
    expect([...dates].sort()).toEqual(dates)
  })

  it('has unique ids and ISO dates', () => {
    expect(new Set(CHANGELOG.map((e) => e.id)).size).toBe(CHANGELOG.length)
    for (const e of CHANGELOG) expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('only ever links out over https', () => {
    for (const e of CHANGELOG) {
      if (e.link) expect(e.link.href.startsWith('https://')).toBe(true)
    }
  })

  it('translates every entry to Czech without losing one', () => {
    const cs = changelogFor('cs')
    expect(cs).toHaveLength(CHANGELOG.length)
    cs.forEach((e, i) => {
      expect(e.id).toBe(CHANGELOG[i].id)
      expect(e.date).toBe(CHANGELOG[i].date)
      // The overlay must actually overlay — no English left behind.
      expect(e.title).not.toBe(CHANGELOG[i].title)
    })
  })
})

describe('formatChangelogDate', () => {
  it('formats per language', () => {
    expect(formatChangelogDate('en', '2026-07-05')).toBe('5 Jul 2026')
    expect(formatChangelogDate('cs', '2026-07-05')).toBe('5. 7. 2026')
    expect(formatChangelogDate('en', '2026-12-23')).toBe('23 Dec 2026')
  })
})
