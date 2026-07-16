/**
 * Shared surface-lift helpers for the GLB heroes — used by the patrols, the
 * ballet and the climb heroes alike (one module so the beats can never
 * disagree about the look machinery, and so no scene has to import another
 * scene just for a texture bake).
 *
 * Everything here is ASYNC + sliced across idle time on purpose: the bakes
 * and GPU uploads used to run synchronously inside the GLB onLoad callbacks,
 * blocking the main thread for hundreds of ms right when a model finished
 * downloading — mid-scroll jank and multi-second INP on slower machines. The
 * scenes only report readiness AFTER these finish, and the 2D world keeps
 * flying the hero until then (the designed fallback), so slicing changes
 * nothing visible — it only moves the work off the interaction path.
 */

import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildUrgent } from '../heroLoad'

/** One cooperative yield: idle callback when the browser offers one (so the
 *  work waits out any active scroll/interaction), with a timeout so it still
 *  progresses under continuous load; setTimeout fallback (Safari).
 *
 *  The timeout is PACED by build urgency (heroLoad): a background build far
 *  from the visitor yields generously (150 ms — mid-scroll frames stay clean;
 *  the flat 32 ms of the first mobile pass forced build work into scroll
 *  frames and traded smoothness for speed), while a build whose beat the
 *  visitor is approaching drops to 32 ms so it can never stall for a beat
 *  ("3D never loads"). True idle runs at full speed either way. */
export function idleSlice(): Promise<void> {
  return new Promise((resolve) => {
    const w = window as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    }
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(() => resolve(), { timeout: buildUrgent() ? 32 : 150 })
    } else {
      setTimeout(resolve, 0)
    }
  })
}

/** One RoomEnvironment PMREM bake per (renderer, sigma) for the whole
 *  session — the four hero beats used to bake four DUPLICATE environments,
 *  each a synchronous GPU pass on its load-kick frame. Keyed weakly by the
 *  renderer: a world-mode flip unmounts Stage3D and a re-mount brings a NEW
 *  renderer, so stale-context textures can never be served (the old ones go
 *  with their renderer). The texture intentionally lives for the renderer's
 *  lifetime — scenes must NOT dispose it on unmount. */
const roomEnvCache = new WeakMap<THREE.WebGLRenderer, Map<number, Promise<THREE.Texture>>>()

export function getRoomEnv(gl: THREE.WebGLRenderer, sigma: number): Promise<THREE.Texture> {
  let bySigma = roomEnvCache.get(gl)
  if (!bySigma) {
    bySigma = new Map()
    roomEnvCache.set(gl, bySigma)
  }
  let tex = bySigma.get(sigma)
  if (!tex) {
    tex = idleSlice().then(() => {
      const pmrem = new THREE.PMREMGenerator(gl)
      const t = pmrem.fromScene(new RoomEnvironment(), sigma).texture
      // The generator's internals are free to go — the baked target survives.
      pmrem.dispose()
      return t
    })
    bySigma.set(sigma, tex)
  }
  return tex
}

/** Sobel a texture's luminance into a subtle tangent-space normal map (the
 *  showcase's surface lift — panel-line relief from the paint's own dark
 *  lines; the sources ship baseColor only). The pixel loop runs in row slices
 *  with idle yields between them — never a single long main-thread task.
 *
 *  Cached MODULE-WIDE by source texture (was caller-local): the parsed GLBs are
 *  session-cached (loadModels), so a world-mode toggle that unmounts + remounts
 *  the 3D layer hands back the SAME texture objects — the cache then skips the
 *  whole Sobel bake on the re-mount, which was the bulk of the ~15 s "toggle to
 *  2D and back and 3D takes forever to reload" (mobile audit). */
const _normalCache = new WeakMap<THREE.Texture, Promise<THREE.Texture | null>>()

/** The bake policy + the dev-only A/B override.
 *
 *  SMALL SCREENS SKIP THE BAKE ENTIRELY (M-DEBUG, Martin: "mobil bez bake"):
 *  a 15-crop A/B review (`local/tmp/bake-ab`) found the relief imperceptible
 *  at phone aircraft sizes — the painted panel lines in the base colour carry
 *  the detail — while the bake cost ~30 s of the Bagram build's 37 s on a
 *  throttled mid-phone plus ~64 MB of normal-map memory. Same `small`
 *  predicate as the shadow-map sizes (BagramActors / CruiseBallet), read per
 *  bake: a phone stays small in both orientations. Desktop keeps the full
 *  1024 bake — unchanged by design (Martin's call).
 *
 *  Dev override (`?bakeCap=512&bakeRows=256`; `bakeCap=0` = none) beats the
 *  policy so the A/B tooling can force any variant on any viewport; the
 *  branch is tree-shaken out of prod builds. */
function bakeTuning(): { cap: number; rows: number } {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const q = new URLSearchParams(window.location.search)
    const cap = Number(q.get('bakeCap') ?? NaN)
    const rows = Number(q.get('bakeRows') ?? NaN)
    if (Number.isFinite(cap)) {
      return { cap, rows: Number.isFinite(rows) && rows > 0 ? rows : 64 }
    }
  }
  const small =
    typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 720
  return { cap: small ? 0 : 1024, rows: 64 }
}

export function normalFromMap(tex: THREE.Texture): Promise<THREE.Texture | null> {
  let cached = _normalCache.get(tex)
  if (!cached) {
    cached = bakeNormalFromMap(tex)
    _normalCache.set(tex, cached)
  }
  return cached
}

async function bakeNormalFromMap(tex: THREE.Texture): Promise<THREE.Texture | null> {
  const img = tex.image as { width?: number; height?: number } | undefined
  if (!img || !img.width || !img.height) return null
  const { cap, rows } = bakeTuning()
  if (cap <= 0) return null
  const w = Math.min(img.width, cap)
  const h = Math.min(img.height, cap)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(tex.image as CanvasImageSource, 0, 0, w, h)
  const src = ctx.getImageData(0, 0, w, h).data
  const out = ctx.createImageData(w, h)
  const lum = (x: number, y: number): number => {
    const i = (y * w + x) * 4
    return (src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11) / 255
  }
  const S = 2.2
  // ~64 rows per slice ≈ a few ms of work between yields at 1024².
  const ROWS_PER_SLICE = rows
  for (let y0 = 0; y0 < h; y0 += ROWS_PER_SLICE) {
    await idleSlice()
    const yEnd = Math.min(y0 + ROWS_PER_SLICE, h)
    for (let y = y0; y < yEnd; y++) {
      for (let x = 0; x < w; x++) {
        const xl = Math.max(x - 1, 0)
        const xr = Math.min(x + 1, w - 1)
        const yt = Math.max(y - 1, 0)
        const yb = Math.min(y + 1, h - 1)
        const dx = (lum(xl, y) - lum(xr, y)) * S
        const dy = (lum(x, yt) - lum(x, yb)) * S
        const nz = 1
        const len = Math.hypot(dx, dy, nz)
        const i = (y * w + x) * 4
        out.data[i] = ((dx / len) * 0.5 + 0.5) * 255
        out.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255
        out.data[i + 2] = (nz / len) * 255
        out.data[i + 3] = 255
      }
    }
  }
  ctx.putImageData(out, 0, 0)
  const nt = new THREE.CanvasTexture(c)
  nt.wrapS = tex.wrapS
  nt.wrapT = tex.wrapT
  nt.flipY = tex.flipY
  nt.needsUpdate = true
  return nt
}

// ---------------------------------------------------------------------------
// GPU parking (M-DEBUG 2026-07-15) — the four hero scenes stay MOUNTED for the
// whole session (Stage3D renders every registered theme), so once a visitor
// has scrolled past a beat its GLB textures, geometry buffers and shadow-map
// render targets sat on the GPU forever. On an 8-GB Apple-Silicon Mac that
// summed to a 2–3 GB Safari tab (reported on production). A scene far from
// its own chapter window now RELEASES its GPU copies; the CPU-side sources
// (image bitmaps, attribute arrays, canvases) stay, so three re-uploads
// automatically the next time a texture/geometry is bound — and the parker
// re-warms with `warmTextures` while the scene is still approaching, so a
// normal scroll never pays the upload inside the beat.
// ---------------------------------------------------------------------------

/** Textures SHARED between two live scenes (the l159 skin + its Sobel bake —
 *  the ballet and both patrol pairs clone the same base): parking one scene
 *  must never delete the other's live GPU copy, so shared maps are exempt —
 *  they cost ~25 MB and stay for the renderer's life, like the PMREM env. */
const _sharedGpuTex = new Set<THREE.Texture>()

/** A scene whose model base is cloned by ANOTHER scene calls this once after
 *  its instances are built (both callers mark the same objects — deduped). */
export function markSharedTextures(root: THREE.Object3D): void {
  root.traverse((n) => {
    const mesh = n as THREE.Mesh
    if (!mesh.isMesh) return
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const std = m as THREE.MeshStandardMaterial
      for (const t of [
        std.map,
        std.normalMap,
        std.emissiveMap,
        std.roughnessMap,
        std.metalnessMap,
        std.aoMap,
      ]) {
        if (t) _sharedGpuTex.add(t)
      }
    }
  })
}

/** Release every GPU-side resource under `root` that three can rebuild from
 *  its CPU source on the next bind: texture uploads (NOT the session PMREM
 *  env — render-target-backed, unrebuildable — and NOT shared maps),
 *  geometry VBOs (attribute arrays persist in JS), and shadow-map render
 *  targets (the renderer recreates one on the next shadow pass). Materials
 *  are NOT disposed — their compiled programs stay cached, so un-parking
 *  never pays a shader recompile. */
export function releaseSceneGpu(root: THREE.Object3D): void {
  root.traverse((n) => {
    const light = n as THREE.DirectionalLight
    if (light.isLight && light.shadow?.map) {
      light.shadow.map.dispose()
      light.shadow.map = null
    }
    const mesh = n as THREE.Mesh
    if (!mesh.isMesh && !(n as THREE.Points).isPoints && !(n as THREE.Sprite).isSprite) return
    mesh.geometry?.dispose()
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const m of mats) {
      if (!m) continue
      const std = m as THREE.MeshStandardMaterial
      for (const t of [
        std.map,
        std.normalMap,
        std.emissiveMap,
        std.roughnessMap,
        std.metalnessMap,
        std.aoMap,
        (m as unknown as THREE.SpriteMaterial).map,
      ]) {
        if (t && !_sharedGpuTex.has(t) && !(t as THREE.Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture) {
          t.dispose()
        }
      }
    }
  })
}

/** Park when the story is this many chapters outside the scene's own window
 *  (pos units); re-warm when it comes back within `PARK_IN`. The gap is the
 *  hysteresis (no thrash at a boundary), and PARK_IN stays comfortably wider
 *  than a beat's own fades, so a normal scroll re-uploads while the scene is
 *  still invisible. Both clear every hero LOAD_AT_POS kick threshold, so a
 *  fresh build is never parked before its own chapter. */
const PARK_OUT = 2.0
const PARK_IN = 1.6

export type GpuParker = {
  /** Once per frame from the scene's useFrame: `lo..hi` = the scene's run
   *  window in pos units, `ready` = the scene's models are built. */
  tick(pos: number, lo: number, hi: number, ready: boolean): void
  /** True while the GPU copies are released (verification probes). */
  parked(): boolean
  /** Unmount hook — stops a re-warm in flight from touching a dead scene. */
  dispose(): void
}

export function createGpuParker(gl: THREE.WebGLRenderer, root: THREE.Object3D): GpuParker {
  let state: 'live' | 'parked' | 'warming' = 'live'
  let dead = false
  return {
    tick(pos, lo, hi, ready) {
      if (dead || !ready) return
      if (state === 'live') {
        if (pos < lo - PARK_OUT || pos > hi + PARK_OUT) {
          releaseSceneGpu(root)
          state = 'parked'
        }
      } else if (state === 'parked' && pos > lo - PARK_IN && pos < hi + PARK_IN) {
        state = 'warming'
        void warmTextures(gl, root).finally(() => {
          if (!dead) state = 'live'
        })
      }
    },
    parked: () => state !== 'live',
    dispose() {
      dead = true
    },
  }
}

/** Push every texture under `root` to the GPU now (one per idle slice) —
 *  otherwise the first frame a hero turns visible pays the whole upload at
 *  once (the fast-scroll hitch at a beat's entry). Purely a warm-up: no
 *  visual effect, safe to run while the scene is still invisible. */
export async function warmTextures(
  gl: THREE.WebGLRenderer,
  root: THREE.Object3D,
  onStep?: (done: number, total: number) => void,
): Promise<void> {
  const texs: THREE.Texture[] = []
  root.traverse((n) => {
    const mesh = n as THREE.Mesh
    if (!mesh.isMesh) return
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const std = m as THREE.MeshStandardMaterial
      for (const t of [
        std.map,
        std.normalMap,
        std.emissiveMap,
        std.roughnessMap,
        std.metalnessMap,
        std.aoMap,
      ]) {
        if (t && !texs.includes(t)) texs.push(t)
      }
    }
  })
  for (let i = 0; i < texs.length; i++) {
    await idleSlice()
    gl.initTexture(texs[i])
    onStep?.(i + 1, texs.length)
  }
}
