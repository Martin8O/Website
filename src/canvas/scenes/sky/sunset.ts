/**
 * SKY / SUNSET — the end of service, the poetic close (facts §6b): one
 * aircraft LANDING at sunset in romantic golden-rose light.
 *  - a gold→rose→violet evening sky, the sun sinking below the horizon as
 *    you scroll; thin dark stratus bars across it,
 *  - a dark airfield with a lit runway: edge lights, approach lights, PAPI,
 *  - the L-159 glides in, flares, touches down (a puff off the wheels),
 *    and rolls out to a stop — the landing math is pure and unit-tested,
 *  - as the roll ends, the sky cools toward dusk and the first stars come
 *    out: the hand-off to `calm` (healing) has already begun.
 */

import type { Renderer } from '../../types'
import {
  drawGlow,
  drawStars,
  fillVerticalGradient,
  hash1,
  mixHex,
  rgba,
  smoothstep,
} from '../../toolkit'
import { drawAircraft } from './aircraft'
import { drawPuff } from './clouds'
import { TOUCHDOWN, landingPose, sunArc } from './skyMath'

export const renderSunset: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h } = cfg
  const unit = Math.min(w, h)
  const horizonY = h * 0.7
  const cool = smoothstep(0.72, 1, t) // evening deepens after the landing

  // --- The golden-rose evening ------------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      [0, mixHex('#3a2350', '#152438', cool)],
      [0.42, mixHex('#7e3a5e', '#3a2b50', cool)],
      [0.72, mixHex('#c65f63', '#7e3a55', cool)],
      [0.92, mixHex('#f2a35c', '#b8656a', cool)],
      [1, mixHex('#ffd9a0', '#d09070', cool)],
    ],
    alpha,
  )

  // First stars as the light cools.
  drawStars(ctx, {
    w, h: h * 0.4, count: 50, seed: 61, alpha: alpha * cool * 0.55, size: 1.4,
    time, twinkle: 0.45, xShift: time * 0.0009,
  })

  // The sun finishes the section-wide arc in the WEST — same shared
  // trajectory as every other sky scene (continuous position, no pause, no
  // ghost): a slanted setting line that touches the horizon around
  // touchdown and is gone once the jet has braked.
  const sun = sunArc(5.5 + (cfg.tRaw ?? t))
  const sunX = w * sun.x
  const sunY = h * sun.y
  // Redden with the DESCENT itself (arc height), not with scene-local time.
  const setProg = smoothstep(0.42, 0.72, sun.y)
  // …and it REDDENS on the way down, from the airshow's pale gold to blood-red.
  const glowColor = mixHex('#fff3c4', '#c81e08', setProg)
  const coreColor = mixHex('#fffdf0', '#f03510', setProg)
  const discColor = mixHex('#fffdf2', '#ff4518', setProg)
  drawGlow(ctx, sunX, Math.min(sunY, horizonY), unit * 0.4, glowColor, alpha * (0.4 - cool * 0.18))
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, horizonY)
  ctx.clip()
  drawGlow(ctx, sunX, sunY, unit * 0.12, coreColor, alpha * 0.7 * (1 - cool * 0.5))
  ctx.fillStyle = rgba(discColor, alpha * (1 - cool * 0.4))
  ctx.beginPath()
  // The low sun swells as it sinks — from the airshow's size to a big disc
  // (holding the airshow's exact size through the cross-fade).
  ctx.arc(sunX, sunY, unit * (0.028 + smoothstep(0.38, 0.72, sun.y) * 0.024), 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Thin stratus bars crossing the sun — the classic sunset signature. The
  // ones NEAR the sinking sun catch its red; the far ones stay dusk-dark.
  ctx.save()
  for (let i = 0; i < 4; i++) {
    const y = h * (0.5 + i * 0.055) + hash1(860 + i * 7) * h * 0.02
    const x = (w * (0.42 + hash1(850 + i * 11) * 0.45) + time * (0.6 + i * 0.2)) % (w * 1.2)
    const r = h * (0.008 + hash1(870 + i * 5) * 0.007)
    const base = mixHex('#6e2f4a', '#2c2038', cool)
    const prox = Math.exp(
      -(Math.pow((x - sunX) / (w * 0.2), 2) + Math.pow((y - sunY) / (h * 0.17), 2)),
    )
    drawPuff(ctx, x, y, r, mixHex(base, '#e03812', prox * setProg * 0.95), alpha * 0.78, 9 + i * 2)
  }
  ctx.restore()

  // Horizon glow band — bleeding red with the sinking sun, strongest near it.
  fillVerticalGradient(
    ctx, 0, horizonY - h * 0.05, w, h * 0.08,
    [[0, 'rgba(0,0,0,0)'], [0.6, rgba(mixHex('#ffb677', '#e03210', setProg * 0.85), 0.26 * (1 - cool * 0.5))], [1, 'rgba(0,0,0,0)']],
    alpha,
  )
  // A concentrated blood-red pool of light around the sun's setting point.
  drawGlow(ctx, sunX, Math.min(sunY, horizonY), unit * 0.22, '#e02808', alpha * setProg * 0.4)

  // --- The airfield in silhouette ---------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    horizonY,
    w,
    h - horizonY,
    [
      [0, mixHex('#241626', '#101018', cool * 0.5)],
      [0.5, '#140e18'],
      [1, '#07060a'],
    ],
    alpha,
  )
  // Sunset afterglow washing over the field — and the contrast bed the dark
  // jet lands against.
  drawGlow(ctx, sunX, horizonY + h * 0.06, w * 0.55, '#b06a4e', alpha * 0.24 * (1 - cool * 0.55))
  fillVerticalGradient(
    ctx, 0, horizonY, w, h * 0.11,
    [[0, rgba('#8a4a44', 0.16 * (1 - cool * 0.5))], [1, 'rgba(0,0,0,0)']],
    alpha,
  )
  // Distant hangars + tower, black against the last light.
  ctx.save()
  ctx.fillStyle = rgba('#0d0912', alpha)
  const hbY = horizonY + h * 0.012
  ctx.beginPath()
  ctx.moveTo(w * 0.06, hbY)
  ctx.ellipse(w * 0.09, hbY, w * 0.03, h * 0.03, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(w * 0.135, hbY)
  ctx.ellipse(w * 0.155, hbY, w * 0.02, h * 0.02, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(w * 0.2, hbY - h * 0.055, w * 0.008, h * 0.055)
  ctx.fillRect(w * 0.192, hbY - h * 0.068, w * 0.024, h * 0.016)
  ctx.restore()

  // --- The runway, lights warming as dusk deepens ----------------------------
  const rwyTop = h * 0.765
  const rwyH = h * 0.028
  fillVerticalGradient(
    ctx, w * 0.05, rwyTop, w * 0.91, rwyH,
    [[0, '#2b2133'], [0.5, '#241c2c'], [1, '#191320']],
    alpha,
  )
  const lightA = alpha * (0.55 + cool * 0.45)
  ctx.save()
  // Edge lights along both sides.
  for (let i = 0; i <= 16; i++) {
    const x = w * (0.07 + i * 0.055)
    drawGlow(ctx, x, rwyTop - 1, unit * 0.006, '#ffcf8a', lightA * 0.8)
    drawGlow(ctx, x, rwyTop + rwyH + 1, unit * 0.006, '#ffcf8a', lightA * 0.7)
    ctx.fillStyle = rgba('#ffe9c4', lightA)
    ctx.fillRect(x - 1, rwyTop - 2, 2, 2)
    ctx.fillRect(x - 1, rwyTop + rwyH, 2, 2)
  }
  // Threshold greens at the approach end (right — the jet lands leftward).
  for (let i = 0; i < 5; i++) {
    const x = w * (0.945 + 0.004)
    const y = rwyTop + (i + 0.5) * (rwyH / 5)
    ctx.fillStyle = rgba('#7dffa0', lightA * 0.9)
    ctx.fillRect(x, y - 1, 2.4, 2)
  }
  // Approach light stubs stretching right of the threshold.
  for (let i = 0; i < 4; i++) {
    const x = w * (0.965 + i * 0.012)
    drawGlow(ctx, x, rwyTop + rwyH * 0.5, unit * 0.004, '#ffffff', lightA * (0.7 - i * 0.12))
  }
  // PAPI cluster left of the touchdown zone: two white, two red.
  for (let i = 0; i < 4; i++) {
    const x = w * (0.35 + i * 0.012)
    drawGlow(ctx, x, rwyTop + rwyH + h * 0.012, unit * 0.005, i < 2 ? '#ff5a4d' : '#ffffff', lightA * 0.85)
  }
  ctx.restore()

  // --- The landing ------------------------------------------------------------
  const pose = landingPose(t)
  const size = unit * 0.16
  const jetX = w * (0.42 - pose.x * 0.52)
  const gearY = rwyTop - size * 0.17 // wheel bottoms on the surface
  const jetY = gearY - pose.alt * h * 0.42
  drawAircraft(ctx, 'l159', {
    x: jetX, y: jetY, size, dir: -1, tilt: pose.pitch, gear: 1,
    color: '#2e2136', glint: '#ffcf8a', alpha, time,
  })
  // Warm rim light from the low sun along the spine.
  drawGlow(ctx, jetX, jetY - size * 0.05, size * 0.4, '#ff9d5c', alpha * 0.22 * (1 - cool * 0.4))
  // Blinking nav strobe on the fin (steady when time is frozen).
  const strobe = time > 0 ? (time % 1.1 < 0.12 ? 1 : 0.12) : 0.6
  drawGlow(ctx, jetX + size * 0.44, jetY - size * 0.16, size * 0.05, '#ff5a4d', alpha * strobe * 0.8)

  // Touchdown: a puff off the wheels, drifting back and dissolving.
  const puff = smoothstep(TOUCHDOWN, TOUCHDOWN + 0.015, t) * (1 - smoothstep(TOUCHDOWN + 0.03, TOUCHDOWN + 0.16, t))
  if (puff > 0.01) {
    const spread = smoothstep(TOUCHDOWN, TOUCHDOWN + 0.16, t)
    ctx.save()
    for (let i = 0; i < 3; i++) {
      drawPuff(
        ctx,
        w * 0.42 + size * (0.15 + i * 0.16 + spread * 0.35),
        rwyTop - h * 0.004 - i * h * 0.003,
        size * 0.07 * (1 + spread * 2 + i * 0.35),
        '#b9a4b8',
        alpha * puff * (0.55 - i * 0.13),
      )
    }
    ctx.restore()
  }
}
