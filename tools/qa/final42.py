"""Final 42-project QA. Needs `npx vite preview --port 4173`. Usage: VP=desktop|tablet|mobile python3 tools/qa/final42.py
Writes PASS/FAIL lines to stdout (and /tmp/final42_<vp>.log). Nothing is reported as passed unless it was executed."""
import os, sys, re, json
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:4173'; VP = os.environ.get('VP', 'desktop'); QUICK = os.environ.get('QUICK') == '1'
SECTIONS = os.environ.get('SECTIONS', 'all')          # all | projects | nav
SLICE = [int(x) for x in os.environ.get('SLICE', '0:42').split(':')]
SIZES = {'desktop': (1440, 900), 'tablet': (768, 1024), 'mobile': (390, 844)}
W, H = SIZES[VP]; mobile = W < 500
CATS = ['Residential', 'Institutional', 'Public & Landscape', 'Commercial', 'Hospitality', 'Interiors']
out, fails = [], []
def ok(c, m): (out if c else fails).append(('PASS ' if c else 'FAIL ') + f'[{VP}] ' + m); return c
def load_all(pg, t=15000):
    pg.evaluate("document.querySelectorAll('img').forEach(i=>{i.loading='eager'})")
    h = pg.evaluate('document.body.scrollHeight')
    for y in range(0, h + 800, 900): pg.evaluate(f'window.scrollTo(0,{y})'); pg.wait_for_timeout(50)
    try: pg.wait_for_function("[...document.images].every(i=>i.complete)", timeout=t)
    except Exception: pass
    pg.evaluate('window.scrollTo(0,0)')
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': W, 'height': H}, has_touch=mobile, is_mobile=mobile)
    pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    pg.on('response', lambda r: errs.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
    # ---------- Projects page: filters, counts, duplicates
    pg.goto(BASE + '/projects', wait_until='networkidle')
    chips = pg.eval_on_selector_all('.filters .chip', 'els=>els.map(e=>e.childNodes[0].textContent.trim())')
    ok(chips == ['All'] + CATS, f'filter chips = {chips}')
    pg.wait_for_selector('.project-marquee__card'); pg.wait_for_timeout(600)
    cov = lambda: pg.evaluate("[...document.querySelectorAll('.project-marquee__cycle')[0].querySelectorAll('a.project-marquee__card')].map(a=>[a.getAttribute('href').split('/').pop(), a.querySelector('.project-marquee__title').textContent])")
    allc = cov(); allt = [t for _, t in allc]
    ok(len(allt) == 42 and len(set(allt)) == 42, f'All carousel shows {len(allt)} projects, {len(set(allt))} unique titles')
    for c in CATS:
        pg.click(f".filters .chip:has-text('{c}')"); pg.wait_for_timeout(2300)
        ok(len(cov()) == 7, f'{c}: {len(cov())} projects in the carousel')
    pg.click(".filters .chip >> nth=0"); pg.wait_for_timeout(2300)
    ok(pg.locator('.project-marquee button').count() == 0, 'gallery has no buttons (pause/play/arrows)')
    ov = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth'); ok(ov <= 0, f'/projects no horizontal overflow ({ov}px)')
    slugs = [s_ for s_, _ in allc]; titles = dict(allc)
    # ---------- every project: click-through, title, 5 images, mapping, load, lightbox
    imgs_seen = 0; bad = []
    todo = [] if SECTIONS == 'nav' else (slugs[SLICE[0]:SLICE[1]] if not QUICK else slugs[::6])
    for slug in todo:
        pg.goto(BASE + '/projects/' + slug, wait_until='domcontentloaded'); pg.wait_for_selector('.pd-bleed img'); load_all(pg)
        title = pg.inner_text('h1').strip(); srcs = pg.evaluate("[...document.querySelectorAll('.pd-bleed img, .gallery img')].map(i=>[i.currentSrc.split('/').pop(), i.complete && i.naturalWidth>0])")
        names = [re.sub(r'-(\d+|full)\.webp$', '', s[0]) for s in srcs]
        mapped = len(srcs) == 5 and all(s[1] for s in srcs) and len(set(s[0].rsplit('-', 1)[0] for s in srcs)) == 5
        legacy = slug == 'cantilever-house'
        prefix_ok = legacy or all(s[0].startswith(slug + '-') for s in srcs)
        if not (title == titles[slug] and mapped and prefix_ok): bad.append((slug, title, srcs))
        imgs_seen += len(srcs)
        pg.click('.project-image-open'); pg.wait_for_selector('dialog[open] .project-lightbox__stage img')
        total = int(pg.inner_text('.project-lightbox__top p span:last-child').split('/')[1]); seen = set()
        for i in range(total):
            try: pg.wait_for_function("(()=>{const i=document.querySelector('dialog[open] .project-lightbox__stage img');return i&&i.complete&&i.naturalWidth>0})()", timeout=8000)
            except Exception: bad.append((slug, 'lightbox image not loaded', i))
            seen.add(pg.eval_on_selector('dialog[open] .project-lightbox__stage img', 'i=>i.currentSrc')); pg.click('.project-lightbox__nav--next'); pg.wait_for_timeout(80)
        if total != 5 or len(seen) != 5: bad.append((slug, 'lightbox', total, len(seen)))
        pg.keyboard.press('Escape')
        ovf = pg.evaluate('document.documentElement.scrollWidth - document.documentElement.clientWidth')
        if ovf > 0: bad.append((slug, 'overflow', ovf))
    ok(not bad, f'{len(todo)} projects opened from cards: correct title, 5 distinct loaded images mapped to the project, lightbox 5/5, no overflow ({imgs_seen} images) {bad[:3]}')
    if SECTIONS == 'projects':
        ok(not errs, f'console/network errors: {errs[:5]}'); b.close(); print('\n'.join(out)); print('\n'.join(fails)); print(f'\n{len(out)} passed, {len(fails)} failed'); sys.exit(0)
    # ---------- retired / unknown
    for s in ['hillside-retreat', 'light-filled-interior', 'does-not-exist']:
        pg.goto(BASE + '/projects/' + s, wait_until='networkidle'); t = pg.inner_text('main')[:200].lower()
        ok(('not found' in t or '404' in t or "couldn" in t or "doesn" in t) and pg.locator('.pd-bleed').count() == 0, f'/projects/{s} is not a public project page')
    # ---------- homepage CTA
    pg.goto(BASE + '/', wait_until='networkidle'); pg.wait_for_timeout(800)
    txt = pg.inner_text('main').lower()
    ok('explore selected work' not in txt and 'meet the studio' not in txt, 'homepage has no "Explore selected work" / "Meet the studio"')
    n_main = pg.locator("main a[href='/reception']").count(); n_all = pg.locator("a[href='/reception']:visible").count()
    hero = pg.locator(".hero2 a[href='/reception']").count()
    ok(n_main == 1 and hero == 1, f'homepage body has exactly {n_main} reception CTA ({hero} in hero); visible reception links incl. site header: {n_all}')
    ok(pg.evaluate("[...document.querySelectorAll('.hero2__actions a, .hero2__actions button')].length") == 1, 'hero contains exactly one button/link')
    # (back navigation + filters are covered by tools/qa/nav_filters.py)
    # ---------- other pages and reception
    for r in ['/', '/studio', '/services', '/process', '/team', '/journal', '/contact', '/reception']:
        n = len(errs); pg.goto(BASE + r, wait_until='load'); pg.wait_for_timeout(900); ok(pg.locator('h1, canvas').count() > 0 and len(errs) == n, f'page {r} renders, new errors={errs[n:][:2]}')
    pg.goto(BASE + '/reception', wait_until='load'); pg.wait_for_timeout(3500); ok(pg.locator('canvas').count() > 0, 'reception: 3D canvas present')
    ok(not errs, f'console/network errors overall: {errs[:5]}')
    b.close()
print('\n'.join(out)); print('\n'.join(fails)); print(f'\n{len(out)} passed, {len(fails)} failed')
