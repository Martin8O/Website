/**
 * The SKY family — the pilot arc. One registry entry: the renderer dispatches
 * on `cfg.sky` (the chapter's sub-mood), so `chapters.ts` stays the single
 * source of truth and each mood is its own scene run (the scene timeline
 * already splits sky chapters per sub-mood, giving cross-fades for free).
 */

import type { Sky } from '../../../data/chapters'
import type { Renderer } from '../../types'
import { renderAirshow } from './airshow'
import { renderClimb } from './climb'
import { renderCruise } from './cruise'
import { renderDesert } from './desert'
import { renderSunset } from './sunset'

const SKY_SCENES: Record<Sky, Renderer> = {
  climb: renderClimb,
  cruise: renderCruise,
  desert: renderDesert,
  airshow: renderAirshow,
  sunset: renderSunset,
}

export const renderSky: Renderer = (ctx, alpha, localT, time, cfg) =>
  SKY_SCENES[cfg.sky ?? 'cruise'](ctx, alpha, localT, time, cfg)
