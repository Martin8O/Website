import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetHeroLoadForTest,
  beginHeroLoad,
  buildCalm,
  buildUrgent,
  bumpBuildUrgency,
  failHeroLoad,
  finishHeroLoad,
  getHeroLoadSnapshot,
  LOAD_GRACE_MS,
  nextQueuedHero,
  registerHeroKick,
  reportHeroProgress,
  resetHeroLoad,
  startHeroQueue,
  subscribeHeroLoad,
} from './heroLoad'

beforeEach(() => {
  __resetHeroLoadForTest()
})

describe('hero load state', () => {
  it('walks idle → loading → ready with monotonic progress', () => {
    expect(getHeroLoadSnapshot().climb).toEqual({ phase: 'idle', progress: 0 })
    beginHeroLoad('climb')
    expect(getHeroLoadSnapshot().climb.phase).toBe('loading')
    reportHeroProgress('climb', 0.4)
    expect(getHeroLoadSnapshot().climb.progress).toBeCloseTo(0.4)
    // Progress never walks backwards, never reads 1 while loading.
    reportHeroProgress('climb', 0.1)
    expect(getHeroLoadSnapshot().climb.progress).toBeCloseTo(0.4)
    reportHeroProgress('climb', 1)
    expect(getHeroLoadSnapshot().climb.progress).toBeCloseTo(0.99)
    finishHeroLoad('climb')
    expect(getHeroLoadSnapshot().climb).toEqual({ phase: 'ready', progress: 1 })
  })

  it('ignores progress reports outside a load and repeated begins', () => {
    reportHeroProgress('climb', 0.5)
    expect(getHeroLoadSnapshot().climb.progress).toBe(0)
    beginHeroLoad('climb')
    reportHeroProgress('climb', 0.5)
    beginHeroLoad('climb') // idempotent — must not reset progress
    expect(getHeroLoadSnapshot().climb.progress).toBeCloseTo(0.5)
  })

  it('reset returns a hero to idle (world-toggle remount)', () => {
    beginHeroLoad('desert')
    finishHeroLoad('desert')
    resetHeroLoad('desert')
    expect(getHeroLoadSnapshot().desert).toEqual({ phase: 'idle', progress: 0 })
  })

  it('notifies subscribers on phase changes', () => {
    let calls = 0
    const off = subscribeHeroLoad(() => calls++)
    beginHeroLoad('cruise')
    finishHeroLoad('cruise')
    off()
    failHeroLoad('patrol')
    expect(calls).toBe(2)
  })
})

describe('buildCalm (the watchdog gate)', () => {
  it('is calm with nothing in flight and no recent load end', () => {
    expect(buildCalm(1e6)).toBe(true)
  })

  it('is NOT calm while any hero build is in flight', () => {
    beginHeroLoad('climb')
    expect(buildCalm(1e6)).toBe(false)
    beginHeroLoad('desert')
    finishHeroLoad('climb')
    expect(buildCalm(1e6)).toBe(false) // desert still in flight
  })

  it('stays excused for the grace window after the last load settles', () => {
    beginHeroLoad('climb')
    finishHeroLoad('climb') // lastLoadEnd = real now()
    const end = performance.now()
    expect(buildCalm(end + LOAD_GRACE_MS - 50)).toBe(false)
    expect(buildCalm(end + LOAD_GRACE_MS + 50)).toBe(true)
  })

  it('a failed load also settles the gate (after grace)', () => {
    beginHeroLoad('patrol')
    failHeroLoad('patrol')
    const end = performance.now()
    expect(buildCalm(end + LOAD_GRACE_MS + 50)).toBe(true)
  })
})

describe('build urgency', () => {
  it('holds for a short window after a bump', () => {
    expect(buildUrgent(1000)).toBe(false)
    bumpBuildUrgency(1000)
    expect(buildUrgent(1500)).toBe(true)
    expect(buildUrgent(1700)).toBe(false)
  })
})

describe('background build queue', () => {
  it('kicks heroes one at a time in story order', () => {
    const kicked: string[] = []
    const arm = (key: 'climb' | 'cruise' | 'desert' | 'patrol') =>
      registerHeroKick(key, () => {
        kicked.push(key)
        beginHeroLoad(key) // scenes begin synchronously inside the kick
      })
    arm('patrol')
    arm('climb')
    arm('cruise')
    arm('desert')
    expect(kicked).toEqual([]) // nothing before the queue starts
    startHeroQueue()
    expect(kicked).toEqual(['climb']) // one in flight — queue waits
    finishHeroLoad('climb')
    expect(kicked).toEqual(['climb', 'cruise'])
    failHeroLoad('cruise') // a failure must not stall the queue
    expect(kicked).toEqual(['climb', 'cruise', 'desert'])
    finishHeroLoad('desert')
    expect(kicked).toEqual(['climb', 'cruise', 'desert', 'patrol'])
  })

  it('skips a hero the scroll threshold already kicked', () => {
    const kicked: string[] = []
    registerHeroKick('climb', () => {
      kicked.push('climb')
      beginHeroLoad('climb')
    })
    registerHeroKick('cruise', () => {
      kicked.push('cruise')
      beginHeroLoad('cruise')
    })
    // The visitor outran the queue: cruise kicked itself via its threshold.
    beginHeroLoad('cruise')
    finishHeroLoad('cruise')
    startHeroQueue()
    expect(kicked).toEqual(['climb'])
    finishHeroLoad('climb')
    expect(kicked).toEqual(['climb']) // cruise never re-kicked
  })

  it('a scene registering AFTER the queue started still gets kicked', () => {
    startHeroQueue()
    const kicked: string[] = []
    registerHeroKick('climb', () => {
      kicked.push('climb')
      beginHeroLoad('climb')
    })
    expect(kicked).toEqual(['climb'])
  })

  it('nextQueuedHero honours in-flight and unregistered scenes', () => {
    expect(nextQueuedHero()).toBe(null) // nothing registered
    const off = registerHeroKick('desert', () => {})
    expect(nextQueuedHero()).toBe('desert')
    beginHeroLoad('climb')
    expect(nextQueuedHero()).toBe(null) // climb in flight
    finishHeroLoad('climb')
    expect(nextQueuedHero()).toBe('desert')
    off()
    expect(nextQueuedHero()).toBe(null)
  })
})
