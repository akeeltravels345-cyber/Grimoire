import { Stack } from 'expo-router';
import { AlertProvider } from '@/template';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from '../contexts/AppContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="ritual/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="add-ritual" options={{ presentation: 'modal' }} />
            <Stack.Screen name="log-ritual" options={{ presentation: 'modal' }} />
            <Stack.Screen name="add-manifestation" options={{ presentation: 'modal' }} />
            <Stack.Screen name="manage-categories" options={{ presentation: 'modal' }} />
            <Stack.Screen name="profile" options={{ presentation: 'card' }} />
            <Stack.Screen name="add-library-ritual" options={{ presentation: 'modal' }} />
            <Stack.Screen name="add-to-practice" options={{ presentation: 'modal' }} />
            <Stack.Screen name="library-ritual/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="manifestation/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="journal-entry/[id]" options={{ presentation: 'card' }} />
            <Stack.Screen name="write-journal" options={{ presentation: 'modal' }} />
            <Stack.Screen name="spell-research" options={{ presentation: 'card' }} />
            <Stack.Screen name="core-practice-settings" options={{ presentation: 'card' }} />
            <Stack.Screen name="monthly-intention" options={{ presentation: 'card' }} />
          </Stack>
        </AppProvider>
      </SafeAreaProvider>
      </GestureHandlerRootView>
    </AlertProvider>
  );
}
