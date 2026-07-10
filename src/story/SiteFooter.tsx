import { PROFILE } from '../data/profile'
import styles from './SiteFooter.module.css'

/**
 * The site footer (C2) — GitHub + LinkedIn as quiet proof links, bottom-right.
 * On a scrollytelling site the "footer" is the finale: it fades in only as the
 * contact chapter settles (the galaxy + email CTA), so the corner stays clean
 * for the whole journey. Hidden from pointer + tab order until visible.
 */
export function SiteFooter({ progress }: { progress: number }) {
  // Synced to the contact card's own rise (cardFull [-0.05, 0] on the last
  // chapter, ease 0.13 → pos 10.82..10.95 of 11 = progress 0.984..0.996).
  const u = Math.min(1, Math.max(0, (progress - 0.984) / 0.012))
  const o = u * u * (3 - 2 * u)
  return (
    <footer
      className={styles.footer}
      style={{ opacity: o, visibility: o < 0.02 ? 'hidden' : 'visible' }}
    >
      {[PROFILE.github, PROFILE.linkedin].map((p) => (
        <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer">
          {p.label} <span aria-hidden="true">↗</span>
        </a>
      ))}
    </footer>
  )
}
