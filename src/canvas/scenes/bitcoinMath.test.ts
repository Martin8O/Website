import { describe, expect, it } from 'vitest'
import {
  BTC,
  CAM,
  PAD,
  blockWave,
  buildEdges,
  buildNodes,
  camFromPointer,
  coinPeers,
  cursorBoost,
  heartbeat,
  netDist,
  nodeDegrees,
  nodeLit,
  project,
  pulsePhase,
  storyWaveR,
  terrainHeight,
  traceReveal,
  waveBand,
} from './bitcoinMath'

describe('terrainHeight', () => {
  it('is deterministic and stays in a sane range', () => {
    for (let i = 0; i < 400; i++) {
      const x = -1.7 + (i % 20) * 0.17
      const z = Math.floor(i / 20) * 0.05
      const h = terrainHeight(x, z)
      expect(h).toBe(terrainHeight(x, z))
      expect(h).toBeGreaterThanOrEqual(0)
      expect(h).toBeLessThanOrEqual(0.6)
    }
  })

  it('flattens a clearing around the pad and raises a far wall', () => {
    expect(terrainHeight(PAD.x, PAD.z)).toBeLessThan(0.02)
    let far = 0
    let near = 0
    for (let i = 0; i < 40; i++) {
      const x = -1.6 + i * 0.08
      far = Math.max(far, terrainHeight(x, 0.95))
      near = Math.max(near, terrainHeight(x, 0.1))
    }
    expect(far).toBeGreaterThan(0.25)
    expect(near).toBeLessThan(0.12)
  })
})

describe('project', () => {
  const cam = camFromPointer(0, 0, 0)

  it('puts the orbit centre on the vertical axis and the ground below it', () => {
    const p = project({ x: 0, y: 0, z: CAM.orbitZ }, cam)
    expect(p.nx).toBeCloseTo(0, 6)
    expect(p.ny).toBeGreaterThan(0)
  })

  it('shrinks with depth and lifts far points toward the horizon', () => {
    const near = project({ x: 0, y: 0, z: 0.1 }, cam)
    const far = project({ x: 0, y: 0, z: 1 }, cam)
    expect(far.s).toBeLessThan(near.s)
    expect(far.ny).toBeLessThan(near.ny)
  })

  it('raises higher world points up the screen', () => {
    const ground = project({ x: 0.3, y: 0, z: 0.8 }, cam)
    const peak = project({ x: 0.3, y: 0.4, z: 0.8 }, cam)
    expect(peak.ny).toBeLessThan(ground.ny)
  })

  it('yaw is horizontally symmetric', () => {
    const l = project({ x: -0.5, y: 0, z: 0.5 }, camFromPointer(-1, 0, 1))
    const r = project({ x: 0.5, y: 0, z: 0.5 }, camFromPointer(1, 0, 1))
    expect(l.nx).toBeCloseTo(-r.nx, 6)
    expect(l.ny).toBeCloseTo(r.ny, 6)
  })
})

describe('camFromPointer', () => {
  it('rests at the base pitch with no pointer and clamps extremes', () => {
    const rest = camFromPointer(0, 0, 0)
    expect(rest.yaw).toBe(0)
    expect(rest.pitch).toBe(CAM.basePitch)
    const wild = camFromPointer(9, -9, 1)
    expect(Math.abs(wild.yaw)).toBeLessThanOrEqual(0.13)
    expect(Math.abs(wild.pitch - CAM.basePitch)).toBeLessThanOrEqual(0.055)
  })
})

describe('network layout', () => {
  const nodes = buildNodes()
  const edges = buildEdges(nodes)

  it('places the full population deterministically', () => {
    expect(nodes.length).toBe(64)
    expect(buildNodes()).toEqual(nodes)
  })

  it('fits the denser rev12 population with the smaller separation', () => {
    const many = buildNodes(96, 11, 0.115)
    expect(many.length).toBe(96)
  })

  it('per-node k keeps peripheral peers sparsely linked', () => {
    const many = buildNodes(96, 11, 0.115)
    const e = buildEdges(many, (i) => (i < 64 ? 3 : 1))
    const deg = nodeDegrees(many.length, e)
    expect(Math.min(...deg)).toBeGreaterThanOrEqual(1)
    // Hubs exist: someone collects clearly more links than the floor.
    expect(Math.max(...deg)).toBeGreaterThanOrEqual(6)
    expect(deg.reduce((a, b) => a + b, 0)).toBe(e.length * 2)
  })

  it('keeps peers apart and off the clearing', () => {
    for (let i = 0; i < nodes.length; i++) {
      expect(nodes[i].dist).toBeGreaterThanOrEqual(0.24)
      for (let j = i + 1; j < nodes.length; j++) {
        expect(netDist(nodes[i].x, nodes[i].z, nodes[j].x, nodes[j].z)).toBeGreaterThanOrEqual(0.14)
      }
    }
  })

  it('links every peer, with no self-loops or duplicates', () => {
    const seen = new Set<string>()
    const touched = new Set<number>()
    for (const e of edges) {
      expect(e.a).not.toBe(e.b)
      const key = e.a < e.b ? `${e.a}:${e.b}` : `${e.b}:${e.a}`
      expect(seen.has(key)).toBe(false)
      seen.add(key)
      touched.add(e.a)
      touched.add(e.b)
    }
    expect(touched.size).toBe(nodes.length)
  })

  it('nominates the coin peers nearest the pad', () => {
    const peers = coinPeers(nodes, 5)
    expect(peers.length).toBe(5)
    const worst = Math.max(...peers.map((j) => nodes[j].dist))
    for (let j = 0; j < nodes.length; j++) {
      if (!peers.includes(j)) expect(nodes[j].dist).toBeGreaterThanOrEqual(worst)
    }
  })
})

describe('story choreography', () => {
  it('the impact wave is absent before 87 %, then sweeps the whole valley', () => {
    expect(storyWaveR(0)).toBeNull()
    expect(storyWaveR(BTC.impactT - 0.001)).toBeNull()
    expect(storyWaveR(BTC.impactT)).toBe(0)
    let prev = -1
    for (let t = BTC.impactT; t <= BTC.waveEndT; t += 0.01) {
      const r = storyWaveR(t)
      expect(r).not.toBeNull()
      expect(r!).toBeGreaterThanOrEqual(prev)
      prev = r!
    }
    expect(storyWaveR(BTC.waveEndT)).toBeCloseTo(BTC.storyWaveMax, 6)
    expect(storyWaveR(1)).toBeCloseTo(BTC.storyWaveMax, 6)
  })

  it('peers stay dark until the front reaches them, then hold', () => {
    const nodes = buildNodes()
    for (const n of nodes) {
      expect(nodeLit(n.dist, BTC.impactT - 0.01)).toBe(0)
      expect(nodeLit(n.dist, BTC.waveEndT + 0.06)).toBe(1)
    }
    // Mid-sweep: near peers are on, far peers still dark.
    const mid = (BTC.impactT + BTC.waveEndT) / 2
    expect(nodeLit(0.3, mid)).toBe(1)
    expect(nodeLit(1.7, mid)).toBe(0)
  })

  it('waveBand honours a custom half-width', () => {
    expect(waveBand(0.5, 0.5, 0.2)).toBe(1)
    expect(waveBand(0.35, 0.5, 0.2)).toBeGreaterThan(0)
    expect(waveBand(0.35, 0.5)).toBe(0)
  })

  it('terrain trace-in runs hidden → drawn, outward, inside its window', () => {
    expect(traceReveal(0, 0)).toBe(0)
    expect(traceReveal(0, BTC.traceT1 + 0.07)).toBe(1)
    expect(traceReveal(2.3, BTC.traceT1 + 0.07)).toBe(1)
    expect(traceReveal(2.3, BTC.traceT0)).toBe(0)
    expect(traceReveal(0.2, 0.12)).toBeGreaterThan(traceReveal(1.8, 0.12))
    // The mountains stand complete before the impulse lands.
    expect(BTC.traceT1).toBeLessThan(BTC.impactT)
  })
})

describe('rhythm', () => {
  it('heartbeat is full at time 0 (reduced-motion frame) and bounded', () => {
    expect(heartbeat(0)).toBeCloseTo(1, 3)
    for (let s = 0; s < 8; s += 0.05) {
      const b = heartbeat(s)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(1)
    }
  })

  it('heartbeat repeats with its period', () => {
    expect(heartbeat(1.1)).toBeCloseTo(heartbeat(1.1 + BTC.beatPeriod), 6)
  })

  it('no block wave is in flight at time 0; radius grows monotonically', () => {
    expect(blockWave(0)).toBeNull()
    let prev = -1
    let seen = false
    for (let s = 3.5; s < 3.5 + BTC.waveTravel - 0.05; s += 0.1) {
      const wv = blockWave(s)
      if (!wv) continue
      seen = true
      expect(wv.r).toBeGreaterThan(prev)
      expect(wv.k).toBeGreaterThan(0)
      expect(wv.k).toBeLessThanOrEqual(1)
      prev = wv.r
    }
    expect(seen).toBe(true)
  })

  it('waveBand excites only a narrow travelling band', () => {
    expect(waveBand(0.5, 0.5)).toBe(1)
    expect(waveBand(0.5, 0.65)).toBe(0)
    expect(waveBand(0.44, 0.5)).toBeGreaterThan(0)
  })

  it('pulsePhase stays in [0,1) at any time', () => {
    for (let i = 0; i < 30; i++) {
      const ph = pulsePhase(i, 123.4)
      expect(ph).toBeGreaterThanOrEqual(0)
      expect(ph).toBeLessThan(1)
    }
  })
})

describe('cursorBoost', () => {
  it('peaks at the cursor, fades smoothly, dies beyond reach', () => {
    expect(cursorBoost(0, 100)).toBe(1)
    expect(cursorBoost(50, 100)).toBeGreaterThan(cursorBoost(120, 100))
    expect(cursorBoost(400, 100)).toBe(0)
    expect(cursorBoost(10, 0)).toBe(0)
  })
})
