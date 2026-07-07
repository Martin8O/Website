import { useEffect, useRef } from 'react'
import { PROJECTS, type Project } from '../data/projects'
import { PROJECT_SHOTS } from '../data/projectShots'
import styles from './WorkPanel.module.css'

/**
 * The Work overview — the full portfolio in one place, opened from the nav
 * "Work" button (SiteNav). A modal overlay listing EVERY project (both eras)
 * data-driven from `src/data/projects.ts`: real screenshot (PROJECT_SHOTS,
 * lazy data-URLs), name, one-liner, stack and the live link. The five
 * Claude-month apps also float as windows in chapter 08 — this is where the
 * whole body of work, old and new, is legible at a glance.
 *
 * Accessible: role=dialog + aria-modal, focus moves in on open and returns to
 * the trigger on close (SiteNav), Escape + backdrop-click close, and the list
 * is a plain scrollable column that reads fine with animations off.
 */

const CLAUDE = PROJECTS.filter((p) => p.era === 'claude')
const BEFORE = PROJECTS.filter((p) => p.era === 'pre-claude')

function Card({ p }: { p: Project }) {
  const shot = PROJECT_SHOTS[p.id]
  const tint = p.window?.tint ?? 'var(--amber)'
  return (
    <li className={styles.card} style={{ ['--tint' as string]: tint }}>
      <div className={styles.shot}>
        {shot ? (
          <img src={shot.url} alt={`${p.name} screenshot`} loading="lazy" decoding="async" />
        ) : (
          <div className={styles.noshot} aria-hidden="true">
            {p.name.charAt(0)}
          </div>
        )}
        {p.badge && <span className={styles.badge}>{p.badge}</span>}
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{p.name}</h3>
        <p className={styles.tagline}>{p.tagline}</p>
        <ul className={styles.stack} aria-label="Stack">
          {p.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <div className={styles.footer}>
          <a className={styles.link} href={p.link.href} target="_blank" rel="noopener noreferrer">
            {p.link.display} <span aria-hidden="true">↗</span>
          </a>
          {!p.live && <span className={styles.status}>{p.status ?? 'private'}</span>}
        </div>
      </div>
    </li>
  )
}

export function WorkPanel({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={styles.overlay} onMouseDown={onClose} data-lenis-prevent>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-title"
        ref={panelRef}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <div>
            <p className={styles.eyebrow}>Work</p>
            <h2 id="work-title" className={styles.title}>
              Everything I&#39;ve built
            </h2>
          </div>
          <button ref={closeRef} className={styles.close} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className={styles.scroll}>
          <section className={styles.group}>
            <h3 className={styles.groupHead}>
              The Claude-Code month <span>· five real apps in ~a month</span>
            </h3>
            <ul className={styles.grid}>
              {CLAUDE.map((p) => (
                <Card key={p.id} p={p} />
              ))}
            </ul>
          </section>

          <section className={styles.group}>
            <h3 className={styles.groupHead}>
              Before <span>· first builds &amp; experiments</span>
            </h3>
            <ul className={styles.grid}>
              {BEFORE.map((p) => (
                <Card key={p.id} p={p} />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
