/**
 * E1c — the climb → Vertie document transform. These tests are the contract
 * between the bespoke engine's data (`CLIMB_SEQ`) and the scene the published
 * player loads: if the two ever disagree about WHEN a snap happens, the hero
 * beat silently re-times, and nothing else in the suite would notice.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CLIMB_SEQ, SCROLL_TO_T, SEQ_START_T, snapTimes } from '../three/climbMath'
import {
  CLIMB_FRUSTUM_CLAMP,
  buildClimbScene,
  climbSceneDuration,
  climbSceneT,
  climbWindowT,
  trackId,
  windowSpanToScene,
  windowTToScene,
} from './climbScene'

type Key = { p: number[]; q: number[]; duration?: number }
type Track = {
  id: string
  asset: string
  start: number
  transform: { scale: number }
  extrapolate?: { before?: string }
  keys: Key[]
}
type Scene = {
  vertie: string
  assets: Record<string, { src: string }>
  environment: { envMap: string; exposure: number; background: string }
  stage: { plane: { width: number; height: number; z: number }; fov: number; fit: string }
  duration: number
  tracks: Track[]
  events: { name: string; at: number; span: number; follow: string }[]
}

const scene = buildClimbScene(CLIMB_SEQ) as unknown as Scene

describe('buildClimbScene — structure', () => {
  it('declares the format version and one asset per aircraft plus the environment', () => {
    expect(scene.vertie).toBe('1.0')
    for (const a of CLIMB_SEQ.aircraft) expect(scene.assets[a.id].src).toMatch(/\.glb$/)
    expect(scene.assets[scene.environment.envMap].src).toMatch(/\.hdr$/)
  })

  it('reproduces the lab display plane and the stage FOV', () => {
    // LAB_BOX x ±6 / y ±4 at z −3, contain-framed — the same numbers
    // ClimbHeroes feeds its room, and what climbMath projects the 2D rings by.
    expect(scene.stage).toEqual({ plane: { width: 12, height: 8, z: -3 }, fov: 55, fit: 'contain' })
  })

  it('gives every track its aircraft, its explicit scale and its own keys', () => {
    expect(scene.tracks).toHaveLength(CLIMB_SEQ.aircraft.length)
    scene.tracks.forEach((track, i) => {
      const a = CLIMB_SEQ.aircraft[i]
      expect(track.id).toBe(trackId(a.id))
      expect(track.asset).toBe(a.id)
      // the bespoke engine's implicit "/10 normalized GLB" contract, made data
      expect(track.transform.scale).toBeCloseTo(a.size / 10, 12)
      expect(track.keys).toHaveLength(a.snaps.length)
    })
  })

  it('carries the full L-39 leg, not just its first snap', () => {
    // The Vertie repo's own fixture is truncated to one key here; a truncated
    // single-key track is a PERSISTENT pose in the format (spec §7), so this
    // is the difference between the jet flying and the jet standing still for
    // the whole scene.
    const l39 = scene.tracks.find((t) => t.id === trackId('l39'))!
    expect(l39.keys).toHaveLength(12)
  })
})

describe('buildClimbScene — timing', () => {
  it('turns each snap step into the duration of the leg after it, last key bare', () => {
    scene.tracks.forEach((track, i) => {
      const snaps = CLIMB_SEQ.aircraft[i].snaps
      track.keys.forEach((key, k) => {
        if (k < snaps.length - 1) expect(key.duration).toBe(snaps[k].step)
        else expect(key.duration).toBeUndefined()
      })
    })
  })

  it('starts each track where the aircraft starts, so the relay hands over exactly', () => {
    scene.tracks.forEach((track, i) => {
      expect(track.start).toBeCloseTo(CLIMB_SEQ.aircraft[i].start * 100, 9)
    })
    // the handoff pattern: track N+1 opens where track N's last key sits
    for (let i = 1; i < scene.tracks.length; i++) {
      const prev = scene.tracks[i - 1]
      const end = prev.start + prev.keys.reduce((s, k) => s + (k.duration ?? 0), 0)
      expect(scene.tracks[i].start).toBeCloseTo(end, 9)
    }
  })

  it('ends the scene at the last key of the last track', () => {
    const last = scene.tracks[scene.tracks.length - 1]
    const end = last.start + last.keys.reduce((s, k) => s + (k.duration ?? 0), 0)
    expect(scene.duration).toBeCloseTo(end, 6)
    expect(scene.duration).toBeCloseTo(climbSceneDuration(CLIMB_SEQ), 9)
  })

  it('parks only the first aircraft before its span (holdBefore)', () => {
    scene.tracks.forEach((track, i) => {
      if (CLIMB_SEQ.aircraft[i].holdBefore) expect(track.extrapolate?.before).toBe('hold')
      else expect(track.extrapolate).toBeUndefined()
    })
  })

  it('converts the unlock effects out of window-t and back onto real tracks', () => {
    expect(scene.events).toHaveLength(CLIMB_SEQ.effects.length)
    scene.events.forEach((event, i) => {
      const e = CLIMB_SEQ.effects[i]
      expect(event.at).toBeCloseTo(windowTToScene(e.at), 5)
      expect(event.span).toBeCloseTo(windowSpanToScene(e.span), 5)
      expect(scene.tracks.some((t) => t.id === event.follow)).toBe(true)
    })
  })
})

describe('climbSceneT — the external driver mapping', () => {
  it('is the exact inverse of the snap timing the bespoke engine uses', () => {
    // Every authored snap must land on the same scene time from both sides.
    CLIMB_SEQ.aircraft.forEach((a, i) => {
      const track = scene.tracks[i]
      const times = snapTimes(a)
      let cum = track.start
      track.keys.forEach((key, k) => {
        expect(climbSceneT(times[k], scene.duration) * scene.duration).toBeCloseTo(cum, 6)
        cum += key.duration ?? 0
      })
    })
  })

  it('opens at 0 where the authored motion begins and reaches 1 at the last snap', () => {
    expect(climbSceneT(SEQ_START_T, scene.duration)).toBeCloseTo(0, 12)
    const end = SEQ_START_T + (scene.duration / 100) * SCROLL_TO_T
    expect(climbSceneT(end, scene.duration)).toBeCloseTo(1, 9)
  })

  it('round-trips through climbWindowT, so a parity check can ask both engines about one instant', () => {
    for (const windowT of [0, 0.0965, 0.2, 0.4, 0.5, 0.704975, 0.9]) {
      const t = climbSceneT(windowT, scene.duration)
      expect(climbWindowT(t, scene.duration)).toBeCloseTo(windowT, 12)
    }
  })

  it('runs negative before the sequence starts — the player clamps, we do not', () => {
    // ADR-039: the external driver clamps to [0..1]; Ulla then holds on snap 0
    // through the scene fade-in, which is exactly `holdBefore`.
    expect(climbSceneT(0, scene.duration)).toBeLessThan(0)
  })
})

describe('the committed document', () => {
  it('is byte-identical to what the generator writes today', () => {
    // `node scripts/gen-vertie-climb.mjs` regenerates it. If this fails, the
    // sequence data moved and public/climb/climb.json is stale.
    const onDisk = readFileSync(resolve(__dirname, '../../public/climb/climb.json'), 'utf8')
    expect(onDisk).toBe(JSON.stringify(buildClimbScene(CLIMB_SEQ), null, 2) + '\n')
  })

  it('pins the frustum-clamp margin the site has always applied', () => {
    expect(CLIMB_FRUSTUM_CLAMP).toBe(0.87)
  })
})
