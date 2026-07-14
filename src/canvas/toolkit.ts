/**
 * The reusable 2D render toolkit — pure, framework-free canvas helpers every
 * scene builds on: easing/hash math, colour mixing, gradients, glows, star
 * fields, ridge silhouettes, film grain. No DOM access at module scope (safe
 * to import from unit tests); no state (particles are deterministic functions
 * of a seed + time, so scenes stay pure and scrubbable).
 *
 * Alpha convention: helpers that take an `alpha` treat it as the FINAL value
 * (already multiplied by the scene's cross-fade weight) and save/restore the
 * context around their own `globalAlpha` writes.
 */

export const TAU = Math.PI * 2

export function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Hermite-eased 0..1 ramp between `edge0` and `edge1` (GLSL smoothstep). */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Deterministic pseudo-random in [0,1) from any number — the seed of every
 *  "random" particle, so a given frame always paints identically (scrub-safe). */
export function hash1(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

type Rgb = { r: number; g: number; b: number }
const rgbCache = new Map<string, Rgb>()

/** Parse `#rgb` / `#rrggbb` — or an `rgb(r,g,b)` string, so colours composed
 *  by `mixHex` can be mixed/alpha'd again. Scenes feed scroll-driven colour
 *  strings through here every frame, so the memo cache is capped. */
function hexToRgb(hex: string): Rgb {
  const cached = rgbCache.get(hex)
  if (cached) return cached
  let rgb: Rgb
  if (hex[0] === '#') {
    let s = hex.slice(1)
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]
    const n = parseInt(s, 16)
    rgb = { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  } else {
    const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(hex)
    rgb = m ? { r: +m[1], g: +m[2], b: +m[3] } : { r: 0, g: 0, b: 0 }
  }
  if (rgbCache.size >= 4096) rgbCache.clear()
  rgbCache.set(hex, rgb)
  return rgb
}

/** `#rrggbb` + alpha → CSS `rgba()` string. */
export function rgba(hex: string, a: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${clamp01(a)})`
}

/** Mix two hex colours (0 = a, 1 = b) → CSS `rgb()` string. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const k = clamp01(t)
  return `rgb(${Math.round(lerp(ca.r, cb.r, k))},${Math.round(lerp(ca.g, cb.g, k))},${Math.round(lerp(ca.b, cb.b, k))})`
}

/** Mix two hex colours and apply an alpha → CSS `rgba()` string. */
export function mixRgba(a: string, b: string, t: number, alpha: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const k = clamp01(t)
  return `rgba(${Math.round(lerp(ca.r, cb.r, k))},${Math.round(lerp(ca.g, cb.g, k))},${Math.round(lerp(ca.b, cb.b, k))},${clamp01(alpha)})`
}

// ---------------------------------------------------------------------------
// Fills
// ---------------------------------------------------------------------------

export type GradientStop = readonly [offset: number, color: string]

/** Fill a rect with a top→bottom linear gradient. Stops are ready CSS colours. */
export function fillVerticalGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: readonly GradientStop[],
  alpha = 1,
): void {
  if (alpha <= 0) return
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  for (const [offset, color] of stops) g.addColorStop(offset, color)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  ctx.restore()
}

/** Unit radial glow gradients, one per colour — creating a gradient (plus
 *  three rgba stop strings) per call was the busiest scenes' hottest
 *  allocation (~150 glows/frame in the sunset alone). The cached gradient is
 *  drawn through a translate/scale transform (gradients evaluate through the
 *  CTM, so the pixels match the per-call construction exactly) and the alpha
 *  rides `globalAlpha` MULTIPLIED over the caller's own value — the same
 *  linear scaling the per-call colour stops applied. Capped like the rgb
 *  cache: mixHex-composed colours churn keys. */
const glowGradCache = new Map<string, CanvasGradient>()

/** A soft radial glow (light bloom) centred on (x, y). */
export function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hex: string,
  alpha: number,
): void {
  if (alpha <= 0 || r <= 0) return
  if (alpha < 1) {
    let g = glowGradCache.get(hex)
    if (!g) {
      g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
      g.addColorStop(0, rgba(hex, 1))
      g.addColorStop(0.4, rgba(hex, 0.45))
      g.addColorStop(1, rgba(hex, 0))
      if (glowGradCache.size >= 512) glowGradCache.clear()
      glowGradCache.set(hex, g)
    }
    ctx.save()
    ctx.globalAlpha *= alpha
    ctx.translate(x, y)
    ctx.scale(r, r)
    ctx.fillStyle = g
    ctx.fillRect(-1, -1, 2, 2)
    ctx.restore()
    return
  }
  // alpha ≥ 1: the stops saturate INDEPENDENTLY (0.45·alpha may stay < 1) —
  // not a scalar multiple of the unit gradient — so keep the per-call build
  // for this rare over-driven case.
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, rgba(hex, alpha))
  g.addColorStop(0.4, rgba(hex, alpha * 0.45))
  g.addColorStop(1, rgba(hex, 0))
  ctx.save()
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Particles / silhouettes
// ---------------------------------------------------------------------------

export type StarFieldOptions = {
  /** Field width / height in CSS px (height = the band stars live in). */
  w: number
  h: number
  count: number
  /** Distinct seed per layer so layers don't overlap star-for-star. */
  seed: number
  /** Final alpha for the brightest star (already scene-multiplied). */
  alpha: number
  /** Max star size in px; per-star size varies below it. */
  size?: number
  /** Ambient seconds (0 = frozen); drives twinkle only. */
  time?: number
  /** 0 = steady, 1 = full twinkle depth. */
  twinkle?: number
  /** Horizontal / vertical field shift in 0..1 field units (wraps). */
  xShift?: number
  yShift?: number
  color?: string
}

/** A deterministic star field: positions/sizes from the seed, twinkle from
 *  `time`, drift via the shift params — same inputs, same sky. */
export function drawStars(ctx: CanvasRenderingContext2D, o: StarFieldOptions): void {
  if (o.alpha <= 0.005) return
  const size = o.size ?? 1.6
  const twinkle = o.twinkle ?? 0.4
  const time = o.time ?? 0
  const xShift = o.xShift ?? 0
  const yShift = o.yShift ?? 0
  ctx.save()
  ctx.fillStyle = o.color ?? '#dfe8ff'
  for (let i = 0; i < o.count; i++) {
    const hx = hash1(o.seed + i * 3.7)
    const hy = hash1(o.seed + i * 7.9 + 1.3)
    const hs = hash1(o.seed + i * 13.3 + 2.6)
    const hp = hash1(o.seed + i * 23.9 + 3.9)
    const x = (((hx + xShift) % 1) + 1) % 1 * o.w
    const y = (((hy + yShift) % 1) + 1) % 1 * o.h
    const r = 0.5 + hs * size
    const tw = 1 - twinkle * (0.5 + 0.5 * Math.sin(time * (0.6 + hp * 1.6) + hp * TAU))
    ctx.globalAlpha = o.alpha * (0.35 + 0.65 * hs) * tw
    ctx.fillRect(x, y, r, r)
  }
  ctx.restore()
}

export type RidgeOptions = {
  w: number
  /** Baseline the silhouette undulates around. */
  y: number
  /** Peak amplitude in px. */
  amp: number
  seed: number
  color: string
  /** Fill from the curve down to this y. */
  bottom: number
  /** Phase shift in 0..1 units — drive with localT for scroll parallax.
   *  NOTE: this morphs the profile; for terrain that must fly past
   *  unchanged, use `scrollX` instead. */
  shift?: number
  /** Horizontal scroll in px (positive = terrain runs LEFT). The profile is
   *  made w-periodic (integer harmonics) and translated — the same landscape
   *  streaming by, never remodelling. */
  scrollX?: number
  alpha?: number
}

/** A hill/ridge silhouette from summed sines — cheap, organic, deterministic. */
export function drawRidge(ctx: CanvasRenderingContext2D, o: RidgeOptions): void {
  const alpha = o.alpha ?? 1
  if (alpha <= 0) return
  const p1 = hash1(o.seed) * TAU
  const p2 = hash1(o.seed + 1) * TAU
  const p3 = hash1(o.seed + 2) * TAU
  const shift = (o.shift ?? 0) * TAU
  const scrolled = o.scrollX !== undefined
  // Integer harmonics tile seamlessly across w — required for scrolling.
  const f2 = scrolled ? 2 : 2.3
  const f3 = scrolled ? 5 : 4.7
  const off = scrolled ? ((((o.scrollX ?? 0) % o.w) + o.w) % o.w) : 0
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = o.color
  ctx.beginPath()
  ctx.moveTo(-off, o.bottom)
  const steps = 72
  // With scroll, draw two periods and translate left — pure motion.
  const periods = scrolled ? 2 : 1
  for (let i = 0; i <= steps * periods; i++) {
    const x = (i / steps) * o.w - off
    const u = (i / steps) * TAU
    const yv =
      o.y -
      o.amp *
        (0.55 * Math.sin(u * 1.0 + p1 + shift) +
          0.3 * Math.sin(u * f2 + p2 + shift * 1.7) +
          0.15 * Math.sin(u * f3 + p3))
    ctx.lineTo(x, yv)
  }
  ctx.lineTo(o.w * periods - off, o.bottom)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// ---------------------------------------------------------------------------
// Grain
// ---------------------------------------------------------------------------

/** Pre-render a neutral-grey noise tile once; the engine tiles it over every
 *  frame ('overlay', low alpha) for a subtle filmic texture. */
export function makeGrainTile(size = 160): HTMLCanvasElement {
  const tile = document.createElement('canvas')
  tile.width = size
  tile.height = size
  const tctx = tile.getContext('2d')
  if (!tctx) return tile
  const img = tctx.createImageData(size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.random() * 64
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 255
  }
  tctx.putImageData(img, 0, 0)
  return tile
}
