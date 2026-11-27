// Render the preset rooms with the real 3D engine into site/img/look-*.jpg
const {chromium} = require('/home/ubuntu/pw/node_modules/playwright-core');
const fs = require('fs');
const CH = require('child_process').execSync('ls -d ~/.cache/ms-playwright/chromium-1248/*/chrome | head -1').toString().trim();
(async () => {
  const browser = await chromium.launch({executablePath: CH, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist']});
  const page = await browser.newPage({viewport: {width: 1300, height: 900}});
  page.on('pageerror', e => console.log(e.message));
  await page.goto('http://127.0.0.1:8792/v2/#faq'); await page.waitForTimeout(800);
  const ids = await page.evaluate(() => KDATA.looks.map(l => l.id));
  for (const id of ids) {
    const url = await page.evaluate(async id => {
      const m = await import('./js/room.js?v=' + KASHI_V), l = KDATA.looks.find(x => x.id === id), get = n => KDATA.products.find(p => p.id === n);
      const el = document.createElement('div'); el.style.cssText = 'position:fixed;top:0;left:0;width:1200px;height:800px;z-index:99;background:#d9d6cc'; document.body.append(el);
      const size = {bathroom: [3.6, 4], kitchen: [4.2, 4.6], living: [4.6, 5]}[l.room];
      const api = m.createRoom(el, {floor: get(l.floor), wall: get(l.wall), room: l.room, width: size[0], length: size[1], day: .46, view: 'close', dust: false});
      await new Promise(r => setTimeout(r, 2500));
      const src = new Image(); src.src = api.snapshot(); await src.decode();
      const c = document.createElement('canvas'); c.width = 1200; c.height = 800; const g = c.getContext('2d');
      g.fillStyle = '#d9d6cc'; g.fillRect(0, 0, 1200, 800); g.drawImage(src, 0, 0, 1200, 800);
      el.remove(); return c.toDataURL('image/jpeg', .84);
    }, id);
    fs.writeFileSync(`${__dirname}/../v2/img/look-${id}.jpg`, Buffer.from(url.split(',')[1], 'base64'));
    console.log(id);
  }
  await browser.close();
})();
