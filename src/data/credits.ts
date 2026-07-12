/**
 * Third-party asset credits — the CC-BY-4.0 aircraft models the 3D layer
 * flies (E3b). Every entry is read from the GLB's own Sketchfab metadata
 * (`asset.extras` in `public/models/*.glb` — the bake preserves it); the
 * attribution renders in the About panel's Credits popover. Data-driven: a new
 * hero model = one row here.
 *
 * LEGAL: all four deployed heroes are CC-BY-4.0 (commercial use allowed). The
 * licence only asks for TASL — Title, Author, Source link, Licence (name+link)
 * — plus, because we MODIFIED the meshes (bake, meshopt-free, gear/stores
 * stripped), a note that they are derived works. The Credits UI states "based
 * on … modified … under CC BY 4.0" + links `MODEL_LICENSE`, which satisfies
 * all of that. (The AIM-9 store is our OWN procedural geometry — see
 * `three/scenes3d/aim9.ts` — so it needs no credit.)
 */

/** The shared licence for every model below (they are all CC-BY-4.0). */
export const MODEL_LICENSE = {
  name: 'CC BY 4.0',
  href: 'https://creativecommons.org/licenses/by/4.0/',
} as const

export type ModelCredit = {
  /** The model's Sketchfab title. */
  title: string
  author: string
  /** The model's Sketchfab page (the CC-BY attribution link). */
  href: string
  /** Optional aside — e.g. which story aircraft this model stands in for. */
  note?: string
}

export const MODEL_CREDITS: readonly ModelCredit[] = [
  {
    title: 'Piper PA-18',
    author: 'Łukasz Paraszka',
    href: 'https://sketchfab.com/3d-models/piper-pa18-bs-ce0GXKJld5GR4DmHg1COO4EHUr8',
  },
  {
    title: 'Piper PA-28 Cadet',
    author: 'helijah',
    href: 'https://sketchfab.com/3d-models/piper-pa-28-cadet-ba310f1e1ba349c7a54ab9db92e48970',
    note: 'aka Z-142',
  },
  {
    title: 'L-39ZA Albatros',
    author: 'Jeyhun1985',
    href: 'https://sketchfab.com/3d-models/l-39za-art-albatros-4f694d2badee4852b917b25e567857d8',
  },
  {
    title: 'Aero L-159A ALCA',
    author: 'Yo Boy',
    href: 'https://sketchfab.com/3d-models/aero-l-159a-alca-08e7ac1986734239ae0c2179897ad972',
  },
]
