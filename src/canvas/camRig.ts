/**
 * The CAMERA-RIG channel — the text planes (chapter cards, offer panels)
 * ride the engine's landing shake + pointer micro-parallax as one inline
 * transform, written by CanvasStage's render loop straight onto each
 * registered element. The chapter cards also take the ballet's depth mask
 * (CruiseBallet) through the same channel.
 *
 * Writing onto the planes themselves (instead of custom properties on the
 * document root) keeps a moving pointer or a passing jet from invalidating
 * the style of the whole page every frame: only the rig elements change.
 * Module-level, no React in the hot path (the glass.ts idiom).
 */

const rigs = new Set<HTMLElement>()
const maskRigs = new Set<HTMLElement>()
let transform = ''
let mask = ''

/** Registers a text plane; returns the unregister. `masked` planes also
 *  carry the ballet depth mask. A late-mounting plane picks up the current
 *  state at once. */
export function registerCamRig(el: HTMLElement, masked = false): () => void {
  rigs.add(el)
  el.style.transform = transform
  if (masked) {
    maskRigs.add(el)
    writeMask(el)
  }
  return () => {
    rigs.delete(el)
    maskRigs.delete(el)
    el.style.transform = ''
    el.style.removeProperty('--ballet-mask')
  }
}

/** Sets the rig offset in CSS px (call only when it changed). Zero falls back
 *  to the stylesheet's rest pose. */
export function setCamRigOffset(x: number, y: number): void {
  transform = x === 0 && y === 0 ? '' : `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
  for (const el of rigs) el.style.transform = transform
}

/** Sets the ballet depth mask (a full mask-image value), or '' for none. */
export function setCamRigMask(value: string): void {
  if (value === mask) return
  mask = value
  for (const el of maskRigs) writeMask(el)
}

function writeMask(el: HTMLElement): void {
  if (mask === '') el.style.removeProperty('--ballet-mask')
  else el.style.setProperty('--ballet-mask', mask)
}
