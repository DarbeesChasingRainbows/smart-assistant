// Simple in-memory cache service for VIN lookups and other data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class CacheService {
  private cache = new Map<string, CacheEntry<unknown>>();

  // Default TTL values (in milliseconds)
  private static readonly TTL = {
    VIN_LOOKUP: 30 * 24 * 60 * 60 * 1000, // 30 days - VIN data never changes
    VEHICLE_LIST: 5 * 60 * 1000, // 5 minutes
    MAINTENANCE_DATA: 2 * 60 * 1000, // 2 minutes - maintenance updates frequently
  };

  // Set cache entry
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  // Get cache entry
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // Delete cache entry
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache statistics
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Convenience methods for specific cache types
  cacheVinLookup(vin: string, data: Record<string, unknown>): void {
    this.set(`vin:${vin}`, data, CacheService.TTL.VIN_LOOKUP);
  }

  getVinLookup(vin: string): Record<string, unknown> | null {
    return this.get<Record<string, unknown>>(`vin:${vin}`);
  }

  cacheVehicleList(userId: string, data: unknown[]): void {
    this.set(`vehicles:${userId}`, data, CacheService.TTL.VEHICLE_LIST);
  }

  getVehicleList(userId: string): unknown[] | null {
    return this.get<unknown[]>(`vehicles:${userId}`);
  }

  cacheMaintenanceData(vehicleId: string, data: Record<string, unknown>): void {
    this.set(
      `maintenance:${vehicleId}`,
      data,
      CacheService.TTL.MAINTENANCE_DATA,
    );
  }

  getMaintenanceData(vehicleId: string): Record<string, unknown> | null {
    return this.get<Record<string, unknown>>(`maintenance:${vehicleId}`);
  }

  // Invalidate vehicle-related cache when data changes
  invalidateVehicleCache(vehicleId: string): void {
    this.delete(`maintenance:${vehicleId}`);
    // Note: We don't clear vehicle list cache here as it's user-specific
  }
}

// Export singleton instance
export const cache = new CacheService();

// Auto-cleanup expired entries every 10 minutes
setInterval(() => {
  cache.cleanup();
}, 10 * 60 * 1000);
