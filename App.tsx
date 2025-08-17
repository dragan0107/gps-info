import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  AppState,
  AppStateStatus,
  StyleSheet,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LocationService, LocationData, PlaceInfo } from './src/services/locationService';
import Compass from './src/components/Compass';

// Simple Signal Strength Component
const SignalStrength = ({ accuracy }: { accuracy: number | null }) => {
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

  return (
    <View style={styles.signalContainer}>
      <Text style={styles.signalLabel}>📶</Text>
      <View style={styles.signalBars}>
        {[1, 2, 3, 4].map((bar) => (
          <View
            key={bar}
            style={[
              styles.signalBar,
              {
                height: bar * 3 + 6,
                backgroundColor: bar <= signalLevel ? signalColor : '#e5e7eb',
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.signalText}>
        {accuracy ? `${Math.round(accuracy)}m` : 'N/A'}
      </Text>
    </View>
  );
};

export default function App() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const locationService = LocationService.getInstance();

  useEffect(() => {
    initializeLocationTracking();
    
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

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Signal Strength in top right */}
      <View style={styles.signalPosition}>
        <SignalStrength accuracy={location?.accuracy || null} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            GPS Info
          </Text>
          <Text style={styles.subtitle}>
            Real-time location and compass data
          </Text>
        </View>

        {/* Compass */}
        <Compass style={styles.compass} />

        {/* GPS Data Cards */}
        <View style={styles.cardsContainer}>
          {/* Coordinates Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              📍 Coordinates
            </Text>
            <View style={styles.cardContent}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Latitude:</Text>
                <Text style={styles.dataValue}>
                  {location ? formatCoordinate(location.latitude, 'lat') : 'N/A'}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Longitude:</Text>
                <Text style={styles.dataValue}>
                  {location ? formatCoordinate(location.longitude, 'lng') : 'N/A'}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Accuracy:</Text>
                <Text style={styles.dataValue}>
                  {location ? formatAccuracy(location.accuracy) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Altitude & Speed Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              📊 Movement Data
            </Text>
            <View style={styles.cardContent}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>API Altitude:</Text>
                <Text style={styles.dataValue}>
                  {location ? formatAltitude(location.altitude) : 'N/A'}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>GPS Altitude:</Text>
                <Text style={styles.dataValue}>
                  {location ? formatGPSAltitude(location.altitude) : 'N/A'}
                </Text>
              </View>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>Speed:</Text>
                <Text style={styles.dataValue}>
                  {location ? formatSpeed(location.speed) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Location Info Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              🏠 Location
            </Text>
            {placeInfo ? (
              <View style={styles.cardContent}>
                {placeInfo.street && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Street:</Text>
                    <Text style={[styles.dataValue, styles.locationText]}>
                      {placeInfo.street}
                    </Text>
                  </View>
                )}
                {placeInfo.city && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>City:</Text>
                    <Text style={[styles.dataValue, styles.locationText]}>
                      {placeInfo.city}
                    </Text>
                  </View>
                )}
                {placeInfo.region && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Region:</Text>
                    <Text style={[styles.dataValue, styles.locationText]}>
                      {placeInfo.region}
                    </Text>
                  </View>
                )}
                {placeInfo.country && (
                  <View style={styles.dataRow}>
                    <Text style={styles.dataLabel}>Country:</Text>
                    <Text style={[styles.dataValue, styles.locationText]}>
                      {placeInfo.country}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.placeholderText}>
                {location ? 'Loading location info...' : 'No location data'}
              </Text>
            )}
          </View>

          {/* Status Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              ⚡ Status
            </Text>
            <View style={styles.cardContent}>
              <View style={styles.dataRow}>
                <Text style={styles.dataLabel}>GPS Status:</Text>
                <Text style={[
                  styles.dataValue, 
                  styles.statusText,
                  location ? styles.statusActive : styles.statusInactive
                ]}>
                  {location ? 'Active' : 'Inactive'}
                </Text>
              </View>
              {location && (
                <View style={styles.dataRow}>
                  <Text style={styles.dataLabel}>Last Update:</Text>
                  <Text style={[styles.dataValue, styles.timestampText]}>
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
    paddingBottom: 30,
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
    marginBottom: 32,
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