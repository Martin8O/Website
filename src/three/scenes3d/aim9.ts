/**
 * AIM-9L/M SIDEWINDER — a license-clean PROCEDURAL build (our OWN geometry, no
 * third-party asset, so nothing to credit). Nose +X, origin-centred, model
 * units. Reads as the real store on Martin's outboard rail: from the tail
 * forward — rocket motor (light grey, brown live-motor band) → warhead (light
 * grey, yellow live-warhead band) → dark Guidance & Control Section carrying
 * the four swept canards → chrome seeker retaining ring → dark-glass seeker
 * dome. Four flat fixed rear fins at the tail.
 *
 * The AIM-9's signature silhouette is BIG fins on a SLIM body, so the fin spans
 * are ~2.5–3× the body radius (not the old rectangular stubs). `len` is the
 * overall length, `rad` the body radius; all section/fin sizes derive from them
 * so the shape stays right at any scale.
 */
import * as THREE from 'three'

// --- Materials (shared per store; the tint gives it real colour, not the old
//     flat grey). Kept simple MeshStandard — the scene lights + env do the rest.
function materials() {
  return {
    // Light airframe grey — warhead + rocket-motor sections.
    body: new THREE.MeshStandardMaterial({ color: 0xd6dae1, metalness: 0.18, roughness: 0.52 }),
    // Guidance & Control Section: dark olive-charcoal (a hint of colour, not
    // dead black), carries the canards + seeker.
    gcs: new THREE.MeshStandardMaterial({ color: 0x34372d, metalness: 0.3, roughness: 0.55 }),
    // Seeker dome — dark IR glass, wet/low-roughness so the env reads on it.
    glass: new THREE.MeshStandardMaterial({ color: 0x0c0f13, metalness: 0.15, roughness: 0.12 }),
    // Chrome seeker retaining ring — the bright band at the dome base.
    chrome: new THREE.MeshStandardMaterial({ color: 0xd0d4da, metalness: 0.95, roughness: 0.16 }),
    // Brass section-joint band (warhead/GCS seam).
    brass: new THREE.MeshStandardMaterial({ color: 0xb0883f, metalness: 0.8, roughness: 0.34 }),
    // Live-warhead yellow band + live-motor brown band (the real stencil belts).
    yellow: new THREE.MeshStandardMaterial({ color: 0xe4b024, metalness: 0.1, roughness: 0.58 }),
    brown: new THREE.MeshStandardMaterial({ color: 0x6e4527, metalness: 0.1, roughness: 0.6 }),
    // Canards — dark metal, of a piece with the GCS.
    canard: new THREE.MeshStandardMaterial({ color: 0x3c3f34, metalness: 0.38, roughness: 0.48 }),
    // Rear fins — light metal like the body.
    tail: new THREE.MeshStandardMaterial({ color: 0xc6cbd2, metalness: 0.28, roughness: 0.44 }),
    // Motor nozzle recess at the very tail.
    nozzle: new THREE.MeshStandardMaterial({ color: 0x1b1d1f, metalness: 0.4, roughness: 0.6 }),
  }
}

/** A body tube from x0 to x1, radius r, long axis X. Open-ended: adjacent
 *  sections / the dome cap the exposed ends, so there are no internal walls to
 *  z-fight. `proud` (>1) lifts a colour band just off the surface. */
function tube(
  x0: number,
  x1: number,
  r: number,
  mat: THREE.Material,
  seg = 28,
): THREE.Mesh {
  const l = Math.abs(x1 - x0)
  const geo = new THREE.CylinderGeometry(r, r, l, seg, 1, true)
  geo.rotateZ(Math.PI / 2)
  geo.translate((x0 + x1) / 2, 0, 0)
  return new THREE.Mesh(geo, mat)
}

/** A single swept fin (root TE → root LE → tip LE → tip TE), lying in the X–Y
 *  plane with its root at radius `mount` and span outward along +Y, extruded a
 *  hair in Z. +X is the nose direction, so +X is the leading edge. */
function finShape(mount: number, cRoot: number, span: number, sweepLE: number, tipInset: number): THREE.Shape {
  const s = new THREE.Shape()
  s.moveTo(-cRoot * 0.5, mount) // root trailing
  s.lineTo(cRoot * 0.5, mount) // root leading
  s.lineTo(cRoot * 0.5 - sweepLE, mount + span) // tip leading (raked back)
  s.lineTo(-cRoot * 0.5 + tipInset, mount + span) // tip trailing
  s.closePath()
  return s
}

function finMesh(shape: THREE.Shape, thick: number, mat: THREE.Material): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false })
  geo.translate(0, 0, -thick / 2) // centre thickness on the fin's mid-plane
  return new THREE.Mesh(geo, mat)
}

export function buildAIM9(len: number, rad: number): THREE.Group {
  const g = new THREE.Group()
  const m = materials()
  const H = len / 2

  // Section boundaries along X (fractions of len from the tail at −H).
  const x = (t: number) => -H + t * len
  const gcsBack = x(0.775) // warhead/GCS seam
  const gcsFront = x(0.945) // GCS/seeker seam
  const domeLen = len * 0.062

  // --- Body sections ---------------------------------------------------------
  g.add(tube(-H, gcsBack, rad, m.body)) // warhead + rocket motor (light grey)
  g.add(tube(gcsBack, gcsFront, rad, m.gcs)) // Guidance & Control Section (dark)

  // Colour belts, lifted a hair proud of the skin.
  const belt = (cx: number, w: number, mat: THREE.Material) =>
    g.add(tube(cx - w / 2, cx + w / 2, rad * 1.004, mat))
  belt(x(0.34), len * 0.03, m.brown) // live rocket-motor band
  belt(x(0.7), len * 0.028, m.yellow) // live-warhead band

  // Section-joint rings.
  g.add(tube(gcsBack - len * 0.008, gcsBack + len * 0.008, rad * 1.02, m.brass))
  g.add(tube(gcsFront - len * 0.01, gcsFront, rad * 1.02, m.chrome)) // seeker retainer

  // --- Seeker dome (rounded IR glass cap, lathe of revolution about X) --------
  const prof: [number, number][] = [
    [1.0, 0.0], [0.985, 0.16], [0.94, 0.34], [0.86, 0.52],
    [0.74, 0.68], [0.58, 0.82], [0.36, 0.93], [0.0, 1.0],
  ]
  const domeGeo = new THREE.LatheGeometry(
    prof.map(([r, h]) => new THREE.Vector2(r * rad, h * domeLen)),
    28,
  )
  domeGeo.rotateZ(-Math.PI / 2) // height → +X, revolve about X
  domeGeo.translate(gcsFront, 0, 0)
  g.add(new THREE.Mesh(domeGeo, m.glass))

  // --- Tail nozzle recess -----------------------------------------------------
  const nozzle = new THREE.Mesh(new THREE.CircleGeometry(rad * 0.82, 24), m.nozzle)
  nozzle.rotation.y = -Math.PI / 2 // face −X (aft)
  nozzle.position.x = -H + len * 0.004
  g.add(nozzle)

  // --- Forward canards: 4 swept control fins on the GCS -----------------------
  const canardShape = finShape(rad, len * 0.14, rad * 2.5, len * 0.14 * 0.62, len * 0.14 * 0.06)
  const canardX = x(0.86)
  for (let i = 0; i < 4; i++) {
    const f = finMesh(canardShape, rad * 0.05, m.canard)
    f.position.x = canardX
    f.rotation.x = (i * Math.PI) / 2 + Math.PI / 4 // '×' roll, offset from the tail's '+'
    g.add(f)
  }

  // --- Rear fins: 4 flat fixed fins (the big ones) — the AIM-9's tail fins are
  //     broad, span > the canards. Plain flat surfaces (no rollerons).
  const tailC = len * 0.15
  const tailSpan = rad * 3.35
  const tailShape = finShape(rad, tailC, tailSpan, tailC * 0.42, tailC * 0.05)
  const tailX = x(0.1)
  for (let i = 0; i < 4; i++) {
    const fin = finMesh(tailShape, rad * 0.06, m.tail)
    fin.position.x = tailX
    fin.rotation.x = (i * Math.PI) / 2
    g.add(fin)
  }

  return g
}
