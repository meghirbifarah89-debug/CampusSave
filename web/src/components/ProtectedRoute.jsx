// [YATHREB] Protection des pages selon le rôle
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, children }) {
  const { profile, loading } = useAuth();
  if (loading) return <p className="center">Chargement…</p>;
  if (!profile) return <Navigate to="/connexion" replace />;
  if (roles && !roles.includes(profile.role)) return <Navigate to="/" replace />;
  return children;
}
