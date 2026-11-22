import * as THREE from 'three';
export const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
export const M = {
  limestone: new THREE.MeshStandardMaterial({ color: 0xd9d0c0, roughness: 0.88 }),
  plaster:   new THREE.MeshStandardMaterial({ color: 0xece7dc, roughness: 0.92 }),
  concrete:  new THREE.MeshStandardMaterial({ color: 0xb3aea4, roughness: 0.95 }),
  charcoal:  new THREE.MeshStandardMaterial({ color: 0x2e2d2b, roughness: 0.6, metalness: 0.2 }),
  bronze:    new THREE.MeshStandardMaterial({ color: 0x8c6b40, roughness: 0.38, metalness: 0.85 }),
  timber:    new THREE.MeshStandardMaterial({ color: 0x9c7a52, roughness: 0.7 }),
  paving:    new THREE.MeshStandardMaterial({ color: 0xc7c0b2, roughness: 0.9 }),
  lawn:      new THREE.MeshStandardMaterial({ color: 0x8b9170, roughness: 1 }),
  road:      new THREE.MeshStandardMaterial({ color: 0x4a4947, roughness: 0.95 }),
  water:     new THREE.MeshStandardMaterial({ color: 0x3f6670, roughness: 0.04, metalness: 0.75 }),
  pool:      new THREE.MeshStandardMaterial({ color: 0x5da3a8, roughness: 0.05, metalness: 0.5 }),
  glass:     new THREE.MeshStandardMaterial({ color: 0x4f6a75, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.55 }),
  glassDark: new THREE.MeshStandardMaterial({ color: 0x2c3f49, roughness: 0.05, metalness: 0.95 }),
  glow:      new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb866, emissiveIntensity: 1.5, roughness: 0.6 }),
};
export function box(g, w, h, d, x, y, z, mat, o = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);              // y is the base of the box
  m.castShadow = o.cast ?? true; m.receiveShadow = true;
  if (o.ry) m.rotation.y = o.ry;
  g.add(m);
  if (o.edge) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x2b2722, transparent: true, opacity: o.edge })); e.position.copy(m.position); e.rotation.copy(m.rotation); g.add(e); }
  return m;
}
export function cyl(g, r, h, x, y, z, mat, seg = 16) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); return m; }
export function ground(g, size, mat = M.lawn, y = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true; g.add(m); return m; }
export function plane(g, w, d, x, y, z, mat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m; }

const GREENS = [0x6f7d58, 0x7b8a62, 0x5f6f4f, 0x869468, 0x68784e, 0x93a073];
export function tree(g, x, z, h = 7, r = 1, seed = 1, y0 = 0) {
  const R = rng(seed * 7919 + Math.floor(x * 13 + z * 31));
  const t = new THREE.Group(); t.position.set(x, y0, z);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * r, 0.16 * r, h * 0.55, 6), new THREE.MeshStandardMaterial({ color: 0x5a4a3a, roughness: 1 }));
  trunk.position.y = h * 0.27; trunk.castShadow = true; t.add(trunk);
  const n = 3 + Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const s = (0.5 + R() * 0.45) * h * 0.34 * r;
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 2), new THREE.MeshStandardMaterial({ color: GREENS[Math.floor(R() * GREENS.length)], roughness: 1 }));
    f.position.set((R() - 0.5) * h * 0.3 * r, h * (0.58 + R() * 0.3), (R() - 0.5) * h * 0.3 * r);
    f.castShadow = true; f.receiveShadow = true; t.add(f);
  }
  g.add(t); return t;
}
export function shrubs(g, cx, cz, w, d, n, seed, y0 = 0) {
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const s = 0.4 + R() * 0.7;
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), new THREE.MeshStandardMaterial({ color: GREENS[Math.floor(R() * GREENS.length)], roughness: 1, flatShading: true }));
    m.scale.y = 0.6; m.position.set(cx + (R() - 0.5) * w, y0 + s * 0.45, cz + (R() - 0.5) * d); m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
}
/** Curtain-wall texture: mullion grid + subtly varied panes; returns {map, emissiveMap} */
export function facadeTex(cols, rows, { lit = 0.2, seed = 3, tint = [90, 118, 132], mullion = '#2d2c2a', warm = true } = {}) {
  const R = rng(seed), cw = 32, ch = 40, W = cols * cw, H = rows * ch;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const a = mk(), b = mk(), ga = a.getContext('2d'), gb = b.getContext('2d');
  gb.fillStyle = '#000'; gb.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = (R() - 0.5) * 26, sk = 0.5 + 0.5 * (r / rows);
    ga.fillStyle = `rgb(${tint[0] + v + 30 * sk},${tint[1] + v + 26 * sk},${tint[2] + v + 22 * sk})`; ga.fillRect(c * cw, r * ch, cw, ch);
    if (R() < lit) { gb.fillStyle = warm ? `rgb(${210 + R() * 40},${150 + R() * 40},${80 + R() * 30})` : '#bcd'; gb.fillRect(c * cw + 2, r * ch + 2, cw - 4, ch - 4); }
  }
  ga.strokeStyle = mullion; ga.lineWidth = 3;
  for (let c = 0; c <= cols; c++) { ga.beginPath(); ga.moveTo(c * cw, 0); ga.lineTo(c * cw, H); ga.stroke(); }
  for (let r = 0; r <= rows; r++) { ga.lineWidth = r % 4 === 0 ? 5 : 2; ga.beginPath(); ga.moveTo(0, r * ch); ga.lineTo(W, r * ch); ga.stroke(); }
  const t1 = new THREE.CanvasTexture(a), t2 = new THREE.CanvasTexture(b);
  for (const t of [t1, t2]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return { map: t1, emissiveMap: t2 };
}
export function skyDome(top, mid, hor, sunDir, sunCol = 0xffd9a8) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(top) }, mid: { value: new THREE.Color(mid) }, hor: { value: new THREE.Color(hor) }, sun: { value: sunDir.clone().normalize() }, sc: { value: new THREE.Color(sunCol) } },
    vertexShader: 'varying vec3 v; void main(){ v = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec3 v; uniform vec3 top,mid,hor,sun,sc; void main(){ float h = clamp(v.y,-0.2,1.); vec3 c = mix(hor, mid, smoothstep(0.0,0.35,h)); c = mix(c, top, smoothstep(0.3,1.0,h)); float s = max(dot(normalize(v),sun),0.); c += sc*(pow(s,6.)*0.35 + pow(s,64.)*0.5 + pow(s,800.)*2.); gl_FragColor = vec4(c,1.); }',
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat); m.renderOrder = -1; return m;
}
