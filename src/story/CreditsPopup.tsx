import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { MODEL_CREDITS, MODEL_LICENSE } from '../data/credits'
import { useLang } from '../i18n/useLang'
import { STRINGS } from '../i18n/strings'
import { useModalA11y } from './useModalA11y'
import styles from './CreditsPopup.module.css'

/**
 * The model-credits mini window — its OWN small dialog, opened from the About
 * panel's quiet "Credits" link (Martin: the licences must NOT sit next to the
 * about-me copy, so this replaces the About panel rather than expanding inside
 * it). One modal at a time, so the shared modal manners apply cleanly. Every
 * hero is CC-BY-4.0 and MODIFIED by us — the intro says "based on … modified …
 * under CC BY 4.0" and links the licence, which is the full attribution the
 * licence asks for. (The AIM-9 store is our own procedural geometry, uncredited
 * by design.)
 */
export function CreditsPopup({ onClose }: { onClose: () => void }) {
  const lang = useLang()
  const t = STRINGS[lang]
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
        aria-labelledby="credits-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 id="credits-title" className={styles.title}>
            {t.credits}
          </h2>
          <button ref={closeRef} className={styles.close} onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </header>
        <p className={styles.intro}>{t.creditsBody}</p>
        <ul className={styles.list}>
          {MODEL_CREDITS.map((c) => (
            <li key={c.href}>
              <a href={c.href} target="_blank" rel="noopener noreferrer">
                {c.title}
              </a>
              {c.note ? <span className={styles.note}> ({c.note})</span> : null} — {c.author}
            </li>
          ))}
        </ul>
        <a
          className={styles.license}
          href={MODEL_LICENSE.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {MODEL_LICENSE.name} <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>,
    document.body,
  )
}
