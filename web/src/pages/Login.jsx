// [YATHREB] Page de connexion
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const HOME = { etudiant: '/offres', commercant: '/commerce', admin: '/admin' };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('E-mail invalide');
    if (form.password.length < 6) return setError('Mot de passe : 6 caractères minimum');
    setBusy(true);
    try {
      const p = await login(form.email, form.password);
      navigate(HOME[p.role] || '/');
    } catch (err) {
      setError(err.code ? 'E-mail ou mot de passe incorrect' : err.message);
    } finally { setBusy(false); }
  };

  return (
    <form className="card form narrow" onSubmit={submit} noValidate>
      <h2>Connexion</h2>
      {error && <p className="error">{error}</p>}
      <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>Mot de passe<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      <button className="btn" disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</button>
      <p>Pas de compte ? <Link to="/inscription">Inscrivez-vous</Link></p>
    </form>
  );
}
