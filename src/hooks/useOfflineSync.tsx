import { useEffect, useState, useCallback, useRef } from 'react';
import { addToQueue, getQueue, removeFromQueue } from '@/lib/offline';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

// Provider/hook for offline queueing and sync. All pages can import and use `useOfflineSync()`

type Mutation = {
  id: string;
  type: string;
  payload: any;
  created_at: string;
};

export function useOfflineSync() {
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'error'>('idle');
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const syncingRef = useRef(false);

  const queueMutation = useCallback(async (type: string, payload: any) => {
    const item = { id: uuidv4(), type, payload };
    try {
      // If online, try to run immediately
      if (navigator.onLine) {
        const ok = await tryRunMutation(item);
        if (ok) return { ok: true, queued: false };
      }
      // Otherwise queue for later
      await addToQueue(item);
      return { ok: true, queued: true };
    } catch (err) {
      // still store in queue for retry
      try { await addToQueue(item); } catch (e) { console.error('Failed to queue mutation', e); }
      return { ok: false, queued: true };
    }
  }, []);

  const tryRunMutation = useCallback(async (item: Mutation): Promise<boolean> => {
    try {
      // If type is 'supabase' we expect a generic payload that describes
      // the operation: { op: 'insert'|'update'|'delete', table: string, data: any, match?: { id?: string } }
      if (item.type === 'supabase') {
        const p = item.payload as any;
        if (!p || !p.op || !p.table) {
          console.debug('Invalid supabase offline payload', p);
        } else {
          if (p.op === 'insert') {
            const { data, error } = await supabase.from(p.table).insert(p.data).select();
            if (error) throw error;
          } else if (p.op === 'update') {
            if (p.match && p.match.id) {
              const { data, error } = await supabase.from(p.table).update(p.data).eq('id', p.match.id);
              if (error) throw error;
            } else {
              // fallback: attempt update without match (may fail)
              const { data, error } = await supabase.from(p.table).update(p.data);
              if (error) throw error;
            }
          } else if (p.op === 'delete') {
            if (p.match && p.match.id) {
              const { data, error } = await supabase.from(p.table).delete().eq('id', p.match.id);
              if (error) throw error;
            } else {
              const { data, error } = await supabase.from(p.table).delete();
              if (error) throw error;
            }
          } else {
            console.debug('Unknown supabase op', p.op);
          }
        }
      } else {
        // Backwards-compatible handling for existing specific types
        if (item.type === 'create_todo') {
          const { data, error } = await supabase.from('todos').insert([item.payload]);
          if (error) throw error;
        } else if (item.type === 'update_todo') {
          const { data, error } = await supabase.from('todos').update(item.payload).eq('id', item.payload.id);
          if (error) throw error;
        } else if (item.type === 'delete_todo') {
          const { data, error } = await supabase.from('todos').update({ is_deleted: true }).eq('id', item.payload.id);
          if (error) throw error;
        } else {
          console.debug('Unknown offline mutation type', item.type);
        }
      }
      return true;
    } catch (err) {
      console.error('Mutation failed', err);
      return false;
    }
  }, []);

  const syncQueue = useCallback(async () => {
    if (!navigator.onLine) return;
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncState('syncing');
    try {
      const items = await getQueue();
      for (const it of items) {
        const ok = await tryRunMutation(it as Mutation);
        if (ok) {
          await removeFromQueue(it.id);
        }
      }
      setSyncState('idle');
      syncingRef.current = false;
      return true;
    } catch (err) {
      console.error('Sync failed', err);
      setSyncState('error');
      syncingRef.current = false;
      return false;
    }
  }, [tryRunMutation]);

  useEffect(() => {
    const onOnline = () => { syncQueue(); };
    window.addEventListener('online', onOnline);
    // attempt to sync at mount if online
    if (navigator.onLine) syncQueue();
    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, [syncQueue]);

  return { syncState, queueMutation, syncQueue };
}
