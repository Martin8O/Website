/**
 * BAGRAM ACTORS (E4) — the chapter-03 hero beat the 3D layer OWNS: four real
 * baked GLB aircraft fly Martin's base-ops choreography over the panning 2D
 * desert (bagramMath.ts, screen-anchored + one flat ground model):
 *
 *  - C-17 lifts off near the tower small and distant, grows toward the
 *    viewer, climbs FIRST, then sweeps out the right edge mid-bank;
 *  - an APACHE PAIR blasts in through the left of the frame from behind the
 *    viewer and lands on the near-apron heliport — decel, flare, settle;
 *  - the Mi-17 (the ride out) waits on its tower-side pad, lifts, noses
 *    over and accelerates away LEFT — clear of the Apache flow;
 *  - an F-16 two-ship holds a distant racetrack overhead, TIME-driven (the
 *    ambient-ATC precedent): it keeps circling while the visitor reads.
 *
 * Hybrid, NOT 3D-owned: the 2D desert keeps painting the whole environment
 * (mountains, base, aprons, parked rows, the new heliports) and skips only
 * its four flying aircraft while this scene is live (`setHero3DReady`
 * 'desert'); in '2d' mode the original 2D story is the complete fallback.
 *
 * LOOK: the scene is BACKLIT — the white-hot sun hangs upper-right in frame
 * (sunArc ≈ 0.67/0.25 through the desert), so the key is a warm yellow
 * directional from up-right-front-of-deep, the skins sit dark against the
 * hot sky like the 2D silhouettes, and a sandy hemisphere + airlight haze
 * (per-material emissive wash rising with camera distance — additive, so it
 * brightens toward the sky the way real dust does) seat the actors in the
 * same atmosphere. Real shadow maps ride the closest hero (C-17 early, the
 * Apache lead after) for self-shadowing through the flare.
 *
 * TIME BASE: the desert run's own unclamped localT — the same clock the 2D
 * desert pans by — so the two layers cannot desync; the F-16 pattern alone
 * reads the frame's wall clock.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { clamp01 } from '../../canvas/toolkit'
import { runLocalTRaw } from '../../canvas/sceneTimeline'
import { setHero3DReady } from '../owned3d'
import {
  beginHeroLoad,
  bumpBuildUrgency,
  failHeroLoad,
  finishHeroLoad,
  reportHeroProgress,
  resetHeroLoad,
} from '../heroLoad'
import {
  CAM_H,
  GROUND_SLOPE,
  SIZE,
  apachePoseAt,
  c17PoseAt,
  createBagramPose,
  desertPresence,
  f16PoseAt,
  groundY,
  mi17PoseAt,
  type BagramPose,
} from '../bagramMath'
import type { Scene3DProps } from '../registry3d'
import { createGpuParker, getRoomEnv, idleSlice, warmTextures } from './surface'

type ActorId = 'c17' | 'apache' | 'f16' | 'mi17'

const MODEL_URLS: Record<ActorId, string> = {
  c17: '/models/c17.glb',
  apache: '/models/apache.glb',
  f16: '/models/f16.glb',
  mi17: '/models/mi17.glb',
}

/** Kick the ~5 MB fetch early in the climb — the desert fades in at pos
 *  3.344, TWO chapters of scroll after this trips (a brisk scroller must
 *  never catch the models mid-download inside the scene), and a visitor who
 *  stops earlier pays nothing. Staggered off the climb (0.15) and ballet
 *  (1.6) kicks so the fetches don't fight. */
const LOAD_AT_POS = 2.0

/** Seconds the 3D actors dissolve IN over when the hero first flips live. The
 *  flip now fires the instant the models are ready — IN PLACE, at whatever
 *  presence the visitor is at (Martin: when the 3D finishes while you're still
 *  in the scene it must APPEAR, never wait for you to leave and come back).
 *  The 2D hero hard-cuts off (its own `paintsHero2D` gate) while these fade in
 *  over this window, so the swap reads as a soft materialise, not a pop — the
 *  in-place replacement for the old "flip only while off-frame" guard. */
const FLIP_FADE_SEC = 0.45

/** GLB→canonical (nose −z, up +y) rest rotations — the lab's verified
 *  values (ROSTER): C-17/F-16 nose +z, Apache nose +x, Mi-17 canonical. */
const REST_Y: Record<ActorId, number> = {
  c17: Math.PI,
  apache: Math.PI / 2,
  f16: Math.PI,
  mi17: 0,
}

/** The key light — the 2D scene's own sun: yellow, high, ~1 o'clock (drawn
 *  upper-right at ≈ 0.67 w / 0.25 h), slightly in front of the actors →
 *  warm rim from up-right, camera sides in dusty shade (the 2D DNA). */
const KEY_DIR = new THREE.Vector3(0.42, 0.58, -0.5).normalize()
const KEY_INTENSITY = 2.4
/** The shadow rig is FIXED and LARGE, centred on the actor play area and wide
 *  enough to hold ALL of it at once (Martin R7: shadows must render EVERYWHERE
 *  — the old ±55 box tracked a moving midpoint, so a far C-17 or a close/low
 *  actor fell outside it and its shadow popped in and out). One ortho box
 *  covers the far take-off roll (z ≈ −140), the arriving/departing rotorcraft
 *  and the diving transport, so every silhouette always lands on the catcher.
 *  2048 map over the ±110 box (perf pass: was 4096/64 MB — PCFSoft's blur
 *  hides the halved texel density; verified A/B on the stands + landing). */
const SHADOW_CENTER = new THREE.Vector3(5, -5, -95)
const SHADOW_DIST = 185
const SHADOW_HALF = 110
const HEMI_INTENSITY = 0.62
/** REAL ground shadows (Martin): a transparent shadow-catcher plane lies in
 *  the scene's ground plane, so the sun projects true stretched silhouettes
 *  of the rotorcraft AND the diving C-17 onto the base. Its darkness. */
const SHADOW_ALPHA = 0.34
/** The catcher lives on its own layer: ShadowMaterial sums the shadow masks
 *  of EVERY shadow-casting light in the scene, and the other beats' rigs
 *  (ballet/patrols) keep zero-INTENSITY shadow lights alive — their maps
 *  smeared alien-direction blobs across the plane. On this layer only the
 *  desert key reaches it. */
const SHADOW_LAYER = 3

/** Dusty-noon material grade under the stage's flat output: skins darker and
 *  desaturated toward sand — they sit against a white-hot sky. */
const GRADE_MUL = new THREE.Color(0.9, 0.86, 0.79)
const ENV_INTENSITY = 0.5

/** Airlight: the haze colour the skins wash toward with camera distance
 *  (additive emissive — distance fades to the dusty horizon, the depth cue
 *  Martin specced). Pale desaturated dust — a warmer tone read as mud on
 *  the distant F-16s. Zero inside HAZE_D0, full wash ≈ HAZE_D1. */
const HAZE_COLOR = new THREE.Color('#8f8b7e')
const HAZE_D0 = 24
const HAZE_D1 = 230
const HAZE_MAX = 0.42
/** Per-actor haze scale: the C-17 is the HERO — it stays CRISP so it reads as
 *  a solid airframe in a LAYER in FRONT of the 2D mountains, never washed into
 *  them (Martin R7: it must not blend — the far take-off runway put it deeper,
 *  where the old 0.18 hazed it grey INTO the peaks; near-zero keeps it a sharp
 *  silhouette at any distance). The F-16 is the distant background actor — it
 *  hazes MORE so it settles into the dusty sky. */
const HAZE_SCALE: Record<ActorId, number> = { c17: 0.04, apache: 0.6, f16: 1.3, mi17: 0.6 }

type MatRec = {
  mat: THREE.MeshStandardMaterial
  baseOpacity: number
  baseTransparent: boolean
  /** Materials with authored emissive (nav lights…) skip the airlight. */
  hazeable: boolean
}

type SpinRec = { node: THREE.Object3D; axis: 'x' | 'y' | 'z'; speed: number }

type Instance = {
  pivot: THREE.Group
  mats: MatRec[]
  spins: SpinRec[]
  /** How far the model's lowest point (wheels/skids) sits BELOW the pivot,
   *  measured off the loaded GLB — the runtime lifts the pivot by this so a
   *  math pose of y = groundY (wheel reference) puts the wheels exactly on
   *  the ground (Martin: helos must SIT, not hover). */
  wheelLift: number
  /** Per-actor haze scale (HAZE_SCALE[id]). */
  hazeScale: number
}

type LoadedModel = { root: THREE.Group }

let modelsPromise: Promise<Record<ActorId, LoadedModel>> | null = null

function loadModels(onProgress?: (f: number) => void): Promise<Record<ActorId, LoadedModel>> {
  if (modelsPromise) return modelsPromise
  // Quantize-only GLBs (KHR_mesh_quantization) — no meshopt/WASM decoder,
  // the hardened CSP stays untouched (ADR-042). GLTFLoader is a DYNAMIC
  // import — kept out of the page-load parse/eval. The four models load
  // SEQUENTIALLY with an idle beat between them: with the post-load prefetch
  // (prefetchHeroes) every fetch is a cache hit, so a parallel load fired
  // four multi-hundred-ms GLB parses back to back — one long-task pile-up
  // right on the interaction path. `onProgress` feeds the HUD indicator.
  modelsPromise = import('three/examples/jsm/loaders/GLTFLoader.js').then(async ({ GLTFLoader }) => {
    const loader = new GLTFLoader()
    const ids = Object.keys(MODEL_URLS) as ActorId[]
    const out = {} as Record<ActorId, LoadedModel>
    let done = 0
    for (const id of ids) {
      await idleSlice()
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        loader.load(
          MODEL_URLS[id],
          resolve,
          (ev) => {
            const f = ev.total > 0 ? Math.min(ev.loaded / ev.total, 1) : 0
            onProgress?.((done + f) / ids.length)
          },
          reject,
        )
      })
      out[id] = { root: gltf.scene }
      done++
      onProgress?.(done / ids.length)
    }
    return out
  })
  // A failed fetch keeps the 2D actors flying (readiness never reported)
  // and lets a later mount retry instead of caching the rejection.
  modelsPromise.catch(() => {
    modelsPromise = null
  })
  return modelsPromise
}

/**
 * Build one flyable instance from a parsed GLB root: clone the node tree
 * (geometry shared), clone the MATERIALS (each ship hazes by its own
 * depth), grade the skins, collect spin pivots, wrap in rest + pivot.
 */
function makeInstance(
  id: ActorId,
  base: THREE.Group,
  env: THREE.Texture,
  shadows: boolean,
): Instance {
  const root = base.clone(true)
  const mats: MatRec[] = []
  const spins: SpinRec[] = []
  const cloned = new Map<THREE.Material, THREE.MeshStandardMaterial>()
  root.traverse((n) => {
    const spin = (n.userData as { spin?: SpinRec }).spin
    // C-17 engine fans stay STATIC (Martin R6: the spinning discs read wrong —
    // kill it). Only the rotorcraft rotors keep turning.
    if (spin && spin.axis && id !== 'c17') spins.push({ node: n, axis: spin.axis, speed: spin.speed })
    const mesh = n as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = shadows
    mesh.receiveShadow = shadows
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const out: THREE.Material[] = []
    for (const m of list) {
      let std = cloned.get(m)
      if (!std) {
        std = (m as THREE.MeshStandardMaterial).clone()
        cloned.set(m, std)
        if ('metalness' in std) {
          if (std.map) {
            std.map.anisotropy = 8
            std.metalness = 0.25
            std.roughness = 0.55
            // (Runtime Sobel normal bake RETIRED — ADR-066; models with
            // native normal maps keep them via the clone.)
          } else {
            std.metalness = 0.3
            std.roughness = 0.55
          }
          std.color?.multiply(GRADE_MUL)
          if ('envMap' in std) {
            std.envMap = env
            std.envMapIntensity = ENV_INTENSITY
          }
          std.needsUpdate = true
        }
        mats.push({
          mat: std,
          baseOpacity: std.opacity,
          baseTransparent: std.transparent,
          hazeable:
            !std.emissiveMap && (!std.emissive || (std.emissive.r === 0 && std.emissive.g === 0 && std.emissive.b === 0)),
        })
      }
      out.push(std)
    }
    mesh.material = Array.isArray(mesh.material) ? out : out[0]
  })
  // pivot (pose euler YXZ) → rest (GLB→canonical) → model root.
  const rest = new THREE.Group()
  rest.rotation.y = REST_Y[id]
  rest.add(root)
  const pivot = new THREE.Group()
  pivot.scale.setScalar(SIZE[id] / 10) // GLBs are baked 10-normalized
  pivot.rotation.order = 'YXZ'
  pivot.visible = false
  pivot.add(rest)
  // Measure the wheel line: the model's lowest point below the pivot at rest
  // (scale + rest applied, pose identity). The runtime lifts the pivot by
  // this so a grounded pose (y = groundY) touches the wheels down exactly.
  pivot.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(pivot)
  const wheelLift = Number.isFinite(box.min.y) ? -box.min.y : 0
  return { pivot, mats, spins, wheelLift, hazeScale: HAZE_SCALE[id] }
}

type BagramDevProbe = {
  ready: boolean
  presence: number
  t: number
  actors: Record<string, { alpha: number; sx: number; sy: number; d: number; bank: number; pitch: number; alt: number; rsx: number; rsy: number }>
  spinRot: number[]
  gl: { shadows: boolean }
  shadow: {
    map: boolean
    left: number
    light: number[]
    target: number[]
    catcherVisible: boolean
    catcherOpacity: number
    casters: number
  }
}

// Hot-path scratch — the frame loop allocates nothing.
const _pose = createBagramPose()
const _v = new THREE.Vector3()

/** Apply a bagram pose to an instance and report visibility. `groundLift`
 *  raises the pivot so the model's wheels sit at pose.y (0 for the airborne
 *  C-17/F-16 whose gear is retracted, inst.wheelLift for the rotorcraft). */
function applyPose(inst: Instance, pose: BagramPose, presence: number, groundLift = 0): boolean {
  const alpha = presence * pose.alpha
  const visible = alpha > 0.002
  inst.pivot.visible = visible
  if (!visible) return false
  inst.pivot.position.set(pose.x, pose.y + groundLift, pose.z)
  inst.pivot.rotation.set(pose.pitch, pose.heading, pose.bank)
  const dist = -pose.z
  const haze =
    HAZE_MAX * inst.hazeScale * Math.min(Math.max((dist - HAZE_D0) / (HAZE_D1 - HAZE_D0), 0), 1)
  for (const rec of inst.mats) {
    if (alpha >= 0.999) {
      rec.mat.opacity = rec.baseOpacity
      rec.mat.transparent = rec.baseTransparent
    } else {
      rec.mat.transparent = true
      rec.mat.opacity = rec.baseOpacity * alpha
    }
    if (rec.hazeable) {
      rec.mat.emissive.copy(HAZE_COLOR).multiplyScalar(haze)
    }
  }
  return true
}

export function BagramActors({ frame, flight }: Scene3DProps) {
  const res = useMemo(() => {
    const stage = new THREE.Group()

    // The desert light rig — the 2D scene's own sun as the key (see LOOK).
    // The shadow frustum is FIXED and WIDE (SHADOW_*): one ortho box, centred
    // on the play area and big enough to hold the far take-off roll, the helo
    // stands, the landing/departing rotorcraft AND the diving C-17 at once, so
    // every silhouette ALWAYS reaches the catcher (no popping as an actor
    // crosses a tracked-frustum edge).
    const key = new THREE.DirectionalLight(0xffe3a1, KEY_INTENSITY)
    key.castShadow = true
    const small = Math.min(window.innerWidth, window.innerHeight) < 720
    key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
    key.shadow.camera.near = SHADOW_DIST - SHADOW_HALF - 20
    key.shadow.camera.far = SHADOW_DIST + SHADOW_HALF + 30
    key.shadow.camera.left = -SHADOW_HALF
    key.shadow.camera.right = SHADOW_HALF
    key.shadow.camera.top = SHADOW_HALF
    key.shadow.camera.bottom = -SHADOW_HALF
    // Fixed pose: light SHADOW_DIST back along the sun vector from the play
    // centre, aimed at it. (Without an explicit box the shadow camera keeps
    // its default ±5 and nothing outside a 10-unit bubble ever casts.)
    key.position.copy(SHADOW_CENTER).addScaledVector(KEY_DIR, SHADOW_DIST)
    key.target.position.copy(SHADOW_CENTER)
    key.shadow.camera.updateProjectionMatrix()
    key.shadow.bias = -0.0006
    key.shadow.normalBias = 0.05
    stage.add(key)
    stage.add(key.target)
    // The shadow catcher: an invisible plane lying exactly in bagramMath's
    // ground plane (y = GROUND_SLOPE·z − CAM_H) — it renders ONLY the
    // shadows cast onto it, stretched by the sun's real direction.
    const catcherMat = new THREE.ShadowMaterial({ opacity: SHADOW_ALPHA })
    catcherMat.transparent = true
    catcherMat.depthWrite = false
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(520, 280), catcherMat)
    catcher.geometry.rotateX(-Math.PI / 2)
    // Tilted about its own centre — the centre must SIT on the ground plane
    // at its depth for y = GROUND_SLOPE·z − CAM_H to hold everywhere.
    const catcherZ = -110
    catcher.rotation.x = -Math.atan(GROUND_SLOPE)
    catcher.position.set(0, -CAM_H + GROUND_SLOPE * catcherZ, catcherZ)
    catcher.receiveShadow = true
    catcher.layers.set(SHADOW_LAYER)
    key.layers.enable(SHADOW_LAYER)
    stage.add(catcher)
    // Sandy wrap: hot pale sky above, sunbaked ground bounce below.
    const hemi = new THREE.HemisphereLight(0xf3e7c8, 0x8a7350, HEMI_INTENSITY)
    stage.add(hemi)
    // A whisper of cool fill from the left so the shaded flanks keep shape.
    const fill = new THREE.DirectionalLight(0xaeb8c4, 0.22)
    fill.position.set(-8, 3, 6)
    stage.add(fill)
    stage.add(fill.target)

    return {
      stage,
      key,
      hemi,
      fill,
      catcher,
      catcherMat,
      instances: null as Record<'c17', Instance> & Record<'apache' | 'f16' | 'mi17', Instance[]> | null,
    }
  }, [])

  const desertRun = useMemo(
    () => flight.runs.find((r) => r.theme === 'sky' && r.sky === 'desert') ?? null,
    [flight.runs],
  )

  const probe = useMemo<BagramDevProbe>(
    () => ({
      ready: false,
      presence: 0,
      t: 0,
      actors: {},
      spinRot: [0, 0],
      gl: { shadows: false },
      shadow: { map: false, left: 0, light: [0, 0, 0], target: [0, 0, 0], catcherVisible: false, catcherOpacity: 0, casters: 0 },
    }),
    [],
  )
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const host = window as unknown as { __bagram3d?: BagramDevProbe }
    host.__bagram3d = probe
    return () => {
      delete host.__bagram3d
    }
  }, [probe])

  const readyRef = useRef(false)
  /** Models ready AND the flip fired — only then do the 3D actors render and
   *  the 2D ones step aside. Fires in place the instant readiness lands. */
  const flippedRef = useRef(false)
  /** Wall-clock time the flip fired (−1 = not yet), for the dissolve-in. */
  const flipAtRef = useRef(-1)
  const loadKicked = useRef(false)
  const aliveRef = useRef(true)

  const gl = useThree((s) => s.gl)

  // Shadow maps (idempotent with the climb/ballet rigs — one stage flag).
  useEffect(() => {
    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.PCFSoftShadowMap
  }, [gl])

  // GPU parking (surface.ts): the heaviest hero (4 GLBs + a 2048² shadow
  // map) leaves the GPU when the story is far from ch-03; re-warmed on
  // approach, off the interaction path.
  const parker = useMemo(() => createGpuParker(gl, res.stage), [gl, res])

  const kickLoad = () => {
    if (loadKicked.current) return
    loadKicked.current = true
    beginHeroLoad('desert')
    loadModels((f) => reportHeroProgress('desert', f * 0.5))
      .then(async (models) => {
        if (!aliveRef.current) return
        // The session-shared RoomEnvironment bake (surface.ts) — was a
        // duplicate synchronous GPU pass per scene on its load-kick frame.
        const env = await getRoomEnv(gl, 0.04)
        if (!aliveRef.current) return
        reportHeroProgress('desert', 0.55)
        // One idle slice between instances: seven clone+grade passes in one
        // tick was its own main-thread block. (The pre-bake of panel-line
        // normal maps that used to run here is RETIRED — ADR-066: ~30 s of a
        // throttled mid-phone's 37 s build for a relief a 15-crop A/B could
        // not tell from the painted lines the base colour already carries.)
        let built = 0
        const build = async <T,>(make: () => T): Promise<T> => {
          await idleSlice()
          const made = make()
          reportHeroProgress('desert', 0.55 + (++built / 7) * 0.3)
          return made
        }
        const instances = {
          c17: await build(() => makeInstance('c17', models.c17.root, env, true)),
          mi17: [
            await build(() => makeInstance('mi17', models.mi17.root, env, true)),
            await build(() => makeInstance('mi17', models.mi17.root, env, true)),
          ],
          apache: [
            await build(() => makeInstance('apache', models.apache.root, env, true)),
            await build(() => makeInstance('apache', models.apache.root, env, true)),
          ],
          f16: [
            // The far speck pair casts nothing — not worth a shadow pass.
            await build(() => makeInstance('f16', models.f16.root, env, false)),
            await build(() => makeInstance('f16', models.f16.root, env, false)),
          ],
        }
        if (!aliveRef.current) return
        res.stage.add(instances.c17.pivot)
        for (const m of instances.mi17) res.stage.add(m.pivot)
        for (const a of instances.apache) res.stage.add(a.pivot)
        for (const f of instances.f16) res.stage.add(f.pivot)
        res.instances = instances
        // Push the textures to the GPU while the actors are still invisible
        // — entering the desert must never pay the upload mid-scroll.
        await warmTextures(gl, res.stage, (d, n) =>
          reportHeroProgress('desert', 0.85 + (d / n) * 0.14),
        )
        if (!aliveRef.current) return
        readyRef.current = true
        // The actual 2D→3D flip fires from the frame loop (in place, with the
        // FLIP_FADE_SEC dissolve) the moment it sees this readiness.
        finishHeroLoad('desert')
        if (import.meta.env.DEV) probe.ready = true
      })
      .catch((err) => {
        failHeroLoad('desert')
        if (import.meta.env.DEV) console.warn('bagram actors: model load failed —', err)
      })
  }

  useEffect(() => {
    aliveRef.current = true
    // Fresh load channel for this mount (the scene kicks its own build at
    // LOAD_AT_POS in the frame loop; a world-toggle remount reports honestly).
    resetHeroLoad('desert')
    return () => {
      aliveRef.current = false
      readyRef.current = false
      flippedRef.current = false
      flipAtRef.current = -1
      parker.dispose()
      setHero3DReady('desert', false)
      resetHeroLoad('desert')
      const inst = res.instances
      if (inst) {
        const all = [inst.c17, ...inst.mi17, ...inst.apache, ...inst.f16]
        for (const i of all) {
          res.stage.remove(i.pivot)
          for (const rec of i.mats) rec.mat.dispose()
        }
        res.instances = null
      }
      loadKicked.current = false
      res.catcher.geometry.dispose()
      res.catcherMat.dispose()
      // The env texture is the session-shared getRoomEnv bake — not disposed.
    }
    // `parker` is memoized on [gl, res]; `gl` is stable for the Canvas
    // lifetime, so [res] already covers every real change. Listing `parker`
    // would be a no-op in practice, but this effect tears down + rebuilds
    // the 3D scene — its dep list stays exactly as verified (ADR-061),
    // documented instead of obeyed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res])

  useFrame((state, delta) => {
    if (!loadKicked.current && frame.pos > LOAD_AT_POS) kickLoad()
    // The visitor is inside this hero's approach window and the build is not
    // done — let idleSlice run on the short timeout (finish over smoothness).
    if (!readyRef.current && loadKicked.current && frame.pos > LOAD_AT_POS) bumpBuildUrgency()
    if (desertRun) parker.tick(frame.pos, desertRun.start, desertRun.end + 1, readyRef.current)

    const t = desertRun ? runLocalTRaw(frame.pos, desertRun, flight.count) : 0
    const rawPresence = desertPresence(frame.slots, frame.count)
    // Flip 2D→3D the INSTANT the models are ready — in place, at whatever
    // presence the visitor is at (Martin: when the 3D finishes while you're
    // still in the scene it must APPEAR, not wait for you to scroll away and
    // back). The old off-frame guard stranded the beat in 2D for the whole
    // first visit whenever the idle-sliced build finished mid-scene (slow
    // phone, slow scroll) — and again after a world-mode toggle remount. The
    // swap (2D and 3D fly different paths) is hidden by a short fade-IN
    // (`flipFade`) rather than by catching an off-frame instant. No
    // auto-restart: the actors pick up at the live `t`.
    if (readyRef.current && !flippedRef.current) {
      flippedRef.current = true
      flipAtRef.current = frame.time
      setHero3DReady('desert', true)
    }
    // One-time dissolve-in envelope (smoothstepped), so the in-place hand-over
    // reads as a soft materialise instead of a hard pop; completes once and
    // stays 1 (re-armed only on a remount).
    const fLin = flipAtRef.current < 0 ? 0 : clamp01((frame.time - flipAtRef.current) / FLIP_FADE_SEC)
    const flipFade = fLin * fLin * (3 - 2 * fLin)
    const presence = flippedRef.current ? rawPresence : 0
    // The actors fade like the 2D world CONDENSES (alpha³ — desert.ts) × the
    // one-time flip dissolve: during the sweep-in/out they sink into the haze
    // with the scene, never shining at full strength over a half-faded base.
    const actorFade = presence * presence * presence * flipFade

    // Track the RENDER camera EXACTLY (position + orientation, including the
    // roll and the pointer micro-parallax it carries). A room-space actor is
    // then a child of a stage that coincides with the camera, so it projects
    // precisely as the 2D desert's STATIC 55° contain camera at the origin
    // would see the same room point — the 2D ground stands/marks and the 3D
    // wheels register to the pixel at any flight-camera drift (Martin: the
    // helos must sit ON the marks). Reconstructing the pose from frame.camera
    // instead drifted ~13 px (the roll-compose + parallax mismatch) and the
    // helos floated above their stands.
    res.stage.position.copy(state.camera.position)
    res.stage.quaternion.copy(state.camera.quaternion)

    const rigOn = presence > 0.002
    res.key.visible = rigOn
    res.hemi.visible = rigOn
    res.fill.visible = rigOn
    res.catcher.visible = rigOn
    res.catcherMat.opacity = SHADOW_ALPHA * actorFade

    const inst = res.instances
    if (!inst || !rigOn) {
      if (inst) {
        inst.c17.pivot.visible = false
        for (const m of inst.mi17) m.pivot.visible = false
        for (const a of inst.apache) a.pivot.visible = false
        for (const f of inst.f16) f.pivot.visible = false
      }
      if (import.meta.env.DEV) {
        probe.presence = presence
        probe.t = t
      }
      return
    }

    const camera = state.camera as THREE.PerspectiveCamera
    const aspect = camera.aspect
    // The camera must see the catcher's layer (idempotent bit-set).
    camera.layers.enable(SHADOW_LAYER)

    const record = (id: string, visible: boolean, groundLift = 0) => {
      if (!import.meta.env.DEV) return
      const p = (probe.actors[id] ??= { alpha: 0, sx: 0, sy: 0, d: 0, bank: 0, pitch: 0, alt: 0, rsx: 0, rsy: 0 })
      p.alpha = visible ? actorFade * _pose.alpha : 0
      p.d = -_pose.z
      p.bank = _pose.bank
      p.pitch = _pose.pitch
      // Altitude of the WHEELS above the ground plane at this depth — 0 means
      // wheels on the deck (the touchdown check).
      p.alt = _pose.y - groundY(-_pose.z)
      const half = Math.max(-_pose.z, 0.1) * Math.tan((camera.fov * Math.PI) / 360)
      p.sx = 0.5 + _pose.x / (2 * half * aspect)
      p.sy = 0.5 - (_pose.y + groundLift) / (2 * half)
      // REAL projection through the flight camera (the actual rendered
      // position, stage → world → NDC) — the ground-anchor alignment check
      // vs the 2D marks (which assume a STATIC origin camera).
      res.stage.updateWorldMatrix(true, false)
      _v.set(_pose.x, _pose.y, _pose.z)
      res.stage.localToWorld(_v)
      _v.project(camera)
      p.rsx = 0.5 + _v.x / 2
      p.rsy = 0.5 - _v.y / 2
    }

    // The shadow rig is FIXED (SHADOW_*, set once in the memo) — no per-frame
    // re-aim, so every actor stays inside one wide box and its silhouette
    // always reaches the catcher (Martin R7: shadows correct everywhere).

    // --- C-17 departure ------------------------------------------------------
    c17PoseAt(t, aspect, _pose)
    record('c17', applyPose(inst.c17, _pose, actorFade))

    // --- Apache pair (wheels touch the stand marks via wheelLift) ----------
    for (const ship of [0, 1] as const) {
      apachePoseAt(t, aspect, ship, _pose)
      const a = inst.apache[ship]
      record(ship === 0 ? 'apacheLead' : 'apacheWing', applyPose(a, _pose, actorFade, a.wheelLift), a.wheelLift)
    }

    // --- Mi-17 pair departure (wheels on the stand marks via wheelLift) ----
    for (const ship of [0, 1] as const) {
      mi17PoseAt(t, aspect, ship, _pose)
      const m = inst.mi17[ship]
      record(ship === 0 ? 'mi17a' : 'mi17b', applyPose(m, _pose, actorFade, m.wheelLift), m.wheelLift)
    }

    // --- F-16 holding pattern (wall clock — circles while the page rests) --
    for (const ship of [0, 1] as const) {
      f16PoseAt(frame.time, t, aspect, ship, _pose)
      record(ship === 0 ? 'f16a' : 'f16b', applyPose(inst.f16[ship], _pose, actorFade))
    }

    // Rotors + fans keep turning on every visible airframe (incl. the pairs
    // parked on the stands — engines running the whole beat).
    if (delta > 0) {
      const all = [inst.c17, ...inst.mi17, ...inst.apache, ...inst.f16]
      for (const i of all) {
        if (!i.pivot.visible) continue
        for (const s of i.spins) s.node.rotation[s.axis] += delta * s.speed
      }
    }

    if (import.meta.env.DEV) {
      probe.presence = presence
      probe.t = t
      probe.spinRot[0] = inst.apache[0].spins[0]?.node.rotation.y ?? 0
      probe.spinRot[1] = inst.mi17[0].spins[0]?.node.rotation.y ?? 0
      // C-17 fan spin (Martin: engines turn) — the 4 extracted FAN pivots.
      probe.spinRot[2] = inst.c17.spins[0]?.node.rotation.z ?? -1
      probe.spinRot[3] = inst.c17.spins.length
      probe.gl.shadows = gl.shadowMap.enabled
      probe.shadow.map = !!res.key.shadow.map
      probe.shadow.left = res.key.shadow.camera.left
      probe.shadow.light = [res.key.position.x, res.key.position.y, res.key.position.z]
      probe.shadow.target = [res.key.target.position.x, res.key.target.position.y, res.key.target.position.z]
      probe.shadow.catcherVisible = res.catcher.visible
      probe.shadow.catcherOpacity = res.catcherMat.opacity
      let casters = 0
      res.stage.traverse((n) => {
        if ((n as THREE.Mesh).isMesh && n.castShadow && n.visible) casters++
      })
      probe.shadow.casters = casters
    }
  })

  return <primitive object={res.stage} />
}
