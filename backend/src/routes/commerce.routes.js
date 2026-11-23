// [FARAH] Gestion des commerces (restaurants / cafétérias) + profil public + avis des étudiants
const router = require('express').Router();
const { db, FieldValue } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { isNonEmpty, isPhoneTN, check } = require('../utils/validate');
const { uploadImages, fileOf, publicPath, normalizeImagePath } = require('../utils/upload');

const TYPES = ['restaurant', 'cafeteria', 'cafe', 'boulangerie', 'fast-food'];

function validateCommerce(b) {
  return check([
    [isNonEmpty(b.name), 'Nom du commerce obligatoire'],
    [TYPES.includes(b.type), 'Type invalide (' + TYPES.join(', ') + ')'],
    [isNonEmpty(b.address), 'Adresse obligatoire'],
    [isPhoneTN(b.phone || ''), 'Téléphone invalide'],
    [b.lat === undefined || b.lat === null || b.lat === '' || (Number(b.lat) >= -90 && Number(b.lat) <= 90), 'Latitude invalide'],
    [b.lng === undefined || b.lng === null || b.lng === '' || (Number(b.lng) >= -180 && Number(b.lng) <= 180), 'Longitude invalide'],
  ]);
}
const coord = (v) => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? null : Number(v));

// Champs visibles par tout le monde
const publicCommerce = (id, c) => ({
  id, name: c.name, type: c.type, address: c.address, phone: c.phone,
  description: c.description || '', openingHours: c.openingHours || '',
  lat: c.lat ?? null, lng: c.lng ?? null, logoUrl: normalizeImagePath(c.logoUrl), coverUrl: normalizeImagePath(c.coverUrl),
  ratingAvg: c.ratingAvg || 0, ratingCount: c.ratingCount || 0, status: c.status,
});

// Nombre d'offres disponibles par commerce (pour Campus Radar)
async function offersCountByCommerce() {
  const snap = await db.collection('offers').where('status', '==', 'active').get();
  const m = {};
  snap.docs.forEach((d) => { const o = d.data(); if (o.quantity > 0) m[o.commerceId] = (m[o.commerceId] || 0) + 1; });
  return m;
}

// Liste publique des commerces validés (avec note moyenne et nombre d'offres)
router.get('/', async (req, res) => {
  const [snap, counts] = await Promise.all([db.collection('commerces').where('status', '==', 'valide').get(), offersCountByCommerce()]);
  res.json(snap.docs.map((d) => ({ ...publicCommerce(d.id, d.data()), offersCount: counts[d.id] || 0 })));
});

// Le commerce du commerçant connecté
router.get('/mine', verifyToken, requireRole('commercant'), async (req, res) => {
  const snap = await db.collection('commerces').where('ownerId', '==', req.uid).limit(1).get();
  if (snap.empty) return res.json(null);
  const d = snap.docs[0];
  res.json({ ...d.data(), ...publicCommerce(d.id, d.data()) });
});

// Profil public d'un commerce (+ ses offres disponibles)
router.get('/:id', async (req, res) => {
  const snap = await db.collection('commerces').doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ message: 'Commerce introuvable' });
  const offers = (await db.collection('offers').where('commerceId', '==', snap.id).get()).docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((o) => o.status === 'active' && o.quantity > 0)
    .map(({ revealContent, ...o }) => ({ ...o, photoUrl: normalizeImagePath(o.photoUrl) }));
  res.json({ ...publicCommerce(snap.id, snap.data()), offers });
});

// Inscrire son commerce (statut "en_attente" jusqu'à validation par l'admin) – logo optionnel
router.post('/', verifyToken, requireRole('commercant'), uploadImages(['logo', 'cover']), async (req, res) => {
  const errors = validateCommerce(req.body);
  if (errors.length) return res.status(400).json({ message: errors.join(', ') });

  const exists = await db.collection('commerces').where('ownerId', '==', req.uid).limit(1).get();
  if (!exists.empty) return res.status(409).json({ message: 'Vous avez déjà un commerce' });

  const { name, type, address, phone, description, openingHours, lat, lng } = req.body;
  const commerce = {
    name: name.trim(), type, address: address.trim(), phone,
    description: description || '', openingHours: openingHours || '',
    lat: coord(lat), lng: coord(lng), logoUrl: publicPath(fileOf(req, 'logo')) || '', coverUrl: publicPath(fileOf(req, 'cover')) || '',
    ratingAvg: 0, ratingCount: 0,
    ownerId: req.uid, status: 'en_attente', createdAt: FieldValue.serverTimestamp(),
  };
  const ref = await db.collection('commerces').add(commerce);
  res.status(201).json({ id: ref.id, ...commerce });
});

// Modifier les informations de son commerce (logo et position sur la carte compris)
router.put('/:id', verifyToken, requireRole('commercant'), uploadImages(['logo', 'cover']), async (req, res) => {
  const ref = db.collection('commerces').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().ownerId !== req.uid) return res.status(404).json({ message: 'Commerce introuvable' });

  const merged = { ...snap.data(), ...req.body };
  const errors = validateCommerce(merged);
  if (errors.length) return res.status(400).json({ message: errors.join(', ') });

  const { name, type, address, phone, description, openingHours } = merged;
  const data = { name, type, address, phone, description: description || '', openingHours: openingHours || '', lat: coord(merged.lat), lng: coord(merged.lng) };
  if (fileOf(req, 'logo')) data.logoUrl = publicPath(fileOf(req, 'logo'));
  if (fileOf(req, 'cover')) data.coverUrl = publicPath(fileOf(req, 'cover'));
  if (req.body.removeCover === 'true') data.coverUrl = '';
  await ref.update(data);
  // le nom/adresse affichés sur les offres restent synchronisés
  const offers = await db.collection('offers').where('commerceId', '==', ref.id).get();
  if (!offers.empty) {
    const batch = db.batch();
    offers.docs.forEach((d) => batch.update(d.ref, { commerceName: name, commerceAddress: address }));
    await batch.commit();
  }
  const fresh = (await ref.get()).data();
  res.json({ ...fresh, ...publicCommerce(ref.id, fresh) });
});

// ===================== AVIS DES ÉTUDIANTS =====================
// Règles : seul un étudiant ayant RÉCUPÉRÉ une commande dans ce commerce peut noter ;
// un seul avis par étudiant et par commerce (il peut le modifier).
router.get('/:id/reviews', async (req, res) => {
  const snap = await db.collection('reviews').where('commerceId', '==', req.params.id).get();
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .map((r) => ({ ...r, studentPhotoUrl: normalizeImagePath(r.studentPhotoUrl) }))
    .sort((a, b) => (b.updatedAt?._seconds || 0) - (a.updatedAt?._seconds || 0));
  res.json(list);
});

// L'étudiant connecté peut-il noter ce commerce ? (+ son avis actuel)
router.get('/:id/reviews/eligibility', verifyToken, requireRole('etudiant'), async (req, res) => {
  const orders = await db.collection('orders').where('studentId', '==', req.uid).get();
  const eligible = orders.docs.some((d) => d.data().commerceId === req.params.id && d.data().status === 'recuperee');
  const mine = await db.collection('reviews').doc(`${req.params.id}_${req.uid}`).get();
  res.json({ eligible, review: mine.exists ? { id: mine.id, ...mine.data() } : null });
});

router.post('/:id/reviews', verifyToken, requireRole('etudiant'), async (req, res) => {
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || '').trim();
  const errors = check([
    [Number.isInteger(rating) && rating >= 1 && rating <= 5, 'Note invalide (1 à 5 étoiles)'],
    [comment.length <= 500, 'Commentaire : 500 caractères maximum'],
  ]);
  if (errors.length) return res.status(400).json({ message: errors.join(', ') });

  const commerceRef = db.collection('commerces').doc(req.params.id);
  const orders = await db.collection('orders').where('studentId', '==', req.uid).get();
  const eligible = orders.docs.some((d) => d.data().commerceId === req.params.id && d.data().status === 'recuperee');
  if (!eligible) return res.status(403).json({ message: 'Vous pourrez noter ce commerce après avoir récupéré une commande chez lui' });

  const reviewRef = db.collection('reviews').doc(`${req.params.id}_${req.uid}`); // 1 avis par étudiant et par commerce
  const result = await db.runTransaction(async (t) => {
    const [cSnap, rSnap] = await Promise.all([t.get(commerceRef), t.get(reviewRef)]);
    if (!cSnap.exists) throw Object.assign(new Error('Commerce introuvable'), { status: 404 });
    const c = cSnap.data();
    let sum = (c.ratingAvg || 0) * (c.ratingCount || 0), count = c.ratingCount || 0;
    if (rSnap.exists) sum -= rSnap.data().rating; else count += 1;
    sum += rating;
    const ratingAvg = Math.round((sum / count) * 10) / 10;
    const review = {
      commerceId: cSnap.id, studentId: req.uid, studentName: req.user.name,
      studentPhotoUrl: req.user.photoUrl || '', rating, comment,
      updatedAt: FieldValue.serverTimestamp(),
      ...(rSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    };
    t.set(reviewRef, review, { merge: true });
    t.update(commerceRef, { ratingAvg, ratingCount: count });
    return { ratingAvg, ratingCount: count, updated: rSnap.exists };
  });
  res.status(result.updated ? 200 : 201).json({ message: result.updated ? 'Avis modifié' : 'Merci pour votre avis !', ...result });
});

// Supprimer un avis : l'étudiant supprime le sien, l'administrateur peut supprimer n'importe quel avis.
// La note moyenne du commerce est recalculée dans la même transaction.
router.delete('/:id/reviews/:reviewId?', verifyToken, requireRole('etudiant', 'admin'), async (req, res) => {
  const reviewId = req.user.role === 'admin' && req.params.reviewId ? req.params.reviewId : `${req.params.id}_${req.uid}`;
  const reviewRef = db.collection('reviews').doc(reviewId);
  const commerceRef = db.collection('commerces').doc(req.params.id);
  const result = await db.runTransaction(async (t) => {
    const [rSnap, cSnap] = await Promise.all([t.get(reviewRef), t.get(commerceRef)]);
    if (!rSnap.exists || rSnap.data().commerceId !== req.params.id) throw Object.assign(new Error('Avis introuvable'), { status: 404 });
    const c = cSnap.data() || {};
    const count = Math.max(0, (c.ratingCount || 1) - 1);
    const sum = (c.ratingAvg || 0) * (c.ratingCount || 1) - rSnap.data().rating;
    const ratingAvg = count ? Math.round((sum / count) * 10) / 10 : 0;
    t.delete(reviewRef);
    t.update(commerceRef, { ratingAvg, ratingCount: count });
    return { ratingAvg, ratingCount: count };
  });
  res.json({ message: 'Avis supprimé', ...result });
});

module.exports = router;
