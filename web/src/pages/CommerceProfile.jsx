// [FARAH] Profil public d'un commerce (depuis les offres, la recherche ou Campus Radar)
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';
import CommerceView from '../components/CommerceView';

export default function CommerceProfile() {
  const { id } = useParams();
  const [c, setC] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api.get(`/commerces/${id}`).then(setC).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [id]);
  if (err) return <div className="card empty"><h3>{err}</h3></div>;
  if (!c) return <p className="loading">Chargement…</p>;
  return <CommerceView commerce={c} onReviewed={(r) => setC((prev) => ({ ...prev, ratingAvg: r.ratingAvg, ratingCount: r.ratingCount }))} />;
}
