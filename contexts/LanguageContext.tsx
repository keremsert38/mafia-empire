import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { tr } from '@/locales/tr';
import { en } from '@/locales/en';

export type Language = 'tr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: typeof tr;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  tr,
  en,
};

const LANGUAGE_STORAGE_KEY = '@mafia_empire_language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('tr');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
    
    // Auth state değişikliğini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        loadLanguage();
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const loadLanguage = async () => {
    try {
      // Önce Supabase'den kullanıcı bilgisini al
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Kullanıcı giriş yapmışsa Supabase'den dil tercihini al
        const { data: playerData, error } = await supabase
          .from('player_stats')
          .select('language')
          .eq('id', user.id)
          .single();
        
        if (!error && playerData?.language) {
          const savedLanguage = playerData.language as Language;
          setLanguageState(savedLanguage);
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, savedLanguage);
          return;
        }
      }
      
      // Kullanıcı yoksa veya Supabase'de dil yoksa AsyncStorage'dan al
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && (savedLanguage === 'tr' || savedLanguage === 'en')) {
        setLanguageState(savedLanguage as Language);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      // AsyncStorage'a kaydet
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
      
      // Kullanıcı giriş yapmışsa Supabase'e de kaydet
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('player_stats')
          .update({ language: lang })
          .eq('id', user.id);
        
        if (error) {
          console.error('Error saving language to Supabase:', error);
        }
      }
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  if (isLoading) {
    return null; // veya bir loading component
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

