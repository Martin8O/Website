import { useEffect, useState } from 'react'
import { CHAPTERS } from '../data/chapters'
import { DEV, windowLayout } from '../canvas/scenes/devMath'
import styles from './DevWindowLinks.module.css'

/**
 * Clickable hit-areas over the five project windows in the `dev` scene —
 * invisible anchors that appear once ALL windows have touched down (the
 * canvas keeps painting the windows; these give them a real cursor, focus
 * ring, hover glow and an outbound link). Geometry mirrors the canvas:
 * positions from `windowLayout` (fractions of the viewport), widths as
 * fractions of `min(vw, vh)` via CSS `min()`, so no per-frame JS. The C1
 * Work section will formalize this data in `src/data/projects.ts`.
 */
const LINKS = [
  { href: 'https://github.com/Martin8O/ClearFeed', label: 'ClearFeed — GitHub', tint: '#25e3ff', aspect: 0.66 },
  { href: 'https://www.one-tenovice.cz', label: 'Těnovice fundraiser — one-tenovice.cz', tint: '#a24dff', aspect: 0.66 },
  { href: 'https://registrace.online', label: 'Registrace — registrace.online', tint: '#e0459b', aspect: 0.66 },
  { href: 'https://github.com/Martin8O/RL-Lab', label: 'RL Lab + Data Lab — GitHub', tint: '#ff6f8f', aspect: 0.58 },
  { href: 'https://github.com/Martin8O/BrainQuest', label: 'BrainQuest + dev-brain — GitHub', tint: '#3dffb4', aspect: 0.66 },
] as const

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
          className={styles.hit}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          title={link.label}
          style={{
            left: `${slots[i].x * 100}%`,
            top: `${slots[i].y * 100}%`,
            width: `calc(min(100vw, 100vh) * ${slots[i].w})`,
            aspectRatio: `1 / ${link.aspect}`,
            ['--tint' as string]: link.tint,
          }}
        />
      ))}
    </nav>
  )
}
