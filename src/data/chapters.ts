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

/** Visual worlds. Extensible union — a new *kind* later (e.g. 'sport') slots
 *  in here and gets one renderer in the Phase-B theme registry. */
export type Theme = 'origin' | 'sky' | 'calm' | 'bitcoin' | 'dev' | 'contact'

/** Sub-mood for `sky` chapters (the pilot arc), selected in Phase B. */
export type Sky = 'climb' | 'cruise' | 'desert' | 'airshow' | 'sunset'

export type Chapter = {
  /** Stable unique id (keys, anchors, tests). */
  id: string
  theme: Theme
  /** Shown in the amber HUD instrument, e.g. '2003–2012'. */
  era?: string
  /** Eyebrow above the title, e.g. '05 — Airshow'. */
  num?: string
  /** Chapter heading; may contain `<br>`. */
  title: string
  /** Chapter body; may contain `<br>` and accent spans. */
  body?: string
  /** Only meaningful for theme 'sky'. */
  sky?: Sky
  /** Only for theme 'dev'; the real Work items land here in Phase C1. */
  projects?: string[]
  /** Optional per-chapter palette override (Phase C4 cohesion pass). */
  palette?: string[]
}

/** Signature accent colour per theme — drives the eyebrow + HUD tint so the
 *  palette is data-driven from day one (hex, matches the design tokens). */
export const THEME_ACCENT: Record<Theme, string> = {
  origin: '#f5c451',
  sky: '#ffb000',
  calm: '#35d0e0',
  bitcoin: '#f7931a',
  dev: '#e0459b',
  contact: '#7b8494',
}

export const CHAPTERS: Chapter[] = [
  {
    id: 'intro',
    theme: 'origin',
    num: '↓ Scroll to travel through a life',
    title: 'MARTIN',
    body: 'One life, many worlds. Scroll speed is the speed of time. Move down and let the sun run across the sky.',
  },
  {
    id: 'origin-school',
    theme: 'origin',
    era: '1980 · School',
    num: '00 — Origin',
    title: 'School<br>& Pascal',
    body: 'A school-leaving exam in maths and programming. In Pascal I wrote <span class="a-gold">chess for two players</span> — it enforced the rules, no AI opponent yet. The first lines of code, with no idea where they would lead.',
  },
  {
    id: 'sky-climb',
    theme: 'sky',
    sky: 'climb',
    era: 'CTU → Brno',
    num: '01 — The Decision',
    title: 'Upward',
    body: 'From CTU FEE, after two years, to the University of Defence. The goal: a <span class="a-hud">military pilot</span>. The Z‑142, then the L‑39C — over a hundred hours in the air and a brand-new identity.',
  },
  {
    id: 'sky-cruise',
    theme: 'sky',
    sky: 'cruise',
    era: '2003–2012',
    num: '02 — Fighters',
    title: 'Above the<br>clouds',
    body: 'Pardubice, Náměšť, Čáslav. The L‑39C, the L‑39ZA, then the <span class="a-hud">L‑159</span>. The horizon curved, the clouds stayed below the wings, and time was measured in g-forces.',
  },
  {
    id: 'sky-desert',
    theme: 'sky',
    sky: 'desert',
    era: '2010 · Bagram',
    num: '03 — Afghanistan',
    title: 'A different<br>sky',
    body: 'Bagram Air Base, liaison officer. Dust instead of clouds, the same service. The kind of experience that resets you.',
  },
  {
    id: 'calm-healing',
    theme: 'calm',
    era: '2013',
    num: '04 — The Test',
    title: 'Healing',
    body: 'Ulcerative colitis. A year and a half — and <span class="a-cyan">I healed myself</span>. I wrote a whole website about that journey. The body as the first project I had to “debug.”',
  },
  {
    id: 'sky-airshow',
    theme: 'sky',
    sky: 'airshow',
    era: '2016–2017',
    num: '05 — Airshow',
    title: 'Display<br>pilot',
    body: 'A two-ship strike on a ground target — Czechia, Slovakia, Romania, the UK, Sweden. <span class="a-hud">Flying for thousands of eyes below.</span> Precision to the centimetre, adrenaline at the maximum.',
  },
  {
    id: 'sky-sunset',
    theme: 'sky',
    sky: 'sunset',
    era: '2020–2022',
    num: '06 — End of service',
    title: 'Instructor,<br>test pilot',
    body: 'Instructor → flight-safety inspector → test pilot. Military retirement in 2022. Retrained as a network and systems administrator. Travels around the world, and helping out at Buddhist courses.',
  },
  {
    id: 'bitcoin-node',
    theme: 'bitcoin',
    era: 'since 2017',
    num: '07 — Bitcoin',
    title: 'My own<br>node',
    body: 'A fascination with Bitcoin. A <span class="a-btc">full node</span> at home, for a while a Lightning node on Umbrel, a Bitaxe solo miner wired to my own pool. Many friends brought into the world of hard money.',
  },
  {
    id: 'dev-explosion',
    theme: 'dev',
    era: '2026',
    num: '08 — The explosion',
    title: 'Solo<br>developer',
    body: 'I discovered Claude Code and the activity exploded. In one month: <span class="a-cyan">worlds of my own</span>, one after another.',
    projects: ['ClearFeed', 'Těnovice', 'Registrace', 'RL Lab', 'BrainQuest'],
  },
]
