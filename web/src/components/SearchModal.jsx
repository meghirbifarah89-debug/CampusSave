// [FARAH] Recherche globale de comptes (étudiants, commerçants, administrateurs)
// Recherche partielle, insensible à la casse ; un clic ouvre le profil correspondant.
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { api, img, ROLES } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TYPES = [['', 'Tous'], ['etudiant', 'Étudiants'], ['commercant', 'Commerçants'], ['admin', 'Administrateurs']];
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Highlight({ text, q }) {
  const i = norm(text).indexOf(norm(q));
  if (!q || i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export default function SearchModal({ open, onClose }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [results, setResults] = useState([]);
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const input = useRef(null);

  useEffect(() => { if (open) { setQ(''); setResults([]); setState('idle'); setTimeout(() => input.current?.focus(), 30); } }, [open]);

  useEffect(() => {
    if (!open) return;
    if (q.trim().length < 2) { setResults([]); setState('idle'); return; }
    setState('loading');
    const t = setTimeout(() => {
      api.get(`/users/search?q=${encodeURIComponent(q.trim())}${type ? `&type=${type}` : ''}`)
        .then((r) => { setResults(r); setState('done'); })
        .catch(() => setState('error'));
    }, 250);
    return () => clearTimeout(t);
  }, [q, type, open]);

  const openResult = (r) => {
    onClose();
    if (r.role === 'commercant' && r.commerceId && profile?.role !== 'admin') return navigate(`/commerces/${r.commerceId}`);
    if (r.id === profile?.id) return navigate('/profil');
    navigate(`/utilisateurs/${r.id}`);
  };

  return (
    <Modal open={open} onClose={onClose} className="search-card">
      <input ref={input} className="q" placeholder="Rechercher un compte par nom, mot-clé…" value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) openResult(results[0]); }} aria-label="Rechercher un compte" />
      <div className="seg" style={{ marginTop: 10 }}>
        {TYPES.map(([k, l]) => <button key={k} className={type === k ? 'on' : ''} onClick={() => setType(k)}>{l}</button>)}
      </div>
      <div style={{ marginTop: 10 }}>
        {state === 'idle' && <p className="note">Tape au moins 2 lettres : prénom, nom, commerce, faculté…</p>}
        {state === 'loading' && <p className="note">Recherche…</p>}
        {state === 'error' && <p className="msg e">La recherche a échoué. Réessaie.</p>}
        {state === 'done' && !results.length && <div className="empty" style={{ padding: 24 }}><h3 style={{ fontSize: '1.15rem' }}>Aucun compte ne correspond à « {q} »</h3></div>}
        {results.map((r) => (
          <div key={r.id + (r.commerceId || '')} className="gr" tabIndex={0} onClick={() => openResult(r)} onKeyDown={(e) => e.key === 'Enter' && openResult(r)}>
            {r.photoUrl ? <span className="av" style={{ backgroundImage: `url(${img(r.photoUrl)})` }} /> : <span className="av">{r.role === 'commercant' ? '🏪' : r.name[0]}</span>}
            <div><b><Highlight text={r.commerceName || r.name} q={q} /></b><small><Highlight text={[r.commerceName ? r.name : '', r.faculty, r.location].filter(Boolean).join(' · ')} q={q} /></small></div>
            <span className="chip">{ROLES[r.role]}</span>
          </div>
        ))}
      </div>
      <p className="note">{profile?.role === 'admin' ? 'Administrateur : coordonnées complètes visibles dans les profils.' : 'Les e-mails et téléphones restent privés.'}</p>
    </Modal>
  );
}
