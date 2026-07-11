import { ScrollProvider } from './scroll/ScrollProvider'
import { Story } from './story/Story'
import { SiteNav } from './story/SiteNav'
import { SkipLinks } from './story/SkipLinks'
import { Preloader } from './story/Preloader'
import { CHAPTERS, CHAPTER_WEIGHTS } from './data/chapters'
import { trackHeightVh } from './timeline'
import styles from './App.module.css'

/**
 * A2 shell — the data-driven story skeleton (no canvas art yet; that's Phase B).
 * The tall, invisible scroll track gives Lenis real distance to travel; its
 * height is derived from the chapter count, so adding a chapter to the data
 * array reshapes the timeline with zero changes here. The fixed <Story> overlay
 * reads the resulting `scrollProgress` and renders every visible layer.
 */
function App() {
  return (
    <ScrollProvider>
      {/* DOM order = tab order: skip-link first, then the nav, then the story
          (all are position:fixed, so the visual layout is unaffected). */}
      <SkipLinks />
      <SiteNav />
      <Story />
      <div
        className={styles.scrollTrack}
        style={{ height: `${trackHeightVh(CHAPTERS.length, CHAPTER_WEIGHTS)}vh` }}
        aria-hidden="true"
      />
      {/* Last in DOM, highest z — the C4 boot gate over everything. */}
      <Preloader />
    </ScrollProvider>
  )
}

export default App
