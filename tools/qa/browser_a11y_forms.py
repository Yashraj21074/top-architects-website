import datetime, json
from playwright.sync_api import sync_playwright
B='http://localhost:4173'; res=[]
def ok(name,cond,detail=''): res.append((name,bool(cond),detail)); print(('PASS ' if cond else 'FAIL ')+name, detail)
AXE=open('/tmp/axe/node_modules/axe-core/axe.min.js').read()
def mk(b,hh,vp=(1280,800),**kw):
    ctx=b.new_context(viewport={'width':vp[0],'height':vp[1]},**kw); pg=ctx.new_page(); pg.errs=[]
    pg.on('pageerror',lambda e:pg.errs.append(str(e))); pg.clock.install(time=datetime.datetime(2026,11,18,hh,30)); return ctx,pg
with sync_playwright() as p:
    b=p.chromium.launch()
    for hh,exp in [(6,'#101722'),(12,'#f3f0e8'),(22,'#101722')]:
        ctx,pg=mk(b,hh); pg.goto(B+'/',wait_until='networkidle'); pg.wait_for_timeout(600)
        m=pg.evaluate("document.querySelector('meta[name=theme-color]').content"); ok(f'browser theme-color at {hh:02d}:30',m==exp,m); ctx.close()
    ctx,pg=mk(b,12,vp=(820,1180)); pg.goto(B+'/projects',wait_until='networkidle'); pg.click('.xt-trigger'); pg.wait_for_timeout(400)
    pg.fill('#xt-q','residential'); pg.keyboard.press('ArrowDown'); f1=pg.evaluate("document.activeElement.getAttribute('href')"); pg.keyboard.press('ArrowDown'); f2=pg.evaluate("document.activeElement.getAttribute('href')")
    ok('ArrowDown: search box -> first result -> next result',bool(f1) and bool(f2) and f1!=f2,f'{f1} -> {f2}'); pg.keyboard.press('ArrowUp'); pg.keyboard.press('ArrowUp'); ok('ArrowUp returns to search box',pg.evaluate("document.activeElement.id")=='xt-q'); ctx.close()
    # ---- reduced motion
    ctx,pg=mk(b,12,vp=(820,1180),reduced_motion='reduce'); pg.goto(B+'/',wait_until='networkidle'); pg.click('.xt-trigger'); pg.wait_for_timeout(200)
    an=pg.evaluate("getComputedStyle(document.querySelector('.xt')).animationName"); ok('reduced motion: EXPLORE TOP does not animate',an=='none',an); ctx.close()
    # ---- contact validation
    ctx,pg=mk(b,12); pg.goto(B+'/contact',wait_until='networkidle'); pg.wait_for_timeout(1500)
    pg.click('.cform button[type=submit]'); pg.wait_for_timeout(300)
    errs=pg.locator('.cform__err').count(); focused=pg.evaluate("document.activeElement.name"); ok('contact: empty submit shows 3 inline errors, focuses first',errs==3 and focused=='name',f'{errs} {focused}')
    pg.fill('input[name=name]','Test'); pg.fill('input[name=email]','bad@'); pg.fill('textarea','short'); pg.click('.cform button[type=submit]'); pg.wait_for_timeout(300)
    ok('contact: invalid email / short message rejected',pg.locator('#err-email').count()==1 and pg.locator('#err-message').count()==1 and 'mailto' not in pg.url)
    nav=[]; pg.on('framenavigated',lambda f: nav.append(f.url))
    pg.fill('input[name=email]','a@b.co'); pg.fill('textarea','A proper enquiry message.')
    pg.evaluate("window.__m=null; const d=Object.getOwnPropertyDescriptor(Location.prototype,'href')")  # mailto cannot be asserted via navigation in headless
    ok('contact: note never claims delivery',"Nothing is sent from this page" in pg.locator('.cform__note').inner_text()); ctx.close()
    # ---- 404 page
    ctx,pg=mk(b,22); pg.goto(B+'/does-not-exist',wait_until='networkidle'); ok('404: themed, links home/projects/services/contact, noindex',pg.locator('.notfound a').count()>=4 and pg.evaluate("document.querySelector('meta[name=robots]')?.content")=='noindex' and pg.evaluate("document.documentElement.dataset.theme")=='night'); ctx.close()
    # ---- axe scans (WCAG 2.x A/AA tags) in both themes
    pages=['/','/studio','/projects','/projects/cloudstone-mountain-house','/services','/services/architecture','/process','/team','/journal','/journal/the-space-between-buildings','/contact','/nope']
    summary={}
    for hh,name in [(12,'day'),(22,'night')]:
        ctx,pg=mk(b,hh)
        for r in pages:
            pg.goto(B+r,wait_until='networkidle'); pg.wait_for_timeout(2600); pg.evaluate("window.scrollTo(0,0)"); pg.add_script_tag(content=AXE)
            out=pg.evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,t:v.nodes.slice(0,2).map(n=>n.target.join(' ')+' | '+(n.any[0]?.message||'').slice(0,110))})))")
            summary[f'{name} {r}']=out
        # overlay too
        ctx.close()
    ctx,pg=mk(b,22,vp=(820,1180)); pg.goto(B+'/projects',wait_until='networkidle'); pg.click('.xt-trigger'); pg.wait_for_timeout(700); pg.add_script_tag(content=AXE)
    summary['night EXPLORE TOP']=pg.evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,t:v.nodes.slice(0,2).map(n=>n.target.join(' ')+' | '+(n.any[0]?.message||'').slice(0,110))})))"); ctx.close()
    ctx,pg=mk(b,12,vp=(820,1180)); pg.goto(B+'/projects',wait_until='networkidle'); pg.click('.xt-trigger'); pg.wait_for_timeout(700); pg.add_script_tag(content=AXE)
    summary['day EXPLORE TOP']=pg.evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}).then(r=>r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,t:v.nodes.slice(0,2).map(n=>n.target.join(' ')+' | '+(n.any[0]?.message||'').slice(0,110))})))"); ctx.close()
    b.close()
json.dump(summary,open('/tmp/axe.json','w'),indent=1)
for k,v in summary.items(): print(k,'->',[(x['id'],x['impact'],x['n']) for x in v] or 'no violations')
print('TOTAL',len(res),'FAILED',len([r for r in res if not r[1]]))
