/**
 * Client for the Garage Service (.NET Web API)
 * 
 * @see utils/contracts.ts for type definitions aligned with C# DTOs
 */

// Re-export all contracts for convenience
export * from "./contracts.ts";

import type {
  Vehicle,
  MaintenanceRecord,
  CreateVehicleRequest,
  UpdateVehicleRequest,
  CreateMaintenanceRecordRequest,
  UpdateMaintenanceRecordRequest,
  VinLookupResponse,
} from "./contracts.ts";

export class GarageApiClient {
  public baseUrl: string;

  constructor(baseUrl?: string) {
    const envUrl = typeof Deno !== "undefined" ? Deno.env.get("VITE_API_URL") : undefined;
    this.baseUrl = baseUrl || envUrl || "http://localhost:5120";
  }

  // ============================================================================
  // Vehicle Methods
  // ============================================================================

  async getVehicles(): Promise<Vehicle[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/vehicles`);
    if (!response.ok) throw new Error(`Failed to fetch vehicles: ${response.statusText}`);
    return response.json();
  }

  async getVehicleById(id: string): Promise<Vehicle> {
    const response = await fetch(`${this.baseUrl}/api/v1/vehicles/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch vehicle: ${response.statusText}`);
    return response.json();
  }

  async createVehicle(request: CreateVehicleRequest): Promise<Vehicle> {
    const response = await fetch(`${this.baseUrl}/api/v1/vehicles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Failed to create vehicle: ${response.statusText}`);
    return response.json();
  }

  async updateVehicle(vehicle: UpdateVehicleRequest): Promise<Vehicle> {
    const response = await fetch(`${this.baseUrl}/api/v1/vehicles/${vehicle.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vehicle),
    });
    if (!response.ok) throw new Error(`Failed to update vehicle: ${response.statusText}`);
    return response.json();
  }

  async deleteVehicle(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/vehicles/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`Failed to delete vehicle: ${response.statusText}`);
  }

  // ============================================================================
  // Maintenance Methods
  // ============================================================================

  async getMaintenanceRecords(vehicleId?: string): Promise<MaintenanceRecord[]> {
    let url = `${this.baseUrl}/api/v1/maintenance`;
    if (vehicleId) url += `?vehicleId=${vehicleId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch maintenance records: ${response.statusText}`);
    return response.json();
  }

  async getMaintenanceRecordById(id: string): Promise<MaintenanceRecord> {
    const response = await fetch(`${this.baseUrl}/api/v1/maintenance/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch maintenance record: ${response.statusText}`);
    return response.json();
  }

  async createMaintenanceRecord(request: CreateMaintenanceRecordRequest): Promise<MaintenanceRecord> {
    const response = await fetch(`${this.baseUrl}/api/v1/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Failed to create maintenance record: ${response.statusText}`);
    return response.json();
  }

  async updateMaintenanceRecord(record: UpdateMaintenanceRecordRequest): Promise<MaintenanceRecord> {
    const response = await fetch(`${this.baseUrl}/api/v1/maintenance/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error(`Failed to update maintenance record: ${response.statusText}`);
    return response.json();
  }

  async deleteMaintenanceRecord(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/maintenance/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`Failed to delete maintenance record: ${response.statusText}`);
  }

  async getUpcomingMaintenance(vehicleId?: string): Promise<MaintenanceRecord[]> {
    let url = `${this.baseUrl}/api/v1/maintenance/upcoming`;
    if (vehicleId) url += `?vehicleId=${vehicleId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch upcoming maintenance: ${response.statusText}`);
    return response.json();
  }

  // ============================================================================
  // VIN Lookup
  // ============================================================================

  async lookupVin(vin: string): Promise<VinLookupResponse> {
    const response = await fetch(`${this.baseUrl}/api/v1/vin/lookup/${vin}`);
    if (!response.ok) throw new Error(`Failed to lookup VIN: ${response.statusText}`);
    return response.json();
  }

  // ============================================================================
  // Dashboard Methods
  // ============================================================================

  async getDashboardStats(): Promise<{
    totalVehicles: number;
    totalCars: number;
    totalRvs: number;
    upcomingMaintenance: number;
    overdueMaintenance: number;
    totalSpent: number;
    totalRecords: number;
  }> {
    const response = await fetch(`${this.baseUrl}/api/v1/dashboard/stats`);
    if (!response.ok) throw new Error(`Failed to fetch dashboard stats: ${response.statusText}`);
    return response.json();
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) throw new Error(`Health check failed: ${response.statusText}`);
    return response.json();
  }
}
