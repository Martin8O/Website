import { ScrollProvider } from './scroll/ScrollProvider'
import { useScrollProgress } from './scroll/useScrollProgress'
import styles from './App.module.css'

/**
 * A1 shell — no chapters, no canvas art yet (those arrive in A2 / Phase B).
 * This just proves the scroll engine end-to-end: a tall scroll track and a
 * fixed live read-out of the global `scrollProgress`.
 */
function ProgressReadout() {
  const progress = useScrollProgress()
  const pct = Math.round(progress * 1000) / 10

  return (
    <div className={styles.hud} aria-live="off">
      <span className={styles.hudLabel}>SCROLL</span>
      <span className={styles.hudValue}>{pct.toFixed(1)}%</span>
      <div className={styles.hudBar}>
        <div
          className={styles.hudBarFill}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  )
}

function App() {
  return (
    <ScrollProvider>
      <main className={styles.track}>
        <section className={styles.hero}>
          <p className={styles.kicker}>A1 · scroll engine online</p>
          <h1 className={styles.title}>Scroll to move through time.</h1>
          <p className={styles.hint}>The story arrives in the next chapters.</p>
        </section>
        <section className={styles.spacer} aria-hidden="true" />
        <section className={styles.spacer} aria-hidden="true" />
        <section className={styles.foot}>
          <p className={styles.hint}>End of track — engine holds at 100%.</p>
        </section>
      </main>
      <ProgressReadout />
    </ScrollProvider>
  )
}

export default App
