/**
 * The single source of truth for the whole site: one global `scrollProgress`
 * value in 0..1. Everything visible is *derived* from it (never from a wall
 * clock). Lenis owns the rhythm — it updates this store on its ticker, and
 * React components subscribe via `useScrollProgress()`.
 *
 * This is a tiny external store (getSnapshot + subscribe) so it plugs straight
 * into React's `useSyncExternalStore` without re-rendering on every frame more
 * than necessary.
 */

type Listener = () => void

let progress = 0
const listeners = new Set<Listener>()

/** Current global scroll progress, 0 (top) .. 1 (bottom). */
export function getScrollProgress(): number {
  return progress
}

/** Called by the Lenis ticker; notifies subscribers only when the value moves. */
export function setScrollProgress(next: number): void {
  const clamped = next < 0 ? 0 : next > 1 ? 1 : next
  if (clamped === progress) return
  progress = clamped
  for (const listener of listeners) listener()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Programmatic scroll (the nav "Contact" jump, skip-links). Lenis owns the
 * scroll, so the ScrollProvider registers a driver here; components call
 * `scrollToProgress` without ever touching the Lenis instance. `immediate`
 * teleports (skip-links — a keyboard user shouldn't sit through the flight).
 */
type ScrollDriver = (progress: number, immediate: boolean) => void

let driver: ScrollDriver | null = null

export function registerScrollDriver(next: ScrollDriver | null): void {
  driver = next
}

export function scrollToProgress(target: number, opts?: { immediate?: boolean }): void {
  driver?.(target < 0 ? 0 : target > 1 ? 1 : target, opts?.immediate ?? false)
}

/**
 * Scroll gate (C4 preloader; the modal dialogs hold it too). Lenis owns
 * wheel/touch, so the ScrollProvider registers the actual stop/start here.
 * The lock COUNTS — independent holders (preloader, an open dialog) each
 * balance their own acquire/release and can't steal each other's lock. The
 * state is replayed on registration — the Preloader mounts (and locks)
 * before the provider's effect runs, React effects being bottom-up.
 */
type ScrollLockDriver = (locked: boolean) => void

let lockDriver: ScrollLockDriver | null = null
let locks = 0

export function registerScrollLock(next: ScrollLockDriver | null): void {
  lockDriver = next
  next?.(locks > 0)
}

export function setScrollLocked(next: boolean): void {
  const was = locks > 0
  locks = Math.max(0, locks + (next ? 1 : -1))
  const is = locks > 0
  if (was !== is) lockDriver?.(is)
}

/**
 * Story-cover signal (Tier-1 mobile perf): a full-screen modal (About / Work /
 * Credits / Tests — all via `useModalA11y`) fully covers the canvas world, so
 * the 2D `CanvasStage` and the 3D `Stage3D` pause their render loops while one
 * stands — no point animating a world nobody can see (measured: an open panel
 * dropped a phone to ~13 fps still rendering a hidden galaxy). Counts, like the
 * scroll lock, so overlapping holders balance. Deliberately NOT the scroll lock:
 * the preloader holds that too, and the canvas must keep painting behind the
 * preloader for a live reveal.
 */
type CoverListener = () => void
let covers = 0
const coverListeners = new Set<CoverListener>()

export function isStoryCovered(): boolean {
  return covers > 0
}

export function setStoryCovered(next: boolean): void {
  const was = covers > 0
  covers = Math.max(0, covers + (next ? 1 : -1))
  const is = covers > 0
  if (was !== is) for (const listener of coverListeners) listener()
}

export function subscribeStoryCover(listener: CoverListener): () => void {
  coverListeners.add(listener)
  return () => coverListeners.delete(listener)
}
