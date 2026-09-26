import { describe, expect, it } from 'vitest'
import { buildLine } from './strings'

describe('buildLine', () => {
  it('Czech plurals both the days and the commits (1 · 2–4 · 5+)', () => {
    expect(buildLine('cs', 1, 1)).toBe('1 den vývoje · 1 commit')
    expect(buildLine('cs', 1, 4)).toBe('1 den vývoje · 4 commity')
    expect(buildLine('cs', 3, 41)).toBe('3 dny vývoje · 41 commitů')
    expect(buildLine('cs', 27, 109)).toBe('27 dní vývoje · 109 commitů')
    expect(buildLine('cs', 4.5, 70)).toBe('4½ dne vývoje · 70 commitů')
  })

  it('English says "1 day" and "1 commit" in the singular', () => {
    expect(buildLine('en', 1, 1)).toBe('1 day of building · 1 commit')
    expect(buildLine('en', 1, 4)).toBe('1 day of building · 4 commits')
    expect(buildLine('en', 4.5, 70)).toBe('4½ days of building · 70 commits')
  })
})
