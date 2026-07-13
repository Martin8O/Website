/**
 * World-mode gate — decides whether the additive 3D layer (L2, R3F) may mount
 * OVER the 2D canvas world. The 2D world always paints and is the fallback by
 * design (the L1→L2 seam, ADR-006): 3D is an enhancement, never a cost.
 *
 * Resolution order (E3b-v2 adds the visitor toggle + the weak-client
 * auto-fallback; 3D is the DEFAULT experience):
 *  - `prefers-reduced-motion` → 2D. The a11y contract: the 2D stage already
 *    paints a complete static frame per scroll position; the 3D layer is
 *    motion by nature, so under reduced motion it never mounts at all (and
 *    its chunk is never fetched). Beats everything, including the toggle.
 *  - no WebGL2 → 2D (one throwaway-context probe, cached per session).
 *  - `?world=2d|3d` — the URL kill-switch / debug override (support,
 *    verification harnesses). Beats the stored preference.
 *  - the visitor's own 2D/3D nav toggle (persisted in localStorage).
 *  - a WEAK CLIENT auto-falls back to 2D unless the visitor explicitly
 *    chose 3D: little device memory / few cores (the 3D chunk + three GLB
 *    heroes are real work), or a data-saver / slow connection (they are
 *    real megabytes).
 *  - otherwise → 3D.
 *
 * Pure decision (`resolveWorldMode`) + a thin live hook (`useWorldMode`).
 * This module must stay three-free: it rides the MAIN bundle so the shell can
 * decide whether to fetch the 3D chunk at all.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

export type WorldMode = '2d' | '3d'
export type WorldOverride = WorldMode | null
/** The visitor's own toggle: an explicit mode, or null = automatic. */
export type WorldChoice = WorldMode | null

/** `?world=2d|3d` from a location search string; anything else = no override. */
export function parseWorldOverride(search: string): WorldOverride {
  const v = new URLSearchParams(search).get('world')
  return v === '2d' || v === '3d' ? v : null
}

/** The connection surface of the Network Information API (Chromium). */
type NetInfo = { saveData?: boolean; effectiveType?: string }
type ClientHints = {
  deviceMemory?: number
  hardwareConcurrency?: number
  connection?: NetInfo
}

/**
 * Conservative "this client would rather not pay for 3D" heuristic — any
 * signal alone flips it: < 4 GB device memory or ≤ 3 cores (low-end phones),
 * an explicit data-saver, or a ≤ 3g effective link (the hero GLBs are real
 * megabytes). Every signal is optional — browsers that expose none of them
 * (Firefox, Safari) simply read as capable, and the visitor toggle remains
 * the manual way down (or up: an explicit 3D choice beats this heuristic).
 */
export function isWeakClient(hints: ClientHints): boolean {
  if (hints.deviceMemory !== undefined && hints.deviceMemory < 4) return true
  if (hints.hardwareConcurrency !== undefined && hints.hardwareConcurrency <= 3) return true
  const net = hints.connection
  if (net?.saveData) return true
  const type = net?.effectiveType
  return type === 'slow-2g' || type === '2g' || type === '3g'
}

/** The pure decision — every input explicit, so the matrix is unit-tested. */
export function resolveWorldMode(env: {
  webgl2: boolean
  reducedMotion: boolean
  override: WorldOverride
  /** The visitor's nav toggle (persisted); omitted/null = automatic. */
  choice?: WorldChoice
  /** The weak-client heuristic (isWeakClient) — auto-2D unless the visitor
   *  explicitly chose 3D. */
  weakClient?: boolean
}): WorldMode {
  if (env.reducedMotion || !env.webgl2) return '2d'
  if (env.override) return env.override
  if (env.choice) return env.choice
  if (env.weakClient) return '2d'
  return '3d'
}

// ---------------------------------------------------------------------------
// session probes (cached — none of these answers changes without a reload)
// ---------------------------------------------------------------------------

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

let weakProbe: boolean | null = null

function probeWeakClient(): boolean {
  if (weakProbe === null) {
    weakProbe = isWeakClient(navigator as Navigator & ClientHints)
  }
  return weakProbe
}

// ---------------------------------------------------------------------------
// the visitor's choice — a tiny external store (the langStore pattern), so
// the nav toggle and the Story gate stay in sync without prop drilling
// ---------------------------------------------------------------------------

const CHOICE_KEY = 'site-world'

function initialChoice(): WorldChoice {
  try {
    const stored = localStorage.getItem(CHOICE_KEY)
    if (stored === '2d' || stored === '3d') return stored
  } catch {
    /* storage blocked — run on automatic */
  }
  return null
}

let choice: WorldChoice | undefined
const choiceListeners = new Set<() => void>()

export function getWorldChoice(): WorldChoice {
  // Lazy first read — module load must not touch localStorage (tests, SSR).
  if (choice === undefined) choice = initialChoice()
  return choice
}

export function setWorldChoice(next: WorldChoice): void {
  if (next === getWorldChoice()) return
  choice = next
  try {
    if (next) localStorage.setItem(CHOICE_KEY, next)
    else localStorage.removeItem(CHOICE_KEY)
  } catch {
    /* storage blocked — the choice just won't survive a reload */
  }
  for (const listener of choiceListeners) listener()
}

export function subscribeWorldChoice(listener: () => void): () => void {
  choiceListeners.add(listener)
  return () => choiceListeners.delete(listener)
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

/** Live reduced-motion state (shared by the gate and the nav toggle). */
function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia(REDUCED_MOTION).matches,
  )
  useEffect(() => {
    const media = window.matchMedia(REDUCED_MOTION)
    const onChange = () => setReducedMotion(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return reducedMotion
}

/**
 * Live world mode. Re-resolves when the user flips reduced-motion mid-session
 * (the story gate: Story unmounts the whole 3D island the moment this returns
 * '2d') or flips the nav's 2D/3D toggle. The URL override is read once — it
 * cannot change without navigation.
 */
export function useWorldMode(): WorldMode {
  const reducedMotion = useReducedMotion()
  const stored = useSyncExternalStore(subscribeWorldChoice, getWorldChoice)

  return useMemo(
    () =>
      resolveWorldMode({
        webgl2: probeWebGL2(),
        reducedMotion,
        override: parseWorldOverride(window.location.search),
        choice: stored,
        weakClient: probeWeakClient(),
      }),
    [reducedMotion, stored],
  )
}

/** Can the 3D world run here at all (the HARD gates only)? The nav hides
 *  the 2D/3D toggle when it cannot — a switch that can do nothing is worse
 *  than none. Live to reduced-motion flips. */
export function useWorld3DAvailable(): boolean {
  const reducedMotion = useReducedMotion()
  return !reducedMotion && probeWebGL2()
}
