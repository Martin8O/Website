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
 * URLs mirror the scenes' MODEL_URLS — keep in sync. The climb ladder is FIRST
 * (its chapter comes first and it is the flakiest), then the ballet + Bagram
 * models so ch-02/03 are warm too (Bagram was the worst first-load on a phone —
 * "thought it never loads"; 5 MB it now downloads in the background while the
 * visitor reads the earlier chapters). Low priority, so nothing races paint.
 */
const CLIMB_HERO_URLS = [
  '/models/ulla.glb',
  '/models/z142.glb',
  '/models/l39.glb',
  '/models/l159.glb',
  '/models/c17.glb',
  '/models/apache.glb',
  '/models/f16.glb',
  '/models/mi17.glb',
]

let warmed = false

function afterLoad(run: () => void): void {
  if (document.readyState === 'complete') run()
  else window.addEventListener('load', run, { once: true })
}

export function warmFirstHero(): void {
  if (warmed || typeof fetch !== 'function') return
  warmed = true
  afterLoad(() => {
    for (const url of CLIMB_HERO_URLS) {
      // Low priority + a real cache read: populate the browser cache so the
      // GLTFLoader fetch that follows is a hit. Failures are ignored — the
      // loader will fetch normally, and a warm is never load-bearing.
      fetch(url, { priority: 'low', cache: 'force-cache' } as RequestInit).catch(() => {})
    }
  })
}

let chunkWarmed = false

/**
 * Pre-fetch + parse the 906 KB `Stage3D` chunk right after `load`, IN PARALLEL
 * with the hero GLBs — so it is cached before `useIdleAfterLoad` mounts the 3D
 * island (which otherwise fetches it only on mount, one more serial step before
 * ch-01 can show 3D). Same module the lazy import in Story pulls, so this just
 * warms its cache; still after `load`, so it never competes with first paint.
 */
export function warmStage3DChunk(): void {
  if (chunkWarmed) return
  chunkWarmed = true
  afterLoad(() => {
    import('./Stage3D').catch(() => {})
  })
}
