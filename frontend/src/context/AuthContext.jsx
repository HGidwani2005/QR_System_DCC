import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, microsoftProvider } from '../firebase';
import api from '../api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);
const ALLOWED_DOMAIN = import.meta.env.VITE_ALLOWED_DOMAIN || 'bennett.edu.in';
const ADMIN_ROLES = ['president', 'vice_president', 'general_secretary'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);         // Firebase user
  const [profile, setProfile] = useState(null);   // Firestore profile
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
          toast.error(`Only @${ALLOWED_DOMAIN} emails are allowed.`);
          await signOut(auth);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }
        setUser(firebaseUser);
        await fetchProfile();
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  async function fetchProfile() {
    setProfileLoading(true);
    try {
      const res = await api.get('/api/profile');
      setProfile(res.data.user);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }

  async function loginWithMicrosoft() {
    try {
      const result = await signInWithPopup(auth, microsoftProvider);
      const email = result.user.email || '';
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        toast.error(`Only @${ALLOWED_DOMAIN} emails are allowed.`);
        await signOut(auth);
        return;
      }
      toast.success('Signed in successfully!');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error(err.message || 'Sign in failed.');
      }
    }
  }

  async function logout() {
    await signOut(auth);
    setUser(null);
    setProfile(null);
    toast.success('Signed out.');
  }

  async function saveProfile(data) {
    const res = await api.post('/api/profile', data);
    setProfile(res.data.user);
    return res.data.user;
  }

  const isAdmin = profile && ADMIN_ROLES.includes(profile.role);
  const profileComplete = profile?.profileComplete === true;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      profileLoading,
      isAdmin,
      profileComplete,
      loginWithMicrosoft,
      logout,
      saveProfile,
      fetchProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
