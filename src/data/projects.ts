/**
 * The Work items — the single typed source of truth for Martin's real
 * projects (C1). The story surfaces the CLIMAX five (the Claude-Code month)
 * as the floating windows in the `dev` scene: this file drives both their
 * canvas chrome (`src/canvas/scenes/dev.ts` → `DEV_PROJECTS`) and the
 * clickable outbound anchors laid over them (`src/story/DevWindowLinks.tsx`).
 * Adding / reordering a window is one edit here — a project with a `window`
 * block automatically gets a painted panel AND a real link.
 *
 * The pre-Claude era is recorded too (the "before" context — his first web
 * builds, the Bitcoin explainer, the Lovable trio); those aren't rendered as
 * windows yet, they set up the "five real apps in ~a month" velocity and are
 * the catalog a later Work list / nav can draw from.
 *
 * Real links + real shots only (Martin's rule): every URL here was verified
 * live (C1). All the publishable repos are now public (Phase P) — ClearFeed,
 * BrainQuest, Registrace, Website, strc-check and RL Lab. RL Lab links to its
 * public GitHub repo (it runs locally — there is no hosted demo).
 */

import type { Lang } from '../i18n/langStore'
import { PROJECT_COPY_CS } from './projects.cs'

// The dev-scene neon accents (mirror the scene palette in
// `canvas/scenes/dev.ts`; kept here so the per-project tint lives in one place
// and both the canvas and the DOM anchors read it).
const CYAN = '#25e3ff'
const VIOLET = '#a24dff'
const MAGENTA = '#e0459b'
const CORAL = '#ff6f8f'
const MINT = '#3dffb4'

/** UI motif that previews what a Claude-month app IS — drawn behind its real
 *  hero shot in the dev scene as the pre-decode fallback ('graph' = the
 *  living BrainQuest network, 'anim' = the RL Lab agent filmstrips). */
export type WinKind = 'blocklist' | 'fund' | 'form' | 'chart' | 'graph' | 'anim'

export type ProjectEra = 'pre-claude' | 'claude'

export type Project = {
  /** Stable unique id (keys, tests). */
  id: string
  /** Display name — the dev-scene window title + the link's aria-label. */
  name: string
  /** One-line "what it solves". */
  tagline: string
  /** Tech, most-defining first. */
  stack: string[]
  era: ProjectEra
  /** The app's real home: `href` is the outbound URL, `display` the
   *  protocol-less label shown on the window's link strip. */
  link: { href: string; display: string }
  /** Public source repo, when it lives somewhere OTHER than `link` (a hosted
   *  app whose code is also on GitHub). Rendered as a compact "GitHub ↗"
   *  next to the live link. Omitted when `link` already points at the repo
   *  (ClearFeed / RL Lab / BrainQuest) or when there is no public repo (the
   *  first websites + the article). Language-agnostic → EN-only. */
  repo?: string
  /** Whether `link.href` is publicly reachable right now. Private repos read
   *  false — the link still renders (Martin's "link every repo" policy), this
   *  just flags the ones that 404 to the public until he publishes them. */
  live: boolean
  /** Short status note for private / not-yet-shipped work. */
  status?: string
  /** Collaboration disclaimer chip in the window title bar (honest solo-dev
   *  framing: Těnovice was built WITH a friends' org). */
  badge?: string
  /** Real build stats from the GitHub snapshot (`local/ode mne/solodev/
   *  github-stats.json` → buildTimes: activeDays = distinct commit days).
   *  Rendered at the bottom of the Work card; absent for the pre-GitHub
   *  work (first websites, the article). */
  build?: { days: number; commits: number }
  /** Work-panel display order within the era (ascending; array order is the
   *  fallback). The PROJECTS array itself must NOT be reordered — for the
   *  Claude era it is the dev-scene window slot contract. */
  workOrder?: number
  /** Present only for the five Claude-month apps that float as windows in the
   *  `dev` scene — the canvas rendering hints. `DEV_PROJECTS` (filtered +
   *  ordered from this array) is the window slot order. */
  window?: {
    tint: string
    kind: WinKind
    /** DEV_SHOTS key (baked repo hero); omitted = motif-only (BrainQuest). */
    shot?: string
    /** Cover-crop bias (0 = keep the left / top edge; default centre). */
    cropX?: number
    cropY?: number
    /** Panel height ÷ width; default 0.66, RL Lab runs wide at 0.58. */
    aspect?: number
  }
}

export const PROJECTS: Project[] = [
  // --- Era A — pre-Claude: the "before" (first web builds → vibecoding) -------
  {
    id: 'moje-cesta',
    name: 'My Healing Journey',
    tagline:
      'The site documenting how I healed myself from ulcerative colitis — my first real web build.',
    stack: ['Web'],
    era: 'pre-claude',
    link: { href: 'https://mojecestakezdravi.cz/', display: 'mojecestakezdravi.cz' },
    live: true,
    workOrder: 1,
  },
  {
    id: 'rrcentrum',
    name: 'RR Centrum Polabí',
    tagline: 'A website for a regeneration & rehabilitation centre run by two physiotherapists.',
    stack: ['Web'],
    era: 'pre-claude',
    link: { href: 'https://rrcentrumpolabi.cz', display: 'rrcentrumpolabi.cz' },
    live: true,
    workOrder: 2,
  },
  {
    id: 'bitcoin-article',
    name: 'Discover Bitcoin',
    tagline: 'A detailed introduction to Bitcoin — the (r)evolution in the world of money.',
    stack: ['Writing'],
    era: 'pre-claude',
    link: {
      href: 'https://medium.com/@shadovv_50954/discover-bitcoin-the-r-evolution-in-the-world-of-money-9de1272b9b13',
      display: 'medium.com',
    },
    live: true,
    // Swapped with Wealth-Deck (Martin) — the article sits 5th, deck 3rd.
    workOrder: 5,
  },
  {
    id: 'due-deck',
    name: 'Due-Deck',
    tagline:
      "A warranties, insurance-renewal, contract & appointment tracker that runs fully in-browser.",
    stack: ['Lovable', 'Web', 'localStorage'],
    era: 'pre-claude',
    link: { href: 'https://duedeck.lovable.app', display: 'duedeck.lovable.app' },
    repo: 'https://github.com/Martin8O/Due-Deck',
    live: true,
    build: { days: 6, commits: 48 },
    workOrder: 4,
  },
  {
    id: 'wealth-deck',
    name: 'Wealth-Deck',
    tagline:
      'A personal finance & portfolio dashboard — investments, allocation and performance in one view.',
    stack: ['Lovable', 'Web'],
    era: 'pre-claude',
    link: { href: 'https://wealthdeck.lovable.app', display: 'wealthdeck.lovable.app' },
    repo: 'https://github.com/Martin8O/Wealth-Deck',
    live: true,
    build: { days: 6, commits: 110 },
    workOrder: 3,
  },
  {
    id: 'rand-pulse',
    name: 'Rand-Pulse',
    tagline: 'A sleek random generator for quick decisions and inspiration.',
    stack: ['Lovable', 'Web'],
    era: 'pre-claude',
    link: { href: 'https://randpulse.lovable.app', display: 'randpulse.lovable.app' },
    repo: 'https://github.com/Martin8O/Rand-Pulse',
    live: true,
    build: { days: 4, commits: 17 },
    workOrder: 6,
  },
  {
    id: 'strc-check',
    name: 'STRC Risk Monitor',
    tagline:
      "An experimental risk dashboard for Strategy's STRC “Stretch” variable-rate preferred — tracks price vs. par, dividend yield and amplification.",
    stack: ['Lovable', 'Web', 'Finnhub'],
    era: 'pre-claude',
    link: { href: 'https://strc-check.lovable.app', display: 'strc-check.lovable.app' },
    repo: 'https://github.com/Martin8O/strc-check',
    live: true,
    build: { days: 1, commits: 31 },
    workOrder: 7,
  },

  // --- Era B — the Claude-Code month: "five real apps in ~a month" -----------
  // Array order 1..5 = the dev-scene window slot order (do not shuffle).
  {
    id: 'clearfeed',
    name: 'ClearFeed',
    tagline:
      "A Chrome extension (MV3) that quietly mutes the topics you'd rather not see — politics, gossip, spoilers, sports, crypto — across news sites and feeds. 16 languages, 100% local, zero tracking.",
    stack: ['JavaScript', 'Chrome MV3'],
    era: 'claude',
    link: { href: 'https://github.com/Martin8O/ClearFeed', display: 'github.com/Martin8O/ClearFeed' },
    live: true,
    status: 'Not yet in the store',
    build: { days: 3, commits: 19 },
    workOrder: 6,
    window: { tint: CYAN, kind: 'blocklist', shot: 'clearfeed', cropX: 0.08 },
  },
  {
    id: 'tenovice',
    name: 'Těnovice',
    tagline:
      'A bilingual fundraising app for the Těnovice Buddhist retreat centre — a live pledge calculator that shows your impact on the goal, anonymous public pledges and account-based editing, all on a serverless AWS stack.',
    // Cognito verified in the public repo (cdk/src/constructs/cognito.py —
    // user pool + JWT authorizer on the API).
    stack: ['AWS CDK', 'Cognito', 'DynamoDB', 'Serverless'],
    era: 'claude',
    link: { href: 'https://www.one-tenovice.cz', display: 'one-tenovice.cz' },
    repo: 'https://github.com/AnnaRozumova/Tenovice_fund_page',
    live: true,
    badge: 'COLLAB',
    build: { days: 11, commits: 53 },
    workOrder: 3,
    window: { tint: VIOLET, kind: 'fund', shot: 'tenovice', cropY: 0.13 },
  },
  {
    id: 'registrace',
    name: 'Registrace',
    tagline:
      'A bilingual (CZ/EN) event-registration platform for 25 Buddhist centres — self-service sign-up, server-side pricing, emailed confirmations and a role-scoped admin.',
    stack: ['Next.js 16', 'React 19', 'TypeScript', 'Prisma 7', 'Supabase', 'Tailwind v4'],
    era: 'claude',
    link: { href: 'https://registrace.online', display: 'registrace.online' },
    repo: 'https://github.com/Martin8O/Registrace',
    live: true,
    build: { days: 17, commits: 63 },
    workOrder: 2,
    window: { tint: MAGENTA, kind: 'form', shot: 'registrace' },
  },
  {
    id: 'rl-lab',
    name: 'RL Lab + Data Lab',
    // Counts from the repo's own hero (9 algorithms, 100+ environments).
    tagline:
      'Train, watch & play against AI — from CartPole to Atari, physics, Doom and board games. 9 algorithms across 100+ environments; Data Lab adds research-grade metrics, seed sweeps and one-click exports.',
    stack: ['Python', 'FastAPI', 'PyTorch', 'React 19', 'TypeScript', 'Vite'],
    era: 'claude',
    link: { href: 'https://github.com/Martin8O/RL-Lab', display: 'github.com/Martin8O/RL-Lab' },
    live: true,
    status: 'Runs locally — no hosted demo',
    build: { days: 23, commits: 112 },
    workOrder: 1,
    window: { tint: CORAL, kind: 'anim', shot: 'rllab', aspect: 0.58 },
  },
  {
    id: 'brainquest',
    name: 'BrainQuest + dev-brain',
    tagline:
      'Turns an Obsidian knowledge vault into a learning game — spaced repetition (FSRS), a skill-tree of concepts and an AI tutor.',
    stack: ['Next.js', 'Capacitor', 'FSRS', 'LLM'],
    era: 'claude',
    link: { href: 'https://github.com/Martin8O/BrainQuest', display: 'github.com/Martin8O/BrainQuest' },
    live: true,
    status: 'Porting to Android',
    build: { days: 10, commits: 42 },
    workOrder: 5,
    window: { tint: MINT, kind: 'graph' },
  },
  // No `window` block — the dev scene keeps its five windows; this one IS the
  // site around them. (The Work panel is where it becomes legible.)
  {
    id: 'this-site',
    name: 'This Site',
    tagline:
      'The scrollytelling site you are travelling through right now — from an empty folder to a live production deployment in 4 days.',
    stack: ['React', 'TypeScript', 'Vite', 'Canvas 2D', 'Lenis'],
    era: 'claude',
    link: { href: 'https://svobodamartin.dev', display: 'svobodamartin.dev' },
    repo: 'https://github.com/Martin8O/Website',
    live: true,
    build: { days: 4, commits: 32 },
    workOrder: 4,
  },
]

/** The Claude-month apps that float as windows in the `dev` scene, in slot
 *  order — the source for both the canvas chrome and the clickable anchors.
 *  Narrowed so `window` is non-optional for consumers. */
export type DevProject = Project & { window: NonNullable<Project['window']> }
export const DEV_PROJECTS: DevProject[] = PROJECTS.filter(
  (p): p is DevProject => p.window !== undefined,
)

/**
 * The projects in the requested language — EN canonical, CS as a copy overlay
 * merged per id (chapters.ts pattern). Built once per language and cached so
 * consumers get stable identities.
 */
const LOCALIZED: Partial<Record<Lang, Project[]>> = { en: PROJECTS }

export function projectsFor(lang: Lang): Project[] {
  return (LOCALIZED[lang] ??= PROJECTS.map((p) => ({ ...p, ...PROJECT_COPY_CS[p.id] })))
}
