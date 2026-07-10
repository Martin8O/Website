/**
 * Depth-starfield math — pure, three-free, unit-tested. Generates the baked
 * star buffers (positions/colors/sizes/phases) and the per-theme presence
 * curves that tie the 3D field to the 2D world's own story beats.
 *
 * The bake is ANCHOR-local: stars fill a view cone down local −z, wide enough
 * for any real aspect ratio (plus flight-weave margin), so the volume needs
 * no per-resize rebuild. Since E2 the volume is PLACED in world space where
 * its scene's window begins (oriented along the window chord) and the
 * scroll-flight camera flies through it. All randomness is `hash1`-seeded —
 * a given seed always bakes the same sky (scrub-safe, testable).
 */

import type { Theme } from '../data/chapters'
import { clamp01, hash1, smoothstep } from '../canvas/toolkit'

export type StarfieldSpec = {
  /** Stars in the volume. */
  count: number
  /** Deterministic seed — same seed, same sky. */
  seed: number
  /** View-cone half-tangents the volume covers. Vertical fov 55° → tan ≈ 0.52;
   *  horizontal is that × a generous max aspect so ultrawide stays filled,
   *  and both carry margin for the flight path's weave yaw/pitch (≤ ~8.5°,
   *  see flightMath WEAVE_*) so the cone edges never show in a turn. */
  tanX: number
  tanY: number
  /** Depth band, positive distances in front of the camera. */
  near: number
  far: number
  /** Weighted sRGB palette. Fed to the shader raw (no colour-space
   *  transform): the additive layer must match the 2D world's CSS hexes
   *  exactly. */
  palette: ReadonlyArray<readonly [hex: string, weight: number]>
  /** World-unit point-size band (the shader divides by depth). */
  sizeMin: number
  sizeMax: number
  /** Share of stars promoted to bright anchors, and their size boost. */
  anchorShare: number
  anchorBoost: number
  /** Ambient roll, rad/s (frozen with `time` under reduced motion — where the
   *  3D layer never mounts anyway). How far the camera travels THROUGH the
   *  field lives in flightMath's `TRAVEL` (E2 — the camera owns the motion). */
  rotSpeed: number
}

export type StarBuffers = {
  positions: Float32Array
  colors: Float32Array
  sizes: Float32Array
  phases: Float32Array
}

/** The two E1 fields. Origin: sparse, deep, warm-white pre-dawn glints that
 *  live BETWEEN the 2D parallax star layers. Contact: small coloured motes in
 *  the 2D galaxy's own palette (contact.ts GALAXY colours — no pure white, so
 *  the deep field never out-shines the little coloured dots it backs). */
export const STARFIELDS: Partial<Record<Theme, StarfieldSpec>> = {
  origin: {
    count: 800,
    seed: 41,
    tanX: 1.5,
    tanY: 0.62,
    near: 6,
    far: 70,
    palette: [
      ['#ffffff', 4.5],
      ['#fff3d8', 3],
      ['#f5c451', 1.4],
      ['#cfe0ff', 1.6],
    ],
    sizeMin: 0.035,
    sizeMax: 0.11,
    anchorShare: 0.06,
    anchorBoost: 2.1,
    rotSpeed: 0.004,
  },
  contact: {
    count: 1150,
    seed: 977,
    tanX: 1.5,
    tanY: 0.62,
    near: 6,
    far: 80,
    palette: [
      ['#cfe0ff', 1.1],
      ['#f5c451', 1.5],
      ['#f7931a', 0.9],
      ['#35d0e0', 1.6],
      ['#5b3aa8', 1.8],
      ['#2a4bd8', 1.5],
      ['#e0459b', 1.1],
    ],
    sizeMin: 0.026,
    sizeMax: 0.08,
    anchorShare: 0.05,
    anchorBoost: 1.7,
    rotSpeed: 0.002,
  },
}

function hexChannel(hex: string, i: number): number {
  return parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255
}

/** Bake the star buffers for a spec. Distances bias toward FAR (density like
 *  a real sky — many faint deep stars, few near bokeh glints). */
export function genStars(spec: StarfieldSpec): StarBuffers {
  const positions = new Float32Array(spec.count * 3)
  const colors = new Float32Array(spec.count * 3)
  const sizes = new Float32Array(spec.count)
  const phases = new Float32Array(spec.count)

  const totalWeight = spec.palette.reduce((acc, [, w]) => acc + w, 0)

  for (let i = 0; i < spec.count; i++) {
    const k = spec.seed + i * 7
    // Depth first (biased far), then a frustum-slice position at that depth,
    // so angular star density is uniform across the view at any distance.
    const dist = spec.near + (spec.far - spec.near) * Math.pow(hash1(k), 0.6)
    positions[i * 3] = (hash1(k + 1) * 2 - 1) * spec.tanX * dist
    positions[i * 3 + 1] = (hash1(k + 2) * 2 - 1) * spec.tanY * dist
    positions[i * 3 + 2] = -dist

    // Weighted palette pick + a brightness dice so no two stars match.
    let pick = hash1(k + 3) * totalWeight
    let hex = spec.palette[spec.palette.length - 1][0]
    for (const [h, w] of spec.palette) {
      pick -= w
      if (pick <= 0) {
        hex = h
        break
      }
    }
    const brightness = 0.6 + 0.4 * hash1(k + 4)
    colors[i * 3] = hexChannel(hex, 0) * brightness
    colors[i * 3 + 1] = hexChannel(hex, 1) * brightness
    colors[i * 3 + 2] = hexChannel(hex, 2) * brightness

    const anchor = hash1(k + 5) < spec.anchorShare ? spec.anchorBoost : 1
    const body = Math.pow(hash1(k + 6), 2) // bias small
    sizes[i] = (spec.sizeMin + (spec.sizeMax - spec.sizeMin) * body) * anchor
    phases[i] = hash1(k + 7)
  }

  return { positions, colors, sizes, phases }
}

/**
 * Origin presence — an exact mirror of the 2D dawn (origin.ts): the sun's
 * `elevation` drives `daylight`, and the deep stars die with the 2D star
 * layers, so the two worlds always agree about when night ends.
 */
export function originStarPresence(t: number): number {
  const climb = smoothstep(0.16, 0.9, t)
  const elevation = Math.pow(climb, 1.3) * 0.8
  return 1 - smoothstep(0.02, 0.55, elevation)
}

/**
 * Contact presence — the deep field is the backdrop the galaxy blooms INTO:
 * it arrives ahead of the bloom seed (contactMath `bloomT0` = 0.44) and holds
 * to the story's end.
 */
export function contactStarPresence(t: number): number {
  return smoothstep(0.12, 0.44, clamp01(t))
}

/** Presence dispatch for the themes a starfield augments. */
export function starPresence(theme: Theme, t: number): number {
  if (theme === 'origin') return originStarPresence(t)
  if (theme === 'contact') return contactStarPresence(t)
  return 0
}
