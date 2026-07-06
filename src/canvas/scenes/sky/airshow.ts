/**
 * SKY / AIRSHOW — the display years (facts §6b): Martin flew ONLY as a
 * two-ship with one colleague, each in his own aircraft, over airfields with
 * tens of thousands of spectators. So: exactly TWO jets, tight formation,
 * colored smoke, and the crowd is a character —
 *  - a vivid summer day over a green airfield with a distant runway,
 *  - the pair flies the display line: entry pass → a full loop → exit,
 *    lead trailing white smoke, wingman red (never a "many aircraft" show),
 *  - the two-ship STRIKE beat: a pyro flash + smoke column on the far
 *    runway as they pass — his real display routine,
 *  - below: two rows of spectator silhouettes, raised arms, waving flags,
 *    camera flashes sparkling through the crowd.
 */

import type { Renderer } from '../../types'
import {
  TAU,
  drawGlow,
  fillVerticalGradient,
  hash1,
  lerp,
  rgba,
  smoothstep,
} from '../../toolkit'
import { drawAircraft, drawRibbon } from './aircraft'
import { drawPuff } from './clouds'
import { sunArc } from './skyMath'

/** The display line: entry pass → full loop → exit, as {x, y, heading}.
 *  Piecewise but C0-continuous; u may go slightly negative (smoke history). */
function displayPath(u: number, w: number, h: number): { x: number; y: number; heading: number } {
  const cx = w * 0.54
  const cy = h * 0.4
  const R = h * 0.235
  // Loop entry/exit tangent point: the bottom of the circle.
  const enterX = cx
  const enterY = cy + R
  if (u < 0.24) {
    // Entry: a shallow descending pass from off-screen left to the loop foot.
    const p = u / 0.24
    const x = lerp(-w * 0.08, enterX, p)
    const y = lerp(h * 0.62, enterY, p) - Math.sin(p * Math.PI) * h * 0.03
    return { x, y, heading: Math.atan2(enterY - h * 0.62, enterX + w * 0.08) * 0.6 }
  }
  if (u < 0.76) {
    // The loop: one full turn from the bottom, pulling UP into it.
    const p = (u - 0.24) / 0.52
    const a = Math.PI / 2 - p * TAU // start at the bottom, climb the right side
    const x = cx + Math.cos(a) * R
    const y = cy + Math.sin(a) * R
    return { x, y, heading: Math.atan2(-Math.cos(a), Math.sin(a)) }
  }
  // Exit: level acceleration out to the right, a touch of climb.
  const p = (u - 0.76) / 0.24
  return {
    x: lerp(enterX, w * 1.12, p),
    y: enterY - p * h * 0.06,
    heading: -0.06,
  }
}

export const renderAirshow: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h } = cfg
  const unit = Math.min(w, h)

  // --- A vivid summer day ----------------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      [0, '#1663c9'],
      [0.55, '#7ec3f0'],
      [0.82, '#c8e6f8'],
      [1, '#e2f2fb'],
    ],
    alpha,
  )
  // Afternoon sun — the section-wide arc at the continuous position: it
  // keeps gliding right and down through the display and straight through
  // both seams, never pausing in the sky.
  const sun = sunArc(4.5 + (cfg.tRaw ?? t))
  const sunX = w * sun.x
  const sunY = h * sun.y
  drawGlow(ctx, sunX, sunY, unit * 0.32, '#fff3c4', alpha * 0.5)
  drawGlow(ctx, sunX, sunY, unit * 0.1, '#fffdf0', alpha * 0.8)
  ctx.save()
  ctx.fillStyle = rgba('#fffdf2', alpha * 0.95)
  ctx.beginPath()
  ctx.arc(sunX, sunY, unit * 0.028, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Fair-weather cumulus, drifting right→left with the breeze.
  ctx.save()
  for (let i = 0; i < 5; i++) {
    const hx = hash1(700 + i * 17)
    const px = ((((hx - time * 0.0022 - t * 0.02) % 1.15) + 1.15) % 1.15) * w * 1.1 - w * 0.05
    const py = h * (0.14 + hash1(710 + i * 9) * 0.22)
    const r = h * (0.03 + hash1(720 + i * 5) * 0.03)
    drawPuff(ctx, px, py + r * 0.3, r * 1.1, '#b9d4ea', alpha * 0.4)
    drawPuff(ctx, px - r * 0.6, py + r * 0.1, r * 0.7, '#ffffff', alpha * 0.8)
    drawPuff(ctx, px + r * 0.5, py + r * 0.15, r * 0.65, '#ffffff', alpha * 0.75)
    drawPuff(ctx, px, py, r * 0.85, '#ffffff', alpha * 0.9)
  }
  ctx.restore()

  // --- The airfield: grass, distant treeline, the display runway -------------
  const groundY = h * 0.8
  drawGlow(ctx, w * 0.5, groundY, w * 0.5, '#dff0fa', alpha * 0.25) // ground haze
  fillVerticalGradient(
    ctx,
    0,
    groundY,
    w,
    h - groundY,
    [
      [0, '#7fae7a'],
      [0.3, '#4e8355'],
      [1, '#243c2c'],
    ],
    alpha,
  )
  ctx.save()
  ctx.fillStyle = rgba('#33502f', alpha * 0.8)
  for (let i = 0; i < 30; i++) {
    // A soft treeline strip on the far side of the field.
    const x = (i / 30) * w
    const r = h * (0.008 + hash1(730 + i * 3.7) * 0.008)
    ctx.beginPath()
    ctx.arc(x, groundY + h * 0.008, r, Math.PI, 0)
    ctx.fill()
  }
  // The runway the display flies along.
  ctx.fillStyle = rgba('#9aa2a8', alpha * 0.85)
  ctx.fillRect(w * 0.08, groundY + h * 0.022, w * 0.84, h * 0.016)
  ctx.fillStyle = rgba('#f2f5f7', alpha * 0.35)
  for (let i = 0; i < 11; i++) {
    ctx.fillRect(w * (0.1 + i * 0.077), groundY + h * 0.029, w * 0.03, h * 0.0022)
  }
  ctx.restore()

  // --- The two-ship display + colored smoke ----------------------------------
  const u = t
  const lead = displayPath(u, w, h)
  const wingU = u - 0.03
  const wingRaw = displayPath(wingU, w, h)
  // The wingman holds echelon: offset perpendicular to his flight path, so
  // the pair — and their two smokes — never merge into one line.
  const wingOff = unit * 0.02
  const wing = {
    x: wingRaw.x - Math.sin(wingRaw.heading) * wingOff,
    y: wingRaw.y + Math.cos(wingRaw.heading) * wingOff,
    heading: wingRaw.heading,
  }
  const inAir = smoothstep(0.005, 0.03, u)

  const smokeOn = smoothstep(0.06, 0.1, u) // smoke switches on after entry
  for (const [who, du, color] of [
    ['lead', 0, '#fbfbf8'],
    ['wing', -0.03, '#e0483f'],
  ] as const) {
    const pts: Array<[number, number]> = []
    for (let i = 44; i >= 0; i--) {
      const su = u + du - i * 0.004
      if (su < 0.06) continue // no smoke before the switch-on point
      const p = displayPath(su, w, h)
      if (who === 'wing') {
        pts.push([p.x - Math.sin(p.heading) * wingOff, p.y + Math.cos(p.heading) * wingOff])
      } else {
        pts.push([p.x, p.y])
      }
    }
    // Smoke as a hint, not a stripe (Martin: ~15 % of the original weight).
    if (who === 'lead') {
      drawRibbon(ctx, pts, unit * 0.011, '#b9cede', alpha * smokeOn * 0.1, 2.6)
    }
    drawRibbon(ctx, pts, unit * 0.007, color, alpha * smokeOn * (who === 'lead' ? 0.18 : 0.14), 2.4)
  }

  // The display pair flies CLEAN (no stores — Martin's call); the vykrut
  // returns with the B2.3 choreography once the clean roll frames exist.
  const jetColor = '#26324d'
  drawAircraft(ctx, 'l159', {
    x: lead.x, y: lead.y, size: unit * 0.085, tilt: -lead.heading,
    color: jetColor, glint: '#d7e8ff', alpha: alpha * inAir, time,
  })
  drawAircraft(ctx, 'l159', {
    x: wing.x, y: wing.y, size: unit * 0.078, tilt: -wing.heading,
    color: jetColor, glint: '#d7e8ff', alpha: alpha * inAir * smoothstep(0.02, 0.05, u),
    time,
  })

  // (No pyro beat here for now — the choreographed two-ship strike display
  // arrives with the B2.3 opposing-loops redesign.)

  // --- The crowd: two silhouette rows, arms, flags, camera flashes -----------
  const rows: Array<{ y: number; color: string; seed: number; step: number }> = [
    { y: h * 0.885, color: '#232c3e', seed: 900, step: 11 },
    { y: h * 0.92, color: '#131926', seed: 950, step: 13 },
  ]
  const excite = 0.5 + 0.5 * smoothstep(0.24, 0.5, t) * (1 - smoothstep(0.9, 1, t))
  for (const row of rows) {
    ctx.save()
    ctx.fillStyle = rgba(row.color, alpha)
    ctx.beginPath()
    ctx.moveTo(0, h + 2)
    ctx.lineTo(0, row.y)
    const count = Math.ceil(w / row.step)
    for (let i = 0; i <= count; i++) {
      const x = i * row.step
      const r = row.step * (0.45 + hash1(row.seed + i * 3.1) * 0.42)
      // Slight height scatter so the skyline reads as people, not a comb.
      ctx.arc(x, row.y + (hash1(row.seed + i * 8.9) - 0.5) * row.step * 0.5, r, Math.PI, 0)
    }
    ctx.lineTo(w, row.y)
    ctx.lineTo(w, h + 2)
    ctx.closePath()
    ctx.fill()
    // Raised arms — more of them as the display peaks.
    ctx.strokeStyle = rgba(row.color, alpha * 0.95)
    ctx.lineWidth = Math.max(1.2, row.step * 0.14)
    ctx.lineCap = 'round'
    for (let i = 0; i <= count; i++) {
      if (hash1(row.seed + 7 + i * 5.7) > 0.13 * excite) continue
      const x = i * row.step
      const sway = Math.sin(time * 2.2 + i * 1.9) * row.step * 0.16
      ctx.beginPath()
      ctx.moveTo(x, row.y - row.step * 0.1)
      ctx.lineTo(x - row.step * 0.28 + sway, row.y - row.step * 0.85)
      ctx.moveTo(x, row.y - row.step * 0.1)
      ctx.lineTo(x + row.step * 0.3 + sway, row.y - row.step * 0.8)
      ctx.stroke()
    }
    ctx.restore()
  }
  // Flags over the crowd.
  ctx.save()
  const FLAG_COLORS = ['#d84343', '#3a6fd8', '#e8e8ea']
  for (let i = 0; i < 6; i++) {
    const x = (0.06 + hash1(980 + i * 19) * 0.88) * w
    const y = h * 0.878
    const fh = h * 0.02
    ctx.strokeStyle = rgba('#1a2130', alpha * 0.9)
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y - fh * 1.6)
    ctx.stroke()
    const flap = Math.sin(time * 3 + i * 2.3) * fh * 0.18
    ctx.fillStyle = rgba(FLAG_COLORS[i % 3], alpha * 0.9)
    ctx.beginPath()
    ctx.moveTo(x, y - fh * 1.6)
    ctx.lineTo(x + fh * 1.05, y - fh * 1.25 + flap)
    ctx.lineTo(x, y - fh * 0.9)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  // Camera flashes rippling through the crowd.
  ctx.save()
  for (let i = 0; i < 14; i++) {
    const hx = hash1(1000 + i * 13.7)
    const phase = (time * (0.7 + hash1(1010 + i * 7.7) * 0.5) + hx * 9) % 1
    const on = time > 0 ? (phase < 0.06 ? 1 - phase / 0.06 : 0) : hash1(1020 + i * 3.1) < 0.25 ? 0.6 : 0
    if (on <= 0.02) continue
    const x = hx * w
    const y = h * (0.888 + hash1(1030 + i * 5.3) * 0.035)
    drawGlow(ctx, x, y, unit * 0.012, '#ffffff', alpha * on * excite)
  }
  ctx.restore()
}
