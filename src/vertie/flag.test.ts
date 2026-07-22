import { describe, expect, it } from 'vitest'
import { parseClimbEngine } from './flag'

describe('parseClimbEngine', () => {
  it('defaults to the bespoke R3F scene', () => {
    expect(parseClimbEngine('')).toBe('r3f')
    expect(parseClimbEngine('?world=3d')).toBe('r3f')
  })

  it('opts in to the published player', () => {
    expect(parseClimbEngine('?climb=vertie')).toBe('vertie')
    expect(parseClimbEngine('?world=3d&climb=vertie')).toBe('vertie')
  })

  it('accepts an explicit r3f and ignores anything else', () => {
    expect(parseClimbEngine('?climb=r3f')).toBe('r3f')
    expect(parseClimbEngine('?climb=')).toBe('r3f')
    expect(parseClimbEngine('?climb=throughline')).toBe('r3f')
  })
})
