// [KMAR] Tableaux de bord : statistiques étudiant / commerçant / administrateur (+ Impact Dashboard)
const router = require('express').Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

const PAID = ['payee', 'recuperee'];
const KG_PAR_REPAS = 0.4;   // estimation du poids moyen d'un repas
const CO2_PAR_KG = 2.5;     // kg de CO2 évités par kg de nourriture sauvée
const r3 = (n) => Math.round(n * 1000) / 1000;
const count = (arr, key) => arr.reduce((acc, x) => ((acc[x[key]] = (acc[x[key]] || 0) + 1), acc), {});
const items = (orders) => orders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0), 0);

function impact(orders) {
  const repas = items(orders.filter((o) => o.status === 'recuperee'));
  return { repasSauves: repas, kgSauves: r3(repas * KG_PAR_REPAS), co2Evite: r3(repas * KG_PAR_REPAS * CO2_PAR_KG) };
}

// Ventes des 7 derniers jours (pour les graphiques)
function last7Days(orders) {
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });
  return days.map((day) => ({
    day,
    total: r3(orders.filter((o) => PAID.includes(o.status) && o.createdAt &&
      new Date(o.createdAt._seconds * 1000).toISOString().slice(0, 10) === day).reduce((s, o) => s + o.total, 0)),
  }));
}

router.get('/student', verifyToken, requireRole('etudiant'), async (req, res) => {
  const orders = (await db.collection('orders').where('studentId', '==', req.uid).get()).docs.map((d) => d.data());
  const paid = orders.filter((o) => PAID.includes(o.status));
  res.json({
    commandes: orders.length,
    commandesPayees: paid.length,
    totalDepense: r3(paid.reduce((s, o) => s + o.total, 0)),
    totalEconomise: r3(paid.reduce((s, o) => s + (o.saved || 0), 0)),
    ecoPoints: req.user.ecoPoints || 0,
    parStatut: count(orders, 'status'),
    impact: impact(orders),
    depenses7j: last7Days(orders),
  });
});

router.get('/merchant', verifyToken, requireRole('commercant'), async (req, res) => {
  const [offersSnap, ordersSnap] = await Promise.all([
    db.collection('offers').where('ownerId', '==', req.uid).get(),
    db.collection('orders').where('merchantId', '==', req.uid).get(),
  ]);
  const offers = offersSnap.docs.map((d) => d.data());
  const orders = ordersSnap.docs.map((d) => d.data());
  const paid = orders.filter((o) => PAID.includes(o.status));

  const ventes = {};
  paid.forEach((o) => o.items.forEach((i) => (ventes[i.title] = (ventes[i.title] || 0) + i.quantity)));
  const topOffres = Object.entries(ventes).map(([title, qte]) => ({ title, qte })).sort((a, b) => b.qte - a.qte).slice(0, 5);

  res.json({
    offres: offers.length,
    offresActives: offers.filter((o) => o.status === 'active' && o.quantity > 0).length,
    commandes: orders.length,
    aRecuperer: orders.filter((o) => o.status === 'payee').length,
    chiffreAffaires: r3(paid.reduce((s, o) => s + o.total, 0)),
    articlesVendus: items(paid),
    parStatut: count(orders, 'status'),
    topOffres,
    impact: impact(orders),
    ventes7j: last7Days(orders),
  });
});

router.get('/admin', verifyToken, requireRole('admin'), async (req, res) => {
  const [u, c, of, or] = await Promise.all(['users', 'commerces', 'offers', 'orders'].map((n) => db.collection(n).get()));
  const users = u.docs.map((d) => d.data());
  const commerces = c.docs.map((d) => d.data());
  const orders = or.docs.map((d) => d.data());
  const paid = orders.filter((o) => PAID.includes(o.status));
  res.json({
    utilisateurs: users.length,
    parRole: count(users, 'role'),
    commerces: commerces.length,
    commercesParStatut: count(commerces, 'status'),
    offres: of.size,
    commandes: orders.length,
    commandesParStatut: count(orders, 'status'),
    volumePaiements: r3(paid.reduce((s, o) => s + o.total, 0)),
    impact: impact(orders),
    ventes7j: last7Days(orders),
  });
});

module.exports = router;
