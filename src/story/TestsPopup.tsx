import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { TEST_COUNT, TEST_MANIFEST } from '../data/testManifest'
import { useLang } from '../i18n/useLang'
import { STRINGS } from '../i18n/strings'
import { useModalA11y } from './useModalA11y'
import styles from './TestsPopup.module.css'

/**
 * The proof-panel test-suite mini window — the Credits popup's sibling. The
 * "354 automated tests" claim made inspectable: every collected vitest case,
 * baked at BUILD time into a static manifest (src/data/testManifest.ts, its
 * only importer is this lazy chunk — zero runtime cost, no shipped runner).
 * Same manners as CreditsPopup: instant dark backdrop (no fade — the story
 * scene must never flash under the window), rising panel, modal a11y.
 */
export function TestsPopup({ onClose }: { onClose: () => void }) {
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
        aria-labelledby="tests-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 id="tests-title" className={styles.title}>
            {t.testsTitle} · {TEST_COUNT}
          </h2>
          <button ref={closeRef} className={styles.close} onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </header>
        <p className={styles.intro}>{t.testsBody}</p>
        <div className={styles.list}>
          {TEST_MANIFEST.map((entry) => (
            <section key={entry.file} className={styles.group}>
              <h3 className={styles.file}>
                {/* "src/canvas/sceneTimeline.test.ts" → "canvas/sceneTimeline" */}
                {entry.file.replace(/^src\//, '').replace(/\.test\.ts$/, '')}
                <span className={styles.fileCount}> · {entry.tests.length}</span>
              </h3>
              <ul className={styles.cases}>
                {entry.tests.map((name) => (
                  <li key={name} className={styles.case}>
                    {name.replaceAll(' > ', ' › ')}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
