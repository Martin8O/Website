/**
 * SKY / CRUISE — the flying heart, escalating exactly as Martin flew it
 * (facts §6b). Up here scroll is the aircraft's motion: jets hold near the
 * frame centre while the cumulus sea streams past beneath them (near rows
 * fast, far rows slow — perspective).
 *
 *  1. SOLO — the L-159 alone above the sea, a hint of contrail (the golden
 *     L-39→L-159 unlock fired at the top of the climb; the green cockpit HUD
 *     has been lit at full strength since that moment).
 *  2. THE ONE-CIRCLE FIGHT — per Martin's diagram (`1 circle fight
 *     principle.png`): two jets corkscrew down a shared VERTICAL HELIX,
 *     opposite sides of the axis, paths weaving like a double helix — near
 *     side bigger and faster, far side small behind it. Graceful, never
 *     violent.
 *  3. COMAO — golden afternoon falls (the HUD photo's rose horizon) and a
 *     mixed package rides beside you — Gripens high, Mi-17s low.
 */

import type { Renderer } from '../../types'
import {
  clamp01,
  drawGlow,
  fillVerticalGradient,
  hash1,
  lerp,
  mixHex,
  rgba,
  smoothstep,
} from '../../toolkit'
// Beat timing + the cloud-sink curve are SHARED with the 3D ballet
// (balletMath is three-free by contract) — one clock, two worlds.
import {
  BALLET,
  COMAO,
  balletPresence,
  balletTurns,
  cloudSink,
  cruiseHud,
} from '../../../three/scenes3d/balletMath'
import { drawAircraft, drawTrail } from './aircraft'
import { drawCloudSea, drawPuff } from './clouds'
import { bvrPicture, drawCockpitHudSoft } from './hud'
import { helixPoint, sunArc } from './skyMath'

// The unlock ring + tag colours — the climb's own (its beat continues here).
const GOLD = '#ffd27a'
const MONO = '"Chakra Petch", ui-monospace, Consolas, monospace'

export const renderCruise: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h } = cfg
  const unit = Math.min(w, h)
  // Day slides toward a GOLDEN AFTERNOON only at the very end of the beat —
  // the ballet flies under the noon sun (top-centre, hard light); the warmth
  // arrives with its fade-out so the COMAO rides the golden afternoon and
  // the desert enters warm (deep twilight belongs to the sunset chapter).
  const gold = smoothstep(0.88, 0.99, t)

  // --- Sky: noon blue warming gently at the horizon --------------------------
  // The 19 % cut must be INVISIBLE in the environment (Martin: same clouds,
  // same light — only the aircraft story switches): the gradient STARTS as
  // the climb's exact above-deck sky and eases into the cruise's own across
  // the solo run, far too slowly for the eye to catch.
  const fromClimb = 1 - smoothstep(0, 0.3, t)
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      [0, mixHex(mixHex('#0d47a1', '#0c3f8c', fromClimb), '#1b55a4', gold)],
      [lerp(0.45, 0.5, fromClimb), mixHex(mixHex('#4f8ecf', '#3f7cc4', fromClimb), '#5e93c8', gold)],
      [0.78, mixHex(mixHex('#bcdcf0', '#9fcbe8', fromClimb), '#cfd3d8', gold)],
      [1, mixHex(mixHex('#e6f3fb', '#eaf5fc', fromClimb), '#f2cf9e', gold)],
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
  // THE CLIMB READ: the ballet camera rides the corkscrewing pair upward, so
  // the deck SINKS across the fight (shared `cloudSink` curve — the 3D world
  // climbs on the same clock) and holds low for the COMAO; some sea always
  // stays in frame. The sun does NOT move with it — `sunArc` is one object
  // across every flying scene.
  const sink = cloudSink(t)
  const horizonY = h * (0.56 + 0.2 * sink)
  drawCloudSea(ctx, {
    w, h, horizonY,
    lit: '#ffffff',
    shade: mixHex('#8ea9c9', '#9aa3b2', gold),
    haze: '#e4edf6',
    alpha, t: 1 + (cfg.tRaw ?? t), time, sunX, seed: 4, drift: 0.8,
  })
  // The climb's three far cumulus TOWERS above the sea line continue here
  // pixel-identically (same hashes; the drift clock `1 + tRaw` IS the
  // climb's own t at the hand-over) and ride the sinking horizon — the
  // 19 % cut removes NOTHING from the environment (Martin's catch).
  {
    const tc = 1 + (cfg.tRaw ?? t)
    ctx.save()
    for (let i = 0; i < 3; i++) {
      const tx = ((((0.14 + hash1(140 + i * 31) * 0.7 - tc * 0.3) % 1) + 1) % 1) * w
      const tr = h * (0.03 + hash1(150 + i * 17) * 0.025)
      drawPuff(ctx, tx, horizonY - tr * 0.5, tr, '#e9f2fb', alpha * 0.5)
      drawPuff(ctx, tx + tr * 0.7, horizonY - tr * 0.15, tr * 0.7, '#dfeaf7', alpha * 0.45)
    }
    ctx.restore()
  }

  // --- COMAO entry gate (seg-3): ONE constant speed from the first
  // off-screen metre, with a SHORT braking arc over the window's last
  // fifth so the package SETTLES onto its marks — a hard linear stop left
  // whatever motion remained snapping through at the start of a glide
  // (Martin: the last leg must move exactly as fast as the others). The
  // 1/0.9 gain keeps the cruising speed identical despite the braking
  // distance (the window is 2.0 % wide for the same reason).
  const u3 = clamp01((t - COMAO.in0) / (COMAO.in1 - COMAO.in0))
  const seg3 = u3 <= 0.8 ? u3 / 0.9 : (u3 - ((u3 - 0.8) * (u3 - 0.8)) / 0.4) / 0.9

  // --- 1. SOLO — the L-159 riding level --------------------------------------
  // The L-39→L-159 unlock already happened at the top of the climb (Martin:
  // switch early — the L-159 gets a long straight run in the horizon before
  // the one-circle fight). Position/attitude/size are EXACTLY the climb's
  // hand-over state, so the cross-fade stacks two identical jets — one
  // aircraft, no ghost.
  // The solo owns the frame from the 19 % cut to the ballet's pop at 21 %,
  // where it VANISHES the same frame the pair appears (Martin: an instant
  // swap, never a cross-fade overlap).
  const solo = (t < BALLET.in0 ? 1 : 0) * alpha
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
    drawAircraft(ctx, 'l159p', {
      x: sx, y: sy, size: unit * 0.14, tilt: stilt, color: '#22314e', glint: '#dcecff', alpha: solo, time,
    })

    // The golden unlock ring + the "L-159" tag CONTINUE across the 19 % cut
    // on the climb's own clock (`1 + tRaw` IS the climb's t) — the ring
    // finishes its whole farewell, dissolving AS IT GROWS exactly like the
    // Z-142 and L-39 rings before it, and the tag fades out across the
    // following scroll step instead of dying with the cut (Martin).
    const tc = 1 + (cfg.tRaw ?? t)
    // Identical formula to the climb's: the ring dissolves AS it grows —
    // ever more transparent with the spread — and is gone well before its
    // maximum reach (never a constant-brightness hoop).
    const spread = smoothstep(0.8, 0.98, tc)
    const ringA = solo * 0.55 * smoothstep(0.8, 0.84, tc) * Math.pow(1 - spread, 1.6)
    if (ringA > 0.01) {
      ctx.save()
      ctx.strokeStyle = rgba(GOLD, ringA)
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(sx, sy, unit * 0.14 * (0.55 + spread * 1.1), 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    const tagA = solo * 0.9 * (1 - smoothstep(0.88, 1.0, tc))
    if (tagA > 0.01) {
      ctx.save()
      ctx.font = `${Math.max(10, Math.round(unit * 0.016))}px ${MONO}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = rgba(GOLD, tagA)
      ctx.fillText('L-159', sx + unit * 0.1, sy + unit * 0.09)
      ctx.restore()
    }
  }

  // --- 2. THE ONE-CIRCLE FIGHT — a vertical helix, corkscrewing UP ----------
  // (Martin's diagram.) The 3D layer OWNS this beat when its models are live
  // (`cfg.hero3d` — CruiseBallet flies the real GLB pair); this 2D corkscrew
  // is the complete fallback, on the SAME clock (`balletTurns`) and the same
  // fade windows. The view rides the climbing pair (the 3D framing), so the
  // jets hold mid-frame while the cloud deck sinks and their trails stream
  // away BELOW them — the climb reads through the world, not the jets' y.
  const ballet = balletPresence(t) * alpha
  if (ballet > 0.004 && !cfg.hero3d) {
    const axisX = w * 0.5
    const midY = h * 0.45 // the tracked pair rides the upper-middle frame
    const Rx = unit * 0.24 // horizontal reach of the helix
    const pitch = h * 0.2 // vertical climb per revolution → the trail's sag
    const turns = balletTurns(t)
    const project = (turnsAt: number, phase: number) => {
      const p = helixPoint(turnsAt, phase)
      const persp = 1 + 0.3 * p.z // near side swings wider
      return {
        x: axisX + p.x * Rx * persp,
        // Slightly-from-above view: the near side sits lower on screen;
        // older samples drop below as the pair climbs away from them.
        y: midY + p.z * Rx * 0.22 + (turns - turnsAt) * pitch,
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
    // Far jet small and dim behind the axis, near jet big in front — two
    // stores-laden L-159 side profiles riding the corkscrew (the roll-frame
    // animation is parked until the whole site stands; the spiral itself
    // carries the motion, as before).
    for (const j of [...jets].sort((a, b) => a.now.z - b.now.z)) {
      const near = (j.now.z + 1) / 2
      drawAircraft(ctx, 'l159p', {
        x: j.now.x, y: j.now.y, size: unit * (0.06 + 0.1 * near),
        tilt: -j.heading, color: mixHex('#2c3c60', '#1b2540', 1 - near),
        glint: '#d7e8ff', alpha: ballet * (0.6 + 0.4 * near), time,
      })
    }
  }

  // --- 3. COMAO + the strike --------------------------------------------------
  if (seg3 > 0.004) {
    // FULL intensity from the very first frame (Martin: never a half-ghost
    // arrival) — the package FLIES IN from beyond the left frame edge, so
    // the entrance is pure motion, no alpha ramp; only the chapter
    // cross-fade ever touches the opacity.
    const a = alpha
    const slide = (1 - seg3) * w
    const bob = Math.sin(time * 0.8) * h * 0.003
    const body = mixHex('#2a3550', '#242e46', gold)

    // Lead L-159 (you fly the other one) + wingman — both in the stores
    // configuration (the real COMAO fit, traced from Martin's render).
    // Slide multipliers put every start position OFF the left edge.
    const leadX = w * 0.6 - slide * 0.78
    const leadY = h * 0.36 + bob
    // Trail runs straight back along his own flight line, clear of the wingman.
    drawTrail(ctx, leadX - unit * 0.1, leadY + unit * 0.01, leadX - w * 0.4, leadY + unit * 0.026, unit * 0.008, '#dde8f8', a * 0.08)
    drawAircraft(ctx, 'l159p', {
      x: leadX, y: leadY, size: unit * 0.19, tilt: 0.04, color: body, glint: '#d7ecff', alpha: a, time,
    })
    drawAircraft(ctx, 'l159p', {
      x: w * 0.47 - slide * 0.7, y: h * 0.43 - bob, size: unit * 0.15, tilt: 0.04, color: body, glint: '#d7ecff', alpha: a * 0.95, time,
    })

    // The exercise package: an echelon of Gripen planforms + two Mi-17s
    // hugging the cloud deck (real silhouettes from the reference pack).
    for (let i = 0; i < 4; i++) {
      const dx = w * (0.14 + i * 0.055) - slide * 0.6
      const dy = h * (0.22 + i * 0.024) + bob * (i % 2 ? 1 : -1)
      drawTrail(ctx, dx - unit * 0.02, dy, dx - unit * 0.12, dy + h * 0.012, unit * 0.004, '#d8e4f4', a * 0.07)
      drawAircraft(ctx, 'gripen', { x: dx, y: dy, size: unit * 0.05, color: body, alpha: a * 0.85, time })
    }
    for (let i = 0; i < 2; i++) {
      // Low pair riding just above the (sunken) cumulus tops — closer and
      // bigger than before, skimming the deck (Martin's placement).
      drawAircraft(ctx, 'mi17', {
        x: w * (0.2 + i * 0.06) - slide * 0.5,
        y: horizonY - h * (0.045 - i * 0.02) + bob,
        size: unit * 0.08,
        color: body, glint: '#cfe2f8', alpha: a * 0.9, time,
      })
    }

    // (No strike beat here — the display strike lives in the airshow scene.)
  }

  // --- The green cockpit HUD — you're inside the L-159 now -------------------
  // Full intensity for the whole chapter: it snapped on with the unlock at
  // the top of the climb (Martin: instrument power-up, no fade) and stays lit
  // while he flies the L-159. Only the chapter cross-fade touches it — the
  // glass layer sits above everything, so the HUD dims itself by the
  // incoming scene's cover (Bagram sweeps over the world; the glass must
  // dissolve in the same breath, never hang green over the desert).
  // While the 3D ballet is LIVE the HUD lives on its mid-depth billboard
  // instead (CruiseBallet — the near jet crosses in front of the glass), so
  // the overlay copy hands over exactly by the ballet's presence.
  const ballet3d = cfg.hero3d ? balletPresence(t) : 0
  const hudA = alpha * (1 - (cfg.cover ?? 0)) * (1 - ballet3d)
  if (hudA > 0.01) {
    // Two BVR contacts far ahead — the shared story-position picture (see
    // bvrPicture): gently drifting frames, ranges counting down all the way
    // from the 26 % power-up, seamless across the climb hand-over.
    const bvr = bvrPicture(2.5 + (cfg.tRaw ?? t), w, h)
    ctx.save()
    ctx.fillStyle = rgba('#1a2236', hudA * 0.7)
    ctx.fillRect(bvr.target.x - 1.5, bvr.target.y - 1.5, 3, 3)
    ctx.fillRect(bvr.target2.x - 1.5, bvr.target2.y - 1.5, 3, 3)
    ctx.restore()
    // The green HUD is COCKPIT GLASS — nearest thing to the pilot's eye:
    // it paints on the glass overlay (above the 3D stage), so the ballet
    // pair corkscrews BEHIND it, like the real world behind a real HUD.
    // The SOFT painter renders at the ballet billboard's resolution, so
    // the symbology looks the same before, during and after the fight.
    drawCockpitHudSoft(cfg.glass ?? ctx, {
      w, h, alpha: hudA,
      attack: 0,
      target: bvr.target,
      target2: bvr.target2,
      rangeNm: bvr.rangeNm,
      // Shared readouts (balletMath.cruiseHud) — the 3D billboard renders
      // the identical picture, so the glass↔billboard hand-over is invisible.
      // The altitude climbs with the fight (the sinking deck, same story).
      mach: cruiseHud(t).mach,
      altFt: cruiseHud(t).altFt,
      hdg: cruiseHud(t).hdg,
    })
  }
}
