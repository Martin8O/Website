import styles from './Vignette.module.css'

/**
 * A soft dark vignette framing the scene, with a whisper of the active theme
 * accent at the edges (via the stage `--accent` var). Pure decoration; keeps
 * the plain dark backdrop from feeling flat until the Phase-B art lands.
 */
export function Vignette() {
  return <div className={styles.vignette} aria-hidden="true" />
}
