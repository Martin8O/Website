/**
 * DEPTH STARFIELD — the first true-3D content (E1), a world-space PLACE on
 * the flight path since E2. A baked cloud of stars at real depths behind the
 * 2D world's own layers, anchored where its scene's window begins: the
 * scroll-flight camera flies THROUGH it (real depth parallax — E1's dolly,
 * now owned by the camera), the pointer sways the camera a few centimetres
 * (near stars answer more than far ones), and each star twinkles on its own
 * baked phase.
 *
 * Story rules, same as every 2D renderer: presence derives from the SAME
 * scene timeline (slot alpha × the theme's presence curve — origin's stars
 * die with the 2D dawn, contact's arrive ahead of the galaxy bloom); `time`
 * only twinkles. Rendered as one additive Points draw with a soft round
 * sprite computed in the fragment shader — no textures, no assets.
 */

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { runWindow } from '../../canvas/sceneTimeline'
import { flightAnchorAt, createPose } from '../flightMath'
import { STARFIELDS, genStars, starPresence } from '../starfieldMath'
import type { Scene3DProps } from '../registry3d'

/** Vertical fov of the stage camera (Stage3D) — the point-size projection
 *  constant derives from it, so keep the two in sync. */
export const STAGE_FOV = 55

const VERTEX = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aPhase;
  uniform float uScale;
  varying vec3 vColor;
  varying float vPhase;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    // Perspective point size: world units → device px, capped so a star
    // passing right by the camera reads as soft bokeh, not a billboard.
    float dist = max(-mv.z, 1.0);
    gl_PointSize = min(aSize * uScale / dist, 26.0);
    vColor = aColor;
    vPhase = aPhase;
  }
`

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uAlpha;
  varying vec3 vColor;
  varying float vPhase;

  void main() {
    // Soft round sprite: quadratic falloff, exactly zero at the point rim.
    vec2 p = gl_PointCoord - 0.5;
    float disc = max(1.0 - dot(p, p) * 4.0, 0.0);
    disc *= disc;
    // Per-star twinkle on the baked phase; time 0 → a fixed mid-brightness.
    float tw = 0.72 + 0.28 * sin(uTime * (0.5 + vPhase * 1.5) + vPhase * 6.2832);
    gl_FragColor = vec4(vColor, disc * tw * uAlpha);
  }
`

export function Starfield({ theme, frame, flight }: Scene3DProps) {
  const spec = STARFIELDS[theme]
  if (!spec) {
    // A registry entry without a spec is a wiring bug — fail loudly in dev.
    throw new Error(`Starfield: no spec for theme "${theme}"`)
  }

  const stars = useMemo(() => genStars(spec), [spec])
  // World anchor: the pose where this theme's scene window begins, oriented
  // along the window's chord — the volume sits THERE and the camera flies
  // into it. (First run carries the field; no registered theme has two.)
  const anchor = useMemo(() => {
    const run = flight.runs.find((r) => r.theme === theme)
    if (!run) throw new Error(`Starfield: theme "${theme}" has no run in the story`)
    const [winStart, winEnd] = runWindow(run, flight.count)
    return flightAnchorAt(flight.path, winStart, winEnd, createPose())
  }, [flight, theme])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTime: { value: 0 },
          uAlpha: { value: 0 },
          uScale: { value: 800 },
        },
      }),
    [],
  )
  useEffect(() => () => material.dispose(), [material])

  // Point-size projection constant: device px per world unit at distance 1.
  const size = useThree((s) => s.size)
  const dpr = useThree((s) => s.viewport.dpr)
  useEffect(() => {
    const tanHalfFov = Math.tan((STAGE_FOV * Math.PI) / 360)
    material.uniforms.uScale.value = (size.height * dpr) / (2 * tanHalfFov)
  }, [size, dpr, material])

  const groupRef = useRef<THREE.Group>(null)
  const rollRef = useRef<THREE.Group>(null)

  // Place the volume at its world anchor, −z aligned with the window chord
  // (the same convention the bake uses: stars live down local −z).
  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.position.set(anchor.x, anchor.y, anchor.z)
    const m = new THREE.Matrix4().lookAt(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(anchor.fx, anchor.fy, anchor.fz),
      new THREE.Vector3(0, 1, 0),
    )
    group.quaternion.setFromRotationMatrix(m)
  }, [anchor])

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    // Presence = Σ slot alpha × story curve — the exact 2D cross-fade weights,
    // so the field fades with its scene, never on its own schedule.
    let presence = 0
    for (let i = 0; i < frame.count; i++) {
      const slot = frame.slots[i]
      if (slot.theme !== theme) continue
      presence += slot.alpha * starPresence(theme, slot.t)
    }

    // Dev-only verification hook (the __paintFrame idiom): tooling asserts
    // each field's live presence against the story timeline. Prod-stripped.
    if (import.meta.env.DEV) {
      const host = window as unknown as { __stars3d?: Record<string, number> }
      ;(host.__stars3d ??= {})[theme] = presence
    }

    const visible = presence > 0.002
    group.visible = visible
    if (!visible) return

    material.uniforms.uAlpha.value = Math.min(presence, 1)
    material.uniforms.uTime.value = frame.time
    // Ambient roll on the INNER group — the outer one owns the anchor pose.
    const roll = rollRef.current
    if (roll) roll.rotation.z = frame.time * spec.rotSpeed
  })

  return (
    <group ref={groupRef} visible={false}>
      <group ref={rollRef}>
        {/* The camera flies through the volume — a moving bounding sphere
            would make whole-cloud frustum culling flicker; cull per-GPU. */}
        <points frustumCulled={false}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[stars.positions, 3]} />
            <bufferAttribute attach="attributes-aColor" args={[stars.colors, 3]} />
            <bufferAttribute attach="attributes-aSize" args={[stars.sizes, 1]} />
            <bufferAttribute attach="attributes-aPhase" args={[stars.phases, 1]} />
          </bufferGeometry>
          <primitive object={material} attach="material" />
        </points>
      </group>
    </group>
  )
}
