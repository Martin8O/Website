/**
 * CRUISE BALLET — the chapter-02 one-circle fight flown by REAL baked GLBs:
 * the l159-ballet-3d showcase ported over the live 2D cruise scene. Two
 * stores-laden L-159s (500 l tanks on the inner pylons, AIM-9s on the outer
 * rails — the shared procedural stores) corkscrew a shared vertical axis,
 * every attitude derived by the coordinated-turn model in `balletMath.ts`.
 *
 * Framing is the showcase's ORBIT variant: a virtual camera circles the
 * fight at Martin's locked distance (46 through the 44°→55° FOV change),
 * tracking the climbing centroid — implemented camera-glued by inverting
 * the virtual camera's matrix onto the ballet group, so the real Stage3D
 * camera keeps flying its path untouched. Because the view climbs WITH the
 * pair, the climb reads through the environment: the 2D cloud sea sinks
 * (cruise.ts shares `cloudSink`), the wingtip vapour trails stream away
 * below, and a few 3D wisps drift down past the airframes.
 *
 * Light: the scene's sun stands top-centre (skyMath.sunArc), so a hard
 * near-vertical key models the airframes — top-lit skins, undersides in
 * shade, REAL shadow maps dropping one jet's shadow onto the other through
 * the close passes (the showcase's noon rig). The whole rig fades with the
 * beat's presence envelope; the 2D solo L-159 hands over in the same
 * crossfade (owned3d `HERO_3D` gates only the 2D corkscrew).
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Slot3D } from '../frame3d'
import { FOV_TAN, screenOf } from '../patrolMath'
import type { Scene3DProps } from '../registry3d'
import { setHero3DReady } from '../owned3d'
import { HUD_TEX_W, bvrPicture, drawCockpitHud } from '../../canvas/scenes/sky/hud'
import {
  balletCam,
  balletFlow,
  balletPose,
  balletPresence,
  createBalletCam,
  createBalletPose,
  cruiseHud,
} from './balletMath'
import { JET_SCALE, REST_Y, TIP_X, loadL159 } from './l159'
import {
  beginHeroLoad,
  bumpBuildUrgency,
  failHeroLoad,
  finishHeroLoad,
  reportHeroProgress,
  resetHeroLoad,
} from '../heroLoad'
import { getRoomEnv, idleSlice, warmTextures } from './surface'
import { buildAIM9 } from './aim9'
import { buildDropTank } from './droptank'

/** Kick the shared model fetch early in the climb — the ballet fades in at
 *  21 % (pos ≈ 2.58), a whole chapter of scroll after this trips. */
const LOAD_AT_POS = 1.6

/** Both jets fly ONE neutral airframe grey — a matched two-ship, no tint.
 *  Graded down for the flat (no-tone-mapping) stage: the showcase flew
 *  under ACES which compressed the noon highlights; without it the same
 *  values washed the skins white against the bright 2D sky. */
const GRAY = new THREE.Color('#a8aeb6')
const ENV_INTENSITY = 0.65

/** Wingtip vapour — the showcase's faint wisps streaming off each tip,
 *  laid down at FIXED flow-intervals so the stream stays CONTINUOUS whether
 *  the scroll creeps or jumps a whole step (never a row of puffs). */
const TRAIL_N = 460
const TRAIL_LIFE = 2.3
const TRAIL_DFLOW = 0.008
const TRAIL_ALPHA = 0.17
const TIP_SMOKE = '#eef4fb'

const TRAIL_VERTEX = /* glsl */ `
  attribute float aT;
  uniform float uNow; uniform float uLife; uniform float uSize; uniform float uScale;
  varying float vA;
  void main() {
    float age = (uNow - aT) / uLife;
    // Fade in fast off the tip, then dissolve HARD with age: the tail must
    // be gone before the sprites balloon, or the last puffs read as big
    // ROUND smudges against the white cloud deck (Martin's catch) instead
    // of vapour thinning to nothing.
    vA = smoothstep(0.0, 0.06, age) * pow(clamp(1.0 - age, 0.0, 1.0), 2.3);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * (0.6 + 1.4 * age) * uScale / max(-mv.z, 0.1);
    gl_Position = projectionMatrix * mv;
    if (age < 0.0 || age > 1.0) gl_Position.w = -1.0; // cull unborn/dead
  }
`

const TRAIL_FRAGMENT = /* glsl */ `
  uniform vec3 uColor; uniform float uAlpha; varying float vA;
  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float soft = smoothstep(1.0, 0.16, length(q) * 2.0);
    gl_FragColor = vec4(uColor, uAlpha * vA * soft);
  }
`

type MatRec = {
  mat: THREE.Material & { opacity: number; transparent: boolean }
  baseOpacity: number
  baseTransparent: boolean
  /** Currently in the hashed-dissolve state (see applyFade). */
  hashed: boolean
}

type LightMats = {
  beacon: THREE.MeshStandardMaterial[]
  nav: THREE.MeshStandardMaterial[]
}

type JetInstance = {
  pivot: THREE.Group
  mats: MatRec[]
  lights: LightMats
}

type Trail = {
  points: THREE.Points
  mat: THREE.ShaderMaterial
  positions: Float32Array
  ts: Float32Array
  head: number
}

/** Soft radial puff for the drifting wisps — baked once, module-shared. */
let puffTex: THREE.CanvasTexture | null = null
function puffTexture(): THREE.CanvasTexture {
  if (puffTex) return puffTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,255,255,0.95)')
  grd.addColorStop(0.45, 'rgba(240,247,255,0.6)')
  grd.addColorStop(1, 'rgba(220,235,250,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  puffTex = new THREE.CanvasTexture(c)
  return puffTex
}

function makeTrail(): Trail {
  const positions = new Float32Array(TRAIL_N * 3)
  const ts = new Float32Array(TRAIL_N).fill(-1e9)
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
  geo.setAttribute('aT', new THREE.BufferAttribute(ts, 1).setUsage(THREE.DynamicDrawUsage))
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: TRAIL_VERTEX,
    fragmentShader: TRAIL_FRAGMENT,
    uniforms: {
      uColor: { value: new THREE.Color(TIP_SMOKE) },
      uAlpha: { value: 0 },
      uNow: { value: 0 },
      uLife: { value: TRAIL_LIFE },
      uSize: { value: 0.95 },
      uScale: { value: 500 },
    },
  })
  const points = new THREE.Points(geo, mat)
  points.frustumCulled = false
  points.renderOrder = 888
  return { points, mat, positions, ts, head: 0 }
}

function emitTrail(tr: Trail, x: number, y: number, z: number, now: number): void {
  const i = tr.head
  tr.positions[i * 3] = x
  tr.positions[i * 3 + 1] = y
  tr.positions[i * 3 + 2] = z
  tr.ts[i] = now
  tr.head = (i + 1) % TRAIL_N
}

const _box = new THREE.Box3()
const _c = new THREE.Vector3()

/** Hang the stores under the REAL pylons — self-calibrating off each pylon
 *  mesh's own bounding box. MUST run while the model is still a standalone
 *  clone (world matrix == local), BEFORE it nests under the rotated/scaled
 *  pivot — nesting first writes world coords as local and drops the tanks
 *  into the fuselage (the showcase's documented bug). Inner pylons carry
 *  the 500 l tanks (droptank.ts), outer rails the AIM-9s (aim9.ts). */
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
 *  bake's dedup merged look-alike materials — a shared clone would tint
 *  the canopy red with the beacon). */
const SPECIAL_MESH = /CanopyGlass|TankLights|NAVLight|Beacon|Formation/

/** Clone the parsed model into a ballet instance: unique light/glass mats,
 *  the showcase PBR lift with the shared two-ship grey, stores hung, every
 *  mesh casting AND receiving shadows (one jet shadows the other on the
 *  close passes — the noon-light payoff), wrapped nose-forward. */
function makeInstance(base: THREE.Group, env: THREE.Texture): JetInstance {
  const model = base.clone(true)
  const mats: MatRec[] = []
  const lights: LightMats = { beacon: [], nav: [] }
  const cloned = new Map<THREE.Material, THREE.Material>()
  model.traverse((n) => {
    const mesh = n as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    const name = n.name
    const special = SPECIAL_MESH.test(name)
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const out: THREE.Material[] = []
    for (const m of list) {
      let mine: THREE.Material
      if (special) {
        mine = m.clone()
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
        // Glass IS glass — clear, sharp, catching the sky. Under the flat
        // (no-tone-mapping) noon rig the bake's dark canopy read BLACK
        // (Martin) — lift it toward a pale sky tint and let the env burn
        // bright on it so it reads as sun-struck curved glass.
        std.metalness = 0.9
        std.roughness = 0.06
        std.emissive?.setHex(0x000000)
        std.color?.lerp(new THREE.Color('#a9c6de'), 0.55)
      } else if (/NAVLight|Formation/.test(name)) {
        std.emissive = new THREE.Color(0xffe9a8)
        std.emissiveIntensity = 0
        std.metalness = 0.2
        std.roughness = 0.35
        lights.nav.push(std)
      } else if (/Beacon/.test(name)) {
        std.emissive = new THREE.Color(0xff2a1e)
        std.emissiveIntensity = 0
        std.metalness = 0.2
        std.roughness = 0.35
        lights.beacon.push(std)
      } else if (std.map) {
        std.metalness = 0.35
        std.roughness = 0.42
      } else {
        // Untextured skin panels → the uniform two-ship grey.
        std.metalness = 0.45
        std.roughness = 0.44
        std.color?.copy(GRAY)
      }
      if (std.map) std.map.anisotropy = 8
      std.envMap = env
      // The canopy drinks far more environment than the skins — that
      // bright wrap-around IS the glass read.
      std.envMapIntensity = /CanopyGlass/.test(name) ? 1.6 : ENV_INTENSITY
      std.needsUpdate = true
    }
  })
  // Stores attach NOW, while the model is standalone (world == local).
  attachStores(model)
  // Stores brought their own standard materials — env + shadow them too,
  // and collect EVERY material for the presence fade.
  model.traverse((n) => {
    const mesh = n as THREE.Mesh
    if (!mesh.isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const std = m as THREE.MeshStandardMaterial
      if ('envMap' in std && !std.envMap) {
        std.envMap = env
        std.envMapIntensity = ENV_INTENSITY
        std.needsUpdate = true
      }
      const rec = m as MatRec['mat']
      mats.push({ mat: rec, baseOpacity: rec.opacity, baseTransparent: rec.transparent, hashed: false })
    }
  })
  const rest = new THREE.Group()
  rest.rotation.y = REST_Y
  rest.add(model)
  const pivot = new THREE.Group()
  pivot.scale.setScalar(JET_SCALE)
  pivot.visible = false
  pivot.add(rest)
  return { pivot, mats, lights }
}

/** Beacon flashes on its 1.1 s cycle, warm-white tips hold steady —
 *  scaled by the beat's presence. Ambient wall-clock is fine here (the 3D
 *  layer never mounts under reduced motion). */
function pulseLights(jet: JetInstance, time: number, strength: number): void {
  const cyc = time > 0 ? (time % 1.1) / 1.1 : 0.05
  const flash = cyc < 0.13 ? 1 - cyc / 0.13 : 0
  for (const m of jet.lights.beacon) m.emissiveIntensity = strength * (0.2 + 2.6 * flash)
  for (const m of jet.lights.nav) m.emissiveIntensity = strength * 0.9
}

/** The fade is a HASHED DISSOLVE (three's alphaHash), not classic alpha
 *  blending: stochastic per-pixel discard keeps the material in the OPAQUE
 *  pipeline — depth still writes, so the airframe keeps occluding itself
 *  (classic transparency let the far wing show THROUGH the fuselage —
 *  Martin's catch) and the jet grain-dissolves in place instead. */
function applyFade(jet: JetInstance, alpha: number): void {
  for (const rec of jet.mats) {
    if (alpha >= 0.999) {
      if (rec.hashed) {
        rec.hashed = false
        rec.mat.alphaHash = false
        rec.mat.transparent = rec.baseTransparent
        rec.mat.needsUpdate = true
      }
      rec.mat.opacity = rec.baseOpacity
    } else {
      if (!rec.hashed) {
        rec.hashed = true
        rec.mat.alphaHash = true
        rec.mat.transparent = false
        rec.mat.needsUpdate = true
      }
      rec.mat.opacity = rec.baseOpacity * alpha
    }
  }
}

type BalletProbe = {
  ready: boolean
  t: number
  presence: number
  flow: number
  jets: { sx: number; sy: number; bank: number }[]
}

// Hot-path scratch — the frame loop allocates nothing.
const _pose = createBalletPose()
const _cam = createBalletCam()
const _fwd = new THREE.Vector3()
const _lift = new THREE.Vector3()
const _right = new THREE.Vector3()
const _lookM = new THREE.Matrix4()
const _qLook = new THREE.Quaternion()
const _qRoll = new THREE.Quaternion()
const _qPitch = new THREE.Quaternion()
const _qEmit = new THREE.Quaternion()
const _camPos = new THREE.Vector3()
const _camTarget = new THREE.Vector3()
const _mInv = new THREE.Matrix4()
const _mScale = new THREE.Matrix4()
const _mHudT = new THREE.Matrix4()
const _mHudS = new THREE.Matrix4()
const _v = new THREE.Vector3()
const _tip = new THREE.Vector3()
const _ONE = new THREE.Vector3(1, 1, 1)
const _ZERO = new THREE.Vector3(0, 0, 0)
const _WORLD_UP = new THREE.Vector3(0, 1, 0)

function slotOfCruise(slots: readonly [Slot3D, Slot3D], count: number): Slot3D | null {
  for (let i = 0; i < count; i++) {
    if (slots[i].theme === 'sky' && slots[i].sky === 'cruise') return slots[i]
  }
  return null
}

/** Nose down the flight path, wings level, then roll into the physical
 *  bank — the shared pose rig. AoA is the caller's extra premultiply. */
function poseQuatOf(pose: typeof _pose, q: THREE.Quaternion): void {
  _fwd.set(pose.f[0], pose.f[1], pose.f[2])
  _lookM.lookAt(_ZERO, _fwd, _WORLD_UP)
  _qLook.setFromRotationMatrix(_lookM)
  _qRoll.setFromAxisAngle(_fwd, pose.bank)
  q.copy(_qRoll).multiply(_qLook)
}

const AOA_RAD = (3.2 * Math.PI) / 180

export function CruiseBallet({ frame }: Scene3DProps) {
  const res = useMemo(() => {
    // The stage rides the camera pose; `group` inverts the virtual orbit
    // camera so the fight hangs framed in front of the viewer.
    const stage = new THREE.Group()
    const group = new THREE.Group()
    group.matrixAutoUpdate = false
    stage.add(group)

    // NOON light rig (the showcase's): a hard warm-white key from almost
    // straight above (the 2D sun stands top-centre through this beat),
    // real shadows on; a faint sky bounce from below and a bright noon
    // hemisphere keep the shaded undersides alive, never black.
    const key = new THREE.DirectionalLight(0xfff6ea, 0)
    key.castShadow = true
    const small = Math.min(window.innerWidth, window.innerHeight) < 720
    key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048)
    key.shadow.camera.near = 20
    key.shadow.camera.far = 120
    key.shadow.camera.left = -26
    key.shadow.camera.right = 26
    key.shadow.camera.top = 26
    key.shadow.camera.bottom = -26
    key.shadow.bias = -0.0004
    key.shadow.normalBias = 0.02
    group.add(key, key.target)
    const fill = new THREE.DirectionalLight(0xcfe0f0, 0)
    fill.position.set(-14, -22, 10)
    group.add(fill)
    const hemi = new THREE.HemisphereLight(0xdcecf8, 0x7a8a72, 0)
    group.add(hemi)

    // Four faint tip streams: [jet0-L, jet0-R, jet1-L, jet1-R].
    const trails = [makeTrail(), makeTrail(), makeTrail(), makeTrail()]
    for (const tr of trails) group.add(tr.points)

    // The green cockpit HUD as a MID-DEPTH billboard (Martin: the glass sits
    // roughly in the middle of the fight's depth — the near jet crosses IN
    // FRONT of the symbology, the far one flies BEHIND it). A camera-glued
    // plane at the helix-axis distance, textured by the same drawCockpitHud
    // the 2D world uses; the opaque(-hashed) jets depth-test against it, so
    // the occlusion is per-pixel and free. Drawn after the trails
    // (renderOrder) so far-side vapour never smears over the glass.
    const hudCanvas = document.createElement('canvas')
    const hudTex = new THREE.CanvasTexture(hudCanvas)
    // No mipmaps + plain linear sampling: the texture maps ~1:1 to screen
    // pixels, and mip generation both softened the symbology (Martin: a
    // touch blurrier than the real-jet look he wants) and cost a rebuild
    // on every scroll-frame upload.
    hudTex.generateMipmaps = false
    hudTex.minFilter = THREE.LinearFilter
    const hudMat = new THREE.MeshBasicMaterial({
      map: hudTex,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      opacity: 0,
    })
    const hudMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), hudMat)
    hudMesh.renderOrder = 890
    hudMesh.visible = false
    // Screen-EXACT alignment: the plane's world matrix is composed from the
    // live render camera every frame (incl. flight roll + pointer parallax),
    // so it registers pixel-perfectly with the 2D glass copy it cross-fades
    // with — it lives on an identity root, NOT the rolled stage.
    hudMesh.matrixAutoUpdate = false
    const root = new THREE.Group()
    root.add(stage, hudMesh)

    // A handful of high wisps drifting down past the pair — the climb cue
    // inside the 3D world itself (the 2D cloud sea sinks below).
    const wisps: THREE.Sprite[] = []
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: puffTexture(),
          transparent: true,
          depthWrite: false,
          opacity: 0,
        }),
      )
      const sc = 14 + ((i * 137) % 26)
      s.scale.set(sc, sc * 0.62, 1)
      s.userData = { ang: (i / 12) * Math.PI * 2 + i * 0.7, rad: 34 + ((i * 61) % 90), y: (i * 0.083) % 1 }
      group.add(s)
      wisps.push(s)
    }

    return { root, stage, group, key, fill, hemi, trails, wisps, hudCanvas, hudTex, hudMat, hudMesh }
  }, [])

  const jetsRef = useRef<JetInstance[] | null>(null)
  const loadKicked = useRef(false)
  const lastEmit = useRef(-1e9)
  /** Last story position the HUD billboard texture was rendered for —
   *  parked frames upload nothing. */
  const hudDrawn = useRef({ t: -1, aspect: 0 })
  /** Last written text-hole CSS var triple (write only on change). */
  const holeStr = useRef('')

  const probe = useMemo<BalletProbe>(
    () => ({
      ready: false,
      t: 0,
      presence: 0,
      flow: 0,
      jets: [
        { sx: 0, sy: 0, bank: 0 },
        { sx: 0, sy: 0, bank: 0 },
      ],
    }),
    [],
  )
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const host = window as unknown as { __ballet3d?: BalletProbe }
    host.__ballet3d = probe
    return () => {
      delete host.__ballet3d
    }
  }, [probe])

  const gl = useThree((s) => s.gl)

  // Shadow maps for the noon rig — enabled once for the whole stage (only
  // the ballet key casts, and it is culled with the group outside the
  // beat, so the shadow pass costs nothing anywhere else in the story).
  useEffect(() => {
    gl.shadowMap.enabled = true
    gl.shadowMap.type = THREE.PCFSoftShadowMap
  }, [gl])

  const cleanupRef = useRef<(() => void) | null>(null)
  const kickLoad = () => {
    if (loadKicked.current) return
    loadKicked.current = true
    let alive = true
    beginHeroLoad('cruise')
    loadL159((f) => reportHeroProgress('cruise', f * 0.6))
      .then(async (base) => {
        if (!alive) return
        // The session-shared RoomEnvironment bake (surface.ts) — this beat
        // keeps its own slightly brighter sigma (0.045), cached by value.
        // sigma 0.04 (was 0.045): 0.045 asked PMREMGenerator for 22 blur
        // samples vs its MAX_SAMPLES 20 → a "sigmaRadians too large, will
        // clip" console warning on some GPUs (reported on Safari/Apple
        // Silicon). 0.04 is within budget and matches the other three heroes;
        // the reflection-blur difference is imperceptible.
        const env = await getRoomEnv(gl, 0.04)
        if (!alive) return
        reportHeroProgress('cruise', 0.68)
        // One idle slice between the clone+grade passes, and a GPU texture
        // warm-up while the pair is still invisible — the hard cut into the
        // ballet must never pay upload/clone work mid-scroll.
        const jets: JetInstance[] = []
        for (let i = 0; i < 2; i++) {
          await idleSlice()
          if (!alive) {
            for (const j of jets) for (const rec of j.mats) rec.mat.dispose()
            return
          }
          jets.push(makeInstance(base, env))
          reportHeroProgress('cruise', 0.68 + ((i + 1) / 2) * 0.12)
        }
        for (const j of jets) res.group.add(j.pivot)
        jetsRef.current = jets
        await warmTextures(gl, res.group, (d, n) =>
          reportHeroProgress('cruise', 0.8 + (d / n) * 0.19),
        )
        if (!alive) return
        // The 2D cruise scene may now hand its corkscrew over (it keeps
        // painting until this flips — the story never shows a hole).
        setHero3DReady('cruise', true)
        finishHeroLoad('cruise')
        if (import.meta.env.DEV) probe.ready = true
      })
      .catch((err) => {
        failHeroLoad('cruise')
        if (import.meta.env.DEV) console.warn('cruise ballet: model load failed —', err)
      })
    cleanupRef.current = () => {
      alive = false
    }
  }

  useEffect(() => {
    // Fresh load channel for this mount (the scene kicks its own build at
    // LOAD_AT_POS in the frame loop; a world-toggle remount reports honestly).
    resetHeroLoad('cruise')
    return () => {
      cleanupRef.current?.()
      setHero3DReady('cruise', false)
      resetHeroLoad('cruise')
      const jets = jetsRef.current
      if (jets) {
        for (const j of jets) {
          res.group.remove(j.pivot)
          for (const rec of j.mats) rec.mat.dispose()
        }
        jetsRef.current = null
      }
      // The env texture is the session-shared getRoomEnv bake — not disposed.
      for (const tr of res.trails) {
        tr.points.geometry.dispose()
        tr.mat.dispose()
      }
      for (const s of res.wisps) s.material.dispose()
      res.hudMesh.geometry.dispose()
      res.hudMat.dispose()
      res.hudTex.dispose()
      const rs = document.documentElement.style
      rs.removeProperty('--ballet-hole-r')
      rs.removeProperty('--ballet-hole-x')
      rs.removeProperty('--ballet-hole-y')
      holeStr.current = ''
      loadKicked.current = false
    }
  }, [res])

  useFrame((state) => {
    if (!loadKicked.current && frame.pos > LOAD_AT_POS) kickLoad()
    // Approaching this hero's beat with the build unfinished — let idleSlice
    // run on the short timeout (finish over smoothness).
    if (!jetsRef.current && loadKicked.current && frame.pos > LOAD_AT_POS) bumpBuildUrgency()

    const slot = slotOfCruise(frame.slots, frame.count)
    const t = slot ? slot.tRaw : 0
    const presence = slot ? balletPresence(t) * slot.alpha : 0
    if (import.meta.env.DEV) {
      probe.t = t
      probe.presence = presence
    }
    if (presence <= 0.002) {
      if (res.group.visible) {
        res.group.visible = false
        // Rewind the vapour so a teleport back in never replays stale puffs.
        lastEmit.current = -1e9
      }
      res.hudMesh.visible = false
      if (holeStr.current !== '') {
        holeStr.current = ''
        document.documentElement.style.setProperty('--ballet-hole-r', '0px')
      }
      return
    }
    res.group.visible = true

    // Glue the stage to the flight pose — the camera-glued convention.
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
    const flow = balletFlow(t)
    if (import.meta.env.DEV) probe.flow = flow

    // The virtual orbit camera → the group's inverse matrix, then a uniform
    // world-scale about the camera origin (screen-identical) to keep depths
    // inside the stage frustum on narrow viewports.
    balletCam(flow, aspect, _cam)
    _camPos.set(
      Math.cos(_cam.el) * Math.sin(_cam.az) * _cam.r,
      _cam.cy + Math.sin(_cam.el) * _cam.r,
      Math.cos(_cam.el) * Math.cos(_cam.az) * _cam.r,
    )
    _camTarget.set(0, _cam.cy + 1.5, 0)
    _lookM.lookAt(_camPos, _camTarget, _WORLD_UP)
    _qLook.setFromRotationMatrix(_lookM)
    _mInv.compose(_camPos, _qLook, _ONE).invert()
    _mScale.makeScale(_cam.scale, _cam.scale, _cam.scale)
    res.group.matrix.multiplyMatrices(_mScale, _mInv)

    // NOON sun straight overhead: key + shadow frustum ride the climbing
    // centroid, so the shadows always drop straight down the fight.
    res.key.position.set(3, _cam.cy + 60, 5)
    res.key.target.position.set(0, _cam.cy, 0)
    res.key.intensity = 2.5 * presence
    res.fill.intensity = 0.35 * presence
    res.hemi.intensity = 0.45 * presence

    // --- The mid-depth HUD billboard -------------------------------------
    // Fills the frustum slice at the helix-axis distance, composed straight
    // off the render camera (screen-exact — it registers with the 2D glass
    // copy it cross-fades with); the texture re-renders only when the story
    // actually moved.
    const axisD = _cam.r * _cam.scale
    res.hudMesh.visible = true
    camera.updateMatrixWorld()
    _mHudT.makeTranslation(0, 0, -axisD)
    _mHudS.makeScale(2 * axisD * FOV_TAN * aspect, 2 * axisD * FOV_TAN, 1)
    res.hudMesh.matrix.copy(camera.matrixWorld).multiply(_mHudT).multiply(_mHudS)
    res.hudMat.opacity = presence
    if (
      Math.abs(t - hudDrawn.current.t) > 1e-4 ||
      Math.abs(aspect - hudDrawn.current.aspect) > 0.004
    ) {
      hudDrawn.current.t = t
      hudDrawn.current.aspect = aspect
      // The SHARED HUD raster resolution (hud.ts drawCockpitHudSoft renders
      // the 2D glass at the same width) — one look everywhere.
      const W = HUD_TEX_W
      const H = Math.max(256, Math.round(W / aspect))
      if (res.hudCanvas.width !== W || res.hudCanvas.height !== H) {
        res.hudCanvas.width = W
        res.hudCanvas.height = H
      }
      const g = res.hudCanvas.getContext('2d')
      if (g) {
        g.clearRect(0, 0, W, H)
        const bvr = bvrPicture(2.5 + t, W, H)
        const ro = cruiseHud(t)
        drawCockpitHud(g, {
          w: W,
          h: H,
          alpha: 1,
          attack: 0,
          target: bvr.target,
          target2: bvr.target2,
          rangeNm: bvr.rangeNm,
          mach: ro.mach,
          altFt: ro.altFt,
          hdg: ro.hdg,
        })
        res.hudTex.needsUpdate = true
      }
    }

    const jets = jetsRef.current
    let holeX = -1000
    let holeY = -1000
    let holeR = 0
    if (jets) {
      for (let k = 0 as 0 | 1; k < 2; k = (k + 1) as 0 | 1) {
        const jet = jets[k]
        balletPose(k, flow, _pose)
        jet.pivot.visible = true
        jet.pivot.position.set(_pose.p[0], _pose.p[1], _pose.p[2])
        poseQuatOf(_pose, jet.pivot.quaternion)
        // A little angle-of-attack about the body-right axis (f × lift).
        _fwd.set(_pose.f[0], _pose.f[1], _pose.f[2])
        _lift.set(_pose.lift[0], _pose.lift[1], _pose.lift[2])
        _right.crossVectors(_fwd, _lift).normalize()
        _qPitch.setFromAxisAngle(_right, AOA_RAD)
        jet.pivot.quaternion.premultiply(_qPitch)
        applyFade(jet, presence)
        pulseLights(jet, frame.time, 1.1 * presence)
        // The chapter text sits at the SAME mid depth as the HUD glass —
        // while this jet is NEARER than the glass plane, it punches a soft
        // masked hole through the DOM card (ChapterCards --ballet-hole-*),
        // so the near pass reads in FRONT of the text too.
        _v.set(_pose.p[0], _pose.p[1], _pose.p[2]).applyMatrix4(res.group.matrix)
        const s = screenOf(_v.x, _v.y, _v.z, aspect)
        if (_v.z > -axisD * 0.97) {
          const pxPerUnit = state.size.height / (2 * Math.max(-_v.z, 0.1) * FOV_TAN)
          const r = 3.0 * _cam.scale * pxPerUnit * presence
          if (r > holeR) {
            holeR = r
            holeX = s.sx * state.size.width
            holeY = s.sy * state.size.height
          }
        }
        if (import.meta.env.DEV) {
          probe.jets[k] = { sx: s.sx, sy: s.sy, bank: _pose.bank }
        }
      }
      // Publish the hole (quantised; written only on change).
      const hs = `${holeR.toFixed(0)}|${holeX.toFixed(0)}|${holeY.toFixed(0)}`
      if (hs !== holeStr.current) {
        holeStr.current = hs
        const rs = document.documentElement.style
        rs.setProperty('--ballet-hole-r', `${holeR.toFixed(0)}px`)
        rs.setProperty('--ballet-hole-x', `${holeX.toFixed(0)}px`)
        rs.setProperty('--ballet-hole-y', `${holeY.toFixed(0)}px`)
      }

      // Wingtip vapour: puffs at FIXED flow-intervals along the true path
      // (poses recomputed per emission instant), so the smoke stays one
      // continuous stream across any scroll jump — and, hanging in the
      // ballet's world space, it streams away BELOW the climbing pair.
      if (flow < lastEmit.current || flow - lastEmit.current > TRAIL_LIFE) {
        lastEmit.current = flow - TRAIL_DFLOW
      }
      let guard = 0
      while (lastEmit.current + TRAIL_DFLOW <= flow && guard++ < 4000) {
        lastEmit.current += TRAIL_DFLOW
        for (let k = 0 as 0 | 1; k < 2; k = (k + 1) as 0 | 1) {
          balletPose(k, lastEmit.current, _pose)
          poseQuatOf(_pose, _qEmit)
          for (let s = 0; s < 2; s++) {
            _tip
              .set((s ? 1 : -1) * TIP_X, 0, 0.4)
              .applyQuaternion(_qEmit)
            emitTrail(
              res.trails[k * 2 + s],
              _pose.p[0] + _tip.x,
              _pose.p[1] + _tip.y,
              _pose.p[2] + _tip.z,
              lastEmit.current,
            )
          }
        }
      }
      const pxScale =
        (state.size.height * state.viewport.dpr) /
        (2 * Math.tan((camera.fov * Math.PI) / 360))
      for (const tr of res.trails) {
        const geo = tr.points.geometry
        ;(geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
        ;(geo.getAttribute('aT') as THREE.BufferAttribute).needsUpdate = true
        tr.mat.uniforms.uNow.value = flow
        tr.mat.uniforms.uAlpha.value = TRAIL_ALPHA * presence
        tr.mat.uniforms.uScale.value = pxScale
      }
    }

    // Recycle the wisps through the pair's altitude band — they sink past
    // the fight as it climbs (scroll-driven via cy; the slow ambient rise
    // rides frame.time, motion-only).
    for (const s of res.wisps) {
      const u = s.userData as { ang: number; rad: number; y: number }
      const y = _cam.cy - 24 + ((u.y * 120 + frame.time * 1.5) % 120)
      s.position.set(Math.cos(u.ang) * u.rad, y, Math.sin(u.ang) * u.rad)
      s.material.opacity =
        0.24 * presence * Math.max(0, Math.min(1, 1 - Math.abs(y - _cam.cy) / 60))
    }
  })

  return <primitive object={res.root} />
}
