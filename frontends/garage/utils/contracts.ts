/**
 * TypeScript contracts aligned with C# DTOs from LifeOS Garage Service
 * These interfaces match the exact structure of the backend API responses.
 */

// ============================================================================
// Core Domain Types
// ============================================================================

/**
 * Vehicle DTO - matches VehicleDto in C#
 */
export interface Vehicle {
  id: string;
  vin?: string;
  vehicleType: VehicleType;
  make: string;
  model: string;
  year: number;
  trim?: string;
  engine?: string;
  transmission?: string;
  licensePlate?: string;
  color?: string;
  purchaseDate?: string; // ISO 8601 date
  purchaseMileage?: number;
  currentMileage: number;
  createdAt: string; // ISO 8601 datetime
  updatedAt: string; // ISO 8601 datetime
}

/**
 * Vehicle type enum
 */
export type VehicleType = "car" | "rv" | "motorcycle" | "truck";

/**
 * Maintenance record DTO
 */
export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  itemName: string;
  description?: string;
  category?: string;
  maintenanceDate: string; // ISO 8601 date
  mileage?: number;
  nextDueDate?: string; // ISO 8601 date
  nextDueMileage?: number;
  status: MaintenanceStatus;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedCost?: number;
  actualCost?: number;
  estimatedHours?: number;
  actualHours?: number;
  notes?: string;
  attachments?: string[]; // MinIO object keys
  createdAt: string;
  updatedAt: string;
}

/**
 * Maintenance status enum
 */
export type MaintenanceStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "overdue"
  | "cancelled";

// ============================================================================
// Request DTOs
// ============================================================================

/**
 * Create vehicle request
 */
export interface CreateVehicleRequest {
  vin?: string;
  vehicleType: VehicleType;
  make: string;
  model: string;
  year: number;
  trim?: string;
  engine?: string;
  transmission?: string;
  licensePlate?: string;
  color?: string;
  purchaseDate?: string;
  purchaseMileage?: number;
  currentMileage: number;
}

/**
 * Update vehicle request
 */
export interface UpdateVehicleRequest extends CreateVehicleRequest {
  id: string;
}

/**
 * Create maintenance record request
 */
export interface CreateMaintenanceRecordRequest {
  vehicleId: string;
  itemName: string;
  description?: string;
  category?: string;
  maintenanceDate: string;
  mileage?: number;
  nextDueDate?: string;
  nextDueMileage?: number;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedCost?: number;
  estimatedHours?: number;
  notes?: string;
}

/**
 * Update maintenance record request
 */
export interface UpdateMaintenanceRecordRequest
  extends CreateMaintenanceRecordRequest {
  id: string;
  actualCost?: number;
  actualHours?: number;
  status: MaintenanceStatus;
}

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * VIN lookup response
 */
export interface VinLookupResponse {
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  trim?: string;
  engine?: string;
  transmission?: string;
  vehicleType?: VehicleType;
  manufacturer?: string;
  plant?: string;
  series?: string;
  body?: string;
  fuel?: string;
  error?: string;
}

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalVehicles: number;
  totalCars: number;
  totalRvs: number;
  totalMotorcycles: number;
  totalTrucks: number;
  upcomingMaintenance: number;
  overdueMaintenance: number;
  totalSpent: number;
  totalRecords: number;
  recentRecords: Array<{
    id: string;
    vehicleId: string;
    vehicleName: string;
    itemName: string;
    maintenanceDate: string;
    actualCost?: number;
  }>;
  upcomingItems: Array<{
    id: string;
    vehicleId: string;
    vehicleName: string;
    itemName: string;
    nextDueDate?: string;
    nextDueMileage?: number;
    status: string;
  }>;
}

/**
 * Maintenance template for recurring items
 */
export interface MaintenanceTemplate {
  id: string;
  itemName: string;
  description?: string;
  category?: string;
  vehicleType?: VehicleType;
  intervalType: "mileage" | "time" | "both";
  mileageInterval?: number;
  timeIntervalMonths?: number;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedCost?: number;
  estimatedHours?: number;
  isActive: boolean;
}

/**
 * Expense report
 */
export interface ExpenseReport {
  vehicleId: string;
  vehicleName: string;
  period: string; // e.g., "2024-01", "2024-Q1"
  totalExpenses: number;
  maintenanceCost: number;
  partsCost: number;
  laborCost: number;
  otherCost: number;
  recordCount: number;
}

/**
 * Vehicle summary
 */
export interface VehicleSummary {
  vehicle: Vehicle;
  totalMaintenanceRecords: number;
  totalSpent: number;
  lastMaintenanceDate?: string;
  lastMaintenanceMileage?: number;
  nextMaintenanceDate?: string;
  nextMaintenanceMileage?: number;
  upcomingMaintenanceCount: number;
  overdueMaintenanceCount: number;
}
