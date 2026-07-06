/**
 * SKY / DESERT — Bagram, Afghanistan (B2.3a redesign; refs `local/ode mne/
 * siluety/bagram*.jpg`, `bagram ochrana.jpg`, `bagram tents*.jpg`,
 * `apache*.jpg`, `c-17 side.jpg`, `f-16 standing*.jpg`). FACTUAL (facts §6b):
 * Martin served as GROUND personnel (liaison officer) on a ~30,000-person
 * fenced base; he flew only a few helicopter transport missions. A GROUND
 * mood — the one sky chapter seen from the earth:
 *  - white-hot sun, drifting dust — war-veteran gravity,
 *  - the Hindu Kush TOWERING with snow caps (bagram 3.jpg), foothills below,
 *  - a real airfield: runway on the horizon line, taxiway, concrete apron
 *    pads — the scene opens with a C-17 lifting off right of the tower,
 *    gone to the right as the slower Apache pair drifts in from the left,
 *  - a 30k-person tent city: grid rows of barrel-vaulted tents (bagram
 *    tents 2.jpg), giant clamshell hangars + long tents, control tower,
 *  - aprons FULL of parked aircraft: a dense nose-on F-16 flightline (f-16
 *    standing 2.jpg) behind a side-profile row (f-16 standing.jpg), two
 *    C-17s towering among them (c-17 front.png) + ground equipment,
 *  - the perimeter up close: concrete T-wall runs with guard towers and
 *    concertina wire, alternating with chain-link sections (bagram ochrana),
 *  - overhead: an F-16 pair holding in the pattern — others fly them here;
 *    a TWO-ship Mi-17 crossing — the only ride out (the transport beat).
 *
 * Scroll pans slowly across the vast base — layered speeds carry the size.
 */

import type { Renderer } from '../../types'
import {
  TAU,
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
import { drawAircraft } from './aircraft'
import { drawPuff } from './clouds'
import { sunArc } from './skyMath'

const STRUCT = '#4a3b2c'
const HAZE = '#e8dcc0'
const WIRE = '#241c12'
const CONCRETE = '#cfc3a4'

/** Positive modulo — pan offsets go negative while the scene condenses in. */
function wrapN(v: number, m: number): number {
  return ((v % m) + m) % m
}

/** One distant row of the tent city — barrel-vaulted tents (vertical walls +
 *  arched roof, bagram tents 2.jpg; NOT gable triangles) with the occasional
 *  street gap, streaming with the pan (stable per-cell jitter). */
function drawTentRow(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  gap: number,
  tw: number,
  th: number,
  off: number,
  seed: number,
): void {
  const first = -wrapN(off, gap) - gap
  ctx.beginPath()
  for (let x = first; x < w + gap; x += gap) {
    const cell = Math.round((x + off) / gap)
    const j = hash1(seed + cell * 7.13)
    if (j < 0.14) continue
    const xx = x + (j - 0.5) * gap * 0.2
    const hh = th * (0.85 + j * 0.3)
    ctx.moveTo(xx - tw, y)
    ctx.lineTo(xx - tw, y - hh * 0.52)
    ctx.ellipse(xx, y - hh * 0.52, tw, hh * 0.48, 0, Math.PI, 0)
    ctx.lineTo(xx + tw, y)
    ctx.closePath()
  }
  ctx.fill()
}

/** Ground equipment scattered over the apron — trucks, bowsers, light masts,
 *  crate stacks, generator carts. `u` = min(w,h); shapes stay tiny. */
function drawGroundKit(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: number,
  u: number,
): void {
  switch (kind) {
    case 0: // flatbed truck: bed + cab
      ctx.fillRect(x - u * 0.016, y - u * 0.01, u * 0.026, u * 0.01)
      ctx.fillRect(x + u * 0.01, y - u * 0.014, u * 0.008, u * 0.014)
      break
    case 1: { // fuel bowser: tank + cab
      ctx.beginPath()
      ctx.ellipse(x, y - u * 0.0065, u * 0.014, u * 0.0065, 0, 0, TAU)
      ctx.fill()
      ctx.fillRect(x + u * 0.013, y - u * 0.011, u * 0.007, u * 0.011)
      break
    }
    case 2: // light mast
      ctx.lineWidth = Math.max(1, u * 0.0022)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x, y - u * 0.034)
      ctx.stroke()
      ctx.fillRect(x - u * 0.006, y - u * 0.038, u * 0.012, u * 0.005)
      break
    case 3: // crate / container stack
      ctx.fillRect(x - u * 0.011, y - u * 0.009, u * 0.022, u * 0.009)
      ctx.fillRect(x - u * 0.007, y - u * 0.016, u * 0.013, u * 0.007)
      break
    default: // generator cart
      ctx.fillRect(x - u * 0.008, y - u * 0.007, u * 0.016, u * 0.007)
      ctx.fillRect(x + u * 0.005, y - u * 0.011, u * 0.002, u * 0.004)
      break
  }
}

export const renderDesert: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h } = cfg
  const unit = Math.min(w, h)
  const horizonY = h * 0.6
  // Continuous pan clock — the world keeps streaming through both seams
  // (ADR-012); story beats keep the clamped `t`.
  const tr = cfg.tRaw ?? t
  // Dark silhouettes CONDENSE gradually out of the haze while the previous
  // scene dissolves — never popping in at full strength mid cross-fade.
  const condense = alpha * alpha * alpha
  const structA = condense * 0.92

  // --- Scorched sky, white-hot sun ------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      [0, '#7fa2c4'],
      [0.5, '#c9d3cd'],
      [0.85, '#efe4c4'],
      [1, '#f4ecd2'],
    ],
    alpha,
  )
  // The section-wide sun arc, continuous through both of this scene's seams.
  // Painted BEFORE the range so the snow peaks cut into the glare (bagram 3).
  const sun = sunArc(3.5 + tr)
  const sunX = w * sun.x
  const sunY = h * sun.y
  drawGlow(ctx, sunX, sunY, unit * 0.5, '#fdf6e3', alpha * 0.5)
  drawGlow(ctx, sunX, sunY, unit * 0.12, '#ffffff', alpha * 0.85)
  ctx.save()
  ctx.strokeStyle = rgba('#fdf3d8', alpha * 0.12)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(sunX, sunY, unit * 0.17, 0, TAU)
  ctx.stroke()
  ctx.restore()

  // --- The Hindu Kush: two towering ranges with SNOW CAPS + foothills -------
  // Two seeds per depth: the union of their silhouettes serrates the skyline
  // (one sum-of-sines alone reads as a smooth dome, not the Hindu Kush).
  // All rock first, then snow as ONE union pass per snowline. Snow colours
  // are OPAQUE (each step pre-mixed toward the rock, not painted translucent)
  // — a translucent pass double-paints where the two layers overlap and
  // stripes visible alpha bands across the taller face. Each snowline clips
  // along a gentle WAVE so the steps read as a gradual, organic transition.
  const snowClip = (snowY: number, phase: number) => {
    ctx.beginPath()
    ctx.moveTo(0, 0)
    const amp = h * 0.008
    for (let i = 0; i <= 40; i++) {
      const x = (i / 40) * w
      ctx.lineTo(x, snowY + Math.sin((x / w) * TAU * 4.3 + phase) * amp)
    }
    ctx.lineTo(w, 0)
    ctx.closePath()
    ctx.clip()
  }
  const snowRange = (
    layers: ReadonlyArray<readonly [number, number, number, number]>,
    rock: string,
    snowlines: ReadonlyArray<readonly [number, string, number]>,
  ) => {
    for (const [y, amp, seed, scrollX] of layers)
      drawRidge(ctx, { w, y, amp, seed, color: rock, bottom: horizonY + 2, scrollX, alpha })
    for (const [snowY, col, phase] of snowlines) {
      ctx.save()
      snowClip(snowY, phase)
      for (const [y, amp, seed, scrollX] of layers)
        drawRidge(ctx, { w, y, amp, seed, color: col, bottom: snowY + h * 0.012, scrollX, alpha })
      ctx.restore()
    }
  }
  // The far high range — bluer, hazier, snow on its tall crests: three
  // opaque steps toward white, wavy edges at three phases = soft transition.
  {
    const rock = mixHex('#767b8e', HAZE, 0.42)
    const white = mixHex('#fafdfc', HAZE, 0.16)
    snowRange(
      [
        [h * 0.43, h * 0.155, 43, tr * w * 0.022],
        [h * 0.445, h * 0.19, 61, tr * w * 0.025],
      ],
      rock,
      [
        [h * 0.368, mixHex(white, rock, 0.62), 0.8],
        [h * 0.344, mixHex(white, rock, 0.34), 2.9],
        [h * 0.318, white, 5.1],
      ],
    )
  }
  // The nearer rock face — warmer, bare rock (bagram 3.jpg keeps the snow on
  // the far range only; more snowlines here would stripe the composition).
  snowRange(
    [
      [h * 0.475, h * 0.115, 41, tr * w * 0.035],
      [h * 0.485, h * 0.135, 67, tr * w * 0.038],
    ],
    mixHex('#7e7a85', HAZE, 0.3),
    [],
  )

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

  // --- An F-16 pair holding in the overhead pattern — others fly them here --
  {
    const cx = w * 0.52
    const cy = h * 0.155
    const rx = w * 0.27
    const ry = h * 0.05
    const orbit = time * 0.29 + tr * 2.6
    for (const phase of [0, Math.PI]) {
      const a = orbit + phase
      const s = Math.sin(a)
      const dir: 1 | -1 = s > 0 ? -1 : 1
      drawAircraft(ctx, 'f16', {
        x: cx + Math.cos(a) * rx,
        y: cy + s * ry,
        size: unit * 0.052 * (0.85 + 0.3 * s),
        dir,
        tilt: dir * 0.09,
        color: mixHex('#3f3c35', HAZE, 0.42 - 0.14 * s),
        alpha: condense * (0.6 + 0.18 * s),
        time,
      })
    }
  }

  // --- The RUNWAY along the horizon (a real airfield has one) ----------------
  const rwyTop = h * 0.606
  const rwyBot = h * 0.623
  const rwyOff = tr * w * 0.09
  ctx.save()
  ctx.globalAlpha = alpha * 0.85
  ctx.fillStyle = mixHex(CONCRETE, HAZE, 0.25)
  ctx.fillRect(0, rwyTop, w, rwyBot - rwyTop)
  // Edge + centerline markings, streaming with the distant band.
  ctx.strokeStyle = rgba('#f4eedd', 0.4)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, rwyTop + 1)
  ctx.lineTo(w, rwyTop + 1)
  ctx.moveTo(0, rwyBot - 1)
  ctx.lineTo(w, rwyBot - 1)
  ctx.stroke()
  {
    const dash = w * 0.024
    const midY = (rwyTop + rwyBot) / 2
    ctx.strokeStyle = rgba('#f4eedd', 0.5)
    ctx.lineWidth = Math.max(1, h * 0.0022)
    ctx.beginPath()
    for (let x = -wrapN(rwyOff, dash * 2) - dash * 2; x < w + dash; x += dash * 2) {
      ctx.moveTo(x, midY)
      ctx.lineTo(x + dash, midY)
    }
    ctx.stroke()
  }
  ctx.restore()

  // --- The C-17 departure: the scene OPENS with it just lifting off right
  // of the tower — it accelerates out to the right, gone by t ≈ 0.22 (the
  // Apache pair drifts in slower from the left; the Mi-17s only arrive once
  // the C-17 has cleared the frame).
  {
    const p = clamp01(t / 0.28)
    if (p < 0.999) {
      const run = (p * p + p) / 2 // still accelerating
      const climb = smoothstep(0.15, 0.9, p)
      drawAircraft(ctx, 'c17', {
        x: lerp(w * 0.48, w * 1.35, run),
        y: h * 0.594 - climb * climb * h * 0.14,
        size: unit * 0.16,
        dir: 1,
        tilt: 0.1 + p * 0.06,
        color: mixHex('#41372a', HAZE, 0.15),
        alpha: condense * 0.92,
        time: 0,
      })
    }
  }

  // --- The tent city: distant grid rows (30k people live here) --------------
  ctx.save()
  for (const [y, gap, tw, th, speed, seed, mixT, aMul] of [
    [0.632, 0.016, 0.0055, 0.009, 0.1, 700, 0.45, 0.55],
    [0.647, 0.02, 0.007, 0.011, 0.11, 730, 0.36, 0.62],
    [0.664, 0.025, 0.009, 0.013, 0.12, 760, 0.28, 0.7],
  ] as const) {
    ctx.globalAlpha = condense * aMul
    ctx.fillStyle = mixHex(STRUCT, HAZE, mixT)
    drawTentRow(ctx, w, h * y, w * gap, w * tw, h * th, tr * w * speed, seed)
  }
  ctx.restore()

  // --- Mid band: hangars, giant tents, the tower — OPAQUE at rest -----------
  // (structA left an 8% see-through that let the sky ghost through the
  // buildings in front of the tower — Martin's catch.)
  const span = w * 1.6
  const wrapX = (raw: number, off: number) => wrapN(raw - off, span) - w * 0.3
  const midOff = tr * w * 0.2
  const midBase = h * 0.702

  ctx.save()
  ctx.globalAlpha = condense
  ctx.fillStyle = mixHex(STRUCT, HAZE, 0.18)
  // Clamshell hangars (arched, bagram tents.jpg).
  for (let i = 0; i < 4; i++) {
    const x = wrapX(hash1(500 + i * 37) * span, midOff)
    const hw = w * (0.055 + hash1(510 + i * 13) * 0.03)
    const hh = h * (0.048 + hash1(520 + i * 7) * 0.026)
    ctx.beginPath()
    ctx.moveTo(x - hw, midBase)
    ctx.ellipse(x, midBase, hw, hh, 0, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
  }
  // Giant barrel tents: low walls + a vaulted roof (bagram tents 2.jpg).
  for (let i = 0; i < 6; i++) {
    const x = wrapX(hash1(810 + i * 17) * span, midOff)
    const len = w * (0.045 + hash1(815 + i * 11) * 0.04)
    const ht = h * (0.026 + hash1(820 + i * 5) * 0.014)
    ctx.beginPath()
    ctx.moveTo(x - len, midBase)
    ctx.lineTo(x - len, midBase - ht * 0.55)
    ctx.ellipse(x, midBase - ht * 0.55, len, ht * 0.45, 0, Math.PI, 0)
    ctx.lineTo(x + len, midBase)
    ctx.closePath()
    ctx.fill()
  }
  // The control tower.
  {
    const x = wrapX(span * 0.55, midOff)
    const tw = w * 0.013
    ctx.fillRect(x - tw / 2, midBase - h * 0.115, tw, h * 0.115)
    ctx.fillRect(x - tw * 1.6, midBase - h * 0.143, tw * 3.2, h * 0.032)
    ctx.beginPath()
    ctx.moveTo(x, midBase - h * 0.143)
    ctx.lineTo(x, midBase - h * 0.18)
    ctx.strokeStyle = ctx.fillStyle
    ctx.lineWidth = 1.4
    ctx.stroke()
  }
  // Container yards — some stacked two high.
  for (let i = 0; i < 7; i++) {
    const x = wrapX(hash1(830 + i * 19) * span, midOff)
    const cw = w * (0.01 + hash1(835 + i * 7) * 0.012)
    ctx.fillRect(x - cw / 2, midBase - h * 0.011, cw, h * 0.011)
    if (hash1(840 + i * 3) > 0.55) ctx.fillRect(x - cw * 0.35, midBase - h * 0.021, cw * 0.7, h * 0.01)
  }
  ctx.restore()

  // --- Taxiway + concrete apron pads (stojánky) ------------------------------
  const apronOff = tr * w * 0.3
  ctx.save()
  ctx.globalAlpha = alpha * 0.6
  ctx.fillStyle = mixHex(CONCRETE, HAZE, 0.18)
  // The taxiway band in front of the buildings, with a faint yellow line.
  ctx.fillRect(0, h * 0.708, w, h * 0.013)
  ctx.strokeStyle = rgba('#d8c05a', 0.35)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, h * 0.7145)
  ctx.lineTo(w, h * 0.7145)
  ctx.stroke()
  // Two apron pads under the parked rows, streaming with the apron band.
  ctx.fillStyle = mixHex(CONCRETE, HAZE, 0.1)
  ctx.fillRect(0, h * 0.726, w, h * 0.018)
  ctx.fillRect(0, h * 0.748, w, h * 0.026)
  // Stand markings: short white ticks per stand slot.
  ctx.strokeStyle = rgba('#f4eedd', 0.35)
  ctx.lineWidth = 1
  ctx.beginPath()
  {
    const gap = w * 0.031
    const first = -wrapN(apronOff, gap) - gap
    for (let x = first; x < w + gap; x += gap) {
      ctx.moveTo(x, h * 0.741)
      ctx.lineTo(x, h * 0.744)
    }
    const gap2 = w * 0.06
    const first2 = -wrapN(apronOff + w * 0.02, gap2) - gap2
    for (let x = first2; x < w + gap2; x += gap2) {
      ctx.moveTo(x, h * 0.769)
      ctx.lineTo(x, h * 0.773)
    }
  }
  ctx.stroke()
  ctx.restore()

  // --- Aprons FULL of parked aircraft ----------------------------------------
  // Four C-17s parked among the fighters, one row deeper (c-17 front.png) —
  // their tails tower over the flightline.
  for (const [frac, dir] of [[0.18, 1], [0.42, -1], [0.66, -1], [0.9, 1]] as const) {
    drawAircraft(ctx, 'c17front', {
      x: wrapX(span * frac, apronOff), y: h * 0.7405 - unit * 0.115 * 0.173, size: unit * 0.115, dir,
      color: mixHex('#3c3225', HAZE, 0.18), alpha: condense * 0.85, time: 0,
    })
  }
  // Back stand: the dense nose-on F-16 flightline — small front silhouettes
  // side by side (f-16 standing 2.jpg; Martin: "klidne male, 10 vedle sebe").
  {
    const gap = w * 0.031
    const size = unit * 0.04
    const first = -wrapN(apronOff, gap) - gap
    for (let x = first; x < w + gap; x += gap) {
      const cell = Math.round((x + apronOff) / gap)
      const j = hash1(910 + cell * 5.7)
      if (j < 0.12) continue
      drawAircraft(ctx, 'f16front', {
        x: x + (j - 0.5) * gap * 0.14, y: h * 0.7365 - size * 0.258, size, dir: 1,
        color: mixHex('#3c3225', HAZE, 0.22), alpha: condense * 0.78, time: 0,
      })
    }
  }
  // Front row: standing side profiles on the big pad.
  {
    const gap = w * 0.06
    const size = unit * 0.052
    const off = apronOff + w * 0.02
    const first = -wrapN(off, gap) - gap
    for (let x = first; x < w + gap; x += gap) {
      const cell = Math.round((x + off) / gap)
      const j = hash1(940 + cell * 9.3)
      if (j < 0.35) continue // sparser than the nose-on stand (Martin: fewer)
      drawAircraft(ctx, 'f16park', {
        x: x + (j - 0.5) * gap * 0.2, y: h * 0.766 - size * 0.189, size, dir: cell % 2 ? 1 : -1,
        color: mixHex('#3c3225', HAZE, 0.1), alpha: structA, time: 0,
      })
    }
  }
  // Rotary stands: the parked Mi-17 (someone else's ride) + a parked Apache.
  drawAircraft(ctx, 'mi17', {
    x: wrapX(span * 0.82, apronOff), y: h * 0.752, size: unit * 0.085,
    color: mixHex('#3c3225', HAZE, 0.1), alpha: structA, time: 0,
  })
  drawAircraft(ctx, 'apache', {
    x: wrapX(span * 0.3, apronOff), y: h * 0.757, size: unit * 0.062,
    color: mixHex('#3c3225', HAZE, 0.1), alpha: structA, time: 0,
  })
  // Scattered ground equipment.
  ctx.save()
  ctx.fillStyle = mixHex('#332a1e', HAZE, 0.12)
  ctx.strokeStyle = ctx.fillStyle
  ctx.globalAlpha = condense * 0.85
  for (let i = 0; i < 10; i++) {
    const x = wrapX(hash1(900 + i * 13) * span, apronOff)
    const y = h * (0.778 + hash1(905 + i * 7) * 0.01)
    drawGroundKit(ctx, x, y, Math.floor(hash1(908 + i * 11) * 5), unit)
  }
  ctx.restore()

  // --- The Mi-17 transport beat — TWO ships in trail (the ride out). Timed
  // to Martin's scroll steps: they enter right as the Apache pair nears the
  // tower and are OVER the tower one step later (42%), passing the Apaches --
  const heliIn = smoothstep(0.12, 0.46, t)
  if (heliIn > 0.001 && heliIn < 0.999) {
    const hx = lerp(w * 1.12, -w * 0.12, heliIn)
    for (const i of [0, 1]) {
      const bob = Math.sin(time * 1.3 + i * 2.1) * h * 0.006
      drawAircraft(ctx, 'mi17', {
        x: hx + i * unit * 0.17, y: h * (0.315 - i * 0.022) + bob,
        size: unit * (0.11 - i * 0.012), dir: -1,
        color: '#41372a', glint: '#e8dcc0', alpha: condense * (0.95 - i * 0.08), time,
      })
    }
  }

  // --- An Apache pair transits low as the C-17 departs -----------------------
  const apIn = smoothstep(0.02, 0.5, t)
  if (apIn > 0.001 && apIn < 0.999) {
    const lead = lerp(-w * 0.15, w * 1.15, apIn)
    for (const i of [0, 1]) {
      const bob = Math.sin(time * 1.5 + i * 1.7) * h * 0.005
      drawAircraft(ctx, 'apache', {
        x: lead - i * unit * 0.1, y: h * (0.472 + i * 0.03) + bob,
        size: unit * (0.072 - i * 0.007), dir: 1,
        color: '#3a3125', alpha: condense * 0.92, time,
      })
    }
  }

  // --- The perimeter: T-wall runs w/ guard towers + chain-link sections -----
  // (bagram ochrana.jpg: concrete panels, concertina on top, a round tower.)
  const perOff = tr * w * 0.46
  const period = w * 1.05
  const wallW = period * 0.52
  const wallTop = h * 0.775
  const wallBot = h * 0.895
  const k0 = Math.floor(perOff / period) - 1
  for (let k = k0; k * period - perOff < w + period; k++) {
    const sx = k * period - perOff
    if (sx + period < -w * 0.05) continue

    // The concrete T-wall slab with panel seams.
    ctx.save()
    ctx.globalAlpha = condense * 0.88
    ctx.fillStyle = mixHex('#2b2216', HAZE, 0.07)
    ctx.fillRect(sx, wallTop, wallW, wallBot - wallTop)
    ctx.strokeStyle = rgba(HAZE, 0.13)
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let px = sx + w * 0.016; px < sx + wallW; px += w * 0.016) {
      ctx.moveTo(px, wallTop + 1)
      ctx.lineTo(px, wallBot)
    }
    ctx.stroke()
    // Concertina coils along the wall top.
    ctx.strokeStyle = rgba(WIRE, 0.75)
    ctx.lineWidth = Math.max(1, unit * 0.0016)
    ctx.beginPath()
    const coilR = h * 0.0105
    for (let px = sx + coilR; px < sx + wallW - coilR * 0.3; px += coilR * 1.15) {
      ctx.moveTo(px + coilR, wallTop - coilR)
      ctx.arc(px, wallTop - coilR, coilR, 0, TAU)
    }
    ctx.stroke()
    ctx.restore()

    // The guard tower over the wall run.
    {
      const txc = sx + wallW * 0.5
      const shaftW = w * 0.02
      const cabW = w * 0.036
      const cabTop = h * 0.708
      const cabBot = h * 0.748
      ctx.save()
      ctx.globalAlpha = condense * 0.9
      ctx.fillStyle = mixHex('#241d12', HAZE, 0.05)
      ctx.fillRect(txc - shaftW / 2, cabBot, shaftW, wallTop - cabBot + h * 0.004)
      ctx.fillRect(txc - cabW / 2, cabTop, cabW, cabBot - cabTop)
      // Observation glass band.
      ctx.fillStyle = rgba(HAZE, 0.4)
      ctx.fillRect(txc - cabW / 2 + w * 0.003, h * 0.716, cabW - w * 0.006, h * 0.012)
      // Roof + antenna.
      ctx.fillStyle = mixHex('#241d12', HAZE, 0.05)
      ctx.beginPath()
      ctx.moveTo(txc - cabW * 0.62, cabTop)
      ctx.lineTo(txc + cabW * 0.62, cabTop)
      ctx.lineTo(txc, cabTop - h * 0.016)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = ctx.fillStyle
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(txc, cabTop - h * 0.016)
      ctx.lineTo(txc, cabTop - h * 0.038)
      ctx.stroke()
      ctx.restore()
    }

    // The chain-link run filling the rest of the period.
    {
      const fx0 = sx + wallW
      const fx1 = sx + period
      const postGap = w * 0.07
      const fenceTop = h * 0.78
      const fenceBot = wallBot
      ctx.save()
      ctx.beginPath()
      ctx.rect(fx0, 0, fx1 - fx0, h)
      ctx.clip()
      ctx.strokeStyle = rgba(WIRE, condense * 0.72)
      ctx.lineWidth = Math.max(1.5, unit * 0.0038)
      for (let x = fx0; x <= fx1; x += postGap) {
        ctx.beginPath()
        ctx.moveTo(x, fenceBot)
        ctx.lineTo(x, fenceTop)
        // Barbed overhang leaning inward at the top.
        ctx.lineTo(x - postGap * 0.14, fenceTop - h * 0.02)
        ctx.stroke()
      }
      ctx.lineWidth = Math.max(1, unit * 0.0018)
      ctx.strokeStyle = rgba(WIRE, condense * 0.55)
      for (let i = 0; i < 4; i++) {
        const y = lerp(fenceTop + h * 0.018, fenceBot - h * 0.012, i / 3)
        ctx.beginPath()
        ctx.moveTo(fx0, y)
        ctx.lineTo(fx1, y)
        ctx.stroke()
      }
      // Diagonal mesh hint + the barbed wire along the overhang.
      ctx.strokeStyle = rgba(WIRE, condense * 0.12)
      for (let x = fx0; x < fx1; x += postGap / 2) {
        ctx.beginPath()
        ctx.moveTo(x, fenceTop + h * 0.018)
        ctx.lineTo(x + postGap / 2, fenceBot - h * 0.012)
        ctx.moveTo(x + postGap / 2, fenceTop + h * 0.018)
        ctx.lineTo(x, fenceBot - h * 0.012)
        ctx.stroke()
      }
      ctx.strokeStyle = rgba(WIRE, condense * 0.6)
      ctx.beginPath()
      for (let x = fx0; x < fx1; x += postGap) {
        ctx.moveTo(x - postGap * 0.14, fenceTop - h * 0.02)
        ctx.lineTo(x + postGap - postGap * 0.14, fenceTop - h * 0.02 + Math.sin(x * 0.01) * 1.5)
      }
      ctx.stroke()
      ctx.restore()
    }
  }

  // --- Jersey barriers in the near foreground (bagram ochrana.jpg) ----------
  {
    const jOff = tr * w * 0.6
    const jGap = w * 0.3
    const first = -wrapN(jOff, jGap) - jGap
    ctx.save()
    ctx.globalAlpha = condense * 0.55
    ctx.fillStyle = mixHex(WIRE, HAZE, 0.05)
    for (let x = first; x < w + jGap; x += jGap) {
      const cell = Math.round((x + jOff) / jGap)
      const j = hash1(970 + cell * 3.9)
      if (j > 0.55) continue
      const bx = x + (j - 0.5) * jGap * 0.4
      const bw = w * 0.052
      ctx.beginPath()
      ctx.moveTo(bx - bw * 0.5, h * 0.968)
      ctx.lineTo(bx - bw * 0.34, h * 0.925)
      ctx.lineTo(bx + bw * 0.34, h * 0.925)
      ctx.lineTo(bx + bw * 0.5, h * 0.968)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }

  // --- Dust: drifting grains + two long haze banks ---------------------------
  ctx.save()
  ctx.fillStyle = rgba('#d9c398', alpha * 0.5)
  for (let i = 0; i < 34; i++) {
    const hy = hash1(620 + i * 7.9)
    const px = wrapN(hash1(610 + i * 12.7) + time * 0.014 + tr * 0.3, 1.1) * w * 1.05 - w * 0.02
    const py = h * (0.4 + hy * 0.55) + Math.sin(time * 0.7 + i) * h * 0.004
    const r = 0.8 + hash1(630 + i * 3.3) * 1.8
    ctx.globalAlpha = alpha * (0.18 + hash1(640 + i * 5.1) * 0.3)
    ctx.fillRect(px, py, r, r)
  }
  ctx.restore()
  ctx.save()
  drawPuff(ctx, wrapN(0.2 + time * 0.004 + tr * 0.15, 1.2) * w, h * 0.62, h * 0.09, '#dcc79b', alpha * 0.22, 3.6)
  drawPuff(ctx, wrapN(0.75 + time * 0.006 + tr * 0.2, 1.2) * w, h * 0.74, h * 0.11, '#cfb488', alpha * 0.26, 3.2)
  ctx.restore()

  // A heavy, hot vignette pressing down — the gravity of the place.
  fillVerticalGradient(
    ctx, 0, 0, w, h * 0.2,
    [[0, rgba('#5c4a33', 0.28)], [1, 'rgba(0,0,0,0)']],
    alpha,
  )
}
