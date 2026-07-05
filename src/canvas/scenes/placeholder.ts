/**
 * Placeholder atmosphere for themes whose real scenes land in B2 (sky family)
 * and B3 (calm / bitcoin / dev) — a quiet, accent-tinted night so the story
 * stays coherent live while each world is built. Intentionally minimal;
 * replaced one registry entry at a time.
 */

import type { Renderer } from '../types'
import { drawGlow, drawStars, fillVerticalGradient, mixHex } from '../toolkit'

export const renderPlaceholder: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h, accent } = cfg
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      [0, '#04050a'],
      [0.55, mixHex('#0a0e18', accent, 0.06)],
      [1, mixHex('#06070a', accent, 0.12)],
    ],
    alpha,
  )
  // A slow-breathing pool of the theme's accent, drifting up as the run plays.
  drawGlow(ctx, w * 0.5, h * (0.5 - t * 0.08), Math.min(w, h) * 0.55, accent, alpha * 0.12)
  drawStars(ctx, {
    w, h: h * 0.85, count: 70, seed: 5, alpha: alpha * 0.35, size: 1.2,
    time, twinkle: 0.4, xShift: time * 0.001, yShift: -t * 0.04,
  })
}
