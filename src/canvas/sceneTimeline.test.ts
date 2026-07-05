import { describe, expect, it } from 'vitest'
import { CHAPTERS } from '../data/chapters'
import {
  FADE_END,
  FADE_START,
  buildRuns,
  resolveSceneFrame,
  runLocalT,
  runLocalTRaw,
  type SceneRun,
} from './sceneTimeline'

/** theme-only fixture helper */
const ch = (theme: string, sky?: string) =>
  ({ theme, sky }) as Parameters<typeof buildRuns>[0][number]

describe('buildRuns', () => {
  it('groups contiguous chapters of the same theme into one run', () => {
    const runs = buildRuns([ch('origin'), ch('origin'), ch('calm')])
    expect(runs).toEqual<SceneRun[]>([
      { theme: 'origin', sky: undefined, start: 0, end: 1 },
      { theme: 'calm', sky: undefined, start: 2, end: 2 },
    ])
  })

  it('splits sky chapters per sub-mood (each mood = its own scene)', () => {
    const runs = buildRuns([ch('sky', 'climb'), ch('sky', 'climb'), ch('sky', 'cruise')])
    expect(runs).toHaveLength(2)
    expect(runs[0]).toMatchObject({ sky: 'climb', start: 0, end: 1 })
    expect(runs[1]).toMatchObject({ sky: 'cruise', start: 2, end: 2 })
  })

  it('covers every chapter exactly once (real data)', () => {
    const runs = buildRuns(CHAPTERS)
    expect(runs[0]).toMatchObject({ theme: 'origin', start: 0, end: 1 })
    let next = 0
    for (const run of runs) {
      expect(run.start).toBe(next)
      expect(run.end).toBeGreaterThanOrEqual(run.start)
      next = run.end + 1
    }
    expect(next).toBe(CHAPTERS.length)
  })
})

describe('runLocalT', () => {
  const count = 10
  const first: SceneRun = { theme: 'origin', start: 0, end: 1 }
  const middle: SceneRun = { theme: 'calm', start: 5, end: 5 }
  const last: SceneRun = { theme: 'dev', start: 9, end: 9 }

  it('first run: window starts at pos 0 and ends half a chapter past the run', () => {
    expect(runLocalT(0, first, count)).toBe(0)
    expect(runLocalT(1.5, first, count)).toBe(1)
    expect(runLocalT(0.75, first, count)).toBeCloseTo(0.5)
  })

  it('tRaw keeps flowing past the window edges (ambient motion never freezes)', () => {
    // Beyond the window the clamped t saturates but the raw one continues…
    expect(runLocalT(6, middle, count)).toBe(1)
    expect(runLocalTRaw(6, middle, count)).toBeCloseTo(1.5)
    expect(runLocalTRaw(4, middle, count)).toBeCloseTo(-0.5)
    // …and two ADJACENT windows advance at the same rate: a shared world
    // (the cloud sea) can stay phase-continuous across the hand-over.
    const a: SceneRun = { theme: 'sky', start: 2, end: 2 }
    const b: SceneRun = { theme: 'sky', start: 3, end: 3 }
    for (const pos of [2.3, 2.5, 2.7]) {
      expect(runLocalTRaw(pos, a, count) - runLocalTRaw(pos, b, count)).toBeCloseTo(1)
    }
  })

  it('middle run: window spans ±0.5 chapters around the run', () => {
    expect(runLocalT(4.5, middle, count)).toBe(0)
    expect(runLocalT(5, middle, count)).toBeCloseTo(0.5)
    expect(runLocalT(5.5, middle, count)).toBe(1)
  })

  it('last run: window ends exactly at the story end', () => {
    expect(runLocalT(8.5, last, count)).toBe(0)
    expect(runLocalT(9, last, count)).toBe(1)
  })

  it('clamps outside the window', () => {
    expect(runLocalT(-2, first, count)).toBe(0)
    expect(runLocalT(99, first, count)).toBe(1)
  })
})

describe('resolveSceneFrame', () => {
  const runs = buildRuns(CHAPTERS)
  const count = CHAPTERS.length

  it('mid-chapter: one base scene at full alpha, no incoming', () => {
    const frame = resolveSceneFrame(0.2, runs, count)
    expect(frame?.base.run.theme).toBe('origin')
    expect(frame?.base.alpha).toBe(1)
    expect(frame?.incoming).toBeUndefined()
  })

  it('no transition inside a run (origin chapter 0 → 1 shares the scene)', () => {
    const frame = resolveSceneFrame(0.6, runs, count)
    expect(frame?.base.run.theme).toBe('origin')
    expect(frame?.incoming).toBeUndefined()
  })

  it('cross-fade opens after FADE_START of a run-boundary chapter', () => {
    const before = resolveSceneFrame(1 + FADE_START - 0.01, runs, count)
    expect(before?.incoming).toBeUndefined()
    const during = resolveSceneFrame(1.5, runs, count)
    expect(during?.base.run.theme).toBe('origin')
    expect(during?.incoming?.run.theme).toBe('sky')
    expect(during?.incoming?.alpha).toBeGreaterThan(0)
    expect(during?.incoming?.alpha).toBeLessThan(1)
  })

  it('blend grows monotonically through the zone and reaches 1', () => {
    let prev = 0
    for (let f = FADE_START; f < FADE_END; f += 0.05) {
      const frame = resolveSceneFrame(1 + f, runs, count)
      const a = frame?.incoming?.alpha ?? (frame?.base.run.theme === 'sky' ? 1 : 0)
      expect(a).toBeGreaterThanOrEqual(prev)
      prev = a
    }
    const done = resolveSceneFrame(1 + FADE_END + 0.001, runs, count)
    expect(done?.base.run.theme).toBe('sky')
    expect(done?.incoming).toBeUndefined()
  })

  it('after FADE_END the next scene becomes the base (no dead layer below)', () => {
    const frame = resolveSceneFrame(1 + FADE_END + 0.05, runs, count)
    expect(frame?.base.run.theme).toBe('sky')
    expect(frame?.base.alpha).toBe(1)
    expect(frame?.incoming).toBeUndefined()
  })

  it('story ends: last scene stays, clamped', () => {
    const frame = resolveSceneFrame(count - 1, runs, count)
    expect(frame?.base.run.start).toBe(runs[runs.length - 1].start)
    expect(frame?.incoming).toBeUndefined()
  })

  it('empty story yields null', () => {
    expect(resolveSceneFrame(0, [], 0)).toBeNull()
  })
})
