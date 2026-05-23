import { useCallback, useEffect, useState } from 'react';
import { getProgress, subscribeStorage } from './storage';
import type { Progress } from '../types';

/**
 * React hook that reflects the current localStorage progress. Components
 * automatically re-render when any storage mutation happens via the
 * subscribe channel exposed by storage.ts (or via cross-tab `storage` events).
 */
export function useProgress(): Progress {
  const [progress, setProgress] = useState<Progress>(() => getProgress());

  const refresh = useCallback(() => setProgress(getProgress()), []);

  useEffect(() => {
    const unsub = subscribeStorage(refresh);
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key.startsWith('tf-learn:')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      unsub();
      window.removeEventListener('storage', onStorage);
    };
  }, [refresh]);

  return progress;
}
