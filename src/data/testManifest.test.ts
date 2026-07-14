import { describe, expect, it } from 'vitest'
import { TEST_COUNT, TEST_MANIFEST } from './testManifest'
import { OFFER_QUALITY } from './offer'
import { OFFER_QUALITY_CS } from './offer.cs'

/**
 * Guards the generated manifest (npm run gen:tests) and the "truth numbers"
 * rule: the proof panel's tests count must equal the suite the popup shows.
 * Adding/removing a test without regenerating + updating the copy fails here.
 */
describe('testManifest (generated — npm run gen:tests)', () => {
  it('TEST_COUNT equals the baked list', () => {
    const total = TEST_MANIFEST.reduce((n, f) => n + f.tests.length, 0)
    expect(total).toBe(TEST_COUNT)
    expect(total).toBeGreaterThan(0)
  })

  it('files are unique, repo-relative test modules with non-empty case names', () => {
    const files = TEST_MANIFEST.map((f) => f.file)
    expect(new Set(files).size).toBe(files.length)
    for (const f of TEST_MANIFEST) {
      expect(f.file).toMatch(/^src\/.+\.test\.ts$/)
      for (const name of f.tests) expect(name.trim().length).toBeGreaterThan(0)
    }
  })

  it('the proof-panel copy tells the same number (EN + CZ)', () => {
    for (const quality of [OFFER_QUALITY, OFFER_QUALITY_CS]) {
      const lead = quality.selfItems?.find((i) => i.testsLead)?.testsLead
      expect(lead, 'a selfItem with testsLead must exist').toBeTruthy()
      expect(lead).toContain(`>${TEST_COUNT} `)
    }
  })
})
