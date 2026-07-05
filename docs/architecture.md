# Architecture

A static single-page **scrollytelling** site. One tall page; how far you've scrolled *is* the position on
Martin's life timeline. Everything on screen is derived from a single number, `scrollProgress` (0..1).

## Layers (bottom → top)
1. **Background art** — one fixed full-screen `<CanvasStage>` (2D `<canvas>`), a single `requestAnimationFrame`
   loop that reads `scrollProgress` and paints the current chapter's theme (with the next theme cross-fading in
   near a chapter's end). In L2 an R3F `<Canvas>` is added *above* this, reading the same `scrollProgress`, with
   this 2D layer as its no-WebGL / reduced-motion fallback.
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
A **theme registry** `Record<Theme, Renderer>` maps `chapter.theme` → a pure `render(ctx, alpha, localT, time,
cfg)`. Themes: `origin · sky (climb/cruise/desert/airshow/sunset) · calm · bitcoin · dev · contact` (extensible,
e.g. future `sport`). A new visual *kind* = one renderer + one registry entry; everything else is data.

## The L1 → L2 seam (designed in from day one)
Because chapters are data and scroll is the single source of truth, L2 changes only *how a scene is drawn*, not
*how the story is read*: add an R3F layer + a Blender-exported camera path (`scrollProgress → mixer.setTime`),
keep the 2D canvas as the fallback. See `local/Wiki/scrollytelling-cookbook.md` §4/§8.

## Non-goals
No backend, no auth, no data collection, no i18n (English-only), no Tailwind. Static build → Vercel.
