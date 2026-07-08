import { useScrollProgress } from '../scroll/useScrollProgress'
import { CHAPTERS, THEME_ACCENT, chaptersFor } from '../data/chapters'
import { useLang } from '../i18n/useLang'
import { chapterPosition, nearestChapter } from '../timeline'
import { CanvasStage } from '../canvas/CanvasStage'
import { ChapterCards } from './ChapterCards'
import { DevWindowLinks } from './DevWindowLinks'
import { Hud } from './Hud'
import { TickScale } from './TickScale'
import { ScrollHint } from './ScrollHint'
import { SiteFooter } from './SiteFooter'
import { Vignette } from './Vignette'
import styles from './Story.module.css'

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
  const accent = THEME_ACCENT[active.theme]

  return (
    <div className={styles.stage} style={{ ['--accent' as string]: accent }}>
      <CanvasStage chapters={CHAPTERS} />
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
