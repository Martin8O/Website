/**
 * Hero-load channel — one tiny three-free store that answers three questions
 * the 3D hero pipeline could not answer before (mobile brief 2026-07-15):
 *
 *  1. "Is a hero BUILD in flight right now?" — read by the runtime FPS
 *     watchdog (worldMode.ts). The watchdog exists to catch devices that
 *     cannot RENDER 3D; a device that is merely BUSY LOADING it (GLB parse,
 *     instance builds, GPU upload) produces the same slow frames, and counting
 *     those permanently downgraded capable mid-range phones to 2D right in
 *     the first hero's build window (proven: 4× CPU throttle, watchdog armed
 *     → downgrade at t≈5 s / pos≈0.5, persisted; same throttle with the
 *     watchdog off → the whole 3D story runs fine).
 *
 *  2. "How far along is each hero scene?" — feeds the HUD loading indicator
 *     (story/HeroLoadIndicator.tsx): the visitor sees that the 2D scene they
 *     are reading is NOT the maximum, the 3D is coming.
 *
 *  3. "How urgently should a build slice?" — the build-urgency flag. Each
 *     hero scene builds at its OWN scroll threshold (LOAD_AT_POS); when the
 *     visitor is approaching that beat, the scene bumps urgency so idleSlice
 *     runs on the short timeout (finish over smoothness), and a background
 *     build far from the visitor keeps the long timeout (smoothness first).
 *
 * (An earlier revision front-loaded ALL hero builds during the intro via a
 * queue; it was dropped — it grew peak memory on constrained devices for no
 * real reliability gain over the threshold kicks, and it made the load chip
 * dead by having every hero ready before the visitor reached it.)
 *
 * Main-bundle module by design (worldMode + the DOM indicator import it);
 * MUST stay three-free.
 */

export type HeroKey = 'climb' | 'cruise' | 'desert' | 'patrol'
export type HeroPhase = 'idle' | 'loading' | 'ready' | 'failed'
export type HeroLoadState = { readonly phase: HeroPhase; readonly progress: number }
export type HeroLoadSnapshot = Readonly<Record<HeroKey, HeroLoadState>>

/** After the LAST in-flight build settles, frames stay excused this long —
 *  the first visible frame after a flip still pays shader compiles. */
export const LOAD_GRACE_MS = 1500

const IDLE: HeroLoadState = { phase: 'idle', progress: 0 }

let states: Record<HeroKey, HeroLoadState> = {
  climb: IDLE,
  cruise: IDLE,
  desert: IDLE,
  patrol: IDLE,
}
let snapshot: HeroLoadSnapshot = states
const listeners = new Set<() => void>()

function notify(): void {
  snapshot = { ...states }
  for (const l of listeners) l()
}

export function getHeroLoadSnapshot(): HeroLoadSnapshot {
  return snapshot
}

export function subscribeHeroLoad(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

let loading = 0
let lastLoadEnd = -Infinity

function set(key: HeroKey, phase: HeroPhase, progress: number): void {
  const prev = states[key]
  if (prev.phase === phase && Math.abs(prev.progress - progress) < 0.01 && progress !== 1) return
  if (prev.phase === 'loading' && phase !== 'loading') {
    loading--
    lastLoadEnd = now()
  } else if (prev.phase !== 'loading' && phase === 'loading') {
    loading++
  }
  states = { ...states, [key]: { phase, progress } }
  notify()
}

/** A scene's kickLoad calls this FIRST (synchronously) — it is the queue's
 *  dedup signal too: a hero past 'idle' is never kicked again. */
export function beginHeroLoad(key: HeroKey): void {
  if (states[key].phase === 'loading') return
  set(key, 'loading', Math.max(states[key].progress, 0.02))
}

/** Monotonic within a load; coarse stage steps are fine. */
export function reportHeroProgress(key: HeroKey, progress: number): void {
  if (states[key].phase !== 'loading') return
  const p = Math.min(Math.max(progress, states[key].progress), 0.99)
  set(key, 'loading', p)
}

export function finishHeroLoad(key: HeroKey): void {
  set(key, 'ready', 1)
}

/** A failed fetch: the 2D hero keeps flying (designed fallback), the
 *  indicator hides this hero, the watchdog un-blocks. */
export function failHeroLoad(key: HeroKey): void {
  set(key, 'failed', states[key].progress)
}

/** Unmount (world toggle, reduced-motion flip): back to idle so a remount
 *  reports honestly again. The scene's own load caches make the redo cheap. */
export function resetHeroLoad(key: HeroKey): void {
  set(key, 'idle', 0)
}

// ---------------------------------------------------------------------------
// watchdog gate
// ---------------------------------------------------------------------------

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

/**
 * TRUE only when no hero build is in flight AND the last one settled more
 * than LOAD_GRACE_MS ago — the FPS watchdog counts slow frames only then,
 * so build-jank can never read as "this device cannot render 3D".
 */
export function buildCalm(at: number = now()): boolean {
  return loading === 0 && at - lastLoadEnd >= LOAD_GRACE_MS
}

// ---------------------------------------------------------------------------
// build urgency — pacing for surface.ts idleSlice()
// ---------------------------------------------------------------------------

let urgentUntil = -Infinity

/** A loading scene whose beat the visitor is APPROACHING (its own
 *  scroll-threshold window) bumps this every frame — the sliced build then
 *  runs with the short idle timeout (finish over smoothness). Background
 *  builds far from the visitor keep the long timeout (smoothness first). */
export function bumpBuildUrgency(at: number = now()): void {
  urgentUntil = at + 600
}

export function buildUrgent(at: number = now()): boolean {
  return at < urgentUntil
}

// Dev-only diagnostic hook (stripped from prod): the CDP probes read the live
// urgency/calm state to prove the pacing a build actually gets. Module-level
// so any importer of this channel sees the same instance — which is exactly
// what the probes verify.
if (import.meta.env.DEV && typeof window !== 'undefined') {
  ;(window as unknown as { __heroLoadDbg?: unknown }).__heroLoadDbg = {
    urgent: () => buildUrgent(),
    calm: () => buildCalm(),
    snapshot: () => getHeroLoadSnapshot(),
  }
}

/** Test-only: full reset of module state. */
export function __resetHeroLoadForTest(): void {
  states = { climb: IDLE, cruise: IDLE, desert: IDLE, patrol: IDLE }
  snapshot = states
  loading = 0
  lastLoadEnd = -Infinity
  urgentUntil = -Infinity
}
