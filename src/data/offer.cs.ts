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
    foot: 'Malé až střední projekty – postavené pořádně a ověřené od začátku do konce, rychle s AI.',
  },
  process: {
    eyebrow: '02 · Jak to probíhá',
    items: [
      { html: 'Popíšete, co potřebujete&nbsp;–&nbsp;stačí tři řádky.' },
      { html: 'Domluvíme se, jak vypadá hotovo: rozsah, kroky, první funkční kus.' },
      { html: 'Stavím; skutečný pokrok vidíte ve dnech a&nbsp;každé kolo směrujete.' },
      { html: 'Předání: kód, dokumentace a&nbsp;know-how k&nbsp;provozu. Všechno vaše.' },
    ],
    foot: 'Jak rychle? Záleží na nás obou – já stavím rychle a rychlá komunikace to tak udrží.',
  },
  proof: {
    eyebrow: '04 · Nevěř – ověřuj',
    items: [
      {
        label: 'RL Lab + Data Lab',
        html: '&nbsp;–&nbsp;trénujte, sledujte a&nbsp;hrajte proti AI, 100+ prostředí od Atari po Doom, fyziku i&nbsp;deskové hry, 9 algoritmů, výzkumné metriky a&nbsp;exporty na jedno kliknutí',
        href: 'https://github.com/Martin8O/RL-Lab',
      },
      {
        label: 'Registrace',
        html: '&nbsp;–&nbsp;dvojjazyčná registrace na akce, samoobslužné přihlášky, ceny počítané na serveru, potvrzovací e-maily a&nbsp;administrace podle rolí',
        href: 'https://registrace.online',
      },
      {
        label: 'Těnovice',
        html: '&nbsp;–&nbsp;živá kalkulačka příslibů, anonymní veřejné přísliby, úpravy přes účet, celé na serverless AWS · spolupráce',
        href: 'https://www.one-tenovice.cz',
      },
    ],
  },
  trust: {
    eyebrow: '03 · Dobré vědět',
    items: [
      { html: 'Kód je váš&nbsp;–&nbsp;nejste na mně závislí.' },
      { html: 'Stavím v&nbsp;češtině i&nbsp;angličtině&nbsp;–&nbsp;vaše aplikace může mluvit oběma jazyky.' },
      { html: 'Plně na dálku&nbsp;–&nbsp;spolupracovat můžeme odkudkoli.' },
    ],
  },
}

/** The measured-quality block. Tool names stay as-is (they are the
 *  products); the Lighthouse gauge labels get Czech where a good word
 *  exists. */
export const OFFER_QUALITY_CS: Partial<OfferQuality> = {
  heading: 'Tento web',
  selfItems: [
    {
      testsLead: '<strong>378 automatických testů</strong>',
      html: ' · přístupnost WCAG',
      htmlMobile: ' · WCAG',
    },
    {
      html: '<strong>Žádné cookies</strong>&nbsp;–&nbsp;anonymní statistiky návštěv, nic, co by vás identifikovalo',
      htmlMobile: '<strong>Žádné cookies</strong>&nbsp;–&nbsp;jen anonymní statistiky',
    },
    {
      html: '<strong>Otevřený kód</strong>&nbsp;–&nbsp;',
      linkText: 'zde',
      href: 'https://github.com/Martin8O/Website',
    },
  ],
  gaugesLabel: 'Lighthouse',
  gauges: [
    { label: 'Výkon', value: 98 },
    { label: 'Přístupnost', value: 100 },
    { label: 'Best Practices', value: 92 },
    { label: 'SEO', value: 100 },
  ],
}
