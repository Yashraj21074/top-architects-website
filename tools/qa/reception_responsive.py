"""Responsive reception checks: logo fully visible & unobstructed, receptionist visible, no overlap/clipping/overflow, canvas not distorted.
Usage: reception_responsive.py <index...>   (indexes into SIZES; 'rot' runs the rotation test). Results appended to /tmp/rw_results.jsonl"""
import sys, json, os
from playwright.sync_api import sync_playwright
SIZES = [(274, 653), (320, 568), (375, 667), (393, 852), (430, 932), (634, 844), (768, 1024), (1024, 768), (1440, 900), (844, 390), (1920, 1080)]
FF = "(n)=>{const st=window.__reception.story; for(let i=0;i<n;i++) st.update(0.1);}"
METRICS = r"""(() => {
  const R = window.__reception, T = R.THREE, cam = R.camera, cv = R.renderer.domElement, cr = cv.getBoundingClientRect(), C = R.cfg;
  const P = (x, y, z) => { const p = new T.Vector3(x, y, z).project(cam); return { x: (p.x * .5 + .5) * cr.width + cr.left, y: (-p.y * .5 + .5) * cr.height + cr.top }; };
  const rectOf = (pts) => ({ x0: Math.min(...pts.map(p => p.x)), x1: Math.max(...pts.map(p => p.x)), y0: Math.min(...pts.map(p => p.y)), y1: Math.max(...pts.map(p => p.y)) });
  const [lx, ly, lz] = C.logo.position, lw = C.logo.height * C.logo.aspect / 2, lh = C.logo.height / 2;
  const logo = rectOf([P(lx - lw, ly - lh, lz), P(lx + lw, ly - lh, lz), P(lx - lw, ly + lh, lz), P(lx + lw, ly + lh, lz)]);
  const box = new T.Box3().setFromObject(R.state.characterRoot), cz = C.scene.characterZ, top = box.max.y;
  const head = rectOf([P(-0.13, top + 0.03, cz), P(0.13, top + 0.03, cz), P(-0.13, top - 0.24, cz), P(0.13, top - 0.24, cz)]);
  const body = rectOf([P(-0.36, top - 0.36, cz), P(0.36, top - 0.36, cz), P(-0.42, 0.9, cz + 0.45), P(0.42, 0.9, cz + 0.45)]);
  const sw = document.getElementById('scene-window').getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const vis = (el) => { if (!el || el.hidden) return null; const r = el.getBoundingClientRect(); return r.width && r.height ? { x0: r.left, x1: r.right, y0: r.top, y1: r.bottom } : null; };
  const ui = { bubble: vis(document.getElementById('bubble')), choices: vis(document.getElementById('choices')), exit: vis(document.querySelector('.r-exit')), tools: vis(document.getElementById('story-tools')) };
  const hit = (a, b) => a && b && a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const inside = (a, b, t = 2) => a.x0 >= b.left - t && a.x1 <= b.right + t && a.y0 >= b.top - t && a.y1 <= b.bottom + t;
  const overlaps = []; for (const [k, r] of Object.entries(ui)) { if (hit(logo, r)) overlaps.push('logo×' + k); if (hit(head, r)) overlaps.push('head×' + k); if (hit(body, r)) overlaps.push('body×' + k); }
  const clipped = []; document.querySelectorAll('#story button, #story a, .choice-label').forEach((e) => { if (e.offsetParent === null) return; if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') clipped.push(e.textContent.trim().slice(0, 20)); const r = e.getBoundingClientRect(); if (r.left < -1 || r.right > W + 1) clipped.push('offscreen:' + e.textContent.trim().slice(0, 16)); });
  const ch = document.getElementById('choices'), cb = [...document.querySelectorAll('.choice')];
  const chRect = ch.getBoundingClientRect(); const choicesScrollable = ch.scrollHeight > ch.clientHeight + 1;
  const smallTargets = [...document.querySelectorAll('#story button, #story a')].filter((e) => e.offsetParent && (e.getBoundingClientRect().height < 40)).length;
  return {
    viewport: [W, H], overflowX: document.documentElement.scrollWidth - W,
    canvas_aspect_error_pct: +(Math.abs((cv.width / cv.height) / (cv.clientWidth / cv.clientHeight) - 1) * 100).toFixed(2),
    logo_px: { w: Math.round(logo.x1 - logo.x0), h: Math.round(logo.y1 - logo.y0), name_text_h_px: +((logo.y1 - logo.y0) * 0.075).toFixed(1) },
    logo_fully_inside_scene_window: inside(logo, sw), logo_inside_viewport: logo.x0 >= 0 && logo.x1 <= W && logo.y0 >= 0 && logo.y1 <= H,
    head_inside_scene_window: inside(head, sw), upper_body_inside_scene_window: inside(body, sw),
    gap_logo_bottom_to_head_top_px: Math.round(head.y0 - logo.y1), receptionist_height_px: Math.round(body.y1 - head.y0),
    ui_overlaps_scene_content: overlaps, clipped_controls: clipped, touch_targets_under_40px: smallTargets,
    menu: { items: cb.length, all_reachable: choicesScrollable ? 'scrollable' : 'all visible', visible_items: cb.filter((e) => { const r = e.getBoundingClientRect(); return r.top >= chRect.top - 1 && r.bottom <= chRect.bottom + 1; }).length, rect_h: Math.round(chRect.height) },
    scene_window: [Math.round(sw.width), Math.round(sw.height)], bubble_text_len: document.getElementById('bubble-live').textContent.length,
  };
})()"""
def load(b, size, tag):
    ctx = b.new_context(viewport={'width': size[0], 'height': size[1]}, has_touch=size[0] < 800); pg = ctx.new_page(); pg.set_default_timeout(150000)
    if os.environ.get('HOUR'): pg.add_init_script(f"Date.prototype.getHours = function(){{ return {int(os.environ['HOUR'])}; }};")
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:4173/reception', wait_until='commit'); pg.wait_for_function('window.__reception && window.__reception.ready === true')
    pg.mouse.move(size[0] // 2, size[1] // 2) if size[0] > 800 else None
    pg.evaluate(FF, 400); pg.evaluate("window.__reception.logo.userData.finish && window.__reception.logo.userData.finish()")
    pg.wait_for_timeout(400); pg.evaluate("window.__reception.layout(true)"); pg.wait_for_timeout(1200)
    return ctx, pg, errs
def measure(pg, tag):
    pg.evaluate("window.__reception.layout(true)"); pg.wait_for_timeout(900)
    m = pg.evaluate(METRICS); m['tag'] = tag; pg.screenshot(path=f'/tmp/rw_{tag}.png', timeout=180000); return m
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for a in sys.argv[1:]:
        try:
            if a == 'rot':
                ctx, pg, errs = load(b, (390, 844), 'rot'); out = [measure(pg, 'rot_portrait')]
                pg.set_viewport_size({'width': 844, 'height': 390}); pg.wait_for_timeout(1500); out.append(measure(pg, 'rot_landscape'))
                pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(1500); out.append(measure(pg, 'rot_back_portrait'))
                for m in out: open('/tmp/rw_results.jsonl', 'a').write(json.dumps(m) + '\n')
            else:
                s = SIZES[int(a)]; ctx, pg, errs = load(b, s, a); m = measure(pg, f'{s[0]}x{s[1]}' + os.environ.get('HOUR', '')); m['page_errors'] = errs
                open('/tmp/rw_results.jsonl', 'a').write(json.dumps(m) + '\n')
            ctx.close()
        except Exception as e:
            open('/tmp/rw_results.jsonl', 'a').write(json.dumps({'tag': a, 'FAILED': repr(e)[:300]}) + '\n')
    b.close()
