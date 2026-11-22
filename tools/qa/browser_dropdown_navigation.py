import datetime, json, subprocess
from playwright.sync_api import sync_playwright
B='http://localhost:4173'; res=[]
def ok(name,cond,detail=''): res.append((name,bool(cond),detail)); print(('PASS ' if cond else 'FAIL ')+name, detail)
def mk(b,hh=12,vp=(1440,900),clock=True):
    ctx=b.new_context(viewport={'width':vp[0],'height':vp[1]}); ctx.add_init_script("sessionStorage.setItem('top-architects-intro-seen','seen')")   # the first-visit intro splash would otherwise take keyboard focus
    pg=ctx.new_page(); pg.errs=[]; pg.on('pageerror',lambda e:pg.errs.append(str(e)))
    if clock: pg.clock.install(time=datetime.datetime(2026,11,18,hh,30))   # the mocked clock also freezes requestAnimationFrame, so keyboard-focus tests run without it
    return ctx,pg
arts=json.loads(subprocess.check_output(['node','-e',"import('/home/claude/TOP_NAV_FILTERS/src/content/journal.js').then(m=>console.log(JSON.stringify(m.ARTICLES.map(a=>[a.slug,a.title]))))"]))
cats=['Residential','Commercial','Institutional','Public & Landscape','Interiors','Hospitality']
svcs=[('Architecture','architecture'),('Interior Design','interior-design'),('Planning & Spatial Design','planning-spatial-design'),('Architectural Visualization','architectural-visualization'),('Design Consultancy','design-consultancy')]
def hdr(pg): return pg.evaluate("document.querySelector('.header').getBoundingClientRect().bottom")
def hover(pg,name): pg.locator(f'.nav-dd:has(> .nav-dd__parent a:text-is("{name}"))').hover(); pg.wait_for_timeout(350)
with sync_playwright() as p:
    b=p.chromium.launch()
    for vp in [(1440,900),(1280,800)]:
        ctx,pg=mk(b,vp=vp); pg.goto(B+'/',wait_until='networkidle'); pg.wait_for_timeout(1200)
        labels=pg.evaluate("[...document.querySelectorAll('header .nav > a, header .nav > .nav-dd > .nav-dd__parent > a')].map(a=>a.textContent.trim())")
        ok(f'desktop header @{vp[0]}: required links in order, EXPLORE TOP hidden',labels==['Home','About / Studio','Projects','Services','Our Process','Journal','Contact','Enter 3D Reception'] and not pg.locator('.xt-trigger').is_visible(),str(labels))
        ov=pg.evaluate("(()=>{const n=document.querySelector('.header__in').getBoundingClientRect();const nav=document.querySelector('.nav').getBoundingClientRect();return [Math.round(nav.right),Math.round(n.right),document.documentElement.scrollWidth-innerWidth]})()"); ok(f'header fits @{vp[0]} without overflow',ov[2]<=0 and ov[0]<=ov[1]+1,str(ov)); ctx.close()
    # hover panels
    ctx,pg=mk(b); pg.goto(B+'/',wait_until='networkidle'); pg.wait_for_timeout(1200)
    hover(pg,'Projects'); items=pg.evaluate("[...document.querySelectorAll('#dd-projects a')].map(a=>a.textContent.trim())"); vis=pg.locator('#dd-projects').is_visible()
    ok('hover Projects -> six categories',vis and items==cats,str(items))
    # pointer travels from parent to panel through the gap without closing it
    box=pg.locator('.nav-dd:has(> .nav-dd__parent a:text-is("Projects")) .nav-dd__parent a').bounding_box(); tgt=pg.locator('#dd-projects a').nth(2).bounding_box()
    pg.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2); pg.wait_for_timeout(150)
    pg.mouse.move(box['x']+box['width']/2,tgt['y']-3,steps=8); pg.wait_for_timeout(300); still=pg.locator('#dd-projects').is_visible()
    pg.mouse.move(tgt['x']+10,tgt['y']+8,steps=4); pg.wait_for_timeout(200); ok('no flicker: panel stays open while the pointer moves parent -> panel',still and pg.locator('#dd-projects').is_visible())
    pg.mouse.move(700,700); pg.wait_for_timeout(500); ok('panel closes after the pointer leaves',not pg.locator('#dd-projects').is_visible())
    ctx.close()
    # every category shortcut: filter active immediately, projects visible without another click
    for c in cats:
        ctx,pg=mk(b); pg.goto(B+'/',wait_until='networkidle'); pg.wait_for_timeout(1000); hover(pg,'Projects'); pg.locator(f'#dd-projects a:text-is("{c}")').click(); pg.wait_for_timeout(1500)
        pressed=pg.evaluate(f"[...document.querySelectorAll('button.chip')].find(b=>b.textContent.includes({json.dumps(c)}))?.getAttribute('aria-pressed')")
        cards=pg.evaluate("[...document.querySelectorAll('.project-marquee__card')].filter(a=>{const r=a.getBoundingClientRect();return r.width>0&&r.bottom>0&&r.top<innerHeight}).length")
        urlc=pg.evaluate("new URLSearchParams(location.search).get('category')")
        ok(f'Projects > {c}: opens filtered, chip active, cards on screen',pressed=='true' and urlc==c and cards>0,f'url={pg.url.replace(B,"")} cards={cards}')
        if c=='Interiors':
            pg.reload(wait_until='networkidle'); pg.wait_for_timeout(1000); ok('refresh keeps the category',pg.evaluate("new URLSearchParams(location.search).get('category')")=='Interiors' and pg.evaluate("[...document.querySelectorAll('button.chip')].find(b=>b.textContent.includes('Interiors'))?.getAttribute('aria-pressed')")=='true')
            pg.go_back(); pg.wait_for_timeout(800); ok('browser Back leaves the filtered view',pg.url==B+'/')
        ctx.close()
    ctx,pg=mk(b); pg.goto(B+'/',wait_until='networkidle'); pg.wait_for_timeout(1000); hover(pg,'Projects'); pg.locator('#dd-projects a:text-is("Residential")').click(); pg.wait_for_timeout(1200)
    pg.locator('.project-marquee__card[href^="/projects/"]').first.evaluate('e=>e.click()'); pg.wait_for_timeout(1500)
    ok('contextual return from a dropdown-opened collection',pg.locator('.return-link__label').inner_text().strip().lower()=='return to residential'); ctx.close()
    # parent links open their main pages
    for name,path in [('Projects','/projects'),('Services','/services'),('Journal','/journal')]:
        ctx,pg=mk(b); pg.goto(B+'/contact',wait_until='networkidle'); pg.wait_for_timeout(800); pg.locator(f'.nav-dd > .nav-dd__parent a:text-is("{name}")').click(); pg.wait_for_timeout(1200)
        ok(f'parent {name} -> {path} (no filter / anchor), at top',pg.url==B+path and pg.evaluate("scrollY")<5,pg.url); ctx.close()
    # services anchors
    for title,anchor in svcs:
        ctx,pg=mk(b); pg.goto(B+'/',wait_until='networkidle'); pg.wait_for_timeout(1000); hover(pg,'Services'); pg.locator(f'#dd-services a:text-is("{title}")').click(); pg.wait_for_timeout(2500)
        r=pg.evaluate(f"(()=>{{const e=document.getElementById('{anchor}');const r=e.getBoundingClientRect();const h=document.querySelector('.header').getBoundingClientRect().bottom;const hd=e.querySelector('h2,h3,h1');const hr=hd.getBoundingClientRect();return {{top:Math.round(r.top),hdr:Math.round(h),headTop:Math.round(hr.top),headBottom:Math.round(hr.bottom),vh:innerHeight}}}})()")
        good=r['top']>=r['hdr']-4 and r['top']<=r['hdr']+60 and r['headBottom']>r['hdr'] and r['headTop']<r['vh']
        ok(f'Services > {title}: lands on #{anchor}, heading clear of the sticky header',pg.url.endswith('#'+anchor) and good,str(r))
        if title in ('Interior Design','Design Consultancy'):
            pg.reload(wait_until='networkidle'); pg.wait_for_timeout(2500); r2=pg.evaluate(f"document.getElementById('{anchor}').getBoundingClientRect().top"); ok(f'refresh keeps #{anchor} destination',abs(r2-r['hdr'])<=60,str(r2))
        ctx.close()
        ctx,pg=mk(b); pg.goto(f'{B}/services#{anchor}',wait_until='networkidle'); pg.wait_for_timeout(2500)
        t=pg.evaluate(f"document.getElementById('{anchor}').getBoundingClientRect().top"); ok(f'pasted URL /services#{anchor} in a new tab lands on the section',abs(t-hdr(pg))<=60,str(round(t))); ctx.close()
    ctx,pg=mk(b); pg.goto(B+'/services',wait_until='networkidle'); pg.wait_for_timeout(800); hover(pg,'Services'); pg.locator('#dd-services a:text-is("Architectural Visualization")').click(); pg.wait_for_timeout(2500); y1=pg.evaluate('scrollY')
    hover(pg,'Services'); pg.locator('#dd-services a:text-is("Architecture")').click(); pg.wait_for_timeout(2500); y2=pg.evaluate('scrollY')
    pg.go_back(); pg.wait_for_timeout(1500); y3=pg.evaluate('scrollY'); ok('same-page shortcuts scroll; browser Back returns to the previous section',y1>y2 and abs(y3-y1)<400 and pg.url.endswith('#architectural-visualization'),f'{y1},{y2},{y3} {pg.url}'); ctx.close()
    # journal shortcuts
    ctx,pg=mk(b,vp=(1280,800)); pg.goto(B+'/',wait_until='networkidle'); pg.wait_for_timeout(1000); hover(pg,'Journal'); n=pg.locator('#dd-journal a').count(); r=pg.evaluate("(()=>{const p=document.getElementById('dd-journal').getBoundingClientRect();return [Math.round(p.right),Math.round(p.bottom),innerWidth,innerHeight]})()")
    ok('Journal dropdown lists 12 stories, fits the viewport (not excessively tall)',n==12 and r[0]<=r[2] and r[1]<r[3]-20,str(r)); ctx.close()
    for slug,title in arts:
        ctx,pg=mk(b); pg.goto(B+'/',wait_until='networkidle'); pg.wait_for_timeout(700); hover(pg,'Journal'); pg.locator(f'#dd-journal a[href="/journal/{slug}"]').click(); pg.wait_for_timeout(1000)
        ok(f'Journal > {title[:44]}: opens the article directly',pg.url==f'{B}/journal/{slug}' and pg.locator('h1').first.inner_text().strip().lower()==title.lower() and pg.locator('.ahead').count()==1); ctx.close()
    # keyboard
    ctx,pg=mk(b,clock=False); pg.goto(B+'/process',wait_until='networkidle'); pg.wait_for_timeout(1000)
    pg.locator('.nav-dd:has(> .nav-dd__parent a:text-is("Projects")) .nav-dd__parent a').focus(); pg.keyboard.press('Tab'); on_btn=pg.evaluate("document.activeElement.classList.contains('nav-dd__btn')")
    pg.keyboard.press('Enter'); pg.wait_for_timeout(300); opened=pg.locator('#dd-projects').is_visible() and pg.get_attribute('.nav-dd__btn[aria-controls=dd-projects]','aria-expanded')=='true'
    pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(200); f1=pg.evaluate("document.activeElement.textContent.trim()"); pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(200); f2=pg.evaluate("document.activeElement.textContent.trim()")
    ok('keyboard: Tab to chevron, Enter opens, ArrowDown walks the items',on_btn and opened and f1=='Residential' and f2=='Commercial',f'{f1}, {f2}')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300); ok('Escape closes and focus returns to the chevron',not pg.locator('#dd-projects').is_visible() and pg.evaluate("document.activeElement.classList.contains('nav-dd__btn')"))
    pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    for _ in range(3): pg.keyboard.press('ArrowDown'); pg.wait_for_timeout(200)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(1200)
    ok('keyboard Enter on an item navigates to that category',pg.evaluate("new URLSearchParams(location.search).get('category')")=='Institutional',pg.url); ctx.close()
    ctx,pg=mk(b); pg.goto(B+'/',wait_until='networkidle'); pg.wait_for_timeout(800); pg.locator('.nav-dd:has(> .nav-dd__parent a:text-is("Services")) .nav-dd__btn').click(); pg.wait_for_timeout(300)
    ok('touch/click alternative: chevron opens the panel without hover',pg.locator('#dd-services').is_visible()); ctx.close()
    # mobile EXPLORE TOP stays simple and direct
    for vp in [(390,844),(820,1180)]:
        for name,path in [('Projects','/projects'),('Services','/services'),('Journal','/journal')]:
            ctx,pg=mk(b,vp=vp); pg.goto(B+'/',wait_until='networkidle'); pg.wait_for_timeout(900); pg.click('.xt-trigger'); pg.wait_for_timeout(500)
            if name=='Projects': ok(f'EXPLORE TOP @{vp[0]}: only the 9 main destinations',pg.locator('.xt-main .xt-link').count()==9 and pg.locator('.xt-plist').count()==0)
            pg.locator(f'.xt-main .xt-link .xt-t:text-is("{name}")').click(); pg.wait_for_timeout(1000); ok(f'EXPLORE TOP @{vp[0]}: {name} opens {path} directly',pg.url==B+path and pg.locator('.xt').count()==0,pg.url); ctx.close()
    ctx,pg=mk(b,vp=(390,844)); pg.goto(B+'/',wait_until='networkidle'); pg.click('.xt-trigger'); pg.fill('#xt-q','interior design'); pg.wait_for_timeout(300); pg.locator('.xt-results a').first.click(); pg.wait_for_timeout(1200); ok('mobile search opens a specific destination directly',pg.url!=B+'/' and 'interior' in pg.url,pg.url); ctx.close()
    b.close()
json.dump(res,open('/tmp/qa4.json','w')); print('\nTOTAL',len(res),'FAILED',len([r for r in res if not r[1]]))
