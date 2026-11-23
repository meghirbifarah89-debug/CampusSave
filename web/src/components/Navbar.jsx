// [YATHREB] Barre de navigation : logo officiel (retour à l'accueil), liens selon le rôle, recherche de comptes
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import SearchModal from './SearchModal';

const LINKS = {
  etudiant: [['/', 'Accueil'], ['/offres', 'Offres'], ['/campus-radar', 'Campus Radar'], ['/mes-commandes', 'Mes commandes'], ['/panier', 'Panier'], ['/profil', 'Mon profil']],
  commercant: [['/', 'Accueil'], ['/commerce', 'Mon commerce'], ['/commerce/offres', 'Mes offres'], ['/commerce/commandes', 'Retraits'], ['/commerce/tableau-de-bord', 'Statistiques'], ['/profil', 'Profil']],
  admin: [['/', 'Accueil'], ['/admin', 'Supervision'], ['/admin/commerces', 'Commerces'], ['/admin/utilisateurs', 'Utilisateurs'], ['/profil', 'Profil']],
  guest: [['/', 'Accueil'], ['/offres', 'Offres'], ['/campus-radar', 'Campus Radar'], ['/connexion', 'Connexion']],
};

export default function Navbar() {
  const { profile, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  // raccourci clavier Ctrl+K / Cmd+K
  useEffect(() => {
    const k = (e) => { if (profile && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [profile]);

  const links = LINKS[profile?.role] || LINKS.guest;

  return (
    <header className="navbar">
      <Link to="/" className="brand" aria-label="CampusSave – accueil">
        {/* Logo officiel : remplacez public/logo.png par le fichier officiel (mêmes proportions conservées) */}
        <img src="/logo.png" alt="CampusSave" />
      </Link>
      {profile && (
        <button className="search-btn" onClick={() => setSearch(true)} aria-label="Rechercher un compte">🔎<span> Rechercher un compte…</span></button>
      )}
      <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>☰</button>
      <nav className={open ? 'open' : ''}>
        {links.map(([to, label]) => (
          <NavLink key={to} to={to} end>
            {label}{to === '/panier' && count > 0 && <span className="badge">{count}</span>}
          </NavLink>
        ))}
        {profile
          ? <button className="btn-nav" onClick={async () => { await logout(); navigate('/connexion'); }}>Déconnexion</button>
          : <NavLink to="/inscription" className="btn small">Inscription</NavLink>}
      </nav>
      <SearchModal open={search} onClose={() => setSearch(false)} />
    </header>
  );
}
