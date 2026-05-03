'use client';

import * as React from 'react';
import { auth } from '@/lib/auth';

interface SessionContextValue {
  isAuthenticated: boolean;
  refresh: () => void;
  logout: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | undefined>(undefined);

/**
 * Wrap any actor segment that needs auth-aware UI (livreur/vendor/admin layouts)
 * with <SessionProvider>. Public consumer pages don't need it.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setAuth] = React.useState(() => auth.isAuthenticated());

  const refresh = React.useCallback(() => setAuth(auth.isAuthenticated()), []);
  const logout = React.useCallback(async () => {
    await auth.logout();
    setAuth(false);
  }, []);

  // Sync across tabs.
  React.useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'chopnow.access') refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  const value = React.useMemo(
    () => ({ isAuthenticated, refresh, logout }),
    [isAuthenticated, refresh, logout],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
