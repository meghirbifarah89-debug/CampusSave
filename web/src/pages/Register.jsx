// [YATHREB] Page d'inscription (étudiant ou commerçant)
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HOME } from './Login';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '', role: 'etudiant' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 3) e.name = 'Nom : 3 caractères minimum';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail invalide';
    if (!/^[2-9]\d{7}$/.test(form.phone)) e.phone = 'Téléphone tunisien : 8 chiffres';
    if (form.password.length < 6) e.password = '6 caractères minimum';
    if (form.password !== form.confirm) e.confirm = 'Les mots de passe ne correspondent pas';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setError('');
    if (!validate()) return;
    setBusy(true);
    try {
      const p = await register(form);
      navigate(HOME[p.role]);
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? 'Cet e-mail est déjà utilisé' : err.message);
    } finally { setBusy(false); }
  };

  const field = (k, label, type = 'text') => (
    <label>{label}<input type={type} value={form[k]} onChange={set(k)} />{errors[k] && <small className="error">{errors[k]}</small>}</label>
  );

  return (
    <form className="card form narrow" onSubmit={submit} noValidate>
      <h2>Créer un compte</h2>
      {error && <p className="error">{error}</p>}
      <div className="role-switch">
        {[['etudiant', '🎓 Étudiant'], ['commercant', '🏪 Commerçant']].map(([v, l]) => (
          <button type="button" key={v} className={form.role === v ? 'active' : ''} onClick={() => setForm({ ...form, role: v })}>{l}</button>
        ))}
      </div>
      {field('name', 'Nom complet')}
      {field('email', 'E-mail', 'email')}
      {field('phone', 'Téléphone')}
      {field('password', 'Mot de passe', 'password')}
      {field('confirm', 'Confirmer le mot de passe', 'password')}
      <button className="btn" disabled={busy}>{busy ? 'Création…' : 'S’inscrire'}</button>
      <p>Déjà inscrit ? <Link to="/connexion">Connexion</Link></p>
    </form>
  );
}
