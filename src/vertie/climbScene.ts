/**
 * CLIMB → VERTIE scene document (E1c) — the authored Part-1 sequence
 * re-expressed in the open Vertie format, so the site's hero beat can be
 * played by the published `vertie` player instead of by `ClimbHeroes.tsx`.
 *
 * PURE and three-free on purpose: this is a data transform, unit-tested
 * against the same `CLIMB_SEQ` the bespoke engine reads. The generator
 * (`scripts/gen-vertie-climb.mjs`) writes its output to
 * `public/climb/climb.json`; `climbScene.test.ts` pins the committed file to
 * this function, so the two can never drift.
 *
 * THE TWO TIME BASES (the only subtle part). The lab authored in "% of
 * scroll", and the site carries two different derived clocks:
 *  - `ClimbAircraft.start` and `ClimbSnap.step` are already in authored-%
 *    units → scene-local units are simply ×100 (the format's units are
 *    arbitrary; §6 says only ratios matter).
 *  - `ClimbEffect.at` / `.span` are in WINDOW-t (climbMath converted them
 *    through `SEQ_START_T`/`SCROLL_TO_T` when it baked the sequence) → they
 *    must be converted BACK, which is what `windowTToScene` does.
 * The host's own t → scene mapping is the mirror image and lives in
 * `VertieClimb.tsx` (`climbSceneT`).
 */

import {
  LAB_BOX,
  SCROLL_TO_T,
  SEQ_START_T,
  type ClimbAircraft,
  type ClimbSequence,
} from '../three/climbMath'

/** Authored "%" → scene-local units. One authored % = 100 scene units, so the
 *  numbers in the document read exactly like the lab's own step values. */
const PCT_TO_SCENE = 100

/** The stage camera's vertical FOV — `Starfield.STAGE_FOV`, restated here so
 *  this module stays three-free (climbMath pins the same 55 for its own
 *  projection math). */
export const STAGE_FOV = 55

/** The frustum-clamp margin the site's `climbXScale` has always applied: every
 *  snap capped at 87 % of the half-frustum at its own depth (ADR-038 built
 *  this into the player as an opt-in runtime policy — `frustum-clamp`). */
export const CLIMB_FRUSTUM_CLAMP = 0.87

/** Model URLs — the same three GLBs the bespoke scene loads. */
const MODEL_URLS: Record<ClimbAircraft['id'], string> = {
  ulla: '/models/ulla.glb',
  z142: '/models/z142.glb',
  l39: '/models/l39.glb',
}

/** The generated image-based-lighting environment (see the generator): the
 *  site's three-light morning rig baked into one equirect, because the Vertie
 *  format expresses lighting ONLY as an environment map (spec §5). */
const ENV_URL = '/climb/morning.hdr'

/** Track id for an aircraft — events reference tracks, not aircraft. */
export const trackId = (id: ClimbAircraft['id']): string => `${id}-leg`

/** Window-t → scene-local time (the inverse of climbMath's snap timing). */
export function windowTToScene(windowT: number): number {
  return ((windowT - SEQ_START_T) / SCROLL_TO_T) * PCT_TO_SCENE
}

/** Window-t DURATION → scene-local duration (no origin shift, only the rate). */
export function windowSpanToScene(span: number): number {
  return (span / SCROLL_TO_T) * PCT_TO_SCENE
}

/** Scene-local length of the whole sequence (authored % ×100). */
export function climbSceneDuration(seq: ClimbSequence): number {
  let end = 0
  for (const a of seq.aircraft) {
    let span = 0
    for (let i = 0; i < a.snaps.length - 1; i++) span += a.snaps[i].step
    end = Math.max(end, a.start * PCT_TO_SCENE + span)
  }
  return end
}

/**
 * The host-side driver mapping: the climb run's own window-t → the player's
 * normalized `t ∈ [0..1]`. This is what `driver="external"` is fed every
 * frame (ADR-039: the host owns t, and the player clamps for us — before the
 * sequence starts Ulla parks on snap 0 because her track holds).
 */
export function climbSceneT(windowT: number, duration: number): number {
  return duration > 0 ? windowTToScene(windowT) / duration : 0
}

/** The inverse of `climbSceneT` — the player's t back to the window-t the
 *  bespoke engine poses by. Exists so a parity check can ask both engines
 *  about the same instant (`VertieClimb`'s dev probe). */
export function climbWindowT(t: number, duration: number): number {
  return SEQ_START_T + ((t * duration) / PCT_TO_SCENE) * SCROLL_TO_T
}

/**
 * Build the Vertie scene document for a climb sequence.
 *
 * Mapping, field by field:
 *  - `transform.scale` = `size / 10` — the lab's display scale of the
 *    10-normalized GLB, which the format makes explicit data (spec §7)
 *    instead of the bespoke engine's implicit `/10` contract.
 *  - `extrapolate.before: "hold"` ⟺ `holdBefore` (the parked Ulla).
 *    Everything else keeps the default `"hidden"`, which is exactly
 *    `lifeAlpha`'s instant on/off at the snap span.
 *  - `keys[i].duration` = `snaps[i].step`; the final key carries none (§6).
 *  - effects become `events` with the golden-ring parameters preserved under
 *    an `x-sphere` extension — the player never reads them; the site's 2D
 *    layer already draws that ring language itself.
 */
export function buildClimbScene(seq: ClimbSequence): Record<string, unknown> {
  const assets: Record<string, { src: string }> = {}
  for (const a of seq.aircraft) assets[a.id] = { src: MODEL_URLS[a.id] }
  assets.morning = { src: ENV_URL }

  const tracks = seq.aircraft.map((a) => {
    const keys = a.snaps.map((s, i) => {
      const key: Record<string, unknown> = { p: [...s.p], q: [...s.q] }
      if (i < a.snaps.length - 1) key.duration = s.step
      return key
    })
    const track: Record<string, unknown> = {
      id: trackId(a.id),
      asset: a.id,
      transform: { scale: a.size / 10 },
      start: a.start * PCT_TO_SCENE,
    }
    if (a.holdBefore) track.extrapolate = { before: 'hold' }
    track.keys = keys
    return track
  })

  const events = seq.effects.map((e) => ({
    name: 'unlock',
    at: round(windowTToScene(e.at)),
    span: round(windowSpanToScene(e.span)),
    follow: trackId(e.follow),
    'x-sphere': { r0: e.r0, r1: e.r1, peak: e.peak },
  }))

  return {
    vertie: '1.0',
    meta: {
      title: 'The Climb',
      description:
        'Ultralight → Z-142 → L-39: the graduation ladder of Martin Svoboda’s chapter 01, authored in the choreo-lab and played by the Vertie player.',
      author: 'Martin Svoboda',
      license: 'CC-BY-4.0',
    },
    assets,
    environment: {
      envMap: 'morning',
      exposure: 1.0,
      background: 'transparent',
    },
    stage: {
      plane: {
        width: LAB_BOX.X1 - LAB_BOX.X0,
        height: LAB_BOX.Y1 - LAB_BOX.Y0,
        z: LAB_BOX.PLANE_Z,
      },
      fov: STAGE_FOV,
      fit: 'contain',
    },
    duration: round(climbSceneDuration(seq)),
    tracks,
    events,
  }
}

/** Trim float noise the two unit conversions introduce (2.4299999999999997). */
function round(v: number): number {
  return Math.round(v * 1e6) / 1e6
}
