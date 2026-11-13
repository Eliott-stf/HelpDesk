import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as api from './api';
import type { User } from './types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const restore = async () => {
    try {
      const session = await api.refresh();
      api.setAccessToken(session.accessToken);
      setUser(session.user);
      return true;
    } catch {
      api.setAccessToken(null);
      setUser(null);
      return false;
    }
  };

  useEffect(() => {
    api.setRefreshHandler(restore);
    restore().finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async signIn(email, password) {
      const session = await api.login(email, password);
      api.setAccessToken(session.accessToken);
      setUser(session.user);
    },
    async signUp(name, email, password) {
      const session = await api.register(name, email, password);
      api.setAccessToken(session.accessToken);
      setUser(session.user);
    },
    async signOut() {
      await api.logout();
      api.setAccessToken(null);
      setUser(null);
    },
  }), [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return value;
}
