import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** Image-based lighting generated locally (no HDR download) so the dark lacquer/metal desk reads properly. */
export function setupEnvironment(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  pmrem.dispose();
}

function noiseTexture(size = 256, strength = 10, base = [0, 0, 0]) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const img = g.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = 128 + (Math.random() - 0.5) * strength * 2;
    img.data[i * 4] = v + base[0]; img.data[i * 4 + 1] = v + base[1]; img.data[i * 4 + 2] = v + base[2]; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function buildRoom(scene, cfg) {
  const group = new THREE.Group(); group.name = 'Room';
  const wallZ = cfg.scene.wallZ;

  // Feature wall: warm plaster with a fine grain
  const bump = noiseTexture(256, 14); bump.repeat.set(6, 3);
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x8d867b, roughness: 0.95, metalness: 0, bumpMap: bump, bumpScale: 0.35 }),
  );
  wall.position.set(0, 1.7 - 0.045, wallZ - 0.012); wall.receiveShadow = true; wall.name = 'Wall';
  group.add(wall);

  // Architectural panel reveals (thin shadow gaps) every 1.2 m, centred so the middle panel frames the logo
  const revealMat = new THREE.MeshStandardMaterial({ color: 0x3a3733, roughness: 0.9 });
  for (let i = -3; i <= 3; i++) {
    if (i === 0) continue;
    const x = (i > 0 ? i - 0.5 : i + 0.5) * 1.2;
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.012, 3.3, 0.01), revealMat);
    r.position.set(x, 1.65 - 0.045, wallZ - 0.006); group.add(r);
  }

  // Skirting / shadow gap
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.02), new THREE.MeshStandardMaterial({ color: 0x1b1a19, roughness: 0.6 }));
  skirt.position.set(0, 0.0, wallZ - 0.002); group.add(skirt);

  // Floor: large-format honed stone
  const fbump = noiseTexture(256, 8); fbump.repeat.set(8, 8);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 7),
    new THREE.MeshStandardMaterial({ color: 0x77726a, roughness: 0.34, metalness: 0.0, bumpMap: fbump, bumpScale: 0.1 }),
  );
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.045, wallZ + 3.4); floor.receiveShadow = true; floor.name = 'Floor';
  group.add(floor);

  // Ceiling (barely visible, closes the room for lighting falloff)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(9, 7), new THREE.MeshStandardMaterial({ color: 0x2a2826, roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.3, wallZ + 3.4); group.add(ceil);

  scene.add(group);
  return group;
}

export function buildLights(scene, cfg) {
  const lights = new THREE.Group(); lights.name = 'Lights';
  const hemi = new THREE.HemisphereLight(0xe8eef7, 0x4a3f36, 0.35); lights.add(hemi);

  // Key: large soft light from front-right-above, the only shadow caster besides the face light
  const key = new THREE.DirectionalLight(0xfff1de, 2.1);
  key.position.set(1.9, 3.1, 2.8); key.target.position.set(0, 0.9, -0.3);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera; sc.left = -1.6; sc.right = 1.6; sc.top = 1.8; sc.bottom = -1.2; sc.near = 0.5; sc.far = 9;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 5;
  lights.add(key, key.target);

  // Face / fill: soft spot from the front-left so the face stays readable at every head angle
  const face = new THREE.SpotLight(0xfff6ea, 15, 8, THREE.MathUtils.degToRad(24), 0.85, 1.6);
  face.position.set(-0.9, 1.9, 2.7); face.target.position.set(0, 1.2, -0.25);
  lights.add(face, face.target);

  // Cool rim from behind-left to separate the hair/shoulders from the wall
  const rim = new THREE.SpotLight(0xdfe9ff, 16, 6, THREE.MathUtils.degToRad(30), 0.9, 1.5);
  rim.position.set(-1.1, 2.1, -0.6); rim.target.position.set(0, 1.15, -0.35);
  lights.add(rim, rim.target);

  // Wall washers: grade the wall and light the logo zone
  const wz = cfg.scene.wallZ;
  for (const sx of [-1, 1]) {
    const w = new THREE.SpotLight(0xffe9cf, 9, 5, THREE.MathUtils.degToRad(40), 1, 1.4);
    w.position.set(0.9 * sx, 2.35, wz + 1.1); w.target.position.set(0.15 * sx, 1.5, wz);
    lights.add(w, w.target);
  }
  scene.add(lights);
  return lights;
}

/**
 * Official logo on the wall. The supplied PNG was split (losslessly, pixel-for-pixel) into its 11 gold bars,
 * the TOP lettering and the ARCHITECTS + PARTNERS wordmark. They assemble once, then rest as the exact artwork:
 * unlit + not tone-mapped = official colours, no frame, no backing, no glow, no shadow at rest.
 * If the piece files fail to load, the complete artwork is shown statically instead.
 */
export function buildLogoPlaque(scene, cfg, onStatus) {
  const L = cfg.logo, group = new THREE.Group(); group.name = 'LogoPlaque'; group.position.set(...L.position); scene.add(group);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let played = false; try { played = sessionStorage.getItem('topLogoPlayed') === '1'; } catch { /* storage blocked */ }
  const skipAnim = reduced || played;
  const ease = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
  const loader = new THREE.TextureLoader();
  const tex = (url) => new Promise((res, rej) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; res(t); }, undefined, rej));
  const basic = (map, color = 0xffffff) => new THREE.MeshBasicMaterial({ map, color, transparent: true, depthWrite: false, toneMapped: false });

  const showStatic = () => {
    tex(L.url).then((t) => {
      const asp = t.image.width / t.image.height, m = basic(t);
      const f = new THREE.Mesh(new THREE.PlaneGeometry(L.height * asp, L.height), m); f.renderOrder = 2; group.add(f);
      onStatus?.('ok', 'Logo: official artwork loaded (static)');
    }).catch(() => onStatus?.('err', 'Logo: FAILED to load ' + L.url));
  };

  const pieces = [];
  let clock = 0, started = false, total = 0, done = false;
  fetch(L.url.replace(/top-logo\.png$/, 'pieces.json')).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(async (man) => {
      const u = L.height / man.height;
      const texs = await Promise.all(man.pieces.map((p) => tex('/' + p.file.replace(/^assets\//, ''))));          // load all pieces in parallel
      for (const [i, p] of man.pieces.entries()) {
        const t = texs[i], g = new THREE.PlaneGeometry(p.w * u, p.h * u);
        const x = (p.x + p.w / 2 - man.width / 2) * u, y = -(p.y + p.h / 2 - man.height / 2) * u;
        const mesh = new THREE.Mesh(g, basic(t)); mesh.position.set(x, y, 0); mesh.renderOrder = 2;
        const sh = new THREE.Mesh(g, basic(t, 0x000000)); sh.position.set(x, y, -0.004); sh.renderOrder = 1; sh.material.opacity = 0;
        group.add(sh, mesh); pieces.push({ ...p, mesh, sh, x0: x, y0: y });
      }
      // timeline: bars centre-out, pause, TOP rises in, then the wordmark
      const bars = pieces.filter((p) => p.kind === 'bar');
      bars.forEach((p) => { p.t0 = 0.3 + p.order * 0.2; p.dur = 1.0; });
      const barsEnd = Math.max(...bars.map((p) => p.t0 + p.dur));
      const top = pieces.find((p) => p.kind === 'top'), name = pieces.find((p) => p.kind === 'name');
      if (top) { top.t0 = barsEnd + 0.45; top.dur = 0.9; }
      if (name) { name.t0 = (top ? top.t0 + top.dur : barsEnd) + 0.25; name.dur = 0.9; }
      total = Math.max(...pieces.map((p) => p.t0 + p.dur));
      if (skipAnim) { clock = total + 1; apply(); done = true; } else { apply(); }
      started = true;
      onStatus?.('ok', 'Logo: official artwork loaded' + (skipAnim ? '' : ' (assembling)'));
    }).catch((e) => { console.warn('logo pieces unavailable, using static artwork', e); showStatic(); });

  const apply = () => {
    for (const p of pieces) {
      const e = ease((clock - p.t0) / p.dur), m = p.mesh;
      const op = Math.min(1, e * 2.2);
      m.material.opacity = op;
      if (p.kind === 'bar') {                                   // rise into place from slightly below, in front of the wall
        m.position.set(p.x0, p.y0 - 0.07 * (1 - e), 0.09 * (1 - e));
        p.sh.position.set(p.x0 + 0.012 * (1 - e), p.y0 - 0.07 * (1 - e) - 0.014 * (1 - e), -0.004);
        p.sh.material.opacity = 0.22 * (1 - e) * Math.min(1, op * 1.5);
      } else {                                                   // lettering: opacity + small upward drift
        m.position.set(p.x0, p.y0 - 0.025 * (1 - e), 0); p.sh.material.opacity = 0;
      }
      m.visible = op > 0.001; p.sh.visible = p.sh.material.opacity > 0.001;
    }
  };
  group.userData.tick = (dt) => {
    if (!started || done) return;
    clock += Math.min(dt, 0.1); apply();
    if (clock >= total) { done = true; for (const p of pieces) { p.mesh.material.opacity = 1; p.mesh.position.set(p.x0, p.y0, 0); p.sh.visible = false; } try { sessionStorage.setItem('topLogoPlayed', '1'); } catch { /* none */ } }
  };
  group.userData.finish = () => { if (!started) return; clock = total + 1; apply(); done = true; for (const p of pieces) { p.mesh.material.opacity = 1; p.mesh.position.set(p.x0, p.y0, 0); p.sh.visible = false; } };
  group.userData.pieces = pieces; group.userData.isDone = () => done;
  return group;
}

/** Simple high-back task chair, only the back is visible above the desk. */
export function buildChair(cfg) {
  const s = cfg.scene;
  const g = new THREE.Group(); g.name = 'Chair';
  const shape = new THREE.Shape(); const w = 0.50, h = 0.62, r = 0.09;
  shape.moveTo(-w / 2 + r, -h / 2); shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 4, curveSegments: 10 });
  const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1a1918, roughness: 0.78, metalness: 0.0, envMapIntensity: 0.25 }));
  back.castShadow = true; back.receiveShadow = true;
  back.position.set(0, s.seatHeight + 0.43, s.characterZ - 0.17);
  back.rotation.x = -0.10;
  g.add(back);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.3 }));
  post.position.set(0, s.seatHeight - 0.2, s.characterZ - 0.05); g.add(post);
  return g;
}
