// [KMAR] Panier surprise : illustration + fenêtre « Comment ça marche ? »
import Modal from './Modal';
import { fmtShort, SURPRISE_KINDS } from '../services/api';

export const BOX = (
  <g>
    <ellipse cx="60" cy="100" rx="50" ry="8" fill="#6B4429" opacity=".15" />
    <path d="M14 44h92v50a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8Z" fill="#B97A3E" />
    <path d="M14 44h92v12H14Z" fill="#9C6430" />
    <rect x="8" y="30" width="104" height="18" rx="5" fill="#6B4429" />
    <rect x="53" y="30" width="14" height="72" fill="#E9C46A" />
    <path d="M60 30c-10-16-30-18-30-6 0 8 18 7 30 6Zm0 0c10-16 30-18 30-6 0 8-18 7-30 6Z" fill="#E9C46A" />
    <text x="60" y="88" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="30" fill="#FFF3D6">?</text>
  </g>
);
export const BoxArt = ({ width = 110 }) => <svg viewBox="0 0 120 110" width={width} aria-hidden="true">{BOX}</svg>;
// Image de remplacement d'un panier surprise sans photo
export const BOX_IMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><defs><radialGradient id="g" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#FBF3E4"/><stop offset="1" stop-color="#E7CFA8"/></radialGradient></defs><rect width="400" height="300" fill="url(#g)"/><g transform="translate(140 80)"><ellipse cx="60" cy="100" rx="50" ry="8" fill="#6B4429" opacity=".15"/><path d="M14 44h92v50a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8Z" fill="#B97A3E"/><path d="M14 44h92v12H14Z" fill="#9C6430"/><rect x="8" y="30" width="104" height="18" rx="5" fill="#6B4429"/><rect x="53" y="30" width="14" height="72" fill="#E9C46A"/><path d="M60 30c-10-16-30-18-30-6 0 8 18 7 30 6Zm0 0c10-16 30-18 30-6 0 8-18 7-30 6Z" fill="#E9C46A"/><text x="60" y="88" text-anchor="middle" font-family="Arial Black,Arial" font-weight="900" font-size="30" fill="#FFF3D6">?</text></g></svg>').replace(/[()']/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

export default function SurpriseHow({ open, onClose, offer, onReserve }) {
  return (
    <Modal open={open} onClose={onClose} wide>
      <div className="modal-head">
        <div><span className="ce-tag">Panier surprise</span><h2 style={{ marginTop: 8 }}>Comment ça marche ?</h2></div>
        <button className="btn ghost sm" onClick={onClose}>Fermer</button>
      </div>
      <div className="how-steps">
        <div><svg viewBox="0 0 64 64"><rect x="8" y="22" width="48" height="34" rx="6" fill="#B97A3E" /><rect x="4" y="14" width="56" height="12" rx="4" fill="#6B4429" /><path d="M20 30h24M20 38h16" stroke="#FFF3D6" strokeWidth="3" strokeLinecap="round" /></svg><b>1. Le commerce prépare</b><small>En fin de journée, il met ses invendus dans un panier et annonce sa valeur minimum.</small></div>
        <div><svg viewBox="0 0 64 64"><g transform="scale(.53) translate(0 4)">{BOX}</g></svg><b>2. Tu réserves</b><small>Tu vois le prix, la valeur minimum, le type et les allergènes possibles, pas le contenu.</small></div>
        <div><svg viewBox="0 0 64 64"><rect x="10" y="10" width="44" height="44" rx="8" fill="#fff" stroke="#3B2416" strokeWidth="3" /><path d="M18 18h10v10H18zM36 18h10v10H36zM18 36h10v10H18z" fill="#3B2416" /><path d="M38 38h4v4h-4zM44 44h4v4h-4z" fill="#B97A3E" /></svg><b>3. Tu paies et récupères</b><small>Paiement en ligne, puis tu montres ton QR code pendant le créneau.</small></div>
        <div><svg viewBox="0 0 64 64"><path d="M14 30h36v24a4 4 0 0 1-4 4H18a4 4 0 0 1-4-4Z" fill="#B97A3E" /><path d="M10 22l40-10 3 10-40 10Z" fill="#6B4429" /><circle cx="24" cy="44" r="5" fill="#9C0F23" /><circle cx="38" cy="42" r="6" fill="#E9C46A" /></svg><b>4. Surprise révélée</b><small>Après le scan, le contenu s’affiche dans « Mes commandes ». Tu gagnes aussi tes EcoPoints.</small></div>
      </div>
      <ul className="how-rules">
        <li><b>Valeur garantie :</b> le contenu vaut au moins la valeur annoncée.</li>
        <li><b>Type annoncé :</b> sucré, salé ou mixte, pour savoir à quoi t’attendre.</li>
        <li><b>Allergènes :</b> les allergènes possibles sont affichés. En cas d’allergie, vérifie avant de réserver.</li>
        <li><b>Quantité limitée :</b> quelques paniers par soir ; quand il n’y en a plus, l’offre disparaît.</li>
      </ul>
      {offer && (
        <div className="how-detail">
          <div>
            <small style={{ opacity: .8 }}>{offer.commerceName} · retrait {offer.pickupStart} – {offer.pickupEnd}</small>
            <h3>Panier surprise · {SURPRISE_KINDS[offer.surpriseKind] || ''}</h3>
            <div className="chips" style={{ marginTop: 8 }}>
              <span className="chip">Valeur min. {fmtShort(offer.initialPrice)}</span>
              {offer.allergens && <span className="chip">Allergènes : {offer.allergens}</span>}
              <span className="chip">{offer.quantity} restant(s)</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <b style={{ fontFamily: 'Bricolage Grotesque', fontSize: '2rem', color: '#F3C77E' }}>{fmtShort(offer.discountPrice)}</b><br />
            {onReserve && <button className="btn sm" style={{ background: 'var(--cream)', color: 'var(--coffee)', borderColor: 'var(--cream)' }} onClick={() => onReserve(offer)}>Réserver ce panier</button>}
          </div>
        </div>
      )}
    </Modal>
  );
}
