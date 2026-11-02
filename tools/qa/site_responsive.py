"""Whole-site responsive audit. Usage: site_responsive.py <size-index...>. Appends JSON lines to /tmp/site_results.jsonl.
Every route is loaded with the 'opened from reception' flag set (so the Back to Reception bar must appear on every non-home page)."""
import sys, json, subprocess, time
from playwright.sync_api import sync_playwright
SIZES = [(274, 653), (320, 568), (375, 667), (393, 852), (430, 932), (634, 844), (768, 1024), (1024, 768), (1440, 900)]
ROUTES = ['/', '/studio', '/projects', '/projects/cantilever-house', '/projects/finned-facade', '/services', '/services/architecture', '/services/consultancy', '/process', '/team', '/journal', '/journal/light-as-a-building-material', '/contact', '/nope']
SCAN = r"""(() => {
  const W = innerWidth, off = [];
  const clippedAncestor = (e) => { for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p); if (/(hidden|auto|scroll|clip)/.test(o.overflowX)) return true; } return false; };
  document.querySelectorAll('body *').forEach((e) => { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return; const r = e.getBoundingClientRect(); if (!r.width || !r.height) return;
    if ((r.right > W + 1 || r.left < -1) && !clippedAncestor(e) && !e.closest('#site-nav:not([data-open=true])') && !e.closest('.hero2__img') && !e.classList.contains('skip') && !e.closest('.cursor')) off.push((e.className && e.className.toString().slice(0, 30)) || e.tagName); });
  const clipped = [...document.querySelectorAll('.btn, .chip, .nav-toggle, .return-bar__btn')].filter((b) => b.offsetParent && (b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().right > W + 1)).map((b) => b.textContent.trim().slice(0, 24));
  const small = [...document.querySelectorAll('.btn, .chip, .nav-toggle')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 40).map((b) => b.textContent.trim().slice(0, 20));
  const bar = document.querySelector('.return-bar__btn'), br = bar && bar.getBoundingClientRect();
  return { overflowX: document.documentElement.scrollWidth - W, offscreen: [...new Set(off)].slice(0, 6), clipped, smallTargets: small,
    h1: document.querySelectorAll('h1').length, brokenImgs: [...document.images].filter((i) => !i.complete || !i.naturalWidth).map((i) => i.src.split('/').pop()),
    backBar: bar ? { visible: br.top >= 0 && br.bottom <= innerHeight && br.right <= W + 1 && br.left >= -1, text: bar.textContent.trim(), h: Math.round(br.height) } : null,
    heroBtns: [...document.querySelectorAll('.hero2__actions a')].map((a) => ({ t: [...a.querySelectorAll('span')].filter((s) => s.offsetParent && !s.classList.contains('arrow')).map((s) => s.textContent).join(''), href: a.getAttribute('href'), w: Math.round(a.getBoundingClientRect().width), h: Math.round(a.getBoundingClientRect().height) })) };
})()"""
srv = subprocess.Popen(['npx', 'vite', 'preview', '--port', '4173', '--strictPort'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(3)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for si in sys.argv[1:]:
            w, h = SIZES[int(si)]; ctx = b.new_context(viewport={'width': w, 'height': h}); ctx.add_init_script("sessionStorage.setItem('top.fromReception','1')"); pg = ctx.new_page()
            errs = []; pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
            for r in ROUTES:
                errs.clear(); pg.goto('http://localhost:4173' + r, wait_until='networkidle')
                pg.evaluate("document.querySelectorAll('img').forEach(i=>{i.loading='eager'})"); pg.wait_for_timeout(250); pg.wait_for_load_state('networkidle')
                m = pg.evaluate(SCAN); m.update({'size': f'{w}x{h}', 'route': r, 'errors': [e for e in errs if r != '/nope' or '404' not in e][:2]})
                open('/tmp/site_results.jsonl', 'a').write(json.dumps(m) + '\n')
                if r == '/' : pg.screenshot(path=f'/tmp/site_{w}_home.png')
                if r == '/studio': pg.screenshot(path=f'/tmp/site_{w}_studio.png')
            ctx.close()
        b.close()
finally: srv.terminate()
