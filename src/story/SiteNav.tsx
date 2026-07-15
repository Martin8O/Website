import { Suspense, lazy, useCallback, useRef, useState } from 'react'
import { getScrollProgress, scrollToProgress } from '../scroll/scrollStore'
import { CHAPTERS, CHAPTER_WEIGHTS } from '../data/chapters'
import { chapterPosition, progressFromPos } from '../timeline'
import { useLang } from '../i18n/useLang'
import { setLang } from '../i18n/langStore'
import { STRINGS } from '../i18n/strings'
import { setWorldChoice, useWorldMode, useWorld3DAvailable } from '../three/worldMode'
import { AboutPanel } from './AboutPanel'
import { CreditsPopup } from './CreditsPopup'
import { ChunkBoundary } from './ChunkBoundary'
import styles from './SiteNav.module.css'

/**
 * Minimal, unobtrusive nav (C2) — one quiet glass pill, top-right:
 * Home (house icon, back to the story start) · Work · Contact · About ·
 * CZ/EN · 2D/3D. Work + Contact are one click away without scrolling the
 * whole life (ROADMAP §8b). Home/Contact jumps TELEPORT (Martin: no
 * auto-scroll racing through every scene). The language button shows the
 * language it switches TO — and the world toggle follows the same idiom
 * (shows the world it switches to; 3D is the default, 2D the light
 * fallback). It hides entirely when the hard gates (reduced motion, no
 * WebGL2) mean 3D can never run. The heavy Work panel stays code-split
 * behind React.lazy; About is a page of text and ships inline. Focus
 * returns to the trigger when a dialog closes.
 */
const WorkPanel = lazy(() => import('./WorkPanel').then((m) => ({ default: m.WorkPanel })))

export function SiteNav() {
  const lang = useLang()
  const t = STRINGS[lang]
  const worldMode = useWorldMode()
  const world3dAvailable = useWorld3DAvailable()
  // 'credits' is a mini window opened FROM about — it replaces the about panel
  // (Martin: the licences must not show next to the about-me copy), so only one
  // dialog stands at a time. Closing it returns to about.
  const [open, setOpen] = useState<'work' | 'about' | 'credits' | null>(null)
  // About↔Credits is a SWAP, not a fresh open: the returning About must skip
  // its backdrop fade-in, or the story scene flashes at full strength for a
  // frame between the two dark overlays (Martin's catch — same reason the
  // Credits overlay never animates its backdrop at all).
  const returning = useRef(false)
  const workRef = useRef<HTMLButtonElement>(null)
  const aboutRef = useRef<HTMLButtonElement>(null)

  const closeWork = useCallback(() => {
    setOpen(null)
    workRef.current?.focus()
  }, [])
  const closeAbout = useCallback(() => {
    setOpen(null)
    aboutRef.current?.focus()
  }, [])

  // Flip 2D↔3D, then TELEPORT to the start of the current chapter so scrolling
  // down replays the beat in the new mode (Martin: a manual jump on toggle —
  // NOT an auto-restart when the 3D finishes loading). The visitor's choice
  // persists (localStorage) and beats the weak-client / FPS auto-fallback —
  // their word is final. Same immediate-teleport idiom as Home/Contact.
  const toggleWorld = useCallback(() => {
    setWorldChoice(worldMode === '3d' ? '2d' : '3d')
    const count = CHAPTERS.length
    const pos = chapterPosition(getScrollProgress(), count, CHAPTER_WEIGHTS)
    const idx = Math.max(0, Math.min(count - 1, Math.round(pos)))
    // Chapter 0 IS the top of the page (the intro starfield has no aircraft
    // beat to re-enter), so jumping "to its start" just yanks to scroll 0 —
    // instead leave the scroll put and only flip the mode. For a real chapter,
    // land a little INTO it, NOT at the raw span boundary (pos idx−0.5): the
    // boundary still shows the previous chapter's cross-fade tail, which reads
    // as "the end of the last chapter" (Martin's catch on ch-01). idx−0.32
    // clears the fade so the current chapter is unmistakably the one on screen,
    // and scrolling down replays its beat in the new mode.
    if (idx >= 1) {
      scrollToProgress(progressFromPos(idx - 0.32, CHAPTER_WEIGHTS), { immediate: true })
    }
  }, [worldMode])

  return (
    <nav className={styles.nav} aria-label={t.navLandmark}>
      <button
        className={`${styles.item} ${styles.home}`}
        onClick={() => scrollToProgress(0, { immediate: true })}
        aria-label={t.navHome}
        title={t.navHome}
      >
        {/* Simple house glyph, drawn inline so it inherits the amber color. */}
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            d="M8 1.6 1.6 7.2h1.8v6.4h3.4V9.8h2.4v3.8h3.4V7.2h1.8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        ref={workRef}
        className={styles.item}
        onClick={() => setOpen('work')}
        aria-haspopup="dialog"
        aria-expanded={open === 'work'}
      >
        {t.navWork}
      </button>
      <button className={styles.item} onClick={() => scrollToProgress(1, { immediate: true })}>
        {t.navContact}
      </button>
      <button
        ref={aboutRef}
        className={styles.item}
        onClick={() => {
          returning.current = false
          setOpen('about')
        }}
        aria-haspopup="dialog"
        aria-expanded={open === 'about'}
      >
        {t.navAbout}
      </button>
      <span className={styles.divider} aria-hidden="true" />
      <button
        className={`${styles.item} ${styles.lang}`}
        onClick={() => setLang(lang === 'en' ? 'cs' : 'en')}
        aria-label={t.langSwitchLabel}
        title={t.langSwitchLabel}
      >
        {t.langSwitch}
      </button>
      {world3dAvailable && (
        <button
          className={`${styles.item} ${styles.lang}`}
          onClick={toggleWorld}
          aria-label={worldMode === '3d' ? t.worldTo2dLabel : t.worldTo3dLabel}
          title={worldMode === '3d' ? t.worldTo2dLabel : t.worldTo3dLabel}
          aria-pressed={worldMode === '3d'}
        >
          {worldMode === '3d' ? '2D' : '3D'}
        </button>
      )}
      {open === 'about' && (
        <AboutPanel
          instant={returning.current}
          onClose={closeAbout}
          onCredits={() => {
            returning.current = true
            setOpen('credits')
          }}
        />
      )}
      {open === 'credits' && <CreditsPopup onClose={() => setOpen('about')} />}
      {open === 'work' && (
        // Deploy skew can 404 the lazy chunk hours after page load — tell the
        // visitor instead of blanking the whole site (ChunkBoundary).
        <ChunkBoundary fallback={<p className={styles.loadError} role="alert">{t.workLoadError}</p>}>
          <Suspense fallback={null}>
            <WorkPanel onClose={closeWork} />
          </Suspense>
        </ChunkBoundary>
      )}
    </nav>
  )
}
