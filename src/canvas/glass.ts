/**
 * The COCKPIT-GLASS channel — a transparent 2D canvas that sits ABOVE the
 * Stage3D layer (and still under every DOM story layer), so cockpit-glass
 * symbology — the green HUD you fly the L-159 behind — renders IN FRONT of
 * the 3D world: the ballet pair corkscrews BEHIND the glass, exactly like a
 * real head-up display.
 *
 * The element is mounted by `<CockpitGlass>` (Story.tsx places it between
 * the 3D stage and the DOM layers — stacking is pure DOM order there), but
 * it is PAINTED by CanvasStage's own render loop: one module-level channel
 * between the two, no React in the hot path (the owned3d idiom).
 */

let glassEl: HTMLCanvasElement | null = null

export function setGlassCanvas(el: HTMLCanvasElement | null): void {
  glassEl = el
}

export function getGlassCanvas(): HTMLCanvasElement | null {
  return glassEl
}
