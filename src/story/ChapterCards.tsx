import { CHAPTERS, THEME_ACCENT } from '../data/chapters'
import { cardOpacity, cardOpacityWindowed } from '../timeline'
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
        const o = ch.cardFull ? cardOpacityWindowed(pos, i, ch.cardFull) : cardOpacity(pos, i)
        // Cards rise a touch as they fade in, settle at center when focused.
        const rise = (1 - o) * 12
        const Title = i === 0 ? 'h1' : 'h2'
        // A `.t-late` word in the title fades in over its own scroll window
        // (the "Bitcoin" reveal at 88 %); 1 everywhere else.
        let late = 1
        if (ch.lateWord) {
          const u = Math.min(
            1,
            Math.max(0, (pos - (i + ch.lateWord[0])) / (ch.lateWord[1] - ch.lateWord[0])),
          )
          late = u * u * (3 - 2 * u)
        }
        // Horizontal placement comes from the class (data-driven per chapter,
        // centered again on narrow viewports) — the inline transform only
        // carries the vertical settle, via the class's --tx.
        const alignClass =
          ch.align === 'left' ? styles.alignLeft : ch.align === 'right' ? styles.alignRight : ''
        return (
          <article
            key={ch.id}
            className={`${styles.card} ${alignClass}`}
            style={{
              opacity: o,
              transform: `translate(var(--tx), calc(-50% + ${rise}px))`,
              // Hide fully-faded cards from AT/tab order without unmounting them.
              visibility: o < 0.02 ? 'hidden' : 'visible',
              ['--accent' as string]: THEME_ACCENT[ch.theme],
              ['--late' as string]: late,
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
            {ch.cta && (
              <a
                className={styles.cta}
                href={ch.cta.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {ch.cta.label}
              </a>
            )}
          </article>
        )
      })}
    </main>
  )
}
