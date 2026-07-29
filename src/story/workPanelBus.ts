/**
 * The intro card's "Projects" button opens the very same Work dialog the nav
 * owns (`SiteNav` holds its open state and the lazy chunk) — so the request
 * travels as a window event instead of lifting that state into the app.
 *
 * Its own module, like `contactFlash` (and named …Bus, because a case-only
 * twin of `WorkPanel.tsx` breaks the build on case-insensitive filesystems):
 * a component file may only export
 * components, or Vite's fast-refresh falls back to full reloads for every
 * edit of that file (react-refresh/only-export-components).
 */
const OPEN_WORK_EVENT = 'open-work-panel'

export function openWorkPanel(): void {
  window.dispatchEvent(new Event(OPEN_WORK_EVENT))
}

/** Subscribe to the open request; returns the unsubscribe. */
export function onOpenWorkPanel(listener: () => void): () => void {
  window.addEventListener(OPEN_WORK_EVENT, listener)
  return () => window.removeEventListener(OPEN_WORK_EVENT, listener)
}
