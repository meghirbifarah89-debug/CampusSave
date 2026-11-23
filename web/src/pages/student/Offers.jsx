// [YATHREB] Offres : recherche + filtres Sucré / Salé / Boisson / Panier surprise (reliés aux vraies catégories)
import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, fmtShort, img, CATEGORIES, GROUPS, SURPRISE_KINDS } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import SurpriseHow, { BOX_IMG } from '../../components/SurpriseHow';

export default function Offers() {
  const { profile } = useAuth();
  const { add } = useCart();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [offers, setOffers] = useState([]);
  const [commerces, setCommerces] = useState([]);
  const [f, setF] = useState({ q: '', group: params.get('group') || '', commerceId: params.get('commerceId') || '', maxPrice: '', sort: '' });
  const [qty, setQty] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [how, setHow] = useState(null);

  useEffect(() => { api.get('/commerces').then(setCommerces).catch(() => {}); }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
      setLoading(true); setError('');
      api.get('/offers?' + qs).then(setOffers).catch((e) => setError(e.message)).finally(() => setLoading(false));
      setParams(Object.fromEntries(Object.entries({ group: f.group, commerceId: f.commerceId }).filter(([, v]) => v)), { replace: true });
    }, 250);
    return () => clearTimeout(t);
  }, [f]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 2200); };
  const addToCart = (o) => {
    if (!profile) return navigate('/connexion');
    if (profile.role !== 'etudiant') return flash('Seuls les étudiants peuvent réserver');
    if (add(o, qty[o.id] || 1)) flash(`Ajouté au panier ✓`);
  };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const reset = () => setF({ q: '', group: '', commerceId: '', maxPrice: '', sort: '' });
  const groupLabel = GROUPS.find(([k]) => k === f.group)?.[1];

  const Qty = ({ o }) => (
    <div className="qty">
      <button onClick={() => setQty({ ...qty, [o.id]: Math.max(1, (qty[o.id] || 1) - 1) })} aria-label="Moins">−</button>
      <span>{qty[o.id] || 1}</span>
      <button onClick={() => setQty({ ...qty, [o.id]: Math.min(o.quantity, (qty[o.id] || 1) + 1) })} aria-label="Plus">+</button>
    </div>
  );

  return (
    <div>
      <div className="sec-head"><div><h2>Offres anti-gaspillage</h2><p>Les invendus du jour près de l’ESSECT. Réserve, paie en ligne, récupère avec ton QR code.</p></div></div>
      <div className="chips-cat">
        {GROUPS.map(([k, l]) => <button key={k} className={f.group === k ? 'on' : ''} onClick={() => setF({ ...f, group: k })}>{l}</button>)}
      </div>
      <div className="card filters">
        <input placeholder="🔎 Rechercher un produit ou un commerce…" value={f.q} onChange={set('q')} aria-label="Rechercher" />
        <input type="number" min="0" placeholder="Prix max (DT)" value={f.maxPrice} onChange={set('maxPrice')} aria-label="Prix maximum" />
        <select value={f.commerceId} onChange={set('commerceId')} aria-label="Commerce">
          <option value="">Tous les commerces</option>
          {commerces.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={f.sort} onChange={set('sort')} aria-label="Tri">
          <option value="">Plus récentes</option>
          <option value="prix">Prix croissant</option>
          <option value="reduction">Meilleure réduction</option>
        </select>
        <button className="btn ghost sm" onClick={reset}>Réinitialiser</button>
      </div>
      {toast && <div className="toast">{toast}</div>}
      {error && <p className="msg e">{error}</p>}
      {loading ? <p className="loading">Chargement des offres…</p> : offers.length === 0 ? (
        <div className="card empty">
          <h3>Aucune offre {groupLabel && f.group ? `« ${groupLabel} »` : ''} pour l’instant</h3>
          <p className="muted">Essaie une autre catégorie ou retire les filtres.</p>
          <button className="btn sm" onClick={reset}>Voir toutes les offres</button>
        </div>
      ) : (
        <div className="grid">
          {offers.map((o) => {
            const surprise = o.category === 'panier-surprise';
            const pct = Math.round((1 - o.discountPrice / o.initialPrice) * 100);
            return (
              <article key={o.id} className="card offer">
                <div className="img" style={{ backgroundImage: `url("${img(o.photoUrl) || (surprise ? BOX_IMG : '')}")` }}>
                  <span className="chip disc">-{pct} %</span>
                  {surprise && <span className="tag">Surprise</span>}
                </div>
                <div className="b">
                  <Link className="shop" to={`/commerces/${o.commerceId}`}>{o.commerceName} ›</Link>
                  <h3>{surprise ? `Panier surprise · ${SURPRISE_KINDS[o.surpriseKind] || ''}` : o.title}</h3>
                  {surprise
                    ? <>
                        <p>{o.description || `Les invendus du jour de ${o.commerceName}.`} Le contenu exact est révélé au retrait.</p>
                        <div className="sb-val"><span>Valeur min. {fmtShort(o.initialPrice)}</span><span>{SURPRISE_KINDS[o.surpriseKind]}</span></div>
                        {o.allergens && <div className="pickup">⚠️ Allergènes possibles : {o.allergens}</div>}
                        <button className="btn-link" style={{ textAlign: 'left', padding: 0 }} onClick={() => setHow(o)}>Comment ça marche ?</button>
                      </>
                    : <>{o.description && <p>{o.description}</p>}<span className="chip" style={{ alignSelf: 'flex-start' }}>{CATEGORIES[o.category]}</span></>}
                  <div className="pickup">🕒 Retrait {o.pickupStart} – {o.pickupEnd} · {o.quantity} restant(s)</div>
                  <div className="price"><b>{fmtShort(o.discountPrice)}</b><s>{fmtShort(o.initialPrice)}</s></div>
                </div>
                <div className="acts"><Qty o={o} /><button className="btn sm" onClick={() => addToCart(o)}>{surprise ? 'Réserver' : 'Ajouter'}</button></div>
              </article>
            );
          })}
        </div>
      )}
      <SurpriseHow open={!!how} offer={how} onClose={() => setHow(null)} onReserve={(o) => { setHow(null); addToCart(o); }} />
    </div>
  );
}
