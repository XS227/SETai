/* KASHI 3D room: procedural scene rendered with three.js. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const {TEX, draw, rng} = window.KTex;
const ROUGH = {plain: .26, stone: .5, concrete: .78, clay: .66, marble: .14, travertine: .48};
const texCache = {};
function makeTex(p, aniso) {
  if (texCache[p.id]) return texCache[p.id];
  const {col, bmp} = draw(p, 2048, true);
  const map = new THREE.CanvasTexture(col), bump = new THREE.CanvasTexture(bmp);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; }
  return texCache[p.id] = {map, bump};
}
const cv = n => { const c = document.createElement('canvas'); c.width = c.height = n; return c; };

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


/* stage: sized element. opts: {floor, wall, room, width, length, day, view, onPick, onHover, spin} */
export function createRoom(stage, opts) {
  const renderer = new THREE.WebGLRenderer({antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const dom = renderer.domElement; dom.className = 'room-canvas'; dom.setAttribute('role', 'img'); dom.setAttribute('aria-label', '3D room');
  stage.prepend(dom);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const state = {floor: opts.floor, wall: opts.wall, room: opts.room || 'living', width: opts.width || 4, length: opts.length || 5, day: opts.day ?? .5, view: opts.view || 'close'};

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .38;
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 120);
  const controls = new OrbitControls(camera, dom);
  controls.enableDamping = true; controls.dampingFactor = .07; controls.enableZoom = false; controls.enablePan = false;
  controls.minPolarAngle = .02; controls.maxPolarAngle = Math.PI * .495;
  dom.style.touchAction = 'pan-y';

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
  const mirrorMat = new THREE.MeshStandardMaterial({color: 0xdfe6e6, roughness: .08, metalness: .7, emissive: 0x6c7a78, emissiveIntensity: .55});
  const glowMat = new THREE.MeshStandardMaterial({color: 0xfff2d6, emissive: 0xffcf8f, emissiveIntensity: 2.2});
  const artMat = new THREE.MeshStandardMaterial({map: artTexture(), roughness: .9});
  const skyMat = new THREE.MeshBasicMaterial({map: skyTexture(), toneMapped: false});

  let group = null, pick = [], sway = [], dust = null, dustVel = null, winX = 0, roomW = 4, roomL = 5;


  function applyTiles() {
    const f = makeTex(state.floor, aniso), w = makeTex(state.wall, aniso);
    Object.assign(floorMat, {map: f.map, bumpMap: f.bump, roughness: ROUGH[state.floor.style]});
    Object.assign(wallMat, {map: w.map, bumpMap: w.bump, roughness: Math.min(.9, ROUGH[state.wall.style] + .12)});
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

  const layouts = {};
  layouts.living = (W, L, ww, wx) => {
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
  };
  layouts.bathroom = (W, L, ww, wx) => {
      /* bathroom: tub, vanity, mirror, towel rail */
      const ceramic = new THREE.MeshStandardMaterial({color: 0xf6f4ee, roughness: .18});
      const tl = Math.min(1.75, W * .55), tx = -W / 2 + tl / 2 + .18, tz = -L / 2 + .48;
      add(rbox(tl, .52, .8, .13), ceramic, tx, .3, tz);
      add(rbox(tl - .22, .012, .58, .006), new THREE.MeshStandardMaterial({color: 0xcfe0e0, roughness: .06}), tx, .561, tz, {cast: false});
      add(new THREE.CylinderGeometry(.018, .018, .5, 12), brass, tx - tl / 2 + .05, .8, tz - .32);
      add(rbox(.22, .028, .028, .01), brass, tx - tl / 2 + .15, 1.05, tz - .32);
      const vz = Math.min(L * .08, .5);
      add(rbox(.52, .34, 1.35, .02), wood, -W / 2 + .27, .62, vz);
      add(rbox(.56, .05, 1.42, .012), ceramic, -W / 2 + .29, .815, vz);
      add(new THREE.CylinderGeometry(.22, .17, .13, 40), ceramic, -W / 2 + .3, .9, vz);
      add(new THREE.CylinderGeometry(.014, .014, .26, 10), brass, -W / 2 + .07, .97, vz);
      add(rbox(.2, .025, .025, .008), brass, -W / 2 + .16, 1.1, vz);
      add(new THREE.TorusGeometry(.46, .02, 12, 64), brass, -W / 2 + .03, 1.67, vz).rotation.y = Math.PI / 2;
      const bm = add(new THREE.CircleGeometry(.45, 64), mirrorMat, -W / 2 + .014, 1.67, vz, {cast: false}); bm.rotation.y = Math.PI / 2;
      if (L >= 3) add(rbox(1.1, .025, .7, .01), rug, tx, .012, -L / 2 + 1.4, {cast: false});
      const rx = Math.min(W / 2 - .35, wx + ww / 2 + .45), rz = -L / 2 + .42;
      add(new THREE.CylinderGeometry(.22, .2, .46, 28), wood, rx, .23, rz);
      add(rbox(.28, .09, .24, .04), fabric2, rx, .51, rz);
      add(new THREE.CylinderGeometry(.04, .05, .17, 20), potMat, rx + .02, .64, rz);
      const hz = Math.min(L / 2 - .5, vz + 1.35);
      add(new THREE.CylinderGeometry(.012, .012, .7, 10), brass, -W / 2 + .07, 1.35, hz).rotation.x = Math.PI / 2;
      add(rbox(.05, .72, .45, .02), fabric, -W / 2 + .08, 1.0, hz);
      lampLight.position.set(-W / 2 + .45, 2.2, vz);
  };
  layouts.kitchen = (W, L, ww, wx) => {
      /* kitchen: run of cabinets, shelf, island with stools */
      const stone = new THREE.MeshStandardMaterial({color: 0xe9e4da, roughness: .22});
      const front = new THREE.MeshStandardMaterial({color: 0x52655a, roughness: .55});
      const cl = W - .3, cz = -L / 2 + .32;
      add(rbox(cl, .82, .6, .012), front, 0, .43, cz);
      add(rbox(cl + .06, .045, .66, .01), stone, 0, .865, cz + .02);
      const n = Math.max(3, Math.round(cl / .6));
      for (let i = 0; i < n; i++) {
        const x = -cl / 2 + (i + .5) * cl / n;
        add(rbox(.2, .016, .016, .006), brass, x, .72, cz + .31);
        if (i) add(rbox(.006, .74, .006, .002), dark, x - cl / n / 2, .43, cz + .302);
      }
      add(rbox(.62, .012, .42, .004), dark, -cl * .28, .895, cz);
      add(new THREE.CylinderGeometry(.015, .015, .34, 10), brass, wx, 1.05, cz - .18);
      add(rbox(.026, .026, .24, .008), brass, wx, 1.22, cz - .07);
      const shw = Math.min(1.3, wx - ww / 2 + W / 2 - .35);
      if (shw > .5) for (const y of [1.45, 1.85]) {
        const x = -W / 2 + .18 + shw / 2;
        add(rbox(shw, .035, .24, .008), wood, x, y, -L / 2 + .13);
        for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(.06, .055, .16 + i * .04, 18), i === 1 ? fabric2 : potMat, x - shw / 3 + i * shw / 3, y + .1 + i * .02, -L / 2 + .13);
      }
      if (L >= 3.6) {
        const iw = Math.min(1.8, W * .45), iz = -L / 2 + 2.05;
        add(rbox(iw, .84, .75, .012), wood, 0, .42, iz);
        add(rbox(iw + .08, .05, .98, .01), stone, 0, .865, iz + .08);
        for (const s of [-1, 1]) {
          add(new THREE.CylinderGeometry(.17, .17, .05, 28), fabric2, s * iw * .24, .64, iz + .78);
          add(new THREE.CylinderGeometry(.022, .022, .62, 10), dark, s * iw * .24, .31, iz + .78);
          add(new THREE.CylinderGeometry(.005, .005, .65, 6), dark, s * iw * .24, 2.37, iz);
          add(new THREE.SphereGeometry(.1, 24, 16), glowMat, s * iw * .24, 2.0, iz, {cast: false});
        }
        add(new THREE.CylinderGeometry(.16, .1, .09, 28), potMat, 0, .93, iz);
        lampLight.position.set(0, 1.85, iz);
      } else lampLight.position.set(0, 1.9, cz + .5);
  };

  function build() {
    if (group) { scene.remove(group); group.traverse(o => o.geometry && o.geometry.dispose()); }
    group = new THREE.Group(); scene.add(group); pick = []; sway = [];
    const W = roomW = state.width, L = roomL = state.length, H = 2.7;
    const ww = Math.min(1.5, W * .42), wx = winX = Math.min(W / 2 - ww / 2 - .35, W * .22), wy0 = state.room === 'kitchen' ? 1.12 : .85, wy1 = 2.25;

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

    layouts[state.room](W, L, ww, wx);

    /* dust motes in the light */
    const N = 170, pos = new Float32Array(N * 3); dustVel = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = wx + (Math.random() - .5) * 2.4; pos[i * 3 + 1] = .3 + Math.random() * 2.2; pos[i * 3 + 2] = -L / 2 + .2 + Math.random() * Math.min(3.8, L - .4);
      dustVel[i * 3] = (Math.random() - .5) * .04; dustVel[i * 3 + 1] = (Math.random() - .3) * .03; dustVel[i * 3 + 2] = (Math.random() - .5) * .03;
    }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dust = new THREE.Points(dg, new THREE.PointsMaterial({map: dotTexture(), size: .028, transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe6bd}));
    if (opts.dust !== false) group.add(dust);

    /* shadow camera */
    const r = Math.max(W, L) / 2 + 2.5, sc = sun.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = .5; sc.far = 40; sc.updateProjectionMatrix();
    daylight(state.day); applyTiles();
    if (!tween) setPose(poseOf(state.view), true);
  }

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
  }

  /* camera poses + tween */
  let tween = null;
  function poseOf(v) {
    const W = roomW, L = roomL, d = Math.max(W, L), asp = camera.aspect || 1.5, s = Math.min(1.9, Math.max(1, 1.3 / asp));
    if (v === 'close') return {p: [W * .3, 1.62, L / 2 + .75 * s], t: [-W * .16, .98, -L * .3]};
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

  controls.addEventListener('start', () => { tween = null; controls.autoRotate = false; });

  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let down = null;
  const hit = e => { const r = dom.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera); return ray.intersectObjects(pick)[0]; };
  dom.addEventListener('pointermove', e => { const h = hit(e); dom.style.cursor = h ? 'pointer' : 'grab'; opts.onHover?.(h?.object.userData.kind || null); });
  dom.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  dom.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
    const h = hit(e); if (h) opts.onPick?.(h.object.userData.kind);
  });

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!tween) setPose(poseOf(state.view), true);
  }
  new ResizeObserver(resize).observe(stage);

  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    if (!calm) for (const s of sway) s.piv.rotation.z = s.base + Math.sin(t * .9 + s.ph) * .035;
    if (dust && !calm) {
      const p = dust.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        let x = p.getX(i) + dustVel[i * 3] * .064, y = p.getY(i) + dustVel[i * 3 + 1] * .064 + Math.sin(t + i) * .0006, z = p.getZ(i) + dustVel[i * 3 + 2] * .064;
        if (y > 2.7) y = .3; if (y < .2) y = 2.6; if (Math.abs(x - winX) > 1.4) dustVel[i * 3] *= -1; if (z > -roomL / 2 + Math.min(3.8, roomL - .4) + .2 || z < -roomL / 2 + .1) dustVel[i * 3 + 2] *= -1;
        p.setXYZ(i, x, y, z);
      }
      p.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }
  new IntersectionObserver(es => { const v = es.at(-1).isIntersecting; if (v && !running) { running = true; clock.start(); frame(); } else if (!v) running = false; }, {rootMargin: '120px'}).observe(stage);

  resize(); build(); resize(); renderer.render(scene, camera);

  return {
    state,
    set(patch) {
      const rebuild = ['room', 'width', 'length'].some(k => k in patch && patch[k] !== state[k]);
      const view = 'view' in patch;
      Object.assign(state, patch);
      if (rebuild) build(); else { if (patch.floor || patch.wall) applyTiles(); if ('day' in patch) daylight(state.day); }
      if (view || rebuild) setPose(poseOf(state.view), rebuild && !view);
      renderer.render(scene, camera);
    },
    snapshot() { renderer.render(scene, camera); return dom.toDataURL('image/png'); }
  };
}
