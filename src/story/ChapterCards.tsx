import { CHAPTERS, THEME_ACCENT } from '../data/chapters'
import { cardOpacity } from '../timeline'
import styles from './ChapterCards.module.css'

/**
 * All chapter text cards, stacked centered. Each fades in as its chapter nears
 * center and out as it passes — driven purely by the continuous `pos`. Text is
 * real DOM (good for SEO/a11y); titles/bodies are our own authored HTML.
 */
export function ChapterCards({ pos }: { pos: number }) {
  return (
    <main className={styles.cards}>
      {CHAPTERS.map((ch, i) => {
        const o = cardOpacity(pos, i)
        // Cards rise a touch as they fade in, settle at center when focused.
        const rise = (1 - o) * 12
        const Title = i === 0 ? 'h1' : 'h2'
        return (
          <article
            key={ch.id}
            className={styles.card}
            style={{
              opacity: o,
              transform: `translate(-50%, calc(-50% + ${rise}px))`,
              // Hide fully-faded cards from AT/tab order without unmounting them.
              visibility: o < 0.02 ? 'hidden' : 'visible',
              ['--accent' as string]: THEME_ACCENT[ch.theme],
            }}
          >
            {ch.num && <p className={styles.num}>{ch.num}</p>}
            <Title
              className={styles.title}
              dangerouslySetInnerHTML={{ __html: ch.title }}
            />
            {ch.body && (
              <p
                className={styles.body}
                dangerouslySetInnerHTML={{ __html: ch.body }}
              />
            )}
          </article>
        )
      })}
    </main>
  )
}
