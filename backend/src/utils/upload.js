// [KMAR] Upload des images (offres, logos, photos de profil)
// Correction du bug des images : on enregistre un chemin RELATIF "/uploads/xxx.jpg"
// (avant : `${BACKEND_URL}/uploads/...` -> "undefined/uploads/..." si BACKEND_URL manquait,
// et l'image cassait dès que l'adresse du serveur changeait : localhost, 10.0.2.2, IP du PC…).
// Les erreurs (format, taille) renvoient maintenant un message clair au lieu d'être ignorées.
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const MAX_MB = 2;

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ALLOWED[file.mimetype] || '.jpg'}`),
});

const multerInstance = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED[file.mimetype]) return cb(null, true);
    const err = new Error('Format d’image non accepté : utilisez JPG, JPEG, PNG ou WEBP');
    err.status = 400;
    cb(err);
  },
});

// Middleware : un fichier optionnel dans le champ `field`, erreurs converties en 400
function uploadImage(field) {
  const mw = multerInstance.single(field);
  return (req, res, next) => mw(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: `Image trop lourde : ${MAX_MB} Mo maximum` });
    return res.status(err.status || 400).json({ message: err.message || 'Échec de l’envoi de l’image' });
  });
}

// [YATHREB] Plusieurs images dans le même formulaire (ex. logo + photo de couverture)
function uploadImages(fields) {
  const mw = multerInstance.fields(fields.map((name) => ({ name, maxCount: 1 })));
  return (req, res, next) => mw(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: `Image trop lourde : ${MAX_MB} Mo maximum` });
    return res.status(err.status || 400).json({ message: err.message || 'Échec de l’envoi de l’image' });
  });
}
const fileOf = (req, name) => req.files?.[name]?.[0] || null;

// Chemin public enregistré en base (relatif, indépendant de l'adresse du serveur)
const publicPath = (file) => (file ? `/uploads/${file.filename}` : null);

// Accepte les anciennes valeurs ("undefined/uploads/x.jpg", "http://localhost:5000/uploads/x.jpg")
function normalizeImagePath(url) {
  if (!url) return '';
  const i = String(url).indexOf('/uploads/');
  return i >= 0 ? String(url).slice(i) : String(url);
}

module.exports = { uploadImage, uploadImages, fileOf, publicPath, normalizeImagePath, UPLOAD_DIR };
