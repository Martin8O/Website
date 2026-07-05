# Architecture Decision Records (index)

Short, dated records of *why*. Newest on top. Detail in the linked history/notes where relevant.

---

### ADR-009 — Timeline contract: track = N×110vh, story derived from `scrollProgress` (2026-07-05)
The story's shape is locked to the data + one number. Scroll-track height = **`N × 110vh`** (`N` = chapter
count); the pure `resolveTimeline(progress, count)` maps `scrollProgress` → `{ index, localT }`, and cards fade
by smoothstep distance from their center (`cardOpacity`). All of it lives in **`src/timeline.ts`** (framework-free,
unit-tested), so adding/reordering a chapter is one object in `chapters.ts` with zero render-code edits (proven
live at A2). *Why:* keeps `scrollProgress` the single source of truth and the math reusable by the L2 renderer;
no wall-clock story animation, so scrub stays perfect. Per-chapter accent comes from a data `THEME_ACCENT` map.

### ADR-008 — Deploy pipeline: Vercel, moving to GitHub-linked auto-deploy (2026-07-05)
A1 proved the pipeline with a one-off **Vercel CLI** deploy (project `martin-website`, live at
`martin-website-beta.vercel.app`). Going forward the site deploys via **GitHub → Vercel** integration: push to
`github.com/Martin8O/Website` auto-builds and deploys, so no more manual CLI. Repo stays private (ADR-005).
*Why:* Martin's preferred flow — Git is the single source of truth and every commit ships itself; CLI stays only
as a fallback. *Note:* Vercel's auto project-name derivation hit a `---` validation error, fixed with an
explicit `martin-website` name.

### ADR-007 — Visuals are original + far richer than the demo (2026-07-05)
The demo (`local/ode mne/martin-journey.html`) is a **structural + content reference, NOT a visual ceiling.**
Theme environments are built original and much richer/more beautiful (layered depth, particles, atmosphere,
light), iterated live in the browser until they "wow." *Why:* Martin wants far more than the demo's basic
sketch; the visuals are the product's heart, so the model budget concentrates in Phase B.

### ADR-006 — Globe ships in L1, built alongside the site (2026-07-05)
The interactive globe (travel arcs grow on scroll, visited countries glow) ships in **L1**, not deferred to L2.
Implemented as an isolated **`react-globe.gl`** widget (pulls `three` — self-contained, does NOT trigger the
whole-site R3F rewrite) with a **2D `d3-geo`** fallback for reduced-motion. Data-driven `places.ts` seeded with
known places (airshow CZ/SK/RO/UK/SE; Bagram); Martin adds Buddhist-travel places later. *Why:* Martin wants it
from the start; it's data-driven + reads the same `scrollProgress`, so it slots in cleanly and de-risks L2.

### ADR-005 — Repo private for now; domain deferred (2026-07-05)
Repo stays private during development; we decide public visibility at launch. Domain is TBD — build on a Vercel
subdomain so nothing is blocked; pick the real domain before public launch (candidates in
`local/domain-brainstorm.md`). *Why:* no reason to commit to either early; keeps momentum.

### ADR-004 — Contact = email only; no donation button (2026-07-05)
The only contact channel is a single email (the bracketed `[ email ]` in the pulsing finale). GitHub + LinkedIn
are profile/proof links (footer/cards), not contact channels. No buy-me-a-coffee/tips anywhere on this site.
*Why:* one punchy channel is clearer + more efficient for client comms; a donation ask reads cheap on a personal
portfolio. Tips belong only to Martin's *other* projects (a separate masterplan item).

### ADR-003 — Site language: English only (2026-07-05)
All user-facing copy is English; the data shape is EN-only (no `{cs,en}`, no i18n library). *Why:* the audience
is international clients/peers; bilingual scaffolding would add cost for no gain. (Chat with Martin stays Czech —
unrelated.) *Cost:* going bilingual later would be a real retrofit — accepted.

### ADR-002 — Build path: L1 (2D) first → L2 (3D) later (2026-07-05)
Ship a production-grade 2D scrollytelling site first, then upgrade to an R3F 3D fly-through as an *additive*
layer. *Why:* the demo already proves L1; going live fast de-risks and gives real feedback; the data-driven +
single-`scrollProgress` architecture makes L2 an upgrade, not a rewrite. *Alternative rejected:* commit to L2
now (weeks before anything is live, more risk).

### ADR-001 — Stack: Vite + React + TS, CSS Modules (no Tailwind), Lenis, canvas 2D (2026-07-05)
Vite + React + TypeScript; styling in plain CSS + custom properties / CSS Modules; smooth scroll via Lenis;
backgrounds as 2D `<canvas>` theme renderers; Vitest for pure logic. *Why:* Martin already knows React/Vite; it's
the exact base R3F/L2 sits on (no rewrite); a bespoke animated art-site is cleaner in hand-authored CSS than
Tailwind; the canvas renderers double as the L2 fallback. Static SPA → Vercel; no backend.
