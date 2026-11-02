"""Hand-position check while the receptionist greets, listens and explains; plus night/day screenshots."""
import json, datetime
from playwright.sync_api import sync_playwright
MOCK = open('tools/qa/speech_mock.js').read()
FF = "(n)=>{const st=window.__reception.story; for(let i=0;i<n;i++) st.update(0.1);}"
def run(b, hour, size, tag, probe):
    ctx = b.new_context(viewport={'width': size[0], 'height': size[1]}, has_touch=size[0] < 600); pg = ctx.new_page(); pg.set_default_timeout(120000)
    pg.clock.install(time=datetime.datetime(2026, 10, 21, hour, 15)) if False else None
    pg.add_init_script(f"window.__SPEECH_MODE='normal'; window.__SPEECH_END_MS=9000; Date.prototype.getHours = function(){{ return {hour}; }};"); pg.add_init_script(MOCK)
    pg.goto('http://localhost:4173/reception', wait_until='commit'); pg.wait_for_function('window.__reception && window.__reception.ready === true')
    pg.mouse.move(size[0] // 2, size[1] // 3); pg.evaluate(FF, 5)
    res = {}
    if probe:
        samples = []
        for step in range(40):
            pg.evaluate(FF, 4)
            if step == 12: pg.evaluate("document.querySelector('#choices .choice[data-id=services]').click()")
            samples.append(pg.evaluate("""(()=>{const s=window.__reception.state, b=s.body, rig=s.rig; const THREE=window.__reception.THREE;
              const wy=(n)=>{const o=rig[n]; if(!o) return null; const v=new THREE.Vector3(); o.getWorldPosition(v); return +v.y.toFixed(3)};
              return {pose:b.poseName, state:document.body.dataset.story, R:wy('rightHand'), L:wy('leftHand')}})()"""))
            pg.wait_for_timeout(120)
        poses = sorted({x['pose'] for x in samples}); Rs = [x['R'] for x in samples if x['R'] is not None]; Ls = [x['L'] for x in samples if x['L'] is not None]
        res = {'poses_seen': poses, 'states_seen': sorted({x['state'] for x in samples}), 'rightHand_y_range': [min(Rs), max(Rs)] if Rs else None, 'leftHand_y_range': [min(Ls), max(Ls)] if Ls else None}
    else:
        pg.evaluate(FF, 80); pg.wait_for_timeout(5000)
    pg.screenshot(path=f'/tmp/rec_{tag}.png', timeout=180000); ctx.close(); return res
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    print(json.dumps({'hands_day': run(b, 12, (900, 560), 'day', True)}))
    run(b, 22, (900, 560), 'night', False)
    b.close()
