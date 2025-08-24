import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Magnetometer } from 'expo-sensors';
import { LocationService, LocationData, PlaceInfo } from '../services/locationService';
import Speedometer from '../components/Speedometer';

const { width } = Dimensions.get('window');

export default function SpeedDashboard() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [placeInfo, setPlaceInfo] = useState<PlaceInfo | null>(null);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [avgSpeed, setAvgSpeed] = useState(0);
  const [tripDistance, setTripDistance] = useState(0);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [heading, setHeading] = useState<number>(0);
  const insets = useSafeAreaInsets();

  const locationService = LocationService.getInstance();

  useEffect(() => {
    // Add location listener
    const locationListener = (locationData: LocationData) => {
      setLocation(locationData);
      
      const currentSpeed = LocationService.convertSpeedToKmh(locationData.speed) || 0;
      
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

    // Setup magnetometer for compass heading
    let magnetometerSubscription: any;
    const setupMagnetometer = async () => {
      Magnetometer.setUpdateInterval(200); // Update every 200ms
      
      magnetometerSubscription = Magnetometer.addListener((data) => {
        // Calculate heading from magnetometer data
        let compassHeading = Math.atan2(-data.x, data.y) * (180 / Math.PI);
        
        // Ensure positive angle (0-360°)
        if (compassHeading < 0) {
          compassHeading += 360;
        }
        
        setHeading(compassHeading);
      });
    };

    setupMagnetometer();

    return () => {
      locationService.removeLocationListener(locationListener);
      if (magnetometerSubscription) {
        magnetometerSubscription.remove();
      }
    };
  }, [maxSpeed]);

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

  const currentSpeed = LocationService.convertSpeedToKmh(location?.speed) || 0;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Speed Dashboard</Text>
          <Text style={styles.subtitle}>Real-time speed and movement data</Text>
        </View>

        {/* Speedometer */}
        <Speedometer 
          speed={currentSpeed}
          altitude={location?.altitude ? location.altitude - 44 : null}
          accuracy={location?.accuracy}
          heading={heading}
          maxSpeed={250}
          style={styles.speedometer}
        />

        {/* Speed Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Current</Text>
            <Text style={styles.statValue}>{formatSpeed(currentSpeed)}</Text>
            <Text style={styles.statUnit}>km/h</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Max Speed</Text>
            <Text style={styles.statValue}>{formatSpeed(maxSpeed)}</Text>
            <Text style={styles.statUnit}>km/h</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Average</Text>
            <Text style={styles.statValue}>{formatSpeed(avgSpeed)}</Text>
            <Text style={styles.statUnit}>km/h</Text>
          </View>
        </View>

        {/* Location Info Card */}
        <View style={styles.locationCard}>
          <Text style={styles.locationTitle}>📍 Current Location</Text>
          {placeInfo ? (
            <View style={styles.locationContent}>
              {placeInfo.street && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationLabel}>Street:</Text>
                  <Text style={styles.locationValue}>
                    {placeInfo.street}
                  </Text>
                </View>
              )}
              {placeInfo.city && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationLabel}>City:</Text>
                  <Text style={styles.locationValue}>
                    {placeInfo.city}
                  </Text>
                </View>
              )}
              {placeInfo.region && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationLabel}>Region:</Text>
                  <Text style={styles.locationValue}>
                    {placeInfo.region}
                  </Text>
                </View>
              )}
              {placeInfo.country && (
                <View style={styles.locationRow}>
                  <Text style={styles.locationLabel}>Country:</Text>
                  <Text style={styles.locationValue}>
                    {placeInfo.country}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.locationPlaceholder}>
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
    marginBottom: 24,
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
