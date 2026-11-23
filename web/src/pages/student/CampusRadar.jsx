// [YATHREB] Campus Radar – Découvrez les restaurants autour de vous
// - Position : géolocalisation du navigateur (demandée seulement au clic, jamais enregistrée),
//   ou adresse / faculté saisie à la main (recherche OpenStreetMap Nominatim) ; ESSECT par défaut.
// - Partenaires CampusSave : vraies données de la base (position, note moyenne, offres disponibles).
// - Établissements externes : données OpenStreetMap (Overpass), affichés seulement s'ils ont un nom et une position ;
//   aucune note ni offre inventée pour eux.
// - Distances calculées à partir des vraies coordonnées (Haversine).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, img } from '../../services/api';
import { L, ESSECT, pinIcon, meIcon, tiles, distance, fmtDistance } from '../../components/Map';
import { Stars } from '../../components/Stars';

const TYPES = { restaurant: ['🍽️', 'Restaurant'], cafeteria: ['🏫', 'Cafétéria'], cafe: ['☕', 'Café'], fastfood: ['🍔', 'Fast-food'], boulangerie: ['🥖', 'Boulangerie'] };
const FROM_COMMERCE = { restaurant: 'restaurant', cafeteria: 'cafeteria', cafe: 'cafe', 'fast-food': 'fastfood', boulangerie: 'boulangerie' };
const FROM_OSM = { restaurant: 'restaurant', cafe: 'cafe', fast_food: 'fastfood', food_court: 'cafeteria', canteen: 'cafeteria' };
const RADIUS = 1500; // mètres
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const itinerary = (o, p) => `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lng}&destination=${p.lat},${p.lng}`;

export default function CampusRadar() {
  const navigate = useNavigate();
  const [origin, setOrigin] = useState({ ...ESSECT, label: 'ESSECT, Montfleury (point par défaut)' });
  const [partners, setPartners] = useState([]);
  const [externals, setExternals] = useState([]);
  const [extState, setExtState] = useState('loading');
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const [type, setType] = useState('');
  const [onlyPartners, setOnlyPartners] = useState(false);
  const [sort, setSort] = useState('d');
  const [sel, setSel] = useState(null);
  const [msg, setMsg] = useState(null);
  const [locating, setLocating] = useState(false);
  const mapEl = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const meMarker = useRef(null);
  const markers = useRef({});
  const located = useRef(false);

  // Partenaires (base CampusSave)
  useEffect(() => {
    api.get('/commerces').then((list) => setPartners(list.filter((c) => c.lat != null && c.lng != null).map((c) => ({
      key: 'p' + c.id, id: c.id, partner: true, name: c.name, lat: c.lat, lng: c.lng, address: c.address,
      type: FROM_COMMERCE[c.type] || 'restaurant', logoUrl: c.logoUrl, rating: c.ratingAvg, ratingCount: c.ratingCount, offers: c.offersCount,
    })))).catch((e) => setMsg({ e: true, t: 'Partenaires indisponibles : ' + e.message }));
  }, []);

  // Établissements externes autour du point choisi (OpenStreetMap)
  useEffect(() => {
    const ctrl = new AbortController();
    setExtState('loading');
    const query = `[out:json][timeout:20];(nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|canteen)$"](around:${RADIUS},${origin.lat},${origin.lng}););out center 80;`;
    fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(query), signal: ctrl.signal })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((j) => {
        setExternals(j.elements.filter((x) => x.tags?.name && (x.lat ?? x.center?.lat) != null).map((x) => ({
          key: 'e' + x.id, partner: false, name: x.tags.name, lat: x.lat ?? x.center.lat, lng: x.lon ?? x.center.lon,
          type: FROM_OSM[x.tags.amenity] || 'restaurant',
          address: [x.tags['addr:housenumber'], x.tags['addr:street'], x.tags['addr:city']].filter(Boolean).join(' '),
        })));
        setExtState('ok');
      })
      .catch((e) => { if (e.name !== 'AbortError') { setExternals([]); setExtState('error'); } });
    return () => ctrl.abort();
  }, [origin.lat, origin.lng]);

  // Liste filtrée + distances (partenaires prioritaires)
  const places = useMemo(() => {
    const names = new Set(partners.map((p) => norm(p.name)));
    const ext = onlyPartners ? [] : externals.filter((e) => !names.has(norm(e.name))); // pas de doublon avec un partenaire
    const nq = norm(q);
    return [...partners, ...ext]
      .filter((p) => (!type || p.type === type) && (!nq || norm(p.name + ' ' + p.address).includes(nq)))
      .map((p) => ({ ...p, d: distance(origin, p) }))
      .sort((a, b) => sort === 'r'
        ? ((b.rating || 0) - (a.rating || 0)) || a.d - b.d
        : ((b.partner && b.d <= RADIUS) - (a.partner && a.d <= RADIUS)) || a.d - b.d);
  }, [partners, externals, q, type, onlyPartners, sort, origin]);

  // Carte
  useEffect(() => {
    const m = L.map(mapEl.current).setView([origin.lat, origin.lng], 15);
    tiles(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    setTimeout(() => m.invalidateSize(), 100);
    return () => { m.remove(); map.current = null; meMarker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!map.current) return;
    map.current.setView([origin.lat, origin.lng], located.current ? 16 : 15);
    if (!meMarker.current) meMarker.current = L.marker([origin.lat, origin.lng], { icon: meIcon(), zIndexOffset: 1000 }).addTo(map.current);
    meMarker.current.setLatLng([origin.lat, origin.lng]).bindPopup(`<b>Point de départ</b><br><small>${origin.label}</small>`);
  }, [origin]);
  useEffect(() => {
    if (!layer.current) return;
    layer.current.clearLayers(); markers.current = {};
    places.forEach((p) => {
      const div = document.createElement('div');
      div.innerHTML = `<b style="font-family:'Bricolage Grotesque';color:#3B2416;font-size:1.05rem">${p.name}</b><br><small>${TYPES[p.type]?.[1] || ''} · ${fmtDistance(p.d)}</small><br><small>${p.address || 'Adresse non renseignée'}</small><br>` +
        (p.partner ? `<small>★ ${p.ratingCount ? p.rating.toFixed(1) + ` (${p.ratingCount} avis)` : 'pas encore d’avis'} · ${p.offers || 0} offre(s)</small><br>` : '<small style="color:#7a6250">Non partenaire · OpenStreetMap</small><br>');
      const acts = document.createElement('div'); acts.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin-top:8px';
      if (p.partner) {
        const b1 = document.createElement('button'); b1.className = 'btn sm'; b1.textContent = 'Voir le profil'; b1.onclick = () => navigate(`/commerces/${p.id}`);
        const b2 = document.createElement('button'); b2.className = 'btn ghost sm'; b2.textContent = 'Offres'; b2.onclick = () => navigate(`/offres?commerceId=${p.id}`);
        acts.append(b1, b2);
      }
      const a = document.createElement('a'); a.href = itinerary(origin, p); a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = '🧭 Itinéraire'; a.style.cssText = 'font-weight:700;align-self:center';
      acts.append(a); div.append(acts);
      const mk = L.marker([p.lat, p.lng], { icon: pinIcon(TYPES[p.type]?.[0] || '🍽️', p.partner) }).bindPopup(div);
      mk.on('click', () => setSel(p.key));
      layer.current.addLayer(mk); markers.current[p.key] = mk;
    });
  }, [places, navigate, origin]);

  const focus = (p) => { setSel(p.key); map.current?.flyTo([p.lat, p.lng], 17, { duration: 0.6 }); setTimeout(() => markers.current[p.key]?.openPopup(), 650); };

  // Géolocalisation : demandée seulement quand l'étudiant clique, position non enregistrée
  const locate = () => {
    if (!navigator.geolocation) return setMsg({ e: true, t: 'La géolocalisation n’est pas disponible sur ce navigateur. Saisis une adresse ou une faculté.' });
    setLocating(true); setMsg({ e: false, t: 'Demande d’autorisation de localisation…' });
    navigator.geolocation.getCurrentPosition(
      (pos) => { located.current = true; setLocating(false); setMsg(null); setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: 'ta position actuelle (non enregistrée)' }); },
      (err) => { setLocating(false); setMsg({ e: true, t: `${err.code === 1 ? 'Localisation refusée.' : 'Position introuvable.'} Pas de souci : saisis ton adresse, ta faculté ou ton quartier, ou reste sur l’ESSECT.` }); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };
  const searchPlace = async (e) => {
    e?.preventDefault();
    if (!loc.trim()) return;
    setMsg({ e: false, t: `Recherche de « ${loc} »…` });
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tn&q=${encodeURIComponent(loc)}`, { headers: { 'Accept-Language': 'fr' } });
      const j = await r.json();
      if (!j.length) return setMsg({ e: true, t: `Adresse « ${loc} » introuvable. Essaie le nom de la faculté ou du quartier.` });
      setMsg(null);
      setOrigin({ lat: +j[0].lat, lng: +j[0].lon, label: j[0].display_name.split(',').slice(0, 2).join(',') });
    } catch { setMsg({ e: true, t: 'Recherche d’adresse indisponible (connexion).' }); }
  };

  return (
    <div>
      <div className="sec-head"><div><h2>Campus Radar</h2><p>Découvrez les restaurants autour de vous.</p></div></div>
      <div className="card radar-bar">
        <input className="q" placeholder="🔎 Rechercher un restaurant ou une cafétéria…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un établissement" />
        <form className="loc" onSubmit={searchPlace}>
          <input placeholder="Adresse, faculté, quartier…" value={loc} onChange={(e) => setLoc(e.target.value)} aria-label="Lieu" />
          <button className="btn ghost sm">Chercher ici</button>
          <button type="button" className="btn sm" onClick={locate} disabled={locating}>{locating ? 'Localisation…' : '📍 Me localiser'}</button>
        </form>
        <div className="seg">{[['', 'Tout'], ['restaurant', 'Restaurants'], ['cafeteria', 'Cafétérias'], ['cafe', 'Cafés'], ['fastfood', 'Fast-food']].map(([k, l]) => <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>)}</div>
        <label className="tog"><input type="checkbox" checked={onlyPartners} onChange={(e) => setOnlyPartners(e.target.checked)} /> Partenaires CampusSave uniquement</label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Tri"><option value="d">Trier par distance</option><option value="r">Trier par note</option></select>
      </div>
      <div className={`radar-msg ${msg?.e ? 'e' : ''}`}>
        {msg ? msg.t : <>📍 Autour de : <b>{origin.label}</b> · {partners.length} partenaire(s) · {extState === 'loading' ? 'recherche des établissements…' : extState === 'error' ? 'établissements externes indisponibles (OpenStreetMap)' : `${externals.length} établissement(s) dans ${RADIUS / 1000} km`}</>}
      </div>
      <div className="radar">
        <div className="rlist">
          {!places.length && <div className="card empty"><h3 style={{ fontSize: '1.15rem' }}>Aucun établissement trouvé</h3><p className="muted">Élargis la recherche ou retire un filtre.</p></div>}
          {places.map((p) => (
            <div key={p.key} className={`card est ${sel === p.key ? 'sel' : ''}`} onClick={() => focus(p)}>
              <span className="mini" style={p.partner ? { background: 'var(--coffee)' } : undefined}>{p.logoUrl ? <img src={img(p.logoUrl)} alt="" /> : TYPES[p.type]?.[0]}</span>
              <div>
                <h4>{p.name}</h4>
                <div className="meta"><span className={`chip ${p.partner ? 'badge-p' : ''}`}>{p.partner ? 'Partenaire CampusSave' : 'Externe'}</span><span>{TYPES[p.type]?.[1]}</span><b style={{ color: 'var(--coffee)' }}>{fmtDistance(p.d)}</b></div>
                <div className="meta">{p.address || 'Adresse non renseignée'}</div>
                {p.partner && <div className="meta"><Stars value={p.rating} size=".8rem" />{p.ratingCount ? p.rating.toFixed(1) : '—'} · {p.offers || 0} offre(s) dispo</div>}
              </div>
              <div className="acts3" onClick={(e) => e.stopPropagation()}>
                {p.partner && <><button className="btn sm" onClick={() => navigate(`/commerces/${p.id}`)}>Profil</button><button className="btn ghost sm" onClick={() => navigate(`/offres?commerceId=${p.id}`)}>Offres</button></>}
                <a className="btn ghost sm" href={itinerary(origin, p)} target="_blank" rel="noopener noreferrer">🧭 Itinéraire</a>
              </div>
            </div>
          ))}
        </div>
        <div className="rmap-wrap">
          <div ref={mapEl} className="rmap" />
          <div className="legend"><span><i className="mk p" />Partenaire</span><span><i className="mk e" />Externe (OpenStreetMap)</span><span><i className="mk u" />Toi</span></div>
        </div>
      </div>
      <p className="note">Partenaires sans position : le commerçant peut la placer dans « Mon commerce » → Modifier.</p>
    </div>
  );
}
