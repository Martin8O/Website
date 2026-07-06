/**
 * The L-159 cockpit HUD — saturated green glyphs over the world, modelled on
 * the real photo (`local/ode mne/HUD display.jpg`): boxed FMS / MACH / ALT on
 * top, a mach tape, the two ROUND DIAL gauges (speed left, altitude right —
 * rings of ticks with a boxed digital readout), pitch-ladder bars around a
 * long horizon line, the flight-path marker, heading + nav readouts, and a
 * target designator that walks from A-A BVR to A-G as a strike beat arrives.
 *
 * B2.2: the cluster sits DEAD CENTRE at full intensity — you are looking
 * through the combiner glass, so it owns the middle of the screen from the
 * moment the L-159 unlock powers it up (Martin: no fades, no dimming).
 * Amber stays the site's global HUD through-line; this green lived only in
 * the L-159 — it appears only in the L-159 moments, for authenticity.
 */

import { TAU, clamp01, lerp, rgba } from '../../toolkit'

export const HUD_GREEN = '#5dff6d'

export type CockpitHudOptions = {
  w: number
  h: number
  alpha: number
  /** 0 = air-to-air BVR mode → 1 = air-to-ground strike mode. */
  attack: number
  /** Screen point the target designator sits on. */
  target: { x: number; y: number }
  /** A second bracketed contact (his wingman) — same designator frame. */
  target2?: { x: number; y: number }
  rangeNm: number
  mach: number
  altFt: number
  hdg: number
}

export function drawCockpitHud(ctx: CanvasRenderingContext2D, o: CockpitHudOptions): void {
  if (o.alpha <= 0.01) return
  // Centred on the screen at full strength (Martin's placement) — the pilot's
  // eye position behind the combiner glass, nudged just below mid-screen so
  // the top FMS/MACH/ALT row clears the L-159 riding above it.
  const s = (Math.min(o.w, o.h) / 800) * 0.66
  const cx = o.w * 0.5
  const cy = o.h * 0.515
  const a = o.alpha

  ctx.save()
  ctx.strokeStyle = rgba(HUD_GREEN, a * 0.85)
  ctx.fillStyle = rgba(HUD_GREEN, a * 0.85)
  ctx.lineWidth = Math.max(1, 1.05 * s)
  ctx.shadowColor = rgba(HUD_GREEN, 0.4)
  ctx.shadowBlur = 3.5 * s
  const font = (px: number) => `${Math.max(8, Math.round(px * s))}px "Chakra Petch", ui-monospace, Consolas, monospace`
  ctx.font = font(13)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const boxed = (label: string, x: number, y: number, bw = 68) => {
    ctx.strokeRect(x - (bw / 2) * s, y - 11 * s, bw * s, 22 * s)
    ctx.fillText(label, x, y + 1 * s)
  }

  // --- Top row: FMS / MACH / ALT --------------------------------------------
  const topY = cy - 158 * s
  boxed('FMS', cx - 190 * s, topY)
  boxed('MACH', cx, topY)
  boxed('ALT', cx + 190 * s, topY)
  ctx.font = font(11)
  ctx.fillText('AP1', cx - 190 * s, topY + 22 * s)
  ctx.fillText('AT1', cx - 190 * s, topY + 35 * s)
  ctx.fillText(o.altFt.toFixed(0), cx + 190 * s, topY + 24 * s)

  // Mach tape: ticks around the current value, caret at the centre.
  const tapeY = topY + 30 * s
  ctx.beginPath()
  for (let i = -3; i <= 3; i++) {
    const x = cx + i * 32 * s
    ctx.moveTo(x, tapeY - 4 * s)
    ctx.lineTo(x, tapeY + 4 * s)
  }
  ctx.moveTo(cx - 104 * s, tapeY)
  ctx.lineTo(cx + 104 * s, tapeY)
  ctx.stroke()
  for (let i = -2; i <= 2; i += 2) {
    ctx.fillText((o.mach + i * 0.05).toFixed(2).slice(1), cx + i * 32 * s, tapeY + 13 * s)
  }
  ctx.beginPath()
  ctx.moveTo(cx, tapeY - 11 * s)
  ctx.lineTo(cx - 5 * s, tapeY - 18 * s)
  ctx.lineTo(cx + 5 * s, tapeY - 18 * s)
  ctx.closePath()
  ctx.stroke()

  // --- The round dial gauges (the photo's signature): speed L, altitude R.
  // A needle sweeps with the value so they unmistakably read as instruments.
  const dial = (dx: number, dy: number, main: string, sub: string, frac: number) => {
    const r = 56 * s
    ctx.beginPath()
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * TAU - Math.PI / 2
      const inner = i % 5 === 0 ? r - 9 * s : r - 5.5 * s
      ctx.moveTo(dx + Math.cos(ang) * inner, dy + Math.sin(ang) * inner)
      ctx.lineTo(dx + Math.cos(ang) * r, dy + Math.sin(ang) * r)
    }
    ctx.stroke()
    const na = (0.12 + 0.76 * Math.max(0, Math.min(1, frac))) * TAU - Math.PI / 2
    ctx.save()
    ctx.lineWidth = Math.max(1, 1.6 * s)
    ctx.beginPath()
    ctx.moveTo(dx + Math.cos(na) * r * 0.42, dy + Math.sin(na) * r * 0.42)
    ctx.lineTo(dx + Math.cos(na) * (r - 10 * s), dy + Math.sin(na) * (r - 10 * s))
    ctx.stroke()
    ctx.restore()
    ctx.font = font(13)
    boxed(main, dx, dy, main.length > 3 ? 70 : 52)
    ctx.font = font(11)
    ctx.fillText(sub, dx, dy + r * 0.62)
  }
  const dialY = cy - 10 * s
  dial(cx - 190 * s, dialY, o.mach.toFixed(2).slice(1), (o.mach * 661).toFixed(0), (o.mach - 0.5) / 0.5)
  // Right dial = ALT, mirroring the top-right ALT box (same live value).
  dial(cx + 190 * s, dialY, o.altFt.toFixed(0), 'ALT', o.altFt / 30000)
  ctx.font = font(12)
  ctx.fillText(`HDG ${o.hdg.toFixed(0)}`, cx - 190 * s, dialY + 82 * s)

  // --- Right column: nav block ----------------------------------------------
  ctx.textAlign = 'left'
  ctx.font = font(11)
  ctx.fillText('FMS1', cx + 258 * s, dialY - 22 * s)
  ctx.fillText(`${o.rangeNm.toFixed(1)} NM`, cx + 258 * s, dialY - 8 * s)
  ctx.fillText('DTRK 138', cx + 258 * s, dialY + 6 * s)
  ctx.textAlign = 'center'

  // --- Pitch ladder + the long horizon line ---------------------------------
  const horizonLineY = cy + 40 * s
  ctx.beginPath()
  ctx.moveTo(cx - 300 * s, horizonLineY)
  ctx.lineTo(cx - 28 * s, horizonLineY)
  ctx.moveTo(cx + 28 * s, horizonLineY)
  ctx.lineTo(cx + 300 * s, horizonLineY)
  ctx.stroke()
  // +5° bar above, -5° dashed bar below (as in the photo).
  const ladder = (y: number, dashed: boolean, label: string) => {
    ctx.save()
    if (dashed) ctx.setLineDash([9 * s, 6 * s])
    ctx.beginPath()
    ctx.moveTo(cx - 90 * s, y)
    ctx.lineTo(cx - 24 * s, y)
    ctx.moveTo(cx + 24 * s, y)
    ctx.lineTo(cx + 90 * s, y)
    ctx.stroke()
    ctx.restore()
    ctx.font = font(11)
    ctx.fillText(label, cx - 104 * s, y)
    ctx.fillText(label, cx + 104 * s, y)
  }
  ladder(cy - 36 * s, false, '5')
  ladder(cy + 116 * s, true, '5')

  // --- Flight-path marker (circle + wings + fin), just above the horizon ----
  const fpmY = cy + 17 * s
  ctx.beginPath()
  ctx.arc(cx, fpmY, 8 * s, 0, TAU)
  ctx.moveTo(cx - 8 * s, fpmY)
  ctx.lineTo(cx - 22 * s, fpmY)
  ctx.moveTo(cx + 8 * s, fpmY)
  ctx.lineTo(cx + 22 * s, fpmY)
  ctx.moveTo(cx, fpmY - 8 * s)
  ctx.lineTo(cx, fpmY - 17 * s)
  ctx.stroke()

  // Centre vertical reference below (as in the photo's lower stem).
  ctx.beginPath()
  ctx.moveTo(cx, cy + 70 * s)
  ctx.lineTo(cx, cy + 142 * s)
  ctx.stroke()

  // --- Target designators + weapon readout ----------------------------------
  const td = 10 * s
  ctx.strokeRect(o.target.x - td, o.target.y - td, td * 2, td * 2)
  ctx.beginPath()
  ctx.moveTo(o.target.x, o.target.y - td)
  ctx.lineTo(o.target.x, o.target.y - td - 6 * s)
  ctx.stroke()
  ctx.font = font(11)
  ctx.fillText(`${o.rangeNm.toFixed(1)}`, o.target.x, o.target.y + td + 10 * s)
  if (o.target2) {
    ctx.strokeRect(o.target2.x - td, o.target2.y - td, td * 2, td * 2)
    ctx.beginPath()
    ctx.moveTo(o.target2.x, o.target2.y - td)
    ctx.lineTo(o.target2.x, o.target2.y - td - 6 * s)
    ctx.stroke()
    // The wingman trails 1.8 NM further out; both ranges close together.
    ctx.fillText(`${(o.rangeNm + 1.8).toFixed(1)}`, o.target2.x, o.target2.y + td + 10 * s)
  }

  // Mode text walks A-A → A-G with the strike beat.
  ctx.font = font(12)
  ctx.textAlign = 'left'
  const modeX = cx - 300 * s
  const modeY = cy + 102 * s
  const atk = clamp01(o.attack)
  if (atk < 0.5) {
    ctx.globalAlpha = a * lerp(1, 0.2, atk * 2)
    ctx.fillText('A-A  BVR', modeX, modeY)
    ctx.fillText('AIM-9M  RDY', modeX, modeY + 15 * s)
  } else {
    ctx.globalAlpha = a * lerp(0.2, 1, (atk - 0.5) * 2)
    ctx.fillText('A-G  CCIP', modeX, modeY)
    ctx.fillText('GUN  250', modeX, modeY + 15 * s)
  }
  ctx.restore()
}
