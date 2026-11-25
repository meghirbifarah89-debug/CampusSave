# 🌱 CampusSave

**Plateforme intelligente de lutte contre le gaspillage alimentaire**

Projet pédagogique intégrateur — 3e année E-Business, ESSECT
Modules : Intégration Web · Développement Mobile · Paiement électronique

Les restaurants, cafés, cafétérias et boulangeries proches de l'ESSECT publient leurs invendus du jour à prix réduits. Les étudiants les réservent, **paient en ligne avec DHMAD**, reçoivent un **e-mail de confirmation avec un QR code**, puis récupèrent leur commande sur place.

## 👥 Équipe

- Dellai Yathreb
- Meghirbi Farah
- Hadded Kmar
- Daly Maryam

## 🏗️ Architecture

```
Application web (React)   ─┐
                           ├──► API REST Node.js / Express ──► Firebase (Auth, Firestore, FCM)
Application mobile (Flutter)┘              │
                                           ├──► DHMAD (paiement en ligne)
                                           ├──► SMTP Gmail (e-mail de confirmation)
                                           └──► OpenStreetMap (cartes, Campus Radar)
```

| Dossier | Contenu | Technologies |
| --- | --- | --- |
| `backend/` | API REST : comptes, commerces, offres, commandes, paiement, avis, récompenses, statistiques | Node.js, Express, firebase-admin, Nodemailer, qrcode, multer |
| `web/` | Application web | React 18, Vite, React Router, Firebase Auth, Leaflet |
| `mobile/` | Application Android | Flutter, Provider, Firebase Auth / Messaging, flutter_map, mobile_scanner |
| `firestore.rules` | Règles de sécurité de la base | Firestore |

## ✨ Fonctionnalités

### Étudiant
- Inscription, connexion et profil (photo, photo de couverture)
- Consultation des offres avec filtres **Sucré**, **Salé**, **Boisson** et **Panier surprise**
- Fiche de chaque commerce : informations, carte, offres, note et avis
- **Campus Radar** : carte des commerces et distances depuis l'ESSECT, sa position ou une adresse
- Panier avec quantités modifiables, total et économie réalisée
- **Paiement en ligne DHMAD** (carte bancaire, D17, virement, portefeuille DHMAD)
- E-mail de confirmation avec QR code de retrait
- Suivi des commandes, annulation d'une commande non payée
- Avis sur un commerce après un retrait (ajout, modification, suppression)
- **EcoPoints** (10 par article récupéré) et repas offert **ComeEat** (500 points)
- Tableau de bord : dépenses, économies, EcoPoints
- Recherche de comptes, suppression de son compte

### Commerçant
- Inscription du commerce (logo, couverture, position sur la carte), soumise à validation
- Publication, modification et suppression des offres, y compris les **paniers surprise**
- Suivi des commandes payées et récupérées
- Scan du QR code au retrait et validation des repas ComeEat
- Tableau de bord : commandes, articles vendus, chiffre d'affaires
- Notifications push à chaque nouvelle commande payée

### Administrateur
- Validation ou refus des commerces
- Gestion des utilisateurs : filtre par rôle, blocage, réactivation, consultation du profil
- Modération des avis
- Tableau de bord de supervision : utilisateurs, commerces, commandes, paiements

## ⚙️ Installation

### Prérequis
- Node.js 18 ou plus
- Flutter 3.19 ou plus et Android Studio (pour le mobile)
- Accès au projet Firebase **compussave1** (Authentication e-mail / mot de passe et Firestore)
- Un compte développeur DHMAD (developer.dhmad.tn) avec une clé API sandbox et l'URL de retour `http://localhost:5173/paiement/resultat` autorisée

### 1. Backend
```bash
cd backend
npm install
```
- Copier `.env.example` en `.env` et le remplir (voir le tableau plus bas).
- Placer la clé du compte de service Firebase dans `backend/serviceAccountKey.json`.
- Créer un administrateur (une seule fois) :
  ```bash
  npm run seed:admin -- admin@campussave.tn MotDePasse123
  ```
- Lancer le serveur :
  ```bash
  npm start          # http://localhost:5000
  ```

### 2. Application web
```bash
cd web
npm install
```
- Copier `.env.example` en `.env` et y mettre la configuration Firebase Web et `VITE_API_URL=http://localhost:5000/api`.
- Lancer :
  ```bash
  npm run dev        # http://localhost:5173
  ```

### 3. Application mobile
1. Télécharger `google-services.json` (console Firebase → Paramètres du projet → application Android) et le placer dans `mobile/android/app/`.
2. Créer `mobile/lib/firebase_options.dart` à partir de ce fichier.
3. Dans `mobile/lib/config.dart`, régler l'adresse du backend :
   - émulateur Android : `http://10.0.2.2:5000/api`
   - téléphone réel : `http://<IP du PC sur le Wi-Fi>:5000/api`
4. Lancer, avec le backend démarré :
   ```bash
   cd mobile
   flutter pub get
   flutter run
   ```

## 🔐 Variables d'environnement du backend (`backend/.env`)

| Variable | Rôle |
| --- | --- |
| `PORT` | Port de l'API (5000) |
| `FRONTEND_URL` / `BACKEND_URL` | Adresses du site et de l'API (retour après paiement, images) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Chemin de la clé Firebase (`./serviceAccountKey.json`) |
| `DHMAD_API_KEY` | Clé API DHMAD (`sk_sandbox_...`) |
| `DHMAD_BASE_URL` | `https://sandbox.dhmad.tn/api/v1` |
| `SMTP_HOST`, `SMTP_PORT` | `smtp.gmail.com`, `465` |
| `SMTP_USER`, `SMTP_PASS` | Adresse Gmail et mot de passe d'application |
| `MAIL_FROM` | Expéditeur affiché (même adresse que `SMTP_USER`) |
| `MAIL_CC` | Adresse qui reçoit une copie de chaque confirmation (enseignante) |

## 💳 Parcours de paiement

1. L'étudiant valide son panier : la commande est créée « en attente de paiement » et le stock est réservé.
2. Le serveur crée un lien de paiement DHMAD (charge) et redirige l'étudiant vers la page sécurisée.
3. DHMAD confirme le paiement (webhook ou vérification au retour sur CampusSave).
4. La commande passe « payée » ; le QR code est généré et l'e-mail de confirmation est envoyé.
5. Le commerçant scanne le QR code au retrait : la commande passe « récupérée » et l'étudiant gagne ses EcoPoints.

## 🛡️ Sécurité

Les fichiers suivants contiennent des secrets. Ils sont exclus par `.gitignore` et ne doivent **jamais** être poussés sur GitHub ; ils sont partagés en privé au sein de l'équipe :

- `backend/.env`
- `backend/serviceAccountKey.json`
- `web/.env`
- `mobile/android/app/google-services.json`
- `mobile/lib/firebase_options.dart`

Chaque appel à l'API est authentifié par un jeton Firebase et contrôlé selon le rôle. Les données de carte bancaire sont saisies uniquement sur la page DHMAD.
