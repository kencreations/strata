import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { PlannerScreen } from '../screens/PlannerScreen';
import { StudyHubScreen } from '../screens/StudyHubScreen';
import { VaultScreen } from '../screens/VaultScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { Colors, Typography, Spacing } from '../theme';

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  MainTabs: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Planner: undefined;
  Study: undefined;
  Vault: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIcon = 'home' | 'calendar-month' | 'timer' | 'folder-open' | 'person';

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarLabelStyle: {
          ...Typography.labelSm,
          marginBottom: 4,
        },
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: 'rgba(0,0,0,0.06)',
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, TabIcon> = {
            Home: 'home',
            Planner: 'calendar-month',
            Study: 'timer',
            Vault: 'folder-open',
            Profile: 'person',
          };
          return (
            <MaterialIcons
              name={icons[route.name] as any}
              size={24}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="Planner" component={PlannerScreen} />
      <Tab.Screen name="Study" component={StudyHubScreen} />
      <Tab.Screen name="Vault" component={VaultScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

import { useAuthStore } from '../store/authStore';

export function RootNavigator() {
  const { isLoggedIn } = useAuthStore();
  
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Auth" component={AuthScreen} />
        </>
      ) : (
        <Stack.Screen name="MainTabs" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
}
