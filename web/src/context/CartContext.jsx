// [YATHREB] Panier (sauvegardé dans le localStorage). Un seul commerce par panier.
import { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext(null);

function load() {
  try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(load); // [{ offer, quantity }]

  useEffect(() => {
    try { localStorage.setItem('cart', JSON.stringify(items)); } catch { /* ignore */ }
  }, [items]);

  const add = (offer, qty = 1) => {
    if (items.length && items[0].offer.commerceId !== offer.commerceId) {
      if (!window.confirm('Votre panier contient des produits d’un autre commerce. Le vider ?')) return false;
      setItems([{ offer, quantity: Math.min(qty, offer.quantity) }]);
      return true;
    }
    setItems((prev) => {
      const found = prev.find((i) => i.offer.id === offer.id);
      if (found) return prev.map((i) => i.offer.id === offer.id ? { ...i, quantity: Math.min(i.quantity + qty, offer.quantity) } : i);
      return [...prev, { offer, quantity: Math.min(qty, offer.quantity) }];
    });
    return true;
  };

  // Quantité incrémentale (+ / -)
  const setQty = (offerId, quantity) => setItems((prev) => prev
    .map((i) => i.offer.id === offerId ? { ...i, quantity: Math.max(0, Math.min(quantity, i.offer.quantity)) } : i)
    .filter((i) => i.quantity > 0));

  const remove = (offerId) => setItems((prev) => prev.filter((i) => i.offer.id !== offerId));
  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.offer.discountPrice * i.quantity, 0);
  const totalInitial = items.reduce((s, i) => s + i.offer.initialPrice * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, add, setQty, remove, clear, total, totalInitial, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
