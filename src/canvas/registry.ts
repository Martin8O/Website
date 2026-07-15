import type { Theme } from '../data/chapters'
import type { Renderer } from './types'
import { renderCalm } from './scenes/calm'
import { renderOffer } from './scenes/offer'
import { renderOrigin } from './scenes/origin'
import { renderSky } from './scenes/sky'

/**
 * The theme registry — the ONE place a new visual kind is wired (CLAUDE.md).
 *
 * Two tiers (Dperf-4 — boot-JS split):
 *  - EAGER — scene 00 plus the front/middle worlds a moderate scroll reaches
 *    quickly (`origin`, the `sky` family, `calm`, `offer`). A reload can land
 *    parked on any of them, so their renderers ride the CanvasStage chunk and
 *    are present the instant the canvas first paints.
 *  - LAZY — the three heaviest, deepest worlds (`bitcoin` ≈ ch-07, `dev`
 *    ≈ ch-08, the `contact` finale) plus their math/data modules. ~40 KB of
 *    renderer code scene 00 never touches, split into their own chunks so it
 *    leaves the boot-critical bundle. Warmed during idle after boot
 *    (`prefetchLazyScenes`) and loaded on demand the instant one is requested
 *    (`getRenderer`); until a chunk arrives the caller paints the dark stage
 *    (the same appearance as every boot's preloader→first-frame gap).
 *
 * The union stays total: `EagerTheme | LazyTheme` is compile-checked to equal
 * `Theme`, so adding a theme to the data union without wiring a renderer here
 * (eager) or a loader (lazy) is a build error — the CLAUDE.md guarantee.
 */

type EagerTheme = 'origin' | 'sky' | 'calm' | 'offer'
type LazyTheme = 'bitcoin' | 'dev' | 'contact'

// The two tiers must partition `Theme` exactly — a new theme breaks this line.
type AssertPartition = [Theme] extends [EagerTheme | LazyTheme]
  ? [EagerTheme | LazyTheme] extends [Theme]
    ? true
    : never
  : never
const _themeCoverage: AssertPartition = true
void _themeCoverage

const EAGER: Record<EagerTheme, Renderer> = {
  origin: renderOrigin,
  sky: renderSky,
  calm: renderCalm,
  offer: renderOffer,
}

const LAZY_LOADERS: Record<LazyTheme, () => Promise<Renderer>> = {
  bitcoin: () => import('./scenes/bitcoin').then((m) => m.renderBitcoin),
  dev: () => import('./scenes/dev').then((m) => m.renderDev),
  contact: () => import('./scenes/contact').then((m) => m.renderContact),
}

const loaded: Partial<Record<Theme, Renderer>> = { ...EAGER }
const inflight = new Set<LazyTheme>()
const LAZY_KEYS = Object.keys(LAZY_LOADERS) as LazyTheme[]
let epoch = 0

const isLazy = (theme: Theme): theme is LazyTheme =>
  (LAZY_KEYS as string[]).includes(theme)

function load(theme: LazyTheme): void {
  if (loaded[theme] || inflight.has(theme)) return
  inflight.add(theme)
  LAZY_LOADERS[theme]()
    .then((renderer) => {
      loaded[theme] = renderer
      // Bump so the canvas loop repaints even a parked (reduced-motion) frame
      // that was showing the floor while this chunk was in flight.
      epoch++
    })
    .catch(() => {
      // Chunk failed (flaky network / deploy skew) — leave it unloaded; the
      // next getRenderer retries, and the dark stage shows meanwhile.
    })
    .finally(() => inflight.delete(theme))
}

/**
 * The renderer for a theme, or `undefined` if it is a lazy world whose chunk
 * has not arrived yet — in which case its import is kicked here so the coming
 * frames pick it up (and the caller paints the safety floor this frame).
 */
export function getRenderer(theme: Theme): Renderer | undefined {
  const renderer = loaded[theme]
  if (renderer) return renderer
  if (isLazy(theme)) load(theme)
  return undefined
}

/**
 * Warm the lazy scene chunks during idle so a normal scroll never waits on a
 * network round-trip when it reaches the deep worlds. Idempotent (a loaded /
 * in-flight chunk is skipped).
 */
export function prefetchLazyScenes(): void {
  for (const theme of LAZY_KEYS) load(theme)
}

/**
 * Increments each time a lazy renderer finishes loading. The canvas loop reads
 * it to force a repaint when a chunk arrives (otherwise a reduced-motion frame
 * parked over a just-loaded world would keep showing the floor until scroll).
 */
export function rendererEpoch(): number {
  return epoch
}
