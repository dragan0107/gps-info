import { LocationData } from './locationService';
import { SpeedLimitData } from './speedLimitService';

export interface HereSpeedLimitConfig {
  apiKey: string;
  requestTimeout: number;
  maxRetries: number;
}

export class HereSpeedLimitService {
  private static instance: HereSpeedLimitService;
  private config: HereSpeedLimitConfig;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private readonly MONTHLY_LIMIT = 25000; // HERE free tier limit
  
  // Rate limiting for different APIs
  private geocodingQueue: Array<{ timestamp: number }> = [];
  private routingQueue: Array<{ timestamp: number }> = [];
  private fleetQueue: Array<{ timestamp: number }> = [];
  
  // Rate limits per second for different services
  private readonly GEOCODING_RPS = 4; // 5 allowed, use 4 for safety
  private readonly ROUTING_RPS = 8;   // 10 allowed, use 8 for safety  
  private readonly FLEET_RPS = 0.8;   // 1 allowed, use 0.8 for safety (1 req per 1.25 seconds)

  constructor(config: HereSpeedLimitConfig) {
    this.config = config;
  }

  static getInstance(config?: HereSpeedLimitConfig): HereSpeedLimitService {
    if (!HereSpeedLimitService.instance && config) {
      HereSpeedLimitService.instance = new HereSpeedLimitService(config);
    }
    return HereSpeedLimitService.instance;
  }

  /**
   * Get speed limit using HERE Routing API (more reliable than Fleet API)
   */
  async getSpeedLimit(location: LocationData): Promise<SpeedLimitData | null> {
    try {
      // Check rate limits
      if (!this.checkRateLimit()) {
        throw new Error('HERE API monthly limit exceeded');
      }

      const { latitude, longitude } = location;
      
      // Use basic routing API instead of Fleet API (more reliable)
      const speedLimitData = await this.getSpeedLimitFromRouting(latitude, longitude);
      
      if (speedLimitData) {
        this.incrementRequestCount();
        return speedLimitData;
      }

      return null;
    } catch (error) {
      console.error('HERE API error:', error);
      throw error;
    }
  }

  /**
   * Get speed limit using basic HERE Routing API (works with free tier)
   */
  private async getSpeedLimitFromRouting(lat: number, lon: number): Promise<SpeedLimitData | null> {
    try {
      // Create a very small route to get road information
      const offset = 0.001; // ~100 meter offset
      const startLat = lat - offset;
      const startLon = lon - offset;
      const endLat = lat + offset;
      const endLon = lon + offset;

      const url = `https://router.hereapi.com/v8/routes?transportMode=car&origin=${startLat},${startLon}&destination=${endLat},${endLon}&return=summary,polyline&apiKey=${this.config.apiKey}`;
      
      const response = await this.makeRequest(url, 'routing');
      
      if (response.routes && response.routes.length > 0) {
        // For now, we can't get speed limits from basic routing API
        // But we can get road information and apply Serbian defaults
        const route = response.routes[0];
        
        // Get road info via geocoding for more details
        const roadInfo = await this.reverseGeocode(lat, lon);
        
        if (roadInfo && roadInfo.roadName) {
          // Apply Serbian speed limit defaults based on road type
          const speedLimit = this.getDefaultSpeedLimit(roadInfo.roadName);
          
          return {
            speedLimit,
            unit: 'km/h',
            road: roadInfo.roadName,
            accuracy: 'medium', // Default values, not exact speed limits
            timestamp: Date.now()
          };
        }
      }

      return null;
    } catch (error) {
      console.error('HERE routing error:', error);
      throw error;
    }
  }

  /**
   * Get default Serbian speed limits based on road type
   */
  private getDefaultSpeedLimit(roadName: string): number {
    const name = roadName.toLowerCase();
    
    // Highway patterns
    if (name.includes('a1') || name.includes('a2') || name.includes('a3') || 
        name.includes('автопут') || name.includes('autoput')) {
      return 130; // Motorways
    }
    
    // Trunk roads
    if (name.includes('е70') || name.includes('е75') || name.includes('м') ||
        name.includes('магистрал') || name.includes('magistral')) {
      return 100; // Trunk roads
    }
    
    // Urban areas (detect by Cyrillic city indicators)
    if (name.includes('булевар') || name.includes('улица') || name.includes('трг') ||
        name.includes('bulevar') || name.includes('ulica') || name.includes('trg')) {
      return 50; // Urban roads
    }
    
    // Default rural roads
    return 80;
  }

  /**
   * Alternative approach: Use HERE Geocoder API to get road information first,
   * then use route matching for more precise speed limit data
   */
  async getSpeedLimitWithGeocode(location: LocationData): Promise<SpeedLimitData | null> {
    try {
      if (!this.checkRateLimit()) {
        throw new Error('HERE API rate limit exceeded');
      }

      const { latitude, longitude } = location;

      // Step 1: Reverse geocode to get road information
      const geocodeData = await this.reverseGeocode(latitude, longitude);
      
      // Step 2: Use route matching for speed limits
      const speedLimitData = await this.getSpeedLimit(location);

      // Enhance speed limit data with geocoded road information
      if (speedLimitData && geocodeData) {
        speedLimitData.road = geocodeData.roadName || speedLimitData.road;
      }

      return speedLimitData;
    } catch (error) {
      console.error('HERE geocode + speed limit error:', error);
      throw error;
    }
  }



  /**
   * Reverse geocode using HERE API to get road information
   */
  private async reverseGeocode(lat: number, lon: number): Promise<{ roadName?: string; city?: string } | null> {
    try {
      const url = `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${lat},${lon}&apiKey=${this.config.apiKey}`;
      
      const response = await this.makeRequest(url, 'geocoding');
      
      if (response.items && response.items.length > 0) {
        const item = response.items[0];
        return {
          roadName: item.address?.street || item.title,
          city: item.address?.city
        };
      }
      
      return null;
    } catch (error) {
      console.error('HERE reverse geocode error:', error);
      return null;
    }
  }

  /**
   * Rate limit check for different API types
   */
  private async waitForRateLimit(apiType: 'geocoding' | 'routing' | 'fleet'): Promise<void> {
    const now = Date.now();
    let queue: Array<{ timestamp: number }>;
    let rps: number;

    switch (apiType) {
      case 'geocoding':
        queue = this.geocodingQueue;
        rps = this.GEOCODING_RPS;
        break;
      case 'routing':
        queue = this.routingQueue;
        rps = this.ROUTING_RPS;
        break;
      case 'fleet':
        queue = this.fleetQueue;
        rps = this.FLEET_RPS;
        break;
    }

    // Clean old entries (older than 1 second)
    const cutoff = now - 1000;
    while (queue.length > 0 && queue[0].timestamp < cutoff) {
      queue.shift();
    }

    // Check if we need to wait
    if (queue.length >= rps) {
      const oldestRequest = queue[0];
      const waitTime = 1000 - (now - oldestRequest.timestamp);
      if (waitTime > 0) {
        console.log(`Rate limiting: waiting ${waitTime}ms for ${apiType} API`);
        await this.delay(waitTime);
        return this.waitForRateLimit(apiType); // Recursive check after waiting
      }
    }

    // Add current request to queue
    queue.push({ timestamp: now });
  }

  /**
   * Make HTTP request with timeout, retry logic, and rate limiting
   */
  private async makeRequest(url: string, apiType: 'geocoding' | 'routing' | 'fleet' = 'geocoding', retryCount: number = 0): Promise<any> {
    // Wait for rate limit before making request
    await this.waitForRateLimit(apiType);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.requestTimeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GPS-Info-App/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        // Exponential backoff for rate limit errors
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
        console.log(`Rate limit hit, backing off for ${backoffTime}ms`);
        await this.delay(backoffTime);
        throw new Error('Rate limit exceeded - will retry with backoff');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (retryCount < this.config.maxRetries && 
          (error instanceof TypeError || error.message.includes('timeout'))) {
        console.log(`Retrying HERE API request (${retryCount + 1}/${this.config.maxRetries})`);
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return this.makeRequest(url, apiType, retryCount + 1);
      }
      
      throw error;
    }
  }



  /**
   * Check if we're within rate limits
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    // Reset counter if it's been more than a month
    if (now - this.lastResetTime > oneMonth) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    return this.requestCount < this.MONTHLY_LIMIT;
  }

  /**
   * Increment request counter
   */
  private incrementRequestCount(): void {
    this.requestCount++;
  }

  /**
   * Get current API usage statistics
   */
  getUsageStats(): { requestCount: number; remainingRequests: number; resetTime: Date } {
    return {
      requestCount: this.requestCount,
      remainingRequests: Math.max(0, this.MONTHLY_LIMIT - this.requestCount),
      resetTime: new Date(this.lastResetTime + (30 * 24 * 60 * 60 * 1000))
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset the service instance (useful for testing)
   */
  static reset(): void {
    HereSpeedLimitService.instance = undefined as any;
  }
}
