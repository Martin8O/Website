import { Suspense, lazy, useCallback, useRef, useState } from 'react'
import styles from './SiteNav.module.css'

/**
 * Minimal, unobtrusive nav — for now a single "Work" trigger (top-right) that
 * opens the full portfolio overview (WorkPanel). The heavy panel + its baked
 * screenshots are code-split behind React.lazy, so they load only when the
 * visitor actually opens Work. Focus returns to the trigger on close.
 *
 * C2 will grow this into the fuller nav (Contact jump, about essence, GitHub +
 * LinkedIn footer links).
 */
const WorkPanel = lazy(() => import('./WorkPanel').then((m) => ({ default: m.WorkPanel })))

export function SiteNav() {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    triggerRef.current?.focus()
  }, [])

  return (
    <nav className={styles.nav} aria-label="Site">
      <button
        ref={triggerRef}
        className={styles.work}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        Work
      </button>
      {open && (
        <Suspense fallback={null}>
          <WorkPanel onClose={close} />
        </Suspense>
      )}
    </nav>
  )
}
