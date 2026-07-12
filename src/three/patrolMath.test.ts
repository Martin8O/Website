import { describe, expect, it } from 'vitest'
import {
  BREAK,
  PASS,
  airshowPassPose,
  anchorPoint,
  createPatrolPose,
  landingBreakPose,
  passU,
  screenOf,
} from './patrolMath'

const ASPECT = 16 / 9
const pose = createPatrolPose()
const pt: [number, number, number] = [0, 0, 0]

const project = (p: { x: number; y: number; z: number }) => screenOf(p.x, p.y, p.z, ASPECT)

describe('screen anchoring', () => {
  it('screenOf inverts anchorPoint', () => {
    for (const [sx, sy, d] of [
      [0.5, 0.5, 10],
      [0.2, 0.7, 38],
      [0.9, 0.1, 72],
    ] as const) {
      anchorPoint(sx, sy, d, ASPECT, pt)
      const s = screenOf(pt[0], pt[1], pt[2], ASPECT)
      expect(s.sx).toBeCloseTo(sx, 6)
      expect(s.sy).toBeCloseTo(sy, 6)
      expect(pt[2]).toBeCloseTo(-d, 6)
    }
  })
})

describe('airshow head-on pass', () => {
  it('lives only inside its window', () => {
    expect(airshowPassPose(PASS.in - 0.01, ASPECT, 0, pose).alpha).toBe(0)
    expect(airshowPassPose(PASS.out + 0.03, ASPECT, 0, pose).alpha).toBe(0)
    expect(airshowPassPose(PASS.inFull + 0.01, ASPECT, 0, pose).alpha).toBeCloseTo(1, 5)
  })

  it('approaches the crowd head-on: closing monotonically, near the centre', () => {
    let last = -Infinity
    for (let t = PASS.in + 0.01; t < PASS.rollStart; t += 0.01) {
      airshowPassPose(t, ASPECT, 0, pose)
      expect(pose.z).toBeGreaterThan(last) // z rises toward the camera
      last = pose.z
      const s = project(pose)
      expect(Math.abs(s.sx - 0.5)).toBeLessThan(0.1) // converging from gapFar
      expect(s.sy).toBeGreaterThan(0.4)
      expect(s.sy).toBeLessThan(0.53)
      // Flying AT the viewer — a slight crab far out is the convergence onto
      // the display centreline (specks at that range), dead-on by the roll.
      expect(pose.fz).toBeGreaterThan(0.84)
    }
    airshowPassPose(PASS.rollStart - 0.01, ASPECT, 0, pose)
    expect(pose.fz).toBeGreaterThan(0.97)
  })

  it('holds the echelon: wingman deeper by the longitudinal split', () => {
    airshowPassPose(1.3, ASPECT, 0, pose)
    const zLead = pose.z
    airshowPassPose(1.3, ASPECT, 1, pose)
    expect(zLead - pose.z).toBeCloseTo(PASS.aft, 5)
  })

  it('flies the simultaneous mirrored 3/4 vykrut', () => {
    airshowPassPose(PASS.rollStart - 0.005, ASPECT, 0, pose)
    expect(pose.bank).toBeCloseTo(0, 5)
    airshowPassPose(PASS.rollEnd + 0.001, ASPECT, 0, pose)
    const lead = pose.bank
    airshowPassPose(PASS.rollEnd + 0.001, ASPECT, 1, pose)
    expect(lead).toBeCloseTo(0.75 * Math.PI * 2, 5) // pilot's right, 3/4 turn
    expect(pose.bank).toBeCloseTo(-lead, 5) // mirrored
  })

  it('crosses on screen at a safe depth split — the near-miss illusion', () => {
    let crossed = false
    let prev = 0
    for (let t = PASS.rollEnd; t <= PASS.out; t += 0.001) {
      airshowPassPose(t, ASPECT, 0, pose)
      const sL = project(pose)
      const zL = pose.z
      airshowPassPose(t, ASPECT, 1, pose)
      const sW = project(pose)
      const gap = sL.sx - sW.sx
      if (prev < 0 && gap >= 0) {
        crossed = true
        expect(Math.abs(zL - pose.z)).toBeGreaterThan(3) // they never meet in depth
      }
      prev = gap
    }
    expect(crossed).toBe(true)
  })

  it('streaks off through opposite screen edges', () => {
    const t = PASS.out - 0.002
    airshowPassPose(t, ASPECT, 0, pose)
    expect(project(pose).sx).toBeGreaterThan(1.05)
    airshowPassPose(t, ASPECT, 1, pose)
    expect(project(pose).sx).toBeLessThan(-0.05)
  })

  it('drives the smoke head along the rail', () => {
    expect(passU(PASS.in)).toBe(0)
    expect(passU(PASS.out)).toBe(1)
  })
})

describe('sunset landing break', () => {
  it('lives only inside its window (and dies before the hand-over veil)', () => {
    expect(landingBreakPose(BREAK.enter - 0.03, ASPECT, 0, pose).alpha).toBe(0)
    expect(landingBreakPose(BREAK.kill + 0.02, ASPECT, 1, pose).alpha).toBe(0)
  })

  it('punches in from BEHIND the observer and rushes out to the fix', () => {
    landingBreakPose(BREAK.enter + 0.006, ASPECT, 0, pose)
    expect(pose.z).toBeGreaterThan(-12) // first seen CLOSE — huge
    expect(pose.alpha).toBeGreaterThan(0)
    // …and the recede is monotonic: pure forward rush, no drift-in-place.
    let last = 0
    for (let t = BREAK.enter + 0.004; t < BREAK.breakAt; t += 0.005) {
      landingBreakPose(t, ASPECT, 0, pose)
      expect(pose.z).toBeLessThan(last)
      last = pose.z
    }
    // BOTH jets appear TOGETHER (Martin: the pair at once, close and big).
    landingBreakPose(BREAK.enter + 0.006, ASPECT, 1, pose)
    expect(pose.alpha).toBeGreaterThan(0)
    expect(pose.z).toBeGreaterThan(-12)
  })

  it('arrives over the field on the 40 %-height line at the break fix', () => {
    landingBreakPose(BREAK.breakAt, ASPECT, 0, pose)
    const s = project(pose)
    expect(s.sx).toBeCloseTo(BREAK.sxBreak, 2)
    expect(s.sy).toBeCloseTo(0.6, 2) // 40 % of screen height from the bottom
    expect(pose.fz).toBeLessThan(-0.9) // still on the landing heading (away)
  })

  it('leader breaks first; the wingman holds echelon one tick longer', () => {
    const mid = BREAK.breakAt + BREAK.arcLen / 2
    landingBreakPose(mid, ASPECT, 0, pose)
    expect(pose.bank).toBeCloseTo(BREAK.bank, 3) // leader mid-turn, banked right
    landingBreakPose(mid, ASPECT, 1, pose)
    expect(Math.abs(pose.bank)).toBeLessThan(0.05) // wingman still straight
    landingBreakPose(mid + BREAK.wingDelay, ASPECT, 1, pose)
    expect(pose.bank).toBeCloseTo(BREAK.bank, 3) // …and turning one tick later
  })

  it('the 180° comes out right of the tower, heading back at the camera', () => {
    const t = BREAK.breakAt + BREAK.arcLen + 0.004
    landingBreakPose(t, ASPECT, 0, pose)
    expect(pose.fz).toBeGreaterThan(0.9) // reciprocal heading
    expect(project(pose).sx).toBeGreaterThan(0.79) // the 2D tower sits ~0.78 w
    expect(Math.abs(pose.bank)).toBeLessThan(0.35) // rolling out level
  })

  it('flies the echelon offset before the break', () => {
    const t = BREAK.breakAt - 0.02 // both airborne (wingman entered +0.05)
    landingBreakPose(t, ASPECT, 0, pose)
    const lead = { x: pose.x, z: pose.z }
    landingBreakPose(t, ASPECT, 1, pose)
    expect(pose.x).toBeLessThan(lead.x) // left of the leader
    expect(pose.z).toBeGreaterThan(lead.z) // and aft (nearer the camera)
  })

  it('keeps every forward vector unit length', () => {
    for (let t = BREAK.enter; t < BREAK.exit; t += 0.017) {
      landingBreakPose(t, ASPECT, 0, pose)
      expect(Math.hypot(pose.fx, pose.fy, pose.fz)).toBeCloseTo(1, 5)
    }
  })
})
