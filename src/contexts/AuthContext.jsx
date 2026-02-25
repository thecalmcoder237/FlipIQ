import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setLoading(false);
    }).catch(err => {
      console.error("Auth session check failed:", err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      setCurrentUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser?.id) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, email, display_name, role')
      .eq('id', currentUser.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) {
          if (!cancelled && error) console.error('Profile fetch failed:', error);
          return;
        }
        setProfile(data ? {
          id: data.id,
          email: data.email ?? '',
          displayName: data.display_name ?? data.email ?? 'Unknown',
          role: data.role ?? 'user',
        } : null);
      });
    return () => { cancelled = true; };
  }, [currentUser?.id]);

  const signUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Success!",
        description: "Account created successfully. Please check your email to confirm.",
      });
      
      return { data, error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: error.message,
      });
      return { data: null, error };
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: "Welcome back!",
        description: "Signed in successfully.",
      });
      
      return { data, error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: error.message,
      });
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed Out",
        description: "You have been signed out successfully.",
      });
      
      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign Out Failed",
        description: error.message,
      });
      return { error };
    }
  };

  const isAdmin = profile?.role === 'admin';

  const value = {
    currentUser,
    profile,
    isAdmin,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
