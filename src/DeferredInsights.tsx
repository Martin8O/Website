import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

/**
 * Vercel Web Analytics + Speed Insights, held until AFTER `window.load`.
 *
 * Both components inject a same-origin Vercel script (`/_vercel/insights/*`,
 * `/_vercel/speed-insights/*`) the instant they mount. Mounted with the app,
 * those two requests + their execution compete for bandwidth and main-thread
 * time during the very boot the visitor is waiting on. Deferring the mount to
 * the `load` event (first frame painted, page interactive) takes them off the
 * boot window entirely.
 *
 * No measurement is lost: both libraries read Core Web Vitals via
 * PerformanceObserver with `{ buffered: true }`, so FCP/LCP/CLS that happened
 * before this mounts are still delivered from the browser's buffer — only WHEN
 * the scripts arrive moves, not what they see. If the document is already
 * `complete` when this runs (warm cache, script parsed post-load), mount
 * immediately so nothing is dropped.
 */
export function DeferredInsights() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (document.readyState === 'complete') {
      setReady(true)
      return
    }
    const onLoad = () => setReady(true)
    window.addEventListener('load', onLoad, { once: true })
    return () => window.removeEventListener('load', onLoad)
  }, [])

  if (!ready) return null
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}
