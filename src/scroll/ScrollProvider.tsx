import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'
import { registerScrollDriver, setScrollProgress } from './scrollStore'

/**
 * Owns the one and only smooth-scroll rhythm for the site.
 *
 * Lenis drives a single ticker; on every frame it reports its own progress
 * (0..1), which we push into the global `scrollStore`. There is exactly one
 * smoothing pass here — no double-smoothing downstream.
 *
 * Accessibility: when the user prefers reduced motion we disable Lenis's
 * momentum smoothing entirely (native scroll), but still report progress so
 * the story stays fully driveable.
 */
export function ScrollProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    const lenis = new Lenis({
      // Reduced motion → no momentum, native-feeling scroll (still tracked).
      smoothWheel: !prefersReducedMotion,
      // A gentle, momentum-aware ease when smoothing is on.
      lerp: prefersReducedMotion ? 1 : 0.1,
    })

    // Seed once so first paint is correct.
    setScrollProgress(lenis.progress ?? 0)

    lenis.on('scroll', ({ progress }: { progress: number }) => {
      setScrollProgress(progress)
    })

    // Nav / skip-link jumps ride the same Lenis rhythm (scrollStore relays).
    // Reduced motion always teleports — a multi-chapter glide IS the motion.
    registerScrollDriver((target, immediate) => {
      const limit = lenis.limit || document.documentElement.scrollHeight - window.innerHeight
      lenis.scrollTo(target * limit, {
        immediate: immediate || prefersReducedMotion,
        // A long jump (Contact from the top) gets a fixed flight time instead
        // of Lenis's distance-based default, which would take ~forever.
        duration: 2.2,
      })
    })

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      registerScrollDriver(null)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
