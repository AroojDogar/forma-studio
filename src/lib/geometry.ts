// Procedural sneaker. Every part is generated from the same parametric "last"
// (the foot-shaped form shoemakers build around), so overlays sit exactly on the
// upper and every part can be colored on its own.
//
// Coordinates: x runs along the shoe (toe at +x), y is up, z is across.
// t is the position along the shoe: 0 = toe tip, 1 = heel back.
// theta goes around the upper: 0 = +z side at the sole, PI/2 = top, PI = -z side.

import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const LENGTH = 3.2;
const OUTSOLE = 0.075;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

// Monotone cubic interpolation (Fritsch–Carlson) so profiles are smooth without overshoot.
function monotone(points: [number, number][]) {
  const n = points.length;
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m.push(d[0]);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(d[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

const widthProfile = monotone([
  [0, 0.5],
  [0.18, 0.555],
  [0.32, 0.545],
  [0.5, 0.455],
  [0.68, 0.42],
  [0.85, 0.44],
  [1, 0.43],
]);

const heightProfile = monotone([
  [0, 0.3],
  [0.12, 0.37],
  [0.28, 0.55],
  [0.42, 0.78],
  [0.58, 0.95],
  [0.75, 1.0],
  [0.9, 0.98],
  [1, 0.97],
]);

// Half-angle of the opening on top (lace gap + collar opening).
const openingProfile = monotone([
  [0, 0],
  [0.33, 0],
  [0.41, 0.16],
  [0.6, 0.2],
  [0.69, 0.45],
  [0.8, 0.93],
  [0.9, 0.86],
  [1, 0.64],
]);

export const opening = (t: number) => Math.max(0, openingProfile(t));

const midsoleThickness = (t: number) => 0.14 + 0.16 * smoothstep(0.22, 0.95, t);
export const soleTop = (t: number) => OUTSOLE + midsoleThickness(t);

const xOf = (t: number) => LENGTH / 2 - t * LENGTH;
export const tOf = (x: number) => clamp((LENGTH / 2 - x) / LENGTH, 0, 1);

function endRounding(t: number) {
  const dToe = t * LENGTH;
  const dHeel = (1 - t) * LENGTH;
  const rt = 0.55;
  const rh = 0.45;
  const eT = dToe < rt ? Math.sqrt(Math.max(0, 1 - (1 - dToe / rt) ** 2)) : 1;
  const eH = dHeel < rh ? Math.sqrt(Math.max(0, 1 - (1 - dHeel / rh) ** 2)) : 1;
  return { eT, eH };
}

export function halfWidth(t: number) {
  const { eT, eH } = endRounding(t);
  return widthProfile(t) * eT * eH;
}

function height(t: number) {
  const { eT } = endRounding(t);
  return heightProfile(t) * Math.pow(eT, 0.55);
}

// Toe spring: the front of a sneaker curves up off the ground.
export function bendY(x: number, y: number) {
  const s = clamp((x - (LENGTH / 2 - 1.25)) / 1.25, 0, 1);
  const h = clamp((-x - (LENGTH / 2 - 0.5)) / 0.5, 0, 1);
  return y + 0.24 * s * s + 0.03 * h * h;
}

const fz = (th: number) => {
  const c = Math.cos(th);
  return Math.sign(c) * Math.pow(Math.abs(c), 0.75);
};
const fy = (th: number) => Math.pow(Math.max(0, Math.sin(th)), 0.85);

/** A point on the last surface, pushed outwards by `inflate`. Already bent. */
export function lastPoint(t: number, th: number, inflate = 0, target = new THREE.Vector3()) {
  // Near the toe and heel the surface faces along x, so the offset moves there.
  const { eT, eH } = endRounding(t);
  const side = eT * eH;
  const hw = halfWidth(t) + inflate * side;
  const h = height(t) + inflate;
  const base = soleTop(t) - 0.035;
  let x = xOf(t);
  x += t < 0.5 ? inflate * (1 - eT) : -inflate * (1 - eH);
  const y = base + h * fy(th);
  const z = hw * fz(th);
  return target.set(x, bendY(x, y), z);
}

/** Outward normal of the last surface (finite differences). */
export function lastNormal(t: number, th: number) {
  const e = 0.002;
  const p = lastPoint(t, th);
  const pt = lastPoint(Math.min(1, t + e), th).sub(lastPoint(Math.max(0, t - e), th));
  const pth = lastPoint(t, th + e).sub(lastPoint(t, th - e));
  const n = new THREE.Vector3().crossVectors(pth, pt).normalize();
  const radial = new THREE.Vector3(0, p.y - (soleTop(t) + 0.2), p.z);
  if (n.dot(radial) < 0) n.negate();
  return n;
}

// ---------- generic surface builder ----------

type Fn = (s: number, v: number, out: THREE.Vector3) => THREE.Vector3;

function gridGeometry(
  nu: number,
  nv: number,
  fn: Fn,
  uvScale: [number, number],
  skipQuad?: (i: number, j: number) => boolean,
) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  for (let i = 0; i <= nu; i++) {
    for (let j = 0; j <= nv; j++) {
      const s = i / nu;
      const v = j / nv;
      fn(s, v, p);
      pos.push(p.x, p.y, p.z);
      uv.push(s * uvScale[0], v * uvScale[1]);
    }
  }
  const row = nv + 1;
  for (let i = 0; i < nu; i++) {
    for (let j = 0; j < nv; j++) {
      if (skipQuad?.(i, j)) continue;
      const a = i * row + j;
      const b = (i + 1) * row + j;
      const c = (i + 1) * row + j + 1;
      const d = i * row + j + 1;
      idx.push(a, b, d, b, c, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  orientOutward(g);
  return g;
}

/** Flip triangle winding if normals point into the shoe. */
function orientOutward(g: THREE.BufferGeometry) {
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  let score = 0;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const cy = soleTop(tOf(x)) + 0.25;
    score += nor.getY(i) * (pos.getY(i) - cy) + nor.getZ(i) * pos.getZ(i);
  }
  if (score < 0) {
    const index = g.getIndex()!;
    const arr = index.array as Uint16Array | Uint32Array;
    for (let i = 0; i < arr.length; i += 3) {
      const tmp = arr[i + 1];
      arr[i + 1] = arr[i + 2];
      arr[i + 2] = tmp;
    }
    index.needsUpdate = true;
    g.computeVertexNormals();
  }
}


/** Average normals of vertices that share a position, hiding seams where patches meet. */
function weldNormals(g: THREE.BufferGeometry) {
  const pos = g.getAttribute("position");
  const nor = g.getAttribute("normal");
  const groups = new Map<string, number[]>();
  const q = (v: number) => Math.round(v * 2000);
  for (let i = 0; i < pos.count; i++) {
    const key = `${q(pos.getX(i))},${q(pos.getY(i))},${q(pos.getZ(i))}`;
    const list = groups.get(key);
    if (list) list.push(i);
    else groups.set(key, [i]);
  }
  const n = new THREE.Vector3();
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    n.set(0, 0, 0);
    for (const i of list) n.add(new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)));
    n.normalize();
    for (const i of list) nor.setXYZ(i, n.x, n.y, n.z);
  }
  nor.needsUpdate = true;
  return g;
}

function mergeGeometries(list: THREE.BufferGeometry[]) {
  let total = 0;
  let totalIdx = 0;
  for (const g of list) {
    total += g.getAttribute("position").count;
    totalIdx += g.getIndex()!.count;
  }
  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const uv = new Float32Array(total * 2);
  const idx = new Uint32Array(totalIdx);
  let o = 0;
  let oi = 0;
  for (const g of list) {
    const p = g.getAttribute("position");
    pos.set(p.array as Float32Array, o * 3);
    nor.set(g.getAttribute("normal").array as Float32Array, o * 3);
    uv.set(g.getAttribute("uv").array as Float32Array, o * 2);
    const gi = g.getIndex()!.array;
    for (let k = 0; k < gi.length; k++) idx[oi + k] = gi[k] + o;
    o += p.count;
    oi += gi.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  out.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// ---------- parts ----------

/** The main upper shell with the lace gap and collar opening cut out. */
function upperShell(inflate: number) {
  const nu = 180;
  const half = 36;
  const nv = half * 2 + 1;
  const ts: number[] = [];
  for (let i = 0; i <= nu; i++) ts.push(i / nu);
  const fn: Fn = (s, v, out) => {
    const t = s;
    const op = opening(t);
    const j = Math.round(v * nv);
    let th: number;
    if (j <= half) th = (j / half) * (Math.PI / 2 - op);
    else th = Math.PI / 2 + op + ((j - half - 1) / half) * (Math.PI / 2 - op);
    return lastPoint(t, th, inflate, out);
  };
  return gridGeometry(nu, nv, fn, [LENGTH, 2.6], (i, j) => {
    if (j !== half) return false;
    return opening(ts[i]) > 1e-4 || opening(ts[i + 1]) > 1e-4;
  });
}

/** A patch on one side of the last, mirrored to the other side. */
type PointFn = (t: number, th: number, inflate: number, out: THREE.Vector3) => THREE.Vector3;

function sidePatch(
  nu: number,
  nv: number,
  map: (s: number, v: number) => [number, number],
  inflate: number,
  uvScale: [number, number],
  point: PointFn = lastPoint,
) {
  const left = gridGeometry(
    nu,
    nv,
    (s, v, out) => {
      const [t, th] = map(s, v);
      return point(t, th, inflate, out);
    },
    uvScale,
  );
  const right = gridGeometry(
    nu,
    nv,
    (s, v, out) => {
      const [t, th] = map(s, v);
      const p = point(t, th, inflate, out);
      p.z = -p.z;
      return p;
    },
    uvScale,
  );
  return weldNormals(mergeGeometries([left, right]));
}

function toeCap() {
  // Wraps the whole front. The back edge dips lower on the sides.
  return gridGeometry(
    60,
    72,
    (s, v, out) => {
      const th = v * Math.PI;
      const edge = 0.15 + 0.06 * Math.pow(Math.sin(th), 2);
      return lastPoint(s * edge, th, 0.014, out);
    },
    [0.8, 2.2],
  );
}

function sideStripe() {
  return sidePatch(
    90,
    16,
    (s, v) => {
      const t = lerp(0.27, 0.86, s);
      const center = 0.13 + 0.42 * Math.pow(s, 1.25);
      const halfW = 0.025 + 0.1 * Math.pow(s, 0.7);
      let th = center + (v - 0.5) * 2 * halfW;
      th = Math.min(th, Math.PI / 2 - opening(t) - 0.05);
      return [t, Math.max(0.04, th)];
    },
    0.02,
    [1.9, 0.5],
  );
}

function heelCounter() {
  return sidePatch(
    40,
    40,
    (s, v) => {
      const top = (t: number) => Math.PI / 2 - opening(t) - 0.012;
      const t0 = lerp(0.74, 0.86, v);
      const t = lerp(t0, 1, s);
      return [t, v * top(t)];
    },
    0.016,
    [0.8, 1.2],
  );
}

function tongue() {
  const t0 = 0.33;
  const t1 = 0.77;
  return gridGeometry(
    70,
    30,
    (s, v, out) => {
      const t = lerp(t0, t1, s);
      const halfA = Math.min(1.25, opening(t) + 0.2);
      const th = Math.PI / 2 + (v - 0.5) * 2 * halfA;
      const lift = 0.2 * Math.pow(smoothstep(0.55, 0.77, t), 1.3);
      const base = soleTop(t) - 0.035;
      const hw = halfWidth(t) * lerp(0.95, 0.75, smoothstep(0.6, 0.77, t));
      const h = height(t) - 0.012 + lift;
      const x = xOf(t) - lift * 0.35;
      const y = base + h * fy(th);
      return out.set(x, bendY(x, y), hw * fz(th));
    },
    [1.4, 0.8],
  );
}

function tube(points: THREE.Vector3[], radius: number, closed = false, segs = 64) {
  const curve = new THREE.CatmullRomCurve3(points, closed, "centripetal");
  return new THREE.TubeGeometry(curve, segs, radius, 10, closed);
}

function tongueTopEdge() {
  const pts: THREE.Vector3[] = [];
  const t = 0.77;
  const halfA = Math.min(1.25, opening(t) + 0.2);
  const lift = 0.2;
  const base = soleTop(t) - 0.035;
  const hw = halfWidth(t) * 0.75;
  const h = height(t) - 0.012 + lift;
  for (let k = 0; k <= 24; k++) {
    const th = Math.PI / 2 + (k / 24 - 0.5) * 2 * halfA;
    const x = xOf(t) - lift * 0.35;
    const y = base + h * fy(th);
    pts.push(new THREE.Vector3(x, bendY(x, y), hw * fz(th)));
  }
  return tube(pts, 0.03, false, 48);
}

function collar() {
  const pts: THREE.Vector3[] = [];
  const n = 26;
  for (let k = 0; k <= n; k++) {
    const t = lerp(0.685, 1, k / n);
    pts.push(lastPoint(t, Math.PI / 2 - opening(t), 0.004));
  }
  for (let k = n - 1; k >= 0; k--) {
    const t = lerp(0.685, 1, k / n);
    pts.push(lastPoint(t, Math.PI / 2 + opening(t), 0.004));
  }
  return tube(pts, 0.032, false, 160);
}

const EYELET_T = [0.39, 0.445, 0.5, 0.555, 0.61, 0.665];
const eyeletTheta = (t: number) => Math.PI / 2 - opening(t) - 0.11;

function lacePath(tA: number, thA: number, tB: number, thB: number) {
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= 8; k++) {
    const f = k / 8;
    const t = lerp(tA, tB, f);
    const th = lerp(thA, thB, f);
    const inf = 0.014 + 0.022 * Math.sin(Math.PI * f);
    pts.push(lastPoint(t, th, inf));
  }
  return pts;
}

function laces() {
  const geos: THREE.BufferGeometry[] = [];
  const L = (t: number) => eyeletTheta(t);
  const R = (t: number) => Math.PI - eyeletTheta(t);
  // straight bar at the bottom
  geos.push(tube(lacePath(EYELET_T[0], L(EYELET_T[0]), EYELET_T[0], R(EYELET_T[0])), 0.021));
  for (let k = 0; k < EYELET_T.length - 1; k++) {
    const a = EYELET_T[k];
    const b = EYELET_T[k + 1];
    geos.push(tube(lacePath(a, L(a), b, R(b)), 0.021));
    geos.push(tube(lacePath(a, R(a), b, L(b)), 0.021));
  }
  // bow at the top
  const tTop = EYELET_T[EYELET_T.length - 1];
  const knot = lastPoint(tTop + 0.01, Math.PI / 2, 0.05);
  const n = lastNormal(tTop, Math.PI / 2);
  const side = new THREE.Vector3(0, 0, 1);
  const back = new THREE.Vector3(-1, 0, 0);
  const at = (a: number, b: number, c: number) =>
    knot.clone().addScaledVector(side, a).addScaledVector(n, b).addScaledVector(back, c);
  for (const dir of [1, -1]) {
    // loop resting forward over the laces
    geos.push(
      tube(
        [at(0, 0, 0), at(0.08 * dir, 0.035, -0.03), at(0.2 * dir, 0.03, -0.1), at(0.25 * dir, -0.005, -0.04), at(0.16 * dir, 0.005, 0.02), at(0.04 * dir, 0, 0.01)],
        0.019,
        false,
        48,
      ),
    );
    // loose end falling toward the side
    geos.push(
      tube(
        [at(0, 0, 0), at(0.07 * dir, 0.01, 0.06), at(0.15 * dir, -0.04, 0.12), at(0.2 * dir, -0.13, 0.15)],
        0.019,
        false,
        32,
      ),
    );
  }
  geos.push(new THREE.SphereGeometry(0.034, 16, 12).translate(knot.x, knot.y, knot.z));
  return mergeAny(geos);
}

function eyelets() {
  const geos: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 0, 1);
  for (const t of EYELET_T) {
    for (const mirror of [false, true]) {
      const th = mirror ? Math.PI - eyeletTheta(t) : eyeletTheta(t);
      const p = lastPoint(t, th, 0.014);
      const nrm = lastNormal(t, th);
      const g = new THREE.TorusGeometry(0.03, 0.01, 8, 20);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, nrm));
      g.translate(p.x, p.y, p.z);
      geos.push(g);
    }
  }
  return mergeAny(geos);
}

function pullTab() {
  // A fin that follows the heel curve and rises above the collar.
  return sidePatch(
    14,
    10,
    (s, v) => [lerp(0.935, 1, s), v],
    0.024,
    [0.3, 0.3],
    (t, th, inflate, out) => {
      const top = Math.PI / 2 - opening(t);
      lastPoint(t, top - 0.18 + 0.18 * th, inflate, out);
      const d = (1 - t) / 0.065;
      const rise = 0.13 * Math.sqrt(Math.max(0, 1 - d * d));
      out.y += rise * th;
      out.x -= 0.025 * th * th;
      return out;
    },
  );
}

/** Simple merge for non-indexed or mixed geometries (position/normal/uv only). */
function mergeAny(list: THREE.BufferGeometry[]) {
  const indexed = list.map((g) => {
    const gg = g.index ? g : (() => {
      const count = g.getAttribute("position").count;
      g.setIndex([...Array(count).keys()]);
      return g;
    })();
    if (!gg.getAttribute("uv")) {
      gg.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(gg.getAttribute("position").count * 2), 2));
    }
    return gg;
  });
  return mergeGeometries(indexed);
}

// ---------- soles ----------

function footprint(margin: number) {
  const pts: THREE.Vector2[] = [];
  const n = 120;
  const sample = (k: number) => {
    // denser near the ends
    const u = k / n;
    return 0.5 - 0.5 * Math.cos(Math.PI * u);
  };
  const raw: THREE.Vector2[] = [];
  for (let k = 0; k <= n; k++) {
    const t = sample(k);
    raw.push(new THREE.Vector2(xOf(t), halfWidth(t)));
  }
  for (let k = n - 1; k >= 1; k--) {
    const t = sample(k);
    raw.push(new THREE.Vector2(xOf(t), -halfWidth(t)));
  }
  // offset outward along the 2D normal
  const m = raw.length;
  for (let i = 0; i < m; i++) {
    const a = raw[(i - 1 + m) % m];
    const b = raw[(i + 1) % m];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    // outline runs toe→heel on +z then back on -z: outward normal is (ty, -tx) rotated
    let nx = ty / len;
    let ny = -tx / len;
    const c = raw[i];
    if (nx * c.x + ny * c.y < 0) {
      nx = -nx;
      ny = -ny;
    }
    pts.push(new THREE.Vector2(c.x + nx * margin, c.y + ny * margin));
  }
  return pts;
}

function soleSlab(margin: number, bevel: number, bottom: number, topAt: (t: number) => number) {
  const pts = footprint(margin);
  // Shape y = -z so rotateX(-PI/2) lands it in world space with correct winding.
  const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, -p.y)));
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 1,
  });
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    let y = p.getY(i);
    const t = tOf(x);
    if (y > 0.5) y = topAt(t) - (1 + bevel - y);
    else y = bottom + (y + bevel);
    p.setY(i, bendY(x, y));
  }
  g.clearGroups();
  g.deleteAttribute("normal");
  const merged = mergeVertices(g, 1e-5);
  merged.computeVertexNormals();
  return merged;
}

function insole() {
  const pts = footprint(-0.03);
  const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x, -p.y)));
  const g = new THREE.ShapeGeometry(shape, 1);
  g.rotateX(-Math.PI / 2);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setY(i, bendY(x, soleTop(tOf(x)) + 0.008));
  }
  g.computeVertexNormals();
  return g;
}

export type SneakerGeometry = {
  upper: THREE.BufferGeometry;
  lining: THREE.BufferGeometry;
  collar: THREE.BufferGeometry;
  insole: THREE.BufferGeometry;
  toe: THREE.BufferGeometry;
  stripe: THREE.BufferGeometry;
  heel: THREE.BufferGeometry;
  pullTab: THREE.BufferGeometry;
  tongue: THREE.BufferGeometry;
  tongueEdge: THREE.BufferGeometry;
  laces: THREE.BufferGeometry;
  eyelets: THREE.BufferGeometry;
  midsole: THREE.BufferGeometry;
  outsole: THREE.BufferGeometry;
};

export function buildSneaker(): SneakerGeometry {
  return {
    upper: weldNormals(upperShell(0)),
    lining: weldNormals(upperShell(-0.014)),
    collar: collar(),
    insole: insole(),
    toe: weldNormals(toeCap()),
    stripe: sideStripe(),
    heel: heelCounter(),
    pullTab: pullTab(),
    tongue: tongue(),
    tongueEdge: tongueTopEdge(),
    laces: laces(),
    eyelets: eyelets(),
    midsole: soleSlab(0.04, 0.035, OUTSOLE - 0.005, (t) => soleTop(t)),
    outsole: soleSlab(0.032, 0.014, 0, () => OUTSOLE),
  };
}

/** Where the initials go: outer heel, facing +z. */
export function initialsAnchor() {
  const t = 0.885;
  const th = 0.36;
  return { position: lastPoint(t, th, 0.016), normal: lastNormal(t, th) };
}
