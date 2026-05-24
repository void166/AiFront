import { useCallback, useEffect, useRef, useState } from 'react';
import type { Toast } from './types';

let _id = 0;
const nextId = () => `t${++_id}-${Date.now()}`;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Keep track of pending auto-dismiss timers so we can cancel them when a
  // toast is dismissed manually (or when the component unmounts). Without
  // this, rapid toast churn leaks timers and a manually-dismissed toast can
  // re-trigger filter() needlessly later.
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t != null) { window.clearTimeout(t); timers.current.delete(id); }
    setToasts(prev => prev.filter(x => x.id !== id));
  }, []);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = nextId();
    const ttl = t.ttl ?? 3600;
    setToasts(prev => [...prev, { ...t, id }]);
    if (ttl > 0) {
      const timerId = window.setTimeout(() => {
        timers.current.delete(id);
        setToasts(prev => prev.filter(x => x.id !== id));
      }, ttl);
      timers.current.set(id, timerId);
    }
    return id;
  }, []);

  // Cleanup all pending timers when the hook unmounts.
  useEffect(() => () => {
    timers.current.forEach(id => window.clearTimeout(id));
    timers.current.clear();
  }, []);

  return { toasts, push, dismiss };
}
