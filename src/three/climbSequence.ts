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
        { step: 0.775, p: [-7.5, -3.25, -4.5], q: [-0.09, 0.9058, 0.239, 0.3382] },
        { step: 0.6557, p: [-6, -2.25, -6.25], q: [-0.1798, 0.9174, 0.1838, 0.3036] },
        { step: 0.6101, p: [-4.875, -1.5, -8.25], q: [-0.1681, 0.9206, 0.2256, 0.2708] },
        { step: 0.5592, p: [-3.75, -0.25, -10], q: [-0.2201, 0.8982, 0.2413, 0.294] },
        { step: 0, p: [-2.625, 0.75, -11.75], q: [-0.2002, 0.9091, 0.2218, 0.2902] },
      ],
    },
    {
      id: 'z142',
      name: 'Z-142',
      start: 0.026,
      size: 2.6,
      snaps: [
        { step: 0.3598, p: [-2.625, 0.75, -11.75], q: [0.2984, -0.8481, -0.0153, 0.4376] },
        { step: 0.3055, p: [-0.75, 1.25, -12.5], q: [0.2851, -0.6507, 0.6982, 0.0885] },
        { step: 0.263, p: [0.75, 1.75, -13.5], q: [0.2236, 0.0084, 0.9713, -0.0809] },
        { step: 0.3717, p: [2.25, 2, -14], q: [0.1101, 0.4616, 0.8796, 0.0312] },
        { step: 0, p: [4.125, 1.25, -14.25], q: [-0.171, -0.9042, -0.3898, -0.0365] },
      ],
    },
    {
      id: 'l39',
      name: 'L-39C',
      start: 0.039,
      size: 2.9,
      snaps: [
        { step: 0.2181, p: [4.125, 1.25, -14.25], q: [0.3965, 0.6135, 0.1547, 0.6652] },
        { step: 0.3688, p: [5.25, 0.25, -13.5], q: [-0.4219, -0.0725, -0.4529, -0.7821] },
        { step: 0.3589, p: [6.383, -1.604, -11.171], q: [-0.2507, -0.001, -0.3158, -0.9151] },
        { step: 0.4017, p: [6.383, -2.812, -8.046], q: [-0.0296, 0.1437, -0.3165, -0.9372] },
        { step: 0.3213, p: [4.704, -2.812, -4.587], q: [0.2502, 0.3684, -0.4802, -0.7557] },
        { step: 0.365, p: [1.718, -2.812, -3.845], q: [0.257, 0.6502, -0.2409, -0.6732] },
        { step: 0.3559, p: [-1.72, -2.812, -4.304], q: [0.4118, 0.7368, -0.2496, -0.4745] },
        { step: 0.979, p: [-4.216, -2.812, -6.365], q: [0.5424, 0.8151, -0.1039, -0.1749] },
        { step: 0.5609, p: [-4.938, -2.62, -14.919], q: [0.0116, 0.9891, 0.1445, -0.0244] },
        { step: 0.8169, p: [-5.038, -0.583, -18.532], q: [-0.0053, 0.8922, 0.4516, -0.004] },
        { step: 0.5035, p: [-5.038, 4.4, -20.22], q: [0.0003, 0.7858, 0.6185, 0] },
        { step: 0, p: [-5.038, 7.2, -20.954], q: [-0.0066, 0.7774, 0.6289, 0.0049] },
      ],
    },
  ],
  effects: [
    { at: 0.258096, span: 0.16625, follow: 'z142', r0: 1.3, r1: 1.95, peak: 0.28 },
    { at: 0.344546, span: 0.16625, follow: 'l39', r0: 1.45, r1: 2.17, peak: 0.28 },
  ],
}
