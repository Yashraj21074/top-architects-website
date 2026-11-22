import * as THREE from 'three';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ease = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10); };   // smootherstep
const bump = (u) => { const s = Math.sin(Math.PI * clamp(u, 0, 1)); return s * s; };

/** Critically damped scalar (Unity-style SmoothDamp): no overshoot, frame-rate independent. */
class Damp {
  constructor(v = 0, time = 0.6) { this.v = v; this.vel = 0; this.time = time; }
  step(target, dt) {
    const w = 2 / this.time, x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    const ch = this.v - target, tmp = (this.vel + w * ch) * dt;
    this.vel = (this.vel - w * tmp) * e; this.v = target + (ch + tmp) * e; return this.v;
  }
}

const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);

/** Rotate `bone` about its own joint by a WORLD-space delta (keeps children's relative pose). */
function applyWorldDelta(bone, delta) {
  bone.parent.updateWorldMatrix(true, false);
  bone.parent.getWorldQuaternion(_q1);
  _q2.copy(_q1).invert();
  bone.quaternion.premultiply(_q1).premultiply(delta).premultiply(_q2);
  bone.updateMatrixWorld(true);
}
/** bone = rest, then rotated by (yaw, pitch, roll) expressed in the upright character frame. */
function setCharacterFrameDelta(bone, rest, rootQ, yaw, pitch, roll) {
  bone.parent.updateWorldMatrix(true, false);
  bone.parent.getWorldQuaternion(_q1);
  _e.set(pitch, yaw, roll, 'YXZ'); _q2.setFromEuler(_e);                   // in character frame
  _q2.premultiply(rootQ).multiply(_q3.copy(rootQ).invert());               // -> world frame
  bone.quaternion.copy(rest).premultiply(_q1).premultiply(_q2).premultiply(_q1.invert());
  bone.updateMatrixWorld(true);
}

/** Counter-top height + normal under (x,z), measured from the actual desk meshes (memoised). */
export class Surface {
  constructor(desk) {
    this.meshes = [];
    desk.updateMatrixWorld(true);
    desk.traverse((o) => {
      if (!o.isMesh) return;
      for (let a = o; a; a = a.parent) if (a.visible === false) return;       // skips the hidden alcove
      const b = new THREE.Box3().setFromObject(o);
      if (b.max.y > 0.85 && b.min.y < 0.95 && b.max.y < 1.2) this.meshes.push(o);   // counter-top meshes only
    });
    this.rc = new THREE.Raycaster(); this.down = new THREE.Vector3(0, -1, 0); this.cache = new Map();
  }
  at(x, z) {
    const key = Math.round(x * 100) + ',' + Math.round(z * 100);
    let r = this.cache.get(key); if (r) return r;
    this.rc.set(_v1.set(x, 2, z), this.down);
    const hit = this.rc.intersectObjects(this.meshes, false)[0];
    if (hit) {
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld); if (n.y < 0) n.negate();
      r = { y: hit.point.y, n, open: false };
    } else r = { y: -Infinity, n: new THREE.Vector3(0, 1, 0), open: true };        // seating well: nothing to rest on
    this.cache.set(key, r); return r;
  }
}

// ---------------------------------------------------------------------------------------------------------
// Hands-on-desk poses. x,z are WORLD coordinates of the wrist on the counter (character-left = +x, facing +z).
// `inward` turns the fingers toward the centre line (deg). `curl` = 'flat' | 'soft'.
// ---------------------------------------------------------------------------------------------------------
const POSES = {
  rest:      { L: { x: 0.26, z: -0.03, inward: 4, curl: 'soft' },   R: { x: -0.26, z: -0.03, inward: 4, curl: 'soft' } },
  spread:    { L: { x: 0.29, z: -0.05, inward: 2, curl: 'flat' },   R: { x: -0.29, z: -0.05, inward: 2, curl: 'flat' } },
  rightOnly: { L: { x: 0.30, z: -0.02, inward: 4, curl: 'flat' },   R: { x: -0.25, z: -0.04, inward: 8, curl: 'soft' } },
  leftOnly:  { L: { x: 0.25, z: -0.04, inward: 8, curl: 'soft' },   R: { x: -0.30, z: -0.02, inward: 4, curl: 'flat' } },
  // laptop work: wrists on the palm rest, fingers hovering over the keys (typing animation adds the key strokes)
  typing:    { L: { x: 0.075, z: -0.09, inward: 3, curl: 'type', lift: 0.022, typing: true }, R: { x: -0.075, z: -0.09, inward: 3, curl: 'type', lift: 0.022, typing: true } },
  mouse:     { L: { x: 0.085, z: -0.09, inward: 3, curl: 'type', lift: 0.022, typing: true }, R: { x: -0.40, z: -0.07, inward: 0, curl: 'soft', lift: 0.026 } },
};
const CURL = {                                 // joint flexion (deg) for the three finger joints
  flat: [-4, -4, -2], soft: [-1, 0, 0], type: [-4, -6, -3],
};
const FINGER_SCALE = { Index: 0.8, Middle: 1.0, Ring: 1.12, Pinky: 1.3, Thumb: 0.45 };
const GRAPH = Object.keys(POSES);
const AUTO = ['rest', 'spread', 'rightOnly', 'leftOnly'];      // calm poses chosen at random while the visitor is being attended to

class Arm {
  constructor(rig, side, root) {
    const L = side === 'left' ? 'Left' : 'Right';
    this.side = side; this.S = side === 'left' ? 1 : -1;
    this.arm = rig[side + 'Arm']; this.fore = rig[side + 'ForeArm']; this.hand = rig[side + 'Hand']; this.shoulder = rig[side + 'Shoulder'];
    this.rest = new Map(); for (const b of [this.arm, this.fore, this.hand]) this.rest.set(b, b.quaternion.clone());
    this.fingers = {};
    for (const name of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) {
      const chain = [1, 2, 3, 4].map((i) => rig.allBones.find((b) => new RegExp(`^${L}Hand${name}${i}(_\\d+)?$`).test(b.name)));
      if (chain.every(Boolean)) { this.fingers[name] = { bones: chain, axis: new THREE.Vector3(1, 0, 0) }; chain.forEach((b) => this.rest.set(b, b.quaternion.clone())); }
    }
    root.updateMatrixWorld(true);
    const A = this.arm.getWorldPosition(new THREE.Vector3()), B = this.fore.getWorldPosition(new THREE.Vector3()), C = this.hand.getWorldPosition(new THREE.Vector3());
    this.l1 = A.distanceTo(B); this.l2 = B.distanceTo(C);
    this._calibrateHand();
    this._calibrateFingers();
    this.swivel = {}; this.valid = {}; this.cur = null;
  }

  /** Palm frame (finger direction + palm normal) in the hand bone's local space, from the real bone positions. */
  _calibrateHand() {
    const f = this.fingers; if (!f.Middle || !f.Index || !f.Pinky) { this.palm = null; return; }
    const hp = this.hand.getWorldPosition(new THREE.Vector3());
    const fW = f.Middle.bones[0].getWorldPosition(new THREE.Vector3()).sub(hp).normalize();
    const uW = f.Index.bones[0].getWorldPosition(new THREE.Vector3()).sub(f.Pinky.bones[0].getWorldPosition(new THREE.Vector3())).normalize();
    const nW = new THREE.Vector3().crossVectors(fW, uW).normalize();
    if (nW.x * this.S > 0) nW.negate();                                   // at the seated rest the palm faces the body (inward)
    const hq = this.hand.getWorldQuaternion(new THREE.Quaternion()).invert();
    const fl = fW.clone().applyQuaternion(hq).normalize();
    const nl = nW.clone().applyQuaternion(hq); nl.addScaledVector(fl, -nl.dot(fl)).normalize();
    this.palm = { fl, nl, nW0: nW.clone() };
  }

  /** Find, by experiment on the real skeleton, which local axis curls each finger toward the palm. */
  _calibrateFingers() {
    if (!this.palm) return;
    const nW = this.palm.nW0, cands = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0)];
    for (const name in this.fingers) {
      const { bones } = this.fingers[name], b1 = bones[0], tip = bones[3], rest = this.rest.get(b1);
      this.hand.updateWorldMatrix(true, true);
      const p0 = tip.getWorldPosition(new THREE.Vector3());
      let best = -Infinity, bestAxis = cands[0];
      for (const ax of cands) {
        b1.quaternion.copy(rest).multiply(_q1.setFromAxisAngle(ax, 20 * DEG)); b1.updateMatrixWorld(true);
        const s = tip.getWorldPosition(_v1).sub(p0).dot(nW);
        if (s > best) { best = s; bestAxis = ax; }
      }
      b1.quaternion.copy(rest); b1.updateMatrixWorld(true);
      this.fingers[name].axis = bestAxis.clone();
    }
  }

  setFingers(curl, k = 1) {
    const c = CURL[curl] || CURL.soft;
    for (const name in this.fingers) {
      const { bones, axis } = this.fingers[name], s = (FINGER_SCALE[name] ?? 1) * k;
      for (let j = 0; j < 3; j++) bones[j].quaternion.copy(this.rest.get(bones[j])).multiply(_q1.setFromAxisAngle(axis, c[j] * s * DEG));
    }
    this._thumb();
  }
  _thumb() { const t = this.fingers.Thumb; if (t && this.thumbQ) for (let j = 0; j < 3; j++) t.bones[j].quaternion.multiply(this.thumbQ[j]); }
  /** Fractional finger curl between two named states. */
  setFingersMix(a, b, u, typeW = 0, t = 0) {
    const ca = CURL[a] || CURL.soft, cb = CURL[b] || CURL.soft;
    for (const name in this.fingers) {
      const { bones, axis } = this.fingers[name], s = FINGER_SCALE[name] ?? 1;
      for (let j = 0; j < 3; j++) bones[j].quaternion.copy(this.rest.get(bones[j])).multiply(_q1.setFromAxisAngle(axis, (ca[j] + (cb[j] - ca[j]) * u) * s * DEG));
    }
    if (typeW > 0.001) {                                 // keystrokes: bursts of quick, small, per-finger presses
      const burst = clamp(0.5 + 1.2 * Math.sin(t * 0.55 + (this.S > 0 ? 0 : 1.7)) + 0.4 * Math.sin(t * 1.7), 0, 1);
      let i = 0;
      for (const name of ['Index', 'Middle', 'Ring', 'Pinky']) {
        const f = this.fingers[name]; i++; if (!f) continue;
        const pulse = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2 * (1.9 + 0.43 * i) + i * 2.1 + this.S)), 2) * burst * typeW;
        const ang = [7, 10, 5];
        for (let j = 0; j < 3; j++) f.bones[j].quaternion.multiply(_q1.setFromAxisAngle(f.axis, ang[j] * pulse * DEG));
      }
    }
    this._thumb();
  }
  /** Thumb hangs below the palm plane on this rig; find (on the real skeleton) the smallest lift that clears the counter. */
  calibrateThumb(surface) {
    const t = this.fingers.Thumb; if (!t) return;
    const dirs = [[1,0,0],[-1,0,0],[0,0,1],[0,0,-1],[0,1,0],[0,-1,0]].map((a) => new THREE.Vector3(...a));
    const clear = () => { let m = 9; for (const b of t.bones) { const v = b.getWorldPosition(new THREE.Vector3()), r = surface.at(v.x, v.z); if (!r.open) m = Math.min(m, v.y - r.y); } return m; };
    let best = null;
    for (let ang = 0; ang <= 90 && !best; ang += 6) for (const ax of dirs) for (const f2 of [0, 0.6]) {
      this.thumbQ = [new THREE.Quaternion().setFromAxisAngle(ax, ang * DEG), new THREE.Quaternion().setFromAxisAngle(ax, ang * f2 * DEG), new THREE.Quaternion()];
      this.setFingersMix('soft', 'soft', 0); this.hand.updateMatrixWorld(true);
      if (clear() >= 0.006 && (!best || ang < best.ang)) { best = { ang, q: this.thumbQ }; }
    }
    this.thumbQ = best ? best.q : null; this.thumbAng = best ? best.ang : -1;
  }

  /** Elbow position for wrist target T given a swivel angle about the shoulder->wrist axis. Returns null when out of reach. */
  elbowFor(A, T, swivel, out) {
    const d = _v2.subVectors(T, A); let dist = d.length();
    const maxR = this.l1 + this.l2 - 0.004, minR = Math.abs(this.l1 - this.l2) + 0.02;
    dist = clamp(dist, minR, maxR); d.normalize();
    const a = (this.l1 * this.l1 - this.l2 * this.l2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, this.l1 * this.l1 - a * a));
    const pole = _v3.set(this.S * 0.75, -1, -0.45);                       // elbow wants to hang out, down and slightly back
    pole.addScaledVector(d, -pole.dot(d)).normalize().applyAxisAngle(d, swivel);
    out.copy(A).addScaledVector(d, a).addScaledVector(pole, h);
    this.reachT = dist; this.reachClamped = (T.distanceTo(A) > maxR);
    return out;
  }

  /** Pose the whole arm so the wrist sits at T with the palm flat on a surface of normal n, fingers heading fd. */
  solve(T, swivel, n, fd) {
    const { arm, fore, hand } = this;
    arm.quaternion.copy(this.rest.get(arm)); fore.quaternion.copy(this.rest.get(fore)); hand.quaternion.copy(this.rest.get(hand));
    arm.updateWorldMatrix(true, true);
    const A = arm.getWorldPosition(new THREE.Vector3()), B = fore.getWorldPosition(new THREE.Vector3());
    const E = this.elbowFor(A, T, swivel, new THREE.Vector3());
    applyWorldDelta(arm, new THREE.Quaternion().setFromUnitVectors(B.sub(A).normalize(), E.clone().sub(A).normalize()));
    const B2 = fore.getWorldPosition(new THREE.Vector3()), C = hand.getWorldPosition(new THREE.Vector3());
    const Tc = A.clone().addScaledVector(T.clone().sub(A).normalize(), Math.min(A.distanceTo(T), this.l1 + this.l2 - 0.004));
    const axis = Tc.clone().sub(B2).normalize();
    applyWorldDelta(fore, new THREE.Quaternion().setFromUnitVectors(C.sub(B2).normalize(), axis));
    if (this.palm) {
      // share the pronation between forearm and wrist so neither candy-wraps
      const nd = n.clone().negate();
      const nCur = this.palm.nl.clone().applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion()));
      const p1 = nCur.addScaledVector(axis, -nCur.dot(axis)).normalize(), p2 = nd.clone().addScaledVector(axis, -nd.dot(axis)).normalize();
      let ang = Math.acos(clamp(p1.dot(p2), -1, 1)); if (new THREE.Vector3().crossVectors(p1, p2).dot(axis) < 0) ang = -ang;
      applyWorldDelta(fore, new THREE.Quaternion().setFromAxisAngle(axis, ang * 0.55));
      // absolute hand orientation: finger direction -> fd, palm normal -> -n
      const f = fd.clone().addScaledVector(nd, -fd.dot(nd)).normalize();
      const Mt = new THREE.Matrix4().makeBasis(f, nd, new THREE.Vector3().crossVectors(f, nd));
      const Ml = new THREE.Matrix4().makeBasis(this.palm.fl, this.palm.nl, new THREE.Vector3().crossVectors(this.palm.fl, this.palm.nl));
      const qT = new THREE.Quaternion().setFromRotationMatrix(Mt), qL = new THREE.Quaternion().setFromRotationMatrix(Ml);
      const qW = qT.multiply(qL.invert());
      hand.parent.updateWorldMatrix(true, false);
      const qp = hand.parent.getWorldQuaternion(new THREE.Quaternion());
      hand.quaternion.copy(qW).premultiply(qp.invert());
      hand.updateMatrixWorld(true);
    }
    return E;
  }
}

export class BodyMotion {
  constructor({ rig, root, desk, tracker, cfg, reducedMotion = false }) {
    this.reduced = reducedMotion;
    this.rig = rig; this.root = root; this.tracker = tracker; this.cfg = cfg;
    this.surface = new Surface(desk);
    this.t = 0; this.rootQ = new THREE.Quaternion();
    const spineRest = (b) => (b ? b.quaternion.clone() : null);
    this.rest = { spine: spineRest(rig.spine), spine1: spineRest(rig.spine1), spine2: spineRest(rig.spine2), lSh: spineRest(rig.leftShoulder), rSh: spineRest(rig.rightShoulder) };
    this.arms = [new Arm(rig, 'left', root), new Arm(rig, 'right', root)];
    this.report = { poses: {} };

    // slow, smoothed "posture" channels (deg): lean (pitch), twist (yaw), sway (roll), shoulder drops
    this.post = { pitch: new Damp(0, 1.4), yaw: new Damp(0, 1.4), roll: new Damp(0, 1.4), shL: new Damp(0, 1.0), shR: new Damp(0, 1.0) };
    this.postTarget = { pitch: 0, yaw: 0, roll: 0, shL: 0, shR: 0 };
    this.nextShift = rand(...cfg.shiftEvery) * 0.6; this.shiftReturn = 0;
    this.nextIdle = rand(...cfg.headIdleEvery) * 0.7; this.idleEvt = null;
    this.breathPhase = Math.random() * 6.28;
    this.facing = new Damp(0, 1.3); this.facingTarget = 0;    // upper-body turn (deg, + = toward the monitor side)

    // hands-on-desk pose machine
    this.talk = 0; this.talkTarget = 0; this.kick = 0;   // speaking: subtle head motion only (no hand gestures exist)
    this.poseName = 'typing'; this.prevPose = 'typing'; this.autoPoses = false; this.pending = null;
    this.transition = null; this.nextPoseAt = rand(...cfg.poseDwell) * 0.6;
    this.pose = {}; this.ready = false;
    this._prepare();
  }

  /** Resolve every pose into wrist targets + elbow swivels once, on the real geometry. */
  _prepare() {
    const { rig, root } = this;
    root.updateMatrixWorld(true);
    for (const name of GRAPH) {
      const P = POSES[name], res = {};
      for (const arm of this.arms) {
        const p = P[arm.side === 'left' ? 'L' : 'R'];
        res[arm.side] = this._resolveHand(arm, p);
      }
      this.pose[name] = res;
      this.report.poses[name] = Object.fromEntries(this.arms.map((a) => [a.side, { ok: res[a.side].ok, elbowY: +res[a.side].elbow.y.toFixed(3), elbowX: +res[a.side].elbow.x.toFixed(3), swivelDeg: +(res[a.side].swivel / DEG).toFixed(0), reach: +res[a.side].reachFrac.toFixed(2) }]));
    }
    this.cur = {};
    for (const arm of this.arms) this.cur[arm.side] = this._hand('typing', arm);
    this.ready = true;
    this.applyArms(0, true);
    for (const arm of this.arms) arm.calibrateThumb(this.surface);
    this.applyArms(0, true);
  }

  _hand(name, arm) { const p = POSES[name][arm.side === 'left' ? 'L' : 'R']; return { ...this.pose[name][arm.side], curl: p.curl, typing: !!p.typing }; }

  _resolveHand(arm, p) {
    const { cfg } = this;
    const s = this.surface.at(p.x, p.z);
    let y = s.open ? 0.90 : s.y, n = s.n.clone();
    if (p.air) { y = p.y; n = new THREE.Vector3(0, p.palmUp ? -1 : 1, 0); }
    const T = new THREE.Vector3(p.x, y, p.z).addScaledVector(n, p.air ? 0 : cfg.handClearance + (p.lift || 0));
    const inw = p.inward * DEG;
    const fd = new THREE.Vector3(-arm.S * Math.sin(inw), 0, Math.cos(inw));
    const A = arm.arm.getWorldPosition(new THREE.Vector3());
    const E = new THREE.Vector3();
    let best = null;
    for (let k = -180; k < 180; k += 5) {
      const sw = k * DEG; arm.elbowFor(A, T, sw, E);
      if (!this._armClear(arm, A, E, T)) continue;
      const score = Math.abs(E.x - arm.S * 0.26) + Math.max(0, E.y - 0.97) * 3 + Math.abs(k) * 0.0008;
      if (!best || score < best.score) best = { score, sw, E: E.clone() };
    }
    let ok = !!best;
    if (!best) { arm.elbowFor(A, T, 0, E); best = { sw: 0, E: E.clone() }; }
    const reachFrac = A.distanceTo(T) / (arm.l1 + arm.l2);
    return { T, n, fd, swivel: best.sw, elbow: best.E, ok: ok && reachFrac < 0.99, reachFrac };
  }

  /** Elbow + forearm must stay above the counter, outside the torso and not flare out unnaturally. */
  _armClear(arm, A, E, T) {
    const sx = Math.abs(E.x);
    if (sx < 0.19 && E.z < -0.2) return false;                  // would sit inside the ribcage
    if (sx > 0.42) return false;                                 // elbow flare
    for (let i = 0; i <= 10; i++) {
      const u = i / 10, x = E.x + (T.x - E.x) * u, z = E.z + (T.z - E.z) * u, y = E.y + (T.y - E.y) * u;
      const s = this.surface.at(x, z), floor = s.open ? 0.905 : s.y + 0.012;
      if (y < floor + (u < 0.1 ? 0.012 : 0)) return false;
    }
    return true;
  }

  // ------------------------------------------------------------------------------------------------ arms
  applyArms(dt, instant = false) {
    for (const arm of this.arms) {
      const c = this.cur[arm.side];
      let T = c.T, curlA = c.curl, curlB = c.curl, mix = 0, typeW;
      let swivel = c.swivel, n = c.n, fd = c.fd;
      const tr = this.transition && this.transition[arm.side];
      if (tr) {
        const u = ease(tr.u);
        const a = tr.from, b = tr.to;
        T = a.T.clone().lerp(b.T, u);
        const moved = a.T.distanceTo(b.T);
        if (moved > 0.02) T.addScaledVector(_v1.set(0, 1, 0), this.cfg.handLift * Math.sin(Math.PI * u) * clamp(moved / 0.15, 0.4, 1));
        let d = b.swivel - a.swivel; d = Math.atan2(Math.sin(d), Math.cos(d));
        swivel = a.swivel + d * u;
        n = a.n.clone().lerp(b.n, u).normalize(); fd = a.fd.clone().lerp(b.fd, u).normalize();
        curlA = a.curl; curlB = b.curl; mix = u; typeW = (a.typing ? 1 - u : 0) + (b.typing ? u : 0);
      } else typeW = c.typing ? 1 : 0;
      if (typeW > 0) { T = T.clone(); T.x += 0.004 * Math.sin(this.t * 0.9 + arm.S) * typeW; T.z += 0.003 * Math.sin(this.t * 1.3 + 2 * arm.S) * typeW; }   // wrists drift as the hands work
      // keep the wrist near its target even when breathing moves the shoulder: solve live from the current shoulder
      arm.solve(T, swivel, n, fd);
      arm.setFingersMix(curlA, curlB, mix, typeW, this.t);
      arm.hand.updateMatrixWorld(true);
    }
  }

  _startTransition(name) {
    const dur = rand(1.6, 2.5), delay = rand(0.0, 0.35);
    const T = {};
    for (const arm of this.arms) {
      const to = this._hand(name, arm);
      T[arm.side] = { from: { ...this.cur[arm.side] }, to, u: 0, t: -(arm.side === 'left' ? delay : 0), dur: dur + (arm.side === 'left' ? 0 : delay * 0.5) };
    }
    this.transition = T; this.prevPose = this.poseName; this.poseName = name;
  }

  _advanceTransition(dt) {
    if (!this.transition) return;
    let done = true;
    for (const arm of this.arms) {
      const tr = this.transition[arm.side]; tr.t += dt; tr.u = clamp(tr.t / tr.dur, 0, 1);
      if (tr.u < 1) done = false;
    }
    if (done) {
      for (const arm of this.arms) this.cur[arm.side] = { ...this.transition[arm.side].to }; this.transition = null;
      if (this.pending) { const n = this.pending; this.pending = null; this._startTransition(n); }
    }
  }

  speakKick() { this.kick = 1; }
  /** One deliberate head gesture ('nod' | 'tilt' | 'glance') on top of the idle motion. Used for conversational cues; ignored under reduced motion. */
  cue(type, dur = 1.5) { if (this.reduced || this.idleEvt) return; this.idleEvt = { t: 0, dur, type, s: Math.random() < 0.5 ? -1 : 1 }; this.nextIdle = Math.max(this.nextIdle, 4); }
  _nextPoseName() {
    if (this.poseName !== 'rest' && Math.random() < 0.6) return 'rest';          // keep returning to the relaxed resting pose
    return pick(AUTO.filter((n) => n !== this.poseName && n !== 'rest'));
  }
  /** Ask for a pose; blends smoothly (queued if another blend is still running). */
  request(name) {
    if (!this.pose[name] || (name === this.poseName && !this.pending)) return;
    if (this.transition) this.pending = name; else this._startTransition(name);
    this.nextPoseAt = rand(...this.cfg.poseDwell) + 2.5;
  }

  /** test hook */
  goTo(name) { if (this.pose[name]) { this.transition = null; this.pending = null; this.poseName = name; for (const arm of this.arms) this.cur[arm.side] = this._hand(name, arm); } }

  // ------------------------------------------------------------------------------------------------ update
  update(dtRaw) {
    if (!this.ready) return;
    const dt = clamp(dtRaw, 0, 0.1), c = this.cfg; this.t += dt;
    const RM = this.reduced;                          // prefers-reduced-motion: keep only a very faint breath, no shifts/poses/idle head moves
    this.root.getWorldQuaternion(this.rootQ);

    // -- scheduler: small posture adjustments --
    this.nextShift -= dt;
    if (!RM && this.nextShift <= 0) {
      const big = Math.random() < 0.3;
      this.postTarget = big
        ? { pitch: rand(-1.6, 0.8), yaw: rand(-1.4, 1.4), roll: rand(-1.4, 1.4), shL: rand(-1, 1.6), shR: rand(-1, 1.6) }     // settle into the chair
        : { pitch: rand(-0.8, 0.6), yaw: rand(-1.0, 1.0), roll: rand(-1.0, 1.0), shL: rand(-0.8, 1.4), shR: rand(-0.8, 1.4) };
      this.shiftReturn = rand(5, 11);                                           // then drift back to neutral
      this.nextShift = rand(...c.shiftEvery);
    }
    if (this.shiftReturn > 0 && (this.shiftReturn -= dt) <= 0) this.postTarget = { pitch: 0, yaw: 0, roll: 0, shL: 0, shR: 0 };
    const P = {}; for (const k in this.post) P[k] = this.post[k].step(this.postTarget[k], dt);
    P.yaw += this.facing.step(RM ? this.facingTarget * 0.4 : this.facingTarget, dt);

    // -- breathing (slow, small) --
    this.breathPhase += dt * Math.PI * 2 * (c.breathHz + 0.025 * Math.sin(this.t * 0.11));
    const br = Math.sin(this.breathPhase) * 0.5 + 0.5 * Math.sin(this.breathPhase * 2 + 1.3) * 0.12;
    const bd = c.breathDeg * (RM ? 0.3 : 1);

    const R = this.rest, rig = this.rig, q = this.rootQ;
    // spine chain: lean + sway shared along the three spine bones; breath mostly in the upper chest
    if (rig.spine) setCharacterFrameDelta(rig.spine, R.spine, q, P.yaw * 0.25 * DEG, (P.pitch * 0.3) * DEG, P.roll * 0.3 * DEG);
    if (rig.spine1) setCharacterFrameDelta(rig.spine1, R.spine1, q, P.yaw * 0.35 * DEG, (P.pitch * 0.35 - br * bd * 0.45) * DEG, P.roll * 0.35 * DEG);
    if (rig.spine2) setCharacterFrameDelta(rig.spine2, R.spine2, q, P.yaw * 0.4 * DEG, (P.pitch * 0.35 - br * bd) * DEG, P.roll * 0.35 * DEG);
    const shBreath = br * 0.45;
    if (rig.leftShoulder) setCharacterFrameDelta(rig.leftShoulder, R.lSh, q, 0, 0, (shBreath - P.shL * 0.6) * DEG);
    if (rig.rightShoulder) setCharacterFrameDelta(rig.rightShoulder, R.rSh, q, 0, 0, (-shBreath + P.shR * 0.6) * DEG);

    // -- hands-on-desk pose machine --
    this.nextPoseAt -= dt;
    if (!RM && this.autoPoses && !this.transition && this.nextPoseAt <= 0) { this._startTransition(this._nextPoseName()); this.nextPoseAt = rand(...c.poseDwell) + 2.5; }
    this._advanceTransition(dt);
    this.applyArms(dt);

    // -- idle head offsets (small nods / tilts / glances); HeadTracker keeps user input dominant --
    this.nextIdle -= dt;
    if (!RM && !this.idleEvt && this.nextIdle <= 0 && this.autoPoses) {
      const r = Math.random();
      this.idleEvt = { t: 0, dur: rand(1.6, 2.6), type: r < 0.42 ? 'nod' : r < 0.82 ? 'tilt' : 'glance', s: Math.random() < 0.5 ? -1 : 1 };
      this.nextIdle = rand(...c.headIdleEvery);
    }
    const I = this.tracker.idle; I.yaw = I.pitch = I.roll = 0;
    if (this.idleEvt) {
      const e = this.idleEvt; e.t += dt; const b = bump(e.t / e.dur);
      if (e.type === 'nod') I.pitch = 3.2 * b;
      else if (e.type === 'tilt') { I.roll = 2.4 * e.s * b; I.yaw = 1.2 * e.s * b; }
      else { I.yaw = 5 * e.s * b; I.pitch = -0.6 * b; }
      if (e.t >= e.dur) this.idleEvt = null;
    }
    // speaking: small, slow head movement that follows the voice; word-boundary kicks add a faint emphasis
    this.talk += (this.talkTarget - this.talk) * (1 - Math.exp(-dt * 3)); this.kick *= Math.exp(-dt * 6);
    if (this.talk > 0.01 && !RM) { const w = this.talk; I.pitch += w * 0.9 * Math.sin(this.t * 2.3) + this.kick * 1.3; I.yaw += w * 0.8 * Math.sin(this.t * 1.1 + 1); I.roll += w * 0.45 * Math.sin(this.t * 1.7); }
  }
}
