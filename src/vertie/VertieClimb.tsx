/**
 * THE CLIMB, PLAYED BY VERTIE (E1c) — the chapter-01 hero beat rendered by the
 * published `vertie` player instead of by the bespoke `ClimbHeroes` R3F scene.
 * Behind `?climb=vertie`; the default is still the bespoke scene (see `flag.ts`
 * for why).
 *
 * WHAT MOVED AND WHAT DID NOT. The choreography moved wholesale: the same
 * `CLIMB_SEQ` becomes an open-format document (`climbScene.ts` →
 * `public/climb/climb.json`) and the player's evaluator replaces `climbMath`'s
 * curve/slerp/time-warp — that is the point of the exercise. The site keeps
 * everything the format deliberately does not carry:
 *   · WHEN the beat runs — `driver="external"` means the host owns t (ADR-039),
 *     so the scene still breathes on the climb run's own localT, the same clock
 *     the 2D environment uses. The player has no loop of its own here; the rAF
 *     below IS the frame.
 *   · HOW MUCH of the frame it owns — `skyPresence` × the white-out swallow,
 *     applied as one composited layer opacity instead of per-material alpha.
 *   · The golden unlock rings, the type-name flashes and the whole environment:
 *     still painted by the 2D scene, still projected by `climbMath`, and still
 *     landing on the aircraft because `frustum-clamp="0.87"` reproduces
 *     `climbXScale` exactly (ADR-038).
 *
 * KNOWN GAPS versus the bespoke scene, all of them format limits rather than
 * integration shortcuts: no light rig (spec §5 has only an environment map —
 * the morning key is baked into `morning.hdr` instead), therefore NO real
 * self-shadowing, and no spinning propellers (the site's bake carries the spin
 * as glTF `extras` on a sub-node; the format animates whole assets). The
 * pointer micro-parallax is gone too — the player's stage camera is fixed.
 */

import { useEffect, useRef } from 'react'
import { CHAPTER_WEIGHTS, type Chapter } from '../data/chapters'
import { chapterPosition } from '../timeline'
import { getScrollProgress, setScrollProgress } from '../scroll/scrollStore'
import { buildRuns, resolveSceneFrame, runLocalTRaw, type SceneRun } from '../canvas/sceneTimeline'
import {
  CLIMB_SEQ,
  buildTrack,
  createClimbPose,
  poseTrackAt,
  skyPresence,
  type SlotLike,
} from '../three/climbMath'
import { heroClimbPunch } from '../canvas/scenes/sky/skyMath'
import { setHero3DReady } from '../three/owned3d'
import {
  beginHeroLoad,
  failHeroLoad,
  finishHeroLoad,
  reportHeroProgress,
  resetHeroLoad,
} from '../three/heroLoad'
import { CLIMB_FRUSTUM_CLAMP, climbSceneT, climbWindowT } from './climbScene'
import styles from './VertieClimb.module.css'

/** The generated scene document (see `scripts/gen-vertie-climb.mjs`). */
const SCENE_URL = '/climb/climb.json'

/** Chapter positions either side of the beat where the player exists at all.
 *  Mirrors the bespoke scene's build/park band (`LOAD_AT_POS` / `PARK_OUT`):
 *  approach early enough that the models are decoded before the flip, and let
 *  the whole WebGL context go once the story is well past. */
const MOUNT_IN = 0.15
const MOUNT_OUT = 2.0

/** Below this the layer is invisible, so nothing needs to be pushed at all. */
const PRESENCE_EPS = 0.002

/** The public surface of `<vertie-scene>` this layer uses. `t` is the whole
 *  external-driver contract: assigning it renders synchronously, in this
 *  stack, on this frame (ADR-039 — there is no loop to owe the frame to). */
type VertieSceneElement = HTMLElement & {
  t: number
  /** Dev-only handle (present only with the `debug` attribute) — used by the
   *  parity probe to evaluate the player at an arbitrary t off the hot path. */
  devTools?: { evalAt(t: number): { tracks: { id: string; pose: { p: number[] } }[] } | null } | null
}

type ProgressDetail = { progress: number; phase: string }

/** Dev-only probe: the live push state, plus a parity check that samples the
 *  published player and the bespoke `climbMath` engine at the same instant and
 *  returns the largest position discrepancy across the three aircraft. */
type VertieClimbProbe = {
  mounted: boolean
  ready: boolean
  pos: number
  tRaw: number
  t: number
  presence: number
  parity?: (t?: number) => { maxErr: number; samples: number } | null
  step?: (progress?: number) => void
}

export function VertieClimb({ chapters }: { chapters: readonly Chapter[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const runs = buildRuns(chapters)
    const count = chapters.length
    const climbRun: SceneRun | null =
      runs.find((r) => r.theme === 'sky' && r.sky === 'climb') ?? null
    if (!climbRun) return

    let alive = true
    let element: VertieSceneElement | null = null
    let ready = false
    let sceneDuration = 0
    let raf = 0
    // Reused every frame — this loop allocates nothing (the codebase idiom).
    const slots: [SlotLike, SlotLike] = [
      { theme: '', alpha: 0 },
      { theme: '', alpha: 0 },
    ]

    // The element registers itself on import, so the chunk is the registration.
    // Kept dynamic for the same reason the R3F stage is: nothing about the
    // player belongs on the critical path.
    const loading = import('vertie')

    // Give <vertie-scene> an EXPLICIT pixel size instead of trusting its internal
    // layout. The element is built for a drop-in scroll embed: its shadow root
    // sizes the canvas through a chain of percentage heights and a
    // `position: sticky` viewport. Driven externally as a full-screen overlay
    // that chain can collapse (seen live: the whole scene squashed into the
    // top-left corner at backing-store size while the 2D labels stayed correct),
    // and my headless pane always resolved the percentages so it never showed.
    // Sizing the host in real pixels from the always-full-screen `.stage` box
    // sidesteps the chain entirely, and the size change trips the element's own
    // ResizeObserver so the drawing buffer re-fits and repaints.
    const sizeToHost = () => {
      if (!element) return
      const w = host.clientWidth
      const h = host.clientHeight
      if (w <= 0 || h <= 0) return
      element.style.width = `${w}px`
      element.style.height = `${h}px`
    }
    const hostResizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(sizeToHost) : null
    hostResizeObserver?.observe(host)

    const onReady = () => {
      ready = true
      setHero3DReady('climb', true)
      finishHeroLoad('climb')
      // Layout is settled by now; guarantee the element is at the true size.
      sizeToHost()
    }
    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent<ProgressDetail>).detail
      if (detail) reportHeroProgress('climb', detail.progress)
    }
    const onError = () => {
      // Same contract as a failed GLB fetch in the bespoke scene: readiness is
      // never reported, so the 2D silhouette hero simply keeps flying.
      ready = false
      setHero3DReady('climb', false)
      failHeroLoad('climb')
    }

    const mount = () => {
      if (element) return
      const el = document.createElement('vertie-scene') as VertieSceneElement
      el.className = styles.scene
      el.setAttribute('src', SCENE_URL)
      el.setAttribute('driver', 'external')
      // ADR-038: cap every key at 87 % of the half-frustum at its own depth —
      // the runtime policy the site has always applied as `climbXScale`.
      el.setAttribute('frustum-clamp', String(CLIMB_FRUSTUM_CLAMP))
      // The debug attribute unlocks `dev().evalAt` for the parity probe (and
      // keeps the drawing buffer readable for pixel readback) — DEV only.
      if (import.meta.env.DEV) el.setAttribute('debug', '')
      el.addEventListener('vertie-ready', onReady)
      el.addEventListener('vertie-progress', onProgress)
      el.addEventListener('vertie-error', onError)
      resetHeroLoad('climb')
      beginHeroLoad('climb')
      host.appendChild(el)
      element = el
      // Definite pixel size from the first frame, before anything renders.
      sizeToHost()
    }

    const unmount = () => {
      if (!element) return
      element.removeEventListener('vertie-ready', onReady)
      element.removeEventListener('vertie-progress', onProgress)
      element.removeEventListener('vertie-error', onError)
      // Disconnecting tears the renderer down (deferred one task, cancelled by
      // a reconnect) — the whole WebGL context goes with it.
      element.remove()
      element = null
      ready = false
      setHero3DReady('climb', false)
      resetHeroLoad('climb')
      host.style.opacity = '0'
    }

    // Dev-only verification hook (the site's __-probe idiom): a harness reads
    // the live push state to assert the player tracks the climb clock. Stripped
    // from prod builds.
    const probe: VertieClimbProbe | null = import.meta.env.DEV
      ? ((window as unknown as { __vertieClimb?: VertieClimbProbe }).__vertieClimb = {
          mounted: false,
          ready: false,
          pos: 0,
          tRaw: 0,
          t: 0,
          presence: 0,
          // Parity: the same authored motion, evaluated by both engines. The
          // player's clamp is a render-layer scale applied AFTER evaluation, so
          // `evalAt` (the pure SceneState) is compared to `poseTrackAt` (the
          // pure bespoke pose) — the choreography, not the framing.
          parity: (at?: number) => {
            const dev = element?.devTools
            if (!dev || sceneDuration <= 0) return null
            const tt = at ?? climbSceneT(runLocalTRaw(probe!.pos, climbRun, count), sceneDuration)
            const state = dev.evalAt(tt)
            if (!state) return null
            // bespoke poseTrackAt takes window-t; convert this player t back
            const windowT = climbWindowT(tt, sceneDuration)
            let maxErr = 0
            let samples = 0
            for (const a of CLIMB_SEQ.aircraft) {
              const ts = state.tracks.find((s) => s.id === `${a.id}-leg`)
              if (!ts) continue
              const bespoke = createClimbPose()
              poseTrackAt(buildTrack(a), windowT, bespoke)
              const dx = ts.pose.p[0] - bespoke.p[0]
              const dy = ts.pose.p[1] - bespoke.p[1]
              const dz = ts.pose.p[2] - bespoke.p[2]
              maxErr = Math.max(maxErr, Math.hypot(dx, dy, dz))
              samples++
            }
            return { maxErr, samples }
          },
        })
      : null

    // One frame's work, split from the rAF scheduling so the DEV probe can
    // step it by hand in a background tab (where rAF is paused — the project's
    // documented verification gotcha).
    const tick = () => {
      const pos = chapterPosition(getScrollProgress(), count, CHAPTER_WEIGHTS)
      const near = pos > MOUNT_IN && pos < climbRun.end + 1 + MOUNT_OUT
      if (!near) {
        unmount()
        if (probe) probe.mounted = false
        return
      }
      mount()

      // The scene's clock: the climb run's own unclamped localT — the exact
      // value the 2D environment paints by, so the layers cannot desync.
      const tRaw = runLocalTRaw(pos, climbRun, count)
      const punch = heroClimbPunch(Math.min(Math.max(tRaw, 0), 1))

      // Presence, composed exactly as the bespoke scene composed it.
      const resolved = resolveSceneFrame(pos, runs, count)
      let n = 0
      if (resolved) {
        slots[0].theme = resolved.base.run.theme
        slots[0].alpha = resolved.base.alpha
        n = 1
        if (resolved.incoming) {
          slots[1].theme = resolved.incoming.run.theme
          slots[1].alpha = resolved.incoming.alpha
          n = 2
        }
      }
      const presence = ready ? skyPresence(slots, n) * (1 - punch.fog) * (1 - punch.above) : 0
      host.style.opacity = presence > PRESENCE_EPS ? String(presence) : '0'

      // Push t even while invisible: the player renders on demand, and a push
      // that arrives only when the layer becomes visible would show one stale
      // frame first. Skipped only before the scene exists.
      const t = sceneDuration > 0 ? climbSceneT(tRaw, sceneDuration) : 0
      if (element && sceneDuration > 0) element.t = t

      if (probe) {
        probe.mounted = element !== null
        probe.ready = ready
        probe.pos = pos
        probe.tRaw = tRaw
        probe.t = t
        probe.presence = presence
      }
    }

    const frame = () => {
      raf = requestAnimationFrame(frame)
      tick()
    }

    // DEV: force a scroll position and run one frame synchronously (no rAF),
    // so a harness can drive the flip in a background tab.
    if (probe) {
      probe.step = (progress?: number) => {
        if (progress !== undefined) setScrollProgress(progress)
        tick()
      }
    }

    loading
      .then(async () => {
        if (!alive) return
        // The host needs the scene's own length to map its window-t onto the
        // player's normalized t. Read it from the document rather than
        // duplicating the number in code.
        const res = await fetch(SCENE_URL)
        const doc = (await res.json()) as { duration?: number }
        if (!alive) return
        sceneDuration = doc.duration ?? 0
        raf = requestAnimationFrame(frame)
      })
      .catch(() => {
        /* No player, no flip — the 2D hero keeps flying. */
      })

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      hostResizeObserver?.disconnect()
      unmount()
    }
  }, [chapters])

  return <div ref={hostRef} className={styles.stage} aria-hidden="true" />
}
