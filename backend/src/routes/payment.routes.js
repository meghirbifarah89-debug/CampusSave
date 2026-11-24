// [KMAR] Paiement : webhook Konnect, vérification du statut et page de SIMULATION (mode test)
const router = require('express').Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { getPaymentStatus, isMock } = require('../services/konnect');
const { confirmOrderPayment } = require('../services/orderService');

// Webhook appelé par Konnect : GET /api/payments/webhook?payment_ref=xxx
router.get('/webhook', async (req, res) => {
  try {
    const ref = req.query.payment_ref;
    const snap = await db.collection('orders').where('paymentRef', '==', ref).limit(1).get();
    if (snap.empty) return res.status(404).send('Commande introuvable');
    if ((await getPaymentStatus(ref)) === 'completed') await confirmOrderPayment(snap.docs[0].id);
    res.send('OK');
  } catch (e) {
    console.error(e);
    res.status(500).send('Erreur');
  }
});

// Vérification du statut (appelée par React / Flutter après retour de la page de paiement).
// Indispensable en local car Konnect ne peut pas joindre "localhost" pour le webhook.
router.get('/status/:orderId', verifyToken, requireRole('etudiant'), async (req, res, next) => {
  try {
    const ref = db.collection('orders').doc(req.params.orderId);
    let snap = await ref.get();
    if (!snap.exists || snap.data().studentId !== req.uid) return res.status(404).json({ message: 'Commande introuvable' });
    const o = snap.data();
    if (o.status === 'en_attente_paiement' && o.paymentRef && !isMock()) {
      if ((await getPaymentStatus(o.paymentRef)) === 'completed') await confirmOrderPayment(ref.id);
      snap = await ref.get();
    }
    const { mockSecret, ...data } = snap.data();
    // le contenu d'un panier surprise reste caché jusqu'au retrait
    if (data.status !== 'recuperee') data.items = (data.items || []).map(({ reveal, ...i }) => i);
    res.json({ id: snap.id, ...data });
  } catch (e) { next(e); }
});

// ---------- MODE SIMULATION (sans compte Konnect) : fausse page de paiement
router.get('/mock/:orderId', async (req, res) => {
  const snap = await db.collection('orders').doc(req.params.orderId).get();
  if (!snap.exists || snap.data().mockSecret !== req.query.s) return res.status(404).send('Lien invalide');
  const o = snap.data();
  res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Paiement test</title><style>body{font-family:Arial;background:#f4f6f8;display:flex;justify-content:center;padding:40px}
  .c{background:#fff;padding:28px;border-radius:12px;max-width:380px;width:100%;box-shadow:0 4px 18px #0001}
  button{width:100%;padding:12px;border:0;border-radius:8px;font-size:16px;margin-top:10px;cursor:pointer}
  .p{background:#2e7d32;color:#fff}.a{background:#eee}input{width:100%;padding:10px;margin:6px 0;box-sizing:border-box}</style></head>
  <body><form class="c" method="post">
  <h2>🔒 Paiement sécurisé (TEST)</h2><p>Commande <b>${o.code}</b> – ${o.commerceName}</p>
  <h1>${o.total.toFixed(3)} DT</h1>
  <input value="4242 4242 4242 4242" readonly><input value="12/30   CVC 123" readonly>
  <input type="hidden" name="s" value="${o.mockSecret}">
  <button class="p" name="action" value="pay">Payer</button>
  <button class="a" name="action" value="fail">Annuler</button></form></body></html>`);
});

router.post('/mock/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const snap = await db.collection('orders').doc(orderId).get();
    if (!snap.exists || snap.data().mockSecret !== req.body.s) return res.status(404).send('Lien invalide');
    const front = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (req.body.action === 'pay') {
      await confirmOrderPayment(orderId);
      return res.redirect(`${front}/paiement/resultat?orderId=${orderId}`);
    }
    res.redirect(`${front}/paiement/resultat?orderId=${orderId}&echec=1`);
  } catch (e) { next(e); }
});

module.exports = router;
