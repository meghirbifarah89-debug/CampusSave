// [YATHREB] Contexte d'authentification (Firebase Auth + profil/rôle du backend)
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const registering = useRef(false); // évite d'écraser le profil pendant l'inscription

  useEffect(() => onAuthStateChanged(auth, async (fbUser) => {
    if (registering.current) return;
    if (fbUser) {
      try { setProfile(await api.get('/auth/me')); } catch { setProfile(null); }
    } else setProfile(null);
    setLoading(false);
  }), []);

  const login = async (email, password) => {
    await signInWithEmailAndPassword(auth, email, password);
    const p = await api.get('/auth/me');
    setProfile(p);
    return p;
  };

  const register = async ({ email, password, name, phone, role }) => {
    registering.current = true;
    try {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (e) {
        if (e.code !== 'auth/email-already-in-use') throw e;
        await signInWithEmailAndPassword(auth, email, password);
      }
      const p = await api.post('/auth/register', { name, phone, role });
      setProfile(p);
      return p;
    } finally {
      registering.current = false;
      setLoading(false);
    }
  };

  const logout = () => signOut(auth);
  const refresh = async () => setProfile(await api.get('/auth/me'));

  return (
    <AuthContext.Provider value={{ profile, loading, login, register, logout, refresh, setProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
