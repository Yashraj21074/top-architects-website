import * as THREE from 'three';

const DEG = Math.PI / 180;
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion();

/** Find bones from the REAL skeleton by name pattern + hierarchy (never by assumed index). */
export function discoverRig(scene) {
  const bones = [];
  const skinned = [];
  scene.traverse((o) => { if (o.isBone) bones.push(o); if (o.isSkinnedMesh) skinned.push(o); });
  const by = (re) => bones.find((b) => re.test(b.name));
  const rig = {
    allBones: bones, skinned,
    hips: by(/^Hips/i), spine: by(/^Spine(_\d+)?$/i), spine1: by(/^Spine1/i), spine2: by(/^Spine2/i),
    neck: by(/^Neck/i), head: by(/^Head(_\d+)?$/i),
    leftEye: by(/^LeftEye/i), rightEye: by(/^RightEye/i),
    leftShoulder: by(/^LeftShoulder/i), rightShoulder: by(/^RightShoulder/i),
    leftArm: by(/^LeftArm/i), rightArm: by(/^RightArm/i),
    leftForeArm: by(/^LeftForeArm/i), rightForeArm: by(/^RightForeArm/i),
    leftHand: by(/^LeftHand(_\d+)?$/i), rightHand: by(/^RightHand(_\d+)?$/i),
    leftUpLeg: by(/^LeftUpLeg/i), rightUpLeg: by(/^RightUpLeg/i),
    leftLeg: by(/^LeftLeg(_\d+)?$/i), rightLeg: by(/^RightLeg(_\d+)?$/i),
  };
  return rig;
}

/** Hierarchy + skin-weight validation. Returns an honest report; never assumes success. */
export function validateRig(rig) {
  const problems = [];
  const need = ['hips', 'spine2', 'neck', 'head'];
  for (const k of need) if (!rig[k]) problems.push(`missing bone: ${k}`);
  const r = {
    ok: false, problems,
    names: Object.fromEntries(['hips', 'spine2', 'neck', 'head', 'leftEye', 'rightEye'].map((k) => [k, rig[k]?.name ?? null])),
    chain: null, weights: {}, eyesFound: !!(rig.leftEye && rig.rightEye),
  };
  if (rig.head && rig.neck) {
    if (rig.head.parent !== rig.neck) problems.push('head bone is not a child of the neck bone');
    if (rig.neck.parent !== rig.spine2) problems.push(`neck parent is ${rig.neck.parent?.name}, expected Spine2`);
    r.chain = [rig.hips, rig.spine2, rig.neck, rig.head].map((b) => b?.name).join(' > ');
  }
  // skin weights: how many vertices are really driven by each bone?
  const count = (bone, thr = 0.5) => {
    if (!bone) return 0; let n = 0;
    for (const m of rig.skinned) {
      const idx = m.skeleton.bones.indexOf(bone); if (idx < 0) continue;
      const si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
      for (let v = 0; v < si.count; v++) {
        let w = 0;
        for (let k = 0; k < 4; k++) if (si.getComponent(v, k) === idx) w += sw.getComponent(v, k);
        if (w >= thr) n++;
      }
    }
    return n;
  };
  r.weights = { head: count(rig.head), neck: count(rig.neck, 0.3), leftEye: count(rig.leftEye), rightEye: count(rig.rightEye) };
  if (r.weights.head < 100) problems.push(`head bone drives only ${r.weights.head} vertices (>=50% weight)`);
  if (r.weights.neck < 10) problems.push(`neck bone has almost no skin weight (${r.weights.neck} verts)`);
  r.eyeWeightsOk = r.weights.leftEye > 20 && r.weights.rightEye > 20;
  r.ok = problems.length === 0;
  return r;
}

// --- posing helpers ---------------------------------------------------------
/** Rotate `bone` about its own joint by a WORLD-space delta, preserving children's relative pose. */
function applyWorldDelta(bone, delta) {
  bone.parent.updateWorldMatrix(true, false);
  bone.parent.getWorldQuaternion(_q1);
  _q2.copy(_q1).invert();
  bone.quaternion.premultiply(_q1).premultiply(delta).premultiply(_q2);
  bone.updateMatrixWorld(true);
}
/** Swing `bone` so that the segment bone->child points along `dirWorld`. */
function aim(bone, child, dirWorld) {
  bone.updateWorldMatrix(true, true);
  bone.getWorldPosition(_v1); child.getWorldPosition(_v2);
  const cur = _v2.sub(_v1).normalize();
  const delta = new THREE.Quaternion().setFromUnitVectors(cur, dirWorld.clone().normalize());
  applyWorldDelta(bone, delta);
}

/**
 * Static seated pose (NOT interactive): the supplied model is in an A-pose.
 *  - hips lowered to seat height, thighs forward, shins down
 *  - arms brought in from the A-pose so the sleeves don't hang in mid-air beside the desk
 * Spine, neck, head and eyes are left in the model's own rest orientation.
 */
export function applySeatedPose(rig, { hipsRestWorldY, seatY, hipLift, scale, rootY0 }) {
  const { hips } = rig;
  // lower the pelvis (hips is the only translated bone)
  hips.position.y -= (hipsRestWorldY - (seatY + hipLift)) / scale;
  hips.updateMatrixWorld(true);

  const X = new THREE.Vector3(1, 0, 0);
  const hipFlex = new THREE.Quaternion().setFromAxisAngle(X, -88 * DEG);   // thigh down -> forward
  const kneeBend = new THREE.Quaternion().setFromAxisAngle(X, 90 * DEG);   // shin forward -> down
  for (const [up, lo] of [[rig.leftUpLeg, rig.leftLeg], [rig.rightUpLeg, rig.rightLeg]]) {
    if (!up || !lo) continue;
    applyWorldDelta(up, hipFlex); applyWorldDelta(lo, kneeBend);
  }
  // arms: upper arm down & slightly forward/out, forearm forward & slightly down (hidden by desk)
  const arms = [
    [rig.leftArm, rig.leftForeArm, rig.leftHand, +1], [rig.rightArm, rig.rightForeArm, rig.rightHand, -1],
  ];
  for (const [arm, fore, hand, s] of arms) {
    if (!arm || !fore || !hand) continue;
    aim(arm, fore, new THREE.Vector3(0.16 * s, -0.96, 0.10));
    aim(fore, hand, new THREE.Vector3(0.10 * s, -0.55, 0.83));
  }
  hips.updateMatrixWorld(true);
}

/** Fine, tileable micro-relief (pores / fabric tooth) - generated locally, no extra download. */
function microBump(size = 256, blur = 1) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), img = g.createImageData(size, size), n = new Float32Array(size * size);
  for (let i = 0; i < n.length; i++) n[i] = Math.random();
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {         // wrap-around box blur keeps it seamless
    let acc = 0, k = 0;
    for (let dy = -blur; dy <= blur; dy++) for (let dx = -blur; dx <= blur; dx++) { acc += n[((y + dy + size) % size) * size + ((x + dx + size) % size)]; k++; }
    const v = Math.max(0, Math.min(255, 128 + (acc / k - 0.5) * 520)), i = (y * size + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

/**
 * Material pass. The avatar's geometry and textures are what they are (a stylised Ready-Player-Me-type
 * model); this only improves how light behaves on them: soft skin with a faint sheen and pore-scale relief,
 * wet glassy eyes, matte hair and cloth.
 */
export function prepareCharacterMaterials(scene, renderer) {
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const pores = microBump(256, 1); pores.repeat.set(26, 26); pores.anisotropy = 4;
  const keep = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'];
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    o.frustumCulled = false;               // bind-pose bounds are wrong once bones move
    let m = o.material;
    if (m.map) m.map.anisotropy = Math.min(8, maxAniso);
    const upgrade = (props) => {
      const n = new THREE.MeshPhysicalMaterial({ name: m.name, color: m.color, ...props });
      for (const k of keep) if (m[k]) n[k] = m[k];
      if (m.normalScale) n.normalScale.copy(m.normalScale);
      n.side = m.side; n.skinning = undefined; o.material = n; m = n;
    };
    if (m.name === 'Wolf3D_Skin') {
      upgrade({ roughness: 0.6, metalness: 0, sheen: 0.55, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffb7a0), clearcoat: 0.04, clearcoatRoughness: 0.5, envMapIntensity: 0.4 });
      m.bumpMap = pores; m.bumpScale = 0.9;
    } else if (m.name === 'Wolf3D_Eye') {
      upgrade({ roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.1 });
    } else if (m.name === 'Wolf3D_Hair') {
      upgrade({ roughness: 0.62, sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color(0x6b4a33), envMapIntensity: 0.55 });
    } else {
      m.envMapIntensity = 0.6;
      if (m.roughness !== undefined) m.roughness = Math.max(m.roughness, 0.72);     // wool/cotton: no plastic sheen
    }
    if (m.name === 'Wolf3D_Teeth') o.castShadow = false;
  });
}
