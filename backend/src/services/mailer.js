// [KMAR] Envoi de l'e-mail de confirmation de paiement (avec QR code)
const nodemailer = require('nodemailer');

let transporter;
function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    // Mode développement : l'e-mail est affiché dans la console
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

async function sendPaymentConfirmation(order, qrDataUrl) {
  const lignes = order.items
    .map((i) => `<tr><td>${i.title}</td><td align="center">${i.quantity}</td><td align="right">${(i.unitPrice * i.quantity).toFixed(3)} DT</td></tr>`)
    .join('');

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
    <h2 style="color:#2e7d32">CampusSave – Paiement confirmé ✅</h2>
    <p>Bonjour ${order.studentName},</p>
    <p>Votre paiement pour la commande <b>${order.code}</b> chez <b>${order.commerceName}</b> a bien été reçu.</p>
    <table width="100%" cellpadding="6" style="border-collapse:collapse;border:1px solid #ddd">
      <tr style="background:#f1f8e9"><th align="left">Produit</th><th>Qté</th><th align="right">Montant</th></tr>
      ${lignes}
      <tr><td colspan="2"><b>Total payé</b></td><td align="right"><b>${order.total.toFixed(3)} DT</b></td></tr>
    </table>
    <p>Référence de paiement : ${order.paymentRef}</p>
    <p>Présentez ce QR code au commerçant lors de la récupération :</p>
    <p style="text-align:center"><img src="cid:qrcode" width="220" alt="QR code"/></p>
    <p>Merci de lutter contre le gaspillage alimentaire 🌱</p>
  </div>`;

  const info = await getTransporter().sendMail({
    from: process.env.MAIL_FROM || 'CampusSave <no-reply@campussave.tn>',
    to: order.studentEmail,
    cc: process.env.MAIL_CC || undefined,
    subject: `CampusSave – Confirmation de paiement ${order.code}`,
    html,
    attachments: [{ filename: 'qrcode.png', path: qrDataUrl, cid: 'qrcode' }],
  });
  if (!process.env.SMTP_USER) console.log('📧 [DEV] E-mail de confirmation simulé pour', order.studentEmail);
  return info;
}

module.exports = { sendPaymentConfirmation };
