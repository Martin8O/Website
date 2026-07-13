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
import { bvrPicture, drawCockpitHudSoft } from './hud'
import { GRADUATION, cloudPunch, graduationAt, heroClimbPunch, sunArc } from './skyMath'
import {
  CLIMB_SEQ,
  aboveT,
  buildTrack,
  climbScreenAt,
  climbXScale,
  createClimbPose,
  heroPosAt,
  poseTrackAt,
} from '../../../three/climbMath'

const GOLD = '#ffd27a'
const MONO = '"Chakra Petch", ui-monospace, Consolas, monospace'

// The authored Part-1 flight (pure, three-free): while the 3D layer owns the
// hero, the ENVIRONMENT streams against the aircraft's own motion — sky and
// ground drift derive from the hero's DISPLACEMENT (all three axes), still a
// pure fn of scroll. Displacement integrals ARE speed-aware: the retimed
// L-39 moves the world twice as fast per scroll as the Ulla.
const TRACKS = CLIMB_SEQ.aircraft.map((a) => buildTrack(a))
const HERO_POSE = createClimbPose()
const RING_POSE = createClimbPose()
// Drift origin = Ulla's first snap (the parked fade-in frame drifts nothing).
const HERO_P0 = CLIMB_SEQ.aircraft[0].snaps[0].p

export const renderClimb: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h } = cfg
  const unit = Math.min(w, h)
  // Hero-flip mode retimes the whole chapter: everything below the deck, the
  // white-out only at the very end (the L-39 melts into it), no above phase.
  const { fog, above, approach } = cfg.hero3d ? heroClimbPunch(t) : cloudPunch(t)
  const below = 1 - above

  // World drift: 2D-only mode keeps the original "scroll IS the climb"
  // streaming; in hero-flip mode the world answers the AIRCRAFT's own
  // velocity vector, chase-cam style — flying right streams the scraps
  // left, climbing sinks them (and the ground), advancing INTO the sky
  // (−z) sinks the world too, and the L-39's descent back down for its low
  // pass brings the countryside back under it. Displacement-based, so a
  // fast type streams the world exactly that much faster per scroll.
  let driftX = t * 1.1
  let driftY = t * 1.45
  let groundShift = t * 0.55
  if (cfg.hero3d) {
    heroPosAt(TRACKS, cfg.tRaw ?? t, HERO_POSE)
    const hx = HERO_POSE.p[0] - HERO_P0[0]
    const hy = HERO_POSE.p[1] - HERO_P0[1]
    const hz = HERO_POSE.p[2] - HERO_P0[2] // negative = deeper into the sky
    // Weights compensated for the data reshape (x ×1.925 = X_SPREAD·X_RIGHT,
    // z ×3 about the parked Ulla — physics.mjs) so the WORLD response
    // Martin approved stays visually identical per unit of screen motion.
    driftX = t * 0.22 + hx * 0.0442
    driftY = t * 0.3 + hy * 0.15 - hz * 0.0183
    groundShift = t * 0.1 + hy * 0.075 - hz * 0.0067
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

    // --- The type-unlock rings + name flashes (hero-3D mode) ----------------
    // Martin: the transitions wear the 2D golden-ring language, not a 3D
    // bubble — the expanding circle dissolves AS it grows (the L-159 unlock
    // formula verbatim), and the type name flashes close to the airframe in
    // the 2D tag face, then dissolves fast. Both are drawn at the flying
    // hero's PROJECTED screen spot (climbMath.climbScreenAt) so they ride
    // the real 3D aircraft exactly.
    if (cfg.hero3d) {
      const tt = cfg.tRaw ?? t
      const xs = climbXScale(w / Math.max(h, 1))
      for (let i = 0; i < TRACKS.length; i++) {
        const craft = CLIMB_SEQ.aircraft[i]
        const birth = TRACKS[i].times[0]
        const since = tt - birth
        if (since < 0 || since > 0.08) continue
        poseTrackAt(TRACKS[i], tt, RING_POSE)
        RING_POSE.p[0] *= xs // the rendered heroes carry the same scale
        const scr = climbScreenAt(RING_POSE.p, w, h)
        const sizePx = scr.pxPerUnit * craft.size // the airframe's screen length
        const rx = scr.x * w
        const ry = scr.y * h
        if (i > 0) {
          // Ring only on the unlocks — the first type just gets its name.
          // FAST farewell (Martin): the circle blooms and is dissolved
          // within about half a scroll percent — a flash, not a hoop.
          const spread = smoothstep(birth, birth + 0.055, tt)
          const ringA = a * 0.55 * smoothstep(birth, birth + 0.012, tt) * Math.pow(1 - spread, 2)
          if (ringA > 0.01) {
            ctx.save()
            ctx.strokeStyle = rgba(GOLD, ringA)
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.arc(rx, ry, sizePx * (0.55 + spread * 1.1), 0, Math.PI * 2)
            ctx.stroke()
            ctx.restore()
          }
        }
        const nameA = a * 0.92 * (1 - smoothstep(birth + 0.03, birth + 0.075, tt))
        if (nameA > 0.01) {
          ctx.save()
          ctx.font = `${Math.max(10, Math.round(unit * 0.016))}px ${MONO}`
          ctx.textAlign = 'left'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = rgba(GOLD, nameA)
          // Tight to the airframe (Martin) — the projected LENGTH overshoots
          // the foreshortened silhouette, so the 2D's 0.62/0.52 offsets read
          // far out here; ~half of that hugs the wing. The offset base is
          // CAPPED so a near-camera craft (the parked Ulla, ~200 px long)
          // doesn't throw its name far out — deep types stay untouched.
          const off = Math.min(sizePx, unit * 0.11)
          ctx.fillText(craft.name, rx + off * 0.34, ry + off * 0.3)
          ctx.restore()
        }
      }
    }

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
    // of the world). In hero-flip mode it appears and SAGS only while the
    // L-39 is actually CLIMBING (Martin — its amplified zoom starts at
    // t ≈ 0.6): the deck races down to meet the jet, fully sagged just as
    // the white-out rise completes (0.63–0.703).
    const deckIn = cfg.hero3d ? smoothstep(0.605, 0.7, t) : smoothstep(0.16, 0.5, t)
    if (deckIn > 0.001) {
      // Greys over deep blue — a heavy, overcast ceiling (never green: the
      // palette keeps r=g with blue a full step above, quantization-proof).
      drawCloudDeck(ctx, {
        w, h, edgeY: lerp(-h * 0.04, h * 0.62, deckIn),
        lit: '#767684', shade: '#1e1e2c', haze: '#424250',
        alpha: a * (cfg.hero3d ? smoothstep(0.605, 0.65, t) : smoothstep(0.16, 0.28, t)),
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

    // The hero's above-deck story — THE WOW BEAT (Martin: restored): the jet
    // punches out of the white over the sunlit sea, levels off, and the
    // L-159 unlock + green HUD bridge to chapter 02. In 2D mode it plays
    // its original windows; in hero-3D mode the SAME story plays re-timed
    // onto [ABOVE.out, ABOVE.cut] (climbMath.aboveT) — the 3D heroes ended
    // inside the white-out, so this silhouette hand-over hides entirely
    // under it, exactly like the below→above world swap always has.
    {
      const m = cfg.hero3d ? aboveT : (x: number) => x
      // The L-39 punching out LEFT — near where it climbed — then riding
      // forward to the exact spot + attitude the cruise solo holds, BEFORE the
      // cross-fade starts (so the two scenes overlap pixel-close, no ghost).
      const rise = smoothstep(m(0.6), m(0.8), t)
      const px = w * (0.3 + rise * 0.2)
      const py = h * (0.56 - rise * 0.22) + Math.sin(time * 0.9) * h * 0.004
      const tilt = lerp(0.3, 0.06, rise)

      // Contrail: there from the very first frame out of the white — straight
      // back along the flight path, still just a hint.
      drawTrail(
        ctx,
        px - Math.cos(tilt) * unit * 0.07, py + Math.sin(tilt) * unit * 0.07 + unit * 0.012,
        px - Math.cos(tilt) * unit * 0.55, py + Math.sin(tilt) * unit * 0.55 + unit * 0.012,
        unit * 0.007, '#f2f7ff', a * 0.1 * smoothstep(m(0.6), m(0.63), t),
      )

      // THE L-159 UNLOCK — the moment the jet levels off after the punch-out
      // (the burst puffs have just dissolved), the graduation ladder ends: the
      // L-39 dissolves into the stores L-159 (2012), ringed by the same golden
      // pulse the earlier rungs got. From here on he flies the modern jet —
      // level, all the way through the cruise hand-over (Martin: switch early,
      // give the L-159 a long straight run before the one-circle fight).
      const toL159 = smoothstep(m(0.8), m(0.88), t)
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
      // The ring DISSOLVES as it grows — opacity falls away with the spread
      // itself (never a constant-brightness hoop ballooning across the sky;
      // Martin's catch), gone well before its maximum reach. The cruise
      // scene continues this exact formula across the cut.
      const spread = smoothstep(m(0.8), m(0.98), t)
      const ringA = a * 0.55 * smoothstep(m(0.8), m(0.84), t) * Math.pow(1 - spread, 1.6)
      if (ringA > 0.01) {
        ctx.save()
        ctx.strokeStyle = rgba(GOLD, ringA)
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
        // Cockpit glass (same layer the cruise HUD lives on): nearest to
        // the eye, above the 3D stage — seamless across the hand-over.
        // Nothing occludes the glass, so the HUD dims by the incoming
        // cruise's cover while its twin rises there (identical picture —
        // the cross-fade is invisible by design). Soft painter = the one
        // raster look shared with the ballet billboard.
        drawCockpitHudSoft(cfg.glass ?? ctx, {
          w, h, alpha: a * (1 - (cfg.cover ?? 0)),
          attack: 0,
          target: bvr.target,
          target2: bvr.target2,
          rangeNm: bvr.rangeNm,
          mach: 0.74,
          altFt: 21500,
          hdg: 139,
        })
      }

      // The burst: only the LATE phase — a ring of TORN CLOUD already flying
      // apart. Each shred is a small cluster of overlapping, flattened,
      // shaded puffs (lit white over a cooler grey base), not one round
      // ball — single circles read as white bubbles, Martin's catch.
      const burst = smoothstep(m(0.6), m(0.62), t) * (1 - smoothstep(m(0.66), m(0.74), t))
      if (burst > 0.01) {
        const exitX = w * 0.3
        const exitY = h * 0.57
        const rad = unit * (0.12 + smoothstep(m(0.6), m(0.74), t) * 0.16)
        ctx.save()
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2 + hash1(i + 260) * 0.6
          const rr = rad * (0.8 + hash1(i + 270) * 0.5)
          const px = exitX + Math.cos(ang) * rr
          const py = exitY + Math.sin(ang) * rr * 0.7
          const base = unit * (0.02 + hash1(i + 281) * 0.014)
          // Cool under-shadow first, then the lit lobes over it.
          drawPuff(ctx, px + base * 0.3, py + base * 0.5, base * 1.15, '#c9d6e4', a * burst * 0.3, 1.7)
          for (let k = 0; k < 3; k++) {
            const hx = hash1(i * 7 + k * 13 + 300) - 0.5
            const hy = hash1(i * 11 + k * 17 + 320) - 0.5
            const kr = base * (0.5 + hash1(i * 5 + k * 3 + 340) * 0.65)
            drawPuff(
              ctx,
              px + hx * base * 2.1,
              py + hy * base * 0.9,
              kr,
              '#ffffff',
              a * burst * (0.3 + hash1(i * 3 + k + 360) * 0.18),
              1.6,
            )
          }
        }
        ctx.restore()
      }
    }
  }

  // ==== THE WHITE-OUT (painted last — it owns the frame at its peak) =======
  // E3b-v2: the transit is a real PHASE now (fog holds ~1 for a scroll
  // percent before the ~23 % cut) — so the inside of the cloud lives:
  // darker vapour wisps race past the canopy, the rain accelerates down the
  // glass with a wind-smear, and the whole glass layer buffets gently while
  // the story is actually gliding (velocity-gated — a parked frame is
  // still). The CUT itself is untouched: the frame under it stays white.
  if (fog > 0.004) {
    const f = alpha * fog
    ctx.save()
    ctx.fillStyle = rgba('#eef2f7', clamp01(f * 0.985))
    ctx.fillRect(0, 0, w, h)

    // Buffeting: a small jitter on the vapour + rain layer only (the flat
    // white can't show it — the moving details are what tremble). Scroll-
    // velocity gated like the landing shake; reduced motion freezes time.
    const buffet = (cfg.shakeGate ?? 0) * f
    if (buffet > 0.01) {
      ctx.translate(
        Math.sin(time * 31) * buffet * unit * 0.004,
        Math.cos(time * 26 + 1.7) * buffet * unit * 0.0055,
      )
    }

    // Vapour wisps INSIDE the cloud — big, soft, slightly darker than the
    // white, racing DOWN past the glass (the jet entered climbing ~60°) and
    // fading as the fog thickens toward the cut. Wrapping, scroll-driven.
    const wispA = f * 0.22
    if (wispA > 0.01) {
      for (let i = 0; i < 5; i++) {
        const hxw = hash1(300 + i * 17.3)
        const hsw = hash1(310 + i * 9.1)
        const wy = ((hxw + t * (5.5 + hsw * 2.5) + time * 0.05) % 1) * h * 1.6 - h * 0.3
        const wx = ((hxw * 1.7 + i * 0.23) % 1.15) * w - w * 0.07
        const wr = unit * (0.34 + hsw * 0.4)
        drawPuff(ctx, wx, wy, wr, '#c6d0dd', wispA * (0.5 + hsw * 0.5), 2.4)
        drawPuff(ctx, wx + wr * 0.55, wy + wr * 0.4, wr * 0.62, '#d9e1ea', wispA * 0.6, 2.1)
      }
    }

    // Water droplets racing DOWN the canopy glass — clearly visible
    // outlines, each its own size, opacity and pace, ACCELERATING down the
    // pane (airflow drags them faster the longer they run) with a faint
    // wind-smear trailing above. (Inside a cloud the airflow paints the
    // cockpit with rain.)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (let i = 0; i < 22; i++) {
      const hx = hash1(90 + i * 11.3)
      const hs = hash1(100 + i * 5.9)
      const hp = hash1(110 + i * 7.7)
      const ha = hash1(120 + i * 3.1)
      const r = unit * (0.007 + hs * 0.014) // bottom-bulb radius
      const tail = r * (1.8 + hp * 1.4) // tail reaching up the glass
      // Race down with the scroll (plus ambient trickle), wrapping — the
      // quadratic ease inside each wrap cycle reads as the run speeding up.
      const cyc = (hp + t * (4.5 + hs * 3) + time * 0.06) % 1.25
      const y = (cyc * (0.55 + cyc * 0.56)) * h * 1.1 - h * 0.05
      const x = hx * w + Math.sin(y * 0.01 + i) * r * 0.6 // gentle meander
      const a = f * (0.3 + ha * 0.3)
      // Wind-smear: a whisper of a streak above the drop's path.
      if (hs > 0.45) {
        ctx.strokeStyle = rgba('#9fb0c6', a * 0.4)
        ctx.lineWidth = Math.max(1, unit * 0.001)
        ctx.beginPath()
        ctx.moveTo(x, y - tail * 2.6)
        ctx.lineTo(x, y - tail * 1.1)
        ctx.stroke()
      }
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
