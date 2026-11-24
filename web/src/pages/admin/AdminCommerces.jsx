// [YATHREB] Validation des commerces par l'administrateur
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, img, COMMERCE_TYPES } from '../../services/api';
import { Stars } from '../../components/Stars';

export default function AdminCommerces() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('en_attente');

  const load = () => api.get('/admin/commerces' + (status ? `?status=${status}` : '')).then(setList);
  useEffect(() => { load(); }, [status]);

  const decide = async (id, s) => { await api.put(`/admin/commerces/${id}/validate`, { status: s }); load(); };

  return (
    <div>
      <h2>Commerces</h2>
      <div className="tabs">
        {[['en_attente', 'En attente'], ['valide', 'Validés'], ['refuse', 'Refusés'], ['', 'Tous']].map(([v, l]) => (
          <button key={v} className={status === v ? 'active' : ''} onClick={() => setStatus(v)}>{l}</button>
        ))}
      </div>
      <div className="card table-wrap"><table className="table">
        <thead><tr><th>Commerce</th><th>Type</th><th>Adresse</th><th>Téléphone</th><th>Note</th><th>Statut</th><th>Actions</th></tr></thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id}>
              <td><Link className="namecell" to={`/commerces/${c.id}`} style={{ color: 'inherit' }}><span className="mini">{c.logoUrl ? <img src={img(c.logoUrl)} alt="" /> : '🏪'}</span><b>{c.name}</b></Link></td><td>{COMMERCE_TYPES[c.type] || c.type}</td><td>{c.address}</td><td>{c.phone}</td><td>{c.ratingCount ? <><Stars value={c.ratingAvg} size=".8rem" /> {c.ratingAvg}</> : '—'}</td>
              <td><span className={`status ${c.status}`}>{c.status}</span></td>
              <td>
                {c.status !== 'valide' && <button className="btn small" onClick={() => decide(c.id, 'valide')}>Valider</button>}{' '}
                {c.status !== 'refuse' && <button className="btn small outline" onClick={() => decide(c.id, 'refuse')}>Refuser</button>}
              </td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan="7" className="muted">Aucun commerce</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}
