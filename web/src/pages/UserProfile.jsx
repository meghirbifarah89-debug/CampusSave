// [FARAH] Profil d'un compte trouvé par la recherche (informations privées visibles par l'admin uniquement)
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, img, fmtDate, ROLES, GENDERS } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function UserProfile() {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [u, setU] = useState(null);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const isAdmin = profile?.role === 'admin';

  const load = () => api.get(`/users/${id}`).then(setU).catch((e) => setErr(e.message));
  useEffect(() => { if (id === profile?.id) navigate('/profil', { replace: true }); else load(); }, [id]);

  const toggle = async () => {
    try { await api.put(`/admin/users/${u.id}/status`, { status: u.status === 'bloque' ? 'actif' : 'bloque' }); setMsg('Statut mis à jour'); load(); }
    catch (e) { setMsg(e.message); }
  };

  if (err) return <div className="card empty"><h3>{err}</h3></div>;
  if (!u) return <p className="loading">Chargement…</p>;
  const rows = [
    ['Rôle', ROLES[u.role]],
    ...(u.role === 'etudiant' ? [['Faculté / université', u.faculty || '—'], ['Localisation', u.location || '—'], ['Sexe', GENDERS[u.gender] || '—']] : [['Localisation', u.location || '—']]),
    ...(u.commerceName ? [['Commerce', u.commerceName]] : []),
    ...(isAdmin ? [['E-mail', u.email], ['Téléphone', u.phone], ['Statut', u.status], ['Membre depuis', fmtDate(u.createdAt) || '—']] : []),
  ];
  return (
    <div>
      <div className="cover st" style={u.coverUrl ? { backgroundImage: `url("${img(u.coverUrl)}")` } : undefined} />
      <div className="profile-head">
        <div className={`avatar-xl ${u.photoUrl ? '' : 'initials'}`}>{u.photoUrl ? <img src={img(u.photoUrl)} alt="" /> : u.name?.[0]}</div>
        <div className="who"><h1>{u.name}</h1><div className="chips"><span className="chip">{ROLES[u.role]}</span>{u.faculty && <span className="chip">{u.faculty}</span>}{isAdmin && <span className={`status ${u.status}`}>{u.status}</span>}</div></div>
        <button className="btn ghost sm" onClick={() => navigate(-1)}>← Retour</button>
      </div>
      <div className="grid-profile">
        <div className="card"><h3>Profil</h3><div className="info">{rows.map(([k, v]) => <div key={k}><small>{k}</small>{v}</div>)}</div>
          <p className="note">{isAdmin ? 'Vue administrateur : informations complètes.' : 'Les informations privées (e-mail, téléphone) sont masquées.'}</p></div>
        <div className="card">
          {u.role === 'etudiant' && <><h3>EcoPoints</h3><div className="card eco-card" style={{ marginBottom: 12 }}><b>{u.ecoPoints || 0}</b><span>🌱 {Math.floor((u.ecoPoints || 0) / 10)} article(s) sauvé(s)</span></div>
            {isAdmin && u.orders && <p className="muted">{u.orders.total} commande(s) · {u.orders.recuperees} récupérée(s)</p>}</>}
          {u.commerceId && <><h3>Commerce</h3><Link className="btn sm" to={`/commerces/${u.commerceId}`}>Voir le profil de {u.commerceName}</Link></>}
          {u.role === 'admin' && <><h3>Administrateur</h3><p className="muted">Compte de gestion de la plateforme CampusSave.</p></>}
          {isAdmin && u.role !== 'admin' && <div style={{ marginTop: 16 }}><button className={`btn sm ${u.status === 'bloque' ? '' : 'danger'}`} onClick={toggle}>{u.status === 'bloque' ? 'Débloquer ce compte' : 'Bloquer ce compte'}</button>{msg && <p className="note">{msg}</p>}</div>}
        </div>
      </div>
    </div>
  );
}
