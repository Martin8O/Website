import { useEffect, useState } from 'react'

/**
 * Two-stage boot gate: stays `false` until the page has fired `window.load`
 * AND the main thread has since gone idle, then flips `true` once (never back).
 *
 * Used to defer mounting a heavy, purely-decorative island — the additive 3D
 * stage (Dperf-4) — so its chunk fetch + three.js parse/eval never competes
 * with first paint and early interactivity. The 2D world already paints a
 * complete frame on every path, so holding the 3D layer back changes only
 * WHEN it fades in, never whether the scene is complete. Same idiom as
 * DeferredInsights (which waits on `load`, ADR-052), extended with an idle
 * beat so the ~150 ms three eval lands in slack time.
 *
 * If `load` already fired (warm cache, mounted late), only the idle beat is
 * awaited so the layer still arrives promptly. A 2 s idle timeout guarantees
 * it mounts even on a page that never truly goes idle.
 */
export function useIdleAfterLoad(): boolean {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let idleHandle = 0
    let usingIdle = false
    const win = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
      cancelIdleCallback?: (id: number) => void
    }

    const armIdle = () => {
      if (typeof win.requestIdleCallback === 'function') {
        usingIdle = true
        idleHandle = win.requestIdleCallback(() => setReady(true), { timeout: 2000 })
      } else {
        idleHandle = window.setTimeout(() => setReady(true), 200)
      }
    }

    let onLoad: (() => void) | null = null
    if (document.readyState === 'complete') {
      armIdle()
    } else {
      onLoad = () => armIdle()
      window.addEventListener('load', onLoad, { once: true })
    }

    return () => {
      if (onLoad) window.removeEventListener('load', onLoad)
      if (usingIdle) win.cancelIdleCallback?.(idleHandle)
      else if (idleHandle) window.clearTimeout(idleHandle)
    }
  }, [])

  return ready
}
