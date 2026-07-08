import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { projectsFor, type Project } from '../data/projects'
import { PROJECT_SHOTS } from '../data/projectShots'
import { useLang } from '../i18n/useLang'
import { STRINGS, buildLine, type UiStrings } from '../i18n/strings'
import type { Lang } from '../i18n/langStore'
import { useModalA11y } from './useModalA11y'
import styles from './WorkPanel.module.css'

/**
 * The Work overview — the full portfolio in one place, opened from the nav
 * "Work" button (SiteNav). A modal overlay listing EVERY project (both eras)
 * data-driven from `src/data/projects.ts` in the active language: real
 * screenshot shown FULL (uncropped — Martin's call; `id.cs` variant when the
 * site runs in Czech), name, one-liner, stack and the live link. The five
 * Claude-month apps also float as windows in chapter 08 — this is where the
 * whole body of work, old and new, is legible at a glance.
 *
 * Accessible: role=dialog + aria-modal, focus moves in on open and returns to
 * the trigger on close (SiteNav), Escape + backdrop-click close, and the list
 * is a plain scrollable column that reads fine with animations off.
 */

/** The baked screenshots for a project in the given language (EN fallback) —
 *  an array; the card stacks them vertically (hero, then detail/animation). */
function shotsFor(id: string, lang: Lang) {
  return (lang === 'cs' && PROJECT_SHOTS[`${id}.cs`]) || PROJECT_SHOTS[id]
}

function Card({ p, lang, t }: { p: Project; lang: Lang; t: UiStrings }) {
  const shots = shotsFor(p.id, lang)
  const tint = p.window?.tint ?? 'var(--amber)'
  return (
    <li className={styles.card} style={{ ['--tint' as string]: tint }}>
      <div className={styles.shot}>
        {shots ? (
          shots.map((s, i) => (
            <img
              key={s.url}
              src={s.url}
              alt={`${p.name} — ${t.screenshotAlt}${i > 0 ? ` ${i + 1}` : ''}`}
              loading="lazy"
              decoding="async"
            />
          ))
        ) : (
          <div className={styles.noshot} aria-hidden="true">
            {p.name.charAt(0)}
          </div>
        )}
        {p.badge && <span className={styles.badge}>{p.badge}</span>}
      </div>
      <div className={styles.body}>
        {/* h4: cards sit under their era's h3 group heading in the outline. */}
        <h4 className={styles.name}>{p.name}</h4>
        <p className={styles.tagline}>{p.tagline}</p>
        {/* Bottom block, pinned down so it lines up across cards: stack tags,
            the link, and the real build stats (GitHub snapshot) centered
            underneath. */}
        <ul className={styles.stack} aria-label={t.workStack}>
          {p.stack.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <div className={styles.footer}>
          <a className={styles.link} href={p.link.href} target="_blank" rel="noopener noreferrer">
            {p.link.display} <span aria-hidden="true">↗</span>
          </a>
          {!p.live && <span className={styles.status}>{p.status}</span>}
        </div>
        {p.build && (
          <p className={styles.buildStats}>{buildLine(lang, p.build.days, p.build.commits)}</p>
        )}
      </div>
    </li>
  )
}

export function WorkPanel({ onClose }: { onClose: () => void }) {
  const lang = useLang()
  const t = STRINGS[lang]
  // Display order within an era = `workOrder` (array order as fallback —
  // the array itself is the dev-scene window contract and must not move).
  const projects = projectsFor(lang)
  const byOrder = (a: Project, b: Project) =>
    (a.workOrder ?? Number.MAX_SAFE_INTEGER) - (b.workOrder ?? Number.MAX_SAFE_INTEGER)
  const claude = projects.filter((p) => p.era === 'claude').sort(byOrder)
  const before = projects.filter((p) => p.era === 'pre-claude').sort(byOrder)
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])
  // Escape closes, Tab stays inside, the story behind stops scrolling.
  useModalA11y(panelRef, onClose)

  // Portal to <body>: the nav pill's backdrop-filter makes it a containing
  // block for fixed descendants, which would trap (and collapse) the overlay.
  return createPortal(
    <div className={styles.overlay} onMouseDown={onClose} data-lenis-prevent>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="work-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <div>
            <p className={styles.eyebrow}>{t.workEyebrow}</p>
            <h2 id="work-title" className={styles.title}>
              {t.workTitle}
            </h2>
          </div>
          <button ref={closeRef} className={styles.close} onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </header>

        <div className={styles.scroll}>
          <section className={styles.group}>
            <h3 className={styles.groupHead}>
              {/* "~month" (it was really ~5 weeks) highlighted light-orange —
                  the `{m}` token places it correctly in either language. */}
              {(() => {
                const [pre, post] = t.workClaudeHead.split('{m}')
                return (
                  <>
                    {pre}
                    <span className={styles.month}>{t.workClaudeMonth}</span>
                    {post}
                  </>
                )
              })()}{' '}
              <span>{t.workClaudeSub}</span>
            </h3>
            <ul className={styles.grid}>
              {claude.map((p) => (
                <Card key={p.id} p={p} lang={lang} t={t} />
              ))}
            </ul>
          </section>

          <section className={styles.group}>
            <h3 className={styles.groupHead}>
              {t.workBeforeHead} <span>{t.workBeforeSub}</span>
            </h3>
            <ul className={styles.grid}>
              {before.map((p) => (
                <Card key={p.id} p={p} lang={lang} t={t} />
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}
