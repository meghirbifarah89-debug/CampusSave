// [YATHREB] Composants de tableau de bord : cartes et graphique en barres (sans librairie)
export function StatCard({ label, value, icon }) {
  return (
    <div className="stat">
      <span className="stat-icon">{icon}</span>
      <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
    </div>
  );
}

export function BarChart({ title, data, valueKey = 'total', labelKey = 'day', unit = '' }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="bars-chart">
        {data.map((d) => (
          <div key={d[labelKey]} className="bar-col" title={`${d[valueKey]} ${unit}`}>
            <span className="bar-val">{d[valueKey] || ''}</span>
            <div className="bar" style={{ height: `${(d[valueKey] / max) * 140}px` }} />
            <span className="bar-label">{String(d[labelKey]).slice(-5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatusList({ title, data, labels = {} }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {Object.keys(data || {}).length === 0 && <p className="muted">Aucune donnée</p>}
      <ul className="plain">
        {Object.entries(data || {}).map(([k, v]) => <li key={k}><span>{labels[k] || k}</span><b>{v}</b></li>)}
      </ul>
    </div>
  );
}

export function ImpactCard({ impact }) {
  if (!impact) return null;
  return (
    <div className="card impact">
      <h3>🌍 Impact anti-gaspillage</h3>
      <div className="grid3">
        <div><b>{impact.repasSauves}</b><span>repas sauvés</span></div>
        <div><b>{impact.kgSauves} kg</b><span>de nourriture</span></div>
        <div><b>{impact.co2Evite} kg</b><span>de CO₂ évités</span></div>
      </div>
    </div>
  );
}
