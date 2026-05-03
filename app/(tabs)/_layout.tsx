import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { theme } from '../../constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: Platform.select({
            ios: insets.bottom + 60,
            android: insets.bottom + 60,
            default: 70,
          }),
          paddingTop: 8,
          paddingBottom: Platform.select({
            ios: insets.bottom + 8,
            android: insets.bottom + 8,
            default: 8,
          }),
          backgroundColor: '#1C0E3A',
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.10)',
        },
        tabBarActiveTintColor: '#F5D5E0',
        tabBarInactiveTintColor: 'rgba(200,180,220,0.5)',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          textShadowColor: 'rgba(245,213,224,0.6)',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="menu-book" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rituals"
        options={{
          title: 'Rituals',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="candle" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="planetary"
        options={{
          title: 'Planets',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="brightness-7" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="edit-note" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="manifestations"
        options={{ href: null }}
      />
    </Tabs>
  );
}
