// Ingrédients 3D réalistes (textures procédurales, aucune image externe)
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const LOOP = 8;                          // boucle parfaite de 8 s
export const W = (t, k = 1) => (t / LOOP) * Math.PI * 2 * k;   // phase périodique
let seed = 11;
export const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// ------------------------------------------------------------ textures procédurales
export function canvasTex(w, h, draw, srgb = true, rep = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function speckle(x, w, h, n, cols, r1, r2, a = 1) {
  for (let i = 0; i < n; i++) { x.globalAlpha = a * (.3 + rand() * .7); x.fillStyle = cols[Math.floor(rand() * cols.length)];
    x.beginPath(); x.ellipse(rand() * w, rand() * h, r1 + rand() * (r2 - r1), r1 + rand() * (r2 - r1), rand() * 3, 0, 7); x.fill(); }
  x.globalAlpha = 1;
}
const noise = (base, cols, n, r1, r2, a, srgb = true) => canvasTex(512, 512, (x, w, h) => { x.fillStyle = base; x.fillRect(0, 0, w, h); speckle(x, w, h, n, cols, r1, r2, a); }, srgb, true);

export const T = {
  bun: canvasTex(1024, 512, (x, w, h) => { const g = x.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, '#F3C27A'); g.addColorStop(.3, '#E39540'); g.addColorStop(.65, '#BF621C'); g.addColorStop(1, '#9C4A14');
    x.fillStyle = g; x.fillRect(0, 0, w, h); speckle(x, w, h, 2600, ['#8E4413', '#D88A3C', '#F0B266'], .8, 3.2, .35); }),
  bunBump: noise('#808080', ['#9a9a9a', '#666', '#b0b0b0'], 5000, .6, 2.6, .5, false),
  crumb: canvasTex(512, 512, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#FBEBC8'); g.addColorStop(.86, '#F2D49A'); g.addColorStop(.94, '#D9A25A'); g.addColorStop(1, '#B9742E');
    x.fillStyle = g; x.fillRect(0, 0, w, h); speckle(x, w, h, 900, ['#E9CB8E', '#D9B577', '#FFF6DE'], 1, 4.5, .55); }),
  patty: canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#3A1B0C'; x.fillRect(0, 0, w, h);
    speckle(x, w, h, 3400, ['#22100A', '#5C2E17', '#140703', '#6B3A1E'], 1.5, 7, .6); speckle(x, w, h, 300, ['#8A5634'], 1, 3, .5);
    x.globalAlpha = .7; x.strokeStyle = '#100502'; x.lineWidth = 18; for (let i = -2; i < 8; i++) { x.beginPath(); x.moveTo(i * 80, 0); x.lineTo(i * 80 + 260, h); x.stroke(); } x.globalAlpha = 1; }),
  pattySide: noise('#3C1D0E', ['#22100A', '#5C2E17', '#140703', '#6E3D20'], 4200, 1, 4, .65),
  pattyBump: noise('#808080', ['#4a4a4a', '#bbbbbb', '#303030'], 4200, 1, 6, .7, false),
  tomato: canvasTex(512, 512, (x, w, h) => { const c = w / 2; x.fillStyle = '#A9150C'; x.fillRect(0, 0, w, h);
    const g = x.createRadialGradient(c, c, 10, c, c, c * .96); g.addColorStop(0, '#F26B4A'); g.addColorStop(.75, '#E8402B'); g.addColorStop(.92, '#D02414'); g.addColorStop(1, '#A9150C');
    x.fillStyle = g; x.beginPath(); x.arc(c, c, c * .96, 0, 7); x.fill();
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; x.save(); x.translate(c + Math.cos(a) * c * .45, c + Math.sin(a) * c * .45); x.rotate(a);
      x.fillStyle = 'rgba(255,170,120,.85)'; x.beginPath(); x.ellipse(0, 0, c * .26, c * .16, 0, 0, 7); x.fill();
      x.fillStyle = '#F7E3A0'; for (let s = 0; s < 7; s++) { x.beginPath(); x.ellipse((rand() - .5) * c * .32, (rand() - .5) * c * .18, 5, 3, rand() * 3, 0, 7); x.fill(); } x.restore(); } }),
  lettuce: canvasTex(1024, 1024, (x, w, h) => { const c = w / 2; const g = x.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, '#A9D95E'); g.addColorStop(.5, '#4F9A22'); g.addColorStop(1, '#2C6A10'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(225,255,190,.7)'; for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2; x.lineWidth = 5;
      x.beginPath(); x.moveTo(c, c); x.quadraticCurveTo(c + Math.cos(a + .2) * c * .5, c + Math.sin(a + .2) * c * .5, c + Math.cos(a) * c, c + Math.sin(a) * c); x.stroke(); } }),
  cheese: noise('#F4A11E', ['#F8B83E', '#E58E16', '#FBC85A'], 900, 2, 10, .35),
  batter: noise('#C8822F', ['#E3A44E', '#9C5A1C', '#F2C277', '#7A4214'], 6000, 1, 4.5, .7),
  batterBump: noise('#808080', ['#c0c0c0', '#404040', '#a0a0a0'], 7000, 1, 4, .8, false),
};
export const phys = (o) => new THREE.MeshPhysicalMaterial(o);
export const lathe = (pts, seg = 96) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg);
export function wobble(geo, amp, f = 5) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); if (r < .5) continue;
    const a = Math.atan2(z, x), k = 1 + (Math.sin(a * f) * .5 + Math.sin(a * (f * 2 + 1) + 1.7) * .3 + Math.sin(a * 17 + .4) * .2) * amp; p.setX(i, x * k); p.setZ(i, z * k); }
  geo.computeVertexNormals(); return geo;
}

// ------------------------------------------------------------ ingrédients
export function bottomBun() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(wobble(lathe([[0, 0], [1.9, 0], [2.08, .12], [2.12, .42], [2.04, .62], [0, .64]]), .012), phys({ map: T.bun, roughness: .55, bumpMap: T.bunBump, bumpScale: .6 })));
  const c = new THREE.Mesh(new THREE.CircleGeometry(2.02, 96), phys({ map: T.crumb, color: 0xd8c7a8, roughness: .95, bumpMap: T.bunBump, bumpScale: 1.4 })); c.rotation.x = -Math.PI / 2; c.position.y = .645; g.add(c);
  return g;
}
export function patty() {
  const g = new THREE.Group();
  const side = wobble(lathe([[0, 0], [2.18, 0], [2.32, .1], [2.36, .3], [2.3, .5], [2.16, .58], [0, .6]]), .04);
  T.pattySide.repeat.set(6, 1);
  g.add(new THREE.Mesh(side, phys({ map: T.pattySide, roughness: .62, bumpMap: T.pattyBump, bumpScale: 2.4, clearcoat: .4, clearcoatRoughness: .4 })));
  const top = new THREE.Mesh(wobble(new THREE.CircleGeometry(2.2, 96).rotateX(-Math.PI / 2), .035), phys({ map: T.patty, roughness: .58, bumpMap: T.pattyBump, bumpScale: 3, clearcoat: .5, clearcoatRoughness: .35 }));
  top.position.y = .602; g.add(top);
  const bot = top.clone(); bot.rotation.x = Math.PI; bot.position.y = .001; g.add(bot);
  return g;
}
export function cheese(angle) {
  const cg = new THREE.PlaneGeometry(4.5, 4.5, 64, 64).rotateX(-Math.PI / 2); const p = cg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), o = Math.max(0, r - 2.0);
    p.setY(i, -Math.min(o * o * .7 + o * .15, .7) + Math.sin(x * 2.1) * .02); if (o > 0) { const s = 1 - o * .12; p.setX(i, x * s); p.setZ(i, z * s); } }
  cg.computeVertexNormals();
  const m = new THREE.Mesh(cg, phys({ map: T.cheese, roughness: .28, clearcoat: .7, clearcoatRoughness: .2, sheen: .5, sheenColor: 0xffc65a, side: THREE.DoubleSide }));
  const g = new THREE.Group(); g.add(m); g.rotation.y = angle; return g;
}
export function tomatoes() {
  const g = new THREE.Group(), cap = phys({ map: T.tomato, roughness: .18, clearcoat: .9, clearcoatRoughness: .1 }), skin = phys({ color: 0xC1190E, roughness: .22, clearcoat: 1, clearcoatRoughness: .08 });
  [[-.95, .2], [.95, .45], [.05, -1.0]].forEach(([x, z]) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(.9, .9, .22, 48), [skin, cap, cap]); s.position.set(x, 0, z); s.rotation.y = rand() * 3; g.add(s); });
  return g;
}
export function onionSlices() {
  const g = new THREE.Group(), mat = phys({ color: 0xEBD9E6, roughness: .3, clearcoat: .8, clearcoatRoughness: .1, sheen: .5, sheenColor: 0xffffff });
  [[0, 0, 1.7], [0, 0, 1.25], [.3, .1, .8], [-.6, .4, .55]].forEach(([x, z, r]) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(r, .07, 10, 64), mat); ring.rotation.x = Math.PI / 2; ring.scale.z = .6; ring.position.set(x, 0, z); g.add(ring); });
  return g;
}
export function lettuce() {
  const ring = new THREE.RingGeometry(.01, 2.6, 160, 14).rotateX(-Math.PI / 2), p = ring.attributes.position, uv = ring.attributes.uv;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x), e = Math.max(0, (r - 1.6) / 1.0);
    const ru = Math.sin(a * 11) * .09 + Math.sin(a * 23 + 1.3) * .035 + Math.sin(a * 6 + .5) * .06; p.setY(i, e * ru * 1.4 - e * e * .32);
    const k = 1 + Math.sin(a * 9 + .8) * .05 * e; p.setX(i, x * k); p.setZ(i, z * k); uv.setXY(i, p.getX(i) / 5.4 + .5, p.getZ(i) / 5.4 + .5); }
  ring.computeVertexNormals();
  return new THREE.Mesh(ring, phys({ map: T.lettuce, roughness: .45, clearcoat: .45, clearcoatRoughness: .3, side: THREE.DoubleSide }));
}
export function topBun() {
  const g = new THREE.Group(), prof = [[0, 0], [1.98, 0], [2.1, .06]];
  for (let i = 1; i <= 24; i++) { const a = (i / 24) * Math.PI / 2; prof.push([2.12 * Math.cos(a) + .02, .06 + 1.55 * Math.pow(Math.sin(a), .85)]); }
  const geo = wobble(lathe(prof), .01, 4), uv = geo.attributes.uv, p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) uv.setY(i, Math.min(1, p.getY(i) / 1.61));
  g.add(new THREE.Mesh(geo, phys({ map: T.bun, roughness: .32, bumpMap: T.bunBump, bumpScale: .9, clearcoat: .7, clearcoatRoughness: .25 })));
  const u = new THREE.Mesh(new THREE.CircleGeometry(2.0, 96), phys({ map: T.crumb, roughness: .9 })); u.rotation.x = Math.PI / 2; g.add(u);
  const sg = new THREE.SphereGeometry(.065, 10, 8); sg.scale(1.9, 1, .42);
  const seeds = new THREE.InstancedMesh(sg, phys({ color: 0xF6E2B8, roughness: .45, clearcoat: .3 }), 80), m = new THREE.Object3D();
  for (let k = 0; k < 80; k++) { const r = Math.sqrt(rand()) * 1.65, th = rand() * Math.PI * 2, y = .06 + 1.55 * Math.pow(Math.sqrt(Math.max(0, 1 - (r / 2.14) ** 2)), .85);
    m.position.set(r * Math.cos(th), y + .01, r * Math.sin(th)); m.lookAt(m.position.x * 1.47, m.position.y + (y - .06) / 1.55 * 1.38, m.position.z * 1.47); m.rotateZ(rand() * 3); m.updateMatrix(); seeds.setMatrixAt(k, m.matrix); }
  g.add(seeds); return g;
}
export function onionRing() {
  const geo = new THREE.TorusGeometry(.9, .32, 28, 72), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const n = 1 + (Math.sin(i * 12.9898) * 43758.5453 % 1) * .04; p.setXYZ(i, p.getX(i) * n, p.getY(i) * n, p.getZ(i) * (n * .95)); }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, phys({ map: T.batter, roughness: .6, bumpMap: T.batterBump, bumpScale: 3, clearcoat: .35, clearcoatRoughness: .5 }));
}
// éclaboussure : nappe irrégulière + filaments + gouttes étirées
export function splash(color) {
  const g = new THREE.Group();
  const mat = phys({ color, roughness: .12, clearcoat: 1, clearcoatRoughness: .04, specularIntensity: 1 });
  const pts = [], N = 34;
  for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, spike = rand() > .55; const r = spike ? 1.4 + rand() * 1.1 : .9 + rand() * .25; pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
  const shape = new THREE.Shape(); shape.moveTo(pts[0].x, pts[0].y); shape.splineThru([...pts.slice(1), pts[0]]);
  const sheet = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .08, bevelEnabled: true, bevelThickness: .12, bevelSize: .1, bevelSegments: 6, curveSegments: 64 }), mat);
  g.add(sheet);
  const drops = [];
  const dg = new THREE.SphereGeometry(1, 20, 14);
  for (let i = 0; i < 46; i++) {
    const a = rand() * Math.PI * 2, d = 2.2 + rand() * 3.2, s = .05 + rand() * .2;
    const m = new THREE.Mesh(dg, mat);
    m.userData = { a, d, s, stretch: 1.8 + rand() * 2.5, z: (rand() - .5) * .8, ph: rand() * 6 };
    g.add(m); drops.push(m);
  }
  g.userData.drops = drops; g.userData.sheet = sheet;
  return g;
}

