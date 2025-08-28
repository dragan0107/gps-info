import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  AppState,
  AppStateStatus,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationService, LocationData, PlaceInfo } from '../services/locationService';
import { SpeedLimitService } from '../services/speedLimitService';
import Compass from '../components/Compass';
import SpeedLimitIndicator from '../components/SpeedLimitIndicator';
import { useTheme } from '../contexts/ThemeContext';

// Simple Signal Strength Component
const SignalStrength = ({ accuracy }: { accuracy: number | null }) => {
  const { theme, isDark } = useTheme();
  
  const getSignalLevel = (acc: number | null): number => {
    if (!acc) return 0;
    if (acc <= 5) return 4; // Excellent
    if (acc <= 10) return 3; // Good
    if (acc <= 20) return 2; // Fair
    if (acc <= 50) return 1; // Poor
    return 0; // Very Poor
  };

  const getSignalColor = (level: number): string => {
    switch (level) {
      case 4: return '#10b981'; // green
      case 3: return '#84cc16'; // lime
      case 2: return '#f59e0b'; // amber
      case 1: return '#f97316'; // orange
      default: return '#ef4444'; // red
    }
  };

  const signalLevel = getSignalLevel(accuracy);
  const signalColor = getSignalColor(signalLevel);

  const signalStyles = StyleSheet.create({
    signalContainer: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 8,
      alignItems: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.colors.border,
    },
    signalLabel: {
      fontSize: 12,
      marginBottom: 4,
      color: theme.colors.text,
      fontWeight: '600',
    },
    signalBars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      marginBottom: 4,
      gap: 2,
    },
    signalBar: {
      width: 4,
      borderRadius: 1,
    },
    signalText: {
      fontSize: 10,
      color: theme.colors.textSecondary,
      fontWeight: '600',
    },
  });

  return (
    <View style={signalStyles.signalContainer}>
      <Text style={signalStyles.signalLabel}>GPS</Text>
      <View style={signalStyles.signalBars}>
        {[1, 2, 3, 4].map((bar) => (
          <View
            key={bar}
            style={[
              signalStyles.signalBar,
              {
                height: bar * 3 + 6,
                backgroundColor: bar <= signalLevel ? signalColor : (isDark ? '#374151' : '#e5e7eb'),
              },
            ]}
          />
        ))}
      </View>
      <Text style={signalStyles.signalText}>
        {accuracy ? `${Math.round(accuracy)}m` : 'N/A'}
      </Text>
    </View>
  );
};

export default function MainScreen() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { theme, toggleTheme, isDark } = useTheme();

  const locationService = LocationService.getInstance();
  const speedLimitService = SpeedLimitService.getInstance();

  useEffect(() => {
    initializeLocationTracking();
    
    // HERE API disabled - OpenStreetMap provides 100% coverage for Serbian roads
    // speedLimitService.initializeHereAPI('YTmXMKsTPWORW5lNK8rIRwjWTd9xhBCRgZIjBfGiGpY');
    
    // Handle app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App has come to the foreground
        console.log('App is now active');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      locationService.stopLocationTracking();
    };
  }, []);

  const initializeLocationTracking = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Add location listener
      const locationListener = (locationData: LocationData) => {
        setLocation(locationData);
        
        // Update place info when location changes significantly
        if (locationData.latitude && locationData.longitude) {
          updatePlaceInfo(locationData.latitude, locationData.longitude);
        }
      };

      locationService.addLocationListener(locationListener);

      // Start location tracking
      await locationService.startLocationTracking();
      
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to initialize location tracking:', err);
      setError('Failed to start location tracking. Please check permissions.');
      setIsLoading(false);
      
      Alert.alert(
        'Location Permission Required',
        'This app needs location permission to display GPS information. Please enable location access in your device settings.',
        [{ text: 'OK' }]
      );
    }
  };

  const updatePlaceInfo = async (latitude: number, longitude: number) => {
    try {
      const place = await locationService.reverseGeocode(latitude, longitude);
      setPlaceInfo(place);
    } catch (err) {
      console.error('Failed to get place info:', err);
    }
  };

  const formatCoordinate = (value: number, type: 'lat' | 'lng'): string => {
    const direction = type === 'lat' 
      ? (value >= 0 ? 'N' : 'S')
      : (value >= 0 ? 'E' : 'W');
    return `${Math.abs(value).toFixed(6)}° ${direction}`;
  };

  const formatAltitude = (altitude: number | null): string => {
    if (altitude === null) return 'N/A';
    return `${Math.round(altitude)} m`;
  };

  const formatGPSAltitude = (altitude: number | null): string => {
    if (altitude === null) return 'N/A';
    // GPS altitude is typically lower than corrected altitude
    const gpsAltitude = altitude ? altitude - 44 : null; // Approximate geoid separation
    return gpsAltitude ? `${Math.round(gpsAltitude)} m` : 'N/A';
  };

  const formatSpeed = (speed: number | null): string => {
    const speedKmh = LocationService.convertSpeedToKmh(speed);
    if (speedKmh === null) return 'N/A';
    return `${speedKmh.toFixed(1)} km/h`;
  };

  const formatAccuracy = (accuracy: number | null): string => {
    if (accuracy === null) return 'N/A';
    return `±${Math.round(accuracy)} m`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <Text style={styles.loadingTitle}>
          Initializing GPS...
        </Text>
        <Text style={styles.loadingSubtitle}>
          Please wait while we get your location
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar style="dark" />
        <Text style={styles.errorTitle}>
          GPS Error
        </Text>
        <Text style={styles.errorText}>
          {error}
        </Text>
      </View>
    );
  }

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: 16,
    },
    header: {
      marginBottom: 20,
      alignItems: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginTop: 25,
    },
    subtitle: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    themeToggle: {
      position: 'absolute',
      top: insets.top + 10,
      left: 20,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      padding: 10,
      elevation: 4,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      zIndex: 1000,
    },
    card: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.colors.border,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    cardContent: {
      gap: 12,
    },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    dataLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    dataValue: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    locationRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    locationLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontWeight: '500',
    },
    locationValue: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '600',
      textAlign: 'right',
      flex: 1,
      marginLeft: 12,
    },
    locationContent: {
      gap: 8,
    },
    locationPlaceholder: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      {/* Theme Toggle Button */}
      <TouchableOpacity style={dynamicStyles.themeToggle} onPress={toggleTheme}>
        <Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>
      
      {/* Signal Strength in top right */}
      <View style={styles.signalPosition}>
        <SignalStrength accuracy={location?.accuracy || null} />
      </View>
      
      <ScrollView 
        style={dynamicStyles.scrollView}
        contentContainerStyle={[dynamicStyles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.title}>
            GPS Info
          </Text>

        </View>

        {/* Compass */}
        <Compass style={styles.compass} />

        {/* Speed Limit Card */}
        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.cardTitle}>
            🚦 Speed Limit
          </Text>
          <SpeedLimitIndicator 
            location={location} 
            style={styles.speedLimitIndicator}
          />
        </View>

        {/* GPS Data Cards */}
        <View style={styles.cardsContainer}>
          {/* Coordinates Card */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.cardTitle}>
              📍 Coordinates
            </Text>
            <View style={dynamicStyles.cardContent}>
              <View style={dynamicStyles.dataRow}>
                <Text style={dynamicStyles.dataLabel}>Latitude:</Text>
                <Text style={dynamicStyles.dataValue}>
                  {location ? formatCoordinate(location.latitude, 'lat') : 'N/A'}
                </Text>
              </View>
              <View style={dynamicStyles.dataRow}>
                <Text style={dynamicStyles.dataLabel}>Longitude:</Text>
                <Text style={dynamicStyles.dataValue}>
                  {location ? formatCoordinate(location.longitude, 'lng') : 'N/A'}
                </Text>
              </View>
              <View style={dynamicStyles.dataRow}>
                <Text style={dynamicStyles.dataLabel}>Accuracy:</Text>
                <Text style={dynamicStyles.dataValue}>
                  {location ? formatAccuracy(location.accuracy) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Altitude & Speed Card */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.cardTitle}>
              📊 Movement Data
            </Text>
            <View style={dynamicStyles.cardContent}>
              <View style={dynamicStyles.dataRow}>
                <Text style={dynamicStyles.dataLabel}>API Altitude:</Text>
                <Text style={dynamicStyles.dataValue}>
                  {location ? formatAltitude(location.altitude) : 'N/A'}
                </Text>
              </View>
              <View style={dynamicStyles.dataRow}>
                <Text style={dynamicStyles.dataLabel}>GPS Altitude:</Text>
                <Text style={dynamicStyles.dataValue}>
                  {location ? formatGPSAltitude(location.altitude) : 'N/A'}
                </Text>
              </View>
              <View style={dynamicStyles.dataRow}>
                <Text style={dynamicStyles.dataLabel}>Speed:</Text>
                <Text style={dynamicStyles.dataValue}>
                  {location ? formatSpeed(location.speed) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Location Info Card */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.cardTitle}>
              🏠 Location
            </Text>
            {placeInfo ? (
              <View style={dynamicStyles.cardContent}>
                {placeInfo.street && (
                  <View style={dynamicStyles.dataRow}>
                    <Text style={dynamicStyles.dataLabel}>Street:</Text>
                    <Text style={dynamicStyles.locationValue}>
                      {placeInfo.street}
                    </Text>
                  </View>
                )}
                {placeInfo.city && (
                  <View style={dynamicStyles.dataRow}>
                    <Text style={dynamicStyles.dataLabel}>City:</Text>
                    <Text style={dynamicStyles.locationValue}>
                      {placeInfo.city}
                    </Text>
                  </View>
                )}
                {placeInfo.region && (
                  <View style={dynamicStyles.dataRow}>
                    <Text style={dynamicStyles.dataLabel}>Region:</Text>
                    <Text style={dynamicStyles.locationValue}>
                      {placeInfo.region}
                    </Text>
                  </View>
                )}
                {placeInfo.country && (
                  <View style={dynamicStyles.dataRow}>
                    <Text style={dynamicStyles.dataLabel}>Country:</Text>
                    <Text style={dynamicStyles.locationValue}>
                      {placeInfo.country}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={dynamicStyles.locationPlaceholder}>
                {location ? 'Loading location info...' : 'No location data'}
              </Text>
            )}
          </View>

          {/* Status Card */}
          <View style={dynamicStyles.card}>
            <Text style={dynamicStyles.cardTitle}>
              ⚡ Status
            </Text>
            <View style={dynamicStyles.cardContent}>
              <View style={dynamicStyles.dataRow}>
                <Text style={dynamicStyles.dataLabel}>GPS Status:</Text>
                <Text style={[
                  styles.dataValue, 
                  styles.statusText,
                  location ? styles.statusActive : styles.statusInactive
                ]}>
                  {location ? 'Active' : 'Inactive'}
                </Text>
              </View>
              {location && (
                <View style={dynamicStyles.dataRow}>
                  <Text style={dynamicStyles.dataLabel}>Last Update:</Text>
                  <Text style={dynamicStyles.dataValue}>
                    {new Date(location.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 100, // Increased to account for tab bar
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
  compass: {
    marginBottom: 20,
  },
  speedLimitIndicator: {
    alignSelf: 'center',
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    padding: 0,
    borderWidth: 0,
  },
  cardsContainer: {
    // gap replaced with marginBottom on child elements
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  cardContent: {
    // gap replaced with marginBottom on child elements  
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dataLabel: {
    color: '#6b7280',
    fontSize: 14,
  },
  dataValue: {
    fontFamily: 'monospace',
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '500',
  },
  locationText: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'System',
  },
  placeholderText: {
    color: '#9ca3af',
    fontStyle: 'italic',
    fontSize: 14,
  },
  statusText: {
    fontWeight: '600',
    fontFamily: 'System',
  },
  statusActive: {
    color: '#059669',
  },
  statusInactive: {
    color: '#dc2626',
  },
  timestampText: {
    fontSize: 12,
    fontFamily: 'System',
  },
  // Signal Strength Styles
  signalPosition: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  signalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  signalLabel: {
    fontSize: 12,
    marginRight: 4,
  },
  signalBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginRight: 4,
  },
  signalBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  signalText: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '500',
  },
});
