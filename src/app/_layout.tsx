import '../global.css';

import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_500Medium } from '@expo-google-fonts/jetbrains-mono';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { useAuth } from '@/store/useAuth';
import { useTheme } from '@/store/useTheme';
import { useSyncController } from '@/sync/useSyncController';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const initAuth = useAuth((s) => s.init);
  const initTheme = useTheme((s) => s.init);
  const recovery = useAuth((s) => s.recovery);

  useEffect(() => {
    initAuth();
    initTheme();
  }, [initAuth, initTheme]);

  // A password-recovery link was opened — send the user to set a new password.
  useEffect(() => {
    if (recovery) router.push('/reset-password');
  }, [recovery]);

  useSyncController();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Sora_600SemiBold,
    Sora_700Bold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="entry" options={{ presentation: 'modal' }} />
          <Stack.Screen name="category" options={{ presentation: 'modal' }} />
          <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
          <Stack.Screen name="reset-password" options={{ presentation: 'modal' }} />
          <Stack.Screen name="connection" options={{ presentation: 'modal' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
