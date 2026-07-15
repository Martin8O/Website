import { describe, expect, it } from 'vitest'
import { isWeakClient, parseWorldOverride, resolveWorldMode } from './worldMode'

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

  it('the visitor toggle decides when no URL override is present', () => {
    expect(resolveWorldMode({ ...capable, choice: '2d' })).toBe('2d')
    expect(resolveWorldMode({ ...capable, choice: '3d' })).toBe('3d')
    // …but the URL override (support/debug) still wins over the stored one
    expect(resolveWorldMode({ ...capable, override: '2d', choice: '3d' })).toBe('2d')
    expect(resolveWorldMode({ ...capable, override: '3d', choice: '2d' })).toBe('3d')
    // …and the hard gates win over everything
    expect(resolveWorldMode({ ...capable, reducedMotion: true, choice: '3d' })).toBe('2d')
  })

  it('a weak client auto-falls back to 2D — unless the visitor chose 3D', () => {
    expect(resolveWorldMode({ ...capable, weakClient: true })).toBe('2d')
    expect(resolveWorldMode({ ...capable, weakClient: true, choice: '3d' })).toBe('3d')
    expect(resolveWorldMode({ ...capable, weakClient: false })).toBe('3d')
  })

  it('the runtime FPS watchdog drops to 2D — but the visitor can still force 3D', () => {
    // A device that LOOKED capable (cleared the static weak-client gate) but
    // crawled in 3D at runtime.
    expect(resolveWorldMode({ ...capable, autoDowngraded: true })).toBe('2d')
    // An explicit 3D choice (or ?world=3d) always beats the auto-downgrade.
    expect(resolveWorldMode({ ...capable, autoDowngraded: true, choice: '3d' })).toBe('3d')
    expect(resolveWorldMode({ ...capable, autoDowngraded: true, override: '3d' })).toBe('3d')
    // …but the hard gates still win over the auto-downgrade either way.
    expect(resolveWorldMode({ ...capable, autoDowngraded: true, reducedMotion: true })).toBe('2d')
  })
})

describe('isWeakClient', () => {
  it('reads little memory, few cores, data-saver or a slow link as weak', () => {
    expect(isWeakClient({ deviceMemory: 2 })).toBe(true)
    expect(isWeakClient({ hardwareConcurrency: 2 })).toBe(true)
    expect(isWeakClient({ connection: { saveData: true } })).toBe(true)
    expect(isWeakClient({ connection: { effectiveType: '3g' } })).toBe(true)
    expect(isWeakClient({ connection: { effectiveType: '2g' } })).toBe(true)
  })

  it('reads absent signals as capable (Firefox/Safari expose none)', () => {
    expect(isWeakClient({})).toBe(false)
    expect(isWeakClient({ deviceMemory: 8, hardwareConcurrency: 10 })).toBe(false)
    expect(isWeakClient({ connection: { effectiveType: '4g', saveData: false } })).toBe(false)
  })
})
