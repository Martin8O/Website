/**
 * E1c — generate the Vertie scene document for the climb hero, plus the
 * image-based-lighting environment it needs.
 *
 *   node scripts/gen-vertie-climb.mjs
 *
 * Writes:
 *   public/climb/climb.json   — the authored sequence in the open format
 *   public/climb/morning.hdr  — the site's three-light morning rig, baked
 *
 * WHY THE BAKE. The Vertie format expresses lighting ONLY as an environment
 * map (spec §5: envMap / exposure / background — there is no light primitive
 * and no shadow map). The bespoke `ClimbHeroes` scene is lit by a real rig:
 * a warm key from the upper-left casting shadows, a cool hemisphere wrap and
 * a low fill. The two that survive translation — the key's DIRECTION and
 * COLOUR, and the hemisphere gradient — are baked here into one equirect, so
 * the player's IBL reproduces as much of the morning as the format can carry.
 * (Self-shadowing does NOT survive; that is the known gap E1c reports.)
 *
 * The document itself comes from `src/vertie/climbScene.ts` — a pure, tested
 * transform over the same `CLIMB_SEQ` the bespoke engine reads, bundled here
 * with esbuild so there is exactly one copy of the mapping rules.
 */

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as esbuild from 'esbuild'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT_DIR = resolve(ROOT, 'public/climb')

// ---------------------------------------------------------------------------
// the scene document
// ---------------------------------------------------------------------------

/** Bundle a three-free TS module and import it (no temp file on disk). */
async function importTs(entry) {
  const built = await esbuild.build({
    entryPoints: [resolve(ROOT, entry)],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
  })
  const code = Buffer.from(built.outputFiles[0].text).toString('base64')
  return import(`data:text/javascript;base64,${code}`)
}

// ---------------------------------------------------------------------------
// the morning environment (Radiance RGBE equirect)
// ---------------------------------------------------------------------------

/** Equirect resolution. Only lighting is sampled from it (the scene renders
 *  `background: "transparent"`), and PMREM blurs everything but the sharpest
 *  specular mip, so 256×128 is already more than the rig can express. */
const ENV_W = 256
const ENV_H = 128

/** The rig, verbatim from `ClimbHeroes.tsx`. */
const KEY_COLOR = [1.0, 0.9137, 0.7608] // 0xffe9c2
const KEY_INTENSITY = 2.15
const KEY_DIR = norm([-7, 6, 6])
/** Angular radius of the baked sun. A directional light is a point at
 *  infinity; a disc of solid angle Ω carrying radiance I/Ω delivers the same
 *  irradiance, so the diffuse response matches and only the specular
 *  highlight gains a (welcome) finite size. */
const KEY_ANGLE = 0.09

const HEMI_SKY = [0.7412, 0.8235, 0.9255] // 0xbdd2ec
const HEMI_GROUND = [0.2235, 0.2549, 0.3529] // 0x39415a
const HEMI_INTENSITY = 0.55

const FILL_COLOR = [0.5569, 0.6627, 0.7882] // 0x8ea9c9
const FILL_INTENSITY = 0.28
const FILL_DIR = norm([4, -6, 2])
const FILL_ANGLE = 0.35

function norm(v) {
  const l = Math.hypot(v[0], v[1], v[2])
  return [v[0] / l, v[1] / l, v[2] / l]
}

/** Radiance of a disc light of angular radius `a`, softened at the rim so a
 *  256-wide equirect does not alias the sun into a staircase. */
function disc(dot, a, intensity) {
  const cosA = Math.cos(a)
  if (dot <= cosA) return 0
  const solid = 2 * Math.PI * (1 - cosA)
  // smoothstep across the outer fifth of the disc
  const edge = Math.cos(a * 0.8)
  const f = dot >= edge ? 1 : smoothstep((dot - cosA) / (edge - cosA))
  return (intensity / solid) * f
}

function smoothstep(x) {
  const t = Math.min(Math.max(x, 0), 1)
  return t * t * (3 - 2 * t)
}

/**
 * Radiance arriving from direction `d` (a unit vector in room space).
 * Hemisphere wrap + the two discs — the same three terms the bespoke rig
 * adds, expressed as an environment instead of as lights.
 */
function radiance(d) {
  const mix = 0.5 * d[1] + 0.5
  const key = disc(d[0] * KEY_DIR[0] + d[1] * KEY_DIR[1] + d[2] * KEY_DIR[2], KEY_ANGLE, KEY_INTENSITY)
  const fill = disc(d[0] * FILL_DIR[0] + d[1] * FILL_DIR[1] + d[2] * FILL_DIR[2], FILL_ANGLE, FILL_INTENSITY)
  const out = [0, 0, 0]
  for (let c = 0; c < 3; c++) {
    out[c] =
      (HEMI_GROUND[c] + (HEMI_SKY[c] - HEMI_GROUND[c]) * mix) * HEMI_INTENSITY +
      KEY_COLOR[c] * key +
      FILL_COLOR[c] * fill
  }
  return out
}

/** Float RGB → the shared-exponent RGBE byte quadruple. */
function toRgbe(rgb, out, at) {
  const max = Math.max(rgb[0], rgb[1], rgb[2])
  if (max < 1e-32) {
    out[at] = out[at + 1] = out[at + 2] = out[at + 3] = 0
    return
  }
  const e = Math.ceil(Math.log2(max))
  const scale = 256 / Math.pow(2, e)
  out[at] = Math.min(255, Math.floor(rgb[0] * scale))
  out[at + 1] = Math.min(255, Math.floor(rgb[1] * scale))
  out[at + 2] = Math.min(255, Math.floor(rgb[2] * scale))
  out[at + 3] = e + 128
}

/**
 * Write a FLAT (non-RLE) Radiance file. three's HDRLoader takes the flat path
 * whenever a scanline does not open with the adaptive-RLE marker `2 2 hi lo`,
 * and it sets `flipY = true` on the resulting DataTexture — so image row 0 is
 * the TOP of the sky (`v = 1`, `y = +1`), the ordinary equirect convention.
 */
function buildHdr() {
  const header = `#?RADIANCE\nFORMAT=32-bit_rle_rgbe\nEXPOSURE=1.0\n\n-Y ${ENV_H} +X ${ENV_W}\n`
  const pixels = Buffer.alloc(ENV_W * ENV_H * 4)
  const d = [0, 0, 0]
  for (let r = 0; r < ENV_H; r++) {
    // flipY = true → row 0 is v = 1 (straight up)
    const v = 1 - (r + 0.5) / ENV_H
    const y = Math.sin((v - 0.5) * Math.PI)
    const rad = Math.sqrt(Math.max(0, 1 - y * y))
    for (let c = 0; c < ENV_W; c++) {
      const u = (c + 0.5) / ENV_W
      const phi = (u - 0.5) * 2 * Math.PI
      d[0] = Math.cos(phi) * rad
      d[1] = y
      d[2] = Math.sin(phi) * rad
      toRgbe(radiance(d), pixels, (r * ENV_W + c) * 4)
    }
  }
  // Guard the flat-vs-RLE sniff: the first pixel must not look like an RLE
  // scanline header (`2 2 hi lo` with hi < 0x80), or three would misparse the
  // whole file. The zenith sky is nowhere near that, but assert it anyway.
  if (pixels[0] === 2 && pixels[1] === 2 && (pixels[2] & 0x80) === 0) {
    throw new Error('first pixel collides with the RLE marker — nudge the sky colour')
  }
  return Buffer.concat([Buffer.from(header, 'ascii'), pixels])
}

// ---------------------------------------------------------------------------

const { buildClimbScene } = await importTs('src/vertie/climbScene.ts')
const { CLIMB_SEQ } = await importTs('src/three/climbSequence.ts')

const scene = buildClimbScene(CLIMB_SEQ)

await mkdir(OUT_DIR, { recursive: true })
await writeFile(resolve(OUT_DIR, 'climb.json'), JSON.stringify(scene, null, 2) + '\n')
const hdr = buildHdr()
await writeFile(resolve(OUT_DIR, 'morning.hdr'), hdr)

console.log(`climb.json   ${scene.tracks.length} tracks, duration ${scene.duration}`)
for (const t of scene.tracks) console.log(`  ${t.id.padEnd(10)} start ${String(t.start).padEnd(6)} keys ${t.keys.length}`)
console.log(`morning.hdr  ${ENV_W}×${ENV_H}, ${(hdr.length / 1024).toFixed(1)} kB`)
