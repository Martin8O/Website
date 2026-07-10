/**
 * Czech copy overlay for the mission panels (same pattern as
 * `chapters.cs.ts`): ONLY copy fields live here — ids, hrefs and every
 * structural field stay single-sourced on the EN `OFFER_PANELS`; the overlay
 * repeats an item's `href` only because items are replaced wholesale (the
 * chapter CTAs do the same). Czech typography rules apply: en-dashes (–)
 * riding non-breaking spaces, one-letter prepositions/conjunctions bound to
 * the next word with NBSP. Register: vykání — except "Nevěř – ověřuj.",
 * the canonical Czech form of the motto.
 */

import type { OfferPanel, OfferPanelId, OfferQuality } from './offer'

export type OfferPanelCopy = Partial<Pick<OfferPanel, 'eyebrow' | 'items' | 'foot'>>

export const OFFER_COPY_CS: Record<OfferPanelId, OfferPanelCopy> = {
  what: {
    eyebrow: '01 · Co stavím',
    items: [
      { html: 'Webové aplikace a&nbsp;weby&nbsp;–&nbsp;třeba jako ten, kterým právě letíte.' },
      { html: 'Automatizace, které převezmou opakující se práci.' },
      { html: 'Interní nástroje, které váš tým bude opravdu používat.' },
    ],
    foot: 'Malé až střední projekty, postavené pořádně, od začátku do konce.',
  },
  process: {
    eyebrow: '02 · Jak to probíhá',
    items: [
      { html: 'Popíšete, co potřebujete&nbsp;–&nbsp;stačí tři řádky.' },
      { html: 'Domluvíme se, jak vypadá hotovo: rozsah, kroky, první funkční kus.' },
      { html: 'Stavím; skutečný pokrok vidíte ve dnech a&nbsp;každé kolo směrujete.' },
      { html: 'Předání: kód, dokumentace a&nbsp;know-how k&nbsp;provozu. Všechno vaše.' },
    ],
    foot: 'Jak rychle? Záleží na nás obou – já stavím rychle a rychlé odpovědi to tak udrží.',
  },
  proof: {
    eyebrow: '04 · Nevěř – ověřuj',
    items: [
      {
        html: '<strong>Registrace</strong>&nbsp;–&nbsp;přihlašování pro 25 buddhistických center, předání se blíží',
        href: 'https://registrace.online',
      },
      {
        html: '<strong>Těnovice</strong>&nbsp;–&nbsp;sbírkový web, běží naostro · spolupráce',
        href: 'https://www.one-tenovice.cz',
      },
    ],
  },
  trust: {
    eyebrow: '03 · Dobré vědět',
    items: [
      { html: 'Kód je váš&nbsp;–&nbsp;kompletní předání, patří vám, žádné vázání.' },
      { html: 'Žádné sledování&nbsp;–&nbsp;tento web o&nbsp;vás nic nesbírá.' },
      { html: 'Česky i&nbsp;anglicky · na dálku, ať jste kdekoli.' },
    ],
  },
}

/** The measured-quality block. Tool names stay as-is (they are the
 *  products); the Lighthouse gauge labels get Czech where a good word
 *  exists. */
export const OFFER_QUALITY_CS: Partial<OfferQuality> = {
  heading: 'Tento web',
  selfItems: [
    { html: '<strong>200 automatických testů</strong> · přístupnost WCAG' },
    {
      html: '<strong>Otevřený kód</strong>&nbsp;–&nbsp;přečtěte si zdrojový kód',
      href: 'https://github.com/Martin8O/Website',
    },
  ],
  gaugesLabel: 'Lighthouse',
  gauges: [
    { label: 'Výkon', value: 99 },
    { label: 'Přístupnost', value: 100 },
    { label: 'Best Practices', value: 92 },
    { label: 'SEO', value: 100 },
  ],
}
