import { describe, expect, it } from 'vitest'
import { parseWorldOverride, resolveWorldMode } from './worldMode'

describe('parseWorldOverride', () => {
  it('reads the two valid values', () => {
    expect(parseWorldOverride('?world=2d')).toBe('2d')
    expect(parseWorldOverride('?world=3d')).toBe('3d')
  })

  it('treats anything else as no override', () => {
    expect(parseWorldOverride('')).toBeNull()
    expect(parseWorldOverride('?world=')).toBeNull()
    expect(parseWorldOverride('?world=4d')).toBeNull()
    expect(parseWorldOverride('?lang=cs')).toBeNull()
  })
})

describe('resolveWorldMode', () => {
  const capable = { webgl2: true, reducedMotion: false, override: null } as const

  it('defaults to 3d on a capable, motion-ok client', () => {
    expect(resolveWorldMode({ ...capable })).toBe('3d')
    expect(resolveWorldMode({ ...capable, override: '3d' })).toBe('3d')
  })

  it('reduced motion wins over everything — even an explicit ?world=3d', () => {
    expect(resolveWorldMode({ ...capable, reducedMotion: true })).toBe('2d')
    expect(resolveWorldMode({ ...capable, reducedMotion: true, override: '3d' })).toBe('2d')
  })

  it('no WebGL2 wins over an explicit ?world=3d', () => {
    expect(resolveWorldMode({ ...capable, webgl2: false })).toBe('2d')
    expect(resolveWorldMode({ ...capable, webgl2: false, override: '3d' })).toBe('2d')
  })

  it('?world=2d is a kill-switch on an otherwise capable client', () => {
    expect(resolveWorldMode({ ...capable, override: '2d' })).toBe('2d')
  })
})
