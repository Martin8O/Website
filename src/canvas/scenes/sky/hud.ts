/**
 * The L-159 cockpit HUD — saturated green glyphs over the world, modelled on
 * the real photo (`local/ode mne/HUD display.jpg`): boxed FMS / MACH / ALT on
 * top, a mach tape, pitch-ladder bars around a long horizon line, the
 * flight-path marker, heading + nav readouts, and a target designator that
 * walks from A-A BVR to A-G as the strike beat arrives.
 *
 * Amber stays the site's global HUD through-line; this green lived only in
 * the L-159 — it appears only in the L-159 moments, for authenticity.
 */

import { clamp01, lerp, rgba } from '../../toolkit'

export const HUD_GREEN = '#5dff6d'

export type CockpitHudOptions = {
  w: number
  h: number
  alpha: number
  /** 0 = air-to-air BVR mode → 1 = air-to-ground strike mode. */
  attack: number
  /** Screen point the target designator sits on. */
  target: { x: number; y: number }
  /** A second bracketed contact (his wingman) — same designator frame, no
   *  range readout. */
  target2?: { x: number; y: number }
  rangeNm: number
  mach: number
  altFt: number
  hdg: number
}

export function drawCockpitHud(ctx: CanvasRenderingContext2D, o: CockpitHudOptions): void {
  if (o.alpha <= 0.01) return
  const s = Math.min(o.w, o.h) / 800
  const cx = o.w / 2
  const cy = o.h * 0.46
  const a = o.alpha

  ctx.save()
  ctx.strokeStyle = rgba(HUD_GREEN, a * 0.85)
  ctx.fillStyle = rgba(HUD_GREEN, a * 0.85)
  ctx.lineWidth = Math.max(1, 1.1 * s)
  ctx.shadowColor = rgba(HUD_GREEN, 0.5)
  ctx.shadowBlur = 5 * s
  const font = (px: number) => `${Math.max(9, Math.round(px * s))}px "Chakra Petch", ui-monospace, Consolas, monospace`
  ctx.font = font(13)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const boxed = (label: string, x: number, y: number) => {
    ctx.strokeRect(x - 34 * s, y - 11 * s, 68 * s, 22 * s)
    ctx.fillText(label, x, y + 1 * s)
  }

  // --- Top row: FMS / MACH / ALT --------------------------------------------
  const topY = cy - 170 * s
  boxed('FMS', cx - 200 * s, topY)
  boxed('MACH', cx, topY)
  boxed('ALT', cx + 200 * s, topY)
  ctx.font = font(11)
  ctx.fillText('AP1', cx - 200 * s, topY + 24 * s)
  ctx.fillText('AT1', cx - 200 * s, topY + 38 * s)
  ctx.fillText(o.altFt.toFixed(0), cx + 200 * s, topY + 26 * s)

  // Mach tape: ticks around the current value, caret at the centre.
  const tapeY = topY + 30 * s
  ctx.beginPath()
  for (let i = -3; i <= 3; i++) {
    const x = cx + i * 34 * s
    ctx.moveTo(x, tapeY - 4 * s)
    ctx.lineTo(x, tapeY + 4 * s)
  }
  ctx.moveTo(cx - 110 * s, tapeY)
  ctx.lineTo(cx + 110 * s, tapeY)
  ctx.stroke()
  for (let i = -2; i <= 2; i += 2) {
    ctx.fillText((o.mach + i * 0.05).toFixed(2).slice(1), cx + i * 34 * s, tapeY + 14 * s)
  }
  ctx.beginPath()
  ctx.moveTo(cx, tapeY - 12 * s)
  ctx.lineTo(cx - 5 * s, tapeY - 20 * s)
  ctx.lineTo(cx + 5 * s, tapeY - 20 * s)
  ctx.closePath()
  ctx.stroke()

  // --- Left column: speed box + heading -------------------------------------
  ctx.font = font(13)
  ctx.strokeRect(cx - 268 * s, cy - 40 * s, 56 * s, 24 * s)
  ctx.fillText((o.mach * 661).toFixed(0), cx - 240 * s, cy - 27 * s)
  ctx.fillText(`HDG ${o.hdg.toFixed(0)}`, cx - 240 * s, cy + 30 * s)

  // --- Right column: nav block ----------------------------------------------
  ctx.textAlign = 'left'
  ctx.font = font(12)
  ctx.fillText('FMS1', cx + 226 * s, cy - 34 * s)
  ctx.fillText(`${o.rangeNm.toFixed(1)} NM`, cx + 226 * s, cy - 18 * s)
  ctx.fillText('DTRK 138', cx + 226 * s, cy - 2 * s)
  ctx.textAlign = 'center'

  // --- Pitch ladder + the long horizon line ---------------------------------
  const horizonLineY = cy + 42 * s
  ctx.beginPath()
  ctx.moveTo(cx - 320 * s, horizonLineY)
  ctx.lineTo(cx - 30 * s, horizonLineY)
  ctx.moveTo(cx + 30 * s, horizonLineY)
  ctx.lineTo(cx + 320 * s, horizonLineY)
  ctx.stroke()
  // +5° bar above, -5° dashed bar below (as in the photo).
  const ladder = (y: number, dashed: boolean, label: string) => {
    ctx.save()
    if (dashed) ctx.setLineDash([10 * s, 7 * s])
    ctx.beginPath()
    ctx.moveTo(cx - 96 * s, y)
    ctx.lineTo(cx - 26 * s, y)
    ctx.moveTo(cx + 26 * s, y)
    ctx.lineTo(cx + 96 * s, y)
    ctx.stroke()
    ctx.restore()
    ctx.font = font(11)
    ctx.fillText(label, cx - 110 * s, y)
    ctx.fillText(label, cx + 110 * s, y)
  }
  ladder(cy - 38 * s, false, '5')
  ladder(cy + 122 * s, true, '5')

  // --- Flight-path marker (circle + wings + fin), just above the horizon ----
  const fpmY = cy + 18 * s
  ctx.beginPath()
  ctx.arc(cx, fpmY, 8 * s, 0, Math.PI * 2)
  ctx.moveTo(cx - 8 * s, fpmY)
  ctx.lineTo(cx - 24 * s, fpmY)
  ctx.moveTo(cx + 8 * s, fpmY)
  ctx.lineTo(cx + 24 * s, fpmY)
  ctx.moveTo(cx, fpmY - 8 * s)
  ctx.lineTo(cx, fpmY - 18 * s)
  ctx.stroke()

  // Centre vertical reference below (as in the photo's lower stem).
  ctx.beginPath()
  ctx.moveTo(cx, cy + 74 * s)
  ctx.lineTo(cx, cy + 150 * s)
  ctx.stroke()

  // --- Target designators + weapon readout ------------------------------------
  const td = 11 * s
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
  const modeX = cx - 320 * s
  const modeY = cy + 108 * s
  const atk = clamp01(o.attack)
  if (atk < 0.5) {
    ctx.globalAlpha = a * lerp(1, 0.2, atk * 2)
    ctx.fillText('A-A  BVR', modeX, modeY)
    ctx.fillText('AIM-9M  RDY', modeX, modeY + 16 * s)
  } else {
    ctx.globalAlpha = a * lerp(0.2, 1, (atk - 0.5) * 2)
    ctx.fillText('A-G  CCIP', modeX, modeY)
    ctx.fillText('GUN  250', modeX, modeY + 16 * s)
  }
  ctx.restore()
}
