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
      <View className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100 justify-center items-center">
        <StatusBar style="dark" />
        <Text className="text-xl font-semibold text-gray-700">
          Initializing GPS...
        </Text>
        <Text className="text-sm text-gray-500 mt-2">
          Please wait while we get your location
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gradient-to-br from-red-50 to-pink-100 justify-center items-center px-6">
        <StatusBar style="dark" />
        <Text className="text-xl font-semibold text-red-700 text-center mb-4">
          GPS Error
        </Text>
        <Text className="text-sm text-red-600 text-center">
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-100">
      <StatusBar style="dark" />
      
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ paddingTop: 60, paddingBottom: 30, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-8">
          <Text className="text-3xl font-bold text-gray-800 mb-2">
            GPS Info
          </Text>
          <Text className="text-sm text-gray-600">
            Real-time location and compass data
          </Text>
        </View>

        {/* Compass */}
        <Compass className="mb-8" />

        {/* GPS Data Cards */}
        <View className="space-y-4">
          {/* Coordinates Card */}
          <View className="bg-white rounded-2xl shadow-lg p-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              📍 Coordinates
            </Text>
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Latitude:</Text>
                <Text className="font-mono text-gray-800">
                  {location ? formatCoordinate(location.latitude, 'lat') : 'N/A'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Longitude:</Text>
                <Text className="font-mono text-gray-800">
                  {location ? formatCoordinate(location.longitude, 'lng') : 'N/A'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Accuracy:</Text>
                <Text className="font-mono text-gray-800">
                  {location ? formatAccuracy(location.accuracy) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Altitude & Speed Card */}
          <View className="bg-white rounded-2xl shadow-lg p-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              📊 Movement Data
            </Text>
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Altitude:</Text>
                <Text className="font-mono text-gray-800">
                  {location ? formatAltitude(location.altitude) : 'N/A'}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Speed:</Text>
                <Text className="font-mono text-gray-800">
                  {location ? formatSpeed(location.speed) : 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Location Info Card */}
          <View className="bg-white rounded-2xl shadow-lg p-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              🏠 Location
            </Text>
            {placeInfo ? (
              <View className="space-y-2">
                {placeInfo.street && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Street:</Text>
                    <Text className="text-gray-800 flex-1 text-right">
                      {placeInfo.street}
                    </Text>
                  </View>
                )}
                {placeInfo.city && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">City:</Text>
                    <Text className="text-gray-800 flex-1 text-right">
                      {placeInfo.city}
                    </Text>
                  </View>
                )}
                {placeInfo.region && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Region:</Text>
                    <Text className="text-gray-800 flex-1 text-right">
                      {placeInfo.region}
                    </Text>
                  </View>
                )}
                {placeInfo.country && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Country:</Text>
                    <Text className="text-gray-800 flex-1 text-right">
                      {placeInfo.country}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text className="text-gray-500 italic">
                {location ? 'Loading location info...' : 'No location data'}
              </Text>
            )}
          </View>

          {/* Status Card */}
          <View className="bg-white rounded-2xl shadow-lg p-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4">
              ⚡ Status
            </Text>
            <View className="space-y-2">
              <View className="flex-row justify-between">
                <Text className="text-gray-600">GPS Status:</Text>
                <Text className={`font-semibold ${location ? 'text-green-600' : 'text-red-600'}`}>
                  {location ? 'Active' : 'Inactive'}
                </Text>
              </View>
              {location && (
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Last Update:</Text>
                  <Text className="text-gray-800 text-sm">
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
