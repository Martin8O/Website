/**
 * The "Ground Control" mission panels (chapter 09 — Your flight plan): the
 * four HUD data blocks the cockpit reticle locks in around the visitor —
 * ① what I build · ② how the work runs · ③ proof ("Don't trust — verify",
 * every claim carries a real link) · ④ trust. One typed source of truth:
 * `OfferPanels.tsx` renders these as real DOM (SEO/a11y), the canvas scene
 * only paints the reticle world behind them.
 *
 * Copy conventions match `chapters.ts`: authored HTML (our own strings, not
 * user input), EN canonical + Czech overlay merged per panel id
 * (`offer.cs.ts`), em-dashes riding non-breaking spaces. Real links only —
 * every href verified live.
 */

import type { Lang } from '../i18n/langStore'
import { OFFER_COPY_CS, OFFER_QUALITY_CS } from './offer.cs'

export type OfferItem = {
  /** Authored HTML line (may carry <strong> emphasis). On the proof panel it
   *  is the muted DESCRIPTION that follows the linked `label`. */
  html: string
  /** Real outbound link — the proof panel's "verify it yourself" hook. */
  href?: string
  /** Proof-panel design (Martin): only the project NAME is the amber link;
   *  `html` renders after it as a smaller, muted description — so a long
   *  description no longer reads as one giant orange link. */
  label?: string
}

export type OfferPanelId = 'what' | 'process' | 'proof' | 'trust'

export type OfferPanel = {
  /** Stable id (keys, overlay merge, tests). */
  id: OfferPanelId
  /** Mono HUD eyebrow, e.g. '01 · What I build'. */
  eyebrow: string
  items: OfferItem[]
  /** Render items with mono step numbers (the process panel). */
  numbered?: boolean
  /** Muted closing line under the items (the pace note). */
  foot?: string
}

export const OFFER_PANELS: OfferPanel[] = [
  {
    id: 'what',
    eyebrow: '01 · What I build',
    items: [
      { html: 'Web apps and websites&nbsp;—&nbsp;like the one you’re flying through.' },
      { html: 'Automations that take over repetitive work.' },
      { html: 'Internal tools your team will actually use.' },
    ],
    foot: 'Small to medium — built properly and verified end to end, fast with AI.',
  },
  {
    id: 'process',
    eyebrow: '02 · How it runs',
    numbered: true,
    items: [
      { html: 'You describe it&nbsp;—&nbsp;three lines are enough.' },
      { html: 'We agree what done looks like: scope, steps, the first working slice.' },
      { html: 'I build; you see real progress in days and steer every round.' },
      { html: 'Handover: code, docs and the know-how to run it. All yours.' },
    ],
    foot: 'How fast? That depends on us both — I build quickly, and quick communication keeps it that way.',
  },
  // Broad heading (Martin): the items are reassurances — ownership, privacy,
  // language, reach — so "Good to know" covers them where "Trust" didn't.
  {
    id: 'trust',
    eyebrow: '03 · Good to know',
    items: [
      { html: 'The code is yours&nbsp;—&nbsp;no lock-in.' },
      { html: 'I build in English or Czech&nbsp;—&nbsp;your app can speak both.' },
      { html: 'Fully remote&nbsp;—&nbsp;we can work together from anywhere.' },
    ],
  },
  // Proof comes LAST (Martin): verification makes most sense at the end,
  // after all the claims. The top items are real CLIENT work you can open;
  // everything about THIS site (tests, source, scores, security) lives in
  // the "This website" block below (OFFER_QUALITY).
  {
    id: 'proof',
    eyebrow: '04 · Don’t trust — verify',
    items: [
      {
        label: 'RL Lab + Data Lab',
        html: '&nbsp;—&nbsp;train, watch &amp; play against AI, 100+ environments from Atari to Doom, physics and board games, 9 algorithms, research-grade metrics and one-click exports',
        href: 'https://github.com/Martin8O/RL-Lab',
      },
      {
        label: 'Registrace',
        html: '&nbsp;—&nbsp;bilingual event registration, self-service sign-ups, server-side pricing, emailed confirmations and role-scoped admin',
        href: 'https://registrace.online',
      },
      {
        label: 'Těnovice',
        html: '&nbsp;—&nbsp;live pledge calculator, anonymous public pledges, account-based editing, all on serverless AWS · a collab',
        href: 'https://www.one-tenovice.cz',
      },
    ],
  },
]

/**
 * The measured quality of THIS site, rendered inside the proof panel right
 * under its "Open source" line (Martin's brief): the Lighthouse gauges by
 * name + the security grades, every grade a live re-scan link — the
 * "Don't trust — verify" motto made clickable. Numbers from Martin's own
 * measurements (2026-07): Lighthouse 98/100/92/100, MDN Observatory A+
 * 125/100, securityheaders.com A+, Hardenize all green (MTA-STS consciously
 * left out — DANE covers SMTP).
 */
export type OfferQuality = {
  /** Centred heading — everything below is about THIS very site. */
  heading: string
  /** Self-reported facts about this site (tests, WCAG, open source) — the
   *  `+` lines right under the heading, above the measured scores. When
   *  `linkText` is set, `html` is a plain bold lead and only `linkText` is the
   *  outbound anchor (Martin: link just "here", not the whole line).
   *  `htmlMobile`, when present, is a shorter phrasing used ≤719px to save the
   *  vertical lines the tall proof card can't spare on a phone. `testsLead`
   *  renders BEFORE `html` as the quiet button that opens the test-suite
   *  popup (the build-time manifest — see src/data/testManifest.ts); its
   *  number must match TEST_COUNT (guarded by testManifest.test.ts). */
  selfItems: {
    html: string
    href?: string
    linkText?: string
    htmlMobile?: string
    testsLead?: string
  }[]
  /** Centred sub-label over the gauges — the tool that measured. */
  gaugesLabel: string
  gauges: { label: string; value: number }[]
  /** Security grades — the label runs amber, the score green, the arrow a
   *  darker amber. Left-aligned; SecurityHeaders + Hardenize share a line. */
  grades: { html: string; href: string }[]
}

export const OFFER_QUALITY: OfferQuality = {
  // Not "independently checked" any more — this block now also holds
  // self-reported facts (tests, open source), so the heading is just the
  // subject (Martin).
  heading: 'This website',
  selfItems: [
    {
      testsLead: '<strong>382 automated tests</strong>',
      html: ' · WCAG accessibility',
      htmlMobile: ' · WCAG',
    },
    {
      html: '<strong>No cookies</strong>&nbsp;—&nbsp;anonymous visitor stats, nothing that identifies you',
      htmlMobile: '<strong>No cookies</strong>&nbsp;—&nbsp;anonymous stats only',
    },
    {
      html: '<strong>Open source</strong>&nbsp;—&nbsp;',
      linkText: 'read the code',
      href: 'https://github.com/Martin8O/Website',
    },
  ],
  gaugesLabel: 'Lighthouse',
  gauges: [
    { label: 'Performance', value: 98 },
    { label: 'Accessibility', value: 100 },
    { label: 'Best Practices', value: 92 },
    { label: 'SEO', value: 100 },
  ],
  grades: [
    {
      html: 'Observatory <strong>A+ 125/100</strong>',
      href: 'https://developer.mozilla.org/en-US/observatory/analyze?host=svobodamartin.dev',
    },
    {
      html: 'SecurityHeaders <strong>A+</strong>',
      href: 'https://securityheaders.com/?q=svobodamartin.dev&followRedirects=on',
    },
    {
      html: 'Hardenize <strong>green</strong>',
      href: 'https://www.hardenize.com/report/svobodamartin.dev/1783538721',
    },
  ],
}

/**
 * The panels / quality block in the requested language — same overlay
 * pattern as `chaptersFor`: EN canonical, CS copy merged per id, built once
 * and cached for stable identities.
 */
const LOCALIZED: Partial<Record<Lang, OfferPanel[]>> = { en: OFFER_PANELS }

export function offerPanelsFor(lang: Lang): OfferPanel[] {
  return (LOCALIZED[lang] ??= OFFER_PANELS.map((p) => ({
    ...p,
    ...OFFER_COPY_CS[p.id],
  })))
}

const LOCALIZED_Q: Partial<Record<Lang, OfferQuality>> = { en: OFFER_QUALITY }

export function offerQualityFor(lang: Lang): OfferQuality {
  return (LOCALIZED_Q[lang] ??= { ...OFFER_QUALITY, ...OFFER_QUALITY_CS })
}
