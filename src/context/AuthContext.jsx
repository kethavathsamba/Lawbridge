import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getToken } from '../services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'lawbridge_token';
const USER_KEY = 'lawbridge_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.auth
        .me()
        .then((u) => {
          setUser(u);
          localStorage.setItem(USER_KEY, JSON.stringify(u));
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const { token, user: u } = await api.auth.login({ email, password });
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
    return u;
  };

  const register = async (data) => {
    const { token, user: u } = await api.auth.register({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      userType: data.userType,
      address: data.address || undefined,
      qualification: data.qualification || undefined,
      experience: data.experience || undefined,
      specialization: data.specialization || undefined,
      barCouncilId: data.barCouncilId || undefined,
      location: data.location || undefined,
    });
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setUser(u);
    return u;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isClient: user?.role === 'client',
        isLawyer: user?.role === 'lawyer',
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
