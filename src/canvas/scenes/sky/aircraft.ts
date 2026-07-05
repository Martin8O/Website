/**
 * Aircraft silhouettes for the SKY family — hand-tuned side profiles, each
 * unmistakably its subject (the perfectionism bar):
 *  - ultralight — big strutted high wing over a tiny pod, open tail boom, prop
 *  - z142       — low-wing piston trainer: prop disc, greenhouse canopy hump,
 *                 fixed tricycle gear
 *  - l39        — jet trainer: long tandem bubble canopy, swept fin, and the
 *                 signature WINGTIP FUEL TANK
 *  - l159       — single-seat ALCA: sharper radar nose, taller fin, missiles
 *                 on the wingtip rail + centre pylon (no tip tank)
 *  - heli       — transport helicopter: boxy cabin, engine hump, tail boom,
 *                 main-rotor blur disc
 *  - dart       — a generic swept jet in plan view, for distant formations
 *
 * All are drawn in local coords: nose at +x, y down, overall length ≈ 1,
 * centred on the origin; `drawAircraft` owns the transform. Trails/ribbons
 * (contrails, display smoke) live here too — they belong to the aircraft.
 */

import { TAU, rgba } from '../../toolkit'
import type { Craft } from './skyMath'

export type CraftKind = Craft | 'heli' | 'dart'

export type AircraftOptions = {
  x: number
  y: number
  /** Overall length in px. */
  size: number
  /** Nose-up tilt in radians — visual pitch, independent of `dir`. For full
   *  aerobatic rotation (loops), pass the whole screen angle negated here. */
  tilt?: number
  /** 1 = flying right, -1 = flying left (mirrored). */
  dir?: 1 | -1
  color: string
  /** Canopy-glass glint colour. */
  glint?: string
  alpha: number
  /** Ambient seconds — prop/rotor blur only; 0 freezes them mid-turn. */
  time?: number
  /** Landing-gear extension 0..1 (jets only; the Z-142's gear is fixed). */
  gear?: number
}

type Pt = readonly [number, number]

function fillPoly(ctx: CanvasRenderingContext2D, pts: readonly Pt[]): void {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.closePath()
  ctx.fill()
}

function strokeLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, width: number): void {
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
}

function fillEllipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU)
  ctx.fill()
}

/** Retractable tricycle gear for the jets: nose strut + main strut, wheels. */
function jetGear(ctx: CanvasRenderingContext2D, extension: number): void {
  if (extension <= 0.01) return
  const drop = 0.075 * extension
  strokeLine(ctx, 0.24, 0.05, 0.23, 0.05 + drop, 0.013)
  strokeLine(ctx, -0.04, 0.055, -0.05, 0.055 + drop, 0.014)
  fillEllipse(ctx, 0.23, 0.05 + drop + 0.014, 0.019, 0.019)
  fillEllipse(ctx, -0.05, 0.055 + drop + 0.016, 0.023, 0.023)
}

/** A slender missile with a nose cone and tail fins, centred on (x, y). */
function missile(ctx: CanvasRenderingContext2D, x: number, y: number, len: number): void {
  const r = len * 0.07
  fillPoly(ctx, [
    [x + len * 0.5, y],
    [x + len * 0.32, y - r],
    [x - len * 0.42, y - r],
    [x - len * 0.5, y - r * 2.4],
    [x - len * 0.5, y + r * 2.4],
    [x - len * 0.42, y + r],
    [x + len * 0.32, y + r],
  ])
}

function paintUltralight(ctx: CanvasRenderingContext2D, time: number): void {
  // Tail boom + tail first, so the pod overlaps the joint.
  strokeLine(ctx, -0.02, 0, -0.46, -0.03, 0.018)
  fillPoly(ctx, [[-0.42, -0.02], [-0.5, -0.11], [-0.53, -0.02]])
  fillPoly(ctx, [[-0.38, -0.035], [-0.55, -0.028], [-0.55, -0.016], [-0.38, -0.022]])
  // The big high wing + struts down to the pod.
  fillPoly(ctx, [[0.3, -0.145], [-0.24, -0.135], [-0.26, -0.112], [0.32, -0.122]])
  strokeLine(ctx, 0.16, 0.02, 0.08, -0.115, 0.014)
  strokeLine(ctx, -0.02, 0.02, -0.1, -0.112, 0.014)
  // Tiny pod fuselage with an open windscreen curve.
  fillPoly(ctx, [
    [0.27, -0.005], [0.23, -0.05], [0.1, -0.066], [-0.02, -0.05],
    [-0.07, -0.008], [-0.02, 0.038], [0.16, 0.045], [0.25, 0.024],
  ])
  // Fixed gear + prop disc at the nose.
  strokeLine(ctx, 0.14, 0.04, 0.12, 0.09, 0.012)
  strokeLine(ctx, 0.0, 0.04, -0.01, 0.09, 0.012)
  fillEllipse(ctx, 0.12, 0.1, 0.02, 0.02)
  fillEllipse(ctx, -0.01, 0.1, 0.02, 0.02)
  ctx.save()
  ctx.globalAlpha *= 0.3
  fillEllipse(ctx, 0.285, -0.02, 0.012, 0.1, Math.sin(time * 24) * 0.05)
  ctx.restore()
}

function paintZ142(ctx: CanvasRenderingContext2D, o: AircraftOptions, time: number): void {
  fillPoly(ctx, [
    [0.5, 0], [0.47, -0.032], [0.36, -0.046], // cowl
    [0.25, -0.05], [0.14, -0.088], [0.0, -0.088], [-0.08, -0.052], // greenhouse hump
    [-0.22, -0.036], [-0.33, -0.03], // rear deck
    [-0.44, -0.148], [-0.5, -0.135], [-0.5, -0.02], // rounded swept fin
    [-0.5, 0.006], [-0.4, 0.016], [-0.18, 0.036], [0.08, 0.05], [0.35, 0.046], [0.46, 0.026],
  ])
  fillPoly(ctx, [[-0.36, -0.03], [-0.53, -0.02], [-0.53, -0.008], [-0.36, -0.016]])
  // Low wing sliver.
  fillPoly(ctx, [[0.14, 0.044], [-0.04, 0.082], [-0.12, 0.086], [-0.02, 0.05]])
  // Fixed tricycle gear — the Z-142 flies with its wheels out.
  strokeLine(ctx, 0.3, 0.045, 0.28, 0.115, 0.013)
  strokeLine(ctx, 0.02, 0.05, -0.0, 0.12, 0.013)
  fillEllipse(ctx, 0.28, 0.13, 0.022, 0.022)
  fillEllipse(ctx, -0.0, 0.135, 0.025, 0.025)
  // Canopy glint.
  if (o.glint) {
    ctx.save()
    ctx.strokeStyle = rgba(o.glint, 0.55)
    strokeLine(ctx, 0.2, -0.052, 0.06, -0.078, 0.012)
    ctx.restore()
  }
  // Spinner + prop blur disc.
  fillPoly(ctx, [[0.5, -0.016], [0.55, -0.004], [0.55, 0.008], [0.5, 0.012]])
  ctx.save()
  ctx.globalAlpha *= 0.3
  fillEllipse(ctx, 0.55, -0.002, 0.014, 0.15, Math.sin(time * 24) * 0.05)
  ctx.restore()
}

function paintL39(ctx: CanvasRenderingContext2D, o: AircraftOptions): void {
  fillPoly(ctx, [
    [0.5, 0.008], [0.46, -0.016], [0.37, -0.03], // pointed nose
    [0.31, -0.06], [0.14, -0.073], [0.03, -0.054], // long tandem bubble canopy
    [-0.1, -0.044], [-0.26, -0.036], // spine
    [-0.4, -0.163], [-0.475, -0.157], [-0.465, -0.05], // swept fin
    [-0.5, -0.018], [-0.5, 0.006], // tail cone
    [-0.42, 0.02], [-0.18, 0.042], [0.05, 0.054], [0.3, 0.04], [0.44, 0.02],
  ])
  fillPoly(ctx, [[-0.35, -0.026], [-0.53, -0.014], [-0.53, -0.004], [-0.35, -0.012]])
  // Low wing sweeping toward the viewer…
  fillPoly(ctx, [[0.14, 0.046], [-0.1, 0.096], [-0.17, 0.1], [-0.04, 0.054]])
  // …ending in the signature wingtip fuel tank.
  fillEllipse(ctx, -0.135, 0.099, 0.075, 0.02)
  jetGear(ctx, o.gear ?? 0)
  if (o.glint) {
    ctx.save()
    ctx.strokeStyle = rgba(o.glint, 0.6)
    strokeLine(ctx, 0.29, -0.048, 0.08, -0.058, 0.013)
    ctx.restore()
  }
}

function paintL159(ctx: CanvasRenderingContext2D, o: AircraftOptions): void {
  fillPoly(ctx, [
    [0.53, 0.004], [0.47, -0.022], [0.37, -0.034], // sharp radar nose
    [0.3, -0.06], [0.19, -0.068], [0.1, -0.05], // short single-seat canopy
    [-0.05, -0.042], [-0.24, -0.036], // spine
    [-0.4, -0.176], [-0.49, -0.169], [-0.478, -0.05], // taller swept fin
    [-0.52, -0.018], [-0.52, 0.006],
    [-0.44, 0.02], [-0.16, 0.048], [0.1, 0.058], [0.34, 0.04], [0.46, 0.018],
  ])
  fillPoly(ctx, [[-0.36, -0.026], [-0.545, -0.014], [-0.545, -0.004], [-0.36, -0.012]])
  fillPoly(ctx, [[0.16, 0.05], [-0.08, 0.098], [-0.16, 0.102], [-0.03, 0.058]])
  // Armed: wingtip-rail missile + centre-pylon missile — no tip tank.
  missile(ctx, -0.115, 0.108, 0.15)
  missile(ctx, 0.04, 0.078, 0.13)
  jetGear(ctx, o.gear ?? 0)
  if (o.glint) {
    ctx.save()
    ctx.strokeStyle = rgba(o.glint, 0.6)
    strokeLine(ctx, 0.28, -0.05, 0.13, -0.058, 0.013)
    ctx.restore()
  }
}

function paintHeli(ctx: CanvasRenderingContext2D, o: AircraftOptions, time: number): void {
  fillPoly(ctx, [
    [0.34, 0.0], [0.3, -0.05], [0.18, -0.072], [0.0, -0.078], [-0.13, -0.058], // cabin
    [-0.17, -0.038], [-0.43, -0.046], // tail boom top
    [-0.48, -0.13], [-0.51, -0.122], [-0.47, -0.03], // upswept fin
    [-0.44, -0.012], [-0.16, 0.004],
    [-0.1, 0.048], [0.1, 0.056], [0.25, 0.042], [0.32, 0.018], // belly, rounded nose
  ])
  // Engine hump + rotor mast.
  fillPoly(ctx, [[0.1, -0.072], [0.03, -0.098], [-0.09, -0.094], [-0.14, -0.06]])
  strokeLine(ctx, -0.01, -0.095, -0.01, -0.132, 0.02)
  // Main rotor: blur lens + two frozen-or-spinning blade lines.
  ctx.save()
  ctx.globalAlpha *= 0.3
  fillEllipse(ctx, -0.01, -0.138, 0.55, 0.013)
  ctx.restore()
  const spin = time * 21
  const bx = Math.cos(spin) * 0.53
  const by = Math.sin(spin) * 0.016
  strokeLine(ctx, -0.01 - bx, -0.138 - by, -0.01 + bx, -0.138 + by, 0.01)
  // Tail rotor.
  ctx.save()
  ctx.globalAlpha *= 0.45
  fillEllipse(ctx, -0.5, -0.095, 0.012, 0.05)
  ctx.restore()
  // Glazed nose glint + wheels.
  if (o.glint) {
    ctx.save()
    ctx.strokeStyle = rgba(o.glint, 0.5)
    strokeLine(ctx, 0.3, -0.03, 0.24, -0.056, 0.014)
    ctx.restore()
  }
  fillEllipse(ctx, 0.2, 0.075, 0.018, 0.018)
  fillEllipse(ctx, -0.04, 0.08, 0.02, 0.02)
}

function paintDart(ctx: CanvasRenderingContext2D): void {
  fillPoly(ctx, [
    [0.5, 0], [-0.14, 0.3], [-0.2, 0.09], [-0.44, 0.15], [-0.5, 0.11],
    [-0.46, 0], [-0.5, -0.11], [-0.44, -0.15], [-0.2, -0.09], [-0.14, -0.3],
  ])
}

export function drawAircraft(ctx: CanvasRenderingContext2D, kind: CraftKind, o: AircraftOptions): void {
  if (o.alpha <= 0.004 || o.size <= 1.5) return
  const time = o.time ?? 0
  ctx.save()
  ctx.translate(o.x, o.y)
  ctx.scale((o.dir ?? 1) * o.size, o.size)
  ctx.rotate(-(o.tilt ?? 0))
  ctx.globalAlpha = o.alpha
  ctx.fillStyle = o.color
  ctx.strokeStyle = o.color
  ctx.lineCap = 'round'
  switch (kind) {
    case 'ultralight':
      paintUltralight(ctx, time)
      break
    case 'z142':
      paintZ142(ctx, o, time)
      break
    case 'l39':
      paintL39(ctx, o)
      break
    case 'l159':
      paintL159(ctx, o)
      break
    case 'heli':
      paintHeli(ctx, o, time)
      break
    case 'dart':
      paintDart(ctx)
      break
  }
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Trails — contrails and display smoke
// ---------------------------------------------------------------------------

/** A straight contrail: brightest at the head, dissolving toward the tail. */
export function drawTrail(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  tailX: number,
  tailY: number,
  width: number,
  color: string,
  alpha: number,
): void {
  if (alpha <= 0.004) return
  const g = ctx.createLinearGradient(tailX, tailY, headX, headY)
  g.addColorStop(0, rgba(color, 0))
  g.addColorStop(0.7, rgba(color, alpha * 0.6))
  g.addColorStop(1, rgba(color, alpha))
  ctx.save()
  ctx.strokeStyle = g
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(tailX, tailY)
  ctx.lineTo(headX, headY)
  ctx.stroke()
  ctx.restore()
}

/** A curved ribbon (loop trails, display smoke), points oldest→newest.
 *  Older smoke fades and — with `grow` — diffuses wider, like real smoke.
 *  Drawn as a few CONTINUOUS polyline buckets (alpha/width stepped between
 *  them), never per-segment: overlapping translucent caps would bead. */
export function drawRibbon(
  ctx: CanvasRenderingContext2D,
  pts: ReadonlyArray<Pt>,
  width: number,
  color: string,
  alpha: number,
  grow = 0,
): void {
  if (alpha <= 0.004 || pts.length < 2) return
  const buckets = Math.min(5, pts.length - 1)
  const n = pts.length - 1
  ctx.save()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let b = 0; b < buckets; b++) {
    const i0 = Math.floor((b / buckets) * n)
    const i1 = Math.min(Math.floor(((b + 1) / buckets) * n), n)
    if (i1 <= i0) continue
    const age = 1 - (b + 0.5) / buckets // 1 = oldest
    const a = alpha * Math.pow(1 - age, 0.85)
    if (a <= 0.004) continue
    ctx.strokeStyle = rgba(color, a)
    ctx.lineWidth = width * (1 + grow * age)
    ctx.beginPath()
    ctx.moveTo(pts[i0][0], pts[i0][1])
    for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(pts[i][0], pts[i][1])
    ctx.stroke()
  }
  ctx.restore()
}
