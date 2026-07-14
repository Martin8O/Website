import { describe, expect, it } from 'vitest'
import { FOV_TAN, screenOf } from './patrolMath'
import {
  APACHE,
  C17,
  CAM_H,
  F16,
  GROUND_SLOPE,
  MARK_HALF_R,
  MI17,
  PAD_APACHE,
  PAD_MI17,
  SIZE,
  apachePoseAt,
  c17PoseAt,
  createBagramPose,
  desertPresence,
  f16Lap,
  f16PoseAt,
  groundSy,
  groundY,
  headingOf,
  mi17PoseAt,
  padMarkSx,
  padScreen,
  padSx,
  padSy,
  type BagramPose,
} from './bagramMath'

const DESKTOP = 16 / 9
const MOBILE = 375 / 812
const ASPECTS = [DESKTOP, MOBILE] as const

const pose = createBagramPose()
const pose2 = createBagramPose()

const project = (p: BagramPose, aspect: number) => screenOf(p.x, p.y, p.z, aspect)

/** Nose direction of a pose in the horizontal plane. */
const nose = (p: BagramPose) => ({ dx: -Math.sin(p.heading), dz: -Math.cos(p.heading) })

describe('ground model', () => {
  it('projects the ground plane onto the 2D bands: horizon at 0.6, stands ~0.68, apron ~0.76', () => {
    expect(groundSy(1e9)).toBeCloseTo(0.6, 3)
    // The helo stands sit on the open apron between the tent city and the
    // taxiway that runs under the tower (Martin R6: lifted off that runway) —
    // clear of both, sy ≈ 0.68.
    expect(groundSy(PAD_MI17.d)).toBeGreaterThan(0.672)
    expect(groundSy(PAD_MI17.d)).toBeLessThan(0.70)
    // …and the model still lands the 2D apron rows where they are drawn.
    expect(groundSy(41)).toBeGreaterThan(0.74)
    expect(groundSy(41)).toBeLessThan(0.772)
  })

  it('groundY round-trips through the projection at any depth', () => {
    for (const d of [20, 40, 62, 104]) {
      const s = screenOf(0, groundY(d), -d, DESKTOP)
      expect(s.sy).toBeCloseTo(groundSy(d), 6)
    }
  })
})

describe('heliports', () => {
  it('drift left with the pan at their band rate (ground-locked at their depth)', () => {
    expect(padSx(PAD_MI17, 0.5) - padSx(PAD_MI17, 0)).toBeCloseTo(-0.085, 6)
    expect(padSx(PAD_APACHE, 0.5) - padSx(PAD_APACHE, 0)).toBeCloseTo(-0.085, 6)
  })

  it('gives each stand two symmetric touchdown marks that sit inside the slab', () => {
    for (const pad of [PAD_MI17, PAD_APACHE]) {
      for (const tr of [0, 0.5, 1]) {
        for (const aspect of ASPECTS) {
          const off = (MARK_HALF_R * pad.r) / (2 * pad.d * FOV_TAN * aspect)
          expect(padMarkSx(pad, tr, 0, aspect)).toBeCloseTo(padSx(pad, tr) - off, 9)
          expect(padMarkSx(pad, tr, 1, aspect)).toBeCloseTo(padSx(pad, tr) + off, 9)
        }
        // Mark centre + its ring (0.34·r) sit inside the slab radius on ANY
        // aspect — the fraction-of-slab definition guarantees it.
        expect(MARK_HALF_R + 0.34).toBeLessThan(0.95)
      }
    }
  })

  it('the rotary line sits RIGHT of the tower on its band (the blue zone)', () => {
    // Tower at sx 0.58 (tr 0) — both stands to its right, Mi-17 first.
    expect(PAD_MI17.sx0).toBeGreaterThan(0.68)
    expect(PAD_MI17.sx0).toBeLessThan(0.82)
    expect(PAD_APACHE.sx0).toBeGreaterThan(PAD_MI17.sx0 + 0.08)
    // Both on the open apron between the tent city and the taxiway (sy ≈ 0.68).
    expect(padSy(PAD_MI17)).toBeGreaterThan(0.66)
    expect(padSy(PAD_MI17)).toBeLessThan(0.71)
    expect(padSy(PAD_APACHE)).toBeCloseTo(padSy(PAD_MI17), 6)
    const s = { sx: 0, sy: 0, rx: 0, squash: 0 }
    padScreen(PAD_MI17, 0, s)
    expect(s.sy).toBeCloseTo(padSy(PAD_MI17), 6)
    expect(s.squash).toBeCloseTo(CAM_H / PAD_MI17.d, 6)
    expect(s.squash).toBeLessThan(0.2) // near-level view → flat stand
    padScreen(PAD_APACHE, 0, s)
    // A generous stand (Martin: both touchdown marks sit in the MIDDLE, not
    // at the edge).
    expect(s.rx).toBeGreaterThan(0.08)
    expect(s.rx).toBeLessThan(0.14)
    // Each mark centre (MARK_HALF_R·r) plus its ring (0.34·r) stays inside the
    // slab radius — marks never poke past the concrete, at any aspect.
    expect(MARK_HALF_R + 0.34).toBeLessThan(0.9)
  })
})

describe('C-17 departure', () => {
  it('lives from the fade-in roll to the exit, gone after', () => {
    expect(c17PoseAt(C17.rollStart - 0.01, DESKTOP, pose).alpha).toBe(0)
    expect(c17PoseAt(C17.rollStart + 0.01, DESKTOP, pose).alpha).toBe(1)
    expect(c17PoseAt(C17.gone + 0.01, DESKTOP, pose).alpha).toBe(0)
  })

  it('starts on the UPPER runway under the mountains, HIGH + clearly readable', () => {
    c17PoseAt(C17.rollStart + 0.002, DESKTOP, pose)
    const s = project(pose, DESKTOP)
    expect(Math.abs(s.sx - C17.startSx)).toBeLessThan(0.02)
    expect(Math.abs(s.sy - C17.runwaySy)).toBeLessThan(0.01)
    // The FAR runway sits HIGHER in the frame than the near stands (Martin R7:
    // up on the distant strip under the mountains, not down at the hangar)…
    expect(s.sy).toBeLessThan(padSy(PAD_MI17))
    // …a small but crisp aircraft on the distant runway (~2 % of frame height),
    // growing into a solid airframe as it climbs out.
    expect(SIZE.c17 / (2 * -pose.z * FOV_TAN)).toBeGreaterThan(0.02)
    // The tall climb lifts it well clear of the mounds/tower — up onto the low
    // mountains near the horizon (sy well above 0.6, greater absolute height).
    c17PoseAt(C17.bankStart, DESKTOP, pose)
    expect(project(pose, DESKTOP).sy).toBeLessThan(0.56)
  })

  it('rolls LEFT→RIGHT along the runway heading, accelerating, then rotates', () => {
    let lastX = -Infinity
    let lastStep = 0
    let first = true
    for (let t = C17.rollStart + 0.02; t <= C17.liftoff; t += 0.02) {
      const prevX = pose.x
      c17PoseAt(t, DESKTOP, pose)
      expect(pose.bank).toBe(0)
      expect(pose.z).toBeCloseTo(-C17.runwayD, 6) // glued to the runway band
      expect(pose.x).toBeGreaterThan(lastX) // eastbound, always
      const step = pose.x - prevX
      if (!first) expect(step).toBeGreaterThan(lastStep) // accelerating
      lastStep = step
      lastX = pose.x
      first = false
    }
    c17PoseAt(C17.liftoff - 0.001, DESKTOP, pose)
    expect(pose.pitch).toBeGreaterThan(0.1) // rotated
    // The nose points down the runway: east (+x).
    expect(-Math.sin(pose.heading)).toBeCloseTo(1, 5)
  })

  it('climbs STRAIGHT ahead first (no bank), then banks RIGHT in the sweep', () => {
    c17PoseAt(C17.liftoff, DESKTOP, pose)
    const yLift = pose.y
    // Once AIRBORNE, screen-x never REVERSES through the climb (a too-fast roll
    // used to overshoot right then slide back — the R6 monotonic-climb fix; the
    // pre-liftoff fade-in micro-drift is invisible and excluded).
    let lastSx = -Infinity
    for (let t = C17.liftoff; t <= C17.bankStart; t += 0.005) {
      const sx = project(c17PoseAt(t, DESKTOP, pose), DESKTOP).sx
      expect(sx).toBeGreaterThan(lastSx - 1e-6)
      lastSx = sx
    }
    for (let t = C17.liftoff; t <= C17.bankStart; t += 0.01) {
      c17PoseAt(t, DESKTOP, pose)
      expect(pose.bank).toBe(0)
      expect(pose.z).toBeCloseTo(-C17.runwayD, 6) // still on the runway line
    }
    c17PoseAt(C17.bankStart, DESKTOP, pose)
    expect(pose.y - yLift).toBeGreaterThan(C17.climbAlt * 0.95) // altitude first
    c17PoseAt(C17.bankStart + (C17.exit - C17.bankStart) * 0.55, DESKTOP, pose)
    expect(pose.bank).toBeLessThan(-0.2) // banked RIGHT mid-sweep…
    let deepest = 0
    for (let i = 0; i <= 40; i++) {
      c17PoseAt(C17.bankStart + ((C17.exit - C17.bankStart) * i) / 40, DESKTOP, pose)
      deepest = Math.min(deepest, pose.bank)
    }
    expect(deepest).toBeLessThan(-0.4) // …and near bankMax at the tightest point
  })

  it('the right turn brings it TOWARD the viewer, CLIMBING to centre-top', () => {
    // Depth only starts falling in the turn — and ends closer than it started.
    c17PoseAt(C17.bankStart + 0.02, DESKTOP, pose)
    c17PoseAt(C17.exit - 0.02, DESKTOP, pose2)
    expect(-pose2.z).toBeLessThan(-pose.z * 0.4)
    const s = project(pose2, DESKTOP)
    expect(s.sy).toBeLessThan(0.45) // Martin R10: climbing UP into the top, not down
  })

  it('never recedes, and ends CLOSE — larger than it started', () => {
    let last = Infinity
    const N = 80
    for (let i = 0; i <= N; i++) {
      const t = C17.rollStart + ((C17.exit - C17.rollStart) * i) / N
      c17PoseAt(t, DESKTOP, pose)
      // Constant depth down the runway line, then the turn rushes it in;
      // the approach must never VISIBLY reverse.
      expect(-pose.z).toBeLessThan(last + 0.25)
      last = -pose.z
    }
    expect(last).toBeLessThan(C17.exitD + 1)
  })

  it('climbs OUT the top edge, banked + grown (Martin R10: up, not down)', () => {
    for (const aspect of ASPECTS) {
      c17PoseAt(C17.exit, aspect, pose)
      const s = project(pose, aspect)
      // Upper-right, off the TOP edge (climbing away over the viewer).
      expect(s.sx).toBeGreaterThan(0.55)
      expect(s.sy).toBeLessThan(0.12) // off / above the top
      // Grown from the far-runway speck into a solid airframe.
      expect(SIZE.c17 / (2 * -pose.z * FOV_TAN)).toBeGreaterThan(0.2)
      expect(pose.bank).toBeLessThan(-0.12) // still banked right when it leaves
    }
  })

  it('keeps speed continuous across liftoff and bank entry (no jerk)', () => {
    const speed = (t: number) => {
      c17PoseAt(t - 0.004, DESKTOP, pose)
      c17PoseAt(t + 0.004, DESKTOP, pose2)
      return Math.hypot(pose2.x - pose.x, pose2.y - pose.y, pose2.z - pose.z) / 0.008
    }
    expect(speed(C17.liftoff + 0.005) / speed(C17.liftoff - 0.005)).toBeGreaterThan(0.85)
    expect(speed(C17.liftoff + 0.005) / speed(C17.liftoff - 0.005)).toBeLessThan(1.2)
    expect(speed(C17.bankStart + 0.005) / speed(C17.bankStart - 0.005)).toBeGreaterThan(0.8)
    expect(speed(C17.bankStart + 0.005) / speed(C17.bankStart - 0.005)).toBeLessThan(1.25)
  })
})

describe('Apache pair arrival', () => {
  it('enters HUGE over the top through the viewer, then rushes forward into the base', () => {
    // Not from the left: it punches in over the TOP edge, right over the
    // observer, HUGE (Martin: wow like the landing-break jets, from the front).
    apachePoseAt(APACHE.in + 0.006, DESKTOP, 0, pose)
    expect(-pose.z).toBeLessThan(6) // very close = fills the frame
    const s0 = project(pose, DESKTOP)
    expect(s0.sy).toBeLessThan(0.22) // over the top / over the viewer
    expect(s0.sx).toBeGreaterThan(0.3) // central, NOT the left edge
    expect(s0.sx).toBeLessThan(0.62)
    // Then it RUSHES FORWARD (recedes) toward the stand — depth grows, never
    // crossing back toward the camera.
    let last = -Infinity
    for (let t = APACHE.in + 0.006; t <= APACHE.flare; t += 0.008) {
      apachePoseAt(t, DESKTOP, 0, pose)
      expect(pose.z).toBeLessThan(0) // always in front of the camera
      expect(-pose.z).toBeGreaterThan(last - 0.6) // forward, not back
      last = -pose.z
    }
    expect(last).toBeGreaterThan(40) // reached the far stand gate
    // Heading into the base (away) through the rush.
    apachePoseAt(APACHE.in + 0.1, DESKTOP, 0, pose)
    expect(nose(pose).dz).toBeLessThan(0)
  })

  it('flies a fast fly-through, then the flare settles slow to touchdown', () => {
    const speed = (t: number) => {
      apachePoseAt(t, DESKTOP, 0, pose)
      apachePoseAt(t + 0.004, DESKTOP, 0, pose2)
      return Math.hypot(pose2.x - pose.x, pose2.y - pose.y, pose2.z - pose.z) / 0.004
    }
    // The transit fly-through is FAR faster than the final vertical settle
    // (the flare kills the speed — a real Apache arrival).
    expect(speed(APACHE.in + 0.1)).toBeGreaterThan(speed(APACHE.touch - 0.01) * 3)
  })

  it('flares (nose-up pulse) and settles with a dying sink rate', () => {
    let flared = false
    for (let t = APACHE.flare; t <= APACHE.touch; t += 0.005) {
      apachePoseAt(t, DESKTOP, 0, pose)
      if (pose.pitch > 0.12) flared = true
    }
    expect(flared).toBe(true)
    // Sink rate at touchdown ≈ 0 (eased), pitch level again.
    apachePoseAt(APACHE.touch - 0.006, DESKTOP, 0, pose)
    apachePoseAt(APACHE.touch - 0.001, DESKTOP, 0, pose2)
    expect(Math.abs(pose2.y - pose.y) / 0.005).toBeLessThan(8)
    expect(Math.abs(pose2.pitch)).toBeLessThan(0.07)
  })

  it('lands each ship on its own stand MARK, wheel-ref on the deck (both aspects)', () => {
    for (const aspect of ASPECTS) {
      for (const tr of [APACHE.touch + 0.05, 0.8, 1.0]) {
        apachePoseAt(tr, aspect, 0, pose)
        const s = project(pose, aspect)
        expect(s.sx).toBeCloseTo(padMarkSx(PAD_APACHE, tr, 0, aspect), 2)
        // groundOff 0 → pose.y IS the wheel-contact reference (groundY);
        // the runtime lifts by the measured wheelLift so the wheels touch.
        expect(pose.y).toBeCloseTo(groundY(PAD_APACHE.d), 3)
        // The wingman parks on the SECOND mark, right of the lead.
        apachePoseAt(tr, aspect, 1, pose2)
        expect(project(pose2, aspect).sx).toBeCloseTo(padMarkSx(PAD_APACHE, tr, 1, aspect), 2)
        expect(project(pose2, aspect).sx).toBeGreaterThan(s.sx)
      }
    }
  })

  it('the wingman trails the lead in and never collides', () => {
    let minSep = Infinity
    for (let t = APACHE.in + 0.001; t <= 1; t += 0.01) {
      apachePoseAt(t, DESKTOP, 0, pose)
      apachePoseAt(t, DESKTOP, 1, pose2)
      if (pose.alpha > 0 && pose2.alpha > 0) {
        minSep = Math.min(minSep, Math.hypot(pose2.x - pose.x, pose2.y - pose.y, pose2.z - pose.z))
      }
    }
    expect(minSep).toBeGreaterThan(SIZE.apache * 0.7)
  })
})

describe('Mi-17 pair departure', () => {
  it('both SIT on their own stand mark through the whole Apache overflight', () => {
    // The pair's first movement comes only after the Apaches passed over
    // them and the lead is down (lift > touch — Martin's ordering).
    expect(MI17.lift).toBeGreaterThan(APACHE.touch)
    for (const aspect of ASPECTS) {
      for (const tr of [0, 0.2, APACHE.flare, APACHE.touch, MI17.lift - 0.01]) {
        mi17PoseAt(tr, aspect, 0, pose)
        expect(project(pose, aspect).sx).toBeCloseTo(padMarkSx(PAD_MI17, tr, 0, aspect), 2)
        expect(pose.y).toBeCloseTo(groundY(PAD_MI17.d), 3) // wheel-ref on the deck
        expect(pose.pitch).toBe(0)
        // The wingman sits on the SECOND mark, right of the lead, same
        // stillness and the same deck height.
        mi17PoseAt(tr, aspect, 1, pose2)
        expect(project(pose2, aspect).sx).toBeCloseTo(padMarkSx(PAD_MI17, tr, 1, aspect), 2)
        expect(project(pose2, aspect).sx).toBeGreaterThan(project(pose, aspect).sx)
        expect(pose2.y).toBeCloseTo(pose.y, 4)
      }
    }
  })

  it('lifts vertically (no horizontal run before the nose-over)', () => {
    mi17PoseAt(MI17.lift, DESKTOP, 0, pose)
    mi17PoseAt(MI17.noseOver, DESKTOP, 0, pose2)
    expect(pose2.y - pose.y).toBeGreaterThan(MI17.hover * 0.9)
    // The mark drifts a touch with the pan — the ship must stay ON it.
    expect(Math.abs(project(pose2, DESKTOP).sx - padMarkSx(PAD_MI17, MI17.noseOver, 0, DESKTOP))).toBeLessThan(0.01)
    // The wingman lifts LATER — still on the ground as the lead tops out.
    mi17PoseAt(MI17.lift + MI17.wingDelay * 0.6, DESKTOP, 1, pose2)
    expect(pose2.y).toBeCloseTo(groundY(PAD_MI17.d), 2)
  })

  it('noses over, accelerates LEFT and away off the frame, wingman in trail', () => {
    mi17PoseAt(MI17.noseOver + 0.06, DESKTOP, 0, pose)
    expect(pose.pitch).toBeLessThan(-0.08) // nose down
    let lastX = Infinity
    let lastStep = 0
    let accelerated = false
    for (let t = MI17.noseOver + 0.01; t <= MI17.out; t += 0.02) {
      const px = pose2.x
      mi17PoseAt(t, DESKTOP, 0, pose2)
      expect(pose2.x).toBeLessThan(lastX + 1e-6) // strictly leftward
      const step = px === undefined ? 0 : Math.abs(pose2.x - px)
      if (step > lastStep * 1.15) accelerated = true
      lastStep = step
      lastX = pose2.x
    }
    expect(accelerated).toBe(true)
    // In flight the wingman trails BEHIND the lead down the same track.
    mi17PoseAt(0.62, DESKTOP, 0, pose)
    mi17PoseAt(0.62, DESKTOP, 1, pose2)
    expect(pose2.x).toBeGreaterThan(pose.x + 3) // behind = right of the lead
    const sep = Math.hypot(pose2.x - pose.x, pose2.y - pose.y, pose2.z - pose.z)
    expect(sep).toBeGreaterThan(SIZE.mi17 * 0.8) // never blade-to-blade
    for (const aspect of ASPECTS) {
      mi17PoseAt(MI17.out, aspect, 0, pose)
      expect(project(pose, aspect).sx).toBeLessThan(-0.05) // off the left edge
    }
    expect(mi17PoseAt(MI17.gone + 0.01, DESKTOP, 0, pose).alpha).toBe(0)
    expect(mi17PoseAt(MI17.gone + MI17.wingDelay + 0.01, DESKTOP, 1, pose).alpha).toBe(0)
  })

  it('never conflicts with the Apache arrival (the two flows stay apart)', () => {
    // Terminal = parked, or lifting/flaring/overflying its own stand line
    // (alt < 4 units ≈ 20 m). Two CRUISING ships crossing need two rotor
    // diameters; any pair involving a terminal ship is ramp ops (landing
    // beside / overflying a parked neighbour) — real blade-tip clearance
    // is the rule there. The beat ordering (lift only after touchdown)
    // means the crossing case never actually arises — the assert guards it.
    const terminal = (p: BagramPose) => p.y - (groundY(-p.z) + 0.5) < 4
    let minCruise = Infinity
    let minRamp = Infinity
    for (let t = 0; t <= 1; t += 0.005) {
      for (const mi of [0, 1] as const) {
        mi17PoseAt(t, DESKTOP, mi, pose)
        if (pose.alpha <= 0) continue
        for (const ship of [0, 1] as const) {
          apachePoseAt(t, DESKTOP, ship, pose2)
          if (pose2.alpha <= 0) continue
          const sep = Math.hypot(pose2.x - pose.x, pose2.y - pose.y, pose2.z - pose.z)
          if (!terminal(pose) && !terminal(pose2)) minCruise = Math.min(minCruise, sep)
          else minRamp = Math.min(minRamp, sep)
        }
      }
    }
    if (minCruise < Infinity) expect(minCruise).toBeGreaterThan(SIZE.mi17 * 2)
    expect(minRamp).toBeGreaterThan((SIZE.mi17 / 2 + SIZE.apache / 2) * 1.2)
  })
})

describe('F-16 holding pattern (time-driven ambient)', () => {
  it('is a closed loop: one lap returns the ship to the same pose', () => {
    const lap = f16Lap(DESKTOP)
    f16PoseAt(3, 0.4, DESKTOP, 0, pose)
    f16PoseAt(3 + lap, 0.4, DESKTOP, 0, pose2)
    expect(pose2.x).toBeCloseTo(pose.x, 4)
    expect(pose2.z).toBeCloseTo(pose.z, 4)
    expect(pose2.heading).toBeCloseTo(pose.heading, 4)
  })

  it('the two ships hold opposite sides of the racetrack', () => {
    const lap = f16Lap(DESKTOP)
    f16PoseAt(7, 0.4, DESKTOP, 1, pose)
    f16PoseAt(7 + lap / 2, 0.4, DESKTOP, 0, pose2)
    expect(pose2.x).toBeCloseTo(pose.x, 4)
    expect(pose2.z).toBeCloseTo(pose.z, 4)
  })

  it('freezes when time freezes (reduced-motion contract)', () => {
    f16PoseAt(11.7, 0.3, DESKTOP, 0, pose)
    f16PoseAt(11.7, 0.3, DESKTOP, 0, pose2)
    expect(pose2).toEqual(pose)
  })

  it('flies far, small and high, inside the frame on both aspects', () => {
    for (const aspect of ASPECTS) {
      const lap = f16Lap(aspect)
      for (let time = 0; time < lap; time += lap / 40) {
        f16PoseAt(time, 0.4, aspect, 0, pose)
        expect(-pose.z).toBeGreaterThanOrEqual(F16.dNear - 1)
        expect(-pose.z).toBeLessThanOrEqual(F16.dFar + 1)
        const s = project(pose, aspect)
        expect(s.sy).toBeGreaterThan(0.05)
        expect(s.sy).toBeLessThan(0.42)
        // The LEGS are screen-authored (always in frame); the depth-turns
        // may briefly bulge past a narrow phone's edge — real pattern width.
        expect(s.sx).toBeGreaterThan(-0.45)
        expect(s.sx).toBeLessThan(1.45)
        // Near but still clearly the SMALL background actor: span under
        // 6.5 % of frame height everywhere (C-17 exits at ~10× that).
        expect(SIZE.f16 / (2 * -pose.z * FOV_TAN)).toBeLessThan(0.065)
      }
    }
  })

  it('banks into the turns (coordinated), wings level on the legs', () => {
    const lap = f16Lap(DESKTOP)
    const L = 2 * F16.sxHalf * 2 * F16.dNear * FOV_TAN * DESKTOP
    const legT = L / F16.v
    const arcT = (Math.PI * (F16.dFar - F16.dNear)) / 2 / F16.v
    // mid near-leg / mid right-turn (ship 0 starts at the near leg's left end)
    f16PoseAt(legT * 0.5, 0.4, DESKTOP, 0, pose)
    expect(pose.bank).toBe(0)
    f16PoseAt(legT + arcT * 0.5, 0.4, DESKTOP, 0, pose)
    expect(pose.bank).toBeGreaterThan(F16.bankMax * 0.9)
    expect(Math.abs(f16Lap(DESKTOP) - (2 * legT + 2 * arcT))).toBeLessThan(1e-6)
    void lap
  })
})

describe('presence + ground shadows', () => {
  it('composes the desert share exactly like the 2D slots', () => {
    const desert = { sky: 'desert', alpha: 1 }
    const cruise = { sky: 'cruise', alpha: 1 }
    expect(desertPresence([], 0)).toBe(0)
    expect(desertPresence([desert], 1)).toBe(1)
    expect(desertPresence([cruise], 1)).toBe(0)
    expect(desertPresence([cruise, { sky: 'desert', alpha: 0.3 }], 2)).toBeCloseTo(0.3)
    expect(desertPresence([desert, { sky: 'airshow', alpha: 0.25 }], 2)).toBeCloseTo(0.75)
    expect(desertPresence([desert, { sky: 'desert', alpha: 0.4 }], 2)).toBe(1)
  })

  it('the shadow-catcher plane equation matches groundY at every depth', () => {
    for (const d of [20, 60, 110, 160]) {
      expect(GROUND_SLOPE * -d - CAM_H).toBeCloseTo(groundY(d), 9)
    }
  })

  it('headingOf points the nose down the requested direction', () => {
    const h = headingOf(1, 0) // east
    expect(-Math.sin(h)).toBeCloseTo(1, 6)
    expect(-Math.cos(h)).toBeCloseTo(0, 6)
  })
})
