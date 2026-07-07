import type { Theme } from '../data/chapters'
import type { Renderer } from './types'
import { renderBitcoin } from './scenes/bitcoin'
import { renderCalm } from './scenes/calm'
import { renderContact } from './scenes/contact'
import { renderDev } from './scenes/dev'
import { renderOrigin } from './scenes/origin'
import { renderSky } from './scenes/sky'

/**
 * The theme registry — the ONE place a new visual kind is wired (CLAUDE.md).
 * The record is total over `Theme`: adding a theme to the data union without
 * registering a renderer here is a compile error.
 *
 * B1 shipped `origin` (the quality bar); B2 the `sky` family (five sub-moods
 * dispatched on `chapter.sky`); B3a `calm` (the healing lake); B3b `bitcoin`
 * (the living blockchain); B3c `dev` (the creative-explosion world); C3
 * `contact` (the breathing finale) — every world is real now.
 */
export const RENDERERS: Record<Theme, Renderer> = {
  origin: renderOrigin,
  sky: renderSky,
  calm: renderCalm,
  bitcoin: renderBitcoin,
  dev: renderDev,
  contact: renderContact,
}
