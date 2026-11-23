// [YATHREB] « Mon profil » : affiche d'abord les informations du compte (base de données).
// Le formulaire ne s'ouvre qu'avec « Modifier mon profil ». Étudiant : EcoPoints, historique, ComeEat.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, img, fmtShort, fmtDate, ROLES, GENDERS } from '../services/api';
import Modal from '../components/Modal';
import ImageInput from '../components/ImageInput';

const COST = 500;

function ComeEatArt() {
  return (
    <svg className="art" viewBox="0 0 120 90" aria-hidden="true"><ellipse cx="60" cy="74" rx="54" ry="10" fill="#E9D6BC" /><ellipse cx="60" cy="68" rx="46" ry="12" fill="#FFFDF9" stroke="#C9B08C" strokeWidth="2" /><path d="M26 58C26 40 42 30 60 30s34 10 34 28Z" fill="#D58A3A" /><path d="M24 58h72l-6 8H30Z" fill="#6BAF3A" /><rect x="28" y="60" width="64" height="7" rx="3" fill="#5A2E19" /><g fill="#FFF3D6"><ellipse cx="48" cy="40" rx="2.5" ry="1.4" /><ellipse cx="62" cy="36" rx="2.5" ry="1.4" /><ellipse cx="74" cy="44" rx="2.5" ry="1.4" /></g><path d="M98 20l4 8 8 1-6 6 2 8-8-4-8 4 2-8-6-6 8-1Z" fill="#E0A021" /></svg>
  );
}

export default function Profile() {
  const { profile, setProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [delOpen, setDelOpen] = useState(false);
  const [delText, setDelText] = useState('');
  const [delMsg, setDelMsg] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [photo, setPhoto] = useState(null);
  const [cover, setCover] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [eco, setEco] = useState(null);
  const [stats, setStats] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [ceMsg, setCeMsg] = useState(null);
  const student = profile.role === 'etudiant';

  const loadEco = () => api.get('/rewards/me').then(setEco).catch(() => {});
  useEffect(() => {
    if (!student) return;
    loadEco();
    api.get('/stats/student').then(setStats).catch(() => {});
  }, [student]);

  // Supprimer définitivement son compte
  const deleteAccount = async () => {
    setDeleting(true); setDelMsg(null);
    try {
      await api.del('/auth/me');
      await logout();
      navigate('/', { replace: true });
    } catch (e) { setDelMsg(e.message); setDeleting(false); }
  };

  const open = () => {
    setForm({ name: profile.name || '', phone: profile.phone || '', faculty: profile.faculty || '', location: profile.location || '', gender: profile.gender || '' });
    setPhoto(null); setCover(null); setMsg(null); setEditing(true);
  };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    if (form.name.trim().length < 3) return setMsg({ e: true, t: 'Nom : 3 caractères minimum' });
    if (!/^[2-9]\d{7}$/.test(form.phone.replace(/\s/g, ''))) return setMsg({ e: true, t: 'Téléphone invalide (8 chiffres)' });
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (photo) fd.append('photo', photo);
    if (cover) fd.append('cover', cover);
    setBusy(true);
    try { setProfile(await api.put('/auth/me', fd)); setEditing(false); }
    catch (err) { setMsg({ e: true, t: err.message }); } finally { setBusy(false); }
  };

  const claim = async () => {
    if (!window.confirm(`Utiliser ${COST} EcoPoints pour un repas gratuit ?`)) return;
    setClaiming(true); setCeMsg(null);
    try {
      const r = await api.post('/rewards/comeeat/claim');
      setCeMsg({ e: false, t: `${r.message} Code ${r.code}` });
      setProfile({ ...profile, ecoPoints: r.balance });
      await loadEco();
    } catch (err) { setCeMsg({ e: true, t: err.message }); } finally { setClaiming(false); }
  };

  const balance = eco?.balance ?? profile.ecoPoints ?? 0;
  const unlocked = balance >= COST;
  const info = [
    ['Nom complet', profile.name], ['E-mail', profile.email], ['Téléphone', profile.phone],
    ...(student ? [['Faculté / université', profile.faculty || '—'], ['Localisation', profile.location || '—'], ['Sexe', GENDERS[profile.gender] || '—']] : [['Localisation', profile.location || '—']]),
    ['Rôle', ROLES[profile.role]], ['Membre depuis', fmtDate(profile.createdAt) || '—'],
  ];

  return (
    <div>
      <div className="cover st" style={profile.coverUrl ? { backgroundImage: `url("${img(profile.coverUrl)}")` } : undefined} />
      <div className="profile-head">
        <div className={`avatar-xl ${profile.photoUrl ? '' : 'initials'}`}>{profile.photoUrl ? <img src={img(profile.photoUrl)} alt="Photo de profil" /> : profile.name?.[0]}</div>
        <div className="who">
          <h1>{profile.name}</h1>
          <div className="chips"><span className="chip">{ROLES[profile.role]}</span>{profile.faculty && <span className="chip">{profile.faculty}</span>}<span className="chip ok">Compte {profile.status || 'actif'}</span></div>
        </div>
        <button className="btn sm" onClick={open}>✎ Modifier mon profil</button>
      </div>

      <div className="grid-profile">
        <div>
          <div className="card"><h3>Mes informations</h3><div className="info">{info.map(([k, v]) => <div key={k}><small>{k}</small>{v}</div>)}</div></div>
          {student && stats && (
            <div className="card">
              <h3>Mon impact</h3>
              <div className="grid3">
                <div className="mini-stat"><b>{stats.commandes}</b><span>commandes</span></div>
                <div className="mini-stat"><b>{fmtShort(stats.totalEconomise)}</b><span>économisés</span></div>
                <div className="mini-stat"><b>{stats.impact?.repasSauves ?? 0}</b><span>repas sauvés</span></div>
              </div>
              <Link to="/etudiant/tableau-de-bord" className="btn-link">Voir mes statistiques détaillées →</Link>
            </div>
          )}
          {student && (
            <div className="card">
              <h3>Historique EcoPoints</h3>
              {!eco ? <p className="muted">Chargement…</p> : !eco.history.length ? <p className="muted">Aucun mouvement pour l’instant.</p>
                : eco.history.map((h, i) => <div key={i} className="hist"><span>{h.label}<br /><small className="muted">{fmtDate(h.date)}</small></span><span className={h.points > 0 ? 'plus' : 'minus'}>{h.points > 0 ? '+' : ''}{h.points}</span></div>)}
              <p className="note">Comment gagner des points : <b>{eco?.rule || '10 EcoPoints par article récupéré'}</b>.</p>
            </div>
          )}
        </div>
        {student && (
          <div>
            <div className="card eco-card"><small>Solde EcoPoints</small><b>{balance}</b><span>🌱 10 points par article sauvé</span></div>
            <div className={`card comeeat ${unlocked ? '' : 'locked'}`}>
              <ComeEatArt />
              <div><span className="ce-tag">Récompense spéciale</span><h3>ComeEat</h3><p>Atteins 500 EcoPoints et profite d’un repas gratuit !</p></div>
              <div>
                <div className="lv-bar"><i style={{ width: `${Math.min(100, (balance / COST) * 100)}%` }} /></div>
                <div className="ce-row"><span>{unlocked ? `${balance} points · débloqué ✓` : `${balance} / ${COST} · encore ${COST - balance} points`}</span><b>{COST} EcoPoints</b></div>
              </div>
              {unlocked
                ? <button className="btn" onClick={claim} disabled={claiming}>{claiming ? 'Vérification du solde…' : '🍽️ Réclamer mon repas gratuit'}</button>
                : <span className="chip">🔒 Verrouillé</span>}
              {ceMsg && <p className={`msg ${ceMsg.e ? 'e' : 's'}`}>{ceMsg.t}</p>}
            </div>
            <div className="card">
              <h3>Mes récompenses</h3>
              {!eco?.rewards?.length ? <p className="muted">Aucune récompense réclamée pour l’instant.</p> : eco.rewards.map((r) => (
                <div key={r.id} className="ce-code">
                  {r.qrCode && r.status === 'active' && <img src={r.qrCode} alt={`QR ${r.code}`} />}
                  <div>
                    <b style={{ fontFamily: 'Bricolage Grotesque', fontSize: '1.3rem', color: 'var(--coffee)' }}>{r.code}</b><br />
                    <span className={`chip ${r.status === 'active' ? 'ok' : ''}`}>{r.status === 'active' ? 'ComeEat · à utiliser' : 'Utilisé'}</span>
                    <p className="note" style={{ margin: '8px 0 0' }}>Réclamé le {fmtDate(r.createdAt)} · −{r.cost} EcoPoints<br />{r.status === 'active' ? 'Montre ce QR code (ou le code) dans un commerce partenaire.' : `Utilisé le ${fmtDate(r.usedAt)}`}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal open={editing} onClose={() => setEditing(false)}>
        <form onSubmit={save} noValidate>
          <h2>Modifier mon profil</h2>
          <div className="cover-edit">
            <ImageInput label="Photo de profil" current={profile.photoUrl} file={photo} onChange={setPhoto} />
            <ImageInput label="Photo de couverture" current={profile.coverUrl} file={cover} onChange={setCover} />
          </div>
          <label>Nom complet<input value={form.name || ''} onChange={set('name')} /></label>
          <div className="row2">
            <label>Téléphone<input value={form.phone || ''} onChange={set('phone')} /></label>
            <label>Localisation<input value={form.location || ''} onChange={set('location')} placeholder="Ex : Tunis, Ariana…" /></label>
          </div>
          {student && (
            <div className="row2">
              <label>Faculté / université<input value={form.faculty || ''} onChange={set('faculty')} placeholder="Ex : ESSECT · E-Business L3" /></label>
              <label>Sexe<select value={form.gender || ''} onChange={set('gender')}><option value="">—</option>{Object.entries(GENDERS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            </div>
          )}
          {msg && <p className={`msg ${msg.e ? 'e' : 's'}`}>{msg.t}</p>}
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" className="btn ghost sm" onClick={() => setEditing(false)}>Annuler</button>
            <button className="btn sm" disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      </Modal>

      {profile.role !== 'admin' && (
        <div className="card danger-zone">
          <h3>Supprimer mon compte</h3>
          <p className="muted">Cette action est définitive : votre profil{student ? ', vos avis et vos EcoPoints' : ', votre commerce et vos offres'} seront supprimés.</p>
          <button className="btn danger sm" onClick={() => { setDelText(''); setDelMsg(null); setDelOpen(true); }}>Supprimer mon compte</button>
        </div>
      )}

      <Modal open={delOpen} onClose={() => !deleting && setDelOpen(false)}>
        <h2>Supprimer mon compte ?</h2>
        <p>Cette action est <b>définitive</b>. {student ? 'Vos commandes non payées seront annulées, vos avis et vos EcoPoints supprimés.' : 'Votre commerce, vos offres et les avis reçus seront supprimés.'}</p>
        <label>Tapez <b>SUPPRIMER</b> pour confirmer<input value={delText} onChange={(e) => setDelText(e.target.value)} autoFocus /></label>
        {delMsg && <p className="msg e">{delMsg}</p>}
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
          <button type="button" className="btn ghost sm" onClick={() => setDelOpen(false)} disabled={deleting}>Annuler</button>
          <button className="btn danger sm" onClick={deleteAccount} disabled={delText !== 'SUPPRIMER' || deleting}>{deleting ? 'Suppression…' : 'Supprimer définitivement'}</button>
        </div>
      </Modal>
    </div>
  );
}
