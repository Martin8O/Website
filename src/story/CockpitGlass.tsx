import { useEffect, useRef } from 'react'
import { setGlassCanvas } from '../canvas/glass'
import styles from './CockpitGlass.module.css'

/**
 * The cockpit-glass canvas mount (see canvas/glass.ts) — placed in Story's
 * DOM order between the 3D stage and the DOM story layers, so the green HUD
 * painted onto it stands in FRONT of the 3D ballet and still under every
 * text card. Purely a surface: CanvasStage's loop sizes and paints it.
 */
export function CockpitGlass() {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    setGlassCanvas(ref.current)
    return () => setGlassCanvas(null)
  }, [])
  return <canvas ref={ref} className={styles.glass} aria-hidden="true" />
}
