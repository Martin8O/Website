import { describe, expect, it } from 'vitest'
import { CHAPTERS } from './chapters'
import { CHAPTER_COPY_CS } from './chapters.cs'
import { PROJECTS } from './projects'
import { PROJECT_COPY_CS } from './projects.cs'

/**
 * The Czech copy is an overlay merged by id with a silent spread. That is the
 * cheapest possible i18n, and its failure mode is equally silent: rename an id
 * on the English side and Czech visitors get English copy with a green gate.
 * These tests make the overlay load-bearing, the same way changelog.test.ts
 * already guards the changelog overlay.
 */
describe('Czech chapter overlay', () => {
  const ids = CHAPTERS.map((c) => c.id)

  it('covers every chapter with a non-empty entry', () => {
    for (const id of ids) {
      expect(CHAPTER_COPY_CS[id], `chapter "${id}" has no Czech overlay`).toBeDefined()
      expect(Object.keys(CHAPTER_COPY_CS[id]).length, `chapter "${id}" overlay is empty`).toBeGreaterThan(0)
    }
  })

  it('has no orphan entry (an overlay for an id that no longer exists)', () => {
    for (const key of Object.keys(CHAPTER_COPY_CS)) {
      expect(ids, `overlay "${key}" matches no chapter id`).toContain(key)
    }
  })

  it('actually overlays the prose — no English body copied verbatim', () => {
    // Only the body: an era like "2012–2022 · L-159", a name ("Martin") or a
    // title like "Display pilot" is legitimately the same in both languages,
    // a paragraph never is.
    for (const ch of CHAPTERS) {
      const cs = CHAPTER_COPY_CS[ch.id]
      if (cs.body !== undefined) {
        expect(cs.body, `chapter "${ch.id}".body is identical in EN and CZ`).not.toBe(ch.body)
      }
    }
  })
})

describe('Czech project overlay', () => {
  const ids = PROJECTS.map((p) => p.id)

  it('covers every project with a Czech tagline', () => {
    for (const id of ids) {
      expect(PROJECT_COPY_CS[id], `project "${id}" has no Czech overlay`).toBeDefined()
      expect(PROJECT_COPY_CS[id].tagline, `project "${id}" has no Czech tagline`).toBeTruthy()
    }
  })

  it('has no orphan entry (an overlay for an id that no longer exists)', () => {
    for (const key of Object.keys(PROJECT_COPY_CS)) {
      expect(ids, `overlay "${key}" matches no project id`).toContain(key)
    }
  })

  it('actually overlays the tagline — no English tagline copied verbatim', () => {
    // Names ("Těnovice") and links may match across languages; a tagline never.
    for (const p of PROJECTS) {
      expect(PROJECT_COPY_CS[p.id].tagline, `project "${p.id}".tagline is identical in EN and CZ`).not.toBe(
        p.tagline,
      )
    }
  })
})
