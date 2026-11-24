// [FARAH] Espace administrateur : utilisateurs, validation des commerces, supervision
const router = require('express').Router();
const { db } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken, requireRole('admin'));

// Tous les utilisateurs
router.get('/users', async (req, res) => {
  const snap = await db.collection('users').get();
  res.json(snap.docs.map((d) => {
    const { fcmTokens, ...u } = d.data();
    return { id: d.id, ...u };
  }));
});

// Bloquer / débloquer un utilisateur
router.put('/users/:id/status', async (req, res) => {
  const { status } = req.body;
  if (!['actif', 'bloque'].includes(status)) return res.status(400).json({ message: 'Statut invalide' });
  if (req.params.id === req.uid) return res.status(400).json({ message: 'Impossible de vous bloquer vous-même' });
  await db.collection('users').doc(req.params.id).update({ status });
  res.json({ message: 'Statut mis à jour' });
});

// Commerces (filtrables par statut : en_attente, valide, refuse)
router.get('/commerces', async (req, res) => {
  let q = db.collection('commerces');
  if (req.query.status) q = q.where('status', '==', req.query.status);
  const snap = await q.get();
  res.json(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
});

// Valider / refuser un commerce
router.put('/commerces/:id/validate', async (req, res) => {
  const { status } = req.body;
  if (!['valide', 'refuse'].includes(status)) return res.status(400).json({ message: 'Statut invalide' });
  const ref = db.collection('commerces').doc(req.params.id);
  if (!(await ref.get()).exists) return res.status(404).json({ message: 'Commerce introuvable' });
  await ref.update({ status });
  res.json({ message: 'Commerce ' + (status === 'valide' ? 'validé' : 'refusé') });
});

module.exports = router;
