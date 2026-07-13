/**
 * Shared surface-lift helpers for the GLB heroes — used by the patrols, the
 * ballet and the climb heroes alike (one module so the beats can never
 * disagree about the look machinery, and so no scene has to import another
 * scene just for a texture bake).
 */

import * as THREE from 'three'

/** Sobel a texture's luminance into a subtle tangent-space normal map (the
 *  showcase's surface lift — panel-line relief from the paint's own dark
 *  lines; the sources ship baseColor only). Computed once per texture,
 *  cached by the caller. */
export function normalFromMap(tex: THREE.Texture): THREE.Texture | null {
  const img = tex.image as { width?: number; height?: number } | undefined
  if (!img || !img.width || !img.height) return null
  const w = Math.min(img.width, 1024)
  const h = Math.min(img.height, 1024)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(tex.image as CanvasImageSource, 0, 0, w, h)
  const src = ctx.getImageData(0, 0, w, h).data
  const out = ctx.createImageData(w, h)
  const lum = (x: number, y: number): number => {
    const i = (y * w + x) * 4
    return (src[i] * 0.3 + src[i + 1] * 0.59 + src[i + 2] * 0.11) / 255
  }
  const S = 2.2
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const xl = Math.max(x - 1, 0)
      const xr = Math.min(x + 1, w - 1)
      const yt = Math.max(y - 1, 0)
      const yb = Math.min(y + 1, h - 1)
      const dx = (lum(xl, y) - lum(xr, y)) * S
      const dy = (lum(x, yt) - lum(x, yb)) * S
      const nz = 1
      const len = Math.hypot(dx, dy, nz)
      const i = (y * w + x) * 4
      out.data[i] = ((dx / len) * 0.5 + 0.5) * 255
      out.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255
      out.data[i + 2] = (nz / len) * 255
      out.data[i + 3] = 255
    }
  }
  ctx.putImageData(out, 0, 0)
  const nt = new THREE.CanvasTexture(c)
  nt.wrapS = tex.wrapS
  nt.wrapT = tex.wrapT
  nt.flipY = tex.flipY
  nt.needsUpdate = true
  return nt
}
