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
 * live (C1). Private repos (ClearFeed, RL Lab, BrainQuest) currently 404 to
 * the public — they carry `live: false`; the link still renders per Martin's
 * "link every repo, publish over time" policy.
 */

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
  /** Whether `link.href` is publicly reachable right now. Private repos read
   *  false — the link still renders (Martin's "link every repo" policy), this
   *  just flags the ones that 404 to the public until he publishes them. */
  live: boolean
  /** Short status note for private / not-yet-shipped work. */
  status?: string
  /** Collaboration disclaimer chip in the window title bar (honest solo-dev
   *  framing: Těnovice was built WITH a friends' org). */
  badge?: string
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
  },
  {
    id: 'rrcentrum',
    name: 'RR Centrum Polabí',
    tagline: 'A website for a regeneration & rehabilitation centre run by two physiotherapists.',
    stack: ['Web'],
    era: 'pre-claude',
    link: { href: 'https://rrcentrumpolabi.cz', display: 'rrcentrumpolabi.cz' },
    live: true,
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
  },
  {
    id: 'due-deck',
    name: 'Due-Deck',
    tagline:
      "A warranties, insurance-renewal, contract & appointment tracker that runs fully in-browser.",
    stack: ['Lovable', 'Web', 'localStorage'],
    era: 'pre-claude',
    link: { href: 'https://duedeck.lovable.app', display: 'duedeck.lovable.app' },
    live: true,
  },
  {
    id: 'wealth-deck',
    name: 'Wealth-Deck',
    tagline:
      'A personal finance & portfolio dashboard — investments, allocation and performance in one view.',
    stack: ['Lovable', 'Web'],
    era: 'pre-claude',
    link: { href: 'https://wealthdeck.lovable.app', display: 'wealthdeck.lovable.app' },
    live: true,
  },
  {
    id: 'rand-pulse',
    name: 'Rand-Pulse',
    tagline: 'A sleek random generator for quick decisions and inspiration.',
    stack: ['Lovable', 'Web'],
    era: 'pre-claude',
    link: { href: 'https://randpulse.lovable.app', display: 'randpulse.lovable.app' },
    live: true,
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
    live: false,
    status: 'Repo private · not yet in the store',
    window: { tint: CYAN, kind: 'blocklist', shot: 'clearfeed', cropX: 0.08 },
  },
  {
    id: 'tenovice',
    name: 'Těnovice',
    tagline: 'A fundraising page for Těnovice, a Buddhist retreat centre.',
    stack: ['AWS CDK', 'DynamoDB', 'Serverless'],
    era: 'claude',
    link: { href: 'https://www.one-tenovice.cz', display: 'one-tenovice.cz' },
    live: true,
    badge: 'COLLAB',
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
    live: true,
    window: { tint: MAGENTA, kind: 'form', shot: 'registrace' },
  },
  {
    id: 'rl-lab',
    name: 'RL Lab + Data Lab',
    tagline:
      'Build, train, watch and play against reinforcement-learning agents across 100+ environments from one browser dashboard.',
    stack: ['Python', 'FastAPI', 'PyTorch', 'React 19', 'TypeScript', 'Vite'],
    era: 'claude',
    link: { href: 'https://github.com/Martin8O/RL-Lab', display: 'github.com/Martin8O/RL-Lab' },
    live: false,
    status: 'Repo private · runs locally',
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
    live: false,
    status: 'Repo private · porting to Android',
    window: { tint: MINT, kind: 'graph' },
  },
]

/** The Claude-month apps that float as windows in the `dev` scene, in slot
 *  order — the source for both the canvas chrome and the clickable anchors.
 *  Narrowed so `window` is non-optional for consumers. */
export type DevProject = Project & { window: NonNullable<Project['window']> }
export const DEV_PROJECTS: DevProject[] = PROJECTS.filter(
  (p): p is DevProject => p.window !== undefined,
)
