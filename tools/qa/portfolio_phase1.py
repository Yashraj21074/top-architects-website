"""Phase 1 portfolio QA. Usage: (npx vite build && npx vite preview --port 4173 --strictPort &) ; python3 tools/qa/portfolio_phase1.py [base-url]
Checks: filters, every project card, every gallery (lightbox open/next/prev/Escape), image loading, console errors, mobile overflow."""
import sys, json, re
from playwright.sync_api import sync_playwright
import os
BASE = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1].startswith('http') else 'http://localhost:4173'
ONLY = os.environ.get('VP')  # desktop | tablet | mobile (default: all)
EXPECT = {'All': 25, 'Residential': 7, 'Institutional': 7, 'Public & Landscape': 7}
fails, notes = [], []
def ok(cond, msg):
    (notes if cond else fails).append(('PASS ' if cond else 'FAIL ') + msg)
    return cond
def load_all(pg):
    """Scroll the whole page in steps (lazy images) and wait until every image has finished loading."""
    pg.evaluate("document.querySelectorAll('img').forEach(i=>{i.loading='eager'})")
    h = pg.evaluate('document.body.scrollHeight')
    for y in range(0, h + 800, 900): pg.evaluate(f'window.scrollTo(0,{y})'); pg.wait_for_timeout(60)
    try: pg.wait_for_function("[...document.images].every(i=>i.complete)", timeout=15000)
    except Exception: pass
    pg.evaluate("window.scrollTo(0,0)")
with sync_playwright() as p:
    b = p.chromium.launch()
    for (w, h, label) in [v for v in [(1440, 900, 'desktop'), (768, 1024, 'tablet'), (390, 844, 'mobile')] if not ONLY or v[2] == ONLY]:
        ctx = b.new_context(viewport={'width': w, 'height': h}, has_touch=(w < 800)); pg = ctx.new_page(); errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type in ('error',) else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
        pg.on('response', lambda r: errs.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
        pg.goto(BASE + '/projects', wait_until='networkidle')
        pg.evaluate("document.querySelectorAll('img').forEach(i=>{i.loading='eager'})")
        chips = [t.strip() for t in pg.eval_on_selector_all('.filters .chip', 'els=>els.map(e=>e.childNodes[0].textContent)')]
        ok(chips == ['All', 'Residential', 'Institutional', 'Public & Landscape'], f'[{label}] filter chips = {chips}')
        for cat, n in EXPECT.items():
            pg.click(f".filters .chip:has-text('{cat}') >> nth=0") if cat != 'All' else pg.click(".filters .chip >> nth=0")
            pg.wait_for_timeout(350)
            tiles = pg.locator('.pf-tile').count(); pressed = pg.eval_on_selector('.chip[aria-pressed=true]', 'e=>e.childNodes[0].textContent.trim()')
            ok(tiles == n and pressed == cat, f'[{label}] filter {cat}: {tiles} tiles (expect {n}), pressed={pressed}')
            cards = pg.locator('.project-marquee__cycle >> nth=0').locator('.project-marquee__card').count()
            ok(cards == n, f'[{label}] filter {cat}: marquee covers {cards} (expect {n})')
            if cat != 'All':
                cats = set(pg.eval_on_selector_all('.pf-tile__kicker', 'els=>els.map(e=>e.textContent.split(" · ")[0])'))
                ok(cats == {cat}, f'[{label}] {cat}: tiles only from {cats}')
        pg.click(".filters .chip >> nth=0"); pg.wait_for_timeout(300)
        load_all(pg)
        broken = pg.evaluate("[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)")
        ok(not broken, f'[{label}] /projects images all loaded ({len(broken)} broken) {broken[:3]}')
        ov = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        ok(ov <= 0, f'[{label}] /projects no horizontal overflow ({ov}px)')
        if label == 'desktop':
            slugs = pg.eval_on_selector_all('.pf-tile__link', 'els=>els.map(e=>e.getAttribute("href"))')
            pg.screenshot(path='/tmp/p_projects_desktop.png')
        else:
            slugs = pg.eval_on_selector_all('.pf-tile__link', 'els=>els.map(e=>e.getAttribute("href"))')
        ok(len(slugs) == 25, f'[{label}] {len(slugs)} project links')
        targets = slugs if label == 'desktop' else [s for s in slugs if any(k in s for k in ('lightwell', 'cloudstone', 'canopy-of-pages', 'garden-pavilion', 'sponge', 'cantilever'))]
        for href in targets:
            # click through from the index like a visitor would
            pg.goto(BASE + '/projects', wait_until='networkidle')
            pg.locator(f".pf-tile__link[href='{href}']").scroll_into_view_if_needed(); pg.locator(f".pf-tile__link[href='{href}']").click()
            pg.wait_for_url('**' + href, timeout=5000); pg.wait_for_load_state('networkidle')
            load_all(pg)
            title = pg.inner_text('h1'); n_img = pg.locator('.pd-bleed img').count() + pg.locator('.gallery img').count()
            broken = pg.evaluate("[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)")
            ov = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
            ok(n_img >= 2 and not broken and ov <= 0, f'[{label}] {href}: "{title}" images={n_img} broken={len(broken)} overflow={ov}')
            # gallery: open lightbox from the hero button, step through all with next, then prev, then Escape
            pg.click('.project-image-open'); pg.wait_for_selector('dialog[open] .project-lightbox__stage img')
            total = int(pg.inner_text('.project-lightbox__top p span:last-child').split('/')[1])
            srcs = []
            for i in range(total):
                try: pg.wait_for_function("(()=>{const i=document.querySelector('dialog[open] .project-lightbox__stage img');return i&&i.complete&&i.naturalWidth>0})()", timeout=10000)
                except Exception: fails.append(f'FAIL [{label}] {href}: lightbox image {i+1} did not load')
                srcs.append(pg.eval_on_selector('dialog[open] .project-lightbox__stage img', 'i=>i.currentSrc.split("/").pop()+"|"+i.naturalWidth'))
                pg.click('.project-lightbox__nav--next'); pg.wait_for_timeout(120)
            pg.click('.project-lightbox__nav--prev'); pg.wait_for_timeout(120)
            idx = pg.inner_text('.project-lightbox__top p span:last-child')
            expect_n = 5 if (n_img == 5) else 2
            ok(total == expect_n and len(set(srcs)) == expect_n and idx.startswith(f'0{expect_n}'), f'[{label}] {href}: lightbox {total} images (expect {expect_n}) unique={len(set(srcs))} after prev={idx}')
            pg.keyboard.press('Escape'); pg.wait_for_timeout(200)
            ok(pg.locator('dialog[open]').count() == 0, f'[{label}] {href}: Escape closes lightbox')
        if label == 'desktop':
            pg.goto(BASE + '/projects/stepwell-courtyard-house', wait_until='networkidle'); pg.evaluate("document.querySelectorAll('img').forEach(i=>{i.loading='eager'})"); pg.evaluate('window.scrollTo(0, 1100)'); pg.wait_for_timeout(900); pg.screenshot(path='/tmp/p_detail_desktop.png')
        # other pages still fine
        for r in ['/', '/studio', '/services', '/process', '/team', '/journal', '/contact', '/reception']:
            errs_before = len(errs); pg.goto(BASE + r, wait_until='load'); pg.wait_for_timeout(500)
            ok(pg.locator('h1, canvas').count() > 0 and len(errs) == errs_before, f'[{label}] page {r} renders, new errors={errs[errs_before:][:2]}')
        ok(not errs, f'[{label}] console/network errors overall: {errs[:5]}')
        ctx.close()
    b.close()
print('\n'.join(notes[-0:] if '-v' in sys.argv else [n for n in notes if False]))
print('\n'.join(fails)); print(f'\n{len(notes)} passed, {len(fails)} failed')
sys.exit(1 if fails else 0)
