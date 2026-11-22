import * as THREE from 'three';
import { rng, M, box, cyl, ground, plane, tree, shrubs, facadeTex, skyDome } from './lib.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const SKY = {
  dusk:   { top: 0x6f8fb8, mid: 0xcbbfb8, hor: 0xf3d2ae, sun: V(-0.45, 0.34, 0.8), sunCol: 0xffd2a0, sunI: 3.4, sunColor: 0xffd2a4, hemi: 1.5, exp: 1.0, fog: 0xe6d3be },
  day:    { top: 0x86aad0, mid: 0xcfdce6, hor: 0xf1ece2, sun: V(0.6, 0.75, 0.5), sunCol: 0xfff2d8, sunI: 3.4, sunColor: 0xfff0d6, hemi: 1.6, exp: 1.0, fog: 0xe9e8e2 },
  golden: { top: 0x7fa0c6, mid: 0xe9d9c3, hor: 0xf6d9b0, sun: V(0.8, 0.42, 0.45), sunCol: 0xffd6a2, sunI: 3.6, sunColor: 0xffdcb0, hemi: 1.4, exp: 1.0, fog: 0xeedfc6 },
  soft:   { top: 0xb9c6d2, mid: 0xdcdcd6, hor: 0xece7dd, sun: V(0.3, 0.7, 0.7), sunCol: 0xffffff, sunI: 2.2, sunColor: 0xfff5e6, hemi: 1.7, exp: 1.0, fog: 0xe9e6df },
};

function lighting(scene, k, shadowSize = 120, fogNear = 80, fogFar = 600) {
  const s = SKY[k];
  scene.add(skyDome(s.top, s.mid, s.hor, s.sun, s.sunCol));
  const sun = new THREE.DirectionalLight(s.sunColor, s.sunI);
  sun.position.copy(s.sun.clone().normalize().multiplyScalar(200)); sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  const c = sun.shadow.camera; c.left = c.bottom = -shadowSize; c.right = c.top = shadowSize; c.near = 10; c.far = 500;
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.05; sun.shadow.radius = 4;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(s.top, 0x8a8068, s.hemi));
  scene.fog = new THREE.Fog(s.fog, fogNear, fogFar);
  return s;
}

// ---------------------------------------------------------------- scenes
const S = {};

S.villa = (scene, cam) => {
  const sky = lighting(scene, cam.sky || 'dusk', 60, 70, 400); const g = new THREE.Group(); scene.add(g);
  ground(g, 600);
  box(g, 34, 0.4, 20, 0, -0.4, 2, M.paving);                                   // terrace
  const glowIn = new THREE.MeshStandardMaterial({ color: 0xffe2b8, emissive: 0xffb25c, emissiveIntensity: 1.1, roughness: 0.8 });
  box(g, 13.6, 3.0, 7.6, -3, 0, -0.5, glowIn, { cast: false });               // lit interior
  box(g, 14, 3.1, 8, -3, 0, -0.5, M.glass, { cast: false });                    // glazing
  for (let i = 0; i <= 14; i++) box(g, 0.08, 3.1, 0.12, -10 + i, 0, 3.55, M.charcoal);   // mullions
  box(g, 17, 0.38, 11, -2, 3.1, -0.5, M.limestone, { edge: 0.35 });             // roof slab
  box(g, 12, 3.3, 6.2, 3.6, 3.48, -1, M.plaster, { edge: 0.4 });                // cantilevered upper volume
  box(g, 7.5, 0.18, 0.1, 3.0, 4.6, 2.12, M.glassDark);                          // ribbon window
  box(g, 7.5, 1.9, 0.08, 2.4, 4.2, 2.13, M.glass, { cast: false });
  for (let i = 0; i < 26; i++) box(g, 0.07, 3.3, 0.14, 7.6 + i * 0.16, 3.48, 2.2, M.timber);  // slatted screen
  box(g, 0.5, 3.1, 7.6, 6.2, 0, -0.5, M.concrete, { edge: 0.3 });                // stone fin wall
  box(g, 10, 2.2, 0.4, -14, 0, -4, M.charcoal, { edge: 0.3 });                   // garden wall
  box(g, 0.5, 3.4, 0.5, 9.8, 0, 3.5, M.charcoal);                                // support
  // pool
  box(g, 18, 0.1, 5.2, -1, -0.45, 9.5, M.concrete); plane(g, 17.2, 4.6, -1, -0.28, 9.5, M.pool);
  for (let i = 0; i < 4; i++) box(g, 2.0, 0.28, 0.7, -5 + i * 2.6, 0, 13.4, M.timber);
  // lights
  const pl = new THREE.PointLight(0xffb870, 120, 40, 1.6); pl.position.set(-3, 1.8, 0); scene.add(pl);
  const pl2 = new THREE.PointLight(0xffb870, 90, 30, 1.6); pl2.position.set(5, 5, 0.5); scene.add(pl2);
  const R = rng(5);
  for (let i = 0; i < 26; i++) tree(g, -40 + R() * 80, -14 - R() * 30, 7 + R() * 6, 0.9, i);
  for (let i = 0; i < 8; i++) tree(g, 20 + R() * 14, -8 - R() * 6, 6 + R() * 6, 1, i + 40);
  for (let i = 0; i < 5; i++) tree(g, -28 - R() * 10, -6 - R() * 8, 6 + R() * 5, 1, i + 80);
  shrubs(g, -4, 14.6, 20, 1.6, 12, 4);
  return sky;
};

S.tower = (scene, cam) => {
  const sky = lighting(scene, cam.sky || 'day', 140, 100, 700); const g = new THREE.Group(); scene.add(g);
  ground(g, 900, M.paving);
  const ft = facadeTex(8, 36, { lit: 0.12, seed: 4 });
  const mat = new THREE.MeshStandardMaterial({ map: ft.map, emissiveMap: ft.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.12, metalness: 0.85 });
  const mats = [mat, mat, new THREE.MeshStandardMaterial({ color: 0x8a8379 }), new THREE.MeshStandardMaterial({ color: 0x8a8379 }), mat, mat];
  const N = 20;
  for (let i = 0; i < N; i++) {
    const sc = 1 - i * 0.012, h = 6;
    const b = new THREE.Mesh(new THREE.BoxGeometry(24 * sc, h + 0.05, 24 * sc), mats); b.position.set(0, i * h + h / 2, 0); b.rotation.y = i * 0.04; b.castShadow = b.receiveShadow = true; g.add(b);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(24.4 * sc, 0.35, 24.4 * sc), M.limestone); slab.position.set(0, i * h, 0); slab.rotation.y = i * 0.04; slab.castShadow = true; g.add(slab);
  }
  const top = box(g, 14, 6, 14, 0, N * 6, 0, M.charcoal); top.rotation.y = N * 0.04;
  const sib = new THREE.MeshStandardMaterial({ map: ft.map.clone(), emissiveMap: ft.emissiveMap.clone(), emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.15, metalness: 0.8 });
  box(g, 20, 78, 20, 44, 0, -14, sib, { edge: 0.2 });
  box(g, 16, 52, 16, -40, 0, -26, sib, { edge: 0.2 });
  box(g, 64, 12, 34, 16, 0, 40, M.limestone, { edge: 0.3 });                        // podium
  for (let i = 0; i < 40; i++) box(g, 0.5, 12, 1.2, -14 + i * 1.6, 0, 57.3, M.concrete);   // stone fins
  box(g, 64, 0.5, 36, 16, 12, 40, M.charcoal);
  const R = rng(8); for (let i = 0; i < 16; i++) tree(g, -60 + R() * 40, 66 + R() * 30, 7 + R() * 4, 1, i);
  for (let i = 0; i < 6; i++) tree(g, -45 + i * 8, 52, 8, 1, i + 50);
  plane(g, 40, 8, -8, 0.05, 58, M.water);
  return sky;
};

S.civic = (scene, cam) => {
  const sky = lighting(scene, cam.sky || 'golden', 110, 120, 700); const g = new THREE.Group(); scene.add(g);
  ground(g, 800, M.paving);
  box(g, 80, 1.6, 54, 0, 0, 0, M.concrete);                                          // podium
  for (let i = 0; i < 5; i++) box(g, 44 + i * 0, 0.32, 1.2, 0, i * 0.32, 31 + (4 - i) * 1.2, M.limestone);  // stairs
  const inner = new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffb560, emissiveIntensity: 0.9 });
  box(g, 40, 9, 17, 0, 1.6, 2, inner, { cast: false }); box(g, 41, 9, 18, 0, 1.6, 2, M.glass, { cast: false });
  box(g, 58, 1.4, 34, 0, 11.4, 4, M.limestone, { edge: 0.4 });                         // floating roof
  box(g, 58, 0.4, 34.4, 0, 12.8, 4, M.charcoal);
  for (let i = 0; i < 13; i++) cyl(g, 0.38, 9.8, -26 + i * 4.33, 1.6, 15, M.limestone, 20);   // colonnade
  box(g, 16, 17, 24, -30, 1.6, -6, M.limestone, { edge: 0.4 });                         // east wing
  box(g, 16, 17, 24, 30, 1.6, -6, M.limestone, { edge: 0.4 });
  for (const sx of [-30, 30]) for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    box(g, 2.6, 2.6, 0.5, sx - 5 + c * 5, 3.6 + r * 3.7, 6.3, M.glassDark); box(g, 3.2, 0.25, 0.9, sx - 5 + c * 5, 6.4 + r * 3.7, 6.3, M.limestone);
  }
  box(g, 8, 26, 8, 0, 1.6, -18, M.limestone, { edge: 0.4 });                            // tower
  plane(g, 40, 6, 0, 0.06, 48, M.water);
  const R = rng(3); for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) { tree(g, -36 + i * 14.4, 58 + j * 12, 8, 1, i * 3 + j); }
  for (let i = 0; i < 20; i++) tree(g, 50 + R() * 40, -20 + R() * 80, 8 + R() * 3, 1, i + 30), tree(g, -50 - R() * 40, -20 + R() * 80, 8 + R() * 3, 1, i + 70);
  return sky;
};

S.interior = (scene, cam) => {
  const sky = lighting(scene, 'soft', 25, 60, 300); const g = new THREE.Group(); scene.add(g);
  scene.fog = null;
  const wood = new THREE.MeshStandardMaterial({ color: 0xa88a64, roughness: 0.5 });
  box(g, 16, 0.3, 11, 0, -0.3, 0, wood);                                             // floor
  box(g, 16, 0.3, 11, 0, 6, 0, M.plaster);                                           // ceiling
  for (let i = 0; i < 40; i++) box(g, 0.1, 0.18, 11, -7.8 + i * 0.4, 5.8, 0, M.timber);
  box(g, 0.3, 6, 11, -8, 0, 0, M.plaster); box(g, 0.3, 6, 11, 8, 0, 0, M.limestone); box(g, 16, 6, 0.3, 0, 0, 5.5, M.plaster);
  box(g, 16, 6, 0.3, 0, 0, -5.5, M.glass, { cast: false });                          // glazed back wall
  for (let i = 0; i <= 8; i++) box(g, 0.07, 6, 0.14, -8 + i * 2, 0, -5.45, M.charcoal);
  box(g, 16, 0.07, 0.14, 0, 3.0, -5.45, M.charcoal);
  // exterior
  const eg = new THREE.Group(); eg.position.z = -8; scene.add(eg);
  plane(eg, 200, 120, 0, -0.35, -50, M.lawn); const R = rng(2);
  for (let i = 0; i < 18; i++) tree(eg, -30 + R() * 60, -4 - R() * 40, 7 + R() * 7, 1.3, i);
  plane(eg, 14, 5, 0, -0.3, -2, M.water);
  // stair along left wall
  for (let i = 0; i < 16; i++) box(g, 1.3, 0.12, 0.34, -7.6 + 0.0, 0.3 + i * 0.2, 4.7 - i * 0.62, M.timber, { edge: 0.2 });
  box(g, 4, 0.3, 4.2, -6, 3.4, -3.5, M.plaster, { edge: 0.2 });
  box(g, 0.04, 1.0, 9.6, -6.9, 0.4, 0.4, M.glass, { cast: false }); 
  // fireplace + art
  box(g, 5, 2.2, 0.5, 5.3, 0, 5.1, M.charcoal); box(g, 3.6, 0.1, 0.05, 5.3, 1.0, 4.83, M.glow);
  box(g, 2.8, 2.2, 0.06, 5.3, 2.8, 5.3, new THREE.MeshStandardMaterial({ color: 0x8b6b45, roughness: 0.9 }));
  // furniture
  const fab = new THREE.MeshStandardMaterial({ color: 0xcfc6b6, roughness: 1 }), dark = new THREE.MeshStandardMaterial({ color: 0x3a3733, roughness: 0.9 });
  box(g, 5.4, 0.04, 3.8, 1.5, 0, 1.2, new THREE.MeshStandardMaterial({ color: 0xdad3c4, roughness: 1 }));
  box(g, 3.6, 0.5, 1.1, 1.4, 0.04, 3.4, fab); box(g, 3.6, 0.5, 0.3, 1.4, 0.5, 3.9, fab);
  box(g, 1.1, 0.5, 2.6, -1.2, 0.04, 1.3, fab); box(g, 1.1, 0.5, 2.6, 4.1, 0.04, 1.3, dark);
  box(g, 1.8, 0.38, 1.0, 1.4, 0.04, 1.2, M.concrete); cyl(g, 0.02, 2.1, -2.5, 0, 3.4, M.bronze); 
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 12), M.glow); lamp.position.set(-2.5, 2.2, 3.4); g.add(lamp);
  for (let i = 0; i < 3; i++) { cyl(g, 0.01, 2.6, -1 + i * 2, 3.4, -0.5, M.charcoal, 6); const p = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 12), M.glow); p.position.set(-1 + i * 2, 3.3, -0.5); g.add(p); }
  const dt = box(g, 2.6, 0.06, 1.1, 1.0, 0.72, -2.8, M.timber); for (const dx of [-1.15, 1.15]) for (const dz of [-0.4, 0.4]) box(g, 0.06, 0.72, 0.06, 1.0 + dx, 0, -2.8 + dz, M.charcoal);
  for (let i = 0; i < 4; i++) box(g, 0.45, 0.45, 0.45, -0.2 + i * 0.75, 0, -1.9, dark);
  const w1 = new THREE.PointLight(0xffc27a, 40, 14, 1.6); w1.position.set(1, 3, 1); scene.add(w1);
  const w2 = new THREE.PointLight(0xffc27a, 25, 10, 1.6); w2.position.set(5, 1.2, 4); scene.add(w2);
  const key = scene.children.find((c) => c.isDirectionalLight); key.position.set(10, 40, -60); key.intensity = 3.4; key.shadow.camera.far = 400; key.target.position.set(0, 0, 0); scene.add(key.target);
  return sky;
};

S.landscape = (scene, cam) => {
  const sky = lighting(scene, cam.sky || 'golden', 70, 80, 400); const g = new THREE.Group(); scene.add(g);
  ground(g, 600);
  for (let i = 0; i < 7; i++) box(g, 36 - i * 1.2, 0.5, 4, 0, i * 0.5, -10 - i * 4, M.limestone, { edge: 0.25 });   // terraces
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 0.2, 64), M.water); pond.scale.set(1.5, 1, 0.8); pond.position.set(0, 0.02, 6); pond.receiveShadow = true; g.add(pond);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(14, 0.25, 8, 64), M.limestone); rim.rotation.x = Math.PI / 2; rim.scale.set(1.5, 0.8, 1); rim.position.set(0, 0.12, 6); g.add(rim);
  for (let i = 0; i < 9; i++) box(g, 1.6, 0.18, 1.6, -9 + i * 2.3, 0, 6 + Math.sin(i * 0.9) * 3.5, M.concrete);        // stepping stones
  // pavilion
  box(g, 12, 0.35, 12, 0, 0, -6, M.concrete);
  for (const [x, z] of [[-5, -11], [5, -11], [-5, -1], [5, -1], [0, -11], [0, -1]]) box(g, 0.28, 4.2, 0.28, x, 0.35, z, M.bronze);
  box(g, 15, 0.38, 15, 0, 4.55, -6, M.timber, { edge: 0.3 });
  for (let i = 0; i < 30; i++) box(g, 0.1, 0.5, 15, -7 + i * 0.5, 4.9, -6, M.charcoal);
  box(g, 6, 0.5, 1, 0, 0.35, -9, M.timber);
  const R = rng(12);
  for (let i = 0; i < 46; i++) { const x = -60 + R() * 120, z = -50 + R() * 90; if (Math.abs(x) < 24 && z > -18 && z < 18) continue; if (x < -4 && z > 12) continue; tree(g, x, z, 6 + R() * 9, 1.1, i); }
  for (let i = 0; i < 10; i++) shrubs(g, 10 + R() * 40, 14 + R() * 20, 12, 8, 7, i + 3);
  for (let i = 0; i < 14; i++) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 6, 6), new THREE.MeshStandardMaterial({ color: 0xe9e4da })); const x = 16 + R() * 14, z = 8 + R() * 10; t.position.set(x, 3, z); t.castShadow = true; g.add(t); const f = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 1), new THREE.MeshStandardMaterial({ color: 0x9bab70, flatShading: true })); f.position.set(x, 6.2, z); f.castShadow = true; g.add(f); }
  return sky;
};

S.facade = (scene, cam) => {
  const sky = lighting(scene, 'golden', 30, 100, 400); const g = new THREE.Group(); scene.add(g);
  ground(g, 200, M.paving);
  box(g, 30, 22, 0.4, 0, 0, -1.6, M.glass); box(g, 30, 22, 0.3, 0, 0, -2.2, new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffa850, emissiveIntensity: 0.5 }), { cast: false });
  for (let i = 0; i < 6; i++) box(g, 30.6, 0.5, 2.6, 0, 3.6 * (i + 1) - 0.4, -0.2, M.bronze);                  // bronze slabs
  for (let i = 0; i < 34; i++) box(g, 0.28, 22, 0.9, -14.85 + i * 0.9, 0, 1.4, M.limestone);                    // fins
  box(g, 30, 0.5, 4, 0, 0, 0.8, M.concrete);
  
  const key = scene.children.find((c) => c.isDirectionalLight); key.position.set(80, 30, 40);
  return sky;
};

S.resort = (scene, cam) => {
  const sky = lighting(scene, 'golden', 110, 120, 700); const g = new THREE.Group(); scene.add(g);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1500), new THREE.MeshStandardMaterial({ color: 0x4f7f8c, roughness: 0.06, metalness: 0.7 })); sea.rotation.x = -Math.PI / 2; sea.position.y = -3; g.add(sea);
  const R = rng(9);
  for (let i = 0; i < 9; i++) box(g, 110, 3.2, 28, 0, -3 + i * 3.2, -34 + i * 8 * -1 + 60 - i * 0, M.lawn).position.z = 20 - i * 12;   // terraces climbing back
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
    const x = -44 + j * 28 + (i % 2) * 10, y = -3 + (i + 1) * 3.2, z = 20 - i * 12 + 6;
    box(g, 12, 3, 8, x, y, z, M.plaster, { edge: 0.25 }); box(g, 14, 0.4, 10, x, y + 3, z, M.timber); box(g, 10, 2.4, 0.2, x, y, z + 4.05, M.glass, { cast: false });
    box(g, 8, 0.1, 4, x + 2, y - 0.05, z + 8, M.pool);
    box(g, 0.6, 0.7, 0.6, x + 8, y, z + 4, M.concrete);
    if (R() < 0.8) tree(g, x - 7, z + 4, 8, 0.8, i * 7 + j);
  }
  for (let i = 0; i < 40; i++) tree(g, -80 + R() * 160, -60 + R() * 20, 9, 1.3, i + 50, 20);
  return sky;
};

S.campus = (scene, cam) => {
  const sky = lighting(scene, 'soft', 90, 100, 500); const g = new THREE.Group(); scene.add(g);
  ground(g, 600, M.lawn); box(g, 100, 0.3, 100, 0, -0.3, 0, M.paving);
  const ring = [[0, -30, 80, 18], [0, 30, 80, 18], [-31, 0, 18, 42], [31, 0, 18, 42]];
  for (const [x, z, w, d] of ring) {
    box(g, w, 11, d, x, 0, z, M.limestone, { edge: 0.25 });
  }
  // glazed inner faces + brise-soleil
  const gl = (x, z, w, d, ry = 0) => { const m = box(g, w, 9, d, x, 0.6, z, M.glass, { cast: false }); m.rotation.y = ry; };
  gl(0, -20.7, 62, 0.3); gl(0, 20.7, 62, 0.3); gl(-21.7, 0, 0.3, 34); gl(21.7, 0, 0.3, 34);
  for (let r = 0; r < 4; r++) { box(g, 62, 0.2, 2.2, 0, 2.6 + r * 2.4, -21.8, M.bronze); box(g, 62, 0.2, 2.2, 0, 2.6 + r * 2.4, 21.8, M.bronze); box(g, 2.2, 0.2, 34, -22.8, 2.6 + r * 2.4, 0, M.bronze); box(g, 2.2, 0.2, 34, 22.8, 2.6 + r * 2.4, 0, M.bronze); }
  for (let i = 0; i < 24; i++) box(g, 0.3, 11, 0.6, -33 + i * 2.9, 0, -20.2, M.charcoal);
  plane(g, 5, 36, 0, 0.02, 0, M.water); box(g, 5, 0.12, 36, 0, 0, 0, M.water).scale.y = 0.2;
  const R = rng(4); for (let i = 0; i < 12; i++) tree(g, -16 + R() * 32, -14 + R() * 20, 7 + R() * 4, 1.1, i);
  for (let i = 0; i < 14; i++) box(g, 3, 0.5, 0.6, -18 + (i % 7) * 6, 0, i < 7 ? -10 : 10, M.timber);
  for (let i = 0; i < 20; i++) tree(g, -70 + R() * 140, 60 + R() * 40, 8, 1.2, i + 20);
  return sky;
};

S.model = (scene, cam) => {
  const sky = lighting(scene, 'soft', 3, 20, 80); scene.fog = null; scene.background = new THREE.Color(0x26231f);
  scene.children.forEach((c) => { if (c.isMesh && c.material.isShaderMaterial) c.visible = false; });
  const key = scene.children.find((c) => c.isDirectionalLight); key.position.set(-3, 3, 2.5); key.intensity = 3.2; key.shadow.camera.left = key.shadow.camera.bottom = -3; key.shadow.camera.right = key.shadow.camera.top = 3; key.shadow.camera.near = 0.5; key.shadow.camera.far = 20; key.color.set(0xffe8c8);
  const g = new THREE.Group(); scene.add(g);
  const table = new THREE.Mesh(new THREE.BoxGeometry(6, 0.1, 3), new THREE.MeshStandardMaterial({ color: 0xa7835a, roughness: 0.55 })); table.position.y = -0.05; table.receiveShadow = true; g.add(table);
  const card = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.95 });
  box(g, 1.5, 0.03, 1.1, 0, 0, 0, new THREE.MeshStandardMaterial({ color: 0xcfc4ae, roughness: 1 }));
  for (let i = 0; i < 5; i++) box(g, 1.3 - i * 0.2, 0.02, 0.9 - i * 0.14, 0, 0.03 + i * 0.02, 0, new THREE.MeshStandardMaterial({ color: 0xe6dcc6 }));
  const R = rng(6);
  const vols = [[-0.35, 0.12, 0.3, 0.22, 0.28], [0.1, 0.12, 0.15, 0.2, 0.34], [0.4, 0.11, 0.1, 0.36, 0.14], [-0.15, 0.11, -0.2, 0.5, 0.1], [0.3, 0.1, -0.2, 0.18, 0.22]];
  for (const [x, y, z, w, h] of vols) box(g, w, h, w * 0.8, x, y, z, card, { edge: 0.35 });
  box(g, 0.7, 0.012, 0.3, 0.0, 0.46, 0.1, card);
  for (let i = 0; i < 30; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.02 + R() * 0.02, 1), new THREE.MeshStandardMaterial({ color: 0x95a074, flatShading: true })); s.position.set((R() - 0.5) * 1.3, 0.1, 0.3 + R() * 0.2 - 0.1); g.add(s); }
  box(g, 0.012, 0.012, 0.6, 1.2, 0, 0.5, new THREE.MeshStandardMaterial({ color: 0xd7a73c })).rotation.y = 0.3;
  box(g, 0.5, 0.004, 0.35, -1.4, 0, 0.3, card).rotation.y = 0.2;
  return sky;
};

export function build(name, scene, cam) {
  const fn = S[cam.scene]; if (!fn) throw new Error('unknown scene ' + cam.scene);
  return fn(scene, cam);
}
