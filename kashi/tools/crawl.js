// Visit every route in every language, exercise main flows, report errors and untranslated strings.
const {chromium} = require('/home/ubuntu/pw/node_modules/playwright-core');
const fs = require('fs');
const CH = require('child_process').execSync('ls -d ~/.cache/ms-playwright/chromium-1248/*/chrome | head -1').toString().trim();
const BASE = process.env.BASE || 'http://127.0.0.1:8792/v2/';
(async () => {
  const browser = await chromium.launch({executablePath: CH, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']});
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  const errors = [];
  page.on('pageerror', e => errors.push(page.url() + ' ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(page.url() + ' console: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
  page.on('dialog', d => d.accept());
  await page.goto(BASE + '#home'); await page.waitForTimeout(800);
  const routes = ['home', 'market', 'market?type=Ceramic', 'product/1', 'product/6', 'favorites', 'compare', 'studio', 'inspiration', 'partners', 'seller-profile/nord-surface', 'seller-profile/studio-materials', 'seller-profile/terra-supply', 'apply', 'quote', 'basket', 'checkout', 'orders', 'seller', 'admin', 'journal', 'journal/porcelain-vs-ceramic', 'journal/how-many-square-metres', 'journal/calm-nordic-surfaces', 'journal/tiles-for-icelandic-conditions', 'about', 'faq', 'contact', 'privacy', 'founding', 'login', 'account', 'pro', 'nope'];
  const missing = new Set(), overflow = [];
  const go = async r => { await page.evaluate(r => { location.hash = r; }, r); await page.waitForTimeout(r.startsWith('studio') ? 1500 : 150); };
  const check = async (ok, msg) => { if (!ok) errors.push('CHECK FAILED: ' + msg); };
  for (const lang of ['EN', 'NO', 'IS', 'FA']) {
    await page.selectOption('#language', lang);
    // fill states so that non-empty views render
    await go('product/2'); await page.click('.links [data-act=fav]'); await page.click('.links [data-act=cmp]'); await page.click('.links [data-act=sample]'); await page.click('#calcForm .pill');
    for (const r of routes) {
      await go(r);
      await check(await page.locator('#main h1, #main .hero').count() > 0, lang + ' no heading ' + r);
      const w = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (w > 1) overflow.push(lang + ' ' + r + ' ' + w);
    }
    for (const [r, list] of [['seller', ['orders', 'quotes', 'catalogue', 'company', 'team', 'membership', 'overview']], ['account', ['profile', 'addresses', 'support', 'overview']], ['pro', ['team', 'projects']], ['admin', ['applications', 'pipeline', 'money', 'audit', 'overview']]]) {
      await go(r); for (const tab of list) { await page.click(`.tabs [data-tab=${tab}]`); for (const w of [1440, 375]) { await page.setViewportSize({width: w, height: 900}); const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 1) overflow.push(`${lang} ${w} ${r}/${tab} ${o}`); } await page.setViewportSize({width: 1440, height: 900}); }
    }
    await go('pro'); if (!await page.locator('[data-line]').count()) { await page.fill('#projectForm [name=name]', 'P1'); await page.fill('#projectForm [name=city]', 'Oslo'); await page.click('#projectForm .pill'); } await page.fill('[data-line="0"] [name=area]', '5'); await page.click('[data-line="0"] .outline');
    await go('home'); await page.click('#guideForm .pill'); await page.fill('#guideForm [name=query]', 'zzz marble'); await page.fill('#guideForm [name=destination]', 'Oslo'); await page.fill('#guideForm [name=budget]', '1'); await page.click('#guideForm .pill'); await go('market'); await page.fill('[data-filter=q]', 'zzzz'); await page.click('[data-act=reset]');
    (await page.evaluate(() => [...window.__missing])).forEach(x => missing.add(x));
  }
  // ---- flows (English) ----
  await page.selectOption('#language', 'EN'); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(500);
  await go('market'); await page.fill('[data-filter=q]', 'basalt'); await check(await page.locator('#results .product').count() === 1, 'search filter');
  await page.click('#results [data-act=add]'); await check(await page.textContent('#count') === '1', 'basket count');
  await go('product/5'); await page.fill('#calcForm [name=area]', '10'); await page.press('#calcForm [name=area]', 'Enter');
  await check(await page.textContent('#count') === '2', 'calculator adds to basket'); await go('basket'); await check((await page.textContent('#main')).includes('11.52 m²'), 'calculator quantity (12 boxes)');
  await go('product/%E0%A4%A'); await check((await page.textContent('#main .eyebrow')) === '404', 'bad url');
  await go('checkout');
  await page.fill('[name=name]', 'Test Person'); await page.fill('[name=email]', 't@example.com'); await page.click('[data-dir="1"]');
  await page.fill('[name=address]', '<img src=x onerror=window.__xss=1>'); await page.fill('[name=postalCode]', '101'); await page.fill('[name=city]', 'Reykjavik'); await page.press('[name=city]', 'Enter');
  await check(await page.isVisible('#review'), 'review step'); await page.check('[name=accept]'); await page.click('#applySend'); await page.waitForTimeout(300);
  await check(page.url().includes('#orders/K-'), 'order placed'); await check(await page.locator('.success').count() === 1, 'order success');
  await go('quote'); await page.fill('[name=product]', '<b>x</b>'); await page.fill('[name=area]', '20'); await page.fill('[name=name]', 'T'); await page.fill('[name=email]', 't@example.com'); await page.click('#quoteForm .pill');
  await go('seller'); await page.click('.tabs [data-tab=quotes]'); const f = page.locator('form.reply').first(); await f.locator('[name=price]').fill('9000'); await f.locator('[name=days]').fill('10'); await f.locator('.pill').click();
  await go('orders'); await check((await page.textContent('#main')).includes('Offer received'), 'quote reply visible');
  await go('apply'); await page.fill('[name=company]', 'Acme <script>'); await page.fill('[name=registration]', '1'); await page.selectOption('[name=country]', 'NO'); await page.fill('[name=city]', 'Oslo'); await page.fill('[name=email]', 'a@example.com'); await page.click('[data-dir="1"]');
  await page.fill('[name=deliveryRegions]', 'IS'); await page.click('[data-dir="1"]'); await page.fill('[name=products]', 'tiles'); await page.check('[name=accept]'); await page.click('#applySend');
  await go('admin'); await page.click('.tabs [data-tab=applications]'); await page.locator('[data-act=decide][data-value=Approved]').last().click(); await go('partners'); await check((await page.textContent('#directory')).includes('Approved'), 'approval in directory');
  await go('seller'); await page.click('.tabs [data-tab=catalogue]'); await page.fill('#productForm [name=name]', 'Test Tile'); await page.click('#productForm .pill'); await go('market?q=Test%20Tile'); await check(await page.locator('#results .product').count() === 1, 'custom product listed');
  await go('product/1'); await page.click('#calcForm [data-act=room]'); await page.waitForTimeout(4000);
  await check(await page.locator('.room-canvas').count() === 1, '3d canvas'); await check(await page.locator('.room-loading.done').count() === 1, '3d ready');
  for (const r of ['bathroom', 'kitchen', 'living']) { await page.click(`[data-act=roomtype][data-room=${r}]`); await page.waitForTimeout(700); }
  await page.click('[data-act=target][data-target=wall]'); await page.click('.chip[data-id="11"]'); await page.click('[data-act=view][data-view=top]');
  await go('market'); await go('studio'); await check(await page.locator('.room-canvas').count() === 1, '3d survives navigation');
  await page.click('[data-act=addroom]'); await go('studio?room=kitchen&floor=7&wall=4&width=6&length=4&day=0.8'); await check((await page.textContent('#studioControls .tabbar')).replace(/\s/g, '').match(/NordicSand.*TerracottaBrick/) !== null, 'share link applies');
  await check(!(await page.evaluate(() => window.__xss)), 'xss');
  await check(await page.locator('#main script').count() === 0, 'script injection');
  // ---- stitched handoff features ----
  await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(500);
  await go('home'); await page.fill('#guideForm [name=query]', 'lys porselen til badet'); await page.fill('#guideForm [name=area]', '20'); await page.fill('#guideForm [name=budget]', '200000'); await page.fill('#guideForm [name=destination]', '<b>Reykjavik</b>'); await page.click('#guideForm .pill');
  const out = await page.textContent('#guideOut'); await check(out.includes('Ivory Vein') && !out.includes('Basalt') && out.includes('Porcelain') && out.includes('<b>Reykjavik</b>'), 'free-text search: ' + out.slice(0, 200));
  await go('founding'); const offer = await page.textContent('#main'); await check(/12,000 NOK/.test(offer) && /6,000 NOK/.test(offer), 'offer prices');
  await page.clock.setFixedTime(new Date('2027-01-01T12:00:00')); await go('home'); await go('founding'); await check(!/6,000 NOK/.test(await page.textContent('#main')), 'offer closes after deadline'); await page.clock.setFixedTime(new Date('2026-12-31T23:00:00')); await go('home'); await go('founding'); await check(/6,000 NOK/.test(await page.textContent('#main')), 'offer open on deadline'); await page.clock.setSystemTime(new Date());
  await go('login'); await check(await page.isDisabled('.vipps'), 'vipps disabled');
  await go('pro'); await page.fill('#projectForm [name=name]', '<i>Hotel</i>'); await page.fill('#projectForm [name=city]', 'Oslo'); await page.click('#projectForm .pill'); await page.selectOption('[data-line="0"] [name=product]', '5'); await page.fill('[data-line="0"] [name=area]', '10'); await page.click('[data-line="0"] .outline');
  await check((await page.textContent('#main')).includes('11.52 m²') && await page.locator('#main i').count() === 0, 'project quantities');
  await page.click('[data-act=projectquote]'); await page.waitForTimeout(200); await check(await page.inputValue('#quoteForm [name=area]') === '10', 'project quote prefill');
  await go('seller'); await page.click('.tabs [data-tab=catalogue]'); await page.fill('#csvForm [name=csv]', 'name,type,format,price,colour\nCsv Oak,Porcelain,20x120,9900,#a98f6e\nBad,Wood,1x1,2'); await page.click('#csvForm .outline'); await check((await page.textContent('#toast')).includes('1 imported, 1 skipped'), 'csv import');
  await page.click('.tabs [data-tab=team]'); await page.fill('[data-team] [name=name]', 'Kari'); await page.click('[data-team] .pill'); await check((await page.textContent('#main')).includes('Kari'), 'team member');
  await page.click('.tabs [data-tab=company]'); await page.fill('#showroomForm [name=city]', 'Drammen'); await page.click('#showroomForm .outline'); await check((await page.textContent('#main')).includes('Drammen'), 'showroom');
  await go('admin'); await page.selectOption('[data-role]', 'staff'); await check(await page.locator('.tabs button').count() === 1, 'staff restricted'); await page.selectOption('[data-stage]', 'Signed'); await page.selectOption('[data-role]', 'owner'); await page.click('.tabs [data-tab=audit]'); await check((await page.textContent('#main')).includes('Prospect stage changed'), 'audit log');
  // ---- data saved by the previous review build still loads ----
  await page.evaluate(() => { localStorage.clear(); const s = (k, v) => localStorage.setItem('kashiV2:' + k, JSON.stringify(v)); s('basket', {1: 3}); s('orders', [{id: 'K-OLD', date: '2026-11-27', rate: 15, items: [{name: 'Sand Travertine', vendor: 'Studio Materials', qty: 1, total: 16900}], status: 'Sample — not paid'}]); s('quotes', [{createdAt: '2026-11-27T10:00:00Z', product: 'x', area: '5', country: 'Iceland', email: 'a@b.c'}]); s('applications', [{company: 'Old', country: 'Norway'}]); s('lang', 'IS'); });
  await page.reload(); await page.waitForTimeout(600);
  for (const r of ['basket', 'orders', 'seller', 'admin', 'partners']) await go(r);
  await check(await page.textContent('#count') === '1', 'old basket'); await go('orders'); await check((await page.textContent('#main')).includes('K-OLD'), 'old order');
  await page.selectOption('#language', 'EN');
  // ---- mobile ----
  await page.setViewportSize({width: 375, height: 760});
  for (const lang of ['EN', 'FA']) { await page.selectOption('#language', lang); for (const r of routes) { await go(r); const w = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (w > 1) overflow.push('mobile ' + lang + ' ' + r + ' ' + w); } }
  await page.click('#menuBtn'); await check(await page.isVisible('#nav a[href="#studio"]'), 'mobile menu');
  fs.writeFileSync(__dirname + '/missing.json', JSON.stringify([...missing], null, 1));
  console.log('errors', errors.length); console.log([...new Set(errors)].slice(0, 30).join('\n'));
  console.log('overflow', overflow.length); console.log(overflow.slice(0, 40).join('\n'));
  console.log('untranslated', missing.size);
  await browser.close();
})();
