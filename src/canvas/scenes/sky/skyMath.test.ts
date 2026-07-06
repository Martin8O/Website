import { describe, expect, it } from 'vitest'
import {
  DISPLAY_T,
  GRADUATION,
  TOUCHDOWN,
  cloudPunch,
  graduationAt,
  helixPoint,
  landingPose,
  opposingDisplay,
  poseFold,
  rollFrame,
  sunArc,
} from './skyMath'
import { L159_ROLL, ROLL_BANKS_DEG, SILHOUETTES } from './silhouettes'
import { L159_POSE_AZS, L159_POSE_ELS, L159_POSE_GRID, L159_REAR_GEAR } from './l159poses'

describe('graduationAt', () => {
  it('starts on the ultralight with no pulse', () => {
    expect(graduationAt(0)).toEqual({ index: 0, pulse: 0 })
    expect(graduationAt(0.05).index).toBe(0)
  })

  it('steps up to the L-39C in ladder order — the L-159 belongs to cruise', () => {
    const indices = [0, 0.15, 0.29, 1].map((t) => graduationAt(t).index)
    expect(indices).toEqual([0, 1, 2, 2])
    expect(GRADUATION[GRADUATION.length - 1].craft).toBe('l39')
  })

  it('never steps down as t grows', () => {
    let prev = 0
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const { index } = graduationAt(t)
      expect(index).toBeGreaterThanOrEqual(prev)
      prev = index
    }
  })

  it('pulses at each swap and decays shortly after', () => {
    for (const rung of GRADUATION.slice(1)) {
      expect(graduationAt(rung.at).pulse).toBe(1)
      expect(graduationAt(rung.at + 0.08).pulse).toBe(0)
    }
  })

  it('completes the ladder before the cloud-punch begins', () => {
    const lastSwap = GRADUATION[GRADUATION.length - 1].at
    expect(cloudPunch(lastSwap).fog).toBe(0)
  })
})

describe('cloudPunch', () => {
  it('is clear below and above the layer, white inside', () => {
    expect(cloudPunch(0.2).fog).toBe(0)
    expect(cloudPunch(0.54).fog).toBe(1)
    expect(cloudPunch(0.8).fog).toBe(0)
  })

  it('cuts out of the white-out hard — no long dissolve', () => {
    // Full white right up to the cut point, gone within a few % of scroll.
    expect(cloudPunch(0.6).fog).toBe(1)
    expect(cloudPunch(0.63).fog).toBe(0)
  })

  it('swaps the world entirely inside the white-out window', () => {
    // Wherever the swap is in progress, fog must already be heavy.
    for (let t = 0; t <= 1.0001; t += 0.005) {
      const { fog, above } = cloudPunch(t)
      if (above > 0 && above < 1) expect(fog).toBeGreaterThan(0.85)
    }
    expect(cloudPunch(0.4).above).toBe(0)
    expect(cloudPunch(0.62).above).toBe(1)
  })

  it('approach rises monotonically toward the deck', () => {
    let prev = -1
    for (let t = 0; t <= 0.44; t += 0.02) {
      const { approach } = cloudPunch(t)
      expect(approach).toBeGreaterThanOrEqual(prev)
      prev = approach
    }
    expect(cloudPunch(0).approach).toBe(0)
    expect(cloudPunch(0.44).approach).toBe(1)
  })
})

describe('helixPoint', () => {
  it('keeps the two jets on opposite sides of the axis, same height', () => {
    for (const turns of [0, 0.13, 0.5, 0.77, 1.4]) {
      const a = helixPoint(turns, 0)
      const b = helixPoint(turns, Math.PI)
      expect(a.x).toBeCloseTo(-b.x, 10)
      expect(a.z).toBeCloseTo(-b.z, 10)
    }
  })

  it('stays on the unit cylinder and alternates near/far with the turns', () => {
    for (const turns of [0, 0.2, 0.6, 1.1]) {
      const p = helixPoint(turns, 0)
      expect(Math.hypot(p.x, p.z)).toBeCloseTo(1, 10)
    }
    expect(helixPoint(0, 0).z).toBeCloseTo(1, 10) // starts nearest
    expect(helixPoint(0.5, 0).z).toBeCloseTo(-1, 10) // half a turn → far side
  })
})

describe('sunArc', () => {
  it('is continuous — no jump anywhere along the section', () => {
    for (let p = 1.8; p <= 6.6; p += 0.01) {
      const a = sunArc(p)
      const b = sunArc(p + 0.01)
      expect(Math.abs(b.x - a.x)).toBeLessThan(0.01)
      expect(Math.abs(b.y - a.y)).toBeLessThan(0.01)
    }
  })

  it('never stalls mid-section: x strictly grows between the endpoints', () => {
    for (let p = 2.05; p < 6.25; p += 0.05) {
      expect(sunArc(p + 0.05).x).toBeGreaterThan(sunArc(p).x)
    }
  })

  it('starts upper-left, hands over at the seams, sets low right', () => {
    expect(sunArc(2)).toEqual({ x: 0.32, y: 0.15 })
    expect(sunArc(2.5)).toEqual({ x: 0.44, y: 0.15 })
    expect(sunArc(5.5)).toEqual({ x: 0.76, y: 0.38 })
    // Fully set: below the 0.70 horizon by the end of the landing roll.
    expect(sunArc(6.4).y).toBeGreaterThan(0.7)
  })
})

describe('rollFrame', () => {
  it('hits the traced quarter points of a full roll', () => {
    expect(rollFrame(0)).toEqual({ frame: 0, flipY: false })
    expect(rollFrame(Math.PI / 2).frame).toBe(L159_ROLL.length - 1)
    expect(rollFrame(Math.PI)).toEqual({ frame: 0, flipY: true })
    expect(rollFrame((3 * Math.PI) / 2).frame).toBe(L159_ROLL.length - 1)
    expect(rollFrame(2 * Math.PI - 1e-9)).toEqual({ frame: 0, flipY: false })
  })

  it('folds negative and >2π angles onto the same poses', () => {
    expect(rollFrame(-0.3)).toEqual(rollFrame(2 * Math.PI - 0.3))
    expect(rollFrame(0.4 + 4 * Math.PI)).toEqual(rollFrame(0.4))
  })

  it('walks the ladder monotonically from level to knife-edge', () => {
    let prev = 0
    for (let b = 0; b <= Math.PI / 2 + 1e-9; b += 0.01) {
      const { frame } = rollFrame(b)
      expect(frame).toBeGreaterThanOrEqual(prev)
      prev = frame
    }
    expect(prev).toBe(L159_ROLL.length - 1)
  })

  it('mirrors instead of popping at the quarter points', () => {
    // Just past knife-edge the frame stays the planform, only flipY turns on.
    expect(rollFrame(Math.PI / 2 + 0.01).frame).toBe(L159_ROLL.length - 1)
    expect(rollFrame(Math.PI / 2 + 0.01).flipY).toBe(true)
  })
})

describe('silhouette data', () => {
  const all: Array<[string, ReadonlyArray<ReadonlyArray<number>>]> = [
    ...Object.entries(SILHOUETTES),
    ...L159_ROLL.map((rings, i): [string, ReadonlyArray<ReadonlyArray<number>>] => [`roll[${i}]`, rings]),
  ]

  it('ships one traced frame per bank step', () => {
    expect(L159_ROLL.length).toBe(ROLL_BANKS_DEG.length)
  })

  it('every silhouette is normalized: unit length, centred, detailed', () => {
    for (const [name, rings] of all) {
      const outer = rings[0]
      // ≥ 22 points — traced shapes carry far more; the authored ultralight
      // is compact by design and sets the floor.
      expect(outer.length, name).toBeGreaterThanOrEqual(44)
      let minx = Infinity
      let maxx = -Infinity
      for (let i = 0; i < outer.length; i += 2) {
        minx = Math.min(minx, outer[i])
        maxx = Math.max(maxx, outer[i])
      }
      expect(maxx - minx, name).toBeCloseTo(1, 2)
      expect(minx + maxx, name).toBeCloseTo(0, 2)
      for (const ring of rings) {
        expect(ring.length % 2, name).toBe(0)
        for (const c of ring) expect(Math.abs(c), name).toBeLessThan(1.5)
      }
    }
  })
})

describe('poseFold', () => {
  const TAU = Math.PI * 2

  it('walks side → belly → inverted → above → side over one full roll', () => {
    expect(poseFold(0)).toEqual({ el: 0, flipY: false })
    expect(poseFold(Math.PI / 4).el).toBeCloseTo(-45, 6)
    expect(poseFold(Math.PI / 4).flipY).toBe(false)
    expect(poseFold(Math.PI / 2).el).toBeCloseTo(-90, 6)
    expect(poseFold(Math.PI).el).toBeCloseTo(0, 6)
    expect(poseFold(Math.PI).flipY).toBe(true)
    expect(poseFold((3 * Math.PI) / 2).el).toBeCloseTo(90, 6)
    expect(poseFold(TAU - 1e-9).el).toBeCloseTo(0, 4)
    expect(poseFold(TAU - 1e-9).flipY).toBe(false)
  })

  it('keeps el continuous and flips only at the poles', () => {
    let prev = poseFold(0)
    for (let b = 0.005; b <= TAU + 1e-9; b += 0.005) {
      const cur = poseFold(b)
      expect(Math.abs(cur.el - prev.el)).toBeLessThan(1)
      if (cur.flipY !== prev.flipY) {
        expect(Math.abs(prev.el)).toBeGreaterThan(89)
      }
      prev = cur
    }
  })
})

describe('opposingDisplay', () => {
  const W = 1600
  const H = 900
  const y0 = H * 0.735
  const R = Math.min(H * 0.2875, W * 0.42)

  it('moves and turns continuously through every segment seam', () => {
    let prev = opposingDisplay(0, W, H)
    for (let t = 0.002; t <= DISPLAY_T.exit + 1e-4; t += 0.002) {
      const cur = opposingDisplay(t, W, H)
      const jump = Math.hypot(cur.x - prev.x, cur.y - prev.y)
      // Loose enough for the ACCELERATING farewell climb, tight enough to
      // catch any real seam teleport (those jump by whole path segments).
      expect(jump, `position jump at t=${t.toFixed(3)}`).toBeLessThan(H * 0.042)
      // Heading continuity mod 2π (rotation ignores whole turns).
      let dh = Math.abs(cur.heading - prev.heading) % (Math.PI * 2)
      if (dh > Math.PI) dh = Math.PI * 2 - dh
      expect(dh, `heading jump at t=${t.toFixed(3)}`).toBeLessThan(0.13)
      prev = cur
    }
  })

  it('meets its mirror at the centre: head-on pass, loop foot, farewell pass', () => {
    const crossings: number[] = []
    let prev = opposingDisplay(0, W, H)
    for (let t = 0.002; t <= 1.0001; t += 0.002) {
      const cur = opposingDisplay(t, W, H)
      // Near-line crossings only — where the mirrored pair actually meets
      // (the farewell pass crosses while settling the last few px of the
      // dive; the loop-top crossing sits a whole 2R higher and stays out).
      if (Math.abs(cur.y - y0) < H * 0.04 && (prev.x - W / 2) * (cur.x - W / 2) <= 0 && prev.x !== cur.x) {
        crossings.push(t)
      }
      prev = cur
    }
    expect(crossings.length).toBe(3)
    expect(crossings[0]).toBeGreaterThan(0.2)
    expect(crossings[0]).toBeLessThan(DISPLAY_T.loopIn)
    // The "meet at the bottom" beat: the mirrored loops close at their feet.
    expect(crossings[1]).toBeGreaterThan(0.5)
    expect(crossings[1]).toBeLessThanOrEqual(DISPLAY_T.loopOut)
    expect(crossings[2]).toBeGreaterThan(DISPLAY_T.wingoverOut)
    expect(crossings[2]).toBeLessThan(DISPLAY_T.finale)
  })

  it('finishes the first vykrut before the head-on pass', () => {
    expect(opposingDisplay(0.088, W, H).bank).toBe(0)
    const mid = opposingDisplay(0.16, W, H).bank
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(Math.PI * 2)
    expect(opposingDisplay(0.227, W, H).bank).toBeCloseTo(Math.PI * 2, 6)
  })

  it('half-rolls at 59 % and crosses the LOW second pass upright', () => {
    // Before the 59 % half-roll: still in the wingover's rolled-out state.
    expect(opposingDisplay(0.808, W, H).bank).toBeCloseTo(Math.PI * 2, 6)
    // At the pass the pair flies LEFT — upright means the FLIPPED pose.
    const atPass = opposingDisplay(0.877, W, H)
    expect(atPass.bank).toBeCloseTo(Math.PI * 3, 6)
    const fold = poseFold(atPass.bank)
    expect(Math.abs(fold.el)).toBeLessThan(1)
    expect(fold.flipY).toBe(true)
    expect(Math.abs(atPass.y - y0)).toBeLessThan(H * 0.02) // low, on the line
  })

  it('flies the loop wings-level, meeting height at the top', () => {
    const tTop = (DISPLAY_T.loopIn + DISPLAY_T.loopOut) / 2
    const top = opposingDisplay(tTop, W, H)
    expect(top.bank).toBe(0)
    expect(top.y).toBeCloseTo(y0 - 2 * R, 0)
    // Inverted over the top: heading has turned half the circle.
    expect(Math.abs(top.heading % (Math.PI * 2))).toBeCloseTo(Math.PI, 1)
  })

  it('half-rolls over the wingover top and rolls out by the dive', () => {
    expect(opposingDisplay(0.677, W, H).bank).toBe(0)
    expect(opposingDisplay(0.73, W, H).bank).toBeCloseTo(Math.PI, 6)
    expect(opposingDisplay(0.765 - 1e-6, W, H).bank).toBeCloseTo(Math.PI * 2, 2)
  })

  it('climbs out steady 60–61 %, rolls 61–62.5 %, exits in normal attitude', () => {
    // First stretch of the climb: attitude HELD (Martin: hlavou nahoru).
    expect(opposingDisplay(0.92, W, H).bank).toBeCloseTo(Math.PI * 3, 6)
    expect(opposingDisplay(0.985, W, H).bank).toBeCloseTo(Math.PI * 3, 6)
    const mid = opposingDisplay(1.05, W, H).bank
    expect(mid).toBeGreaterThan(Math.PI * 3)
    expect(mid).toBeLessThan(Math.PI * 5)
    const done = opposingDisplay(1.13, W, H)
    expect(done.bank).toBeCloseTo(Math.PI * 5, 6)
    expect(poseFold(done.bank).flipY).toBe(true) // upright on the left-up run
  })

  it('fires flares from 61 % to the exit and is clean off-screen by it', () => {
    for (const t of [0.1, 0.3, 0.6, 0.75, 0.85, 0.95]) {
      expect(opposingDisplay(t, W, H).flare).toBe(0)
    }
    expect(opposingDisplay(1.0, W, H).flare).toBe(1)
    expect(opposingDisplay(1.15, W, H).flare).toBe(1)
    const out = opposingDisplay(DISPLAY_T.exit, W, H)
    expect(out.y).toBeLessThan(0)
    expect(out.x).toBeLessThan(W / 2)
  })

  it('stays inside the canvas width on a tall portrait screen', () => {
    for (let t = 0; t <= DISPLAY_T.exit + 1e-4; t += 0.005) {
      const p = opposingDisplay(t, 390, 844)
      expect(p.x).toBeLessThan(395)
    }
  })
})

describe('l159 pose grid', () => {
  it('covers the full el ladder × az fan, poses normalized to the length', () => {
    expect(L159_POSE_GRID.length).toBe(L159_POSE_ELS.length)
    for (const row of L159_POSE_GRID) expect(row.length).toBe(L159_POSE_AZS.length)
    // The side view spans exactly 1 length; the nose-on view is narrower.
    const span = (rings: ReadonlyArray<ReadonlyArray<number>>): number => {
      let mn = Infinity
      let mx = -Infinity
      for (let i = 0; i < rings[0].length; i += 2) {
        mn = Math.min(mn, rings[0][i])
        mx = Math.max(mx, rings[0][i])
      }
      return mx - mn
    }
    const elZero = L159_POSE_ELS.indexOf(0)
    const az90 = L159_POSE_AZS.indexOf(90)
    const az0 = L159_POSE_AZS.indexOf(0)
    expect(span(L159_POSE_GRID[elZero][az90])).toBeCloseTo(1, 2)
    const noseOn = span(L159_POSE_GRID[elZero][az0])
    expect(noseOn).toBeGreaterThan(0.7)
    expect(noseOn).toBeLessThan(0.9)
    // Every el ladder frame at az 90 keeps the full length (the roll never
    // shrinks the jet).
    for (let e = 0; e < L159_POSE_ELS.length; e++) {
      expect(span(L159_POSE_GRID[e][az90]), `el ${L159_POSE_ELS[e]}`).toBeCloseTo(1, 2)
    }
  })

  it('anchors the az-90 ladder on the roll axis — the nose tip line', () => {
    const az90 = L159_POSE_AZS.indexOf(90)
    for (let e = 0; e < L159_POSE_ELS.length; e++) {
      const ring = L159_POSE_GRID[e][az90][0]
      let tipX = -Infinity
      let tipY = 0
      for (let i = 0; i < ring.length; i += 2) {
        if (ring[i] > tipX) {
          tipX = ring[i]
          tipY = ring[i + 1]
        }
      }
      expect(Math.abs(tipY), `el ${L159_POSE_ELS[e]} nose-tip offset`).toBeLessThan(0.06)
    }
  })

  it('ships the gear-down rear view for the landing beat', () => {
    expect(L159_REAR_GEAR.length).toBeGreaterThan(0)
    expect(L159_REAR_GEAR[0].length).toBeGreaterThan(60)
  })
})

describe('landingPose', () => {
  it('descends monotonically to the runway and stays down', () => {
    let prev = Infinity
    for (let t = 0; t < TOUCHDOWN; t += 0.01) {
      const { alt } = landingPose(t)
      expect(alt).toBeLessThanOrEqual(prev)
      prev = alt
    }
    expect(landingPose(0).alt).toBe(1)
    for (let t = TOUCHDOWN; t <= 1.0001; t += 0.05) {
      expect(landingPose(t).alt).toBe(0)
    }
  })

  it('moves forward continuously through touchdown', () => {
    let prev = -Infinity
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const { x } = landingPose(t)
      expect(x).toBeGreaterThanOrEqual(prev)
      prev = x
    }
    // No jump at the touchdown seam.
    expect(landingPose(TOUCHDOWN - 1e-9).x).toBeCloseTo(0, 6)
    expect(landingPose(TOUCHDOWN).x).toBeCloseTo(0, 6)
  })

  it('rolls out to a stop, nose settling', () => {
    expect(landingPose(1).speed).toBe(0)
    expect(landingPose(1).pitch).toBe(0)
    expect(landingPose(TOUCHDOWN).pitch).toBeGreaterThan(0)
  })
})
