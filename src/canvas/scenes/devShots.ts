/**
 * Hero shots of the Claude-month projects (each repo's README hero /
 * live-site capture), downscaled to 480px by `node local/tmp/gen-devshots.mjs`.
 *
 * They now live as REAL files in ./img, imported as Vite assets (hashed,
 * immutable-cached) — the former base64 payloads cost the CanvasStage
 * chunk ~115 KB of JS parse/eval on every load (perf pass 2026-07-14).
 * The dev scene still decodes them lazily (draws skip until complete).
 */

import clearfeedUrl from './img/clearfeed.jpg'
import tenoviceUrl from './img/tenovice.jpg'
import registraceUrl from './img/registrace.jpg'
import rllabUrl from './img/rllab.jpg'

export const DEV_SHOTS: Record<string, { url: string; aspect: number }> = {
  clearfeed: {
    url: clearfeedUrl,
    aspect: 2.5,
  },
  tenovice: {
    url: tenoviceUrl,
    aspect: 0.74,
  },
  registrace: {
    url: registraceUrl,
    aspect: 1.6,
  },
  rllab: {
    url: rllabUrl,
    aspect: 2.064,
  },
}
