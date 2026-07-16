import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  bumpBuildUrgency,
  getHeroLoadSnapshot,
  subscribeHeroLoad,
  type HeroKey,
} from '../three/heroLoad'
import { CHAPTERS } from '../data/chapters'
import { buildRuns } from '../canvas/sceneTimeline'
import { useLang } from '../i18n/useLang'
import { STRINGS } from '../i18n/strings'
import { buildHeroWindows, pickHeroIndicator } from './heroIndicatorMath'
import styles from './HeroLoadIndicator.module.css'

/**
 * The HUD "3D systems" chip — bottom-left, above the era gauge, in the same
 * cockpit-instrument voice: while the nearest hero scene's GLB build is in
 * flight it shows a small filling bar, and when the build lands it flashes a
 * ✓ beat and goes quiet. The one job: tell the visitor that the 2D scene
 * they are reading is NOT the maximum — the 3D layer is on its way (the
 * mobile brief's "clock" feature). Renders only in '3d' world mode (Story
 * gates it with the Stage3D mount), so reduced-motion / weak clients never
 * see it; when every hero is ready it renders nothing at all.
 */

const WINDOWS = buildHeroWindows(buildRuns(CHAPTERS))

/** How long the ✓ payoff holds after a narrated hero lands, ms. */
const READY_FLASH_MS = 1600

export function HeroLoadIndicator({ pos }: { pos: number }) {
  const lang = useLang()
  const t = STRINGS[lang]
  const snap = useSyncExternalStore(subscribeHeroLoad, getHeroLoadSnapshot)
  const loadingKey = pickHeroIndicator(pos, WINDOWS, snap)

  // While the bar is ON SCREEN the visitor is watching the load — keep the
  // sliced build on its fast idle timeout even when they stand still before
  // the beat's own urgency window (a standing viewer has no scroll to keep
  // smooth). Without this a build whose beat was still a chapter away sliced
  // at the gentle background pace and the watched bar crawled (Pixel report:
  // "stops until I scroll on"). An interval, not per-render: the silent
  // build phases don't re-render the chip.
  useEffect(() => {
    if (!loadingKey) return
    bumpBuildUrgency()
    const timer = window.setInterval(() => bumpBuildUrgency(), 300)
    return () => window.clearInterval(timer)
  }, [loadingKey])

  // The ✓ payoff: when the hero the chip was narrating flips to ready, hold
  // the chip for a beat with the check instead of vanishing mid-glance.
  const [flash, setFlash] = useState<HeroKey | null>(null)
  const narrated = useRef<HeroKey | null>(null)
  useEffect(() => {
    if (loadingKey) {
      narrated.current = loadingKey
      setFlash(null)
      return
    }
    const last = narrated.current
    if (last && snap[last].phase === 'ready') {
      narrated.current = null
      setFlash(last)
      const timer = window.setTimeout(() => setFlash(null), READY_FLASH_MS)
      return () => window.clearTimeout(timer)
    }
  }, [loadingKey, snap])

  if (!loadingKey && !flash) return null
  const ready = !loadingKey
  const progress = ready ? 1 : snap[loadingKey].progress

  return (
    <div className={styles.chip} role="status" aria-label={ready ? t.heroReady : t.heroLoading}>
      <span className={styles.label} aria-hidden="true">
        3D
      </span>
      <span className={styles.track} aria-hidden="true">
        <span className={styles.fill} style={{ width: `${Math.round(progress * 100)}%` }} />
      </span>
      <span className={styles.pct} aria-hidden="true">
        {ready ? '✓' : `${Math.round(progress * 100)}%`}
      </span>
    </div>
  )
}
