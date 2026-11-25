// [KMAR] Paiement DHMAD : webhook + vérification du statut au retour de la page de paiement
const router = require('express').Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { getPaymentStatus, isPaid } = require('../services/dhmad');
const { confirmOrderPayment } = require('../services/orderService');

// Vérifie la charge auprès de DHMAD et confirme la commande si elle est payée.
// (On ne fait jamais confiance au contenu reçu : on redemande toujours le statut à l'API DHMAD.)
async function syncOrder(orderId) {
  const ref = db.collection('orders').doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const o = snap.data();
  if (o.status === 'en_attente_paiement' && o.paymentProvider === 'dhmad') {
    if (isPaid(await getPaymentStatus(orderId))) await confirmOrderPayment(orderId);
  }
  return ref.get();
}

// Webhook DHMAD (événement charge.status.updated) : POST /api/payments/webhook
// En local, DHMAD ne peut pas joindre localhost : c'est alors la route /status qui confirme.
router.post('/webhook', async (req, res) => {
  try {
    const b = req.body || {};
    const c = b.data?.charge || b.charge || b.data || b;
    const orderId = c.merchantReference || c.metadata?.orderId;
    if (orderId) await syncOrder(String(orderId));
    res.json({ received: true });
  } catch (e) {
    console.error('Webhook DHMAD :', e.message);
    res.status(500).json({ received: false });
  }
});

// Vérification du statut (appelée par React / Flutter après retour de la page de paiement).
router.get('/status/:orderId', verifyToken, requireRole('etudiant'), async (req, res, next) => {
  try {
    const first = await db.collection('orders').doc(req.params.orderId).get();
    if (!first.exists || first.data().studentId !== req.uid) return res.status(404).json({ message: 'Commande introuvable' });
    const snap = await syncOrder(first.id);
    const { mockSecret, ...data } = snap.data();
    // le contenu d'un panier surprise reste caché jusqu'au retrait
    if (data.status !== 'recuperee') data.items = (data.items || []).map(({ reveal, ...i }) => i);
    res.json({ id: snap.id, ...data });
  } catch (e) { next(e); }
});

module.exports = router;
