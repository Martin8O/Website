/**
 * Cloud rendering for the SKY family. The primitive is a soft "puff" — an
 * offscreen radial-gradient sprite built once per colour and drawn scaled —
 * composed into sheep-backed cumulus lobes, a perspective cloud SEA (the
 * emotional stage of the pilot arc), and a flat overhead DECK (what the climb
 * punches through). The sprite cache is a pure render detail: the same inputs
 * still paint the same frame.
 *
 * Alpha convention: as in the toolkit, alphas are FINAL values. `drawPuff`
 * writes `globalAlpha` without save/restore for speed — callers wrap a batch
 * in save/restore (the sea/deck helpers here already do).
 */

import { fillVerticalGradient, hash1, mixHex, rgba } from '../../toolkit'

const SPRITE_R = 64
const spriteCache = new Map<string, HTMLCanvasElement>()

/** Scenes pass continuously-mixed colours (scroll-driven palettes, per-puff
 *  sun proximity), so the cache key MUST be quantized — otherwise every frame
 *  mints new sprites and the cache grows without bound. 12-step channels are
 *  invisible at puff alphas; the cap is a belt-and-braces backstop. */
const CACHE_CAP = 384

function puffSprite(color: string): HTMLCanvasElement {
  let r = 0
  let g = 0
  let b = 0
  if (color[0] === '#') {
    let s = color.slice(1)
    if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]
    const n = parseInt(s, 16)
    r = (n >> 16) & 255
    g = (n >> 8) & 255
    b = n & 255
  } else {
    const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(color)
    if (m) {
      r = +m[1]
      g = +m[2]
      b = +m[3]
    }
  }
  const q = (v: number) => Math.min(255, Math.round(v / 8) * 8)
  r = q(r)
  g = q(g)
  b = q(b)
  // Rounding channels independently can nudge green above the others and
  // tint a grey cloud sage (seen live). Nothing in the sky family is ever
  // legitimately green — clamp it to the other channels.
  g = Math.min(g, Math.max(r, b))
  const key = `${r},${g},${b}`
  const cached = spriteCache.get(key)
  if (cached) return cached
  if (spriteCache.size >= CACHE_CAP) spriteCache.clear()
  const c = document.createElement('canvas')
  c.width = c.height = SPRITE_R * 2
  const g2 = c.getContext('2d')
  if (!g2) return c
  const grad = g2.createRadialGradient(SPRITE_R, SPRITE_R, 0, SPRITE_R, SPRITE_R, SPRITE_R)
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`)
  grad.addColorStop(0.55, `rgba(${r},${g},${b},0.55)`)
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
  g2.fillStyle = grad
  g2.fillRect(0, 0, SPRITE_R * 2, SPRITE_R * 2)
  spriteCache.set(key, c)
  return c
}

/** One soft puff. `sx` stretches horizontally (stratus bars, smoke smears).
 *  Sets `globalAlpha` — wrap batches in save/restore. */
export function drawPuff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha: number,
  sx = 1,
): void {
  if (alpha <= 0.004 || r <= 0.5) return
  ctx.globalAlpha = alpha
  ctx.drawImage(puffSprite(color), x - r * sx, y - r, r * 2 * sx, r * 2)
}

/** drawPuff with the sprite already resolved — the sea's hot loop resolves
 *  each row's few colours ONCE and blits, instead of re-mixing/parsing a
 *  colour string per puff (~550 passes per sea per frame saved). */
function drawPuffSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  x: number,
  y: number,
  r: number,
  alpha: number,
): void {
  if (alpha <= 0.004 || r <= 0.5) return
  ctx.globalAlpha = alpha
  ctx.drawImage(sprite, x - r, y - r, r * 2, r * 2)
}

// ---------------------------------------------------------------------------
// The cumulus sea — rows of sheep-backed puffs in perspective
// ---------------------------------------------------------------------------

export type CloudSeaOptions = {
  w: number
  h: number
  /** The sea's visual horizon; puff rows fill from here to the bottom. */
  horizonY: number
  /** Sun-lit crest colour / shadow between crests / distance-haze colour. */
  lit: string
  shade: string
  haze: string
  alpha: number
  /** Scroll — the sea streams past (near rows fastest: perspective). */
  t: number
  time: number
  /** Sun azimuth in px — crests brighten toward it. */
  sunX: number
  seed?: number
  /** How strongly scroll streams the sea horizontally (default gentle 0.055;
   *  scenes where scroll IS the forward motion pass much more). */
  drift?: number
  /** Reference height for row layout (count/spacing). Defaults to `h`; pass
   *  a CONSTANT when `h` itself animates (the looming deck), so puffs keep
   *  their lanes and only drift/size move — never a re-shuffle. */
  refH?: number
}

export function drawCloudSea(ctx: CanvasRenderingContext2D, o: CloudSeaOptions): void {
  if (o.alpha <= 0.004) return
  const seed = o.seed ?? 0
  const seaH = o.h - o.horizonY
  if (seaH <= 0) return

  // A bright haze wall sitting on the horizon, so the sea reads as endless.
  fillVerticalGradient(
    ctx,
    0,
    o.horizonY - seaH * 0.08,
    o.w,
    seaH * 0.34,
    [
      [0, rgba(o.haze, 0)],
      [0.4, rgba(o.haze, 0.55)],
      [1, rgba(o.haze, 0)],
    ],
    o.alpha,
  )

  const rows = 6
  ctx.save()
  for (let i = 0; i < rows; i++) {
    const d = (i + 1) / rows // 0+ at the horizon → 1 nearest
    const depth = Math.pow(d, 1.7)
    const y = o.horizonY + depth * seaH * 0.9
    const r = (0.022 + 0.13 * depth) * o.h
    // Layout (lanes/coverage) comes from the stable reference height, so a
    // growing sea (the approaching deck) scales sizes without re-shuffling.
    const spacing = (0.022 + 0.13 * depth) * (o.refH ?? o.h) * 1.55
    const count = Math.min(Math.ceil(o.w / spacing) + 2, 40)
    // NEGATIVE: the aircraft flies right, so the world streams right→left.
    const drift = -(o.t * (o.drift ?? 0.055) * (0.25 + depth) + o.time * 0.0016 * depth)
    const rowSeed = seed + i * 57.3
    // Far rows dissolve into the haze.
    const hazeMix = Math.pow(1 - d, 1.6) * 0.72
    const span = o.w + spacing * 2
    // Row-constant colours resolved to sprites ONCE: the shadow tone varies
    // only with hazeMix, and the lit tone only with the sun proximity —
    // quantized to 16 buckets (puffSprite itself quantizes channels to
    // 8 steps, so bucketed inputs collapse to essentially the same sprites).
    const shSprite = puffSprite(mixHex(o.shade, o.haze, hazeMix))
    const topSprites: (HTMLCanvasElement | undefined)[] = new Array(17)
    for (let k = 0; k < count; k++) {
      const u = (((k / count + drift + hash1(rowSeed + k * 7.7) * 0.5) % 1) + 1) % 1
      const x = u * span - spacing
      const jy = (hash1(rowSeed + k * 3.1) - 0.5) * r * 0.5
      const js = 0.72 + hash1(rowSeed + k * 11.7) * 0.55
      const sunProx = Math.exp(-Math.pow((x - o.sunX) / (o.w * 0.45), 2))
      const bucket = Math.round(sunProx * 16)
      let topSprite = topSprites[bucket]
      if (!topSprite) {
        topSprite = puffSprite(
          mixHex(mixHex(o.shade, o.lit, 0.45 + 0.55 * (bucket / 16)), o.haze, hazeMix),
        )
        topSprites[bucket] = topSprite
      }
      // Shadowed base first, then the lit sheep-back lobes.
      drawPuffSprite(ctx, shSprite, x, y + jy + r * 0.35 * js, r * 1.05 * js, o.alpha * 0.5)
      drawPuffSprite(ctx, topSprite, x - r * 0.5 * js, y + jy + r * 0.12, r * 0.6 * js, o.alpha * 0.85)
      drawPuffSprite(ctx, topSprite, x + r * 0.45 * js, y + jy + r * 0.15, r * 0.55 * js, o.alpha * 0.8)
      drawPuffSprite(ctx, topSprite, x, y + jy, r * 0.72 * js, o.alpha * 0.95)
    }
  }
  ctx.restore()
}

// ---------------------------------------------------------------------------
// The overhead deck — the layer the climb punches through, seen from below.
// A cloud CEILING is a cloud sea upside-down: same sheep-backed rows, same
// perspective (nearest lobes at the top of the frame, dissolving toward the
// ceiling horizon), painted through a vertical flip — so the deck carries
// the exact quality of the sea, in a darker, denser key.
// ---------------------------------------------------------------------------

export type CloudDeckOptions = {
  w: number
  h: number
  /** Where the deck's far edge (its "ceiling horizon") sits on screen; the
   *  ceiling fills everything above it. */
  edgeY: number
  /** Underside palette: lit = the lightest lobe faces, shade = the mass,
   *  haze = the distance tone at the ceiling horizon. */
  lit: string
  shade: string
  haze: string
  alpha: number
  /** Scroll — streams the ceiling past overhead (forward motion). */
  t: number
  time: number
  sunX: number
  seed?: number
}

export function drawCloudDeck(ctx: CanvasRenderingContext2D, o: CloudDeckOptions): void {
  if (o.alpha <= 0.004 || o.edgeY < -o.h * 0.05) return
  // Flip: sea-space bottom (nearest, biggest) maps to the top of the screen.
  // Sea horizon at 55% of the flipped viewport → ceiling horizon at edgeY.
  const H = o.edgeY / 0.45
  if (H <= 4) return
  // Dense body first — but a deep BLUE mass, not a black wall; the clouds
  // themselves (below + the extra scattered lobes) carry the darkness.
  fillVerticalGradient(
    ctx, 0, 0, o.w, o.edgeY,
    [
      [0, rgba('#2a3046', 0.92)],
      [0.7, rgba('#2a3046', 0.7)],
      [1, rgba('#2a3046', 0)],
    ],
    o.alpha,
  )
  // Extra grey lobes scattered through the body — more CLOUD, less wall.
  ctx.save()
  const seedX = (o.seed ?? 9) + 400
  for (let i = 0; i < 12; i++) {
    const hx = hash1(seedX + i * 7.1)
    const hy = hash1(seedX + i * 11.3)
    const hs = hash1(seedX + i * 3.7)
    const px = (((hx - o.t * 0.5 * (0.4 + hs * 0.6)) % 1.1) + 1.1) % 1.1 * o.w * 1.05 - o.w * 0.025
    const py = hy * o.edgeY * 0.75
    const r = o.h * (0.05 + hs * 0.07)
    const tone = mixHex('#5e5e6e', '#8a8a98', hash1(seedX + i * 5.9))
    drawPuff(ctx, px, py + r * 0.3, r, '#26262f', o.alpha * 0.5, 2.2)
    drawPuff(ctx, px, py, r * 0.8, tone, o.alpha * 0.55, 2)
  }
  ctx.restore()
  ctx.save()
  ctx.translate(0, o.edgeY)
  ctx.scale(1, -1)
  ctx.translate(0, -(H * 0.55))
  drawCloudSea(ctx, {
    w: o.w,
    h: H,
    horizonY: H * 0.55,
    lit: o.lit,
    shade: o.shade,
    haze: o.haze,
    alpha: o.alpha,
    t: o.t,
    time: o.time,
    sunX: o.sunX,
    seed: o.seed ?? 9,
    drift: 0.75,
    refH: o.h, // the screen height — constant while the deck looms closer
  })
  ctx.restore()
  // Solid mass above the nearest lobes so the ceiling never shows a gap.
  const capH = Math.max(o.edgeY - H * 0.38, 0)
  if (capH > 0) {
    fillVerticalGradient(
      ctx, 0, 0, o.w, capH,
      [
        [0, rgba(o.shade, 1)],
        [1, rgba(o.shade, 0)],
      ],
      o.alpha,
    )
  }
}
