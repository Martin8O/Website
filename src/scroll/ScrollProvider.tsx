import { useEffect, type ReactNode } from 'react'
import Lenis from 'lenis'
import { setScrollProgress } from './scrollStore'

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

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
