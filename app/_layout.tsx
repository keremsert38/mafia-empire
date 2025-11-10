import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import BackgroundImage from '@/components/BackgroundImage';
import { RevenueCatService } from '@/services/RevenueCatService';

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // RevenueCat'i başlat
    RevenueCatService.getInstance().initialize().catch(console.error);
  }, []);

  return (
    <BackgroundImage>
      <LanguageProvider>
        <AuthProvider>
          <Stack 
            screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' }, // Stack içeriği şeffaf
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="light" />
        </AuthProvider>
      </LanguageProvider>
    </BackgroundImage>
  );
}
