/**
 * CONTACT — the finale (chapter 09, "Now"): after the dev city dissolves,
 * the whole journey settles into one breathing COSMIC BLOOM — a galaxy of
 * thousands of coloured particles floating in a living nebula, where the
 * card ("The next world could be yours" + the bracketed email) lands.
 * Rev3 after Martin's review: no black hole — the centre is FULL (a bright
 * galactic nucleus), the sky is a colourful nebula, and everything is
 * CONNECTED (a constellation web ties the outer suns to each other and to
 * the bloom; the cursor links into it like a node — the BTC scene's "you
 * are a node" carried forward).
 *
 * The colour IS the story: the bloom is ringed by the palette of the worlds
 * just lived — gold (origin) at the top, then amber (sky), cyan (calm),
 * bitcoin-orange and magenta (dev) clockwise back to gold — the journey
 * circling the "now" in its centre. A white-hot nucleus lifts it; nebula
 * clouds in the same family breathe across the whole frame; bright strands
 * carry thin radial rays and occasional cross-shaped sparkles.
 *
 * Back to front: indigo-violet space + nebula clouds + film-static speckle
 * (lazy noise tile) + two star layers; the constellation web + memory suns;
 * the bloom (~16k dots — per-dot randoms pre-baked into Float32Arrays so
 * the frame cost stays pure arithmetic + fillRect); coloured spores; the
 * warm nucleus; the visitor's light + node links under the cursor.
 *
 * The bloom is a SPIRAL GALAXY — every strand is a streamline curved by a
 * shared pre-baked twist (real trig at bake time, lookups per frame) and a
 * two-arm density pattern winds into arms around a QUIET nucleus (the arms
 * carry the mass, not the centre). NOTHING in the scene is a drawn line: no
 * webs, rays or rings — dots and glows only. It BREATHES at meditation pace
 * with a wave travelling round the arms, a heartbeat front rolls through
 * every ~13 s, and it cruises through a fly-through dust cluster. Blooms in
 * from a seed across the last scroll stretch (bloomReach/bloomAlpha on
 * `localT`); complete frozen at time 0.
 *
 * Rev8 (Martin): the cursor is INERT — the breathing spiral is the whole
 * experience; the earlier gravitational-wave interaction was removed. The
 * scene ignores `cfg.pointer` entirely.
 */

import type { Renderer } from '../types'
import {
  clamp01,
  drawGlow,
  drawStars,
  fillVerticalGradient,
  hash1,
  mixHex,
  rgba,
  smoothstep,
} from '../toolkit'
import {
  CONTACT,
  DUST,
  STORY_SEGMENTS,
  bloomAlpha,
  bloomReach,
  breath,
  breathWave,
  dust,
  filamentAngle,
  filamentGlow,
  petalReach,
  pulse,
  spore,
  storyMix,
} from './contactMath'

/** The story wheel's colours, clockwise from the top: origin gold → sky
 *  amber → calm cyan → bitcoin orange → dev magenta (accents of the site). */
const STORY_COLORS = ['#f5c451', '#ffb000', '#35d0e0', '#f7931a', '#e0459b'] as const

/** The amber through-line, as the nucleus at the bloom's heart. */
const EMBER = '#ffb000'

/** Nebula cloud palette — the story colours joined by deep space violets
 *  and blues so the sky reads cosmic, not candy. */
const NEBULA_COLORS = [
  '#5b3aa8',
  '#2a4bd8',
  '#35d0e0',
  '#e0459b',
  '#f5c451',
  '#f7931a',
  '#3a2a78',
] as const

/** Petal-profile seed — picked for a pleasing lobe layout (wide lobes on
 *  the horizontal, valleys off-axis, like the reference's winged burst). */
const PETAL_SEED = 7

/** The bloom is wider than tall — it fills a widescreen frame. */
const KX = 1.3
const KY = 0.95

/** The spiral galaxy (rev6): total twist from nucleus to tip (radians),
 *  the twist's radial exponent, and the two-arm density pattern. Strands
 *  are streamlines — every one curves the same way, so the whole field
 *  winds into arms instead of radiating from a centre. */
const SPIRAL_TWIST = 3.1
const SPIRAL_PITCH = 0.75
const ARMS = 2
const ARM_PHASE = 0.6

/** Memory suns scattered across the frame — constellation nodes. */
const SUNS = 26

// --- Speckle ground -------------------------------------------------------
// Dense film-static (the reference's ground). Painting thousands of grains
// per frame is waste — bake one tile lazily (first frame, DOM available
// there) and tile it. Deterministic per session: it reads as texture.
let speckleTile: HTMLCanvasElement | null = null
let specklePattern: CanvasPattern | null = null

function ensureSpeckle(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (specklePattern) return specklePattern
  if (!speckleTile) {
    const size = 280
    speckleTile = document.createElement('canvas')
    speckleTile.width = size
    speckleTile.height = size
    const t = speckleTile.getContext('2d')
    if (!t) return null
    for (let i = 0; i < 1500; i++) {
      const x = hash1(i * 3.1 + 0.7) * size
      const y = hash1(i * 7.9 + 2.3) * size
      const v = hash1(i * 13.7 + 5.1)
      const s = v > 0.93 ? 1.6 : 1
      t.fillStyle = `rgba(${170 + Math.round(v * 70)},${175 + Math.round(v * 68)},${186 + Math.round(v * 62)},${(0.05 + v * 0.3).toFixed(3)})`
      t.fillRect(x, y, s, s)
    }
  }
  specklePattern = ctx.createPattern(speckleTile, 'repeat')
  return specklePattern
}

// --- Pre-baked randomness --------------------------------------------------
// ~16k dots × several hash lookups per frame would burn the budget on
// Math.sin. Bake every per-filament / per-dot random ONCE (deterministic,
// so the field never flickers); the inner loop is then pure arithmetic.
const FIL_STRIDE = 4 // bright, jitter, inkPick, coreScale
// s (position along strand), cos/sin of the pre-baked spiral rotation
// (twist + wobble — real trig at bake time, lookups in the loop), radial
// jit, alpha var.
const DOT_STRIDE = 5
let filRnd: Float32Array | null = null
let dotRnd: Float32Array | null = null

function ensureRnd(): void {
  if (filRnd && dotRnd) return
  const n = CONTACT.filaments
  const m = CONTACT.dots
  filRnd = new Float32Array(n * FIL_STRIDE)
  dotRnd = new Float32Array(n * m * DOT_STRIDE)
  for (let i = 0; i < n; i++) {
    filRnd[i * FIL_STRIDE] = hash1(i * 3.3 + 0.9)
    filRnd[i * FIL_STRIDE + 1] = hash1(i * 6.1 + 4.2)
    filRnd[i * FIL_STRIDE + 2] = hash1(i * 9.7 + 6.6)
    filRnd[i * FIL_STRIDE + 3] = hash1(i * 12.7 + 8.8)
    for (let j = 0; j < m; j++) {
      const k = (i * m + j) * DOT_STRIDE
      const s = clamp01((j + hash1(i * 17.3 + j * 7.7)) / m)
      const d =
        (hash1(i * 29.1 + j * 11.3 + 1.7) - 0.5) * 0.03 +
        SPIRAL_TWIST * Math.pow(s, SPIRAL_PITCH)
      dotRnd[k] = s
      dotRnd[k + 1] = Math.cos(d)
      dotRnd[k + 2] = Math.sin(d)
      dotRnd[k + 3] = hash1(i * 41.7 + j * 5.9)
      dotRnd[k + 4] = hash1(i * 53.9 + j * 3.1)
    }
  }
}

export const renderContact: Renderer = (ctx, alpha, t, time, cfg) => {
  if (alpha <= 0.002) return
  const { w, h } = cfg

  // --- Space: indigo-violet depth + the galactic plane + nebula clouds ----
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      [0, '#0a0820'],
      [0.5, '#0c0f28'],
      [1, '#120a24'],
    ],
    alpha,
  )
  const maxDim = Math.max(w, h)
  // The Milky Way: a soft diagonal band of light across the whole frame —
  // one wide violet wash with a narrower warm core inside it.
  ctx.save()
  ctx.translate(w * 0.5, h * 0.42)
  ctx.rotate(-0.32)
  const bandH = h * 0.3
  const band = ctx.createLinearGradient(0, -bandH, 0, bandH)
  band.addColorStop(0, 'rgba(143,159,216,0)')
  band.addColorStop(0.5, rgba('#8f9fd8', 0.085 * alpha))
  band.addColorStop(1, 'rgba(143,159,216,0)')
  ctx.fillStyle = band
  ctx.fillRect(-w * 1.2, -bandH, w * 2.4, bandH * 2)
  const core = ctx.createLinearGradient(0, -bandH * 0.35, 0, bandH * 0.35)
  core.addColorStop(0, 'rgba(232,226,255,0)')
  core.addColorStop(0.5, rgba('#e8e2ff', 0.06 * alpha))
  core.addColorStop(1, 'rgba(232,226,255,0)')
  ctx.fillStyle = core
  ctx.fillRect(-w * 1.2, -bandH * 0.35, w * 2.4, bandH * 0.7)
  ctx.restore()
  // Nebula clouds — breathing, adrift barely faster than the eye notices.
  for (let i = 0; i < NEBULA_COLORS.length; i++) {
    const bx =
      (0.1 + hash1(i * 7.1 + 2.4) * 0.8) * w + Math.sin(time * 0.008 + i * 2.1) * w * 0.015
    const by =
      (0.08 + hash1(i * 11.7 + 5.9) * 0.84) * h + Math.cos(time * 0.006 + i * 1.3) * h * 0.012
    const brad = (0.28 + hash1(i * 5.3 + 8.1) * 0.32) * maxDim
    const bb = 0.75 + 0.25 * breath(time, hash1(i * 3.9))
    drawGlow(ctx, bx, by, brad, NEBULA_COLORS[i], alpha * 0.085 * bb)
  }
  // Film-static speckle, drifting slowly — the farthest parallax layer.
  const speckle = ensureSpeckle(ctx)
  if (speckle) {
    const off = (time * 1.1) % 280
    ctx.save()
    ctx.translate(-off, -off * 0.4)
    ctx.globalAlpha = alpha * 0.65
    ctx.fillStyle = speckle
    ctx.fillRect(0, 0, w + 280, h + 280)
    ctx.restore()
  }
  // Two star layers sliding at different rates — the cruise's parallax.
  drawStars(ctx, {
    w, h, count: 150, seed: 12, alpha: alpha * 0.6, size: 1.4,
    time, twinkle: 0.55, xShift: time * 0.0016, yShift: time * 0.0005,
  })
  drawStars(ctx, {
    w, h, count: 70, seed: 31, alpha: alpha * 0.45, size: 2,
    time, twinkle: 0.35, color: '#cfe0ff', xShift: time * 0.0034, yShift: time * 0.001,
  })

  const bloomA = bloomAlpha(t)
  const bloomR = bloomReach(t)
  const B = breath(time)

  // Geometry: the nucleus sits RIGHT of centre (the card owns the left) and
  // the reach spans the whole frame, tips past the edges. NO pointer
  // interaction (rev8 — Martin: the breathing spiral is the experience on
  // its own; the cursor gravity was removed).
  // On phones the card drops to the bottom, so the spiral centres horizontally
  // and lifts into the free space between the top nav and the copy (Martin's
  // mobile call); desktop keeps the nucleus right-of-centre for the left card.
  const mobile = w < 720
  const cx = mobile ? w * 0.5 : w * 0.6
  const cy = mobile ? h * 0.23 : h * 0.48
  const R = Math.min(w, h) * 0.85

  // --- The star cluster the finale cruises through -------------------------
  // Full-screen depth dust on a slow approach: far motes are pinpricks, near
  // ones swell, streak radially and slip past the frame edge. Drawn in two
  // passes — the far half behind the bloom, the near half in front — so the
  // whole screen has depth, not just a centred object. Tied to `alpha`
  // (not the bloom), so the flight is on the moment the scene owns pixels.
  const drawDust = (near: boolean) => {
    ctx.save()
    for (let i = 0; i < DUST.count; i++) {
      const mote = dust(i, time)
      if (mote.z < 0.35 !== near) continue
      const persp = 0.22 + mote.z * 1.1
      const sx = cx + (mote.ux * w * 0.62) / persp
      const sy = cy + (mote.uy * h * 0.62) / persp
      if (sx < -20 || sx > w + 20 || sy < -20 || sy > h + 20) continue
      // Born dim at the far plane, gone right before the camera.
      const fade = smoothstep(1, 0.92, mote.z) * Math.min(1, mote.z / 0.07)
      const a = alpha * (0.22 + (1 - mote.z) * 0.55) * fade * (0.5 + 0.5 * mote.jit)
      if (a <= 0.008) continue
      const col =
        mote.tint > 0.78
          ? mixHex(STORY_COLORS[Math.floor(mote.tint * 40) % STORY_COLORS.length], '#ffffff', 0.35)
          : mote.tint > 0.4
            ? '#dfe8ff'
            : '#aab8dd'
      const size = (0.7 + (1 - mote.z) * 2.2) * (0.6 + 0.4 * mote.jit)
      ctx.globalAlpha = Math.min(1, a)
      const streak = (1 - mote.z) ** 2 * 12
      if (streak > 2) {
        // Near motes elongate away from the flight axis — passing by.
        const ddx = sx - cx
        const ddy = sy - cy
        const dl = Math.hypot(ddx, ddy) || 1
        ctx.strokeStyle = col
        ctx.lineWidth = Math.min(2, size * 0.7)
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(sx + (ddx / dl) * streak, sy + (ddy / dl) * streak)
        ctx.stroke()
      } else {
        ctx.fillStyle = col
        ctx.fillRect(sx, sy, size, size)
      }
    }
    ctx.restore()
  }
  drawDust(false)

  // --- Memory suns: the story's colours scattered over the whole frame ----
  // Slowly adrift, twinkling. NO lines of any kind (rev7 — Martin): the
  // connection is carried by colour and motion, not by drawn wires.
  ctx.save()
  for (let i = 0; i < SUNS; i++) {
    const x =
      (0.04 + hash1(i * 9.7 + 1.1) * 0.92) * w + Math.sin(time * 0.05 + i * 2.2) * w * 0.008
    const y =
      (0.05 + hash1(i * 4.3 + 6.2) * 0.9) * h + Math.cos(time * 0.04 + i * 1.4) * h * 0.008
    if (x < 4 || x > w - 4 || y < 4 || y > h - 4) continue
    const col = STORY_COLORS[i % STORY_COLORS.length]
    const size = 1 + hash1(i * 5.3 + 3.3) * 1.5
    const tw = 0.55 + 0.45 * Math.sin(time * (0.3 + hash1(i * 2.9) * 0.5) + i)
    ctx.fillStyle = rgba(col, alpha * Math.max(bloomA, 0.25) * 0.55 * tw)
    ctx.fillRect(x, y, size, size)
    ctx.fillStyle = rgba(col, alpha * Math.max(bloomA, 0.25) * 0.14 * tw)
    ctx.fillRect(x - 1.5, y - 1.5, size + 3, size + 3)
  }
  ctx.restore()

  if (bloomA <= 0.004) return

  // --- The heartbeat -------------------------------------------------------
  // Nothing is drawn (rev7 — no lines, no rings): the pulse lives purely as
  // a brightening front rolling through the fur (per-dot boost below).
  const pl = pulse(time)
  const pulseFront = CONTACT.core + pl.r01 * (1.3 - CONTACT.core)
  const beatOn = pl.a > 0.004

  // --- The bloom: ~16k dots of coloured fur, alive to the centre -----------
  ensureRnd()
  const fr = filRnd
  const dr = dotRnd
  if (!fr || !dr) return
  const rot = time * 0.012
  const n = CONTACT.filaments
  const m = CONTACT.dots
  ctx.save()
  for (let i = 0; i < n; i++) {
    const fi = i * FIL_STRIDE
    const baseAng = filamentAngle(i, n)
    const ang = baseAng + rot
    // Per-filament personality.
    const bright = 0.5 + fr[fi] * 0.5
    const jitter = 0.86 + fr[fi + 1] * 0.28
    // Breath: mostly the shared tide, part traveling wave around the ring.
    const br = 0.62 * B + 0.38 * breathWave(time, baseAng)
    // Two-arm density pattern: strands near an arm's base angle are strong
    // and long; after the shared twist the pattern winds into spiral arms.
    const armW = Math.pow(0.5 + 0.5 * Math.cos(ARMS * (baseAng + ARM_PHASE)), 1.5)
    const armGain = 0.4 + 1.0 * armW
    // The petal profile softens to gentle variance — the arms carry the
    // large-scale structure now.
    const petal = 0.7 + 0.3 * petalReach(baseAng, PETAL_SEED)
    const reach =
      R * petal * jitter * (0.74 + 0.32 * br) * bloomR * (0.85 + 0.25 * armW)
    const cosA = Math.cos(ang)
    const sinA = Math.sin(ang)
    // The story wheel: colour from the strand's base angle, blended toward
    // its neighbour so the ring is a continuous journey, not five slices.
    const { seg, t: segT } = storyMix(baseAng)
    const base = mixHex(STORY_COLORS[seg], STORY_COLORS[(seg + 1) % STORY_SEGMENTS], segT)
    const pick = fr[fi + 2]
    const ink =
      pick < 0.2 ? mixHex(base, '#ffffff', 0.45) : pick > 0.9 ? mixHex(base, '#10162a', 0.35) : base
    const rim = mixHex(base, '#ffffff', 0.55)
    // Per-filament shimmer keeps the mass alive without per-dot trig; the
    // arm pattern rides the same channel (inter-arm strands stay faint).
    const shimmer = 0.85 + 0.15 * Math.sin(time * 0.9 + i * 1.7)
    const breathGlow = (0.7 + 0.4 * br) * shimmer * armGain
    // Ragged nucleus: each strand starts a hair off dead centre.
    const core = CONTACT.core * (0.82 + fr[fi + 3] * 0.36)
    // (Rev7: NO rays — nothing line-like survives; texture comes from the
    // dots alone.)
    // A gently lifted heart first; switch to the strand's ink further out.
    ctx.fillStyle = rim
    let switched = false
    for (let j = 0; j < m; j++) {
      const k = (i * m + j) * DOT_STRIDE
      const s = dr[k]
      if (!switched && s > 0.22) {
        ctx.fillStyle = ink
        switched = true
      }
      const g = filamentGlow(s)
      if (g <= 0.01) continue
      const u = core + (1 - core) * s
      // The spiral: each dot's twist is pre-baked (cos/sin lookups) — the
      // strand curves like a galaxy-arm streamline, no trig in the loop.
      const cd = dr[k + 1]
      const sd = dr[k + 2]
      const ca = cosA * cd - sinA * sd
      const sa = sinA * cd + cosA * sd
      const rr = u * reach * (1 + (dr[k + 3] - 0.5) * 0.05)
      const x = cx + ca * rr * KX
      const y = cy + sa * rr * KY
      // The heartbeat rolls through the fur as a brightening front.
      const beat = beatOn ? 1 + 1.7 * pl.a * Math.exp(-(((u - pulseFront) / 0.07) ** 2)) : 1
      const a = alpha * bloomA * bright * g * breathGlow * beat * (0.65 + 0.35 * dr[k + 4])
      const size = 0.8 + g * 1.3
      if (a <= 0.006) continue
      ctx.globalAlpha = Math.min(1, a)
      ctx.fillRect(x, y, size, size)
      // Soft haze double for a sparse subset — the fur's blur.
      if (((i + j) & 3) === 0) {
        ctx.globalAlpha = Math.min(1, a * 0.3)
        ctx.fillRect(x - size, y - size, size * 3, size * 3)
      }
      // Rare cross-shaped sparkles on bright strands — small magic.
      if (dr[k + 4] > 0.991 && bright > 0.78) {
        ctx.globalAlpha = Math.min(1, a * 0.85)
        ctx.fillRect(x - size * 2, y + size * 0.15, size * 5, size * 0.7)
        ctx.fillRect(x + size * 0.15, y - size * 2, size * 0.7, size * 5)
      }
    }
  }
  ctx.restore()

  // --- Spores: coloured stardust the bloom lets go of ----------------------
  ctx.save()
  for (let i = 0; i < CONTACT.spores; i++) {
    const sp = spore(i, time)
    const rr = sp.r * R * bloomR
    const x = cx + Math.cos(sp.ang) * rr * KX
    const y = cy + Math.sin(sp.ang) * rr * KY
    if (x < 0 || x > w || y < 0 || y > h) continue
    const a = alpha * bloomA * sp.a * 0.55
    if (a <= 0.006) continue
    const { seg, t: segT } = storyMix(sp.ang)
    ctx.fillStyle = mixHex(STORY_COLORS[seg], STORY_COLORS[(seg + 1) % STORY_SEGMENTS], segT)
    ctx.globalAlpha = a
    const s = 0.9 + hash1(i * 8.3 + 2.9) * 1.2
    ctx.fillRect(x, y, s, s)
  }
  ctx.restore()

  // Near half of the cluster passes in FRONT of the bloom — real depth.
  drawDust(true)

  // --- The nucleus: the amber through-line, QUIET at the heart (rev7 — the
  // arms carry the light now). Warm-white, not raw amber — a low-alpha
  // amber on black muddies to brown.
  drawGlow(
    ctx,
    cx,
    cy,
    R * 0.18 * bloomR * (0.85 + 0.3 * B),
    mixHex(EMBER, '#fff6e0', 0.5),
    alpha * bloomA * (0.05 + 0.035 * B),
  )
  // A small warm weld at dead centre — the strands converge around it and
  // the last few pixels must glow, not read as a pinhole.
  drawGlow(ctx, cx, cy, R * 0.035 * bloomR, '#fff2d8', alpha * bloomA * (0.16 + 0.08 * B))
}
