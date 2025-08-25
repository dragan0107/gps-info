import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import MainScreen from './src/screens/MainScreen';
import SpeedDashboard from './src/screens/SpeedDashboard';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  const insets = useSafeAreaInsets();
  const { theme, toggleTheme, isDark } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 60 + Math.max(insets.bottom - 8, 0),
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 2,
        },
      }}
    >
      <Tab.Screen 
        name="GPS Info" 
        component={MainScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🧭</Text>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 15 }}>
              <Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <Tab.Screen 
        name="Speed" 
        component={SpeedDashboard}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🚗</Text>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={toggleTheme} style={{ marginRight: 15 }}>
              <Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

