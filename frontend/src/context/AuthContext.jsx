import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post } from '@/lib/api';

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

  // Load stored token/profile on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    // attempts to fetch profile using stored token (lib/api attaches token)
    (async () => {
      setLoading(true);
      await fetchProfile(token);
      setLoading(false);
    })();
  }, []);

  const fetchProfile = async (token) => {
    try {
      // Use backend profile route
      const json = await get('auth/profile');
      const profile = json?.data?.user;
      if (profile) {
        setUser(profile);
        setUserRole(profile.role);
        setSession({ access_token: token });
        return profile;
      } else {
        localStorage.removeItem('token');
        setUser(null);
        setUserRole(null);
        setSession(null);
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

  const signIn = async (email, entrance) => {
    try {
      const json = await post('auth/login', { email, entrance });
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
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email, entrance, name) => {
    try {
      const json = await post('auth/register', { email, entrance, name });
      return { data: json, error: null };
    } catch (err) {
      return { data: null, error: err };
    } finally {
      setLoading(false);
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
    fetchUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
