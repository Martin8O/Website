/**
 * CONTACT — pure math for the breathing finale (chapter 09, "Now"). No DOM,
 * no clock, no state: every function is deterministic in its inputs so the
 * scene stays scrubbable and unit-testable.
 *
 * The world is a single quiet organism of light — a radial field of particle
 * FILAMENTS around a dark core (ref: `pulsing bottom or end style.jpg`) that
 * BREATHES at a meditation pace. A slow wave of breath travels around the
 * ring (the lobes swell in turn, not in lockstep), SPORES detach from the
 * fur and drift off into the dust, and every ~13 s a faint PULSE ring rolls
 * outward — a heartbeat under the text. The whole structure blooms in from
 * a seed across the last stretch of scroll (`bloom*`), then lives on time
 * alone: the visitor sits with it while they read the card.
 *
 * Geometry convention: a filament's dots live on `u ∈ [CORE..1]` of its
 * reach; helpers below shape brightness on the normalized `s = (u−CORE)/
 * (1−CORE)`. All cycles are phase-offset so the frame is COMPLETE at
 * time 0 (reduced motion): breath near-full, no half-born pulse.
 */

import { TAU, clamp01, hash1, smoothstep } from '../toolkit'

export const CONTACT = {
  /** One breath, seconds — a calm meditation pace (~7 breaths/min). */
  breathPeriod: 8.4,
  /** Inhale fraction of the cycle — filling is quicker than letting go. */
  inhale: 0.42,
  /** Phase offset so `breath(0)` sits near-full (the static frame). */
  breathPhase0: 0.36,
  /** Crests of the traveling breath wave around the ring. */
  waveCrests: 2,
  /** Filament count and dots per filament (the bloom's density budget —
   *  Martin's rev2 call: as many particles as the frame budget carries;
   *  per-dot randoms are pre-baked so the per-frame cost stays arithmetic). */
  filaments: 380,
  dots: 52,
  /** Core radius, as a fraction of a filament's unit reach — near zero
   *  (rev3): the centre is FULL of particles, a galactic nucleus, not a
   *  black hole (Martin). Strands reach virtually to dead centre. */
  core: 0.012,
  /** Scroll bloom window (scene localT): seed → full organism. */
  bloomT0: 0.44,
  bloomT1: 0.96,
  /** Heartbeat ring: launch period + travel time, seconds; phase offset
   *  puts time 0 in the quiet gap between pulses. */
  pulsePeriod: 13,
  pulseTravel: 6.5,
  pulsePhase0: 0.7,
  /** Drifting spores: population + one drift lifetime, seconds. */
  spores: 240,
  sporePeriod: 17,
} as const

/** The story wheel: how many colour segments ring the bloom (one per world
 *  lived — origin, sky, calm, bitcoin, dev; contact is the centre). */
export const STORY_SEGMENTS = 5

/**
 * Which story segment an angle belongs to and how far into it, with the
 * wheel anchored at the TOP (angle −π/2 = segment 0 start) running
 * clockwise — the journey circles the "now". TAU-periodic.
 */
export function storyMix(angle: number): { seg: number; t: number } {
  const x = fract((angle + Math.PI / 2) / TAU) * STORY_SEGMENTS
  const seg = Math.min(STORY_SEGMENTS - 1, Math.floor(x))
  return { seg, t: x - seg }
}

/** Wrap any time/phase to [0,1). */
export function fract(x: number): number {
  return ((x % 1) + 1) % 1
}

/**
 * The breath scalar 0..1 (0 = fully let go, 1 = full). Asymmetric: a smooth
 * rise over `inhale` of the cycle, a longer smooth release over the rest.
 * Periodic in `breathPeriod`; near-full at time 0.
 */
export function breath(time: number, phaseShift = 0): number {
  const u = fract(time / CONTACT.breathPeriod + CONTACT.breathPhase0 + phaseShift)
  if (u < CONTACT.inhale) return smoothstep(0, 1, u / CONTACT.inhale)
  return 1 - smoothstep(0, 1, (u - CONTACT.inhale) / (1 - CONTACT.inhale))
}

/**
 * Breath with a wave traveling around the ring: `waveCrests` swells chase
 * each other, one revolution per `breathPeriod`. Angle-periodic (TAU).
 */
export function breathWave(time: number, angle: number): number {
  return breath(time, -(angle * CONTACT.waveCrests) / TAU)
}

/** How much of the organism's reach exists at scroll `t` — grows from a
 *  small seed instead of popping from radius 0. Monotone, 0.22 → 1. */
export function bloomReach(t: number): number {
  return 0.22 + 0.78 * smoothstep(CONTACT.bloomT0, CONTACT.bloomT1, clamp01(t))
}

/** The organism's presence (brightness) at scroll `t` — arrives faster than
 *  the reach so the seed is visible as soon as the scene owns pixels. */
export function bloomAlpha(t: number): number {
  return smoothstep(CONTACT.bloomT0, CONTACT.bloomT0 + 0.22, clamp01(t))
}

/**
 * The petal profile: filament reach 0..1 as a function of the filament's
 * BASE angle — summed integer harmonics, so the profile is TAU-periodic and
 * organic (long lobes, short valleys — never a clean circle). Clamped to
 * [0.3, 1].
 */
export function petalReach(angle: number, seed: number): number {
  const p1 = hash1(seed + 1.7) * TAU
  const p2 = hash1(seed + 5.3) * TAU
  const p3 = hash1(seed + 9.1) * TAU
  const p4 = hash1(seed + 13.9) * TAU
  const v =
    0.74 +
    0.1 * Math.sin(angle * 3 + p1) +
    0.08 * Math.sin(angle * 5 + p2) +
    0.05 * Math.sin(angle * 9 + p3) +
    0.035 * Math.sin(angle * 16 + p4)
  return Math.min(1, Math.max(0.45, v))
}

/** Base angle of filament `i` of `n` — an even fan with deterministic jitter
 *  (never a visible spoke grid). In [0, TAU). */
export function filamentAngle(i: number, n: number): number {
  return fract((i + 0.5 + (hash1(i * 7.3 + 2.1) - 0.5) * 0.8) / n) * TAU
}

/**
 * Brightness along a filament, on normalized `s` (0 = centre, 1 = tip):
 * the centre stays lit but MODEST (rev7 — the spiral arms carry the mass,
 * not a blazing nucleus), the peak band sits around halfway out, and a
 * long tail still carries real light at the tip — with the bloom spanning
 * the whole frame, the outer half is where most of the screen lives.
 */
export function filamentGlow(s: number): number {
  return (0.3 + 0.7 * smoothstep(0.05, 0.45, s)) * (1 - smoothstep(0.5, 1.15, s))
}

export type Spore = {
  /** Radial position in units of the organism's reach (starts at the fur). */
  r: number
  /** Drift angle, radians. */
  ang: number
  /** Life envelope 0..1 (fade in, fade out). */
  a: number
}

/**
 * One drifting spore: a deterministic recycling life. Each spore lives a
 * personal `sporePeriod` cycle (hash-offset phase): it detaches near the
 * fur's outer third, drifts outward with a slight curl, and fades at both
 * ends of the drift. Same (i, time) → same spore.
 */
export function spore(i: number, time: number): Spore {
  const ph = fract(time / CONTACT.sporePeriod + hash1(i * 3.7 + 0.4))
  const a0 = hash1(i * 11.3 + 2.2) * TAU
  const curl = (hash1(i * 5.9 + 7.7) - 0.5) * 0.6
  const start = 0.72 + hash1(i * 17.1 + 4.4) * 0.28
  return {
    r: start + ph * 0.75,
    ang: a0 + ph * curl,
    a: Math.sin(Math.PI * ph) ** 2,
  }
}

/** The fly-through dust cluster: population + seconds for one far→near
 *  drift (slow — a cruise, not a warp jump). */
export const DUST = { count: 700, period: 46 } as const

export type Dust = {
  /** Fixed plane coordinates, roughly [-1.6, 1.6] × [-1.15, 1.15]. */
  ux: number
  uy: number
  /** Depth 0 (at the camera) … 1 (far plane); decreases as time flows —
   *  the cluster drifts PAST the visitor. */
  z: number
  /** Colour pick 0..1 (most dust is pale, some carries a story colour). */
  tint: number
  /** Per-mote jitter for size/brightness variance. */
  jit: number
}

/**
 * One mote of the star cluster the finale cruises through. Deterministic
 * (i, time) → mote; each recycles to the far plane after one period, so
 * the flight never ends and any frame is scrub-safe.
 */
export function dust(i: number, time: number): Dust {
  return {
    ux: (hash1(i * 13.1 + 0.3) * 2 - 1) * 1.6,
    uy: (hash1(i * 17.9 + 4.1) * 2 - 1) * 1.15,
    z: 1 - fract(hash1(i * 7.7 + 9.2) + time / DUST.period),
    tint: hash1(i * 23.3 + 1.9),
    jit: hash1(i * 29.9 + 6.4),
  }
}

/** Cursor gravitational waves (dev-scene lineage — the wave is invisible;
 *  only what it does to particles shows). Two independent fronts share the
 *  same period, half a cycle apart: one stays ANCHORED where it was born,
 *  the other travels with the hand (rev7). */
export const WAVE = {
  period: 2.8,
  /** Gaussian half-width of a front, in range units. */
  width: 0.055,
} as const

/**
 * Strength of ONE gravitational-wave front at normalized distance `d01`
 * from its source (0 = at the source, 1 = edge of range), with the front
 * currently at radius `front01` (0..1 of the range). Fades as it travels;
 * silent outside the range. Drives both particle displacement and the
 * brightening of the passing front.
 */
export function gravFront(d01: number, front01: number): number {
  if (d01 < 0 || d01 >= 1) return 0
  return Math.exp(-(((d01 - front01) / WAVE.width) ** 2)) * (1 - front01)
}

export type Pulse = {
  /** Ring radius 0..1 (fraction of full travel). */
  r01: number
  /** Ring strength 0..1 — 0 in the rest gap between pulses. */
  a: number
}

/** The heartbeat ring: every `pulsePeriod` a front leaves the core and
 *  crosses the field in `pulseTravel` seconds, fading as it runs. Quiet at
 *  time 0 (phase offset) so the static frame holds no half-born ring. */
export function pulse(time: number): Pulse {
  const d = fract(time / CONTACT.pulsePeriod + CONTACT.pulsePhase0) * CONTACT.pulsePeriod
  if (d >= CONTACT.pulseTravel) return { r01: 1, a: 0 }
  const k = d / CONTACT.pulseTravel
  return { r01: Math.sqrt(k), a: (1 - k) ** 2 }
}
