// [YATHREB] Fond animé de l'accueil, sur toute la largeur.
// 1) Animation 3D en temps réel (nette à la taille de l'écran) si WebGL est disponible ;
// 2) sinon, les 4 vidéos de public/videos/ l'une après l'autre (événement "ended", jamais interrompues),
//    dans l'ordre Boissons -> Coffee -> Burger -> Cheesecake, avec un fondu et le nom de la catégorie.
// Pour utiliser vos vidéos originales : remplacez les fichiers de public/videos/ (mêmes noms).
import { useEffect, useRef, useState } from 'react';

export const SEQUENCE = [
  { label: 'Boissons', src: '/videos/boissons.mp4' },
  { label: 'Coffee', src: '/videos/coffee.mp4' },
  { label: 'Burger', src: '/videos/burger.mp4' },
  { label: 'Cheesecake', src: '/videos/cheesecake.mp4' },
];
// Mettre à false pour n'utiliser que les vidéos (par ex. avec vos vidéos originales)
const USE_LIVE_3D = true;
// Vitesse de l'animation (1 = normale, 6 s par plat ; 1.6 ≈ 3,7 s par plat)
const SPEED = 1.6;

function canUse3D() {
  if (!USE_LIVE_3D || matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
}

export default function HeroShowcase() {
  const [mode] = useState(() => (canUse3D() ? '3d' : 'video'));
  const [cur, setCur] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const vids = [useRef(null), useRef(null)];
  const active = useRef(0); // quel lecteur (0/1) est visible
  const labelRef = useRef(null);

  // relance l'animation du nom à chaque changement
  useEffect(() => { const el = labelRef.current; if (!el) return; el.classList.remove('anim'); void el.offsetWidth; el.classList.add('anim'); }, [cur]);

  // ---------- Mode 3D en direct
  useEffect(() => {
    if (mode !== '3d') return;
    let raf = 0, alive = true, S = null, running = true;
    const canvas = canvasRef.current;
    import('./reel.js').then(({ createReel }) => {
      if (!alive) return;
      S = createReel(canvas);
      S.mouse.tx = S.mouse.ty = 0;
      let w = 0, h = 0;
      const size = () => { const r = canvas.getBoundingClientRect(); if (r.width !== w || r.height !== h) { w = r.width; h = r.height; S.resize(Math.max(1, w), Math.max(1, h)); } };
      const move = (e) => { S.mouse.tx = e.clientX / innerWidth - 0.5; S.mouse.ty = e.clientY / innerHeight - 0.5; };
      window.addEventListener('pointermove', move, { passive: true });
      const io = new IntersectionObserver(([e]) => { running = e.isIntersecting; });
      io.observe(canvas);
      let t = 0, last = performance.now(), shown = -1;
      const loop = (now) => {
        raf = requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now;
        if (!running || document.hidden) return;
        t += dt * SPEED; size();
        S.mouse.x += (S.mouse.tx - S.mouse.x) * 0.04; S.mouse.y += (S.mouse.ty - S.mouse.y) * 0.04;
        S.render(t);
        if (S.state.index !== shown) { shown = S.state.index; setCur(shown); }
        setProgress(S.state.progress);
      };
      raf = requestAnimationFrame(loop);
      S.cleanup = () => { window.removeEventListener('pointermove', move); io.disconnect(); };
    }).catch(() => setError('Animation indisponible'));
    return () => { alive = false; cancelAnimationFrame(raf); if (S) { S.cleanup?.(); S.dispose(); } };
  }, [mode]);

  // ---------- Mode vidéos : une seule à la fois, la suivante démarre à la fin de la précédente
  useEffect(() => {
    if (mode !== 'video') return;
    const [a, b] = vids.map((r) => r.current);
    let index = 0, alive = true;
    const prep = (v, i) => { v.dataset.i = i; v.src = SEQUENCE[i].src; v.load(); };
    const play = (v) => { v.playbackRate = SPEED; v.play().catch(() => { v.muted = true; v.play().catch(() => {}); }); }; // autoplay refusé -> muet
    const next = () => {
      if (!alive) return;
      const i = (index + 1) % SEQUENCE.length;
      const show = active.current === 0 ? b : a, hide = active.current === 0 ? a : b;
      if (+show.dataset.i !== i) prep(show, i);
      show.currentTime = 0; play(show);
      show.classList.add('on'); hide.classList.remove('on'); hide.pause();
      active.current = 1 - active.current; index = i; setCur(i); setError('');
      setTimeout(() => alive && prep(hide, (i + 1) % SEQUENCE.length), 1000); // précharge la suivante
    };
    const onEnded = (e) => { if (e.target === (active.current === 0 ? a : b)) next(); };
    const onTime = (e) => { const v = e.target; if (v === (active.current === 0 ? a : b) && v.duration) setProgress(v.currentTime / v.duration); };
    const onError = (e) => {
      if (e.target !== (active.current === 0 ? a : b)) return;
      setError(`Vidéo « ${SEQUENCE[index].label} » introuvable (${SEQUENCE[index].src})`);
      setTimeout(next, 2500);
    };
    [a, b].forEach((v) => { v.addEventListener('ended', onEnded); v.addEventListener('timeupdate', onTime); v.addEventListener('error', onError); });
    prep(a, 0); a.classList.add('on'); play(a); setTimeout(() => alive && prep(b, 1), 500);
    return () => { alive = false; [a, b].forEach((v) => { v.removeEventListener('ended', onEnded); v.removeEventListener('timeupdate', onTime); v.removeEventListener('error', onError); v.pause(); }); };
  }, [mode]);

  const toggleSound = () => {
    const m = !muted; setMuted(m);
    vids.forEach((r) => { if (r.current) r.current.muted = m; });
  };

  return (
    <>
      <div className="showcase" aria-hidden="true">
        {mode === '3d'
          ? <canvas ref={canvasRef} />
          : <>
              <video ref={vids[0]} muted playsInline preload="auto" poster="/videos/poster.jpg" />
              <video ref={vids[1]} muted playsInline preload="auto" />
            </>}
        {error && <div className="sc-err">{error}</div>}
      </div>
      <div className="sc-ui">
        <div className="sc-dots">{SEQUENCE.map((s, i) => <i key={s.label}><b style={{ width: i < cur ? '100%' : i === cur ? `${progress * 100}%` : 0 }} /></i>)}</div>
        <span className="sc-label anim" ref={labelRef}>{SEQUENCE[cur]?.label}</span>
        {mode === 'video' && <button className="sc-sound" onClick={toggleSound} aria-label={muted ? 'Activer le son' : 'Couper le son'}>{muted ? '🔇' : '🔊'}</button>}
      </div>
    </>
  );
}
