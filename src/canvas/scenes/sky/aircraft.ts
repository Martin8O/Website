/**
 * Aircraft for the SKY family — real silhouettes traced from Martin's
 * reference pack (`local/ode mne/siluety/`, see `silhouettes.ts`), plus the
 * procedural life a still trace can't carry: prop/rotor blur, canopy glints,
 * retractable gear, and the L-159 roll-animation frames.
 *
 *  - ultralight — the Merlin PSA (his first wings): strutted high wing over a
 *    pod; wing + pod are separate traced rings, the struts + gear + prop are
 *    painted on.
 *  - z142     — Zlín Z-142 side profile (box-art trace): greenhouse hump,
 *    fixed gear, spine antenna; prop disc painted on.
 *  - l39      — L-39 Albatros (3-view trace), jet trainer of the CTU→Brno era.
 *  - l159     — L-159 ALCA (3-view trace), centreline tank.
 *  - l159rear — the L-159 seen from dead astern (model photo, symmetrized) —
 *    the B2.3 landing beat; procedural gear + flaps (photos lack them).
 *  - mi17     — Mi-17 transport (ready silhouette), rotor blur added.
 *  - gripen   — JAS-39 planform for the COMAO package (replaces the darts).
 *  - f16 / c17 / apache — Bagram guests (B2.3 desert redesign).
 *
 * All silhouettes: nose at +x, y down, x-extent ≈ 1, centred on the origin;
 * `drawAircraft` owns the transform. Trails/ribbons live here too.
 */

import { TAU, rgba } from '../../toolkit'
import { L159P_GLASS, L159P_SEATS, L159_ROLL, SILHOUETTES, type SilhouetteKey, type SilhouetteRings } from './silhouettes'
import { rollFrame } from './skyMath'

export type CraftKind = SilhouetteKey

export type AircraftOptions = {
  x: number
  y: number
  /** Overall length in px (for `l159rear`: the wingspan). */
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

/** Trace every ring of a silhouette into the current path. */
function traceRings(ctx: CanvasRenderingContext2D, rings: SilhouetteRings): void {
  for (const ring of rings) {
    ctx.moveTo(ring[0], ring[1])
    for (let i = 2; i < ring.length; i += 2) ctx.lineTo(ring[i], ring[i + 1])
    ctx.closePath()
  }
}

/** Fill a traced silhouette; 'evenodd' keeps windows (canopy, strut gaps) open. */
function fillSilhouette(ctx: CanvasRenderingContext2D, rings: SilhouetteRings): void {
  ctx.beginPath()
  traceRings(ctx, rings)
  ctx.fill('evenodd')
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

/** Prop blur disc, spinning with ambient time (frozen upright when time = 0). */
function propBlur(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number): void {
  ctx.save()
  ctx.globalAlpha *= 0.3
  fillEllipse(ctx, x, y, r * 0.12, r, Math.sin(time * 24) * 0.05)
  ctx.restore()
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

function canopyGlint(ctx: CanvasRenderingContext2D, o: AircraftOptions, x0: number, y0: number, x1: number, y1: number): void {
  if (!o.glint) return
  ctx.save()
  ctx.strokeStyle = rgba(o.glint, 0.6)
  strokeLine(ctx, x0, y0, x1, y1, 0.013)
  ctx.restore()
}

/** The ultralight's rings are authored, not traced: ring 0 = fuselage,
 *  ring 1 = cabin window (hole), ring 2 = wing slab (overlaps the roof, so it
 *  is filled as its own path — evenodd would punch a hole at the overlap). */
function paintUltralight(ctx: CanvasRenderingContext2D, o: AircraftOptions, time: number): void {
  const [fuselage, window_, wing] = SILHOUETTES.ultralight
  // Glass behind the cabin window hole.
  if (o.glint) {
    ctx.save()
    ctx.fillStyle = rgba(o.glint, 0.5)
    ctx.beginPath()
    traceRings(ctx, [window_])
    ctx.fill()
    ctx.restore()
  }
  ctx.beginPath()
  traceRings(ctx, [fuselage, window_])
  ctx.fill('evenodd')
  ctx.beginPath()
  traceRings(ctx, [wing])
  ctx.fill()
  // Wing strut, fixed tricycle gear, prop disc.
  strokeLine(ctx, 0.24, 0.098, 0.02, -0.058, 0.013)
  strokeLine(ctx, 0.31, 0.1, 0.33, 0.185, 0.011)
  strokeLine(ctx, 0.03, 0.1, 0.005, 0.19, 0.011)
  fillEllipse(ctx, 0.335, 0.205, 0.026, 0.026)
  fillEllipse(ctx, 0.0, 0.212, 0.03, 0.03)
  propBlur(ctx, 0.505, 0.045, 0.095, time)
}

/** The traced canopy set (glass panes + seats) laid over a jet's spine.
 *  `fitted` = donor mode (L-39 / clean L-159): the seats are clipped to the
 *  glass panes — a seat sliver pokes past the windscreen and would read as a
 *  dark speck against the sky (Martin caught it on the airshow jet). The
 *  L-159P host keeps the raw trace: there the body sits behind every sliver. */
function l159Canopy(ctx: CanvasRenderingContext2D, o: AircraftOptions, dx = 0, dy = 0, fitted = false): void {
  ctx.save()
  ctx.translate(dx, dy)
  ctx.fillStyle = rgba(o.glint ?? '#d7ecff', 0.55)
  ctx.beginPath()
  traceRings(ctx, L159P_GLASS)
  ctx.fill()
  if (fitted) {
    ctx.beginPath()
    traceRings(ctx, L159P_GLASS)
    ctx.clip()
  }
  ctx.fillStyle = o.color
  ctx.beginPath()
  traceRings(ctx, L159P_SEATS)
  ctx.fill()
  ctx.restore()
}

/** The donor canopy's aft edge is a vertical cut — on the L-159 render a
 *  tall fairing continues its line, but the L-39 / clean L-159 traces run a
 *  low flat spine there, so the glass would end in a bare step against the
 *  sky (Martin's "schod"). This body-colour turtledeck sweeps the rear top
 *  corner of the glass smoothly down onto the spine, the way the real
 *  aircraft fair their cockpits into the back. */
function turtledeck(ctx: CanvasRenderingContext2D, topX: number, topY: number, spineY: number, aftX: number): void {
  ctx.beginPath()
  ctx.moveTo(topX, topY)
  ctx.quadraticCurveTo(topX - (topX - aftX) * 0.55, topY + (spineY - topY) * 0.25, aftX, spineY)
  ctx.lineTo(topX, spineY + 0.02)
  ctx.closePath()
  ctx.fill()
}

/** The stores L-159 (studio-render trace): solid body + the real cockpit. */
function paintL159P(ctx: CanvasRenderingContext2D, o: AircraftOptions): void {
  fillSilhouette(ctx, SILHOUETTES.l159p)
  l159Canopy(ctx, o)
}

function paintZ142(ctx: CanvasRenderingContext2D, o: AircraftOptions, time: number): void {
  fillSilhouette(ctx, SILHOUETTES.z142)
  canopyGlint(ctx, o, 0.14, -0.045, 0.03, -0.058)
  propBlur(ctx, 0.5, 0.01, 0.15, time)
}

function paintMi17(ctx: CanvasRenderingContext2D, o: AircraftOptions, time: number): void {
  fillSilhouette(ctx, SILHOUETTES.mi17)
  // The rotor is fully procedural (the trace keeps only mast + hub): one
  // static full-span blade pair — real Mi-17 proportions, rear tip almost at
  // the tail rotor, front overhanging the nose — plus blur lens + spin.
  const hubX = 0.226
  const hubY = -0.108
  const R = 0.58
  strokeLine(ctx, hubX - R, hubY + 0.008, hubX + R, hubY - 0.004, 0.011)
  ctx.save()
  ctx.globalAlpha *= 0.25
  fillEllipse(ctx, hubX, hubY, R, 0.011)
  ctx.restore()
  const spin = time * 21
  const bx = Math.cos(spin) * (R * 0.96)
  const by = Math.sin(spin) * 0.012
  ctx.save()
  ctx.globalAlpha *= 0.45
  strokeLine(ctx, hubX - bx, hubY - by, hubX + bx, hubY + by, 0.01)
  ctx.restore()
  canopyGlint(ctx, o, 0.42, -0.05, 0.35, -0.085)
}

function paintApache(ctx: CanvasRenderingContext2D, o: AircraftOptions, time: number): void {
  fillSilhouette(ctx, SILHOUETTES.apache)
  ctx.save()
  ctx.globalAlpha *= 0.25
  fillEllipse(ctx, 0.0, -0.14, 0.48, 0.011)
  ctx.restore()
  const spin = time * 23
  const bx = Math.cos(spin) * 0.45
  const by = Math.sin(spin) * 0.013
  ctx.save()
  ctx.globalAlpha *= 0.55
  strokeLine(ctx, -bx, -0.14 - by, bx, -0.14 + by, 0.01)
  ctx.restore()
}

/** Rear-view L-159 gear + flaps for the landing beat (the reference photos fly
 *  clean — B2.2 adds these by hand, B2.3 choreographs them). */
function rearGearAndFlaps(ctx: CanvasRenderingContext2D, extension: number): void {
  if (extension <= 0.01) return
  const drop = 0.17 * extension
  // Nose strut on the centreline, mains under the wing roots.
  strokeLine(ctx, 0, 0.09, 0, 0.09 + drop * 0.85, 0.016)
  fillEllipse(ctx, 0, 0.09 + drop * 0.85 + 0.02, 0.022, 0.022)
  for (const s of [-1, 1] as const) {
    strokeLine(ctx, s * 0.12, 0.06, s * 0.15, 0.06 + drop, 0.018)
    fillEllipse(ctx, s * 0.15, 0.06 + drop + 0.02, 0.026, 0.026)
  }
  // Flaps dropped along the inner trailing edge.
  ctx.save()
  ctx.globalAlpha *= 0.9
  for (const s of [-1, 1] as const) {
    ctx.beginPath()
    ctx.moveTo(s * 0.07, 0.02)
    ctx.lineTo(s * 0.28, 0.015)
    ctx.lineTo(s * 0.28, 0.015 + 0.05 * extension)
    ctx.lineTo(s * 0.07, 0.03 + 0.06 * extension)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** The aircraft-local transform: position, mirroring, size, visual pitch. */
function craftTransform(ctx: CanvasRenderingContext2D, o: AircraftOptions): void {
  ctx.translate(o.x, o.y)
  ctx.scale((o.dir ?? 1) * o.size, o.size)
  ctx.rotate(-(o.tilt ?? 0))
}

/** Paint one craft in aircraft-local space (opaque parts at full strength —
 *  the caller owns the overall alpha, see `drawAircraft`). */
function paintCraft(ctx: CanvasRenderingContext2D, kind: CraftKind, o: AircraftOptions, time: number): void {
  ctx.fillStyle = o.color
  ctx.strokeStyle = o.color
  ctx.lineCap = 'round'
  switch (kind) {
    case 'ultralight':
      paintUltralight(ctx, o, time)
      break
    case 'z142':
      paintZ142(ctx, o, time)
      break
    case 'l39':
      fillSilhouette(ctx, SILHOUETTES.l39)
      turtledeck(ctx, 0.085, -0.017, 0.014, -0.05)
      jetGear(ctx, o.gear ?? 0)
      l159Canopy(ctx, o, 0.01, 0.013, true)
      break
    case 'l159':
      fillSilhouette(ctx, SILHOUETTES.l159)
      turtledeck(ctx, 0.08, -0.019, 0.009, -0.06)
      jetGear(ctx, o.gear ?? 0)
      l159Canopy(ctx, o, 0.005, 0.011, true)
      break
    case 'l159p':
      paintL159P(ctx, o)
      jetGear(ctx, o.gear ?? 0)
      break
    case 'l159rear':
      fillSilhouette(ctx, SILHOUETTES.l159rear)
      rearGearAndFlaps(ctx, o.gear ?? 0)
      break
    case 'mi17':
      paintMi17(ctx, o, time)
      break
    case 'apache':
      paintApache(ctx, o, time)
      break
    default:
      // gripen / f16 / c17 — the traced silhouette carries the whole shape.
      fillSilhouette(ctx, SILHOUETTES[kind])
      break
  }
}

/** Kinds whose paint LAYERS parts over the body (glass + seats, rotor blur,
 *  the ultralight's separate wing). Faded, those layers would accumulate and
 *  read darker where they overlap (Martin caught the dark-seat dissolve), so
 *  a fading layered craft is painted opaque on a scratch canvas and stamped
 *  down once with the craft's alpha: the cockpit is there from the very first
 *  translucent frame and the whole aircraft dissolves as one image. */
const LAYERED: ReadonlySet<CraftKind> = new Set([
  'ultralight', 'z142', 'l39', 'l159', 'l159p', 'l159rear', 'mi17', 'apache',
])
let scratch: HTMLCanvasElement | null = null

export function drawAircraft(ctx: CanvasRenderingContext2D, kind: CraftKind, o: AircraftOptions): void {
  if (o.alpha <= 0.004 || o.size <= 1.5) return
  const time = o.time ?? 0
  if (o.alpha < 0.99 && LAYERED.has(kind)) {
    if (!scratch) scratch = document.createElement('canvas')
    const cw = ctx.canvas.width
    const ch = ctx.canvas.height
    if (scratch.width !== cw || scratch.height !== ch) {
      scratch.width = cw
      scratch.height = ch
    }
    const sc = scratch.getContext('2d')
    if (sc) {
      // Device-space bounds of the craft (rotor tips reach ~0.81 × size from
      // the origin — 1.1 covers every kind plus line width).
      const m = ctx.getTransform()
      const r = Math.hypot(m.a, m.b) * o.size * 1.1
      const dcx = m.a * o.x + m.c * o.y + m.e
      const dcy = m.b * o.x + m.d * o.y + m.f
      const x0 = Math.max(0, Math.floor(dcx - r))
      const y0 = Math.max(0, Math.floor(dcy - r))
      const bw = Math.min(cw, Math.ceil(dcx + r)) - x0
      const bh = Math.min(ch, Math.ceil(dcy + r)) - y0
      if (bw <= 0 || bh <= 0) return
      sc.setTransform(1, 0, 0, 1, 0, 0)
      sc.clearRect(x0, y0, bw, bh)
      sc.globalAlpha = 1
      sc.setTransform(m)
      sc.save()
      craftTransform(sc, o)
      paintCraft(sc, kind, o, time)
      sc.restore()
      ctx.save()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = o.alpha
      ctx.drawImage(scratch, x0, y0, bw, bh, x0, y0, bw, bh)
      ctx.restore()
      return
    }
  }
  ctx.save()
  craftTransform(ctx, o)
  ctx.globalAlpha = o.alpha
  paintCraft(ctx, kind, o, time)
  ctx.restore()
}

/** The L-159 mid-roll: picks the traced bank frame for a continuous roll
 *  angle (see `rollFrame` — banks past 90° render as y-flips), then applies
 *  the usual aircraft transform. Drives the helix ballet; frame 0 (level) is
 *  the clean render trace, so it gets the full glass-and-seats cockpit. */
export function drawAircraftRoll(ctx: CanvasRenderingContext2D, bank: number, o: AircraftOptions): void {
  if (o.alpha <= 0.004 || o.size <= 1.5) return
  const pose = rollFrame(bank)
  ctx.save()
  ctx.translate(o.x, o.y)
  ctx.scale((o.dir ?? 1) * o.size, (pose.flipY ? -1 : 1) * o.size)
  ctx.rotate(-(o.tilt ?? 0))
  ctx.globalAlpha = o.alpha
  ctx.fillStyle = o.color
  ctx.strokeStyle = o.color
  if (pose.frame === 0) {
    paintL159P(ctx, o)
  } else {
    fillSilhouette(ctx, L159_ROLL[pose.frame])
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
