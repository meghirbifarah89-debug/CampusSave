// [YATHREB] Client de l'API REST : ajoute automatiquement le token Firebase
import { auth } from './firebase';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(method, path, body) {
  const headers = {};
  const user = auth.currentUser;
  if (user) headers.Authorization = 'Bearer ' + (await user.getIdToken());

  let payload;
  if (body instanceof FormData) payload = body; // upload de photo
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(API_URL + path, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Erreur ' + res.status);
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p),
};

export const STATUTS = {
  en_attente_paiement: 'En attente de paiement',
  payee: 'Payée – à récupérer',
  recuperee: 'Récupérée',
  annulee: 'Annulée',
};

export const fmt = (n) => Number(n || 0).toFixed(3) + ' DT';

// [YATHREB] Adresse publique d'une image enregistrée par le backend.
// Les images sont stockées en chemin relatif ("/uploads/x.jpg") ; on accepte aussi les anciennes
// valeurs ("undefined/uploads/x.jpg", "http://localhost:5000/uploads/x.jpg").
export const SERVER_URL = API_URL.replace(/\/api\/?$/, '');
export function img(url) {
  if (!url) return '';
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  const i = url.indexOf('/uploads/');
  if (i >= 0) return SERVER_URL + url.slice(i);
  return url;
}

export const CATEGORIES = { plat: 'Plat', sandwich: 'Sandwich', patisserie: 'Pâtisserie', boisson: 'Boisson', boulangerie: 'Boulangerie', 'panier-surprise': 'Panier surprise' };
export const GROUPS = [['', 'Tout'], ['sucre', 'Sucré'], ['sale', 'Salé'], ['boisson', 'Boisson'], ['surprise', 'Panier surprise']];
export const SURPRISE_KINDS = { sucre: 'Sucré', sale: 'Salé', mixte: 'Mixte' };
export const COMMERCE_TYPES = { restaurant: 'Restaurant', cafeteria: 'Cafétéria', cafe: 'Café', boulangerie: 'Boulangerie', 'fast-food': 'Fast-food' };
export const ROLES = { etudiant: 'Étudiant', commercant: 'Commerçant', admin: 'Administrateur' };
export const GENDERS = { femme: 'Femme', homme: 'Homme', non_precise: 'Non précisé' };
export const fmtShort = (n) => Number(n || 0).toFixed(1).replace('.0', '') + ' DT';
export const fmtDate = (t) => { const s = t?._seconds ?? t?.seconds; return s ? new Date(s * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
