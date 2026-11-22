"""Scroll-position screenshots. Usage: scroll_shots.py <route> <width> <height> <n> [hour]"""
import sys, subprocess, time
from playwright.sync_api import sync_playwright
route, W, H, n = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]); hour = sys.argv[5] if len(sys.argv) > 5 else '12'
srv = subprocess.Popen(['npx', 'vite', 'preview', '--port', '4173', '--strictPort'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(3)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, has_touch=W < 800)
        ctx.add_init_script(f"Date.prototype.getHours = function(){{ return {hour}; }};")
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto('http://localhost:4173' + route, wait_until='networkidle'); pg.evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')"); pg.wait_for_timeout(800)
        total = pg.evaluate("document.documentElement.scrollHeight - innerHeight"); print('scrollable height', total, 'errors', errs)
        tag = route.strip('/').replace('/', '_') or 'home'
        for i in range(n):
            y = int(total * i / max(1, n - 1)); pg.evaluate(f"window.scrollTo(0,{y})"); pg.wait_for_timeout(700)
            pg.screenshot(path=f'/tmp/sc_{tag}_{W}_{i}.png')
        print('overflowX', pg.evaluate("document.documentElement.scrollWidth - innerWidth"))
        b.close()
finally: srv.terminate()
