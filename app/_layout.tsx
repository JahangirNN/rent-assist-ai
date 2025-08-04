import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaView, StyleSheet, Modal, View, ActivityIndicator } from 'react-native';

// Import Firebase
import { app } from '../firebase/config';
import { NetworkProvider, useNetworkContext } from '@/context/NetworkContext';
import { AppProvider, useApp } from '@/context/AppContext';
import { OfflineNotice } from '@/components/OfflineNotice';
import { ThemedView } from '@/components/ThemedView';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isConnected } = useNetworkContext();
  const { isLoading } = useApp();

  if (isLoading) {
    return (
        <ThemedView style={styles.centeredView}>
            <ActivityIndicator size="large" />
        </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
        <Modal
            animationType="slide"
            transparent={true}
            visible={!isConnected}
        >
            <View style={styles.centeredView}>
                <OfflineNotice />
            </View>
        </Modal>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="group/detail" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <NetworkProvider>
        <AppProvider>
            <RootLayoutNav />
        </AppProvider>
    </NetworkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});