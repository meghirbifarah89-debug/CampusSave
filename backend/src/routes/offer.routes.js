// [KMAR] Gestion des offres + recherche
const router = require('express').Router();
const { db, FieldValue } = require('../config/firebase');
const { verifyToken, requireRole } = require('../middleware/auth');
const { isNonEmpty, isPositiveNumber, isPositiveInt, check } = require('../utils/validate');
const { uploadImage, publicPath, normalizeImagePath } = require('../utils/upload');

const CATEGORIES = ['plat', 'sandwich', 'patisserie', 'boisson', 'boulangerie', 'panier-surprise'];

// [YATHREB] Filtres Sucré / Salé / Boisson (reliés aux catégories existantes)
const GROUPS = { sucre: ['patisserie'], sale: ['plat', 'sandwich', 'boulangerie'], boisson: ['boisson'] };
const SURPRISE_KINDS = ['sucre', 'sale', 'mixte'];
const inGroup = (o, g) => {
  if (g === 'surprise') return o.category === 'panier-surprise';
  if (o.category === 'panier-surprise') return (g === 'sucre' && o.surpriseKind !== 'sale') || (g === 'sale' && o.surpriseKind !== 'sucre');
  return (GROUPS[g] || []).includes(o.category);
};
// Le contenu d'un panier surprise reste caché pour les étudiants
const publicOffer = (o) => { const { revealContent, ...rest } = o; return { ...rest, photoUrl: normalizeImagePath(rest.photoUrl) }; };

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function validateOffer(b) {
  return check([
    [isNonEmpty(b.title), 'Titre obligatoire'],
    [CATEGORIES.includes(b.category), 'Catégorie invalide'],
    [isPositiveNumber(b.initialPrice), 'Prix initial invalide'],
    [isPositiveNumber(b.discountPrice), 'Prix réduit invalide'],
    [Number(b.discountPrice) < Number(b.initialPrice), 'Le prix réduit doit être inférieur au prix initial'],
    [Number.isInteger(Number(b.quantity)) && Number(b.quantity) >= 0, 'Quantité invalide'],
    [HHMM.test(b.pickupStart || ''), 'Heure de début de récupération invalide (HH:MM)'],
    [HHMM.test(b.pickupEnd || ''), 'Heure de fin de récupération invalide (HH:MM)'],
    [(b.pickupStart || '') < (b.pickupEnd || ''), 'La fin de récupération doit être après le début'],
    [b.category !== 'panier-surprise' || SURPRISE_KINDS.includes(b.surpriseKind), 'Panier surprise : type sucré, salé ou mixte obligatoire'],
    [b.category !== 'panier-surprise' || isNonEmpty(b.revealContent), 'Panier surprise : indiquez le contenu prévu (caché jusqu’au retrait)'],
  ]);
}

async function getMyValidCommerce(uid) {
  const snap = await db.collection('commerces').where('ownerId', '==', uid).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

// Champs propres au panier surprise
const surpriseFields = (b) => b.category === 'panier-surprise'
  ? { surpriseKind: b.surpriseKind, allergens: (b.allergens || '').trim(), revealContent: (b.revealContent || '').trim() }
  : { surpriseKind: null, allergens: (b.allergens || '').trim(), revealContent: '' };

// ---------- Recherche publique : ?q=&category=&group=sucre|sale|boisson|surprise&commerceId=&minPrice=&maxPrice=&sort=
router.get('/', async (req, res) => {
  const { q, category, group, commerceId, minPrice, maxPrice, sort } = req.query;
  const snap = await db.collection('offers').where('status', '==', 'active').get();
  let offers = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((o) => o.quantity > 0);

  if (q) {
    const s = q.toLowerCase();
    offers = offers.filter((o) =>
      o.title.toLowerCase().includes(s) ||
      (o.description || '').toLowerCase().includes(s) ||
      o.commerceName.toLowerCase().includes(s));
  }
  if (category) offers = offers.filter((o) => o.category === category);
  if (group) offers = offers.filter((o) => inGroup(o, group));
  if (commerceId) offers = offers.filter((o) => o.commerceId === commerceId);
  if (minPrice) offers = offers.filter((o) => o.discountPrice >= Number(minPrice));
  if (maxPrice) offers = offers.filter((o) => o.discountPrice <= Number(maxPrice));

  if (sort === 'prix') offers.sort((a, b) => a.discountPrice - b.discountPrice);
  else if (sort === 'reduction') offers.sort((a, b) => (b.initialPrice - b.discountPrice) / b.initialPrice - (a.initialPrice - a.discountPrice) / a.initialPrice);
  else offers.sort((a, b) => (b.createdAt?._seconds || 0) - (a.createdAt?._seconds || 0));

  res.json(offers.map(publicOffer));
});

router.get('/categories', (req, res) => res.json(CATEGORIES));

// ---------- Offres du commerçant connecté
router.get('/mine', verifyToken, requireRole('commercant'), async (req, res) => {
  const snap = await db.collection('offers').where('ownerId', '==', req.uid).get();
  res.json(snap.docs.map((d) => { const o = d.data(); return { id: d.id, ...o, photoUrl: normalizeImagePath(o.photoUrl) }; }));
});

router.get('/:id', async (req, res) => {
  const snap = await db.collection('offers').doc(req.params.id).get();
  if (!snap.exists) return res.status(404).json({ message: 'Offre introuvable' });
  res.json(publicOffer({ id: snap.id, ...snap.data() }));
});

// ---------- Publier une offre (multipart/form-data avec champ "photo" optionnel)
router.post('/', verifyToken, requireRole('commercant'), uploadImage('photo'), async (req, res) => {
  const commerce = await getMyValidCommerce(req.uid);
  if (!commerce) return res.status(400).json({ message: 'Créez d’abord votre commerce' });
  if (commerce.status !== 'valide') return res.status(403).json({ message: 'Votre commerce doit être validé par l’administrateur' });

  const errors = validateOffer(req.body);
  if (errors.length) return res.status(400).json({ message: errors.join(', ') });

  const b = req.body;
  const offer = {
    title: b.title.trim(), description: b.description || '', category: b.category,
    initialPrice: Number(b.initialPrice), discountPrice: Number(b.discountPrice),
    quantity: Number(b.quantity), initialQuantity: Number(b.quantity),
    pickupStart: b.pickupStart, pickupEnd: b.pickupEnd,
    photoUrl: publicPath(req.file) || normalizeImagePath(b.photoUrl),
    ...surpriseFields(b),
    commerceId: commerce.id, commerceName: commerce.name, commerceAddress: commerce.address,
    ownerId: req.uid, status: 'active', createdAt: FieldValue.serverTimestamp(),
  };
  const ref = await db.collection('offers').add(offer);
  res.status(201).json({ id: ref.id, ...offer });
});

// ---------- Modifier une offre
router.put('/:id', verifyToken, requireRole('commercant'), uploadImage('photo'), async (req, res) => {
  const ref = db.collection('offers').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().ownerId !== req.uid) return res.status(404).json({ message: 'Offre introuvable' });

  const merged = { ...snap.data(), ...req.body };
  const errors = validateOffer(merged);
  if (errors.length) return res.status(400).json({ message: errors.join(', ') });

  const data = {
    title: merged.title.trim(), description: merged.description || '', category: merged.category,
    initialPrice: Number(merged.initialPrice), discountPrice: Number(merged.discountPrice),
    quantity: Number(merged.quantity), pickupStart: merged.pickupStart, pickupEnd: merged.pickupEnd,
    status: ['active', 'inactive'].includes(merged.status) ? merged.status : 'active',
    ...surpriseFields(merged),
  };
  if (req.file) data.photoUrl = publicPath(req.file);
  else if (req.body.photoUrl !== undefined) data.photoUrl = normalizeImagePath(req.body.photoUrl);
  await ref.update(data);
  res.json({ id: ref.id, ...snap.data(), ...data, photoUrl: normalizeImagePath(data.photoUrl ?? snap.data().photoUrl) });
});

// ---------- Supprimer une offre
router.delete('/:id', verifyToken, requireRole('commercant'), async (req, res) => {
  const ref = db.collection('offers').doc(req.params.id);
  const snap = await ref.get();
  if (!snap.exists || snap.data().ownerId !== req.uid) return res.status(404).json({ message: 'Offre introuvable' });
  await ref.delete();
  res.json({ message: 'Offre supprimée' });
});

module.exports = router;
