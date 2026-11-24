// [YATHREB] Tableau de bord commerçant
import { useEffect, useState } from 'react';
import { api, fmt, STATUTS } from '../../services/api';
import { StatCard, BarChart, StatusList, ImpactCard } from '../../components/Stats';

export default function MerchantDashboard() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/stats/merchant').then(setS).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="error">{err}</p>;
  if (!s) return <p>Chargement…</p>;
  return (
    <div>
      <h2>Tableau de bord commerçant</h2>
      <div className="stats">
        <StatCard icon="🍽️" label="Offres actives" value={`${s.offresActives} / ${s.offres}`} />
        <StatCard icon="🧾" label="Commandes" value={s.commandes} />
        <StatCard icon="📦" label="À récupérer" value={s.aRecuperer} />
        <StatCard icon="💰" label="Chiffre d’affaires" value={fmt(s.chiffreAffaires)} />
      </div>
      <ImpactCard impact={s.impact} />
      <div className="grid2">
        <BarChart title="Ventes (7 derniers jours)" data={s.ventes7j} unit="DT" />
        <BarChart title="Top produits vendus" data={s.topOffres} valueKey="qte" labelKey="title" />
      </div>
      <StatusList title="Commandes par statut" data={s.parStatut} labels={STATUTS} />
    </div>
  );
}
