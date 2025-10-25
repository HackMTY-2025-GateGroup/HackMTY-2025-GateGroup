import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();

  // Backend API base (optionally set VITE_API_URL in .env)
  const API_BASE = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // fetch profile from backend
      fetchProfile(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        // token invalid / expired
        localStorage.removeItem('token');
        setUser(null);
        setUserRole(null);
        setSession(null);
        return null;
      }

      const json = await res.json();
      const profile = json?.data?.user;
      if (profile) {
        setUser(profile);
        setUserRole(profile.role);
        setSession({ access_token: token });
        return profile;
      } else {
        return null;
      }
    } catch (err) {
      console.error('fetchProfile error:', err);
      localStorage.removeItem('token');
      setUser(null);
      setUserRole(null);
      setSession(null);
      return null;
    }
  };

  const fetchUserRole = async (userId) => {
    // keep for backward compatibility - attempt profile fetch if token exists
    const token = localStorage.getItem('token');
    if (!token) return setUserRole(null);
    await fetchProfile(token);
  };

  const signIn = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        return { data: null, error: new Error(json?.message || 'Login failed') };
      }

      const token = json?.data?.token;
      const user = json?.data?.user;

      if (token) {
        localStorage.setItem('token', token);
        setUser(user);
        setUserRole(user?.role || null);
        setSession({ access_token: token });
      }

      return { data: json, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const signUp = async (email, password, name) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const json = await res.json();

      if (!res.ok) {
        return { data: null, error: new Error(json?.message || 'Registration failed') };
      }

      // registration may return user+token depending on backend; do not auto-login by default
      return { data: json, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    // Clear local client state and token
    localStorage.removeItem('token');
    setUser(null);
    setSession(null);
    setUserRole(null);
    navigate('/login');
    return { error: null };
  };

  const value = {
    user,
    session,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
