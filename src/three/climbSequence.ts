/**
 * CLIMB HEROES sequence data (E3b) — GENERATED, do not edit by hand.
 *
 * Source: scene-ulla_z142_l39.json
 * Regenerate:  node local/tools/seq/convert.mjs <lab-sequence.json>
 *
 * Martin authors the climb choreography in the choreo-lab and saves a JSON;
 * the converter re-bases it from absolute scroll-fractions into the site's
 * window-t units and writes this file. A new animation is just a new version
 * of this data — the pose engine (climbMath), runtime scene (ClimbHeroes),
 * framing, ownership flip and model bakes all stay put.
 */
import type { ClimbSequence } from './climbMath'

export const CLIMB_SEQ: ClimbSequence = {
  aircraft: [
    {
      id: 'ulla',
      name: 'Ultralight',
      start: 0,
      size: 2.6,
      holdBefore: true,
      snaps: [
        { step: 1, p: [-5.657, -3.917, -4.183], q: [-0.1154, 0.7052, -0.118, 0.6895] },
        { step: 1, p: [-4.838, -2.959, -5.409], q: [-0.2002, 0.685, -0.2048, 0.6698] },
        { step: 0, p: [-3.95, -2.053, -6.104], q: [-0.2737, 0.6579, -0.2799, 0.6433] },
      ],
    },
    {
      id: 'z142',
      name: 'Z-142',
      start: 0.02,
      size: 2.6,
      snaps: [
        { step: 1, p: [-3.95, -2.053, -6.104], q: [-0.0044, -0.9201, 0.3915, 0.0103] },
        { step: 1, p: [-2.978, -1.498, -7.082], q: [-0.0085, -0.6531, 0.7572, 0.0073] },
        { step: 1, p: [-1.266, -1.194, -7.082], q: [-0.0156, 0.0607, 0.9954, -0.0721] },
        { step: 1, p: [0.372, -1.194, -7.082], q: [-0.0166, 0.7087, 0.6956, -0.1165] },
        { step: 0, p: [2.443, -0.972, -6.636], q: [-0.0729, 0.988, -0.0589, 0.1226] },
      ],
    },
    {
      id: 'l39',
      name: 'L-39C',
      start: 0.06,
      size: 2.9,
      snaps: [
        { step: 0.9, p: [2.443, -0.972, -6.636], q: [0.0932, -0.6119, -0.0099, -0.7853] },
        { step: 0.9, p: [4.234, -1.289, -6.08], q: [-0.4963, -0.4097, -0.3895, -0.6589] },
        { step: 0.9, p: [4.893, -1.995, -5.401], q: [-0.206, 0.0775, -0.5588, -0.7996] },
        { step: 0.8, p: [4.594, -2.644, -4.572], q: [0.0139, 0.4601, -0.6602, -0.5936] },
        { step: 0.9, p: [3.245, -3.021, -3.993], q: [-0.0287, 0.8915, -0.2639, -0.3671] },
        { step: 0.6, p: [1.659, -2.841, -4.926], q: [-0.0087, 0.9432, 0.1444, -0.2991] },
        { step: 0.6, p: [0.921, -2.306, -5.815], q: [0.0337, 0.9133, 0.2763, -0.2973] },
        { step: 0.5, p: [0.451, -1.525, -6.457], q: [0.1124, 0.8052, 0.5119, -0.2773] },
        { step: 0.8, p: [0.281, -0.307, -6.673], q: [0.1668, 0.6834, 0.6659, -0.2484] },
        { step: 0, p: [0.166, 2.034, -6.788], q: [0.1977, 0.5911, 0.749, -0.2246] },
      ],
    },
  ],
  effects: [
    { at: 0.18, span: 0.15, follow: 'z142', r0: 1.3, r1: 1.95, peak: 0.28 },
    { at: 0.42, span: 0.15, follow: 'l39', r0: 1.45, r1: 2.17, peak: 0.28 },
  ],
}
