import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const $ = id => document.getElementById(id);
const K = window.KASHI;
const T = window.T || (x => x);
const HINT = 'DRAG TO LOOK AROUND · TAP A SURFACE TO CHANGE IT';
const MAT = [
  ['Nordic Sand', '#c9b59b', 3790, '60×60', 'stone'],
  ['Arctic Grey', '#929a9a', 3490, '60×60', 'concrete'],
  ['Pure White', '#eeeae3', 2790, '30×60', 'plain'],
  ['Persian Travertine', '#a99073', 4990, '60×120', 'travertine'],
  ['Ivory Limestone', '#ddd0b9', 3990, '80×80', 'stone'],
  ['Volcanic Graphite', '#555e5d', 4290, '60×60', 'concrete'],
  ['Warm Concrete', '#aaa69b', 3690, '60×60', 'concrete'],
  ['Fjord Blue', '#839a9f', 4190, '30×60', 'plain'],
  ['Desert Clay', '#b67d62', 3790, '60×60', 'clay'],
  ['Silver Marble', '#c6c8c4', 4990, '60×120', 'marble'],
  ['Basalt Stone', '#656b68', 4590, '80×80', 'stone'],
  ['Cream Silk', '#e3d8c6', 3490, '30×60', 'plain']
];
const ROUGH = {plain: .26, stone: .5, concrete: .78, clay: .66, marble: .14, travertine: .48};
const AMP = {plain: .55, stone: 1, concrete: 1.7, clay: 1.5, marble: .8, travertine: 1};
const TEX = 2.4; // metres covered by one texture (lcm of all tile formats)

let floorI = 0, wallI = 2, view = 'perspective';

/* ---------- helpers ---------- */
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mul = (h, f, a = 1) => { const [r, g, b] = rgb(h); const c = v => Math.max(0, Math.min(255, Math.round(v * f))); return `rgba(${c(r)},${c(g)},${c(b)},${a})`; };
const cv = n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };

/* ---------- procedural tile textures ---------- */
const texCache = {};
function makeTex(m, aniso) {
  if (texCache[m[0]]) return texCache[m[0]];
  const S = 2048, B = 1024, style = m[4], amp = AMP[style];
  const [tw, th] = m[3].split('×').map(n => n / 100);
  const nx = Math.round(TEX / tw), ny = Math.round(TEX / th);
  const col = cv(S), bmp = cv(B), g = col.getContext('2d'), b = bmp.getContext('2d');
  const rnd = rng(hash(m[0]));
  const lum = rgb(m[1]).reduce((a, v) => a + v, 0) / 3;
  const darkRGB = lum > 150 ? '70,55,40' : '0,0,0';
  g.fillStyle = mul(m[1], .66); g.fillRect(0, 0, S, S);
  b.fillStyle = '#1c1c1c'; b.fillRect(0, 0, B, B);
  const pw = S / nx, ph = S / ny, gap = 5;
  for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
    const x = ix * pw + gap / 2, y = iy * ph + gap / 2, w = pw - gap, h = ph - gap;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
    g.fillStyle = mul(m[1], .93 + rnd() * .12); g.fillRect(x, y, w, h);
    for (let k = 0; k < 7; k++) {
      const cx = x + rnd() * w, cy = y + rnd() * h, rad = (.2 + rnd() * .55) * Math.max(w, h);
      const gr = g.createRadialGradient(cx, cy, 0, cx, cy, rad), c = rnd() < .5 ? '255,255,255' : '0,0,0';
      gr.addColorStop(0, `rgba(${c},${(.04 + rnd() * .06) * amp})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x, y, w, h);
    }
    if (style === 'marble') {
      for (let k = 0; k < 4; k++) {
        g.beginPath(); let px = x + rnd() * w, py = y; g.moveTo(px, py);
        for (let s = 0; s < 5; s++) {
          const nxp = px + (rnd() - .5) * w * .55, nyp = y + h * (s + 1) / 5;
          g.bezierCurveTo(px + (rnd() - .5) * w * .3, py + (nyp - py) * .3, nxp + (rnd() - .5) * w * .3, py + (nyp - py) * .7, nxp, nyp);
          px = nxp; py = nyp;
        }
        g.strokeStyle = `rgba(95,100,100,${.1 + rnd() * .22})`; g.lineWidth = .7 + rnd() * 2.6; g.stroke();
      }
    }
    if (style === 'travertine' || style === 'stone') {
      const n = style === 'travertine' ? 170 : 70;
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
    g.restore();
    g.lineWidth = 2; g.strokeStyle = 'rgba(255,255,255,.2)';
    g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y); g.lineTo(x + w, y); g.stroke();
    g.strokeStyle = 'rgba(0,0,0,.14)';
    g.beginPath(); g.moveTo(x + w, y); g.lineTo(x + w, y + h); g.lineTo(x, y + h); g.stroke();
    const bx = ix * B / nx + 2, by = iy * B / ny + 2, bw = B / nx - 4, bh = B / ny - 4;
    b.fillStyle = '#c4c4c4'; b.fillRect(bx, by, bw, bh);
    const bn = Math.round(bw * bh / 180);
    for (let k = 0; k < bn; k++) { const v = 150 + (rnd() * 90 | 0); b.fillStyle = `rgb(${v},${v},${v})`; b.fillRect(bx + rnd() * bw, by + rnd() * bh, 1.5, 1.5); }
    if (style === 'travertine') for (let k = 0; k < 50; k++) { b.fillStyle = 'rgba(0,0,0,.35)'; b.fillRect(bx + rnd() * bw, by + rnd() * bh, 6 + rnd() * 40, 1.5); }
  }
  const map = new THREE.CanvasTexture(col), bump = new THREE.CanvasTexture(bmp);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; }
  return texCache[m[0]] = {map, bump};
}

/* ---------- small canvas textures ---------- */
function skyTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#6f9fd0'); sky.addColorStop(.55, '#bcd6ea'); sky.addColorStop(1, '#eef2ee');
  g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * 1024, y = 40 + Math.random() * 190;
    for (let j = 0; j < 7; j++) {
      const gr = g.createRadialGradient(x + j * 26, y + Math.random() * 14, 0, x + j * 26, y, 56);
      gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - 60 + j * 26, y - 60, 140, 140);
    }
  }
  const ridge = (base, amp, col, seed) => {
    const r = rng(seed); g.fillStyle = col; g.beginPath(); g.moveTo(0, 512);
    let y = base; for (let x = 0; x <= 1024; x += 16) { y += (r() - .5) * amp; y = Math.max(base - amp * 4, Math.min(base + amp * 3, y)); g.lineTo(x, y); }
    g.lineTo(1024, 512); g.closePath(); g.fill();
  };
  ridge(355, 28, '#8fa5b8', 7); ridge(392, 22, '#6d8497', 11); ridge(430, 14, '#4d6275', 3);
  g.fillStyle = '#e9ede8'; g.fillRect(0, 470, 1024, 42);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function artTexture() {
  const c = cv(512), g = c.getContext('2d');
  g.fillStyle = '#efe6d6'; g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#b4694b'; g.beginPath(); g.arc(210, 250, 128, 0, 7); g.fill();
  g.fillStyle = '#2f4a41'; g.beginPath(); g.arc(330, 290, 92, 0, 7); g.fill();
  g.strokeStyle = '#1a2620'; g.lineWidth = 6; g.beginPath(); g.moveTo(60, 400); g.bezierCurveTo(200, 330, 320, 460, 460, 380); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function dotTexture() {
  const c = cv(64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,240,215,1)'); gr.addColorStop(1, 'rgba(255,240,215,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/* ---------- main ---------- */
function init() {
  const stage = $('roomStage');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'high-performance'}); }
  catch (e) { $('roomLoading').textContent = 'The 3D showroom needs WebGL. Please try another browser.'; return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const dom = renderer.domElement; dom.id = 'roomCanvas'; dom.setAttribute('aria-label', '3D room showing selected floor and wall tiles'); dom.setAttribute('role', 'img');
  stage.prepend(dom);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .38;
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 120);
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true; controls.dampingFactor = .07; controls.enableZoom = false; controls.enablePan = false;
  controls.minPolarAngle = .02; controls.maxPolarAngle = Math.PI * .495;
  dom.style.touchAction = 'pan-y';

  /* lights */
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.4);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.radius = 5; sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xdfe9f5, 0xb9a98f, .45); scene.add(hemi);
  const lampLight = new THREE.PointLight(0xffc98a, 1.1, 5, 1.6); scene.add(lampLight);

  /* persistent materials */
  const floorMat = new THREE.MeshStandardMaterial({bumpScale: 1.4});
  const wallMat = new THREE.MeshStandardMaterial({bumpScale: 1});
  const paint = new THREE.MeshStandardMaterial({color: 0xf1eee7, roughness: .85});
  const fabric = new THREE.MeshStandardMaterial({color: 0x8a8d82, roughness: .97});
  const fabric2 = new THREE.MeshStandardMaterial({color: 0xc4764f, roughness: .95});
  const wood = new THREE.MeshStandardMaterial({color: 0x94704b, roughness: .55});
  const dark = new THREE.MeshStandardMaterial({color: 0x1d2220, roughness: .5, metalness: .4});
  const brass = new THREE.MeshStandardMaterial({color: 0xcaa766, roughness: .28, metalness: 1});
  const rug = new THREE.MeshStandardMaterial({color: 0xded6c6, roughness: 1});
  const leafMat = new THREE.MeshStandardMaterial({color: 0x3f6b49, roughness: .7});
  const potMat = new THREE.MeshStandardMaterial({color: 0xd9d1c3, roughness: .6});
  const mirrorMat = new THREE.MeshStandardMaterial({color: 0xdfe6e6, roughness: .03, metalness: 1});
  const glowMat = new THREE.MeshStandardMaterial({color: 0xfff2d6, emissive: 0xffcf8f, emissiveIntensity: 2.2});
  const artMat = new THREE.MeshStandardMaterial({map: artTexture(), roughness: .9});
  const skyMat = new THREE.MeshBasicMaterial({map: skyTexture(), toneMapped: false});

  let group = null, pick = [], sway = [], dust = null, dustVel = null, winX = 0, roomW = 4, roomL = 5;

  function applyTiles() {
    const f = makeTex(MAT[floorI], aniso), w = makeTex(MAT[wallI], aniso);
    Object.assign(floorMat, {map: f.map, bumpMap: f.bump, roughness: ROUGH[MAT[floorI][4]]});
    Object.assign(wallMat, {map: w.map, bumpMap: w.bump, roughness: Math.min(.9, ROUGH[MAT[wallI][4]] + .12)});
    floorMat.needsUpdate = wallMat.needsUpdate = true;
  }

  const uvFrom = (geo, fn) => {
    const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { const [u, v] = fn(p.getX(i), p.getY(i), p.getZ(i)); uv[i * 2] = u; uv[i * 2 + 1] = v; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  };
  const add = (geo, mat, x, y, z, o = {}) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false; group.add(m); return m;
  };
  const rbox = (w, h, d, r = .03) => new RoundedBoxGeometry(w, h, d, 3, r);

  function build() {
    if (group) { scene.remove(group); group.traverse(o => o.geometry && o.geometry.dispose()); }
    group = new THREE.Group(); scene.add(group); pick = []; sway = [];
    const W = roomW = +$('roomWidth').value, L = roomL = +$('roomLength').value, H = 2.7;
    const ww = Math.min(1.5, W * .42), wx = winX = Math.min(W / 2 - ww / 2 - .35, W * .22), wy0 = .85, wy1 = 2.25;

    /* floor */
    const fg = new THREE.PlaneGeometry(W, L); fg.rotateX(-Math.PI / 2);
    uvFrom(fg, (x, y, z) => [(x + W / 2) / TEX, (z + L / 2) / TEX]);
    const floor = add(fg, floorMat, 0, 0, 0, {cast: false}); floor.userData.kind = 'floor'; pick.push(floor);

    /* back wall with window */
    const bs = new THREE.Shape(); bs.moveTo(0, 0); bs.lineTo(W, 0); bs.lineTo(W, H); bs.lineTo(0, H); bs.closePath();
    const hole = new THREE.Path(); const hx = W / 2 + wx - ww / 2;
    hole.moveTo(hx, wy0); hole.lineTo(hx + ww, wy0); hole.lineTo(hx + ww, wy1); hole.lineTo(hx, wy1); hole.closePath(); bs.holes.push(hole);
    const bg = new THREE.ShapeGeometry(bs); uvFrom(bg, (x, y) => [x / TEX, y / TEX]); bg.translate(-W / 2, 0, -L / 2);
    const back = add(bg, wallMat, 0, 0, 0); back.material.shadowSide = THREE.DoubleSide; back.userData.kind = 'wall'; pick.push(back);

    /* left wall */
    const ls = new THREE.Shape(); ls.moveTo(0, 0); ls.lineTo(L, 0); ls.lineTo(L, H); ls.lineTo(0, H); ls.closePath();
    const lg = new THREE.ShapeGeometry(ls); uvFrom(lg, (x, y) => [x / TEX, y / TEX]); lg.rotateY(Math.PI / 2); lg.translate(-W / 2, 0, L / 2);
    const left = add(lg, wallMat, 0, 0, 0, {cast: false}); left.userData.kind = 'wall'; pick.push(left);

    /* skirting */
    add(rbox(W, .1, .014, .004), paint, 0, .05, -L / 2 + .008, {cast: false});
    add(rbox(.014, .1, L, .004), paint, -W / 2 + .008, .05, 0, {cast: false});

    /* window frame, sill, mullions */
    const fz = -L / 2, ft = .055;
    add(rbox(ww + .1, ft, .16, .01), dark, wx, wy0 - ft / 2, fz);
    add(rbox(ww + .1, ft, .16, .01), dark, wx, wy1 + ft / 2, fz);
    add(rbox(ft, wy1 - wy0, .16, .01), dark, wx - ww / 2 - ft / 2 + .0, (wy0 + wy1) / 2, fz);
    add(rbox(ft, wy1 - wy0, .16, .01), dark, wx + ww / 2 + ft / 2, (wy0 + wy1) / 2, fz);
    add(rbox(.035, wy1 - wy0, .1, .008), dark, wx, (wy0 + wy1) / 2, fz);
    add(rbox(ww, .035, .1, .008), dark, wx, (wy0 + wy1) / 2 + .1, fz);
    add(rbox(ww + .22, .04, .26, .012), paint, wx, wy0 - .045, fz + .1);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(46, 23), skyMat); sky.position.set(wx, 4, -L / 2 - 11); group.add(sky);

    /* furniture layout */
    const sw = Math.min(2.05, W * .46), sx = Math.max(-W / 2 + .95 + sw / 2, -W * .2), sz = -L / 2 + .5;
    const sofa = new THREE.Group(); sofa.position.set(sx, 0, sz); group.add(sofa);
    const sadd = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; sofa.add(o); };
    sadd(rbox(sw, .22, .92, .05), fabric, 0, .27, .02);
    sadd(rbox(sw, .46, .24, .1), fabric, 0, .6, -.34);
    sadd(rbox(.2, .36, .92, .08), fabric, -sw / 2 + .1, .4, .02);
    sadd(rbox(.2, .36, .92, .08), fabric, sw / 2 - .1, .4, .02);
    const cw = (sw - .5) / 2;
    for (const s of [-1, 1]) {
      sadd(rbox(cw, .16, .62, .06), fabric, s * (cw / 2 + .005), .46, .1);
      sadd(rbox(cw * .92, .38, .14, .07), fabric, s * (cw / 2), .68, -.18);
    }
    const pil = rbox(.42, .42, .13, .06); sadd(pil, fabric2, -sw / 2 + .42, .65, -.05); sofa.children.at(-1).rotation.set(.12, .45, .06);
    for (const x of [-sw / 2 + .12, sw / 2 - .12, -sw / 2 + .12, sw / 2 - .12]) sadd(new THREE.CylinderGeometry(.02, .02, .12, 10), dark, x, .06, x < 0 ? .38 : .38);

    if (W >= 2.5 && L >= 3.2) {
      const r = add(rbox(2.3, .02, 1.6, .01), rug, sx, .01, -L / 2 + 1.75, {cast: false});
      if (L >= 3.8) {
        add(new THREE.CylinderGeometry(.42, .42, .035, 48), mirrorMat, sx + .1, .4, -L / 2 + 1.75);
        add(new THREE.CylinderGeometry(.04, .04, .38, 12), brass, sx + .1, .2, -L / 2 + 1.75);
        add(new THREE.CylinderGeometry(.2, .2, .02, 32), brass, sx + .1, .01, -L / 2 + 1.75);
        const vase = add(new THREE.CylinderGeometry(.06, .09, .22, 24), potMat, sx + .02, .53, -L / 2 + 1.7);
      }
    }

    /* art above sofa */
    add(rbox(1.1, .8, .04, .008), wood, sx, 1.62, -L / 2 + .03);
    add(new THREE.PlaneGeometry(.98, .68), artMat, sx, 1.62, -L / 2 + .054, {cast: false});

    /* left wall: mirror + bench */
    const mz = Math.min(L * .1, .6);
    add(new THREE.TorusGeometry(.5, .025, 12, 64), brass, -W / 2 + .03, 1.55, mz).rotation.y = Math.PI / 2;
    const mm = add(new THREE.CircleGeometry(.49, 64), mirrorMat, -W / 2 + .012, 1.55, mz, {cast: false}); mm.rotation.y = Math.PI / 2;
    add(rbox(.42, .42, 1.3, .03), wood, -W / 2 + .26, .21, mz);
    add(rbox(.4, .06, 1.0, .03), fabric2, -W / 2 + .26, .45, mz);

    /* plant near window, swaying leaves */
    const px = Math.min(W / 2 - .42, wx + ww / 2 + .65), pz = -L / 2 + .42;
    add(new THREE.CylinderGeometry(.17, .13, .34, 28), potMat, px, .17, pz);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2, leaf = new THREE.Mesh(new THREE.SphereGeometry(.1, 14, 10), leafMat);
      leaf.scale.set(.55, 2.6 + (i % 3) * .5, 1); leaf.castShadow = true;
      const piv = new THREE.Group(); piv.position.set(px, .34, pz); piv.rotation.set(0, a, .45 + (i % 4) * .13);
      leaf.position.set(0, .3 + (i % 3) * .06, 0); piv.add(leaf); group.add(piv); sway.push({piv, base: piv.rotation.z, ph: i});
    }

    /* floor lamp with soft glow */
    const lx = -W / 2 + .42, lz = -L / 2 + .42;
    add(new THREE.CylinderGeometry(.13, .15, .03, 28), brass, lx, .015, lz);
    add(new THREE.CylinderGeometry(.012, .012, 1.55, 10), brass, lx, .78, lz);
    add(new THREE.SphereGeometry(.17, 28, 20), glowMat, lx, 1.62, lz, {cast: false});
    lampLight.position.set(lx + .1, 1.55, lz + .15);

    /* dust motes in the light */
    const N = 170, pos = new Float32Array(N * 3); dustVel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = wx + (Math.random() - .5) * 2.4; pos[i * 3 + 1] = .3 + Math.random() * 2.2; pos[i * 3 + 2] = -L / 2 + .2 + Math.random() * Math.min(3.8, L - .4);
      dustVel[i * 3] = (Math.random() - .5) * .04; dustVel[i * 3 + 1] = (Math.random() - .3) * .03; dustVel[i * 3 + 2] = (Math.random() - .5) * .03;
    }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(dg, new THREE.PointsMaterial({map: dotTexture(), size: .05, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe6bd}));
    group.add(dust);

    /* shadow camera */
    const r = Math.max(W, L) / 2 + 2.5, sc = sun.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = .5; sc.far = 40; sc.updateProjectionMatrix();
    daylight(+$('daylight').value / 100);
    applyTiles(); updateCost();
    if (!tween) setPose(poseOf(view), true);
  }

  /* daylight 0..1 : morning → noon → evening */
  const C0 = new THREE.Color(0xffc48a), C1 = new THREE.Color(0xfff4e2), C2 = new THREE.Color(0xff9a58);
  const S0 = new THREE.Color(1, .88, .82), S1 = new THREE.Color(1, 1, 1), S2 = new THREE.Color(1, .72, .5);
  function daylight(t) {
    const k = t < .5 ? t * 2 : (t - .5) * 2, col = (t < .5 ? C0.clone().lerp(C1, k) : C1.clone().lerp(C2, k));
    const a = (t - .5) * 2;
    sun.color.copy(col);
    sun.position.set(winX - a * 4.2, 2.6 + Math.sin(t * Math.PI) * 2.4, -roomL / 2 - 4.5);
    sun.target.position.set(winX + a * 1.4, 0, roomL * .12); sun.target.updateMatrixWorld();
    sun.intensity = 1.6 + Math.sin(t * Math.PI) * 2.2;
    skyMat.color.copy(t < .5 ? S0.clone().lerp(S1, k) : S1.clone().lerp(S2, k));
    renderer.toneMappingExposure = .88 + Math.sin(t * Math.PI) * .22;
    lampLight.intensity = .6 + (1 - Math.sin(t * Math.PI)) * 1.6;
    glowMat.emissiveIntensity = 1.4 + (1 - Math.sin(t * Math.PI)) * 2.6;
    const names = ['Morning', 'Morning', 'Midday', 'Afternoon', 'Evening'];
    $('daylightLabel').textContent = T(names[Math.min(4, Math.floor(t * 5))]);
  }

  /* camera poses + tween */
  let tween = null;
  function poseOf(v) {
    const W = roomW, L = roomL, d = Math.max(W, L), asp = camera.aspect || 1.5, s = Math.min(1.9, Math.max(1, 1.3 / asp));
    if (v === 'front') return {p: [0, 1.45, L / 2 + (d * .8 + 2.4) * s], t: [0, 1.15, -L * .08]};
    if (v === 'left') return {p: [W / 2 + (d * .85 + 2.2) * s, 1.55, L * .04], t: [-W * .12, 1.15, -L * .04]};
    if (v === 'top') return {p: [0, Math.max(1.3 * L, W / (.77 * asp)) * 1.12 + 1, .01], t: [0, 0, 0]};
    return {p: [W * .5 + (d * .35 + 1.5) * s, 1.85 + d * .1, L / 2 + (d * .55 + 1.4) * s], t: [-W * .06, 1, -L * .1]};
  }
  function setPose(po, instant) {
    if (instant) { camera.position.set(...po.p); controls.target.set(...po.t); controls.update(); tween = null; return; }
    tween = {t0: performance.now(), dur: 1100, fp: camera.position.clone(), ft: controls.target.clone(), tp: new THREE.Vector3(...po.p), tt: new THREE.Vector3(...po.t)};
  }
  controls.addEventListener('start', () => { tween = null; });

  /* UI */
  const fmt = n => Math.round(n).toLocaleString('en-US');
  function updateCost() {
    const W = +$('roomWidth').value, L = +$('roomLength').value, area = W * L, qty = Math.ceil(area * 1.1 / 1.44) * 1.44;
    $('widthVal').textContent = W + ' m'; $('lengthVal').textContent = L + ' m';
    $('roomCost').textContent = fmt(qty * MAT[floorI][2]) + ' ISK';
    $('roomInfo').textContent = area + ' ' + T('m² room') + ' · ' + qty.toFixed(2) + ' ' + T('m² material') + ' · ' + MAT[floorI][0];
    for (const role of ['floor', 'wall']) {
      const cur = role === 'floor' ? floorI : wallI;
      $(role + 'Palette').innerHTML = MAT.map((x, i) => '<button type="button" class="surface-chip ' + (cur === i ? 'chosen' : '') + '" data-role="' + role + '" data-index="' + i + '" aria-label="' + x[0] + '"><span class="swatch" style="background:' + x[1] + '"></span><b>' + x[0] + '</b><small>' + x[3] + '</small></button>').join('');
    }
  }
  function choose(role, i) { if (role === 'floor') floorI = i; else wallI = i; applyTiles(); updateCost(); }

  document.querySelectorAll('.cam').forEach(b => b.onclick = () => {
    view = b.dataset.view; document.querySelectorAll('.cam').forEach(x => x.classList.toggle('active', x === b)); setPose(poseOf(view));
  });
  $('studio3d').addEventListener('click', e => { const b = e.target.closest('.surface-chip'); if (b) choose(b.dataset.role, +b.dataset.index); });
  let rebuildT;
  for (const id of ['roomWidth', 'roomLength']) $(id).addEventListener('input', () => { updateCost(); clearTimeout(rebuildT); rebuildT = setTimeout(() => { build(); setPose(poseOf(view)); }, 60); });
  $('daylight').addEventListener('input', e => daylight(+e.target.value / 100));
  $('snapBtn').onclick = () => { renderer.render(scene, camera); const a = document.createElement('a'); a.download = 'kashi-showroom.png'; a.href = dom.toDataURL('image/png'); a.click(); };
  $('continuePrice').onclick = () => {
    const area = +$('roomWidth').value * +$('roomLength').value; $('area').value = area; $('waste').value = '10';
    const tile = MAT[floorI]; let idx = K.products.findIndex(x => x.name === tile[0]);
    if (idx < 0) { K.products.push({name: tile[0], size: tile[3], price: tile[2], box: 1.44, img: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=700'}); idx = K.products.length - 1; }
    K.choose(idx); K.calculate(); $('calculator').scrollIntoView({behavior: 'smooth'});
  };
  const tryFloor = name => { const i = MAT.findIndex(m => m[0] === name); if (i >= 0) choose('floor', i); };
  window.addEventListener('kashi:floor', e => tryFloor(e.detail));
  if (window.__kashiFloor) { tryFloor(window.__kashiFloor); window.__kashiFloor = null; }

  /* hover hint + click pulse */
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null;
  const hit = e => { const r = dom.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera); return ray.intersectObjects(pick)[0]; };
  dom.addEventListener('pointermove', e => {
    const h = hit(e); dom.style.cursor = h ? 'pointer' : 'grab';
    $('roomHint').textContent = h ? (h.object.userData.kind === 'floor' ? T('FLOOR') + ' · ' + MAT[floorI][0] + ' · ' + MAT[floorI][3] + ' cm' : T('WALL') + ' · ' + MAT[wallI][0] + ' · ' + MAT[wallI][3] + ' cm') : T(HINT);
  });
  dom.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  dom.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const h = hit(e); if (!h) return;
    const el = $(h.object.userData.kind + 'Palette'); el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
    if (innerWidth < 900) el.scrollIntoView({behavior: 'smooth', block: 'center'});
  });

  /* size + loop */
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!tween) setPose(poseOf(view), true);
  }
  new ResizeObserver(resize).observe(stage);

  const clock = new THREE.Clock(); let running = false;
  const ease = k => 1 - Math.pow(1 - k, 3);
  function frame() {
    if (!running) return; requestAnimationFrame(frame);
    const t = clock.getElapsedTime();
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.t0) / tween.dur), e = ease(k);
      camera.position.lerpVectors(tween.fp, tween.tp, e); controls.target.lerpVectors(tween.ft, tween.tt, e);
      if (k >= 1) tween = null;
    }
    controls.update();
    for (const s of sway) s.piv.rotation.z = s.base + Math.sin(t * .9 + s.ph) * .035;
    if (dust) {
      const p = dust.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i) + dustVel[i * 3] * .016 * 4, y = p.getY(i) + dustVel[i * 3 + 1] * .016 * 4 + Math.sin(t + i) * .0006, z = p.getZ(i) + dustVel[i * 3 + 2] * .016 * 4;
        if (y > 2.7) y = .3; if (y < .2) y = 2.6; if (Math.abs(x - winX) > 1.4) dustVel[i * 3] *= -1; if (z > -roomL / 2 + Math.min(3.8, roomL - .4) + .2 || z < -roomL / 2 + .1) dustVel[i * 3 + 2] *= -1;
        p.setXYZ(i, x, y, z);
      }
      p.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }
  new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !running) { running = true; clock.start(); frame(); } else if (!v) running = false; }, {rootMargin: '120px'}).observe(stage);

  window.addEventListener('kashi:lang', () => { daylight(+$('daylight').value / 100); updateCost(); $('roomHint').textContent = T(HINT); });
  $('roomHint').textContent = T(HINT); $('roomLoading').textContent = T('Lighting the showroom…');
  resize(); build(); resize();
  $('roomLoading').classList.add('done');
}
init();
