# CLAUDE.md — project constitution (lean; loads every session)

Personal **scrollytelling website** for Martin: scroll = time, his life flies past (fighter pilot → airshow →
self-healing → Bitcoin → the Claude Code build explosion), ending in a single email contact. Story = hook,
projects = proof, contact = goal. **Read `local/bootstrap.md` first every session.**

## What it is / scope
- **L1 now:** production-grade **2D** scrollytelling (React+TS+Vite), with **original, far-richer-than-the-demo**
  environments and an **interactive globe** (the demo is a reference, not a ceiling — ADR-006/007). **L2 later:**
  R3F 3D fly-through, built as an *additive* upgrade, not a rewrite. Ship L1 on Vercel first.
- **Site copy = English only.** **Contact = email only.** **No donation button.** (Rationale → `docs/adr.md`.)

## Architecture (where things go)
- `src/data/chapters.ts` — the single source of truth: a typed `Chapter[]`; order + content + theme. Adding a
  chapter = one object. `src/data/projects.ts` — the Work items (real link + shot + one-liner + stack).
- `scrollProgress` (0..1) — one global value (store/context + `useScrollProgress`), smoothed on the **Lenis**
  ticker. Everything visible is *derived* from it. Never drive story progress by a wall clock.
- `<CanvasStage>` — one fixed 2D canvas, one rAF loop; **theme registry** `Record<Theme, Renderer>` picks a
  pure `render(ctx, alpha, localT, time, cfg)` per chapter. A new visual *kind* = one registry entry.
- Text/HUD/scale/vignette/cards are DOM components (text stays real HTML for SEO/a11y). Full mental model +
  recipes: `local/Wiki/scrollytelling-cookbook.md`.

## Conventions
- **Stack:** Vite + React + TypeScript (strict). **Styling = CSS + custom properties (design tokens) / CSS
  Modules — NOT Tailwind.** Smooth scroll = **Lenis**. Tests = **Vitest** on pure logic only.
- **Data-driven extension** everywhere; keep renderers pure + framework-free (L2 reuses them as the fallback).
- **Accessibility + performance are Done-criteria, not extras:** `prefers-reduced-motion`, keyboard + focus +
  skip-links, DPR-capped canvas, no scroll-blocking loads, no layout shift, Lighthouse ≥ 90 desktop.
- **English site strings** (no i18n). **No backend / no data collection** (static SPA; `mailto:` — the contact
  address will be on Martin's own domain via forwarding, set at launch).
- Type/palette DNA: `Space Grotesk` / `Inter` / `Chakra Petch`; amber HUD `#FFB000` as the through-line;
  accents gold / cyan / magenta / bitcoin-orange `#F7931A`.

## Run commands
- Dev: `npm run dev` · Quality gate (green before commit): `npm run check` = `tsc --noEmit` + `eslint` +
  `vite build` (+ `vitest run` once tests exist) · Build: `npm run build` · Deploy: Vercel.
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
