// [FARAH] Initialisation de Firebase Admin (Auth + Firestore + Cloud Messaging)
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  // Chemin de la clé (relatif au dossier backend)
  const keyPath = path.resolve(__dirname, '..', '..', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'serviceAccountKey.json');
  if (!fs.existsSync(keyPath)) {
    console.error('❌ Clé Firebase introuvable : ' + keyPath);
    console.error('   Téléchargez-la (Firebase > Paramètres du projet > Comptes de service) et renommez-la serviceAccountKey.json');
    process.exit(1);
  }
  const serviceAccount = require(keyPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: serviceAccount.project_id });
  console.log('🔥 Firebase connecté au projet : ' + serviceAccount.project_id);
}

const db = admin.firestore();
const auth = admin.auth();
const messaging = admin.messaging();
const { FieldValue } = admin.firestore;

module.exports = { admin, db, auth, messaging, FieldValue };