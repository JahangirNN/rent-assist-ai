import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { TabBarBackground } from '@/components/ui/TabBarBackground';
import { t } from '@/locales/i18n';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].primary,
        tabBarInactiveTintColor: Colors[colorScheme ?? 'light'].tabIconDefault,
        tabBarStyle: {
            position: 'absolute',
            borderTopWidth: 0,
            elevation: 0, 
        },
        tabBarShowLabel: false,
        headerShown: false,
        tabBarBackground: () => <TabBarBackground />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('dashboard'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
                name={focused ? 'analytics' : 'analytics-outline'}
                size={24}
                color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={24}
                color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}