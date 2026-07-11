/**
 * JET HEROES (E3) — the pilot arc's true-3D fly-bys. One scene instance
 * serves ALL `sky` runs: each sub-mood (climb / cruise / airshow / sunset)
 * gets a world-space group anchored where ITS scene window begins (the
 * Starfield idiom), and the choreography table in `jetMath` flies
 * code-authored L-39/L-159 meshes through the corridor the camera travels —
 * passes in the depth axis the 2D world cannot use.
 *
 * Story rules, same as every renderer: presence = the run's cross-fade weight
 * (paint-over composed at seams) × the flight's own scroll window; `time`
 * only drives a faint formation bob. Trails are STATIC ribbon bakes along
 * each flight path, revealed head-to-tail in the shader off the scroll-driven
 * path progress — scrubbing backwards rewinds a pass, no per-frame geometry.
 */

import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Sky } from '../../data/chapters'
import { runWindow } from '../../canvas/sceneTimeline'
import { flightAnchorAt, createPose } from '../flightMath'
import { bakeJet, type JetVariant } from '../jetGeometry'
import {
  JET_FLIGHTS,
  bakeRibbon,
  flightEnvelope,
  flightProgress,
  jetPoseAt,
  type JetFlightSpec,
} from '../jetMath'
import type { Scene3DProps } from '../registry3d'

/** Raw sRGB hex → Vector3, NO color-management transform — the `flat` stage
 *  must match the 2D world's CSS hexes exactly (the starfield precedent). */
function hexV3(hex: string): THREE.Vector3 {
  return new THREE.Vector3(
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  )
}

/** Per-mood sun light, ANCHOR-LOCAL direction + palette — a stylized stand-in
 *  for the 2D section sun's position along `sunArc` (upper-left at the
 *  punch-out, high over the cruise, right of frame at the airshow, low and
 *  red at the sunset). */
const LIGHTS: Record<string, { dir: readonly [number, number, number]; color: string; ambient: string }> = {
  // −z components: the section sun is always AHEAD of the flight, never
  // behind the camera (sunArc runs upper-left → low-right across the arc).
  climb: { dir: [-0.45, 0.8, -0.3], color: '#fff3d2', ambient: '#3a4a66' },
  cruise: { dir: [0.05, 0.9, -0.25], color: '#ffffff', ambient: '#40506c' },
  airshow: { dir: [0.4, 0.8, -0.2], color: '#fffdf0', ambient: '#42536f' },
  sunset: { dir: [0.5, 0.25, -0.65], color: '#ffb27a', ambient: '#463a52' },
}

/** Formation bob — ambient life on a parked scroll frame, world units. */
const BOB = 0.014

const JET_VERTEX = /* glsl */ `
  attribute vec3 aColor;
  varying vec3 vColor;
  varying vec3 vNormalW;
  varying vec3 vViewW;

  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
    vColor = aColor;
    // Uniform mesh scale → mat3(modelMatrix) keeps directions (normalized
    // in the fragment shader).
    vNormalW = mat3(modelMatrix) * normal;
    vViewW = cameraPosition - wp.xyz;
  }
`

const JET_FRAGMENT = /* glsl */ `
  uniform vec3 uLight;
  uniform vec3 uLightColor;
  uniform vec3 uAmbient;
  uniform float uAlpha;
  varying vec3 vColor;
  varying vec3 vNormalW;
  varying vec3 vViewW;

  void main() {
    vec3 n = normalize(vNormalW);
    if (!gl_FrontFacing) n = -n;
    // Half-lambert wrap: the shadow side stays readable against the sky.
    float lam = 0.5 + 0.5 * dot(n, uLight);
    lam = 0.25 + 0.6 * lam * lam;
    vec3 v = normalize(vViewW);
    // Rim catch-light — the canopy glint and sunlit edges.
    float rim = pow(1.0 - abs(dot(n, v)), 3.0);
    vec3 color = vColor * (uAmbient + uLightColor * lam) + uLightColor * rim * 0.12;
    gl_FragColor = vec4(color, uAlpha);
  }
`

const RIBBON_VERTEX = /* glsl */ `
  attribute vec3 aTangent;
  attribute float aT;
  attribute float aSide;
  uniform float uHead;
  uniform float uTrail;
  uniform float uWidth;
  uniform float uGrow;
  varying float vT;
  varying float vSide;

  void main() {
    vT = aT;
    vSide = aSide;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // View-facing ribbon: widen perpendicular to both the path tangent and
    // the view ray, so the strip always shows the camera its face.
    vec3 tanV = normalize(normalMatrix * aTangent);
    vec3 viewDir = normalize(mv.xyz);
    vec3 side = cross(tanV, viewDir);
    float sl = length(side);
    side = sl > 1e-4 ? side / sl : vec3(1.0, 0.0, 0.0);
    float age = clamp((uHead - aT) / uTrail, 0.0, 1.0);
    float w = uWidth * (0.4 + uGrow * age);
    mv.xyz += side * aSide * w;
    gl_Position = projectionMatrix * mv;
  }
`

const RIBBON_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uAlpha;
  uniform float uHead;
  uniform float uTrail;
  varying float vT;
  varying float vSide;

  void main() {
    float rel = uHead - vT;
    // Nothing ahead of the jet; a crisp-but-soft start right at the nozzle.
    float head = smoothstep(-0.004, 0.008, rel);
    float age = clamp(rel / uTrail, 0.0, 1.0);
    float body = pow(1.0 - age, 1.4);
    float edge = 1.0 - vSide * vSide;
    gl_FragColor = vec4(uColor, uAlpha * head * body * edge);
  }
`

type FlightRes = {
  spec: JetFlightSpec
  mesh: THREE.Mesh
  jetMat: THREE.ShaderMaterial
  ribbon: THREE.Mesh | null
  ribbonMat: THREE.ShaderMaterial | null
}

type MoodRes = {
  mood: Sky
  group: THREE.Group
  flights: FlightRes[]
}

type JetsDevProbe = Record<string, { presence: number; jets: Record<string, { x: number; y: number; ahead: number }> }>

function buildMoods(flight: Scene3DProps['flight']): { root: THREE.Group; moods: MoodRes[] } {
  const root = new THREE.Group()
  const moods: MoodRes[] = []
  const geoCache = new Map<JetVariant, THREE.BufferGeometry>()
  const jetGeometry = (variant: JetVariant): THREE.BufferGeometry => {
    let g = geoCache.get(variant)
    if (!g) {
      const buffers = bakeJet(variant)
      g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(buffers.positions, 3))
      g.setAttribute('normal', new THREE.BufferAttribute(buffers.normals, 3))
      g.setAttribute('aColor', new THREE.BufferAttribute(buffers.colors, 3))
      geoCache.set(variant, g)
    }
    return g
  }

  for (const [mood, specs] of Object.entries(JET_FLIGHTS) as [Sky, readonly JetFlightSpec[]][]) {
    const run = flight.runs.find((r) => r.theme === 'sky' && r.sky === mood)
    if (!run || !specs?.length) continue

    // Anchor the mood's volume where its scene window begins, oriented along
    // the window chord — the corridor the camera flies through it.
    const [winStart, winEnd] = runWindow(run, flight.count)
    const anchor = flightAnchorAt(flight.path, winStart, winEnd, createPose())
    const group = new THREE.Group()
    group.position.set(anchor.x, anchor.y, anchor.z)
    group.quaternion.setFromRotationMatrix(
      new THREE.Matrix4().lookAt(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(anchor.fx, anchor.fy, anchor.fz),
        new THREE.Vector3(0, 1, 0),
      ),
    )
    root.add(group)

    const light = LIGHTS[mood]
    // The light is authored anchor-local; the shader wants world space.
    const lightWorld = new THREE.Vector3(...light.dir).normalize().applyQuaternion(group.quaternion)

    const flights: FlightRes[] = []
    for (const spec of specs) {
      const jetMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: true,
        side: THREE.DoubleSide,
        vertexShader: JET_VERTEX,
        fragmentShader: JET_FRAGMENT,
        uniforms: {
          uLight: { value: lightWorld },
          uLightColor: { value: hexV3(light.color) },
          uAmbient: { value: hexV3(light.ambient) },
          uAlpha: { value: 0 },
        },
      })
      const mesh = new THREE.Mesh(jetGeometry(spec.variant), jetMat)
      mesh.scale.setScalar(spec.size)
      mesh.visible = false
      group.add(mesh)

      let ribbon: THREE.Mesh | null = null
      let ribbonMat: THREE.ShaderMaterial | null = null
      if (spec.trail) {
        const bake = bakeRibbon(spec)
        const rg = new THREE.BufferGeometry()
        rg.setAttribute('position', new THREE.BufferAttribute(bake.centers, 3))
        rg.setAttribute('aTangent', new THREE.BufferAttribute(bake.tangents, 3))
        rg.setAttribute('aT', new THREE.BufferAttribute(bake.ts, 1))
        rg.setAttribute('aSide', new THREE.BufferAttribute(bake.sides, 1))
        rg.setIndex(new THREE.BufferAttribute(bake.indices, 1))
        ribbonMat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          side: THREE.DoubleSide,
          vertexShader: RIBBON_VERTEX,
          fragmentShader: RIBBON_FRAGMENT,
          uniforms: {
            uColor: { value: hexV3(spec.trail.color) },
            uAlpha: { value: 0 },
            uHead: { value: 0 },
            uTrail: { value: spec.trail.len },
            uWidth: { value: spec.trail.width },
            uGrow: { value: spec.trail.grow },
          },
        })
        ribbon = new THREE.Mesh(rg, ribbonMat)
        ribbon.visible = false
        group.add(ribbon)
      }
      flights.push({ spec, mesh, jetMat, ribbon, ribbonMat })
    }
    moods.push({ mood, group, flights })
  }
  return { root, moods }
}

// Hot-path scratch — the frame loop allocates nothing.
const _pose = createPose()
const _fwd = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()
const _rolledUp = new THREE.Vector3()
const _lookM = new THREE.Matrix4()
const _v = new THREE.Vector3()
const _ZERO = new THREE.Vector3(0, 0, 0)
const _UP = new THREE.Vector3(0, 1, 0)

export function Jets({ frame, flight }: Scene3DProps) {
  const { root, moods } = useMemo(() => buildMoods(flight), [flight])

  // Dev-only probe (the __stars3d idiom): per-mood presence + each jet's
  // screen position, so the CDP harness asserts choreography numerically.
  const probe = useMemo<JetsDevProbe>(() => {
    const p: JetsDevProbe = {}
    for (const m of moods) {
      p[m.mood] = { presence: 0, jets: {} }
      for (const f of m.flights) p[m.mood].jets[f.spec.id] = { x: 0, y: 0, ahead: 0 }
    }
    return p
  }, [moods])

  useEffect(() => {
    if (!import.meta.env.DEV) return
    const host = window as unknown as { __jets3d?: JetsDevProbe }
    host.__jets3d = probe
    return () => {
      delete host.__jets3d
    }
  }, [probe])

  useEffect(
    () => () => {
      const seen = new Set<THREE.BufferGeometry>()
      for (const m of moods)
        for (const f of m.flights) {
          seen.add(f.mesh.geometry)
          f.jetMat.dispose()
          if (f.ribbon) {
            f.ribbon.geometry.dispose()
            f.ribbonMat?.dispose()
          }
        }
      for (const g of seen) g.dispose()
    },
    [moods],
  )

  useFrame((state) => {
    for (const m of moods) {
      // The mood's cross-fade weight this frame. At a seam the incoming
      // scene PAINTS OVER the base in 2D — compose the base's jets the same
      // way, or a dying scene's jets would float over the new world.
      let weight = 0
      let tRaw = 0
      for (let i = 0; i < frame.count; i++) {
        const slot = frame.slots[i]
        if (slot.theme !== 'sky' || slot.sky !== m.mood) continue
        weight = slot.alpha
        if (i === 0 && frame.count === 2) weight *= 1 - frame.slots[1].alpha
        tRaw = slot.tRaw
        break
      }

      let presence = 0
      for (const f of m.flights) {
        const w = weight > 0 ? flightEnvelope(f.spec, tRaw) * weight : 0
        const visible = w > 0.002
        f.mesh.visible = visible
        if (f.ribbon) f.ribbon.visible = visible
        if (import.meta.env.DEV) {
          const j = probe[m.mood].jets[f.spec.id]
          j.ahead = 0
        }
        if (!visible) continue
        presence = Math.max(presence, w)

        const s = flightProgress(f.spec, tRaw)
        jetPoseAt(f.spec, s, _pose)
        f.mesh.position.set(
          _pose.x,
          _pose.y + BOB * Math.sin(frame.time * 1.4 + f.spec.phase),
          _pose.z,
        )
        // Aim the nose (−z) down the path tangent, bank via the rolled up.
        _fwd.set(_pose.fx, _pose.fy, _pose.fz)
        _right.crossVectors(_fwd, _UP).normalize()
        _up.crossVectors(_right, _fwd)
        _rolledUp
          .copy(_up)
          .multiplyScalar(Math.cos(_pose.roll))
          .addScaledVector(_right, Math.sin(_pose.roll))
        _lookM.lookAt(_ZERO, _fwd, _rolledUp)
        f.mesh.quaternion.setFromRotationMatrix(_lookM)
        f.jetMat.uniforms.uAlpha.value = Math.min(w, 1)

        if (f.ribbonMat && f.spec.trail) {
          f.ribbonMat.uniforms.uHead.value = s
          f.ribbonMat.uniforms.uAlpha.value = Math.min(w, 1) * f.spec.trail.alpha
        }

        if (import.meta.env.DEV) {
          // Screen probe: NDC x/y and whether the jet is in front of the
          // camera — the harness tunes/asserts the choreography off this.
          // In-front comes from VIEW space (projection flips signs behind
          // the eye, so post-projection z alone false-positives).
          _v.copy(f.mesh.position)
          m.group.localToWorld(_v)
          _v.applyMatrix4(state.camera.matrixWorldInverse)
          const j = probe[m.mood].jets[f.spec.id]
          const inFront = _v.z < 0
          _v.applyMatrix4(state.camera.projectionMatrix)
          j.x = _v.x
          j.y = _v.y
          j.ahead = inFront ? 1 : 0
        }
      }
      if (import.meta.env.DEV) probe[m.mood].presence = presence
    }
  })

  return <primitive object={root} />
}
