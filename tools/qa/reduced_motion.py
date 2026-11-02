"""prefers-reduced-motion: no pinned stages, no hidden content, no scroll-driven transforms."""
import subprocess, time, json
from playwright.sync_api import sync_playwright
srv = subprocess.Popen(['npx','vite','preview','--port','4173','--strictPort'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(3)
try:
  with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(viewport={'width':1440,'height':900}, reduced_motion='reduce'); pg=ctx.new_page(); out={}
    for r in ['/', '/services', '/studio', '/projects', '/process', '/journal', '/contact']:
        pg.goto('http://localhost:4173'+r, wait_until='networkidle'); pg.evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')"); pg.wait_for_timeout(500)
        out[r]=pg.evaluate("""(()=>{const hidden=[...document.querySelectorAll('.rv, .rv > *, .svx-detail li, .w > span')].filter(e=>{const c=getComputedStyle(e);return c.opacity==='0'||(c.clipPath!=='none'&&c.clipPath!=='')||/matrix\\(1, 0, 0, 1, 0, [1-9]/.test(c.transform)}).length;
          const sticky=[...document.querySelectorAll('.svx-hero__stage,.svx-plan__stage,.svx-vis__stage,.svx-con__stage')].filter(e=>getComputedStyle(e).position==='sticky').length;
          const tall=[...document.querySelectorAll('.svx-hero,.svx-plan,.svx-vis,.svx-con')].filter(e=>e.getBoundingClientRect().height>innerHeight*1.6).length;
          return {hiddenOrOffset:hidden, stickyStages:sticky, pinnedTallSections:tall, overflowX:document.documentElement.scrollWidth-innerWidth, cursor:!!document.querySelector('.cursor'), routeSweep:getComputedStyle(document.querySelector('.route-sweep')||document.body).display}})()""")
    pg.goto('http://localhost:4173/services', wait_until='networkidle'); pg.evaluate("window.scrollTo(0, 3000)"); pg.wait_for_timeout(500); pg.screenshot(path='/tmp/rm_services.png')
    print(json.dumps(out, indent=1)); b.close()
finally: srv.terminate()
