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
