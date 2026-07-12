import { PROFILE } from '../data/profile'
import styles from './SiteFooter.module.css'

/**
 * The site footer (C2) — GitHub + LinkedIn as quiet proof links, bottom-right.
 * On a scrollytelling site the "footer" is the finale: it fades in only as the
 * contact chapter settles (the galaxy + email CTA), so the corner stays clean
 * for the whole journey. Hidden from pointer + tab order until visible.
 * The CC-BY model credits live in the About panel's Credits popover (not here)
 * — Martin's call: attribution in one place, unobtrusive.
 */
export function SiteFooter({ progress }: { progress: number }) {
  // Synced to the contact card's own rise (cardFull [-0.05, 0] on the last
  // chapter, ease 0.13 → pos 10.82..10.95, = progress 0.9846..0.9957 through
  // the weighted map (sunset scrollWeight 1.7 → pos p ≥ 6.5 sits at
  // (p + 0.7) / 11.7).
  const u = Math.min(1, Math.max(0, (progress - 0.9846) / 0.0111))
  const o = u * u * (3 - 2 * u)
  return (
    <footer
      className={styles.footer}
      style={{ opacity: o, visibility: o < 0.02 ? 'hidden' : 'visible' }}
    >
      <div className={styles.links}>
        {[PROFILE.github, PROFILE.linkedin].map((p) => (
          <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer">
            {p.label} <span aria-hidden="true">↗</span>
          </a>
        ))}
      </div>
    </footer>
  )
}
