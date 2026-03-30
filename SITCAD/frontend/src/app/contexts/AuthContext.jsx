import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../lib/firebase';

// ─── DEV BYPASS ──────────────────────────────────────────────────────────────
// Set to true to skip Firebase + backend auth entirely.
// Useful when the backend is not running locally.
const DEV_BYPASS_AUTH = false;
const DEV_BYPASS_USER = { id: 'dev-teacher', name: 'Dev Teacher', email: 'teacher@school.edu', role: 'teacher' };
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Google Provider
  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      setUser(DEV_BYPASS_USER);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch real user data from our FastAPI backend
          const idToken = await firebaseUser.getIdToken();
          const response = await fetch('http://localhost:8000/auth/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: idToken })
          });

          if (response.ok) {
            const dbUser = await response.json();
            setUser({
              id: dbUser.id,
              name: dbUser.full_name,
              email: dbUser.email,
              photo: firebaseUser.photoURL,
              role: dbUser.role,
            });
          } else {
            // Fallback for safety if sync fails during re-auth
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              photo: firebaseUser.photoURL,
              role: null,
            });
          }
        } catch (error) {
          console.error("Auth sync error:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const googleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();

      const response = await fetch('http://localhost:8000/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_token: idToken,
          full_name: firebaseUser.displayName || 'User'
        })
      });

      if (!response.ok) throw new Error('Backend sync failed');

      const dbUser = await response.json();
      setUser({
        id: dbUser.id,
        name: dbUser.full_name,
        email: dbUser.email,
        photo: firebaseUser.photoURL,
        role: dbUser.role,
      });

      return dbUser;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (role) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) throw new Error('No authenticated user');

    const idToken = await firebaseUser.getIdToken();
    const response = await fetch('http://localhost:8000/auth/update-role', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken, role })
    });

    if (!response.ok) throw new Error('Failed to update role');

    const dbUser = await response.json();
    setUser((prev) => ({ ...prev, role: dbUser.role }));
    return dbUser.role;
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const login = async (email, password) => {
    if (DEV_BYPASS_AUTH) {
      setUser(DEV_BYPASS_USER);
      return DEV_BYPASS_USER.role;
    }

    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();

      const response = await fetch('http://localhost:8000/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken })
      });

      if (!response.ok) throw new Error('Backend sync failed');

      const dbUser = await response.json();
      setUser({
        id: dbUser.id,
        name: dbUser.full_name,
        email: dbUser.email,
        photo: firebaseUser.photoURL,
        role: dbUser.role,
      });

      return dbUser.role;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password, fullName, role, adminSecret = null) => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      const idToken = await firebaseUser.getIdToken();

      const body = { id_token: idToken, role, full_name: fullName };
      if (adminSecret) body.admin_secret = adminSecret;

      const response = await fetch('http://localhost:8000/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || 'Backend sync failed');
      }

      const dbUser = await response.json();
      setUser({
        id: dbUser.id,
        name: dbUser.full_name,
        email: dbUser.email,
        photo: firebaseUser.photoURL,
        role: dbUser.role,
      });

      return dbUser.role;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, googleLogin, updateRole, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}