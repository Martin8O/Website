import { useEffect, useMemo, useState } from 'react'
import { CHAPTERS } from '../data/chapters'
import { projectsFor, type DevProject } from '../data/projects'
import { useLang } from '../i18n/useLang'
import { STRINGS } from '../i18n/strings'
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
const DEV_INDEX = CHAPTERS.findIndex((c) => c.theme === 'dev')

export function DevWindowLinks({ pos }: { pos: number }) {
  const lang = useLang()
  // Same five windows the canvas paints, with the active language's copy for
  // the hover/focus detail (projectsFor caches per language → cheap memo).
  const links = useMemo(
    () =>
      projectsFor(lang)
        .filter((p): p is DevProject => p.window !== undefined)
        .map((p) => ({
          href: p.link.href,
          name: p.name,
          label: `${p.name} — ${p.link.display}`,
          tagline: p.tagline,
          stack: p.stack,
          tint: p.window.tint,
          aspect: p.window.aspect ?? 0.66,
        })),
    [lang],
  )
  const [aspect, setAspect] = useState(16 / 9)
  useEffect(() => {
    const measure = () => setAspect(window.innerWidth / Math.max(1, window.innerHeight))
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Live only while the landed constellation owns the frame: from the
  // touchdown (chapter + 0.5) until 98 % (chapter + 0.8), where the contact
  // galaxy takes over — past that the windows are only a fading backdrop and
  // must NOT stay clickable / hover-lit under the nebula (Martin).
  const landed = pos >= DEV_INDEX + 0.5 && pos <= DEV_INDEX + 0.8
  if (!landed) return null

  const slots = windowLayout(aspect)
  return (
    <nav className={styles.links} aria-label={STRINGS[lang].projectsLandmark}>
      {links.slice(0, DEV.windows).map((link, i) => (
        <a
          key={link.href}
          className={`${styles.hit} ${styles.below}`}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          aria-describedby={`devwin-tag-${i}`}
          style={{
            left: `${slots[i].x * 100}%`,
            top: `${slots[i].y * 100}%`,
            width: `calc(min(100vw, 100vh) * ${slots[i].w})`,
            aspectRatio: `1 / ${link.aspect}`,
            ['--tint' as string]: link.tint,
          }}
        >
          {/* Hover / focus detail: what the app IS + its stack (the same copy
              the Work panel shows). The tagline is wired to the anchor via
              aria-describedby so a screen reader announces it after the label
              (the stack is left out — it would be read verbatim every time). */}
          <span className={styles.tip} role="tooltip">
            <span className={styles.tipName}>{link.name}</span>
            <span id={`devwin-tag-${i}`} className={styles.tipTag}>
              {link.tagline}
            </span>
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
