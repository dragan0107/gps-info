import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LocationService, LocationData, PlaceInfo } from '../services/locationService';
import { SpeedLimitService, SpeedLimitData } from '../services/speedLimitService';
import Speedometer from '../components/Speedometer';

import { useCompass } from '../components/Compass';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

export default function SpeedDashboard() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [speedLimitData, setSpeedLimitData] = useState<SpeedLimitData | null>(null);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [tripDistance, setTripDistance] = useState(0);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const heading = useCompass(); // Use shared compass hook for Speedometer display
  const [isTestMode, setIsTestMode] = useState(false);
  const [testSpeed, setTestSpeed] = useState(0);
  const [testInterval, setTestInterval] = useState<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  const locationService = LocationService.getInstance();
  const speedLimitService = SpeedLimitService.getInstance();

  useEffect(() => {
    // Add location listener
    const locationListener = (locationData: LocationData) => {
      setLocation(locationData);
      
      const currentSpeed = LocationService.convertSpeedToKmh(locationData.speed) || 0;

      // Get speed limit for current location
      speedLimitService.getSpeedLimit(locationData).then(data => {
        setSpeedLimitData(data);
      }).catch(error => {
        console.log('Speed limit fetch error:', error);
      });
      
      // Update max speed
      if (currentSpeed > maxSpeed) {
        setMaxSpeed(currentSpeed);
      }
      
      // Update speed history for average calculation
      setSpeedHistory(prev => {
        const newHistory = [...prev, currentSpeed].slice(-20); // Keep last 20 readings
        const average = newHistory.reduce((sum, speed) => sum + speed, 0) / newHistory.length;
        setAvgSpeed(average);
        return newHistory;
      });

      // Update place info when location changes significantly
      if (locationData.latitude && locationData.longitude) {
        updatePlaceInfo(locationData.latitude, locationData.longitude);
      }
    };

    locationService.addLocationListener(locationListener);
    
    // Get current location if available
    const currentLocation = locationService.getCurrentLocation();
    if (currentLocation) {
      locationListener(currentLocation);
    }

    // Compass heading is now provided by the shared useCompass hook

    return () => {
      locationService.removeLocationListener(locationListener);
    };
  }, [maxSpeed]);

  // Cleanup test interval on unmount
  useEffect(() => {
    return () => {
      if (testInterval) {
        clearInterval(testInterval);
      }
    };
  }, [testInterval]);

  // Speedometer Test Functions
  const startSpeedometerTest = () => {
    // Clean up any existing test first
    if (testInterval) {
      clearInterval(testInterval);
    }
    
    // Smooth transition into test mode
    setTestSpeed(0);
    setIsTestMode(true);
    
    console.log('🚗 Starting speedometer test - realistic car acceleration/deceleration');
    
    let currentSpeed = 0;
    let phase = 'accelerating'; // 'accelerating', 'cruising', 'decelerating'
    let phaseTimer = 0;
    
    const newTestInterval = setInterval(() => {
      phaseTimer += 100;
      
      switch (phase) {
        case 'accelerating':
          // Super aggressive acceleration to hit 250 km/h!
          if (currentSpeed < 100) {
            currentSpeed += 1.2; // Fast initial acceleration
          } else if (currentSpeed < 200) {
            currentSpeed += 0.8; // Still fast at high speeds
          } else if (currentSpeed < 250) {
            currentSpeed += 0.5; // Final push to 250
          } else {
            phase = 'cruising';
            phaseTimer = 0;
            console.log('🏎️ MAXED OUT at', Math.round(currentSpeed), 'km/h - FULL CIRCLE!');
          }
          break;
          
        case 'cruising':
          // Cruise at max speed for 4 seconds to show off the full circle!
          currentSpeed += (Math.random() - 0.5) * 3; // ±1.5 km/h variation
          currentSpeed = Math.max(247, Math.min(250, currentSpeed)); // Keep between 247-250
          
          if (phaseTimer > 4000) {
            phase = 'decelerating';
            phaseTimer = 0;
            console.log('🏎️ Starting epic deceleration from', Math.round(currentSpeed), 'km/h');
          }
          break;
          
        case 'decelerating':
          // Epic braking from 250 to 0!
          if (currentSpeed > 50) {
            currentSpeed -= 3.5; // Strong braking from high speed
          } else if (currentSpeed > 10) {
            currentSpeed -= 2.0; // Moderate braking
          } else if (currentSpeed > 0) {
            currentSpeed -= 0.8; // Gentle final braking
          } else {
            currentSpeed = 0;
            phase = 'stopped';
            console.log('🏎️ EPIC TEST COMPLETE - Full circle animation done!');
          }
          break;
          
        case 'stopped':
          clearInterval(newTestInterval);
          setTestInterval(null);
          setTimeout(() => {
            setIsTestMode(false);
            setTestSpeed(0);
            console.log('🏎️ Test mode ended');
          }, 2000);
          return;
      }
      
      setTestSpeed(Math.max(0, currentSpeed));
    }, 100); // Update every 100ms for smooth animation
    
    setTestInterval(newTestInterval);
  };

  const stopSpeedometerTest = () => {
    // Immediately stop any running test
    if (testInterval) {
      clearInterval(testInterval);
      setTestInterval(null);
    }
    
    // Smooth transition out of test mode
    setTestSpeed(0);
    setTimeout(() => {
      setIsTestMode(false);
    }, 100); // Small delay to let speed animate to 0
    console.log('🚗 Speedometer test stopped');
  };

  const updatePlaceInfo = async (latitude: number, longitude: number) => {
    try {
      const place = await locationService.reverseGeocode(latitude, longitude);
      setPlaceInfo(place);
    } catch (err) {
      console.error('Failed to get place info:', err);
    }
  };

  const formatSpeed = (speed: number): string => {
    return speed.toFixed(1);
  };

  const currentSpeed = isTestMode ? testSpeed : (LocationService.convertSpeedToKmh(location?.speed) || 0);

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
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
      marginTop: 8,
      gap: 10,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.cardBackground,
      borderRadius: 12,
      padding: 15,
      alignItems: 'center',
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.colors.border,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontWeight: '600',
      marginBottom: 4,
    },
    statValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    locationCard: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: 16,
      padding: 20,
      marginTop: 12,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 4,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.colors.border,
    },
    locationTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    locationContent: {
      gap: 8,
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
    locationPlaceholder: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
      textAlign: 'center',
    },
    testControls: {
      alignItems: 'center',
      marginVertical: 15,
      paddingHorizontal: 20,
    },
    testButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 25,
      minWidth: 200,
      alignItems: 'center',
      elevation: 3,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    },
    startButton: {
      backgroundColor: '#22c55e', // Green
    },
    stopButton: {
      backgroundColor: '#ef4444', // Red
    },
    testButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
    testStatus: {
      marginTop: 8,
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '500',
    },

  });

  return (
    <View style={dynamicStyles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      
      
      <ScrollView 
        style={dynamicStyles.scrollView}
        contentContainerStyle={[dynamicStyles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={dynamicStyles.header}>
          <Text style={dynamicStyles.title}>Speed Dashboard</Text>
        </View>

        {/* Speedometer Test Controls - Hidden but functionality preserved */}
        {false && (
          <View style={dynamicStyles.testControls}>
            {!isTestMode ? (
              <TouchableOpacity 
                style={[dynamicStyles.testButton, dynamicStyles.startButton]}
                onPress={startSpeedometerTest}
              >
                <Text style={dynamicStyles.testButtonText}>🚗 Test Speedometer</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[dynamicStyles.testButton, dynamicStyles.stopButton]}
                onPress={stopSpeedometerTest}
              >
                <Text style={dynamicStyles.testButtonText}>⏹️ Stop Test</Text>
              </TouchableOpacity>
            )}
            {isTestMode && (
              <Text style={dynamicStyles.testStatus}>
                Testing: {Math.round(testSpeed)} km/h
              </Text>
            )}
          </View>
        )}

        {/* Speedometer */}
        <Speedometer
          speed={currentSpeed}
          altitude={location?.altitude ? location.altitude - 44 : null}
          accuracy={location?.accuracy}
          heading={heading}
          speedLimit={speedLimitData?.speedLimit}
          maxSpeed={250}
          style={styles.speedometer}
        />

        {/* Speed Stats Cards */}
        <View style={dynamicStyles.statsContainer}>
          <View style={dynamicStyles.statCard}>
            <Text style={dynamicStyles.statLabel}>Current</Text>
            <Text style={dynamicStyles.statValue}>{formatSpeed(currentSpeed)}</Text>
            <Text style={dynamicStyles.statLabel}>km/h</Text>
          </View>
          
          <View style={dynamicStyles.statCard}>
            <Text style={dynamicStyles.statLabel}>Max Speed</Text>
            <Text style={dynamicStyles.statValue}>{formatSpeed(maxSpeed)}</Text>
            <Text style={dynamicStyles.statLabel}>km/h</Text>
          </View>
          
          <View style={dynamicStyles.statCard}>
            <Text style={dynamicStyles.statLabel}>Average</Text>
            <Text style={dynamicStyles.statValue}>{formatSpeed(avgSpeed)}</Text>
            <Text style={dynamicStyles.statLabel}>km/h</Text>
          </View>
        </View>

        {/* Location Info Card */}
        <View style={dynamicStyles.locationCard}>
          <Text style={dynamicStyles.locationTitle}>📍 Current Location</Text>
          {placeInfo ? (
            <View style={dynamicStyles.locationContent}>
              {placeInfo.street && (
                <View style={dynamicStyles.locationRow}>
                  <Text style={dynamicStyles.locationLabel}>Street:</Text>
                  <Text style={dynamicStyles.locationValue}>
                    {placeInfo.street}
                  </Text>
                </View>
              )}
              {placeInfo.city && (
                <View style={dynamicStyles.locationRow}>
                  <Text style={dynamicStyles.locationLabel}>City:</Text>
                  <Text style={dynamicStyles.locationValue}>
                    {placeInfo.city}
                  </Text>
                </View>
              )}
              {placeInfo.region && (
                <View style={dynamicStyles.locationRow}>
                  <Text style={dynamicStyles.locationLabel}>Region:</Text>
                  <Text style={dynamicStyles.locationValue}>
                    {placeInfo.region}
                  </Text>
                </View>
              )}
              {placeInfo.country && (
                <View style={dynamicStyles.locationRow}>
                  <Text style={dynamicStyles.locationLabel}>Country:</Text>
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

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 100, // Increased to account for tab bar
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  speedometer: {
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  statUnit: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  locationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  locationContent: {
    gap: 8,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationLabel: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  locationValue: {
    color: '#1f2937',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 8,
  },
  locationPlaceholder: {
    color: '#9ca3af',
    fontStyle: 'italic',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },

});


