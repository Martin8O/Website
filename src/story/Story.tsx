import { lazy, Suspense } from 'react'
import { useScrollProgress } from '../scroll/useScrollProgress'
import { useIdleAfterLoad } from '../useIdleAfterLoad'
import { useWorldMode } from '../three/worldMode'
import { CHAPTERS, CHAPTER_WEIGHTS, chaptersFor, EXTRA_ERAS } from '../data/chapters'
import { useLang } from '../i18n/useLang'
import { activeEra, chapterPosition } from '../timeline'
import { buildRuns } from '../canvas/sceneTimeline'
import { accentAt } from './accent'
import { ChapterCards } from './ChapterCards'
import { ChunkBoundary } from './ChunkBoundary'
import { CockpitGlass } from './CockpitGlass'
import { DevWindowLinks } from './DevWindowLinks'
import { OfferPanels } from './OfferPanels'
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

// The L2 3D augmentation layer (three + R3F) is heavier still and equally
// decorative — its own lazy chunk, fetched ONLY when the capability gate says
// '3d' (never under reduced motion / without WebGL2 / with ?world=2d, where
// the site stays exactly L1). See src/three/worldMode.ts.
const Stage3D = lazy(() =>
  import('../three/Stage3D').then((m) => ({ default: m.Stage3D })),
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
  const worldMode = useWorldMode()
  // Dperf-4: hold the 3D island until after `window.load` + an idle beat, so
  // its 906 KB chunk fetch + three parse/eval never competes with first paint.
  // The 2D world paints the complete scene meanwhile (the 3D starfield/heroes
  // are additive and fade in), so this only moves WHEN 3D arrives.
  const stage3dReady = useIdleAfterLoad()
  // Localized copy for the DOM layers; the canvas keeps the static EN array
  // (it reads only theme/timing fields, and a stable identity means the
  // language toggle never re-initializes the render loop).
  const chapters = chaptersFor(lang)
  const count = chapters.length
  const pos = chapterPosition(progress, count, CHAPTER_WEIGHTS)
  // The HUD year label switches on a data-driven schedule (chapter.eraFrom),
  // so it flips when the scene arrives, not at the mechanical midpoint.
  const era = activeEra(progress, chapters, EXTRA_ERAS, CHAPTER_WEIGHTS)
  // C4: the accent GLIDES between themes in sync with the canvas cross-fade
  // instead of stepping at chapter boundaries.
  const accent = accentAt(pos, RUNS, count)

  return (
    <div className={styles.stage} style={{ ['--accent' as string]: accent }}>
      {/* If the world chunk fails (flaky network, deploy skew), the dark
          stage stays and the DOM story keeps working — never a blank site. */}
      <ChunkBoundary>
        <Suspense fallback={null}>
          <CanvasStage chapters={CHAPTERS} worldMode={worldMode} />
        </Suspense>
      </ChunkBoundary>
      {/* The 3D layer AUGMENTS the 2D world (which keeps painting either
          way) — if this chunk fails or the gate says '2d', the site is
          simply L1. Static EN chapters for the same reason as above. */}
      {worldMode === '3d' && stage3dReady && (
        <ChunkBoundary>
          <Suspense fallback={null}>
            <Stage3D chapters={CHAPTERS} />
          </Suspense>
        </ChunkBoundary>
      )}
      {/* Cockpit glass: the green HUD paints HERE (via CanvasStage's loop),
          above the 3D world — the ballet flies behind the glass — and still
          under every text layer. Mounted in both world modes so the HUD
          renders identically with or without the 3D stage. */}
      <CockpitGlass />
      <ChapterCards pos={pos} chapters={chapters} worldMode={worldMode} />
      <DevWindowLinks pos={pos} />
      <OfferPanels pos={pos} />
      <Vignette />
      <Hud era={era} progress={progress} />
      <TickScale progress={progress} count={count} />
      <ScrollHint progress={progress} />
      <SiteFooter progress={progress} />
    </div>
  )
}
