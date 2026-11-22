import datetime, json
from playwright.sync_api import sync_playwright
B='http://localhost:4173'; res=[]
def ok(name,cond,detail=''): res.append((name,bool(cond),detail)); print(('PASS ' if cond else 'FAIL ')+name, detail)
def mk(b,hh,mm=30,vp=(1440,900),**kw):
    ctx=b.new_context(viewport={'width':vp[0],'height':vp[1]},**kw); pg=ctx.new_page(); pg.errs=[]; pg.fails=[]
    pg.on('pageerror',lambda e:pg.errs.append(str(e))); pg.on('console',lambda m: pg.errs.append(m.text) if m.type=='error' else None)
    pg.on('requestfailed',lambda r: pg.fails.append(r.url)); pg.on('response',lambda r: pg.fails.append(f'{r.status} {r.url}') if r.status>=400 and '/api/' not in r.url else None)
    pg.clock.install(time=datetime.datetime(2026,11,18,hh,mm)); return ctx,pg
import subprocess
slugs=json.loads(subprocess.check_output(['node','-e',"import('/home/claude/TOP_NAV_FILTERS/src/content/projects.js').then(m=>console.log(JSON.stringify(m.PROJECTS.filter(p=>p.published).map(p=>[p.slug,p.title,p.gallery.length]))))"]))
svc=json.loads(subprocess.check_output(['node','-e',"import('/home/claude/TOP_NAV_FILTERS/src/content/services.js').then(async s=>{const p=await import('/home/claude/TOP_NAV_FILTERS/src/content/projects.js');console.log(JSON.stringify(s.SERVICES.map(x=>[x.slug,x.title,s.serviceProjects(x.slug,p.PROJECTS).length])))})"]))
arts=json.loads(subprocess.check_output(['node','-e',"import('/home/claude/TOP_NAV_FILTERS/src/content/journal.js').then(m=>console.log(JSON.stringify(m.ARTICLES.filter(a=>a.published).map(a=>[a.slug,a.title]))))"]))
with sync_playwright() as p:
    b=p.chromium.launch()
    for hh,mm,exp in [(6,59,'night'),(7,0,'day'),(17,59,'day'),(18,0,'night'),(0,0,'night'),(12,0,'day')]:
        ctx,pg=mk(b,hh,mm); pg.goto(B+'/contact',wait_until='domcontentloaded'); early=pg.evaluate("document.documentElement.dataset.theme"); pg.wait_for_timeout(500)
        meta=pg.evaluate("document.querySelector('meta[name=theme-color]').content"); bg=pg.evaluate("getComputedStyle(document.documentElement).backgroundColor")
        ok(f'theme {hh:02d}:{mm:02d} -> {exp} (pre-paint attr already correct)',early==exp and pg.evaluate("document.documentElement.dataset.theme")==exp,f'meta={meta} html-bg={bg}'); ctx.close()
    # ---- all 42 projects, both themes
    for hh,name in [(12,'day'),(22,'night')]:
        ctx,pg=mk(b,hh,vp=(1280,800)); bad=[]
        for slug,title,ng in slugs:
            pg.goto(f'{B}/projects/{slug}',wait_until='domcontentloaded'); pg.wait_for_timeout(450)
            h1=pg.locator('h1').first.inner_text().replace('\n',' ').strip()
            imgs=pg.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length")
            ov=pg.evaluate("document.documentElement.scrollWidth-innerWidth"); rl=pg.locator('.return-link').count()
            cnt=pg.locator('.gallery__item').count()
            if h1.lower()!=title.lower() or imgs or ov>0 or rl!=1 or pg.evaluate("document.documentElement.dataset.theme")!=name: bad.append((slug,h1,imgs,ov,rl))
        ok(f'42 project detail pages ({name}): title, no broken images, no overflow, one return link',len(bad)==0 and len(slugs)==42,str(bad[:3])); ctx.close()
    # ---- services
    ctx,pg=mk(b,12)
    for slug,title,n in svc:
        pg.goto(f'{B}/services/{slug}',wait_until='networkidle'); pg.wait_for_timeout(900)
        shown=pg.evaluate("new Set([...document.querySelectorAll('a[href^=\"/projects/\"]')].map(a=>a.getAttribute('href'))).size")
        ok(f'service {slug}: lists {n} relevant projects',shown>=n and pg.locator('h1').first.inner_text().strip()!='' and pg.locator('a[href=\"/contact\"]').count()>0,f'links shown={shown}')
    for slug,title in arts:
        pg.goto(f'{B}/journal/{slug}',wait_until='networkidle'); pg.wait_for_timeout(600); ok(f'article {slug} opens',pg.locator('h1').first.inner_text().strip().lower()==title.lower())
    ctx.close()
    # ---- EXPLORE TOP content + search + keyboard + history
    ctx,pg=mk(b,12,vp=(820,1180)); pg.goto(B+'/projects',wait_until='networkidle'); pg.wait_for_timeout(1200)
    pg.click('.xt-trigger'); pg.wait_for_timeout(600)
    cnt=pg.evaluate("({pages:document.querySelectorAll('#xt-h-pages ~ .xt-list > li').length,groups:document.querySelectorAll('.xt-gh').length,projectLinks:document.querySelectorAll('.xt-plist a').length})")
    ok('EXPLORE TOP initial panel: 9 main destinations only (no category/service/project/article lists)',cnt=={'pages':9,'groups':0,'projectLinks':0},str(cnt))
    ok('dialog semantics + body scroll locked',pg.get_attribute('.xt','role')=='dialog' and pg.get_attribute('.xt','aria-modal')=='true' and pg.evaluate("getComputedStyle(document.body).overflow")=='hidden')
    ok('current location trail',pg.locator('.xt-trail [aria-current=location]').inner_text()=='Projects')
    for q,want in [('house','/projects?category=Residential'),('interiors','/services/interior-design'),('commercial building','/projects?category=Commercial'),('Stepwell Courtyard House','/projects/stepwell-courtyard-house'),('the space between','/journal/the-space-between-buildings')]:
        pg.fill('#xt-q',q); pg.wait_for_timeout(250); hrefs=pg.evaluate("[...document.querySelectorAll('.xt-results a')].map(a=>a.getAttribute('href'))")
        ok(f'search "{q}" -> contains {want}',want in hrefs,str(hrefs[:4]))
    pg.fill('#xt-q','zzzqq'); pg.wait_for_timeout(250); ok('no-results message + clear',pg.locator('.xt-empty').count()==1)
    pg.click('.xt-empty .btn'); ok('clear returns to full navigation',pg.locator('.xt-main').count()==1 and pg.input_value('#xt-q')=='')
    pg.fill('#xt-q','residential'); pg.keyboard.press('ArrowDown'); f1=pg.evaluate("document.activeElement.getAttribute('href')"); pg.keyboard.press('ArrowDown'); f2=pg.evaluate("document.activeElement.getAttribute('href')")
    ok('ArrowDown moves through results (no page scroll jump)',f1 and f2 and f1!=f2,f'{f1} -> {f2}')
    pg.keyboard.press('Enter'); pg.wait_for_timeout(900); ok('Enter opens result and closes overlay',pg.locator('.xt').count()==0 and f2.split('?')[0] in pg.url.replace(B,''),pg.url)
    pg.go_back(); pg.wait_for_timeout(700); ok('browser Back returns to the previous page',pg.url.endswith('/projects'),pg.url); pg.go_forward(); pg.wait_for_timeout(700); ok('browser Forward works',pg.url!=B+'/projects',pg.url)
    # tab trap + escape + focus restoration
    pg.click('.xt-trigger'); pg.wait_for_timeout(500)
    for _ in range(80): pg.keyboard.press('Tab')
    ok('Tab stays inside dialog',pg.evaluate("!!document.activeElement.closest('.xt')"))
    for _ in range(80): pg.keyboard.press('Shift+Tab')
    ok('Shift+Tab stays inside dialog',pg.evaluate("!!document.activeElement.closest('.xt')"))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); ok('Escape closes; focus restored to trigger',pg.locator('.xt').count()==0 and pg.evaluate("document.activeElement.classList.contains('xt-trigger')"))
    ctx.close()
    # ---- 6 viewports x main pages: overflow/errors; EXPLORE TOP fits viewport
    routes=['/','/studio','/projects','/projects/cloudstone-mountain-house','/services','/services/architecture','/process','/team','/journal','/journal/the-space-between-buildings','/contact','/nope']
    for vp in [(1440,900),(1280,800),(1024,768),(820,1180),(390,844),(360,740)]:
        for hh,name in [(12,'day'),(22,'night')]:
            ctx,pg=mk(b,hh,vp=vp); bad=[]
            for r in routes:
                pg.goto(B+r,wait_until='domcontentloaded'); pg.wait_for_timeout(500); ov=pg.evaluate("document.documentElement.scrollWidth-innerWidth")
                if ov>0: bad.append((r,ov))
            x=''
            if vp[0]<=1240:
                pg.goto(B+'/',wait_until='networkidle'); pg.click('.xt-trigger'); pg.wait_for_timeout(500)
                m=pg.evaluate("(()=>{const e=document.querySelector('.xt'),b=document.querySelector('.xt-body');const r=e.getBoundingClientRect();return {w:r.width<=innerWidth, h:r.height<=innerHeight+1, hx:b.scrollWidth<=b.clientWidth+1}})()")
                if not all(m.values()): bad.append(('xt',m))
            ok(f'{vp[0]}x{vp[1]} {name}: {len(routes)} routes (+overlay) no overflow, no page errors',not bad and not pg.errs,f'{bad} {pg.errs[:1]}'); ctx.close()
    b.close()
json.dump(res,open('/tmp/qa2.json','w')); print('\nTOTAL',len(res),'FAILED',len([r for r in res if not r[1]]))
