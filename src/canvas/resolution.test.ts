import { describe, expect, it } from 'vitest'
import {
  PACE_EXCUSE_BUDGET_MS,
  PACE_MAX_DT_MS,
  PACE_SLOW_MS,
  PACE_WARMUP,
  PACE_WINDOW,
  canStepDown,
  canvasDpr,
  createPace,
  getResStep,
  paceLimit,
  setResStep,
  shadowScale,
  subscribeResStep,
  tickPace,
} from './resolution'

const feed = (s: ReturnType<typeof createPace>, n: number, dt: number, excused = false) => {
  let fired = 0
  for (let i = 0; i < n; i++) if (tickPace(s, dt, excused)) fired++
  return fired
}

describe('canvasDpr', () => {
  it('caps the device ratio at 2 and scales it per step', () => {
    expect(canvasDpr(3, 0)).toBe(2)
    expect(canvasDpr(2, 1)).toBe(1.5)
    expect(canvasDpr(2, 2)).toBe(1.25)
  })

  it('never drops below 1 and tolerates a missing ratio', () => {
    expect(canvasDpr(1, 2)).toBe(1)
    expect(canvasDpr(0, 0)).toBe(1)
    expect(canvasDpr(2, 99)).toBe(1.25)
  })

  it('only allows a step that actually lowers the resolution', () => {
    expect(canStepDown(2, 0)).toBe(true)
    expect(canStepDown(2, 2)).toBe(false)
    expect(canStepDown(1, 0)).toBe(false)
  })
})

describe('tickPace', () => {
  it('fires when a window runs clearly slower than the device has shown it can', () => {
    const s = createPace()
    expect(feed(s, PACE_WARMUP, 40)).toBe(0)
    expect(feed(s, PACE_WINDOW, 16.7)).toBe(0)
    expect(feed(s, PACE_WINDOW, 40)).toBe(1)
  })

  it('never fires on a steadily capped frame rate (30 fps power saving)', () => {
    const s = createPace()
    expect(feed(s, PACE_WARMUP + PACE_WINDOW * 10, 33.3)).toBe(0)
  })

  it('stays quiet at a healthy frame rate', () => {
    const s = createPace()
    expect(feed(s, PACE_WARMUP + PACE_WINDOW * 10, 16.7)).toBe(0)
  })

  it('ignores pauses and excused build frames', () => {
    const s = createPace()
    feed(s, PACE_WARMUP, 16.7)
    expect(feed(s, PACE_WINDOW * 3, PACE_MAX_DT_MS + 1)).toBe(0)
    expect(feed(s, PACE_WINDOW * 3, 40, true)).toBe(0)
  })

  it('does not fire on a few isolated hitches', () => {
    const s = createPace()
    feed(s, PACE_WARMUP, 16.7)
    let fired = 0
    for (let i = 0; i < PACE_WINDOW * 4; i++) if (tickPace(s, i % 5 === 0 ? 60 : 16.7)) fired++
    expect(fired).toBe(0)
  })

  it('stops excusing build frames once the excuse budget is spent', () => {
    const s = createPace()
    feed(s, PACE_WARMUP, 16.7)
    feed(s, PACE_WINDOW, 16.7)
    // 40 ms build frames: excused until ~15 s of them, then judged.
    const excusedFrames = Math.ceil(PACE_EXCUSE_BUDGET_MS / 40)
    expect(feed(s, excusedFrames, 40, true)).toBe(0)
    expect(feed(s, PACE_WINDOW, 40, true)).toBe(1)
  })

  it('treats a 48 Hz panel as healthy and a 30 fps cap as a cap', () => {
    expect(paceLimit(1000 / 48)).toBe(PACE_SLOW_MS)
    expect(1000 / 48).toBeLessThan(PACE_SLOW_MS)
    expect(paceLimit(33.3)).toBeGreaterThan(40)
    const s = createPace()
    expect(feed(s, PACE_WARMUP + PACE_WINDOW * 6, 1000 / 48)).toBe(0)
  })

  it('still fires for a device that opens smoothly and then sinks', () => {
    const s = createPace()
    feed(s, PACE_WARMUP, 16.7)
    expect(feed(s, PACE_WINDOW, 16.7)).toBe(0)
    expect(feed(s, PACE_WINDOW, 28)).toBe(1)
  })
})

describe('shared resolution step', () => {
  it('notifies followers once per real change', () => {
    let calls = 0
    const off = subscribeResStep(() => calls++)
    setResStep(1)
    setResStep(1)
    expect(getResStep()).toBe(1)
    expect(shadowScale(getResStep())).toBe(0.5)
    setResStep(0)
    off()
    setResStep(2)
    expect(calls).toBe(2)
    setResStep(0)
    expect(shadowScale(0)).toBe(1)
  })
})
