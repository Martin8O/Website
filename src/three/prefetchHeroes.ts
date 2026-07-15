/**
 * Warm the HTTP cache for the FIRST 3D hero (the climb GLBs) as soon as the
 * page has settled — DECOUPLED from the Stage3D mount chain (idle → mount →
 * 906 KB three chunk fetch+parse → ClimbHeroes mount → kickLoad → GLB fetch).
 *
 * On a phone that whole chain often hadn't finished by the time a visitor
 * reached ch-01, so the first hero showed 2D on the first pass (mobile audit
 * 2026-07-15 §3). A low-priority fetch here runs the GLB download in PARALLEL
 * with the chunk fetch, so when GLTFLoader finally asks for the models it is a
 * cache hit and the hero is ready far sooner.
 *
 * Safe by construction: same-origin (`connect-src 'self'` — no CSP change,
 * unlike a `<link rel=prefetch>` which `default-src 'none'` would block),
 * runs only after `load` at low priority so it never competes with FCP, and
 * it is a pure cache warm — the bytes are discarded, the browser cache keeps
 * them. Idempotent; a failed warm is ignored (the loader fetches normally).
 *
 * URLs mirror `ClimbHeroes.tsx` MODEL_URLS — keep the two in sync (the first
 * hero is the climb ladder; the later Bagram/patrol models have chapters of
 * scroll to load and are not warmed here).
 */
const CLIMB_HERO_URLS = ['/models/ulla.glb', '/models/z142.glb', '/models/l39.glb']

let warmed = false

export function warmFirstHero(): void {
  if (warmed || typeof fetch !== 'function') return
  warmed = true
  const run = () => {
    for (const url of CLIMB_HERO_URLS) {
      // Low priority + a real cache read: populate the browser cache so the
      // GLTFLoader fetch that follows is a hit. Failures are ignored — the
      // loader will fetch normally, and a warm is never load-bearing.
      fetch(url, { priority: 'low', cache: 'force-cache' } as RequestInit).catch(() => {})
    }
  }
  if (document.readyState === 'complete') run()
  else window.addEventListener('load', run, { once: true })
}
