/**
 * Database service for the Garage frontend
 * Wraps the GarageApiClient for use in server-side routes
 */

import { GarageApiClient } from "../utils/api.ts";

// Create a singleton instance of the API client
export const db = new GarageApiClient();

// Re-export the client class for custom instances
export { GarageApiClient };
