/**
 * World-mode gate — decides whether the additive 3D layer (L2, R3F) may mount
 * OVER the 2D canvas world. The 2D world always paints and is the fallback by
 * design (the L1→L2 seam, ADR-006): 3D is an enhancement, never a cost.
 *
 * Hard gates, in order:
 *  - `prefers-reduced-motion` → 2D. The a11y contract: the 2D stage already
 *    paints a complete static frame per scroll position; the 3D layer is
 *    motion by nature, so under reduced motion it never mounts at all (and
 *    its chunk is never fetched).
 *  - no WebGL2 → 2D (one throwaway-context probe, cached per session).
 *  - `?world=2d` → 2D — the manual kill-switch (support/debugging).
 *    `?world=3d` states intent but cannot override the gates above.
 *
 * Pure decision (`resolveWorldMode`) + a thin live hook (`useWorldMode`).
 * This module must stay three-free: it rides the MAIN bundle so the shell can
 * decide whether to fetch the 3D chunk at all.
 */

import { useEffect, useMemo, useState } from 'react'

export type WorldMode = '2d' | '3d'
export type WorldOverride = WorldMode | null

/** `?world=2d|3d` from a location search string; anything else = no override. */
export function parseWorldOverride(search: string): WorldOverride {
  const v = new URLSearchParams(search).get('world')
  return v === '2d' || v === '3d' ? v : null
}

/** The pure decision — every input explicit, so the matrix is unit-tested. */
export function resolveWorldMode(env: {
  webgl2: boolean
  reducedMotion: boolean
  override: WorldOverride
}): WorldMode {
  if (env.reducedMotion || !env.webgl2) return '2d'
  if (env.override === '2d') return '2d'
  return '3d'
}

/** Probe once per session — context creation is not free, and the answer
 *  cannot change without a page load. */
let webgl2Probe: boolean | null = null

function probeWebGL2(): boolean {
  if (webgl2Probe === null) {
    try {
      webgl2Probe = document.createElement('canvas').getContext('webgl2') !== null
    } catch {
      webgl2Probe = false
    }
  }
  return webgl2Probe
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/**
 * Live world mode. Re-resolves when the user flips reduced-motion mid-session
 * (the story gate: Story unmounts the whole 3D island the moment this returns
 * '2d'). The URL override is read once — it cannot change without navigation.
 */
export function useWorldMode(): WorldMode {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia(REDUCED_MOTION).matches,
  )
  useEffect(() => {
    const media = window.matchMedia(REDUCED_MOTION)
    const onChange = () => setReducedMotion(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return useMemo(
    () =>
      resolveWorldMode({
        webgl2: probeWebGL2(),
        reducedMotion,
        override: parseWorldOverride(window.location.search),
      }),
    [reducedMotion],
  )
}
