/**
 * The shared L-159 hero model — ONE session-wide fetch+parse of the baked
 * GLB, cloned by every 3D beat that flies it (SkyPatrols' two flypast
 * pairs, CruiseBallet's one-circle fight). The conventions live here with
 * the loader so the beats can never disagree about them.
 */

import * as THREE from 'three'

export const MODEL_URL = '/models/l159.glb'

/** GLB → canonical nose −Z. The baked L-159 flies nose −X (verified on live
 *  screenshots; matches the showcase stores note), so the rest is −π/2 per
 *  the lab rule "nose −X → [0, −π/2, 0]". */
export const REST_Y = -Math.PI / 2

/** World scale — the baked GLB is 10-normalized along its length. */
export const JET_SCALE = 0.5

/** Wingtip offset in canonical pivot space (native span ±3.78 along Z maps
 *  to ±X after the rest), scaled to world — the vortex/vapour anchor. */
export const TIP_X = 3.78 * JET_SCALE

/** One session-wide fetch+parse; instances clone the cached scene. */
let l159Promise: Promise<THREE.Group> | null = null

export function loadL159(onProgress?: (f: number) => void): Promise<THREE.Group> {
  if (l159Promise) return l159Promise
  // No meshopt decoder: the GLB is baked with quantize only (KHR_mesh_
  // quantization, read natively) — EXT_meshopt_compression's WASM+blob
  // decoder is blocked by the site's hardened CSP, so the model is meshopt-
  // free by design (bake.mjs). Keep this loader WASM-free.
  // GLTFLoader itself is a DYNAMIC import: nothing needs it before the first
  // load kick, so it stays out of the Stage3D chunk's page-load parse/eval.
  // `onProgress` (0..1, this file's bytes) feeds the HUD loading indicator —
  // only the FIRST caller's callback sees it (the parse is session-cached).
  l159Promise = import('three/examples/jsm/loaders/GLTFLoader.js').then(
    ({ GLTFLoader }) =>
      new Promise<THREE.Group>((resolve, reject) => {
        new GLTFLoader().load(
          MODEL_URL,
          (gltf) => resolve(gltf.scene),
          (ev) => {
            if (ev.total > 0) onProgress?.(Math.min(ev.loaded / ev.total, 1))
          },
          reject,
        )
      }),
  )
  // A failed fetch lets a later mount retry instead of caching the rejection.
  l159Promise.catch(() => {
    l159Promise = null
  })
  return l159Promise
}
