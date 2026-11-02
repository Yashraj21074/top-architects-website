import * as THREE from 'three';

// Deterministic RNG so the plants look the same on every load.
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const mat = {
  ceramic: () => new THREE.MeshPhysicalMaterial({ color: 0xeee8dc, roughness: 0.28, clearcoat: 0.45, clearcoatRoughness: 0.25, side: THREE.DoubleSide }),
  brass: () => new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.34, metalness: 1.0 }),
  bronze: () => new THREE.MeshStandardMaterial({ color: 0x7d5a35, roughness: 0.38, metalness: 1.0 }),
  walnut: () => new THREE.MeshStandardMaterial({ color: 0x3e2a1d, roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide }),
  leather: () => new THREE.MeshStandardMaterial({ color: 0x25221f, roughness: 0.55, metalness: 0.0 }),
  linen: () => new THREE.MeshStandardMaterial({ color: 0xcfc3aa, roughness: 0.92 }),
  paper: () => new THREE.MeshStandardMaterial({ color: 0xf3eee3, roughness: 0.85 }),
};

function shadow(o) { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; }

function roundedRectShape(w, d, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
/** Soft-cornered slab on the XZ plane, base at y=0, top at y=h. */
function slab(w, h, d, r, material, bevel = 0.003) {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w - bevel * 2, d - bevel * 2, r), { depth: Math.max(h - bevel * 2, 0.001), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
  g.rotateX(-Math.PI / 2); g.translate(0, bevel, 0);
  return new THREE.Mesh(g, material);
}

// ------------------------------------------------------------------------------------------ planters
function planter({ r = 0.07, h = 0.12, taper = 0.84, material, lip = null }) {
  const g = new THREE.Group();
  const pts = [[0, 0], [r * taper * 0.9, 0], [r * taper, 0.006], [r * (taper + 1) / 2, h * 0.5], [r, h * 0.96], [r * 0.985, h], [r * 0.9, h], [r * 0.88, h * 0.94], [0, h * 0.94]].map(([x, y]) => new THREE.Vector2(x, y));
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 56), material));
  if (lip) { const t = new THREE.Mesh(new THREE.TorusGeometry(r * 0.99, 0.0022, 8, 56), lip); t.rotation.x = Math.PI / 2; t.position.y = h; g.add(t); }
  return g;
}
function soilDisc(r, y, rnd) {
  const g = new THREE.Group();
  const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.004, 32), new THREE.MeshStandardMaterial({ color: 0x241a13, roughness: 1 })); d.position.y = y; g.add(d);
  const bark = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.95 });
  const n = Math.round(r * 260), geo = new THREE.DodecahedronGeometry(0.0055, 0);
  const inst = new THREE.InstancedMesh(geo, bark, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const a = rnd() * 6.28, rr = Math.sqrt(rnd()) * (r - 0.008), s = 0.8 + rnd() * 0.9;
    p.set(Math.cos(a) * rr, y + 0.003, Math.sin(a) * rr); q.setFromEuler(e.set(rnd() * 3, rnd() * 3, rnd() * 3)); sc.set(1.3 * s, 0.6 * s, s);
    m4.compose(p, q, sc); inst.setMatrixAt(i, m4);
  }
  g.add(inst); return g;
}

// ------------------------------------------------------------------------------------------ leaves
/** Leaf blade grown along +Y from its base, arching over, with a slight midrib fold. */
function leafGeometry({ len, wid, bend = 0.5, fold = 0.25, tipPow = 0.8, seg = 8 }) {
  const g = new THREE.PlaneGeometry(1, 1, 4, seg), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i) + 0.5;
    const w = Math.pow(Math.max(Math.sin(Math.PI * Math.pow(v, tipPow)), 0), 0.85) * (v < 0.12 ? 0.6 + v * 3 : 1);
    const across = u * wid * Math.max(w, 0.0001);
    p.setXYZ(i, across, v * len * Math.cos(bend * v * 0.8), -bend * v * v * len * 0.55 - u * u * wid * fold * 4 * (1 - v * 0.3));
  }
  g.computeVertexNormals(); return g;
}

// ------------------------------------------------------------------------------------------ orchid
function buildOrchid() {
  const rnd = rng(11), g = new THREE.Group(); g.name = 'Orchid';
  g.add(planter({ r: 0.058, h: 0.105, taper: 0.8, material: mat.ceramic(), lip: mat.brass() }));
  g.add(soilDisc(0.052, 0.098, rnd));
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2c5a35, roughness: 0.32, side: THREE.DoubleSide });
  const leafGeo = leafGeometry({ len: 0.19, wid: 0.075, bend: 0.9, fold: 0.15 });
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(leafGeo, leafMat.clone()); m.material.color.offsetHSL(0.008 * (i - 2), 0, 0.012 * (i - 2));
    m.scale.setScalar(0.82 + rnd() * 0.28);
    m.rotation.set(-Math.PI / 2 + 0.95 + rnd() * 0.25, 0, 0);
    const holder = new THREE.Group(); holder.add(m); holder.rotation.y = (i / 5) * Math.PI * 2 + 0.5 + rnd() * 0.4; holder.position.y = 0.1; g.add(holder);
  }
  const curve = new THREE.CatmullRomCurve3([[0, 0.1, 0], [0.004, 0.2, 0], [0.022, 0.30, 0.004], [0.075, 0.37, 0.008], [0.14, 0.375, 0.012], [0.2, 0.335, 0.016], [0.245, 0.27, 0.02]].map((p) => new THREE.Vector3(...p)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0034, 8), new THREE.MeshStandardMaterial({ color: 0x4d6a3b, roughness: 0.6 })));
  const petal = (w, h, cup, m) => {
    const geo = new THREE.CircleGeometry(0.5, 20), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setXYZ(i, x * w, y * h, (x * x * 0.35 + y * y * 0.25) * cup); }
    geo.computeVertexNormals(); return new THREE.Mesh(geo, m);
  };
  const white = new THREE.MeshStandardMaterial({ color: 0xf8f4ee, roughness: 0.45, side: THREE.DoubleSide, emissive: 0x2a2520, emissiveIntensity: 0.25 });
  const blush = new THREE.MeshStandardMaterial({ color: 0xe9bfd0, roughness: 0.5, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe6c36a, roughness: 0.6 });
  const flower = (s) => {
    const f = new THREE.Group(), add = (m, x, y, z, rz = 0) => { m.position.set(x, y, z); m.rotation.z = rz; f.add(m); };
    add(petal(0.030, 0.040, 0.5, white), 0, 0.026, 0);
    add(petal(0.028, 0.040, 0.5, white), -0.016, -0.02, 0, -0.9); add(petal(0.028, 0.040, 0.5, white), 0.016, -0.02, 0, 0.9);
    add(petal(0.046, 0.040, 0.7, white), -0.027, 0.004, 0.002, 0.05); add(petal(0.046, 0.040, 0.7, white), 0.027, 0.004, 0.002, -0.05);
    add(petal(0.016, 0.022, 1.2, blush), 0, -0.004, 0.004);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 8), gold), 0, 0.006, 0.006);
    f.scale.setScalar(s); return f;
  };
  [0.50, 0.58, 0.66, 0.74, 0.82, 0.90].forEach((t, i) => {
    const f = flower(1.0 - i * 0.07), side = i % 2 ? 1 : -1;
    f.position.copy(curve.getPoint(t)); f.position.z += 0.012 * (i % 2 ? 1 : 0.4);
    f.rotation.set(-0.15, side * 0.5 + 0.1, side * 0.05); g.add(f);
  });
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.0085 - i * 0.0018, 10, 8), blush);
    b.position.copy(curve.getPoint(Math.min(0.93 + i * 0.03, 0.995))).add(new THREE.Vector3(0.004, -0.008 * (i + 1), 0.006)); g.add(b);
  }
  return shadow(g);
}

// ------------------------------------------------------------------------------------------ large indoor plant
function buildFloorPlant() {
  const rnd = rng(7), g = new THREE.Group(); g.name = 'FloorPlant';
  g.add(planter({ r: 0.2, h: 0.46, taper: 0.78, material: new THREE.MeshStandardMaterial({ color: 0x3a3836, roughness: 0.6, side: THREE.DoubleSide }), lip: mat.brass() }));
  g.add(soilDisc(0.185, 0.43, rnd));
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b5a46, roughness: 0.85 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.38, side: THREE.DoubleSide });   // tinted per instance
  const leafGeo = leafGeometry({ len: 0.30, wid: 0.2, bend: 0.55, fold: 0.18, tipPow: 0.75, seg: 10 });
  const stems = [
    { pts: [[0, 0.43, 0], [0.01, 0.8, 0], [0.015, 1.15, 0.01], [0, 1.5, 0]], r: 0.014, leaves: 18, from: 0.35 },
    { pts: [[0.02, 0.43, 0.01], [0.09, 0.75, 0.03], [0.17, 1.05, 0.05], [0.22, 1.3, 0.06]], r: 0.01, leaves: 11, from: 0.4 },
    { pts: [[-0.02, 0.43, 0], [-0.09, 0.7, -0.02], [-0.16, 0.98, -0.02], [-0.2, 1.2, -0.03]], r: 0.01, leaves: 10, from: 0.4 },
  ];
  const total = stems.reduce((s, x) => s + x.leaves, 0);
  const inst = new THREE.InstancedMesh(leafGeo, leafMat, total);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3(), col = new THREE.Color();
  let idx = 0, phase = rnd() * 6;
  for (const st of stems) {
    const curve = new THREE.CatmullRomCurve3(st.pts.map((p) => new THREE.Vector3(...p)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 32, st.r, 8), trunkMat));
    for (let i = 0; i < st.leaves; i++) {
      const t = st.from + (1 - st.from) * (i / (st.leaves - 1)) ** 0.9, pt = curve.getPoint(Math.min(t, 0.999));
      phase += 2.399;                                                               // golden-angle spacing
      const up = 0.75 + (t - st.from) * 1.1;
      e.set(-(Math.PI / 2 - up * 0.55) - rnd() * 0.25, phase, (rnd() - 0.5) * 0.35, 'YXZ'); q.setFromEuler(e);
      const s = (0.78 + rnd() * 0.5) * (1.15 - t * 0.35);
      sc.set(s, s * (0.92 + rnd() * 0.2), s);
      pos.set(pt.x + Math.sin(phase) * 0.012, pt.y, pt.z + Math.cos(phase) * 0.012);
      inst.setMatrixAt(idx, m4.compose(pos, q, sc));
      col.setHSL(0.31 + (rnd() - 0.5) * 0.035, 0.5 + rnd() * 0.12, 0.11 + rnd() * 0.07); inst.setColorAt(idx, col); idx++;
    }
  }
  inst.instanceMatrix.needsUpdate = true; inst.instanceColor.needsUpdate = true; inst.frustumCulled = false;
  g.add(inst);
  return shadow(g);
}

// ------------------------------------------------------------------------------------------ desk accessories
function buildPortfolio() {
  const g = new THREE.Group(); g.name = 'Portfolio';
  g.add(slab(0.31, 0.022, 0.22, 0.012, mat.linen()));
  const edge = slab(0.312, 0.004, 0.222, 0.012, mat.brass(), 0.001); edge.position.y = 0.009; g.add(edge);
  const pad = slab(0.21, 0.016, 0.15, 0.008, mat.leather()); pad.position.set(0.012, 0.022, 0.006); pad.rotation.y = 0.2; g.add(pad);
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0165, 0.152), new THREE.MeshStandardMaterial({ color: 0x6e1f26, roughness: 0.6 }));
  band.position.set(0.012 + Math.cos(0.2) * 0.07, 0.0305, 0.006 - Math.sin(0.2) * 0.07); band.rotation.y = 0.2; g.add(band);
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.14, 16), mat.brass()); pen.rotation.set(Math.PI / 2, 0, 0.5); pen.position.set(-0.01, 0.0425, 0.015); g.add(pen);
  return shadow(g);
}
function buildPenHolder() {
  const g = new THREE.Group(); g.name = 'PenHolder';
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.029, 0.095, 32, 1, true), mat.walnut()); cup.position.y = 0.0475; g.add(cup);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.029, 0.006, 32), mat.walnut()); base.position.y = 0.003; g.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.031, 0.0016, 8, 40), mat.brass()); ring.rotation.x = Math.PI / 2; ring.position.y = 0.095; g.add(ring);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0314, 0.0308, 0.006, 32, 1, true), mat.brass()); band.material.side = THREE.DoubleSide; band.position.y = 0.03; g.add(band);
  [[0x1d1c1b, 0.1], [0xa07a40, 0.9], [0xece7dc, 0.1]].forEach(([c, metal], i) => {
    const pen = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.0038, 0.0038, 0.15, 12), new THREE.MeshStandardMaterial({ color: c, roughness: 0.35, metalness: metal })); body.position.y = 0.075; pen.add(body);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.03, 0.002), mat.brass()); clip.position.set(0.004, 0.13, 0); pen.add(clip);
    pen.position.set((i - 1) * 0.011, 0.01, i === 1 ? 0.006 : -0.004); pen.rotation.set((i - 1) * 0.1, 0, (1 - i) * 0.12 + 0.04); g.add(pen);
  });
  return shadow(g);
}
function buildCardHolder() {
  const g = new THREE.Group(); g.name = 'CardHolder';
  g.add(slab(0.09, 0.012, 0.05, 0.004, mat.bronze()));
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.034, 0.004), mat.bronze()); back.position.set(0, 0.029, -0.0215); back.rotation.x = -0.18; g.add(back);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.012, 0.004), mat.bronze()); lip.position.set(0, 0.018, 0.0225); g.add(lip);
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.048, 0.0007), mat.paper()); c.position.set(0, 0.034, -0.012 + i * 0.0016); c.rotation.x = -0.18; g.add(c); }
  return shadow(g);
}
function buildTray() {
  const g = new THREE.Group(); g.name = 'Tray';
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.01, 48), mat.brass()); dish.position.y = 0.005; g.add(dish);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.0035, 8, 48), mat.brass()); rim.rotation.x = Math.PI / 2; rim.position.y = 0.01; g.add(rim);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.002, 48), new THREE.MeshStandardMaterial({ color: 0x23201d, roughness: 0.5, metalness: 0.2 })); inner.position.y = 0.0105; g.add(inner);
  const s1 = new THREE.Mesh(new THREE.SphereGeometry(0.028, 24, 16), new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 0.55 })); s1.scale.set(1.2, 0.55, 0.9); s1.position.set(-0.018, 0.026, 0.004); s1.rotation.y = 0.4; g.add(s1);
  const s2 = new THREE.Mesh(new THREE.SphereGeometry(0.02, 24, 16), new THREE.MeshStandardMaterial({ color: 0xc9c0b2, roughness: 0.6 })); s2.scale.set(1.1, 0.6, 0.9); s2.position.set(0.03, 0.021, -0.014); g.add(s2);
  return shadow(g);
}

// ------------------------------------------------------------------------------------------ desktop computer
function keyboardTexture() {
  const c = document.createElement('canvas'); c.width = 768; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#26272a'; g.fillRect(0, 0, 768, 256); g.fillStyle = '#121214';
  const rows = [15, 15, 14, 13, 8]; let y = 14;
  rows.forEach((n) => { const kw = (738 - (n - 1) * 5) / n; for (let i = 0; i < n; i++) g.fillRect(15 + i * (kw + 5), y, kw, 38); y += 46; });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function screenTexture() {                                       // dim architectural drawing on the display (visible only from the receptionist's side)
  const c = document.createElement('canvas'); c.width = 512; c.height = 300; const g = c.getContext('2d');
  g.fillStyle = '#10151c'; g.fillRect(0, 0, 512, 300); g.strokeStyle = 'rgba(160,190,220,.35)'; g.lineWidth = 1;
  for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(30 + i * 40, 30); g.lineTo(30 + i * 40, 270); g.stroke(); }
  g.strokeStyle = 'rgba(210,175,100,.7)'; g.lineWidth = 2; g.strokeRect(70, 70, 220, 150); g.strokeRect(290, 110, 140, 110); g.beginPath(); g.moveTo(70, 150); g.lineTo(290, 150); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
/** Slim desktop monitor on a stand. The screen faces local -Z (toward the receptionist once the group is yawed). */
function buildMonitor() {
  const g = new THREE.Group(); g.name = 'Monitor';
  const shell = new THREE.MeshStandardMaterial({ color: 0x2c2e31, roughness: 0.42, metalness: 0.75 });
  const alu = new THREE.MeshStandardMaterial({ color: 0x8b8e92, roughness: 0.4, metalness: 0.85 });
  const base = slab(0.26, 0.012, 0.17, 0.08, alu, 0.002); g.add(base);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.2, 0.014), alu); neck.position.set(0, 0.11, 0.02); g.add(neck);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.34, 0.014), shell); panel.position.set(0, 0.31, 0.03); g.add(panel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.32), new THREE.MeshStandardMaterial({ map: screenTexture(), emissive: 0xffffff, emissiveMap: null, emissiveIntensity: 0, roughness: 0.15, metalness: 0 }));
  screen.material.emissive.set(0x1c2430); screen.material.emissiveIntensity = 0.9;
  screen.position.set(0, 0.31, 0.0225); screen.rotation.y = Math.PI; g.add(screen);
  g.rotation.x = 0.06;                                                          // slight backward tilt
  const wrap = new THREE.Group(); wrap.add(g); return shadow(wrap);
}
function buildKeyboard() {
  const g = new THREE.Group(); g.name = 'Keyboard';
  const body = slab(0.39, 0.012, 0.13, 0.008, new THREE.MeshStandardMaterial({ color: 0x8a8d91, roughness: 0.4, metalness: 0.8 }), 0.002); g.add(body);
  const keys = new THREE.Mesh(new THREE.PlaneGeometry(0.37, 0.115), new THREE.MeshStandardMaterial({ map: keyboardTexture(), roughness: 0.6 }));
  keys.rotation.x = -Math.PI / 2; keys.position.set(0, 0.0125, 0); g.add(keys); return shadow(g);
}
function buildMouse() {
  const g = new THREE.Group(); g.name = 'Mouse';
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.03, 24, 16), new THREE.MeshStandardMaterial({ color: 0x8a8d91, roughness: 0.4, metalness: 0.8 }));
  m.scale.set(1, 0.42, 1.7); m.position.y = 0.011; g.add(m); return shadow(g);
}

// ------------------------------------------------------------------------------------------ wall treatment
function buildWallDetail(cfg) {
  const g = new THREE.Group(); g.name = 'WallDetail';
  const wz = cfg.scene.wallZ;
  const slatMat = new THREE.MeshStandardMaterial({ color: 0x2f2016, roughness: 0.6 }), slatGeo = new THREE.BoxGeometry(0.035, 3.0, 0.03);
  const backMat = new THREE.MeshStandardMaterial({ color: 0x1a1613, roughness: 0.9 });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(slatGeo, slatMat); m.position.set(side * (0.8 + i * 0.062), 1.45, wz + 0.016); m.castShadow = true; m.receiveShadow = true; g.add(m); }
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.062 * 12 + 0.02, 3.0, 0.004), backMat); back.position.set(side * (0.8 + 0.062 * 5.5), 1.45, wz + 0.002); g.add(back);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 3.0, 0.012), mat.brass()); strip.position.set(side * 0.74, 1.45, wz + 0.008); g.add(strip);
  }
  return g;
}
function buildSculpture(cfg) {
  const g = new THREE.Group(); g.name = 'Sculpture';
  const wz = cfg.scene.wallZ, x = -1.43;
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.17), new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.5 })); shelf.position.set(x, 1.12, wz + 0.095); shelf.castShadow = shelf.receiveShadow = true; g.add(shelf);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.004, 0.172), mat.brass()); edge.position.set(x, 1.1335, wz + 0.095); g.add(edge);
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.075, 0.016, 160, 18, 2, 3), mat.bronze()); knot.position.set(x, 1.25, wz + 0.095); knot.rotation.set(0.3, 0.4, 0); knot.castShadow = true; g.add(knot);
  const rnd = rng(3);
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.15 - i * 0.012, 0.022, 0.1), new THREE.MeshStandardMaterial({ color: [0xcbbfa5, 0x2f3b4d, 0x8f7a52][i], roughness: 0.85 }));
    b.position.set(-1.62 + 0.0, 1.1275 + 0.011 + i * 0.022, wz + 0.1); b.position.x = x + 0.17; b.rotation.y = (rnd() - 0.5) * 0.14; b.castShadow = true; g.add(b);
  }
  return g;
}

// ------------------------------------------------------------------------------------------ assemble
export function buildDecor(scene, { surface, CONFIG, onStatus }) {
  const root = new THREE.Group(); root.name = 'Decor'; scene.add(root);
  const failed = [];
  const surfY = (x, z) => { const s = surface?.at(x, z); return s && !s.open ? s.y : 0.9; };
  const place = (name, build, x, z, ry = 0, y = null) => {
    try { const o = build(); o.position.set(x, y ?? surfY(x, z), z); o.rotation.y = ry; root.add(o); }
    catch (e) { console.warn('Decor item failed:', name, e); failed.push(name); }
  };
  // desk top: the central tray and the receptionist's hand/forearm zone (|x| < 0.46) stay clear
  const aligned = (name, build, x, z, yaw = 0) => {      // sits flat on the counter, following the tray's slight slope
    try {
      const sf = surface?.at(x, z); if (!sf || sf.open) throw new Error('no surface');
      const o = build(); o.position.set(x, sf.y, z); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sf.n); o.rotateY(yaw); root.add(o);
    } catch (e) { console.warn(name + ' failed', e); failed.push(name); }
  };
  aligned('keyboard', buildKeyboard, 0.0, -0.005);
  aligned('mouse', buildMouse, -0.4, 0.02, 0.15);
  // monitor on the receptionist's left (screen right), angled about 40 degrees toward him - not toward the visitor
  place('monitor', buildMonitor, 0.68, -0.2, THREE.MathUtils.degToRad(40));
  place('orchid', buildOrchid, -0.8, -0.2, 0.4);
  place('tray', buildTray, 0.66, 0.3, 0);
  place('portfolio', buildPortfolio, -0.68, 0.12, 0.14);
  place('pen holder', buildPenHolder, -0.56, -0.36, 0);
  try { root.add(buildWallDetail(CONFIG)); } catch (e) { failed.push('wall detail'); }
  try { root.add(buildSculpture(CONFIG)); } catch (e) { failed.push('sculpture'); }
  place('floor plant', buildFloorPlant, 1.5, -1.12, 0.4, -0.045);
  onStatus?.(failed.length ? 'warn' : 'ok', failed.length ? 'Decor: missing ' + failed.join(', ') : 'Decor: monitor, keyboard, mouse, orchid, plant, desk accessories, sculpture');
  return root;
}
