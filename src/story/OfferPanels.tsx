import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { CHAPTERS } from '../data/chapters'
import { offerPanelsFor, offerQualityFor } from '../data/offer'
import { useLang } from '../i18n/useLang'
import { STRINGS } from '../i18n/strings'
import { cardOpacityWindowed } from '../timeline'
import { panelWindows } from '../canvas/scenes/offerMath'
import { ChunkBoundary } from './ChunkBoundary'
import styles from './OfferPanels.module.css'

// The test-suite popup carries the whole baked manifest (354+ case names) —
// its own lazy chunk, fetched only on interest, so the list costs the
// initial bundle nothing (the "zero runtime cost" of the build-time design).
const TestsPopup = lazy(() => import('./TestsPopup').then((m) => ({ default: m.TestsPopup })))

/** Warm the popup chunk the moment the visitor shows interest (hover /
 *  focus) — the click then opens it without a network beat. */
const warmTestsPopup = () => {
  void import('./TestsPopup')
}

/**
 * The DOM of the flight-plan chapter (09 — Your flight plan): the four
 * mission data panels laid over the canvas chart, all real HTML (SEO /
 * screen readers / focusable proof links). Panel N rises the moment the
 * plotted route reaches waypoint N — its window is DERIVED from the route
 * geometry in `offerMath`, one timing source with the canvas. The proof
 * panel carries the measured-quality block (Lighthouse gauges + security
 * grades, every grade a live re-scan link) under its "Open source" line.
 * Desktop: two flex columns flanking the chart. Mobile (<720): the panels
 * take turns in one central slot, cross-fading like chapter cards.
 */
const OFFER_INDEX = CHAPTERS.findIndex((c) => c.theme === 'offer')

export function OfferPanels({ pos }: { pos: number }) {
  const lang = useLang()
  const panels = offerPanelsFor(lang)
  const quality = offerQualityFor(lang)
  const [mobile, setMobile] = useState(false)
  // The test-suite popup (opened from the proof card's tests line). Focus
  // returns to the trigger on close — the SiteNav dialog manners.
  const [testsOpen, setTestsOpen] = useState(false)
  const testsBtnRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    // Landscape phones (short viewports) take the mobile one-slot layout
    // too — keep in lockstep with OfferPanels.module.css.
    const mq = window.matchMedia('(max-width: 719px), (max-height: 480px)')
    const update = () => setMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  const { full, ease } = panelWindows(mobile)

  const renderPanel = (i: number) => {
    const p = panels[i]
    const o = cardOpacityWindowed(pos, OFFER_INDEX, full[i], ease)
    return (
      <article
        key={p.id}
        className={`${styles.panel} ${styles[p.id]}`}
        // In the one-slot (mobile/landscape) layout the tall cards cap to the
        // viewport and scroll internally — let the wheel reach them there.
        // Desktop columns never scroll internally; Lenis keeps the wheel.
        {...(mobile && (p.id === 'process' || p.id === 'proof')
          ? { 'data-lenis-prevent': '' }
          : {})}
        style={{
          opacity: o,
          transform: `translate(var(--tx, 0px), calc(var(--ty, 0px) + ${(1 - o) * 10}px))`,
          // Hide faded panels from AT/tab order without unmounting them.
          visibility: o < 0.02 ? 'hidden' : 'visible',
        }}
      >
        <h3 className={styles.eyebrow}>{p.eyebrow}</h3>
        <ul className={styles.items}>
          {p.items.map((item, j) => (
            <li key={j} className={p.numbered ? styles.stepItem : styles.item}>
              {p.numbered && <span className={styles.step}>{j + 1}</span>}
              {item.label && item.href ? (
                // Proof panel (Martin): only the NAME is the amber link; the
                // description trails it as smaller, muted text.
                <span>
                  <a
                    className={`${styles.link} ${styles.nameLink}`}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    dangerouslySetInnerHTML={{ __html: item.label }}
                  />
                  <span
                    className={styles.itemDesc}
                    dangerouslySetInnerHTML={{ __html: item.html }}
                  />
                </span>
              ) : item.href ? (
                <a
                  className={styles.link}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  // Authored first-party HTML (same convention as the
                  // chapter bodies) — never user input.
                  dangerouslySetInnerHTML={{ __html: item.html }}
                />
              ) : (
                <span dangerouslySetInnerHTML={{ __html: item.html }} />
              )}
            </li>
          ))}
        </ul>
        {/* Everything about THIS very site — its self-reported facts (tests,
            source), its measured Lighthouse scores and its security grades —
            gathered under one "This website" heading (Martin). */}
        {p.id === 'proof' && (
          <div className={styles.quality}>
            <p className={styles.qualityHeading}>{quality.heading}</p>
            <ul className={styles.items}>
              {quality.selfItems.map((item, j) => {
                // On phones a shorter phrasing (htmlMobile) saves the tall
                // proof card the lines it can't spare.
                const html = mobile && item.htmlMobile ? item.htmlMobile : item.html
                return (
                  <li key={j} className={styles.item}>
                    {item.testsLead ? (
                      // The tests line: the bold count is a quiet button that
                      // opens the baked test-suite list (build-time manifest,
                      // zero runtime cost); the rest of the line stays plain.
                      <span>
                        <button
                          ref={testsBtnRef}
                          type="button"
                          className={styles.testsBtn}
                          onClick={() => setTestsOpen(true)}
                          onPointerEnter={warmTestsPopup}
                          onFocus={warmTestsPopup}
                          aria-haspopup="dialog"
                          aria-expanded={testsOpen}
                          dangerouslySetInnerHTML={{ __html: item.testsLead }}
                        />
                        <span dangerouslySetInnerHTML={{ __html: html }} />
                      </span>
                    ) : item.linkText && item.href ? (
                      // Bold lead stays plain text; only the trailing phrase is
                      // the link (Martin: link just "here").
                      <span>
                        <span dangerouslySetInnerHTML={{ __html: html }} />
                        <a
                          className={styles.link}
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          dangerouslySetInnerHTML={{ __html: item.linkText }}
                        />
                      </span>
                    ) : item.href ? (
                      <a
                        className={styles.link}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        dangerouslySetInnerHTML={{ __html: html }}
                      />
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: html }} />
                    )}
                  </li>
                )
              })}
            </ul>
            <p className={styles.qualityGaugesLabel}>{quality.gaugesLabel}</p>
            <div className={styles.gauges}>
              {quality.gauges.map((g) => (
                <div key={g.label} className={styles.gauge}>
                  <span
                    className={styles.gaugeRing}
                    style={{ ['--val' as string]: g.value }}
                    aria-hidden="true"
                  >
                    {g.value}
                  </span>
                  <span className={styles.gaugeLabel}>{g.label}</span>
                </div>
              ))}
            </div>
            <div className={styles.grades}>
              {quality.grades.map((g) => (
                <a
                  key={g.href}
                  className={styles.grade}
                  href={g.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  dangerouslySetInnerHTML={{ __html: g.html }}
                />
              ))}
            </div>
          </div>
        )}
        {p.foot && <p className={styles.foot}>{p.foot}</p>}
      </article>
    )
  }

  return (
    <section className={styles.panels} aria-label={STRINGS[lang].offerLandmark}>
      {/* Desktop: two flex columns flanking the chart — blocks stack and can
          never overlap, whatever their heights. Mobile: the wrappers become
          display:contents and each panel takes its central-slot turn. */}
      <div className={`${styles.col} ${styles.colLeft}`}>
        {renderPanel(0)}
        {renderPanel(1)}
      </div>
      <div className={`${styles.col} ${styles.colRight}`}>
        {renderPanel(2)}
        {renderPanel(3)}
      </div>
      {testsOpen && (
        // Deploy skew can 404 the lazy chunk — fail quietly, the story stands.
        <ChunkBoundary>
          <Suspense fallback={null}>
            <TestsPopup
              onClose={() => {
                setTestsOpen(false)
                testsBtnRef.current?.focus()
              }}
            />
          </Suspense>
        </ChunkBoundary>
      )}
    </section>
  )
}
