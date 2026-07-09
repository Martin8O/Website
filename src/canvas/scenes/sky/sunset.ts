/**
 * SKY / SUNSET — the end of service, the poetic close (facts §6b), B2.3d:
 * the landing seen FROM THE APPROACH AXIS. The observer stands on the
 * extended centreline just short of the Čáslav threshold, looking down the
 * runway (refs `caslav twr.jpg`, `caslav airbase.jpg`, `l-159 front
 * landing.jpg` — no town, just the base):
 *  - a gold→rose→violet evening sky, the shared section sun sinking on its
 *    slanted line right of the runway; thin dark stratus bars across it,
 *  - one-point perspective: the runway trapezoid with piano keys, centreline
 *    dashes, converging edge lights, the green threshold bar, red end lights,
 *    PAPI, the approach-light ladder underfoot with a running rabbit; the
 *    parallel taxiway (blue dusk lights) and the base — the Čáslav tower,
 *    hangar row, shelter humps — silhouetted to the right,
 *  - the WOW beat: the jet comes from BEHIND — its belly sweeps over the
 *    observer's head and the screen goes BLACK (the swap to the tail-on view
 *    hides at peak black, exactly like the climb's cloud-punch white-out),
 *    then the black lifts and the jet hangs huge ahead, gear down, shrinking
 *    and descending down the glidepath,
 *  - touchdown ON the threshold (a puff off each main wheel), the roll brakes
 *    to a stop at the runway's physical HALF (skyMath.landingPov — pure,
 *    unit-tested, C1 at the wheels),
 *  - the sun's last sliver goes just AFTER the stop; dusk cools, the first
 *    stars come out, the strobe blinks on the small distant jet: the hand-off
 *    to `calm` (healing) has already begun.
 */

import type { Renderer } from '../../types'
import {
  TAU,
  clamp01,
  drawGlow,
  drawStars,
  fillVerticalGradient,
  hash1,
  lerp,
  mixHex,
  rgba,
  smoothstep,
} from '../../toolkit'
import { L159_REAR_FIN_TIP, drawL159Belly, drawL159Rear } from './aircraft'
import { drawPuff } from './clouds'
import { LANDING, LANDING_S, landingDepth, landingPov, landingShake, sunArc } from './skyMath'

/** Dusk silhouette ink — buildings, far masses. */
const INK = '#151020'

/** Kutná Hora tiny on the LEFT horizon (ref `kutna hora silueta.jpg`, same
 *  reading as the airshow's B2.3b skyline): St. Barbara's three concave tent
 *  roofs (middle tallest) with needle finials, the Jesuit College tower with
 *  its onion dome, a low roofline around — grounded on the horizon, dusk-dark
 *  against the last light. */
function drawKutnaHora(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cx: number,
  horizonY: number,
  col: string,
  a: number,
): void {
  const base = horizonY + h * 0.0045
  ctx.save()
  ctx.fillStyle = rgba(col, a)
  ctx.beginPath()
  // Low roofline strips either side of the cathedral.
  for (const [x0, x1, seed] of [[-0.036, -0.013, 520], [0.024, 0.048, 560]] as const) {
    let x = cx + w * x0
    let i = 0
    while (x < cx + w * x1) {
      const bw = w * (0.003 + hash1(seed + i * 3.1) * 0.005)
      const bh = h * (0.004 + hash1(seed + i * 5.3) * 0.006)
      ctx.rect(x, base - bh, bw, bh)
      x += bw + w * (0.0012 + hash1(seed + i * 2.3) * 0.003)
      i++
    }
  }
  // The cathedral body, grounded.
  const bodyW = w * 0.019
  const bodyTop = horizonY - h * 0.0075
  ctx.rect(cx - bodyW / 2, bodyTop, bodyW, base - bodyTop)
  // Three concave tent roofs, middle tallest, each with a thin needle.
  for (const [s, tipDy] of [[-1, 0.0195], [0, 0.024], [1, 0.0195]] as const) {
    const rx = cx + s * bodyW * 0.34
    const tip = horizonY - h * tipDy
    const rw = bodyW * 0.24
    ctx.moveTo(rx - rw, bodyTop)
    ctx.quadraticCurveTo(rx - rw * 0.28, bodyTop - (bodyTop - tip) * 0.42, rx, tip)
    ctx.quadraticCurveTo(rx + rw * 0.28, bodyTop - (bodyTop - tip) * 0.42, rx + rw, bodyTop)
    ctx.closePath()
    ctx.moveTo(rx - w * 0.0005, tip + h * 0.001)
    ctx.lineTo(rx, tip - h * 0.005)
    ctx.lineTo(rx + w * 0.0005, tip + h * 0.001)
    ctx.closePath()
  }
  // The Jesuit College tower with its onion dome + the long low block.
  const jtx = cx + w * 0.0155
  const jTop = horizonY - h * 0.0045
  ctx.rect(jtx - w * 0.002, jTop, w * 0.004, base - jTop)
  ctx.moveTo(jtx - w * 0.0026, jTop)
  ctx.quadraticCurveTo(jtx - w * 0.003, jTop - h * 0.003, jtx, jTop - h * 0.006)
  ctx.quadraticCurveTo(jtx + w * 0.003, jTop - h * 0.003, jtx + w * 0.0026, jTop)
  ctx.closePath()
  ctx.moveTo(jtx - w * 0.0004, jTop - h * 0.006)
  ctx.lineTo(jtx, jTop - h * 0.0105)
  ctx.lineTo(jtx + w * 0.0004, jTop - h * 0.006)
  ctx.closePath()
  ctx.rect(jtx, base - h * 0.0065, w * 0.017, h * 0.0065)
  ctx.fill()
  ctx.restore()
}

export const renderSunset: Renderer = (ctx, alpha, t, time, cfg) => {
  const { w, h } = cfg
  const unit = Math.min(w, h)
  const horizonY = h * 0.71
  // Dusk deepens only once the roll has STOPPED — sun order per Martin:
  // sets during the landing, fully set after the stop, then the night.
  const cool = smoothstep(LANDING.stop - 0.03, 1, t)
  // Ground lights warm up as the sun sinks toward the horizon — and die
  // FAST once the healing lake starts settling over the airfield (B3a:
  // 72–74 % global; tRaw only passes 0.98 inside that hand-over), so the
  // runway never glares through the cross-fade.
  const handoff = 1 - smoothstep(0.98, 1.05, cfg.tRaw ?? t)
  const lightA = alpha * (0.45 + 0.55 * smoothstep(0.5, 0.9, t)) * handoff
  // Dark silhouettes CONDENSE while the airshow dissolves under us — never
  // a translucent black ghost floating over the cross-fade.
  const condense = alpha * alpha * alpha

  // --- Camera shake: the jet blasting feet over our head rocks the view -----
  // One shared source (skyMath.landingShake — the DOM text rides the same
  // signal via CanvasStage): scroll-enveloped strictly inside 67–68 %,
  // time-rumbled while it lasts; the slight zoom hides the shaken edges.
  // Reduced motion keeps the camera dead still.
  const sh = cfg.reducedMotion ? { x: 0, y: 0 } : landingShake(t, time)
  const shaking = Math.abs(sh.x) + Math.abs(sh.y) > 0.001
  if (shaking) {
    ctx.save()
    ctx.translate(w / 2 + sh.x * unit * 0.011, h / 2 + sh.y * unit * 0.011)
    ctx.scale(1.02, 1.02)
    ctx.translate(-w / 2, -h / 2)
  }

  // --- The perspective of the approach axis -----------------------------------
  // Everything on the ground maps through ONE warped depth (landingDepth):
  // drop below the horizon and lateral scale both run with 1/depth, so
  // objects, markings and the rolling jet stay mutually consistent.
  // The camera sits FAR back and high on the APPROACH GLIDEPATH (Martin's
  // review, 2× out again): the runway is a small slender target behind a
  // LONG approach-light axis, and the jet that just blew through the camera
  // pops out DEAD AHEAD across the whole screen — then only shrinks, sliding
  // down a straight line onto the piano keys.
  const yAt = (s: number): number => horizonY + (h * 0.1) / landingDepth(s)
  const halfW = (s: number): number => (w * 0.0925) / landingDepth(s)
  const xAt = (s: number, f: number): number => w * 0.5 + f * halfW(s)
  /** The jet's wingspan on screen at station s (span ≈ 9.5 m vs 45 m runway). */
  const spanAt = (s: number): number => (w * 0.039) / landingDepth(s)
  /** One perspective-correct ground quad added to the current path. */
  const quad = (s0: number, s1: number, f0: number, f1: number): void => {
    ctx.moveTo(xAt(s0, f0), yAt(s0))
    ctx.lineTo(xAt(s0, f1), yAt(s0))
    ctx.lineTo(xAt(s1, f1), yAt(s1))
    ctx.lineTo(xAt(s1, f0), yAt(s1))
    ctx.closePath()
  }

  // --- The golden-rose evening -------------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    0,
    w,
    h,
    [
      // The zenith falls toward true night once the roll stops (Martin: the
      // top of the sky darker at the close, the stars carrying it).
      [0, mixHex('#3a2350', '#0c1526', cool)],
      [0.42, mixHex('#7e3a5e', '#2c2342', cool)],
      [0.72, mixHex('#c65f63', '#7e3a55', cool)],
      [0.92, mixHex('#f2a35c', '#b8656a', cool)],
      [1, mixHex('#ffd9a0', '#d09070', cool)],
    ],
    alpha,
  )

  // First stars as the light cools — a bold field by full dusk.
  drawStars(ctx, {
    w, h: h * 0.5, count: 70, seed: 61, alpha: alpha * cool * 0.85, size: 1.6,
    time, twinkle: 0.45, xShift: time * 0.0009,
  })

  // The sun finishes the section-wide arc in the WEST, right of the runway —
  // the same shared trajectory as every other sky scene (continuous position,
  // no pause, no ghost): a slanted setting line that dips through the roll
  // and loses its last sliver just after the jet stops.
  const sun = sunArc(5.5 + (cfg.tRaw ?? t))
  const sunX = w * sun.x
  const sunY = h * sun.y
  // Redden with the DESCENT itself (arc height), not with scene-local time.
  const setProg = smoothstep(0.42, 0.72, sun.y)
  const glowColor = mixHex('#fff3c4', '#c81e08', setProg)
  const coreColor = mixHex('#fffdf0', '#f03510', setProg)
  const discColor = mixHex('#fffdf2', '#ff4518', setProg)
  drawGlow(ctx, sunX, Math.min(sunY, horizonY), unit * 0.4, glowColor, alpha * (0.4 - cool * 0.18))
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, w, horizonY)
  ctx.clip()
  drawGlow(ctx, sunX, sunY, unit * 0.12, coreColor, alpha * 0.7 * (1 - cool * 0.5))
  ctx.fillStyle = rgba(discColor, alpha * (1 - cool * 0.4))
  ctx.beginPath()
  // The low sun swells as it sinks — from the airshow's size to a big disc
  // (holding the airshow's exact size through the cross-fade).
  ctx.arc(sunX, sunY, unit * (0.028 + smoothstep(0.38, 0.72, sun.y) * 0.024), 0, TAU)
  ctx.fill()
  ctx.restore()

  // Thin stratus bars crossing the sun — the classic sunset signature. The
  // ones NEAR the sinking sun catch its red; the far ones stay dusk-dark.
  ctx.save()
  for (let i = 0; i < 4; i++) {
    const y = h * (0.44 + i * 0.055) + hash1(860 + i * 7) * h * 0.02
    const x = (w * (0.42 + hash1(850 + i * 11) * 0.45) + time * (0.6 + i * 0.2)) % (w * 1.2)
    const r = h * (0.008 + hash1(870 + i * 5) * 0.007)
    const base = mixHex('#6e2f4a', '#2c2038', cool)
    const prox = Math.exp(
      -(Math.pow((x - sunX) / (w * 0.2), 2) + Math.pow((y - sunY) / (h * 0.17), 2)),
    )
    drawPuff(ctx, x, y, r, mixHex(base, '#e03812', prox * setProg * 0.95), alpha * 0.78, 9 + i * 2)
  }
  {
    // One more cloud, higher — kin to the bar hugging the sun (Martin's ask):
    // it catches the red early and cools to dusk-dark as the sun sinks away.
    const y = h * 0.33
    const x = (w * 0.68 + time * 0.8) % (w * 1.2)
    const r = h * 0.0115
    const base = mixHex('#6e2f4a', '#2c2038', cool)
    const prox = Math.exp(
      -(Math.pow((x - sunX) / (w * 0.22), 2) + Math.pow((y - sunY) / (h * 0.2), 2)),
    )
    drawPuff(ctx, x, y, r, mixHex(base, '#e03812', prox * setProg * 0.95), alpha * 0.8, 21)
  }
  ctx.restore()

  // Horizon glow band — bleeding red with the sinking sun, strongest near it.
  fillVerticalGradient(
    ctx, 0, horizonY - h * 0.05, w, h * 0.08,
    [[0, 'rgba(0,0,0,0)'], [0.6, rgba(mixHex('#ffb677', '#e03210', setProg * 0.85), 0.26 * (1 - cool * 0.5))], [1, 'rgba(0,0,0,0)']],
    alpha,
  )
  // A concentrated blood-red pool of light around the sun's setting point.
  drawGlow(ctx, sunX, Math.min(sunY, horizonY), unit * 0.22, '#e02808', alpha * setProg * 0.4)

  // --- The far edge of the world -----------------------------------------------
  // A PROPER hill horizon in the runway's direction (Martin: like the
  // airshow's ridges): two sine-harmonic ridge lines rolling across the far
  // side, fading to NOTHING before the sun's setting lane (0.86–0.94 w stays
  // a clean horizon), corner swells at both edges, and Kutná Hora + the
  // pixel-scale towns sitting ON the terrain — every base is EVALUATED from
  // the same surface functions, so nothing can float (Martin's catch).
  const ridgeFar = (x: number): number =>
    0.01 +
    0.042 *
      (0.5 +
        0.275 * Math.sin((x / w) * 5.3 + 3.9) +
        0.15 * Math.sin((x / w) * 12.1 + 1.1) +
        0.075 * Math.sin((x / w) * 23 + 2))
  const ridgeNear = (x: number): number =>
    0.005 +
    0.022 *
      (0.5 +
        0.275 * Math.sin((x / w) * 4.1 + 0.6) +
        0.15 * Math.sin((x / w) * 10.3 + 2.9) +
        0.075 * Math.sin((x / w) * 19 + 0.2))
  // Corner swells — symmetric quadratic humps (peak = half the control pull).
  const hillL = (x: number): number => {
    const u = x / (w * 0.15)
    return u >= 0 && u <= 1 ? 0.056 * 2 * u * (1 - u) : 0
  }
  // The FARTHEST layer runs the FULL width and only DIPS low through the
  // sun's lane — the disc sets BEHIND it (Martin: za poslední vrstvou
  // nejvzdálenějších kopců), a low haze line instead of a bare horizon.
  const laneDip = (x: number): number =>
    1 - 0.72 * Math.exp(-Math.pow((x - w * 0.895) / (w * 0.075), 2))
  const farthest = (x: number): number => ridgeFar(x) * laneDip(x)
  {
    const ridge = (fn: (x: number) => number, col: string, a: number, x1: number, fade: boolean): void => {
      const g = ctx.createLinearGradient(0, 0, x1, 0)
      g.addColorStop(0, rgba(col, a))
      g.addColorStop(0.78, rgba(col, fade ? a * 0.85 : a))
      g.addColorStop(1, rgba(col, fade ? 0 : a))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.moveTo(0, horizonY + 2)
      for (let i = 0; i <= 72; i++) {
        const x = (i / 72) * x1
        ctx.lineTo(x, horizonY - h * fn(x))
      }
      ctx.lineTo(x1, horizonY + 2)
      ctx.closePath()
      ctx.fill()
    }
    ctx.save()
    ridge(farthest, mixHex('#432b4e', '#221c38', cool * 0.55), condense * 0.92, w, false)
    ridge(ridgeNear, mixHex('#332040', '#1a1530', cool * 0.5), condense, w * 0.86, true)
    // The corner swells, nearest and darkest.
    ctx.fillStyle = rgba(mixHex('#2e1d3a', '#181326', cool * 0.5), condense)
    ctx.beginPath()
    ctx.moveTo(0, horizonY + 2)
    ctx.quadraticCurveTo(w * 0.075, horizonY - h * 0.056, w * 0.15, horizonY + 2)
    ctx.closePath()
    ctx.moveTo(w * 0.94, horizonY + 2)
    ctx.quadraticCurveTo(w * 0.99, horizonY - h * 0.044, w * 1.04, horizonY + 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  // Kutná Hora rides the FAR ridge like the towns ride their hills — solid
  // ink (a translucent skyline let the horizon glow bleed through; haze
  // comes from the COLOUR only).
  drawKutnaHora(
    ctx, w, h, w * 0.17,
    horizonY - h * Math.max(0, ridgeFar(w * 0.17) - 0.004),
    mixHex('#3a2542', '#1e1830', cool * 0.5), condense,
  )
  {
    // Tiny far-off towns: a handful of rooftops and one needle each, a touch
    // lighter than the ridge so they read against it, sunk INTO their own
    // surface so they always sit grounded.
    ctx.save()
    ctx.fillStyle = rgba(mixHex('#5a4570', '#2a2142', cool * 0.5), condense)
    ctx.beginPath()
    // No town anywhere near the sunset lane (Martin). The third cluster sits
    // ON THE FLANK of the far ridge, right of the runway above the first
    // hangars — nestled BELOW the crest (in the hills, not on the skyline).
    for (const [cxF, seed, surf] of [
      [0.062, 720, hillL], [0.305, 760, ridgeFar], [0.7, 790, (x: number) => ridgeFar(x) * 0.4],
    ] as const) {
      const cx = w * cxF
      const base = horizonY - h * (surf(cx) - 0.003)
      for (let i = 0; i < 6; i++) {
        const bw = w * (0.0028 + hash1(seed + i * 3.3) * 0.0035)
        const bh = h * (0.005 + hash1(seed + i * 5.1) * 0.005)
        ctx.rect(cx + (i - 2.5) * w * 0.005, base - bh, bw, bh)
      }
      ctx.moveTo(cx - w * 0.0006, base)
      ctx.lineTo(cx, base - h * 0.0125)
      ctx.lineTo(cx + w * 0.0006, base)
      ctx.closePath()
    }
    ctx.fill()
    ctx.restore()
  }
  // Čáslav sits in the flat Polabí plain — just a distant tree strip on the
  // left, dissolving well before the setting point so the sun sinks to a
  // CLEAN horizon (the sliver at the stop is the beat).
  {
    const col = mixHex('#2c1d36', '#181428', cool * 0.6)
    const grad = ctx.createLinearGradient(0, 0, w * 0.7, 0)
    grad.addColorStop(0, rgba(col, alpha * 0.9))
    grad.addColorStop(0.75, rgba(col, alpha * 0.75))
    grad.addColorStop(1, rgba(col, 0))
    ctx.save()
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(0, horizonY + 2)
    for (let i = 0; i <= 56; i++) {
      const x = (i / 56) * w * 0.7
      const u = (i / 56) * TAU
      const crest =
        0.55 * Math.sin(u * 1.3 + 1.7) + 0.3 * Math.sin(u * 3.1 + 0.6) + 0.15 * Math.sin(u * 6.7)
      ctx.lineTo(x, horizonY - h * (0.0045 + 0.0052 * (crest * 0.5 + 0.5)))
    }
    ctx.lineTo(w * 0.7, horizonY + 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // --- The dark airfield plain -------------------------------------------------
  fillVerticalGradient(
    ctx,
    0,
    horizonY,
    w,
    h - horizonY,
    [
      [0, mixHex('#2b1c2e', '#131019', cool * 0.55)],
      [0.35, mixHex('#191221', '#100d16', cool * 0.4)],
      [1, '#08070c'],
    ],
    alpha,
  )
  // Sunset afterglow washing over the field, strongest under the sun.
  drawGlow(ctx, sunX, horizonY + h * 0.05, w * 0.5, '#b06a4e', alpha * 0.22 * (1 - cool * 0.55))
  fillVerticalGradient(
    ctx, 0, horizonY, w, h * 0.1,
    [[0, rgba('#8a4a44', 0.15 * (1 - cool * 0.5))], [1, 'rgba(0,0,0,0)']],
    alpha,
  )

  // --- The runway, dead ahead ---------------------------------------------------
  const S_END = LANDING_S.end
  {
    // Asphalt trapezoid, darkening into the distance.
    const g = ctx.createLinearGradient(0, yAt(S_END), 0, yAt(1))
    g.addColorStop(0, rgba('#191323', alpha * 0.92))
    g.addColorStop(1, rgba('#282031', alpha * 0.95))
    ctx.save()
    ctx.fillStyle = g
    ctx.beginPath()
    quad(1, S_END, -1, 1)
    ctx.fill()
    // Faded edge stripes.
    ctx.strokeStyle = rgba('#cdd2dd', alpha * 0.16)
    ctx.lineWidth = Math.max(1, h * 0.0014)
    ctx.beginPath()
    ctx.moveTo(xAt(1, -0.985), yAt(1))
    ctx.lineTo(xAt(S_END, -0.985), yAt(S_END))
    ctx.moveTo(xAt(1, 0.985), yAt(1))
    ctx.lineTo(xAt(S_END, 0.985), yAt(S_END))
    ctx.stroke()
    // Piano keys at the threshold, catching the last warm light.
    ctx.fillStyle = rgba(mixHex('#d8dce6', '#ffd9a0', 0.35 * (1 - cool)), alpha * 0.5)
    ctx.beginPath()
    for (const fc of [-0.85, -0.65, -0.45, -0.25, 0.25, 0.45, 0.65, 0.85]) {
      quad(1.04, 1.17, fc - 0.07, fc + 0.07)
    }
    ctx.fill()
    // Centreline dashes marching to the far end.
    ctx.fillStyle = rgba('#d8dce6', alpha * 0.34)
    ctx.beginPath()
    for (let s = 1.26; s < S_END - 0.1; s += 0.3) {
      quad(s, s + 0.14, -0.035, 0.035)
    }
    ctx.fill()
    ctx.restore()
  }

  // --- The parallel taxiway + the base, off to the RIGHT (Čáslav layout) ------
  ctx.save()
  ctx.fillStyle = rgba('#1c1526', alpha * 0.8)
  ctx.beginPath()
  quad(1.05, S_END - 0.3, 1.75, 2.15)
  // Connectors: one at the threshold end, one right where the roll stops.
  quad(1.1, 1.24, 1, 1.78)
  quad(LANDING_S.stop - 0.08, LANDING_S.stop + 0.08, 1, 1.78)
  ctx.fill()
  ctx.restore()

  // The control tower (caslav twr.jpg): tapering shaft, flared two-deck cab,
  // glass band, rails, antenna masts — silhouetted right of the taxiway.
  {
    const sT = 1.9
    const d = landingDepth(sT)
    const tx = xAt(sT, 4.8)
    const baseY = yAt(sT)
    const th = h * 0.032 // shaft height to the lower deck — 2× farther now
    const col = mixHex(INK, '#4a2b3f', 0.25)
    ctx.save()
    ctx.globalAlpha = condense
    // Attached two-story ops building (the tower fronts it).
    ctx.fillStyle = col
    ctx.fillRect(tx + w * 0.004, baseY - h * 0.009, w * 0.02 / (d * 0.6), h * 0.009)
    // The tapering shaft.
    ctx.beginPath()
    ctx.moveTo(tx - w * 0.0034, baseY)
    ctx.lineTo(tx - w * 0.0021, baseY - th)
    ctx.lineTo(tx + w * 0.0021, baseY - th)
    ctx.lineTo(tx + w * 0.0034, baseY)
    ctx.closePath()
    ctx.fill()
    // Lower balcony deck, then the cab flaring OUTWARD toward the top.
    ctx.fillRect(tx - w * 0.0057, baseY - th - h * 0.0052, w * 0.0114, h * 0.0052)
    ctx.beginPath()
    ctx.moveTo(tx - w * 0.0057, baseY - th - h * 0.0052)
    ctx.lineTo(tx - w * 0.007, baseY - th - h * 0.012)
    ctx.lineTo(tx + w * 0.007, baseY - th - h * 0.012)
    ctx.lineTo(tx + w * 0.0057, baseY - th - h * 0.0052)
    ctx.closePath()
    ctx.fill()
    // The glass band, holding the sunset.
    ctx.fillStyle = rgba(mixHex('#ffb677', '#3a4a66', cool), 0.5 * (1 - cool * 0.4))
    ctx.fillRect(tx - w * 0.0055, baseY - th - h * 0.0104, w * 0.011, h * 0.0026)
    // Balcony rails.
    ctx.strokeStyle = rgba('#6e5a70', 0.5)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(tx - w * 0.0075, baseY - th - h * 0.0053)
    ctx.lineTo(tx + w * 0.0075, baseY - th - h * 0.0053)
    ctx.moveTo(tx - w * 0.0078, baseY - th - h * 0.0122)
    ctx.lineTo(tx + w * 0.0078, baseY - th - h * 0.0122)
    ctx.stroke()
    // Antenna masts.
    ctx.strokeStyle = col
    ctx.lineWidth = Math.max(1, unit * 0.001)
    ctx.beginPath()
    for (const [dxF, mhF] of [[-0.0031, 0.007], [0.0003, 0.0105], [0.0039, 0.006]] as const) {
      ctx.moveTo(tx + w * dxF, baseY - th - h * 0.012)
      ctx.lineTo(tx + w * dxF, baseY - th - h * (0.012 + mhF))
    }
    ctx.stroke()
    ctx.restore()
    // The airfield beacon on the cab roof — white/green flashes reaching out
    // as dusk settles (steady faint when time is frozen).
    const cyc = time > 0 ? (time % 2.4) / 2.4 : 0.03
    const wFlash = cyc < 0.05 ? 1 - cyc / 0.05 : 0
    const gFlash = cyc > 0.5 && cyc < 0.55 ? 1 - (cyc - 0.5) / 0.05 : 0
    const bA = alpha * (0.25 + 0.75 * smoothstep(0.5, 0.9, t)) * handoff
    if (wFlash > 0.02) drawGlow(ctx, tx, baseY - th - h * 0.013, unit * 0.014, '#ffffff', bA * wFlash * 0.8)
    if (gFlash > 0.02) drawGlow(ctx, tx, baseY - th - h * 0.013, unit * 0.014, '#59ff8a', bA * gFlash * 0.7)
  }

  // The hangar row receding along the taxiway; shelter humps sprinkled deeper.
  ctx.save()
  ctx.fillStyle = mixHex(INK, '#4a2b3f', 0.18)
  ctx.globalAlpha = condense
  // …plus one more marching the OTHER way from the tower — down the line
  // toward the bottom-right of the view (Martin), growing as it nears the
  // camera.
  for (const [s, fc, hs] of [
    [2.3, 5.2, 1], [2.7, 5.2, 0.92], [3.1, 5.2, 0.85],
    [0.78, 3.15, 0.8],
  ] as const) {
    const d = landingDepth(s)
    const x = xAt(s, fc)
    const baseY = yAt(s)
    const hw = (w * 0.03 * hs) / d
    const hh = (h * 0.036 * hs) / d
    ctx.beginPath()
    ctx.moveTo(x - hw, baseY)
    ctx.lineTo(x - hw, baseY - hh * 0.72)
    ctx.quadraticCurveTo(x, baseY - hh * 1.35, x + hw, baseY - hh * 0.72)
    ctx.lineTo(x + hw, baseY)
    ctx.closePath()
    ctx.fill()
  }
  // A blocky ops/storage building just above the near hangar, a touch right
  // (Martin's placement).
  {
    const sB = 1.0
    const d = landingDepth(sB)
    const x = xAt(sB, 4.1)
    const baseY = yAt(sB)
    const bw = (w * 0.02) / d
    const bh = (h * 0.016) / d
    ctx.fillRect(x - bw / 2, baseY - bh, bw, bh)
    ctx.fillRect(x - bw * 0.28, baseY - bh * 1.22, bw * 0.56, bh * 0.22)
  }
  // Hardened-shelter humps (the round mounds all over caslav airbase.jpg) —
  // most on the base side, two far off the left wingtip for balance.
  for (const [s, fc] of [
    [2.5, 3.4], [2.9, 6.4], [3.3, 4.2], [3.6, 7.6], [3.2, -5.2], [3.5, -7.0],
  ] as const) {
    const d = landingDepth(s)
    const x = xAt(s, fc)
    const baseY = yAt(s)
    const rx = (w * 0.017) / d
    const ry = (h * 0.015) / d
    ctx.beginPath()
    ctx.moveTo(x - rx, baseY)
    ctx.ellipse(x, baseY, rx, ry, 0, Math.PI, 0)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()

  // The windsock near the threshold, still catching a little light.
  {
    const sW = 1.15
    const x = xAt(sW, 2.6)
    const baseY = yAt(sW)
    const ph = h * 0.02 / landingDepth(sW)
    ctx.save()
    ctx.strokeStyle = rgba('#3d3346', alpha * 0.9)
    ctx.lineWidth = Math.max(1, unit * 0.0016)
    ctx.beginPath()
    ctx.moveTo(x, baseY)
    ctx.lineTo(x, baseY - ph)
    ctx.stroke()
    const flap = Math.sin(time * 2.4) * 0.5 + 0.5
    ctx.fillStyle = rgba(mixHex('#ef7a30', '#5e3324', cool * 0.7), alpha * 0.9)
    ctx.beginPath()
    ctx.moveTo(x, baseY - ph)
    ctx.lineTo(x + ph * 0.62, baseY - ph + ph * (0.1 + flap * 0.08))
    ctx.lineTo(x + ph * 0.62, baseY - ph + ph * (0.26 + flap * 0.08))
    ctx.lineTo(x, baseY - ph + ph * 0.3)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // --- The lights of the field, warming as dusk deepens ------------------------
  const dot = (x: number, y: number, r: number, glow: number, color: string, a: number): void => {
    drawGlow(ctx, x, y, glow, color, a * 0.8)
    ctx.fillStyle = rgba(color, Math.min(1, a * 1.2))
    ctx.fillRect(x - r / 2, y - r / 2, r, r)
  }
  ctx.save()
  // Edge lights — two strings converging on the far end.
  for (let s = 1.02; s < S_END - 0.05; s += 0.22) {
    const d = landingDepth(s)
    const y = yAt(s)
    const r = Math.max(1.2, (unit * 0.0026) / d)
    const g = (unit * 0.0095) / Math.pow(d, 0.9)
    dot(xAt(s, -1.06), y, r, g, '#ffcf8a', lightA * 0.9)
    dot(xAt(s, 1.06), y, r, g, '#ffcf8a', lightA * 0.9)
  }
  // The green threshold bar, facing us across the runway head.
  for (let f = -1; f <= 1.001; f += 0.125) {
    dot(xAt(0.985, f), yAt(0.985), Math.max(1.3, unit * 0.0028), unit * 0.0085, '#7dffa0', lightA * 0.95)
  }
  // Red end lights, tiny and far.
  for (let f = -1; f <= 1.001; f += 0.25) {
    dot(xAt(S_END - 0.02, f), yAt(S_END - 0.02), 1.2, unit * 0.004, '#ff5a4d', lightA * 0.8)
  }
  // PAPI, left of the touchdown zone: two white, two red.
  for (let i = 0; i < 4; i++) {
    dot(
      xAt(1.5, -1.32 - i * 0.08), yAt(1.5), Math.max(1.3, unit * 0.0026), unit * 0.0075,
      i < 2 ? '#ffffff' : '#ff5a4d', lightA * 0.9,
    )
  }
  // Blue taxiway edge lights — the unmistakable dusk-airfield signature.
  for (let s = 1.15; s < S_END - 0.35; s += 0.3) {
    const y = yAt(s)
    dot(xAt(s, 1.72), y, 1.2, unit * 0.005, '#5b7bff', lightA * 0.55)
    dot(xAt(s, 2.18), y, 1.2, unit * 0.005, '#5b7bff', lightA * 0.55)
  }
  // The Čáslav approach LIGHT AXIS (Martin's night reference): a long run of
  // tight centreline bars marching from underfoot to the threshold, one wide
  // crossbar partway out, the nearest stations blooming as big bright balls —
  // and a sequenced rabbit racing along the axis toward the runway (steady
  // when time is frozen).
  // With the camera 2× farther out, TWICE the approach lights fit between
  // us and the piano keys — the axis runs long, exactly the Čáslav photo.
  const rabbit = time > 0 ? (time * 1.05) % 1 : 0.45
  for (let i = 0; i < 14; i++) {
    const s = 0.26 + i * 0.052
    const d = landingDepth(s)
    const y = yAt(s)
    const near = Math.max(0, 3 - i) // the closest stations bloom hard
    const r = Math.max(1.3, (unit * 0.0028) / d)
    const g = ((unit * 0.0068) / Math.pow(d, 0.85)) * (1 + near * 0.45)
    const seq = rabbit - i / 14
    const flash = seq > 0 && seq < 0.06 ? 1 - seq / 0.06 : 0
    const span = i === 4 ? 0.42 : 0.1 // the crossbar station
    for (let f = -span; f <= span + 0.001; f += span > 0.15 ? 0.07 : 0.05) {
      dot(xAt(s, f), y, r, g * (1 + flash * 1.6), '#ffffff', lightA * (0.48 + near * 0.1 + flash * 0.5))
    }
  }
  ctx.restore()

  // --- The landing ---------------------------------------------------------------
  const pov = landingPov(t)
  const L = LANDING

  // Touchdown: a puff off each main wheel at the contact point, blooming
  // outward and dissolving while the jet rolls on.
  const puff =
    smoothstep(L.touchdown, L.touchdown + 0.012, t) *
    (1 - smoothstep(L.touchdown + 0.02, L.touchdown + 0.08, t))
  if (puff > 0.01) {
    const spread = smoothstep(L.touchdown, L.touchdown + 0.08, t)
    const span0 = spanAt(1)
    // drawPuff sets globalAlpha by contract — the batch owns a save/restore.
    ctx.save()
    for (const side of [-1, 1] as const) {
      drawPuff(
        ctx,
        w * 0.5 + side * span0 * (0.3 + spread * 0.3),
        yAt(1) - span0 * 0.02,
        Math.max(span0 * 0.075, unit * 0.0052) * (1 + spread * 1.4),
        '#b9a4b8',
        alpha * puff * 0.45,
        11 + side * 2,
      )
    }
    ctx.restore()
  }

  // The jet from BEHIND — real traced gear-down tail view, shrinking down
  // the glidepath, flaring onto the threshold, braking to the halfway stop.
  if (pov.s > 0.004) {
    const span = spanAt(pov.s)
    const jetX = w * 0.5
    // The camera IS on the glidepath and the glide line ends ON the piano
    // keys — so the receding jet does NOT move on screen at all: it sits
    // pinned over the threshold, covering it, and ONLY SHRINKS until it is
    // touchdown-sized and the wheels meet the ground (Martin: žádný pohyb,
    // samotné zmenšování znamená, že míří přímo na práh). After touchdown
    // it rides the runway projection down the rollout.
    const jetY = pov.alt > 0 ? yAt(LANDING_S.threshold) : yAt(pov.s)
    const jetColor = '#140d18'
    // Warm rim from the low sun while it is still up.
    drawGlow(ctx, jetX, jetY - span * 0.22, Math.max(span * 0.5, unit * 0.02), '#ff9d5c', alpha * 0.2 * (1 - cool * 0.6))
    // The hot pipe we stare straight into right after the pass — a dim ember
    // disc at the nozzle (measured at ~0.20 span over the wheel line), gone
    // once the jet is far enough to read as a silhouette.
    const closeness = clamp01((span / w - 0.12) / 0.25)
    if (closeness > 0.01) {
      ctx.save()
      ctx.fillStyle = rgba('#7e2b10', alpha * closeness * 0.85)
      ctx.beginPath()
      ctx.arc(jetX, jetY - span * 0.2, span * 0.042, 0, TAU)
      ctx.fill()
      ctx.restore()
      drawGlow(ctx, jetX, jetY - span * 0.2, span * 0.1, '#ff5a1e', alpha * closeness * 0.35)
    }
    // On the ground the runway lighting backwashes the silhouette softly —
    // the small distant jet must stay readable against the dark asphalt.
    const grounded = smoothstep(L.touchdown, L.touchdown + 0.02, t)
    if (grounded > 0.01) {
      drawGlow(ctx, jetX, jetY - span * 0.1, Math.max(span * 0.62, unit * 0.028), '#c88a5a', alpha * grounded * 0.18)
    }
    drawL159Rear(ctx, { x: jetX, y: jetY, size: span, flaps: 1, color: jetColor, alpha })
    // Hot nozzle breathing out of the black right after the overhead pass.
    const flash = t > L.blackLift ? 1 - smoothstep(L.blackLift, L.blackLift + 0.045, t) : 0
    if (flash > 0.02) drawGlow(ctx, jetX, jetY - span * 0.2, span * 0.24, '#ff8a2e', alpha * flash * 0.6)
    // Navigation lights seen from astern: port red left, starboard green
    // right on the tip tanks, the white tail light + strobe pinned EXACTLY
    // on the traced fin tip (measured, not guessed — it blinked above the
    // jet), a red beacon on the spine — these carry the small stopped jet
    // through the dusk (steady if frozen).
    const na = alpha * (0.5 + 0.5 * smoothstep(0.5, 0.9, t)) * handoff
    const lr = Math.max(1.4, span * 0.012)
    const finY = jetY - span * (L159_REAR_FIN_TIP - 0.015)
    dot(jetX - span * 0.5, jetY - span * 0.16, lr, Math.max(unit * 0.006, span * 0.05), '#ff4536', na * 0.9)
    dot(jetX + span * 0.5, jetY - span * 0.16, lr, Math.max(unit * 0.006, span * 0.05), '#4dff7a', na * 0.9)
    dot(jetX, finY, lr, Math.max(unit * 0.005, span * 0.04), '#ffffff', na * 0.6)
    const strobe = time > 0 ? (time % 1.1 < 0.18 ? 1 : 0.08) : 0.6
    drawGlow(ctx, jetX, finY, Math.max(unit * 0.011, span * 0.09), '#ffffff', alpha * strobe * na * 0.85)
    const beacon = time > 0 ? ((time + 0.55) % 1.1 < 0.14 ? 1 : 0.05) : 0.5
    drawGlow(ctx, jetX, jetY - span * 0.3, Math.max(unit * 0.009, span * 0.07), '#ff3524', alpha * beacon * na * 0.8)
  }

  // --- The overhead pass: the belly swallows the sky, the screen goes BLACK ---
  // Desktop-only: the planform is sized off `w`, so on a portrait phone it
  // reads as a small complete aircraft hanging in the sky instead of a
  // shadow blotting it out (Martin's mobile fix) — there the black veil
  // below carries the flash alone and the first jet seen is the rear view.
  const sweepP = smoothstep(L.sweepIn, L.blackFull, t)
  if (sweepP > 0.01 && sweepP < 0.999 && w >= 720) {
    // Small enough that the WHOLE planform reads as an aircraft blotting out
    // the sky (the veil snaps shut only near the end of the sweep).
    drawL159Belly(ctx, {
      x: w * 0.5,
      y: lerp(-0.55 * h, 0.66 * h, Math.pow(sweepP, 1.25)),
      size: lerp(0.75, 1.3, sweepP) * w,
      rot: Math.PI / 2, // nose down-screen — flying away toward the runway
      color: '#0d0812',
      alpha: alpha * Math.min(1, sweepP * 4),
    })
  }
  if (pov.black > 0.004) {
    ctx.fillStyle = rgba('#07040b', alpha * pov.black)
    ctx.fillRect(0, 0, w, h)
  }

  // B3a hand-off: beyond the light-channel dimmers, the night itself
  // swallows the airfield ahead of the healing lake — a deepening veil that
  // also kills the bright PAINT (piano keys, markings) and the horizon
  // afterglow, so nothing bright survives past ~73 % global.
  const swallow = smoothstep(0.98, 1.06, cfg.tRaw ?? t)
  if (swallow > 0.01) {
    ctx.fillStyle = rgba('#04060a', alpha * swallow * 0.72)
    ctx.fillRect(0, 0, w, h)
  }
  if (shaking) ctx.restore()
}
