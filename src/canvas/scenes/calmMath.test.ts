import { describe, expect, it } from 'vitest'
import {
  CALM,
  ISLAND,
  TREE_FINE_DEPTH,
  TREE_MAX_DEPTH,
  bloom,
  branchExtent,
  breath,
  buildTree,
  calmLight,
  rippleTrain,
  rippleTrainAt,
  stonePath,
  stoneRadius,
  stoneReveal,
  treeGrow,
  waterY,
} from './calmMath'

describe('calmLight', () => {
  it('opens in the dark and reaches full light before the run ends', () => {
    expect(calmLight(0).light).toBe(0)
    expect(calmLight(CALM.lightEnd).light).toBe(1)
  })

  it('holds the warm blush back until the light is well up', () => {
    expect(calmLight(0.5).blush).toBe(0)
    expect(calmLight(0.5).light).toBeGreaterThan(0.5)
    expect(calmLight(1).blush).toBe(1)
  })

  it('both phases rise monotonically', () => {
    let prevL = -1
    let prevB = -1
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const { light, blush } = calmLight(t)
      expect(light).toBeGreaterThanOrEqual(prevL)
      expect(blush).toBeGreaterThanOrEqual(prevB)
      prevL = light
      prevB = blush
    }
  })
})

describe('breath', () => {
  it('rests exhaled at time 0 — the reduced-motion frame is complete', () => {
    expect(breath(0)).toBe(0)
  })

  it('peaks fully inhaled mid-cycle and repeats each period', () => {
    expect(breath(CALM.breathPeriod / 2)).toBe(1)
    expect(breath(CALM.breathPeriod)).toBeCloseTo(0, 5)
    expect(breath(CALM.breathPeriod * 2.5)).toBe(1)
  })

  it('stays within 0..1', () => {
    for (let s = 0; s < CALM.breathPeriod * 2; s += 0.1) {
      const b = breath(s)
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThanOrEqual(1)
    }
  })
})

describe('stoneReveal', () => {
  it('keeps the water empty before the first step', () => {
    for (let i = 0; i < CALM.stones; i++) {
      expect(stoneReveal(i, CALM.stoneStart - 0.01)).toBe(0)
      expect(rippleTrain(i, CALM.stoneStart - 0.01)).toHaveLength(0)
    }
  })

  it('surfaces the stones strictly one after another — krok za krokem', () => {
    for (let t = 0; t <= 1.0001; t += 0.01) {
      for (let i = 1; i < CALM.stones; i++) {
        expect(stoneReveal(i - 1, t)).toBeGreaterThanOrEqual(stoneReveal(i, t))
      }
    }
  })

  it('has every stone settled before the scene hands over', () => {
    for (let i = 0; i < CALM.stones; i++) {
      expect(stoneReveal(i, CALM.stoneEnd + CALM.stoneRamp)).toBe(1)
    }
  })
})

describe('rippleTrainAt', () => {
  it('is silent before the drop and after the disturbance has passed', () => {
    expect(rippleTrainAt(-0.01)).toHaveLength(0)
    expect(rippleTrainAt(CALM.rippleLife + 4 * 0.016)).toHaveLength(0)
  })

  it('launches the leading ring first, the trailing rings on a delay', () => {
    const early = rippleTrainAt(0.01)
    expect(early.length).toBe(1)
    const mid = rippleTrainAt(CALM.rippleLife * 0.5)
    expect(mid.length).toBeGreaterThan(2)
  })

  it('keeps the train ordered — every trailing ring tighter than its leader', () => {
    const rings = rippleTrainAt(CALM.rippleLife * 0.6)
    for (let j = 1; j < rings.length; j++) {
      expect(rings[j].r).toBeLessThan(rings[j - 1].r)
    }
  })

  it('spends its energy as it spreads — amplitude falls off with the run-out', () => {
    const young = rippleTrainAt(CALM.rippleLife * 0.25)[0]
    const old = rippleTrainAt(CALM.rippleLife * 0.85)[0]
    expect(old.r).toBeGreaterThan(young.r)
    expect(old.a).toBeLessThan(young.a)
    expect(old.lw).toBeLessThan(young.lw) // and the crest thins out
  })
})

describe('stonePath', () => {
  const aspect = 1.6
  const path = stonePath(aspect)

  it('walks from the meditator island up-left toward the tree island', () => {
    let prevD = -1
    let prevX = 2
    for (const { x, d } of path) {
      expect(d).toBeGreaterThan(prevD)
      expect(x).toBeLessThan(prevX) // always stepping toward the island
      expect(x).toBeGreaterThan(0.3)
      expect(x).toBeLessThan(0.75)
      prevD = d
      prevX = x
    }
    expect(path).toHaveLength(CALM.stones)
  })

  it('keeps the slant stride constant relative to the stones it separates', () => {
    const screen = path.map(({ x, d }) => ({ px: x * aspect, py: waterY(d), r: stoneRadius(d) }))
    const strides: number[] = []
    for (let i = 1; i < screen.length; i++) {
      const gap = Math.hypot(screen[i].px - screen[i - 1].px, screen[i].py - screen[i - 1].py)
      strides.push(gap / ((screen[i].r + screen[i - 1].r) / 2))
    }
    const first = strides[0]
    for (const s of strides) {
      expect(s).toBeGreaterThan(first * 0.93)
      expect(s).toBeLessThan(first * 1.07)
    }
  })

  it('stops short of the tree island — the path arrives, never overshoots', () => {
    const last = path[path.length - 1]
    expect(last.d).toBeLessThan(ISLAND.d)
    expect(last.x).toBeGreaterThan(ISLAND.x) // lands at the right shore
  })
})

describe('buildTree', () => {
  const tree = buildTree(7)

  it('is deterministic — the same seed grows the same tree', () => {
    expect(buildTree(7)).toEqual(tree)
  })

  it('starts from a single trunk and branches richly', () => {
    expect(tree[0].depth).toBe(0)
    expect(tree[0].birth).toBe(0)
    expect(tree.length).toBeGreaterThan(40)
  })

  it('keeps every branch inside a sane canopy and always climbing', () => {
    for (const b of tree) {
      expect(Math.abs(b.x1)).toBeLessThan(2.4)
      expect(b.y1).toBeGreaterThan(b.y0) // clamped angles: no droop
      expect(b.y1).toBeLessThan(3.1)
      expect(b.depth).toBeLessThanOrEqual(TREE_MAX_DEPTH)
    }
  })

  it('tapers: every branch is thinner at the tip, twigs thinner than boughs', () => {
    for (const b of tree) {
      expect(b.w1).toBeGreaterThan(0)
      expect(b.w1).toBeLessThan(b.w0)
    }
    const trunk = tree[0]
    const twig = tree.find((b) => b.depth === TREE_MAX_DEPTH)
    expect(twig).toBeDefined()
    expect(twig!.w0).toBeLessThan(trunk.w1)
  })

  it('puts blossoms only on the outer twigs', () => {
    for (const b of tree) expect(b.leaf).toBe(b.depth === TREE_MAX_DEPTH)
    expect(tree.some((b) => b.leaf)).toBe(true)
  })

  it('stands pre-grown through the base depths — the old tree is simply there', () => {
    for (const b of tree) {
      if (b.depth < TREE_FINE_DEPTH) expect(branchExtent(b, 0)).toBe(1)
      else expect(branchExtent(b, 0)).toBe(0)
    }
  })

  it('extends the fine outgrowth in staggered waves, complete at full growth', () => {
    for (const b of tree) {
      if (b.depth >= TREE_FINE_DEPTH) expect(branchExtent(b, b.birth)).toBe(0)
      expect(branchExtent(b, 1)).toBeCloseTo(1, 6)
    }
    // Depth-4 shoots lead; the finest twigs finish last.
    const d4 = tree.find((b) => b.depth === TREE_FINE_DEPTH)!
    const d6 = tree.find((b) => b.depth === TREE_MAX_DEPTH)!
    expect(branchExtent(d4, 0.3)).toBeGreaterThan(branchExtent(d6, 0.3))
  })
})

describe('treeGrow', () => {
  it('waits for the healing to begin, fully grown before the end', () => {
    expect(treeGrow(CALM.treeStart)).toBe(0)
    expect(treeGrow(CALM.treeEnd)).toBe(1)
  })
})

describe('bloom', () => {
  it('flowers only once the fine growth is under way, complete before the hand-off', () => {
    expect(bloom(0.7)).toBe(0)
    expect(bloom(0.98)).toBe(1)
    expect(bloom(0.85)).toBeGreaterThan(0)
    expect(bloom(0.85)).toBeLessThan(1)
  })
})
