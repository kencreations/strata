import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { RootNavigator } from './src/navigation/RootNavigator';
import { DatabaseProvider } from './src/db/DatabaseProvider';
import { useAuthStore } from './src/store/authStore';
import { Colors } from './src/theme';

// Keep splash screen visible while loading fonts and auth
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function AppContent() {
  const { initialize, isLoggedIn, isGuest } = useAuthStore();
  const [isReady, setIsReady] = React.useState(false);

  useEffect(() => {
    // Initialize auth state
    initialize().finally(() => {
      setIsReady(true);
    });
  }, [initialize]);

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const onLayoutRootView = useCallback(async () => {
    if (isReady && (fontsLoaded || fontError)) {
      await SplashScreen.hideAsync();
    }
  }, [isReady, fontsLoaded, fontError]);

  if (!isReady || (!fontsLoaded && !fontError)) {
    return null;
  }

  // If not logged in and not a guest, ideally we'd show an AuthNavigator,
  // but for this flow we start at Onboarding which handles guest auth.
  
  return (
    <View style={styles.root} onLayout={onLayoutRootView}>
      <StatusBar style="dark" />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <DatabaseProvider>
          <AppContent />
        </DatabaseProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
