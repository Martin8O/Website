# CLAUDE.md — project constitution (lean; loads every session)

Personal **scrollytelling website** for Martin: scroll = time, his life flies past (fighter pilot → airshow →
self-healing → Bitcoin → the Claude Code build explosion), ending in a single email contact. Story = hook,
projects = proof, contact = goal. **Read `local/bootstrap.md` first every session.**

## What it is / scope
- **Shipped — and this IS the target state (Martin, 2026-07-15):** a production-grade **2D scrollytelling** world
  (React+TS+Vite) with **original, far-richer-than-the-demo** environments, PLUS an
  **additive 3D layer** — real GLB aircraft heroes (climb · ballet · Bagram + airshow/landing patrols) and
  depth starfields flying **over** the 2D scenes, gated so the 2D world is always the complete fallback
  (ADR-007). Live on Vercel.
- **No globe.** It was planned for L1 (ADR-006, `react-globe.gl`), **parked as "likely unneeded" (Martin, ADR-018)
  and never built** — the dependency was never installed. The Bitcoin scene's flat dot-matrix **world map**
  (`canvas/scenes/worldMap.ts`) is a different thing. Don't reintroduce it, and never claim it exists.
- **The old "L2" (full R3F fly-through — the *whole* world in 3D, camera flown through 3D space) is formally
  RETIRED — never to be built (ADR-056).** It would be a rewrite of every environment for a marginal gain; the
  shipped hybrid already delivers the 3D wow. Treat the current state as the dream target, not a stepping stone.
- **Site copy = bilingual EN/CZ** (EN canonical + a Czech overlay merged by id, nav toggle — ADR-023 supersedes the old English-only ADR-003). **Contact = email only.** **No donation button.** (Rationale → `docs/adr.md`.)

## Architecture (where things go)
- `src/data/chapters.ts` — the single source of truth: a typed `Chapter[]`; order + content + theme. Adding a
  chapter = one object. `src/data/projects.ts` — the Work items (real link + shot + one-liner + stack).
- `scrollProgress` (0..1) — one global value (store/context + `useScrollProgress`), smoothed on the **Lenis**
  ticker. Everything visible is *derived* from it. Never drive story progress by a wall clock.
- `<CanvasStage>` — one fixed 2D canvas, one rAF loop; a **theme registry** (eager core + lazy-split deep worlds,
  ADR-055) picks a pure `render(ctx, alpha, localT, time, cfg)` per chapter. A new visual *kind* = one registry
  entry (eager, or a lazy loader for a heavy back-half world).
- Text/HUD/scale/vignette/cards are DOM components (text stays real HTML for SEO/a11y). Full mental model +
  recipes: `local/Wiki/scrollytelling-cookbook.md`.

## Conventions
- **Stack:** Vite + React + TypeScript (strict). **Styling = CSS + custom properties (design tokens) / CSS
  Modules — NOT Tailwind.** Smooth scroll = **Lenis**. Tests = **Vitest** on pure logic only.
- **Data-driven extension** everywhere; keep renderers pure + framework-free (the additive 3D layer rides over them
  and the 2D world stays the always-complete fallback).
- **Accessibility + performance are Done-criteria, not extras:** `prefers-reduced-motion`, keyboard + focus +
  skip-links, DPR-capped canvas, no scroll-blocking loads, no layout shift, Lighthouse ≥ 90 desktop.
- **Bilingual EN/CZ site strings** (EN canonical, CZ overlay merged by id — ADR-023). **No backend / no data collection** (static SPA; `mailto:` — the contact
  address will be on Martin's own domain via forwarding, set at launch).
- Type/palette DNA: `Space Grotesk` / `Inter` / `Chakra Petch`; amber HUD `#FFB000` as the through-line;
  accents gold / cyan / magenta / bitcoin-orange `#F7931A`.

## Run commands
- Dev: `npm run dev` · Quality gate (green before commit): `npm run check` = `tsc -b` + `eslint` +
  `vite build` + `vitest run` · Build: `npm run build` · Deploy: Vercel.
  *(Authored at A1; update here only if a run-step changes.)*

## Workflow (the loop) — see `local/bootstrap.md`
Martin says **"run X / jedeme X"** → I re-check state + finalize/perfect prompt X **and execute it in one go**
(no separate approval gate — "run X" IS the go), with **heavy verification DURING** (gate + drive the site live
+ iterate) → hand back for review → we iterate → **Martin says "X is done"** → lean wrap-up (gate · ADR row in
`docs/adr.md` · `dev_history.md` top entry · `local/bootstrap.md` head · model-fit line · scoped commit + push ·
**last line to Martin = next prompt + ideal model·effort** — Opus 4.8 / 🔥 Fable 5, per the `all prompts.md` table).

## Hard rules
- **NEVER commit/push until Martin says "X is done".** Never edit `CLAUDE.md`/`dev_history.md` mid-prompt.
- **`local/` never goes to git. NEVER write to the `C:` drive** — all memory in `local/` (see
  `local/memory/feedback_local_only_no_c_drive.md`).
- Scope commits (review `git status`; no blind `git add -A`). Real links/shots only — no invented placeholders.
- Chat: EN for quick work, **Czech + plain language** for complex explanations + wrap-ups; code/commits English.
