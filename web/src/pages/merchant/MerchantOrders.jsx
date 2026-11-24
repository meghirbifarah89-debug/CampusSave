// [YATHREB] Retraits : commandes reçues + validation du QR code (caméra ou saisie)
// Colonne « Scanné Code » : calculée à partir de la validation réelle du QR (statut « recuperee » + date pickedUpAt).
// Les codes ComeEat (repas gratuit EcoPoints) sont aussi validés ici.
import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { api, fmt, STATUTS } from '../../services/api';

export default function MerchantOrders() {
  const [orders, setOrders] = useState([]);
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState('');
  const scannerRef = useRef(null);

  const load = () => api.get('/orders/merchant').then(setOrders);
  // rafraîchissement automatique : la colonne « Scanné Code » suit les scans faits sur un autre appareil (app mobile)
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, []);

  const verify = async (qr) => {
    const v = String(qr || '').trim();
    // Repas gratuit ComeEat : QR "COMEEAT:..." ou code "CE-XXXXXX"
    if (v.startsWith('COMEEAT:') || /^CE-/i.test(v)) {
      try { const r = await api.post('/rewards/redeem', { code: v }); setResult({ ok: true, text: r.message }); }
      catch (e) { setResult({ ok: false, text: '❌ ' + e.message }); }
      return;
    }
    try {
      const r = await api.post('/orders/verify-qr', { qr });
      setResult({ ok: true, text: `${r.message} – ${r.order.code} (${r.order.studentName}) : ${r.order.items.map((i) => i.quantity + '× ' + i.title).join(', ')}` });
      load();
    } catch (e) { setResult({ ok: false, text: '❌ ' + e.message }); }
  };

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: 250 }, false);
    scanner.render((text) => { scanner.clear(); setScanning(false); verify(text); }, () => {});
    scannerRef.current = scanner;
    return () => { scanner.clear().catch(() => {}); };
  }, [scanning]);

  const shown = orders.filter((o) => !filter || o.status === filter);

  return (
    <div>
      <div className="card">
        <h2>Valider un retrait</h2>
        <div className="row">
          <button className="btn" onClick={() => setScanning(!scanning)}>{scanning ? 'Arrêter la caméra' : 'Scanner le QR code'}</button>
          <form className="row grow" onSubmit={(e) => { e.preventDefault(); if (code) verify(code); }}>
            <input className="grow" placeholder="ou coller le contenu du QR (CAMPUSSAVE:…) ou un code ComeEat (CE-…)" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn outline">Valider</button>
          </form>
        </div>
        {scanning && <div id="reader" style={{ maxWidth: 400 }} />}
        {result && <p className={result.ok ? 'success' : 'error'}>{result.text}</p>}
      </div>

      <h2>Gestion des retraits</h2>
      <div className="tabs">
        {[['', 'Toutes'], ['payee', 'À récupérer'], ['recuperee', 'Récupérées'], ['en_attente_paiement', 'Non payées']].map(([v, l]) => (
          <button key={v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      <div className="card table-wrap"><table className="table">
        <thead><tr><th>Code</th><th>Étudiant</th><th>Produits</th><th>Total</th><th>Statut</th><th>Scanné Code</th></tr></thead>
        <tbody>
          {shown.map((o) => (
            <tr key={o.id}>
              <td>{o.code}</td>
              <td>{o.studentName}<br /><small className="muted">{o.studentPhone}</small></td>
              <td>{o.items.map((i) => `${i.quantity}× ${i.title}`).join(', ')}{o.items.some((i) => i.surprise) && <><br /><small className="muted">🎁 {o.items.filter((i) => i.surprise).map((i) => i.reveal).join(' / ')}</small></>}</td>
              <td>{fmt(o.total)}</td>
              <td><span className={`status ${o.status}`}>{STATUTS[o.status]}</span></td>
              <td>{o.status === 'recuperee'
                ? <span className="scan y" title={o.pickedUpAt ? 'Scanné le ' + new Date((o.pickedUpAt._seconds || o.pickedUpAt.seconds) * 1000).toLocaleString('fr-FR') : ''}>Scanné</span>
                : <span className="scan n">Non scanné</span>}</td>
            </tr>
          ))}
          {!shown.length && <tr><td colSpan="6" className="muted">Aucune commande</td></tr>}
        </tbody>
      </table></div>
    </div>
  );
}
