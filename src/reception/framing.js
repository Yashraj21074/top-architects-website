import * as THREE from 'three';

/**
 * Fit-to-window camera framing.
 *
 * The UI (subtitles, menu, controls) lives OUTSIDE the element #scene-window, so that element's rectangle is the area where the
 * scene is allowed to appear. We choose the camera distance D (fov and direction stay fixed, so nothing is stretched) such that
 * the projected "must-see" points — the complete logo plus the receptionist's head, shoulders and hands — fit inside that
 * rectangle, then translate the image with a view offset so the content is centred in it.
 * On wide windows an additional "context" set (desk, monitor edge) widens the shot a little, but never below the core fit.
 */
const _cam = new THREE.PerspectiveCamera(), _v = new THREE.Vector3();

function extents(points, D, { W, H, fov, dir, target }) {
  _cam.fov = fov; _cam.aspect = W / H; _cam.near = 0.05; _cam.far = 60; _cam.clearViewOffset();
  _cam.position.copy(target).addScaledVector(dir, D); _cam.lookAt(target); _cam.updateProjectionMatrix(); _cam.updateMatrixWorld(true);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of points) { _v.copy(p).project(_cam); const px = (_v.x * 0.5 + 0.5) * W, py = (-_v.y * 0.5 + 0.5) * H; x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
}

/** Smallest distance at which `points` fit inside win (with padding). */
function fitDistance(points, env, win, padX, padY) {
  let lo = 1.0, hi = 18;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2, e = extents(points, mid, env);
    if (e.w <= win.w * (1 - 2 * padX) && e.h <= win.h * (1 - 2 * padY)) hi = mid; else lo = mid;
  }
  return hi;
}

export function computeFrame({ W, H, win, fov, dir, target, core, desk = [], context = [] }) {
  const env = { W, H, fov, dir, target };
  const padX = win.w < 360 ? 0.03 : 0.045, padY = 0.035;
  // 1) the must-see set: complete logo + head + upper body. 2) add the desk if that costs < ~22 % of zoom. 3) on wide windows add side context (< ~40 %).
  let pts = core, D = fitDistance(core, env, win, padX, padY);
  if (desk.length) { const Dd = fitDistance([...core, ...desk], env, win, padX, padY); if (Dd <= D * 1.22) { D = Math.max(D, Dd); pts = [...core, ...desk]; } }
  if (win.w / win.h >= 1.15 && context.length) { const Dc = fitDistance([...pts, ...context], env, win, padX, padY); if (Dc <= D * 1.4) { D = Math.max(D, Dc); pts = [...pts, ...context]; } }
  const e = extents(pts, D, env);
  const dx = win.x + win.w / 2 - (e.x0 + e.x1) / 2, dy = win.y + win.h / 2 - (e.y0 + e.y1) / 2;
  return { D, dx, dy };
}
