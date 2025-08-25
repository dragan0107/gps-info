import * as Location from 'expo-location';

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
      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
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
            timeInterval: 1000, // Update every 1 second
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
            timeInterval: 1000,
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
