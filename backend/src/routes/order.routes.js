// [KMAR] Réservations / commandes + validation du QR code au retrait
const router = require('express').Router();
const crypto = require('crypto');
const { db, FieldValue } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { isPositiveInt } = require('../utils/validate');
const { initPayment } = require('../services/konnect');
const { cancelOrder } = require('../services/orderService');
const { notifyUser } = require('../services/notify');
const { normalizeImagePath } = require('../utils/upload');

const ECO_POINTS_PAR_ARTICLE = 10;

// ---------- Créer une commande à partir du panier
// body : { items: [{ offerId, quantity }] }  (tous les produits doivent venir du même commerce)
router.post('/', verifyToken, requireRole('etudiant'), async (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) return res.status(400).json({ message: 'Panier vide' });
  if (items.some((i) => !i.offerId || !isPositiveInt(i.quantity))) return res.status(400).json({ message: 'Quantités invalides' });

  const orderRef = db.collection('orders').doc();
  const code = 'CS-' + Date.now().toString(36).toUpperCase().slice(-6);

  try {
    const order = await db.runTransaction(async (t) => {
      const refs = items.map((i) => db.collection('offers').doc(i.offerId));
      const snaps = await Promise.all(refs.map((r) => t.get(r)));

      let total = 0, totalInitial = 0, commerceId = null;
      const lines = snaps.map((s, idx) => {
        if (!s.exists || s.data().status !== 'active') throw Object.assign(new Error('Offre indisponible'), { status: 400 });
        const o = s.data();
        const qty = Number(items[idx].quantity);
        if (o.quantity < qty) throw Object.assign(new Error(`Stock insuffisant pour "${o.title}" (reste ${o.quantity})`), { status: 400 });
        if (commerceId && commerceId !== o.commerceId) throw Object.assign(new Error('Le panier doit contenir les produits d’un seul commerce'), { status: 400 });
        commerceId = o.commerceId;
        total += o.discountPrice * qty;
        totalInitial += o.initialPrice * qty;
        return {
          offerId: s.id, title: o.title, quantity: qty, unitPrice: o.discountPrice, initialPrice: o.initialPrice, photoUrl: normalizeImagePath(o.photoUrl), _o: o,
          // [KMAR] panier surprise : le contenu est copié dans la commande mais caché à l'étudiant jusqu'au retrait
          ...(o.category === 'panier-surprise' ? { surprise: true, surpriseKind: o.surpriseKind || null, allergens: o.allergens || '', reveal: o.revealContent || '' } : {}),
        };
      });

      // Réservation : on décrémente le stock immédiatement
      lines.forEach((l, idx) => t.update(refs[idx], { quantity: FieldValue.increment(-l.quantity) }));

      const first = lines[0]._o;
      const data = {
        code,
        studentId: req.uid, studentName: req.user.name, studentEmail: req.user.email, studentPhone: req.user.phone,
        commerceId, commerceName: first.commerceName, merchantId: first.ownerId,
        items: lines.map(({ _o, ...l }) => l),
        total: Math.round(total * 1000) / 1000,
        saved: Math.round((totalInitial - total) * 1000) / 1000,
        pickupStart: first.pickupStart, pickupEnd: first.pickupEnd,
        status: 'en_attente_paiement',
        mockSecret: crypto.randomBytes(8).toString('hex'),
        createdAt: FieldValue.serverTimestamp(),
      };
      t.set(orderRef, data);
      return data;
    });
    const { mockSecret, ...publicOrder } = order;
    res.status(201).json({ id: orderRef.id, ...publicOrder });
  } catch (e) {
    res.status(e.status || 500).json({ message: e.message });
  }
});

// ---------- Lancer le paiement en ligne (Konnect) -> renvoie l'URL de paiement
router.post('/:id/pay', verifyToken, requireRole('etudiant'), async (req, res, next) => {
  try {
    const ref = db.collection('orders').doc(req.params.id);
    const snap = await ref.get();
    if (!snap.exists || snap.data().studentId !== req.uid) return res.status(404).json({ message: 'Commande introuvable' });
    const o = snap.data();
    if (o.status !== 'en_attente_paiement') return res.status(400).json({ message: 'Commande déjà ' + o.status });

    const [firstName, ...rest] = (o.studentName || 'Etudiant').split(' ');
    const { payUrl, paymentRef } = await initPayment({
      amountTND: o.total, orderId: ref.id, description: `CampusSave ${o.code} - ${o.commerceName}`,
      firstName, lastName: rest.join(' ') || firstName, email: o.studentEmail, phoneNumber: o.studentPhone,
      mockSecret: o.mockSecret,
    });
    await ref.update({ paymentRef, paymentProvider: 'konnect' });
    res.json({ payUrl, paymentRef });
  } catch (e) { next(e); }
});

// ---------- Annuler une commande non payée (remise en stock)
router.put('/:id/cancel', verifyToken, requireRole('etudiant'), async (req, res, next) => {
  try {
    const snap = await db.collection('orders').doc(req.params.id).get();
    if (!snap.exists || snap.data().studentId !== req.uid) return res.status(404).json({ message: 'Commande introuvable' });
    await cancelOrder(req.params.id);
    res.json({ message: 'Commande annulée' });
  } catch (e) { next(e); }
});

const clean = (d) => { const { mockSecret, ...o } = d.data(); return { id: d.id, ...o }; };
// Pour l'étudiant : le contenu d'un panier surprise n'est révélé qu'après le scan du QR code
const hideSurprise = (o) => o.status === 'recuperee' ? o : { ...o, items: o.items.map(({ reveal, ...i }) => i) };
const byDateDesc = (a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0);

// ---------- Mes commandes (étudiant)
router.get('/mine', verifyToken, requireRole('etudiant'), async (req, res) => {
  const snap = await db.collection('orders').where('studentId', '==', req.uid).get();
  res.json(snap.docs.map(clean).map(hideSurprise).sort(byDateDesc));
});

// ---------- Commandes reçues (commerçant)
router.get('/merchant', verifyToken, requireRole('commercant'), async (req, res) => {
  const snap = await db.collection('orders').where('merchantId', '==', req.uid).get();
  res.json(snap.docs.map(clean).map(({ qrToken, qrCode, ...o }) => o).sort(byDateDesc));
});

// ---------- Détail d'une commande
router.get('/:id', verifyToken, requireRole(), async (req, res) => {
  const snap = await db.collection('orders').doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ message: 'Commande introuvable' });
  const o = clean(snap);
  const allowed = o.studentId === req.uid || o.merchantId === req.uid || req.user.role === 'admin';
  if (!allowed) return res.status(403).json({ message: 'Accès refusé' });
  res.json(o.studentId === req.uid ? hideSurprise(o) : o);
});

// ---------- Validation du QR code au moment du retrait (commerçant)
// body : { qr: "CAMPUSSAVE:<token>" } ou { qr: "<token>" }
router.post('/verify-qr', verifyToken, requireRole('commercant'), async (req, res) => {
  const raw = String(req.body.qr || '').trim();
  const token = raw.startsWith('CAMPUSSAVE:') ? raw.slice(11) : raw;
  if (!token) return res.status(400).json({ message: 'QR code manquant' });

  const snap = await db.collection('orders').where('qrToken', '==', token).limit(1).get();
  if (snap.empty) return res.status(404).json({ message: 'QR code invalide' });
  const doc = snap.docs[0];
  const o = doc.data();
  if (o.merchantId !== req.uid) return res.status(403).json({ message: 'Cette commande ne concerne pas votre commerce' });
  if (o.status === 'recuperee') return res.status(400).json({ message: 'Commande déjà récupérée' });
  if (o.status !== 'payee') return res.status(400).json({ message: 'Commande non payée' });

  const nbArticles = o.items.reduce((s, i) => s + i.quantity, 0);
  const points = nbArticles * ECO_POINTS_PAR_ARTICLE;
  const batch = db.batch();
  batch.update(doc.ref, { status: 'recuperee', pickedUpAt: FieldValue.serverTimestamp(), ecoPoints: points });
  batch.update(db.collection('users').doc(o.studentId), { ecoPoints: FieldValue.increment(points) }); // Bonus EcoPoints
  await batch.commit();

  notifyUser(o.studentId, 'Commande récupérée 🎉', `+${points} EcoPoints ! Merci d’avoir sauvé ${nbArticles} repas.`);
  res.json({ message: 'Commande validée ✅', order: { id: doc.id, code: o.code, studentName: o.studentName, items: o.items, total: o.total, ecoPoints: points } });
});

module.exports = router;
