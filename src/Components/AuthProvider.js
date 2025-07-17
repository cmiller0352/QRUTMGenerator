import React, { createContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Failed to fetch profile:', error);
        setProfile(null);
      } else {
        setProfile(data);
      }
    };

    fetchProfile();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
