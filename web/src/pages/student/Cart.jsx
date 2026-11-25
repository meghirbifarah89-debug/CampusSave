// [YATHREB] Panier : quantités incrémentales, total, réservation et paiement en ligne
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { api, fmt, SURPRISE_KINDS } from '../../services/api';

export default function Cart() {
  const { items, setQty, remove, clear, total, totalInitial } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const checkout = async () => {
    setBusy(true);
    setError('');
    try {
      // 1) Réservation (création de la commande + blocage du stock)
      const order = await api.post('/orders', { items: items.map((i) => ({ offerId: i.offer.id, quantity: i.quantity })) });
      // 2) Initialisation du paiement DHMAD
      const { payUrl } = await api.post(`/orders/${order.id}/pay`);
      clear();
      // 3) Redirection vers la page de paiement sécurisée
      window.location.href = payUrl;
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  if (!items.length) return <div className="card center"><h2>Votre panier est vide</h2><Link to="/offres" className="btn">Voir les offres</Link></div>;

  return (
    <div className="card">
      <h2>Mon panier – {items[0].offer.commerceName}</h2>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Produit</th><th>Prix unitaire</th><th>Quantité</th><th>Sous-total</th><th /></tr></thead>
        <tbody>
          {items.map(({ offer, quantity }) => (
            <tr key={offer.id}>
              <td>{offer.category === 'panier-surprise' ? <>Panier surprise · {SURPRISE_KINDS[offer.surpriseKind]}<br /><small className="muted">contenu révélé au retrait</small></> : offer.title}</td>
              <td>{fmt(offer.discountPrice)}</td>
              <td>
                <div className="qty">
                  <button onClick={() => setQty(offer.id, quantity - 1)}>−</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQty(offer.id, quantity + 1)} disabled={quantity >= offer.quantity}>+</button>
                </div>
              </td>
              <td>{fmt(offer.discountPrice * quantity)}</td>
              <td><button className="btn-link danger" onClick={() => remove(offer.id)}>Retirer</button></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      <div className="summary">
        <p>Prix normal : <s>{fmt(totalInitial)}</s></p>
        <p className="eco">Vous économisez {fmt(totalInitial - total)}</p>
        <h3>Total à payer : {fmt(total)}</h3>
        {error && <p className="error">{error}</p>}
        <button className="btn big" onClick={checkout} disabled={busy}>{busy ? 'Redirection…' : '💳 Payer en ligne'}</button>
        <p className="muted">Paiement sécurisé via DHMAD.</p>
      </div>
    </div>
  );
}
