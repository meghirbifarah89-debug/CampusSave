// [KMAR] Intégration du paiement électronique Konnect (mode TEST / sandbox)
// Doc : https://docs.konnect.network  —  Si KONNECT_API_KEY est vide => mode SIMULATION
const BASE = process.env.KONNECT_BASE_URL || 'https://api.sandbox.konnect.network/api/v2';

const isMock = () => !process.env.KONNECT_API_KEY || !process.env.KONNECT_WALLET_ID;

// Crée une session de paiement et renvoie { payUrl, paymentRef }
async function initPayment({ amountTND, orderId, description, firstName, lastName, email, phoneNumber, mockSecret }) {
  if (isMock()) {
    const backend = process.env.BACKEND_URL || 'http://localhost:5000';
    return {
      payUrl: `${backend}/api/payments/mock/${orderId}?s=${mockSecret}`,
      paymentRef: 'MOCK-' + orderId,
    };
  }

  const res = await fetch(`${BASE}/payments/init-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.KONNECT_API_KEY },
    body: JSON.stringify({
      receiverWalletId: process.env.KONNECT_WALLET_ID,
      token: 'TND',
      amount: Math.round(amountTND * 1000), // Konnect attend des millimes
      type: 'immediate',
      description,
      acceptedPaymentMethods: ['wallet', 'bank_card', 'e-DINAR'],
      lifespan: 15, // minutes
      checkoutForm: false,
      addPaymentFeesToAmount: false,
      firstName, lastName, phoneNumber, email,
      orderId,
      webhook: `${process.env.BACKEND_URL}/api/payments/webhook`,
      successUrl: `${process.env.FRONTEND_URL}/paiement/resultat?orderId=${orderId}`,
      failUrl: `${process.env.FRONTEND_URL}/paiement/resultat?orderId=${orderId}&echec=1`,
      theme: 'light',
    }),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error('Konnect : ' + (data.errors?.[0]?.message || data.message || res.status)), { status: 502 });
  return { payUrl: data.payUrl, paymentRef: data.paymentRef };
}

// Vérifie l'état d'un paiement auprès de Konnect -> 'completed' | 'pending' | 'failed'
async function getPaymentStatus(paymentRef) {
  if (isMock()) return null; // en simulation, la confirmation se fait via /mock
  const res = await fetch(`${BASE}/payments/${paymentRef}`, {
    headers: { 'x-api-key': process.env.KONNECT_API_KEY },
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Konnect : impossible de vérifier le paiement');
  return data.payment?.status; // 'completed' quand le paiement est réussi
}

module.exports = { initPayment, getPaymentStatus, isMock };
