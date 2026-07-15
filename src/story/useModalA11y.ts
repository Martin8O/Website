import { useEffect, type RefObject } from 'react'
import { setScrollLocked, setStoryCovered } from '../scroll/scrollStore'

/**
 * Shared modal manners for WorkPanel + AboutPanel: Escape closes, Tab cycles
 * INSIDE the dialog (aria-modal promises the background doesn't exist — the
 * trap makes the keyboard agree), and the story behind stops scrolling while
 * the dialog stands (same Lenis gate the preloader uses; the lock counts, so
 * overlapping holders can't steal each other's lock).
 */
export function useModalA11y(panelRef: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    setScrollLocked(true)
    // Pause the 2D + 3D render loops while this dialog covers the world.
    setStoryCovered(true)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement
      const inside = panel.contains(active)
      // Wrap at the edges; if focus somehow escaped (scrollbar click), pull it back in.
      if (e.shiftKey ? active === first || !inside : active === last || !inside) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      setScrollLocked(false)
      setStoryCovered(false)
    }
  }, [panelRef, onClose])
}
