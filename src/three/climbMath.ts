/**
 * CLIMB HEROES (E3b) — pure, three-free pose engine + the authored Part-1
 * sequence: Piper "Ulla" → Z-142(PA-28) → L-39 in ONE continuous climb from
 * the ground up INTO the cloud ceiling — the whole flight lives below the
 * deck inside chapter 01, and the section ends with the L-39 melting into
 * the white-out (`skyMath.heroClimbPunch`).
 *
 * TIME BASE: the climb run's OWN localT (window pos [1.5, 2.5] — the value
 * every 2D scene already breathes by), NOT absolute scroll. Martin authored
 * the pacing in % of scroll on a story where the climb owns 1/6 of the
 * scroll (chapter `scrollWeight` 2 of total 12) — `SCROLL_TO_T` bakes that
 * conversion, so the authored % pacing is preserved exactly, and if the
 * chapter is ever re-weighted, the 2D world and this sequence stretch
 * TOGETHER by construction (both are functions of the same localT).
 *
 * The math is a 1:1 port of the choreo-lab so a lab-authored scene plays
 * back identically:
 *  - snapshots `{p, q, step}`; snapshot i sits at
 *    `SEQ_START_T + (start + Σ step[<i]/100) · SCROLL_TO_T`
 *  - position = CENTRIPETAL Catmull-Rom through the snap points (the lab
 *    used THREE.CatmullRomCurve3's default — uniform CR bends the corners
 *    differently, so the parameterization is ported faithfully)
 *  - rotation = slerp between snap quaternions
 *  - both driven by one MONOTONE-CUBIC time-warp u(t) (Fritsch–Carlson
 *    through the snap knots) → C1-continuous speed, keyframe timing exact
 *  - unlock spheres grow r0→r1 while dissolving; name tags follow the 2D
 *    graduation-tag envelope (dim constant + a golden pulse at each unlock)
 */

export type Vec3 = readonly [number, number, number]
export type Quat = readonly [number, number, number, number]

export type ClimbSnap = {
  p: Vec3
  q: Quat
  /** % of scroll the leg AFTER this snap consumes (lab semantics). */
  step: number
}

export type ClimbAircraft = {
  id: 'ulla' | 'z142' | 'l39'
  /** Graduation-tag label — matches the 2D ladder (skyMath.GRADUATION),
   *  cased for the tag ("Ultralight", not ULTRALIGHT — Martin's call). */
  name: string
  /** Start offset after the sequence start, in %-of-scroll fractions of the
   *  AUTHORED story (converted through SCROLL_TO_T like the steps). */
  start: number
  /** Lab `entry.size` — the display scale of the 10-normalized GLB. */
  size: number
  /** First aircraft: stays parked at snap 0 while the scene fades in, so
   *  there is never a dead zone where the 2D shows a plane and 3D is blank. */
  holdBefore?: boolean
  snaps: readonly ClimbSnap[]
}

export type ClimbEffect = {
  /** Window-t the unlock sphere fires at — the INCOMING aircraft's birth
   *  (asserted by tests against the snap timing). */
  at: number
  span: number
  follow: ClimbAircraft['id']
  r0: number
  r1: number
  peak: number
}

export type ClimbSequence = {
  aircraft: readonly ClimbAircraft[]
  effects: readonly ClimbEffect[]
}

/** The lab's world box — the runtime maps the display plane (x ±6 / y ±4 at
 *  z = PLANE_Z) onto the viewport exactly like the lab's audience camera. */
export const LAB_BOX = { X0: -6, X1: 6, Y0: -4, Y1: 4, PLANE_Z: -3 } as const

/** Where the authored motion begins, in the climb window's localT — the
 *  scene cross-fades in around t −0.2..0.2, Ulla parks on snap 0 until here. */
export const SEQ_START_T = 0.06

/** Authored "% of scroll" → window-t, pinned to the reference frame the
 *  sequence was authored in: TOTAL 12 with the climb chapter at
 *  scrollWeight 2 (= 240 vh of chapter scroll). NOTE the climb v1 is
 *  currently UNMOUNTED and the chapter back at weight 1 (Martin's call) —
 *  this factor only matters again if a v2 remounts ClimbHeroes, and then
 *  the chapter must get its scrollWeight 2 back too, or the authored motion
 *  would play at twice the scroll speed. Keep convert.mjs in sync. */
export const SCROLL_TO_T = 6

/** Unlock-sphere styling: the lab's gold pair, opacities lifted for the
 *  BRIGHT 2D sky behind it (the lab authored against a dark void — at the
 *  lab constants the bubble all but vanished over daylight). */
export const SPHERE_SURF_COLOR = 0x6b530f
export const SPHERE_GRID_COLOR = 0xffd63a
export const SPHERE_SURF_ALPHA = 0.32
export const SPHERE_GRID_ALPHA = 0.55

/** Name-tag envelope — the 2D graduation tag verbatim (climb.ts): a dim
 *  constant presence while the type flies, boosted by the unlock pulse
 *  (graduationAt: pulse = 1 − since/0.07 in climb localT). */
export const TAG_BASE = 0.3
export const TAG_PULSE = 0.65
export const TAG_PULSE_T = 0.07

/**
 * The authored Part-1 sequence is GENERATED data (choreo-lab JSON →
 * `local/tools/seq/convert.mjs` → `climbSequence.ts`), so re-authoring the
 * climb is a pure DATA swap — this engine, the runtime scene, the framing,
 * the ownership flip and the model bakes never change. Re-exported here as
 * the sequence's canonical import site. Regenerate with:
 *   node local/tools/seq/convert.mjs local/showcase/sequences/<name>.json
 */
export { CLIMB_SEQ } from './climbSequence'

// ---------------------------------------------------------------------------
// snapshot timing (window-t)
// ---------------------------------------------------------------------------

/** Window-t of each snapshot (the lab's `snapScrolls`, converted). */
export function snapTimes(a: ClimbAircraft): number[] {
  const out = [SEQ_START_T + a.start * SCROLL_TO_T]
  let cum = 0
  for (let i = 1; i < a.snaps.length; i++) {
    cum += (a.snaps[i - 1].step / 100) * SCROLL_TO_T
    out.push(SEQ_START_T + a.start * SCROLL_TO_T + cum)
  }
  return out
}

/** [firstSnap, lastSnap] window-t of an aircraft — its life span. */
export function lifeSpan(a: ClimbAircraft): readonly [number, number] {
  const st = snapTimes(a)
  return [st[0], st[st.length - 1]]
}

/** Window-t where the whole scene's motion ends (last snap of all). */
export function sceneEnd(seq: ClimbSequence): number {
  let end = SEQ_START_T
  for (const a of seq.aircraft) end = Math.max(end, lifeSpan(a)[1])
  return end
}

/** Life alpha at window-t — instant on/off at the snap span (lab LIFE fade 0
 *  = clean type handoffs); `holdBefore` parks the first aircraft through the
 *  scene fade-in. The L-39's exit needs no fade of its own: the rising
 *  white-out swallows it (presence × (1 − fog) in the scene). */
export function lifeAlpha(a: ClimbAircraft, t: number): number {
  const [t0, t1] = lifeSpan(a)
  if (!a.holdBefore && t < t0) return 0
  return t <= t1 ? 1 : 0
}

// ---------------------------------------------------------------------------
// monotone-cubic time warp (Fritsch–Carlson) — the lab's buildWarp/evalWarp
// ---------------------------------------------------------------------------

export type Warp = { x: readonly number[]; y: readonly number[]; m: readonly number[]; n: number }

export function buildWarp(sc: readonly number[], n: number): Warp {
  const y = Array.from({ length: n }, (_, i) => i / (n - 1))
  const seg = n - 1
  const d = new Array<number>(seg)
  const mt = new Array<number>(n).fill(0)
  for (let i = 0; i < seg; i++) {
    const dx = sc[i + 1] - sc[i]
    d[i] = dx > 1e-9 ? (y[i + 1] - y[i]) / dx : Infinity
  }
  for (let i = 0; i < n; i++) {
    if (i === 0) mt[i] = isFinite(d[0]) ? d[0] : 0
    else if (i === seg) mt[i] = isFinite(d[seg - 1]) ? d[seg - 1] : 0
    else {
      const a = d[i - 1]
      const b = d[i]
      mt[i] = !isFinite(a) || !isFinite(b) || a <= 0 || b <= 0 ? 0 : (a + b) / 2
    }
  }
  for (let i = 0; i < seg; i++) {
    // Fritsch–Carlson clamp → guaranteed monotone (no overshoot/reversal)
    if (!isFinite(d[i]) || d[i] === 0) {
      mt[i] = 0
      mt[i + 1] = 0
      continue
    }
    const a = mt[i] / d[i]
    const b = mt[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const tau = 3 / Math.sqrt(s)
      mt[i] = tau * a * d[i]
      mt[i + 1] = tau * b * d[i]
    }
  }
  return { x: sc, y, m: mt, n }
}

export function evalWarp(w: Warp, f: number): number {
  const { x, y, m, n } = w
  if (f <= x[0]) return 0
  if (f >= x[n - 1]) return 1
  let i = 0
  while (i < n - 2 && f > x[i + 1]) i++
  const dx = x[i + 1] - x[i]
  if (dx < 1e-9) return y[i + 1] // instant cut
  const h = (f - x[i]) / dx
  const h2 = h * h
  const h3 = h2 * h
  const m0 = m[i] * dx
  const m1 = m[i + 1] * dx
  return (
    (2 * h3 - 3 * h2 + 1) * y[i] +
    (h3 - 2 * h2 + h) * m0 +
    (-2 * h3 + 3 * h2) * y[i + 1] +
    (h3 - h2) * m1
  )
}

// ---------------------------------------------------------------------------
// centripetal Catmull-Rom — THREE.CatmullRomCurve3's default, ported so the
// runtime path IS the lab path (uniform CR bends corners differently)
// ---------------------------------------------------------------------------

type Cubic = { c0: number; c1: number; c2: number; c3: number }

function nonuniformCR(
  x0: number, x1: number, x2: number, x3: number,
  dt0: number, dt1: number, dt2: number,
): Cubic {
  let t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1
  let t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2
  t1 *= dt1
  t2 *= dt1
  return { c0: x1, c1: t1, c2: -3 * x1 + 3 * x2 - 2 * t1 - t2, c3: 2 * x1 - 2 * x2 + t1 + t2 }
}

const cubicAt = (c: Cubic, t: number) => c.c0 + (c.c1 + (c.c2 + c.c3 * t) * t) * t

/** Evaluate the centripetal Catmull-Rom through `points` at u (0..1),
 *  writing into `out`. Faithful port of THREE.CatmullRomCurve3.getPoint. */
export function catmullRomAt(points: readonly Vec3[], u: number, out: [number, number, number]): void {
  const l = points.length
  if (l === 1) {
    out[0] = points[0][0]
    out[1] = points[0][1]
    out[2] = points[0][2]
    return
  }
  const p = (l - 1) * u
  let intPoint = Math.floor(p)
  let weight = p - intPoint
  if (weight === 0 && intPoint === l - 1) {
    intPoint = l - 2
    weight = 1
  }
  if (intPoint < 0) {
    intPoint = 0
    weight = 0
  }
  const p1 = points[intPoint]
  const p2 = points[Math.min(intPoint + 1, l - 1)]
  const p0: Vec3 =
    intPoint > 0
      ? points[intPoint - 1]
      : [2 * points[0][0] - points[1][0], 2 * points[0][1] - points[1][1], 2 * points[0][2] - points[1][2]]
  const p3: Vec3 =
    intPoint + 2 < l
      ? points[intPoint + 2]
      : [
          2 * points[l - 1][0] - points[l - 2][0],
          2 * points[l - 1][1] - points[l - 2][1],
          2 * points[l - 1][2] - points[l - 2][2],
        ]

  const d2 = (a: Vec3, b: Vec3) =>
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  let dt1 = Math.pow(d2(p1, p2), 0.25)
  let dt0 = Math.pow(d2(p0, p1), 0.25)
  let dt2 = Math.pow(d2(p2, p3), 0.25)
  if (dt1 < 1e-4) dt1 = 1.0
  if (dt0 < 1e-4) dt0 = dt1
  if (dt2 < 1e-4) dt2 = dt1

  out[0] = cubicAt(nonuniformCR(p0[0], p1[0], p2[0], p3[0], dt0, dt1, dt2), weight)
  out[1] = cubicAt(nonuniformCR(p0[1], p1[1], p2[1], p3[1], dt0, dt1, dt2), weight)
  out[2] = cubicAt(nonuniformCR(p0[2], p1[2], p2[2], p3[2], dt0, dt1, dt2), weight)
}

/** Quaternion slerp (x, y, z, w), shortest path, writes into `out`. */
export function slerpQuat(a: Quat, b: Quat, t: number, out: [number, number, number, number]): void {
  let bx = b[0], by = b[1], bz = b[2], bw = b[3]
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw
  if (cos < 0) {
    cos = -cos
    bx = -bx
    by = -by
    bz = -bz
    bw = -bw
  }
  let s0: number
  let s1: number
  if (cos > 0.9995) {
    s0 = 1 - t
    s1 = t
  } else {
    const omega = Math.acos(Math.min(cos, 1))
    const sin = Math.sin(omega)
    s0 = Math.sin((1 - t) * omega) / sin
    s1 = Math.sin(t * omega) / sin
  }
  const x = s0 * a[0] + s1 * bx
  const y = s0 * a[1] + s1 * by
  const z = s0 * a[2] + s1 * bz
  const w = s0 * a[3] + s1 * bw
  const len = Math.hypot(x, y, z, w) || 1
  out[0] = x / len
  out[1] = y / len
  out[2] = z / len
  out[3] = w / len
}

// ---------------------------------------------------------------------------
// pose evaluation
// ---------------------------------------------------------------------------

export type ClimbPose = {
  p: [number, number, number]
  q: [number, number, number, number]
}

export function createClimbPose(): ClimbPose {
  return { p: [0, 0, 0], q: [0, 0, 0, 1] }
}

/** Per-aircraft baked lookup state (warp is built once, points reused). */
export type AircraftTrack = {
  aircraft: ClimbAircraft
  times: number[]
  warp: Warp | null
  points: Vec3[]
}

export function buildTrack(a: ClimbAircraft): AircraftTrack {
  const times = snapTimes(a)
  return {
    aircraft: a,
    times,
    warp: a.snaps.length > 1 ? buildWarp(times, a.snaps.length) : null,
    points: a.snaps.map((s) => s.p),
  }
}

/** Pose the aircraft at window-t (lab `poseModelAt`) — parked at its path
 *  ends outside the span, C1-smooth inside. Allocation-free. */
export function poseTrackAt(track: AircraftTrack, t: number, out: ClimbPose): ClimbPose {
  const { aircraft: a, warp, points } = track
  const n = a.snaps.length
  if (n === 1 || !warp) {
    out.p[0] = a.snaps[0].p[0]
    out.p[1] = a.snaps[0].p[1]
    out.p[2] = a.snaps[0].p[2]
    out.q[0] = a.snaps[0].q[0]
    out.q[1] = a.snaps[0].q[1]
    out.q[2] = a.snaps[0].q[2]
    out.q[3] = a.snaps[0].q[3]
    return out
  }
  const u = evalWarp(warp, t)
  catmullRomAt(points, u, out.p)
  const g = u * (n - 1)
  const i = Math.min(Math.floor(g), n - 2)
  const frac = g - i
  slerpQuat(a.snaps[i].q, a.snaps[i + 1].q, frac, out.q)
  return out
}

/** The HERO's position at window-t — whichever aircraft carries the flight
 *  right now (they hand off at shared points, so this is continuous). The
 *  climb ENVIRONMENT derives its world-drift from this: sky and ground
 *  stream against the aircraft's own motion, still a pure fn of scroll. */
export function heroPosAt(tracks: readonly AircraftTrack[], t: number, out: ClimbPose): ClimbPose {
  let active = tracks[0]
  for (const track of tracks) {
    if (t >= track.times[0]) active = track
    else break
  }
  return poseTrackAt(active, t, out)
}

// ---------------------------------------------------------------------------
// effects + name tags
// ---------------------------------------------------------------------------

export type SphereState = {
  /** Sphere radius in lab units. */
  r: number
  /** Envelope 0..1·peak — multiply by SPHERE_*_ALPHA for the two materials. */
  env: number
}

/** Unlock-sphere state at window-t, or null when it is not on frame.
 *  env = peak · min(1, 20u) · (1−u)² — grows r0→r1 while dissolving. */
export function sphereStateAt(e: ClimbEffect, t: number): SphereState | null {
  const span = Math.max(e.span, 1e-4)
  const u = (t - e.at) / span
  if (u < 0 || u > 1) return null
  return {
    r: e.r0 + (e.r1 - e.r0) * u,
    env: e.peak * Math.min(1, u * 20) * (1 - u) * (1 - u),
  }
}

/** Name-tag alpha factor at window-t — the 2D graduation-tag envelope: while
 *  the type flies its tag holds at TAG_BASE, boosted by the golden unlock
 *  pulse right after its birth (no pulse on the first rung, exactly like
 *  graduationAt). Multiply by the scene presence. */
export function tagAlpha(a: ClimbAircraft, t: number): number {
  if (lifeAlpha(a, t) <= 0) return 0
  if (a.holdBefore) return TAG_BASE
  const since = t - lifeSpan(a)[0]
  const pulse = Math.max(0, 1 - since / TAG_PULSE_T)
  return TAG_BASE + TAG_PULSE * pulse
}

// ---------------------------------------------------------------------------
// presence — derived from the SAME scene slots the 2D world paints
// ---------------------------------------------------------------------------

export type SlotLike = { theme: string; alpha: number }

/**
 * How much of the frame the `sky` world owns this frame, composed exactly
 * like the 2D stage paints it (incoming paints OVER the base):
 *  base sky + incoming sky   → 1 (one continuous world across the seam)
 *  base sky + incoming other → 1 − incoming.alpha
 *  base other + incoming sky → incoming.alpha
 */
export function skyPresence(slots: readonly SlotLike[], count: number): number {
  if (count === 0) return 0
  const base = slots[0]
  if (count === 1) return base.theme === 'sky' ? 1 : 0
  const inc = slots[1]
  if (base.theme === 'sky') return inc.theme === 'sky' ? 1 : 1 - inc.alpha
  return inc.theme === 'sky' ? inc.alpha : 0
}
