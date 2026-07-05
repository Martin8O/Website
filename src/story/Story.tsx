import { useScrollProgress } from '../scroll/useScrollProgress'
import { CHAPTERS, THEME_ACCENT } from '../data/chapters'
import { chapterPosition, nearestChapter } from '../timeline'
import { ChapterCards } from './ChapterCards'
import { Hud } from './Hud'
import { TickScale } from './TickScale'
import { ScrollHint } from './ScrollHint'
import { Vignette } from './Vignette'
import styles from './Story.module.css'

/**
 * The fixed story overlay. Reads the one global `scrollProgress`, derives the
 * continuous chapter position, and hands the pieces to the DOM layers. There's
 * no canvas art yet (Phase B) — just a plain dark backdrop behind real HTML
 * text, so the whole story is present for SEO + screen readers from the start.
 */
export function Story() {
  const progress = useScrollProgress()
  const count = CHAPTERS.length
  const pos = chapterPosition(progress, count)
  const active = CHAPTERS[nearestChapter(progress, count)]
  const accent = THEME_ACCENT[active.theme]

  return (
    <div className={styles.stage} style={{ ['--accent' as string]: accent }}>
      <div className={styles.backdrop} aria-hidden="true" />
      <ChapterCards pos={pos} />
      <Vignette />
      <Hud era={active.era ?? ''} progress={progress} />
      <TickScale progress={progress} count={count} />
      <ScrollHint progress={progress} />
    </div>
  )
}
