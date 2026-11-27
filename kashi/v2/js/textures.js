/* Procedural tile textures, shared by catalogue thumbnails and the 3D room. */
(() => {
const TEX = 2.4; // metres covered by one texture (lcm of all tile formats)
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mul = (h, f, a = 1) => { const [r, g, b] = rgb(h); const c = v => Math.max(0, Math.min(255, Math.round(v * f))); return `rgba(${c(r)},${c(g)},${c(b)},${a})`; };
const cv = n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };

/* p: {name,color,style,w,h} (w/h in cm). S: canvas size. bump: also draw bump map. */
function draw(p, S = 1024, bump = false) {
  const B = S / 2, style = p.style, amp = {plain: .55, stone: 1, concrete: 1.7, clay: 1.5, marble: .8, travertine: 1}[style];
  const nx = Math.round(TEX / (p.w / 100)), ny = Math.round(TEX / (p.h / 100));
  const col = cv(S), g = col.getContext('2d'), bmp = bump ? cv(B) : null, b = bmp && bmp.getContext('2d');
  const rnd = rng(hash(p.name));
  const darkRGB = rgb(p.color).reduce((a, v) => a + v, 0) / 3 > 150 ? '70,55,40' : '0,0,0';
  const k0 = S / 2048; g.scale(k0, k0);
  g.fillStyle = mul(p.color, .66); g.fillRect(0, 0, 2048, 2048);
  if (b) { b.scale(B / 1024, B / 1024); b.fillStyle = '#1c1c1c'; b.fillRect(0, 0, 1024, 1024); }
  const pw = 2048 / nx, ph = 2048 / ny, gap = Math.min(5, pw * .05);
  for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
    const x = ix * pw + gap / 2, y = iy * ph + gap / 2, w = pw - gap, h = ph - gap;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = mul(p.color, .93 + rnd() * .12); g.fillRect(x, y, w, h);
    for (let k = 0; k < 7; k++) {
      const cx = x + rnd() * w, cy = y + rnd() * h, rad = (.2 + rnd() * .55) * Math.max(w, h);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad), c = rnd() < .5 ? '255,255,255' : '0,0,0';
      gr.addColorStop(0, `rgba(${c},${(.04 + rnd() * .06) * amp})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    }
    if (style === 'marble') for (let k = 0; k < 4; k++) {
      g.beginPath(); let px = x + rnd() * w, py = y; g.moveTo(px, py);
      for (let s = 0; s < 5; s++) {
        const qx = px + (rnd() - .5) * w * .55, qy = y + h * (s + 1) / 5;
        g.bezierCurveTo(px + (rnd() - .5) * w * .3, py + (qy - py) * .3, qx + (rnd() - .5) * w * .3, py + (qy - py) * .7, qx, qy);
        px = qx; py = qy;
      }
      g.strokeStyle = `rgba(95,100,100,${.1 + rnd() * .22})`; g.lineWidth = .7 + rnd() * 2.6; g.stroke();
    }
    if (style === 'travertine' || style === 'stone') {
      const n = Math.max(8, Math.round((style === 'travertine' ? 170 : 70) * Math.min(1, w * h / 260000)));
      for (let k = 0; k < n; k++) {
        g.fillStyle = `rgba(${darkRGB},${.06 + rnd() * .12})`;
        g.fillRect(x + rnd() * w, y + rnd() * h, 8 + rnd() * (style === 'travertine' ? 90 : 36), 1 + rnd() * 2.2);
      }
    }
    const sp = Math.round(w * h / 240);
    for (let k = 0; k < sp; k++) {
      g.fillStyle = rnd() < .5 ? `rgba(255,255,255,${.04 + rnd() * .08})` : `rgba(0,0,0,${.04 + rnd() * .08})`;
      g.fillRect(x + rnd() * w, y + rnd() * h, 1 + rnd() * 1.4, 1 + rnd() * 1.4);
    }
    if (style === 'plain') { // glaze sheen
      const gr = g.createLinearGradient(x, y, x + w, y + h);
      gr.addColorStop(0, 'rgba(255,255,255,.16)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.08)');
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    }
    g.restore();
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.2)';
    g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y); g.lineTo(x + w, y); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.14)';
    g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.stroke();
    if (b) {
      const bx = ix * 1024 / nx + 2, by = iy * 1024 / ny + 2, bw = 1024 / nx - 4, bh = 1024 / ny - 4;
      b.fillStyle = '#c4c4c4'; b.fillRect(bx, by, bw, bh);
      const bn = Math.round(bw * bh / 180);
      for (let k = 0; k < bn; k++) { const v = 150 + (rnd() * 90 | 0); b.fillStyle = `rgb(${v},${v},${v})`; b.fillRect(bx + rnd() * bw, by + rnd() * bh, 1.5, 1.5); }
      if (style === 'travertine') for (let k = 0; k < 30; k++) { b.fillStyle = 'rgba(0,0,0,.35)'; b.fillRect(bx + rnd() * bw, by + rnd() * bh, 6 + rnd() * 40, 1.5); }
    }
  }
  return {col, bmp};
}

const cache = {};
/* Thumbnail data URL showing about 1.2 × 1.2 m of the surface. */
function thumb(p) {
  const key = p.name + p.color + p.w + p.h + p.style;
  if (!cache[key]) {
    const {col} = draw(p, 960), out = cv(480);
    out.getContext('2d').drawImage(col, 0, 0, 480, 480, 0, 0, 480, 480);
    cache[key] = out.toDataURL('image/jpeg', .82);
  }
  return cache[key];
}
window.KTex = {TEX, draw, thumb, rng, hash};
})();
