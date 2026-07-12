/**
 * CONTRAILS — two airliners drawing condensation trails high in the distance,
 * a quiet framing detail for the story's first and last daylight scenes
 * (origin dawn ↔ sunset landing). Deliberately small: specks and lines, never
 * a subject.
 *
 * Real behaviour, scaled down: the trail starts a breath BEHIND the aircraft
 * (the exhaust needs a moment to condense), stays sharp and bright while
 * young, then widens, wanders and breaks up as it ages; high trails catch
 * sunlight long after (or before) the ground does — at dusk they burn warm
 * against a darkening sky, at dawn they light up pink before sunrise.
 *
 * Ambient-only motion (`time`): the planes crawl across the sky and the story
 * scroll never drives them. With time frozen (reduced motion) each plane
 * parks mid-crossing with its full trail — a complete, static picture.
 */

import { hash1, mixHex, rgba } from '../../toolkit'

export type ContrailPlane = {
  /** Distinct seed — offsets the cycle and the trail's turbulence. */
  seed: number
  /** Trail head altitude as it crosses, fraction of h (top = 0). */
  y: number
  /** Screen slope of the crossing, fraction of h over the full width —
   *  distant tracks rarely read dead-level. */
  slope: number
  /** Crossing direction. */
  dir: 1 | -1
  /** Seconds per full crossing — airliners CRAWL at this distance. */
  period: number
  /** Size multiplier (depth): 1 = the nearer lane. */
  scale: number
  /** Receding track: the plane shrinks toward this ×scale by the END of the
   *  crossing — climbing away from the viewer into the distance. Segments
   *  keep the size they were LAID at, so the old trail stays fatter than
   *  the far-away head. Omit for a constant-distance lane. */
  shrink?: number
}

export type ContrailLook = {
  /** Trail colour at the head (young, dense) and the tail (old, thin). */
  head: string
  tail: string
  /** Peak segment alpha (the head), before ageing. */
  alpha: number
  /** Sunlight wash: segments mix toward `lit` by `litAmount`, optionally
   *  weighted by proximity to a sun at (litX, litY) in px (spread in px). */
  lit?: { color: string; amount: number; x?: number; y?: number; spread?: number }
  /** The aircraft speck. */
  speck: string
  speckAlpha: number
}

/** Trail length as a fraction of the crossing width. */
const TRAIL_FRAC = 0.46
/** Stations along the trail — dense enough that the butt-capped strokes
 *  chain into one continuous line (round caps double-blend at every joint
 *  and read as beads — Martin's catch). */
const SEGS = 56

/**
 * Paint one scene's airliners. Pure painter: everything derives from
 * (time, planes, look); scenes own palette + gating (daylight, dusk cooling).
 */
export function drawContrails(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
  alpha: number,
  look: ContrailLook,
  planes: readonly ContrailPlane[],
): void {
  if (alpha <= 0.005) return
  const unit = Math.min(w, h)
  ctx.save()
  ctx.lineCap = 'butt' // round caps overlap at joints → beads; butt chains clean
  for (const p of planes) {
    // One crossing cycle spans entry off one edge to the TAIL clearing the
    // other; the phase parks each plane mid-sky at time 0 (reduced motion).
    const span = 1.18 + TRAIL_FRAC
    const phase = 0.34 + hash1(p.seed) * 0.3
    const cycles = time / p.period + phase
    const cyc = cycles - Math.floor(cycles)
    const cycIdx = Math.floor(cycles) // re-seeds the turbulence each pass
    const headP = cyc * span - TRAIL_FRAC // head runs −TRAIL.. 1.18
    const headX = (p.dir === 1 ? headP : 1 - headP) * w
    const headY = (p.y + p.slope * headP) * h
    const wBase = Math.max(0.7, unit * 0.0011) * p.scale
    /** Depth along the crossing: a receding lane shrinks toward `shrink`
     *  by the far end; every trail segment keeps the size it was LAID at. */
    const depthAt = (s: number): number =>
      p.shrink === undefined ? 1 : 1 + (p.shrink - 1) * Math.min(Math.max(s, 0), 1)

    // The trail lives on a FIXED station grid in crossing space: every point
    // of sky keeps its own wobble and dissolution (smooth value noise keyed
    // by the absolute station index), and only its AGE grows as the plane
    // pulls away — the trail waves and dissolves IN PLACE, never dragging
    // its pattern along behind the aircraft.
    const DS = TRAIL_FRAC / SEGS
    const noise = (u: number, salt: number): number => {
      const i = Math.floor(u)
      const f = u - i
      const sm = f * f * (3 - 2 * f)
      const a = hash1(p.seed * salt + cycIdx * 31 + i * 2.63)
      const b = hash1(p.seed * salt + cycIdx * 31 + (i + 1) * 2.63)
      return a + (b - a) * sm
    }
    const stationAt = (s: number): [number, number, number] => {
      const laidAt = depthAt(s)
      const age = Math.min(Math.max((headP - s) / TRAIL_FRAC, 0), 1)
      const wob =
        (noise((s / DS) * 0.32, 7.3) - 0.5) * h * 0.017 * laidAt * Math.pow(age, 1.4) +
        h * 0.005 * laidAt * age * age // slight settle
      return [(p.dir === 1 ? s : 1 - s) * w, (p.y + p.slope * s) * h + wob, laidAt]
    }
    const sGap = headP - 0.018 * TRAIL_FRAC // condensation gap behind the jet
    const jStart = Math.ceil((headP - TRAIL_FRAC) / DS)
    const jEnd = Math.floor(sGap / DS)
    let px = 0
    let py = 0
    let started = false
    // One extra iteration past the last full station = the PARTIAL head
    // segment up to the exact gap point, so the line GROWS continuously
    // instead of popping a whole station at a time (Martin's catch).
    for (let j = jStart; j <= jEnd + 1; j++) {
      const s = Math.min(j * DS, sGap)
      const [bx, by, laidAt] = stationAt(s)
      if (bx < -w * 0.05 || bx > w * 1.05) {
        started = false
        continue
      }
      if (!started) {
        px = bx
        py = by
        started = true
        continue
      }
      const age = Math.min(Math.max((headP - s) / TRAIL_FRAC, 0), 1)
      // Dissolution anchored in space: patches with high noise thin out
      // first as they age — the old trail melts away gradually, no hard
      // dashes.
      const thin = 1 - noise((s / DS) * 0.2 + 57, 11.7) * Math.pow(age, 1.2) * 1.35
      const fade = Math.pow(1 - age, 1.28) * Math.min(Math.max(thin, 0), 1)
      if (fade > 0.015) {
        let col = mixHex(look.tail, look.head, Math.pow(1 - age, 1.28))
        if (look.lit) {
          let prox = 1
          if (look.lit.x !== undefined && look.lit.y !== undefined) {
            const spread = look.lit.spread ?? w * 0.3
            const dx = (bx - look.lit.x) / spread
            const dy = (by - look.lit.y) / (spread * 0.7)
            prox = Math.exp(-(dx * dx + dy * dy))
          }
          col = mixHex(col, look.lit.color, look.lit.amount * prox)
        }
        ctx.strokeStyle = rgba(col, look.alpha * fade * alpha)
        ctx.lineWidth = wBase * laidAt * (0.85 + 3.4 * Math.pow(age, 1.15))
        ctx.beginPath()
        ctx.moveTo(px, py)
        ctx.lineTo(bx, by)
        ctx.stroke()
      }
      px = bx
      py = by
    }

    // The aircraft itself: a bare speck — no halo (a glow read as a glowing
    // ring around the plane, Martin's catch), shrinking down a receding lane.
    if (headX > -w * 0.02 && headX < w * 1.02) {
      const d = depthAt(headP)
      const r = Math.max(0.8, unit * 0.0014 * d) * p.scale
      ctx.fillStyle = rgba(look.speck, look.speckAlpha * alpha * (0.55 + 0.45 * d))
      ctx.fillRect(headX - r, headY - r * 0.55, r * 2, r * 1.1)
    }
  }
  ctx.restore()
}
