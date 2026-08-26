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
  const phone = { mobileClass: true } as const
  const desktop = { mobileClass: false } as const

  it('on a touch-first device: little memory or few cores read as weak', () => {
    expect(isWeakClient({ ...phone, deviceMemory: 2 })).toBe(true)
    expect(isWeakClient({ ...phone, deviceMemory: 3.9 })).toBe(true)
    expect(isWeakClient({ ...phone, hardwareConcurrency: 2 })).toBe(true)
    expect(isWeakClient({ ...phone, hardwareConcurrency: 3 })).toBe(true)
  })

  it('on a touch-first device: comfortable hardware still reads capable', () => {
    expect(isWeakClient({ ...phone, deviceMemory: 4, hardwareConcurrency: 4 })).toBe(false)
    expect(isWeakClient({ ...phone, deviceMemory: 8, hardwareConcurrency: 8 })).toBe(false)
    expect(isWeakClient({ ...phone })).toBe(false)
  })

  // The 2026-08-26 defect: Brave's fingerprint farbling reported 3 cores on a
  // Ryzen 5 (8 logical, 15 GB), so the live site served 2D to a capable
  // desktop while `localhost` — which Brave does not farble — served 3D.
  // Firefox with resistFingerprinting reports 2 for the same reason.
  it('on a desktop: the farble-able core/memory counts are IGNORED', () => {
    expect(isWeakClient({ ...desktop, hardwareConcurrency: 3 })).toBe(false)
    expect(isWeakClient({ ...desktop, hardwareConcurrency: 2 })).toBe(false)
    expect(isWeakClient({ ...desktop, deviceMemory: 0.5 })).toBe(false)
    expect(isWeakClient({ ...desktop, deviceMemory: 2, hardwareConcurrency: 2 })).toBe(false)
  })

  it('data-saver and a slow link still count on EVERY device', () => {
    for (const device of [phone, desktop]) {
      expect(isWeakClient({ ...device, connection: { saveData: true } })).toBe(true)
      expect(isWeakClient({ ...device, connection: { effectiveType: 'slow-2g' } })).toBe(true)
      expect(isWeakClient({ ...device, connection: { effectiveType: '2g' } })).toBe(true)
      expect(isWeakClient({ ...device, connection: { effectiveType: '3g' } })).toBe(true)
      expect(isWeakClient({ ...device, connection: { effectiveType: '4g' } })).toBe(false)
    }
  })

  it('reads absent signals as capable (Safari exposes none of them)', () => {
    expect(isWeakClient({})).toBe(false)
    expect(isWeakClient({ deviceMemory: 8, hardwareConcurrency: 10 })).toBe(false)
    expect(isWeakClient({ connection: { effectiveType: '4g', saveData: false } })).toBe(false)
  })

  // An unknown device shape must not cost a capable visitor the 3D layer:
  // absent `mobileClass` reads as desktop, and the runtime FPS watchdog is
  // what protects a device that lies its way past this gate.
  it('an unstated device class reads as desktop, not as a phone', () => {
    expect(isWeakClient({ hardwareConcurrency: 2 })).toBe(false)
    expect(isWeakClient({ deviceMemory: 1 })).toBe(false)
    expect(isWeakClient({ connection: { saveData: true } })).toBe(true)
  })
})
