import sys, subprocess, time, os
from playwright.sync_api import sync_playwright
import base64, io
from PIL import Image
names = sys.argv[1:]
W, H = int(os.environ.get('RW',3000)), int(os.environ.get('RH',1875))
srv = subprocess.Popen(['python3','-m','http.server','8765'], cwd='/home/claude/site', stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
os.makedirs('/home/claude/raw', exist_ok=True)
try:
  with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
    for n in names:
        pg = b.new_page()
        pg.on('console', lambda m: print('  console:', m.text) if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: print('  pageerror', e))
        w,h = (W,H)
        pg.goto(f'http://localhost:8765/tools/render/index.html?n={n}&w={w}&h={h}')
        try: pg.wait_for_function('window.__done===true', timeout=240000)
        except Exception as e: print(n,'timeout'); pg.close(); continue
        d = pg.evaluate("document.getElementById('c').toDataURL('image/png')")
        Image.open(io.BytesIO(base64.b64decode(d.split(',')[1]))).convert('RGB').save(f'/home/claude/raw/{n}.png')
        print('rendered', n); pg.close()
    b.close()
finally: srv.terminate()
