/**
 * Shared surface-lift helpers for the GLB heroes — used by the patrols, the
 * ballet and the climb heroes alike (one module so the beats can never
 * disagree about the look machinery, and so no scene has to import another
 * scene just for a texture bake).
 *
 * Everything here is ASYNC + sliced across idle time on purpose: the builds
 * and GPU uploads used to run synchronously inside the GLB onLoad callbacks,
 * blocking the main thread for hundreds of ms right when a model finished
 * downloading — mid-scroll jank and multi-second INP on slower machines. The
 * scenes only report readiness AFTER these finish, and the 2D world keeps
 * flying the hero until then (the designed fallback), so slicing changes
 * nothing visible — it only moves the work off the interaction path.
 */

import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { whenStill } from '../../scroll/scrollStore'
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
    // The bake links its own programs synchronously (~0.4 s cold on ANGLE)
    // — let it land while the visitor is reading, not mid-scroll. Every
    // hero waits on it (each keeps its 2D stand-in meanwhile); a visitor who
    // never pauses for 6 s pays the freeze on whatever frame that is, as
    // before — but it is no longer brought forward into the first scroll.
    tex = whenStill(400, 6000).then(idleSlice).then(() => {
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

// (The runtime Sobel normal-map bake that used to live here is RETIRED —
// ADR-066. It computed panel-line relief from each model's base colour at
// load time; a 15-crop A/B review could not tell it from the painted lines
// the base colour already carries, while it cost ~30 s of a throttled
// mid-phone's 37 s Bagram build and ~96 MB of canvas textures. Models with
// NATIVE normal maps in their GLBs keep them — those were never touched.)

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

/** Textures SHARED between two live scenes (the l159 skin — the ballet and
 *  both patrol pairs clone the same base): parking one scene must never
 *  delete the other's live GPU copy, so shared maps are exempt — they cost
 *  ~25 MB and stay for the renderer's life, like the PMREM env. */
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
export const PARK_OUT = 2.0
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

// ---------------------------------------------------------------------------
// Shader-program warm-up — three links a material's program the first time it
// is DRAWN, synchronously inside that frame (≈70–100 ms per program on ANGLE /
// D3D11). A beat's entry needs 4–16 new programs at once, so a cold first
// visit froze 0.4–1.7 s at every 3D scene change (the browser's own shader
// disk cache is why a reload looked smooth). The hero scenes now hand their
// built stage to `warmPrograms` before reporting ready: every program the beat
// will ever draw is compiled ahead under KHR_parallel_shader_compile (off the
// main thread) and awaited without blocking — the 2D hero keeps flying until
// it resolves, exactly like an unfinished build.
// ---------------------------------------------------------------------------

/** userData key that marks a beat's own light rig (its key/fill/hemisphere,
 *  switched on only while the beat is live). Lights WITHOUT it are always in
 *  the scene's light set (the patrol rigs fade by intensity, never by
 *  visibility). The program key depends on the light COUNTS, so the warm-up
 *  rebuilds the exact sets the live frames will have. */
export const HERO_RIG = 'heroRig'

/** Tag a beat's rig lights (see HERO_RIG). */
export function tagRig(name: string, ...lights: THREE.Light[]): void {
  for (const l of lights) l.userData[HERO_RIG] = name
}

/** How a beat fades its materials in and out — each fade state is its own
 *  program set: 'blend' = classic opacity (a transparent DOUBLE-sided
 *  material draws in two passes, back then front, two programs, plus the
 *  opaque one at full presence); 'hash' = three's alphaHash dissolve. */
export type FadeMode = 'blend' | 'hash'

type ProgramLike = { isReady(): boolean }
type RendererProps = { get(o: object): { programs?: Map<string, ProgramLike> } }

function lightSignature(lights: readonly THREE.Light[]): string {
  let dir = 0
  let dirS = 0
  let hemi = 0
  let point = 0
  let pointS = 0
  let spot = 0
  let spotS = 0
  let other = 0
  for (const l of lights) {
    if ((l as THREE.DirectionalLight).isDirectionalLight) {
      dir++
      if (l.castShadow) dirS++
    } else if ((l as THREE.HemisphereLight).isHemisphereLight) hemi++
    else if ((l as THREE.PointLight).isPointLight) {
      point++
      if (l.castShadow) pointS++
    } else if ((l as THREE.SpotLight).isSpotLight) {
      spot++
      if (l.castShadow) spotS++
    } else other++
  }
  return `${dir}.${dirS}.${hemi}.${point}.${pointS}.${spot}.${spotS}.${other}`
}

/** The light sets a beat's materials can be drawn under: the always-on
 *  lights plus its own rig, plus — for a cross-fade — one neighbour rig on
 *  top (`own === null`: a beat without a rig of its own, drawn under the
 *  always-on set or with one rig present). Deduped by light counts, which is
 *  all the program key sees. */
function lightSets(scene: THREE.Scene, own: string | null): THREE.Light[][] {
  const always: THREE.Light[] = []
  const rigs = new Map<string, THREE.Light[]>()
  scene.traverse((o) => {
    const l = o as THREE.Light
    if (!l.isLight) return
    const tag = l.userData[HERO_RIG] as string | undefined
    if (tag === undefined) always.push(l)
    else rigs.set(tag, [...(rigs.get(tag) ?? []), l])
  })
  const base = own === null ? always : [...always, ...(rigs.get(own) ?? [])]
  const sets = [base]
  for (const [tag, lights] of rigs) if (tag !== own) sets.push([...base, ...lights])
  const seen = new Set<string>()
  return sets.filter((s) => {
    const sig = lightSignature(s)
    if (seen.has(sig)) return false
    seen.add(sig)
    return true
  })
}

/** The readiness poll's yield (a plain timer is fine here: the wait is
 *  GPU-bound, and a hidden tab draws nothing anyway). */
const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Compile — ahead of its first draw — every program `root` will need, under
 * every light set and fade state it can be drawn in, and resolve once the
 * GPU reports them all linked. Never rejects: a failure or a lost context
 * just resolves (the first draw then compiles as before). Materials are left
 * exactly as found.
 */
export async function warmPrograms(
  gl: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  root: THREE.Object3D,
  own: string | null,
  fade: FadeMode,
): Promise<void> {
  try {
    const mats = new Set<THREE.Material>()
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material
      if (!m) return
      for (const x of Array.isArray(m) ? m : [m]) mats.add(x)
    })
    const saved = [...mats].map((m) => ({ m, transparent: m.transparent, alphaHash: m.alphaHash }))
    const setFaded = (on: boolean) => {
      for (const s of saved) {
        if (fade === 'blend') s.m.transparent = on ? true : s.transparent
        else if ((s.m as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          // Only the airframes dissolve — the beat's sprites, trails and
          // HUD glass keep their one look.
          s.m.alphaHash = on ? true : s.alphaHash
          s.m.transparent = on ? false : s.transparent
        }
        s.m.needsUpdate = true
      }
    }
    // `compile` gathers lights from the TARGET's visible tree and from the
    // compiled root's. The root's own lights are shut out (its holder lists
    // none) and the target is the live scene with its light list replaced —
    // it keeps the scene's fog/environment, which also enter the key.
    // Compiled one drawable at a time against a small time budget per idle
    // slice: building a new program's shader text is itself main-thread
    // work (a whole beat in one call was a 100–160 ms task on a slow CPU).
    const drawables: THREE.Object3D[] = []
    root.traverse((o) => {
      if ((o as THREE.Mesh).material) drawables.push(o)
    })
    let one: THREE.Object3D | null = null
    const holder = {
      traverse: (cb: (o: THREE.Object3D) => void) => {
        if (one) cb(one)
      },
      traverseVisible: () => undefined,
    } as unknown as THREE.Object3D
    for (const lights of lightSets(scene, own)) {
      const target = Object.create(scene) as THREE.Scene
      target.traverseVisible = (cb) => {
        for (const l of lights) cb(l)
      }
      for (const faded of [true, false]) {
        await idleSlice()
        // Re-applied after every yield: the frames drawn in between leave a
        // beat that is not live yet alone, but nothing here relies on that.
        setFaded(faded)
        let sliceStart = performance.now()
        for (const d of drawables) {
          if (performance.now() - sliceStart > 6) {
            await idleSlice()
            setFaded(faded)
            sliceStart = performance.now()
          }
          if (gl.getContext().isContextLost()) return
          one = d
          gl.compile(holder, camera, target)
        }
      }
    }
    one = null
    // Hand every material back in its base state; the flagged update makes
    // its first real draw re-pick the (now warm) program for the live lights.
    setFaded(false)
    // Wait for the links without blocking (KHR_parallel_shader_compile;
    // without it every program reports ready at once and the first draw
    // waits as before). Patience: a stuck driver must not hold the beat.
    const props = gl.properties as unknown as RendererProps
    const pending: ProgramLike[] = []
    for (const m of mats) for (const p of props.get(m).programs?.values() ?? []) pending.push(p)
    const deadline = performance.now() + 15000
    while (pending.length > 0 && performance.now() < deadline) {
      if (gl.getContext().isContextLost()) return
      for (let i = pending.length - 1; i >= 0; i--) if (pending[i].isReady()) pending.splice(i, 1)
      if (pending.length > 0) await pause(32)
    }
  } catch {
    // A warm-up is never load-bearing — the first draw compiles as before.
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
