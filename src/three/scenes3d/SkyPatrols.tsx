/**
 * SKY PATROLS — the two locked L-159 flypast beats, flying REAL baked GLBs
 * (public/models/l159.glb — the showcase fixes baked: gear legs+wheels gone,
 * pylons + light meshes kept) over the 2D world, camera-glued. Pure additive
 * content: the 2D scenes paint their full environments and know nothing of
 * these jets — in '2d' mode the story simply plays without them (the
 * fallback contract).
 *
 *  - AIRSHOW HEAD-ON PASS (patrolMath.PASS): a clean GRAY two-ship in bright
 *    summer light straight at the crowd once the 2D display exits, display
 *    smoke on (white lead / red wing — the team's 2D colours, HOMOGENEOUS
 *    soft point-sprites, no ribbon artifacts), simultaneous mirrored 3/4
 *    vykrut → opposite knife-edge breaks — the crossing near-miss illusion.
 *  - LANDING BREAK (patrolMath.BREAK): an ARMED pair (tanks + AIM-9s hung
 *    under the real pylons at runtime) BLASTS THROUGH the observer from
 *    behind — huge first, rushing out over the field — and breaks right onto
 *    the downwind under the low red sun, wingtip vortices flashing through
 *    the turns, nav lights alive in the dusk.
 *
 * Choreography is pure math in `patrolMath.ts` (tested); this file is only
 * the three.js binding. `SkyScenes` is the registry's 'sky' entry — it also
 * mounts the chapter-02 one-circle fight (CruiseBallet) and the E3b-v2
 * climb heroes (ClimbHeroes — Martin's re-authored Part-1 sequence).
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Slot3D } from '../frame3d'
import {
  BREAK,
  PASS,
  airshowPassPose,
  createPatrolPose,
  landingBreakPose,
  passRailPoint,
  passU,
  screenOf,
  type PatrolPose,
} from '../patrolMath'
import type { Scene3DProps } from '../registry3d'
import { buildAIM9 } from './aim9'
// The remodelled 500 l tank (pointed ogive, matte grey, ventral fin) — the
// same store the cruise ballet hangs; the landing-break pair flies it too.
import { buildDropTank } from './droptank'
import { BagramActors } from './BagramActors'
import { ClimbHeroes } from './ClimbHeroes'
import { CruiseBallet } from './CruiseBallet'
import { JET_SCALE, REST_Y, TIP_X, loadL159 } from './l159'
import {
  beginHeroLoad,
  bumpBuildUrgency,
  failHeroLoad,
  finishHeroLoad,
  reportHeroProgress,
  resetHeroLoad,
} from '../heroLoad'
import { createGpuParker, getRoomEnv, idleSlice, markSharedTextures, normalFromMap, warmTextures } from './surface'

/** The registry's 'sky' entry: the two flypast beats, the chapter-02
 *  one-circle fight (CruiseBallet — the ballet showcase, ported), the
 *  E3b-v2 climb heroes (Martin's re-authored Ulla → Z-142 → L-39 sequence,
 *  physics-polished) and the chapter-03 Bagram base-ops actors
 *  (BagramActors — C-17 / Apache pair / F-16 holding / Mi-17). While a hero
 *  scene's models load, `cfg.hero3d` stays false for its mood and the 2D
 *  version keeps flying — the fallback contract. */
export function SkyScenes(props: Scene3DProps) {
  return (
    <>
      <SkyPatrols {...props} />
      <CruiseBallet {...props} />
      <ClimbHeroes {...props} />
      <BagramActors {...props} />
    </>
  )
}

/** Start fetching the 2 MB model only once the story nears the sky section —
 *  a visitor who never scrolls past the origin pays nothing. */
const LOAD_AT_POS = 3.1

/** Display smoke — the 2D display team's own colours (airshow.ts ribbons). */
const SMOKE_LEAD = '#f7f4ec'
const SMOKE_WING = '#e0483f'
const SMOKE_ALPHA = [0.1, 0.088] as const
/** The trail hangs a touch under the rail (smoke exits under the tailpipe). */
const SMOKE_DROP = 0.42
/** Points along each smoke trail — distributed by ARC LENGTH (not rail
 *  param) and DENSE enough that the overlapping sprites read as one
 *  continuous STREAM of smoke, never a row of puffs (Martin's catch,
 *  twice). Per-point alpha drops as density rises. */
const SMOKE_N = 300
/** Fine sampling for the arc-length rebase. */
const SMOKE_FINE = 480

/** Wingtip vortex trails (the break turns): sample count per tip and the
 *  history span in sunset-t — short-lived wisps that dissolve fast. The
 *  samples overlap 2–4× so the line is CONTINUOUS vapor, never a dotted
 *  string (Martin's catch, twice — per-point alpha drops to compensate). */
const VORTEX_N = 90
const VORTEX_SPAN = 0.022

/** Per-pair material grade. The pass pair flies in the airshow's bright
 *  summer light — the airframe stays its real GRAY; the dusk pair reads
 *  darker, sitting inside the sunset's own light. */
const GRADE_PASS = { mul: [0.97, 0.97, 0.97], envInt: 0.95 } as const
const GRADE_DUSK = { mul: [0.66, 0.58, 0.63], envInt: 0.4 } as const

// --- Soft point-sprite trail shaders ----------------------------------------
// One soft round sprite per sample, heavily overlapped = homogeneous smoke —
// no ribbon geometry, so no polygonal artifacts at any viewing angle.

const SMOKE_VERTEX = /* glsl */ `
  attribute float aT;
  attribute float aB;
  attribute vec3 aJit;
  uniform float uHead;
  uniform float uTrail;
  uniform float uSize;
  uniform float uGrow;
  uniform float uJitAmp;
  uniform float uScale;
  varying float vA;

  void main() {
    float rel = uHead - aT;
    float age = clamp(rel / uTrail, 0.0, 1.0);
    float head = smoothstep(-0.002, 0.01, rel);
    // aB equalizes screen coverage: the far approach packs many sprites
    // into few pixels (they'd pile up bright), the near after-pass spreads
    // them thin (they'd fade out) — baked per point from camera distance.
    vA = head * pow(1.0 - age, 1.35) * aB;
    // The plume FATTENS after the roll/cross (Martin: too narrow there).
    float wRamp = 1.0 + 1.8 * smoothstep(0.58, 0.85, aT);
    // Old smoke drifts and spreads along its baked jitter direction.
    vec3 p = position + aJit * (uJitAmp * (0.12 + age) * wRamp);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (0.35 + uGrow * age) * wRamp * uScale / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`

const SMOKE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  varying float vA;

  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float r = length(q) * 2.0;
    float soft = smoothstep(1.0, 0.18, r);
    gl_FragColor = vec4(uColor, uAlpha * vA * soft);
  }
`

const VORTEX_VERTEX = /* glsl */ `
  attribute float aA;
  attribute float aAge;
  uniform float uSize;
  uniform float uScale;
  varying float vA;

  void main() {
    vA = aA;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (0.45 + 1.9 * aAge) * uScale / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
  }
`

type MatRec = {
  mat: THREE.Material & { opacity: number; transparent: boolean }
  baseOpacity: number
  baseTransparent: boolean
}

type LightMats = {
  beacon: THREE.MeshStandardMaterial[]
  nav: THREE.MeshStandardMaterial[]
}

type JetInstance = {
  /** Outer pivot — pose position + orientation land here. */
  pivot: THREE.Group
  mats: MatRec[]
  lights: LightMats
  /** Wingtip star sprites (the pass pair) — warm white-yellow points with
   *  a four-ray sparkle, twinkling gently. */
  stars: THREE.Sprite[]
}

// The shared L-159 loader + model conventions live in `l159.ts` — one
// fetch+parse serves the patrols AND the cruise ballet.

// normalFromMap (the showcase's baseColor→normal surface lift) moved to the
// shared `surface.ts` — the climb heroes bake the same panel-line relief.

/** Shared wingtip-star texture: a soft warm core with four thin rays — the
 *  "mírný hvězdičkový efekt" on the tip lights. Baked once. */
let starTex: THREE.CanvasTexture | null = null
function tipStarTexture(): THREE.CanvasTexture {
  if (starTex) return starTex
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const ctx = c.getContext('2d')!
  const core = ctx.createRadialGradient(32, 32, 0, 32, 32, 13)
  core.addColorStop(0, 'rgba(255,248,222,1)')
  core.addColorStop(0.35, 'rgba(255,240,190,0.6)')
  core.addColorStop(1, 'rgba(255,240,190,0)')
  ctx.fillStyle = core
  ctx.fillRect(0, 0, 64, 64)
  ctx.lineCap = 'round'
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const ray = ctx.createLinearGradient(32, 32, 32 + dx * 30, 32 + dy * 30)
    ray.addColorStop(0, 'rgba(255,246,210,0.9)')
    ray.addColorStop(1, 'rgba(255,246,210,0)')
    ctx.strokeStyle = ray
    ctx.lineWidth = 2.4
    ctx.beginPath()
    ctx.moveTo(32, 32)
    ctx.lineTo(32 + dx * 30, 32 + dy * 30)
    ctx.stroke()
  }
  starTex = new THREE.CanvasTexture(c)
  return starTex
}

const _box = new THREE.Box3()
const _c = new THREE.Vector3()

/** Hang the generic stores under the REAL pylons — self-calibrating: each
 *  pylon mesh's own bounding box places its store (survives any re-bake).
 *  Inner pylons carry the 500 l tanks, outer rails the AIM-9s. */
function attachStores(root: THREE.Group): void {
  root.updateWorldMatrix(true, true)
  const hang = (
    pylonName: string,
    build: () => THREE.Object3D,
    drop: number,
    lead: number,
  ): void => {
    const pylon = root.getObjectByName(pylonName)
    if (!pylon) return
    _box.setFromObject(pylon)
    _box.getCenter(_c)
    const store = build()
    store.rotation.y = Math.PI // stores face the airframe's −X nose
    store.position.set(_c.x - lead, _box.min.y - drop, _c.z)
    root.add(store)
  }
  for (const side of ['L', 'R'] as const) {
    hang(`Pylon1${side}`, () => buildDropTank(2.35, 0.27), 0.23, 0)
    hang(`Pylon3${side}`, () => buildAIM9(2.4, 0.066), 0.1, 0.26)
  }
}

/** Meshes that must NEVER share a cloned material with the airframe (the
 *  bake's dedup merged look-alike materials, so a shared clone would tint
 *  the canopy red with the beacon — Martin's catch). */
const SPECIAL_MESH = /CanopyGlass|TankLights|NAVLight|Beacon|Formation/

/** Clone the parsed model into an independent instance: cloned materials
 *  (each jet fades on its own; light/glass meshes get UNIQUE clones), the
 *  showcase PBR lift, warm-white emissive tip/formation lights + the red
 *  spine beacon, optional stores; wrapped nose-forward under a pivot. */
function makeInstance(
  base: THREE.Group,
  armed: boolean,
  env: THREE.Texture,
  sharedNormal: { tex: THREE.Texture | null },
  grade: { mul: readonly [number, number, number]; envInt: number },
  tipStars: boolean,
): JetInstance {
  const model = base.clone(true)
  const mats: MatRec[] = []
  const lights: LightMats = { beacon: [], nav: [] }
  const cloned = new Map<THREE.Material, THREE.Material>()
  model.traverse((n) => {
    const mesh = n as THREE.Mesh
    if (!mesh.isMesh) return
    const name = n.name
    const special = SPECIAL_MESH.test(name)
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const out: THREE.Material[] = []
    for (const m of list) {
      let mine: THREE.Material
      if (special) {
        mine = m.clone() // unique — never tints another mesh
      } else {
        const hit = cloned.get(m)
        if (hit) {
          mine = hit
        } else {
          mine = m.clone()
          cloned.set(m, mine)
        }
      }
      out.push(mine)
    }
    mesh.material = Array.isArray(mesh.material) ? out : out[0]
    for (const m of out) {
      const std = m as THREE.MeshStandardMaterial
      if (!('metalness' in std)) continue
      if (/CanopyGlass|TankLights/.test(name)) {
        // Glass IS glass — clear, sharp, catching the sky.
        std.metalness = 0.9
        std.roughness = 0.08
        std.emissive?.setHex(0x000000)
      } else if (/NAVLight|Formation/.test(name)) {
        // Tip + formation lights burn warm WHITE-YELLOW (Martin).
        std.emissive = new THREE.Color(0xffe9a8)
        std.emissiveIntensity = 0
        std.metalness = 0.2
        std.roughness = 0.35
        lights.nav.push(std)
      } else if (/Beacon/.test(name)) {
        // The red anti-collision beacon on the spine — the only red lamp.
        std.emissive = new THREE.Color(0xff2a1e)
        std.emissiveIntensity = 0
        std.metalness = 0.2
        std.roughness = 0.35
        lights.beacon.push(std)
      } else if (std.map) {
        std.metalness = 0.35
        std.roughness = 0.42
        // The shared skin normal is PRE-baked (sliced, off the interaction
        // path) in kickLoad before any instance is built — cache read only.
        if (sharedNormal.tex && !std.normalMap) {
          std.normalMap = sharedNormal.tex
          std.normalScale = new THREE.Vector2(0.6, 0.6)
        }
      } else {
        std.metalness = 0.5
        std.roughness = 0.4
      }
      if (std.map) std.map.anisotropy = 8
      if (std.color) std.color.multiply(new THREE.Color(...grade.mul))
      std.envMap = env
      std.envMapIntensity = grade.envInt
      std.needsUpdate = true
    }
  })
  if (armed) attachStores(model)
  // Stores got standard materials too — grade + env them after attach.
  model.traverse((n) => {
    const mesh = n as THREE.Mesh
    if (!mesh.isMesh) return
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const std = m as THREE.MeshStandardMaterial
      if ('envMap' in std && !std.envMap) {
        std.color.multiply(new THREE.Color(...grade.mul))
        std.envMap = env
        std.envMapIntensity = grade.envInt
        std.needsUpdate = true
      }
      const rec = m as MatRec['mat']
      mats.push({ mat: rec, baseOpacity: rec.opacity, baseTransparent: rec.transparent })
    }
  })
  // Wingtip stars: additive four-ray sparkles pinned to the real tip-light
  // meshes (Box3-calibrated, like the stores) — "rozsviť ta světla".
  const stars: THREE.Sprite[] = []
  if (tipStars) {
    model.updateWorldMatrix(true, true)
    for (const nm of ['NAVLightGreen', 'NAVLightRed']) {
      const node = model.getObjectByName(nm)
      if (!node) continue
      _box.setFromObject(node)
      _box.getCenter(_c)
      const spr = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: tipStarTexture(),
          color: 0xfff3c0,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          opacity: 0,
        }),
      )
      spr.position.copy(_c)
      spr.scale.set(1.15, 1.15, 1)
      spr.renderOrder = 930
      model.add(spr)
      stars.push(spr)
    }
  }
  const rest = new THREE.Group()
  rest.rotation.y = REST_Y
  rest.add(model)
  const pivot = new THREE.Group()
  pivot.scale.setScalar(JET_SCALE)
  pivot.visible = false
  pivot.add(rest)
  return { pivot, mats, lights, stars }
}

type SmokeTrail = {
  points: THREE.Points
  mat: THREE.ShaderMaterial
  positions: Float32Array
  ts: Float32Array
  bs: Float32Array
}

/** A homogeneous smoke plume: SMOKE_N soft sprites baked along the pass
 *  rail (re-baked on aspect change), faded/grown by age off one uHead
 *  uniform — zero per-frame CPU. */
function buildSmoke(color: string, jet: 0 | 1): SmokeTrail {
  const positions = new Float32Array(SMOKE_N * 3)
  const ts = new Float32Array(SMOKE_N)
  const bs = new Float32Array(SMOKE_N).fill(1)
  const jit = new Float32Array(SMOKE_N * 3)
  const ph = jet * 2.7
  for (let i = 0; i < SMOKE_N; i++) {
    ts[i] = i / (SMOKE_N - 1)
    // SMOOTH low-frequency meander (two incommensurate sines): neighbours
    // drift TOGETHER, so the aging plume billows as one body — random
    // per-point scatter tore the stream into separated dots.
    const u = i * 0.055
    jit[i * 3] = Math.sin(u * 1.7 + ph) * 0.62 + Math.sin(u * 0.53 + 1.9 + ph) * 0.38
    jit[i * 3 + 1] = Math.sin(u * 1.13 + 0.8 + ph) * 0.5 + Math.sin(u * 0.31 + 4.2 + ph) * 0.35
    jit[i * 3 + 2] = Math.sin(u * 1.41 + 2.6 + ph) * 0.55
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aT', new THREE.BufferAttribute(ts, 1))
  geo.setAttribute('aB', new THREE.BufferAttribute(bs, 1))
  geo.setAttribute('aJit', new THREE.BufferAttribute(jit, 3))
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: SMOKE_VERTEX,
    fragmentShader: SMOKE_FRAGMENT,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uAlpha: { value: 0 },
      uHead: { value: 0 },
      uTrail: { value: 0.7 },
      uSize: { value: 1.15 },
      uGrow: { value: 2.8 },
      uJitAmp: { value: 0.5 },
      uScale: { value: 400 },
    },
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  points.renderOrder = 890
  points.visible = false
  return { points, mat, positions, ts, bs }
}

// Arc-length scratch for bakeSmoke (module-level, reused across bakes).
const _arcLen = new Float32Array(SMOKE_FINE + 1)
const _arcP: [number, number, number] = [0, 0, 0]
const _arcQ: [number, number, number] = [0, 0, 0]

/** Refill a smoke plume's spine from the pass rail at this aspect —
 *  EQUAL-ARC distribution: sample the rail finely, accumulate distances,
 *  then place the sprites evenly along the PATH (aT keeps each sprite's
 *  rail-u for the age math). The break's fast sweep gets exactly the same
 *  sprite density as the slow far approach — one continuous plume. */
function bakeSmoke(s: SmokeTrail, aspect: number, jet: 0 | 1): void {
  passRailPoint(0, aspect, jet, _arcP)
  _arcLen[0] = 0
  for (let i = 1; i <= SMOKE_FINE; i++) {
    passRailPoint(i / SMOKE_FINE, aspect, jet, _arcQ)
    _arcLen[i] =
      _arcLen[i - 1] +
      Math.hypot(_arcQ[0] - _arcP[0], _arcQ[1] - _arcP[1], _arcQ[2] - _arcP[2])
    _arcP[0] = _arcQ[0]
    _arcP[1] = _arcQ[1]
    _arcP[2] = _arcQ[2]
  }
  const total = _arcLen[SMOKE_FINE]
  let seg = 0
  for (let i = 0; i < SMOKE_N; i++) {
    const target = (i / (SMOKE_N - 1)) * total
    while (seg < SMOKE_FINE - 1 && _arcLen[seg + 1] < target) seg++
    const span = _arcLen[seg + 1] - _arcLen[seg]
    const f = span > 1e-6 ? (target - _arcLen[seg]) / span : 0
    const u = (seg + f) / SMOKE_FINE
    passRailPoint(u, aspect, jet, _arcP)
    s.positions[i * 3] = _arcP[0]
    s.positions[i * 3 + 1] = _arcP[1] - SMOKE_DROP
    s.positions[i * 3 + 2] = _arcP[2]
    s.ts[i] = u
    // Coverage equalizer: sprites per screen-pixel scale with camera
    // distance, so per-point alpha runs ∝ 1/d — the far approach stops
    // piling up bright, the near after-pass stops thinning out.
    s.bs[i] = Math.min(2.4, Math.max(0.35, 20 / Math.max(-_arcP[2], 4)))
  }
  const geo = s.points.geometry
  ;(geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
  ;(geo.getAttribute('aT') as THREE.BufferAttribute).needsUpdate = true
  ;(geo.getAttribute('aB') as THREE.BufferAttribute).needsUpdate = true
}

type VortexTrail = {
  points: THREE.Points
  mat: THREE.ShaderMaterial
  positions: Float32Array
  alphas: Float32Array
  ages: Float32Array
}

/** Wingtip condensation through the break turns: one dynamic point cloud
 *  (2 jets × 2 tips × VORTEX_N samples), positions + alphas rewritten each
 *  frame from the rail history, alive only while a wing is loaded. */
function buildVortex(): VortexTrail {
  const n = 2 * 2 * VORTEX_N
  const positions = new Float32Array(n * 3)
  const alphas = new Float32Array(n)
  const ages = new Float32Array(n)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aA', new THREE.BufferAttribute(alphas, 1))
  geo.setAttribute('aAge', new THREE.BufferAttribute(ages, 1))
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: VORTEX_VERTEX,
    fragmentShader: SMOKE_FRAGMENT, // same soft sprite; vA carries the alpha
    uniforms: {
      uColor: { value: new THREE.Color('#eef4fb') },
      uAlpha: { value: 0.22 },
      uSize: { value: 0.52 },
      uScale: { value: 400 },
    },
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  points.renderOrder = 892
  points.visible = false
  return { points, mat, positions, alphas, ages }
}

type PatrolProbe = {
  ready: boolean
  pass: { t: number; head: number; jets: { sx: number; sy: number; alpha: number; bank: number }[] }
  brk: { t: number; jets: { sx: number; sy: number; alpha: number; bank: number }[] }
}

// Hot-path scratch — the frame loop allocates nothing.
const _pose = createPatrolPose()
const _vpose = createPatrolPose()
const _fwd = new THREE.Vector3()
const _lookM = new THREE.Matrix4()
const _qLook = new THREE.Quaternion()
const _qRoll = new THREE.Quaternion()
const _qTip = new THREE.Quaternion()
const _tip = new THREE.Vector3()
const _ZERO = new THREE.Vector3(0, 0, 0)
const _WORLD_UP = new THREE.Vector3(0, 1, 0)

function slotOf(slots: readonly [Slot3D, Slot3D], count: number, sky: 'airshow' | 'sunset'): Slot3D | null {
  for (let i = 0; i < count; i++) if (slots[i].theme === 'sky' && slots[i].sky === sky) return slots[i]
  return null
}

/** Orientation of a patrol pose: nose down the forward, scripted roll about
 *  it — written into `q`. */
function poseQuat(pose: PatrolPose, q: THREE.Quaternion): void {
  _fwd.set(pose.fx, pose.fy, pose.fz)
  _lookM.lookAt(_ZERO, _fwd, _WORLD_UP)
  _qLook.setFromRotationMatrix(_lookM)
  _qRoll.setFromAxisAngle(_fwd, pose.bank)
  q.copy(_qRoll).multiply(_qLook)
}

export function SkyPatrols({ frame, flight }: Scene3DProps) {
  const res = useMemo(() => {
    // The stage rides the camera pose (no pointer parallax — that translation
    // stays the depth cue); children live in camera space (patrolMath).
    const stage = new THREE.Group()

    // --- Light rigs, faded per frame by each beat's presence --------------
    // Airshow: the sun stands to the RIGHT at the pair's level (Martin) —
    // a strong warm side key models the airframe (one flank lit, the other
    // shading away = plasticity), with just enough sky bounce + hemisphere
    // that the gray reads gray, never flat white.
    const passKey = new THREE.DirectionalLight(0xfff1d2, 0)
    passKey.position.set(42, 2, -18)
    stage.add(passKey, passKey.target)
    const passFill = new THREE.DirectionalLight(0xbcd4ea, 0)
    passFill.position.set(-20, 6, 18)
    stage.add(passFill, passFill.target)
    const passHemi = new THREE.HemisphereLight(0xbcd8f0, 0x6f8069, 0)
    stage.add(passHemi)
    // Sunset: the sun burns LOW-RIGHT and RED (Martin) — a deep red key
    // from ahead-right-below, violet dusk fill, a faint dusk hemisphere.
    const brkKey = new THREE.DirectionalLight(0xff4b28, 0)
    brkKey.position.set(30, -7, -44)
    stage.add(brkKey, brkKey.target)
    const brkFill = new THREE.DirectionalLight(0x4a3f68, 0)
    brkFill.position.set(-10, 12, 10)
    stage.add(brkFill, brkFill.target)
    const brkHemi = new THREE.HemisphereLight(0x5a4a6e, 0x241a20, 0)
    stage.add(brkHemi)

    const smoke = [buildSmoke(SMOKE_LEAD, 0), buildSmoke(SMOKE_WING, 1)]
    stage.add(smoke[0].points, smoke[1].points)
    const vortex = buildVortex()
    stage.add(vortex.points)

    return { stage, passKey, passFill, passHemi, brkKey, brkFill, brkHemi, smoke, vortex }
  }, [])

  // Jet instances arrive with the model: [0..1] clean pass pair,
  // [2..3] armed break pair.
  const jetsRef = useRef<JetInstance[] | null>(null)
  const loadKicked = useRef(false)
  const normalRef = useRef<{ tex: THREE.Texture | null }>({ tex: null })
  const aspectRef = useRef(0)

  const probe = useMemo<PatrolProbe>(
    () => ({
      ready: false,
      pass: { t: 0, head: 0, jets: [{ sx: 0, sy: 0, alpha: 0, bank: 0 }, { sx: 0, sy: 0, alpha: 0, bank: 0 }] },
      brk: { t: 0, jets: [{ sx: 0, sy: 0, alpha: 0, bank: 0 }, { sx: 0, sy: 0, alpha: 0, bank: 0 }] },
    }),
    [],
  )
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const host = window as unknown as { __patrol3d?: PatrolProbe }
    host.__patrol3d = probe
    return () => {
      delete host.__patrol3d
    }
  }, [probe])

  const gl = useThree((s) => s.gl)

  // GPU parking (surface.ts): both flypast pairs live inside the sunset
  // chapter — far from it their GPU copies are released and re-warmed on
  // approach. The l159 base maps are marked SHARED (the ballet clones the
  // same skin), so neither scene can park them from under the other.
  const sunsetRun = useMemo(
    () => flight.runs.find((r) => r.theme === 'sky' && r.sky === 'sunset') ?? null,
    [flight.runs],
  )
  const parker = useMemo(() => createGpuParker(gl, res.stage), [gl, res])

  // Deferred load: kicked from the frame loop when the story nears the sky
  // section; a failed fetch simply leaves the beats un-flown (2D-complete).
  const cleanupRef = useRef<(() => void) | null>(null)
  const kickLoad = () => {
    if (loadKicked.current) return
    loadKicked.current = true
    let alive = true
    beginHeroLoad('patrol')
    loadL159((f) => reportHeroProgress('patrol', f * 0.6))
      .then(async (base) => {
        if (!alive) return
        // The session-shared RoomEnvironment bake (surface.ts) — was a
        // duplicate synchronous GPU pass per scene on its load-kick frame.
        const env = await getRoomEnv(gl, 0.04)
        if (!alive) return
        reportHeroProgress('patrol', 0.65)
        // Pre-bake the shared skin normal (sliced across idle time) so the
        // instance builds below are pure cache reads — the bake used to run
        // synchronously inside the first makeInstance.
        if (!normalRef.current.tex) {
          let skin: THREE.Texture | null = null
          base.traverse((n) => {
            if (skin) return
            const mesh = n as THREE.Mesh
            if (!mesh.isMesh || SPECIAL_MESH.test(n.name)) return
            for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
              const std = m as THREE.MeshStandardMaterial
              if ('metalness' in std && std.map) {
                skin = std.map
                break
              }
            }
          })
          const nrm = skin ? await normalFromMap(skin) : null
          if (!alive) {
            nrm?.dispose()
            return
          }
          normalRef.current.tex = nrm
        }
        // One idle slice between clones — four clone+grade passes in one
        // tick was a main-thread block of its own.
        const specs = [
          { armed: false, grade: GRADE_PASS, stars: true },
          { armed: false, grade: GRADE_PASS, stars: true },
          { armed: true, grade: GRADE_DUSK, stars: false },
          { armed: true, grade: GRADE_DUSK, stars: false },
        ]
        const jets: JetInstance[] = []
        for (const s of specs) {
          await idleSlice()
          if (!alive) {
            for (const j of jets) {
              for (const rec of j.mats) rec.mat.dispose()
              for (const st of j.stars) st.material.dispose()
            }
            return
          }
          jets.push(makeInstance(base, s.armed, env, normalRef.current, s.grade, s.stars))
          reportHeroProgress('patrol', 0.7 + (jets.length / specs.length) * 0.12)
        }
        for (const j of jets) res.stage.add(j.pivot)
        jetsRef.current = jets
        // The l159 skin is cloned by the ballet too — its maps must never be
        // parked from under the other scene (surface.ts GPU parking).
        markSharedTextures(res.stage)
        // GPU warm-up while the jets are still invisible — a beat's first
        // frame must never pay the texture upload mid-scroll.
        await warmTextures(gl, res.stage, (d, n) =>
          reportHeroProgress('patrol', 0.82 + (d / n) * 0.17),
        )
        if (!alive) return
        finishHeroLoad('patrol')
        if (import.meta.env.DEV) probe.ready = true
      })
      .catch((err) => {
        failHeroLoad('patrol')
        if (import.meta.env.DEV) console.warn('sky patrols: model load failed —', err)
      })
    cleanupRef.current = () => {
      alive = false
    }
  }

  useEffect(() => {
    // Fresh load channel for this mount (the scene kicks its own build at
    // LOAD_AT_POS in the frame loop; a world-toggle remount reports honestly).
    resetHeroLoad('patrol')
    return () => {
      cleanupRef.current?.()
      parker.dispose()
      resetHeroLoad('patrol')
      const jets = jetsRef.current
      if (jets) {
        for (const j of jets) {
          res.stage.remove(j.pivot)
          for (const rec of j.mats) rec.mat.dispose()
          for (const s of j.stars) s.material.dispose()
        }
        jetsRef.current = null
      }
      normalRef.current.tex?.dispose()
      normalRef.current.tex = null
      // The env texture is the session-shared getRoomEnv bake — not disposed.
      for (const s of res.smoke) {
        s.points.geometry.dispose()
        s.mat.dispose()
      }
      res.vortex.points.geometry.dispose()
      res.vortex.mat.dispose()
      loadKicked.current = false
    }
  }, [res])

  useFrame((state, delta) => {
    void delta
    if (!loadKicked.current && frame.pos > LOAD_AT_POS) kickLoad()
    // Approaching the flypasts with the build unfinished — let idleSlice run
    // on the short timeout (finish over smoothness).
    if (!jetsRef.current && loadKicked.current && frame.pos > LOAD_AT_POS) bumpBuildUrgency()
    if (sunsetRun) parker.tick(frame.pos, sunsetRun.start, sunsetRun.end + 1, !!jetsRef.current)

    // Glue the stage to the flight pose (position + forward + bank, no
    // pointer parallax) — the camera-glued convention.
    const cam = frame.camera
    res.stage.position.set(cam.x, cam.y, cam.z)
    _fwd.set(cam.fx, cam.fy, cam.fz)
    _lookM.lookAt(_ZERO, _fwd, _WORLD_UP)
    res.stage.quaternion.setFromRotationMatrix(_lookM)
    if (cam.roll !== 0) {
      _qRoll.setFromAxisAngle(_fwd, -cam.roll)
      res.stage.quaternion.premultiply(_qRoll)
    }

    const camera = state.camera as THREE.PerspectiveCamera
    const aspect = camera.aspect
    if (Math.abs(aspect - aspectRef.current) > 0.004) {
      aspectRef.current = aspect
      bakeSmoke(res.smoke[0], aspect, 0)
      bakeSmoke(res.smoke[1], aspect, 1)
    }
    // Perspective point sizing: world units → pixels at z = 1.
    const pxScale =
      (state.size.height * state.viewport.dpr) /
      (2 * Math.tan((camera.fov * Math.PI) / 360))
    res.smoke[0].mat.uniforms.uScale.value = pxScale
    res.smoke[1].mat.uniforms.uScale.value = pxScale
    res.vortex.mat.uniforms.uScale.value = pxScale

    const airshow = slotOf(frame.slots, frame.count, 'airshow')
    const sunset = slotOf(frame.slots, frame.count, 'sunset')
    const jets = jetsRef.current

    // --- The head-on pass --------------------------------------------------
    const passT = airshow ? airshow.tRaw : 0
    const passLive = airshow !== null && passT > PASS.in - 0.05 && passT < PASS.out + 0.05
    let passGlow = 0
    for (let i = 0 as 0 | 1; i < 2; i = (i + 1) as 0 | 1) {
      const jet = jets ? jets[i] : null
      const sm = res.smoke[i]
      if (!passLive) {
        if (jet) jet.pivot.visible = false
        sm.points.visible = false
        if (import.meta.env.DEV) probe.pass.jets[i].alpha = 0
        continue
      }
      airshowPassPose(passT, aspect, i, _pose)
      passGlow = Math.max(passGlow, _pose.alpha)
      sm.points.visible = _pose.alpha > 0.002
      sm.mat.uniforms.uHead.value = passU(passT)
      sm.mat.uniforms.uAlpha.value = _pose.alpha * SMOKE_ALPHA[i]
      if (jet) {
        applyPose(jet, _pose)
        pulseLights(jet, frame.time, 1.1)
      }
      if (import.meta.env.DEV) {
        const s = screenOf(_pose.x, _pose.y, _pose.z, aspect)
        probe.pass.jets[i] = { sx: s.sx, sy: s.sy, alpha: _pose.alpha, bank: _pose.bank }
      }
    }
    if (import.meta.env.DEV) {
      probe.pass.t = passT
      probe.pass.head = passLive ? passU(passT) : 0
    }

    // --- The landing break ---------------------------------------------------
    const brkT = sunset ? sunset.t : 0
    const brkLive = sunset !== null && brkT > BREAK.enter - 0.03 && brkT < BREAK.kill + 0.02
    let brkGlow = 0
    for (let i = 0 as 0 | 1; i < 2; i = (i + 1) as 0 | 1) {
      const jet = jets ? jets[i + 2] : null
      if (!brkLive) {
        if (jet) jet.pivot.visible = false
        if (import.meta.env.DEV) probe.brk.jets[i].alpha = 0
        continue
      }
      landingBreakPose(brkT, aspect, i, _pose)
      brkGlow = Math.max(brkGlow, _pose.alpha)
      if (jet) {
        applyPose(jet, _pose)
        pulseLights(jet, frame.time, 3.2)
      }
      if (import.meta.env.DEV) {
        const s = screenOf(_pose.x, _pose.y, _pose.z, aspect)
        probe.brk.jets[i] = { sx: s.sx, sy: s.sy, alpha: _pose.alpha, bank: _pose.bank }
      }
    }
    if (import.meta.env.DEV) probe.brk.t = brkT

    // Wingtip vortices through the turns: rewrite the little cloud from the
    // rail history — alive only while a wing is loaded (|bank| high).
    if (brkLive) {
      let any = false
      for (let i = 0 as 0 | 1; i < 2; i = (i + 1) as 0 | 1) {
        for (let k = 0; k < VORTEX_N; k++) {
          const age = k / (VORTEX_N - 1)
          const tau = brkT - age * VORTEX_SPAN
          landingBreakPose(tau, aspect, i, _vpose)
          const load = Math.min(1, Math.max(0, (Math.abs(_vpose.bank) - 0.4) / 0.6))
          const a = load * Math.pow(1 - age, 1.6) * _vpose.alpha
          poseQuat(_vpose, _qTip)
          for (const side of [-1, 1] as const) {
            const idx = (i * 2 + (side === 1 ? 1 : 0)) * VORTEX_N + k
            _tip.set(side * TIP_X, 0.06, -0.2).applyQuaternion(_qTip)
            res.vortex.positions[idx * 3] = _vpose.x + _tip.x
            res.vortex.positions[idx * 3 + 1] = _vpose.y + _tip.y
            res.vortex.positions[idx * 3 + 2] = _vpose.z + _tip.z
            res.vortex.alphas[idx] = a
            res.vortex.ages[idx] = age
          }
          if (a > 0.01) any = true
        }
      }
      res.vortex.points.visible = any
      if (any) {
        const geo = res.vortex.points.geometry
        ;(geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
        ;(geo.getAttribute('aA') as THREE.BufferAttribute).needsUpdate = true
        ;(geo.getAttribute('aAge') as THREE.BufferAttribute).needsUpdate = true
      }
    } else {
      res.vortex.points.visible = false
    }

    // --- Light rigs follow the live beat ------------------------------------
    res.passKey.intensity = 1.5 * passGlow
    res.passFill.intensity = 0.5 * passGlow
    res.passHemi.intensity = 0.75 * passGlow
    res.brkKey.intensity = 1.35 * brkGlow
    res.brkFill.intensity = 0.35 * brkGlow
    res.brkHemi.intensity = 0.45 * brkGlow
  })

  return <primitive object={res.stage} />
}

/** Position + orient one jet from a patrol pose; material opacity rides the
 *  envelope. */
function applyPose(jet: JetInstance, pose: PatrolPose): void {
  const visible = pose.alpha > 0.002
  jet.pivot.visible = visible
  if (!visible) return
  jet.pivot.position.set(pose.x, pose.y, pose.z)
  poseQuat(pose, jet.pivot.quaternion)
  for (const rec of jet.mats) {
    if (pose.alpha >= 0.999) {
      rec.mat.opacity = rec.baseOpacity
      rec.mat.transparent = rec.baseTransparent
    } else {
      rec.mat.transparent = true
      rec.mat.opacity = rec.baseOpacity * pose.alpha
    }
  }
}

/** Beacon + nav emissives: the red spine beacon FLASHES (1.1 s cycle), the
 *  warm-white tip + formation lights hold steady — scaled by the scene
 *  (subtle in daylight, alive at dusk). Wingtip star sprites twinkle
 *  gently. Steady mid-glow when time is frozen. */
function pulseLights(jet: JetInstance, time: number, strength: number): void {
  const cyc = time > 0 ? (time % 1.1) / 1.1 : 0.05
  const flash = cyc < 0.13 ? 1 - cyc / 0.13 : 0
  for (const m of jet.lights.beacon) m.emissiveIntensity = strength * (0.2 + 2.6 * flash)
  for (const m of jet.lights.nav) m.emissiveIntensity = strength * 0.9
  for (let i = 0; i < jet.stars.length; i++) {
    const tw = time > 0 ? 0.78 + 0.22 * Math.sin(time * 6.3 + i * 2.1) : 0.9
    jet.stars[i].material.opacity = tw
  }
}
