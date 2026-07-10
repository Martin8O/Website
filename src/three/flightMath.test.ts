import { describe, expect, it } from 'vitest'
import { buildRuns, runWindow } from '../canvas/sceneTimeline'
import { CHAPTERS } from '../data/chapters'
import {
  CRUISE,
  TRAVEL,
  buildFlightPath,
  createPose,
  flightAnchorAt,
  flightPoseAt,
  paceAt,
} from './flightMath'

const RUNS = buildRuns(CHAPTERS)
const COUNT = CHAPTERS.length
const PATH = buildFlightPath(RUNS, COUNT)
const LAST = COUNT - 1

const poseAt = (pos: number) => flightPoseAt(PATH, pos, createPose())

const originRun = RUNS.find((r) => r.theme === 'origin')!
const contactRun = RUNS.find((r) => r.theme === 'contact')!

describe('buildFlightPath', () => {
  it('is deterministic — same story, same flight', () => {
    const again = buildFlightPath(RUNS, COUNT)
    expect(again.stops).toEqual(PATH.stops)
    expect(again.step).toBe(PATH.step)
  })

  it('covers the whole story on the stop grid', () => {
    expect((PATH.stops.length / 3 - 1) * PATH.step).toBeCloseTo(LAST, 10)
  })

  it('travels each registered window by exactly its TRAVEL distance', () => {
    for (const [run, theme] of [
      [originRun, 'origin'],
      [contactRun, 'contact'],
    ] as const) {
      const [winStart, winEnd] = runWindow(run, COUNT)
      // Window edges land on stops, so the curve passes through them exactly.
      const dz = poseAt(winStart).z - poseAt(winEnd).z
      expect(dz).toBeCloseTo(TRAVEL[theme]!, 5)
    }
  })

  it('cruises between scenes', () => {
    // Chapter 5 is deep inside the sky family — no registered 3D window.
    expect(paceAt(5.25, RUNS, COUNT)).toBe(CRUISE)
    expect(poseAt(5).z - poseAt(6).z).toBeCloseTo(CRUISE, 5)
  })
})

describe('flightPoseAt', () => {
  it('always flies forward — z strictly decreases with scroll', () => {
    let prev = poseAt(0).z
    for (let pos = 0.02; pos <= LAST + 1e-9; pos += 0.02) {
      const z = poseAt(pos).z
      expect(z).toBeLessThan(prev)
      prev = z
    }
  })

  it('keeps the heading close to straight ahead (unit forward, fz ≤ −0.98)', () => {
    for (let pos = 0; pos <= LAST + 1e-9; pos += 0.05) {
      const p = poseAt(pos)
      expect(Math.hypot(p.fx, p.fy, p.fz)).toBeCloseTo(1, 6)
      expect(p.fz).toBeLessThanOrEqual(-0.98)
    }
  })

  it('keeps the weave and bank gentle', () => {
    for (let pos = 0; pos <= LAST + 1e-9; pos += 0.05) {
      const p = poseAt(pos)
      expect(Math.abs(p.x)).toBeLessThanOrEqual(0.75)
      expect(Math.abs(p.y)).toBeLessThanOrEqual(0.35)
      expect(Math.abs(p.roll)).toBeLessThanOrEqual(0.12)
    }
  })

  it('clamps outside the story', () => {
    expect(poseAt(-3)).toEqual(poseAt(0))
    expect(poseAt(99)).toEqual(poseAt(LAST))
  })

  it('is continuous — no jumps across stop boundaries', () => {
    let prev = poseAt(0)
    for (let pos = 0.01; pos <= LAST + 1e-9; pos += 0.01) {
      const p = poseAt(pos)
      const step = Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z)
      // Fastest pace is contact's 16/chapter → 0.16/sample, with CR headroom.
      expect(step).toBeLessThan(0.25)
      prev = p
    }
  })
})

describe('flightAnchorAt', () => {
  it('anchors at the window start, aimed down the window chord', () => {
    const [winStart, winEnd] = runWindow(contactRun, COUNT)
    const anchor = flightAnchorAt(PATH, winStart, winEnd, createPose())
    const start = poseAt(winStart)
    const end = poseAt(winEnd)
    expect(anchor.x).toBeCloseTo(start.x, 10)
    expect(anchor.y).toBeCloseTo(start.y, 10)
    expect(anchor.z).toBeCloseTo(start.z, 10)
    expect(Math.hypot(anchor.fx, anchor.fy, anchor.fz)).toBeCloseTo(1, 6)
    // Chord direction: anchor forward × chord length = end − start.
    const len = Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z)
    expect(anchor.fx * len).toBeCloseTo(end.x - start.x, 6)
    expect(anchor.fz * len).toBeCloseTo(end.z - start.z, 6)
    expect(anchor.roll).toBe(0)
  })
})
