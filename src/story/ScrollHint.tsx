import styles from './ScrollHint.module.css'

/**
 * The "scroll" nudge at the very start. Fades out quickly as soon as the user
 * begins moving through time, then stays gone.
 */
export function ScrollHint({ progress }: { progress: number }) {
  const opacity = Math.max(0, 1 - progress * 14)
  if (opacity <= 0.01) return null

  return (
    <div className={styles.hint} style={{ opacity }} aria-hidden="true">
      <span className={styles.word}>Scroll</span>
      <span className={styles.arrow}>↓</span>
    </div>
  )
}
