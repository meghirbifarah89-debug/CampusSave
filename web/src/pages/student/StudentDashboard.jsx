// [YATHREB] Tableau de bord étudiant
import { useEffect, useState } from 'react';
import { api, fmt, STATUTS } from '../../services/api';
import { StatCard, BarChart, StatusList, ImpactCard } from '../../components/Stats';

export default function StudentDashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/stats/student').then(setS); }, []);
  if (!s) return <p>Chargement…</p>;
  return (
    <div>
      <h2>Mon tableau de bord</h2>
      <div className="stats">
        <StatCard icon="🧾" label="Commandes" value={s.commandes} />
        <StatCard icon="💳" label="Total dépensé" value={fmt(s.totalDepense)} />
        <StatCard icon="💰" label="Économies" value={fmt(s.totalEconomise)} />
        <StatCard icon="🌱" label="EcoPoints" value={s.ecoPoints} />
      </div>
      <ImpactCard impact={s.impact} />
      <div className="grid2">
        <BarChart title="Dépenses (7 derniers jours)" data={s.depenses7j} unit="DT" />
        <StatusList title="Commandes par statut" data={s.parStatut} labels={STATUTS} />
      </div>
    </div>
  );
}
