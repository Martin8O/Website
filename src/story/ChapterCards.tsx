import { useState } from 'react'
import { THEME_ACCENT, type Chapter } from '../data/chapters'
import { cardOpacity, cardOpacityWindowed } from '../timeline'
import { useLang } from '../i18n/useLang'
import { STRINGS } from '../i18n/strings'
import styles from './ChapterCards.module.css'

/**
 * A chapter's optional CTA. For an outbound article (http) it's a plain quiet
 * link. For the contact finale (mailto:) the address is shown in full and
 * selectable, `mailto:` opens the visitor's mail client, AND a Copy button
 * puts it on the clipboard — so it works even where no mail client is set up.
 * No form, no backend, no data leaves the page (Martin's email-only, no-GDPR
 * contact — D1).
 */
function Cta({ cta }: { cta: NonNullable<Chapter['cta']> }) {
  const lang = useLang()
  const ui = STRINGS[lang]
  const isHttp = cta.href.startsWith('http')
  const isMail = cta.href.startsWith('mailto:')
  const email = isMail ? cta.href.slice('mailto:'.length).split('?')[0] : ''
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard blocked (older browser / insecure context): the visible
      // address and the mailto link still carry the contact.
    }
  }

  return (
    <span className={styles.ctaRow}>
      <a
        className={styles.cta}
        href={cta.href}
        // mailto: must open the mail client in place — a blank tab is the
        // classic dead-page annoyance. New tabs are for http.
        target={isHttp ? '_blank' : undefined}
        rel={isHttp ? 'noopener noreferrer' : undefined}
      >
        {cta.label}
      </a>
      {isMail && (
        <button
          type="button"
          className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
          onClick={copy}
          aria-label={copied ? ui.emailCopied : `${ui.copyEmail}: ${email}`}
        >
          {copied ? ui.emailCopied : ui.copyEmail}
        </button>
      )}
    </span>
  )
}

/**
 * All chapter text cards, stacked centered. Each fades in as its chapter nears
 * center and out as it passes — driven purely by the continuous `pos`. Text is
 * real DOM (good for SEO/a11y); titles/bodies are our own authored HTML —
 * already in the active language (Story passes `chaptersFor(lang)`).
 */
export function ChapterCards({ pos, chapters }: { pos: number; chapters: Chapter[] }) {
  return (
    <main className={styles.cards}>
      {chapters.map((ch, i) => {
        const o = ch.cardFull
          ? cardOpacityWindowed(pos, i, ch.cardFull, ch.cardEase)
          : cardOpacity(pos, i)
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
        const compactClass = ch.compact ? styles.compact : ''
        return (
          <article
            key={ch.id}
            // Chapter ids double as anchors (the skip-link lands on
            // #contact-now and focuses its email CTA).
            id={ch.id}
            className={`${styles.card} ${alignClass} ${compactClass}`}
            style={{
              opacity: o,
              // `--ty` (default -50%, the vertical centre anchor) is overridable
              // per chapter in CSS — used only on mobile to nudge cards off the
              // centre of action (desktop keeps the centred default).
              transform: `translate(var(--tx), calc(var(--ty, -50%) + ${rise}px))`,
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
            {ch.ctaEyebrow && <p className={styles.ctaEyebrow}>{ch.ctaEyebrow}</p>}
            {ch.cta && <Cta cta={ch.cta} />}
            {ch.ctaHint && <p className={styles.ctaHint}>{ch.ctaHint}</p>}
          </article>
        )
      })}
    </main>
  )
}
