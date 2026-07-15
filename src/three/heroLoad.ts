/**
 * Hero-load channel — one tiny three-free store that answers three questions
 * the 3D hero pipeline could not answer before (mobile brief 2026-07-15):
 *
 *  1. "Is a hero BUILD in flight right now?" — read by the runtime FPS
 *     watchdog (worldMode.ts). The watchdog exists to catch devices that
 *     cannot RENDER 3D; a device that is merely BUSY LOADING it (GLB parse,
 *     Sobel bake, GPU upload) produces the same slow frames, and counting
 *     those permanently downgraded capable mid-range phones to 2D right in
 *     the first hero's build window (proven: 4× CPU throttle, watchdog armed
 *     → downgrade at t≈5 s / pos≈0.5, persisted; same throttle with the
 *     watchdog off → the whole 3D story runs fine).
 *
 *  2. "How far along is each hero scene?" — feeds the HUD loading indicator
 *     (story/HeroLoadIndicator.tsx): the visitor sees that the 2D scene they
 *     are reading is NOT the maximum, the 3D is coming.
 *
 *  3. "When should each hero build RUN?" — the background build queue.
 *     Builds used to start only at per-scene scroll thresholds, i.e. exactly
 *     while the visitor was scrolling (the interaction path). The queue
 *     front-loads them in story order during the intro's genuine idle time;
 *     the scenes' own scroll-threshold kicks stay as the fast-scroller
 *     override (kickLoad is idempotent — whoever fires first wins).
 *
 * Main-bundle module by design (worldMode + the DOM indicator import it);
 * MUST stay three-free.
 */

export type HeroKey = 'climb' | 'cruise' | 'desert' | 'patrol'
export type HeroPhase = 'idle' | 'loading' | 'ready' | 'failed'
export type HeroLoadState = { readonly phase: HeroPhase; readonly progress: number }
export type HeroLoadSnapshot = Readonly<Record<HeroKey, HeroLoadState>>

/** Story order — also the background queue's build order. */
export const HERO_ORDER: readonly HeroKey[] = ['climb', 'cruise', 'desert', 'patrol']

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
  tryAdvanceQueue()
}

/** A failed fetch: the 2D hero keeps flying (designed fallback), the
 *  indicator hides this hero, the watchdog un-blocks, the queue moves on. */
export function failHeroLoad(key: HeroKey): void {
  set(key, 'failed', states[key].progress)
  tryAdvanceQueue()
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

// ---------------------------------------------------------------------------
// background build queue
// ---------------------------------------------------------------------------

const kicks = new Map<HeroKey, () => void>()
let queueStarted = false

/** Scenes register their (idempotent) kickLoad on mount. */
export function registerHeroKick(key: HeroKey, kick: () => void): () => void {
  kicks.set(key, kick)
  if (queueStarted) tryAdvanceQueue()
  return () => {
    if (kicks.get(key) === kick) kicks.delete(key)
  }
}

/** The next hero the queue would kick: first in story order that is still
 *  idle and has a registered kick — and only while nothing is in flight
 *  (one build at a time; parallel GLB parses were long-task pile-ups). */
export function nextQueuedHero(
  order: readonly HeroKey[] = HERO_ORDER,
  snap: HeroLoadSnapshot = snapshot,
  inFlight: number = loading,
): HeroKey | null {
  if (inFlight > 0) return null
  for (const key of order) {
    if (snap[key].phase === 'idle' && kicks.has(key)) return key
  }
  return null
}

function tryAdvanceQueue(): void {
  if (!queueStarted) return
  const key = nextQueuedHero()
  // The kick calls beginHeroLoad synchronously, so this cannot loop.
  if (key) kicks.get(key)?.()
}

/** Stage3D arms this shortly after mount (post window.load + idle by
 *  construction — Story gates the mount). Re-entrant: a world-toggle
 *  remount just advances again over the re-registered scenes. */
export function startHeroQueue(): void {
  queueStarted = true
  tryAdvanceQueue()
}

/** Test-only: full reset of module state. */
export function __resetHeroLoadForTest(): void {
  states = { climb: IDLE, cruise: IDLE, desert: IDLE, patrol: IDLE }
  snapshot = states
  loading = 0
  lastLoadEnd = -Infinity
  urgentUntil = -Infinity
  kicks.clear()
  queueStarted = false
}
