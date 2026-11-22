import datetime, json
from playwright.sync_api import sync_playwright
B='http://localhost:4173'
res=[]
def ok(name,cond,detail=''): res.append((name,bool(cond),detail)); print(('PASS ' if cond else 'FAIL ')+name, detail)
def mk(b,hh,mm=30,vp=(1440,900),**kw):
    ctx=b.new_context(viewport={'width':vp[0],'height':vp[1]},**kw); pg=ctx.new_page(); pg.errs=[]
    pg.on('pageerror',lambda e:pg.errs.append(str(e))); pg.on('console',lambda m: pg.errs.append(m.text) if m.type=='error' else None)
    pg.clock.install(time=datetime.datetime(2026,11,18,hh,mm)); return ctx,pg
with sync_playwright() as p:
    b=p.chromium.launch()
    # ---- THEME boundaries (local time) + prepaint
    for hh,mm,exp in [(6,59,'night'),(7,0,'day'),(17,59,'day'),(18,0,'night'),(0,0,'night'),(12,0,'day')]:
        ctx,pg=mk(b,hh,mm); pg.goto(B+'/contact',wait_until='domcontentloaded')
        th_early=pg.evaluate("document.documentElement.dataset.theme"); pg.wait_for_timeout(500)
        meta=pg.evaluate("document.querySelector('meta[name=theme-color]').content"); bgc=pg.evaluate("getComputedStyle(document.body).backgroundColor")
        ok(f'theme {hh:02d}:{mm:02d} -> {exp}', th_early==exp and pg.evaluate("document.documentElement.dataset.theme")==exp, f'meta={meta} body={bgc}')
        ctx.close()
    # open tab: 17:59:50 -> passes 18:00
    ctx,pg=mk(b,17,59); pg.clock.set_fixed_time  # noqa
    pg.goto(B+'/',wait_until='networkidle'); t0=pg.evaluate("document.documentElement.dataset.theme")
    pg.clock.fast_forward(40*1000*60); pg.wait_for_timeout(300)
    t1=pg.evaluate("document.documentElement.dataset.theme"); ok('open tab flips day->night after 18:00 without reload',t0=='day' and t1=='night',f'{t0}->{t1}')
    pg.click('.nav a[href="/projects"]'); pg.wait_for_timeout(600); ok('route navigation keeps theme',pg.evaluate("document.documentElement.dataset.theme")=='night')
    pg.reload(wait_until='networkidle'); ok('refresh keeps theme',pg.evaluate("document.documentElement.dataset.theme")=='night'); ctx.close()
    # ---- NAV: desktop vs tablet/mobile, no legacy Menu
    for vp,desk in [((1440,900),True),((1280,800),True),((1024,768),False),((820,1180),False),((390,844),False),((360,740),False)]:
        ctx,pg=mk(b,12,vp=vp); pg.goto(B+'/',wait_until='networkidle'); pg.wait_for_timeout(800)
        trig=pg.locator('.xt-trigger').is_visible(); nav=pg.locator('header .nav').is_visible(); menu=pg.get_by_role('button',name='Menu',exact=True).count()
        ok(f'nav @{vp[0]}: {"direct links" if desk else "EXPLORE TOP trigger"}, no Menu', (nav and not trig if desk else trig and not nav) and menu==0, f'trigger={trig} nav={nav}')
        ctx.close()
    # ---- active underline colours
    for hh,exp in [(12,'rgb(48, 77, 120)'),(22,'rgb(186, 142, 52)')]:
        ctx,pg=mk(b,hh); pg.goto(B+'/projects',wait_until='networkidle'); pg.wait_for_timeout(500)
        c=pg.evaluate("getComputedStyle(document.querySelector('.nav a[aria-current=page]'),'::after').backgroundColor"); ah=pg.evaluate("document.querySelector('.nav a[aria-current=page]').getAttribute('aria-current')")
        ok(f'active underline colour {"day" if hh==12 else "night"}',c==exp and ah=='page',c); ctx.close()
    # ---- studio heading not clipped at all viewports
    for vp in [(1440,900),(1280,800),(1024,768),(820,1180),(390,844),(360,740)]:
        ctx,pg=mk(b,12,vp=vp); pg.goto(B+'/studio',wait_until='networkidle'); pg.wait_for_timeout(2500)
        r=pg.evaluate("""()=>{const h=document.querySelector('.statement-h1');return [...h.querySelectorAll('.rv--line')].map(s=>{const w=s.getBoundingClientRect().width;const c=s.firstElementChild||s;const r=document.createRange();r.selectNodeContents(s);return [Math.round(r.getBoundingClientRect().width),Math.round(w),s.scrollWidth>s.clientWidth+1]})}""")
        ok(f'studio h1 not clipped @{vp[0]}', all(not x[2] for x in r), str(r)); ctx.close()
    # ---- FILTERS + return link
    ctx,pg=mk(b,12); pg.goto(B+'/projects',wait_until='networkidle'); pg.wait_for_timeout(1500)
    cats=['Residential','Institutional','Public & Landscape','Commercial','Hospitality','Interiors']
    for c in cats:
        pg.click(f'button.chip:has-text("{c}")'); pg.wait_for_timeout(700)
        n=pg.evaluate("new Set([...document.querySelectorAll('.project-marquee__card[href^=\"/projects/\"]')].map(a=>a.getAttribute('href'))).size")
        pressed=pg.evaluate(f"[...document.querySelectorAll('button.chip')].find(b=>b.textContent.includes('{c}'))?.getAttribute('aria-pressed')")
        ok(f'filter {c}: active + {n} cards',pressed=='true' and n==7, f'url={pg.url.replace(B,"")}')
    pg.click('button.chip:has-text("Residential")'); pg.wait_for_timeout(600)
    first=pg.locator('.project-marquee__card[href^="/projects/"]').first; href=first.get_attribute('href'); first.evaluate('e=>e.click()'); pg.wait_for_timeout(1800)
    lab=pg.locator('.return-link__label').inner_text(); ok('return label from filtered list',lab.strip().lower()=='return to residential',lab)
    pg.click('.return-link'); pg.wait_for_timeout(1200); ok('return restores filtered collection',('category=Residential' in pg.url) and pg.url.endswith('Residential'),pg.url)
    ctx.close()
    ctx,pg=mk(b,12); pg.goto(B+'/projects/cantilever-house',wait_until='networkidle'); pg.wait_for_timeout(1200)
    ok('direct load has parent fallback return link',pg.locator('.return-link').count()==1,pg.locator('.return-link__label').inner_text() if pg.locator('.return-link').count() else '')
    ctx.close()
    ctx,pg=mk(b,12); pg.goto(B+'/services',wait_until='networkidle'); pg.click('a[href^="/services/"] >> nth=0'); pg.wait_for_timeout(1200)
    ok('service detail -> RETURN TO SERVICES',pg.locator('.return-link__label').inner_text().strip().lower()=='return to services',pg.locator('.return-link__label').inner_text()); ctx.close()
    ctx,pg=mk(b,12); pg.goto(B+'/journal',wait_until='networkidle'); pg.wait_for_timeout(800); pg.click('main a[href^="/journal/"] >> nth=0'); pg.wait_for_timeout(1500)
    ok('article -> RETURN TO JOURNAL',pg.locator('.return-link__label').inner_text().strip().lower()=='return to journal',pg.locator('.return-link__label').inner_text()); ctx.close()
    b.close()
bad=[r for r in res if not r[1]]; print('\nTOTAL',len(res),'FAILED',len(bad)); json.dump(res,open('/tmp/qa1.json','w'))
