// =============================================
// Catering Yönetim Sistemi - Ana Uygulama Girişi
// Provider sarmalayıcıları ve genel yapılandırma
// =============================================

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { useNotifications } from './src/hooks/useNotifications';

// Özel Material Design 3 Tema Ayarları
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#FF6B35', // Ana Catering Turuncusu
    primaryContainer: '#FFE5DC',
    secondary: '#004E64', // Koyu Teal
    secondaryContainer: '#E0F2F1',
    tertiary: '#25A18E', // Yeşil Vurgu
    background: '#F8F9FA',
    surface: '#FFFFFF',
    error: '#D32F2F',
    outline: '#E0E0E0',
  },
};

// Bildirimleri dinleyen iç bileşen
const AppContent: React.FC = () => {
  const { registerForPushNotifications } = useNotifications();

  useEffect(() => {
    // Uygulama açılışında FCM / push notification izni ve token al
    registerForPushNotifications();
  }, [registerForPushNotifications]);

  return (
    <NavigationContainer>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <AppNavigator />
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ReduxProvider store={store}>
          <PaperProvider theme={theme}>
            <AppContent />
          </PaperProvider>
        </ReduxProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

