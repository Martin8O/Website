import type { Theme } from '../data/chapters'
import type { Renderer } from './types'
import { renderOrigin } from './scenes/origin'
import { renderPlaceholder } from './scenes/placeholder'
import { renderSky } from './scenes/sky'

/**
 * The theme registry — the ONE place a new visual kind is wired (CLAUDE.md).
 * The record is total over `Theme`: adding a theme to the data union without
 * registering a renderer here is a compile error.
 *
 * B1 shipped `origin` (the quality bar); B2 the `sky` family (five sub-moods
 * dispatched on `chapter.sky`). The rest are the shared placeholder
 * atmosphere until their prompts land: `calm` / `bitcoin` / `dev` → B3,
 * `contact` → C3.
 */
export const RENDERERS: Record<Theme, Renderer> = {
  origin: renderOrigin,
  sky: renderSky,
  calm: renderPlaceholder,
  bitcoin: renderPlaceholder,
  dev: renderPlaceholder,
  contact: renderPlaceholder,
}
