import sys, subprocess, time
from playwright.sync_api import sync_playwright
W, H = int(sys.argv[1]), int(sys.argv[2]); routes = sys.argv[3:]
srv = subprocess.Popen(['npx', 'vite', 'preview', '--port', '4173', '--strictPort'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(3)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, has_touch=W < 800); ctx.add_init_script("Date.prototype.getHours = function(){ return 12; };"); pg = ctx.new_page()
        for r in routes:
            pg.goto('http://localhost:4173' + r, wait_until='networkidle'); pg.evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')"); pg.wait_for_timeout(700)
            total = pg.evaluate("document.documentElement.scrollHeight - innerHeight"); tag = r.strip('/').replace('/', '_') or 'home'
            for i, f in enumerate((0, .5, 1) if total > H else (0,)):
                pg.evaluate(f"window.scrollTo(0,{int(total*f)})"); pg.wait_for_timeout(900); pg.screenshot(path=f'/tmp/ms_{tag}_{W}_{i}.png')
            print(r, 'height', total, 'overflowX', pg.evaluate("document.documentElement.scrollWidth - innerWidth"))
        b.close()
finally: srv.terminate()
