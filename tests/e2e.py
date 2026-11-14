"""
End-to-end interaction test. Exercises every interactive control on every page
and fails on any JavaScript error or broken expectation.

Usage:
    python3 -m http.server 8765 &          # from the repository root
    pip install playwright && playwright install chromium
    python3 tests/e2e.py [base_url] [chromium_path]
"""
import asyncio, sys
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
EXE = sys.argv[2] if len(sys.argv) > 2 else None
results = []

def check(name, cond, detail=''):
    results.append((name, bool(cond), detail))
    print(('PASS ' if cond else 'FAIL ') + name + (f'  [{detail}]' if detail and not cond else ''))

async def set_range(page, sel, value):
    await page.eval_on_selector(sel, "(el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }", value)

async def run(page, errors):
    # ---------- Home ----------
    await page.goto(BASE + '#/', wait_until='networkidle')
    check('home renders hero', await page.locator('#hero-title').count() == 1)
    before = await page.inner_text('#fig1-readout')
    await page.focus('.fig1-svg'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowDown')
    check('Fig. 1 responds to keyboard', await page.inner_text('#fig1-readout') != before)
    await page.click('.method-step[data-step="2"]')
    await page.click('[data-method-lab="energy"]')
    check('method diagram updates', 'Energy systems lab' in await page.inner_text('.method-detail'))
    await page.click('[data-kind="demo"]')
    check('filter: independent demos', 'Showing 4 of 10' in await page.inner_text('#project-count'))
    await page.click('[data-kind="past"]')
    await page.click('[data-domain="AI safety"]')
    check('filter empty state', await page.locator('.project-grid .state-empty').count() == 1)
    await page.click('[data-action="clear-filters"]')
    check('clear filters', 'Showing 10 of 10' in await page.inner_text('#project-count'))
    await page.click('[data-skill="Satellite data"]')
    check('skill highlight', await page.locator('.tl-item.is-match').count() >= 1)
    async with page.expect_download() as dl:
        await page.click('[data-action="download-cv"]')
    check('CV text download', (await dl.value).suggested_filename.endswith('.txt'))
    if await page.is_visible('.nav-toggle'):
        await page.click('.nav-toggle')
        check('mobile menu opens', await page.is_visible('#nav-links'))
    await page.click('a[data-nav="experience"]')
    await page.wait_for_timeout(400)
    check('nav to section', page.url.endswith('#/s/experience'))

    # ---------- Safety lab ----------
    await page.goto(BASE + '#/lab/safety', wait_until='networkidle')
    await page.wait_for_selector('#decision .outcome-label')
    check('safety default outcome', 'Human approval' in await page.inner_text('#decision'))
    await page.click('[data-scenario="forecast"]')
    check('scenario switch -> automated', 'Automated' in await page.inner_text('#decision .outcome-label'))
    await page.click('[data-scenario="frequency"]')
    check('time window -> fallback', 'Fallback' in await page.inner_text('#decision .outcome-label'))
    await set_range(page, '#ctl-humanLatency', 5)
    check('fast review -> human approval', 'approval' in (await page.inner_text('#decision .outcome-label')).lower())
    await page.check('input[name=mode][value=autonomous]')
    check('autonomous mode', 'Automated' in await page.inner_text('#decision .outcome-label'))
    await page.check('input[name=mode][value=approval]')
    await page.click('[data-scenario="cyber"]')
    check('two-person rule', 'Two-person' in await page.inner_text('#decision .outcome-label'))
    for f in ['overconfident', 'sensor', 'unavailable']:
        await page.click(f'[data-failure="{f}"]')
        check(f'failure {f}', 'After failure' in await page.inner_text('#failure-out'))
    await page.click('[data-action="save-A"]')
    await set_range(page, '#ctl-confidence', 0.99)
    await page.click('[data-action="save-B"]')
    check('compare A/B', await page.locator('#compare tr.diff').count() >= 1)
    await page.click('[data-action="log"]'); await page.click('[data-action="log"]')
    check('audit log rows', await page.locator('#audit tbody tr').count() == 2)
    async with page.expect_download() as dl:
        await page.click('[data-action="download-log"]')
    check('audit CSV download', (await dl.value).suggested_filename.endswith('.csv'))
    async with page.expect_download() as dl:
        await page.click('[data-action="export"]')
    check('JSON export', (await dl.value).suggested_filename.endswith('.json'))
    await page.click('[data-action="clear-log"]')
    check('clear log -> empty state', 'log is empty' in await page.inner_text('#audit'))
    await set_range(page, '#ctl-overconfidence', 0.3)
    await page.wait_for_timeout(300)
    check('threshold sweep chart', await page.locator('#sweep svg path').count() >= 2)
    check('scroll explainer rendered', await page.locator('#ex-fig svg').count() == 1)
    await page.click('[data-action="reset"]')
    check('reset', await page.input_value('#ctl-confidence') == '0.64')
    async with page.expect_download() as dl:
        await page.click('[data-action="download-summary"]')
    check('research summary download', (await dl.value).suggested_filename.endswith('.md'))

    # ---------- SkyAcres lab ----------
    await page.goto(BASE + '#/lab/skyacres', wait_until='networkidle')
    await page.wait_for_selector('#parcel-table tbody tr')
    await page.click('[data-preset="drought"]')
    check('drought raises risk', await page.locator('#parcel-table .pill.high').count() >= 2)
    await page.click('[data-row="P2"]')
    check('select field from table', 'P2 Creek bottom' in await page.inner_text('#parcel-panel'))
    await page.check('#parcel-panel [data-key="irrigate"]', force=True)
    check('irrigation toggle', 'Irrigated' in await page.inner_text('#parcel-table tr[data-row="P2"]'))
    await page.select_option('#ctl-layer', 'mask')
    check('layer switch', 'Masked pixel' in await page.inner_text('#legend'))
    await set_range(page, '#ctl-cloud', 100)
    check('too cloudy -> abstain', 'No estimate' in await page.inner_text('#parcel-panel'))
    await page.locator('#map').scroll_into_view_if_needed()
    box = await page.locator('#map').bounding_box()
    await page.mouse.click(box['x'] + box['width'] * 0.85, box['y'] + box['height'] * 0.75)
    check('select field from map', 'P6' in await page.inner_text('#parcel-panel'))
    await page.click('[data-pipe="3"]')
    check('pipeline step', 'Zonal' in await page.inner_text('.pipe-step[aria-pressed="true"]'))
    async with page.expect_download() as dl:
        await page.click('[data-action="download"]')
    check('skyacres summary download', (await dl.value).suggested_filename.endswith('.md'))

    # ---------- Energy lab ----------
    await page.goto(BASE + '#/lab/energy', wait_until='networkidle')
    await page.wait_for_selector('#kpis .kpi')
    check('energy default all served', 'All demand served' in await page.inner_text('#kpis'))
    check('flow diagram rendered', await page.locator('#flow .flow-edge').count() >= 3)
    await page.click('[data-action="save-A"]')
    await page.click('[data-preset="outage"]')
    check('outage -> shortfall', 'All demand served' not in await page.inner_text('#kpis'))
    check('outage band drawn', await page.locator('#supply-chart .chart-band').count() == 1)
    await page.click('[data-action="save-B"]')
    check('energy compare', await page.locator('#compare tr.diff').count() >= 1)
    await set_range(page, '#ctl-batteryMWh', 300); await set_range(page, '#ctl-batteryMW', 60)
    check('more storage changes result', 'MWh' in await page.inner_text('#kpis'))
    await page.click('[data-action="reseed"]')
    check('reseed', 'Seed 11' not in await page.inner_text('#kpis'))
    async with page.expect_download() as dl:
        await page.click('[data-action="csv"]')
    check('energy CSV', (await dl.value).suggested_filename.endswith('.csv'))
    hit = page.locator('#supply-chart .chart-hit')
    await hit.focus(); await page.keyboard.press('ArrowRight')
    check('chart keyboard tooltip', await page.locator('#supply-chart .chart-tip:not([hidden])').count() == 1)

    # ---------- AgriOne lab ----------
    await page.goto(BASE + '#/lab/agrione', wait_until='networkidle')
    await page.wait_for_selector('#program-results li')
    await page.click('[data-persona="c"]')
    check('persona C loads', await page.input_value('#f-type') == 'livestock')
    check('disaster program eligible', 'Stormline' in await page.inner_text('#program-results'))
    await page.fill('#f-acres', '0'); await page.dispatch_event('#f-acres', 'change')
    check('invalid acres error', await page.is_visible('#acres-err'))
    await page.fill('#f-acres', '300'); await page.dispatch_event('#f-acres', 'change')
    await page.click('[data-show="match"]')
    check('eligible-only filter', await page.locator('#program-results li.is-ineligible').count() == 0)
    await page.check('[data-doc="Loss documentation"]')
    check('document checklist updates', 'likely eligible' in await page.inner_text('#screen-count'))
    await page.check('input[name="b-cashflow"][value="0.1"]')
    check('barrier answer updates bars', await page.locator('#barrier-bars li').count() == 6)

    # ---------- Case study and routing ----------
    await page.goto(BASE + '#/project/nasa', wait_until='networkidle')
    check('case study renders', 'Crater detection' in await page.inner_text('h1'))
    async with page.expect_download() as dl:
        await page.click('[data-action="download"]')
    check('case study download', (await dl.value).suggested_filename.endswith('.txt'))
    await page.goto(BASE + '#/lab/nope', wait_until='networkidle')
    check('unknown lab error state', 'Lab not found' in await page.inner_text('#app'))
    await page.goto(BASE + '#/project/nope', wait_until='networkidle')
    check('unknown project error state', 'not found' in await page.inner_text('#app'))

    check('no JavaScript errors', not errors, '; '.join(errors))

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path=EXE) if EXE else await p.chromium.launch()
        for name, vp in [('desktop', {'width': 1440, 'height': 900}), ('mobile', {'width': 390, 'height': 844})]:
            print(f'--- {name} ---')
            ctx = await browser.new_context(viewport=vp, accept_downloads=True)
            page = await ctx.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            await run(page, errors)
            await ctx.close()
        await browser.close()
    failed = [r for r in results if not r[1]]
    print(f'\n{len(results) - len(failed)} passed, {len(failed)} failed')
    sys.exit(1 if failed else 0)

asyncio.run(main())
