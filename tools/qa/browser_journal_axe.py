import datetime, json, subprocess
from playwright.sync_api import sync_playwright
B='http://localhost:4173'; AXE=open('/tmp/axe/node_modules/axe-core/axe.min.js').read()
slugs=json.loads(subprocess.check_output(['node','-e',"import('/home/claude/TOP_NAV_FILTERS/src/content/journal.js').then(m=>console.log(JSON.stringify(m.ARTICLES.map(a=>a.slug))))"]))
routes=['/journal']+[f'/journal/{s}' for s in slugs]; bad=0
with sync_playwright() as p:
    b=p.chromium.launch()
    for hh,n in [(12,'day'),(22,'night')]:
        ctx=b.new_context(viewport={'width':1280,'height':800}); ctx.add_init_script("sessionStorage.setItem('top-architects-intro-seen','seen')"); pg=ctx.new_page(); pg.clock.install(time=datetime.datetime(2026,11,18,hh,30))
        for r in routes:
            pg.goto(B+r,wait_until='networkidle'); pg.wait_for_timeout(2200); pg.add_script_tag(content=AXE)
            v=pg.evaluate("axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}).then(r=>r.violations.map(v=>[v.id,v.nodes.length,v.nodes[0].target.join(' ')+' | '+(v.nodes[0].any[0]?.message||'').slice(0,90)]))")
            ov=pg.evaluate("document.documentElement.scrollWidth-innerWidth"); broken=pg.evaluate("[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length")
            print(('OK  ' if not v and ov<=0 and not broken else 'FAIL'),n,r,v or '',ov if ov>0 else '',broken or ''); bad+= bool(v or ov>0 or broken)
        ctx.close()
    b.close()
print('TOTAL',2*len(routes),'FAILED',bad)
