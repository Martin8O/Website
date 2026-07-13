/**
 * CLIMB HEROES sequence data (E3b) — GENERATED, do not edit by hand.
 *
 * Source: scene-ulla_z142_l39 xx.physics.json
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
        { step: 0.7366, p: [-8.75, -3.25, -4.5], q: [-0.0266, 0.9744, 0.1387, 0.1748] },
        { step: 0.7094, p: [-6.825, -2.25, -9.75], q: [-0.1278, 0.9751, 0.1075, 0.1461] },
        { step: 0.5902, p: [-5.381, -1.5, -15.75], q: [-0.0436, 0.9822, 0.1338, 0.1245] },
        { step: 0.5638, p: [-3.937, -0.25, -21], q: [-0.0869, 0.9765, 0.1437, 0.1354] },
        { step: 0, p: [-2.494, 0.75, -26.25], q: [-0.2423, 0.8849, 0.0111, 0.3976] },
      ],
    },
    {
      id: 'z142',
      name: 'Z-142',
      start: 0.026,
      size: 2.6,
      snaps: [
        { step: 0.366, p: [-2.494, 0.75, -26.25], q: [0.1792, -0.9069, 0.1635, 0.3446] },
        { step: 0.3732, p: [-0.087, 1.25, -28.5], q: [0.3884, -0.594, 0.6595, 0.2479] },
        { step: 0.2559, p: [1.838, 1.75, -31.5], q: [0.4044, 0.0308, 0.9129, -0.0453] },
        { step: 0.3049, p: [3.763, 2, -33], q: [0.2123, 0.495, 0.8413, -0.0463] },
        { step: 0, p: [6.169, 1.25, -33.75], q: [-0.1191, 0.6972, 0.5075, 0.4921] },
      ],
    },
    {
      id: 'l39',
      name: 'L-39',
      start: 0.039,
      size: 2.9,
      snaps: [
        { step: 0.1741, p: [6.169, 1.25, -33.75], q: [-0.2747, -0.145, -0.4431, -0.841] },
        { step: 0.4002, p: [7.613, 0.25, -31.5], q: [-0.213, -0.0559, -0.5275, -0.8205] },
        { step: 0.4726, p: [9.066, -1.604, -24.513], q: [-0.0865, -0.0092, -0.3188, -0.9438] },
        { step: 0.517, p: [9.066, -2.812, -15.138], q: [0.0044, 0.0612, -0.2685, -0.9613] },
        { step: 0.2204, p: [6.912, -2.812, -4.761], q: [0.1852, 0.2541, -0.5349, -0.7842] },
        { step: 0.2325, p: [3.079, -2.812, -2.535], q: [0.4238, 0.536, -0.4467, -0.5775] },
        { step: 0.3583, p: [-1.333, -2.812, -3.912], q: [0.5729, 0.7143, -0.2474, -0.3167] },
        { step: 1.3693, p: [-4.536, -2.812, -10.095], q: [0.5728, 0.814, -0.0489, -0.0826] },
        { step: 0.6947, p: [-5.462, -2.62, -35.757], q: [0.004, 0.9978, 0.065, -0.0093] },
        { step: 0.519, p: [-5.591, -0.583, -46.596], q: [-0.0078, 0.9659, 0.2586, -0.0012] },
        { step: 0.2919, p: [-5.591, 4.4, -51.66], q: [0.0036, 0.9016, 0.4325, -0.0014] },
        { step: 0, p: [-5.591, 7.2, -53.862], q: [-0.0069, 0.8887, 0.4584, 0.0032] },
      ],
    },
  ],
  effects: [
    { at: 0.258096, span: 0.16625, follow: 'z142', r0: 1.3, r1: 1.95, peak: 0.28 },
    { at: 0.344546, span: 0.16625, follow: 'l39', r0: 1.45, r1: 2.17, peak: 0.28 },
  ],
}
