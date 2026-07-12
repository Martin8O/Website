import { describe, expect, it } from 'vitest'
import { CHAPTER_WEIGHTS } from '../../data/chapters'
import { progressFromPos } from '../../timeline'
import { FOV_TAN } from '../patrolMath'
import {
  BALLET,
  CFG,
  COMAO,
  balletCam,
  balletFlow,
  balletPose,
  balletPresence,
  balletTurns,
  cloudSink,
  createBalletCam,
  createBalletPose,
  helixPos,
} from './balletMath'

type V3 = [number, number, number]

const CRUISE_WIN0 = 2.5

/** cruise-run localT → HUD % — the round trip the windows were authored in. */
const hudOf = (t: number) => progressFromPos(CRUISE_WIN0 + t, CHAPTER_WEIGHTS) * 100

describe('the beat windows (Martin directs in HUD %)', () => {
  it('sit exactly on the directed HUD percents through the live weight map', () => {
    // The L-159 appears ~19 % (still hazed), the white-out clears by ~20.3,
    // the fade-in starts three of Martin's scroll stops later at 21, the
    // ballet flies six percent, and the COMAO rides the 28→29 fade-out.
    expect(hudOf(BALLET.in0)).toBeCloseTo(21, 6)
    expect(hudOf(BALLET.in1)).toBeCloseTo(22, 6)
    expect(hudOf(BALLET.out0)).toBeCloseTo(28, 6)
    expect(hudOf(BALLET.out1)).toBeCloseTo(29, 6)
    expect(hudOf(COMAO.in0)).toBeCloseTo(27.7, 6)
    expect(hudOf(COMAO.in1)).toBeCloseTo(29.7, 6)
  })

  it('live inside the cruise run window, ordered, with COMAO riding the fade-out', () => {
    expect(BALLET.in0).toBeGreaterThan(0.02) // clear of the white-out (done at t = 0)
    expect(BALLET.in0).toBeLessThan(BALLET.in1)
    expect(BALLET.in1).toBeLessThan(BALLET.out0)
    expect(BALLET.out0).toBeLessThan(BALLET.out1)
    expect(BALLET.out1).toBeLessThan(1) // the COMAO still owns real frame time
    // The COMAO run starts OFF-SCREEN just before the pop-out (the lead
    // noses into frame right at out0) and stands on its marks well before
    // the run window ends — the constant-speed fly-in needs the room.
    expect(COMAO.in0).toBeLessThan(BALLET.out0)
    expect(COMAO.in0).toBeGreaterThan(BALLET.out0 - 0.05)
    expect(COMAO.in1).toBeLessThanOrEqual(1)
  })

  it('presence is BINARY: pops in at 21, holds the fight, pops out mid-29', () => {
    expect(balletPresence(BALLET.in0 - 0.001)).toBe(0)
    expect(balletPresence(BALLET.in0)).toBe(1) // the instant swap with the solo
    expect(balletPresence(BALLET.in1)).toBe(1)
    expect(balletPresence((BALLET.in1 + BALLET.out0) / 2)).toBe(1)
    expect(balletPresence(BALLET.out0)).toBe(1) // frozen final pose still standing
    expect(balletPresence(BALLET.out1)).toBe(0) // gone before the COMAO settles
    expect(balletPresence(1.2)).toBe(0)
  })

  it('the maneuver clock is monotonic and flies the authored revolutions', () => {
    let prev = -1
    for (let t = 0; t <= 1.2; t += 0.01) {
      const f = balletFlow(t)
      expect(f).toBeGreaterThanOrEqual(prev)
      prev = f
    }
    expect(balletTurns(BALLET.in0)).toBe(0)
    expect(balletTurns(BALLET.out1)).toBeCloseTo(CFG.revs, 9)
  })

  it('clouds sink across the fight and hold — never fully off frame', () => {
    expect(cloudSink(BALLET.in0)).toBe(0)
    expect(cloudSink(BALLET.out0)).toBe(1)
    expect(cloudSink(1)).toBe(1)
  })
})

describe('the helix', () => {
  it('flies the pair π apart — never colliding, breathing apart and back', () => {
    const a: V3 = [0, 0, 0]
    const b: V3 = [0, 0, 0]
    let min = Infinity
    let max = 0
    for (let tt = 0; tt <= CFG.revs * CFG.orbitPeriod; tt += 0.05) {
      helixPos(tt, 0, a)
      helixPos(tt, 1, b)
      const d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
      min = Math.min(min, d)
      max = Math.max(max, d)
    }
    expect(min).toBeGreaterThan(6) // real air between them at the closest
    expect(max).toBeGreaterThan(min * 1.5) // the radius genuinely breathes
  })

  it('climbs — the centroid gains height monotonically', () => {
    const a: V3 = [0, 0, 0]
    const b: V3 = [0, 0, 0]
    let prev = -Infinity
    for (let tt = 0; tt <= 12; tt += 0.25) {
      helixPos(tt, 0, a)
      helixPos(tt, 1, b)
      const cy = (a[1] + b[1]) / 2
      expect(cy).toBeGreaterThan(prev)
      prev = cy
    }
  })
})

describe('the coordinated-turn pose (the physics — do not regress)', () => {
  it('banks INTO the turn at every phase of a full revolution', () => {
    const pose = createBalletPose()
    for (let i = 0; i < 24; i++) {
      const tt = 2 + (i / 24) * CFG.orbitPeriod
      for (const k of [0, 1] as const) {
        balletPose(k, tt, pose)
        // Horizontal direction from the jet toward the helix axis…
        const toAxis: V3 = [-pose.p[0], 0, -pose.p[2]]
        const l = Math.hypot(toAxis[0], toAxis[2])
        toAxis[0] /= l
        toAxis[2] /= l
        // …the lift must lean toward it: the jet banks into its own turn.
        const lean = pose.lift[0] * toAxis[0] + pose.lift[2] * toAxis[2]
        expect(lean).toBeGreaterThan(0)
        // …while staying flying (lift keeps a real upward component).
        expect(pose.lift[1]).toBeGreaterThan(0.2)
      }
    }
  })

  it('keeps the bank graceful — peaks ~60–65°, never knife-edge', () => {
    const pose = createBalletPose()
    let peak = 0
    for (let tt = 0; tt <= CFG.revs * CFG.orbitPeriod; tt += 0.05) {
      balletPose(0, tt, pose)
      peak = Math.max(peak, Math.abs(pose.bank))
    }
    const deg = (peak * 180) / Math.PI
    expect(deg).toBeGreaterThan(45)
    expect(deg).toBeLessThan(75)
  })

  it('flies the path — unit forward, continuous over small steps', () => {
    const p1 = createBalletPose()
    const p2 = createBalletPose()
    for (let tt = 1; tt < 10; tt += 0.5) {
      balletPose(0, tt, p1)
      expect(Math.hypot(p1.f[0], p1.f[1], p1.f[2])).toBeCloseTo(1, 6)
      balletPose(0, tt + 0.01, p2)
      const dp = Math.hypot(p2.p[0] - p1.p[0], p2.p[1] - p1.p[1], p2.p[2] - p1.p[2])
      const df = Math.hypot(p2.f[0] - p1.f[0], p2.f[1] - p1.f[1], p2.f[2] - p1.f[2])
      expect(dp).toBeLessThan(0.5)
      expect(df).toBeLessThan(0.1)
    }
  })
})

describe('the orbit camera (Martin: the pair must NEVER leave the frame)', () => {
  const REACH = CFG.R0 * (1 + CFG.breatheAmp) + 2.6

  it('fits the widest pass inside the horizontal frustum at any aspect', () => {
    const cam = createBalletCam()
    for (const aspect of [0.46, 0.75, 1, 4 / 3, 16 / 9, 21 / 9]) {
      for (let flow = 0; flow <= CFG.revs * CFG.orbitPeriod; flow += 1.3) {
        balletCam(flow, aspect, cam)
        // Angular reach of the widest lateral excursion vs the half-frustum.
        expect(REACH / cam.r).toBeLessThanOrEqual(FOV_TAN * aspect + 1e-9)
        // The world-scale keeps every depth inside the stage frustum.
        expect(cam.r * cam.scale).toBeLessThanOrEqual(40 + 1e-9)
        expect(cam.scale).toBeLessThanOrEqual(1)
        expect(cam.scale).toBeGreaterThan(0)
      }
    }
  })

  it('tracks the climbing centroid (the clouds must sink for a reason)', () => {
    const cam = createBalletCam()
    balletCam(0, 16 / 9, cam)
    const y0 = cam.cy
    balletCam(10, 16 / 9, cam)
    expect(cam.cy).toBeGreaterThan(y0)
    expect(cam.cy).toBeCloseTo(CFG.climbRate * 10, 9)
  })

  it('is a pure function of scroll — scrubbing back replays it exactly', () => {
    const a = createBalletCam()
    const b = createBalletCam()
    balletCam(7.3, 16 / 9, a)
    balletCam(11, 16 / 9, b)
    balletCam(7.3, 16 / 9, b)
    expect(b.az).toBe(a.az)
    expect(b.el).toBe(a.el)
    expect(b.cy).toBe(a.cy)
    expect(b.r).toBe(a.r)
  })
})
