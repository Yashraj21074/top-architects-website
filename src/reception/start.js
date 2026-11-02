import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';
import { setupEnvironment, buildRoom, buildLights, buildLogoPlaque, buildChair } from './environment.js';
import { BodyMotion } from './bodyMotion.js';
import { InputManager } from './input.js';
import { buildDecor } from './decor.js';
import { discoverRig, validateRig, applySeatedPose, prepareCharacterMaterials } from './character.js';
import { HeadTracker } from './headTracker.js';
import { Story } from './story.js';
import { currentTheme } from '../lib/theme.js';
import { computeFrame } from './framing.js';

/**
 * Mounts the 3D reception on `canvas` (the story overlay DOM must already be rendered).
 * Resolves with { dispose, story } once both models are in the scene; rejects if WebGL or both models fail.
 */
export async function startReception({ canvas, onNavigate, onProgress }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { throw new Error('WEBGL_UNAVAILABLE', { cause: e }); }
  if (!renderer.getContext()) throw new Error('WEBGL_UNAVAILABLE');

  const abort = new AbortController();
  let disposed = false, rafId = 0;
  const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const maxPR = isTouch ? CONFIG.render.maxPixelRatioTouch : CONFIG.render.maxPixelRatio;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPR));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141312);
  const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.05, 40);
  const camTarget = new THREE.Vector3(...CONFIG.camera.target);
  const camDir = new THREE.Vector3(...CONFIG.camera.position).sub(camTarget).normalize();

  // ---- responsive framing: fit logo + receptionist into #scene-window (the part of the screen the UI leaves free) ----
  const fr = { cur: null, tgt: null, snap: true };
  const characterBox = new THREE.Box3();
  function contentPoints() {
    const L = CONFIG.logo, lw = L.height * L.aspect / 2, lh = L.height / 2, [lx, ly, lz] = L.position, P = (x, y, z) => new THREE.Vector3(x, y, z);
    let headTop = 1.5, cz = CONFIG.scene.characterZ;
    if (state.characterRoot) { characterBox.setFromObject(state.characterRoot); if (isFinite(characterBox.max.y)) headTop = characterBox.max.y; }
    const core = [P(lx - lw, ly - lh, lz), P(lx + lw, ly - lh, lz), P(lx - lw, ly + lh, lz), P(lx + lw, ly + lh, lz),      // the complete logo
      P(0, headTop + 0.02, cz), P(-0.34, headTop - 0.36, cz), P(0.34, headTop - 0.36, cz),                                  // head and shoulders
      P(-0.34, headTop - 0.62, cz), P(0.34, headTop - 0.62, cz)];                                                         // upper torso
    const desk = [P(-0.42, 0.9, cz + 0.45), P(0.42, 0.9, cz + 0.45)];                                                      // hands / desk edge
    const context = [P(-0.95, 0.85, 0.2), P(0.95, 0.85, 0.2), P(-0.95, ly + lh + 0.1, lz), P(0.95, ly + lh + 0.1, lz)];   // a little room (monitor, panel trim) on wide windows
    return { core, desk, context };
  }
  let lastW = 0, lastH = 0;
  function layout(snap = false) {
    if (disposed) return;
    const W = canvas.clientWidth || window.innerWidth, H = canvas.clientHeight || window.innerHeight; if (!W || !H) return;
    const pr = Math.min(window.devicePixelRatio || 1, maxPR);
    if (W !== lastW || H !== lastH || renderer.getPixelRatio() !== pr) { renderer.setPixelRatio(pr); renderer.setSize(W, H, false); lastW = W; lastH = H; }   // drawing buffer always matches the CSS box: no stretching
    const sw = document.getElementById('scene-window'), cr = canvas.getBoundingClientRect();
    let win = { x: 0, y: 0, w: W, h: H };
    let haveWin = false;
    if (sw) { const r = sw.getBoundingClientRect(); if (r.width > 60 && r.height > 60) { win = { x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height }; haveWin = true; } }
    if (haveWin && !fr.hasWin) { fr.hasWin = true; snap = true; }
    const { core, desk, context } = contentPoints();
    fr.tgt = computeFrame({ W, H, win, fov: CONFIG.camera.fov, dir: camDir, target: camTarget, core, desk, context });
    fr.win = win; fr.W = W; fr.H = H;
    if (snap || !fr.cur) fr.snap = true;
  }
  function applyFrame(dt) {
    const t = fr.tgt; if (!t) return;
    if (fr.snap || !fr.cur) { fr.cur = { ...t }; fr.snap = false; }
    else { const k = 1 - Math.exp(-dt * 7); for (const key of ['D', 'dx', 'dy']) fr.cur[key] += (t[key] - fr.cur[key]) * k; if (Math.abs(t.D - fr.cur.D) < 1e-4) Object.assign(fr.cur, t); }
    const c = fr.cur;
    camera.fov = CONFIG.camera.fov; camera.aspect = fr.W / fr.H;
    camera.position.copy(camTarget).addScaledVector(camDir, c.D); camera.lookAt(camTarget);
    camera.setViewOffset(fr.W, fr.H, -c.dx, -c.dy, fr.W, fr.H); camera.updateProjectionMatrix();
  }
  const state = { tracker: null, rig: null, desk: null, characterRoot: null, body: null };
  const relayout = () => { layout(false); };
  window.addEventListener('resize', relayout, { signal: abort.signal });
  window.addEventListener('orientationchange', () => { setTimeout(() => layout(true), 150); setTimeout(() => layout(true), 600); }, { signal: abort.signal });
  window.visualViewport?.addEventListener('resize', relayout, { signal: abort.signal });          // mobile browser bars appearing / disappearing
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(relayout) : null;
  ro?.observe(canvas); const swEl = document.getElementById('scene-window'); if (swEl) ro?.observe(swEl);
  ['bubble', 'choices'].forEach((id) => { const el = document.getElementById(id); if (el) ro?.observe(el); });
  layout(true); applyFrame(0);

  setupEnvironment(renderer, scene);
  buildRoom(scene, CONFIG);
  buildLights(scene, CONFIG);
  const logoGroup = buildLogoPlaque(scene, CONFIG, () => {});
  scene.add(buildChair(CONFIG));

  const story = new Story({ onNavigate, theme: currentTheme() });
  const progress = { desk: 0, char: 0 };
  const report = () => onProgress?.((progress.desk + progress.char) / 2);
  const loader = new GLTFLoader();
  const load = (url, key) => new Promise((resolve, reject) => {
    loader.load(url, resolve, (e) => { if (e.lengthComputable) { progress[key] = e.loaded / e.total; report(); } }, reject);
  });
  async function loadDesk() {
    const gltf = await load(CONFIG.assets.desk, 'desk');
    const desk = gltf.scene; desk.name = 'DeskGLB';
    desk.scale.setScalar(CONFIG.scene.deskScale);
    desk.traverse((o) => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.envMapIntensity = 1.0; });
    // Material.003 is emissive-only in the GLB (no base colour) and would blow out to white metal; restore intended bronze.
    desk.traverse((o) => {
      if (o.isMesh && o.material.name === 'Material.003') {
        o.material.color.setRGB(0.02, 0.012, 0.008); o.material.metalness = 0.2; o.material.roughness = 0.5;
        o.material.emissiveIntensity = 1.0; o.castShadow = false;
      }
    });
    if (!CONFIG.scene.showAlcove) desk.traverse((o) => { if (o.name === 'Plane001_2') o.visible = false; });
    scene.add(desk); desk.updateMatrixWorld(true); state.desk = desk;
  }

  async function loadCharacter() {
    const gltf = await load(CONFIG.assets.character, 'char');
    const S = CONFIG.scene;
    const model = gltf.scene; model.name = 'CharacterGLB';
    const root = new THREE.Group(); root.name = 'CharacterRoot'; root.add(model);
    root.scale.setScalar(S.characterScale);
    scene.add(root); root.updateMatrixWorld(true);
    prepareCharacterMaterials(model, renderer);
    const rig = discoverRig(model), rep = validateRig(rig);
    state.rig = rig; state.characterRoot = root;
    if (!rig.hips) throw new Error('Character has no skeleton');
    const hipsRestWorldY = rig.hips.getWorldPosition(new THREE.Vector3()).y;
    root.position.set(0, 0, S.characterZ - (rig.hips.getWorldPosition(new THREE.Vector3()).z - root.position.z));
    applySeatedPose(rig, { hipsRestWorldY, seatY: S.seatHeight, hipLift: S.hipJointAboveSeat, scale: S.characterScale });
    root.updateMatrixWorld(true);
    rig.skinned.forEach((m) => m.skeleton.update());
    if (rep.ok) state.tracker = new HeadTracker({ head: rig.head, neck: rig.neck, leftEye: rig.leftEye, rightEye: rig.rightEye, root, cfg: CONFIG.tracking });
    else console.warn('Rig validation failed', rep);
  }

  // Day/night: lights, exposure and environment follow the site theme (logo and receptionist stay clearly visible).
  const themeState = { mix: currentTheme() === 'night' ? 1 : 0, target: currentTheme() === 'night' ? 1 : 0, lights: null };
  window.addEventListener('top-theme', (e) => { themeState.target = e.detail === 'night' ? 1 : 0; }, { signal: abort.signal });
  const bgDay = new THREE.Color(0x1d1a17), bgNight = new THREE.Color(0x0b0a09), tmpC = new THREE.Color();
  function applyThemeMix() {
    if (!themeState.lights) { themeState.lights = []; scene.traverse((o) => { if (o.isLight) themeState.lights.push([o, o.intensity]); }); }
    const m = themeState.mix;
    for (const [l, base] of themeState.lights) l.intensity = base * (1 - 0.42 * m);
    renderer.toneMappingExposure = 1.1 - 0.2 * m;
    scene.environmentIntensity = 1 - 0.6 * m;
    scene.background = tmpC.copy(bgDay).lerp(bgNight, m);
  }

  const input = new InputManager({ canvas, getTracker: () => state.tracker, onSource: () => {} });
  const clock = new THREE.Clock();
  const onVis = () => { clock.getDelta(); };
  document.addEventListener('visibilitychange', onVis, { signal: abort.signal });

  function frame() {
    if (disposed) return;
    rafId = requestAnimationFrame(frame);
    if (document.hidden) return;
    const dt = clock.getDelta();
    if (Math.abs(themeState.target - themeState.mix) > 0.002) themeState.mix += (themeState.target - themeState.mix) * (1 - Math.exp(-dt * 1.6)); else themeState.mix = themeState.target;
    if (themeState.lights) applyThemeMix();
    input.pollGamepad();
    applyFrame(dt);
    story.update(dt);
    logoGroup.userData.tick?.(dt);
    state.body?.update(dt);
    state.tracker?.update(dt);
    renderer.render(scene, camera);
  }

  function dispose() {
    if (disposed) return; disposed = true;
    cancelAnimationFrame(rafId); abort.abort(); ro?.disconnect();
    story.dispose(); input.dispose();
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) { for (const k of Object.keys(m)) if (m[k]?.isTexture) m[k].dispose(); m.dispose?.(); }
    });
    scene.environment?.dispose?.();
    renderer.dispose(); renderer.forceContextLoss?.();
  }

  try {
    await Promise.all([loadDesk(), loadCharacter()]);
    if (disposed) return { dispose, story };
    if (state.tracker && state.desk) {
      state.body = new BodyMotion({ rig: state.rig, root: state.characterRoot, desk: state.desk, tracker: state.tracker, cfg: CONFIG.body, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches });
      story.attach({ body: state.body, tracker: state.tracker });
    }
    try { buildDecor(scene, { surface: state.body?.surface, CONFIG, onStatus: () => {} }); } catch (e) { console.warn('Decor partial', e); }
  } catch (e) { dispose(); throw e; }

  applyThemeMix();
  layout(true); applyFrame(0);
  window.__reception = { THREE, scene, camera, renderer, state, story, cfg: CONFIG, logo: logoGroup, layout: (snap = true) => { layout(snap); if (snap) applyFrame(0); }, frameInfo: () => ({ ...fr }), ready: true };
  renderer.render(scene, camera);
  rafId = requestAnimationFrame(frame);
  return { dispose, story };
}
