import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    console.log('🔥 AUTH CONTEXT SIGNUP:', { email, username });
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      console.log('🔥 SUPABASE SIGNUP RESULT:', { data, error });

      // Trigger otomatik oluşturacak, manuel backup'a gerek yok

      return { error };
    } catch (catchError) {
      console.error('🔥 SIGNUP CATCH ERROR:', catchError);
      return { error: catchError };
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('🔥 AUTH CONTEXT SIGNIN:', { email });
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log('🔥 SUPABASE SIGNIN RESULT:', { data, error });
    
    // Giriş başarılı ise player stats kontrol et ve oluştur
    if (!error && data.user) {
      console.log('🔥 LOGIN SUCCESS, CHECKING PLAYER STATS');
      
      // 2 saniye bekle sonra player stats kontrol et
      setTimeout(async () => {
        try {
          const { data: playerStats, error: statsError } = await supabase
            .from('player_stats')
            .select('id')
            .eq('id', data.user.id)
            .single();
          
          console.log('🔥 PLAYER STATS CHECK:', { playerStats, statsError });
          
          // Eğer player stats yoksa oluştur
          if (statsError && statsError.code === 'PGRST116') {
            console.log('🔥 CREATING MISSING PLAYER STATS');
            const username = data.user.user_metadata?.username || data.user.email?.split('@')[0] || 'Oyuncu';
            
            const { error: createError } = await supabase
              .from('player_stats')
              .insert({
                id: data.user.id,
                username,
                cash: 1000,
                level: 1,
                energy: 100,
                soldiers: 0,
                respect: 0,
                reputation: 0,
                strength: 10,
                defense: 10,
                speed: 10,
                intelligence: 10,
                charisma: 10,
                language: 'tr'
              });
            
            console.log('🔥 PLAYER STATS CREATION RESULT:', { createError });
            
            // Profile da oluştur
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                username,
                email: data.user.email
              });
            
            console.log('🔥 PROFILE CREATION RESULT:', { profileError });
          }
        } catch (error) {
          console.error('🔥 STATS CHECK ERROR:', error);
        }
      }, 2000);
      }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};