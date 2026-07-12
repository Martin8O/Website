# Architecture Decision Records (index)

Short, dated records of *why*. Newest on top. Detail in the linked history/notes where relevant.

---

### ADR-042 — Locked additions: airliner contrails + two L-159 flypasts; E3b climb v1 retired (2026-07-12)
Content Martin wanted "for sure" on the site, decoupled from the still-uncertain 3D climb. Additive by
construction: the 2D scenes paint their full environments and know nothing of the 3D jets, so `?world=2d`
plays the whole story without them (the L2 fallback contract, upheld).

1. **Airliner contrails (2D, `canvas/scenes/sky/contrails.ts`, both worlds).** A framing detail that opens
   the story (origin dawn) and answers it (sunset landing): two high airliners drawing condensation trails.
   **The trail lives on a FIXED station grid in crossing-space** — each patch of sky keeps its own wobble
   and dissolution (smooth value-noise keyed by the ABSOLUTE station index), and only its AGE grows as the
   plane pulls away, so the trail waves + melts IN PLACE instead of dragging its pattern behind the jet.
   The head draws a PARTIAL segment to the exact condensation-gap point (whole-station steps read as
   "skokově"); `lineCap:'butt'` (round caps double-blend at joints → beads); per-plane `shrink` gives a
   receding lane (segments keep their laid-at size). Sun-proximity tint on the sunset trails (lit up top,
   cooling down-sky). One plane holds a level lane, the other climbs and recedes.
2. **Two L-159 flypasts (3D, `three/scenes3d/SkyPatrols.tsx` + pure `three/patrolMath.ts`, tested).** Real
   baked GLB (`public/models/l159.glb`), camera-glued like the retired climb heroes. **Choreography is pure
   screen-anchored math** (`anchorPoint`/`screenOf` back-project viewport fractions through the stage FOV,
   so a composition — "the 40 % line", "right of the tower" — holds at any aspect; unit-tested round-trip).
   (a) *Airshow head-on pass*: after the 2D display exits (airshow tRaw 1.175–1.455), a GRAY pair straight
   at the crowd in daylight, simultaneous mirrored 3/4 vykrut → opposite knife-edge breaks that CROSS on
   screen at a safe depth split (the near-miss illusion). (b) *Landing break*: an ARMED pair (generic
   tanks + AIM-9s hung on the real pylons at runtime) PUNCHES THROUGH the observer from behind — first seen
   close + huge at the first 57 % stop — and breaks right onto the downwind, leader then wingman one tick
   later over the same fix, the 180° coming out right of the 2D tower while Martin's own jet brakes below.
3. **Homogeneous trails, no ribbon.** Display smoke + wingtip vortices are soft additive POINT-SPRITES
   distributed by ARC LENGTH (equal density through the fast break sweep), with a per-point coverage
   equalizer `aB ∝ 1/d` (the far approach stops piling bright, the near after-pass stops thinning) and a
   width ramp that fattens the plume after the roll. A view-facing ribbon tore into polygonal bowties at
   grazing angles; per-point random jitter tore the dense plume into separated dots → replaced by a smooth
   low-frequency meander so neighbours drift together.
4. **Material correctness (`makeInstance`).** The bake's `dedup` merged look-alike materials, so a shared
   clone let the red beacon tint the canopy. Light + glass meshes now get UNIQUE clones (`SPECIAL_MESH`);
   tip + formation lights emit warm WHITE-YELLOW with a 4-ray sparkle sprite, only the spine beacon is red.
   Per-scene grade + a bespoke light rig each (bright side-sun airshow with a ground-bounce hemisphere;
   low-red-sun dusk) so the gray airframe reads plastic, never flat. **Entry alpha is BINARY** — any
   opacity < 1 on the big close airframes turned them see-through (transparent self-overlap has no
   self-occlusion), and they arrive from off-frame so no fade-in is needed.
5. **The overhead-pass blink, retimed for a stretched chapter (`skyMath.LANDING`).** The 2D landing's black
   flash + camera shake is compressed to a ~2 vh burst centred on the 55↔56 HUD-step BOUNDARY (t 0.5844 =
   55.50 %), so a scroll stop parked ON a readout never catches it humming — it only streaks past mid-glide.
6. **Sunset stretched ×1.7, climb un-stretched (total weight 11.7).** The two new beats need scroll room, so
   `sky-sunset` carries `scrollWeight 1.7` (its t-keyed 2D choreography stretches in sync — both worlds are
   pure fns of the same localT). The E3b 3D climb **v1 is UNMOUNTED** (`SkyScenes` mounts only the patrols;
   `ClimbHeroes.tsx` kept as reference like `Jets.tsx`) and `sky-climb` is back at weight 1 → chapter 01 is
   pure 2D at its ORIGINAL tempo (Martin's call — v1 was never wanted live, a re-choreographed v2 is a
   separate later decision). `climbMath.SCROLL_TO_T` stays pinned to the total-12/weight-2 frame the
   sequence was authored in — restoring v2 means remounting `ClimbHeroes` AND restoring `scrollWeight 2`,
   or the motion plays 2× fast (flagged in `climbMath.ts` + `convert.mjs`). Progress-anchored values
   (era stops, card windows, footer fade) retuned to 11.7; the airshow→sunset hand-over is a real crossfade
   from 53 %.
7. **The sunset overhead-pass artifact removed.** A top-view belly planform slid in before the black blink —
   a top-down silhouette in a head-on scene read as a glitch; deleted (the flash + rear-view reveal carry
   the beat alone, as they already did on mobile).

**Push decision:** `main` was ahead 1 (the E3b commit `6b61bf2`, whose 3D climb this tree unmounts) — this
commit + that one deploy together; prod shows the original 2D climb. **Not the demo's ceiling** — the
patrols are original, math-driven, unit-tested. Model-fit: 🔥 Fable 5 · high (build + iteration).

**Follow-up (same day) — the 3D layer's FIRST real deploy exposed two CSP conflicts.** E3b was only ever
verified on a local `vite preview` build, which does NOT apply `vercel.json` headers, so the models had
never met the hardened CSP (ADR-031) until this push — and rendered NOTHING on prod (GLB 200s, never
decodes). Two independent causes, fixed to disturb the CSP as little as possible:
1. **meshopt decoder needs WebAssembly + a blob worker.** `EXT_meshopt_compression`'s runtime decoder
   trips `script-src 'self'` (no `'wasm-unsafe-eval'`). Rather than grant WASM execution, the bake drops
   `meshopt()` and keeps `quantize()` only — `KHR_mesh_quantization`, which three.js reads NATIVELY, no
   decoder, no WASM (`local/tools/bake/bake.mjs`; l159 407 KB → 731 KB, lazy). The `MeshoptDecoder` wiring
   is removed from `SkyPatrols.tsx`. **No `script-src` change.**
2. **GLTFLoader loads the GLB's embedded texture through a `blob:` URL** (fetch), tripping
   `connect-src 'self'`. The minimal safe grant: **`connect-src 'self' blob:` + `img-src 'self' data: blob:`**
   (in `vercel.json`). `blob:` URLs are same-origin, in-memory, created by our own three.js — no external
   surface; Observatory/SecurityHeaders do not penalize it (unlike `unsafe-*`/`*`), so the A+ grades hold.
   Deliberately NOT `'wasm-unsafe-eval'` (the meshopt-free bake means the more sensitive code-execution
   grant is never needed). Re-verified on the live deploy (real headless Chrome): both flypasts render,
   console clean. **Lesson: the 3D/GLB path must be checked against the REAL deployed CSP, not just a
   preview build** — a preview is CSP-blind.

---

### ADR-041 — E3b: 3D climb heroes + chapter-01 scroll stretch + hero-level flip (2026-07-11)
The FIRST scene to hand its hero to the 3D layer: Martin's authored Part-1 climb (Piper "Ulla" →
Z-142/PA-28 → L-39) flies as real CC-BY GLB models in the R3F layer, below the cloud deck of a
stretched chapter 01, ending with the L-39 melting into the white-out. The 2D world keeps painting the
whole environment and IS the fallback (`?world=2d`).

1. **Sequence is DATA, not code.** A choreo-lab JSON is converted (`local/tools/seq/convert.mjs`) into a
   generated `src/three/climbSequence.ts` (`CLIMB_SEQ`), re-exported by `climbMath.ts`. Re-authoring the
   climb is a one-command data swap — the engine, runtime scene, framing, ownership flip and model bakes
   never change. The converter re-bases the lab's absolute scroll-% into the site's window-t and WARNS if
   the new scene length falls outside the white-out band (→ a 2-line `heroClimbPunch` retune) or uses an
   un-baked model.
2. **Pure pose engine (`climbMath.ts`, three-free, ported 1:1 from the lab, tested).** Snapshots `{p,q,step}`
   → monotone-cubic (Fritsch–Carlson) time-warp `u(t)` over a CENTRIPETAL Catmull-Rom + quat slerp →
   C1-continuous speed, keyframe timing exact. Time base = the climb run's OWN localT (the same clock the
   2D env breathes by), scaled by `SCROLL_TO_T` — so a future chapter re-weight stretches both worlds
   together by construction.
3. **Chapter scroll-weight (`timeline.ts`).** New `chapter.scrollWeight` (climb = 2) warps progress↔pos on
   the half-integer knot grid (the same grid scene windows sit on), so a weighted chapter stretches exactly
   its own scene window; the track gains the extra height so every weight-1 chapter keeps its real pace.
   One `CHAPTER_WEIGHTS` bake threads through App/Story/CanvasStage/Stage3D; era stops + footer retuned.
   Decision: chapter 01 owns the whole authored climb below the deck and ENDS at cloud entry — 01 and 02
   are NOT merged (the above-deck world belongs to 02, which cross-fades in out of the white).
4. **Hero-level ownership flip (`owned3d.ts`).** Finer than `OWNED_3D` (a whole frame): `HERO_3D` +
   `paintsHero2D()` let the 2D climb keep its whole environment and skip ONLY its aircraft story — and only
   while the 3D scene is live (`setHero3DReady`, cleared on unmount / a failed model fetch), so a flaky
   chunk simply leaves the 2D hero flying.
5. **The 3D env answers the flight (Martin's note — the sky must not "approach" when the plane banks/dives).**
   `climb.ts` in flip mode derives its cloud-scrap + ground drift from the HERO's position (a pure fn of
   scroll via the shared tracks), not from raw scroll — fly right → scraps stream left, climb → world sinks.
   2D-only mode keeps the original streaming untouched.
6. **Grade + fidelity.** E3a bakes 3 clean GLBs (`local/tools/bake/`) — normalize-to-10, prop split onto a
   spin pivot (a triangle-plane cut, since the source welds blades into the airframe — the lab's
   component rule only caught the spinner tip), meshopt + webp; 7 MB lazy, ~free at 60 fps. Lab audience
   camera reproduced (contain-framing), 2D-style name tags (below-right, "Ultralight"), unlock spheres
   (grow + dissolve, opacity lifted for daylight), RoomEnvironment + ACES on the hero materials only.
   Parametric fly-bys (`Jets.tsx`) UNMOUNTED — only Martin's real models fly; the code stays as reference.
   CC-BY credits render in the footer (`data/credits.ts`).

### ADR-040 — E2: scroll-flight camera rig + 3D-owned mechanism (2026-07-10)
The 3D layer stops being a set of camera-space fields and becomes a **shared world the camera flies through**.
`scrollProgress → pos → camera pose` along ONE in-code Catmull-Rom path; scenes become world-space *places*.

1. **Flight path (`src/three/flightMath.ts`, pure + three-free, 10 tests).** The path is baked from the SAME run
   windows the 2D timeline uses — a new shared helper `runWindow(run, count)` in `sceneTimeline.ts` is now the
   single definition (`runLocalT` and the flight path both derive from it, so the worlds can't disagree about
   where a scene lives). Per-run easing lives in the **stop spacing, not a time-warp**: inside a registered
   theme's window the camera travels exactly that theme's `TRAVEL` distance (the E1 dolly verbatim — origin 5,
   contact 8), cruising between scenes; because every window edge sits on the 0.5-pos stop grid, the travel across
   a window is EXACT. Catmull-Rom C1-smooths the pace changes; a gentle weave + bank-into-turn (≤ ~5°) is the
   "flight". `dolly` moved out of the starfield spec into `TRAVEL` — one source of truth for pace.
2. **Starfields are world-space places (`Starfield.tsx`).** Each field is anchored at its scene window's START,
   oriented along the window chord (`flightAnchorAt`), and the camera flies through it — the depth read is
   identical to E1's dolly, the motion just belongs to the camera now. Star view-cones gained margin (tanX/tanY,
   +count) so the flight weave never shows a cone edge; the ambient roll moved to an inner group so the anchor
   pose stays put.
3. **Camera rig (`Stage3D.tsx`).** The `FrameController` writes the flight pose into the shared snapshot
   (`frame3d.ts` gains `camera: FlightPose`), aims the camera down the path forward, banks by rolling the up
   vector, and applies the E1 pointer micro-parallax as a translation **along the camera's own right/up axes**
   (composes with any heading; orientation still comes from the pose alone — never the parallax-offset eye).
   Allocation-free (module-level scratch vectors).
4. **3D-owned scene mechanism (`src/three/owned3d.ts`).** The explicit registry flip the phase reserves: a theme
   in `OWNED_3D` is skipped by the 2D stage while the mode is '3d' (`paints2D()`, read through a ref in
   `CanvasStage` so a mode flip never re-inits the loop; in '2d' the 2D world always paints everything). **Ships
   EMPTY on purpose** — no 3D scene outclasses its 2D original yet; a flip is a per-scene product decision (E3+).
   Documented caveat before any real flip: wire 3D-chunk-load failure back into the world mode (mode says '3d'
   even if the chunk failed), or a flaky fetch leaves a hole in the story.

**Contact starfield recolor (same session, Martin's note):** the E1 contact field read too white/large against
the 2D galaxy's small coloured dots → palette swapped to the 2D galaxy hexes (no pure white), sizes 0.04–0.13 →
0.026–0.08, anchor boost 2.2 → 1.7.

Verified live over CDP on dev AND the prod build: camera flies monotonically (z 0 → −67), travels each registered
window by exactly its `TRAVEL` distance (origin 5, contact 8), cruise between; presence still tracks the 2D
cross-fade to 3 decimals (contact 0.583); `?world=2d` + reduced-motion → one canvas, 0 bytes of three; 3D layer
~free (finale 8.4–9.0 ms vs 8.9 ms 2D-only, software GL); console clean. The owned-flip was proven by temporarily
flipping `contact` (2D galaxy vanished, 3D owned the frame; '2d' mode still L1) then reverting to the empty set.
Gate green (234, +14). Scope: `src/three/` (new `flightMath`+`owned3d` +tests, edited `Stage3D`/`Starfield`/
`frame3d`/`registry3d`/`starfieldMath`) + `sceneTimeline.ts` (additive `runWindow`) + `CanvasStage`/`Story`
wire-in. 2D scene renderers untouched.

### ADR-039 — L2 begins: the additive R3F 3D layer (E1) (2026-07-10)
Phase E (the deferred R3F 3D fly-through) opens. The strategy is locked for the whole phase and is the key
decision: **AUGMENT, never rewrite.** A second, transparent R3F `<Canvas>` rides one layer above the shipped 2D
canvas world and adds true depth scene-by-scene via its own theme registry — but the 2D world keeps painting
every scene exactly as before and IS the fallback (reduced-motion / no-WebGL2 / kill-switch). Both layers derive
everything from the SAME `scrollProgress` + `sceneTimeline`, so cross-fades can never desync. A scene only ever
flips to "3D-owned" (2D stops painting it) as an explicit later decision (E2+), never implicitly.

1. **Capability gate (`src/three/worldMode.ts`).** Pure `resolveWorldMode({ webgl2, reducedMotion, override })`
   + a live `useWorldMode()` hook. Order: `prefers-reduced-motion` → 2D (the a11y contract — the 3D layer is
   motion by nature, so it never mounts under reduced motion and its chunk is never fetched); no WebGL2 → 2D
   (one cached throwaway-context probe); `?world=2d` kill-switch → 2D. `?world=3d` states intent but cannot
   override the two hard gates. Story unmounts the whole island the moment the hook returns '2d'.
2. **Stage3D (`src/three/Stage3D.tsx`) — the transparent augmentation stage.** A lazy R3F island between the 2D
   canvas and the DOM layers: `flat` (no tone mapping → shader hexes match the 2D palette), `dpr=[1,2]`,
   `alpha`, `pointer-events:none`, `aria-hidden`. A `FrameController` (`useFrame` priority −1) reads
   `getScrollProgress()` imperatively (zero per-frame React), resolves the SAME `resolveSceneFrame`, and writes
   one shared mutable snapshot (`frame3d.ts`, allocation-free) that every scene reads the same frame. Owns the
   eased-pointer channel (CanvasStage semantics) → camera micro-parallax (a pure translation; near stars answer
   more than far ones = the depth read; zero on touch / at presence 0).
3. **Depth starfield — the first true-3D content.** Pure `starfieldMath.ts` (seeded star bake → `Float32Array`s
   + per-theme presence curves — origin's **mirror the 2D dawn math exactly** so the deep stars die with the 2D
   star layers; contact's ramp in ahead of the galaxy `bloomT0` and hold) + a `Starfield` scene: one additive
   `THREE.Points` draw, soft round sprite + per-star twinkle computed in the fragment shader (no textures/assets),
   `depthWrite:false`. Scroll dollies the field toward the camera = real depth parallax. Registered for `origin`
   + `contact` in `registry3d.ts` (total over `Theme`, `null` = 2D carries it alone).
4. **three pinned to r182.** R3F v8 (the React-18 line; v9 needs React 19) uses `THREE.Clock`, which three r183
   deprecates with a runtime console warning → r182 is the last clean release. `chunkSizeWarningLimit` 700 → 900
   (the three chunk is ~880 kB raw / 237 kB gz, code-split — the initial shell bundle is unchanged).

Verified live over CDP on dev AND the prod build (real headless Chrome — the in-app Browser pane can't size R3F,
no ResizeObserver): `?world=2d` + reduced-motion → one canvas, **0 bytes of three fetched**; 3D mode → the
starfield presence tracks the 2D cross-fade weights to 3 decimals (contact 0.583 = the exact slot alpha); the
3D layer costs ~0 ms (finale 7.8–8.4 ms/frame vs 8.4 ms 2D-only, in software GL); console clean; pointer eases
0 → 0.994. Gate green (220, +14). Model-fit: 🔥 Fable 5 · high.

---

### ADR-038 — Offer-scene polish, chapter-10 nav reframe, RL public (2026-07-10)
Follow-up refinement of the ADR-037 flight-plan scene, the contact finale reframed to *close* the flight
metaphor, and the RL Lab repo going public. Many live review rounds with Martin (desktop + mobile, EN/CZ),
verified over CDP by driving the offer band and reading rendered geometry/text.

1. **Proof-panel "design A" — the name is the only link.** A long description rendered as one amber underlined
   hyperlink read as an overloaded "giant orange link". Split it: the project **name** is the amber link (new
   `label` field + `.nameLink`), the **description** trails as smaller muted text (`.itemDesc`). Same on the
   "This website" *Open source* line — **only "read the code" / "zde" is the anchor** (new `linkText` on
   selfItems), the bold lead stays plain text.
2. **Card 04 = the proof / flagship stack.** RL Lab + Data Lab leads as the flagship (links to the now-public
   `Martin8O/RL-Lab`), then Registrace, then Těnovice — each with an **accurate, feature-rich description sourced
   from the real repo** (Těnovice's fundraising features fetched from `AnnaRozumova/Tenovice_fund_page`: pledge
   calculator, anonymous public pledges, account/Cognito editing, serverless AWS). "No tracking" moved into the
   "This website" block (bolded to match its neighbours). As the card grew, its centre was re-tuned so its
   **bottom stays aligned with card 02** (top → 58.4 %).
3. **Hover/focus lights a card up.** `:hover` + `:focus-within` on a panel brightens the frame and **enlarges the
   amber glow** (30 → 60 px, symmetric, zero offset = no drop shadow — Martin's "no shadows").
4. **Mobile offer layout — per-card edge anchoring (mobile only; desktop untouched).** The panels take turns in
   one slot but each at its own spot: 02/04 top-anchored under the flight-plan title, 03 centred ~⅓ up, 01
   bottom-anchored just above the bottom HUD (TickScale is `display:none` on mobile → the era HUD *is* the "time
   axis"). The anchor (`--ty` 0 / −50 % / −100 %) picks which edge lands, so any card height tucks correctly.
   Mobile also gets **shorter self-copy** (`htmlMobile`: drops "accessibility"/"přístupnost", trims "No tracking")
   + a tighter "This website" gap — freeing the vertical lines the tall card can't spare on a phone.
5. **Chapter 10 reframed to close the flight metaphor.** "Your idea could be next" felt detached from the 09
   flight plan. Retitled **"Set your destination" / "Zadejte svůj cíl"** (the plotted route's DESTINATION = the
   visitor's project); opening line reworked ("Your destination can take any form — a website, an app, a tool, an
   automation"). List order unified to **web · app · tool · automation** in chapter 10 + the About panel, whose
   p2 was synced to the same copy ("I take on the small-to-medium projects, built properly, end to end"); "What I
   bring" split onto its own paragraph.
6. **RL Lab public.** `projects.ts` `live:false → true`, "private while licensing" status dropped; the CZ RL
   tagline now says **"AI"** rather than "agentům posilovaného učení" (accessible framing, Martin).

---

### ADR-037 — "Ground Control": the flight-plan offer scene (chapter 09) (2026-07-10)
A **new canvas theme `offer`** inserted between `dev` (08) and `contact` (10) — the site's first outright
*call-to-action* scene. Chapter count 11 → 12; the contact finale renumbered 09 → **10 · Now**. Many live
review rounds with Martin; the shape below is where it settled.

1. **A night-mode, full-bleed IFR/enroute chart, NOT a combat reticle.** The first build was a cockpit
   targeting reticle locking onto the visitor; Martin steered it to a **civil ATC / SID-chart idiom** —
   airways between five-letter fixes, sector polygons with altitude blocks, a red-hatched LKR, a VOR compass
   rose — re-inked for the site's night palette. **No geography** (aeronautical charts carry airspace, not
   terrain/rivers/towns). The scene runs **edge to edge** — the earlier rounded "plate" with dark margins was
   removed at Martin's call (`mx=0, my0=0`, full-screen wash, no border/clip).
2. **A plotted VFR route = the four mission cards.** FOUR waypoints, one per card, drawn as you scroll:
   **START(1) → 2 → 3 → DEST(4)**. Panel *N* reveals the instant the pencil reaches waypoint *N* — the panel
   windows are **derived from the route arc-length** in `offerMath` (one timing source for canvas + DOM), so
   the choreography can never drift from the drawing.
3. **Card layout measured off Martin's sketch.** Final positions are the **centres** of the red boxes he drew
   (fractions read off the image), anchored via `--tx/--ty:-50%` so the fit holds at any content height:
   01 (20 %, 33 %) · 02 (29 %, 76.5 %) · 03 (53 %, 44 %) · 04 (83 %, 61 %). A flowing diagonal cascade, not
   four rigid corners (earlier iterations tried corners; the reticle centre; a centre-column zig — all
   rejected).
4. **Ambient ATC traffic — five airliners.** Each flies a **4-point airway (two junction turns, always
   forward)** at a pace **proportional to its own airspeed** (250–400 kt); one rides the **LEMBI↔USUPA bottom
   corridor run out to both screen edges**. Marker = a small aircraft glyph; **history = four fading, shrinking
   copies of that glyph** trailing behind; a **speed vector**; a data tag (registration · speed · squawk,
   fictional Czech `OK-` marks). **KEY FIX:** the speed vector "peeled off" the flown line because the heading
   was computed in **fraction space** but drawn in **screen space** on a non-square viewport — corrected to
   `atan2(h·segDy, w·segDx)` so marker, vector and history sit **exactly on the track**. All motion rides
   `time`, so **reduced motion freezes it** (unit-tested).
5. **Copy + card semantics (Martin's calls).** ① "web apps and websites" leads card 01. ② The licence line was
   **de-MIT'd** — the client owns and decides ("**the code is yours — full handover, you own it, no lock-in**"),
   MIT is only for *this* open-source site. ③ Card 03 renamed **Trust → "Good to know" / "Dobré vědět"** — a
   broad heading the ownership/privacy/language/remote items actually fit. ④ Card 04's **"this website" facts
   (200 tests · WCAG · open source) moved under a "This website" sub-block** with the Lighthouse gauges + the
   security grades; the "independently checked" sub-heading was **dropped** (tests/source are self-reported, not
   independently verified). Security grades read **amber label · green score · darker-amber arrow**, every one a
   live re-scan link (Observatory A+ 125/100 · SecurityHeaders A+ · Hardenize all green; Lighthouse
   99/100/92/100). The scene card itself carries only eyebrow + title (**no lede** — the route threads the
   centre where a lede would sit).
6. **Global-% retune for +1 chapter.** All hard-coded scroll fractions rescaled for 12 chapters: `eraFrom`
   (0.23→0.209, 0.585→0.532), `EXTRA_ERAS` (0.2→0.182, 0.62→0.564), `SiteFooter` fade (0.975→0.984), plus the
   `activeEra` test %s. Scene local-`t` means no *visual* beat moved (bitcoin impulse, dev landings verified
   unchanged). Data-driven: a new `Theme` + one registry entry; `data/offer.ts`(+`.cs`) + `OfferPanels.tsx`
   + `scenes/offer.ts` + pure `offerMath.ts` (Vitest). Gate green (206). Verified live over CDP (desktop
   EN/CZ/reduced-motion + mobile), card centres measured to 0.1 %.

### ADR-036 — Text pass: achievement framing, scope humility, symmetric card 00 (2026-07-10)
A bilingual (EN+CZ) copy pass plus one typography pattern, all verified live:
1. **Card 00 (School & Pascal) reframed to achievement, not absence.** Was "…chess … but it couldn't come up with a
   single move. The first lines of code, with no idea where they would lead" — which promoted ignorance / lack of
   confidence. Now the chess is Martin's **school-leaving project that enforced every rule of the game**. CZ centres
   the lead line "Maturita z matematiky a programování." over a justified block; EN "Graduated in maths and
   programming." — content-matched.
2. **Card 00 layout = centred header + justified block + centred footer.** New **global `.lead`** class
   (`display:block; text-align:center`) centres the first sentence; **`.body:has(:global(.lead)) { text-align-last:
   center }`** centres the last line too, scoped to card 00 only. Standard justify leaves the last line ragged-left;
   here we want symmetry on a short card.
3. **Intro** "One life, many worlds" → "**many chapters**" (the "world" metaphor was over-reused / a touch lofty).
4. **Contact 09 de-grandiosed + scope-honest.** Title "The next world could be yours" → "**Your idea could be
   next**"; "Worlds come in all sizes" → "**Whatever you need built** comes in all sizes"; added "**I take on the
   small-to-medium ones and build them properly, end to end**" (honest scope = a trust asset, not a weakness). "What
   I bring" unchanged.
5. **About panel tightened.** Dropped "seventeen of them flying"; the Bitcoin clause "…what I trust — trust grounded
   in deep technical understanding, not in promises —" → "…what I trust: **technical understanding over promises**";
   "And now Claude Code turned the computer screen I once walked away from…" → "And now, with Claude Code, **we've
   built** a hyper-efficient workshop…" (partnership framing; the screen callback stays in the story chapters); "a
   full platform" → "a website".
6. **Healing 06** — dropped the colonoscopy mention (proof stays via the CTA to mojecestakezdravi.cz).
**Justify RETAINED site-wide.** A left-align experiment was tried and **reverted at Martin's call** — the decision is
that line-end stretch is solved by *wording* (arranging words so lines fill) and, on short cards, by `<br>`/`.lead` +
`text-align-last`, NOT by dropping justify. **Learning:** numeric justify-stretch measurement (word-gap ratios via
Range) throws false positives around accent-span boundaries + off-screen cards → trust the eye; only card 00 was
genuinely stretched (Martin's first screenshot confirmed it). Gate green (187).

### ADR-035 — Contact finale legibility + About-copy chronology (2026-07-09)
Polish on the contact finale and a chronology fix in the About panel:
1. **The email address leads with amber + a strong tight black halo.** It was light blue (`#8ec6ff`) and got lost
   in the colourful galaxy behind it. Now a light-amber tint (`amber 58% + fg`, matched to the profile links), a
   touch larger (`clamp(0.86rem, 2vw, 1.02rem)`), and — after trying a blue glow (blurred it) — the site's own
   **black text-shadow idiom dialled up**: 8 stacked near-solid rings that hug the glyphs (max ~7px radius, so the
   halo never bleeds down into the Copy button below). Hover → full amber.
2. **GitHub/LinkedIn proof links are stronger amber.** The `#contact-now` `SiteFooter` links (bottom-right) went
   from muted grey to `amber 82% + fg` (+ a heavier amber underline) so the proof reads clearly as the HUD orange,
   not buried. (An earlier tint on the *About-panel* footer links was reverted — Martin meant the contact page.)
3. **About-panel chronology corrected.** The self-healing came *during* the flying career (~2014), not after, and
   Claude Code is *now* — so "Then a self-healing" → **"Mid-career, a self-healing"** (CZ "Pak" → "Uprostřed toho")
   and **"and now Claude Code"** (CZ "a teď Claude Code"). The one long cumulative sentence stays (deliberate).
Verified live via computed styles (colour/size/shadow, footer match) + a contact-finale screenshot. Gate green (187).

### ADR-034 — Contact finale: Copy stacks under the email on every width, address shown lowercase (2026-07-09)
Two small polish calls on the `#contact-now` sign-off:
1. **Copy button drops below the email on desktop too** (was side-by-side; only phones stacked it). The `.ctaRow`
   is now `flex-direction: column`, centred — email on top, Copy beneath, the whole block centred under the copy.
2. **The address renders lowercase.** The apparent capitals were never in the data (`chapters.ts` label has always
   been `martin@svobodamartin.dev`) — `.cta` carries a global `text-transform: uppercase` for outbound CTAs, and it
   was catching the email. Overrode it to `text-transform: none` on `#contact-now .cta` only; an email should read
   exactly as typed. Verified live (computed styles: column/centre/gap, `text-transform: none`, lowercase text).
   Gate green (187).

---

### ADR-033 — Mobile-parity fixes: canvas branches keyed to width, no auto-hyphenation, centred contact sign-off (2026-07-09)
Martin's mobile review turned up a set of portrait-only defects; each fix is width-gated so **desktop is
byte-identical**. Durable decisions:
1. **Canvas mobile branches key on `w < 720`, matched to the DOM breakpoint.** The contact galaxy now blooms from
   the dev singularity (`w*0.5, ~h*0.55`) and rides its own bloom-reach up to the phone resting spot, instead of
   appearing pre-parked at the top — it emerges from the singularity exactly like desktop. The ch-05 L-159 belly
   sweep (sized off `w`) is skipped entirely on phones, where it read as a small aircraft hanging in the sky rather
   than a shadow blotting it out; the black veil + rear view carry the pass alone. The calm meditator shifts right
   (`0.875w→0.93w`) + a touch down so both legs sit on the bank (the figure height rides `h`, the bank geometry
   rides `w`, so they drift apart on tall viewports).
2. **No automatic hyphenation anywhere.** Dropped `hyphens: auto` from the three justified blocks (Work cards,
   About body, dev-window tooltips). Justify keeps the block edges; splitting words at line ends read badly,
   especially on narrow phones. Real in-sentence dashes are unaffected.
3. **Contact address is a plain string, sign-off is centred.** Removed the decorative `[ … ]` brackets around the
   email (they wrapped onto their own lines on phones and guard nothing — the address is plaintext in the `mailto:`
   href regardless; it's a public contact by design). The `#contact-now` sign-off block (eyebrow + email + Copy +
   hint) now centres under the copy on every width (ID rules out-rank the card's `.alignLeft` edge-pins, which stay
   for the galaxy); on phones the Copy button drops below the full-width address.
4. **Copy accuracy.** Airshow CZ "desetitisíce lidí dole" → "desetitisíce diváků"; ch-05 meditation line to the
   present tense in both languages ("Meditation **has** been… now it **has** more room" / "Meditace **patří**… teď
   **má** víc prostoru") — it's ongoing, not past.
*Why gate on width, not a runtime device check:* the site already draws its mobile DOM layout at 720px; keeping the
canvas seams on the same number means one mental model and a provably-untouched desktop. Verified live over the CDP
mobile harness (390×844) + desktop (1280×800). Gate green (187).

### ADR-032 — Biography fact-check: accurate dates/terminology, a non-chapter era schedule, humbler claims (2026-07-09)
A full fact-check of every claim on the site (Martin's review), reconciled against the sources of truth — his own
health site and his corrections — not memory. Durable decisions:
1. **Terminology: "military jet pilot" (EN) / "pilot proudových letounů" (CZ), never "fighter pilot" / "stíhací
   pilot".** Martin flew jet trainers + the L-159 (advanced *light-combat*), not an air-superiority fighter
   (Gripen/F-16); "fighter" over-claims to ex-colleagues. Applied everywhere incl. `index.html` OG/meta; chapter 02
   eyebrow "Fighters" → "Military jets" / "Proudové stroje".
2. **Dates corrected from the sources.** Illness: diagnosed Jan 2014, remission confirmed by colonoscopy Feb 2016
   (mojecestakezdravi.cz) → era `2014–2016`, dropped the unverifiable "no medication since 2014". Fighters split:
   L-39 `2005–2012`, L-159 `2012–2022` (flown to end of career); service split `2020–2022` / `2022–2026`. About:
   "20 years in the Air Force, 17 flying" (was "20 years a fighter pilot").
3. **Non-chapter era stops (`EXTRA_ERAS`).** The pilot arc needs more year-labels than chapters (L-39 then L-159
   inside one "cruise" chapter; service-end then free-years inside "sunset"). `timeline.activeEra` now merges chapter
   eras with a small `EXTRA_ERAS` list; the L-159 label is synced to the golden unlock ring (climb localT 0.8 =
   pos 2.3 = 23 %), and the "L-159" tag rides with the jet in the climb scene.
4. **Humbler, truthful claims.** "eight builds in five weeks" → "five real apps in about a month" (matches the five
   canvas windows). Dropped "everything public and verifiable on GitHub" (dev-brain + RL-Lab are private) — the
   per-card GitHub links already carry verifiability. Bagram kept to "liaison officer" (self-defining non-flying).
5. **Dev-window interactive layer.** The clickable/hover overlay now ends at 98 % (was 99.5 %, still hover-lit under
   the contact nebula); hover is glow-only (no lift/frame/black shadow); the info popup sits below every window, text
   justified, with an OUTWARD neon glow (a negative box-shadow spread had hidden the glow inside the box).
6. **Crash guard:** `getNebulaLayers` clamps a ring radius to ≥ 0 — a ≈1px (unlaid-out) canvas collapses `unit` and
   `arc()` throws (`IndexSizeError`).
**Deferred:** the dev scene's dark atmospheric edges (the outer cards sit against them) — a scene-composition tweak
for another session. Gate green (187 tests). Model-fit: Opus 4.8 · medium.

---

### ADR-031 — Security-header + DNS hardening pass: green everything that has no downside, leave two grey on purpose (2026-07-08)
Prompted by a Hardenize/Red Sift scan of `svobodamartin.dev`. Verified live state first (DNS = Cloudflare, mail =
Cloudflare Email Routing, web = Vercel DNS-only → Let's Encrypt certs). The durable decisions:
1. **DNS-layer hardening lives in Cloudflare, not the repo.** Added **CAA** (`0 issue "letsencrypt.org"` for Vercel's
   CA + an `iodef` mailto); Cloudflare auto-injects its own CA set (digicert/ssl.com/pki.goog/comodoca) once any CAA
   exists — benign and prevents future breakage. Added **TLS-RPT** (`_smtp._tls` TXT). **DNSSEC** was already on (parent
   `.dev` has a valid DS, algo 13; `dns.google` returns `AD:true`). None of this touches the codebase.
2. **`X-XSS-Protection: 0`, not `1; mode=block`.** The header is deprecated and the legacy auditor could itself
   introduce XS-Leaks in old engines; `0` is the OWASP-recommended value. Real XSS defense is the strict
   `default-src 'none'` CSP. One line in `vercel.json`.
3. **SRI left grey on purpose.** Adding `integrity=` via a Vite plugin is fragile under code-splitting / modulepreload /
   any post-build transform (a drifted hash hard-fails the whole page), for a marginal gain on same-origin assets
   already locked by `script-src 'self'`. Downside > benefit → not worth one green square.
4. **MTA-STS deferred on purpose.** **DANE is already green**, which covers SMTP transport; MTA-STS in `enforce` can
   delay/reject *inbound* mail if the policy drifts from the MX, and needs a hosted `mta-sts.` subdomain — moving parts
   for redundant protection.
5. **HSTS untouched.** The whole **`.dev` TLD is in the browsers' HSTS preload list**, so per-domain `preload`/
   `includeSubDomains` is redundant; Vercel's `max-age=63072000` is already maxed for this domain.
Net: the only grey squares left (SRI, MTA-STS) are deliberate, defensible calls, not unfinished work. Gate green.
Model-fit: Opus 4.8 · low.

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
