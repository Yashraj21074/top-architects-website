import * as THREE from 'three';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** One or two cascaded first-order low-pass filters, exact for any dt. */
class Smoother {
  constructor(rate, stages = 2) { this.rate = rate; this.stages = stages; this.mid = 0; this.value = 0; }
  update(target, dt) {
    const a = 1 - Math.exp(-this.rate * dt);       // frame-rate independent
    if (this.stages === 2) { this.mid += (target - this.mid) * a; this.value += (this.mid - this.value) * a; }
    else { this.value += (target - this.value) * a; this.mid = this.value; }
    return this.value;
  }
  snap(v = 0) { this.mid = this.value = v; }
}

// soft-saturating response: gentle near centre, flattens toward the limit
const shape = (n) => Math.tanh(1.35 * n) / Math.tanh(1.35);

/**
 * Drives the REAL skeleton bones: Neck (support), Head (primary), both eyes.
 * Nothing else is touched - torso, desk and camera never move.
 *
 * Frame convention (character faces +Z, +Y up, camera looks down -Z):
 *   cursor right  -> +X side -> yaw   +  (rotation about +Y)
 *   cursor up     ->           pitch up (rotation about -X)
 */
export class HeadTracker {
  constructor({ head, neck, leftEye, rightEye, root, cfg }) {
    this.head = head; this.neck = neck; this.eyes = [leftEye, rightEye].filter(Boolean);
    this.root = root; this.cfg = cfg;

    // Rest pose = whatever the bones hold when the tracker is created (after seating pose).
    this.rest = new Map();
    for (const b of [head, neck, ...this.eyes]) this.rest.set(b, b.quaternion.clone());

    this.target = { x: 0, y: 0 };      // normalised cursor, -1..1 (y up)
    this.attend = 1; this.base = { x: 0, y: 0 };
    this.hold = false;                  // true after Reset until the pointer moves again
    this.idle = { yaw: 0, pitch: 0, roll: 0 };   // small additive head offsets (deg) from the idle system; faded while the user is interacting

    this.s = {
      headYaw: new Smoother(cfg.rateHead), headPitch: new Smoother(cfg.rateHead), headRoll: new Smoother(cfg.rateHead),
      neckYaw: new Smoother(cfg.rateNeck), neckPitch: new Smoother(cfg.rateNeck),
      eyeYaw: new Smoother(cfg.rateEyes, 1), eyePitch: new Smoother(cfg.rateEyes, 1),
    };
    this.angles = { headYaw: 0, headPitch: 0, neckYaw: 0, neckPitch: 0, eyeYaw: 0, eyePitch: 0 }; // degrees, for HUD/tests
    this._q = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
    this._e = new THREE.Euler(0, 0, 0, 'YXZ');
  }

  setTarget(nx, ny) {
    const c = this.cfg, r = Math.hypot(nx, ny);
    if (r < c.deadZone) { this.target.x = 0; this.target.y = 0; return; }
    this.target.x = clamp(nx, -1, 1); this.target.y = clamp(ny, -1, 1);
  }
  release() { this.target.x = 0; this.target.y = 0; }               // pointer left interaction area
  reset() { this.release(); this.hold = true; }                      // smooth return, ignore tracking until pointer moves

  update(dtRaw) {
    const c = this.cfg, dt = Math.min(Math.max(dtRaw, 0), c.maxDt);
    const at = this.attend, nx = this.target.x * at + this.base.x * (1 - at), ny = this.target.y * at + this.base.y * (1 - at);   // attend 0 = looking at own work, 1 = following the visitor
    const sx = shape(Math.abs(nx)) * Math.sign(nx);
    const sy = shape(Math.abs(ny)) * Math.sign(ny);
    const up = sy > 0;
    const pitchHeadMax = up ? c.pitchUpHead : c.pitchDownHead;
    const pitchNeckMax = up ? c.pitchUpNeck : c.pitchDownNeck;
    const eyePitchMax = up ? c.eyePitchUp : c.eyePitchDown;
    const S = this.s;

    const A = this.angles;
    // yaw>0 turns toward +X (screen right); pitch>0 means LOOKING UP.
    const active = Math.hypot(nx, ny) > 0.02;
    const k = active ? 0.25 : 1;                    // user input stays the dominant control
    const I = this.idle;
    A.headYaw = S.headYaw.update(sx * c.yawHead + I.yaw * k, dt);
    A.headPitch = S.headPitch.update(sy * pitchHeadMax - I.pitch * k, dt);   // idle pitch > 0 = nod down
    const headRoll = S.headRoll.update(-sx * c.rollHead + I.roll * k, dt);
    A.neckYaw = S.neckYaw.update(sx * c.yawNeck, dt);
    A.neckPitch = S.neckPitch.update(sy * pitchNeckMax, dt);
    A.eyeYaw = S.eyeYaw.update(sx * c.eyeYaw, dt);
    A.eyePitch = S.eyePitch.update(sy * eyePitchMax, dt);

    const atRest = Math.abs(A.headYaw) + Math.abs(A.headPitch) + Math.abs(A.neckYaw) + Math.abs(A.neckPitch) +
                   Math.abs(A.eyeYaw) + Math.abs(A.eyePitch) + Math.abs(headRoll) < 0.01 && nx === 0 && ny === 0 &&
                   Math.abs(I.yaw) + Math.abs(I.pitch) + Math.abs(I.roll) < 0.01;
    if (atRest) {                                   // exact rest, no residual float drift
      for (const [b, q] of this.rest) b.quaternion.copy(q);
      for (const k in S) S[k].snap(0);
      for (const k in A) A[k] = 0;
      return;
    }

    // Neck first (parent), then head (child) so the head inherits the neck motion.
    this._applyWorldDelta(this.neck, A.neckYaw * DEG, -A.neckPitch * DEG, 0);
    this.neck.updateMatrixWorld(true);
    this._applyWorldDelta(this.head, A.headYaw * DEG, -A.headPitch * DEG, headRoll * DEG);
    this.head.updateMatrixWorld(true);

    // Eyes rotate about their own joint, in the head's local frame (independent of head share).
    for (const eye of this.eyes) {
      this._e.set(-A.eyePitch * DEG, A.eyeYaw * DEG, 0, 'YXZ');
      eye.quaternion.copy(this.rest.get(eye)).multiply(this._q[0].setFromEuler(this._e));
    }
  }

  /**
   * Rotate `bone` about ITS OWN joint origin by a rotation expressed in the character's
   * (upright, forward = +Z) frame, on top of its rest pose. Using the character frame
   * instead of the bone's local axes avoids the neck's built-in forward lean skewing the
   * yaw axis.
   */
  _applyWorldDelta(bone, yaw, pitch, roll) {
    const [qDelta, qParent, qRoot] = this._q;
    this._e.set(pitch, yaw, roll, 'YXZ');
    qDelta.setFromEuler(this._e);                                    // in character frame
    this.root.getWorldQuaternion(qRoot);
    qDelta.premultiply(qRoot).multiply(this._q[3].copy(qRoot).invert()); // -> world frame
    bone.parent.getWorldQuaternion(qParent);
    // newLocal = parent^-1 * delta * parent * restLocal
    bone.quaternion.copy(this.rest.get(bone)).premultiply(qParent).premultiply(qDelta).premultiply(qParent.invert());
  }
}
