// [KMAR] Intégration du paiement électronique DHMAD (Charges API)
// Doc : https://docs.dhmad.tn  —  sandbox : https://sandbox.dhmad.tn/api/v1 (clé sk_sandbox_...)
const BASE = () => (process.env.DHMAD_BASE_URL || 'https://sandbox.dhmad.tn/api/v1').replace(/\/$/, '');

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${process.env.DHMAD_API_KEY}`,
});

async function call(path, options = {}) {
  if (!process.env.DHMAD_API_KEY) throw Object.assign(new Error('DHMAD_API_KEY manquante dans .env'), { status: 500 });
  const res = await fetch(`${BASE()}${path}`, { ...options, headers: headers() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.message || data.error || `HTTP ${res.status}`;
    throw Object.assign(new Error('DHMAD : ' + msg), { status: res.status === 404 ? 404 : 502 });
  }
  return data;
}

// Crée un lien de paiement (charge) et renvoie { payUrl, paymentRef }
// merchantReference = id de la commande : rappeler avec la même référence renvoie la même charge
// (et un nouveau lien si l'ancien a expiré).
async function initPayment({ amountTND, orderId, description, email }) {
  const front = process.env.FRONTEND_URL || 'http://localhost:5173';
  const data = await call('/charges', {
    method: 'POST',
    body: JSON.stringify({
      title: description,
      amount: Number(Number(amountTND).toFixed(3)),
      currency: 'TND',
      merchantReference: orderId,
      redirectUrl: `${front}/paiement/resultat?orderId=${orderId}`,
      ...(email ? { receiptEmail: email } : {}),
      metadata: { orderId: String(orderId) },
    }),
  });
  return { payUrl: data.charge.url, paymentRef: data.charge.id };
}

// Statut d'une charge (par id DHMAD ou par merchantReference) : 'pending' | 'completed' | ...
async function getPaymentStatus(ref) {
  const data = await call(`/charges/${encodeURIComponent(ref)}`);
  return data.charge?.status;
}

const isPaid = (status) => status === 'completed' || status === 'paid';

module.exports = { initPayment, getPaymentStatus, isPaid };
