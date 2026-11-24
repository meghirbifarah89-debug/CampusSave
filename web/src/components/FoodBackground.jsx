// [YATHREB] Fond animé : petits aliments qui flottent sur les côtés (décoratif, ne gêne pas le contenu)
// Léger (SVG + CSS), parallaxe à la souris et au défilement, désactivé si "réduire les animations".
import { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SVG = {
  bean: '<svg viewBox="0 0 60 80"><ellipse cx="30" cy="40" rx="24" ry="34" fill="#5A3420"/><ellipse cx="26" cy="32" rx="9" ry="14" fill="#7A4A2D" opacity=".6"/><path d="M30 8c-10 14 10 30 0 64" stroke="#2A160B" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
  cup: '<svg viewBox="0 0 90 100"><path d="M14 30h56l-6 58a8 8 0 0 1-8 7H28a8 8 0 0 1-8-7Z" fill="#FFFDF9" stroke="#6B4429" stroke-width="3"/><path d="M18 46h48l-3 30H21Z" fill="#B97A3E"/><rect x="10" y="22" width="64" height="10" rx="5" fill="#3B2416"/><path d="M70 40h6a10 10 0 0 1 0 20h-8" stroke="#6B4429" stroke-width="4" fill="none"/><path d="M34 6c0 6 6 6 6 12M46 4c0 6 6 6 6 12" stroke="#B97A3E" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/></svg>',
  iced: '<svg viewBox="0 0 70 110"><path d="M10 22h50l-6 82H16Z" fill="#fff" fill-opacity=".7" stroke="#6B4429" stroke-width="3"/><path d="M13 50h44l-4 50H17Z" fill="#8A5A33"/><path d="M14 40h42l-1 14H15Z" fill="#E9D6BC"/><rect x="20" y="30" width="14" height="14" rx="3" fill="#DDF0FF" stroke="#9cc8e8" stroke-width="2"/><rect x="36" y="34" width="13" height="13" rx="3" fill="#DDF0FF" stroke="#9cc8e8" stroke-width="2"/><path d="M44 2l-6 50" stroke="#B3122E" stroke-width="5" stroke-linecap="round"/></svg>',
  burger: '<svg viewBox="0 0 110 90"><path d="M10 40C10 18 30 8 55 8s45 10 45 32Z" fill="#D58A3A"/><g fill="#FFF3D6"><ellipse cx="38" cy="22" rx="3" ry="1.6"/><ellipse cx="55" cy="16" rx="3" ry="1.6"/><ellipse cx="70" cy="24" rx="3" ry="1.6"/><ellipse cx="48" cy="30" rx="3" ry="1.6"/></g><path d="M6 44q12 8 24 0t24 0 24 0 26 0v6H6Z" fill="#6BAF3A"/><path d="M8 50h94l-8 10H16Z" fill="#F3B21B"/><rect x="8" y="56" width="94" height="14" rx="7" fill="#5A2E19"/><path d="M10 72h90a6 6 0 0 1-6 10H16a6 6 0 0 1-6-10Z" fill="#D58A3A"/></svg>',
  cake: '<svg viewBox="0 0 110 90"><path d="M8 40 102 22v56H8Z" fill="#F7EBD3" stroke="#6B4429" stroke-width="2"/><path d="M8 70h94v12H8Z" fill="#B87634"/><path d="M8 40 102 22v10L8 50Z" fill="#9C0F23"/><path d="M30 46v14M56 40v10M80 36v18" stroke="#9C0F23" stroke-width="4" stroke-linecap="round"/><circle cx="62" cy="24" r="8" fill="#9C0F23"/><path d="M62 16q4-10 12-12" stroke="#5C7A2A" stroke-width="2.5" fill="none"/></svg>',
  drink: '<svg viewBox="0 0 80 110"><path d="M12 24h52l-6 80H18Z" fill="#fff" fill-opacity=".7" stroke="#6B4429" stroke-width="3"/><path d="M15 44h46l-4 58H19Z" fill="#F07A4E"/><path d="M17 74h42l-2 28H19Z" fill="#D2244B"/><circle cx="62" cy="26" r="14" fill="#F2C400" stroke="#FFF7D6" stroke-width="3"/><path d="M30 2l6 60" stroke="#FF5FA8" stroke-width="5" stroke-linecap="round"/><path d="M22 34q8-10 16-2" stroke="#2F9A3A" stroke-width="5" fill="none" stroke-linecap="round"/></svg>',
  cherry: '<svg viewBox="0 0 60 70"><path d="M20 44Q26 14 46 4M40 46Q40 20 46 4" stroke="#5C7A2A" stroke-width="3" fill="none"/><circle cx="18" cy="50" r="14" fill="#9C0F23"/><circle cx="42" cy="52" r="13" fill="#B3122E"/><circle cx="13" cy="45" r="4" fill="#fff" opacity=".45"/></svg>',
  lemon: '<svg viewBox="0 0 70 70"><circle cx="35" cy="35" r="32" fill="#F2C400"/><circle cx="35" cy="35" r="27" fill="#FFF7D6"/><g fill="#FFD84A">' + Array.from({ length: 8 }, (_, i) => `<path transform="rotate(${i * 45} 35 35)" d="M35 33 L30 12 Q35 8 40 12 Z"/>`).join('') + '</g></svg>',
  mint: '<svg viewBox="0 0 50 70"><path d="M25 66C2 44 6 14 25 4c19 10 23 40 0 62Z" fill="#3FA34D"/><path d="M25 8v56" stroke="#2A7A36" stroke-width="2"/></svg>',
  ring: '<svg viewBox="0 0 70 70"><circle cx="35" cy="35" r="24" fill="none" stroke="#D99A4E" stroke-width="13"/><circle cx="35" cy="35" r="24" fill="none" stroke="#F0C27A" stroke-width="4" stroke-dasharray="3 6"/></svg>',
};
// Aliments adaptés au contenu de chaque page
const SETS = {
  mix: ['bean', 'cup', 'burger', 'cake', 'drink', 'cherry', 'iced', 'lemon', 'bean', 'ring', 'mint', 'bean'],
  coffee: ['bean', 'cup', 'iced', 'bean', 'cake', 'bean', 'cup', 'cherry', 'bean', 'iced'],
  sweet: ['cake', 'cherry', 'cup', 'cake', 'cherry', 'bean', 'lemon', 'cake'],
  burger: ['burger', 'ring', 'bean', 'burger', 'ring', 'drink', 'cup', 'ring'],
  drinks: ['drink', 'lemon', 'mint', 'iced', 'lemon', 'drink', 'mint', 'cherry'],
};
function setFor(path) {
  if (path.startsWith('/commerce') || path.startsWith('/commerces')) return 'coffee';
  if (path.startsWith('/profil') || path.startsWith('/utilisateurs')) return 'sweet';
  if (path.startsWith('/admin') || path.startsWith('/campus-radar')) return 'burger';
  if (path.startsWith('/panier') || path.startsWith('/mes-commandes')) return 'drinks';
  return 'mix';
}

export default function FoodBackground() {
  const { pathname } = useLocation();
  const ref = useRef(null);
  const items = useMemo(() => {
    let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const set = SETS[setFor(pathname)];
    return set.map((k, i) => ({
      k, depth: (0.2 + R() * 0.8).toFixed(2),
      style: {
        left: `${i % 2 ? 90 + R() * 7 : R() * 6}%`, top: `${8 + (i / set.length) * 82 + R() * 6}%`,
        '--s': `${46 + R() * 54}px`, '--o': (0.3 + R() * 0.35).toFixed(2), '--d': `${7 + R() * 6}s`,
        '--dl': `${-R() * 6}s`, '--r0': `${-14 + R() * 10}deg`, '--r1': `${4 + R() * 12}deg`,
      },
    }));
  }, [pathname]);

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let mx = 0, my = 0, raf = 0;
    const move = (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; };
    const tick = () => {
      ref.current?.querySelectorAll('.f').forEach((f) => {
        const d = +f.dataset.depth;
        f.style.setProperty('--px', `${-mx * 40 * d}px`);
        f.style.setProperty('--py', `${-my * 30 * d - scrollY * 0.15 * d}px`);
      });
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', move, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', move); };
  }, []);

  return (
    <div className="food-bg" ref={ref} aria-hidden="true">
      {items.map((it, i) => <div key={pathname + i} className="f" data-depth={it.depth} style={it.style} dangerouslySetInnerHTML={{ __html: SVG[it.k] }} />)}
    </div>
  );
}
