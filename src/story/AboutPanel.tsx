import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PROFILE } from '../data/profile'
import { scrollToProgress } from '../scroll/scrollStore'
import { useLang } from '../i18n/useLang'
import { STRINGS } from '../i18n/strings'
import type { Lang } from '../i18n/langStore'
import { useModalA11y } from './useModalA11y'
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
        Twenty years in the Air Force&nbsp;—&nbsp;military jet pilot, instructor, display pilot,
        acceptance test pilot. Mid-career, a self-healing that rebuilt how I live and a Bitcoin rabbit hole
        that rebuilt what I trust: technical understanding over promises. And now, with
        Claude&nbsp;Code, we&rsquo;ve built a hyper-efficient workshop&nbsp;—&nbsp;five real apps and{' '}
        <span className={styles.highlight}>this site</span>, each one built properly and verified
        end to end.
        <br /> And fast&nbsp;—&nbsp;the site itself went from an empty folder to a live production
        deploy <span className={styles.highlight}>in 4&nbsp;days</span>, then extended into{' '}
        <span className={styles.highlight}>a 3D version</span>, with its own animation studio,{' '}
        <span className={styles.highlight}>in 4&nbsp;more</span>.
      </>
    ),
    p2: (
      <>
        What that means for you is simple:{' '}
        <strong>I can build you almost anything, well and fast.</strong> A website, an app, a tool,
        an automation. I take on the small-to-medium ones and carry them start to finish.
        If you can describe it, it can be built. I bring a pilot&rsquo;s precision, a
        meditator&rsquo;s calm, and a quality build pace measured in days.
      </>
    ),
  },
  cs: {
    p1: (
      <>
        Dvacet let u letectva&nbsp;–&nbsp;pilot proudových letounů, instruktor, display pilot,
        zalétávací pilot. Uprostřed toho sebeuzdravení, které přestavělo, jak žiju, a&nbsp;bitcoinová
        králičí nora, po&nbsp;které věřím spíš technickému porozumění než slibům. A&nbsp;teď
        jsme s&nbsp;Claude&nbsp;Code postavili super efektivní dílnu&nbsp;–&nbsp;pět skutečných
        aplikací a{' '}
        <span className={styles.highlight}>tento web</span>, všechny pořádně a&nbsp;ověřené od
        začátku do konce.
        <br /> A&nbsp;rychle: z&nbsp;prázdné složky až po produkční nasazení{' '}
        <span className={styles.highlight}>za 4&nbsp;dny</span>&nbsp;–&nbsp;a&nbsp;pak rozšíření
        o&nbsp;<span className={styles.highlight}>3D verzi</span>, s&nbsp;vlastním animačním studiem,{' '}
        <span className={styles.highlight}>za&nbsp;další 4&nbsp;dny</span>.
      </>
    ),
    p2: (
      <>
        Co to znamená pro vás, je jednoduché:{' '}
        <strong>Mohu vám postavit téměř cokoli, kvalitně a rychle.</strong> Web, aplikaci, nástroj,
        automatizaci. Beru si malé až střední projekty a&nbsp;dovedu je až do cíle.
        Pokud to dokážete popsat, dá se to postavit. Přináším přesnost pilota, klid
        meditujícího a&nbsp;tempo kvalitní stavby měřené ve dnech.
      </>
    ),
  },
}

export function AboutPanel({
  onClose,
  onCredits,
  instant = false,
}: {
  onClose: () => void
  onCredits: () => void
  /** True when About REPLACES the Credits popup (the return leg of the
   *  swap): the dark backdrop must stand instantly — a fade-from-zero
   *  would flash the story scene at full strength between the dialogs.
   *  The return leg also puts focus back on the Credits toggle (the
   *  control that opened the popup), not the panel's close button. */
  instant?: boolean
}) {
  const lang = useLang()
  const t = STRINGS[lang]
  const copy = COPY[lang]
  const closeRef = useRef<HTMLButtonElement>(null)
  const creditsRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    ;((instant ? creditsRef.current : closeRef.current) ?? closeRef.current)?.focus()
    // Mount-only: `instant` is fixed for a given open (About remounts on
    // every open — SiteNav conditional-renders it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // Escape closes, Tab stays inside, the story behind stops scrolling.
  useModalA11y(panelRef, onClose)

  // Portal to <body>: the nav pill's backdrop-filter makes it a containing
  // block for fixed descendants, which would trap (and collapse) the overlay.
  return createPortal(
    <div
      className={instant ? `${styles.overlay} ${styles.instant}` : styles.overlay}
      onMouseDown={onClose}
      data-lenis-prevent
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <img
            className={styles.avatar}
            src="/martin.jpg"
            alt="Martin Svoboda"
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
          />
          <div className={styles.titleWrap}>
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

        <footer className={styles.foot}>
          <div className={styles.footRow}>
            <button
              ref={creditsRef}
              type="button"
              className={styles.creditsToggle}
              onClick={onCredits}
              aria-haspopup="dialog"
            >
              {t.credits}
            </button>
            <div className={styles.links} aria-label={t.profiles}>
              {[PROFILE.github, PROFILE.linkedin].map((p) => (
                <a key={p.label} href={p.href} target="_blank" rel="noopener noreferrer">
                  {p.label} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
