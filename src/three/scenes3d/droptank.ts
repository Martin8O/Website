/**
 * UNDERWING DROP TANK — a license-clean PROCEDURAL build (our OWN geometry, no
 * third-party asset). Nose +X, origin-centred, model units. The external fuel
 * tank hung on the L-159's inner pylons (ref: Draken International L-159E, the
 * G-DKNK / G-DKNA photos): a POINTED ogive nose, a full cylindrical belly, a
 * boat-tail tapering to a small base, and a shallow ventral fin.
 *
 * The finish is MATTE painted airframe grey — a fuel tank, never chrome — so
 * the seeker/gloss look of a missile does not leak onto it (roughness ~0.6).
 * The nose is drawn all the way to a POINT (the old lathe stopped blunt).
 *
 * `len` = overall length, `rad` = max body radius; every section derives from
 * them so the shape holds at any scale. Matches the buildAIM9 sibling so the
 * two stores share one attach convention (nose +X → the caller rotates it to
 * the airframe's −X nose).
 */
import * as THREE from 'three'

/** Airframe-grey matte skin — shared by the whole tank. */
function tankMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0xa7adb4, metalness: 0.16, roughness: 0.62 })
}

export function buildDropTank(len: number, rad: number): THREE.Group {
  const g = new THREE.Group()
  const mat = tankMaterial()
  const H = len / 2

  // Lathe profile along the length: [axial fraction 0(tail)…1(nose), radius
  // fraction]. Pointed ogive nose (r → 0 at the very tip), a long fat belly,
  // and a boat-tail closing to a small base. Douglas-smooth so the ogive reads.
  const prof: [number, number][] = [
    [0.00, 0.15], // tail base (small, capped below)
    [0.03, 0.34],
    [0.09, 0.60],
    [0.18, 0.83],
    [0.30, 0.97],
    [0.42, 1.00], // fat middle
    [0.60, 1.00],
    [0.72, 0.94],
    [0.83, 0.78],
    [0.91, 0.56],
    [0.965, 0.30],
    [1.00, 0.0], // sharp nose tip
  ]
  const pts = prof.map(([t, r]) => new THREE.Vector2(Math.max(r * rad, 1e-4), -H + t * len))
  const shell = new THREE.LatheGeometry(pts, 32)
  shell.rotateZ(-Math.PI / 2) // lathe height (Y) → +X, so the tip lands on +X (nose)
  g.add(new THREE.Mesh(shell, mat))

  // Cap the little tail base so the boat-tail isn't a hollow ring.
  const cap = new THREE.Mesh(new THREE.CircleGeometry(prof[0][1] * rad, 24), mat)
  cap.rotation.y = -Math.PI / 2 // face −X (aft)
  cap.position.x = -H
  g.add(cap)

  // Shallow ventral fin at the rear third — a thin swept triangle hanging just
  // below the belly (the real tank's little stabiliser). Lies in the X–Y plane.
  const fin = new THREE.Shape()
  const fx0 = -H + len * 0.30 // fin leading root
  const fx1 = -H + len * 0.06 // fin trailing root (toward the tail)
  fin.moveTo(fx0, -rad * 0.9)
  fin.lineTo(fx1, -rad * 0.9)
  fin.lineTo(fx1, -rad * 1.55) // trailing tip, dropped below the belly
  fin.lineTo(fx0 - len * 0.02, -rad * 1.0)
  fin.closePath()
  const finGeo = new THREE.ExtrudeGeometry(fin, { depth: rad * 0.08, bevelEnabled: false })
  finGeo.translate(0, 0, -rad * 0.04) // centre the thickness on the mid-plane
  g.add(new THREE.Mesh(finGeo, mat))

  return g
}
