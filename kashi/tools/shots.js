const {chromium} = require('/home/ubuntu/pw/node_modules/playwright-core');
const CH = require('child_process').execSync('ls -d ~/.cache/ms-playwright/chromium-1248/*/chrome | head -1').toString().trim();
(async () => {
  const b = await chromium.launch({executablePath: CH, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']});
  const list = (process.argv[2] || 'home:EN:1440').split(',');
  for (const spec of list) {
    const [route, lang, w, full] = spec.split(':');
    const p = await b.newPage({viewport: {width: +w, height: +w < 600 ? 760 : 900}});
    await p.addInitScript(l => localStorage.setItem('kashiV2:lang', JSON.stringify(l)), lang);
    await p.goto('http://127.0.0.1:8792/v2/#' + route); await p.waitForTimeout(route === 'studio' ? 4500 : 1500); if (process.env.TAB) { await p.click(`.tabs [data-tab=${process.env.TAB}]`); await p.waitForTimeout(500); }
    if (full !== 'top') { // scroll through to trigger reveals
      const H = await p.evaluate(() => document.body.scrollHeight); for (let y = 0; y < H; y += 500) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(120); }
      await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(900);
    }
    await p.screenshot({path: `${__dirname}/shot-${route.replace(/\//g, '_')}-${lang}-${w}.jpg`, type: 'jpeg', quality: 70, fullPage: full !== 'top'});
    await p.close();
  }
  await b.close();
})();
