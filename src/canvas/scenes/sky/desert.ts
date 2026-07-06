/**
 * SKY / DESERT — Bagram, Afghanistan. FACTUAL (facts §6b): Martin served as
 * GROUND personnel (liaison officer) on a ~30,000-person fenced base; he flew
 * only a few helicopter transport missions. So this is a GROUND mood — the
 * one sky chapter seen from the earth:
 *  - a white-hot sun in a scorched, dusty sky; heat shimmer on the horizon,
 *  - the Hindu Kush far off; hangars, tents, a control tower, masts,
 *  - jets parked on the tarmac — others fly them here,
 *  - the perimeter fence in the foreground: inside, looking out,
 *  - one helicopter crossing — the only ride out (the transport beat),
 *  - drifting dust everywhere; war-veteran gravity, nothing heroic.
 *
 * Scroll pans slowly across the vast base — layered speeds carry the size.
 */

import type { Renderer } from '../../types'
import {
  drawGlow,
  drawRidge,
  fillVerticalGradient,
  hash1,
  lerp,
  mixHex,
  rgba,
  smoothstep,
} from '../../toolkit'
import { drawAircraft } from './aircraft'
import { drawPuff } from './clouds'
import { sunArc } from './skyMath'

const STRUCT = '#4a3b2c'
const HAZE = '#e8dcc0'

export const renderDesert: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h } = cfg
  const unit = Math.min(w, h)
  const horizonY = h * 0.66
  // Dark silhouettes CONDENSE gradually out of the haze while the previous
  // scene dissolves — never popping in at full strength mid cross-fade.
  const condense = alpha * alpha * alpha

  // --- Scorched sky, white-hot sun ------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      [0, '#87a7c2'],
      [0.5, '#c9d3cd'],
      [0.85, '#efe4c4'],
      [1, '#f4ecd2'],
    ],
    alpha,
  )
  // The section-wide sun arc, continuous through both of this scene's seams.
  const sun = sunArc(3.5 + (cfg.tRaw ?? t))
  const sunX = w * sun.x
  const sunY = h * sun.y
  drawGlow(ctx, sunX, sunY, unit * 0.5, '#fdf6e3', alpha * 0.5)
  drawGlow(ctx, sunX, sunY, unit * 0.12, '#ffffff', alpha * 0.85)
  ctx.save()
  ctx.strokeStyle = rgba('#fdf3d8', alpha * 0.12)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(sunX, sunY, unit * 0.17, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  // --- The Hindu Kush, dissolving in haze ------------------------------------
  drawRidge(ctx, {
    w, y: horizonY - h * 0.075, amp: h * 0.05, seed: 41,
    color: mixHex('#9a8a80', HAZE, 0.45), bottom: horizonY + 2, shift: t * 0.03, alpha,
  })
  drawRidge(ctx, {
    w, y: horizonY - h * 0.035, amp: h * 0.038, seed: 47,
    color: mixHex('#8a7462', HAZE, 0.3), bottom: horizonY + 2, shift: t * 0.05, alpha,
  })

  // --- The ground: dust-pale tarmac ------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    horizonY,
    w,
    h - horizonY,
    [
      [0, '#d8c49a'],
      [0.4, '#bfa877'],
      [1, '#7d6647'],
    ],
    alpha,
  )

  // Heat shimmer: broken pale dashes wavering along the horizon line.
  ctx.save()
  ctx.strokeStyle = rgba('#f7efd8', alpha * 0.22)
  ctx.lineWidth = 1.2
  for (let row = 0; row < 3; row++) {
    const y0 = horizonY - h * 0.008 + row * h * 0.009
    ctx.beginPath()
    for (let i = 0; i < 26; i++) {
      const x0 = (i / 26) * w
      const wob = Math.sin(time * 2.4 + i * 1.3 + row * 2.1) * h * 0.0035
      ctx.moveTo(x0, y0 + wob)
      ctx.lineTo(x0 + w * 0.022, y0 + wob)
    }
    ctx.stroke()
  }
  ctx.restore()

  // --- The base — slow pan; wrap seeded silhouettes across 1.6 screens ------
  const span = w * 1.6
  const baseY = horizonY + h * 0.045
  const structA = condense * 0.92
  const wrapX = (raw: number, off: number) => ((((raw - off) % span) + span) % span) - w * 0.3

  ctx.save()
  ctx.globalAlpha = structA
  ctx.fillStyle = mixHex(STRUCT, HAZE, 0.18)
  const midOff = t * w * 0.22

  // Hangars (arched), a control tower, tent rows, antenna masts.
  for (let i = 0; i < 3; i++) {
    const x = wrapX(hash1(500 + i * 37) * span, midOff)
    const hw = w * (0.05 + hash1(510 + i * 13) * 0.03)
    const hh = h * (0.045 + hash1(520 + i * 7) * 0.02)
    ctx.beginPath()
    ctx.moveTo(x - hw, baseY)
    ctx.ellipse(x, baseY, hw, hh, 0, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
  }
  {
    const x = wrapX(span * 0.55, midOff)
    const tw = w * 0.012
    ctx.fillRect(x - tw / 2, baseY - h * 0.1, tw, h * 0.1)
    ctx.fillRect(x - tw * 1.6, baseY - h * 0.125, tw * 3.2, h * 0.03)
    ctx.beginPath()
    ctx.moveTo(x, baseY - h * 0.125)
    ctx.lineTo(x, baseY - h * 0.16)
    ctx.strokeStyle = ctx.fillStyle
    ctx.lineWidth = 1.4
    ctx.stroke()
  }
  for (let i = 0; i < 12; i++) {
    const x = wrapX(hash1(540 + i * 11) * span, midOff)
    const tw = w * 0.014
    const th = h * 0.018
    ctx.beginPath()
    ctx.moveTo(x - tw, baseY)
    ctx.lineTo(x, baseY - th)
    ctx.lineTo(x + tw, baseY)
    ctx.closePath()
    ctx.fill()
  }
  for (let i = 0; i < 2; i++) {
    const x = wrapX(hash1(560 + i * 23) * span, midOff)
    ctx.strokeStyle = ctx.fillStyle
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(x, baseY)
    ctx.lineTo(x, baseY - h * 0.13)
    ctx.moveTo(x, baseY - h * 0.13)
    ctx.lineTo(x - w * 0.02, baseY)
    ctx.moveTo(x, baseY - h * 0.13)
    ctx.lineTo(x + w * 0.02, baseY)
    ctx.stroke()
  }
  ctx.restore()

  // Parked jets + one parked helicopter on the tarmac line (someone else's ride).
  const rowY = horizonY + h * 0.085
  const rowOff = t * w * 0.3
  for (let i = 0; i < 3; i++) {
    const x = wrapX(hash1(580 + i * 29) * span, rowOff)
    drawAircraft(ctx, 'l39', {
      x, y: rowY, size: unit * 0.075, dir: i % 2 ? -1 : 1,
      color: mixHex('#3c3225', HAZE, 0.1), alpha: structA, time: 0,
    })
  }
  drawAircraft(ctx, 'mi17', {
    x: wrapX(span * 0.82, rowOff), y: rowY - h * 0.008, size: unit * 0.09,
    color: mixHex('#3c3225', HAZE, 0.1), alpha: structA, time: 0,
  })

  // --- The Mi-17 transport beat — the few times he flew here -----------------
  const heliIn = smoothstep(0.3, 0.75, t)
  if (heliIn > 0.001 && heliIn < 0.999) {
    const hx = lerp(w * 1.12, -w * 0.12, heliIn)
    const hy = h * 0.3 + Math.sin(time * 1.3) * h * 0.006
    drawAircraft(ctx, 'mi17', {
      x: hx, y: hy, size: unit * 0.11, dir: -1, color: '#41372a', glint: '#e8dcc0', alpha: condense * 0.95, time,
    })
  }

  // --- The perimeter fence: inside, looking out ------------------------------
  const fenceOff = t * w * 0.42
  const postGap = w * 0.09
  const fenceTop = h * 0.625
  const fenceBot = h * 0.83
  ctx.save()
  ctx.strokeStyle = rgba('#241c12', condense * 0.72)
  ctx.lineWidth = Math.max(1.5, unit * 0.004)
  const first = -((fenceOff % postGap) + postGap) % postGap
  for (let x = first; x < w + postGap; x += postGap) {
    ctx.beginPath()
    ctx.moveTo(x, fenceBot)
    ctx.lineTo(x, fenceTop)
    // Barbed overhang leaning inward at the top.
    ctx.lineTo(x - postGap * 0.14, fenceTop - h * 0.022)
    ctx.stroke()
  }
  ctx.lineWidth = Math.max(1, unit * 0.0018)
  ctx.strokeStyle = rgba('#241c12', condense * 0.55)
  for (let i = 0; i < 4; i++) {
    const y = lerp(fenceTop + h * 0.02, fenceBot - h * 0.015, i / 3)
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  // Diagonal mesh hint between posts + the barbed wire along the overhang.
  ctx.strokeStyle = rgba('#241c12', condense * 0.12)
  for (let x = first; x < w + postGap; x += postGap / 2) {
    ctx.beginPath()
    ctx.moveTo(x, fenceTop + h * 0.02)
    ctx.lineTo(x + postGap / 2, fenceBot - h * 0.015)
    ctx.moveTo(x + postGap / 2, fenceTop + h * 0.02)
    ctx.lineTo(x, fenceBot - h * 0.015)
    ctx.stroke()
  }
  ctx.strokeStyle = rgba('#241c12', condense * 0.6)
  ctx.beginPath()
  for (let x = first; x < w + postGap; x += postGap) {
    ctx.moveTo(x - postGap * 0.14, fenceTop - h * 0.022)
    ctx.lineTo(x + postGap - postGap * 0.14, fenceTop - h * 0.022 + Math.sin(x * 0.01) * 1.5)
  }
  ctx.stroke()
  ctx.restore()

  // --- Dust: drifting grains + two long haze banks ---------------------------
  ctx.save()
  ctx.fillStyle = rgba('#d9c398', alpha * 0.5)
  for (let i = 0; i < 34; i++) {
    const hy = hash1(620 + i * 7.9)
    const px = ((hash1(610 + i * 12.7) + time * 0.014 + t * 0.3) % 1.1) * w * 1.05 - w * 0.02
    const py = h * (0.4 + hy * 0.55) + Math.sin(time * 0.7 + i) * h * 0.004
    const r = 0.8 + hash1(630 + i * 3.3) * 1.8
    ctx.globalAlpha = alpha * (0.18 + hash1(640 + i * 5.1) * 0.3)
    ctx.fillRect(px, py, r, r)
  }
  ctx.restore()
  ctx.save()
  drawPuff(ctx, ((0.2 + time * 0.004 + t * 0.15) % 1.2) * w, h * 0.62, h * 0.09, '#dcc79b', alpha * 0.22, 3.6)
  drawPuff(ctx, ((0.75 + time * 0.006 + t * 0.2) % 1.2) * w, h * 0.74, h * 0.11, '#cfb488', alpha * 0.26, 3.2)
  ctx.restore()

  // A heavy, hot vignette pressing down — the gravity of the place.
  fillVerticalGradient(
    ctx, 0, 0, w, h * 0.2,
    [[0, rgba('#5c4a33', 0.28)], [1, 'rgba(0,0,0,0)']],
    alpha,
  )
}
