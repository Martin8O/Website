<h1 align="center">Martin Svoboda — Portfolio &amp; Story</h1>

<p align="center"><em>An empty folder to production in 4 days — then a 3D layer in 6 more.<br>
Built with Claude Code, by a pilot, not a programmer.</em></p>

A personal **scrollytelling website**: you scroll, and a life flies past — school &
Pascal chess → military fighter pilot (Z‑142, L‑39, L‑159) → Afghanistan → airshow
display flying → self‑healing → Bitcoin → building with Claude Code. **Scroll = time.**
The story is the hook, the projects are the proof, a single email is the goal.

The aircraft flying over the canvas are the types I actually flew in the Czech Air Force.
The green cockpit HUD is drawn procedurally in code — modelled on a reference image, in the
generic fighter‑HUD vocabulary. It isn't the L‑159's own instrument; but the L‑159's HUD *was*
green, so the green shows up only in the L‑159 moments.

Live: **https://svobodamartin.dev**

> **On how this was built.** I'm a former fighter and acceptance test pilot, not a career
> developer — I don't hand-write the code, I direct it with **Claude Code** and verify
> everything. That's stated on the site itself, and it's the honest frame for this repo:
> what I brought is the discipline the job beat into me. Nothing shipped until it was
> verified. **70 ADRs** record *why* (including the ones where I record my own wrong
> diagnoses), every mobile bug was reproduced by a harness that provably failed on the
> pre-fix code, and `npm run check` had to be green before every commit.

![Fighter chapter — L‑159 above the clouds, with the amber HUD through‑line](docs/assets/hero-fighters.png)

## Stack

- **Vite 6 + React 18 + TypeScript 5.7** (strict) — no framework beyond React.
- **HTML Canvas 2D** — every scene is a pure `render(ctx, alpha, localT, time, cfg)` function.
- **three.js r182 + React Three Fiber 8** — the additive 3D layer (8 real GLB aircraft, lit in real time).
  **No `drei`**: every helper is hand‑rolled; the only three.js addon imported is
  `RoomEnvironment`, and `GLTFLoader` is a dynamic import.
- **CSS + custom properties / CSS Modules** for styling — **no Tailwind**.
- **Lenis** for the one smooth‑scroll rhythm, on a custom rAF loop — **no GSAP**, no
  animation library at all. All choreography is hand‑written scroll math.
- **Vitest 4** — 383 unit tests over the pure scroll/scene math (no DOM, by design: the
  maths is extracted so it tests without a canvas).
- Deployed as a static SPA on **Vercel** (GitHub → Vercel auto‑deploy).

No backend, no cookies, no personal data — just privacy-friendly anonymous page counts (Vercel Web Analytics). Contact is a `mailto:` only.

## Architecture (the mental model)

Everything visible is *derived* from one global value, `scrollProgress` (0..1),
smoothed on the Lenis ticker.

- **`src/data/chapters.ts`** — the single source of truth: a typed `Chapter[]`
  (order + copy + theme + choreography). Adding a chapter is one object. Czech copy
  is an overlay by id (`chapters.cs.ts`); timing lives once, in the EN array.
- **`src/data/projects.ts`** — the Work items (real link · screenshot · one‑liner · stack).
- **`<CanvasStage>`** — one fixed 2D canvas, one rAF loop. A **theme registry**
  (`src/canvas/registry.ts`, eager core + lazy‑split deep worlds) picks a pure
  `render(ctx, alpha, localT, time, cfg)` per chapter. A new visual *kind* = one
  registry entry. Renderers are pure and framework‑free — an **additive R3F 3D layer**
  (real GLB aircraft heroes + depth starfields) rides *over* them on the hero
  chapters, with the 2D world always the complete fallback. The whole canvas world is
  **code‑split** (`React.lazy`) — it is decorative (`aria-hidden`) and loads during the
  preloader hold.
- **Text / HUD / scale / vignette / cards** are DOM components — the story text stays
  real HTML for SEO and screen readers.

![The final chapter — the Work panel: real projects, live links, and the GitHub takeoff](docs/assets/solo-developer.png)

## Accessibility & performance (Done‑criteria, not extras)

- `prefers-reduced-motion` → a calm, static per‑scroll frame + native scroll; all
  micro‑motion off.
- Skip‑link is the first tab stop; single `<main>` + real `<h1>`; labelled `<nav>`;
  visible focus rings.
- DPR‑capped canvas (≤2), rAF paused when the tab is hidden, no layout shift.
- Bundle is code‑split: a small app shell + a cacheable React vendor chunk load first;
  the ~500 kB canvas world and the Work panel are lazy.

## Run

```bash
npm install
npm run dev      # local dev server (Vite)
npm run check    # quality gate: tsc --noEmit + eslint + vite build + vitest run
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

`npm run check` must be green before every commit.

## Project brain

Working notes, the prompt backlog, ADRs and dev history live outside this README:
`docs/adr.md`, `dev_history.md`, and the gitignored `local/` (private).

## License

[MIT](LICENSE) © Martin Svoboda
