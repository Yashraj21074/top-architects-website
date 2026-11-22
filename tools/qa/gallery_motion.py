"""Projects gallery (marquee) motion/interaction QA. Start `npx vite preview --port 4173` first. Usage: VP=desktop|tablet|mobile python3 tools/qa/gallery_motion.py"""
import os, sys, math, json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:4173'
VPS = {'1920': (1920, 1080), '1440': (1440, 900), '1366': (1366, 768), 'tablet768': (768, 1024), 'm390': (390, 844), 'm375': (375, 812)}
sel = [k for k in os.environ.get('VP', '1920,1440,1366,tablet768,m390,m375').split(',')]
res, fails = [], []
def ok(c, m): (res if c else fails).append(('PASS ' if c else 'FAIL ') + m); return c
def tx(pg): return pg.evaluate("new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.project-marquee__track')).transform).m41")
def speed(pg, secs=1.0):
    # unwrap: the track loops seamlessly, so a sample pair may straddle the wrap point (jump of exactly one cycle width)
    cw = pg.evaluate("document.querySelector('.project-marquee__cycle').getBoundingClientRect().width")
    a = tx(pg); pg.wait_for_timeout(int(secs * 1000)); b = tx(pg); d = (b - a + cw / 2) % cw - cw / 2; return d / secs
def wrapdiff(d, w): d = (d + w / 2) % w - w / 2; return d
with sync_playwright() as p:
    b = p.chromium.launch()
    for key in sel:
        W, H = VPS[key]; mobile = W <= 500; ctx = b.new_context(viewport={'width': W, 'height': H}, has_touch=mobile, is_mobile=mobile, device_scale_factor=2 if mobile else 1)
        pg = ctx.new_page(); errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE + '/projects', wait_until='networkidle'); pg.wait_for_selector('.project-marquee__card')
        pg.evaluate("document.querySelector('.project-marquee').scrollIntoView({block:'center'})"); pg.wait_for_timeout(600)
        L = f'[{key}]'
        ok(pg.locator('.project-marquee button').count() == 0 and not pg.locator('text=/pause motion|play motion/i').count(), f'{L} no buttons / pause / play controls in gallery')
        # card size
        card = pg.evaluate("(()=>{const r=document.querySelector('.project-marquee__card').getBoundingClientRect();return [r.width,r.height]})()")
        gap = max(12, min(16, 0.014 * W)); oldw = max(288, min(608, 0.31 * W - gap)) if W > 700 else min(0.74 * W, 320)
        ok(True, f'{L} card {card[0]:.0f}x{card[1]:.0f}px (old width≈{oldw:.0f} → x{card[0]/oldw:.2f}; old height≈{oldw/1.6:.0f} → x{card[1]/(oldw/1.6):.2f}); width = {card[0]/W*100:.0f}% of viewport')
        ov = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth'); ok(ov <= 0, f'{L} no horizontal overflow ({ov})')
        # loop coverage: first/last pixel columns always covered by a card (checked across several drag offsets)
        pg.mouse.move(W / 2, 5) if not mobile else None
        s0 = speed(pg, 1.0); exp = 30 if W <= 700 else 40
        ok(-exp * 1.2 <= s0 <= -exp * 0.8, f'{L} auto speed {s0:.1f}px/s right→left (target ≈{exp})')
        # steadiness: 10 samples of 200ms
        sam = []; last = tx(pg)
        for _ in range(8): pg.wait_for_timeout(200); n = tx(pg); sam.append((n - last) / 0.2); last = n
        ok(max(sam) - min(sam) < 25 and max(sam) < 0, f'{L} steady (range {min(sam):.0f}…{max(sam):.0f}px/s, no jumps)')
        vbox = pg.evaluate("(()=>{const r=document.querySelector('.project-marquee__viewport').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
        cy = vbox[1] + vbox[3] / 2
        if not mobile:
            # hover slow-down and restore
            pg.mouse.move(W / 2, cy); pg.wait_for_timeout(2200); sh = speed(pg, 0.8)
            ok(-exp * 0.5 < sh < -1, f'{L} hover slows to {sh:.1f}px/s (not stopped, <50% of normal)')
            pg.mouse.move(W / 2, 5); pg.wait_for_timeout(3500); sr = speed(pg, 1.0)
            ok(-exp * 1.2 <= sr <= -exp * 0.8, f'{L} speed restored to {sr:.1f}px/s after leaving (normal {s0:.1f})')
            # drag right then left, 1:1 and direction retained
            cw = pg.evaluate("document.querySelector('.project-marquee__cycle').getBoundingClientRect().width")
            pg.mouse.move(W / 2, cy); a = tx(pg); pg.mouse.down(); pg.mouse.move(W / 2 + 300, cy, steps=12); bx = tx(pg)
            ok(abs(wrapdiff(bx - a, cw) - 300) < 40, f'{L} drag right 300px moved gallery {wrapdiff(bx-a,cw):.0f}px')
            pg.mouse.up(); pg.wait_for_timeout(1500); sa = speed(pg, 1.0)
            ok(sa > 0, f'{L} after right-drag release it keeps drifting right ({sa:.1f}px/s)')
            pg.mouse.move(W / 2, cy); pg.wait_for_timeout(50); a = tx(pg); pg.mouse.down(); pg.mouse.move(W / 2 - 400, cy, steps=12); bx = tx(pg); pg.mouse.up()
            ok(abs(wrapdiff(bx - a, cw) + 400) < 40, f'{L} drag left 400px moved gallery {wrapdiff(bx-a,cw):.0f}px')
            pg.wait_for_timeout(1500); sl = speed(pg, 1.0); ok(sl < 0, f'{L} after left-drag it drifts left ({sl:.1f}px/s)')
            # drag does not open a project; plain click does
            url0 = pg.url; pg.mouse.move(W / 2, cy); pg.mouse.down(); pg.mouse.move(W / 2 - 160, cy, steps=8); pg.mouse.up(); pg.wait_for_timeout(300)
            ok(pg.url == url0, f'{L} dragging over a card does not navigate')
            pg.mouse.move(W / 2, 5); pg.wait_for_timeout(400)
            href = pg.evaluate("(()=>{const c=[...document.querySelectorAll('.project-marquee__card:not([tabindex=\"-1\"])')].find(e=>{const r=e.getBoundingClientRect();return r.left>0&&r.right<innerWidth});return c&&c.getAttribute('href')})()")
            box = pg.evaluate(f"(()=>{{const r=document.querySelector('.project-marquee__card[href=\"{href}\"]:not([tabindex=\"-1\"])').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]}})()")
            pg.mouse.click(box[0], box[1]); pg.wait_for_timeout(800)
            ok(pg.url.endswith(href), f'{L} click opens {href} (url {pg.url.split("3")[-1]})')
            pg.goto(BASE + '/projects', wait_until='networkidle')
        else:
            cdp = ctx.new_cdp_session(pg)
            def swipe(x0, x1, y, steps=10):
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y}]})
                for i in range(1, steps + 1): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * i / steps, 'y': y}]}); pg.wait_for_timeout(16)
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            cw = pg.evaluate("document.querySelector('.project-marquee__cycle').getBoundingClientRect().width")
            a = tx(pg); swipe(W * 0.8, W * 0.3, cy); pg.wait_for_timeout(100); d = wrapdiff(tx(pg) - a, cw)
            ok(d < -W * 0.35, f'{L} swipe left moved gallery {d:.0f}px (finger travel {-W*0.5:.0f})')
            pg.wait_for_timeout(1800); sl = speed(pg, 1.0); ok(sl < 0, f'{L} after swipe-left drifts left ({sl:.1f}px/s)')
            a = tx(pg); swipe(W * 0.25, W * 0.75, cy); pg.wait_for_timeout(100); d = wrapdiff(tx(pg) - a, cw)
            ok(d > W * 0.35, f'{L} swipe right moved gallery +{d:.0f}px')
            pg.wait_for_timeout(2000); sr = speed(pg, 1.0); ok(sr > 0, f'{L} after swipe-right drifts right ({sr:.1f}px/s)')
            pg.wait_for_timeout(2500); sn = abs(speed(pg, 1.0)); ok(25 <= sn <= 36, f'{L} normal touch speed restored ({sn:.1f}px/s)')
            # vertical scroll not hijacked
            y0 = pg.evaluate('scrollY')
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': W / 2, 'y': cy}]})
            for i in range(1, 11): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': W / 2, 'y': cy - 30 * i}]}); pg.wait_for_timeout(16)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []}); pg.wait_for_timeout(500)
            ok(pg.evaluate('scrollY') > y0 + 50, f'{L} vertical swipe over the gallery still scrolls the page ({y0:.0f}→{pg.evaluate("scrollY"):.0f})')
            # tap opens project (bring the gallery back into view first)
            pg.evaluate("document.querySelector('.project-marquee').scrollIntoView({block:'center'})"); pg.wait_for_timeout(1200)
            href = pg.evaluate("(()=>{const c=[...document.querySelectorAll('.project-marquee__card:not([tabindex=\"-1\"])')].find(e=>{const r=e.getBoundingClientRect();return r.left>20&&r.right<innerWidth-5&&r.top>0});return c&&c.getAttribute('href')})()")
            if not href: href = pg.evaluate("document.querySelector('.project-marquee__card').getAttribute('href')")
            box = pg.evaluate(f"(()=>{{const r=document.querySelector('.project-marquee__card[href=\"{href}\"]:not([tabindex=\"-1\"])').getBoundingClientRect();return [Math.min(innerWidth-30,Math.max(30,r.left+r.width/2)),r.top+r.height/2]}})()")
            pg.touchscreen.tap(box[0], box[1]); pg.wait_for_timeout(900); ok(pg.url.endswith(href) or '/projects/' in pg.url, f'{L} tap opens {pg.url.split("/projects")[-1]}')
            pg.goto(BASE + '/projects', wait_until='networkidle')
        # seamless loop: sweep the gallery with big drags and confirm both viewport edges are always covered by a card
        pg.evaluate("document.querySelector('.project-marquee').scrollIntoView({block:'center'})"); pg.wait_for_timeout(500)
        vbox = pg.evaluate("(()=>{const r=document.querySelector('.project-marquee__viewport').getBoundingClientRect();return [r.top+r.height/2]})()"); cy = vbox[0]
        gaps = 0
        for k in range(14):
            if mobile:
                cdp = ctx.new_cdp_session(pg) if k == 0 else cdp
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': W * 0.9, 'y': cy}]})
                for i in range(1, 9): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': W * 0.9 - W * 0.85 * i / 8, 'y': cy}]})
                cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
            else:
                pg.mouse.move(W * 0.9, cy); pg.mouse.down(); pg.mouse.move(W * 0.05, cy, steps=6); pg.mouse.up()
            pg.wait_for_timeout(60)
            run = pg.evaluate(f"(()=>{{let best=0,cur=0;for(let x=0;x<={W};x+=12){{const hit=!!document.elementsFromPoint(Math.min(x,{W}-1),{cy}).find(e=>e.closest('.project-marquee__card'));if(hit)cur=0;else{{cur++;best=Math.max(best,cur)}}}}return best}})()")
            if run > 2: gaps += 1   # an empty stretch wider than ~24px (normal card gap is <=16px) would be a visible hole
        ok(gaps == 0, f'{L} seamless loop: 14 long drags, {gaps} positions with a visible hole')
        pg.evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')"); pg.wait_for_timeout(2500)
        broken = pg.evaluate("[...document.querySelectorAll('.project-marquee img')].filter(i=>!i.complete||!i.naturalWidth).length"); ok(broken == 0, f'{L} gallery images broken={broken}')
        pg.screenshot(path=f'/tmp/gal_{key}.png'); ok(not errs, f'{L} console errors: {errs[:3]}')
        ctx.close()
    b.close()
print('\n'.join(res)); print('\n'.join(fails)); print(f'\n{len(res)} passed, {len(fails)} failed')
