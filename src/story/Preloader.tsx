import { useEffect, useRef, useState } from 'react'
import { setScrollLocked } from '../scroll/scrollStore'
import { useLang } from '../i18n/useLang'
import { STRINGS } from '../i18n/strings'
import styles from './Preloader.module.css'

/**
 * The C4 boot screen — a quiet amber gate in the HUD's own voice (mono type,
 * hairline bar, % readout) that holds the journey until the critical assets
 * are truly in: the three brand fonts (forced to load — `fonts.ready` alone
 * resolves before unused faces even start), the window `load`, and a short
 * hold so the bar reads as a moment, not a flash. Scroll is locked while it
 * stands (Lenis stop via the scrollStore + a keyboard guard here); a hard
 * failsafe timeout means a wedged font CDN can never brick the site.
 *
 * Reduced motion: no sweep animation — the overlay simply stands until ready
 * and leaves instantly.
 */

/** Signals gating the unlock: fonts · window load · minimum hold. */
const SIGNALS = 3
/** Never hold the site hostage — unlock no matter what after this. */
const FAILSAFE_MS = 4000

export function Preloader() {
  const lang = useLang()
  const [leaving, setLeaving] = useState(false)
  const [gone, setGone] = useState(false)
  const barRef = useRef<HTMLDivElement | null>(null)
  const pctRef = useRef<HTMLSpanElement | null>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let cancelled = false
    let finished = false
    let done = 0
    let shown = 0
    let rafId = 0

    // The lock counts (scrollStore) — release exactly once, whether the gate
    // finishes normally or the effect is torn down (StrictMode, HMR).
    let holdsLock = true
    setScrollLocked(true)
    const releaseLock = () => {
      if (holdsLock) {
        holdsLock = false
        setScrollLocked(false)
      }
    }

    // Lenis stops wheel/touch; keyboard scrolling is native — gate it too.
    const SCROLL_KEYS = new Set([
      ' ',
      'PageDown',
      'PageUp',
      'ArrowDown',
      'ArrowUp',
      'Home',
      'End',
    ])
    const keyGuard = (e: KeyboardEvent) => {
      // Space on a focused button/link is activation, not scrolling.
      if ((e.target as Element | null)?.closest?.('button, a, [role="button"]')) return
      if (SCROLL_KEYS.has(e.key)) e.preventDefault()
    }
    window.addEventListener('keydown', keyGuard)

    const arm = () => {
      if (!cancelled && !finished) done += 1
    }

    // Fonts: request each family explicitly, then count the signal. The
    // wordmark below uses all three faces, but a load() call is the only
    // guarantee the browser has even STARTED fetching them.
    Promise.all([
      document.fonts.load('600 1rem "Space Grotesk"'),
      document.fonts.load('400 1rem "Inter"'),
      document.fonts.load('500 1rem "Chakra Petch"'),
    ])
      .catch(() => undefined)
      .then(arm)

    const onLoad = () => arm()
    if (document.readyState === 'complete') {
      arm()
    } else {
      window.addEventListener('load', onLoad, { once: true })
    }

    const minHold = setTimeout(arm, reduced ? 100 : 650)
    const failsafe = setTimeout(() => {
      done = SIGNALS
    }, FAILSAFE_MS)

    const finish = () => {
      finished = true
      releaseLock()
      window.removeEventListener('keydown', keyGuard)
      setLeaving(true)
      if (reduced) {
        setGone(true)
      } else {
        setTimeout(() => {
          if (!cancelled) setGone(true)
        }, 650)
      }
    }

    const tick = () => {
      if (cancelled || finished) return
      const target = done / SIGNALS
      // Ease the shown value toward the real signal count; snap the last inch
      // so the bar visibly completes before the overlay leaves.
      shown += (target - shown) * (reduced ? 1 : 0.14)
      if (target >= 1 && shown > 0.985) shown = 1
      if (barRef.current) barRef.current.style.transform = `scaleX(${shown})`
      if (pctRef.current) pctRef.current.textContent = `${Math.round(shown * 100)} %`
      if (shown >= 1) {
        finish()
      } else {
        rafId = requestAnimationFrame(tick)
      }
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      clearTimeout(minHold)
      clearTimeout(failsafe)
      window.removeEventListener('load', onLoad)
      window.removeEventListener('keydown', keyGuard)
      // Never leave the site locked (StrictMode re-mount, HMR).
      releaseLock()
    }
  }, [])

  if (gone) return null

  const t = STRINGS[lang]
  return (
    <div
      className={`${styles.shell} ${leaving ? styles.leave : ''}`}
      role="status"
      aria-label={t.loading}
    >
      <div className={styles.inner} aria-hidden="true">
        <p className={styles.mark}>Martin</p>
        <div className={styles.track}>
          <div ref={barRef} className={styles.bar} />
        </div>
        <p className={styles.line}>
          <span>{t.loading}</span>
          <span ref={pctRef} className={styles.pct}>
            0 %
          </span>
        </p>
      </div>
    </div>
  )
}
