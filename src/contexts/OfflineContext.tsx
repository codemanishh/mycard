import React, { createContext, useContext } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

type OfflineContextValue = {
  syncState: 'idle' | 'syncing' | 'error';
  queueMutation: (type: string, payload: any) => Promise<{ ok: boolean; queued: boolean }>;
  syncQueue: () => Promise<boolean>;
};

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { syncState, queueMutation, syncQueue } = useOfflineSync();
  return (
    <OfflineContext.Provider value={{ syncState, queueMutation, syncQueue }}>
      {children}
    </OfflineContext.Provider>
  );
};

export function useOffline() {
  const c = useContext(OfflineContext);
  if (!c) throw new Error('useOffline must be used within OfflineProvider');
  return c;
}

export default OfflineContext;
