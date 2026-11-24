// [FARAH] Recherche globale de comptes (étudiants, commerçants, administrateurs) + profils publics
// - Recherche partielle, insensible à la casse et aux accents (nom, prénom, commerce, faculté, localisation)
// - Les informations privées (e-mail, téléphone, statut) ne sont visibles que par l'administrateur
const router = require('express').Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { normalizeImagePath } = require('../utils/upload');

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ROLE_TYPES = ['etudiant', 'commercant', 'admin'];

// Données d'un compte selon qui regarde
function userView(id, u, isAdmin, commerce) {
  const base = {
    id, kind: 'user', role: u.role, name: u.name,
    photoUrl: normalizeImagePath(u.photoUrl), coverUrl: normalizeImagePath(u.coverUrl),
    faculty: u.faculty || '', location: u.location || '',
    commerceId: commerce?.id || null, commerceName: commerce?.name || '',
  };
  if (u.role === 'etudiant') Object.assign(base, { gender: u.gender || '', ecoPoints: u.ecoPoints || 0 });
  if (isAdmin) Object.assign(base, { email: u.email, phone: u.phone, status: u.status, createdAt: u.createdAt || null });
  return base;
}

// GET /api/users/search?q=&type=etudiant|commercant|admin
router.get('/search', verifyToken, requireRole(), async (req, res) => {
  const q = norm(req.query.q).trim();
  const type = ROLE_TYPES.includes(req.query.type) ? req.query.type : '';
  if (q.length < 2) return res.json([]);
  const isAdmin = req.user.role === 'admin';

  // Requêtes ciblées : uniquement le rôle demandé si un filtre est choisi
  const usersQuery = type ? db.collection('users').where('role', '==', type) : db.collection('users');
  const [usersSnap, commercesSnap] = await Promise.all([usersQuery.get(), db.collection('commerces').get()]);
  const commerceByOwner = {};
  commercesSnap.docs.forEach((d) => { commerceByOwner[d.data().ownerId] = { id: d.id, ...d.data() }; });

  const results = [];
  usersSnap.docs.forEach((d) => {
    const u = d.data();
    if (!isAdmin && u.status === 'bloque') return;
    const c = commerceByOwner[d.id];
    const hay = norm([u.name, u.faculty, u.location, c?.name, isAdmin ? u.email : ''].join(' '));
    if (hay.includes(q)) results.push(userView(d.id, u, isAdmin, c));
  });
  // Les commerces validés sont aussi trouvables par leur nom (lien vers leur profil)
  if (!type || type === 'commercant') {
    commercesSnap.docs.forEach((d) => {
      const c = d.data();
      if (!isAdmin && c.status !== 'valide') return;
      if (results.some((r) => r.commerceId === d.id)) return; // déjà présent via son commerçant
      if (norm([c.name, c.address, c.type].join(' ')).includes(q)) {
        results.push({ id: c.ownerId, kind: 'user', role: 'commercant', name: c.name, photoUrl: normalizeImagePath(c.logoUrl), faculty: c.type, location: c.address, commerceId: d.id, commerceName: c.name });
      }
    });
  }
  // Les plus pertinents d'abord : nom qui commence par la recherche
  results.sort((a, b) => (norm(b.name).startsWith(q) - norm(a.name).startsWith(q)) || a.name.localeCompare(b.name));
  res.json(results.slice(0, 20));
});

// GET /api/users/:id  – profil d'un compte (champs filtrés selon le rôle de celui qui consulte)
router.get('/:id', verifyToken, requireRole(), async (req, res) => {
  const snap = await db.collection('users').doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ message: 'Compte introuvable' });
  const u = snap.data();
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && u.status === 'bloque') return res.status(404).json({ message: 'Compte introuvable' });
  const cs = await db.collection('commerces').where('ownerId', '==', snap.id).limit(1).get();
  const c = cs.empty ? null : { id: cs.docs[0].id, ...cs.docs[0].data() };
  const view = userView(snap.id, u, isAdmin, c);
  // Statistiques visibles par l'administrateur
  if (isAdmin && u.role === 'etudiant') {
    const orders = (await db.collection('orders').where('studentId', '==', snap.id).get()).docs.map((d) => d.data());
    view.orders = { total: orders.length, recuperees: orders.filter((o) => o.status === 'recuperee').length };
  }
  res.json(view);
});

module.exports = router;
