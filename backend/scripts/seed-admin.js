// [FARAH] Création du compte administrateur
// Usage : node scripts/seed-admin.js admin@campussave.tn MotDePasse123
require('dotenv').config();
const { auth, db, FieldValue } = require('../src/config/firebase');

(async () => {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.log('Usage : node scripts/seed-admin.js <email> <motDePasse>');
    process.exit(1);
  }
  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email, password, displayName: 'Administrateur' });
  }
  await db.collection('users').doc(user.uid).set({
    name: 'Administrateur', email, phone: '70000000', role: 'admin',
    status: 'actif', ecoPoints: 0, fcmTokens: [], createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('✅ Admin prêt :', email, '(uid ' + user.uid + ')');
  process.exit(0);
})();
