"""Route + responsive QA. Usage: python3 tools/qa/routes.py (serves ./dist on :4173)"""
import subprocess, time, json, sys
from playwright.sync_api import sync_playwright
ROUTES = ['/', '/studio', '/projects', '/projects/cantilever-house', '/projects/rotating-tower', '/projects/civic-hall', '/projects/garden-pavilion', '/projects/light-filled-interior', '/projects/hillside-retreat', '/projects/finned-facade',
 '/services', '/services/architecture', '/services/interior-design', '/services/planning', '/services/visualization', '/services/consultancy', '/process', '/team', '/journal',
 '/journal/light-as-a-building-material', '/journal/the-case-for-fewer-materials', '/journal/designing-the-threshold', '/journal/models-before-renders', '/contact', '/nope', '/projects/nope']
SIZES = [(390, 844), (768, 1024), (1440, 900), (1920, 1080)]
srv = subprocess.Popen(['npx', 'vite', 'preview', '--port', '4173', '--strictPort'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(3)
issues = []; shots = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        for (w, h) in SIZES:
            ctx = b.new_context(viewport={'width': w, 'height': h}); pg = ctx.new_page()
            errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.on('requestfailed', lambda r: errs.append('REQFAIL ' + r.url))
            pg.on('response', lambda r: errs.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
            for r in ROUTES:
                errs.clear()
                pg.goto('http://localhost:4173' + r, wait_until='networkidle')
                pg.wait_for_timeout(200)
                # force lazy images to load
                pg.evaluate("document.querySelectorAll('img').forEach(i=>{i.loading='eager'})")
                pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(400); pg.evaluate("window.scrollTo(0,0)")
                pg.wait_for_load_state('networkidle')
                ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
                broken = pg.evaluate("[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)")
                h1 = pg.evaluate("document.querySelectorAll('h1').length")
                if ov > 0: issues.append(f'{w}px {r}: horizontal overflow {ov}px')
                if broken: issues.append(f'{w}px {r}: broken images {broken}')
                if h1 != 1 and r not in ('/nope',): issues.append(f'{w}px {r}: h1 count {h1}')
                real = [e for e in errs if 'Failed to load resource' not in e or '404' not in e or r in ('/nope',)]
                if errs: issues.append(f'{w}px {r}: console/network {errs[:3]}')
                if r in ('/', '/projects', '/projects/cantilever-house', '/process', '/contact') :
                    f = f"/tmp/shot_{w}_{r.strip('/').replace('/','_') or 'home'}.png"; pg.screenshot(path=f, full_page=(w == 390 and r == '/')); shots.append(f)
            ctx.close()
        b.close()
finally:
    srv.terminate()
print(json.dumps({'checked_routes': len(ROUTES), 'sizes': SIZES, 'issues': issues}, indent=1))
