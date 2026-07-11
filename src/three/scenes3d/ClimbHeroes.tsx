/**
 * CLIMB HEROES (E3b) — the first scene whose hero the 3D layer OWNS: the real
 * GLB aircraft of Martin's authored Part-1 sequence (Piper "Ulla" → Z-142
 * stand-in PA-28 → L-39) fly ONE continuous climb below the cloud deck of the
 * stretched chapter 01 (scrollWeight 2), and the section ends with the L-39
 * melting into the rising white-out (`heroClimbPunch`). The 2D scene keeps
 * painting the whole environment — now streaming AGAINST the hero's own
 * motion — and only its painted hero steps aside, and ONLY while this scene
 * is live (`setHero3DReady`).
 *
 * TIME BASE: the climb run's own localT (runLocalTRaw of the SHARED window) —
 * the same clock the 2D environment breathes by, so the two layers cannot
 * desync, and a future chapter re-weight stretches both together.
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
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { runLocalTRaw } from '../../canvas/sceneTimeline'
import { heroClimbPunch } from '../../canvas/scenes/sky/skyMath'
import { setHero3DReady } from '../owned3d'
import {
  CLIMB_SEQ,
  LAB_BOX,
  SPHERE_GRID_ALPHA,
  SPHERE_GRID_COLOR,
  SPHERE_SURF_ALPHA,
  SPHERE_SURF_COLOR,
  buildTrack,
  createClimbPose,
  lifeAlpha,
  poseTrackAt,
  skyPresence,
  sphereStateAt,
  tagAlpha,
  type AircraftTrack,
  type ClimbAircraft,
} from '../climbMath'
import type { Scene3DProps } from '../registry3d'

const MODEL_URLS: Record<ClimbAircraft['id'], string> = {
  ulla: '/models/ulla.glb',
  z142: '/models/z142.glb',
  l39: '/models/l39.glb',
}

/** Name-tag styling — the 2D climb graduation tag translated to world units:
 *  same face (Chakra Petch, gold), same PROPORTIONAL placement below-right of
 *  the craft (2D: cx + size·0.62 / cy + size·0.52 — canvas y points down),
 *  and a height that lands near the 2D tag's ~11 px at the display plane. */
const TAG_FONT = '500 44px "Chakra Petch", ui-monospace, Consolas, monospace'
const TAG_COLOR = '#ffd27a'
const TAG_HEIGHT = 0.17
const TAG_DX = 0.62
const TAG_DY = -0.52

/** Key-light base — the lab's 2.2, dimmed by the same `approach` that steals
 *  the 2D world's light as the ceiling closes in (climb.ts `dim`). */
const KEY_INTENSITY = 2.2
const KEY_DIM = 0.45

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
  const loader = new GLTFLoader()
  loader.setMeshoptDecoder(MeshoptDecoder)
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
              root.traverse((n) => {
                const spin = (n.userData as { spin?: SpinRec }).spin
                if (spin && spin.axis) spins.push({ node: n, axis: spin.axis, speed: spin.speed })
                const mesh = n as THREE.Mesh
                if (!mesh.isMesh) return
                for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
                  const std = m as THREE.MeshStandardMaterial
                  if (std.map) std.map.anisotropy = 8
                  if (!seen.has(m)) {
                    seen.add(m)
                    mats.push({
                      mat: m as MatRec['mat'],
                      baseOpacity: (m as MatRec['mat']).opacity,
                      baseTransparent: (m as MatRec['mat']).transparent,
                    })
                  }
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

/** The lab's `labelSprite`: a canvas-baked name tag, re-baked when the
 *  webfont arrives. Left-anchored like the 2D tag (textAlign 'left');
 *  `toneMapped: false` — the gold must stay the 2D hex. */
function makeTag(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const tex = new THREE.CanvasTexture(canvas)
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false }),
  )
  sprite.renderOrder = 950
  sprite.center.set(0, 0.5)
  const draw = () => {
    const pad = 10
    ctx.font = TAG_FONT
    const w = Math.ceil(ctx.measureText(text).width) + pad * 2
    canvas.width = w
    canvas.height = 64
    ctx.font = TAG_FONT
    ctx.fillStyle = TAG_COLOR
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, w / 2, 34)
    tex.needsUpdate = true
    sprite.scale.set((TAG_HEIGHT * w) / 64, TAG_HEIGHT, 1)
  }
  draw()
  if (document.fonts && !document.fonts.check(TAG_FONT)) {
    document.fonts
      .load(TAG_FONT)
      .then(draw)
      .catch(() => {})
  }
  return sprite
}

/** Plain lat/long wire sphere (no triangle diagonals) — the lab's sparse
 *  golden grid inside the unlock bubble. */
function buildGridSphere(lon = 12, lat = 6, seg = 48): THREE.BufferGeometry {
  const pts: number[] = []
  for (let i = 1; i < lat; i++) {
    const phi = (Math.PI * i) / lat
    const y = Math.cos(phi)
    const rr = Math.sin(phi)
    for (let j = 0; j < seg; j++) {
      const a0 = (2 * Math.PI * j) / seg
      const a1 = (2 * Math.PI * (j + 1)) / seg
      pts.push(rr * Math.cos(a0), y, rr * Math.sin(a0), rr * Math.cos(a1), y, rr * Math.sin(a1))
    }
  }
  for (let i = 0; i < lon; i++) {
    const th = (2 * Math.PI * i) / lon
    for (let j = 0; j < seg; j++) {
      const p0 = (Math.PI * j) / seg
      const p1 = (Math.PI * (j + 1)) / seg
      pts.push(
        Math.sin(p0) * Math.cos(th), Math.cos(p0), Math.sin(p0) * Math.sin(th),
        Math.sin(p1) * Math.cos(th), Math.cos(p1), Math.sin(p1) * Math.sin(th),
      )
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
  return g
}

type AircraftRes = {
  aircraft: ClimbAircraft
  track: AircraftTrack
  pivot: THREE.Group
  tag: THREE.Sprite
  model: LoadedModel | null
}

type SphereRes = {
  group: THREE.Group
  surf: THREE.MeshBasicMaterial
  grid: THREE.LineBasicMaterial
}

type ClimbDevProbe = {
  ready: boolean
  presence: number
  fog: number
  t: number
  aircraft: Record<string, { alpha: number; x: number; y: number; z: number }>
  spheres: number[]
  tags: Record<string, number>
  /** Prop spin angles — the harness samples twice to prove rotation. */
  spinRot: number[]
  gl: { toneMapping: number; exposure: number; outputColorSpace: string }
}

// Hot-path scratch — the frame loop allocates nothing.
const _pose = createClimbPose()
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

    // The light rig — the lab's two-light setup, graded to the 2D climb's
    // world: the key rides where the 2D MORNING SUN sits (upper LEFT below
    // the deck — climb.ts draws it at 0.18 w / 0.2 h), and its intensity
    // couples to the same `approach` dimming the 2D world suffers as the
    // ceiling closes in.
    const key = new THREE.DirectionalLight(0xfff2d8, KEY_INTENSITY)
    key.position.set(-4.5, 7, 3.5)
    room.add(key)
    room.add(key.target)
    const fill = new THREE.DirectionalLight(0x8ea9c9, 0.5)
    fill.position.set(0, -5, 0)
    room.add(fill)
    room.add(fill.target)

    const aircraft: AircraftRes[] = CLIMB_SEQ.aircraft.map((a) => {
      const pivot = new THREE.Group()
      pivot.scale.setScalar(a.size / 10) // GLBs are baked 10-normalized
      pivot.visible = false
      room.add(pivot)
      const tag = makeTag(a.name)
      tag.visible = false
      room.add(tag)
      return { aircraft: a, track: buildTrack(a), pivot, tag, model: null }
    })

    const surfGeo = new THREE.SphereGeometry(1, 48, 32)
    const gridGeo = buildGridSphere()
    const spheres: SphereRes[] = CLIMB_SEQ.effects.map(() => {
      const group = new THREE.Group()
      const surf = new THREE.MeshBasicMaterial({
        color: SPHERE_SURF_COLOR,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
      const surfMesh = new THREE.Mesh(surfGeo, surf)
      surfMesh.renderOrder = 900
      const grid = new THREE.LineBasicMaterial({
        color: SPHERE_GRID_COLOR,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      })
      const gridLines = new THREE.LineSegments(gridGeo, grid)
      gridLines.renderOrder = 901
      group.add(surfMesh, gridLines)
      group.visible = false
      room.add(group)
      return { group, surf, grid }
    })

    return { stage, room, aircraft, spheres, surfGeo, gridGeo, key }
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
      t: 0,
      aircraft: {},
      spheres: [0, 0],
      tags: {},
      spinRot: [0, 0, 0],
      gl: { toneMapping: -1, exposure: 0, outputColorSpace: '' },
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

  // Load + attach the models, report readiness, flip the 2D hero off. On any
  // failure the promise cache clears and readiness never fires — the 2D hero
  // simply keeps flying (the chunk-failure caveat, answered per hero).
  useEffect(() => {
    let alive = true
    loadModels().then(
      (models) => {
        if (!alive) return
        for (const r of res.aircraft) {
          r.model = models[r.aircraft.id]
          r.pivot.add(r.model.root)
        }
        readyRef.current = true
        setHero3DReady('climb', true)
        if (import.meta.env.DEV) probe.ready = true
      },
      (err) => {
        if (import.meta.env.DEV) console.warn('climb heroes: model load failed —', err)
      },
    )
    return () => {
      alive = false
      readyRef.current = false
      setHero3DReady('climb', false)
      for (const r of res.aircraft) {
        if (r.model) {
          r.pivot.remove(r.model.root)
          r.model = null
        }
      }
    }
  }, [res, probe])

  // Environment + tone mapping for the GLB materials only: PMREM'd
  // RoomEnvironment on each material (never scene.environment — the stage is
  // shared), ACES on the renderer. Every other material in the 3D layer is a
  // raw ShaderMaterial or toneMapped:false, so the 2D hex parity the `flat`
  // stage guarantees is untouched — only the heroes get the lab's grade.
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    const prevTone = gl.toneMapping
    const prevExposure = gl.toneMappingExposure
    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = 1.12
    let cancelled = false
    loadModels().then((models) => {
      if (cancelled) return
      for (const id of Object.keys(models) as ClimbAircraft['id'][]) {
        for (const rec of models[id].mats) {
          const std = rec.mat as unknown as THREE.MeshStandardMaterial
          if ('envMap' in std) {
            std.envMap = env
            std.envMapIntensity = 1
            std.needsUpdate = true
          }
        }
      }
    })
    return () => {
      cancelled = true
      gl.toneMapping = prevTone
      gl.toneMappingExposure = prevExposure
      env.dispose()
      pmrem.dispose()
    }
  }, [gl])

  useEffect(
    () => () => {
      res.surfGeo.dispose()
      res.gridGeo.dispose()
      for (const r of res.aircraft) {
        r.tag.material.map?.dispose()
        r.tag.material.dispose()
      }
      for (const s of res.spheres) {
        s.surf.dispose()
        s.grid.dispose()
      }
    },
    [res],
  )

  useFrame((state, delta) => {
    const count = flight.count
    // The scene's clock: the climb run's own (unclamped) localT — the same
    // value the 2D climb environment paints by.
    const t = climbRun ? runLocalTRaw(frame.pos, climbRun, count) : 0

    // Presence: the sky world's share of the frame (the 2D cross-fade), times
    // the section-ending white-out — the fog swallows the planes exactly as
    // the 2D frame whites out (heroClimbPunch: fog rises 0.72→0.9 and holds;
    // chapter 02 then cross-fades in over the white).
    const punch = heroClimbPunch(Math.min(Math.max(t, 0), 1))
    const presence = readyRef.current ? skyPresence(frame.slots, frame.count) * (1 - punch.fog) : 0

    // The ceiling steals the light exactly as it does from the 2D world.
    res.key.intensity = KEY_INTENSITY * (1 - KEY_DIM * punch.approach)

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

    for (const r of res.aircraft) {
      const a = r.aircraft
      const alpha = presence * lifeAlpha(a, t)
      const visible = alpha > 0.002 && r.model !== null
      r.pivot.visible = visible

      // Name tag: the 2D graduation-tag envelope — a dim constant while the
      // type flies, pulse-boosted at its unlock (tagAlpha), riding presence.
      const tagA = r.model === null ? 0 : tagAlpha(a, t) * presence
      r.tag.visible = tagA > 0.01
      if (import.meta.env.DEV) probe.tags[a.id] = tagA

      if (!visible && !r.tag.visible) {
        if (import.meta.env.DEV) {
          const p = (probe.aircraft[a.id] ??= { alpha: 0, x: 0, y: 0, z: 0 })
          p.alpha = 0
        }
        continue
      }

      poseTrackAt(r.track, t, _pose)
      r.pivot.position.set(_pose.p[0], _pose.p[1], _pose.p[2])
      r.pivot.quaternion.set(_pose.q[0], _pose.q[1], _pose.q[2], _pose.q[3])
      if (r.tag.visible) {
        // Below-right of the craft, proportional to its size — the 2D layout.
        r.tag.position.set(
          _pose.p[0] + a.size * TAG_DX,
          _pose.p[1] + a.size * TAG_DY,
          _pose.p[2],
        )
        r.tag.material.opacity = tagA
      }

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

    for (let i = 0; i < res.spheres.length; i++) {
      const e = CLIMB_SEQ.effects[i]
      const s = res.spheres[i]
      const st = presence > 0 ? sphereStateAt(e, t) : null
      if (!st) {
        s.group.visible = false
        if (import.meta.env.DEV) probe.spheres[i] = 0
        continue
      }
      const follow = res.aircraft.find((r) => r.aircraft.id === e.follow)
      if (follow) s.group.position.copy(follow.pivot.position)
      s.group.scale.setScalar(st.r)
      s.surf.opacity = st.env * SPHERE_SURF_ALPHA * presence
      s.grid.opacity = st.env * SPHERE_GRID_ALPHA * presence
      s.group.visible = true
      if (import.meta.env.DEV) probe.spheres[i] = st.env
    }

    if (import.meta.env.DEV) {
      probe.presence = presence
      probe.fog = punch.fog
      probe.t = t
      res.aircraft.forEach((r, i) => {
        probe.spinRot[i] = r.model?.spins[0]?.node.rotation[r.model.spins[0].axis] ?? 0
      })
      probe.gl.toneMapping = gl.toneMapping
      probe.gl.exposure = gl.toneMappingExposure
      probe.gl.outputColorSpace = String(gl.outputColorSpace)
    }
  })

  return <primitive object={res.stage} />
}
