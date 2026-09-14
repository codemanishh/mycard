import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Clear any previous demo state if present
    localStorage.removeItem('demo_mode');

    let unsubscribe: (() => void) | undefined;
    try {
      const authRes = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      });
      if (authRes?.data?.subscription) {
        unsubscribe = () => authRes.data.subscription.unsubscribe();
      }
    } catch (err) {
      console.warn('onAuthStateChange failed:', err);
    }

    supabase.auth.getSession()
      .then(({ data }) => {
        if (!mounted) return;
        if (data?.session) {
          setSession(data.session);
          setUser(data.session.user);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn('getSession failed:', err);
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setUser(null);
    setSession(null);
  };

  return { user, session, loading, signOut };
};


