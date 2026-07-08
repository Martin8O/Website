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
        // Focus after the card has become visible (opacity follows progress).
        requestAnimationFrame(() => {
          document.getElementById('contact-now')?.querySelector('a')?.focus()
        })
      }}
    >
      {STRINGS[lang].skipToContact}
    </a>
  )
}
