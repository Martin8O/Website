import { useEffect, useState } from 'react'
import { CHAPTERS } from '../data/chapters'
import { DEV_PROJECTS } from '../data/projects'
import { DEV, windowLayout } from '../canvas/scenes/devMath'
import styles from './DevWindowLinks.module.css'

/**
 * Clickable hit-areas over the five project windows in the `dev` scene —
 * invisible anchors that appear once ALL windows have touched down (the
 * canvas keeps painting the windows; these give them a real cursor, focus
 * ring, hover glow and an outbound link). Geometry mirrors the canvas:
 * positions from `windowLayout` (fractions of the viewport), widths as
 * fractions of `min(vw, vh)` via CSS `min()`, so no per-frame JS. Content
 * (href · tint · panel ratio) is the single source of truth in
 * `src/data/projects.ts` — the same `DEV_PROJECTS` the canvas paints.
 */
const LINKS = DEV_PROJECTS.map((p) => ({
  href: p.link.href,
  name: p.name,
  label: `${p.name} — ${p.link.display}`,
  tagline: p.tagline,
  stack: p.stack,
  tint: p.window.tint,
  aspect: p.window.aspect ?? 0.66,
}))

const DEV_INDEX = CHAPTERS.findIndex((c) => c.theme === 'dev')

export function DevWindowLinks({ pos }: { pos: number }) {
  const [aspect, setAspect] = useState(16 / 9)
  useEffect(() => {
    const measure = () => setAspect(window.innerWidth / Math.max(1, window.innerHeight))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Live only while the landed constellation owns the frame: from the
  // touchdown (chapter + 0.5) until the hand-over veil takes it.
  const landed = pos >= DEV_INDEX + 0.5 && pos <= DEV_INDEX + 0.95
  if (!landed) return null

  const slots = windowLayout(aspect)
  return (
    <nav className={styles.links} aria-label="Projects">
      {LINKS.slice(0, DEV.windows).map((link, i) => (
        <a
          key={link.href}
          className={`${styles.hit} ${slots[i].y < 0.5 ? styles.below : styles.above}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          style={{
            left: `${slots[i].x * 100}%`,
            top: `${slots[i].y * 100}%`,
            width: `calc(min(100vw, 100vh) * ${slots[i].w})`,
            aspectRatio: `1 / ${link.aspect}`,
            ['--tint' as string]: link.tint,
          }}
        >
          {/* Hover / focus detail: what the app IS + its stack (the same copy
              the Work panel shows). */}
          <span className={styles.tip} role="tooltip">
            <span className={styles.tipName}>{link.name}</span>
            <span className={styles.tipTag}>{link.tagline}</span>
            <span className={styles.tipStack}>
              {link.stack.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </span>
          </span>
        </a>
      ))}
    </nav>
  )
}
