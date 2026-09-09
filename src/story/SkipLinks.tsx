import { scrollToProgress } from '../scroll/scrollStore'
import { useLang } from '../i18n/useLang'
import { STRINGS } from '../i18n/strings'
import styles from './SkipLinks.module.css'

/**
 * The first tab stop on the page (C2): keyboard / AT users can jump straight
 * to the contact finale without riding the whole life. Visually hidden until
 * focused. The jump teleports (immediate) — a skip-link that makes you sit
 * through a nine-chapter glide isn't a skip-link — then hands focus to the
 * email CTA inside the contact card (ChapterCards gives each card its
 * chapter id).
 */
export function SkipLinks() {
  const lang = useLang()
  return (
    <a
      className={styles.skip}
      href="#contact-now"
      onClick={(e) => {
        e.preventDefault()
        scrollToProgress(1, { immediate: true })
        // Focus once the card has become visible. Its opacity follows the
        // SMOOTHED progress and ChapterCards keeps it `visibility: hidden`
        // until then, and a hidden element silently refuses focus — so a
        // single frame was never enough (the audit of 2026-09-09 found the
        // jump landed but focus stayed on the skip link). Retry for up to
        // ~2 s; stop the moment the CTA actually holds focus.
        let tries = 120
        const tryFocus = () => {
          const cta = document.getElementById('contact-now')?.querySelector('a')
          cta?.focus()
          if (document.activeElement !== cta && --tries > 0) requestAnimationFrame(tryFocus)
        }
        requestAnimationFrame(tryFocus)
      }}
    >
      {STRINGS[lang].skipToContact}
    </a>
  )
}
