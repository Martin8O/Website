/**
 * SKY / CLIMB — the dawn ascent (the decision to fly).
 *
 * Story, all scroll-driven — and scroll IS the forward motion: the aircraft
 * stays left-of-frame, gently creeping ahead, while the WORLD streams past
 * (cloud scraps rush down-and-back, the ground slides away, the ceiling
 * looms), which gives the climb its speed and the contrail its dimension.
 *
 *  1. BELOW — a bright morning; the graduation ladder — ultralight → Z-142 →
 *     L-39C — each step-up ringed by a golden unlock pulse (facts §6/6b; the
 *     L-159 unlocks later, in the cruise era, where it belongs).
 *  2. THE PUNCH — into the dense dark ceiling: pure white, all detail gone.
 *  3. THE CUT — straight out of the white into the vast sunlit cumulus sea
 *     (no dissolve on the way out — the way a real punch-out feels).
 */

import type { Renderer } from '../../types'
import {
  clamp01,
  drawGlow,
  drawRidge,
  fillVerticalGradient,
  hash1,
  lerp,
  mixHex,
  rgba,
  smoothstep,
} from '../../toolkit'
import { drawAircraft, drawTrail } from './aircraft'
import { drawCloudDeck, drawCloudSea, drawPuff } from './clouds'
import { bvrPicture, drawCockpitHud } from './hud'
import { GRADUATION, cloudPunch, graduationAt, heroClimbPunch, sunArc } from './skyMath'
import { CLIMB_SEQ, buildTrack, createClimbPose, heroPosAt } from '../../../three/climbMath'

const GOLD = '#ffd27a'
const MONO = '"Chakra Petch", ui-monospace, Consolas, monospace'

// The authored Part-1 flight (pure, three-free): while the 3D layer owns the
// hero, the ENVIRONMENT streams against the aircraft's own motion — sky and
// ground drift derive from the hero's position, still a pure fn of scroll.
const TRACKS = CLIMB_SEQ.aircraft.map((a) => buildTrack(a))
const HERO_POSE = createClimbPose()

export const renderClimb: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h } = cfg
  const unit = Math.min(w, h)
  // Hero-flip mode retimes the whole chapter: everything below the deck, the
  // white-out only at the very end (the L-39 melts into it), no above phase.
  const { fog, above, approach } = cfg.hero3d ? heroClimbPunch(t) : cloudPunch(t)
  const below = 1 - above

  // World drift: 2D-only mode keeps the original "scroll IS the climb"
  // streaming; in hero-flip mode the world answers the AIRCRAFT — flying
  // right streams the scraps left, climbing sinks them (and the ground),
  // descending in the loop floats them back up.
  let driftX = t * 1.1
  let driftY = t * 1.45
  let groundShift = t * 0.55
  if (cfg.hero3d) {
    heroPosAt(TRACKS, cfg.tRaw ?? t, HERO_POSE)
    const hx = HERO_POSE.p[0] + 5.657 // 0 at Ulla's first snap
    const hy = HERO_POSE.p[1] + 3.917
    driftX = t * 0.25 + hx * 0.09
    driftY = t * 0.35 + hy * 0.16
    groundShift = t * 0.12 + hy * 0.08
  }

  // ==== BELOW THE DECK ======================================================
  if (below > 0.004) {
    const a = alpha * below
    const dim = approach * 0.65 // the ceiling steals the light as it closes in

    fillVerticalGradient(
      ctx,
      0,
      0,
      w,
      h,
      [
        [0, mixHex('#3b5f9d', '#2b3f63', dim)],
        [0.55, mixHex('#7fa0cc', '#4d5c7c', dim)],
        [1, mixHex('#f0b473', '#8d7a6a', dim)],
      ],
      a,
    )

    // Morning sun, upper LEFT (northern hemisphere — it will cross the whole
    // Air-Force section left→right). Weak down here: we fly under a ceiling.
    const sunA = a * 0.18 * (1 - dim)
    drawGlow(ctx, w * 0.18, h * 0.2, unit * 0.24, '#ffd98a', sunA)
    drawGlow(ctx, w * 0.18, h * 0.2, unit * 0.07, '#fff3d2', sunA * 1.4)

    // The countryside FLYING PAST backwards and sinking away — the same
    // landscape translating (scrollX), never remodelling.
    const groundY = h * (0.8 + groundShift)
    if (groundY < h * 1.1) {
      const groundA = a * (1 - smoothstep(0.3, 0.45, cfg.hero3d ? groundShift / 0.55 : t))
      drawRidge(ctx, {
        w, y: groundY, amp: h * 0.02, seed: 21,
        color: mixHex('#2b3550', '#1c2438', dim), bottom: h + 2, scrollX: driftX * w * 1.45, alpha: groundA,
      })
      fillVerticalGradient(
        ctx, 0, groundY - h * 0.05, w, h * 0.1,
        [[0, 'rgba(0,0,0,0)'], [0.6, rgba('#c8d4e8', 0.14)], [1, 'rgba(0,0,0,0)']],
        groundA,
      )
    }

    // Cloud scraps streaming DOWN and BACK past us — climb + forward speed.
    // Flat, torn fractus shapes (three squashed lobes), not balls.
    ctx.save()
    for (let i = 0; i < 13; i++) {
      const hx = hash1(60 + i * 13.7)
      const hs = hash1(80 + i * 7.3)
      const drop = hash1(70 + i * 9.1) + driftY + time * 0.004
      const py = (drop % 1.3) * h * 1.15 - h * 0.06
      const px = ((((hx - driftX * (0.6 + hs)) % 1.15) + 1.15) % 1.15) * w * 1.1 - w * 0.05
      const r = h * (0.03 + hs * 0.045)
      const shade = mixHex('#8fa3c4', '#5d6d8c', dim)
      const lit = mixHex('#e6eefa', '#9aa8c2', dim)
      drawPuff(ctx, px, py + r * 0.35, r * 0.95, shade, a * 0.3, 2.6)
      drawPuff(ctx, px - r * 1.3, py + r * 0.15, r * 0.6, lit, a * 0.4, 1.8)
      drawPuff(ctx, px + r * 1.2, py + r * 0.2, r * 0.55, lit, a * 0.38, 1.9)
      drawPuff(ctx, px, py, r * 0.7, lit, a * 0.5, 2.2)
    }
    ctx.restore()

    // --- The graduation beat -------------------------------------------------
    // Left of frame (the chapter text lives on the right), creeping forward.
    // Skipped when the 3D layer owns the hero (E3b): the REAL Ulla → Z-142 →
    // L-39 fly the ladder in the layer above this very environment.
    if (!cfg.hero3d) {
      const grad = graduationAt(t)
      const rung = GRADUATION[grad.index]
      const cx = w * (0.2 + t * 0.14)
      const cy = h * (0.66 - t * 0.36) + Math.sin(time * 1.1) * h * 0.004
      const tilt = 0.2
      const size = unit * (0.105 + grad.index * 0.02) // each craft a touch bigger
      const body = mixHex('#232c44', '#161d30', dim)

      if (grad.index >= 2) {
        // Contrail exactly opposite the velocity — a hint, not a stripe.
        drawTrail(
          ctx,
          cx - size * 0.5, cy + size * 0.2,
          cx - size * 0.5 - Math.cos(tilt) * size * 3.6, cy + size * 0.2 + Math.sin(tilt) * size * 3.6,
          size * 0.05, '#dfe9f7', a * 0.08,
        )
      }
      drawAircraft(ctx, rung.craft, {
        x: cx, y: cy, size, tilt, color: body, glint: '#cfe2ff', alpha: a, time,
      })

      // Unlock pulse: an expanding golden ring + the craft's name, per step-up.
      if (grad.pulse > 0.01) {
        const spread = 1 - grad.pulse
        ctx.save()
        ctx.strokeStyle = rgba(GOLD, a * grad.pulse * 0.55)
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(cx, cy, size * (0.55 + spread * 1.1), 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }
      const labelA = a * (0.3 + grad.pulse * 0.65)
      ctx.save()
      ctx.font = `${Math.max(10, Math.round(unit * 0.016))}px ${MONO}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = rgba(GOLD, labelA)
      ctx.fillText(rung.label, cx + size * 0.62, cy + size * 0.52)
      ctx.restore()
    }

    // The ceiling overhead — a dark, dense cumulus sea upside-down, looming
    // lower as we climb at it (and streaming with the scroll like the rest
    // of the world). In hero-flip mode it looms across the SECOND half of
    // the stretched chapter — the whole authored flight happens under it,
    // and the L-39's final vertical climb drives straight into it.
    const deckIn = cfg.hero3d ? smoothstep(0.38, 0.82, t) : smoothstep(0.16, 0.5, t)
    if (deckIn > 0.001) {
      // Greys over deep blue — a heavy, overcast ceiling (never green: the
      // palette keeps r=g with blue a full step above, quantization-proof).
      drawCloudDeck(ctx, {
        w, h, edgeY: lerp(-h * 0.04, h * 0.62, deckIn),
        lit: '#767684', shade: '#1e1e2c', haze: '#424250',
        alpha: a * (cfg.hero3d ? smoothstep(0.38, 0.52, t) : smoothstep(0.16, 0.28, t)),
        t, time, sunX: w * 0.18, seed: 9,
      })
    }
  }

  // ==== ABOVE THE DECK — the cumulus sea ====================================
  if (above > 0.004) {
    const a = alpha * above

    fillVerticalGradient(
      ctx,
      0,
      0,
      w,
      h,
      [
        [0, '#0c3f8c'],
        [0.5, '#3f7cc4'],
        [0.78, '#9fcbe8'],
        [1, '#eaf5fc'],
      ],
      a,
    )

    // Above the ceiling the SAME sun blazes — brighter and bigger up here.
    // Its position comes from the section-wide `sunArc` evaluated at the
    // continuous story position: every sky scene reads the same arc, so the
    // sun glides through every hand-over without a freeze or a ghost.
    const sun = sunArc(1.5 + (cfg.tRaw ?? t))
    const sunX = w * sun.x
    const sunY = h * sun.y
    drawGlow(ctx, sunX, sunY, unit * 0.5, '#cfe6ff', a * 0.34)
    drawGlow(ctx, sunX, sunY, unit * 0.2, '#ffe9ad', a * 0.65)
    drawGlow(ctx, sunX, sunY, unit * 0.08, '#fffbe8', a)
    ctx.save()
    ctx.fillStyle = rgba('#fffdf2', a)
    ctx.beginPath()
    ctx.arc(sunX, sunY, unit * 0.026, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // The endless sheep-backed sea — streaming right→left FAST (up here the
    // scroll is the aircraft's forward motion; near rows quickest). Horizon,
    // palette, seed AND drift phase all match the cruise exactly: during the
    // cross-fade both scenes paint the very same sea (no doubling).
    const horizonY = h * 0.56
    drawCloudSea(ctx, {
      w, h, horizonY, lit: '#ffffff', shade: '#8ea9c9', haze: '#e4edf6',
      alpha: a, t: cfg.tRaw ?? t, time, sunX, seed: 4, drift: 0.8,
    })
    // A few far towers standing above the sea line — scale for the vastness.
    ctx.save()
    for (let i = 0; i < 3; i++) {
      const tx = ((((0.14 + hash1(140 + i * 31) * 0.7 - t * 0.3) % 1) + 1) % 1) * w
      const tr = h * (0.03 + hash1(150 + i * 17) * 0.025)
      drawPuff(ctx, tx, horizonY - tr * 0.5, tr, '#e9f2fb', a * 0.5)
      drawPuff(ctx, tx + tr * 0.7, horizonY - tr * 0.15, tr * 0.7, '#dfeaf7', a * 0.45)
    }
    ctx.restore()

    // The whole above-deck AIRCRAFT story is the hero's — skipped when the
    // 3D layer owns it (E3b): there the L-39 is still climbing THROUGH this
    // sea toward its cloud entry, and the L-159/HUD beat belongs to the
    // cruise scene that takes the frame next.
    if (!cfg.hero3d) {
      // The L-39 punching out LEFT — near where it climbed — then riding
      // forward to the exact spot + attitude the cruise solo holds, BEFORE the
      // cross-fade starts (so the two scenes overlap pixel-close, no ghost).
      const rise = smoothstep(0.6, 0.8, t)
      const px = w * (0.3 + rise * 0.2)
      const py = h * (0.56 - rise * 0.22) + Math.sin(time * 0.9) * h * 0.004
      const tilt = lerp(0.3, 0.06, rise)

      // Contrail: there from the very first frame out of the white — straight
      // back along the flight path, still just a hint.
      drawTrail(
        ctx,
        px - Math.cos(tilt) * unit * 0.07, py + Math.sin(tilt) * unit * 0.07 + unit * 0.012,
        px - Math.cos(tilt) * unit * 0.55, py + Math.sin(tilt) * unit * 0.55 + unit * 0.012,
        unit * 0.007, '#f2f7ff', a * 0.1 * smoothstep(0.6, 0.63, t),
      )

      // THE L-159 UNLOCK — the moment the jet levels off after the punch-out
      // (the burst puffs have just dissolved), the graduation ladder ends: the
      // L-39 dissolves into the stores L-159 (2012), ringed by the same golden
      // pulse the earlier rungs got. From here on he flies the modern jet —
      // level, all the way through the cruise hand-over (Martin: switch early,
      // give the L-159 a long straight run before the one-circle fight).
      const toL159 = smoothstep(0.8, 0.88, t)
      if (toL159 < 1) {
        drawAircraft(ctx, 'l39', {
          x: px, y: py, size: unit * 0.13, tilt, color: '#22314e', glint: '#dcecff', alpha: a * (1 - toL159), time,
        })
      }
      if (toL159 > 0) {
        drawAircraft(ctx, 'l159p', {
          x: px, y: py, size: unit * 0.14, tilt, color: '#22314e', glint: '#dcecff', alpha: a * toL159, time,
        })
        // The "L-159" tag rides WITH the jet (not just the unlock flash) so the
        // aircraft stays named as it flies out — matches the HUD era flipping to
        // "2012–2021 · L-159" at this exact beat (Martin).
        ctx.save()
        ctx.font = `${Math.max(10, Math.round(unit * 0.016))}px ${MONO}`
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = rgba(GOLD, a * toL159 * 0.9)
        ctx.fillText('L-159', px + unit * 0.1, py + unit * 0.09)
        ctx.restore()
      }
      const pulse = smoothstep(0.8, 0.84, t) * (1 - smoothstep(0.92, 0.98, t))
      if (pulse > 0.01) {
        const spread = smoothstep(0.8, 0.98, t)
        ctx.save()
        ctx.strokeStyle = rgba(GOLD, a * pulse * 0.55)
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(px, py, unit * 0.14 * (0.55 + spread * 1.1), 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      // The green cockpit HUD snaps ON — COMPLETE, full intensity, no fade —
      // the instant the L-159 shows (26 %, mid-ring; Martin: the whole picture
      // at once, framed contacts included, exactly as it looks a beat later).
      // The BVR picture is one shared function of the story position, so the
      // contacts drift and their ranges count down seamlessly into the cruise.
      if (toL159 > 0.2) {
        const bvr = bvrPicture(1.5 + (cfg.tRaw ?? t), w, h)
        drawCockpitHud(ctx, {
          w, h, alpha: a,
          attack: 0,
          target: bvr.target,
          target2: bvr.target2,
          rangeNm: bvr.rangeNm,
          mach: 0.74,
          altFt: 21500,
          hdg: 139,
        })
      }

      // The burst: only the LATE phase — a ring of torn white already flying
      // apart (the tight in-transition puffs died with the dissolve).
      const burst = smoothstep(0.6, 0.62, t) * (1 - smoothstep(0.66, 0.74, t))
      if (burst > 0.01) {
        const exitX = w * 0.3
        const exitY = h * 0.57
        const rad = unit * (0.12 + smoothstep(0.6, 0.74, t) * 0.16)
        ctx.save()
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2 + hash1(i + 260) * 0.6
          const rr = rad * (0.8 + hash1(i + 270) * 0.5)
          drawPuff(ctx, exitX + Math.cos(ang) * rr, exitY + Math.sin(ang) * rr * 0.7, unit * 0.03, '#ffffff', a * burst * 0.7)
        }
        ctx.restore()
      }
    }
  }

  // ==== THE WHITE-OUT (painted last — it owns the frame at its peak) =======
  if (fog > 0.004) {
    const f = alpha * fog
    ctx.save()
    ctx.fillStyle = rgba('#eef2f7', clamp01(f * 0.985))
    ctx.fillRect(0, 0, w, h)
    // Water droplets racing DOWN the canopy glass — clearly visible
    // outlines, each its own size, opacity and pace. (Inside a cloud the
    // airflow paints the cockpit with rain.)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (let i = 0; i < 20; i++) {
      const hx = hash1(90 + i * 11.3)
      const hs = hash1(100 + i * 5.9)
      const hp = hash1(110 + i * 7.7)
      const ha = hash1(120 + i * 3.1)
      const r = unit * (0.007 + hs * 0.014) // bottom-bulb radius
      const tail = r * (1.8 + hp * 1.4) // tail reaching up the glass
      // Race down with the scroll (plus ambient trickle), wrapping.
      const y = ((hp + t * (4.5 + hs * 3) + time * 0.06) % 1.25) * h * 1.1 - h * 0.05
      const x = hx * w + Math.sin(y * 0.01 + i) * r * 0.6 // gentle meander
      const a = f * (0.24 + ha * 0.26)
      ctx.strokeStyle = rgba('#8b9cb4', a)
      ctx.lineWidth = Math.max(1, unit * 0.0017)
      ctx.beginPath()
      // Teardrop outline: tapered tail up top, round bulb below.
      ctx.moveTo(x, y - tail)
      ctx.quadraticCurveTo(x - r * 0.85, y - r * 0.6, x - r, y + r * 0.15)
      ctx.arc(x, y + r * 0.15, r, Math.PI, 0, true)
      ctx.quadraticCurveTo(x + r * 0.85, y - r * 0.6, x, y - tail)
      ctx.stroke()
    }
    ctx.restore()
  }
}
