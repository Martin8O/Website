/**
 * Third-party asset credits — the CC-BY-4.0 aircraft models the 3D layer
 * flies (E3b). Every entry is read from the GLB's own Sketchfab metadata
 * (`asset.extras` in `public/models/*.glb` — the bake preserves it); the
 * attribution renders in the site footer. Data-driven: a new hero model =
 * one row here.
 */

export type ModelCredit = {
  /** The model's Sketchfab title. */
  title: string
  author: string
  /** The model's Sketchfab page (the CC-BY attribution link). */
  href: string
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
  },
  {
    title: 'L-39ZA Albatros',
    author: 'Jeyhun1985',
    href: 'https://sketchfab.com/3d-models/l-39za-art-albatros-4f694d2badee4852b917b25e567857d8',
  },
]
