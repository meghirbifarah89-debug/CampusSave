// [YATHREB] Retour après paiement : vérification du statut + affichage du QR code
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, fmt } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function PaymentResult() {
  const [params] = useSearchParams();
  const { loading: authLoading } = useAuth();
  const orderId = params.get('orderId');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !orderId) return;
    api.get(`/payments/status/${orderId}`).then(setOrder).catch((e) => setError(e.message));
  }, [orderId, authLoading]);

  if (error) return <div className="card center"><p className="error">{error}</p></div>;
  if (!order) return <div className="card center"><p>Vérification du paiement…</p></div>;

  if (order.status === 'payee' || order.status === 'recuperee') {
    return (
      <div className="card center">
        <h2>✅ Paiement confirmé</h2>
        <p>Commande <b>{order.code}</b> – {order.commerceName} – {fmt(order.total)}</p>
        <p>Un e-mail de confirmation a été envoyé à {order.studentEmail}.</p>
        {order.qrCode && <img src={order.qrCode} alt="QR code" className="qr" />}
        <p>Présentez ce QR code entre <b>{order.pickupStart}</b> et <b>{order.pickupEnd}</b>.</p>
        <Link to="/mes-commandes" className="btn">Mes commandes</Link>
      </div>
    );
  }
  return (
    <div className="card center">
      <h2>❌ Paiement non abouti</h2>
      <p>Votre commande {order.code} est toujours en attente de paiement.</p>
      <Link to="/mes-commandes" className="btn">Réessayer depuis mes commandes</Link>
    </div>
  );
}
