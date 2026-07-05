import { useSyncExternalStore } from 'react'
import { getScrollProgress, subscribe } from './scrollStore'

/**
 * Read the global `scrollProgress` (0..1) inside any component. Backed by the
 * external `scrollStore`, so a component only re-renders when the value it
 * reads actually changes.
 */
export function useScrollProgress(): number {
  return useSyncExternalStore(subscribe, getScrollProgress, getScrollProgress)
}
