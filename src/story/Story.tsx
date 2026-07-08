import { lazy, Suspense } from 'react'
import { useScrollProgress } from '../scroll/useScrollProgress'
import { CHAPTERS, chaptersFor } from '../data/chapters'
import { useLang } from '../i18n/useLang'
import { chapterPosition, nearestChapter } from '../timeline'
import { buildRuns } from '../canvas/sceneTimeline'
import { accentAt } from './accent'
import { ChapterCards } from './ChapterCards'
import { ChunkBoundary } from './ChunkBoundary'
import { DevWindowLinks } from './DevWindowLinks'
import { Hud } from './Hud'
import { TickScale } from './TickScale'
import { ScrollHint } from './ScrollHint'
import { SiteFooter } from './SiteFooter'
import { Vignette } from './Vignette'
import styles from './Story.module.css'

// The whole 2D world — every scene renderer plus its baked sprite/shot/pose
// data — is the heaviest thing on the page and is purely decorative
// (aria-hidden). Code-split it so the initial bundle is just the React shell,
// scroll engine and DOM story (fast FCP/LCP + low TBT); the chunk fetches
// during the preloader hold, and the dark stage background covers the gap
// until the first frame paints. See D1 / ADR-026.
const CanvasStage = lazy(() =>
  import('../canvas/CanvasStage').then((m) => ({ default: m.CanvasStage })),
)

// Scene runs for the static EN chapters (theme/timing only — identical for
// both languages), built once at module load for the accent blend.
const RUNS = buildRuns(CHAPTERS)

/**
 * The fixed story overlay. Reads the one global `scrollProgress`, derives the
 * continuous chapter position, and hands the pieces to the DOM layers. Behind
 * them, `<CanvasStage>` paints each chapter's world (theme registry); all
 * chapter text stays real HTML for SEO + screen readers.
 */
export function Story() {
  const progress = useScrollProgress()
  const lang = useLang()
  // Localized copy for the DOM layers; the canvas keeps the static EN array
  // (it reads only theme/timing fields, and a stable identity means the
  // language toggle never re-initializes the render loop).
  const chapters = chaptersFor(lang)
  const count = chapters.length
  const pos = chapterPosition(progress, count)
  const active = chapters[nearestChapter(progress, count)]
  // C4: the accent GLIDES between themes in sync with the canvas cross-fade
  // instead of stepping at chapter boundaries.
  const accent = accentAt(pos, RUNS, count)

  return (
    <div className={styles.stage} style={{ ['--accent' as string]: accent }}>
      {/* If the world chunk fails (flaky network, deploy skew), the dark
          stage stays and the DOM story keeps working — never a blank site. */}
      <ChunkBoundary>
        <Suspense fallback={null}>
          <CanvasStage chapters={CHAPTERS} />
        </Suspense>
      </ChunkBoundary>
      <ChapterCards pos={pos} chapters={chapters} />
      <DevWindowLinks pos={pos} />
      <Vignette />
      <Hud era={active.era ?? ''} progress={progress} />
      <TickScale progress={progress} count={count} />
      <ScrollHint progress={progress} />
      <SiteFooter progress={progress} />
    </div>
  )
}
