"""Speech/navigation sequencing tests against `vite preview` (:4173), using the speech mock. Usage: speech.py <scenario...>"""
import sys, json, time
from playwright.sync_api import sync_playwright
FF = "(n)=>{const st=window.__reception.story; for(let i=0;i<n;i++) st.update(0.1);}"
MOCK = open('tools/qa/speech_mock.js').read()
out = {}

def load(b, mode='normal', end_ms=5000, size=(640, 400)):
    ctx = b.new_context(viewport={'width': size[0], 'height': size[1]}); pg = ctx.new_page(); pg.set_default_timeout(120000)
    pg.add_init_script(f"window.__SPEECH_MODE='{mode}'; window.__SPEECH_END_MS={end_ms};"); pg.add_init_script(MOCK)
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:4173/reception', wait_until='commit'); pg.wait_for_function('window.__reception && window.__reception.ready === true')
    pg.mouse.move(300, 200); pg.evaluate(FF, 5)
    return ctx, pg, errs

def wait_state(pg, state, ff=10, tries=60):
    for _ in range(tries):
        if pg.evaluate('document.body.dataset.story') == state: return True
        pg.evaluate(FF, ff); pg.wait_for_timeout(100)
    return False

def S(pg): return pg.evaluate('window.__speech')

def sc_complete(b):   # 1: greeting spoken; page opens only after the real end event; then return greeting differs
    ctx, pg, errs = load(b)
    assert wait_state(pg, 'GREETING'), 'never greeted'
    pg.wait_for_function('window.__speech.speaks.length >= 1'); first = S(pg)['speaks'][0]['text']
    pg.wait_for_function('window.__speech.ends.length >= 1'); out['1_greeting'] = first
    assert wait_state(pg, 'LISTENING'); out['1_state_after_greeting_ended'] = 'LISTENING'
    pg.click('#choices .choice[data-id=projects]', force=True); t_click = pg.evaluate('performance.now()')
    pg.wait_for_function('window.__speech.speaks.length >= 2'); intro = S(pg)['speaks'][1]['text']
    pg.wait_for_timeout(2500); out['1_url_while_speaking'] = pg.url
    assert pg.url.endswith('/reception'), 'navigated before speech ended'
    pg.wait_for_function("location.pathname==='/projects'")
    s = S(pg); end_at = s['ends'][1]['at']; nav_at = s['nav'][-1]['at']
    out['1_intro'] = intro; out['1_end_to_nav_ms'] = round(nav_at - end_at); out['1_nav_after_end'] = nav_at >= end_at; out['1_nav_count'] = len(s['nav'])
    n0 = len(S(pg)['speaks']); pg.go_back(); pg.wait_for_function('window.__reception && window.__reception.ready === true'); pg.mouse.move(250, 150); pg.evaluate(FF, 5)
    assert wait_state(pg, 'GREETING'); pg.wait_for_function(f'window.__speech.speaks.length >= {n0 + 1}')
    out['1_return_greeting'] = S(pg)['speaks'][n0]['text']; out['1_errors'] = errs; ctx.close()

def sc_skip_and_change(b):   # 2: skip navigates once; 3: changing destination mid-speech
    ctx, pg, errs = load(b); wait_state(pg, 'LISTENING', tries=120) or wait_state(pg, 'GREETING')
    pg.click('#choices .choice[data-id=services]', force=True); pg.wait_for_function('window.__speech.speaks.length >= 1')
    pg.wait_for_timeout(300); t0 = pg.evaluate('performance.now()'); pg.click('#t-skip', force=True)
    pg.wait_for_function("location.pathname==='/services'"); s = S(pg)
    out['2_skip_ms_after_click'] = round(s['nav'][-1]['at'] - t0); pg.wait_for_timeout(6500)
    out['2_nav_count_after_wait'] = len(S(pg)['nav']); out['2_cancelled'] = S(pg)['cancels'] > 0; ctx.close()
    ctx, pg, errs = load(b); wait_state(pg, 'GREETING'); pg.wait_for_function('window.__speech.ends.length >= 1')
    pg.click('#choices .choice[data-id=projects]', force=True); pg.wait_for_timeout(1200); pg.click('#choices .choice[data-id=team]', force=True)
    pg.wait_for_function("location.pathname==='/team'"); pg.wait_for_timeout(6500); s = S(pg)
    out['3_final_url'] = pg.url; out['3_nav_urls'] = [n['url'] for n in s['nav']]; out['3_max_concurrent_utterances'] = s['maxActive']; ctx.close()

def sc_interrupt_and_back(b):   # 4: external cancel never navigates; Back appears only then; 6: repeat doesn't overlap
    ctx, pg, errs = load(b); wait_state(pg, 'GREETING'); pg.wait_for_function('window.__speech.ends.length >= 1'); wait_state(pg, 'LISTENING')
    out['4_back_visible_before_selection'] = pg.is_visible('#t-back')
    pg.click('#choices .choice[data-id=journal]', force=True); pg.wait_for_function('window.__speech.speaks.length >= 2'); pg.wait_for_timeout(800)
    out['4_back_visible_during_selection'] = pg.is_visible('#t-back')
    pg.evaluate('speechSynthesis.cancel()'); pg.wait_for_timeout(7000)
    out['4_url_after_external_cancel'] = pg.url; out['4_nav_count'] = len(S(pg)['nav'])
    pg.click('#t-back', force=True); pg.wait_for_timeout(300); out['4_state_after_back'] = pg.evaluate('document.body.dataset.story'); out['4_back_line'] = S(pg)['speaks'][-1]['text']
    pg.wait_for_function('window.__speech.ends.length >= 1', timeout=15000)
    wait_state(pg, 'LISTENING'); n0 = len(S(pg)['speaks'])
    for _ in range(3): pg.click('#t-repeat', force=True); pg.wait_for_timeout(120)
    pg.wait_for_function(f'window.__speech.speaks.length >= {n0 + 1}'); pg.wait_for_timeout(500)
    sp = S(pg); out['6_repeat_texts_equal'] = len({x['text'] for x in sp['speaks'][n0:]}) == 1; out['6_max_concurrent'] = sp['maxActive']
    out['6_nav_count'] = len(sp['nav']); out['6_errors'] = errs; ctx.close()

def sc_unavailable(b):   # 5: speech blocked/unavailable -> text fully shown first, then navigation, still only once
    for mode in ('silent', 'denied'):
        ctx, pg, errs = load(b, mode=mode); wait_state(pg, 'GREETING')
        pg.click('#choices .choice[data-id=contact]', force=True); t0 = time.time(); text = None; line = None
        for _ in range(400):
            pg.evaluate(FF, 5); pg.wait_for_timeout(60)
            if pg.url.endswith('/contact'): break
            line = pg.inner_text('#bubble-text')
        out[f'5_{mode}_navigated'] = pg.url.endswith('/contact'); out[f'5_{mode}_text_complete_before_nav'] = bool(line) and line.endswith('.')
        out[f'5_{mode}_nav_count'] = len(S(pg)['nav']); ctx.close()

SC = {'complete': sc_complete, 'skip': sc_skip_and_change, 'interrupt': sc_interrupt_and_back, 'unavailable': sc_unavailable}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for name in sys.argv[1:]:
        try: SC[name](b)
        except Exception as e: out[name + '_FAILED'] = repr(e)[:400]
    b.close()
print(json.dumps(out, indent=1))
