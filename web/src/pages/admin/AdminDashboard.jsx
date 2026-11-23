// [YATHREB] Tableau de bord administrateur (supervision)
import { useEffect, useState } from 'react';
import { api, fmt, STATUTS, ROLES } from '../../services/api';
import { StatCard, BarChart, StatusList, ImpactCard } from '../../components/Stats';

export default function AdminDashboard() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get('/stats/admin').then(setS); }, []);
  if (!s) return <p>Chargement…</p>;
  return (
    <div>
      <h2>Supervision de la plateforme</h2>
      <div className="stats">
        <StatCard icon="👥" label="Utilisateurs" value={s.utilisateurs} />
        <StatCard icon="🏪" label="Commerces" value={s.commerces} />
        <StatCard icon="🍽️" label="Offres" value={s.offres} />
        <StatCard icon="💳" label="Volume des paiements" value={fmt(s.volumePaiements)} />
      </div>
      <ImpactCard impact={s.impact} />
      <div className="grid2">
        <BarChart title="Paiements (7 derniers jours)" data={s.ventes7j} unit="DT" />
        <StatusList title="Utilisateurs par rôle" data={s.parRole} labels={ROLES} />
        <StatusList title="Commerces par statut" data={s.commercesParStatut} labels={{ valide: 'Validés', en_attente: 'En attente', refuse: 'Refusés' }} />
        <StatusList title="Commandes par statut" data={s.commandesParStatut} labels={STATUTS} />
      </div>
    </div>
  );
}
