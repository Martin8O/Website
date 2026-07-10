/**
 * DEPTH STARFIELD — the first true-3D content (E1). A baked cloud of stars at
 * real depths behind the 2D world's own layers: scroll dollies the field
 * toward the camera (real depth parallax), the pointer sways the camera a
 * few centimetres (near stars answer more than far ones), and each star
 * twinkles on its own baked phase.
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

export function Starfield({ theme, frame }: Scene3DProps) {
  const spec = STARFIELDS[theme]
  if (!spec) {
    // A registry entry without a spec is a wiring bug — fail loudly in dev.
    throw new Error(`Starfield: no spec for theme "${theme}"`)
  }

  const stars = useMemo(() => genStars(spec), [spec])
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

  useFrame(() => {
    const group = groupRef.current
    if (!group) return

    // Presence = Σ slot alpha × story curve — the exact 2D cross-fade weights,
    // so the field fades with its scene, never on its own schedule. The
    // dominant slot's tRaw drives the dolly (continuous through cross-fades).
    let presence = 0
    let tRaw = 0
    let best = -1
    for (let i = 0; i < frame.count; i++) {
      const slot = frame.slots[i]
      if (slot.theme !== theme) continue
      presence += slot.alpha * starPresence(theme, slot.t)
      if (slot.alpha > best) {
        best = slot.alpha
        tRaw = slot.tRaw
      }
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
    group.position.z = spec.dolly * tRaw
    group.rotation.z = frame.time * spec.rotSpeed
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* The group translates/rolls a camera-space volume — a moving bounding
          sphere would make whole-cloud frustum culling flicker; cull per-GPU. */}
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
  )
}
