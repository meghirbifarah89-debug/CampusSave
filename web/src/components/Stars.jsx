// [YATHREB] Affichage des étoiles + sélecteur de note
export function Stars({ value = 0, size }) {
  const r = Math.round(value);
  return (
    <span className="stars" style={size ? { fontSize: size } : undefined} aria-label={`${value} sur 5`}>
      {'★'.repeat(r)}<span className="off">{'★'.repeat(5 - r)}</span>
    </span>
  );
}

export function StarPicker({ value, onChange }) {
  return (
    <div className="pick" role="radiogroup" aria-label="Note">
      {[1, 2, 3, 4, 5].map((i) => (
        <button type="button" key={i} className={i <= value ? 'on' : ''} onClick={() => onChange(i)} aria-label={`${i} étoile${i > 1 ? 's' : ''}`}>★</button>
      ))}
    </div>
  );
}
