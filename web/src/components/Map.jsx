// [YATHREB] Cartes interactives (Leaflet + OpenStreetMap, sans clé API)
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const ESSECT = { lat: 36.7903, lng: 10.169 }; // point par défaut : ESSECT, Montfleury
export const pinIcon = (emoji, partner = true) => L.divIcon({ className: '', html: `<div class="pin ${partner ? 'p' : 'e'}"><span>${emoji}</span></div>`, iconSize: [36, 36], iconAnchor: [18, 36], popupAnchor: [0, -32] });
export const meIcon = () => L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [18, 18] });
export const tiles = (map) => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);

// Carte simple avec un point (profil d'un commerce)
export function MiniMap({ lat, lng, label, emoji = '🏪' }) {
  const el = useRef(null);
  useEffect(() => {
    if (lat == null || lng == null) return;
    const map = L.map(el.current, { scrollWheelZoom: false }).setView([lat, lng], 16);
    tiles(map);
    L.marker([lat, lng], { icon: pinIcon(emoji) }).addTo(map).bindPopup(label || '');
    return () => map.remove();
  }, [lat, lng, label, emoji]);
  if (lat == null || lng == null) return <div className="map" style={{ display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>Position non renseignée</div>;
  return <div className="map" ref={el} />;
}

// Choisir la position en cliquant sur la carte (formulaire du commerce)
export function MapPicker({ lat, lng, onChange }) {
  const el = useRef(null);
  const marker = useRef(null);
  const mapRef = useRef(null);
  useEffect(() => {
    const start = lat != null && lng != null ? [lat, lng] : [ESSECT.lat, ESSECT.lng];
    const map = L.map(el.current).setView(start, 15);
    mapRef.current = map;
    tiles(map);
    const place = (ll) => {
      if (!marker.current) marker.current = L.marker(ll, { icon: pinIcon('🏪'), draggable: true }).addTo(map).on('dragend', (e) => { const p = e.target.getLatLng(); onChange(+p.lat.toFixed(6), +p.lng.toFixed(6)); });
      else marker.current.setLatLng(ll);
    };
    if (lat != null && lng != null) place(start);
    map.on('click', (e) => { place(e.latlng); onChange(+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)); });
    setTimeout(() => map.invalidateSize(), 150);
    return () => { map.remove(); marker.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className="map" ref={el} style={{ height: 240 }} />;
}

// Distance réelle entre deux points (formule de Haversine), en mètres
export function distance(a, b) {
  const R = 6371e3, r = Math.PI / 180, dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const fmtDistance = (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);
export { L };
