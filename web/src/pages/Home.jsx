// [YATHREB] Page d'accueil : animation sur tout le fond (4 univers), texte à gauche, étapes, panier surprise
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import HeroShowcase from '../components/hero/HeroShowcase';
import SurpriseHow, { BoxArt } from '../components/SurpriseHow';

export default function Home() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [offers, setOffers] = useState(null);
  const [commerces, setCommerces] = useState(null);
  const [how, setHow] = useState(false);

  useEffect(() => {
    api.get('/offers').then(setOffers).catch(() => setOffers([]));
    api.get('/commerces').then(setCommerces).catch(() => setCommerces([]));
  }, []);

  // statistiques calculées sur les vraies offres
  const avgDiscount = offers?.length ? Math.round(offers.reduce((s, o) => s + (1 - o.discountPrice / o.initialPrice), 0) / offers.length * 100) : null;
  const merchantCta = profile?.role === 'commercant' ? '/commerce' : '/inscription';

  return (
    <>
      <section className="hero-full">
        <HeroShowcase />
        <div className="hero-text">
          <span className="pill"><i />{offers === null ? 'Les invendus du soir autour de l’ESSECT' : `${offers.length} offre${offers.length > 1 ? 's' : ''} dispo ce soir autour de l’ESSECT`}</span>
          <h1>Bien manger,<br />petit <span>budget.</span></h1>
          <p>Les restos et cafét’ du quartier te réservent leurs invendus du jour à prix réduits. Tu réserves, tu paies en ligne, tu récupères avec ton QR code.</p>
          <div className="cta">
            <Link to="/offres" className="btn big">Voir les offres →</Link>
            {profile?.role !== 'admin' && <Link to={merchantCta} className="btn big outline">Je suis commerçant</Link>}
          </div>
          <div className="hero-stats">
            <div><b>{avgDiscount !== null ? `-${avgDiscount} %` : '—'}</b><span>réduction moyenne</span></div>
            <div><b>{commerces ? commerces.length : '—'}</b><span>commerces partenaires</span></div>
            <div><b>10 s</b><span>retrait par QR code</span></div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="steps">
          <div className="card step"><span>1</span><h3>Choisis</h3><p>Filtre par Sucré, Salé ou Boisson et trouve les invendus du soir.</p></div>
          <div className="card step"><span>2</span><h3>Paie en ligne</h3><p>Paiement sécurisé, confirmation par e-mail.</p></div>
          <div className="card step"><span>3</span><h3>Récupère</h3><p>Montre ton QR code et gagne 10 EcoPoints par article. 500 = un repas offert avec ComeEat.</p></div>
          <Link to="/campus-radar" className="card step dark"><span>📍</span><h3>Campus Radar</h3><p>Les restos et cafét’ autour de toi, sur une carte.</p></Link>
        </div>
        <div className="card sb-band">
          <BoxArt />
          <div><h3>Le panier surprise</h3><p>Le commerçant remplit un panier avec ses invendus du jour. Tu connais la valeur minimum, le type (sucré, salé ou mixte) et les allergènes possibles, mais pas le contenu exact : il est révélé au retrait.</p></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn" onClick={() => setHow(true)}>Comment ça marche ?</button>
            <button className="btn ghost sm" onClick={() => navigate('/offres?group=surprise')}>Voir les paniers du soir</button>
          </div>
        </div>
      </section>
      <SurpriseHow open={how} onClose={() => setHow(false)} />
    </>
  );
}
