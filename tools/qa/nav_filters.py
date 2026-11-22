"""Navigation + category-filter QA. Needs `npx vite preview --port 4173`. Usage: PART=filters|nav VP=desktop|mobile python3 tools/qa/nav_filters.py"""
import os, sys, json, subprocess, re
from playwright.sync_api import sync_playwright
BASE = 'http://localhost:4173'; PART = os.environ.get('PART', 'filters'); VP = os.environ.get('VP', 'desktop')
data = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {PROJECTS,ACTIVE_CATEGORIES} from './src/content/projects.js'; console.log(JSON.stringify({cats:ACTIVE_CATEGORIES,p:PROJECTS.filter(p=>p.published).map(p=>({t:p.title,c:p.category,s:p.slug}))}))"]))
CATS = data['cats']; BYCAT = {c: sorted(x['t'] for x in data['p'] if x['c'] == c) for c in CATS}
INFO = {'All': 'Explore our complete portfolio across architecture, interiors and thoughtfully designed environments.', 'Residential': 'A collection of residential spaces shaped around lifestyle, comfort and contemporary architectural expression.', 'Institutional': 'Architecture for learning, working and community environments, with an emphasis on function and thoughtful design.', 'Public & Landscape': 'Designed environments that connect people, landscape and public life.', 'Commercial': 'Contemporary commercial architecture balancing identity, functionality and spatial experience.', 'Hospitality': 'Welcoming environments designed around experience, atmosphere and thoughtful detailing.', 'Interiors': 'Interior spaces shaped through materiality, light, proportion and carefully considered details.'}
out, fails = [], []
def ok(c, m): (out if c else fails).append(('PASS ' if c else 'FAIL ') + m); return c
def covers(pg): return pg.eval_on_selector_all('.project-marquee__cycle >> nth=0 >> .project-marquee__title', 'els=>els.map(e=>e.textContent)') if False else pg.evaluate("[...document.querySelectorAll('.project-marquee__cycle')[0].querySelectorAll('.project-marquee__title')].map(e=>e.textContent)")
with sync_playwright() as p:
    b = p.chromium.launch()
    if PART == 'filters':
        for W in [320, 360, 375, 390, 414, 430, 768, 1024, 1440]:
            ctx = b.new_context(viewport={'width': W, 'height': 900}, has_touch=W < 800, is_mobile=W < 500); pg = ctx.new_page(); errs = []
            pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(BASE + '/projects', wait_until='networkidle'); pg.wait_for_selector('.project-marquee__card'); L = f'[{W}px]'
            m = pg.evaluate("""(()=>{const row=document.querySelector('.filters');const chips=[...row.querySelectorAll('.chip')];const r=row.getBoundingClientRect();
              return {n:chips.length,tops:[...new Set(chips.map(c=>Math.round(c.getBoundingClientRect().top)))],hs:[...new Set(chips.map(c=>Math.round(c.getBoundingClientRect().height)))],
              clipped:chips.filter(c=>c.scrollWidth>c.clientWidth+1).length,scrollable:row.scrollWidth>row.clientWidth+1,pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}})()""")
            ok(m['n'] == 7 or m['n'] == 7, f'{L} 7 category chips'); 
            ok(len(m['tops']) == 1 and len(m['hs']) == 1, f'{L} chips on one row ({m["tops"]}) with equal height ({m["hs"]}); selector scrollable={m["scrollable"]}')
            ok(m['clipped'] == 0 and m['pageOverflow'] <= 0, f'{L} no clipped chip text ({m["clipped"]}), page overflow {m["pageOverflow"]}px')
            # every category: heading, count, description, 7 projects, correct titles; active chip visible
            for c in CATS + ['All']:
                pg.click(f".filters .chip:has-text('{c}') >> nth=0") if c != 'All' else pg.click('.filters .chip >> nth=0'); pg.wait_for_timeout(2300)
                head = pg.locator('.pf-info__count').text_content().strip(); desc = pg.locator('.pf-info__desc').text_content().strip()
                exp = '42 Design Explorations' if c == 'All' else f'7 Design Explorations · {c}'
                titles = sorted(covers(pg)); expt = sorted(x['t'] for x in data['p']) if c == 'All' else BYCAT[c]
                vis = pg.evaluate("""(()=>{const row=document.querySelector('.filters'),a=row.querySelector('[aria-pressed=true]'),r=row.getBoundingClientRect(),q=a.getBoundingClientRect();return q.left>=r.left-1&&q.right<=r.right+1})()""")
                if W in (390, 1440) or c in ('Interiors', 'All'):
                    ok(head == exp and desc == INFO[c] and titles == expt and vis, f'{L} {c}: heading "{head}", description ok={desc == INFO[c]}, {len(titles)} projects correct={titles == expt}, active chip visible={vis}')
                else:
                    ok(head == exp and desc == INFO[c] and titles == expt and vis, f'{L} {c}: heading/description/{len(titles)} projects/active chip visible')
            # transition: right after a click the stage is leaving (opacity < 1), later settled
            pg.click(".filters .chip:has-text('Hospitality')"); pg.wait_for_timeout(150); o1 = float(pg.evaluate("getComputedStyle(document.querySelector('.pm-stage')).opacity")); ph = pg.get_attribute('.pm-stage', 'data-phase')
            pg.wait_for_timeout(2300); o2 = float(pg.evaluate("getComputedStyle(document.querySelector('.pm-stage')).opacity")); ph2 = pg.get_attribute('.pm-stage', 'data-phase')
            ok(ph in ('out', 'in') and ph2 == 'idle' and o2 == 1, f'{L} carousel transition: phase {ph} (opacity {o1:.2f}) -> {ph2} (opacity {o2})')
            ok(not errs, f'{L} no console errors {errs[:2]}'); ctx.close()
    else:
        mobile = VP == 'mobile'; W, H = (390, 844) if mobile else (1440, 900)
        ctx = b.new_context(viewport={'width': W, 'height': H}, has_touch=mobile, is_mobile=mobile); pg = ctx.new_page(); errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('response', lambda r: errs.append(f'HTTP {r.status} {r.url}') if r.status >= 400 else None)
        L = f'[{VP}]'
        def label():
            try: pg.wait_for_selector('.return-bar__btn', timeout=8000)
            except Exception: return f'<no back bar at {pg.url.replace(BASE, "")}>'
            return pg.locator('.return-bar__btn').first.text_content().replace('←', '').strip()
        def menu(href):
            if W < 1000: pg.click('.nav-toggle'); pg.wait_for_timeout(500); pg.locator(f".mnav a[href='{href}']").first.click()
            else: pg.locator(f"header a[href='{href}']").first.click()
            pg.wait_for_timeout(900)
        def chip(c): pg.click(f".filters .chip:has-text('{c}') >> nth=0"); pg.wait_for_timeout(500)
        def hist_len(): return pg.evaluate('history.length')
        def card_click(k=0):
            # the carousel never stops moving, so click by coordinates on the k-th fully visible card (like a visitor would); retry if the page moved under the pointer
            for attempt in range(3):
                pg.wait_for_selector(".pm-stage[data-phase='idle']", timeout=8000)     # let the category transition finish
                pg.evaluate("document.querySelector('.project-marquee').scrollIntoView({block:'center'})"); pg.wait_for_timeout(500)
                pt = pg.evaluate("(k=>{const cs=[...document.querySelectorAll('.project-marquee__cycle')[0].querySelectorAll('a.project-marquee__card')].map(a=>a.getBoundingClientRect()).filter(r=>r.left>8&&r.right<innerWidth-8&&r.top>0&&r.bottom<innerHeight).sort((a,b)=>a.left-b.left);const r=cs[Math.min(k,cs.length-1)]||[...document.querySelectorAll('a.project-marquee__card')][0].getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})(%d)" % k)
                pg.mouse.move(pt[0], pt[1]); pg.mouse.click(pt[0], pt[1]); pg.wait_for_timeout(900)
                if re.search(r'/projects/[^/?]+', pg.url): return
        def reception_then_projects():
            pg.goto(BASE + '/reception', wait_until='load'); pg.wait_for_timeout(1200)
            pg.evaluate("history.pushState({usr:null,key:'r1',idx:1},'','/projects'); dispatchEvent(new PopStateEvent('popstate',{state:history.state}))"); pg.wait_for_selector('.filters')
        # T2: Home -> Projects -> 4 categories -> Back = Home, label constant, no history growth
        pg.goto(BASE + '/', wait_until='networkidle'); menu('/projects'); pg.wait_for_selector('.filters'); h0 = hist_len(); labs = [label()]
        for c in ['Residential', 'Interiors', 'Commercial', 'Hospitality']: chip(c); labs.append(label())
        ok(set(labs) == {'Back to Home'} and hist_len() == h0, f'{L} T2 Home→Projects→4 categories: label stays {set(labs)}, history entries unchanged ({h0}→{hist_len()})')
        pg.click('.return-bar__btn'); pg.wait_for_timeout(900); ok(pg.url.rstrip('/') == BASE, f'{L} T2 Back returns to Home ({pg.url})')
        # T1: Reception -> Projects -> categories -> Back = Reception
        reception_then_projects(); labs = [label()]
        for c in ['Residential', 'Commercial', 'Hospitality']: chip(c); labs.append(label())
        ok(set(labs) == {'Back to Reception'}, f'{L} T1 Reception→Projects→categories: label stays {set(labs)}')
        pg.click('.return-bar__btn'); pg.wait_for_timeout(1500); ok(pg.url.endswith('/reception'), f'{L} T1 Back returns to Reception ({pg.url})')
        # T3: Reception -> Projects -> Commercial -> project -> Back (Projects, Commercial) -> Back (Reception)
        reception_then_projects(); chip('Commercial'); card_click(1); pg.wait_for_url('**/projects/*'); pg.wait_for_timeout(500)
        ok(label() == 'Back to Projects', f'{L} T3 project page label "{label()}"')
        pg.click('.return-bar__btn'); pg.wait_for_url('**/projects?category=Commercial'); pg.wait_for_selector('.filters')
        pressed = pg.eval_on_selector('.chip[aria-pressed=true]', 'e=>e.childNodes[0].textContent.trim()')
        ok(pressed == 'Commercial' and label() == 'Back to Reception', f'{L} T3 Back → Projects with "{pressed}" selected, bar says "{label()}"')
        pg.click('.return-bar__btn'); pg.wait_for_timeout(1500); ok(pg.url.endswith('/reception'), f'{L} T3 second Back → Reception ({pg.url})')
        # T4: Home featured project -> Back restores scroll
        pg.goto(BASE + '/', wait_until='networkidle'); pg.wait_for_timeout(800)
        loc = pg.locator("main a[href^='/projects/']").first; loc.scroll_into_view_if_needed(); pg.wait_for_timeout(500); y0 = pg.evaluate('scrollY'); loc.click(); pg.wait_for_url('**/projects/*'); pg.wait_for_timeout(500)
        ok(label() == 'Back to Home', f'{L} T4 featured project label "{label()}"'); pg.click('.return-bar__btn'); pg.wait_for_url(BASE + '/'); pg.wait_for_timeout(2000); y1 = pg.evaluate('scrollY')
        ok(y0 > 200 and abs(y1 - y0) < 80, f'{L} T4 Back to Home restores scroll ({y0}→{y1})')
        # T5: Services -> service -> project -> Back = service page with scroll
        pg.goto(BASE + '/services', wait_until='networkidle'); pg.locator("a[href^='/services/']").first.click(); pg.wait_for_url('**/services/*'); pg.wait_for_timeout(700)
        svc = pg.url
        pr = pg.locator("main a[href^='/projects/']").first; pr.scroll_into_view_if_needed(); pg.wait_for_timeout(500); y0 = pg.evaluate('scrollY'); pr.click(); pg.wait_for_url('**/projects/*'); pg.wait_for_timeout(500)
        lab = label(); pg.click('.return-bar__btn'); pg.wait_for_timeout(1800); y1 = pg.evaluate('scrollY')
        ok(pg.url == svc and lab.startswith('Back to') and abs(y1 - y0) < 80, f'{L} T5 Services→project: bar "{lab}", Back returns to service page={pg.url == svc}, scroll {y0}→{y1}')
        # T6: project A -> related project B -> Back = A
        pg.goto(BASE + '/projects/stepwell-courtyard-house', wait_until='networkidle'); a_url = pg.url
        rel = pg.locator("main a[href^='/projects/']:not([href$='stepwell-courtyard-house'])"); rel.first.scroll_into_view_if_needed(); rel.first.click(); pg.wait_for_url(lambda u: u != a_url and '/projects/' in u); pg.wait_for_timeout(500)
        lab = label(); pg.click('.return-bar__btn'); pg.wait_for_timeout(900); ok(pg.url == a_url and lab.startswith('Back to'), f'{L} T6 Project A→related B: bar "{lab}", Back returns to A={pg.url == a_url}')
        # T7: Journal: Home -> Journal -> category -> article -> Back (same category) -> Back (Home)
        pg.goto(BASE + '/', wait_until='networkidle'); menu('/journal'); pg.wait_for_selector('.chip, button[aria-pressed]'); h0 = hist_len()
        cats = pg.eval_on_selector_all('button[aria-pressed]', 'els=>els.map(e=>e.childNodes[0].textContent.trim())'); target = next((c for c in cats if not c.startswith('All')), None)
        if target:
            pg.click(f"button[aria-pressed]:has-text('{target}') >> nth=0"); pg.wait_for_timeout(600)
            ok(label() == 'Back to Home' and hist_len() == h0, f'{L} T7 Journal category "{target}": label "{label()}", history unchanged ({h0}→{hist_len()})')
            art = pg.locator("a[href^='/journal/']").first; art.scroll_into_view_if_needed(); art.click(); pg.wait_for_url('**/journal/*'); pg.wait_for_timeout(600); lab = label()
            pg.click('.return-bar__btn'); pg.wait_for_url(lambda u: '/journal?category=' in u); pg.wait_for_timeout(500)
            pressed = pg.eval_on_selector('button[aria-pressed=true]', 'e=>e.childNodes[0].textContent.trim()')
            ok(lab == 'Back to Journal' and pressed == target and label() == 'Back to Home', f'{L} T7 article bar "{lab}", Back → Journal with "{pressed}" selected, bar "{label()}"')
            pg.click('.return-bar__btn'); pg.wait_for_timeout(900); ok(pg.url.rstrip('/') == BASE, f'{L} T7 second Back → Home')
        else: ok(False, f'{L} T7 no journal category found')
        # T8: header: Home -> About -> Services -> Process -> Back = Services
        pg.goto(BASE + '/', wait_until='networkidle'); menu('/studio'); l1 = label(); menu('/services'); l2 = label(); menu('/process'); l3 = label()
        ok((l1, l2, l3) == ('Back to Home', 'Back to About', 'Back to Services'), f'{L} T8 labels {l1} / {l2} / {l3}'); pg.click('.return-bar__btn'); pg.wait_for_timeout(800); ok(pg.url.endswith('/services'), f'{L} T8 Back → Services')
        # T10: direct URLs
        for url, exp_label, exp_path in [('/projects/stepwell-courtyard-house', 'Back to Projects', '/projects'), ('/projects', 'Back to Home', '/'), ('/services', 'Back to Home', '/'), ('/contact', 'Back to Home', '/'), ('/team', 'Back to Home', '/'), ('/process', 'Back to Home', '/'), ('/journal', 'Back to Home', '/'), ('/studio', 'Back to Home', '/')]:
            pg.goto('about:blank'); pg.goto(BASE + url, wait_until='networkidle'); lab = label(); pg.click('.return-bar__btn'); pg.wait_for_timeout(700); ok(lab == exp_label and pg.url.replace(BASE, '') == exp_path, f'{L} T10 direct {url}: "{lab}" → {pg.url.replace(BASE, "")}')
        pg.goto(BASE + '/journal', wait_until='networkidle'); art = pg.locator("a[href^='/journal/']").first.get_attribute('href'); pg.goto('about:blank'); pg.goto(BASE + art, wait_until='networkidle'); lab = label(); pg.click('.return-bar__btn'); pg.wait_for_timeout(700)
        ok(lab == 'Back to Journal' and pg.url.endswith('/journal'), f'{L} T10 direct article: "{lab}" → {pg.url.replace(BASE, "")}')
        # T11: refresh keeps page, category and Back destination
        pg.goto(BASE + '/', wait_until='networkidle'); menu('/projects'); chip('Commercial'); pg.reload(wait_until='networkidle'); pg.wait_for_selector('.filters')
        pressed = pg.eval_on_selector('.chip[aria-pressed=true]', 'e=>e.childNodes[0].textContent.trim()'); ok(pressed == 'Commercial' and label() == 'Back to Home', f'{L} T11 refresh: "{pressed}" still selected, bar "{label()}"')
        pg.click('.return-bar__btn'); pg.wait_for_timeout(800); ok(pg.url.rstrip('/') == BASE, f'{L} T11 Back after refresh → Home')
        # T12: browser back/forward over filters and project
        pg.goto(BASE + '/', wait_until='networkidle'); menu('/projects'); chip('Hospitality'); chip('Interiors'); card_click(0); pg.wait_for_url('**/projects/*')
        pg.go_back(); pg.wait_for_timeout(700); u1 = pg.url; pg.go_back(); pg.wait_for_timeout(700); u2 = pg.url; pg.go_forward(); pg.wait_for_timeout(700); u3 = pg.url
        ok(u1.endswith('/projects?category=Interiors') and u2.rstrip('/') == BASE and u3.endswith('/projects?category=Interiors'), f'{L} T12 browser Back/Forward: {u1.replace(BASE,"")} | {u2.replace(BASE,"")} | {u3.replace(BASE,"")}')
        # menu closes after navigation + logo returns home
        if W < 1000: pg.click('.nav-toggle'); pg.wait_for_timeout(400); pg.locator(".mnav a[href='/contact']").first.click(); pg.wait_for_timeout(800); ok(pg.locator('.mnav').count() == 0, f'{L} mobile menu closes after navigation')
        pg.locator("header a.brand").first.click(); pg.wait_for_timeout(800); ok(pg.url.rstrip('/') == BASE, f'{L} logo returns to Home')
        # links: every internal link in header/pages resolves (no dead routes)
        hrefs = set()
        for r in ['/', '/studio', '/projects', '/services', '/process', '/team', '/journal', '/contact']:
            pg.goto(BASE + r, wait_until='networkidle'); hrefs |= set(pg.eval_on_selector_all("a[href^='/']", 'els=>els.map(e=>e.getAttribute("href").split("?")[0].split("#")[0])'))
        bad = []
        for h in sorted(hrefs):
            pg.goto(BASE + h, wait_until='load'); pg.wait_for_timeout(250)
            if 'not found' in pg.evaluate('document.body.innerText').lower()[:400] and h != '/404': bad.append(h)
        ok(not bad, f'{L} link audit: {len(hrefs)} distinct internal links across 8 pages, dead={bad}')
        ok(not errs, f'{L} console/network errors: {errs[:3]}'); ctx.close()
    b.close()
print('\n'.join(out)); print('\n'.join(fails)); print(f'\n{len(out)} passed, {len(fails)} failed')
