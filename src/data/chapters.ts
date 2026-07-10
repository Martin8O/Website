/**
 * The single source of truth for the story. Everything the site shows is
 * derived from this typed array: order, content, per-chapter theme. Adding a
 * chapter is one object here — the timeline (height + card fades) re-derives
 * itself, no render-code edits (see `src/timeline.ts`).
 *
 * Copy is English (site is English-only) and adapted — factually — from the
 * working demo (`local/ode mne/martin-journey.html`). Accent `<span>` hooks
 * are preserved; they colour key phrases via the global classes in index.css.
 *
 * Body/title strings are authored HTML (our own content, not user input) and
 * rendered with `dangerouslySetInnerHTML`, so they may contain `<br>` and the
 * accent spans: a-gold · a-hud (amber) · a-cyan · a-btc · a-mag.
 */

import type { Lang } from '../i18n/langStore'
import { CHAPTER_COPY_CS } from './chapters.cs'

/** Visual worlds. Extensible union — a new *kind* later (e.g. 'sport') slots
 *  in here and gets one renderer in the Phase-B theme registry. */
export type Theme = 'origin' | 'sky' | 'calm' | 'bitcoin' | 'dev' | 'offer' | 'contact'

/** Sub-mood for `sky` chapters (the pilot arc), selected in Phase B. */
export type Sky = 'climb' | 'cruise' | 'desert' | 'airshow' | 'sunset'

export type Chapter = {
  /** Stable unique id (keys, anchors, tests). */
  id: string
  theme: Theme
  /** Shown in the amber HUD instrument, e.g. '2003–2012'. */
  era?: string
  /** Progress fraction (0..1) at which this chapter's `era` becomes the active
   *  HUD readout, OVERRIDING the default uniform-midpoint switch — so the year
   *  label flips when the SCENE actually arrives (the L-159 takes the lead at
   *  ~22 %, the sunset lands ~53 %) rather than at the mechanical chapter
   *  boundary. Timing field → lives on the EN array only (see timeline.activeEra). */
  eraFrom?: number
  /** Eyebrow above the title, e.g. '05 — Airshow'. */
  num?: string
  /** Chapter heading; may contain `<br>`. */
  title: string
  /** Chapter body; may contain `<br>` and accent spans. */
  body?: string
  /** Only meaningful for theme 'sky'. */
  sky?: Sky
  /** Optional per-chapter palette override (Phase C4 cohesion pass). */
  palette?: string[]
  /** Where the text card sits so it never fights the scene's focal point;
   *  omitted = centered. Narrow viewports always center (CSS). */
  align?: 'left' | 'right'
  /** When this chapter STARTS a new scene: where that scene fades in over
   *  its predecessor, in localT of the predecessor's last chapter (default
   *  [0.3, 0.7] — see sceneTimeline). The sunset landing holds back until
   *  the airshow's farewell flares have fallen (B2.3c). */
  enterFade?: readonly [number, number]
  /** Optional card-visibility window in pos-offsets from this chapter's
   *  index: the card holds at FULL opacity across it (easing just outside)
   *  instead of peaking at the chapter centre — the Selfhealing card stays
   *  up until the tree stands in full bloom (timeline.cardOpacityWindowed). */
  cardFull?: readonly [number, number]
  /** Ease width (pos units) on either side of `cardFull` — override the
   *  default for snappy arrivals (the 08 card snaps full within half a
   *  HUD percent of the landings). */
  cardEase?: number
  /** Optional outbound link rendered under the body (real links only). */
  cta?: { label: string; href: string }
  /** Optional mono eyebrow line right above the CTA — the contact finale's
   *  `+ Get in touch` (the reference's caption over the breathing field). */
  ctaEyebrow?: string
  /** Optional muted one-liner under the CTA (the contact chapter's
   *  "three lines is enough" nudge). */
  ctaHint?: string
  /** Sentence-length headlines (the contact chapter) render at a smaller
   *  display size so the whole card fits one viewport. */
  compact?: boolean
  /** Center the body text instead of the justified-block default — the intro
   *  lede is a short two-line tagline, not a paragraph. */
  centerBody?: boolean
  /** When the title holds a `<span class="t-late">…</span>`, that word fades
   *  in across this pos-offset window from the chapter's index — the word
   *  "Bitcoin" arrives at 88 %, after the genesis impulse. */
  lateWord?: readonly [number, number]
}

/** Signature accent colour per theme — drives the eyebrow + HUD tint so the
 *  palette is data-driven from day one (hex, matches the design tokens). */
/** Extra HUD era stops NOT tied to a chapter — the pilot arc needs two year
 *  labels (L-39, then L-159) inside the single "cruise" chapter's scroll span.
 *  Language-agnostic (aircraft designations). Merged in `timeline.activeEra`. */
export const EXTRA_ERAS: readonly { from: number; era: string }[] = [
  // Global fractions ride the 12-chapter scroll (% = pos/11): L-39 at pos 2.0.
  { from: 0.182, era: '2005–2012 · L-39' },
  // The free years after the Air Force — appears mid-way through the sunset
  // chapter's card (pos 6.2), as the body turns from "end of service" to
  // "the open road".
  { from: 0.564, era: '2022–2026' },
]

export const THEME_ACCENT: Record<Theme, string> = {
  origin: '#f5c451',
  sky: '#ffb000',
  calm: '#35d0e0',
  bitcoin: '#f7931a',
  dev: '#e0459b',
  // The mission HUD wears the site's amber through-line — the pilot's own
  // colour returns as the reticle locks onto the visitor.
  offer: '#ffb000',
  contact: '#7b8494',
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'intro',
    theme: 'origin',
    num: '↓ Scroll to travel through time with me',
    title: 'Martin',
    centerBody: true,
    body: 'One life, many chapters.<br>Scroll and send the sun racing across the sky.',
  },
  {
    id: 'origin-school',
    theme: 'origin',
    era: '1991–1998 · School',
    num: '00 — Origin',
    // "and", not "&" — the display face draws an ugly ampersand (Martin).
    title: 'School<br>and Pascal',
    // Copy FINAL v2.5 (local/ode mne/texty/texty-v2.md) from here on.
    // Em-dashes ride non-breaking spaces on BOTH sides everywhere, so a
    // dash never strands at a line start or end in the justified bodies.
    body: '<span class="lead">Graduated in maths and programming.</span>Several years with Pascal culminated in my final project&nbsp;—&nbsp;<span class="a-gold">chess for two players</span> that enforced every rule of the game.',
  },
  {
    id: 'sky-climb',
    theme: 'sky',
    sky: 'climb',
    era: '1999–2005 · CTU → Brno',
    num: '01 — The Decision',
    title: 'Upward',
    // Clear the frame BEFORE the cloud-punch white-out: hold to 19 %, then
    // a quick fade — chapter 02 needs the stage from 20 % (L-159 at ~22 %).
    cardFull: [-0.3, 0.1],
    cardEase: 0.15,
    // The faculty was electrical engineering; the FIELD was informatics —
    // that is what makes "a life in front of a computer screen" land.
    body: 'Two years into computer science at the faculty of electrical engineering I walked away. I couldn\'t picture a life spent in front of a computer screen&nbsp;—&nbsp;<em>remember that</em>&nbsp;—&nbsp;and there was a boyhood dream waiting: <span class="a-hud">flying military jets</span>. The Z‑142, then the L‑39C&nbsp;—&nbsp;a hundred hours in the air and a totally different life.',
    align: 'right',
  },
  {
    id: 'sky-cruise',
    theme: 'sky',
    sky: 'cruise',
    era: '2012–2022 · L-159',
    // Two era stops span this chapter: the L-39 years (2005–2012, EXTRA_ERAS)
    // arrive at 18 %, then the L-159 takes the lead at 21 % — synced to the
    // golden unlock ring in the climb scene (climb localT 0.8 = pos 2.3 = 21 %,
    // per sceneTimeline: the climb run's window is pos [1.5, 2.5]).
    eraFrom: 0.209,
    num: '02 — Military jets',
    title: 'Above the<br>clouds',
    // Rises out of the white-out from 21 %, full at 22 % — right as the
    // L-159 takes the lead (~22 %).
    cardFull: [-0.55, 0.3],
    cardEase: 0.15,
    body: 'The L‑39C, the L‑39ZA, then the <span class="a-hud">L‑159</span>. Every type an upgrade: more thrust, more avionics, more to learn&nbsp;—&nbsp;and less room for error. The horizon curved, the clouds stayed below the wings, and time was measured in g-forces.',
    align: 'right',
  },
  {
    id: 'sky-desert',
    theme: 'sky',
    sky: 'desert',
    era: '2010 · Bagram',
    num: '03 — Afghanistan',
    title: 'A different<br>sky',
    body: 'Four months at Bagram Air Base as liaison officer. Dust instead of clouds, a war instead of training&nbsp;—&nbsp;the same service, a different sky. The kind of experience that changes your perspective on everything, permanently.',
    align: 'left',
  },
  {
    id: 'sky-airshow',
    theme: 'sky',
    sky: 'airshow',
    era: '2016–2017',
    num: '04 — Airshow',
    title: 'Display<br>pilot',
    // Arrive with the show (rise 42→44 %), hold while the two-ship display
    // actually flies (the farewell flares fall ~ pos 5.67), gone as the
    // sunset enters.
    cardFull: [-0.2, 0.6],
    cardEase: 0.16,
    body: 'Two seasons as a display pilot, airshows across Europe. <span class="a-hud">Ten minutes of maximum everything</span>&nbsp;—&nbsp;speed, g-load, focus&nbsp;—&nbsp;two jets metres apart, tens of thousands watching. A dream fulfilled.',
    align: 'right',
  },
  {
    id: 'sky-sunset',
    theme: 'sky',
    sky: 'sunset',
    // Hold the landing back until the airshow pair has flown clean off and
    // the farewell flares have dropped to the runway — 0.76 of chapter 5
    // = 52 % of the whole scroll.
    enterFade: [0.76, 0.97],
    // Split across the chapter (title stays the military roles): "2020–2022"
    // = the last service years (landing = leaving the Air Force), then a
    // "2022–2026" stop (EXTRA_ERAS) at mid-card, where the body turns to the
    // free years that followed. Arrives at 53 % (pos 5.85), as the landing
    // enters.
    era: '2020–2022',
    eraFrom: 0.532,
    num: '05 — End of service',
    title: 'Instructor,<br>test pilot',
    // Wait for the airshow to fly clean off (sunset scene enters pos
    // 5.76–5.97), hold through the touchdown + braking (~pos 6.1–6.3),
    // and clear the frame before the healing lake bleeds in (~6.5).
    cardFull: [-0.05, 0.4],
    body: '<span class="a-hud">Twenty years in the Air Force, ~1,700 hours in the air</span>&nbsp;—&nbsp;the final years as instructor, flight-safety inspector and test pilot. In 2021 I chose to leave the military; since 2022 I’ve been my own boss. Before that I retrained in computer networks and systems. But I had no masterplan&nbsp;—&nbsp;just trust in the open road ahead and the urge to leap into the world. What followed was intense travel: half of every year abroad, volunteering at Buddhist centres and courses. Meditation has been part of my life since 2005&nbsp;—&nbsp;now it has more room to breathe.',
    align: 'left',
  },
  // The story is THEMATIC here, not strictly chronological: healing (2014–16)
  // follows the closed Air-Force arc so the flying section stays whole.
  {
    id: 'calm-healing',
    theme: 'calm',
    // Martin directs in global HUD % (pos = frac·11): the lit airfield starts
    // dimming at 59 % and the lake owns the frame by ~62 %, so the dusk
    // visibly gives way — no invisible pre-run of the healing story.
    enterFade: [0.48, 0.78],
    // The card holds at full strength from the lake settling (~63 %)
    // until the tree stands in full bloom (68 %), gone before the next
    // scene may enter at 69 %.
    cardFull: [-0.12, 0.47],
    // Dates per Martin's own site (mojecestakezdravi.cz/uvod-2): diagnosed
    // January 2014; ~18 months of rebuilding; remission confirmed by
    // colonoscopy February 2016 ("over a year without any medication").
    era: '2014–2016',
    num: '06 — The Test',
    title: 'Selfhealing',
    body: 'Ulcerative colitis&nbsp;—&nbsp;“lifelong, no known cause, no cure.” I went at it from <span class="a-cyan">every angle</span>: eighteen months of rebuilding everything&nbsp;—&nbsp;food, gut, mind, lifestyle. In remission ever since&nbsp;—&nbsp;<span class="a-cyan">off all medication</span>. I came out healthier, knowing myself from the inside.',
    cta: {
      label: 'Read the whole journey →',
      href: 'https://mojecestakezdravi.cz/',
    },
  },
  {
    id: 'bitcoin-node',
    theme: 'bitcoin',
    // The healing lake holds until ~69 % global (frac 0.56 of its chapter);
    // only then does the next world begin to bleed in.
    enterFade: [0.56, 0.88],
    era: 'since 2017',
    num: '07 — Bitcoin',
    // Martin's own wording (rev14): freedom underneath the technology; the
    // word "Bitcoin" in the title arrives only at ~73 % — after the genesis
    // impulse has landed.
    title: '<span class="t-late">Bitcoin</span><br>rabbit hole',
    // The word lands just after the genesis impulse strikes (~72.5 % global,
    // rev15): the impulse is at scene localT 0.48 = pos 7.98, so the word
    // fades in over pos 8.0–8.03 (HUD ~73 %), right behind the strike.
    lateWord: [0.0, 0.03],
    // The card must not outrun its world: the bitcoin scene enters over
    // pos 7.56–7.88 and the genesis impulse lands ~7.83 — the card rises
    // right behind the impulse (7.77→7.9) instead of over the lake.
    cardFull: [-0.1, 0.4],
    // "Don't trust — verify" stands on its own line (v2.5): it is the
    // method, not just the slogan.
    body: 'Bitcoin is a multidisciplinary IQ test&nbsp;—&nbsp;and the freedom underneath the technology. Keys, blocks, nodes, trustless consensus. <span class="a-btc">The hardest money nobody can print, seize or censor.</span> So I stopped reading and started running it: a full &amp; Lightning node, solo mining to my own pool.<br><span class="a-btc">Don’t trust&nbsp;—&nbsp;verify.</span>',
    cta: {
      label: 'Read my Bitcoin intro →',
      href: 'https://medium.com/@shadovv_50954/discover-bitcoin-the-r-evolution-in-the-world-of-money-9de1272b9b13',
    },
    align: 'left',
  },
  {
    id: 'dev-explosion',
    theme: 'dev',
    era: 'from 2026',
    num: '08 — The explosion',
    title: 'Solo<br>developer',
    // Headline number is "five real apps in about a month" (accented, matches
    // the five floating canvas windows); the projects aren't listed in prose.
    // The card arrives AFTER the landings settle: it rises across the back
    // half of the "86 %" HUD readout (touchdown at pos 9.5 = 86.4 %) and is
    // FULL the instant the HUD flips to 87 (progress 0.868 — the HUD rounds),
    // so no half-faded step; it holds through "88", then dissolves with the
    // scene.
    // Compact: the long v2.5 body must share the frame with the dashboard.
    cardFull: [0.55, 0.7],
    cardEase: 0.05,
    compact: true,
    body: 'It began carefully&nbsp;—&nbsp;small apps first. Then I found <span class="a-cyan">Claude Code</span>, and careful was over: <span class="a-mag">five real apps in about a month</span>&nbsp;—&nbsp;floating all around you. During the builds they even wrote the lessons they taught me into the <strong>dev-brain</strong> vault, which <strong>BrainQuest</strong> turns into Duolingo-style learning&nbsp;—&nbsp;so I’m still learning the craft, not just watching. The contribution graph below looks like a steep takeoff; maybe everything above was training for it. <em>(Turns out I love the screen after all.)</em>',
    // The Work items (the five floating windows) are data-driven from
    // `src/data/projects.ts` → the dev scene + DevWindowLinks read them.
  },
  // 09 — YOUR MISSION: the flight-plan scene. The canvas paints a night-mode
  // digital ENROUTE/SID-style chart (airways, sectors, zones — no
  // geography) with a route plotted as you scroll — LKCV departure top-left
  // through four numbered waypoints, ONE PER PANEL in reading order, to the
  // destination: the visitor's project (`scenes/offer.ts`). The four
  // mission panels are their own DOM layer (`OfferPanels.tsx`, data in
  // `data/offer.ts`); panel N rises the moment the route reaches waypoint N
  // (windows derived in `offerMath`), and the proof panel carries the
  // measured-quality block (Lighthouse + security grades). The card holds
  // ONLY the eyebrow + title (no lede — the plotted route threads the centre
  // column where a lede would sit; the panels carry all the copy),
  // top-anchored so the chart owns the frame. No `era` — the HUD keeps dev's
  // "from 2026" until the finale's "now".
  {
    id: 'offer-mission',
    theme: 'offer',
    // Let the dev finale own the frame — the landings (86 %), the full card
    // + dashboard hold, THEN the city dissolves into the night while the
    // chart materializes under it (the same window the galaxy used to enter
    // over before this chapter existed).
    enterFade: [0.7, 0.97],
    num: '09 — Your mission',
    title: 'Your flight<br>plan',
    // Rise as the plotting starts (pos ~9.96); hold while the panels flank
    // the chart; clear the frame together before the contact galaxy blooms
    // (contact enters from pos +0.7). Panel windows live in `offerMath.ts`
    // (PANEL_FULL) — one timing source for canvas + DOM.
    cardFull: [0.0, 0.6],
  },
  // 10 — NOW: the contact finale (FINAL v2.5). The world behind it is the C3
  // spiral-galaxy scene; the email is the real launched address (Cloudflare
  // Email Routing on svobodamartin.dev → set at D1).
  {
    id: 'contact-now',
    theme: 'contact',
    // Let the mission scene own the frame until ~97 % — the plotted route
    // and the panels hold, THEN the chart dims into the night and NOW
    // arrives at the very end.
    enterFade: [0.7, 0.97],
    era: 'now',
    num: '10 — Now',
    title: 'Set your<br>destination.',
    compact: true,
    // The galaxy's nucleus holds the right of the frame (C3 rev5) — the
    // card keeps the left so neither blocks the other.
    align: 'left',
    // Arrive only after the dev finale has said its piece (no ghost text
    // over the 08 card): rise from ~98 %, full at the very end.
    cardFull: [-0.05, 0],
    body: 'Your destination can take any form&nbsp;—&nbsp;a website, an app, a tool, an automation. I take on the small-to-medium ones and build them properly, end to end. If you can describe it, it can be built.<br><br>What I bring: a military jet pilot’s focus, a test pilot’s precision, an eye for detail and a sense of responsibility, the calm of twenty-one years of regular meditation, and a build pace measured in days.<br><br>If you have something worth building, I’d enjoy hearing about it.',
    ctaEyebrow: '+ Get in touch',
    // Plain address, no decorative brackets — they wrapped onto their own
    // lines on phones and guard nothing (the address is plaintext in the
    // mailto: href anyway).
    cta: {
      label: 'martin@svobodamartin.dev',
      href: 'mailto:martin@svobodamartin.dev',
    },
    ctaHint: 'Three lines is enough: what it is, who it’s for, when you need it.',
  },
]

/**
 * The story in the requested language. EN = the canonical array above; CS =
 * the copy overlay from `chapters.cs.ts` merged per chapter id, so timing /
 * choreography fields exist exactly once. Arrays are built once and cached —
 * stable identities keep React effects quiet across re-renders.
 */
const LOCALIZED: Partial<Record<Lang, Chapter[]>> = { en: CHAPTERS }

export function chaptersFor(lang: Lang): Chapter[] {
  return (LOCALIZED[lang] ??= CHAPTERS.map((ch) => ({
    ...ch,
    ...CHAPTER_COPY_CS[ch.id],
  })))
}
