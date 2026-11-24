// [FARAH] Point d'entrée du serveur Express
require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --- Routes Farah ---
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/commerces', require('./routes/commerce.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/users', require('./routes/users.routes'));        // recherche globale + profils
// --- Routes Kmar ---
app.use('/api/offers', require('./routes/offer.routes'));
app.use('/api/orders', require('./routes/order.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/stats', require('./routes/stats.routes'));
app.use('/api/rewards', require('./routes/rewards.routes'));    // EcoPoints + ComeEat

app.get('/', (req, res) => res.json({ app: 'CampusSave API', status: 'OK' }));

// Gestion centralisée des erreurs
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 CampusSave API sur http://localhost:${PORT}`));
