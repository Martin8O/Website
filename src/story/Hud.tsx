import styles from './Hud.module.css'

/**
 * The amber HUD instrument — the cockpit-gauge through-line of the whole site.
 * Reads the current era and the raw scroll percentage. The accent tint comes
 * from the active theme via the `--accent` custom property set on the stage.
 */
export function Hud({ era, progress }: { era: string; progress: number }) {
  const pct = Math.round(progress * 100)

  return (
    <div className={styles.hud} aria-hidden="true">
      <span className={styles.era}>{era || '—'}</span>
      <span className={styles.dot} />
      <span className={styles.pct}>{pct}%</span>
    </div>
  )
}
