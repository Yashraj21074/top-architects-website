import sys, datetime
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    for name, (w, h), hour in [('day_desktop', (1440, 900), 12), ('night_desktop', (1440, 900), 21), ('day_mobile', (390, 844), 10), ('night_mobile', (390, 844), 2)]:
        ctx = b.new_context(viewport={'width': w, 'height': h}); pg = ctx.new_page()
        pg.clock.install(time=datetime.datetime(2026, 10, 21, hour, 30))
        pg.goto('http://localhost:4173/', wait_until='networkidle'); pg.wait_for_timeout(3200)
        print(name, pg.evaluate("document.documentElement.dataset.theme"), 'overflow', pg.evaluate("document.documentElement.scrollWidth-innerWidth"))
        pg.screenshot(path=f'/tmp/home_{name}.png'); ctx.close()
    b.close()
