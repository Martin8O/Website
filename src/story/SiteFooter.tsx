import { MODEL_CREDITS } from '../data/credits'
import { PROFILE } from '../data/profile'
import styles from './SiteFooter.module.css'

/**
 * The site footer (C2) — GitHub + LinkedIn as quiet proof links, bottom-right.
 * On a scrollytelling site the "footer" is the finale: it fades in only as the
 * contact chapter settles (the galaxy + email CTA), so the corner stays clean
 * for the whole journey. Hidden from pointer + tab order until visible.
 * E3b adds the CC-BY model credits as a second, quieter line — attribution
 * for the 3D aircraft heroes, rendered where credits belong: at the end.
 */
export function SiteFooter({ progress }: { progress: number }) {
  // Synced to the contact card's own rise (cardFull [-0.05, 0] on the last
  // chapter, ease 0.13 → pos 10.82..10.95, = progress 0.9853..0.9962 through
  // the weighted map (climb scrollWeight 2 → pos p ≥ 2.5 sits at (p+1)/12).
  const u = Math.min(1, Math.max(0, (progress - 0.9853) / 0.0109))
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
      <p className={styles.credits}>
        3D aircraft:{' '}
        {MODEL_CREDITS.map((c, i) => (
          <span key={c.href}>
            {i > 0 && ' · '}
            <a href={c.href} target="_blank" rel="noopener noreferrer">
              {c.title}
            </a>{' '}
            by {c.author}
          </span>
        ))}{' '}
        (CC-BY 4.0)
      </p>
    </footer>
  )
}
