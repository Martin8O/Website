import { THEME_ACCENT } from '../data/chapters'
import { resolveSceneFrame, type SceneRun } from '../canvas/sceneTimeline'

/**
 * Continuous accent colour (C4 cohesion pass). The stage `--accent` used to
 * STEP at each chapter boundary while the canvas cross-faded smoothly
 * underneath; now the DOM accent rides the very same scene timeline — the
 * HUD, tick scale and vignette glide between theme colours exactly in sync
 * with the painted hand-over (including per-chapter `enterFade` overrides).
 * Pure functions — no DOM, no clock — so this is unit-tested.
 */

function channel(hex: string, i: number): number {
  return parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)
}

/** Linear mix of two `#rrggbb` colours; `t` clamped to 0..1. */
export function mixHex(a: string, b: string, t: number): string {
  const u = t < 0 ? 0 : t > 1 ? 1 : t
  let out = '#'
  for (let i = 0; i < 3; i++) {
    const v = Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * u)
    out += v.toString(16).padStart(2, '0')
  }
  return out
}

/** The blended theme accent at a continuous chapter position. */
export function accentAt(pos: number, runs: readonly SceneRun[], count: number): string {
  const frame = resolveSceneFrame(pos, runs, count)
  if (!frame) return THEME_ACCENT.origin
  const base = THEME_ACCENT[frame.base.run.theme]
  if (!frame.incoming) return base
  return mixHex(base, THEME_ACCENT[frame.incoming.run.theme], frame.incoming.alpha)
}
