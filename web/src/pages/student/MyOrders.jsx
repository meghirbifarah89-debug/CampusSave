// [YATHREB] Historique des commandes de l'étudiant (QR code, paiement, annulation)
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmt, STATUTS, SURPRISE_KINDS } from '../../services/api';

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState(null);
  const [msg, setMsg] = useState('');

  const load = () => api.get('/orders/mine').then(setOrders).catch((e) => setMsg(e.message));
  useEffect(() => { load(); }, []);

  const pay = async (id) => {
    try { window.location.href = (await api.post(`/orders/${id}/pay`)).payUrl; } catch (e) { setMsg(e.message); }
  };
  const cancel = async (id) => {
    if (!window.confirm('Annuler cette commande ?')) return;
    try { await api.put(`/orders/${id}/cancel`); load(); } catch (e) { setMsg(e.message); }
  };

  return (
    <div>
      <div className="sec-head"><div><h2>Mes commandes</h2><p>Montre ton QR code au commerçant pendant le créneau de retrait.</p></div></div>
      {msg && <p className="error">{msg}</p>}
      {orders.length === 0 && <p className="muted">Aucune commande pour le moment.</p>}
      {orders.map((o) => (
        <div key={o.id} className="card order">
          <div className="row">
            <div>
              <b>{o.code}</b> – <Link to={`/commerces/${o.commerceId}`}>{o.commerceName}</Link><br />
              <span className="muted">{o.items.map((i) => `${i.quantity}× ${i.surprise ? `Panier surprise (${(SURPRISE_KINDS[i.surpriseKind] || '').toLowerCase()})` : i.title}`).join(', ')}</span>
              {o.items.filter((i) => i.surprise).map((i) => o.status === 'recuperee'
                ? <div key={i.offerId} className="reveal">🎁 <b>Il y avait :</b> {i.reveal || '—'}<br /><small className="muted">Valeur annoncée {fmt(i.initialPrice * i.quantity)} · payé {fmt(i.unitPrice * i.quantity)}</small></div>
                : o.status !== 'annulee' && <p key={i.offerId} className="note">🎁 Contenu caché jusqu’au scan du QR code.</p>)}
            </div>
            <div className="right">
              <span className={`status ${o.status}`}>{STATUTS[o.status]}</span><br />
              <b>{fmt(o.total)}</b>
            </div>
          </div>
          <div className="row actions">
            {o.status === 'en_attente_paiement' && <>
              <button className="btn" onClick={() => pay(o.id)}>💳 Payer</button>
              <button className="btn outline" onClick={() => cancel(o.id)}>Annuler</button>
            </>}
            {o.status === 'payee' && <button className="btn" onClick={() => setOpen(open === o.id ? null : o.id)}>📱 Afficher le QR code</button>}
            {o.status === 'recuperee' && <><span className="eco">🌱 +{o.ecoPoints} EcoPoints</span><Link className="btn ghost sm" to={`/commerces/${o.commerceId}`}>★ Noter ce commerce</Link></>}
          </div>
          {open === o.id && o.qrCode && (
            <div className="center">
              <img src={o.qrCode} className="qr" alt="QR code" />
              <p>Retrait entre {o.pickupStart} et {o.pickupEnd}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
