import { useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // If the OAuth redirect returned tokens in the URL hash (e.g. #access_token=...)
    // parse and store that session first so getSession() returns the correct value.
    const init = async () => {
      try {
        const hash = window.location.hash;
        if (hash && (hash.includes('access_token') || hash.includes('refresh_token') || hash.includes('provider_token') || hash.includes('error')) ) {
          // This will parse the URL hash and store the session in the configured storage
          const { data, error } = await supabase.auth.getSessionFromUrl();
          if (error) console.debug('getSessionFromUrl error', error.message ?? error);

          // Clean the URL to remove the hash and tokens
          try {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          } catch (e) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }

      // THEN check for existing session
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    init();

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
};
