// [YATHREB] Choix d'une image avec glisser-déposer, aperçu avant enregistrement et messages d'erreur clairs
import { useEffect, useRef, useState } from 'react';
import { img } from '../services/api';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 2 * 1024 * 1024;

export default function ImageInput({ label = 'Photo', current, file, onChange, onError }) {
  const input = useRef(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const take = (f) => {
    setError(''); onError?.('');
    if (!f) return;
    let e = '';
    if (!TYPES.includes(f.type)) e = 'Format non accepté : utilise JPG, JPEG, PNG ou WEBP.';
    else if (f.size > MAX) e = `Image trop lourde (${(f.size / 1048576).toFixed(1)} Mo). Maximum 2 Mo.`;
    if (e) { setError(e); onError?.(e); if (input.current) input.current.value = ''; return; }
    onChange(f);
  };

  const shown = preview || img(current);
  return (
    <div>
      <label>{label}</label>
      <div
        className={`drop ${error ? 'err' : ''} ${over ? 'over' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files[0]); }}
        role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && input.current?.click()}
      >
        📷 Glisse une image ici ou <u>clique pour choisir</u><br /><small>JPG, JPEG, PNG ou WEBP · 2 Mo max</small>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => take(e.target.files[0])} />
      {error && <p className="msg e">{error}</p>}
      {shown && (
        <div className="prev">
          <img src={shown} alt="Aperçu" />
          {file && <button type="button" className="btn danger sm" onClick={() => { onChange(null); if (input.current) input.current.value = ''; }}>Retirer</button>}
        </div>
      )}
    </div>
  );
}
