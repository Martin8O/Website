import type { ComponentType } from 'react'
import type { Theme } from '../data/chapters'
import type { Frame3D } from './frame3d'
import { Starfield } from './scenes3d/Starfield'

/** Props every 3D scene receives: which theme slot it augments + the shared
 *  mutable frame snapshot (read inside useFrame, never in render). */
export type Scene3DProps = {
  theme: Theme
  frame: Frame3D
}

/**
 * The 3D theme registry — the L2 mirror of the 2D `RENDERERS` map, total over
 * `Theme` so a new theme is a compile error here too. `null` = the 2D world
 * carries that scene alone (the E-phase strategy: AUGMENT scene by scene; a
 * scene only flips to 3D-owned when its 3D version clearly outclasses the 2D).
 *
 * E1 registers the two space scenes: the origin dawn and the contact finale
 * both gain a true-depth starfield.
 */
export const RENDERERS_3D: Record<Theme, ComponentType<Scene3DProps> | null> = {
  origin: Starfield,
  sky: null,
  calm: null,
  bitcoin: null,
  dev: null,
  offer: null,
  contact: Starfield,
}
