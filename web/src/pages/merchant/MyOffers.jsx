// [YATHREB] « Mes offres » : la liste des offres s'affiche d'abord ;
// le formulaire ne s'ouvre qu'avec le bouton « + Ajouter une offre » (ou « Modifier »).
import { useEffect, useState } from 'react';
import { api, fmtShort, img, CATEGORIES, SURPRISE_KINDS } from '../../services/api';
import Modal from '../../components/Modal';
import ImageInput from '../../components/ImageInput';
import { BOX_IMG } from '../../components/SurpriseHow';

const EMPTY = { title: '', description: '', category: 'plat', initialPrice: '', discountPrice: '', quantity: '', pickupStart: '17:00', pickupEnd: '19:00', status: 'active', surpriseKind: 'sucre', allergens: '', revealContent: '' };

export default function MyOffers() {
  const [offers, setOffers] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [photo, setPhoto] = useState(null);
  const [editing, setEditing] = useState(null); // null = fermé, 'new' ou l'offre modifiée
  const [errors, setErrors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [loadErr, setLoadErr] = useState('');

  const load = () => api.get('/offers/mine').then(setOffers).catch((e) => { setLoadErr(e.message); setOffers([]); });
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const surprise = form.category === 'panier-surprise';
  const flash = (t) => { setToast(t); setTimeout(() => setToast(''), 2400); };

  const openNew = () => { setForm(EMPTY); setPhoto(null); setErrors([]); setEditing('new'); };
  const openEdit = (o) => {
    setForm({ ...EMPTY, ...o, initialPrice: String(o.initialPrice), discountPrice: String(o.discountPrice), quantity: String(o.quantity), surpriseKind: o.surpriseKind || 'sucre', allergens: o.allergens || '', revealContent: o.revealContent || '' });
    setPhoto(null); setErrors([]); setEditing(o);
  };

  const validate = () => {
    const e = [];
    if (form.title.trim().length < 3) e.push('Titre : 3 caractères minimum');
    if (!(Number(form.initialPrice) > 0)) e.push(surprise ? 'Valeur minimum invalide' : 'Prix initial invalide');
    if (!(Number(form.discountPrice) > 0)) e.push('Prix CampusSave invalide');
    if (Number(form.discountPrice) >= Number(form.initialPrice)) e.push(surprise ? 'Le prix doit être inférieur à la valeur du panier' : 'Le prix réduit doit être inférieur au prix initial');
    if (!Number.isInteger(Number(form.quantity)) || Number(form.quantity) < 0 || form.quantity === '') e.push('Quantité invalide');
    if (form.pickupStart >= form.pickupEnd) e.push('Horaire de récupération invalide');
    if (surprise && form.revealContent.trim().length < 3) e.push('Indique le contenu prévu du panier (il reste caché jusqu’au retrait)');
    setErrors(e);
    return e.length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const fd = new FormData();
    const fields = ['title', 'description', 'category', 'initialPrice', 'discountPrice', 'quantity', 'pickupStart', 'pickupEnd', 'status', 'allergens'];
    if (surprise) fields.push('surpriseKind', 'revealContent');
    fields.forEach((k) => fd.append(k, form[k] ?? ''));
    if (photo) fd.append('photo', photo);
    setBusy(true);
    try {
      if (editing === 'new') {
        const created = await api.post('/offers', fd);
        setOffers((list) => [created, ...(list || [])]); // apparaît tout de suite dans la liste
        flash('Offre publiée ✓');
      } else {
        const updated = await api.put(`/offers/${editing.id}`, fd);
        setOffers((list) => list.map((o) => (o.id === updated.id ? updated : o)));
        flash('Offre modifiée ✓');
      }
      setEditing(null);
    } catch (err) { setErrors([err.message]); } finally { setBusy(false); }
  };

  const del = async (o) => {
    if (!window.confirm(`Supprimer « ${o.title} » ?`)) return;
    try { await api.del(`/offers/${o.id}`); setOffers((list) => list.filter((x) => x.id !== o.id)); flash('Offre supprimée'); }
    catch (e) { flash('❌ ' + e.message); }
  };

  return (
    <div>
      <div className="sec-head">
        <div><h2>Mes offres</h2><p>Tes offres publiées. Le formulaire s’ouvre seulement avec « Ajouter une offre ».</p></div>
        <button className="btn fab" onClick={openNew}><i>+</i>Ajouter une offre</button>
      </div>
      {toast && <div className="toast">{toast}</div>}
      {loadErr && <p className="msg e">{loadErr}</p>}
      {offers === null ? <p className="loading">Chargement…</p> : offers.length === 0 ? (
        <div className="card empty"><h3>Aucune offre pour le moment</h3><p className="muted">Publie ta première offre pour la rendre visible aux étudiants.</p><button className="btn" onClick={openNew}>+ Ajouter une offre</button></div>
      ) : (
        <div className="grid">
          {offers.map((o) => {
            const sb = o.category === 'panier-surprise';
            return (
              <article key={o.id} className="card offer">
                <div className="img" style={{ backgroundImage: `url("${img(o.photoUrl) || (sb ? BOX_IMG : '')}")` }}>
                  <span className={`chip ${o.status === 'active' && o.quantity > 0 ? 'ok' : 'no'} disc`} style={{ background: undefined }}>{o.status !== 'active' ? 'Inactive' : o.quantity > 0 ? 'En ligne' : 'Épuisée'}</span>
                  {sb && <span className="tag">Surprise</span>}
                </div>
                <div className="b">
                  <h3>{o.title}</h3>
                  <p>{sb ? <><b>Contenu caché :</b> {o.revealContent}</> : o.description || <span className="muted">Pas de description</span>}</p>
                  <div className="chips"><span className="chip">{CATEGORIES[o.category]}{sb && o.surpriseKind ? ` · ${SURPRISE_KINDS[o.surpriseKind]}` : ''}</span><span className="chip">{o.quantity} restant(s)</span><span className="chip">🕒 {o.pickupStart}–{o.pickupEnd}</span></div>
                  <div className="price"><b>{fmtShort(o.discountPrice)}</b>{sb ? <small className="muted">valeur min. {fmtShort(o.initialPrice)}</small> : <s>{fmtShort(o.initialPrice)}</s>}</div>
                </div>
                <div className="acts"><button className="btn ghost sm" onClick={() => openEdit(o)}>✎ Modifier</button><button className="btn danger sm" onClick={() => del(o)}>Supprimer</button></div>
              </article>
            );
          })}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)}>
        <form onSubmit={submit} noValidate>
          <h2>{editing === 'new' ? 'Nouvelle offre' : 'Modifier l’offre'}</h2>
          <ImageInput label="Photo de l’offre" current={editing !== 'new' ? editing?.photoUrl : ''} file={photo} onChange={setPhoto} />
          <label>Titre<input value={form.title} onChange={set('title')} placeholder={surprise ? 'Panier surprise du soir' : 'Ex : Cheesecake cerise (part)'} /></label>
          <label>Description<textarea rows="2" value={form.description} onChange={set('description')} placeholder={surprise ? 'Ex : viennoiseries et pâtisseries du jour (sans détailler)' : 'Ce que l’étudiant va recevoir'} /></label>
          <div className="row2">
            <label>Catégorie<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value, title: e.target.value === 'panier-surprise' && !form.title ? 'Panier surprise du soir' : form.title })}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Quantité<input type="number" min="0" value={form.quantity} onChange={set('quantity')} /></label>
          </div>
          {surprise && (
            <div className="surprise-fields">
              <b style={{ color: 'var(--coffee)' }}>Panier surprise</b> <small className="muted">L’étudiant ne voit pas le contenu avant le retrait.</small>
              <div className="row2">
                <label>Type<select value={form.surpriseKind} onChange={set('surpriseKind')}>{Object.entries(SURPRISE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                <label>Allergènes possibles<input value={form.allergens} onChange={set('allergens')} placeholder="gluten, lait, œufs…" /></label>
              </div>
              <label>Contenu prévu (privé, révélé au retrait)<textarea rows="2" value={form.revealContent} onChange={set('revealContent')} placeholder="Ex : 2 croissants, 1 pain au chocolat, 1 part de cake" /></label>
            </div>
          )}
          <div className="row2">
            <label>{surprise ? 'Valeur minimum du panier (DT)' : 'Prix initial (DT)'}<input type="number" step="0.001" min="0" value={form.initialPrice} onChange={set('initialPrice')} /></label>
            <label>Prix CampusSave (DT)<input type="number" step="0.001" min="0" value={form.discountPrice} onChange={set('discountPrice')} /></label>
          </div>
          <div className="row2">
            <label>Récupération de<input type="time" value={form.pickupStart} onChange={set('pickupStart')} /></label>
            <label>à<input type="time" value={form.pickupEnd} onChange={set('pickupEnd')} /></label>
          </div>
          {editing !== 'new' && <label>Statut<select value={form.status} onChange={set('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>}
          {errors.map((er) => <p key={er} className="msg e">{er}</p>)}
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn ghost sm" onClick={() => setEditing(null)}>Annuler</button>
            <button className="btn sm" disabled={busy}>{busy ? 'Envoi de l’offre…' : editing === 'new' ? 'Publier l’offre' : 'Enregistrer'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
