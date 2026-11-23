// [FARAH] Authentification & profils
// L'inscription / connexion se fait côté client avec Firebase Authentication.
// Ensuite le client appelle POST /api/auth/register pour créer le profil (rôle) dans Firestore.
const router = require('express').Router();
const { db, auth, FieldValue } = require('../config/firebase');
const { cancelOrder } = require('../services/orderService');
const { verifyToken, requireRole } = require('../middleware/auth');
const { isNonEmpty, isPhoneTN, check } = require('../utils/validate');
const { uploadImages, fileOf, publicPath, normalizeImagePath } = require('../utils/upload');

const GENDERS = ['femme', 'homme', 'non_precise'];

// Créer le profil après l'inscription Firebase
router.post('/register', verifyToken, async (req, res) => {
  const { name, phone, role } = req.body;
  const errors = check([
    [isNonEmpty(name), 'Le nom est obligatoire'],
    [isPhoneTN(phone || ''), 'Téléphone invalide (8 chiffres)'],
    [['etudiant', 'commercant'].includes(role), 'Rôle invalide'],
  ]);
  if (errors.length) return res.status(400).json({ message: errors.join(', '), errors });

  const ref = db.collection('users').doc(req.uid);
  if ((await ref.get()).exists) return res.status(409).json({ message: 'Profil déjà existant' });

  const user = {
    name: name.trim(),
    email: req.email,
    phone: phone.replace(/\s/g, ''),
    role, // 'etudiant' | 'commercant' | 'admin' (admin créé via script)
    status: 'actif',
    ecoPoints: 0,
    fcmTokens: [],
    createdAt: FieldValue.serverTimestamp(),
  };
  await ref.set(user);
  res.status(201).json({ id: req.uid, ...user });
});

// Profil de l'utilisateur connecté
router.get('/me', verifyToken, requireRole(), (req, res) => {
  const { fcmTokens, ...u } = req.user;
  res.json({ ...u, photoUrl: normalizeImagePath(u.photoUrl), coverUrl: normalizeImagePath(u.coverUrl) });
});

// Modifier son profil (JSON ou multipart avec une photo "photo")
// [YATHREB] nouveaux champs : faculté, localisation, sexe, photo de profil
router.put('/me', verifyToken, requireRole(), uploadImages(['photo', 'cover']), async (req, res) => {
  const { name, phone, faculty, location, gender } = req.body;
  const errors = check([
    [name === undefined || isNonEmpty(name), 'Nom invalide'],
    [phone === undefined || isPhoneTN(phone), 'Téléphone invalide'],
    [faculty === undefined || String(faculty).length <= 120, 'Faculté : 120 caractères maximum'],
    [location === undefined || String(location).length <= 120, 'Localisation : 120 caractères maximum'],
    [gender === undefined || gender === '' || GENDERS.includes(gender), 'Sexe invalide'],
  ]);
  if (errors.length) return res.status(400).json({ message: errors.join(', ') });

  const data = {};
  if (name) data.name = name.trim();
  if (phone) data.phone = phone.replace(/\s/g, '');
  if (faculty !== undefined) data.faculty = String(faculty).trim();
  if (location !== undefined) data.location = String(location).trim();
  if (gender !== undefined) data.gender = gender;
  if (fileOf(req, 'photo')) data.photoUrl = publicPath(fileOf(req, 'photo'));
  if (fileOf(req, 'cover')) data.coverUrl = publicPath(fileOf(req, 'cover'));
  if (req.body.removeCover === 'true') data.coverUrl = '';
  await db.collection('users').doc(req.uid).update(data);
  // le nom/photo affichés sur les avis restent à jour
  if (data.name || data.photoUrl) {
    const reviews = await db.collection('reviews').where('studentId', '==', req.uid).get();
    if (!reviews.empty) {
      const batch = db.batch();
      reviews.docs.forEach((d) => batch.update(d.ref, { ...(data.name && { studentName: data.name }), ...(data.photoUrl && { studentPhotoUrl: data.photoUrl }) }));
      await batch.commit();
    }
  }
  const { fcmTokens, ...u } = { ...req.user, ...data };
  res.json({ ...u, photoUrl: normalizeImagePath(u.photoUrl), coverUrl: normalizeImagePath(u.coverUrl) });
});

// Enregistrer le token FCM (notifications push) de l'appareil
router.put('/me/fcm-token', verifyToken, requireRole(), async (req, res) => {
  if (!isNonEmpty(req.body.token)) return res.status(400).json({ message: 'Token FCM manquant' });
  await db.collection('users').doc(req.uid).update({ fcmTokens: FieldValue.arrayUnion(req.body.token) });
  res.json({ message: 'Token enregistré' });
});

// ---------- Supprimer son compte : DELETE /api/auth/me
// Étudiant : annule ses commandes non payées (remise en stock), supprime ses avis et ses récompenses.
// Commerçant : supprime son commerce, ses offres et les avis reçus.
// Refusé s'il reste des commandes payées non récupérées. Les anciennes commandes restent (historique).
async function removeReview(doc) {
  const r = doc.data();
  const commerceRef = db.collection('commerces').doc(r.commerceId);
  await db.runTransaction(async (t) => {
    const cSnap = await t.get(commerceRef);
    if (cSnap.exists) {
      const c = cSnap.data();
      const count = Math.max((c.ratingCount || 1) - 1, 0);
      const sum = (c.ratingAvg || 0) * (c.ratingCount || 1) - (r.rating || 0);
      t.update(commerceRef, { ratingAvg: count ? Math.round((sum / count) * 10) / 10 : 0, ratingCount: count });
    }
    t.delete(doc.ref);
  });
}

router.delete('/me', verifyToken, requireRole(), async (req, res, next) => {
  try {
    const { role } = req.user;
    if (role === 'admin') return res.status(403).json({ message: 'Un compte administrateur ne peut pas être supprimé depuis l’application.' });

    const field = role === 'commercant' ? 'merchantId' : 'studentId';
    const orders = await db.collection('orders').where(field, '==', req.uid).get();
    if (orders.docs.some((d) => d.data().status === 'payee')) {
      return res.status(409).json({ message: role === 'commercant'
        ? 'Des commandes payées n’ont pas encore été récupérées : validez-les avant de supprimer votre compte.'
        : 'Vous avez des commandes payées non récupérées : récupérez-les avant de supprimer votre compte.' });
    }

    if (role === 'etudiant') {
      for (const d of orders.docs) if (d.data().status === 'en_attente_paiement') await cancelOrder(d.id);
      const reviews = await db.collection('reviews').where('studentId', '==', req.uid).get();
      for (const d of reviews.docs) await removeReview(d);
      const rewards = await db.collection('rewards').where('userId', '==', req.uid).get();
      await Promise.all(rewards.docs.map((d) => d.ref.delete()));
    } else {
      const [offers, commerces] = await Promise.all([
        db.collection('offers').where('ownerId', '==', req.uid).get(),
        db.collection('commerces').where('ownerId', '==', req.uid).get(),
      ]);
      await Promise.all(offers.docs.map((d) => d.ref.delete()));
      for (const c of commerces.docs) {
        const reviews = await db.collection('reviews').where('commerceId', '==', c.id).get();
        await Promise.all(reviews.docs.map((d) => d.ref.delete()));
        await c.ref.delete();
      }
    }

    await db.collection('users').doc(req.uid).delete();
    await auth.deleteUser(req.uid).catch((e) => { if (e.code !== 'auth/user-not-found') throw e; });
    res.json({ message: 'Compte supprimé.' });
  } catch (e) { next(e); }
});

module.exports = router;
