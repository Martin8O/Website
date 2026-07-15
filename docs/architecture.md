# Architecture

A static single-page **scrollytelling** site. One tall page; how far you've scrolled *is* the position on
Martin's life timeline. Everything on screen is derived from a single number, `scrollProgress` (0..1).

## Layers (bottom → top)
1. **Background art** — one fixed full-screen `<CanvasStage>` (2D `<canvas>`), a single `requestAnimationFrame`
   loop that reads `scrollProgress` and paints the current chapter's theme (with the next theme cross-fading in
   near a chapter's end). An **additive R3F `<Stage3D>` layer** rides *above* it, reading the same
   `scrollProgress` — real baked GLB aircraft heroes (climb/ballet/Bagram + patrols) and depth starfields on the
   hero chapters — with this 2D layer as its always-complete no-WebGL / reduced-motion / weak-client fallback
   (mount deferred to after boot, ADR-055).
2. **Story DOM** — chapter text cards, the amber HUD instrument (era + %), the tick scale, the scroll hint, the
   vignette. Text is real HTML (SEO + a11y), not painted into the canvas.
3. **Chrome** — light nav / skip-links (Work, Contact) and the footer (GitHub, LinkedIn).

## Single source of truth
- **`scrollProgress`** — a tiny store/context, smoothed on the **Lenis** ticker; exposed via `useScrollProgress()`.
  Story animation is always scrub-tied to it (ambient motion may use time; story progress may not).
- **`src/data/chapters.ts`** — a typed `Chapter[]`. Order + content + `theme` per chapter. The timeline is
  computed from the array length (no hard-coded percentages). Adding/reordering a chapter is a data edit.
- **`src/data/projects.ts`** — the Work items (title · one-liner · stack · live URL · repo URL · screenshot).

## Themes (data-driven visuals)
A **theme registry** (eager core + lazy-split deep worlds, ADR-055) maps `chapter.theme` → a pure `render(ctx,
alpha, localT, time, cfg)`. Themes: `origin · sky (climb/cruise/desert/airshow/sunset) · calm · bitcoin · dev ·
contact` (extensible, e.g. future `sport`). A new visual *kind* = one renderer + one registry entry; everything
else is data.

## The 2D → 3D seam (shipped — this is the target state)
Because chapters are data and scroll is the single source of truth, the additive 3D layer changes only *how a
scene is drawn*, not *how the story is read*: an R3F layer reads the same `scrollProgress` and flies real baked
GLB heroes over specific chapters, with the 2D canvas always the complete fallback. **The once-planned full "L2"
fly-through — the *entire* world rebuilt in 3D with a camera flown through 3D space — is formally retired
(ADR-056, Martin 2026-07-15); the shipped hybrid is the dream target, not a stepping stone.** See
`local/Wiki/scrollytelling-cookbook.md` §4/§8.

## Non-goals
No backend, no auth, no data collection, no Tailwind. Static build → Vercel. (Site copy is bilingual EN/CZ — EN canonical + a Czech overlay merged by id, ADR-023.)
