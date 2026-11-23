// [FARAH] Profil d'un commerce : logo, infos, carte, note moyenne, avis des étudiants, offres disponibles
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, img, fmtDate, fmtShort, COMMERCE_TYPES, SURPRISE_KINDS } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Stars, StarPicker } from './Stars';
import { MiniMap } from './Map';
import { BOX_IMG } from './SurpriseHow';

const TYPE_EMOJI = { restaurant: '🍽️', cafeteria: '🏫', cafe: '☕', boulangerie: '🥖', 'fast-food': '🍔' };
const STATUS = { en_attente: ['En attente de validation', 'wait'], valide: ['Validé par l’admin', 'ok'], refuse: ['Refusé', 'no'] };

export default function CommerceView({ commerce, owner = false, onEdit, onReviewed }) {
  const { profile } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [elig, setElig] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const c = commerce;

  const loadReviews = () => api.get(`/commerces/${c.id}/reviews`).then(setReviews).catch(() => setReviews([]));
  useEffect(() => { loadReviews(); }, [c.id]);
  useEffect(() => {
    if (profile?.role !== 'etudiant') return;
    api.get(`/commerces/${c.id}/reviews/eligibility`).then((e) => {
      setElig(e);
    }).catch(() => {});
  }, [c.id, profile?.role]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setMsg({ e: true, t: 'Choisis une note de 1 à 5 étoiles.' });
    setBusy(true);
    try {
      const r = await api.post(`/commerces/${c.id}/reviews`, { rating, comment });
      setMsg({ e: false, t: `${r.message} Nouvelle moyenne : ${r.ratingAvg}/5` });
      setElig({ ...elig, review: { rating, comment } });
      setRating(0); setComment(''); // la zone de saisie revient vide
      await loadReviews();
      onReviewed?.(r);
    } catch (err) { setMsg({ e: true, t: err.message }); } finally { setBusy(false); }
  };

  // Supprimer un avis : le sien (étudiant) ou n'importe lequel (administrateur)
  const removeReview = async (r) => {
    if (!window.confirm('Supprimer cet avis ?')) return;
    try {
      const path = profile?.role === 'admin' ? `/commerces/${c.id}/reviews/${r.id}` : `/commerces/${c.id}/reviews`;
      const res = await api.del(path);
      setMsg({ e: false, t: `Avis supprimé. Nouvelle moyenne : ${res.ratingCount ? res.ratingAvg + '/5' : 'aucun avis'}` });
      if (r.studentId === profile?.id) setElig({ ...elig, review: null });
      await loadReviews();
      onReviewed?.(res);
    } catch (err) { setMsg({ e: true, t: err.message }); }
  };

  const avg = c.ratingAvg || 0, count = c.ratingCount ?? reviews.length;
  return (
    <div>
      <div className="cover" style={c.coverUrl ? { backgroundImage: `url("${img(c.coverUrl)}")` } : undefined} />
      <div className="profile-head">
        <div className={`avatar-xl ${c.logoUrl ? '' : 'initials'}`}>
          {c.logoUrl ? <img src={img(c.logoUrl)} alt={`Logo ${c.name}`} /> : (TYPE_EMOJI[c.type] || '🏪')}
        </div>
        <div className="who">
          <h1>{c.name}</h1>
          <div className="chips">
            <span className="chip">{COMMERCE_TYPES[c.type] || c.type}</span>
            {owner && STATUS[c.status] && <span className={`chip ${STATUS[c.status][1]}`}>{STATUS[c.status][0]}</span>}
            {c.openingHours && <span className="chip">🕒 {c.openingHours}</span>}
            <span className="chip"><Stars value={avg} /> {count ? `${avg.toFixed(1)} (${count})` : 'Pas encore d’avis'}</span>
          </div>
        </div>
        {owner && <button className="btn ghost sm" onClick={onEdit}>✎ Modifier mes informations</button>}
      </div>

      <div className="grid-profile">
        <div>
          <div className="card">
            <h3>À propos</h3>
            <p style={{ margin: '0 0 16px', lineHeight: 1.65, color: '#4d3a2d' }}>{c.description || 'Aucune description pour le moment.'}</p>
            <div className="info">
              <div><small>Adresse</small>{c.address}</div>
              <div><small>Téléphone</small>{c.phone || '—'}</div>
              <div><small>Horaires</small>{c.openingHours || '—'}</div>
              <div><small>Type</small>{COMMERCE_TYPES[c.type] || c.type}</div>
            </div>
            <MiniMap lat={c.lat} lng={c.lng} label={c.name} emoji={TYPE_EMOJI[c.type] || '🏪'} />
            {c.lat != null && <a className="btn ghost sm" style={{ marginTop: 12 }} href={`https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`} target="_blank" rel="noopener noreferrer">🧭 Itinéraire</a>}
          </div>
          {c.offers && (
            <div className="card">
              <h3>Offres disponibles ({c.offers.length})</h3>
              {!c.offers.length && <p className="muted">Pas d’offre en ce moment.</p>}
              <div className="grid">
                {c.offers.map((o) => (
                  <Link key={o.id} to={`/offres?commerceId=${c.id}`} className="card offer" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div className="img" style={{ backgroundImage: `url("${img(o.photoUrl) || (o.category === 'panier-surprise' ? BOX_IMG : '')}")` }} />
                    <div className="b">
                      <h3>{o.category === 'panier-surprise' ? `Panier surprise · ${SURPRISE_KINDS[o.surpriseKind] || ''}` : o.title}</h3>
                      <div className="price"><b>{fmtShort(o.discountPrice)}</b><s>{fmtShort(o.initialPrice)}</s></div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <h3>Avis des étudiants</h3>
          <div className="rating">
            <div><div className="big">{count ? avg.toFixed(1) : '—'}</div><Stars value={avg} /><br /><small className="muted">{count} avis</small></div>
            <div className="bars">
              {[5, 4, 3, 2, 1].map((k) => { const n = reviews.filter((r) => r.rating === k).length; return <div key={k}>{k}★<span><i style={{ width: `${reviews.length ? (n / reviews.length) * 100 : 0}%` }} /></span>{n}</div>; })}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            {!reviews.length && <p className="muted">Aucun avis pour le moment.</p>}
            {reviews.map((r) => (
              <div key={r.id} className="review">
                <div className="h">
                  <span className="av" style={r.studentPhotoUrl ? { backgroundImage: `url(${img(r.studentPhotoUrl)})` } : undefined}>{r.studentPhotoUrl ? '' : r.studentName?.[0]}</span>
                  <div><b>{r.studentName}</b> <Stars value={r.rating} size=".85rem" /><br /><small className="muted">{fmtDate(r.updatedAt || r.createdAt)}</small></div>
                </div>
                {r.comment && <p>{r.comment}</p>}
                {(r.studentId === profile?.id || profile?.role === 'admin') && (
                  <div className="acts-r"><button className="btn danger sm" onClick={() => removeReview(r)}>🗑 Supprimer{r.studentId === profile?.id ? ' mon avis' : ''}</button></div>
                )}
              </div>
            ))}
          </div>
          {profile?.role === 'etudiant' && elig && (
            elig.eligible ? (
              <form className="rate-form" onSubmit={submit}>
                <b style={{ color: 'var(--coffee)' }}>{elig.review ? 'Modifier mon avis' : 'Laisser un avis'}</b>
                {elig.review && <p className="note" style={{ margin: '4px 0 0' }}>Un nouvel envoi remplace ton avis actuel (un seul avis par commerce).</p>}
                <StarPicker value={rating} onChange={setRating} />
                <textarea rows="2" maxLength={500} placeholder="Ton commentaire…" value={comment} onChange={(e) => setComment(e.target.value)} />
                {msg && <p className={`msg ${msg.e ? 'e' : 's'}`}>{msg.t}</p>}
                <button className="btn sm" style={{ marginTop: 10 }} disabled={busy}>{busy ? 'Envoi…' : 'Publier'}</button>
              </form>
            ) : <p className="note">Tu pourras noter ce commerce après avoir récupéré une commande chez lui.</p>
          )}
          {msg && !(profile?.role === 'etudiant' && elig?.eligible) && <p className={`msg ${msg.e ? 'e' : 's'}`}>{msg.t}</p>}
          {!profile && <p className="note"><Link to="/connexion">Connecte-toi</Link> pour laisser un avis.</p>}
        </div>
      </div>
    </div>
  );
}
