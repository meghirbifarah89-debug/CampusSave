// [YATHREB] Gestion des utilisateurs par l'administrateur
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, img, ROLES } from '../../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');

  const load = () => api.get('/admin/users').then(setUsers);
  useEffect(() => { load(); }, []);

  const toggle = async (u) => {
    try { await api.put(`/admin/users/${u.id}/status`, { status: u.status === 'bloque' ? 'actif' : 'bloque' }); load(); }
    catch (e) { setErr(e.message); }
  };

  const [role, setRole] = useState('');
  const shown = users.filter((u) => (!role || u.role === role) && (u.name + u.email + u.role + (u.faculty || '')).toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <h2>Utilisateurs ({users.length})</h2>
      {err && <p className="error">{err}</p>}
      <div className="row" style={{ marginBottom: 14 }}><input style={{ maxWidth: 340 }} placeholder="🔎 Nom, e-mail, faculté…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg">{[['', 'Tous'], ['etudiant', 'Étudiants'], ['commercant', 'Commerçants'], ['admin', 'Admins']].map(([k, l]) => <button key={k} className={role === k ? 'on' : ''} onClick={() => setRole(k)}>{l}</button>)}</div></div>
      <div className="card table-wrap"><table className="table">
        <thead><tr><th>Nom</th><th>E-mail</th><th>Téléphone</th><th>Rôle</th><th>EcoPoints</th><th>Statut</th><th /></tr></thead>
        <tbody>
          {shown.map((u) => (
            <tr key={u.id}>
              <td><div className="namecell"><span className="av" style={u.photoUrl ? { backgroundImage: `url(${img(u.photoUrl)})` } : undefined}>{u.photoUrl ? '' : u.name?.[0]}</span>{u.name}</div></td><td>{u.email}</td><td>{u.phone}</td><td>{ROLES[u.role] || u.role}</td><td>{u.role === 'etudiant' ? u.ecoPoints || 0 : '—'}</td>
              <td><span className={`status ${u.status}`}>{u.status}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}><Link className="btn ghost small" to={`/utilisateurs/${u.id}`}>Voir le profil</Link> {u.role !== 'admin' && <button className="btn small outline" onClick={() => toggle(u)}>{u.status === 'bloque' ? 'Débloquer' : 'Bloquer'}</button>}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
    </div>
  );
}
