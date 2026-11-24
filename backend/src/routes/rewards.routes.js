// [KMAR] EcoPoints : historique + récompense spéciale ComeEat (500 EcoPoints = 1 repas gratuit)
// Règle existante (inchangée) : +10 EcoPoints par article récupéré (après le scan du QR code).
const router = require('express').Router();
const crypto = require('crypto');
const QRCode = require('qrcode');
const { db, FieldValue } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const COMEEAT_COST = 500;
const ts = (x) => x?._seconds || x?.seconds || 0;

// GET /api/rewards/me – solde, historique des points, récompenses
router.get('/me', verifyToken, requireRole('etudiant'), async (req, res) => {
  const [ordersSnap, rewardsSnap] = await Promise.all([
    db.collection('orders').where('studentId', '==', req.uid).get(),
    db.collection('rewards').where('userId', '==', req.uid).get(),
  ]);
  const earned = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .filter((o) => o.status === 'recuperee' && o.ecoPoints)
    .map((o) => ({
      type: 'gain', points: o.ecoPoints, date: o.pickedUpAt || o.createdAt,
      label: `${o.code} · ${o.commerceName} (${o.items.reduce((s, i) => s + i.quantity, 0)} article(s) récupéré(s))`,
    }));
  const rewards = rewardsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => ts(b.createdAt) - ts(a.createdAt));
  const spent = rewards.map((r) => ({ type: 'depense', points: -r.cost, date: r.createdAt, label: `Récompense ComeEat · ${r.code}` }));
  const history = [...earned, ...spent].sort((a, b) => ts(b.date) - ts(a.date));
  const balance = req.user.ecoPoints || 0;
  res.json({
    balance,
    rule: '10 EcoPoints par article récupéré (après le scan du QR code)',
    comeEat: { cost: COMEEAT_COST, unlocked: balance >= COMEEAT_COST, missing: Math.max(0, COMEEAT_COST - balance) },
    history,
    rewards: rewards.map(({ userId, ...r }) => r),
  });
});

// POST /api/rewards/comeeat/claim – réclamer un repas gratuit (déduit 500 EcoPoints)
router.post('/comeeat/claim', verifyToken, requireRole('etudiant'), async (req, res) => {
  const userRef = db.collection('users').doc(req.uid);
  const rewardRef = db.collection('rewards').doc();
  const code = 'CE-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const token = crypto.randomUUID();

  // Transaction : vérifie le solde réel, empêche le solde négatif et les doubles clics
  const reward = await db.runTransaction(async (t) => {
    const snap = await t.get(userRef);
    const balance = snap.data()?.ecoPoints || 0;
    if (balance < COMEEAT_COST) throw Object.assign(new Error(`Solde insuffisant : il vous manque ${COMEEAT_COST - balance} EcoPoints`), { status: 400 });
    const data = {
      userId: req.uid, userName: req.user.name, type: 'comeeat', cost: COMEEAT_COST,
      code, token, status: 'active', createdAt: FieldValue.serverTimestamp(),
    };
    t.update(userRef, { ecoPoints: FieldValue.increment(-COMEEAT_COST) });
    t.set(rewardRef, data);
    return { ...data, balance: balance - COMEEAT_COST };
  });
  const qrCode = await QRCode.toDataURL(`COMEEAT:${token}`, { width: 260, margin: 2 });
  await rewardRef.update({ qrCode });
  const { userId, ...pub } = reward;
  res.status(201).json({ id: rewardRef.id, ...pub, qrCode, message: 'Repas gratuit débloqué 🎉' });
});

// POST /api/rewards/redeem – le commerçant valide un repas ComeEat (QR "COMEEAT:<token>" ou code "CE-XXXXXX")
router.post('/redeem', verifyToken, requireRole('commercant'), async (req, res) => {
  const raw = String(req.body.code || '').trim();
  if (!raw) return res.status(400).json({ message: 'Code ComeEat manquant' });
  const byToken = raw.startsWith('COMEEAT:');
  const q = byToken
    ? db.collection('rewards').where('token', '==', raw.slice(8))
    : db.collection('rewards').where('code', '==', raw.toUpperCase());
  const snap = await q.limit(1).get();
  if (snap.empty) return res.status(404).json({ message: 'Code ComeEat invalide' });
  const ref = snap.docs[0].ref;
  const commerce = await db.collection('commerces').where('ownerId', '==', req.uid).limit(1).get();
  const r = await db.runTransaction(async (t) => {
    const s = await t.get(ref);
    if (s.data().status !== 'active') throw Object.assign(new Error('Ce repas ComeEat a déjà été utilisé'), { status: 400 });
    t.update(ref, { status: 'utilise', usedAt: FieldValue.serverTimestamp(), usedAtCommerceId: commerce.empty ? null : commerce.docs[0].id, usedByMerchantId: req.uid });
    return s.data();
  });
  res.json({ message: `Repas ComeEat validé ✅ (${r.userName} · ${r.code})` });
});

module.exports = router;
