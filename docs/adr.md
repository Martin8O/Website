# Architecture Decision Records (index)

Short, dated records of *why*. Newest on top. Detail in the linked history/notes where relevant.

---

### ADR-030 — Projects panel: file-served hi-res shots, an ambient nebula, a hover lift-zoom; HUD era on a data-driven schedule (2026-07-08)
Batched with the P-side status-sync of `projects.ts` (the repos are public now → real links + a secondary `GitHub ↗`
per card + build stats refreshed against the live repos + a `strc-check` card). The durable decisions:
1. **Work-panel screenshots are files under `public/shots/`, not inlined data-URLs** — this *reverses* C1's data-URL
   choice. At the resolution a hover-zoom needs to reveal real detail (760 px, was 460), inlining bloated the
   code-split Work chunk to ~1.3 MB (830 KB gzip). Files keep the chunk ~5 KB and load lazily per card, browser-cached.
   `gen-projectshots.mjs` keeps the same CDP+Jimp pipeline, now `getBuffer`→`writeFileSync` into `public/shots/`.
2. **The HUD year label switches on a data-driven schedule** (`chapter.eraFrom` + pure `timeline.activeEra`), not the
   uniform chapter midpoint. With no overrides it exactly reproduces `nearestChapter`'s switch points; an `eraFrom`
   lets a label flip when the scene actually *arrives* (the L-159 leads at 24 %, the sunset lands at 59 %) instead of
   at the mechanical boundary. Pure + unit-tested (3 tests).
3. **The contact-scene nebula is reused as a looping `<video>` (`public/contact-nebula.mp4`)** — both the This-Site
   card's second shot and the panel's ambient backdrop (full-detail, colour-boosted, dimmed) so the negative space
   isn't flat black. Muted autoplay + a mount `play()` fallback; `prefers-reduced-motion` → a still first frame.
   Baked at native **1262 px** (a 640 px source looked blurry upscaled across the ~1120 px backdrop). Required a CSP
   fix: the strict `default-src 'none'` in `vercel.json` needed **`media-src 'self'`** or the browser blocks the video
   in production (flagged by a parallel hardening pass; the dev server has no CSP so it only bites once deployed).
4. **Cards lift + zoom 1.18× on hover**, gated to fine-pointer + ≥760 px (a phone tap never triggers it, and a single
   full-width card never overflows); horizontal gutter ≥2rem + `overflow-x: clip` guarantee no clipping, no scrollbar.
Gate green (187 tests). Model-fit: Opus 4.8 · medium.

---

### ADR-029 — Czech typography conventions + a centered-lede opt-out for the justified body (2026-07-08)
A copy pass surfaced two durable rules, both about the fact that the site's chapter bodies are set `text-align: justify`.
1. **Czech uses the en-dash "–" (with NBSP), English the em-dash "—".** The em-dash is an Anglo convention; the Czech
   norm is the shorter pomlčka. All CZ copy was converted; EN keeps "—". (An over-abundance of em-dashes also reads as
   machine-written to a Czech eye — a second reason to switch.)
2. **Single-letter prepositions/conjunctions (k s v z o u a i) are bound to the following word with a NBSP** so they
   never strand at a line end (standard Czech typography).
3. **A spaced en-dash still stranded at line ends despite the NBSP** — because U+2013 carries Unicode line-break class
   *break-after*, which Blink honours under `justify` even across a following NBSP (the GL glue loses to the BA break).
   NBSP alone therefore can't hold a dash off a line edge. The fix is a global `.nw { white-space: nowrap }` that binds
   a flagged dash into an unbreakable run with its neighbours (`hráče – znaly`). Applied only where a dash actually
   stranded at the reviewed width; the mechanism generalises if more surface at other widths.
4. **`Chapter.centerBody` opts a body out of the justified default into `text-align: center`.** Used only by the intro's
   two-line lede (a short tagline, not a paragraph); every other body stays justified. Data-driven so it's one boolean,
   no per-chapter CSS. Verified live by measuring each card's rendered line-end geometry over CDP in both languages.
   Gate green (184 tests). Model-fit: Opus 4.8 · medium.

---

### ADR-028 — D2.1: self-host the fonts, tighten the CSP, immutable asset cache, CORS + tooltip a11y (2026-07-08)
The post-review hardening batch — the four items D2 flagged as worth doing, done together. The decisions:
1. **The three brand fonts are self-hosted (`@fontsource`), not loaded from the Google Fonts CDN.** This removes the
   *last* third-party runtime dependency: no visitor IP handed to Google (the GDPR angle behind the 2022 German
   "Google Fonts" ruling), no CDN-outage/blocked-origin risk, and it closes the SRI gap a remote stylesheet can't
   (Google serves the CSS dynamically, so a hash never matches). The weight set mirrors the old Google `<link>`
   exactly (Space Grotesk 400/500/600/700, Inter 400/500/600, Chakra Petch 400/500/600) so rendering is unchanged.
   The one real risk is Czech diacritics: each `@fontsource` per-weight file carries `latin-ext` via `unicode-range`,
   so ě/š/č/ř/ž render in the real face — verified by force-loading the glyphs over CDP (`before:false → after:true`
   proves coverage, not just fallback). Imported from `src/fonts.ts` before `index.css` so the faces register first.
2. **With the CDN gone, the CSP tightens to `'self'` for style and font** (both Google origins dropped) — a stricter
   policy that still holds because the fonts now ship from our own origin. Verified: a full scroll under the new CSP
   produced zero violations and zero external font requests.
3. **Hashed build assets get `immutable, max-age=31536000`; the CDN default was `max-age=0, must-revalidate`.**
   Content-hashed files (JS/CSS/woff2 under `/assets/`) never change, so revalidating them every visit was pure
   waste — a real (if modest) repeat-visit win. Vercel does *not* add `immutable` automatically to a Vite build's
   `/assets/*` (confirmed on production), so it's an explicit `vercel.json` rule.
4. **`Access-Control-Allow-Origin` pinned to the site's own origin, replacing Vercel's default `*`.** Cosmetic for
   this threat model — a no-auth, no-cookie public site leaks nothing via a lax CORS policy, and `*` can't even be
   combined with credentials — but it clears the securityheaders.com flag and is semantically correct (no cross-origin
   JS needs to read these assets). **Also:** the dev-window tooltip tagline is now wired to its anchor via
   `aria-describedby` (the stack is left out — a screen reader would read it verbatim every time).
   Deferred as before: re-reading `prefers-reduced-motion` on a mid-session OS toggle (theoretical; cost > benefit).
   Gate green (184 tests). Model-fit: Opus 4.8 · medium = fit (font-subset care + live verification, not creative).

### ADR-027 — D2: pre-launch code + security review — chunk error boundary, modal focus trap, security headers (2026-07-08)
The launch-readiness review (full code, not just a diff), run as a 31-agent ultracode workflow: seven parallel
reviewers across security + correctness dimensions, every finding adversarially verified by two independent lenses
(reproduce + refute) before it counted. The security surface came back **clean** — the two `dangerouslySetInnerHTML`
sinks render only first-party compile-time strings, every external link already carries `rel="noopener noreferrer"`,
no secrets in the bundle or git history, supply chain is three runtime deps. The decisions on what to *change*:
1. **Both code-split islands get an error boundary; a failed chunk never blanks the site.** The canvas world and the
   Work panel are `React.lazy`; with no boundary, a rejected import unmounts the *entire* root — a blank page — which
   defeats the whole design intent that the canvas is decorative and the DOM story stands alone. Two real triggers:
   a flaky mobile fetch, and **deploy skew** (an open tab requests an old hashed chunk after a redeploy; the SPA
   rewrite serves it `index.html`, which fails the module MIME check and rejects the `import()`). One tiny
   `ChunkBoundary` (class component — boundaries have no hook form) wraps both: the world falls back to `null` (the
   dark stage already covers it), the Work panel to a localized "failed to load — reload" alert.
2. **The modal scroll-lock became a counter, not a boolean.** Reusing the preloader's Lenis gate for the dialogs
   meant two independent holders (preloader, an open dialog) could overlap, and a boolean lock let one release steal
   the other's hold. `setScrollLocked` now increments/decrements a count and only drives Lenis on the 0↔1 edges;
   each holder balances its own acquire/release. This also fixed "the story scrolls behind an open dialog"
   (`data-lenis-prevent` stops wheel *inside* the panel, but nothing had stopped the page).
3. **Security headers live in `vercel.json`, and the CSP is tight because the code earns it.** Production served only
   HSTS. The added CSP is `default-src 'none'` with each source enumerated — crucially **no `'unsafe-inline'` for
   scripts or styles**, because the build emits zero inline scripts and the components use zero `style=` string
   attributes (verified in the built `dist/`), so the strict policy actually holds. `img-src` allows `data:` (the
   baked sprites), `style-src`/`font-src` allow the two Google Fonts origins. Plus `nosniff`, `X-Frame-Options:
   DENY` + `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy` (camera/mic/geo off), `COOP`, and a
   day-long cache for the un-hashed public media (the 2.6 MB GIF was re-fetched every visit). Verified before
   shipping by serving `dist/` locally under the *exact* headers and driving a full scroll headless: zero CSP
   violations, zero console errors.
4. **`vitest` bumped 2.1.9 → 4.1.10 to clear the audit, kept out of the launch-critical path.** All five npm-audit
   findings were dev-toolchain-only (the vitest→vite→esbuild chain, zero visitor exposure), but the major bump is
   clean and low-risk here (pure-logic tests): `npm audit` now reports **0 vulnerabilities**, 180 tests unchanged.
   Verification harnesses (`local/tmp/csp-test-server.mjs`, `cdp-csp-verify.mjs`, `cdp-review-verify.mjs`) are the
   reusable proof that the headers and the a11y fixes actually hold in a real browser. Deferred as taste/post-launch
   calls: self-hosting the fonts (drops the last third-party origin, no SRI possible on a CDN stylesheet) and
   re-reading `prefers-reduced-motion` on mid-session OS toggle.

### ADR-026 — D1: ship L1 — code-split the world, show+copy+mailto contact, mobile-only repositioning, Cloudflare domain+email (2026-07-08)
The launch pass. The decisions:
1. **The canvas world is code-split behind `React.lazy`; React is its own vendor chunk.** The 2D world (six scene
   renderers + all baked sprite/shot/pose/worldMap data) is the heaviest thing on the page and is purely decorative
   (`aria-hidden`), so it's the natural split point. Result: the initial JS drops **720 kB → 62 kB** app shell + 142 kB
   cacheable React vendor; the ~514 kB world fetches during the preloader hold, and the dark stage background covers the
   gap until the first frame. This is the real LCP/TBT lever (the DOM `<h1>`/cards paint without waiting for the world to
   parse). The Work panel was already lazy (C1).
2. **Contact = show the address + a Copy button + `mailto:` — no form, no backend, no GDPR.** Martin's question: is a bare
   `mailto:` a blocker (it opens the visitor's mail client, and does nothing if none is set up)? The answer that keeps the
   no-backend/no-data-collection stance: render the full address as selectable text, keep `mailto:` as the click, and add
   a clipboard Copy button (bilingual, graceful `catch` when the clipboard is blocked). A form service would put a third
   party in the data path — rejected. The address is **`martin@svobodamartin.dev`** (Martin's pick), email light-blue.
3. **Mobile-only repositioning, desktop byte-identical — via a CSS `--ty` var + per-chapter id overrides and `w<720` /
   `aspect<1` branches in the scenes.** The text cards gained an overridable vertical anchor (`--ty`, default `-50%`) so a
   `@media (max-width:719px)` block can drop 01/02/07/09 to the bottom, lift 03/05/06 into the sky — desktop keeps the
   centred default. The canvas scenes each got one mobile branch: `bitcoin` map pushed below the nav, `dev`'s
   `windowLayout(aspect)` drops RL Lab + BrainQuest to the bottom corners in portrait and the GitHub dashboard lifts above
   the HUD, `contact`'s spiral centres + lifts its nucleus into the free space above the bottom-anchored copy. Gotcha
   banked: a CSS var feeding a `calc()` with a px term **must carry a unit** (`--ty:0px`, not `0`) or the whole transform
   is dropped.
4. **Domain + email both on Cloudflare (DNS stays there), not moved to Vercel.** Web: `CNAME → cname.vercel-dns.com` for
   apex + `www`, **proxy OFF (grey cloud)** so Vercel issues its own cert (orange-cloud proxy + Vercel SSL conflict).
   Email: Cloudflare **Email Routing** (free) forwards `martin@svobodamartin.dev` → Martin's Gmail — no mail server, no
   data stored. *Why:* Martin already runs the domain on Cloudflare; both are free records there and web (CNAME) + mail
   (MX) are independent.

### ADR-025 — B5: SEO/social meta + a branded OG image rendered from the site's own DNA; safe-area via `env()`; a11y already carried by C2/C4 (2026-07-08)
The reduced-motion / a11y / SEO / perf pass. The decisions:
1. **The social card is generated, branded, and legible — not a scene screenshot, not a placeholder.** `public/og.png`
   (1200×630) is rendered headless (same CDP pattern as the verification harness) from a self-contained card built in the
   site's own DNA — dark `#06070a`, the amber HUD corner frame, "Martin" in Space Grotesk, and the climbing flight-path
   with one coloured waypoint per era ending in the reticle mark. A raw scene grab has no title text and reads as noise at
   thumbnail size; a designed card is deterministic and on-brand. The same mark ships as `favicon.svg` (scalable) +
   `apple-touch-icon.png` (180). Full OG + Twitter `summary_large_image` tags, `theme-color`, `canonical`, `robots.txt`,
   `sitemap.xml`.
2. **Canonical / OG url / sitemap point to the decided production domain `svobodamartin.dev` before it resolves.** D1
   wires the domain + email; the intended prod URL is a *decision already made* (domain bought), not an invented
   placeholder, so baking it now means D1 flips DNS and the metadata is already correct. The contact email stays the
   `hello@example.com` placeholder until launch (that string rides the domain).
3. **Mobile safe-area is folded into the existing edge offsets via `env(safe-area-inset-*)`.** Each fixed/absolute chrome
   element (nav, skip-link, footer, HUD, scroll-hint) gets `calc(<existing gap> + env(...))`; on desktop the insets are 0
   so nothing moved, on notched phones the chrome clears the cutout. `viewport-fit=cover` lets the world reach under the
   notch. No `100vh` traps exist (the world is one `position:fixed; inset:0` stage), so no `dvh/svh` swap was needed.
4. **A11y + reduced-motion were already Done-criteria met by C2/C4 — B5 audited and confirmed, it didn't rebuild them.**
   Skip-link is the first tab stop, single `<main>`, real `<h1>`/`<h2>` text, labelled `<nav>`, decorative canvas
   `aria-hidden`; reduced motion freezes ambient canvas time to a static per-scroll frame with native scroll and zero
   micro-motion. *Deferred to D1 (not a B5 miss):* the 720 kB main JS chunk (all scene renderers + baked data-URL assets)
   — the real Lighthouse/LCP lever is code-splitting the scenes, which belongs with the production perf pass. Perf
   confirmed healthy here (≤ 7.96 ms/frame every scene, headless CPU).

### ADR-024 — C4: preloader gates the journey, the accent GLIDES with the scene cross-fade, pointer micro-parallax (2026-07-08)
The cohesion/polish pass. The decisions:
1. **A preloader gates scroll on real critical-asset signals.** A dark amber boot gate (wordmark · hairline bar · mono
   `LOADING %`, the HUD's own voice) holds the journey until the three brand fonts have actually loaded (`document.
   fonts.load(...)` per family — `fonts.ready` alone resolves before an unused face even starts fetching), the window
   `load`, and a short minimum hold have all fired. The scroll lock is a **new `scrollStore` channel** (`setScrollLocked`/
   `registerScrollLock`): Lenis owns wheel/touch so `lenis.stop()/start()` IS the lock, and the Preloader additionally
   `preventDefault`s the keyboard scroll keys. A **4 s failsafe** unlocks no matter what, so a wedged font CDN can never
   brick the site. Reduced motion → no sweep, the overlay just stands briefly and leaves. Verified live: real wheel +
   PageDown while it stands leaves `scrollY` at 0; after it leaves the same input scrolls.
2. **The DOM accent is a continuous function of the scene timeline, not a per-chapter step.** The stage `--accent`
   (HUD, tick scale, vignette) used to jump at each chapter boundary while the canvas cross-faded smoothly underneath;
   the 0.6 s CSS colour transitions only *smeared* that step. New pure `accent.ts` (`mixHex` + `accentAt`) samples the
   **same `resolveSceneFrame`** the canvas uses and blends the two theme hexes by the exact cross-fade alpha — so the
   chrome glides in lock-step with the painted hand-over, `enterFade` overrides included. The now-redundant CSS
   transitions were removed (they'd lag the per-frame value). 7 tests.
3. **Micro-interactions ride the existing eased pointer channel — one signal, DOM + canvas.** `CanvasStage` already
   smooths a pointer with a presence scalar; C4 publishes two CSS vars from it (`--par-x/--par-y`, quantised to 0.1 px)
   and the chapter-cards container drifts a few px *against* the pointer, so the text floats a plane above the world the
   scenes already answer. Folded into the same `translate3d` as the B2.3d landing shake. Zero under reduced motion, on
   touch (presence fades out on pointer-up), and at rest. The tick scale gained a matching continuous read: the current
   tick brightens and glows in the (blended) accent as the scroll works through it — "gaining altitude". A shared
   `--ls-eyebrow` token unifies every mono eyebrow's letter-spacing, and a global `a:focus-visible` ring (accent-tinted)
   makes keyboard focus consistent. Frame cost unchanged (contact still ~7.9 ms with the pointer live).

### ADR-023 — C2: bilingual CZ/EN via copy overlays (supersedes ADR-003), a real nav with teleport jumps, finale-gated footer (2026-07-08)
C2 grew the site chrome: nav (🏠 Home · Work · Contact · About · CZ/EN), skip-link, an "About me" dialog, a
GitHub/LinkedIn footer — and, on Martin's call at review, the site went **bilingual**. The decisions:
1. **CZ/EN with a toggle — SUPERSEDES ADR-003 (English only).** Martin's audience is both Czech clients and
   international; the story loses nothing dubbed. Architecture: **EN stays canonical** — every timing/choreography
   field (`enterFade`, `cardFull`, `lateWord`, `workOrder`, window hints) exists exactly once on the EN data; Czech
   rides as **copy overlays keyed by id** (`chapters.cs.ts`, `projects.cs.ts`, one `strings.ts` for UI), merged at
   read time into per-language cached arrays (stable identities — the toggle never re-initializes the canvas, which
   keeps reading the static EN array since it needs no copy). Language persists in `localStorage`, seeds from
   `navigator.language`, drives `<html lang>` + `document.title`. Where content genuinely differs per language it
   lives in the overlay (the Bitcoin article is two DIFFERENT articles: medium.seznam.cz vs medium.com). Register:
   vykání, except the canonical motto "Nevěř — ověřuj."
2. **Nav jumps TELEPORT (`lenis.scrollTo(..., immediate)`)** — the first build glided through all nine scenes and
   Martin killed it: a nav jump is navigation, not storytelling. One `scrollToProgress()` relay in `scrollStore`
   (ScrollProvider registers the Lenis driver) keeps components Lenis-free; the skip-link and About-CTA reuse it.
3. **Dialogs portal to `<body>`** — the nav pill's `backdrop-filter` makes it a **containing block for
   fixed-position descendants** (CSS spec, easy to forget): both panels rendered inside the nav collapsed into the
   pill. `createPortal` is the durable fix, not removing the blur.
4. **Per-language, multi-image project shots; heavy animation stays out of the bundle.** `PROJECT_SHOTS` became
   `Record<id, ProjectShot[]>` — an array per card (images stack vertically), with `id.cs` keys for Czech variants
   (fallback = EN). Stills bake to 460 px data-URL JPEGs; the RL-Lab taxi GIF (2.6 MB, animated) ships as a
   `public/` asset loaded on demand — inlining would have tripled the lazy chunk and data-URLs can't be justified
   for megabyte animations.
5. **The "footer" of a scrollytelling site is the finale.** GitHub + LinkedIn (from `profile.ts`) render
   bottom-right only as the contact chapter settles (fade 97.5→99.5 %, hidden from pointer/tab until visible) — the
   corner stays clean for the whole journey, and LinkedIn stays deliberately quiet until Martin refreshes the
   profile. Work cards additionally carry **real build stats** (`build: {days, commits}` from the GitHub snapshot's
   `buildTimes` — honest distinct-commit-day counts), and Work-panel display order is an explicit `workOrder` field
   because the PROJECTS array order is the dev-scene window-slot contract and must not move.

### ADR-022 — Work section: `projects.ts` as the one Work source of truth, surfaced two ways from the same data (2026-07-08)
C1 formalized the Work items. Before, the same five projects were hard-coded in **three** places (the dev-scene window
metadata, the clickable link overlay, and a dead A2 `chapter.projects` string list). The decisions:
1. **One typed catalog drives everything.** `src/data/projects.ts` (`Project[]`, both eras: 6 pre-Claude + the 5
   Claude-month apps) is the single source. The five apps carry a `window` block (canvas tint/kind/shot/crop hints);
   `DEV_PROJECTS` (filtered + ordered) is consumed by BOTH the canvas (`dev.ts` `DEV_WINDOWS` is now a `.map` of it) and
   the DOM anchors (`DevWindowLinks`). A project's content — name, one-liner, stack, real link — lives once; the render
   is byte-identical to before (verified live). The dead `chapter.projects` field was removed.
2. **Portfolio surfaces in two places, both from the data (Martin's call — the story alone wasn't enough).** The
   original design was "the story IS the portfolio" (only the 5 windows in chapter 08). Martin wanted a real overview of
   *all* work, so: (a) a **Work overview panel** — a modal opened from a quiet nav "Work" trigger (`SiteNav`), listing
   every project with screenshot + tagline + stack chips + live link, grouped by era; (b) **hover/focus detail** on the
   five chapter-08 windows (tagline + stack), same copy. Both read `projects.ts`.
3. **Real screenshots, bundled; the heavy module is code-split.** A new `projectShots.ts` bakes 10 real shots to
   downscaled data-URL JPEGs (`gen-projectshots.mjs`: 7 from disk assets, the 3 Lovable apps captured **live** headless
   over CDP) — the `devShots.ts`/`calmSprites.ts` pattern. The panel + its ~230 KB of shots load only on open
   (`React.lazy`), so the main bundle grew ~2.5 KB. The Bitcoin article (Medium blocks bot capture) renders as a clean
   text card rather than a fake shot.
4. **Two small, load-bearing fixes.** The panel wouldn't wheel-scroll because Lenis owns the global wheel — fixed with
   `data-lenis-prevent` on the overlay (confirmed the installed Lenis honours it). And a fresh headless-Chrome profile
   under `local/tmp/` dropped a vendored extension bundle that broke `eslint .`; `local/` is now in the eslint ignores
   (it is gitignored scratch, never source).

Links were verified live (HTTP status); private repos (ClearFeed, RL Lab, BrainQuest) 404 to the public and carry
`live: false` + a status note — they still render per Martin's "link every repo, publish over time" policy (he'll make
them public later; the shots are also his to refine). Gate green (172 tests). Model-fit: Opus 4.8 · medium (data +
integration + the live-capture pipeline) = fit.

---

### ADR-021 — Contact finale as a breathing spiral galaxy: story-coloured particles and everything painted with dots not lines (2026-07-07)
> **Update (2026-07-08):** the cursor gravitational-wave interaction (point 2 below) was **removed** at Martin's call —
> "the breathing spiral is the experience on its own; the gravity ruins it." The scene now ignores `cfg.pointer`
> entirely (`gravFront`/`WAVE` deleted). Same round unified the card font size site-wide (the pilot-arc titles were
> 5.5rem — too big and inconsistent with the trimmed 08/09 cards; all chapters now share one 2.8rem cap, no
> compact/regular split). Point 2 is kept below as the historical record.

C3 replaced the last placeholder (`contact`, chapter 09 — "Now") with the site's closing world: after the dev city
dissolves, the whole journey settles into one slow, full-screen **spiral galaxy** the visitor sits inside while they
read the CTA. Built to Martin's reference (`local/ode mne/pulsing bottom or end style.jpg`) but taken far past it over
seven live review rounds. The load-bearing decisions:
1. **The colour IS the story, carried by structure not labels.** ~20k particle dots fan into a **two-arm spiral**
   (per-dot twist pre-baked as cos/sin into a `Float32Array`, so the inner loop is pure arithmetic + `fillRect` — the
   only way ~20k dots hold 60 fps), ringed by the palette of the worlds just lived (origin gold → sky amber → calm
   cyan → bitcoin-orange → dev magenta, `storyMix` wheel). A quiet warm nucleus (the amber `#FFB000` through-line) sits
   off-centre RIGHT so the left-aligned card never fights it. The background is a real cosmos: Milky-Way band, breathing
   nebula clouds, drifting speckle + two parallax star layers, and a slow **fly-through dust cluster** (`dust()` — far
   motes are pinpricks, near ones streak past the frame edge) so the whole screen has depth, not a centred object.
2. **The cursor is a gravitational-wave source — the dev scene's "bend the world, don't paint it" carried forward.**
   Two invisible fronts leave the hand half a cycle apart (`gravFront`): one stays **anchored** where it was born and
   finishes its journey behind you, the other **travels** with the cursor — each bends nearby particles outward and
   lights them as it passes. Plus BTC-style depth tilt. The anchor is ephemeral pointer memory (module state, re-sampled
   on cycle wrap), NOT story state — scenes stay pure functions of `(alpha, localT, time, cfg)`.
3. **Nothing in the scene is a drawn line (Martin's steer).** Earlier revs tried a constellation web, inward threads,
   cursor→sun links and radial rays; once the bloom spanned the frame they all read as **wires hanging across the sky**.
   Final rule: dots, glows and displacement only — connection is carried by shared colour and motion, the heartbeat is a
   per-dot brightening front (no ring), the visitor is a soft glow (no links). Cheaper and calmer.
4. **The card moved left, and "much bigger on Vercel" was a composition illusion, not a size bug.** The nucleus holding
   the right of the frame let the card take the left (`align: 'left'` + a data-driven `ctaEyebrow` "+ Get in touch" and a
   mailto-aware `target`). When Martin saw the *deployed* (old, centred, on-black) card as "much bigger," a computed-style
   check proved title/body are byte-identical (57.6 px / 17 px) to the new build — the old **centred 640 px column on
   near-black** just reads larger than the new **512 px column over a galaxy**. Deploying the new version is the fix;
   no font change. Email stays a placeholder until the domain (two strings in `chapters.ts`).

New pure `contactMath.ts` (28 tests: breath/wave/bloom/petal/spiral-glow/dust/gravFront/storyMix). Verified live via the
headless-Chrome CDP harness (canvas + full-page + frame-cost + a computed-style probe against the live Vercel URL). Gate
green (175 tests), ~8 ms/frame headless-CPU (dev-scene class → comfortably inside budget on GPU). Model-fit: 🔥 Fable 5 ·
high (7 revs) + Opus 4.8 (copy/wrap-up). `placeholder.ts` retired — every theme has a real renderer now.

---

### ADR-020 — Dev scene as a diegetic proof-of-work: a Tron/Matrix city on black glass, real project assets baked offline, and a staircase explosion whose motion the story can't skip (2026-07-07)
B3c built chapter 08 (`dev` — "Solo developer") as the site's climax: the Claude-Code month, where the five real apps
are the point. Eleven review rounds with Martin (reference-driven: `local/ode mne/solodev/tron*.{jpg,png}`,
`brainquest.png`, `github-stats.json`, each repo's README hero). The load-bearing decisions:
1. **The proof is real, not evoked.** Each project window shows the app's actual README hero shot; RL Lab plays two
   trained-agent GIFs (Lunar Lander + Breakout); BrainQuest runs a living knowledge-graph traced from Martin's own
   screenshot. All are **baked offline into data-URL sprites / JPEG filmstrips** (`devShots.ts`, `devAnims.ts` via
   `gen-devshots.mjs` / `gen-devanims.mjs`) and decoded lazily in the browser — the `calmSprites`/`worldMap` pattern,
   so the runtime stays image-free and Node-importable for tests. The GitHub numbers ride the scene **diegetically**
   (a dashboard built from the static `github-stats.json` snapshot, amber `#FFB000` through-line), not as another card.
2. **The glass mirror is a self-blit, and the gravity wave is an invisible pixel-warp — never re-drawn, never coloured.**
   The reflection re-blits the finished upper half of the frame, flipped + faded (pixel-exact, ~2 drawImages); windows
   carry their own scratch-canvas reflections that inherit the flight's mirror state and only appear once low enough to
   land on the glass. Touchdown fires a **spacetime ripple that re-samples the already-painted background through an
   expanding annulus scaled outward** (the old screensaver warp) — Martin's explicit steer: bend the world, don't paint
   rings.
3. **The explosion is a STAIRCASE so the story owns the motion.** Five cards launch on five scroll steps and all touch
   down together at 100 %, each position a clean fraction at every step (`windowSpawn` linear-per-leg, unit-tested to
   Martin's 1/5 · 2/5+1/4 · … table). This fixed two problems at once: a one-step spawn was too fast to read the
   per-card 180°-per-step mirror cartwheel, and a mid-flight landing window was thin enough to scrub past — landing at
   the scroll's end means the waves fire reliably, forward and back. Beats are tuned to the **rounded HUD %** (the
   readout is the source of truth, ADR-019 lesson): landings + waves live inside "95", copy snaps full at "96".
4. **Clickable windows are a DOM layer over the canvas, mirroring its geometry.** `DevWindowLinks` lays real `<a>`
   anchors over the five painted windows (positions from `devMath.windowLayout`, widths as CSS `min(vw,vh)` fractions —
   no per-frame JS), giving cursor/focus/hover-glow + outbound links. It is the C1 Work-section's data made tangible
   early; C1 will formalize it into `src/data/projects.ts` and both layers will read from there.
5. **Chapter 09 (contact) added now as a data + DOM placeholder.** The approved copy v2.5 rewrote every chapter's body
   and added `09 — NOW` ("The next world could be yours.", email CTA + hint). It renders over the shared placeholder
   world; the real particle-field contact scene is C3. Adding it re-scaled the global HUD % (10→11 chapters) but scenes
   are timed in local `t`, so nothing visual shifted — only the % labels moved. **The globe (B4) is parked** (Martin:
   likely unneeded), so the visual build is effectively complete bar the contact finale.

### ADR-019 — Bitcoin as a living 3D valley: a scroll-driven genesis impulse, a bundled world map, and an engine-wide pointer channel (2026-07-07)
B3b built chapter 07 (`bitcoin` — "Bitcoin rabbit hole") not as a coin but as a **living network world**: a dense
wireframe data-valley (one perspective projection in `bitcoinMath.ts`) under a dot-matrix **world map** that seethes
with transactions, a peer **network** whose node icons are tiered by real connection count, and — Martin's central
ask — something **pulsing and reactive to the mouse**. Sixteen review rounds; the load-bearing decisions:
1. **The scene has NO central object.** Early cuts placed a glowing ₿ coin, then a ₿ chip (traced from the official
   logo). Martin rejected both — a coin "is a lure toward money, away from the technology," and any logo is a lure.
   The epicentre is now **pure energy**: at 87 % a **genesis impulse** strikes the valley centre (a translucent,
   round-ended bolt), and everything radiates from that. The lesson: for a philosophy-first subject, resist the
   obvious brand mark; let the *behaviour* carry the meaning.
2. **The story is a scroll-driven WAVE, not a per-node timeline.** `storyWaveR(t)` is the impact front's world radius,
   linear in scroll across 87→89 %; `nodeLit(dist, t)` lights a peer the instant the front reaches it, and the same
   front lifts a crest + trailing trough into the terrain (`waveBand` with tunable half-width). Terrain deformation,
   node ignition and edge reveal are ONE function of the wave — scrub-safe, reversible, and self-synchronising (no
   drift between "the ground bulges" and "the node wakes").
3. **A pointer channel added to the engine, presence-smoothed, opt-in per scene.** `SceneConfig.pointer = {x,y,a}` is
   eased in `CanvasStage` (position lerp + presence `a` that fades in on first move, out on leave/blur/touch-lift, 0
   under reduced motion). Scenes stay pure; the smoothing + lifecycle live once in the engine. Bitcoin uses it for a
   true-3D camera parallax, a terrain swell under the cursor, and orange "you are a node" links — but only *after* the
   impulse lands (`pointer.a` gated by the story), so the arrival is bare mountains with no interactivity.
4. **Generated data, baked offline, kept out of the runtime hot path.** `worldMap.ts` is a 256×112 land mask sampled
   from a NASA-derived equirectangular image (`gen-worldmap.mjs`); the ~8 900 static land dots are further baked into a
   per-viewport canvas layer at render time (cache keyed to the pointer-free horizon so a hover never rebuilds it),
   with only a sparse live subset shimmering on top. The map "breathes" on its own clock (a time-based brightness
   swell), never on scroll.
5. **Physics belongs to matter, not to light.** First-cut transaction lights used ballistic/eased travel; Martin
   correctly flagged that electromagnetic signalling has no such physics. Every travelling light — map arcs, city
   feeders, mesh edges — now moves at **constant pixel/world speed regardless of segment length and runs both
   directions**, so a short hop flies exactly as fast as an ocean crossing. Node **tiers follow designated hubs**
   (every 12th core peer gets 7 links, others 2, periphery 1) so the big circular icons sit on genuinely
   high-degree nodes, not on chance.

Cards gained two data-driven fields used here and reusable later: `cta` (a real outbound link under the body — the
Medium intro / his healing site) and `lateWord` (a title word that fades in on its own scroll cue — "Bitcoin"
appears exactly when the HUD's *rounded* % flips to 88). Bodies are set justified. Gate green throughout (122 tests,
+23 in `bitcoinMath.test.ts`). Verified live frame-by-frame via the frame sink at every % of the choreography.

---

### ADR-018 — The healing lake: scroll choreographed in global %, photo figures as bundled bitmaps, and physics-first water (2026-07-07)
B3a built chapter 06 (`calm` — "Selfhealing") as a still pre-dawn lake, from Martin's own mojecestakezdravi.cz
motifs: a stepping-stone path ("krok za krokem") from a near bank to a small tree island, the tree flowering as the
path arrives, an aurora, drifting dandelion seeds, fireflies, and a seated meditator from his photo. Ten review
rounds shaped it; five decisions are load-bearing (renderer `calm.ts` + pure `calmMath.ts`, unit-tested where pure):
1. **The story is choreographed in GLOBAL scroll % (the HUD readout), not chapter-local `t`.** Martin directs by the
   on-screen %; a scene's `t` is `pos − chapterIndex`, and `pos = frac·(count−1)`, so global % ≈ `pos/(count−1)`. The
   mismatch cost a full round (his "72 %" was my `t≈0.75`). Marks now derive from % and are converted once:
   `enterFade` on the *incoming* chapter is expressed in the predecessor's local-`t`, and the sunset→calm hand-over is
   tuned so the lit airfield **dims to black by ~73 % global** (a `handoff = 1 − smoothstep(0.98,1.05, tRaw)` applied
   to every light channel *and* a night veil, because tRaw only passes ~1 inside that cross-fade). The aurora lives
   76→79→83 % (rise/fall envelopes), the opposite arc to the tree's growth+bloom; the card holds full until 83 %; the
   next scene may enter only at 84 % (`bitcoin.enterFade`).
2. **Martin's photo figures are bundled as PIXEL-EXACT bitmaps — a deliberate exception to the B2.2 "runtime is pure
   vector" rule (ADR-013).** Repeated attempts to *trace* the meditator into a polygon always broke the lower body
   (the photo's rock ledge merged into the crossed legs → spiky base, uneven knees). So `make-meditator-sprites.mjs`
   flood-fills the figure out of the photo (keeping its own soft AA edge + original RGB) and inlines it as a data-URL
   PNG in `calmSprites.ts` — no network fetch, bundle self-contained. The renderer decodes it lazily (browser-only, so
   `calm.ts` stays importable by the Node math tests) and `drawImage`s it. Cost: ~+22 KB gzipped, accepted for
   fidelity to a real person in a scene *about* that person.
3. **The card can hold at full strength across a window, not peak at the chapter centre.** New data-driven
   `chapter.cardFull` + `cardOpacityWindowed(pos, i, [a,b])` (pure, tested) keeps the Selfhealing text fully lit from
   the lake settling (~76.5 %) until the tree stands in full bloom (83 %), easing out by 84 % — the words stay with the
   scene's whole arc instead of fading as the reader is still reading.
4. **Water disturbances are one dispersive physics model, shared by stone-drops and ambient rain.** `rippleTrainAt(dt)`
   emits a *train* of rings: the leading ring launches first and fastest, decelerates as it spreads, and its amplitude
   falls off ~`1/r`; trailing rings follow on a delay, stay tighter, thin out, and die sooner. Both a stone landing
   (`rippleTrain(i, t)`) and the idle raindrops read the same function, so every ripple obeys the same physics. The
   surface also carries a slow multi-band "tremble" and the reflections/light-column breathe — the lake is never a
   frozen mirror (all `time`-gated → still under reduced motion).
5. **Layered translucent water tints fade in on vertical gradients, never on hard seams.** Three colour bands
   (warm teal / deep blue / aqua) drift over one another with wavy edges at different speeds; each is filled with a
   top→down gradient anchored on its seam so the colour *arrives* gradually — a churning, multi-hued surface with no
   readable colour line. The tree is a depth-7 recursive build whose fine outer branches extend (and then blossom) only
   once the path arrives; its base structure is mirrored, softened, into the lake.

### ADR-017 — The sunset landing is a glidepath POV: a warped-depth projection, a black-blink flythrough, and one shared shake source (2026-07-07)
Chapter 05's sunset was rebuilt from a side-on landing into a **first-person approach**: the camera sits far back and
high on the extended centreline, looking down the runway, and the L-159 flies *through* the camera and recedes onto
the threshold. It's a scene of pure projection maths, and four decisions carry it (all in `skyMath.ts` + `sunset.ts`,
unit-tested where they're pure):
1. **One warped-depth projection owns the whole ground plane.** `landingDepth(s) = max(s, 0.004)^0.72` maps a single
   along-runway station `s` (observer→threshold gap = 1 unit) to screen size and drop-below-horizon; every object,
   marking, light and the rolling jet reads `yAt`/`xAt`/`spanAt`/`halfW` off it, so they stay mutually consistent at
   any distance. The exponent < 1 is a deliberate wide-angle cheat so the far half of the runway (and the stopped jet)
   stay readable. The low `max` floor matters: it must not clamp the just-past-the-camera jet, which has to project
   across the whole screen.
2. **The flythrough is a black BLINK, then only shrinking — no on-screen motion.** `landingPov(t)` runs the approach
   on `tau^1.77` (the jet leaves the camera slowly, so the silhouette fills the screen as the blink lifts, then most
   of the shrink happens over the next few ticks). Because the camera IS on the glide line and the line ends on the
   piano keys, the airborne jet is pinned to screen-centre-over-threshold and *only scales down* — no lateral drift,
   which reads as "flying straight at the aim point" (Martin: žádné skoky, jen zmenšování). The belly→tail-on view
   swap hides entirely inside the full-black window, exactly like the climb's cloud-punch hides its world swap.
3. **Touchdown is an EVENT, not a C1 seam.** The brakes bite at the wheels (`BRAKE_BITE = 0.45` of approach speed),
   then a cubic eases that reduced speed monotonically to a dead stop at the runway's physical half — the tests now
   assert the roll starts noticeably slower than the approach ends (a felt touchdown) rather than velocity-matching.
4. **The camera shake is ONE source, shared by canvas and DOM.** `landingShake(t, time)` (envelope strictly inside
   67–68 %, killed before the HUD readout can round up to "68 %") drives both the canvas transform in `sunset.ts` and
   two CSS variables the engine writes each frame, so the chapter text rocks with the world. Reduced motion zeroes it.
Also here: the far ridge runs full-width and only *dips* through the sun's lane (`laneDip`) so the disc sets **behind**
the last hill layer; every horizon town's base is evaluated from a terrain surface function so nothing floats; the
overhead-pass belly is `drawL159Belly`, the gear-down rear (with painted 44° flaps welded to the measured wing
underside) is `drawL159Rear`. Extends ADR-016 (`L159_REAR_GEAR` was baked there for this) and ADR-012 (`tRaw`).

### ADR-016 — Aerobatics from a multi-view pose set (not one silhouette rotated); roll = a real elevation ladder; the display runs on unclamped progress; a scene may set its own enter-fade (2026-07-06)
The airshow two-ship (chapter 05) flies a full **opposing display** — head-on entry with a roll each, a huge
mirrored loop (foot on the runway line, top near the sky's ceiling), a wingover reversal, a second low pass,
then a rolling farewell climb streaming flares. It reads as a real aircraft rolling and looping because the jet
is no longer one side silhouette spun in-plane. Five decisions are load-bearing:
1. **A rolling aircraft is drawn from a MULTI-VIEW pose set, not one silhouette flipped/rotated.** Martin's
   ANIMACE render pack (`local/ode mne/animace/`) is a 5×7 grid — camera elevation {0, ±45, ±90} × azimuth
   {0…180} — traced offline (`local/tmp/trace6.mjs` + `gen-sil6.mjs`) to `src/canvas/scenes/sky/l159poses.ts`
   (GENERATED; kept OUT of `silhouettes.ts`). The gear was un-retractable in the viewer, so it's erased per pose
   with tight `erase` rects (repaired against the `skin` renders, iterated on Martin's marked-up montage); the
   hand-orbited camera drifts a few %, so every frame is re-scaled to its Az column's el-0 width (horizontal
   extent depends on azimuth only) in units of the side-view LENGTH — so `size` means aircraft length for every
   pose and relative view sizes stay true. Az-90 frames anchor on the nose-tip (the roll axis) so the el ladder
   rolls without bobbing. Gear-ON tail views (`L159_REAR_GEAR`) are kept for the B2.3d landing.
2. **A continuous roll maps onto the elevation ladder — real belly views, no faked far half.** `poseFold(bank)`
   returns a continuous camera elevation + a `flipY`: one full roll walks side → below → inverted → above → side,
   every quarter on real traced geometry (supersedes the B2.2 `rollFrame`, which mirrored the top frames to fake
   the bottom). The painter shows the NEAREST ladder frame and, on a step change, dissolves the OLD frame over the
   new for ~130 ms of ambient time — so a parked scroll always rests on ONE clean pose, never a translucent
   in-between (Martin's 52/59/61 % "two ghosted poses" catch), and the flat fill can't over-darken.
3. **The whole choreography is one pure function, unit-tested — position/heading/roll/flare from scroll t.**
   `opposingDisplay(t, w, h)` returns jet A's full state; jet B is its pixel mirror. Because the pair flies the
   same script mirrored, "normal attitude while flying left" is the *flipped* pose (bank ≈ π), which is why the
   half-rolls that bring them upright for the low passes fold to `flipY`. Tests assert mirror symmetry, the three
   centreline meetings, completed vykruts, and the ±attitude at each pass.
4. **The display runs on the airshow's UNCLAMPED progress (`tRaw`), not the chapter's clamped t.** Once the
   chapter's own t saturates at 1 the jets would freeze and hang in a corner waiting for the hand-over (Martin's
   catch); driving the figure on `cfg.tRaw` lets the farewell climb continue past 1 and the pair leaves the frame
   at full speed while the scene still owns it. Flares carry each spark's own ballistic trajectory (velocity at
   its ejection instant, drag bleed, gravity) and are clamped to touch down on the RUNWAY, never the crowd.
5. **A scene can override where the NEXT scene fades in over it (`enterFade` on the chapter).** Default is the
   `[0.3, 0.7]` window; the sunset landing sets `[0.76, 0.97]` so it holds back until the airshow pair has flown
   clean off and the flares have dropped — i.e. it only starts appearing at ~64 % of the whole scroll. *Why:* a
   data-driven per-scene handover point keeps the story beats (aerobatics finish → flares fall → landing) in
   order without a special case in the timeline resolver, and the same `enterFade` will carry into the B2.3d
   sunset rebuild untouched. Extends ADR-012 (`tRaw` continuity) and ADR-013 (scratch-canvas layer compositing).

### ADR-015 — Airshow as a major airbase; crop-enabled sheet tracer; static-display fleet keeps its resting rotors; landmark towns grounded to the horizon (2026-07-06)
The airshow scene (chapter 05) was rebuilt from an aeroclub strip into a **Čáslav-class major airbase** seen from
the crowd line: a hazy two-ridge hill horizon, hardened-shelter humps, a five-hangar line, the **Čáslav control
tower** (tapering shaft, flared two-deck cab, balcony rails, antenna masts) with its ops building, an apron
**full of organic static display** across a marked runway + taxiway (yellow line + connectors + windsock), and a
crowd at **tens-of-thousands scale** (six depth rows, marquee tents, flags, camera flashes). The two-ship display
(entry → loop → exit, colored smoke) is unchanged. Four decisions are load-bearing:
1. **The offline tracer gained a `crop` rect so one silhouette SHEET yields many craft** (`local/tmp/trace5.mjs`,
   jobs in `trace5-jobs.json`, baked via `node local/tmp/gen-sil5.mjs`). Extends the ADR-014 pipeline; a `fill`
   band (mirror of `erase`) repairs watermark holes before the boundary walk. From `heloes side.jpg` +
   `mil jet mix.jpg` + front-view vectors: `f18front`, `rafalefront`, `f35front`, `f35park`, `chinook`, `uh1`.
2. **A static-display craft is traced AS-IS and keeps its resting rotor blades — never spin a procedural rotor
   over it.** The opposite of ADR-014's flying rotors: parked helicopters (chinook, uh1) only ever sit, so their
   traced blades are correct and a procedural spin would be wrong. Bad traces are dropped from the bake, not
   shipped damaged (su24park + blackhawk had watermark scars; v22 + c130 lacked wheels — kept in the JSON for a
   future retrace, excluded from `SILHOUETTES`).
3. **Parked aircraft sit by their silhouette's own ground reach, not a shared magic number.** `groundReach(kind)`
   caches the max y of ring 0 (procedural-gear jets use a fixed `JET_GEAR_REACH`), so every kind's wheels land
   exactly on the stand regardless of how its trace was centred — a mixed static line stays level.
4. **A distant landmark silhouette must run its feet down PAST the horizon line, and reads best framed in a gap
   between nearer buildings.** Čáslav (the Gothic tower of St. Peter & Paul) and Kutná Hora (St. Barbara's three
   concave tent roofs + the Jesuit onion dome, per `kutna hora silueta.jpg`) sit tiny and hazy on the far hills;
   Martin's review drove them *smaller, more distant, grounded* (base at h·0.7215, under the grass line, so no
   town floats) and *framed between two hangars each* (the hangar line was re-spaced to open a gap around each
   town). *Why:* a venue that reads as Martin's real home base, a trace pipeline that scales to whole reference
   sheets, and honest omission over shipping a broken silhouette. Extends ADR-014.

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
