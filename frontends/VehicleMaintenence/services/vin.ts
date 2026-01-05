// VIN Lookup Service using NHTSA API
// https://vpic.nhtsa.dot.gov/api/
import { cache } from "./cache.ts";

// DecodeVinValues returns a flat object with all fields
interface NhtsaFlatResult {
  Make: string;
  Model: string;
  ModelYear: string;
  Trim: string;
  VIN: string;
  VehicleType: string;
  BodyClass: string;
  DisplacementL: string;
  TransmissionStyle: string;
  PlantCity: string;
  PlantState: string;
  PlantCountry: string;
  ErrorCode: string;
  ErrorText: string;
  [key: string]: string;
}

export interface VinData {
  vin: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  engine?: string;
  transmission?: string;
  vehicleType: string;
  bodyClass: string;
  fuelType?: string;
  manufacturer?: string;
  modelYear?: number;
  plantCity?: string;
  plantState?: string;
  plantCountry?: string;
}

export interface VinLookupError {
  error: string;
  message: string;
  details?: string;
}

export class VinLookupService {
  private readonly baseUrl =
    "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";

  async lookupVin(vin: string): Promise<VinData | VinLookupError> {
    // Check cache first
    const cached = cache.getVinLookup(vin);
    if (cached) {
      console.log(`VIN cache hit for ${vin}`);
      return cached as unknown as VinData | VinLookupError;
    }

    // Validate VIN format (17 characters, alphanumeric)
    if (!this.isValidVin(vin)) {
      return {
        error: "INVALID_VIN",
        message:
          "VIN must be 17 characters long and contain only letters and numbers",
      };
    }

    try {
      const url = `${this.baseUrl}/${vin}?format=json`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // DecodeVinValues returns Results as an array with one flat object
      const vinResult = data.Results?.[0] as NhtsaFlatResult;
      
      if (!vinResult || (vinResult.ErrorCode && vinResult.ErrorCode !== "0")) {
        const error = {
          error: "VIN_DECODE_ERROR",
          message: "VIN lookup failed",
          details: vinResult?.ErrorText || "Unknown error from NHTSA API",
        };
        // Cache error result for shorter time
        cache.set(`vin:${vin}`, error, 5 * 60 * 1000); // 5 minutes
        return error;
      }

      const result = this.parseVinData(vinResult);

      // Cache the result
      cache.cacheVinLookup(vin, result as unknown as Record<string, unknown>);

      return result;
    } catch (error) {
      console.error("VIN lookup error:", error);
      const errorResult = {
        error: "NETWORK_ERROR",
        message: "Failed to connect to VIN lookup service",
        details: error instanceof Error ? error.message : "Unknown error",
      };
      // Cache network errors for short time to prevent repeated failed requests
      cache.set(`vin:${vin}`, errorResult, 5 * 60 * 1000);
      return errorResult;
    }
  }

  private isValidVin(vin: string): boolean {
    // Remove any spaces or dashes and validate format
    const cleanVin = vin.replace(/[\s-]/g, "").toUpperCase();
    return /^[A-HJ-NPR-Z0-9]{17}$/.test(cleanVin);
  }

  private parseVinData(result: NhtsaFlatResult): VinData {
    // Helper to get non-empty string or undefined
    const getValue = (val: string | undefined): string | undefined => {
      return val && val.trim() !== "" ? val.trim() : undefined;
    };

    // Extract and normalize common fields from flat result
    const make = getValue(result.Make) || "";
    const model = getValue(result.Model) || "";
    const year = parseInt(result.ModelYear || "0");
    const trim = getValue(result.Trim);
    const engine = getValue(result.DisplacementL) 
      ? `${result.DisplacementL}L` 
      : undefined;
    const transmission = getValue(result.TransmissionStyle);
    const vehicleType = getValue(result.VehicleType) || "Unknown";
    const bodyClass = getValue(result.BodyClass) || "Unknown";
    const plantCity = getValue(result.PlantCity);
    const plantState = getValue(result.PlantState);
    const plantCountry = getValue(result.PlantCountry);

    return {
      vin: getValue(result.VIN) || "",
      make,
      model,
      year,
      trim,
      engine,
      transmission,
      vehicleType,
      bodyClass,
      plantCity,
      plantState,
      plantCountry,
    };
  }

  // Helper method to determine if this is likely an RV based on body class
  isRvVehicle(vinData: VinData): boolean {
    const rvIndicators = [
      "Travel Trailer",
      "Motor Home",
      "Camper",
      "Recreational Vehicle",
      "RV",
      "Fifth Wheel",
      "Toy Hauler",
    ];

    return rvIndicators.some((indicator) =>
      vinData.bodyClass.toLowerCase().includes(indicator.toLowerCase()) ||
      vinData.vehicleType.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  // Validate and format VIN for display
  formatVin(vin: string): string {
    return vin.replace(/[\s-]/g, "").toUpperCase();
  }
}

// Export singleton instance
export const vinLookupService = new VinLookupService();
