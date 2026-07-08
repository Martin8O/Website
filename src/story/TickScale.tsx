import styles from './TickScale.module.css'

const TICK_COUNT = 12

/**
 * A minimal tick scale down the side — a subtle altimeter. C4 made the climb
 * continuous: passed ticks sit lit, the CURRENT tick brightens and glows in
 * the (blended) accent as the scroll works through it — the "gaining
 * altitude" read. Pure function of progress; scroll is the only animator, so
 * this needs no reduced-motion split.
 */
export function TickScale({
  progress,
  count,
}: {
  progress: number
  count: number
}) {
  const ticks = Math.min(TICK_COUNT, Math.max(count, 1))
  const exact = Math.min(progress * ticks, ticks - 0.001)
  const active = Math.floor(exact)
  const frac = exact - active

  return (
    <div className={styles.scale} aria-hidden="true">
      {Array.from({ length: ticks }, (_, i) => (
        <i
          key={i}
          className={styles.tick}
          style={{
            width: i % 2 ? '10px' : '18px',
            opacity: i < active ? 0.95 : i === active ? 0.35 + 0.6 * frac : 0.28,
            boxShadow:
              i === active
                ? `0 0 ${(2 + 6 * frac).toFixed(1)}px var(--accent, var(--amber))`
                : 'none',
          }}
        />
      ))}
    </div>
  )
}
