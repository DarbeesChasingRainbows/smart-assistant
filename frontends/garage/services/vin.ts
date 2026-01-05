/**
 * VIN Lookup Service for the Garage frontend
 * Wraps the NHTSA VIN Decoder API
 */

import { db } from "./database.ts";

export interface VinLookupResult {
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  trim?: string;
  engine?: string;
  transmission?: string;
  body?: string;
  fuel?: string;
  vehicleType?: string;
  manufacturer?: string;
  plant?: string;
  errorCode?: string;
  errorText?: string;
}

export interface VinLookupError {
  error: string;
  message: string;
}

class VinLookupService {
  /**
   * Lookup vehicle information by VIN using the backend API
   */
  async lookupVin(vin: string): Promise<VinLookupResult | VinLookupError> {
    try {
      const result = await db.lookupVin(vin);
      return {
        vin,
        make: result.make,
        model: result.model,
        year: result.year,
        trim: result.trim,
        engine: result.engine,
        transmission: result.transmission,
        body: result.body,
        fuel: result.fuel,
        vehicleType: result.vehicleType,
        manufacturer: result.manufacturer,
        plant: result.plant,
      };
    } catch (error) {
      console.error("VIN lookup error:", error);
      return {
        error: "LOOKUP_FAILED",
        message: error instanceof Error ? error.message : "Failed to lookup VIN",
      };
    }
  }

  /**
   * Determine if a vehicle is an RV based on body class and other attributes
   */
  isRvVehicle(result: VinLookupResult): boolean {
    const rvKeywords = [
      "motorhome",
      "motor home",
      "recreational",
      "rv",
      "camper",
      "coach",
      "conversion van",
      "class a",
      "class b",
      "class c",
    ];

    const body = (result.body || "").toLowerCase();
    const vehicleType = (result.vehicleType || "").toLowerCase();
    const manufacturer = (result.manufacturer || "").toLowerCase();

    // Check body class
    for (const keyword of rvKeywords) {
      if (body.includes(keyword) || vehicleType.includes(keyword)) {
        return true;
      }
    }

    // Check for known RV manufacturers
    const rvManufacturers = [
      "winnebago",
      "thor",
      "forest river",
      "jayco",
      "coachmen",
      "fleetwood",
      "newmar",
      "tiffin",
      "airstream",
      "keystone",
    ];

    for (const mfr of rvManufacturers) {
      if (manufacturer.includes(mfr)) {
        return true;
      }
    }

    return false;
  }
}

export const vinLookupService = new VinLookupService();
