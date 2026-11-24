// [YATHREB] Fenêtre modale réutilisable (fermeture : Échap, clic à l'extérieur)
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, children, wide, className = '' }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  // bloque le défilement de la page derrière la fenêtre
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  if (!open) return null;
  // rendue directement dans <body> : au-dessus du menu (avant, elle restait sous la barre de navigation)
  return createPortal(
    <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()} role="dialog" aria-modal="true">
      <div className={`card ${wide ? 'wide' : ''} ${className}`}>{children}</div>
    </div>,
    document.body,
  );
}
