/**
 * World-mode gate — decides whether the additive 3D layer (L2, R3F) may mount
 * OVER the 2D canvas world. The 2D world always paints and is the fallback by
 * design (the L1→L2 seam, ADR-006): 3D is an enhancement, never a cost.
 *
 * Resolution order (M-DEBUG retires the visitor 2D/3D toggle — Martin: the
 * pill confused people; every visitor gets what their hardware can run, and
 * the detection must never STICK a capable device in 2D):
 *  - `prefers-reduced-motion` → 2D. The a11y contract: the 2D stage already
 *    paints a complete static frame per scroll position; the 3D layer is
 *    motion by nature, so under reduced motion it never mounts at all (and
 *    its chunk is never fetched). Beats everything.
 *  - no WebGL2 → 2D (one throwaway-context probe, cached per session).
 *  - `?world=2d|3d` — the URL kill-switch / debug override (support,
 *    verification harnesses). The only manual lever left.
 *  - a WEAK CLIENT auto-falls back to 2D: little device memory / few cores
 *    (the 3D chunk + the GLB heroes are real work), or a data-saver / slow
 *    connection (they are real megabytes). Re-probed every visit — never
 *    persisted, so it can never stick.
 *  - the runtime FPS watchdog fired recently (persisted WITH AN EXPIRY —
 *    a downgrade decays after AUTO_TTL_MS, so one bad session, thermal
 *    throttle or a background-load moment can never brand a device 2D
 *    forever; a genuinely weak device simply re-trips next visit).
 *  - otherwise → 3D.
 *
 * Pure decision (`resolveWorldMode`) + a thin live hook (`useWorldMode`).
 * This module must stay three-free: it rides the MAIN bundle so the shell can
 * decide whether to fetch the 3D chunk at all.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { buildCalm } from './heroLoad'

export type WorldMode = '2d' | '3d'
export type WorldOverride = WorldMode | null

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
  /** The weak-client heuristic (isWeakClient) — auto-2D. */
  weakClient?: boolean
  /** The runtime FPS watchdog fired recently (persisted with an expiry) — a
   *  device that LOOKED capable but actually crawled in 3D. `?world=3d`
   *  still beats it (the debug/support lever). */
  autoDowngraded?: boolean
}): WorldMode {
  if (env.reducedMotion || !env.webgl2) return '2d'
  if (env.override) return env.override
  if (env.weakClient) return '2d'
  if (env.autoDowngraded) return '2d'
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
// the retired visitor toggle (M-DEBUG): the nav pill is gone — the mode is
// pure capability detection now. The old persisted choice must not keep
// steering returning visitors (a tester who once picked 2D would be stuck
// there with no UI to undo it), so the key is actively removed.
// ---------------------------------------------------------------------------

const CHOICE_KEY_LEGACY = 'site-world'

// ---------------------------------------------------------------------------
// runtime FPS auto-fallback (mobile audit §5) — a capable-LOOKING phone (the
// Galaxy A50: 4 GB, so `deviceMemory` reports 4 and it clears the static gate)
// can still crawl in 3D, and the static gate can't tell it from a 6-GB S20 FE
// (which also reports 4 but holds 45-60 fps). A short, near-zero-cost frame-
// time watch right after the layer starts catches the crawler and drops it to
// 2D, remembered for next time. Persisted separately from the visitor toggle,
// and ranked below it (an explicit 3D choice always wins).
// ---------------------------------------------------------------------------

// v2 key: v1 ('site-world-auto') could be a FALSE POSITIVE — the original
// watchdog counted the slow frames of the hero BUILD window (GLB parse,
// Sobel bake, GPU upload) as rendering weakness and permanently downgraded
// capable phones mid-load. Reading v2 removes any v1 value, so every such
// device gets one clean retry under the fixed (build-aware) watchdog; a
// genuinely weak device simply re-trips in its first heavy scene.
//
// The v2 VALUE is the trip TIMESTAMP (ms) and the downgrade EXPIRES after
// AUTO_TTL_MS (M-DEBUG, the toggle retirement): with no nav pill left, a
// forever-persisted '2d' would permanently brand a device that had ONE bad
// session (thermal throttle, battery saver, background load) with no way
// back. A decaying downgrade sticks long enough to spare a weak device the
// re-probe on every reload, and heals on its own. The legacy plain-'2d'
// value (pre-TTL format) reads as expired — one clean retry, same idiom as
// the v1→v2 migration.
const AUTO_KEY = 'site-world-auto2'
const AUTO_KEY_LEGACY = 'site-world-auto'

/** How long a runtime FPS downgrade is honoured before 3D is retried. */
export const AUTO_TTL_MS = 24 * 60 * 60 * 1000

/** Pure TTL read (unit-tested): stored value → is a downgrade active NOW?
 *  Anything unparsable (legacy '2d', garbage) or outside (0, TTL] is stale. */
export function autoDowngradeActive(stored: string | null, now: number): boolean {
  if (!stored) return false
  const at = Number(stored)
  if (!Number.isFinite(at)) return false
  const age = now - at
  return age >= 0 && age < AUTO_TTL_MS
}

let autoDown: boolean | undefined
const autoListeners = new Set<() => void>()

export function getAutoDowngrade(): boolean {
  if (autoDown === undefined) {
    try {
      localStorage.removeItem(AUTO_KEY_LEGACY)
      localStorage.removeItem(CHOICE_KEY_LEGACY)
      const stored = localStorage.getItem(AUTO_KEY)
      autoDown = autoDowngradeActive(stored, Date.now())
      // Stale entry (expired TTL / legacy format): drop it so the next
      // sessions start clean instead of re-parsing a dead value.
      if (stored && !autoDown) localStorage.removeItem(AUTO_KEY)
    } catch {
      autoDown = false
    }
  }
  return autoDown
}

export function subscribeAutoDowngrade(listener: () => void): () => void {
  autoListeners.add(listener)
  return () => autoListeners.delete(listener)
}

function setAutoDowngrade(): void {
  if (getAutoDowngrade()) return
  autoDown = true
  try {
    localStorage.setItem(AUTO_KEY, String(Date.now()))
  } catch {
    /* storage blocked — this session still drops to 2D; next won't remember */
  }
  for (const listener of autoListeners) listener()
}

// The watchdog: instead of one early sample (the intro is a weak phone's BEST
// scene — 40 fps on the A50 — so it would pass and then suffer in the ballet),
// accumulate the WALL TIME spent in an unbroken run of slow frames. A device
// that has been janky for ~3 continuous seconds trips it; any recovery to a
// good frame resets the run, so a capable phone's momentary dip (the S20 FE's
// "8 fps dip → high") never downgrades it. Measuring TIME, not a frame count,
// makes the threshold fps-independent — a 5 fps crawl (200 ms frames) trips it
// in ~15 frames, a 20 fps grind in ~60, both after the same 3 s of suffering.
// Cost is one add + one compare per frame — no timer, no loop, no allocation —
// and it disarms itself after the early window (or the moment it decides), so
// there is no ongoing tax on the site, the visitor, or their browser.
const FPS_WARMUP_FRAMES = 45 // skip the mount + shader-compile spikes (~0.75 s)
const FPS_SLOW_MS = 50 // a frame slower than this ≈ under ~20 fps (clearly bad)
const FPS_SUSTAINED_MS = 3000 // 3 s of unbroken sub-20-fps ⇒ downgrade
const FPS_MAX_DT_MS = 1000 // a gap over 1 s is a pause / tab-away, not a slow frame
const FPS_DETECT_CAP = 4000 // stop watching after the early window (a backstop)
/** How much SLOW-frame time a hero build may excuse in total. A capable
 *  phone's whole build pipeline spends well under this in slow frames (the
 *  gentle idle slicing keeps most frames clean), so it never runs out; a
 *  genuinely weak device grinds through it and then meets the normal rules —
 *  the build guard must delay its protection, never disable it. */
const FPS_EXCUSE_BUDGET_MS = 15000

let fpsFrames = 0
let fpsSlowMs = 0
let fpsExcusedMs = 0
let fpsArmed = true

/**
 * Feed the live 3D frame time (ms) once per frame from the R3F loop. Disarms
 * itself when it decides, when 3D was explicitly forced, or after the early
 * detection window — so it truly costs nothing beyond the first stretch.
 */
export function tickRuntimeFpsGuard(dtMs: number): void {
  if (!fpsArmed) return
  // Never override an explicit ?world= (support/debug + the harnesses).
  if (parseWorldOverride(window.location.search)) {
    fpsArmed = false
    return
  }
  if (dtMs > FPS_MAX_DT_MS) {
    fpsSlowMs = 0 // a real pause (tab-away / paused loop) — not slow rendering
    return
  }
  // A hero BUILD in flight (or just settled — shader-compile tail): these
  // slow frames are the cost of LOADING the 3D layer, not proof the device
  // cannot RENDER it. Counting them permanently downgraded capable mid-range
  // phones inside the very first hero's build window (mobile brief; proven
  // by cdp-watchdog-load.mjs — 4× throttle died at pos≈0.5, the same device
  // ran the whole 3D story once the watchdog ignored the build). The frame
  // counter also holds, so the detection window stays an honest sample.
  // The excuse is BUDGETED: a weak device that grinds slow through the whole
  // background build pipeline exhausts it and meets the normal rules — the
  // guard delays its protection, never disables it.
  if (!buildCalm() && fpsExcusedMs < FPS_EXCUSE_BUDGET_MS) {
    if (dtMs > FPS_SLOW_MS) fpsExcusedMs += dtMs
    fpsSlowMs = 0
    return
  }
  fpsFrames++
  if (fpsFrames > FPS_DETECT_CAP) {
    fpsArmed = false // survived the early window — this device is fine
    return
  }
  if (fpsFrames <= FPS_WARMUP_FRAMES) {
    fpsSlowMs = 0 // still warming up (mount + shader compiles)
    return
  }
  if (dtMs > FPS_SLOW_MS) {
    fpsSlowMs += dtMs
    if (fpsSlowMs >= FPS_SUSTAINED_MS) {
      fpsArmed = false
      setAutoDowngrade()
    }
  } else {
    fpsSlowMs = 0 // recovered to a good frame — the run breaks
  }
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
 * '2d') or when the FPS watchdog trips. The URL override is read once — it
 * cannot change without navigation.
 */
export function useWorldMode(): WorldMode {
  const reducedMotion = useReducedMotion()
  const auto = useSyncExternalStore(subscribeAutoDowngrade, getAutoDowngrade)

  return useMemo(
    () =>
      resolveWorldMode({
        webgl2: probeWebGL2(),
        reducedMotion,
        override: parseWorldOverride(window.location.search),
        weakClient: probeWeakClient(),
        autoDowngraded: auto,
      }),
    [reducedMotion, auto],
  )
}
