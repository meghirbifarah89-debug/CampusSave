
// [FARAH] Sécurisation des routes : vérification du token Firebase + contrôle des rôles
const { auth, db } = require('../config/firebase');

// Vérifie le token Firebase envoyé par React / Flutter
async function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  try {
    const decoded = await auth.verifyIdToken(token);

    req.uid = decoded.uid;
    req.email = decoded.email;

    const snap = await db.collection('users').doc(decoded.uid).get();

    req.user = snap.exists
      ? { id: snap.id, ...snap.data() }
      : null;

    if (req.user && req.user.status === 'bloque') {
      return res.status(403).json({
        message: 'Compte bloqué par l’administrateur'
      });
    }

    next();

  } catch (e) {
    console.error('❌ Vérification du token :', e.code, e.message);

    return res.status(401).json({
      message: 'Token invalide ou expiré (' + (e.code || e.message) + ')'
    });
  }
}

// Exige que le profil existe et que le rôle soit autorisé
function requireRole(...roles) {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(403).json({
        message: 'Profil non trouvé, terminez l’inscription'
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Accès refusé pour le rôle ' + req.user.role
      });
    }

    next();
  };
}

module.exports = { verifyToken, requireRole };