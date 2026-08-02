/**
 * The site's own build history — this repo's milestones, read off the real
 * GitHub history (Martin: "podle GitHub historie"). Rendered in the About
 * panel's quiet "Changelog" popover, the Credits popup's twin.
 *
 * SCOPE: **this website only.** Sister projects that merely touch it (the
 * Vertie player) stay out until they are finished in their own right —
 * Martin's call: "vše ostatní jsou jen přílepky z projektu Vertie, který
 * ještě není dokončen".
 *
 * Every entry anchors to something PUBLIC and verifiable: a commit in
 * `Martin8O/Website`. No invented links, no milestones that never happened —
 * the same rule the Work cards live by. Adding a milestone = one object here
 * (+ its CS overlay below).
 */

import type { Lang } from '../i18n/langStore'

const REPO = 'https://github.com/Martin8O/Website'

export type ChangelogEntry = {
  /** Stable unique id — the key, and the join for the CS copy overlay. */
  id: string
  /** ISO day of the anchoring commit (`YYYY-MM-DD`). */
  date: string
  /** Release badge — set only where Martin names a version. */
  version?: string
  title: string
  body: string
  /** The public artefact this milestone points at (commit / package). */
  link?: { href: string; display: string }
}

export const CHANGELOG: readonly ChangelogEntry[] = [
  {
    id: 'first-commit',
    date: '2026-07-05',
    title: 'First commit',
    body: 'An empty folder becomes a project. The Vite + React + TypeScript scaffold, the Lenis scroll engine and the first production deploy all land on day one.',
    link: { href: `${REPO}/commit/3ab2bee5317f626556cd7c45f1404d0ed4073c89`, display: '3ab2bee' },
  },
  {
    id: 'v1',
    date: '2026-07-08',
    version: 'v1.0',
    title: 'The 2D world goes live',
    // "procedurally drawn", never "hand-drawn": every scene is COMPUTED by a
    // render function each frame — no illustrations, no scrubbed video. The
    // award-material factsheet flags the same ambiguity and picks this word.
    body: 'Procedurally drawn canvas chapters from the school desk to the contact galaxy, bilingual EN/CZ, keyboard-accessible, code-split and hardened — four days from the first commit to a live production site.',
    link: { href: `${REPO}/commit/0ad018427efd54d0ea9ce5c4527b86a1919b3652`, display: '0ad0184' },
  },
  {
    id: 'v2',
    date: '2026-07-16',
    version: 'v2.0',
    title: 'The 3D version lands',
    body: 'Real GLB aircraft start flying over the 2D world — the climb, the one-circle ballet, the Bagram base ops, the airshow pass and the dusk landing break — with the 2D world still the complete fallback underneath. Six more days after v1.0.',
    link: { href: `${REPO}/commit/98b548dfc5dd39319c6c7d3108b3f18d205eb7cc`, display: '98b548d' },
  },
  {
    id: 'unplottable',
    date: '2026-08-02',
    title: 'The work list outgrows the five apps',
    body: 'Unplottable joins the portfolio: a 124,642-word novel an AI wrote inside a system built for it, in English and Russian.',
  },
]

/** Czech copy overlay, merged by id (the chapters/projects pattern). */
const CHANGELOG_COPY_CS: Record<string, Pick<ChangelogEntry, 'title' | 'body'>> = {
  'first-commit': {
    title: 'První commit',
    body: 'Z prázdné složky je projekt. Kostra Vite + React + TypeScript, scroll engine Lenis a první produkční nasazení – všechno hned první den.',
  },
  v1: {
    title: 'Finalizace 2D verze',
    body: 'Canvas kapitoly kreslené kódem od školní lavice až po kontaktní galaxii, dvojjazyčně CZ/EN, ovladatelné klávesnicí, rozdělené do chunků a zabezpečené – od prvního commitu na živý produkční web za čtyři dny.',
  },
  v2: {
    title: 'Upgrade na 3D verzi',
    body: 'Nad 2D světem začínají létat skutečné GLB stroje – stoupání, vzdušný souboj, letecký provoz na základně Bagram, airshow a přistání dvojice za soumraku – a 2D svět pod nimi zůstává kompletní záložní verzí. Šest dní po v1.0.',
  },
  unplottable: {
    title: 'Seznam prací přerostl pět aplikací',
    body: 'K portfoliu přibyla Unplottable: román o 124 642 slovech, který napsala AI uvnitř systému postaveného přesně pro to, anglicky i rusky.',
  },
}

const LOCALIZED: Partial<Record<Lang, readonly ChangelogEntry[]>> = { en: CHANGELOG }

/** The milestones in the requested language (EN canonical, CS overlaid). */
export function changelogFor(lang: Lang): readonly ChangelogEntry[] {
  return (LOCALIZED[lang] ??= CHANGELOG.map((e) => ({ ...e, ...CHANGELOG_COPY_CS[e.id] })))
}

const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * `YYYY-MM-DD` → the locale's short date. Pure string work on purpose: no
 * `Date`, so no timezone can shift a milestone by a day (the dates ARE the
 * point of a changelog), and it stays trivially testable.
 */
export function formatChangelogDate(lang: Lang, iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return lang === 'cs' ? `${d}. ${m}. ${y}` : `${d} ${EN_MONTHS[m - 1]} ${y}`
}
