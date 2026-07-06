# Architecture Decision Records (index)

Short, dated records of *why*. Newest on top. Detail in the linked history/notes where relevant.

---

### ADR-014 — Bagram as a lived-in airbase; procedural rotors carry no static blade; offline Node tracer (2026-07-06)
The desert scene (chapter 04) was rebuilt from Martin's Bagram photos into a **30k-person airbase seen from the
ground**: two towering Hindu-Kush ranges with **snow caps**, a runway on the horizon with a **C-17 lifting off**
right of the tower as the scene opens (gone right; a slower Apache pair drifts in from the left; the Mi-17
transport pair enters as the Apaches near the tower), a **tent city** of barrel-vaulted rows, clamshell hangars,
a control tower, a **taxiway + apron pads** full of parked aircraft (a dense nose-on F-16 flightline behind a
side-profile row, C-17s towering among them), and the **perimeter up close** — concrete T-wall runs with guard
towers + concertina alternating with chain-link. Three rules emerged from Martin's review rounds and are
load-bearing:
1. **A procedural rotor must never carry a permanent static blade.** An always-drawn blade laid under a spinning
   one reads as a *stopped* rotor (Martin caught it on both the Apache main rotor and, via a stale bake, the
   Mi-17). The fix: the main rotor is a blur lens + **two blade pairs 90° out of phase** (one strong, one faint);
   the tail rotor (disc faces camera in side view) is a faint disc + **N blades spinning in the screen plane**
   around the traced hub. At `time` 0 (reduced motion / parked craft) both rest crossed like a real stopped
   rotor. The static blades were **erased from the traces** so nothing is doubled. Shared helpers `mainRotor` /
   `tailRotor` dress both the Apache (4-blade tail) and Mi-17 (3-blade tail).
2. **A stepped snow-line must be an opaque, pre-mixed fill clipped along a wavy edge — never a translucent pass.**
   Painting snow translucent over rock double-paints where the two ridge seeds overlap and stripes visible alpha
   bands across the taller face (Martin's "bílý pruh"). Each snow step is a colour **pre-mixed toward the rock**
   (opaque), and its clip runs along a gentle sine wave at its own phase, so three steps read as one soft,
   organic transition.
3. **The silhouette tracer moved off the browser into an offline Node/jimp pipeline** (`local/tmp/trace4.mjs`,
   jobs in `trace4-jobs.json`, baked via `node local/tmp/gen-sil4.mjs`). Same algorithm as ADR-013 (colour-key →
   boundary walk → Douglas-Peucker → normalize) plus a `mirror` flag and rectangular `erase` bands to cut
   spinning rotor blades out of a source before tracing. Reproducible without the dev server; f16park / f16front
   / c17front / c17side added, apache + mi17 re-traced blade-free. *Also:* the preview screenshot channel wedged
   mid-session, so verification ran through a **dev-only frame sink** — the page POSTs `canvas.toDataURL()` to a
   tiny local `http` receiver (`local/tmp/framesink.mjs`) that writes PNGs to `local/tmp`, driven by the same
   `window.__paintFrame` hook. *Why:* real geometry + a base that reads as *lived in* (Martin's standing
   constraint), correct motion cues, and a trace pipeline that survives the browser channel breaking. Extends
   ADR-013.

### ADR-013 — Real aircraft as baked vector silhouettes; layered cockpits composited, not alpha-thresholded (2026-07-06)
Every aircraft is a **real silhouette traced from Martin's reference pack** (`local/ode mne/siluety/`) and baked
to `src/canvas/scenes/sky/silhouettes.ts` (generated — regenerate with `node local/tmp/gen-sil3.mjs`): browser-
assisted contour extraction on the dev server (`/@fs/` image → per-photo colour keying → connected components →
pixel-edge boundary walk → Douglas-Peucker with a closed-ring split), normalized (nose +x, y down, x-extent = 1,
bbox-centred). **The runtime stays pure vector — no images load in the app.** Rings: 0 = outer, later = holes
(canopy) or detached parts, filled `evenodd`. The L-159 stores render is split into **body + canopy glass +
seats** so a real glass cockpit layers over the L-39 / clean L-159 too; the ultralight is hand-authored (its 3/4
photos would not key); the Mi-17 rotor is fully procedural (overhangs the unit box).
Two rules emerged from Martin's review and are load-bearing:
1. **A fading craft that layers parts (glass, seats, rotor, separate wing) must be composited, not painted
   layer-by-layer with an alpha threshold.** Translucent layers accumulate opacity where they overlap (the seats
   read darker than the body mid-dissolve — Martin caught it). The earlier fix (skip the cockpit below 0.85
   alpha) created a visible "silhouette first, cockpit pops on a beat later" step. Real fix: paint the craft
   **opaque on a scratch canvas and stamp it down once** at the craft's alpha (`drawAircraft`, `LAYERED` set) —
   cockpit present from the first translucent frame, whole aircraft dissolves as one image.
2. **A donor cockpit sunk into a different fuselage needs a body-colour fairing at its aft cut**, not a raw
   overlay: the L-159 glass ends in a vertical edge that the low L-39/clean-L-159 spine doesn't continue, leaving
   a step against the sky ("schod"). A small `turtledeck` quadratic sweeps the glass onto the spine, and the
   seats are clipped to the glass so no sliver pokes past the windscreen as a dark speck.
*Also:* the green cockpit HUD **snaps on at full intensity** the instant the L-159 unlock fires at the top of the
climb (no fade — an instrument power-up) and rides centred through the cruise; the L-39→L-159 swap moved earlier
(climb top-out) so the modern jet gets a long level run before the one-circle fight. *Why:* real geometry over
free-hand shapes (Martin's standing constraint), and correct compositing so cross-fades read clean. Roll-animation
frames are traced + parked (`L159_ROLL`, `rollFrame`) for the airshow vykrut once the site stands. Extends ADR-012.

### ADR-012 — Sky family: one renderer, sub-mood dispatch, and cross-scene continuity via a shared arc + `tRaw` (2026-07-06)
The whole pilot arc (chapters 01–05) is **one registry entry** (`renderSky`) that dispatches on `cfg.sky` to
five scene modules under `src/canvas/scenes/sky/` (climb / cruise / desert / airshow / sunset), each pure. Story
beats that must be physically right are **pure, unit-tested math** in `skyMath.ts` (graduation ladder, cloud-punch
white-out, one-circle-fight helix, landing pose) — 17 tests. Two structural rules emerged from Martin's live
review and are now load-bearing:
1. **Ambient world motion must not freeze at a cross-fade.** The scene timeline exposes **`tRaw`** — `localT`
   left *unclamped*, continuous across a run's window edges — alongside the clamped `localT`. Story beats use
   `localT`; anything that streams (the cloud sea's drift) uses `tRaw`, so during a hand-over both scenes paint
   the *same* moving world instead of one frozen copy doubling the other. Adjacent windows advance at equal rate,
   so a shared field (climb↔cruise sea) stays phase-continuous. (`SceneSlot.tRaw`, `SceneConfig.tRaw`.)
2. **One object spanning many scenes = one shared function of global position, not per-scene state.** The section
   sun is `sunArc(pos)` (piecewise waypoints, unit-tested continuous + strictly monotone); all five scenes
   evaluate it at `winStart + tRaw`, so the sun glides through every seam with no freeze and no ghost. Same
   principle retired the earlier "hold the hand-over point" hack.
*Also:* sprite/colour caches that receive scroll-mixed colours must **quantize keys** (and clamp green ≤ max(r,b)
— nothing in the sky is green) or they grow unbounded and tint grey clouds sage. *Why:* keeps renderers pure and
data-driven for L2 reuse while making multi-scene continuity provably correct rather than eyeballed. Extends
ADR-010.

### ADR-011 — Domain: svobodamartin.dev (2026-07-05)
Martin bought **svobodamartin.dev** ("prozatím"); `svobodamartin.ai` is available but expensive — deferred.
Production deploy + the contact email (site is email-only) ride on this domain, wired at D1. *Why:* unblocks
the launch checklist early; `.dev` fits the builder positioning. Supersedes the "domain TBD" half of ADR-005.

### ADR-010 — Canvas world: one stage, theme registry, scene runs with cross-fades (2026-07-05)
The visual world is **one fixed 2D `<canvas>`** (`src/canvas/CanvasStage.tsx`): a single rAF loop reads
`scrollProgress` imperatively from the store (zero React re-renders per frame), DPR-capped at 2, rebuilds on
resize, pauses when the tab is hidden, and under `prefers-reduced-motion` freezes ambient time + repaints only
when scroll moves. Scenes are **pure, framework-free renderers** `render(ctx, alpha, localT, time, cfg)`
dispatched via the total **`Record<Theme, Renderer>`** registry (`src/canvas/registry.ts`) — a new visual kind
is one entry, and a missing entry is a compile error. Chapters group into **scene runs** (contiguous same
theme; `sky` splits per sub-mood) with a smoothstep **cross-fade at 0.3–0.7 of a boundary chapter** and a
`localT` window reaching ±0.5 chapter beyond the run — pure, unit-tested math in `src/canvas/sceneTimeline.ts`.
The shared toolkit (`src/canvas/toolkit.ts`) keeps particles **deterministic** (seeded hash, ambient time only
for twinkle) so scrubbing is exact. *Why:* honors the L1→L2 seam (renderers reusable as the 3D fallback), keeps
story motion scroll-derived per ADR-009, and makes B2/B3 pure content work. *Layer-order lesson (B1):* light
effects must be occluded by geometry via **draw order** (e.g. crepuscular rays painted before the ridges while
the sun is behind them), never by alpha thresholds.

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
