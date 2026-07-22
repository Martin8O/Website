/**
 * E1c — which engine flies the chapter-01 climb heroes.
 *
 * `?climb=vertie` swaps the bespoke `ClimbHeroes` R3F scene for the published
 * `vertie` player (`<vertie-scene driver="external">`). The DEFAULT stays
 * `r3f`: the player cannot yet express the scene's light rig, its self-shadows
 * or the spinning propellers, so flipping the default is a separate, deliberate
 * decision — not a side effect of landing the integration.
 *
 * Mirrors `worldMode`'s `?world=` override in shape and in spirit: one query
 * parameter, parsed from a string so it is unit-testable, anything unknown
 * meaning "no override".
 */

export type ClimbEngine = 'r3f' | 'vertie'

/** `?climb=vertie|r3f` from a location search string; anything else = default. */
export function parseClimbEngine(search: string): ClimbEngine {
  const v = new URLSearchParams(search).get('climb')
  return v === 'vertie' || v === 'r3f' ? v : 'r3f'
}

/** The engine this page load runs. Read once — the choice is a page-load
 *  decision (it swaps a whole WebGL layer), never a live toggle. */
export function climbEngine(): ClimbEngine {
  if (typeof window === 'undefined') return 'r3f'
  return parseClimbEngine(window.location.search)
}
