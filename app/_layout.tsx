import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { TutorialProvider } from '@/contexts/TutorialContext';
import BackgroundImage from '@/components/BackgroundImage';
import PurchaseService from '@/services/PurchaseService';
import { musicService } from '@/services/MusicService';

// Push notification handler - uygulama açıkken bildirimleri göster
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // RevenueCat'i başlat
    PurchaseService.configure().catch(console.error);

    // Müzik servisini başlat ve çal
    musicService.initialize().then(() => {
      musicService.loadAndPlay();
    }).catch(console.error);
  }, []);

  return (
    <BackgroundImage>
      <LanguageProvider>
        <AuthProvider>
          <TutorialProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            >
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="light" />
          </TutorialProvider>
        </AuthProvider>
      </LanguageProvider>
    </BackgroundImage>
  );
}
