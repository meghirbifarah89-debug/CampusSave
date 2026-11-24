// [KMAR] Notifications push via Firebase Cloud Messaging
const { db, messaging, FieldValue } = require('../config/firebase');

async function notifyUser(userId, title, body, data = {}) {
  try {
    const snap = await db.collection('users').doc(userId).get();
    const tokens = snap.exists ? snap.data().fcmTokens || [] : [];
    if (!tokens.length) return;
    const res = await messaging.sendEachForMulticast({ tokens, notification: { title, body }, data });
    // Nettoyage des tokens invalides
    const invalid = tokens.filter((_, i) => !res.responses[i].success);
    if (invalid.length) await snap.ref.update({ fcmTokens: FieldValue.arrayRemove(...invalid) });
  } catch (e) {
    console.warn('FCM :', e.message);
  }
}

module.exports = { notifyUser };
