/**
 * CALM — the healing world (chapter 06, "Selfhealing"): ulcerative colitis,
 * "lifelong" by every textbook, healed step by step. Built from Martin's own
 * material: the mojecestakezdravi.cz "krok za krokem" footprints become a
 * stepping-stone path across still water; his dandelion-seed hero image
 * becomes drifting seeds; his meditation reference (`meditace.jpg`, traced —
 * calmSilhouettes.ts) sits on a near island; and the site's message — a
 * "lifelong" diagnosis as a gift — becomes the light: the scene opens in
 * the sunset's night (enterFade holds it back past the landing's sundown)
 * and a new dawn slowly rises.
 *
 * Choreography (Martin directs in global HUD %; scene t = pos − 6.5): the
 * far islet left of centre carries an old, rich TREE under the rising
 * light — mirrored softly in the lake — and a near BANK bottom-right holds
 * the MEDITATOR, back to us, facing the light across the water (the
 * composition of the reference photo itself). The dusk airfield dims away
 * over 72–76 %; the stepping stones then surface one by one — constant
 * slant stride in perspective (calmMath.stonePath) — from the bank toward
 * the tree island; the aurora appears at 76 %, peaks at 79 % and dissolves
 * by 83 % while the tree answers the path's arrival: much finer branches
 * extend from the old crown and blossoms pop across it, tip by tip. The
 * next world may enter only after 84 %.
 *
 * The rest of the frame, back to front: fading stars; one CONNECTED aurora
 * curtain over ~2/3 of the sky (a continuous fold band + soft shafts +
 * violet crowns — radial primitives only, no hard edges) that belongs to
 * the dark and dissolves as dawn takes the sky; soft hill ridges + mist;
 * the mirror lake with a shimmering light path and rare ambient raindrop
 * rings (time-gated); reeds framing both near corners; wide-open dandelion
 * seeds adrift.
 *
 * All story motion derives from `localT`; `time` only breathes, sways,
 * twinkles and drifts. The frame is complete frozen at time 0.
 */

import type { Renderer } from '../types'
import {
  TAU,
  clamp01,
  drawGlow,
  drawRidge,
  drawStars,
  fillVerticalGradient,
  hash1,
  lerp,
  mixHex,
  mixRgba,
  rgba,
  smoothstep,
} from '../toolkit'
import {
  CALM,
  HORIZON,
  ISLAND,
  WATER_POW,
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
} from './calmMath'
import { MEDITATOR_SPRITES } from './calmSprites'

/** Waterside silhouette ink — reeds, stones, the tree, the island. */
const INK = '#08131b'
/** Pale aqua — the light's core, rims, shimmer. */
const PALE = '#bfeef2'
/** The warm blush of the coming sunrise. */
const BLUSH = '#e6c489'
/** Blossom tints — pestrá koruna: pinks, cream, gold, mint, lilac. */
const BLOSSOMS = ['#f6d7e4', '#f9efe0', '#ffd9a0', '#9fe8cf', '#c9b1f0'] as const
/** Where the horizon light stands — over the island the stones lead to. */
const LIGHT_X = ISLAND.x
/** The aurora lives in this window of the sky (~2/3), feathered at both ends. */
const AURORA_U0 = 0.1
const AURORA_U1 = 0.76

/** The island tree, grown once at module scope — deterministic geometry. */
const TREE = buildTree(7)
const TREE_TIPS = TREE.filter((b) => b.leaf)

/** Quadratic Bézier at parameter s. */
const quadAt = (a: number, c: number, b: number, s: number): number =>
  (1 - s) * (1 - s) * a + 2 * (1 - s) * s * c + s * s * b

/** Martin's meditator photos, decoded lazily on first paint (browser only —
 *  this module must stay importable in Node for the math tests). Until a
 *  sprite has decoded, its draw is skipped for a frame or two. */
let spriteImgs: HTMLImageElement[] | null = null
const meditatorImgs = (): HTMLImageElement[] => {
  if (!spriteImgs && typeof Image !== 'undefined') {
    spriteImgs = MEDITATOR_SPRITES.map((s) => {
      const img = new Image()
      img.src = s.url
      return img
    })
  }
  return spriteImgs ?? []
}

export const renderCalm: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h, accent } = cfg
  const unit = Math.min(w, h)
  const horizonY = h * HORIZON
  const waterH = h - horizonY
  const tExit = cfg.tRaw ?? t

  const { light, blush } = calmLight(t)
  const br = breath(time)

  /** Screen y of a point on the water at depth d (0 near .. 1 horizon). */
  const yAtDepth = (d: number) => horizonY + waterH * Math.pow(1 - d, WATER_POW)

  // --- Sky: near-black night lifting into a cool cyan pre-dawn -------------
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      [0, mixHex('#030710', '#0d3a47', light)],
      [0.42, mixHex('#061120', '#155c6a', light)],
      [0.66, mixHex('#0b1a2e', '#27939e', light)],
      [1, mixHex('#101f35', mixHex('#3cb4bd', BLUSH, blush * 0.55), light)],
    ],
    alpha,
  )

  // --- Stars, yielding to the light (the sunset's dusk stars carry over) ---
  const starAlpha = (1 - light * 0.88) * alpha
  const starBand = horizonY * 0.95
  drawStars(ctx, {
    w, h: starBand, count: 150, seed: 19, alpha: starAlpha * 0.75, size: 1,
    time, twinkle: 0.3, xShift: time * 0.0005, yShift: -t * 0.02,
  })
  drawStars(ctx, {
    w, h: starBand, count: 70, seed: 53, alpha: starAlpha * 0.9, size: 1.4,
    time, twinkle: 0.45, xShift: time * 0.0008, yShift: -t * 0.035,
  })
  drawStars(ctx, {
    w, h: starBand, count: 26, seed: 91, alpha: starAlpha, size: 1.9,
    time, twinkle: 0.6, xShift: time * 0.0012, yShift: -t * 0.05,
  })

  // --- Aurora: one connected curtain over ~2/3 of the sky -------------------
  // A continuous fold band first (dense overlapping soft blobs riding the
  // wave — the curtain's BODY), then drifting shafts and violet crowns for
  // vertical structure. Everything fades at the window's feathered edges
  // and dissolves as the dawn light rises.
  // Martin's choreography (global HUD %): the aurora appears at 76 %, peaks
  // at 79 % and has fully dissolved by 83 % — the opposite arc to the tree,
  // which starts its fine growth and flowering just as the lights let go.
  const auroraA =
    smoothstep(CALM.auroraRise[0], CALM.auroraRise[1], t) *
    (1 - smoothstep(CALM.auroraFall[0], CALM.auroraFall[1], t)) *
    alpha *
    0.82
  if (auroraA > 0.012) {
    const winSpan = AURORA_U1 - AURORA_U0
    const winA = (u: number) =>
      smoothstep(AURORA_U0, AURORA_U0 + 0.17, u) * (1 - smoothstep(AURORA_U1 - 0.17, AURORA_U1, u))
    // Three incommensurate harmonics + a slow amplitude envelope + a
    // hash-phased micro-ripple per column — the curtain hangs and frays,
    // it does not oscillate on a clean sine.
    const waveY = (u: number, k: number, hp: number) =>
      h * (0.3 + 0.06 * k) +
      h * 0.04 * (0.7 + 0.3 * Math.sin(u * TAU * 0.53 + 2.2)) * Math.sin(u * TAU * 1.13 + k * 2.1 + time * 0.055) +
      h * 0.026 * Math.sin(u * TAU * 2.41 - time * 0.037 + k * 0.9) +
      h * 0.016 * Math.sin(u * TAU * 3.97 + k * 4.2 + time * 0.021) +
      h * 0.013 * Math.sin(u * TAU * 5.9 + hp * TAU + time * 0.028)
    const fold = (u: number, k: number) =>
      Math.pow(0.5 + 0.5 * Math.sin(u * TAU * (0.8 + 0.3 * k) + k * 1.7 + time * 0.018), 2)
    drawGlow(ctx, w * 0.43, h * 0.2, unit * 0.55, '#41d9a0', auroraA * 0.07)
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    // The curtain's connected body: a wide diffuse halo pass, then the core
    // fold band, then a soft under-border — everything oversized and dim so
    // neighbours melt into one another with no readable boundary.
    for (let j = 0; j < 48; j++) {
      const u = AURORA_U0 + ((j + 0.5) / 48) * winSpan
      const hj = hash1(j * 5.3 + 11)
      const x = u * w + (hj - 0.5) * w * 0.016
      const fo = fold(u, 0)
      const a = auroraA * winA(u) * (0.5 + 0.5 * fo) * (0.78 + 0.22 * Math.sin(time * 0.09 + hj * TAU))
      if (a <= 0.005) continue
      const yb = waveY(u, 0, hj) + (hash1(j * 9.1 + 3) - 0.5) * h * 0.036
      if (j % 2 === 0) {
        ctx.save()
        ctx.translate(x, yb - h * 0.06)
        ctx.scale(2.9, 1.6 + 0.8 * fo)
        drawGlow(ctx, 0, 0, h * 0.05, '#3fd9b0', a * 0.11)
        ctx.restore()
      }
      ctx.save()
      ctx.translate(x, yb - h * 0.05)
      ctx.scale(2.1, 1 + 0.9 * fo)
      drawGlow(ctx, 0, 0, h * 0.055, '#3fd9b0', a * 0.2)
      ctx.restore()
      ctx.save()
      ctx.translate(x, yb)
      ctx.scale(1.8, 0.6)
      drawGlow(ctx, 0, 0, h * 0.034, '#49e6a3', a * 0.26)
      ctx.restore()
    }
    // Drifting shafts + violet crowns on the taller pleats — wide and dim,
    // structure without stripes.
    for (let k = 0; k < 2; k++) {
      const n = k === 0 ? 26 : 18
      const bandA = auroraA * (k === 0 ? 0.48 : 0.34)
      for (let i = 0; i < n; i++) {
        const hp = hash1(i * 7.7 + k * 131)
        const hq = hash1(i * 3.9 + k * 57 + 1.7)
        const frac = (i / n + hp * 0.02 + time * 0.0022 + k * 0.37) % 1
        const u = AURORA_U0 + frac * winSpan
        const x = u * w
        const yb = waveY(u, k, hq) + (hp - 0.5) * h * 0.03
        const len = h * (0.11 + 0.24 * hq) * (0.75 + 0.25 * Math.sin(time * 0.11 + hq * TAU))
        const a =
          bandA *
          winA(u) *
          (0.25 + 0.75 * hp) *
          (0.72 + 0.28 * Math.sin(time * 0.13 + hp * TAU)) *
          (0.35 + 0.65 * fold(u, k))
        if (a <= 0.004) continue
        ctx.save()
        ctx.translate(x, yb - len * 0.48)
        ctx.scale(0.72, len / (h * 0.1))
        drawGlow(ctx, 0, 0, h * 0.05, '#3bd8c0', a * 0.45)
        ctx.restore()
        if (hq > 0.55) {
          ctx.save()
          ctx.translate(x, yb - len * 0.92)
          ctx.scale(0.56, 1)
          drawGlow(ctx, 0, 0, h * 0.05, '#8f6ae0', a * 0.24)
          ctx.restore()
        }
      }
    }
    ctx.restore()
    // The aurora's faint answer on the far water.
    ctx.save()
    ctx.translate(w * 0.43, horizonY + waterH * 0.14)
    ctx.scale(3, 0.5)
    drawGlow(ctx, 0, 0, unit * 0.16, '#41d9a0', auroraA * 0.07)
    ctx.restore()
  }

  // --- The rising light over the island, breathing ---------------------------
  drawGlow(
    ctx,
    w * LIGHT_X,
    horizonY,
    unit * (0.42 + 0.26 * light) * (1 + 0.05 * br),
    accent,
    alpha * (0.07 + 0.3 * light) * (0.9 + 0.1 * br),
  )
  drawGlow(ctx, w * LIGHT_X, horizonY, unit * (0.8 + 0.3 * light), '#1d8f9c', alpha * (0.03 + 0.12 * light))

  // --- Hills: two soft ridges silhouetted against the glow -----------------
  drawRidge(ctx, {
    w, y: horizonY - h * 0.022, amp: h * 0.022, seed: 41,
    color: mixHex('#0a1826', '#14424e', light * 0.55),
    bottom: horizonY + 2, shift: t * 0.04, alpha,
  })
  drawRidge(ctx, {
    w, y: horizonY - h * 0.005, amp: h * 0.03, seed: 87,
    color: mixHex('#060f1a', '#0e3540', light * 0.45),
    bottom: horizonY + 2, shift: t * 0.08, alpha,
  })

  // --- Mist at the hills' feet, thinning as the scene inhales --------------
  const mistA = alpha * (0.045 + 0.1 * light) * (1 - 0.18 * br)
  for (let k = 0; k < 3; k++) {
    const mx = w * (0.2 + k * 0.31) + Math.sin(time * 0.03 + k * 2.1) * w * 0.03
    ctx.save()
    ctx.translate(mx, horizonY - h * 0.012)
    ctx.scale(4.2, 0.8)
    drawGlow(ctx, 0, 0, unit * (0.05 + hash1(k + 30) * 0.03), '#7fd4dc', mistA * (0.7 + hash1(k) * 0.3))
    ctx.restore()
  }

  // --- The waterline, brightest where the light stands -----------------------
  ctx.save()
  const lineA = (0.12 + 0.52 * light) * (0.92 + 0.08 * br) * alpha
  const lineG = ctx.createLinearGradient(0, 0, w, 0)
  lineG.addColorStop(0, rgba(PALE, 0))
  lineG.addColorStop(Math.max(0, LIGHT_X - 0.18), rgba(PALE, lineA * 0.35))
  lineG.addColorStop(LIGHT_X, rgba(PALE, lineA))
  lineG.addColorStop(LIGHT_X + 0.18, rgba(PALE, lineA * 0.35))
  lineG.addColorStop(1, rgba(PALE, 0))
  ctx.fillStyle = lineG
  ctx.fillRect(0, horizonY - 0.75, w, 1.5)
  ctx.restore()

  // --- The lake: a mirror of the sky -----------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    horizonY,
    w,
    waterH,
    [
      [0, mixHex('#0b1a2c', '#22828d', light)],
      [0.4, mixHex('#071120', '#124855', light)],
      [1, mixHex('#03060c', '#091a23', light)],
    ],
    alpha,
  )

  // --- EXPERIMENT (Martin): layered water — three translucent tints slide
  // over one another, their wavy seams drifting at different speeds and in
  // opposite directions, so the surface itself seems to churn and breathe.
  // At time 0 the layers stand still but the depth-tinting remains.
  const WATER_LAYERS = [
    { col: '#1d7f86', a: 0.1, y0: 0.2, amp: 0.05, f: 2.3, sp: 0.055, ph: 0.5 },
    { col: '#0d3a5c', a: 0.09, y0: 0.46, amp: 0.06, f: 1.7, sp: -0.075, ph: 2.1 },
    { col: '#5fc4bd', a: 0.05, y0: 0.72, amp: 0.05, f: 3.1, sp: 0.1, ph: 4.2 },
  ] as const
  for (const L2 of WATER_LAYERS) {
    ctx.save()
    // The tint FADES IN across a wide band below its wavy seam — a vertical
    // gradient anchored on the seam's midline, so no layer ever meets the
    // water as a hard colour line (Martin: plynulé přechody).
    const seamMid = horizonY + waterH * L2.y0
    const grad = ctx.createLinearGradient(0, seamMid - waterH * 0.12, 0, seamMid + waterH * 0.22)
    const colA = L2.a * alpha * (0.55 + 0.45 * light)
    grad.addColorStop(0, rgba(L2.col, 0))
    grad.addColorStop(1, rgba(L2.col, colA))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(0, h + 2)
    const steps = 48
    for (let i = 0; i <= steps; i++) {
      const u = i / steps
      const seam =
        horizonY +
        waterH *
          (L2.y0 +
            L2.amp *
              (Math.sin(u * TAU * L2.f + L2.ph + time * L2.sp) +
                0.45 * Math.sin(u * TAU * L2.f * 2.7 - time * L2.sp * 1.6 + L2.ph * 2)))
      ctx.lineTo(u * w, seam)
    }
    ctx.lineTo(w, h + 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // The light's reflection: an elongated column reaching toward the viewer —
  // the island and its tree stand inside it, backlit. It sways a breath
  // sideways with the surface tremble.
  ctx.save()
  ctx.translate(w * LIGHT_X + Math.sin(time * 0.3) * w * 0.0025, horizonY + waterH * 0.2)
  ctx.scale(1, 2.4)
  drawGlow(ctx, 0, 0, w * (0.05 + 0.06 * light), PALE, alpha * (0.05 + 0.24 * light) * (0.9 + 0.1 * br))
  ctx.restore()

  // Shimmer: dashes down the light path (dense, brighter) + a faint scatter
  // across the whole surface. Deterministic positions; time only twinkles.
  ctx.save()
  ctx.fillStyle = rgba(PALE, 1)
  const shimmer = (
    row: number,
    x: number,
    y: number,
    len: number,
    a: number,
  ): void => {
    const hp = hash1(row * 23.9 + 3.1)
    const tw = 0.55 + 0.45 * Math.sin(time * (0.4 + hp * 0.9) + hp * TAU)
    // The surface itself breathes: each glint rides a slow swell.
    const swell = Math.sin(time * 0.35 + x * 0.015 + hp * TAU) * unit * 0.0022
    ctx.globalAlpha = clamp01(a * tw)
    ctx.fillRect(x - len / 2, y + swell, len, Math.max(1, unit * 0.0014))
  }
  for (let k = 0; k < 26; k++) {
    const dRow = (k + 0.5) / 26
    const y = horizonY + waterH * Math.pow(dRow, 1.6)
    const halfW = w * (0.014 + 0.15 * Math.pow(dRow, 1.4))
    const hx = hash1(k * 7.3 + 1.7)
    shimmer(
      k,
      w * LIGHT_X + (hx - 0.5) * halfW * 2,
      y,
      halfW * (0.2 + hash1(k * 11.1) * 0.5),
      alpha * light * (0.16 + 0.3 * hash1(k * 5.7)) * (1 - dRow * 0.4),
    )
  }
  for (let k = 0; k < 46; k++) {
    const hx = hash1(300 + k * 7.9)
    const hd = hash1(310 + k * 3.7)
    const drift = ((hx + time * 0.003 + tExit * 0.02) % 1 + 1) % 1
    const y = horizonY + waterH * Math.pow(0.08 + hd * 0.88, 1.5)
    shimmer(80 + k, drift * w, y, w * (0.01 + hx * 0.02), alpha * (0.05 + 0.11 * light))
  }
  ctx.restore()

  // A slow TREMBLE of the whole surface: three ultra-faint bright bands
  // swelling across the water, each on its own drift and period — the lake
  // never quite holds still (frozen flat at time 0).
  if (time > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (let k = 0; k < 3; k++) {
      const hk = hash1(430 + k * 9.1)
      const yBand =
        horizonY +
        waterH * (0.18 + k * 0.26 + 0.05 * Math.sin(time * (0.1 + hk * 0.06) + hk * TAU))
      const bandH = waterH * (0.05 + hk * 0.03)
      const a = alpha * (0.014 + 0.02 * light) * (0.6 + 0.4 * Math.sin(time * 0.17 + k * 2.2))
      if (a <= 0.004) continue
      const g = ctx.createLinearGradient(0, yBand - bandH, 0, yBand + bandH)
      g.addColorStop(0, 'rgba(191,238,242,0)')
      g.addColorStop(0.5, rgba(PALE, a))
      g.addColorStop(1, 'rgba(191,238,242,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, yBand - bandH, w, bandH * 2)
    }
    ctx.restore()
  }

  /** A perspective ripple ring on the surface. */
  const ring = (x: number, y: number, r: number, a: number, lw: number): void => {
    if (a <= 0.004 || r <= 0) return
    ctx.save()
    ctx.strokeStyle = rgba(PALE, a)
    ctx.lineWidth = lw
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * 0.32, 0, 0, TAU)
    ctx.stroke()
    ctx.restore()
  }

  // --- Ambient raindrop rings — the stillness keeps a pulse ----------------
  // The same dispersive train as the stone landings (calmMath.rippleTrainAt),
  // time-gated like origin's meteor: absent (not frozen mid-ring) at time 0.
  if (time > 0) {
    for (let k = 0; k < 2; k++) {
      const period = 5.3 + k * 2.3
      const phase = time / period + k * 0.5
      const cyc = Math.floor(phase)
      const ph = phase - cyc
      if (ph >= 0.6) continue
      const hx = hash1(cyc * 13.7 + k * 7.1)
      const hd = hash1(cyc * 5.3 + k * 3.9)
      const d = 0.25 + hd * 0.45
      const maxR = unit * (0.022 + (1 - d) * 0.055)
      const cx2 = w * (0.16 + hx * 0.68)
      const cy2 = yAtDepth(d)
      for (const ripple of rippleTrainAt((ph / 0.6) * CALM.rippleLife)) {
        ring(cx2, cy2, maxR * ripple.r, ripple.a * (0.12 + 0.24 * light) * alpha, ripple.lw)
      }
    }
  }

  // --- The island: there from the first frame, the destination -------------
  const ix = w * ISLAND.x
  const iy = yAtDepth(ISLAND.d)
  const ih = h * 0.028
  const iw = w * 0.12
  const iyLine = iy + h * 0.003
  // The islet: left lobe taller (the tree's root), a worn right shoulder —
  // and its mirrored answer below the waterline, squashed and faint.
  ctx.save()
  ctx.fillStyle = mixRgba('#050d14', '#0d3340', light * 0.45, alpha)
  ctx.beginPath()
  ctx.moveTo(ix - iw, iy)
  ctx.quadraticCurveTo(ix - iw * 0.62, iy - ih * 1.5, ix - iw * 0.22, iy - ih * 1.12)
  ctx.quadraticCurveTo(ix, iy - ih * 0.9, ix + iw * 0.3, iy - ih * 0.72)
  ctx.quadraticCurveTo(ix + iw * 0.62, iy - ih * 0.5, ix + iw, iy)
  ctx.closePath()
  ctx.fill()
  // The mirror breathes with the surface — never a frozen stamp.
  ctx.fillStyle = mixRgba(INK, '#16414d', light * 0.4, 0.13 * alpha * (0.88 + 0.12 * Math.sin(time * 0.6)))
  ctx.beginPath()
  ctx.moveTo(ix - iw, iyLine)
  ctx.quadraticCurveTo(ix - iw * 0.62, iyLine + ih * 0.6, ix - iw * 0.22, iyLine + ih * 0.45)
  ctx.quadraticCurveTo(ix, iyLine + ih * 0.36, ix + iw * 0.3, iyLine + ih * 0.29)
  ctx.quadraticCurveTo(ix + iw * 0.62, iyLine + ih * 0.2, ix + iw, iyLine)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // --- The island tree: old and rich from the start; the FINE outgrowth ----
  // extends once the path arrives (treeGrow), then the crown flowers.
  const grow = treeGrow(t)
  {
    const bx = ix - iw * 0.25
    const by = iy - ih * 1.05
    const S = unit * 0.1
    const swX = (yu: number) => Math.sin(time * 0.45 + yu * 0.8) * Math.pow(yu / 3, 1.5) * S * 0.05
    const px = (ux: number, uy: number) => bx + ux * S + swX(uy)
    const py = (uy: number) => by - uy * S
    ctx.save()
    ctx.fillStyle = mixRgba('#070e14', '#123039', light * 0.3, alpha)
    ctx.beginPath()
    for (const b of TREE) {
      const e = branchExtent(b, grow)
      if (e <= 0) continue
      // De Casteljau sub-curve 0..e, sampled at its base / middle / tip.
      const c1x = lerp(b.x0, b.cx, e)
      const c1y = lerp(b.y0, b.cy, e)
      const exu = quadAt(b.x0, b.cx, b.x1, e)
      const eyu = quadAt(b.y0, b.cy, b.y1, e)
      const mxu = quadAt(b.x0, c1x, exu, 0.5)
      const myu = quadAt(b.y0, c1y, eyu, 0.5)
      const p0x = px(b.x0, b.y0)
      const p0y = py(b.y0)
      const pmx = px(mxu, myu)
      const pmy = py(myu)
      const p1x = px(exu, eyu)
      const p1y = py(eyu)
      // Normals from segment directions; widths taper base → tip and young
      // twigs extend thin — new growth, never a cut stub.
      const yf = 0.45 + 0.55 * e
      const hw0 = Math.max(b.w0 * S * yf, 0.55) / 2
      const hw1 = Math.max(b.w1 * S * yf, 0.45) / 2
      const hwm = (hw0 + hw1) * 0.46
      const norm = (ax: number, ay: number, bx2: number, by2: number): [number, number] => {
        const dx = bx2 - ax
        const dy = by2 - ay
        const l = Math.hypot(dx, dy) || 1
        return [-dy / l, dx / l]
      }
      const [n0x, n0y] = norm(p0x, p0y, pmx, pmy)
      const [nmx, nmy] = norm(p0x, p0y, p1x, p1y)
      const [n1x, n1y] = norm(pmx, pmy, p1x, p1y)
      ctx.moveTo(p0x + n0x * hw0, p0y + n0y * hw0)
      ctx.lineTo(pmx + nmx * hwm, pmy + nmy * hwm)
      ctx.lineTo(p1x + n1x * hw1, p1y + n1y * hw1)
      ctx.lineTo(p1x - n1x * hw1, p1y - n1y * hw1)
      ctx.lineTo(pmx - nmx * hwm, pmy - nmy * hwm)
      ctx.lineTo(p0x - n0x * hw0, p0y - n0y * hw0)
      ctx.closePath()
    }
    ctx.fill()
    ctx.restore()
    // The tree's mirrored answer on the lake — the standing base structure
    // only (its fine outgrowth is too delicate to survive the water),
    // squashed to a third and barely there.
    ctx.save()
    ctx.fillStyle = mixRgba(
      '#070e14',
      '#123039',
      light * 0.3,
      alpha * 0.11 * (0.85 + 0.15 * Math.sin(time * 0.55 + 1)),
    )
    ctx.beginPath()
    for (const b of TREE) {
      if (b.depth > 4) continue
      const mxu = quadAt(b.x0, b.cx, b.x1, 0.5)
      const myu = quadAt(b.y0, b.cy, b.y1, 0.5)
      const pyR = (uy: number) => iyLine + (iyLine - py(uy)) * 0.35
      const p0x = px(b.x0, b.y0)
      const p0y = pyR(b.y0)
      const pmx = px(mxu, myu)
      const pmy = pyR(myu)
      const p1x = px(b.x1, b.y1)
      const p1y = pyR(b.y1)
      const hw0 = Math.max(b.w0 * S * 0.8, 0.5) / 2
      const hw1 = Math.max(b.w1 * S * 0.8, 0.4) / 2
      const hwm = (hw0 + hw1) * 0.46
      const norm = (ax: number, ay: number, bx2: number, by2: number): [number, number] => {
        const dx = bx2 - ax
        const dy = by2 - ay
        const l = Math.hypot(dx, dy) || 1
        return [-dy / l, dx / l]
      }
      const [n0x, n0y] = norm(p0x, p0y, pmx, pmy)
      const [nmx, nmy] = norm(p0x, p0y, p1x, p1y)
      const [n1x, n1y] = norm(pmx, pmy, p1x, p1y)
      ctx.moveTo(p0x + n0x * hw0, p0y + n0y * hw0)
      ctx.lineTo(pmx + nmx * hwm, pmy + nmy * hwm)
      ctx.lineTo(p1x + n1x * hw1, p1y + n1y * hw1)
      ctx.lineTo(p1x - n1x * hw1, p1y - n1y * hw1)
      ctx.lineTo(pmx - nmx * hwm, pmy - nmy * hwm)
      ctx.lineTo(p0x - n0x * hw0, p0y - n0y * hw0)
      ctx.closePath()
    }
    ctx.fill()
    ctx.restore()

    // The flowering: blossoms pop across the crown, tip by tip, once the
    // fine growth is under way — a varied palette, never one colour.
    const bl = bloom(t)
    if (bl > 0) {
      ctx.save()
      TREE_TIPS.forEach((b, i) => {
        if (hash1(i * 2.9 + 5) > 0.55) return // keep the crown airy
        const e = branchExtent(b, grow)
        if (e < 0.8) return
        const th = hash1(400 + i * 7.7) * 0.8
        const pop = smoothstep(th, th + 0.2, bl)
        if (pop <= 0.01) return
        const col = BLOSSOMS[Math.floor(hash1(410 + i * 3.3) * BLOSSOMS.length) % BLOSSOMS.length]
        const lx = px(b.x1, b.y1)
        const ly = py(b.y1)
        // The soft glow joins once the blossom has opened — and only on
        // roughly half the crown: gradients are the scene's costliest
        // primitive, and a glow on every second blossom already reads as a
        // fully lit crown (the dots carry the rest).
        if (pop > 0.45 && hash1(i * 4.3) < 0.55) {
          drawGlow(ctx, lx, ly, S * (0.03 + 0.022 * hash1(i * 5.1)), col, alpha * pop * (0.2 + 0.4 * light))
        }
        ctx.fillStyle = rgba(col, alpha * pop * (0.5 + 0.3 * light))
        ctx.beginPath()
        ctx.arc(lx, ly, S * (0.008 + 0.007 * hash1(i * 9.7)) * pop, 0, TAU)
        ctx.fill()
      })
      ctx.restore()
    }
  }

  // --- The stepping stones: krok za krokem, island to island ----------------
  // Positions solved per-aspect for a constant slant stride (calmMath.
  // stonePath); far stones first so nearer ones paint over their ripples.
  const path = stonePath(w / h)
  for (let i = CALM.stones - 1; i >= 0; i--) {
    const reveal = stoneReveal(i, t)
    const train = rippleTrain(i, t)
    if (reveal <= 0 && train.length === 0) continue
    const { x, d } = path[i]
    const sx = x * w
    const sy = yAtDepth(d)
    const rx = unit * stoneRadius(d)
    const ry = rx * 0.42

    // The landing's dispersive wave train, launched off the stone's rim.
    const rippleMax = rx * 3.8
    for (const ripple of train) {
      ring(
        sx,
        sy,
        rx * 0.95 + rippleMax * ripple.r,
        ripple.a * (0.35 + 0.45 * light) * alpha,
        ripple.lw,
      )
    }

    if (reveal <= 0) continue
    const yStone = sy + (1 - reveal) * ry * 1.6
    const aStone = reveal * alpha

    // Mirror smear beneath, contact shadow, the pebble's mass, a wet top
    // face catching the sky, then a quiet lit rim — the stone must read as
    // WEIGHT on the water, not a floating highlight. Both shadow layers are
    // radial FADES (centre → nothing), so they dissolve into the water with
    // no visible edge (rev11).
    const softEllipse = (ex: number, ey: number, erx: number, ery: number, color: string, a: number) => {
      if (a <= 0.004) return
      ctx.save()
      ctx.translate(ex, ey)
      ctx.scale(1, ery / erx)
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, erx)
      g.addColorStop(0, rgba(color, a))
      g.addColorStop(0.55, rgba(color, a * 0.45))
      g.addColorStop(1, rgba(color, 0))
      ctx.fillStyle = g
      ctx.fillRect(-erx, -erx, erx * 2, erx * 2)
      ctx.restore()
    }
    ctx.save()
    softEllipse(sx, yStone + ry * 2.4, rx * 1.1, ry * 1.3, mixHex(INK, '#16414d', light * 0.4), 0.15 * aStone)
    softEllipse(sx, yStone + ry * 0.5, rx * 1.35, ry * 0.85, '#010507', 0.32 * aStone)
    ctx.fillStyle = mixRgba(INK, '#28565f', 0.12 + light * 0.5, aStone)
    ctx.beginPath()
    ctx.ellipse(sx, yStone, rx, ry, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = mixRgba('#12262f', '#3a6b74', light * 0.55, 0.55 * aStone)
    ctx.beginPath()
    ctx.ellipse(sx, yStone - ry * 0.22, rx * 0.82, ry * 0.55, 0, 0, TAU)
    ctx.fill()
    ctx.strokeStyle = rgba(PALE, (0.08 + 0.24 * light) * reveal * alpha)
    ctx.lineWidth = Math.max(0.8, rx * 0.04)
    ctx.beginPath()
    ctx.ellipse(sx, yStone - ry * 0.1, rx * 0.86, ry * 0.7, 0, Math.PI * 1.15, Math.PI * 1.85)
    ctx.stroke()
    ctx.restore()
  }

  // --- The near BANK, bottom-right, and the meditator on it ------------------
  // A shore, not a mound: it rises out of the water on its left and runs
  // off the right edge without ever sloping back down. The figure sits
  // directly on it, back to us, facing the light and the tree across the
  // water — the composition of Martin's meditace.jpg reference itself.
  {
    const yB = h * 0.985
    ctx.save()
    ctx.fillStyle = mixRgba(INK, '#16414d', light * 0.4, 0.12 * alpha)
    ctx.beginPath()
    ctx.ellipse(w * 0.79, yB + h * 0.008, w * 0.085, h * 0.011, 0, 0, TAU)
    ctx.fill()
    ctx.fillStyle = mixRgba('#050d14', '#0c2f3a', light * 0.42, alpha)
    ctx.beginPath()
    ctx.moveTo(w * 0.72, yB)
    ctx.quadraticCurveTo(w * 0.78, h * 0.905, w * 0.845, h * 0.872)
    ctx.quadraticCurveTo(w * 0.91, h * 0.848, w * 0.97, h * 0.845)
    ctx.lineTo(w + 2, h * 0.842)
    ctx.lineTo(w + 2, h + 2)
    ctx.lineTo(w * 0.7, h + 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // Martin's figure from meditace.jpg — a pixel-exact sprite, nothing
    // redrawn. Seated far enough up the bank that BOTH legs rest on solid
    // ground (the slope falls away to the left), base sunk a touch in.
    // On phones the figure is tall relative to the bank (figH rides `h`,
    // the bank's x-geometry rides `w`), so it shifts right + a touch down
    // to keep the left leg on the shore (Martin's mobile fix).
    const mobileFig = w < 720
    const figH = h * 0.075
    const img = meditatorImgs()[0]
    if (img && img.complete && img.naturalWidth) {
      const fx = w * (mobileFig ? 0.93 : 0.875)
      const baseY = h * (mobileFig ? 0.873 : 0.868)
      const fw = figH * MEDITATOR_SPRITES[0].aspect
      drawGlow(ctx, fx, baseY - figH * 0.55, figH * 1.5, accent, alpha * (0.08 + 0.14 * light))
      drawGlow(ctx, fx, baseY - figH * 0.85, figH * 0.45, PALE, alpha * (0.05 + 0.12 * light))
      ctx.save()
      ctx.globalAlpha = alpha
      ctx.drawImage(img, fx - fw / 2, baseY - figH, fw, figH)
      ctx.restore()
    }
  }

  // --- Reeds: a dense grassy stand near-left, a smaller echo near-right -----
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = 0; i < 102; i++) {
    const right = i >= 90
    const hb = hash1(600 + i * 3.3)
    const hh = hash1(610 + i * 5.1)
    const hl = hash1(620 + i * 7.7)
    const bx = right ? w * (0.93 + hb * 0.07) : w * (0.005 + hb * 0.26)
    const bh = unit * (0.06 + hh * 0.21) * (right ? 0.8 : 1)
    // Blades lean both ways in a stand — not one combed direction.
    const lean = (hl - 0.35) * 0.55 * (right ? -1 : 1)
    const sway = Math.sin(time * 0.55 + i * 1.3) * unit * 0.004
    const baseY = h + 3
    const tipX = bx + bh * lean + sway
    const tipY = baseY - bh
    ctx.strokeStyle = mixRgba(INK, '#0f3038', light * 0.3, alpha * (0.45 + 0.45 * hh))
    ctx.lineWidth = unit * 0.0022 * (0.7 + hb * 0.6)
    ctx.beginPath()
    ctx.moveTo(bx, baseY)
    ctx.quadraticCurveTo(bx + bh * lean * 0.2, baseY - bh * 0.55, tipX, tipY)
    ctx.stroke()
    if (i % 11 === 2) {
      ctx.fillStyle = mixRgba(INK, '#1a4a52', light * 0.25, alpha * 0.92)
      ctx.beginPath()
      ctx.ellipse(tipX, tipY + bh * 0.04, unit * 0.0035, unit * 0.013, lean * 0.5, 0, TAU)
      ctx.fill()
    }
  }
  ctx.restore()

  // --- Fireflies flitting over the dark water --------------------------------
  // Deterministic wander (two stacked sines per axis — no two paths alike),
  // each with its own slow blink. They belong to the dark and thin out as
  // the dawn rises; frozen at time 0 they are a quiet scatter of sparks.
  const fireA = alpha * (0.25 + 0.75 * (1 - light * 0.8))
  if (fireA > 0.02) {
    ctx.save()
    for (let i = 0; i < 11; i++) {
      const ha = hash1(700 + i * 13.7)
      const hb2 = hash1(710 + i * 7.1)
      const hc = hash1(720 + i * 3.9)
      const fx2 =
        w * (0.05 + ha * 0.9) +
        Math.sin(time * (0.1 + hc * 0.18) + ha * TAU) * w * 0.045 +
        Math.sin(time * 0.37 + hb2 * TAU) * w * 0.012
      const fy2 =
        h * (0.6 + hb2 * 0.34) +
        Math.cos(time * (0.09 + hc * 0.14) + hb2 * TAU) * h * 0.028 +
        Math.sin(time * 0.51 + hc * TAU) * h * 0.011
      const blink = Math.pow(0.5 + 0.5 * Math.sin(time * (0.7 + hc * 1.3) + ha * TAU), 3)
      const a = fireA * (0.12 + 0.88 * blink) * (0.45 + 0.55 * hb2)
      if (a <= 0.01) continue
      drawGlow(ctx, fx2, fy2, unit * (0.006 + 0.006 * blink), '#d8f2a2', a * 0.7)
      ctx.fillStyle = rgba('#eeffc8', a)
      ctx.fillRect(fx2 - 0.8, fy2 - 0.8, 1.6, 1.6)
    }
    ctx.restore()
  }

  // --- Dandelion seeds adrift, wide open (the site's hero image) ------------
  ctx.save()
  ctx.lineCap = 'round'
  for (let i = 0; i < 13; i++) {
    const hx = hash1(900 + i * 17.3)
    const hy = hash1(910 + i * 9.1)
    const hf = hash1(920 + i * 5.7)
    const px2 = ((((hx + time * 0.0045 * (0.6 + hf * 0.8) + tExit * 0.08) % 1.12) + 1.12) % 1.12 - 0.06) * w
    const py2 = h * (0.08 + hy * 0.42) + Math.sin(time * (0.25 + hf * 0.35) + hx * TAU) * h * 0.02
    const s = unit * (0.01 + hf * 0.009)
    const a = alpha * (0.12 + 0.28 * light) * (0.5 + 0.5 * hf)
    const rot = Math.sin(time * (0.3 + hf * 0.3) + hy * TAU) * 0.18
    ctx.strokeStyle = rgba('#e9f6f4', a)
    ctx.fillStyle = rgba('#e9f6f4', a * 0.85)
    ctx.lineWidth = 0.7
    // The achene hanging below, then the wide-open filament crown above.
    ctx.beginPath()
    ctx.moveTo(px2, py2)
    ctx.lineTo(px2 + Math.sin(rot * 0.5) * s * 0.7, py2 + s * 0.75)
    ctx.stroke()
    for (let f = 0; f < 9; f++) {
      const ang = -Math.PI / 2 + rot + (f / 8 - 0.5) * 2.5
      const ex = px2 + Math.cos(ang) * s
      const ey = py2 + Math.sin(ang) * s
      ctx.beginPath()
      ctx.moveTo(px2, py2)
      ctx.lineTo(ex, ey)
      ctx.stroke()
      ctx.fillRect(ex - 0.55, ey - 0.55, 1.1, 1.1)
    }
    drawGlow(ctx, px2, py2, s * 0.9, PALE, a * 0.2)
  }
  ctx.restore()

  // --- The light's core blooming on the waterline, and the blush -----------
  drawGlow(
    ctx,
    w * LIGHT_X,
    horizonY,
    unit * 0.1 * (1 + 0.08 * br),
    PALE,
    alpha * (0.05 + 0.26 * light) * (0.85 + 0.15 * br),
  )
  drawGlow(ctx, w * LIGHT_X, horizonY - h * 0.008, unit * 0.26, BLUSH, alpha * 0.3 * blush * (0.92 + 0.08 * br))

  // (rev11: the two crepuscular beams that used to stand here read as
  // "colored columns" over the veiled sky near the tree — removed.)

  // --- Hand-over to the bitcoin world (B3b) ---------------------------------
  // As the network fades in over 84→88 % (tExit 1.06→1.38), the dawn sinks
  // back into night so the bright lake never burns through the rising world
  // (the B3a hand-over lesson: the outgoing scene must dim itself).
  const nightVeil = smoothstep(1.04, 1.36, tExit)
  if (nightVeil > 0.003) {
    ctx.save()
    ctx.globalAlpha = alpha * nightVeil * 0.88
    ctx.fillStyle = '#030509'
    ctx.fillRect(0, 0, w, h)
    ctx.restore()
  }
}
