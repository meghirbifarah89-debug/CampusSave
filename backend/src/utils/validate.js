// [FARAH] Petites fonctions de validation des formulaires côté serveur
const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const isEmail = (v) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isPhoneTN = (v) => typeof v === 'string' && /^[2-9]\d{7}$/.test(v.replace(/\s/g, ''));
const isPositiveNumber = (v) => !isNaN(Number(v)) && Number(v) > 0;
const isPositiveInt = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

// Renvoie un tableau d'erreurs (vide si tout est valide)
function check(rules) {
  const errors = [];
  for (const [ok, message] of rules) if (!ok) errors.push(message);
  return errors;
}

module.exports = { isNonEmpty, isEmail, isPhoneTN, isPositiveNumber, isPositiveInt, check };
