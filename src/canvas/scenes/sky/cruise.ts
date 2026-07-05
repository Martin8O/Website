/**
 * SKY / CRUISE — the flying heart, escalating exactly as Martin flew it
 * (facts §6b). Up here scroll is the aircraft's motion: jets hold near the
 * frame centre while the cumulus sea streams past beneath them (near rows
 * fast, far rows slow — perspective).
 *
 *  1. SOLO — one L-39 alone above the sea, a hint of contrail.
 *  2. THE ONE-CIRCLE FIGHT — per Martin's diagram (`1 circle fight
 *     principle.png`): two jets corkscrew down a shared VERTICAL HELIX,
 *     opposite sides of the axis, paths weaving like a double helix — near
 *     side bigger and faster, far side small behind it. Graceful, never
 *     violent.
 *  3. COMAO — the L-159 era arrives with its own golden unlock (2012 — this
 *     is where it belongs, not in the CTU→Brno climb): twilight falls (the
 *     HUD photo's rose horizon), a mixed package rides beside you, the green
 *     cockpit HUD lights up, and the run closes with a ground strike through
 *     a gap in the sea — BVR to A-G.
 */

import type { Renderer } from '../../types'
import {
  drawGlow,
  fillVerticalGradient,
  lerp,
  mixHex,
  rgba,
  smoothstep,
} from '../../toolkit'
import { drawAircraft, drawTrail } from './aircraft'
import { drawCloudSea } from './clouds'
import { drawCockpitHud } from './hud'
import { helixPoint, sunArc } from './skyMath'

const GOLD = '#ffd27a'
const MONO = '"Chakra Petch", ui-monospace, Consolas, monospace'

export const renderCruise: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h } = cfg
  const unit = Math.min(w, h)
  // Day slides toward a GOLDEN AFTERNOON only (the sun has the whole section
  // still to cross — deep twilight belongs to the sunset chapter).
  const gold = smoothstep(0.55, 0.9, t)

  // --- Sky: noon blue warming gently at the horizon --------------------------
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      [0, mixHex('#0d47a1', '#1b55a4', gold)],
      [0.45, mixHex('#4f8ecf', '#5e93c8', gold)],
      [0.78, mixHex('#bcdcf0', '#cfd3d8', gold)],
      [1, mixHex('#e6f3fb', '#f2cf9e', gold)],
    ],
    alpha,
  )

  // The sun — the section-wide arc, evaluated at the continuous position:
  // it glides in from the climb and on toward the desert without ever
  // freezing or doubling (same function on both sides of every seam).
  const sun = sunArc(2.5 + (cfg.tRaw ?? t))
  const sunX = w * sun.x
  const sunY = h * sun.y
  drawGlow(ctx, sunX, sunY, unit * 0.5, mixHex('#cfe6ff', '#ffe2b0', gold), alpha * 0.32)
  drawGlow(ctx, sunX, sunY, unit * 0.2, mixHex('#ffe9ad', '#ffd898', gold), alpha * 0.62)
  drawGlow(ctx, sunX, sunY, unit * 0.08, '#fffbe8', alpha)
  ctx.save()
  ctx.fillStyle = rgba('#fffdf2', alpha)
  ctx.beginPath()
  ctx.arc(sunX, sunY, unit * 0.026, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // --- The cumulus sea, streaming right→left beneath the flight -------------
  // Clouds stay WHITE with soft grey shading (the golden hour lives in the
  // sky + sun, not in the cloud paint). Same sea as the climb — and the
  // drift phase CONTINUES where the climb ended (t + 1 at the same rate), so
  // the cross-fade overlays one identical, identically-moving sea.
  const horizonY = h * 0.56
  drawCloudSea(ctx, {
    w, h, horizonY,
    lit: '#ffffff',
    shade: mixHex('#8ea9c9', '#9aa3b2', gold),
    haze: '#e4edf6',
    alpha, t: 1 + (cfg.tRaw ?? t), time, sunX, seed: 4, drift: 0.8,
  })

  // --- COMAO entry gate (seg-3) ----------------------------------------------
  const seg3 = smoothstep(0.6, 0.7, t)

  // --- 1. SOLO — holding centre frame, the world doing the moving -----------
  // Position/attitude/size are EXACTLY the climb's hand-over state, so the
  // cross-fade stacks two identical jets — one aircraft, no ghost.
  const solo = (1 - smoothstep(0.24, 0.34, t)) * alpha
  if (solo > 0.004) {
    // Holds the exact hand-over spot until the cross-fade has fully resolved
    // (t = 0.2), then creeps forward — zero ghost during the blend.
    const glide = Math.max(0, t - 0.2)
    const sx = w * (0.5 + glide * 0.075)
    const sy = h * (0.34 - glide * 0.0625) + Math.sin(time * 0.9) * h * 0.004
    const stilt = 0.06
    drawTrail(
      ctx,
      sx - Math.cos(stilt) * unit * 0.07, sy + Math.sin(stilt) * unit * 0.07 + unit * 0.012,
      sx - Math.cos(stilt) * unit * 0.55, sy + Math.sin(stilt) * unit * 0.55 + unit * 0.012,
      unit * 0.007, '#f2f7ff', solo * 0.1,
    )
    drawAircraft(ctx, 'l39', {
      x: sx, y: sy, size: unit * 0.13, tilt: stilt, color: '#22314e', glint: '#dcecff', alpha: solo, time,
    })
  }

  // --- 2. THE ONE-CIRCLE FIGHT — a vertical helix, corkscrewing UP ----------
  // (Martin's diagram, inverted start: they enter low over the sea and climb
  // the shared axis together.) Depth carries the drama: the near pass is the
  // biggest jet with the strongest trail; on the far side both fade small.
  const ballet = smoothstep(0.24, 0.34, t) * (1 - smoothstep(0.58, 0.68, t)) * alpha
  if (ballet > 0.004) {
    const axisX = w * 0.5
    const bottomY = h * 0.62 // enter just above the sea…
    const Rx = unit * 0.24 // horizontal reach of the helix
    const pitch = h * 0.26 // vertical CLIMB per revolution
    const turns = (t - 0.28) * 3.2
    const project = (turnsAt: number, phase: number) => {
      const p = helixPoint(turnsAt, phase)
      const persp = 1 + 0.3 * p.z // near side swings wider
      return {
        x: axisX + p.x * Rx * persp,
        y: bottomY - turnsAt * pitch, // …and corkscrew upward
        z: p.z,
      }
    }
    const jets = [0, Math.PI].map((phase) => {
      // Weaving trail: half a revolution back along the corkscrew, kept as
      // {x,y,z} samples so alpha/width can follow the depth.
      const pts: Array<{ x: number; y: number; z: number }> = []
      for (let i = 34; i >= 0; i--) {
        pts.push(project(turns - i * 0.015, phase))
      }
      const now = project(turns, phase)
      const ahead = project(turns + 0.012, phase)
      return {
        pts,
        now,
        heading: Math.atan2(ahead.y - now.y, ahead.x - now.x),
      }
    })
    // Depth-modulated trails: strongest right behind the near pass, dying
    // toward the far side — drawn as continuous buckets (no beading).
    ctx.save()
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (const j of jets) {
      const buckets = 8
      const n = j.pts.length - 1
      for (let b = 0; b < buckets; b++) {
        const i0 = Math.floor((b / buckets) * n)
        const i1 = Math.min(Math.floor(((b + 1) / buckets) * n), n)
        if (i1 <= i0) continue
        const mid = j.pts[Math.floor((i0 + i1) / 2)]
        const near = (mid.z + 1) / 2
        const age = 1 - (b + 0.5) / buckets
        const aTrail = ballet * (0.03 + 0.17 * near) * Math.pow(1 - age, 0.7)
        if (aTrail <= 0.004) continue
        ctx.strokeStyle = rgba('#e6eefb', aTrail)
        ctx.lineWidth = unit * 0.004 * (1 + 1.6 * near)
        ctx.beginPath()
        ctx.moveTo(j.pts[i0].x, j.pts[i0].y)
        for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(j.pts[i].x, j.pts[i].y)
        ctx.stroke()
      }
    }
    ctx.restore()
    // Far jet small and dim behind the axis, near jet big in front.
    for (const j of [...jets].sort((a, b) => a.now.z - b.now.z)) {
      const near = (j.now.z + 1) / 2
      drawAircraft(ctx, 'l39', {
        x: j.now.x, y: j.now.y, size: unit * (0.06 + 0.1 * near),
        tilt: -j.heading, color: mixHex('#2c3c60', '#1b2540', 1 - near),
        glint: '#d7e8ff', alpha: ballet * (0.6 + 0.4 * near), time,
      })
    }
  }

  // --- 3. COMAO + the strike --------------------------------------------------
  if (seg3 > 0.004) {
    const a = seg3 * alpha
    const slide = (1 - seg3) * w * 0.18
    const bob = Math.sin(time * 0.8) * h * 0.003
    const body = mixHex('#2a3550', '#242e46', gold)

    // Lead L-159 (you fly the other one) + wingman.
    const leadX = w * 0.6 - slide
    const leadY = h * 0.36 + bob
    // Trail runs straight back along his own flight line, clear of the wingman.
    drawTrail(ctx, leadX - unit * 0.1, leadY + unit * 0.01, leadX - w * 0.4, leadY + unit * 0.026, unit * 0.008, '#dde8f8', a * 0.08)
    drawAircraft(ctx, 'l159', {
      x: leadX, y: leadY, size: unit * 0.19, tilt: 0.04, color: body, glint: '#d7ecff', alpha: a, time,
    })
    drawAircraft(ctx, 'l159', {
      x: w * 0.47 - slide * 1.2, y: h * 0.43 - bob, size: unit * 0.15, tilt: 0.04, color: body, glint: '#d7ecff', alpha: a * 0.95, time,
    })

    // The L-159 unlock — 2012, the modern jet arrives (closes the ladder
    // the climb started; same golden motif).
    const pulse = smoothstep(0.66, 0.68, t) * (1 - smoothstep(0.72, 0.8, t))
    if (pulse > 0.01) {
      const spread = smoothstep(0.66, 0.8, t)
      ctx.save()
      ctx.strokeStyle = rgba(GOLD, a * pulse * 0.55)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(leadX, leadY, unit * 0.19 * (0.55 + spread * 1.1), 0, Math.PI * 2)
      ctx.stroke()
      ctx.font = `${Math.max(10, Math.round(unit * 0.016))}px ${MONO}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = rgba(GOLD, a * pulse * 0.9)
      ctx.fillText('L-159', leadX + unit * 0.13, leadY + unit * 0.11)
      ctx.restore()
    }

    // The exercise package: an echelon of distant jets + two helicopters low.
    for (let i = 0; i < 4; i++) {
      const dx = w * (0.14 + i * 0.055) - slide * 1.5
      const dy = h * (0.22 + i * 0.024) + bob * (i % 2 ? 1 : -1)
      drawTrail(ctx, dx - unit * 0.02, dy, dx - unit * 0.12, dy + h * 0.012, unit * 0.004, '#d8e4f4', a * 0.07)
      drawAircraft(ctx, 'dart', { x: dx, y: dy, size: unit * 0.034, color: body, alpha: a * 0.85, time })
    }
    for (let i = 0; i < 2; i++) {
      drawAircraft(ctx, 'heli', {
        x: w * (0.3 + i * 0.085) - slide, y: h * (0.525 + i * 0.02) + bob, size: unit * 0.055,
        color: body, glint: '#cfe2f8', alpha: a * 0.9, time,
      })
    }

    // (No strike beat here — the display strike lives in the airshow scene.)
  }

  // --- The green cockpit HUD — you're inside the L-159 now -------------------
  const hudA = smoothstep(0.72, 0.84, t) * alpha * 0.8
  if (hudA > 0.01) {
    // Two BVR contacts far ahead — the designated bogey and his wingman a
    // touch higher and further right, both in the same green target frame.
    const bogey = { x: w * 0.86, y: h * 0.33 }
    const bogey2 = { x: w * 0.9, y: h * 0.27 }
    ctx.save()
    ctx.fillStyle = rgba('#1a2236', hudA * 0.7)
    ctx.fillRect(bogey.x - 1.5, bogey.y - 1.5, 3, 3)
    ctx.fillRect(bogey2.x - 1.5, bogey2.y - 1.5, 3, 3)
    ctx.restore()
    drawCockpitHud(ctx, {
      w, h, alpha: hudA,
      attack: 0,
      target: bogey,
      target2: bogey2,
      rangeNm: lerp(26, 4, smoothstep(0.72, 0.96, t)),
      mach: 0.74 + smoothstep(0.8, 0.95, t) * 0.08,
      altFt: 21500 - t * 4000,
      hdg: 139,
    })
  }
}
