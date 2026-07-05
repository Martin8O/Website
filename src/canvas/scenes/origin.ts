/**
 * ORIGIN — the childhood/dawn world (intro + School & Pascal). The quality
 * benchmark for every scene after it.
 *
 * The composition, back to front:
 *  - a pre-dawn→golden-morning sky whose palette follows the sun,
 *  - three parallax star layers that drift, twinkle and yield to daylight,
 *  - the Pascal-chess seed written in the sky: a ROOK constellation whose
 *    lines draw themselves in as the school chapter approaches,
 *  - a sun that rises and runs left→right across the run — pure scroll,
 *  - hill-ridge silhouettes with scroll parallax,
 *  - the land below: a perspective chessboard of dawn-lit fields, flowing
 *    toward the viewer as you scroll — childhood countryside as a chessboard.
 *
 * All story motion derives from `localT` (scroll); `time` only twinkles.
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

/**
 * Chess-ROOK constellation, unit box, y down. `[x, y, weight]` — weight
 * scales the star's brightness/size so the anchor stars (merlon corners,
 * plinth corners) pop. Straight edges everywhere: crenellated top (three
 * merlons, two notches), flared collar, straight body, two-step plinth —
 * connected in order and closed along the bottom, unmistakably the rook.
 */
const ROOK: ReadonlyArray<readonly [number, number, number]> = [
  [0.14, 0.97, 1], // plinth, outer bottom-left
  [0.14, 0.9, 0.4],
  [0.23, 0.9, 0.5], // plinth step
  [0.23, 0.81, 0.4],
  [0.32, 0.73, 0.7], // body, bottom-left
  [0.32, 0.4, 0.7], // body, top-left
  [0.22, 0.3, 0.8], // collar flare, left
  [0.22, 0.08, 1], // left merlon, outer top
  [0.34, 0.08, 0.5], // left merlon, inner top
  [0.34, 0.2, 0.4], // notch 1, bottom-left
  [0.44, 0.2, 0.4], // notch 1, bottom-right
  [0.44, 0.08, 0.6], // middle merlon, top-left
  [0.56, 0.08, 0.6], // middle merlon, top-right
  [0.56, 0.2, 0.4], // notch 2, bottom-left
  [0.66, 0.2, 0.4], // notch 2, bottom-right
  [0.66, 0.08, 0.5], // right merlon, inner top
  [0.78, 0.08, 1], // right merlon, outer top
  [0.78, 0.3, 0.8], // collar flare, right
  [0.68, 0.4, 0.7], // body, top-right
  [0.68, 0.73, 0.7], // body, bottom-right
  [0.77, 0.81, 0.4],
  [0.77, 0.9, 0.5], // plinth step
  [0.86, 0.9, 0.4],
  [0.86, 0.97, 1], // plinth, outer bottom-right (closes along the bottom)
]

/** Dim in-figure stars filling the body so the shape reads as a real
 *  constellation cluster, not just an outline. */
const ROOK_FILL: ReadonlyArray<readonly [number, number]> = [
  [0.42, 0.3],
  [0.56, 0.32],
  [0.5, 0.48],
  [0.42, 0.6],
  [0.58, 0.62],
  [0.5, 0.76],
  [0.4, 0.86],
  [0.6, 0.86],
]

const GOLD = '#f5c451'

export const renderOrigin: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h } = cfg
  const horizonY = h * 0.68
  const unit = Math.min(w, h)

  // --- Sun state (drives the whole palette) --------------------------------
  // Rises late so the school chapter still keeps its stars; ends the run in
  // golden-hour light, handing a warm horizon to the sky scenes.
  const climb = smoothstep(0.22, 1, t)
  const elevation = Math.pow(climb, 1.5) * 0.8 // 0..0.8
  const daylight = smoothstep(0.04, 0.75, elevation)
  const sunX = lerp(0.16, 0.84, t) * w
  const sunY = lerp(horizonY + h * 0.05, h * 0.2, elevation / 0.8)
  const discUp = smoothstep(0.015, 0.09, elevation) // disc above the horizon

  // --- Sky -----------------------------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      [0, mixHex('#03040a', '#122240', daylight)],
      [0.45, mixHex('#0a1024', '#2c4470', daylight)],
      [0.78, mixHex('#141330', '#7c5148', daylight)],
      [1, mixHex('#1c1730', '#d59a55', daylight)],
    ],
    alpha,
  )

  // --- Stars (three depths; nearer layers drift and rise faster) -----------
  // The scene faces the sunrise, so ambient drift RISES diagonally — stars
  // climbing over the eastern horizon (never a flat horizontal slide).
  const starAlpha = (1 - daylight * 0.9) * alpha
  const starBand = horizonY * 0.97
  drawStars(ctx, {
    w, h: starBand, count: 110, seed: 11, alpha: starAlpha * 0.75, size: 1,
    time, twinkle: 0.35, xShift: time * 0.00085, yShift: -t * 0.03 - time * 0.00085,
  })
  drawStars(ctx, {
    w, h: starBand, count: 55, seed: 37, alpha: starAlpha * 0.9, size: 1.5,
    time, twinkle: 0.5, xShift: time * 0.0014, yShift: -t * 0.06 - time * 0.0014,
  })
  drawStars(ctx, {
    w, h: starBand, count: 20, seed: 71, alpha: starAlpha, size: 2,
    time, twinkle: 0.65, xShift: time * 0.0021, yShift: -t * 0.1 - time * 0.0021,
  })

  // --- The knight constellation (the Pascal-chess seed) --------------------
  // Appears as the school chapter nears, its lines drawing in point by point;
  // fades out before the scene hands over to the sky.
  const bump = smoothstep(0.3, 0.52, t) * (1 - smoothstep(0.78, 0.94, t))
  const conAlpha = bump * (1 - daylight * 0.55) * alpha
  if (conAlpha > 0.01) {
    const bx = w * 0.08
    const by = h * 0.07
    const bs = unit * 0.22
    const pts = ROOK.map(
      ([px, py, wt]) => [bx + px * bs, by + py * bs, wt] as const,
    )
    // A whisper of gold behind the figure, lifting it off the sky.
    drawGlow(ctx, bx + bs * 0.42, by + bs * 0.5, bs * 0.75, GOLD, conAlpha * 0.06)

    // Lines draw themselves in, segment by segment, closing along the plinth.
    const segments = pts.length // last segment closes back to the first point
    const reveal = smoothstep(0.34, 0.66, t) * segments
    const strokeReveal = (width: number, a: number) => {
      ctx.beginPath()
      for (let s = 0; s < Math.ceil(reveal); s++) {
        const [x0, y0] = pts[s]
        const [x1, y1] = pts[(s + 1) % pts.length]
        const f = clamp01(reveal - s)
        ctx.moveTo(x0, y0)
        ctx.lineTo(lerp(x0, x1, f), lerp(y0, y1, f))
      }
      ctx.strokeStyle = rgba(GOLD, a)
      ctx.lineWidth = width
      ctx.stroke()
    }
    ctx.save()
    strokeReveal(3, 0.1 * conAlpha) // soft luminous halo pass
    strokeReveal(1, 0.42 * conAlpha) // crisp line pass
    ctx.restore()

    // Outline stars, weighted: anchors blaze, in-between points stay modest.
    pts.forEach(([x, y, wt], i) => {
      const tw = 0.75 + 0.25 * Math.sin(time * (0.8 + hash1(i) * 1.4) + hash1(i + 40) * TAU)
      drawGlow(ctx, x, y, (3.5 + wt * 6) * (unit / 800), GOLD, conAlpha * (0.45 + 0.55 * wt) * tw)
    })
    // Dim cluster stars inside the body.
    ctx.save()
    ctx.fillStyle = rgba(GOLD, 0.4 * conAlpha)
    for (const [fx, fy] of ROOK_FILL) {
      ctx.fillRect(bx + fx * bs, by + fy * bs, 1.4, 1.4)
    }
    ctx.restore()
  }

  // --- A falling star in the pre-dawn (a wish — the story begins) ----------
  // Ambient-only delight: one meteor every ~6.5 s while the sky is still
  // dark. Deterministic per cycle; zero-length (invisible) when time froze.
  const meteorDark = 1 - daylight
  if (meteorDark > 0.25 && time > 0) {
    const cycle = Math.floor(time / 6.5)
    const ph = (time - cycle * 6.5) / 6.5
    if (ph < 0.16) {
      const p = ph / 0.16
      const fade = Math.sin(p * Math.PI)
      const a = meteorDark * alpha * fade * 0.8
      const x0 = (0.12 + hash1(cycle * 3.3 + 0.7) * 0.55) * w
      const y0 = (0.05 + hash1(cycle * 7.1 + 1.9) * 0.16) * h
      const dx = 0.82
      const dy = 0.42
      const len = unit * 0.2
      const headX = x0 + dx * len * (0.3 + p * 1.4)
      const headY = y0 + dy * len * (0.3 + p * 1.4)
      const tail = len * (0.35 + 0.3 * fade)
      const g = ctx.createLinearGradient(headX - dx * tail, headY - dy * tail, headX, headY)
      g.addColorStop(0, 'rgba(238,244,255,0)')
      g.addColorStop(1, rgba('#eef4ff', a))
      ctx.save()
      ctx.strokeStyle = g
      ctx.lineWidth = 1.4
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(headX - dx * tail, headY - dy * tail)
      ctx.lineTo(headX, headY)
      ctx.stroke()
      ctx.restore()
      drawGlow(ctx, headX, headY, 8, '#eef4ff', a * 0.9)
    }
  }

  // --- Sun -----------------------------------------------------------------
  // Wide atmosphere first (present even pre-dawn — the promise of sunrise),
  // then bloom and a crisp disc once it clears the horizon.
  drawGlow(
    ctx,
    sunX,
    Math.min(sunY, horizonY + h * 0.02),
    unit * (0.38 + 0.3 * daylight),
    '#f2a54c',
    alpha * (0.14 + 0.3 * daylight),
  )
  drawGlow(ctx, sunX, sunY, unit * 0.13, '#ffd98a', alpha * 0.55 * discUp)
  drawGlow(ctx, sunX, sunY, unit * 0.05, '#fff3d2', alpha * 0.9 * discUp)
  if (discUp > 0) {
    ctx.save()
    ctx.fillStyle = rgba('#fff6dd', alpha * discUp)
    ctx.beginPath()
    ctx.arc(sunX, sunY, unit * 0.021, 0, TAU)
    ctx.fill()
    ctx.restore()
  }

  // --- Crepuscular rays ------------------------------------------------------
  // A quiet fan of beams from the low sun, fading continuously as the scroll
  // (sun) climbs. Two passes: the SKY pass is painted here, BEFORE the ridges
  // and fields, so while the sun sits behind the mountains they physically
  // occlude every beam — nothing can shine through. Once the sun has visually
  // cleared the ridge tops (elevation ≈ 0.2), the LAND pass at the very end
  // of the frame lets the downward beams fall across the fields, fading in.
  const rayA = smoothstep(0.015, 0.05, elevation) * (1 - smoothstep(0.05, 0.34, elevation)) * alpha
  const downGate = smoothstep(0.2, 0.28, elevation)
  const drawRayFan = (pass: 'sky' | 'land') => {
    ctx.save()
    ctx.globalCompositeOperation = 'screen'
    for (let i = 0; i < 7; i++) {
      const ang = (i / 7) * TAU + (hash1(i + 50) - 0.5) * 0.55 + time * 0.008
      const dx = Math.cos(ang)
      const dy = Math.sin(ang)
      // Sky pass: upward beams only. Land pass: downward beams, gated.
      if (pass === 'sky' ? dy > 0 : dy <= 0) continue
      const beamA = rayA * (0.023 + hash1(i + 170) * 0.032) * (pass === 'land' ? downGate : 1)
      if (beamA <= 0.002) continue
      const len = unit * (0.45 + hash1(i + 90) * 0.5)
      const spread = 0.035 + hash1(i + 130) * 0.05
      const px = -dy * len * spread
      const py = dx * len * spread
      const g = ctx.createLinearGradient(sunX, sunY, sunX + dx * len, sunY + dy * len)
      g.addColorStop(0, rgba('#ffcf7a', beamA))
      g.addColorStop(1, 'rgba(255,207,122,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(sunX, sunY)
      ctx.lineTo(sunX + dx * len - px, sunY + dy * len - py)
      ctx.lineTo(sunX + dx * len + px, sunY + dy * len + py)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
  if (rayA > 0.005) drawRayFan('sky')

  // --- Dawn birds — the first hint of flight --------------------------------
  // A small flock crossing the morning sky as daylight arrives: the boy on
  // the chessboard fields looking up. Drifts with scroll AND a light breeze.
  const flock = smoothstep(0.35, 0.6, daylight) * alpha
  if (flock > 0.01) {
    ctx.save()
    ctx.strokeStyle = rgba('#141020', 0.8)
    ctx.lineWidth = 1.3
    ctx.lineCap = 'round'
    for (let i = 0; i < 7; i++) {
      const hx = hash1(200 + i * 17.3)
      const hy = hash1(300 + i * 9.1)
      const hf = hash1(400 + i * 5.7)
      const px = ((0.05 + t * 0.5 + time * 0.006 + hx * 0.22) % 1.15) * w
      const py = h * (0.16 + hy * 0.14) + Math.sin(time * (0.5 + hf) + hx * TAU) * h * 0.004
      const s = unit * (0.007 + hf * 0.006)
      const flap = 0.5 + 0.5 * Math.sin(time * (5 + hf * 3) + i * 1.7)
      const wy = s * (0.15 + flap * 0.55)
      ctx.globalAlpha = flock * (0.45 + hf * 0.4)
      ctx.beginPath()
      ctx.moveTo(px - s, py - wy)
      ctx.quadraticCurveTo(px - s * 0.35, py + s * 0.15, px, py)
      ctx.quadraticCurveTo(px + s * 0.35, py + s * 0.15, px + s, py - wy)
      ctx.stroke()
    }
    ctx.restore()
  }

  // --- Hills (two parallax silhouettes behind the fields) ------------------
  drawRidge(ctx, {
    w, y: horizonY - h * 0.012, amp: h * 0.028, seed: 3,
    color: mixHex('#0e1428', '#3a2b40', daylight * 0.8),
    bottom: horizonY + h * 0.012, shift: t * 0.1, alpha,
  })
  drawRidge(ctx, {
    w, y: horizonY + h * 0.004, amp: h * 0.04, seed: 8,
    color: mixHex('#070a14', '#241a30', daylight * 0.7),
    bottom: horizonY + h * 0.02, shift: t * 0.22, alpha,
  })

  // --- The land: a chessboard of fields ------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    horizonY,
    w,
    h - horizonY,
    [
      [0, mixHex('#0d1122', '#4a3524', daylight)],
      [0.5, mixHex('#090c18', '#241a12', daylight)],
      [1, '#04050a'],
    ],
    alpha,
  )

  // Perspective checker squares flowing toward the viewer as you scroll.
  // Only one parity is painted; the ground gradient is the other colour.
  const rows = 9
  const groundH = h - horizonY
  const scroll = t * 3.5
  const fracScroll = scroll - Math.floor(scroll)
  const parityBase = Math.floor(scroll)
  const vpX = w * (0.5 + (0.5 - t) * 0.04)
  for (let i = -1; i <= rows; i++) {
    const d0 = Math.max((i + fracScroll) / rows, 0.001)
    const d1 = Math.min((i + 1 + fracScroll) / rows, 1.4)
    if (d1 <= d0) continue
    const y0 = horizonY + groundH * Math.pow(d0, 2.1)
    const y1 = horizonY + groundH * Math.pow(d1, 2.1)
    if (y0 > h) continue
    const colW0 = w * (0.012 + 0.118 * Math.pow(d0, 2.1))
    const colW1 = w * (0.012 + 0.118 * Math.pow(d1, 2.1))
    const midD = (d0 + d1) / 2
    // Fade into haze at the horizon, and out again past the bottom edge.
    const rowFade = smoothstep(0.05, 0.22, midD) * (1 - smoothstep(0.95, 1.35, midD))
    if (rowFade <= 0.01) continue
    for (let j = -16; j < 16; j++) {
      if ((((i - parityBase + j) % 2) + 2) % 2 !== 0) continue
      const xa0 = vpX + j * colW0
      const xb0 = xa0 + colW0
      const xa1 = vpX + j * colW1
      const xb1 = xa1 + colW1
      if (Math.max(xb0, xb1) < 0 || Math.min(xa0, xa1) > w) continue
      // Squares under the sun catch the light first.
      const cx = (xa1 + xb1) / 2
      const sunProx = Math.exp(-Math.pow((cx - sunX) / (w * 0.35), 2))
      const lit = daylight * (0.25 + 0.75 * sunProx)
      ctx.fillStyle = mixRgba('#141b31', '#b5803c', lit * 0.6, 0.42 * rowFade * alpha)
      ctx.beginPath()
      ctx.moveTo(xa0, y0)
      ctx.lineTo(xb0, y0)
      ctx.lineTo(xb1, y1)
      ctx.lineTo(xa1, y1)
      ctx.closePath()
      ctx.fill()
    }
  }

  // --- Horizon haze + a final bloom over the land ---------------------------
  fillVerticalGradient(
    ctx,
    0,
    horizonY - h * 0.1,
    w,
    h * 0.16,
    [
      [0, 'rgba(0,0,0,0)'],
      [0.55, mixRgba('#5a6fa8', '#f0b45e', daylight, 0.1 + 0.18 * daylight)],
      [1, 'rgba(0,0,0,0)'],
    ],
    alpha,
  )
  drawGlow(ctx, sunX, sunY, unit * 0.2, '#ffcf7a', alpha * 0.18 * daylight)

  // Land pass of the crepuscular rays — beams across the fields, only once
  // the sun has visually cleared the ridge tops (see the sky pass above).
  if (rayA > 0.005 && downGate > 0.01) drawRayFan('land')
}
