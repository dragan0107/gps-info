import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const LOCATION_TASK_NAME = 'background-location-task';

export interface LocationData {
  latitude: number;
  longitude: number;
  altitude: number | null;
  speed: number | null;
  accuracy: number | null;
  timestamp: number;
}

export interface PlaceInfo {
  city?: string;
  street?: string;
  region?: string;
  country?: string;
  formattedAddress?: string;
}

// Define the background location task
TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as any;
    const location = locations[0];
    
    if (location) {
      console.log('Background location update:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        alt: location.coords.altitude,
      });

      // Try to update notification with altitude (may not work in Expo Go)
      const altitude = location.coords.altitude;
      if (altitude && Platform.OS === 'android') {
        try {
          // This won't work in Expo Go but will work in development builds
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'GPS Info',
              body: `Alt: ${Math.round(altitude)}m | Tracking location`,
              data: { altitude },
            },
            trigger: null,
            identifier: 'gps-foreground-update',
          }).catch(() => {
            // Silently fail in Expo Go
          });
        } catch (e) {
          // Silently fail in Expo Go
        }
      }
    }
  }
});

export class LocationService {
  private static instance: LocationService;
  private currentLocation: LocationData | null = null;
  private locationSubscription: Location.LocationSubscription | null = null;
  private listeners: ((location: LocationData) => void)[] = [];

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      // Check if permissions are already granted first
      const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
      if (existingStatus === 'granted') {
        console.log('Location permissions already granted');
        return true;
      }

      // Request foreground location permission
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== 'granted') {
        console.error('Foreground location permission not granted:', foregroundStatus);
        return false;
      }

      console.log('Foreground location permission granted');

      // Try to request background location permission, but don't fail if it's not granted
      try {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus !== 'granted') {
          console.warn('Background location permission not granted:', backgroundStatus);
        } else {
          console.log('Background location permission granted');
        }
      } catch (bgError) {
        console.warn('Background permission request failed:', bgError);
        // Continue anyway - foreground permission is sufficient for basic functionality
      }

      // Request notification permissions for Android (optional)
      if (Platform.OS === 'android') {
        try {
          const { status: notificationStatus } = await Notifications.requestPermissionsAsync();
          if (notificationStatus !== 'granted') {
            console.warn('Notification permission not granted:', notificationStatus);
          } else {
            console.log('Notification permission granted');
          }
        } catch (notifError) {
          console.warn('Notification permission request failed:', notifError);
          // Continue anyway - notifications are optional
        }
      }

      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      // Return true if we have basic permissions, even if there were errors
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        return status === 'granted';
      } catch {
        return false;
      }
    }
  }

  async startLocationTracking(): Promise<void> {
    try {
      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Location permissions not granted');
      }

      console.log('Starting location tracking...');

      // Start foreground location tracking with fallback options
      try {
        this.locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            timeInterval: 1000, // Update every second
            distanceInterval: 1, // Update every meter
          },
          (location) => {
            console.log('Location update received:', {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
              accuracy: location.coords.accuracy
            });

            const locationData: LocationData = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              altitude: location.coords.altitude,
              speed: location.coords.speed,
              accuracy: location.coords.accuracy,
              timestamp: location.timestamp,
            };

            this.currentLocation = locationData;
            this.notifyListeners(locationData);
          }
        );
      } catch (watchError) {
        console.error('Error starting location watch:', watchError);
        // Try with lower accuracy as fallback
        console.log('Trying with lower accuracy...');
        this.locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2000,
            distanceInterval: 5,
          },
          (location) => {
            const locationData: LocationData = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              altitude: location.coords.altitude,
              speed: location.coords.speed,
              accuracy: location.coords.accuracy,
              timestamp: location.timestamp,
            };

            this.currentLocation = locationData;
            this.notifyListeners(locationData);
          }
        );
      }

      // Try to start background location tracking (optional)
      try {
        await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000, // Update every 5 seconds in background
          distanceInterval: 10, // Update every 10 meters in background
          foregroundService: {
            notificationTitle: 'GPS Info',
            notificationBody: 'Tracking location and altitude',
            notificationColor: '#4285f4',
          },
        });
        console.log('Background location tracking started');
      } catch (bgTrackingError) {
        console.warn('Background location tracking failed:', bgTrackingError);
        // Continue without background tracking - foreground is sufficient
      }

      console.log('Location tracking started successfully');
    } catch (error) {
      console.error('Error starting location tracking:', error);
      throw error;
    }
  }

  async stopLocationTracking(): Promise<void> {
    try {
      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      // Stop background location tracking
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      console.log('Location tracking stopped');
    } catch (error) {
      console.error('Error stopping location tracking:', error);
    }
  }

  addLocationListener(listener: (location: LocationData) => void): void {
    this.listeners.push(listener);
  }

  removeLocationListener(listener: (location: LocationData) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  private notifyListeners(location: LocationData): void {
    this.listeners.forEach(listener => listener(location));
  }

  getCurrentLocation(): LocationData | null {
    return this.currentLocation;
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<PlaceInfo | null> {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (results.length > 0) {
        const result = results[0];
        return {
          city: result.city || undefined,
          street: result.street || undefined,
          region: result.region || undefined,
          country: result.country || undefined,
          formattedAddress: [
            result.street,
            result.city,
            result.region,
            result.country
          ].filter(Boolean).join(', '),
        };
      }
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  // Convert speed from m/s to km/h
  static convertSpeedToKmh(speedMs: number | null): number | null {
    if (speedMs === null) return null;
    return speedMs * 3.6;
  }
}
