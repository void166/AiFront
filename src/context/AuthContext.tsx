import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@integration/authApi';

const TOKEN_KEY    = 'reel_ai_token';
const EMAIL_KEY    = 'reel_ai_email';
const USER_ID_KEY  = 'reel_ai_user_id';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login:  (user: AuthUser) => void;
  logout: () => void;
  isAuthed: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const email = localStorage.getItem(EMAIL_KEY);
    const id    = localStorage.getItem(USER_ID_KEY);
    return token && email ? { token, email, id: id ?? '' } : null;
  });

  const login = useCallback((u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY,   u.token);
    localStorage.setItem(EMAIL_KEY,   u.email);
    localStorage.setItem(USER_ID_KEY, u.id ?? '');
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(USER_ID_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token: user?.token ?? null, login, logout, isAuthed: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
