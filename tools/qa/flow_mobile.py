"""Mobile end-to-end: Home -> hero button -> reception -> About -> Back to Reception -> returning greeting -> Repeat Greeting taps."""
import json
from playwright.sync_api import sync_playwright
MOCK = open('tools/qa/speech_mock.js').read()
FF = "(n)=>{const st=window.__reception.story; for(let i=0;i<n;i++) st.update(0.1);}"
R = {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 375, 'height': 667}, has_touch=True, is_mobile=True); pg = ctx.new_page(); pg.set_default_timeout(150000)
    pg.add_init_script("window.__SPEECH_MODE='normal'; window.__SPEECH_END_MS=4000;"); pg.add_init_script(MOCK)
    pg.goto('http://localhost:4173/', wait_until='networkidle')
    R['home_hero_buttons'] = pg.eval_on_selector_all('.hero2__actions a', 'els=>els.map(e=>e.innerText.replace(/\\s+/g," ").trim())')
    R['home_has_explore_projects_hero_button'] = any('Explore Our Projects' in t for t in R['home_hero_buttons'])
    pg.screenshot(path='/tmp/flow_home.png')
    pg.tap('.hero2__actions a'); pg.wait_for_url('**/reception'); pg.wait_for_function('window.__reception && window.__reception.ready === true')
    pg.evaluate(FF, 5); pg.touchscreen.tap(190, 300)
    for _ in range(40):
        if pg.evaluate("document.body.dataset.story") == 'GREETING': break
        pg.evaluate(FF, 10); pg.wait_for_timeout(100)
    pg.wait_for_function('window.__speech.ends.length >= 1'); R['first_greeting'] = pg.evaluate('window.__speech.speaks[0].text')
    pg.tap('#choices .choice[data-id=about]'); pg.wait_for_url('**/studio'); pg.wait_for_selector('.return-bar__btn')
    R['studio_back_bar_text'] = pg.inner_text('.return-bar__btn'); R['studio_back_bar_visible_in_viewport'] = pg.evaluate("(()=>{const r=document.querySelector('.return-bar__btn').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})()")
    pg.screenshot(path='/tmp/flow_studio.png')
    pg.evaluate("window.scrollTo(0, 900)"); pg.wait_for_timeout(500); R['back_bar_still_visible_after_scroll'] = pg.evaluate("document.querySelector('.return-bar').getBoundingClientRect().top < 80 && document.querySelector('.return-bar').getBoundingClientRect().bottom > 0")
    n0 = pg.evaluate('window.__speech.speaks.length'); pg.tap('.return-bar__btn'); pg.wait_for_url('**/reception'); pg.wait_for_function('window.__reception && window.__reception.ready === true')
    pg.touchscreen.tap(190, 300); pg.evaluate(FF, 5)
    for _ in range(40):
        if pg.evaluate("document.body.dataset.story") == 'GREETING': break
        pg.evaluate(FF, 10); pg.wait_for_timeout(100)
    pg.wait_for_function(f'window.__speech.speaks.length >= {n0 + 1}'); R['return_greeting'] = pg.evaluate(f'window.__speech.speaks[{n0}].text')
    pg.wait_for_function(f'window.__speech.ends.length >= 2'); pg.evaluate(FF, 20)
    n1 = pg.evaluate('window.__speech.speaks.length')
    for _ in range(4): pg.tap('#t-repeat'); pg.wait_for_timeout(80)
    pg.wait_for_function(f'window.__speech.speaks.length >= {n1 + 1}'); pg.wait_for_timeout(600)
    sp = pg.evaluate('window.__speech'); R['repeat_taps'] = 4; R['repeat_texts_identical'] = len({x['text'] for x in sp['speaks'][n1:]}) == 1; R['repeat_max_concurrent_utterances'] = sp['maxActive']
    R['navigations_in_session'] = [n['url'] for n in sp['nav']]   # expected: /reception, /studio, /reception — nothing from the repeat taps
    pg.screenshot(path='/tmp/flow_return.png', timeout=180000)
    R['no_h_overflow_in_reception'] = pg.evaluate('document.documentElement.scrollWidth - innerWidth') == 0
    b.close()
print(json.dumps(R, indent=1))
