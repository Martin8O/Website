import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { changelogFor, formatChangelogDate } from '../data/changelog'
import { useLang } from '../i18n/useLang'
import { STRINGS } from '../i18n/strings'
import { useModalA11y } from './useModalA11y'
import { ExternalArrow } from './ExternalArrow'
import styles from './ChangelogPopup.module.css'

/**
 * The build-history mini window — Credits' twin, opened from the same quiet
 * strip at the foot of the About panel and replacing About the same way (one
 * modal at a time, closing returns to About). A dated rail of the four
 * milestones from `data/changelog.ts`, each linking to the real commit or
 * package it happened in.
 */
export function ChangelogPopup({ onClose }: { onClose: () => void }) {
  const lang = useLang()
  const t = STRINGS[lang]
  const entries = changelogFor(lang)
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])
  useModalA11y(panelRef, onClose)

  return createPortal(
    <div className={styles.overlay} onMouseDown={onClose} data-lenis-prevent>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="changelog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 id="changelog-title" className={styles.title}>
            {t.changelog}
          </h2>
          <button ref={closeRef} className={styles.close} onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </header>
        <p className={styles.intro}>{t.changelogBody}</p>
        <ol className={styles.list}>
          {entries.map((e) => (
            <li key={e.id} className={styles.entry}>
              <span className={styles.dot} aria-hidden="true" />
              <p className={styles.meta}>
                <time dateTime={e.date}>{formatChangelogDate(lang, e.date)}</time>
                {e.version ? <span className={styles.version}>{e.version}</span> : null}
              </p>
              <h3 className={styles.entryTitle}>{e.title}</h3>
              <p className={styles.body}>{e.body}</p>
              {e.link ? (
                <a
                  className={styles.link}
                  href={e.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {e.link.display} <span aria-hidden="true"><ExternalArrow /></span>
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>,
    document.body,
  )
}
