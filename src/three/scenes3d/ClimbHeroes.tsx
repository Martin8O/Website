/**
 * CLIMB HEROES (E3b-v2) — the chapter-01 hero beat the 3D layer OWNS: the
 * real GLB aircraft of Martin's authored Part-1 sequence (Piper "Ulla" →
 * Z-142 stand-in PA-28 → L-39) fly ONE continuous climb below the cloud deck
 * of the stretched chapter (scrollWeight 2), and this layer's story ends
 * with the L-39 melting into the rising white-out (`heroClimbPunch`) at the
 * top of its amplified zoom. The canopy-rain transit then holds white, and
 * the RESTORED 2D wow beat takes over behind it (climbMath.ABOVE): the
 * silhouette punch-out over the sunlit sea, the L-159 unlock and the green
 * HUD — all painted by the 2D scene — carry the story to the hard cut into
 * chapter 02. The 2D scene keeps painting the whole environment — streaming
 * AGAINST the hero's own velocity — and only its painted below-deck hero
 * steps aside, ONLY while this scene is live (`setHero3DReady`).
 *
 * TIME BASE: the climb run's own localT (runLocalTRaw of the SHARED window) —
 * the same clock the 2D environment breathes by, so the two layers cannot
 * desync, and a future chapter re-weight stretches both together.
 *
 * LOOK: the 2D world down here is a cool morning under a closing ceiling —
 * the key is the SAME morning sun the 2D paints upper-left (climb.ts draws
 * it at 0.18 w / 0.2 h), warm against a blue-grey hemisphere wrap, REAL
 * shadow maps for self-shadowing (canopy on fuselage, wing roots), and its
 * intensity couples to the same `approach` dimming the 2D world suffers as
 * the deck closes in. Materials are graded UNDER THE STAGE'S FLAT (no tone
 * mapping) OUTPUT — the ballet/patrol precedent; a global ACES flip here
 * would silently re-grade every other verified beat.
 *
 * Framing is the choreo-lab's audience camera, reproduced relative to the E2
 * flight rig: an inner "room" group rides the camera pose (position + forward
 * + bank, WITHOUT the pointer micro-parallax — that translation stays the
 * depth cue), placed so the lab's display plane (x ±6 / y ±4 at z −3) exactly
 * CONTAINS in the viewport. Lab coordinates and quaternions apply verbatim.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { runLocalTRaw } from '../../canvas/sceneTimeline'
import { heroClimbPunch } from '../../canvas/scenes/sky/skyMath'
import { setHero3DReady } from '../owned3d'
import {
  CLIMB_SEQ,
  LAB_BOX,
  buildTrack,
  climbXScale,
  createClimbPose,
  heroPosAt,
  lifeAlpha,
  poseTrackAt,
  skyPresence,
  type AircraftTrack,
  type ClimbAircraft,
} from '../climbMath'
import type { Scene3DProps } from '../registry3d'
import { normalFromMap } from './surface'

const MODEL_URLS: Record<ClimbAircraft['id'], string> = {
  ulla: '/models/ulla.glb',
  z142: '/models/z142.glb',
  l39: '/models/l39.glb',
}

/** Start fetching the three GLBs early in scene 00 (Martin: the models
 *  should be loading while the origin still owns the frame, so the hero
 *  flip never lands mid-scene) — a visitor who never scrolls at all still
 *  pays nothing; the 2D silhouette hero keeps flying until the models are
 *  live (`setHero3DReady`). */
const LOAD_AT_POS = 0.15

/** The morning rig: key intensity at the open sky, dimmed by the same
 *  `approach` that steals the 2D world's light as the ceiling closes in
 *  (climb.ts `dim`), while the hemisphere RISES a touch — light inside a
 *  cloud base goes flat, not black. */
const KEY_INTENSITY = 2.15
const KEY_DIM = 0.45
const HEMI_BASE = 0.55
const HEMI_CLOUD_LIFT = 0.18
/** Direction the morning sun hangs in room space (upper-left, slightly in
 *  front — the 2D sun at 0.18 w / 0.2 h), and how far out the shadow key
 *  camp sits along it. */
const KEY_DIR = new THREE.Vector3(-7, 6, 6).normalize()
const KEY_DIST = 16

/** Morning material grade (flat output — no tone mapping): a whisper of the
 *  scene's cool blue in the skins, moderate env so highlights stay short of
 *  clipping. */
const GRADE_MUL = new THREE.Color(0.94, 0.96, 1.0)
const ENV_INTENSITY = 0.75

type MatRec = {
  mat: THREE.Material & { opacity: number; transparent: boolean }
  baseOpacity: number
  baseTransparent: boolean
}

type SpinRec = { node: THREE.Object3D; axis: 'x' | 'y' | 'z'; speed: number }

type LoadedModel = { root: THREE.Group; mats: MatRec[]; spins: SpinRec[] }

/** One session-wide load; remounts (reduced-motion flips) reuse the parse. */
let modelsPromise: Promise<Record<ClimbAircraft['id'], LoadedModel>> | null = null

function loadModels(): Promise<Record<ClimbAircraft['id'], LoadedModel>> {
  if (modelsPromise) return modelsPromise
  // No meshopt decoder: the GLBs are baked with quantize only (KHR_mesh_
  // quantization, read natively) — EXT_meshopt_compression's WASM+blob
  // decoder is blocked by the site's hardened CSP (bake.mjs bakes it out).
  const loader = new GLTFLoader()
  modelsPromise = Promise.all(
    (Object.keys(MODEL_URLS) as ClimbAircraft['id'][]).map(
      (id) =>
        new Promise<[ClimbAircraft['id'], LoadedModel]>((resolve, reject) => {
          loader.load(
            MODEL_URLS[id],
            (gltf) => {
              const root = gltf.scene
              const mats: MatRec[] = []
              const spins: SpinRec[] = []
              const seen = new Set<THREE.Material>()
              // Per-model normal-map cache — one Sobel bake per base texture.
              const normals = new Map<THREE.Texture, THREE.Texture | null>()
              root.traverse((n) => {
                const spin = (n.userData as { spin?: SpinRec }).spin
                if (spin && spin.axis) spins.push({ node: n, axis: spin.axis, speed: spin.speed })
                const mesh = n as THREE.Mesh
                if (!mesh.isMesh) return
                mesh.castShadow = true
                mesh.receiveShadow = true
                for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
                  if (seen.has(m)) continue
                  seen.add(m)
                  mats.push({
                    mat: m as MatRec['mat'],
                    baseOpacity: (m as MatRec['mat']).opacity,
                    baseTransparent: (m as MatRec['mat']).transparent,
                  })
                  const std = m as THREE.MeshStandardMaterial
                  if (!('metalness' in std)) continue
                  // The showcase PBR lift, graded for the cool morning: the
                  // paint's own dark panel lines become a subtle relief so
                  // the skins catch the low sun instead of reading flat.
                  if (std.map) {
                    std.map.anisotropy = 8
                    std.metalness = 0.32
                    std.roughness = 0.5
                    if (!normals.has(std.map)) normals.set(std.map, normalFromMap(std.map))
                    const nrm = normals.get(std.map)
                    if (nrm && !std.normalMap) {
                      std.normalMap = nrm
                      std.normalScale = new THREE.Vector2(0.55, 0.55)
                    }
                  } else {
                    std.metalness = 0.42
                    std.roughness = 0.5
                  }
                  std.color?.multiply(GRADE_MUL)
                  std.needsUpdate = true
                }
              })
              resolve([id, { root, mats, spins }])
            },
            undefined,
            reject,
          )
        }),
    ),
  ).then((pairs) => Object.fromEntries(pairs) as Record<ClimbAircraft['id'], LoadedModel>)
  // A failed fetch keeps the 2D hero flying (readiness never reported) and
  // lets a later mount retry instead of caching the rejection.
  modelsPromise.catch(() => {
    modelsPromise = null
  })
  return modelsPromise
}

// The unlock rings + type-name flashes live in the 2D layer now (climb.ts
// draws the 2D golden-ring language at the projected hero position —
// Martin's call; the v1 3D bubble + sprite tags are retired).

type AircraftRes = {
  aircraft: ClimbAircraft
  track: AircraftTrack
  pivot: THREE.Group
  model: LoadedModel | null
}

type ClimbDevProbe = {
  ready: boolean
  presence: number
  fog: number
  above: number
  t: number
  aircraft: Record<string, { alpha: number; x: number; y: number; z: number }>
  /** Prop spin angles — the harness samples twice to prove rotation. */
  spinRot: number[]
  hero: { x: number; y: number; z: number }
  gl: { toneMapping: number; exposure: number; outputColorSpace: string; shadows: boolean }
}

// Hot-path scratch — the frame loop allocates nothing.
const _pose = createClimbPose()
const _hero = createClimbPose()
const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _rolledUp = new THREE.Vector3()
const _lookM = new THREE.Matrix4()
const _v = new THREE.Vector3()
const _ZERO = new THREE.Vector3(0, 0, 0)
const _WORLD_UP = new THREE.Vector3(0, 1, 0)

export function ClimbHeroes({ frame, flight }: Scene3DProps) {
  const res = useMemo(() => {
    // stage rides the camera pose; room offsets lab space so the display
    // plane fills the viewport — children then use RAW lab coordinates.
    const stage = new THREE.Group()
    const room = new THREE.Group()
    stage.add(room)

    // The morning light rig. The KEY is the 2D scene's own sun — warm, from
    // the upper LEFT, slightly in front — and CASTS real shadows: the tight
    // frustum rides the active hero every frame, so the canopy shades the
    // spine and one wing shades the root exactly as the maneuver turns the
    // airframe through the light.
    const key = new THREE.DirectionalLight(0xffe9c2, KEY_INTENSITY)
    key.castShadow = true
    const small = Math.min(window.innerWidth, window.innerHeight) < 720
    key.shadow.mapSize.set(small ? 512 : 1024, small ? 512 : 1024)
    key.shadow.camera.near = KEY_DIST - 6
    key.shadow.camera.far = KEY_DIST + 8
    key.shadow.camera.left = -4.5
    key.shadow.camera.right = 4.5
    key.shadow.camera.top = 4.5
    key.shadow.camera.bottom = -4.5
    key.shadow.bias = -0.0004
    key.shadow.normalBias = 0.02
    room.add(key)
    room.add(key.target)
    // Cool morning wrap: pale blue sky above, the blue-grey countryside
    // below — keeps the shaded flanks alive without flattening the key.
    const hemi = new THREE.HemisphereLight(0xbdd2ec, 0x39415a, HEMI_BASE)
    room.add(hemi)
    // A faint bounce from below-right (the sunlit haze the 2D gradient
    // carries at the horizon) so bellies never go dead black.
    const fill = new THREE.DirectionalLight(0x8ea9c9, 0.28)
    fill.position.set(4, -6, 2)
    room.add(fill)
    room.add(fill.target)

    const aircraft: AircraftRes[] = CLIMB_SEQ.aircraft.map((a) => {
      const pivot = new THREE.Group()
      pivot.scale.setScalar(a.size / 10) // GLBs are baked 10-normalized
      pivot.visible = false
      room.add(pivot)
      return { aircraft: a, track: buildTrack(a), pivot, model: null }
    })
    const tracks = aircraft.map((r) => r.track)

    return { stage, room, aircraft, tracks, key, hemi, fill }
  }, [])

  const climbRun = useMemo(
    () => flight.runs.find((r) => r.theme === 'sky' && r.sky === 'climb') ?? null,
    [flight.runs],
  )

  const probe = useMemo<ClimbDevProbe>(
    () => ({
      ready: false,
      presence: 0,
      fog: 0,
      above: 0,
      t: 0,
      aircraft: {},
      spinRot: [0, 0, 0],
      hero: { x: 0, y: 0, z: 0 },
      gl: { toneMapping: -1, exposure: 0, outputColorSpace: '', shadows: false },
    }),
    [],
  )
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const host = window as unknown as { __climb3d?: ClimbDevProbe }
    host.__climb3d = probe
    return () => {
      delete host.__climb3d
    }
  }, [probe])

  const readyRef = useRef(false)
  const loadKicked = useRef(false)
  const envRef = useRef<{ env: THREE.Texture; pmrem: THREE.PMREMGenerator } | null>(null)
  const aliveRef = useRef(true)

  const gl = useThree((s) => s.gl)

  // Shadow maps for the morning key — enabled once for the whole stage (the
  // rig is culled with the scene's presence, so the shadow pass costs
  // nothing anywhere else in the story). Idempotent with the ballet's rig.
  useEffect(() => {
    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.PCFSoftShadowMap
  }, [gl])

  // Deferred load, kicked from the frame loop as the story nears the climb:
  // fetch + parse the GLBs, PMREM a RoomEnvironment for the skins, attach,
  // report readiness — the 2D hero steps aside only then. On any failure the
  // promise cache clears and readiness never fires — the 2D hero simply
  // keeps flying (the chunk-failure caveat, answered per hero).
  const kickLoad = () => {
    if (loadKicked.current) return
    loadKicked.current = true
    if (!envRef.current) {
      const pmrem = new THREE.PMREMGenerator(gl)
      envRef.current = { env: pmrem.fromScene(new RoomEnvironment(), 0.04).texture, pmrem }
    }
    const applyEnv = () => {
      const env = envRef.current?.env
      if (!env) return
      for (const r of res.aircraft) {
        if (!r.model) continue
        for (const rec of r.model.mats) {
          const std = rec.mat as unknown as THREE.MeshStandardMaterial
          if ('envMap' in std) {
            // Unconditional — the parse is session-cached, so a remount must
            // overwrite the env a previous unmount disposed.
            std.envMap = env
            std.envMapIntensity = ENV_INTENSITY
            std.needsUpdate = true
          }
        }
      }
    }
    loadModels().then(
      (models) => {
        if (!aliveRef.current) return
        for (const r of res.aircraft) {
          r.model = models[r.aircraft.id]
          r.pivot.add(r.model.root)
        }
        applyEnv()
        readyRef.current = true
        setHero3DReady('climb', true)
        if (import.meta.env.DEV) probe.ready = true
      },
      (err) => {
        if (import.meta.env.DEV) console.warn('climb heroes: model load failed —', err)
      },
    )
  }

  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      readyRef.current = false
      setHero3DReady('climb', false)
      for (const r of res.aircraft) {
        if (r.model) {
          r.pivot.remove(r.model.root)
          r.model = null
        }
      }
      loadKicked.current = false
      if (envRef.current) {
        envRef.current.env?.dispose()
        envRef.current.pmrem.dispose()
        envRef.current = null
      }
    }
  }, [res])

  useFrame((state, delta) => {
    const count = flight.count
    if (!loadKicked.current && frame.pos > LOAD_AT_POS) kickLoad()

    // The scene's clock: the climb run's own (unclamped) localT — the same
    // value the 2D climb environment paints by.
    const t = climbRun ? runLocalTRaw(frame.pos, climbRun, count) : 0

    // Presence: the sky world's share of the frame (the 2D cross-fade),
    // times the white-out swallow AND the punch-out — the 3D heroes end
    // INSIDE the white (heroClimbPunch: fog rises 0.63→0.703 through the
    // amplified zoom); above the deck the restored 2D silhouette story
    // flies, so this layer owns nothing there.
    const punch = heroClimbPunch(Math.min(Math.max(t, 0), 1))
    const presence = readyRef.current
      ? skyPresence(frame.slots, frame.count) * (1 - punch.fog) * (1 - punch.above)
      : 0

    // Light follows the world: the ceiling steals the key exactly as it dims
    // the 2D frame, while the hemisphere lifts a touch — cloud-base light is
    // flat, not dark. The whole rig is off when the scene is absent, so the
    // shadow pass never costs another chapter a millisecond.
    const rigOn = presence > 0.002
    res.key.visible = rigOn
    res.hemi.visible = rigOn
    res.fill.visible = rigOn
    if (rigOn) {
      res.key.intensity = KEY_INTENSITY * (1 - KEY_DIM * punch.approach)
      res.hemi.intensity = HEMI_BASE + HEMI_CLOUD_LIFT * punch.approach
    }

    // The camera pose WITHOUT the pointer micro-parallax — the room glues to
    // the flight rig; the parallax translation over it is the depth read.
    const cam = frame.camera
    res.stage.position.set(cam.x, cam.y, cam.z)
    _fwd.set(cam.fx, cam.fy, cam.fz)
    _right.crossVectors(_fwd, _WORLD_UP).normalize()
    _up.crossVectors(_right, _fwd)
    _rolledUp
      .copy(_up)
      .multiplyScalar(Math.cos(cam.roll))
      .addScaledVector(_right, Math.sin(cam.roll))
    _lookM.lookAt(_ZERO, _fwd, _rolledUp)
    res.stage.quaternion.setFromRotationMatrix(_lookM)

    // The lab audience camera, live: d places the display plane so it exactly
    // CONTAINS in the viewport (max of the two axes — the lab formula with
    // the full viewport height; the site has no timeline bar to duck under).
    const camera = state.camera as THREE.PerspectiveCamera
    const tanV = Math.tan((camera.fov * Math.PI) / 360)
    const dH = (LAB_BOX.Y1 - LAB_BOX.Y0) / 2 / tanV
    const dW = (LAB_BOX.X1 - LAB_BOX.X0) / 2 / (camera.aspect * tanV)
    res.room.position.z = -(LAB_BOX.PLANE_Z + Math.max(dH, dW))
    // Aspect-adaptive lateral spread (Martin: the maneuver spans the screen;
    // a phone portrait pulls it back in) — position-only, models unskewed.
    const xs = climbXScale(camera.aspect)

    // The shadow key rides the ACTIVE hero — one continuous flight, so the
    // frustum follows a single point and stays tight (crisp self-shadows).
    if (rigOn) {
      heroPosAt(res.tracks, t, _hero)
      const hx = _hero.p[0] * xs
      res.key.position.set(
        hx + KEY_DIR.x * KEY_DIST,
        _hero.p[1] + KEY_DIR.y * KEY_DIST,
        _hero.p[2] + KEY_DIR.z * KEY_DIST,
      )
      res.key.target.position.set(hx, _hero.p[1], _hero.p[2])
      if (import.meta.env.DEV) {
        probe.hero.x = hx
        probe.hero.y = _hero.p[1]
        probe.hero.z = _hero.p[2]
      }
    }

    for (const r of res.aircraft) {
      const a = r.aircraft
      const alpha = presence * lifeAlpha(a, t)
      const visible = alpha > 0.002 && r.model !== null
      r.pivot.visible = visible

      if (!visible) {
        if (import.meta.env.DEV) {
          const p = (probe.aircraft[a.id] ??= { alpha: 0, x: 0, y: 0, z: 0 })
          p.alpha = 0
        }
        continue
      }

      poseTrackAt(r.track, t, _pose)
      r.pivot.position.set(_pose.p[0] * xs, _pose.p[1], _pose.p[2])
      r.pivot.quaternion.set(_pose.q[0], _pose.q[1], _pose.q[2], _pose.q[3])

      if (r.model) {
        for (const rec of r.model.mats) {
          if (alpha >= 0.999) {
            rec.mat.opacity = rec.baseOpacity
            rec.mat.transparent = rec.baseTransparent
          } else {
            rec.mat.transparent = true
            rec.mat.opacity = rec.baseOpacity * alpha
          }
        }
        if (visible && delta > 0) {
          for (const s of r.model.spins) s.node.rotation[s.axis] += delta * s.speed
        }
      }

      if (import.meta.env.DEV) {
        const p = (probe.aircraft[a.id] ??= { alpha: 0, x: 0, y: 0, z: 0 })
        p.alpha = alpha
        _v.copy(r.pivot.position)
        res.room.localToWorld(_v)
        _v.project(state.camera)
        p.x = _v.x
        p.y = _v.y
        p.z = _v.z
      }
    }

    if (import.meta.env.DEV) {
      probe.presence = presence
      probe.fog = punch.fog
      probe.above = punch.above
      probe.t = t
      res.aircraft.forEach((r, i) => {
        probe.spinRot[i] = r.model?.spins[0]?.node.rotation[r.model.spins[0].axis] ?? 0
      })
      probe.gl.toneMapping = gl.toneMapping
      probe.gl.exposure = gl.toneMappingExposure
      probe.gl.outputColorSpace = String(gl.outputColorSpace)
      probe.gl.shadows = gl.shadowMap.enabled
    }
  })

  return <primitive object={res.stage} />
}
