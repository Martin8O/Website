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
  const w = Math.min(img.width, 1024)
  const h = Math.min(img.height, 1024)
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
  const ROWS_PER_SLICE = 64
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
