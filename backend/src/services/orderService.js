// [KMAR] Logique métier des commandes : confirmation du paiement, QR code, annulation
const crypto = require('crypto');
const QRCode = require('qrcode');
const { db, FieldValue } = require('../config/firebase');
const { sendPaymentConfirmation } = require('./mailer');
const { notifyUser } = require('./notify');

// Appelée quand le paiement est réussi (webhook Konnect, vérification ou simulation)
// Idempotente : ne fait rien si la commande est déjà payée.
async function confirmOrderPayment(orderId) {
  const ref = db.collection('orders').doc(orderId);
  const qrToken = crypto.randomUUID();

  const order = await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    if (!snap.exists) throw new Error('Commande introuvable');
    const o = snap.data();
    if (o.status !== 'en_attente_paiement') return null; // déjà traitée
    t.update(ref, { status: 'payee', paidAt: FieldValue.serverTimestamp(), qrToken });
    return { id: snap.id, ...o, status: 'payee', qrToken };
  });
  if (!order) return (await ref.get()).data();

  // Génération du QR code (contenu : identifiant unique de retrait)
  const qrDataUrl = await QRCode.toDataURL(`CAMPUSSAVE:${qrToken}`, { width: 300, margin: 2 });
  await ref.update({ qrCode: qrDataUrl });
  order.qrCode = qrDataUrl;

  // E-mail + notifications (les erreurs n'annulent pas le paiement)
  sendPaymentConfirmation(order, qrDataUrl).catch((e) => console.warn('Mail :', e.message));
  notifyUser(order.studentId, 'Paiement confirmé ✅', `Commande ${order.code} payée. Votre QR code est prêt.`, { orderId });
  notifyUser(order.merchantId, 'Nouvelle commande payée 🛒', `${order.studentName} – ${order.total.toFixed(3)} DT`, { orderId });

  return order;
}

// Annule une commande non payée et remet les quantités en stock
async function cancelOrder(orderId, reason = 'annulee') {
  const ref = db.collection('orders').doc(orderId);
  await db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const o = snap.exists ? snap.data() : {};
    if (o.status !== 'en_attente_paiement') throw Object.assign(new Error('Commande non annulable'), { status: 400 });
    const offerRefs = o.items.map((i) => db.collection('offers').doc(i.offerId));
    const offerSnaps = await Promise.all(offerRefs.map((r) => t.get(r)));
    offerSnaps.forEach((s, idx) => {
      if (s.exists) t.update(s.ref, { quantity: FieldValue.increment(o.items[idx].quantity) });
    });
    t.update(ref, { status: reason, cancelledAt: FieldValue.serverTimestamp() });
  });
}

module.exports = { confirmOrderPayment, cancelOrder };
