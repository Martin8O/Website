import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PROFILE } from '../data/profile'
import { scrollToProgress } from '../scroll/scrollStore'
import { useLang } from '../i18n/useLang'
import { STRINGS } from '../i18n/strings'
import type { Lang } from '../i18n/langStore'
import styles from './AboutPanel.module.css'

/**
 * The "About me" essence (C2) — a small dialog from the nav, one screen of
 * positioning (*I can help you build almost anything, fast* — and what I
 * trust rests on deep technical understanding) with the GitHub + LinkedIn
 * proof links in its footer. Body is justified, the CTA sits centered, the
 * profile links right (Martin's review calls). Same modal manners as
 * WorkPanel: focus in on open, back to the trigger on close, Escape +
 * backdrop-click close.
 */

const COPY: Record<Lang, { p1: ReactNode; p2: ReactNode }> = {
  en: {
    p1: (
      <>
        Twenty years a fighter pilot&nbsp;—&nbsp;instructor, display pilot, test pilot. Then a
        self-healing that rebuilt how I live, a Bitcoin rabbit hole that rebuilt what I
        trust&nbsp;—&nbsp;trust grounded in deep technical understanding, not in
        promises&nbsp;—&nbsp;and Claude&nbsp;Code, which turned the computer screen I once walked
        away from into a workshop: eight builds in five weeks, this site in 3½&nbsp;days.
      </>
    ),
    p2: (
      <>
        What that means for you is simple:{' '}
        <strong>I can help you build almost anything, fast.</strong> An automation, a tool, an
        app, a full platform&nbsp;—&nbsp;if you can describe it, it can be built. I bring a
        pilot&rsquo;s precision, a meditator&rsquo;s calm, and a build pace measured in days.
      </>
    ),
  },
  cs: {
    p1: (
      <>
        Dvacet let stíhací pilot&nbsp;—&nbsp;instruktor, display pilot, zkušební pilot. Pak
        sebeuzdravení, které přestavělo, jak žiju, bitcoinová králičí nora, která přestavěla,
        čemu věřím&nbsp;—&nbsp;důvěře postavené na hlubokém technickém porozumění, ne na
        slibech&nbsp;—&nbsp;a Claude&nbsp;Code, který proměnil obrazovku počítače, od níž jsem
        kdysi odešel, v dílnu: osm projektů za pět týdnů, tento web za 3½&nbsp;dne.
      </>
    ),
    p2: (
      <>
        Co to znamená pro vás, je jednoduché:{' '}
        <strong>pomůžu vám postavit téměř cokoli, rychle.</strong> Automatizaci, nástroj,
        aplikaci, celou platformu&nbsp;—&nbsp;pokud to dokážete popsat, dá se to postavit.
        Přináším přesnost pilota, klid meditujícího a tempo stavby měřené ve dnech.
      </>
    ),
  },
}

export function AboutPanel({ onClose }: { onClose: () => void }) {
  const lang = useLang()
  const t = STRINGS[lang]
  const copy = COPY[lang]
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Portal to <body>: the nav pill's backdrop-filter makes it a containing
  // block for fixed descendants, which would trap (and collapse) the overlay.
  return createPortal(
    <div className={styles.overlay} onMouseDown={onClose} data-lenis-prevent>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <div>
            <p className={styles.eyebrow}>{t.aboutEyebrow}</p>
            <h2 id="about-title" className={styles.title}>
              {t.aboutTitle}
            </h2>
          </div>
          <button ref={closeRef} className={styles.close} onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </header>

        <div className={styles.body}>
          <p>{copy.p1}</p>
          <p>{copy.p2}</p>
          <button
            className={styles.cta}
            onClick={() => {
              onClose()
              scrollToProgress(1, { immediate: true })
            }}
          >
            {t.aboutCta}
          </button>
        </div>

        <footer className={styles.links} aria-label={t.profiles}>
          {[PROFILE.github, PROFILE.linkedin].map((p) => (
            <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer">
              {p.label} <span aria-hidden="true">↗</span>
            </a>
          ))}
        </footer>
      </div>
    </div>,
    document.body,
  )
}
