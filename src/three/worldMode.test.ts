import { describe, expect, it } from 'vitest'
import {
  AUTO_TTL_MS,
  autoDowngradeActive,
  isWeakClient,
  parseWorldOverride,
  resolveWorldMode,
} from './worldMode'

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

  it('a weak client auto-falls back to 2D — ?world=3d is the only way up', () => {
    expect(resolveWorldMode({ ...capable, weakClient: true })).toBe('2d')
    expect(resolveWorldMode({ ...capable, weakClient: true, override: '3d' })).toBe('3d')
    expect(resolveWorldMode({ ...capable, weakClient: false })).toBe('3d')
  })

  it('the runtime FPS watchdog drops to 2D — ?world=3d still wins', () => {
    // A device that LOOKED capable (cleared the static weak-client gate) but
    // crawled in 3D at runtime.
    expect(resolveWorldMode({ ...capable, autoDowngraded: true })).toBe('2d')
    expect(resolveWorldMode({ ...capable, autoDowngraded: true, override: '3d' })).toBe('3d')
    // …but the hard gates still win over the auto-downgrade either way.
    expect(resolveWorldMode({ ...capable, autoDowngraded: true, reducedMotion: true })).toBe('2d')
  })
})

describe('autoDowngradeActive (the decaying FPS-watchdog memory)', () => {
  const now = 1_784_000_000_000

  it('no stored value → no downgrade', () => {
    expect(autoDowngradeActive(null, now)).toBe(false)
    expect(autoDowngradeActive('', now)).toBe(false)
  })

  it('a fresh trip is honoured for the TTL, then decays (never sticks forever)', () => {
    expect(autoDowngradeActive(String(now - 1000), now)).toBe(true)
    expect(autoDowngradeActive(String(now - AUTO_TTL_MS + 1), now)).toBe(true)
    expect(autoDowngradeActive(String(now - AUTO_TTL_MS), now)).toBe(false)
    expect(autoDowngradeActive(String(now - 30 * AUTO_TTL_MS), now)).toBe(false)
  })

  it('legacy/garbage values read as expired — one clean retry', () => {
    expect(autoDowngradeActive('2d', now)).toBe(false)
    expect(autoDowngradeActive('yes', now)).toBe(false)
  })

  it('a clock that jumped backwards reads as stale, not a far-future ban', () => {
    expect(autoDowngradeActive(String(now + 60_000), now)).toBe(false)
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
