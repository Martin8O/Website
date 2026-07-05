import styles from './TickScale.module.css'

const TICK_COUNT = 12

/**
 * A minimal tick scale down the side — a subtle altimeter. Ticks up to the
 * current scroll fraction light up; the rest sit dim. Derived from progress.
 */
export function TickScale({
  progress,
  count,
}: {
  progress: number
  count: number
}) {
  const ticks = Math.min(TICK_COUNT, Math.max(count, 1))
  const active = Math.floor(progress * ticks)

  return (
    <div className={styles.scale} aria-hidden="true">
      {Array.from({ length: ticks }, (_, i) => (
        <i
          key={i}
          className={styles.tick}
          style={{
            width: i % 2 ? '10px' : '18px',
            opacity: i <= active ? 0.95 : 0.28,
          }}
        />
      ))}
    </div>
  )
}
