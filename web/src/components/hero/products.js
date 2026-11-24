// [YATHREB] Les 4 plats de la vitrine 3D. Chaque plat = une liste de "pièces" qui s'assemblent
// depuis des positions éparpillées (from) vers leur place (home), puis repartent.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { T, phys, rand, W, canvasTex, speckle, bottomBun, patty, cheese, tomatoes, onionSlices, lettuce, topBun, onionRing, splash } from './ingredients.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const E = (x = 0, y = 0, z = 0) => new THREE.Euler(x, y, z);
const shadow = (o) => { o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
// point de départ éparpillé autour du plat (vient parfois de devant la caméra)
const scatter = (home) => {
  const a = rand() * Math.PI * 2, r = 9 + rand() * 6;
  return { p: V(home.x + Math.cos(a) * r, home.y + (rand() - .3) * 10, home.z + Math.sin(a) * r * .6 + 3), r: E(rand() * 6, rand() * 6, rand() * 6) };
};
const part = (obj, homeP, homeR = E(), s = 1) => ({ obj, home: () => ({ p: homeP, r: homeR, s }), from: scatter(homeP) });

// ============================================================ CHEESECAKE À LA CERISE
const wedge = (R, L, h) => {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(R, 0); s.absarc(0, 0, R, 0, L, false); s.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 3, curveSegments: 48 });
  g.rotateX(-Math.PI / 2); return g;
};
const cream = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#F7EBD3'; x.fillRect(0, 0, w, h); speckle(x, w, h, 900, ['#EADBBE', '#FFF8EA', '#E2CFA9'], 1, 3.5, .5); }, true, true);
const crumb = canvasTex(512, 512, (x, w, h) => { x.fillStyle = '#B87634'; x.fillRect(0, 0, w, h); speckle(x, w, h, 5000, ['#8C521E', '#D9994F', '#6E3D13', '#E7B06A'], 1, 4, .75); }, true, true);

function cherry(r = .42) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(r, 32, 24); geo.scale(1, .92, 1);
  g.add(new THREE.Mesh(geo, phys({ color: 0x6E0410, roughness: .12, clearcoat: 1, clearcoatRoughness: .04, sheen: .3, sheenColor: 0xff5a6a })));
  const stem = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0, r * .8, 0), V(.08, r * 1.6, .02), V(.28, r * 2.5, 0)]), 16, .035, 6), phys({ color: 0x5C7A2A, roughness: .5 }));
  g.add(stem); return shadow(g);
}
function dollop() {
  const g = new THREE.Group(), mat = phys({ color: 0xFFFBF2, roughness: .45, sheen: .6, sheenColor: 0xffffff });
  [[.42, .14, 0], [.32, .12, .2], [.21, .1, .38]].forEach(([R, t, y]) => { const m = new THREE.Mesh(new THREE.TorusGeometry(R, t + .05, 16, 40), mat); m.rotation.x = Math.PI / 2; m.position.y = y; g.add(m); });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.16, .32, 20), mat); tip.position.y = .58; g.add(tip);
  return shadow(g);
}
export function cheesecake() {
  const R = 3.4, L = Math.PI / 3.3, g = new THREE.Group(), parts = [];
  const off = V(-Math.cos(L / 2) * R * .55, 0, Math.sin(L / 2) * R * .55);      // recentrer la part
  const add = (obj, y) => { const holder = new THREE.Group(); obj.position.add(off); holder.add(shadow(obj)); g.add(holder); parts.push(part(holder, V(0, y, 0))); };
  add(new THREE.Mesh(wedge(R, L, .5), phys({ map: crumb, roughness: .85, bumpMap: crumb, bumpScale: 2 })), 0);
  add(new THREE.Mesh(wedge(R, L, 2.0), phys({ map: cream, roughness: .5, bumpMap: cream, bumpScale: .4, sheen: .4, sheenColor: 0xfff4dd })), .56);
  add(new THREE.Mesh(wedge(R + .02, L, .28), phys({ color: 0x8C0A18, roughness: .1, clearcoat: 1, clearcoatRoughness: .05 })), 2.62);
  // coulures de nappage sur la face avant
  const dripMat = phys({ color: 0x8C0A18, roughness: .1, clearcoat: 1 });
  [[.8, .7], [1.6, 1.1], [2.5, .55], [3.0, .9]].forEach(([d, len]) => {
    const c = new THREE.Mesh(new THREE.CapsuleGeometry(.09, len, 6, 12), dripMat);
    c.position.set(d, -len / 2 + .05, .03); add(c, 2.75);
  });
  [[1.3, .35, -.15], [2.3, .3, -.55], [1.9, .35, -1.15]].forEach(([x, y, z]) => { const c = cherry(); c.position.set(x, 0, z); add(c, 3.3); });
  [[1.0, -.05], [2.7, -.9]].forEach(([x, z]) => { const d = dollop(); d.position.set(x, 0, z); add(d, 3.0); });
  // cerises et miettes qui flottent autour (mouvement propre)
  const floaters = Array.from({ length: 6 }, (_, i) => {
    const c = cherry(.38); g.add(c);
    const a = i / 6 * Math.PI * 2, r = 4 + rand() * 1.8, y = .6 + rand() * 4.5;
    parts.push({ obj: c, from: scatter(V(0, 2, 0)), home: (t) => ({ p: V(Math.cos(a + W(t) * .2) * r, y + Math.sin(W(t, 2) + i) * .3, Math.sin(a + W(t) * .2) * r * .6), r: E(W(t) + i, W(t) * .5, .3), s: 1 }) });
    return c;
  });
  const crumbs = new THREE.InstancedMesh(new THREE.BoxGeometry(.12, .1, .12), phys({ map: crumb, roughness: .9 }), 60); g.add(crumbs);
  const cd = Array.from({ length: 60 }, () => ({ x: (rand() - .5) * 9, y: rand() * 6 - .5, z: (rand() - .5) * 5, ph: rand() * 6 }));
  const m4 = new THREE.Object3D();
  g.scale.setScalar(1.55);
  return { name: 'Cheesecake cerise', group: g, parts, sparkColor: 0xff4d6d,
    hold(t, a) { cd.forEach((c, i) => { m4.position.set(c.x, c.y + Math.sin(W(t, 2) + c.ph) * .3, c.z); m4.rotation.set(c.ph + W(t), c.ph, 0); m4.scale.setScalar(Math.max(a, .001)); m4.updateMatrix(); crumbs.setMatrixAt(i, m4.matrix); }); crumbs.instanceMatrix.needsUpdate = true; } };
}

// ============================================================ VERRES (café glacé / limonade)
const NOISE = `
float h3(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x), mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x), mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y), f.z); }
float fbm(vec3 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*n3(p); p*=2.03; a*=.5; } return s; }`;
function liquidMaterial(uniforms, colorCode) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .2, clearcoat: .7, clearcoatRoughness: .12 });
  m.customProgramCacheKey = () => colorCode;
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = uniforms.uTime;
    s.vertexShader = s.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPos;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPos = position;');
    s.fragmentShader = s.fragmentShader.replace('#include <common>', `#include <common>\nvarying vec3 vPos;\nuniform float uTime;\n${NOISE}`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `${colorCode}\nvec4 diffuseColor = vec4(col, opacity);`);
  };
  return m;
}
const COFFEE = `
  float ang = atan(vPos.z, vPos.x), r = length(vPos.xz), tw = ang + vPos.y * 1.6 + uTime;
  float f = fbm(vec3(cos(tw) * r, vPos.y * .9, sin(tw) * r) * 1.4 + vec3(0., -uTime * .35, 0.));
  float milk = smoothstep(.5, .72, f + (vPos.y - 2.0) * .05);
  vec3 col = mix(vec3(.11,.05,.02), vec3(.55,.34,.18), milk);
  col = mix(col, vec3(.93,.82,.66), smoothstep(.78, .95, f) * .7);`;
const LEMONADE = `
  float f = fbm(vPos * 1.2 + vec3(0., -uTime * .3, 0.));
  float k = clamp(vPos.y / 4.6, 0., 1.);
  vec3 col = mix(vec3(.82,.08,.22), vec3(1.,.55,.18), smoothstep(.15, .85, k + (f - .5) * .25));
  col = mix(col, vec3(1.,.85,.5), smoothstep(.75, .95, f) * .25);`;

function labelTexture() {
  return canvasTex(1024, 256, (x) => {
    x.font = '800 120px "Bricolage Grotesque", "Arial Black", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#ffffff'; x.fillText('Campus', 400, 128); x.fillStyle = '#FFD23F'; x.fillText('Save', 760, 128);
  });
}
function glassSet(H, R0, R1, levelK, colorCode, uniforms) {
  const glass = new THREE.Group();
  const prof = [[0, 0], [R0, 0], [R0 + .02, .05], [R1, H], [R1 - .06, H], [R0 - .07, .18], [0, .18]].map(([a, b]) => new THREE.Vector2(a, b));
  const shell = new THREE.Mesh(new THREE.LatheGeometry(prof, 96), phys({ color: 0xffffff, roughness: .04, transparent: true, opacity: .08, clearcoat: 1, clearcoatRoughness: .02, envMapIntensity: 1.2, depthWrite: false }));
  shell.renderOrder = 3; glass.add(shell);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R1 - .03, .025, 8, 96), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .35, roughness: .1 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = H; glass.add(rim);
  const dropGeo = new THREE.SphereGeometry(1, 10, 8), m4 = new THREE.Object3D();
  const cond = new THREE.InstancedMesh(dropGeo, phys({ color: 0xffffff, roughness: 0, transparent: true, opacity: .3, clearcoat: 1, envMapIntensity: 2, depthWrite: false }), 130);
  for (let i = 0; i < 130; i++) { const y = .3 + rand() * (H - .7), a = rand() * Math.PI * 2, r = R0 + (R1 - R0) * (y / H) + .015, s = .025 + rand() * .05;
    m4.position.set(Math.cos(a) * r, y, Math.sin(a) * r); m4.scale.set(s, s * (1.2 + rand()), s * .5); m4.lookAt(0, y, 0); m4.updateMatrix(); cond.setMatrixAt(i, m4.matrix); }
  cond.renderOrder = 4; glass.add(cond);
  const rL = R0 + (R1 - R0) * .32 + .03;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(rL, rL, .6, 64, 1, true, -.9, 1.8), new THREE.MeshBasicMaterial({ map: labelTexture(), transparent: true, depthWrite: false, toneMapped: false }));
  label.position.y = H * .32; label.rotation.y = Math.PI * 1.5; label.renderOrder = 5; glass.add(label);
  const level = H * levelK;
  const liquid = new THREE.Group();
  const lg = new THREE.CylinderGeometry(R0 + (R1 - R0) * levelK - .09, R0 - .09, level - .2, 64, 24); lg.translate(0, (level - .2) / 2 + .2, 0);
  const mat = liquidMaterial(uniforms, colorCode);
  liquid.add(new THREE.Mesh(lg, mat));
  const sg = new THREE.CircleGeometry(R0 + (R1 - R0) * levelK - .09, 64).rotateX(-Math.PI / 2); sg.translate(0, level, 0);
  liquid.add(new THREE.Mesh(sg, mat));
  return { glass, liquid, level };
}
const iceGeo = new RoundedBoxGeometry(.85, .85, .85, 4, .14);
const iceMat = () => phys({ color: 0xcfeaff, roughness: .05, transparent: true, opacity: .32, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 2, depthWrite: false });

// ============================================================ CAFÉ GLACÉ
function bean() {
  const g = new THREE.Group(), geo = new THREE.SphereGeometry(.26, 24, 16); geo.scale(1, .72, .58);
  g.add(new THREE.Mesh(geo, phys({ color: 0x3b1d0c, roughness: .32, clearcoat: .8, clearcoatRoughness: .2 })));
  const groove = new THREE.Mesh(new THREE.TorusGeometry(.2, .022, 8, 32, Math.PI * 1.2), new THREE.MeshStandardMaterial({ color: 0x120603, roughness: .8 }));
  groove.rotation.z = Math.PI * .4; groove.scale.set(1.1, .6, 1); groove.position.z = .15; g.add(groove);
  return shadow(g);
}
export function icedCoffee() {
  const g = new THREE.Group(), parts = [], uniforms = { uTime: { value: 0 } };
  const H = 5.2, { glass, liquid, level } = glassSet(H, 1.12, 1.35, .78, COFFEE, uniforms);
  g.add(glass, liquid);
  parts.push(part(glass, V(0, 0, 0)));
  parts.push({ obj: liquid, from: { p: V(0, 0, 0), r: E() }, home: () => ({ p: V(0, 0, 0), r: E(), s: 1 }), fill: true });
  const im = iceMat();
  [[-.45, .05, .25], [.4, .12, -.3], [.1, -.35, .4]].forEach(([x, y, z], i) => {
    const m = new THREE.Mesh(iceGeo, im); m.renderOrder = 2; g.add(m); const r0 = E(rand() * 3, rand() * 3, rand() * 3);
    parts.push({ obj: m, from: scatter(V(x, level + 3, z)), home: (t) => ({ p: V(x, level + y + Math.sin(W(t, 2) + i * 2) * .06, z), r: E(r0.x, r0.y + W(t) * .25, r0.z), s: 1 }) });
  });
  for (let i = 0; i < 12; i++) {
    const b = bean(); g.add(b); const a0 = i / 12 * Math.PI * 2, r = 2.2 + rand() * 1.6, y = 1 + rand() * 5.5, ph = rand() * 6, k = i % 2 ? 1 : -1;
    parts.push({ obj: b, from: scatter(V(0, 3, 0)), home: (t) => { const a = a0 + W(t) * .25 * k; return { p: V(Math.cos(a) * r, y + Math.sin(W(t, 2) + ph) * .3, Math.sin(a) * r * .6 + .5), r: E(ph + W(t), ph + W(t, 2) * k, ph), s: 1 }; } });
  }
  // filet de lait + glaçon qui tombe + éclaboussures (pendant la pause seulement)
  const sGeo = new THREE.CylinderGeometry(.09, .13, 8, 16, 40, true); sGeo.translate(0, 4, 0); const base = sGeo.attributes.position.array.slice();
  const stream = new THREE.Mesh(sGeo, phys({ color: 0xf6efe3, roughness: .18, clearcoat: .8 })); stream.position.set(-.25, level, .1); g.add(stream);
  const drop = new THREE.Mesh(iceGeo, im); drop.renderOrder = 2; g.add(drop);
  const spl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), phys({ color: 0x8a5a33, roughness: .1, clearcoat: 1 }), 34); g.add(spl);
  const sd = Array.from({ length: 34 }, () => ({ a: rand() * Math.PI * 2, v: 1 + rand() * 2.2, up: 1.5 + rand() * 2.5, s: .03 + rand() * .07, w: rand() > .5 }));
  sd.forEach((d, i) => spl.setColorAt(i, new THREE.Color(d.w ? 0xf3e8d8 : 0x6b3f1f)));
  const m4 = new THREE.Object3D();
  g.scale.setScalar(1.45);
  return { name: 'Café glacé', group: g, parts, sparkColor: 0xffb067,
    hold(t, a, u) {
      uniforms.uTime.value = W(t);
      const p = sGeo.attributes.position;
      for (let i = 0; i < p.count; i++) { const y = base[i * 3 + 1]; p.setX(i, base[i * 3] + Math.sin(y * 1.3 + W(t, 3)) * .05 * (y / 8)); p.setZ(i, base[i * 3 + 2] + Math.cos(y * 1.1 + W(t, 2)) * .04 * (y / 8)); }
      p.needsUpdate = true;
      const on = a > .99; stream.visible = on; stream.scale.y = on ? Math.min(1, (u - 1.4) * 2.5) : 0.001;
      // glaçon qui tombe pendant la pause
      const ph = (u - 1.6) / 2.4, k = Math.min(Math.max(ph / .45, 0), 1);
      drop.visible = on && ph > 0 && ph < .8; drop.position.set(.45, level + 7 * (1 - k * k) - (ph > .45 ? (ph - .45) * 1.6 : 0), .1); drop.rotation.set(ph * 5, ph * 3, 0);
      const imp = ph >= .45 && ph < .75 ? (ph - .45) / .3 : -1;
      sd.forEach((d, i) => { if (imp < 0 || !on) { m4.position.set(0, -50, 0); m4.scale.setScalar(.0001); }
        else { m4.position.set(.45 + Math.cos(d.a) * d.v * imp, level + d.up * imp - 4.5 * imp * imp, .1 + Math.sin(d.a) * d.v * imp * .7); m4.scale.set(d.s, d.s * (1 + imp * 2), d.s); }
        m4.updateMatrix(); spl.setMatrixAt(i, m4.matrix); });
      spl.instanceMatrix.needsUpdate = true;
    } };
}

// ============================================================ LIMONADE À LA FRAISE
const citrus = canvasTex(512, 512, (x, w) => { const c = w / 2;
  x.fillStyle = '#F2C400'; x.beginPath(); x.arc(c, c, c, 0, 7); x.fill(); x.fillStyle = '#FFF7D6'; x.beginPath(); x.arc(c, c, c * .9, 0, 7); x.fill();
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; x.save(); x.translate(c, c); x.rotate(a);
    const gr = x.createLinearGradient(0, 0, c * .8, 0); gr.addColorStop(0, '#FFE66B'); gr.addColorStop(1, '#FFD21A');
    x.fillStyle = gr; x.beginPath(); x.moveTo(c * .08, 0); x.quadraticCurveTo(c * .5, -c * .25, c * .84, -c * .08); x.lineTo(c * .84, c * .08); x.quadraticCurveTo(c * .5, c * .25, c * .08, 0); x.fill(); x.restore(); }
  x.fillStyle = '#FFF7D6'; x.beginPath(); x.arc(c, c, c * .07, 0, 7); x.fill(); });
function lemonWheel(r = .9) {
  const g = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .14, 48), [phys({ color: 0xF2C400, roughness: .35, clearcoat: .6 }), phys({ map: citrus, roughness: .25, clearcoat: .8 }), phys({ map: citrus, roughness: .25, clearcoat: .8 })]);
  return shadow(g);
}
function mintLeaf() {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.45, .35, 0, 1.1); s.quadraticCurveTo(-.45, .35, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 16); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getY(i) * 2.6) * .08 - Math.abs(p.getX(i)) * .25);
  geo.computeVertexNormals();
  return shadow(new THREE.Mesh(geo, phys({ color: 0x2F9A3A, roughness: .35, clearcoat: .5, side: THREE.DoubleSide, sheen: .5, sheenColor: 0xa6ff9a })));
}
function strawberry() {
  const g = new THREE.Group(), pts = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * .55 * (1 - t * .35) + .001, t * 1.3)); }
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 40), phys({ color: 0xD2142B, roughness: .25, clearcoat: .9 })));
  const seeds = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 6, 4), phys({ color: 0xF2D46B, roughness: .4 }), 40), m = new THREE.Object3D();
  for (let i = 0; i < 40; i++) { const t = .12 + rand() * .75, a = rand() * Math.PI * 2, r = Math.sin(t * Math.PI) * .55 * (1 - t * .35) + .01;
    m.position.set(Math.cos(a) * r, t * 1.3, Math.sin(a) * r); m.updateMatrix(); seeds.setMatrixAt(i, m.matrix); }
  g.add(seeds);
  for (let k = 0; k < 5; k++) { const l = mintLeaf(); l.scale.setScalar(.35); l.position.y = 1.28; l.rotation.set(-1.2, k / 5 * Math.PI * 2, 0); g.add(l); }
  g.rotation.x = Math.PI; return shadow(g);
}
export function lemonade() {
  const g = new THREE.Group(), parts = [], uniforms = { uTime: { value: 0 } };
  const H = 6.2, { glass, liquid, level } = glassSet(H, 1.05, 1.32, .82, LEMONADE, uniforms);
  g.add(glass, liquid);
  parts.push(part(glass, V(0, 0, 0)));
  parts.push({ obj: liquid, from: { p: V(0, 0, 0), r: E() }, home: () => ({ p: V(0, 0, 0), r: E(), s: 1 }), fill: true });
  const im = iceMat();
  [[-.4, .05, .2], [.35, .1, -.35]].forEach(([x, y, z], i) => { const m = new THREE.Mesh(iceGeo, im); m.renderOrder = 2; g.add(m); const r0 = E(rand() * 3, rand() * 3, 0);
    parts.push({ obj: m, from: scatter(V(x, level + 3, z)), home: (t) => ({ p: V(x, level + y + Math.sin(W(t, 2) + i) * .06, z), r: E(r0.x, r0.y + W(t) * .2, 0), s: 1 }) }); });
  // rondelle de citron sur le bord + paille
  const rimLemon = lemonWheel(.85); g.add(rimLemon); parts.push(part(rimLemon, V(1.15, H - .2, .3), E(Math.PI / 2, 0, .35)));
  const strawTex = canvasTex(64, 512, (x, w, h) => { for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#FF5FA8' : '#FFFFFF'; x.fillRect(0, i * h / 16, w, h / 16); } });
  strawTex.wrapS = strawTex.wrapT = THREE.RepeatWrapping;
  const straw = shadow(new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, 8.2, 16), phys({ map: strawTex, roughness: .3, clearcoat: .6 }))); g.add(straw);
  parts.push(part(straw, V(-.35, 4.6, -.1), E(0, 0, .22)));
  // ingrédients flottants : citrons, menthe, fraises
  const floats = [];
  for (let i = 0; i < 3; i++) floats.push(lemonWheel(.7));
  for (let i = 0; i < 5; i++) { const l = mintLeaf(); l.scale.setScalar(1.1); floats.push(l); }
  for (let i = 0; i < 3; i++) floats.push(strawberry());
  floats.forEach((o, i) => { g.add(o); const a0 = i / floats.length * Math.PI * 2, r = 2.4 + rand() * 1.7, y = .8 + rand() * 6, ph = rand() * 6, k = i % 2 ? 1 : -1;
    parts.push({ obj: o, from: scatter(V(0, 3, 0)), home: (t) => { const a = a0 + W(t) * .22 * k; return { p: V(Math.cos(a) * r, y + Math.sin(W(t, 2) + ph) * .3, Math.sin(a) * r * .6 + .4), r: E(ph + W(t) * .6, ph + W(t) * k, ph * .5), s: 1 }; } }); });
  // bulles qui montent dans le verre
  const bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), phys({ color: 0xffffff, roughness: 0, transparent: true, opacity: .55, clearcoat: 1, depthWrite: false }), 70); bub.renderOrder = 2; g.add(bub);
  const bd = Array.from({ length: 70 }, () => ({ a: rand() * Math.PI * 2, r: rand() * .85, o: rand(), s: .025 + rand() * .05, k: 1 + Math.floor(rand() * 2) }));
  const m4 = new THREE.Object3D();
  g.scale.setScalar(1.3);
  return { name: 'Limonade fraise', group: g, parts, sparkColor: 0xff7aa8,
    hold(t, a) { uniforms.uTime.value = W(t);
      bd.forEach((b, i) => { const p = (b.o + t / 8 * 2 * b.k) % 1; m4.position.set(Math.cos(b.a) * b.r, .3 + p * (level - .4), Math.sin(b.a) * b.r);
        m4.scale.setScalar(b.s * (.6 + p * .6) * (a > .99 ? 1 : .001)); m4.updateMatrix(); bub.setMatrixAt(i, m4.matrix); });
      bub.instanceMatrix.needsUpdate = true; } };
}

// ============================================================ BURGER ÉCLATÉ
export function burger() {
  const g = new THREE.Group(), parts = [];
  const stack = [[bottomBun(), 0], [patty(), 1], [cheese(.6), 1.9], [patty(), 2.4], [cheese(1.2), 3.3], [onionSlices(), 3.8], [tomatoes(), 4.35], [lettuce(), 4.9], [topBun(), 5.6]];
  stack.forEach(([o, y], i) => { shadow(o); g.add(o); const ph = rand() * 6, tilt = (rand() - .5) * .22, tz = (rand() - .5) * .18;
    parts.push({ obj: o, from: { p: V((rand() - .5) * 3, y * 1.55 + (i % 2 ? 9 : -9), (rand() - .5) * 3 + 2), r: E(rand() * 3, rand() * 3, 0) },
      home: (t) => ({ p: V(0, y * 1.55 + Math.sin(W(t) + ph) * .08, 0), r: E(tilt + Math.sin(W(t) + ph) * .03, Math.sin(W(t) + ph) * .12, tz), s: 1 }) }); });
  const ketchup = splash(0xA80F06); g.add(ketchup); parts.push(part(ketchup, V(-3.4, 3.4, -6.5), E(.1, .35, -.3), 1.35));
  const mustard = splash(0xE3A80B); g.add(mustard); parts.push(part(mustard, V(3.6, 4.6, -7.5), E(-.1, -.4, .5), 1.15));
  const ringsP = [[-4.6, 1.2, 1.5], [4.4, 6.8, .8], [5.2, 1.4, -1.5], [-3.8, 7.6, -2.5]];
  ringsP.forEach((p, i) => { const r = shadow(onionRing()); g.add(r); const r0 = E(rand() * 6, rand() * 6, rand() * 6), k = i % 2 ? 1 : -1;
    parts.push({ obj: r, from: scatter(V(...p)), home: (t) => ({ p: V(p[0] + Math.sin(W(t) + i) * .25, p[1] + Math.cos(W(t) + i * 2) * .3, p[2]), r: E(r0.x + W(t) * k, r0.y + W(t) * .5, r0.z), s: 1 }) }); });
  const splashes = [ketchup, mustard];
  g.scale.setScalar(.9);
  return { name: 'Burger éclaté', group: g, parts, sparkColor: 0xffa040,
    hold(t) { splashes.forEach((s, si) => { s.userData.sheet.scale.setScalar(1 + Math.sin(W(t) + si) * .03);
      s.userData.drops.forEach((d) => { const u = d.userData, k = u.d * (1 + Math.sin(W(t) + u.ph) * .05);
        d.position.set(Math.cos(u.a) * k, Math.sin(u.a) * k, u.z + .1); d.scale.set(u.s * u.stretch, u.s, u.s); d.rotation.set(0, 0, u.a); }); }); } };
}
