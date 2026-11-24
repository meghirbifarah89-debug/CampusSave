// [YATHREB] Vitrine 3D : les plats s'assemblent l'un après l'autre à partir d'ingrédients qui flottent.
// Ordre : boissons -> café glacé -> burger -> cheesecake (boucle parfaite de 24 s, 6 s par plat).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { canvasTex } from './ingredients.js';
import { cheesecake, icedCoffee, lemonade, burger } from './products.js';

export const SHOT = 6;                                  // durée d'un plat (s)
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const backOut = (x) => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const easeIn = (x) => x * x * x;
let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

export function createReel(canvas, { record = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: record, powerPreference: 'high-performance' });
  renderer.setPixelRatio(record ? 1 : Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0xEFE3CF);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = .9;
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, .1, 200);

  const key = new THREE.SpotLight(0xffe2bd, 620, 70, .5, .6, 1.8); key.position.set(-7, 14, 9); key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  const rimO = new THREE.SpotLight(0xff7a2a, 700, 50, .6, .5, 1.6); rimO.position.set(9, 5, -8);
  const rimC = new THREE.SpotLight(0x8fb4ff, 380, 50, .6, .5, 1.6); rimC.position.set(-10, 3, -7);
  const fill = new THREE.PointLight(0xffb070, 12, 30, 1.6); fill.position.set(4, 1, 9);
  key.intensity = 520; rimO.color.set(0xffc58a); rimO.intensity = 380; rimC.color.set(0xfff1dc); rimC.intensity = 260; fill.intensity = 18;
  scene.add(key, rimO, rimC, fill, new THREE.HemisphereLight(0xfff6e8, 0xd9c2a0, 1.4));
  // studio beige : fond arrondi (cyclo) + sol qui reçoit les ombres
  const cycTex = canvasTex(1024, 1024, (x, w, h) => { const g = x.createRadialGradient(w * .66, h * .45, 30, w * .6, h * .5, w * .75);
    g.addColorStop(0, '#F8EBD5'); g.addColorStop(.55, '#EFDCBD'); g.addColorStop(1, '#E0C49B'); x.fillStyle = g; x.fillRect(0, 0, w, h); }, false); cycTex.colorSpace = THREE.SRGBColorSpace;
  const cyc = new THREE.Mesh(new THREE.PlaneGeometry(90, 56), new THREE.MeshBasicMaterial({ map: cycTex, toneMapped: false }));
  cyc.position.set(4, 4, -22); cyc.scale.set(1.5, 1.3, 1); scene.add(cyc);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.ShadowMaterial({ color: 0x6b4429, opacity: .26 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;

  const root = new THREE.Group(); scene.add(root); floor.position.y = -1.2; root.add(floor);
  const LIFT = [.1, .3, -.2, 0];
  const products = [lemonade(), icedCoffee(), burger(), cheesecake()].map((p, i) => {
    p.group.position.y = LIFT[i]; p.group.visible = false; root.add(p.group); return p; });
  const LOOP = products.length * SHOT;
  key.target = root;

  // étincelles (couleur du plat en cours), poussière, faisceau
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xc9853f, transparent: true, opacity: .75, depthWrite: false, side: THREE.DoubleSide });
  const sparks = new THREE.InstancedMesh(new THREE.PlaneGeometry(.07, .32), sparkMat, 110); root.add(sparks);
  const sd = Array.from({ length: 110 }, () => ({ x: (rnd() - .5) * 3, z: (rnd() - .5) * 3, a: rnd() * Math.PI * 2, v: 2 + rnd() * 5, life: rnd(), k: 1 + Math.floor(rnd() * 2), up: 2 + rnd() * 4 }));
  const dustTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }, false);
  const dust = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: .08, map: dustTex, transparent: true, opacity: .5, color: 0xc49a6c, depthWrite: false }));
  const dp = new Float32Array(400 * 3), dd = Array.from({ length: 400 }, () => [(rnd() - .5) * 22, rnd() * 14 - 2, (rnd() - .5) * 14, rnd() * 6]);
  dust.geometry.setAttribute('position', new THREE.BufferAttribute(dp, 3)); root.add(dust);
  const beamTex = canvasTex(64, 512, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,220,170,0)'); g.addColorStop(.2, 'rgba(255,220,170,.35)'); g.addColorStop(1, 'rgba(255,220,170,0)');
    x.fillStyle = g; x.fillRect(0, 0, w, h); const s = x.createLinearGradient(0, 0, w, 0); s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(.5, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = s; x.fillRect(0, 0, w, h); });
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(7, 26), new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.set(-3.2, 9, 1); beam.rotation.set(0, .3, .42); beam.visible = false; root.add(beam);

  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1280, 720, { samples: record ? 0 : 4, type: THREE.HalfFloatType }));
  composer.addPass(new RenderPass(scene, camera));
  const bokeh = new BokehPass(scene, camera, { focus: 21, aperture: .0012, maxblur: .004 }); composer.addPass(bokeh);
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1280, 720), .12, .3, .985));
  composer.addPass(new OutputPass());

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const state = { index: 0, name: products[0].name, progress: 0 };
  function resize(w, h) {
    renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    const wide = w / h > 1.15;
    root.position.set(wide ? 5.2 : 0, -6.0, 0); root.scale.setScalar(wide ? 1.0 : .62);
  }
  const m4 = new THREE.Object3D(), sparkCol = new THREE.Color(), tmp = new THREE.Color();

  function render(t) {
    const tl = ((t % LOOP) + LOOP) % LOOP;
    const ca = Math.sin(t / LOOP * Math.PI * 2 * 3) * .08 + mouse.x * .3;
    camera.position.set(Math.sin(ca) * 27, 3 - mouse.y * 1.5, Math.cos(ca) * 27);
    camera.lookAt(root.position.x * .45, root.position.y + 4.4, 0);
    bokeh.uniforms.focus.value = camera.position.distanceTo(new THREE.Vector3(root.position.x, root.position.y + 3, 0));

    products.forEach((P, i) => {
      let u = tl - i * SHOT; if (u < -LOOP / 2) u += LOOP; if (u > LOOP / 2) u -= LOOP;
      const visible = u > -.5 && u < SHOT - .1;
      P.group.visible = visible;
      if (!visible) return;
      if (u >= 0 && u < SHOT) { state.index = i; state.name = P.name; state.progress = u / SHOT; }
      const assembling = u < 1.6, leaving = u > 4.6;
      const A = clamp((u + .5) / 2.1), B = clamp((u - 4.6) / 1.3);
      const n = P.parts.length;
      P.parts.forEach((pt, j) => {
        const h = pt.home(t);
        let k;
        if (assembling) k = backOut(clamp(A * 1.5 - (j / n) * .5));
        else if (leaving) k = 1 - easeIn(clamp(B * 1.4 - (j / n) * .4));
        else k = 1;
        const o = pt.obj;
        if (pt.fill) { o.position.copy(h.p); o.rotation.copy(h.r); o.scale.set(1, Math.max(.001, clamp(k)), 1); return; }
        o.position.lerpVectors(pt.from.p, h.p, k);
        o.rotation.set(pt.from.r.x + (h.r.x - pt.from.r.x) * k, pt.from.r.y + (h.r.y - pt.from.r.y) * k, pt.from.r.z + (h.r.z - pt.from.r.z) * k);
        o.scale.setScalar(h.s * (.25 + .75 * clamp(k)));
      });
      P.group.rotation.y = -.35 + u * .22 + mouse.x * .5;
      P.group.rotation.x = mouse.y * .1;
      P.hold(t, assembling ? clamp(A) : leaving ? 1 - B : 1, u);
    });
    // étincelles : couleur du plat en cours, plus intenses pendant les transitions
    const cur = products[state.index];
    sparkCol.lerp(tmp.setHex(cur.sparkColor), .08); sparkMat.color.copy(sparkCol).multiplyScalar(.85);
    const burst = 1 + Math.max(0, 1 - Math.abs(((tl % SHOT) - SHOT) + .2) / .8) * 1.2 + Math.max(0, 1 - (tl % SHOT) / .8) * 1.2;
    sd.forEach((s, i) => { const p = (s.life + t * s.k / 4) % 1, d = p * s.v * burst, y = 2.5 + p * s.up * 2 - p * p * 2.5;
      m4.position.set(Math.cos(s.a) * d + s.x, y, Math.sin(s.a) * d + s.z); m4.lookAt(camera.position); m4.rotateZ(Math.atan2(s.up * 2 - p * 5, s.v) - Math.PI / 2);
      m4.scale.setScalar(1 - p); m4.updateMatrix(); sparks.setMatrixAt(i, m4.matrix); });
    sparks.instanceMatrix.needsUpdate = true;
    dd.forEach((d, i) => { dp[i * 3] = d[0] + Math.sin(t * .78 + d[3]) * .4; dp[i * 3 + 1] = d[1] + Math.sin(t * 1.57 + d[3]) * .3; dp[i * 3 + 2] = d[2]; });
    dust.geometry.attributes.position.needsUpdate = true;
    composer.render();
  }
  function dispose() { composer.dispose?.(); renderer.dispose(); renderer.forceContextLoss(); }
  sparkCol.setHex(products[0].sparkColor);
  return { render, resize, mouse, state, dispose, LOOP, names: products.map((p) => p.name) };
}
