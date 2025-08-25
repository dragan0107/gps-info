import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

export interface Theme {
  colors: {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    border: string;
    shadow: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    compassBackground: string;
    speedometerBackground: string;
    cardBackground: string;
  };
  isDark: boolean;
}

const lightTheme: Theme = {
  colors: {
    background: '#f8fafc',
    surface: '#ffffff',
    primary: '#3b82f6',
    secondary: '#64748b',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    shadow: '#000000',
    accent: '#06b6d4',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    compassBackground: '#ffffff',
    speedometerBackground: '#0a0a0a',
    cardBackground: '#ffffff',
  },
  isDark: false,
};

const darkTheme: Theme = {
  colors: {
    background: '#0f172a',
    surface: '#1e293b',
    primary: '#60a5fa',
    secondary: '#94a3b8',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    border: '#334155',
    shadow: '#000000',
    accent: '#67e8f9',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    compassBackground: '#1e293b',
    speedometerBackground: '#0a0a0a',
    cardBackground: '#1e293b',
  },
  isDark: true,
};

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Get initial theme from system
    const colorScheme = Appearance.getColorScheme();
    setIsDark(colorScheme === 'dark');

    // Listen for system theme changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDark(colorScheme === 'dark');
    });

    return () => subscription?.remove();
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
