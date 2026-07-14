/**
 * Martin's meditator figure, cut PIXEL-EXACT from his reference photo by
 * `node local/tmp/make-meditator-sprites.mjs` (no tracing, no redrawing,
 * original RGB + the photo's own soft edges): [0] `meditace.jpg` — back
 * view, lotus, facing the distant light (his pick).
 *
 * The sprite now lives as a REAL file in ./img, imported as a Vite asset
 * (hashed, immutable-cached) — the former base64 payload sat in the
 * CanvasStage chunk's parse/eval (perf pass 2026-07-14). `aspect` =
 * width/height for placement; the calm scene still decodes it lazily
 * (draws skip until complete).
 */

import meditatorUrl from './img/meditator.png'

export const MEDITATOR_SPRITES = [
  {
    url: meditatorUrl,
    aspect: 0.94,
  },
] as const
