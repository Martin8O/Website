import { describe, expect, it } from 'vitest'
import {
  ABOVE,
  CLIMB_SEQ,
  SCROLL_TO_T,
  SEQ_START_T,
  TAG_BASE,
  TAG_PULSE,
  aboveT,
  buildTrack,
  buildWarp,
  catmullRomAt,
  climbScreenAt,
  climbXScale,
  evalWarp,
  heroPosAt,
  lifeAlpha,
  lifeSpan,
  poseTrackAt,
  sceneEnd,
  slerpQuat,
  snapTimes,
  skyPresence,
  sphereStateAt,
  tagAlpha,
} from './climbMath'

const ulla = CLIMB_SEQ.aircraft[0]
const z142 = CLIMB_SEQ.aircraft[1]
const l39 = CLIMB_SEQ.aircraft[2]

describe('snapshot timing (window-t of the climb run)', () => {
  // authored % of scroll → window-t (the converter/runtime convention)
  const T = (pct: number) => SEQ_START_T + (pct / 100) * SCROLL_TO_T

  it('places snapshots at SEQ_START_T + (start + Σ steps) · SCROLL_TO_T', () => {
    const u = snapTimes(ulla)
    expect(u[0]).toBeCloseTo(T(0), 10)
    expect(u[1]).toBeCloseTo(T(0.7366), 10)
    expect(u[4]).toBeCloseTo(T(2.6), 10) // Ulla's authored 2.6 % budget
    const z = snapTimes(z142)
    expect(z[0]).toBeCloseTo(T(2.6), 10)
    expect(z[4]).toBeCloseTo(T(3.9), 10) // + the Z-142's 1.3 %
    const l = snapTimes(l39)
    expect(l[0]).toBeCloseTo(T(3.9), 10)
    expect(l[l.length - 1]).toBeCloseTo(T(9.15), 10) // the full scene
  })

  it('hands off types at the junctions: same point, touching spans', () => {
    // Ulla's last snap IS Z-142's first, Z-142's last IS the L-39's first —
    // one continuous trajectory, only the type changes (the lab transition).
    expect(z142.snaps[0].p).toEqual(ulla.snaps[ulla.snaps.length - 1].p)
    expect(l39.snaps[0].p).toEqual(z142.snaps[z142.snaps.length - 1].p)
    expect(lifeSpan(ulla)[1]).toBeCloseTo(lifeSpan(z142)[0], 10)
    expect(lifeSpan(z142)[1]).toBeCloseTo(lifeSpan(l39)[0], 10)
  })

  it('unlock spheres announce each type switch (the authored 0.17 % lead)', () => {
    const lead = 0.0017 * SCROLL_TO_T // physics.mjs SPHERE_LEAD
    expect(CLIMB_SEQ.effects[0].at).toBeCloseTo(lifeSpan(z142)[0] - lead, 4)
    expect(CLIMB_SEQ.effects[1].at).toBeCloseTo(lifeSpan(l39)[0] - lead, 4)
  })

  it('the flight tops out right at the section-ending white-out', () => {
    // heroClimbPunch fog rises 0.63→0.703 — the L-39's last snap must sit
    // inside the rise or just past its top (fully white right as it ends).
    const end = sceneEnd(CLIMB_SEQ)
    expect(end).toBeGreaterThan(0.63)
    expect(end).toBeLessThan(0.72)
  })

  it('preserves the authored scroll pacing through SCROLL_TO_T', () => {
    // Martin authored 9.15 % of scroll, played 1:1 in HUD % (the climb owns
    // scrollWeight 2 of total 13.3 → SCROLL_TO_T = 13.3/2).
    expect(sceneEnd(CLIMB_SEQ) - SEQ_START_T).toBeCloseTo(0.0915 * SCROLL_TO_T, 10)
  })

  it('the punch-out beats sit between the white-out and the window end', () => {
    // ABOVE re-times the 2D above-deck story onto [out, cut] — the affine
    // map must hit both ends exactly and stay ordered.
    expect(aboveT(0.6)).toBeCloseTo(ABOVE.out, 10)
    expect(aboveT(0.84)).toBeCloseTo(ABOVE.cut, 10)
    expect(aboveT(0.8)).toBeGreaterThan(ABOVE.whiteGone) // unlock after the reveal
    expect(sceneEnd(CLIMB_SEQ)).toBeLessThan(ABOVE.swap) // 3D flight ends first
    expect(ABOVE.swap).toBeLessThan(ABOVE.out)
    expect(ABOVE.out).toBeLessThan(ABOVE.whiteGone)
    expect(ABOVE.whiteGone).toBeLessThan(ABOVE.cut)
    expect(ABOVE.cut).toBeLessThan(1)
  })
})

describe('stage projection (climbScreenAt)', () => {
  it('maps the display plane edge-to-edge at the lab 3:2 aspect', () => {
    // At 3:2 contain = cover: the plane corners ARE the viewport corners.
    expect(climbScreenAt([0, 0, -3], 1500, 1000).x).toBeCloseTo(0.5, 10)
    expect(climbScreenAt([0, 0, -3], 1500, 1000).y).toBeCloseTo(0.5, 10)
    expect(climbScreenAt([6, 4, -3], 1500, 1000).x).toBeCloseTo(1, 6)
    expect(climbScreenAt([6, 4, -3], 1500, 1000).y).toBeCloseTo(0, 6)
  })

  it('compresses deeper points toward the centre (perspective)', () => {
    const near = climbScreenAt([4, 0, -3], 1600, 900)
    const far = climbScreenAt([4, 0, -15], 1600, 900)
    expect(Math.abs(far.x - 0.5)).toBeLessThan(Math.abs(near.x - 0.5))
    expect(far.pxPerUnit).toBeLessThan(near.pxPerUnit)
  })

  it('climbXScale spans the width on desktop and pulls a portrait back in', () => {
    const desktop = climbXScale(16 / 9)
    const portrait = climbXScale(390 / 844)
    // Never stretches past the bake; narrow screens shrink hard enough that
    // the binding snap (the parked Ulla, near the plane) stays inside the
    // frame. Desktop ≈ 0.845 — the Ulla cap at her own shallow depth.
    expect(desktop).toBeLessThanOrEqual(1)
    expect(desktop).toBeGreaterThan(0.8)
    expect(portrait).toBeLessThan(desktop)
    expect(portrait).toBeGreaterThan(0.5)
    // The guard itself: EVERY snap · scale ≤ 87 % of the half-frustum at its
    // own depth — the right-stretched bake (X_RIGHT) puts the widest |x|
    // DEEP, so a single widest-point check would miss the near ones.
    for (const a of [16 / 9, 3 / 2, 390 / 844]) {
      const s = climbXScale(a)
      for (const ac of CLIMB_SEQ.aircraft)
        for (const snap of ac.snaps) {
          const scr = climbScreenAt([snap.p[0] * s, snap.p[1], snap.p[2]], 1000 * a, 1000)
          expect(scr.x).toBeGreaterThanOrEqual(0.064)
          expect(scr.x).toBeLessThanOrEqual(0.936)
        }
    }
  })
})

describe('life alpha', () => {
  it('is instant at the span edges (clean type handoffs)', () => {
    // Z-142 lives T(2.6)→T(3.9) = window-t ≈ 0.2694→0.3559
    expect(lifeAlpha(z142, 0.268)).toBe(0)
    expect(lifeAlpha(z142, 0.271)).toBe(1)
    expect(lifeAlpha(z142, 0.354)).toBe(1)
    expect(lifeAlpha(z142, 0.358)).toBe(0)
  })

  it('holdBefore keeps the first aircraft parked through the fade-in', () => {
    expect(lifeAlpha(ulla, -0.15)).toBe(1)
    expect(lifeAlpha(ulla, 0.271)).toBe(0) // handed off at ≈ 0.2694
  })

  it('the L-39 lives to its last snap — the white-out does the swallowing', () => {
    expect(lifeAlpha(l39, 0.703)).toBe(1) // ends ≈ 0.705
    expect(lifeAlpha(l39, 0.707)).toBe(0)
  })
})

describe('monotone time warp (Fritsch–Carlson)', () => {
  const sc = snapTimes(l39)
  const warp = buildWarp(sc, sc.length)

  it('is exact at every knot (keyframe timing preserved)', () => {
    for (let i = 0; i < sc.length; i++) {
      expect(evalWarp(warp, sc[i])).toBeCloseTo(i / (sc.length - 1), 10)
    }
  })

  it('is monotone non-decreasing across the whole span', () => {
    let prev = -1
    for (let k = 0; k <= 400; k++) {
      const f = sc[0] + ((sc[sc.length - 1] - sc[0]) * k) / 400
      const u = evalWarp(warp, f)
      expect(u).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = u
    }
  })

  it('clamps outside the span (parked at the path ends)', () => {
    expect(evalWarp(warp, -1)).toBe(0)
    expect(evalWarp(warp, 2)).toBe(1)
  })

  it('has C1-continuous slope at interior knots (no speed jumps)', () => {
    // Second-order one-sided differences — first-order ones leave an
    // ε·f″ residual even on a perfectly C1 curve.
    const eps = 1e-6
    const w = (f: number) => evalWarp(warp, f)
    for (let i = 1; i < sc.length - 1; i++) {
      const x = sc[i]
      const left = (3 * w(x) - 4 * w(x - eps) + w(x - 2 * eps)) / (2 * eps)
      const right = (-3 * w(x) + 4 * w(x + eps) - w(x + 2 * eps)) / (2 * eps)
      expect(Math.abs(left - right)).toBeLessThan(1e-4 * Math.max(1, Math.abs(left)))
    }
  })
})

describe('centripetal Catmull-Rom', () => {
  it('passes through every control point', () => {
    const pts = z142.snaps.map((s) => s.p)
    const out: [number, number, number] = [0, 0, 0]
    for (let i = 0; i < pts.length; i++) {
      catmullRomAt(pts, i / (pts.length - 1), out)
      expect(out[0]).toBeCloseTo(pts[i][0], 6)
      expect(out[1]).toBeCloseTo(pts[i][1], 6)
      expect(out[2]).toBeCloseTo(pts[i][2], 6)
    }
  })

  it('matches THREE.CatmullRomCurve3 centripetal on a known segment', () => {
    // Symmetric points → the midpoint is exact: (1.5, 0.5, 0) at u = 0.5.
    const pts = [
      [0, 0, 0],
      [1, 1, 0],
      [2, 0, 0],
      [3, 1, 0],
    ] as const
    const out: [number, number, number] = [0, 0, 0]
    catmullRomAt(pts, 0.5, out)
    expect(out[0]).toBeCloseTo(1.5, 6)
    expect(out[1]).toBeCloseTo(0.5, 6)
    expect(out[2]).toBeCloseTo(0, 10)
  })
})

describe('slerp', () => {
  it('interpolates the shortest path and normalizes', () => {
    const out: [number, number, number, number] = [0, 0, 0, 1]
    slerpQuat([0, 0, 0, 1], [0, Math.SQRT1_2, 0, Math.SQRT1_2], 0.5, out)
    // half of a 90° yaw = 45°: q = [0, sin(22.5°), 0, cos(22.5°)]
    expect(out[1]).toBeCloseTo(Math.sin(Math.PI / 8), 6)
    expect(out[3]).toBeCloseTo(Math.cos(Math.PI / 8), 6)
    expect(Math.hypot(...out)).toBeCloseTo(1, 10)
  })

  it('takes the short way around opposite-sign twins', () => {
    const out: [number, number, number, number] = [0, 0, 0, 1]
    slerpQuat([0, 0, 0, 1], [0, 0, 0, -1], 0.5, out)
    expect(out[3]).toBeCloseTo(1, 6) // same rotation — stays put
  })
})

describe('pose evaluation', () => {
  it('parks at the first snap before the span and last after it', () => {
    const track = buildTrack(z142)
    const pose = { p: [0, 0, 0] as [number, number, number], q: [0, 0, 0, 1] as [number, number, number, number] }
    poseTrackAt(track, -0.5, pose)
    expect(pose.p).toEqual([...z142.snaps[0].p])
    poseTrackAt(track, 2, pose)
    expect(pose.p[0]).toBeCloseTo(z142.snaps[4].p[0], 6)
  })

  it('hits every snapshot pose exactly at its window-t knot', () => {
    const track = buildTrack(l39)
    const sc = snapTimes(l39)
    const pose = { p: [0, 0, 0] as [number, number, number], q: [0, 0, 0, 1] as [number, number, number, number] }
    for (let i = 0; i < sc.length; i++) {
      poseTrackAt(track, sc[i], pose)
      expect(pose.p[0]).toBeCloseTo(l39.snaps[i].p[0], 5)
      expect(pose.p[1]).toBeCloseTo(l39.snaps[i].p[1], 5)
      expect(pose.p[2]).toBeCloseTo(l39.snaps[i].p[2], 5)
      // quat up to sign; the authored q's carry 4-decimal rounding, so
      // compare against the normalized authored quat
      const dot =
        pose.q[0] * l39.snaps[i].q[0] +
        pose.q[1] * l39.snaps[i].q[1] +
        pose.q[2] * l39.snaps[i].q[2] +
        pose.q[3] * l39.snaps[i].q[3]
      expect(Math.abs(dot) / Math.hypot(...l39.snaps[i].q)).toBeCloseTo(1, 6)
    }
  })

  it('heroPosAt hands the flight across types continuously', () => {
    const tracks = CLIMB_SEQ.aircraft.map((a) => buildTrack(a))
    const pose = { p: [0, 0, 0] as [number, number, number], q: [0, 0, 0, 1] as [number, number, number, number] }
    // before the scene: parked on Ulla's first snap
    heroPosAt(tracks, -0.2, pose)
    expect(pose.p).toEqual([...ulla.snaps[0].p])
    // exactly at a junction both sides give the same point
    const junction = lifeSpan(ulla)[1]
    heroPosAt(tracks, junction - 1e-9, pose)
    const before = [...pose.p]
    heroPosAt(tracks, junction + 1e-9, pose)
    expect(pose.p[0]).toBeCloseTo(before[0], 4)
    expect(pose.p[1]).toBeCloseTo(before[1], 4)
    expect(pose.p[2]).toBeCloseTo(before[2], 4)
    // after the scene: parked on the L-39's last snap
    heroPosAt(tracks, 1.5, pose)
    expect(pose.p[1]).toBeCloseTo(l39.snaps[l39.snaps.length - 1].p[1], 6)
  })
})

describe('unlock sphere', () => {
  const e = CLIMB_SEQ.effects[0]

  it('is off outside its window', () => {
    expect(sphereStateAt(e, e.at - 0.001)).toBeNull()
    expect(sphereStateAt(e, e.at + e.span + 0.001)).toBeNull()
  })

  it('grows r0→r1 and dissolves as it grows', () => {
    const early = sphereStateAt(e, e.at + e.span * 0.05)!
    const mid = sphereStateAt(e, e.at + e.span * 0.5)!
    const late = sphereStateAt(e, e.at + e.span * 0.95)!
    expect(early.r).toBeLessThan(mid.r)
    expect(mid.r).toBeLessThan(late.r)
    expect(mid.env).toBeCloseTo(e.peak * 1 * 0.25, 6)
    expect(late.env).toBeLessThan(mid.env)
    expect(sphereStateAt(e, e.at + e.span)!.env).toBeCloseTo(0, 10)
  })
})

describe('name tags (the 2D graduation-tag envelope)', () => {
  it('holds dim while the type flies, gone outside its life', () => {
    expect(tagAlpha(z142, 0.17)).toBe(0) // not born yet (birth ≈ 0.2694)
    expect(tagAlpha(z142, 0.345)).toBeCloseTo(TAG_BASE, 6) // pulse long gone
    expect(tagAlpha(z142, 0.36)).toBe(0) // died at ≈ 0.3559
  })

  it('pulses gold right after each unlock', () => {
    const birth = lifeSpan(z142)[0]
    expect(tagAlpha(z142, birth + 0.001)).toBeGreaterThan(TAG_BASE + TAG_PULSE * 0.9)
    expect(tagAlpha(z142, birth + 0.035)).toBeCloseTo(TAG_BASE + TAG_PULSE * 0.5, 6)
    expect(tagAlpha(z142, birth + 0.071)).toBeCloseTo(TAG_BASE, 6)
  })

  it('the first rung has no pulse — just the dim ride (2D graduationAt)', () => {
    expect(tagAlpha(ulla, -0.2)).toBeCloseTo(TAG_BASE, 6) // parked pre-scene
    expect(tagAlpha(ulla, 0.11)).toBeCloseTo(TAG_BASE, 6)
    expect(tagAlpha(ulla, 0.28)).toBe(0) // handed over at ≈ 0.2694
  })
})

describe('sky presence', () => {
  it('composes exactly like the 2D paint order', () => {
    expect(skyPresence([], 0)).toBe(0)
    expect(skyPresence([{ theme: 'sky', alpha: 1 }], 1)).toBe(1)
    expect(skyPresence([{ theme: 'origin', alpha: 1 }], 1)).toBe(0)
    // origin → climb cross-fade: presence IS the incoming weight
    expect(
      skyPresence(
        [
          { theme: 'origin', alpha: 1 },
          { theme: 'sky', alpha: 0.42 },
        ],
        2,
      ),
    ).toBeCloseTo(0.42, 10)
    // climb → cruise seam: both sky — one continuous world
    expect(
      skyPresence(
        [
          { theme: 'sky', alpha: 1 },
          { theme: 'sky', alpha: 0.6 },
        ],
        2,
      ),
    ).toBe(1)
    // sky → non-sky: the dying base is covered by the incoming paint
    expect(
      skyPresence(
        [
          { theme: 'sky', alpha: 1 },
          { theme: 'calm', alpha: 0.7 },
        ],
        2,
      ),
    ).toBeCloseTo(0.3, 10)
  })
})
