/**
 * SKY / AIRSHOW — the display years (facts §6b) at a MAJOR airbase (B2.3b
 * redesign; refs `local/ode mne/siluety/caslav twr.jpg`, `caslav airbase.jpg`).
 * Martin flew ONLY as a two-ship with one colleague, each in his own aircraft,
 * over airbases with tens of thousands of spectators — Čáslav-class venues,
 * never an aeroclub strip. So:
 *  - a vivid summer day over a real fighter base: treeline horizon, hardened-
 *    shelter humps, big hangars, the Čáslav tower (tapering shaft, flared
 *    two-deck cab, balcony rails, antenna masts) with its ops building,
 *  - an apron FULL of static display across the runway (the B2.3b sheet
 *    traces, `heloes side.jpg` + `mil jet mix.jpg` + the front-view vectors):
 *    a nose-on line mixing F-16 / F-18 / F-35 / Rafale, towering C-17s, the
 *    home L-159 pair + L-39 with gear down, parked F-35s and F-16s, and a
 *    rotary corner — Mi-17, tandem-rotor Chinook, Huey, Apache — plus
 *    ground kit, taxiway (yellow line + connectors), a wide marked runway,
 *    a windsock in the wind,
 *  - behind it all: a soft hazy hill line, so the horizon breathes,
 *  - the pair flies the display line: entry pass → a full loop → exit,
 *    lead trailing white smoke, wingman red (never a "many aircraft" show),
 *  - below: the crowd at TENS-OF-THOUSANDS scale — six rows deep, from a far
 *    head-texture band at the crowd-line barrier to near silhouettes;
 *    marquee tents, raised arms, flags, camera flashes.
 */

import type { Renderer } from '../../types'
import {
  TAU,
  drawGlow,
  drawRidge,
  fillVerticalGradient,
  hash1,
  lerp,
  mixHex,
  rgba,
  smoothstep,
} from '../../toolkit'
import { drawAircraft, drawRibbon, type CraftKind } from './aircraft'
import { drawPuff } from './clouds'
import { SILHOUETTES } from './silhouettes'
import { sunArc } from './skyMath'

/** Summer distance haze — everything far mixes toward this. */
const HAZE = '#d9e9f5'
/** Cool grey-navy of distant parked metal. */
const METAL = '#333d49'

/** How far below its origin a silhouette's body reaches (max y of ring 0) —
 *  parked aircraft sit at y = groundline − size × this, so every kind's
 *  wheels land exactly on the stand no matter how its trace is centred. */
const GROUND_REACH = new Map<CraftKind, number>()
function groundReach(kind: CraftKind): number {
  let v = GROUND_REACH.get(kind)
  if (v === undefined) {
    let m = 0
    const ring = SILHOUETTES[kind][0]
    for (let i = 1; i < ring.length; i += 2) if (ring[i] > m) m = ring[i]
    GROUND_REACH.set(kind, (v = m))
  }
  return v
}
/** The procedural jet gear (l39/l159) drops wheels past the traced body. */
const JET_GEAR_REACH = 0.169

/** A low, slightly irregular distant town roofline — tiny houses with a mix
 *  of flat and gabled roofs, added to the current path (caller fills).
 *  Everything sits ON `base`; `s` scales the house dimensions. */
function townRow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  x0: number,
  x1: number,
  base: number,
  seed: number,
  s = 1,
): void {
  let x = x0
  let i = 0
  while (x < x1) {
    const bw = w * s * (0.004 + hash1(seed + i * 3.1) * 0.006)
    const bh = h * s * (0.005 + hash1(seed + i * 5.3) * 0.008)
    const top = base - bh
    ctx.rect(x, top, bw, bh)
    if (hash1(seed + i * 7.7) > 0.5) {
      // A gable roof over this house.
      ctx.moveTo(x - w * 0.0008, top)
      ctx.lineTo(x + bw / 2, top - h * s * 0.004)
      ctx.lineTo(x + bw + w * 0.0008, top)
      ctx.closePath()
    }
    x += bw + w * s * (0.0015 + hash1(seed + i * 2.3) * 0.004)
    i++
  }
}

/** A baroque onion cupola (bulb + finial spike) added to the current path —
 *  the shared Čáslav town-hall / Kutná Hora Jesuit-tower motif. */
function onionDome(ctx: CanvasRenderingContext2D, x: number, baseY: number, r: number, hh: number): void {
  ctx.moveTo(x - r, baseY)
  ctx.quadraticCurveTo(x - r * 1.15, baseY - hh * 0.5, x, baseY - hh)
  ctx.quadraticCurveTo(x + r * 1.15, baseY - hh * 0.5, x + r, baseY)
  ctx.closePath()
  // Finial spike above the bulb.
  ctx.moveTo(x - r * 0.16, baseY - hh)
  ctx.lineTo(x, baseY - hh * 1.7)
  ctx.lineTo(x + r * 0.16, baseY - hh)
  ctx.closePath()
}

/** Čáslav far on the horizon (refs `caslav twr.jpg` + the square photo) —
 *  a TINY silhouette: the Gothic tower of St. Peter & Paul (slim body, steep
 *  needle spire) over an irregular low roofline with the town-hall cupola.
 *  Grounded: every foot runs down to the horizon line itself. */
function drawCaslav(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, col: string, a: number): void {
  const base = h * 0.7215 // just under the grass line — nothing floats
  ctx.save()
  ctx.fillStyle = rgba(col, a)
  ctx.beginPath()
  // Low organic roofline either side of the dominant.
  townRow(ctx, w, h, cx - w * 0.034, cx - w * 0.005, base, 320, 0.9)
  townRow(ctx, w, h, cx + w * 0.008, cx + w * 0.038, base, 360, 0.75)
  // The church nave the tower rises from.
  ctx.rect(cx - w * 0.008, h * 0.7115, w * 0.013, base - h * 0.7115)
  // The dominant: a slim tower body + steep needle spire.
  const tw = w * 0.0048
  ctx.rect(cx - tw / 2, h * 0.6905, tw, base - h * 0.6905)
  ctx.moveTo(cx - tw * 0.62, h * 0.6905)
  ctx.lineTo(cx, h * 0.6745)
  ctx.lineTo(cx + tw * 0.62, h * 0.6905)
  ctx.closePath()
  // The town-hall onion cupola peeking over the roofs to the right.
  const thx = cx + w * 0.0155
  ctx.rect(thx - w * 0.0016, h * 0.7135, w * 0.0032, base - h * 0.7135)
  onionDome(ctx, thx, h * 0.7135, w * 0.0024, h * 0.0058)
  ctx.fill()
  ctx.restore()
}

/** Kutná Hora far on the horizon (ref `kutna hora silueta.jpg`) — a TINY
 *  silhouette of St. Barbara's Cathedral: three concave tent roofs (middle
 *  tallest) with needle finials over the body, the Jesuit College tower with
 *  its onion dome beside it, a low roofline around. Grounded to the horizon. */
function drawKutnaHora(ctx: CanvasRenderingContext2D, w: number, h: number, cx: number, col: string, a: number): void {
  const base = h * 0.7215
  ctx.save()
  ctx.fillStyle = rgba(col, a)
  ctx.beginPath()
  townRow(ctx, w, h, cx - w * 0.04, cx - w * 0.014, base, 520, 0.75)
  townRow(ctx, w, h, cx + w * 0.026, cx + w * 0.052, base, 560, 0.9)
  // The cathedral body, grounded.
  const bodyW = w * 0.02
  const bodyTop = h * 0.7035
  ctx.rect(cx - bodyW / 2, bodyTop, bodyW, base - bodyTop)
  // Three concave tent roofs (kutna hora silueta.jpg): middle one tallest,
  // sides swooping in, each carrying a thin needle finial.
  for (const [s, tipY] of [[-1, 0.692], [0, 0.6875], [1, 0.692]] as const) {
    const rx = cx + s * bodyW * 0.34
    const tip = h * tipY
    const rw = bodyW * 0.24
    ctx.moveTo(rx - rw, bodyTop)
    ctx.quadraticCurveTo(rx - rw * 0.28, bodyTop - (bodyTop - tip) * 0.42, rx, tip)
    ctx.quadraticCurveTo(rx + rw * 0.28, bodyTop - (bodyTop - tip) * 0.42, rx + rw, bodyTop)
    ctx.closePath()
    // The needle above the tent.
    ctx.moveTo(rx - w * 0.0005, tip + h * 0.001)
    ctx.lineTo(rx, tip - h * 0.0052)
    ctx.lineTo(rx + w * 0.0005, tip + h * 0.001)
    ctx.closePath()
  }
  // The Jesuit College tower with its onion dome + the long low college block.
  const jtx = cx + w * 0.0165
  ctx.rect(jtx - w * 0.0021, h * 0.706, w * 0.0042, base - h * 0.706)
  onionDome(ctx, jtx, h * 0.706, w * 0.0028, h * 0.0065)
  ctx.rect(jtx, h * 0.7145, w * 0.018, base - h * 0.7145)
  ctx.fill()
  ctx.restore()
}

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
  // Dark venue silhouettes CONDENSE out of the summer haze while the previous
  // scene dissolves (the Bagram contract) — never a translucent black ghost
  // floating over the cross-fade.
  const condense = alpha * alpha * alpha

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

  // --- The venue: a major fighter base seen from the crowd line --------------
  const horizonY = h * 0.72
  // A soft hill line far behind the base — two hazy ridges so the horizon is
  // more than flat green against blue (bluer = further, greener = nearer).
  drawRidge(ctx, {
    w, y: h * 0.703, amp: h * 0.026, seed: 210,
    color: mixHex('#8fa3b8', HAZE, 0.55), bottom: horizonY + 2, scrollX: 0, alpha,
  })
  drawRidge(ctx, {
    w, y: h * 0.712, amp: h * 0.018, seed: 230,
    color: mixHex('#7d9378', HAZE, 0.5), bottom: horizonY + 2, scrollX: 0, alpha,
  })
  // Distant landmark skylines on the far hills: Čáslav (the tower) on the
  // left, Kutná Hora (St. Barbara's Cathedral) on the right — the two towns
  // that bracket Martin's home airfield. Hazy, so they read as far horizon.
  {
    const cityCol = mixHex('#5f7286', HAZE, 0.44)
    drawCaslav(ctx, w, h, w * 0.115, cityCol, condense * 0.8)
    drawKutnaHora(ctx, w, h, w * 0.895, cityCol, condense * 0.8)
  }
  drawGlow(ctx, w * 0.5, horizonY, w * 0.5, '#dff0fa', alpha * 0.25) // ground haze
  fillVerticalGradient(
    ctx,
    0,
    horizonY,
    w,
    h - horizonY,
    [
      [0, '#a5c49b'],
      [0.12, '#7fae7a'],
      [0.42, '#4e8355'],
      [1, '#22392a'],
    ],
    alpha,
  )
  // The treeline on the far side of the base (caslav twr.jpg horizon).
  ctx.save()
  ctx.fillStyle = rgba(mixHex('#33502f', HAZE, 0.3), alpha * 0.85)
  ctx.beginPath()
  {
    // Spacing pegged to h so the hedge stays dense at any aspect ratio.
    const tn = Math.max(48, Math.ceil(w / (h * 0.017)))
    for (let i = 0; i < tn; i++) {
      const x = (i / (tn - 1)) * w
      const r = h * (0.005 + hash1(730 + i * 3.7) * 0.005)
      ctx.arc(x, horizonY + h * 0.006, r, Math.PI, 0)
    }
  }
  ctx.fill()
  ctx.restore()

  // --- The building line: shelters, hangars, the Čáslav tower ---------------
  const baseY = h * 0.753
  // Hardened-aircraft-shelter humps dispersed along the far side (the round
  // mounds all over caslav airbase.jpg).
  ctx.save()
  ctx.fillStyle = rgba(mixHex('#48584a', HAZE, 0.52), condense)
  for (let i = 0; i < 5; i++) {
    const x = w * (0.06 + hash1(400 + i * 13) * 0.88)
    const rx = w * (0.014 + hash1(405 + i * 7) * 0.008)
    const ry = h * (0.011 + hash1(410 + i * 5) * 0.005)
    ctx.beginPath()
    ctx.moveTo(x - rx, h * 0.749)
    ctx.ellipse(x, h * 0.749, rx, ry, 0, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  // The hangar line — big sheds spaced so a gap frames each distant town
  // (Čáslav peeks between the first two, Kutná Hora between the last two).
  ctx.save()
  for (const [xf, hwF, hhF] of [
    [0.045, 0.036, 0.016],
    [0.185, 0.042, 0.017],
    [0.38, 0.036, 0.015],
    [0.825, 0.032, 0.014],
    [0.965, 0.036, 0.016],
  ] as const) {
    const x = w * xf
    const hw = w * hwF
    const hh = h * hhF
    ctx.fillStyle = rgba(mixHex('#3f4f3e', HAZE, 0.4), condense)
    ctx.beginPath()
    ctx.moveTo(x - hw, baseY)
    ctx.lineTo(x - hw, baseY - hh * 1.1)
    ctx.quadraticCurveTo(x, baseY - hh * 2.1, x + hw, baseY - hh * 1.1)
    ctx.lineTo(x + hw, baseY)
    ctx.closePath()
    ctx.fill()
    // The sliding-door band, catching the afternoon light.
    ctx.fillStyle = rgba(HAZE, condense * 0.16)
    ctx.fillRect(x - hw * 0.72, baseY - hh * 0.8, hw * 1.44, hh * 0.8)
  }
  // Low ops blocks scattered between the hangars.
  ctx.fillStyle = rgba(mixHex('#5b6570', HAZE, 0.42), condense)
  for (const [xf, bwF] of [
    [0.29, 0.02],
    [0.5, 0.016],
    [0.7, 0.018],
  ] as const) {
    ctx.fillRect(w * xf, baseY - h * 0.011, w * bwF, h * 0.011)
  }
  ctx.restore()
  // The control tower (caslav twr.jpg): tapering shaft, a flared two-deck
  // cab with balcony rails, antenna masts, and the attached ops building.
  {
    const tx = w * 0.63
    const col = mixHex('#5f6b76', HAZE, 0.36)
    ctx.save()
    ctx.globalAlpha = condense
    ctx.fillStyle = col
    // Attached two-story building first (the tower fronts it).
    ctx.fillRect(tx + w * 0.007, h * 0.737, w * 0.033, h * 0.016)
    ctx.fillStyle = rgba(HAZE, 0.38)
    ctx.fillRect(tx + w * 0.009, h * 0.741, w * 0.029, h * 0.004)
    // The tapering shaft.
    ctx.fillStyle = col
    ctx.beginPath()
    ctx.moveTo(tx - w * 0.0065, baseY)
    ctx.lineTo(tx - w * 0.004, h * 0.676)
    ctx.lineTo(tx + w * 0.004, h * 0.676)
    ctx.lineTo(tx + w * 0.0065, baseY)
    ctx.closePath()
    ctx.fill()
    // Lower balcony deck, then the main cab flaring OUTWARD toward the top.
    ctx.fillRect(tx - w * 0.011, h * 0.666, w * 0.022, h * 0.01)
    ctx.beginPath()
    ctx.moveTo(tx - w * 0.011, h * 0.666)
    ctx.lineTo(tx - w * 0.0135, h * 0.653)
    ctx.lineTo(tx + w * 0.0135, h * 0.653)
    ctx.lineTo(tx + w * 0.011, h * 0.666)
    ctx.closePath()
    ctx.fill()
    // The glass band wrapping the cab.
    ctx.fillStyle = rgba(HAZE, 0.55)
    ctx.fillRect(tx - w * 0.0105, h * 0.6565, w * 0.021, h * 0.005)
    // Balcony rails — thin light lines slightly wider than the decks.
    ctx.strokeStyle = rgba(HAZE, 0.5)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(tx - w * 0.0145, h * 0.6655)
    ctx.lineTo(tx + w * 0.0145, h * 0.6655)
    ctx.moveTo(tx - w * 0.015, h * 0.6525)
    ctx.lineTo(tx + w * 0.015, h * 0.6525)
    ctx.stroke()
    // Antenna masts on the roof.
    ctx.strokeStyle = col
    ctx.lineWidth = Math.max(1, unit * 0.0014)
    ctx.beginPath()
    for (const [dxF, mhF] of [
      [-0.006, 0.014],
      [0.0005, 0.02],
      [0.0075, 0.012],
    ] as const) {
      ctx.moveTo(tx + w * dxF, h * 0.653)
      ctx.lineTo(tx + w * dxF, h * (0.653 - mhF))
    }
    ctx.stroke()
    ctx.restore()
  }

  // --- The apron across the runway, FULL of static display -------------------
  ctx.save()
  ctx.globalAlpha = alpha * 0.55
  ctx.fillStyle = mixHex('#b3bfc8', HAZE, 0.32)
  ctx.fillRect(0, h * 0.756, w, h * 0.036)
  // Stand ticks along the front row.
  ctx.strokeStyle = rgba('#f2f6f9', 0.4)
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = w * 0.02; x < w; x += w * 0.05) {
    ctx.moveTo(x, h * 0.7885)
    ctx.lineTo(x, h * 0.7915)
  }
  ctx.stroke()
  ctx.restore()
  // Back stand: the nose-on line — a MIX of visiting fighters wingtip to
  // wingtip (F-16 / F-18 / F-35 / Rafale, hazier one row deeper), never the
  // same neighbour twice in a row.
  {
    const NOSE_ON: ReadonlyArray<readonly [CraftKind, number]> = [
      ['f16front', 0.036], ['f18front', 0.037], ['f35front', 0.036], ['rafalefront', 0.038],
    ]
    const gap = w * 0.042
    const backY = h * 0.769
    // The C-17 towers over the back line on the right — keep the nose-on line
    // clear of its footprint so no fighter pokes out from behind it.
    const c17x = w * 0.865
    for (let x = gap * 0.5; x < w; x += gap) {
      const cell = Math.round(x / gap)
      const j = hash1(440 + cell * 5.7)
      if (j < 0.16) continue
      if (Math.abs(x - c17x) < unit * 0.058) continue
      const [kind, sz] = NOSE_ON[Math.floor(hash1(452 + cell * 9.1) * 3.999)]
      const size = unit * sz * (0.92 + j * 0.16)
      drawAircraft(ctx, kind, {
        x: x + (j - 0.5) * gap * 0.2, y: backY - size * groundReach(kind), size, dir: 1,
        color: mixHex(METAL, HAZE, 0.3), alpha: condense * (0.68 + j * 0.14), time: 0,
      })
    }
    drawAircraft(ctx, 'c17front', {
      x: c17x, y: backY - unit * 0.085 * groundReach('c17front'), size: unit * 0.085, dir: -1,
      color: mixHex(METAL, HAZE, 0.26), alpha: condense * 0.78, time: 0,
    })
  }
  // Front row: an organic static line — the heavy left, the home team, parked
  // fighters, then the rotary corner (Martin: definitely a Chinook).
  const frontY = h * 0.7875
  const parkedCol = mixHex(METAL, HAZE, 0.1)
  const STATIC_LINE: ReadonlyArray<readonly [CraftKind, number, number, 1 | -1, number]> = [
    // [kind, xFrac, size/unit, dir, gear] — gear > 0 drops the procedural legs
    ['c17front', 0.06, 0.1, 1, 0],
    ['l159', 0.16, 0.05, 1, 1],
    ['l159', 0.222, 0.05, 1, 1],
    ['l39', 0.283, 0.046, -1, 1],
    ['f35park', 0.36, 0.056, 1, 0],
    ['f16park', 0.44, 0.052, -1, 0],
    ['f16park', 0.515, 0.049, 1, 0],
    ['mi17', 0.60, 0.062, 1, 0],
    ['chinook', 0.70, 0.078, 1, 0],
    ['uh1', 0.795, 0.05, 1, 0],
    ['apache', 0.873, 0.046, 1, 0],
    ['f35park', 0.952, 0.052, -1, 0],
  ]
  for (const [kind, xf, sz, dir, gear] of STATIC_LINE) {
    const size = unit * sz
    const reach = gear ? JET_GEAR_REACH : groundReach(kind)
    drawAircraft(ctx, kind, {
      x: w * xf, y: frontY - size * reach, size, dir, gear,
      color: parkedCol, glint: gear ? '#dfeefa' : undefined,
      alpha: condense * (0.84 + hash1(460 + xf * 97) * 0.12), time: 0,
    })
  }
  // --- Taxiway (yellow line) + connectors down to the runway -----------------
  ctx.save()
  ctx.globalAlpha = alpha * 0.6
  ctx.fillStyle = mixHex('#9aa6af', HAZE, 0.28)
  ctx.fillRect(0, h * 0.797, w, h * 0.015)
  for (const xf of [0.24, 0.76] as const) {
    ctx.fillRect(w * xf - w * 0.011, h * 0.812, w * 0.022, h * 0.017)
  }
  ctx.strokeStyle = rgba('#d8c05a', 0.4)
  ctx.lineWidth = Math.max(1, h * 0.0012)
  ctx.beginPath()
  ctx.moveTo(0, h * 0.8045)
  ctx.lineTo(w, h * 0.8045)
  for (const xf of [0.24, 0.76] as const) {
    ctx.moveTo(w * xf, h * 0.8045)
    ctx.lineTo(w * xf, h * 0.829)
  }
  ctx.stroke()
  ctx.restore()
  // The windsock on the strip between taxiway and runway, alive in the wind.
  {
    const wx = w * 0.135
    const top = h * 0.806
    ctx.save()
    ctx.strokeStyle = rgba('#5a646d', alpha * 0.9)
    ctx.lineWidth = Math.max(1, unit * 0.002)
    ctx.beginPath()
    ctx.moveTo(wx, h * 0.8265)
    ctx.lineTo(wx, top)
    ctx.stroke()
    const flap = Math.sin(time * 2.6) * 0.5 + 0.5
    ctx.fillStyle = rgba('#ef7a30', alpha * 0.95)
    ctx.beginPath()
    ctx.moveTo(wx, top)
    ctx.lineTo(wx + w * 0.015, top + h * (0.0035 + flap * 0.002))
    ctx.lineTo(wx + w * 0.015, top + h * (0.006 + flap * 0.002))
    ctx.lineTo(wx, top + h * 0.0065)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // --- The RUNWAY the display flies along — wide, properly marked ------------
  const rwyTop = h * 0.829
  const rwyBot = h * 0.863
  ctx.save()
  ctx.globalAlpha = alpha * 0.85
  ctx.fillStyle = mixHex('#78838c', HAZE, 0.16)
  ctx.fillRect(0, rwyTop, w, rwyBot - rwyTop)
  ctx.strokeStyle = rgba('#eef3f7', 0.5)
  ctx.lineWidth = Math.max(1, h * 0.0016)
  ctx.beginPath()
  ctx.moveTo(0, rwyTop + h * 0.002)
  ctx.lineTo(w, rwyTop + h * 0.002)
  ctx.moveTo(0, rwyBot - h * 0.002)
  ctx.lineTo(w, rwyBot - h * 0.002)
  ctx.stroke()
  {
    const dash = w * 0.03
    const midY = (rwyTop + rwyBot) / 2
    ctx.strokeStyle = rgba('#eef3f7', 0.55)
    ctx.lineWidth = Math.max(1, h * 0.003)
    ctx.beginPath()
    for (let x = w * 0.01; x < w; x += dash * 2) {
      ctx.moveTo(x, midY)
      ctx.lineTo(x + dash, midY)
    }
    ctx.stroke()
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
  // returns with the B2.3c choreography now that the clean roll frames exist.
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
  // arrives with the B2.3c opposing-loops redesign.)

  // --- The crowd: TENS OF THOUSANDS, six rows deep ---------------------------
  // The crowd-line barrier at the far edge of the spectator area — the near
  // rows swallow most of it, exactly like standing in the crowd.
  ctx.save()
  ctx.strokeStyle = rgba('#dde5ec', condense * 0.5)
  ctx.lineWidth = Math.max(1, h * 0.0014)
  ctx.beginPath()
  ctx.moveTo(0, h * 0.8865)
  ctx.lineTo(w, h * 0.8865)
  for (let x = w * 0.008; x < w; x += w * 0.018) {
    ctx.moveTo(x, h * 0.8865)
    ctx.lineTo(x, h * 0.892)
  }
  ctx.stroke()
  ctx.restore()
  // Marquee tents of the spectator village, poking over the far heads.
  ctx.save()
  for (const [xf, hwF, thF] of [
    [0.075, 0.024, 0.012],
    [0.29, 0.019, 0.01],
    [0.7, 0.021, 0.011],
    [0.915, 0.026, 0.013],
  ] as const) {
    const x = w * xf
    const hw = w * hwF
    const th = h * thF
    const base = h * 0.895
    // A long marquee: wide flat ridge, gently sloped ends.
    ctx.fillStyle = rgba('#e4ebf1', condense * 0.85)
    ctx.beginPath()
    ctx.moveTo(x - hw, base)
    ctx.lineTo(x - hw * 0.55, base - th)
    ctx.lineTo(x + hw * 0.55, base - th)
    ctx.lineTo(x + hw, base)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = rgba('#b9c6d2', condense * 0.6) // shade on the sun-off slope
    ctx.beginPath()
    ctx.moveTo(x + hw * 0.55, base - th)
    ctx.lineTo(x + hw, base)
    ctx.lineTo(x + hw * 0.3, base)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  // Six rows of heads, far texture → near silhouettes (depth = the scale).
  const rows: Array<{ y: number; color: string; seed: number; step: number; arms: boolean }> = [
    { y: h * 0.896, color: '#333f57', seed: 880, step: 6, arms: false },
    { y: h * 0.903, color: '#2c374d', seed: 890, step: 7.5, arms: false },
    { y: h * 0.916, color: '#2b3550', seed: 900, step: 11, arms: true },
    { y: h * 0.938, color: '#232c3e', seed: 950, step: 14, arms: true },
    { y: h * 0.965, color: '#182031', seed: 860, step: 18, arms: true },
    { y: h * 0.998, color: '#0e1420', seed: 840, step: 23, arms: true },
  ]
  const excite = 0.5 + 0.5 * smoothstep(0.24, 0.5, t) * (1 - smoothstep(0.9, 1, t))
  for (const row of rows) {
    ctx.save()
    ctx.fillStyle = rgba(row.color, condense)
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
    if (row.arms) {
      ctx.strokeStyle = rgba(row.color, condense * 0.95)
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
    }
    ctx.restore()
  }
  // Flags over the crowd at every depth.
  ctx.save()
  const FLAG_COLORS = ['#d84343', '#3a6fd8', '#e8e8ea']
  for (let i = 0; i < 8; i++) {
    const d = hash1(985 + i * 7.1) // depth: 0 = far row, 1 = right next to us
    const x = (0.05 + hash1(980 + i * 19) * 0.9) * w
    const y = h * lerp(0.905, 0.975, d)
    const fh = h * (0.012 + d * 0.012)
    ctx.strokeStyle = rgba('#1a2130', condense * 0.9)
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y - fh * 1.6)
    ctx.stroke()
    const flap = Math.sin(time * 3 + i * 2.3) * fh * 0.18
    ctx.fillStyle = rgba(FLAG_COLORS[i % 3], condense * 0.9)
    ctx.beginPath()
    ctx.moveTo(x, y - fh * 1.6)
    ctx.lineTo(x + fh * 1.05, y - fh * 1.25 + flap)
    ctx.lineTo(x, y - fh * 0.9)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
  // Camera flashes rippling through the whole depth of the crowd.
  ctx.save()
  for (let i = 0; i < 24; i++) {
    const hx = hash1(1000 + i * 13.7)
    const phase = (time * (0.7 + hash1(1010 + i * 7.7) * 0.5) + hx * 9) % 1
    const on = time > 0 ? (phase < 0.06 ? 1 - phase / 0.06 : 0) : hash1(1020 + i * 3.1) < 0.25 ? 0.6 : 0
    if (on <= 0.02) continue
    const depth = hash1(1030 + i * 5.3)
    const x = hx * w
    const y = h * (0.895 + depth * 0.09)
    drawGlow(ctx, x, y, unit * (0.008 + depth * 0.007), '#ffffff', alpha * on * excite)
  }
  ctx.restore()
}
