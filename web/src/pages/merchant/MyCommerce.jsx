// [YATHREB] « Mon commerce » : affiche le profil du commerce (données de la base).
// Le formulaire ne s'ouvre qu'avec « Modifier mes informations » (ou pour inscrire un nouveau commerce).
import { useEffect, useState } from 'react';
import { api, COMMERCE_TYPES } from '../../services/api';
import CommerceView from '../../components/CommerceView';
import Modal from '../../components/Modal';
import ImageInput from '../../components/ImageInput';
import { MapPicker } from '../../components/Map';

const EMPTY = { name: '', type: 'restaurant', address: '', phone: '', description: '', openingHours: '', lat: null, lng: null };

export default function MyCommerce() {
  const [commerce, setCommerce] = useState(undefined);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [logo, setLogo] = useState(null);
  const [cover, setCover] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const mine = await api.get('/commerces/mine');
    if (!mine) return setCommerce(null);
    const full = await api.get(`/commerces/${mine.id}`).catch(() => mine);
    setCommerce({ ...mine, ...full });
  };
  useEffect(() => { load().catch((e) => setMsg({ e: true, t: e.message })); }, []);

  const open = () => { setForm({ ...EMPTY, ...(commerce || {}) }); setLogo(null); setCover(null); setMsg(null); setEditing(true); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 2) return setMsg({ e: true, t: 'Nom obligatoire' });
    if (form.address.trim().length < 5) return setMsg({ e: true, t: 'Adresse obligatoire' });
    if (!/^[2-9]\d{7}$/.test(String(form.phone).replace(/\s/g, ''))) return setMsg({ e: true, t: 'Téléphone invalide (8 chiffres)' });
    const fd = new FormData();
    ['name', 'type', 'address', 'phone', 'description', 'openingHours'].forEach((k) => fd.append(k, form[k] ?? ''));
    if (form.lat != null && form.lng != null) { fd.append('lat', form.lat); fd.append('lng', form.lng); }
    if (logo) fd.append('logo', logo);
    if (cover) fd.append('cover', cover);
    setBusy(true);
    try {
      if (commerce) await api.put(`/commerces/${commerce.id}`, fd); else await api.post('/commerces', fd);
      setEditing(false);
      await load();
    } catch (err) { setMsg({ e: true, t: err.message }); } finally { setBusy(false); }
  };

  if (commerce === undefined) return <p className="loading">Chargement…</p>;
  return (
    <>
      {commerce
        ? <CommerceView commerce={commerce} owner onEdit={open} onReviewed={(r) => setCommerce((p) => ({ ...p, ratingAvg: r.ratingAvg, ratingCount: r.ratingCount }))} />
        : (
          <div className="card empty">
            <h3>Tu n’as pas encore inscrit ton commerce</h3>
            <p className="muted">Inscris-le pour publier tes offres. Il sera visible après validation par l’administrateur.</p>
            <button className="btn" onClick={open}>Inscrire mon commerce</button>
          </div>
        )}
      <Modal open={editing} onClose={() => setEditing(false)} wide>
        <form onSubmit={save} noValidate>
          <h2>{commerce ? 'Modifier mon commerce' : 'Inscrire mon commerce'}</h2>
          <div className="cover-edit">
            <ImageInput label="Logo du commerce" current={commerce?.logoUrl} file={logo} onChange={setLogo} />
            <ImageInput label="Photo de couverture" current={commerce?.coverUrl} file={cover} onChange={setCover} />
          </div>
          <div className="row2">
            <label>Nom<input value={form.name} onChange={set('name')} /></label>
            <label>Type<select value={form.type} onChange={set('type')}>{Object.entries(COMMERCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          </div>
          <label>Adresse<input value={form.address} onChange={set('address')} /></label>
          <div className="row2">
            <label>Téléphone<input value={form.phone} onChange={set('phone')} /></label>
            <label>Horaires d’ouverture<input value={form.openingHours} onChange={set('openingHours')} placeholder="08:00 - 18:00" /></label>
          </div>
          <label>Description<textarea value={form.description} onChange={set('description')} /></label>
          <label>Position sur la carte <small className="muted">(clique sur la carte ou déplace le point — utilisée par Campus Radar)</small></label>
          <MapPicker lat={form.lat} lng={form.lng} onChange={(lat, lng) => setForm((f) => ({ ...f, lat, lng }))} />
          {form.lat != null && <p className="note">📍 {form.lat}, {form.lng}</p>}
          {msg && <p className={`msg ${msg.e ? 'e' : 's'}`}>{msg.t}</p>}
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn ghost sm" onClick={() => setEditing(false)}>Annuler</button>
            <button className="btn sm" disabled={busy}>{busy ? 'Enregistrement…' : commerce ? 'Enregistrer' : 'Envoyer pour validation'}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
