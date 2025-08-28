import { LocationData } from './locationService';
import { HereSpeedLimitService } from './hereSpeedLimitService';

export interface SpeedLimitData {
  speedLimit: number | null; // in km/h
  unit: 'km/h' | 'mph';
  road: string | null;
  accuracy: 'high' | 'medium' | 'low';
  timestamp: number;
  source?: 'here' | 'osm' | 'default';
}

export class SpeedLimitService {
  private static instance: SpeedLimitService;
  private lastKnownSpeedLimit: SpeedLimitData | null = null;
  private cache: Map<string, SpeedLimitData> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private lastSpeedLimitRequest: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 15000; // 15 seconds between speed limit requests
  private hereService: HereSpeedLimitService | null = null;
  private useHereAPI: boolean = false;

  static getInstance(): SpeedLimitService {
    if (!SpeedLimitService.instance) {
      SpeedLimitService.instance = new SpeedLimitService();
    }
    return SpeedLimitService.instance;
  }

  /**
   * Initialize with HERE API key for enhanced speed limit data
   */
  initializeHereAPI(apiKey: string): void {
    try {
      this.hereService = HereSpeedLimitService.getInstance({
        apiKey,
        requestTimeout: 10000, // 10 seconds
        maxRetries: 2
      });
      this.useHereAPI = true;
      console.log('HERE API initialized for speed limits');
    } catch (error) {
      console.error('Failed to initialize HERE API:', error);
      this.useHereAPI = false;
    }
  }

  /**
   * Get speed limit with multi-tier fallback: HERE API -> OpenStreetMap -> Serbian defaults
   */
  async getSpeedLimit(location: LocationData): Promise<SpeedLimitData | null> {
    try {
      const { latitude, longitude } = location;
      const now = Date.now();
      
      // Create cache key based on rounded coordinates (more precise for speed limits)
      const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)}`;
      
      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
        this.lastKnownSpeedLimit = cached;
        return cached;
      }

      // Rate limiting: Don't make requests too frequently for GPS apps
      if (now - this.lastSpeedLimitRequest < this.MIN_REQUEST_INTERVAL) {
        console.log('Speed limit request rate limited - using cached data');
        return this.lastKnownSpeedLimit;
      }

      this.lastSpeedLimitRequest = now;

      let speedLimitData: SpeedLimitData | null = null;

      // Try HERE API first (if available and within limits)
      if (this.useHereAPI && this.hereService) {
        try {
          console.log('Trying HERE API for speed limit...');
          speedLimitData = await this.hereService.getSpeedLimit(location);
          if (speedLimitData) {
            speedLimitData.source = 'here';
            console.log('Speed limit found via HERE API:', speedLimitData);
          }
        } catch (error) {
          console.log('HERE API failed, falling back to OpenStreetMap:', error.message);
        }
      }

      // Fallback to OpenStreetMap if HERE failed or unavailable
      if (!speedLimitData) {
        try {
          console.log('Trying OpenStreetMap for speed limit...');
          speedLimitData = await this.getSpeedLimitFromOSM(latitude, longitude);
          if (speedLimitData) {
            speedLimitData.source = 'osm';
            console.log('Speed limit found via OpenStreetMap:', speedLimitData);
          }
        } catch (error) {
          console.log('OpenStreetMap failed:', error.message);
        }
      }

      // Cache and return result if found
      if (speedLimitData) {
        this.cache.set(cacheKey, speedLimitData);
        this.lastKnownSpeedLimit = speedLimitData;
        this.cleanCache();
        return speedLimitData;
      }

      // Return last known speed limit if available
      if (this.lastKnownSpeedLimit && 
          (Date.now() - this.lastKnownSpeedLimit.timestamp) < this.CACHE_DURATION * 2) {
        return { ...this.lastKnownSpeedLimit, accuracy: 'low' };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching speed limit:', error);
      return null;
    }
  }

  /**
   * Get speed limit from OpenStreetMap (fallback method)
   */
  private async getSpeedLimitFromOSM(latitude: number, longitude: number): Promise<SpeedLimitData | null> {
    const overpassQuery = this.buildOverpassQuery(latitude, longitude);
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    return this.parseOverpassResponse(data, latitude, longitude);
  }

  /**
   * Build Overpass API query to find nearby roads with speed limits
   */
  private buildOverpassQuery(lat: number, lon: number): string {
    const radius = 200; // Search within 200 meters (was too small at 50m)
    
    return `
      [out:json][timeout:10];
      (
        way["highway"]["maxspeed"](around:${radius},${lat},${lon});
      );
      out geom;
    `;
  }

  /**
   * Parse Overpass API response and find the most relevant speed limit
   */
  private parseOverpassResponse(data: any, lat: number, lon: number): SpeedLimitData | null {
    if (!data.elements || data.elements.length === 0) {
      return null;
    }

    let bestMatch: any = null;
    let minDistance = Infinity;

    // Find the closest road with a speed limit
    for (const element of data.elements) {
      if (element.tags && element.tags.maxspeed && element.geometry) {
        // Calculate distance to the road
        const distance = this.calculateDistanceToRoad(lat, lon, element.geometry);
        
        if (distance < minDistance) {
          minDistance = distance;
          bestMatch = element;
        }
      }
    }

    if (!bestMatch) {
      return null;
    }

    const speedLimit = this.parseSpeedLimit(bestMatch.tags.maxspeed);
    const roadName = bestMatch.tags.name || bestMatch.tags.ref || 'Unknown Road';
    
    // Determine accuracy based on distance
    let accuracy: 'high' | 'medium' | 'low' = 'high';
    if (minDistance > 20) accuracy = 'medium';
    if (minDistance > 35) accuracy = 'low';

    return {
      speedLimit: speedLimit.value,
      unit: speedLimit.unit,
      road: roadName,
      accuracy,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate distance from point to road (simplified)
   */
  private calculateDistanceToRoad(lat: number, lon: number, geometry: any[]): number {
    let minDistance = Infinity;

    for (const point of geometry) {
      const distance = this.calculateDistance(lat, lon, point.lat, point.lon);
      if (distance < minDistance) {
        minDistance = distance;
      }
    }

    return minDistance * 1000; // Convert to meters
  }

  /**
   * Calculate distance between two points in kilometers
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Parse speed limit string to number and unit
   */
  private parseSpeedLimit(maxspeed: string): { value: number | null; unit: 'km/h' | 'mph' } {
    if (!maxspeed) return { value: null, unit: 'km/h' };

    // Handle common formats
    const cleaned = maxspeed.toLowerCase().trim();
    
    // Extract number
    const numberMatch = cleaned.match(/(\d+)/);
    if (!numberMatch) return { value: null, unit: 'km/h' };
    
    const value = parseInt(numberMatch[1], 10);
    
    // Determine unit
    const unit = cleaned.includes('mph') ? 'mph' : 'km/h';
    
    // Convert mph to km/h if needed
    const speedInKmh = unit === 'mph' ? Math.round(value * 1.60934) : value;
    
    return { value: speedInKmh, unit: 'km/h' };
  }

  /**
   * Clean old cache entries
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, data] of this.cache.entries()) {
      if (now - data.timestamp > this.CACHE_DURATION) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get last known speed limit (useful when no internet connection)
   */
  getLastKnownSpeedLimit(): SpeedLimitData | null {
    return this.lastKnownSpeedLimit;
  }

  /**
   * Check if current speed exceeds the speed limit
   */
  isSpeedingAlert(currentSpeedKmh: number | null, speedLimit: number | null): boolean {
    if (!currentSpeedKmh || !speedLimit) return false;
    
    // Allow 5% tolerance to account for GPS inaccuracy
    const tolerance = speedLimit * 0.05;
    return currentSpeedKmh > (speedLimit + tolerance);
  }

  /**
   * Get HERE API usage statistics
   */
  getHereUsageStats(): { requestCount: number; remainingRequests: number; resetTime: Date } | null {
    if (this.hereService) {
      return this.hereService.getUsageStats();
    }
    return null;
  }

  /**
   * Check if HERE API is enabled and available
   */
  isHereAPIEnabled(): boolean {
    return this.useHereAPI && this.hereService !== null;
  }

  /**
   * Clear cache and reset service
   */
  reset(): void {
    this.cache.clear();
    this.lastKnownSpeedLimit = null;
  }
}
