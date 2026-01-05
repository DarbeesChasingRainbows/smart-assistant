// Database service for PostgreSQL connection and queries
import { Pool } from "https://deno.land/x/postgres@v0.19.3/mod.ts";

interface MaintenanceTemplate {
  item_name: string;
  description?: string;
  interval_type: string;
  mileage_interval?: number;
  time_interval_months?: number;
  priority: number;
  estimated_cost?: number;
  estimated_hours?: number;
  category?: string;
}

interface ScheduleId {
  id: string;
}

// Database configuration using environment variables
const dbConfig = {
  hostname: Deno.env.get("DB_HOST") || "localhost",
  port: Number(Deno.env.get("DB_PORT")) || 5432,
  user: Deno.env.get("DB_USER") || "postgres",
  password: Deno.env.get("DB_PASSWORD") || "*Tx325z59aq",
  database: Deno.env.get("DB_NAME") || "vehicle_maintenance",
};

// Create connection pool with limits
const pool = new Pool(dbConfig, 10, true); // max 10 connections, lazy start

export interface Vehicle {
  id: string;
  vin?: string;
  vehicleType: "car" | "rv";
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
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceSchedule {
  id: string;
  vehicleId: string;
  itemName: string;
  description?: string;
  intervalType: "mileage" | "time" | "both";
  mileageInterval?: number;
  timeIntervalMonths?: number;
  priority: number;
  estimatedCost?: number;
  estimatedHours?: number;
  category?: string;
}

// RV-specific maintenance categories
export const RV_MAINTENANCE_CATEGORIES = [
  "Engine",
  "Drivetrain", 
  "Generator",
  "Brakes",
  "Tires",
  "Exterior",
  "Roof",
  "Slide-Outs",
  "Awning",
  "Electrical",
  "Propane",
  "Water System",
  "HVAC",
  "Refrigerator",
  "Leveling",
  "Safety",
  "Towing",
  "Winterization",
  "Interior",
] as const;

export type RvMaintenanceCategory = typeof RV_MAINTENANCE_CATEGORIES[number];

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  scheduleId: string;
  maintenanceDate: string;
  mileageAtService?: number; // Optional for historical records
  status: "pending" | "completed" | "overdue";
  actualCost?: number;
  actualHours?: number;
  serviceProvider?: string;
  notes?: string;
  receiptUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceDue {
  id: string;
  vehicleId: string;
  scheduleId: string;
  nextDueMileage?: number;
  nextDueDate?: string;
  lastMileage: number;
  lastServiceDate?: string;
  status: "pending" | "completed" | "overdue";
}

export class DatabaseService {
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Database operation attempt ${attempt} failed:`, error);

        if (attempt < maxAttempts) {
          // Wait before retry (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw lastError!;
  }

  // Vehicle operations
  createVehicle(
    vehicle: Omit<Vehicle, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    return this.executeWithRetry(async () => {
      const client = await pool.connect();
      try {
        const result = await client.queryObject`
          INSERT INTO vehicles (
            vin, vehicle_type, make, model, year, trim, engine, transmission,
            license_plate, color, purchase_date, purchase_mileage, current_mileage
          ) VALUES (
            ${vehicle.vin}, ${vehicle.vehicleType}, ${vehicle.make}, ${vehicle.model}, 
            ${vehicle.year}, ${vehicle.trim}, ${vehicle.engine}, ${vehicle.transmission},
            ${vehicle.licensePlate}, ${vehicle.color}, ${vehicle.purchaseDate}, 
            ${vehicle.purchaseMileage}, ${vehicle.currentMileage}
          ) RETURNING id
        `;
        return (result.rows[0] as { id: string }).id;
      } finally {
        client.release();
      }
    });
  }

  getVehicles(): Promise<Vehicle[]> {
    return this.executeWithRetry(async () => {
      const client = await pool.connect();
      try {
        const result = await client.queryObject`
          SELECT 
            id, vin, vehicle_type as "vehicleType", make, model, year, trim, engine,
            transmission, license_plate as "licensePlate", color, purchase_date as "purchaseDate",
            purchase_mileage as "purchaseMileage", current_mileage as "currentMileage",
            created_at as "createdAt", updated_at as "updatedAt"
          FROM vehicles 
          ORDER BY created_at DESC
        `;
        return result.rows as Vehicle[];
      } finally {
        client.release();
      }
    });
  }

  getVehicleById(id: string): Promise<Vehicle | null> {
    return this.executeWithRetry(async () => {
      const client = await pool.connect();
      try {
        const result = await client.queryObject`
          SELECT 
            id, vin, vehicle_type as "vehicleType", make, model, year, trim, engine,
            transmission, license_plate as "licensePlate", color, purchase_date as "purchaseDate",
            purchase_mileage as "purchaseMileage", current_mileage as "currentMileage",
            created_at as "createdAt", updated_at as "updatedAt"
          FROM vehicles 
          WHERE id = ${id}
        `;
        return result.rows.length > 0 ? result.rows[0] as Vehicle : null;
      } finally {
        client.release();
      }
    });
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<boolean> {
    const client = await pool.connect();
    try {
      const setClause = [];
      const values = [];

      if (updates.vin !== undefined) {
        setClause.push("vin = $" + (values.length + 1));
        values.push(updates.vin);
      }
      if (updates.currentMileage !== undefined) {
        setClause.push("current_mileage = $" + (values.length + 1));
        values.push(updates.currentMileage);
      }
      if (updates.licensePlate !== undefined) {
        setClause.push("license_plate = $" + (values.length + 1));
        values.push(updates.licensePlate);
      }
      if (updates.color !== undefined) {
        setClause.push("color = $" + (values.length + 1));
        values.push(updates.color);
      }

      if (setClause.length === 0) return false;

      setClause.push("updated_at = NOW()");
      values.push(id);

      const query = `UPDATE vehicles SET ${
        setClause.join(", ")
      } WHERE id = $${values.length}`;
      await client.queryObject(query, values);
      return true;
    } finally {
      client.release();
    }
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      await client.queryObject`DELETE FROM vehicles WHERE id = ${id}`;
      return true;
    } finally {
      client.release();
    }
  }

  // Maintenance schedule operations
  async createMaintenanceSchedule(
    schedule: Omit<MaintenanceSchedule, "id">,
  ): Promise<string> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject`
        INSERT INTO vehicle_maintenance_schedules (
          vehicle_id, item_name, description, interval_type, mileage_interval,
          time_interval_months, priority, estimated_cost, estimated_hours
        ) VALUES (
          ${schedule.vehicleId}, ${schedule.itemName}, ${schedule.description},
          ${schedule.intervalType}, ${schedule.mileageInterval}, ${schedule.timeIntervalMonths},
          ${schedule.priority}, ${schedule.estimatedCost}, ${schedule.estimatedHours}
        ) RETURNING id
      `;
      return (result.rows[0] as { id: string }).id;
    } finally {
      client.release();
    }
  }

  async getVehicleSchedules(vehicleId: string): Promise<MaintenanceSchedule[]> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject`
        SELECT 
          id, vehicle_id as "vehicleId", item_name as "itemName", description,
          interval_type as "intervalType", mileage_interval as "mileageInterval",
          time_interval_months as "timeIntervalMonths", priority,
          estimated_cost as "estimatedCost", estimated_hours as "estimatedHours"
        FROM vehicle_maintenance_schedules 
        WHERE vehicle_id = ${vehicleId}
        ORDER BY priority ASC, item_name ASC
      `;
      return result.rows as MaintenanceSchedule[];
    } finally {
      client.release();
    }
  }

  // Maintenance record operations
  async createMaintenanceRecord(
    record: Omit<MaintenanceRecord, "id" | "createdAt" | "updatedAt">,
  ): Promise<string> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject`
        INSERT INTO maintenance_records (
          vehicle_id, schedule_id, maintenance_date, mileage_at_service,
          status, actual_cost, actual_hours, service_provider, notes, receipt_url
        ) VALUES (
          ${record.vehicleId}, ${record.scheduleId}, ${record.maintenanceDate},
          ${record.mileageAtService}, ${record.status}, ${record.actualCost},
          ${record.actualHours}, ${record.serviceProvider}, ${record.notes}, ${record.receiptUrl}
        ) RETURNING id
      `;
      return (result.rows[0] as { id: string }).id;
    } finally {
      client.release();
    }
  }

  async getVehicleRecords(vehicleId: string): Promise<MaintenanceRecord[]> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject`
        SELECT 
          id, vehicle_id as "vehicleId", schedule_id as "scheduleId", maintenance_date as "maintenanceDate",
          mileage_at_service as "mileageAtService", status, actual_cost as "actualCost",
          actual_hours as "actualHours", service_provider as "serviceProvider", notes,
          receipt_url as "receiptUrl", created_at as "createdAt", updated_at as "updatedAt"
        FROM maintenance_records 
        WHERE vehicle_id = ${vehicleId}
        ORDER BY maintenance_date DESC
      `;
      return result.rows as MaintenanceRecord[];
    } finally {
      client.release();
    }
  }

  // Due maintenance operations
  async getDueMaintenance(vehicleId: string): Promise<MaintenanceDue[]> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject`
        SELECT 
          id, vehicle_id as "vehicleId", schedule_id as "scheduleId", next_due_mileage as "nextDueMileage",
          next_due_date as "nextDueDate", last_mileage as "lastMileage", last_service_date as "lastServiceDate",
          status
        FROM maintenance_due 
        WHERE vehicle_id = ${vehicleId}
        ORDER BY next_due_date ASC NULLS LAST, next_due_mileage ASC NULLS LAST
      `;
      return result.rows as MaintenanceDue[];
    } finally {
      client.release();
    }
  }

  // Initialize maintenance schedules for a new vehicle
  // Uses a transaction to ensure all schedules are created atomically
  initializeVehicleSchedules(
    vehicleId: string,
    vehicleType: "car" | "rv",
    make: string,
    model: string,
    year: number,
  ): Promise<void> {
    return this.executeWithRetry(async () => {
      const client = await pool.connect();
      try {
        // Begin transaction for atomic schedule initialization
        await client.queryObject`BEGIN`;

        try {
          // Get template schedules for this vehicle type
          const templates = await client.queryObject`
            SELECT * FROM maintenance_schedules 
            WHERE vehicle_type = ${vehicleType}
            AND (make IS NULL OR make = ${make})
            AND (model IS NULL OR model = ${model})
            AND (year_range_start IS NULL OR year_range_start <= ${year})
            AND (year_range_end IS NULL OR year_range_end >= ${year})
          `;

          // Create vehicle-specific schedules (includes category for RV maintenance organization)
          for (const template of templates.rows as MaintenanceTemplate[]) {
            await client.queryObject`
              INSERT INTO vehicle_maintenance_schedules (
                vehicle_id, item_name, description, interval_type, mileage_interval,
                time_interval_months, priority, estimated_cost, estimated_hours, category
              ) VALUES (
                ${vehicleId}, ${template.item_name}, ${template.description},
                ${template.interval_type}, ${template.mileage_interval}, 
                ${template.time_interval_months}, ${template.priority},
                ${template.estimated_cost}, ${template.estimated_hours}, ${template.category}
              )
            `;
          }

          // Initialize due calculations
          const schedules = await client.queryObject`
            SELECT id FROM vehicle_maintenance_schedules WHERE vehicle_id = ${vehicleId}
          `;

          for (const schedule of schedules.rows as ScheduleId[]) {
            await client.queryObject`
              SELECT update_maintenance_due(${vehicleId}, ${schedule.id})
            `;
          }

          // Commit transaction
          await client.queryObject`COMMIT`;
        } catch (error) {
          // Rollback on any error
          await client.queryObject`ROLLBACK`;
          console.error("Failed to initialize vehicle schedules, rolling back:", error);
          throw error;
        }
      } finally {
        client.release();
      }
    });
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<{
    totalVehicles: number;
    totalCars: number;
    totalRvs: number;
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
  }> {
    const client = await pool.connect();
    try {
      // Get vehicle counts
      const vehicleCounts = await client.queryObject`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE vehicle_type = 'car') as cars,
          COUNT(*) FILTER (WHERE vehicle_type = 'rv') as rvs
        FROM vehicles
      `;
      const counts = vehicleCounts.rows[0] as { total: string; cars: string; rvs: string };

      // Get maintenance status counts
      const maintenanceStatus = await client.queryObject`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'pending') as upcoming,
          COUNT(*) FILTER (WHERE status = 'overdue') as overdue
        FROM maintenance_due
      `;
      const status = maintenanceStatus.rows[0] as { upcoming: string; overdue: string };

      // Get total spent and record count
      const spendingStats = await client.queryObject`
        SELECT 
          COALESCE(SUM(actual_cost), 0) as total_spent,
          COUNT(*) as total_records
        FROM maintenance_records
      `;
      const spending = spendingStats.rows[0] as { total_spent: string; total_records: string };

      // Get recent maintenance records
      const recentRecordsResult = await client.queryObject`
        SELECT 
          mr.id,
          mr.vehicle_id as "vehicleId",
          CONCAT(v.year, ' ', v.make, ' ', v.model) as "vehicleName",
          vms.item_name as "itemName",
          mr.maintenance_date as "maintenanceDate",
          mr.actual_cost as "actualCost"
        FROM maintenance_records mr
        JOIN vehicles v ON v.id = mr.vehicle_id
        JOIN vehicle_maintenance_schedules vms ON vms.id = mr.schedule_id
        ORDER BY mr.maintenance_date DESC
        LIMIT 5
      `;

      // Get upcoming maintenance items
      const upcomingResult = await client.queryObject`
        SELECT 
          md.id,
          md.vehicle_id as "vehicleId",
          CONCAT(v.year, ' ', v.make, ' ', v.model) as "vehicleName",
          vms.item_name as "itemName",
          md.next_due_date as "nextDueDate",
          md.next_due_mileage as "nextDueMileage",
          md.status
        FROM maintenance_due md
        JOIN vehicles v ON v.id = md.vehicle_id
        JOIN vehicle_maintenance_schedules vms ON vms.id = md.schedule_id
        WHERE md.status IN ('pending', 'overdue')
        ORDER BY 
          CASE WHEN md.status = 'overdue' THEN 0 ELSE 1 END,
          md.next_due_date ASC NULLS LAST,
          md.next_due_mileage ASC NULLS LAST
        LIMIT 10
      `;

      return {
        totalVehicles: parseInt(counts.total) || 0,
        totalCars: parseInt(counts.cars) || 0,
        totalRvs: parseInt(counts.rvs) || 0,
        upcomingMaintenance: parseInt(status.upcoming) || 0,
        overdueMaintenance: parseInt(status.overdue) || 0,
        totalSpent: parseFloat(spending.total_spent) || 0,
        totalRecords: parseInt(spending.total_records) || 0,
        recentRecords: recentRecordsResult.rows as Array<{
          id: string;
          vehicleId: string;
          vehicleName: string;
          itemName: string;
          maintenanceDate: string;
          actualCost?: number;
        }>,
        upcomingItems: upcomingResult.rows as Array<{
          id: string;
          vehicleId: string;
          vehicleName: string;
          itemName: string;
          nextDueDate?: string;
          nextDueMileage?: number;
          status: string;
        }>,
      };
    } finally {
      client.release();
    }
  }

  // Get all maintenance records with pagination and filters
  async getAllMaintenanceRecords(options: {
    page?: number;
    limit?: number;
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{
    records: Array<{
      id: string;
      vehicleId: string;
      vehicleName: string;
      itemName: string;
      maintenanceDate: string;
      mileageAtService?: number; // Optional for historical records
      status: string;
      actualCost?: number;
      actualHours?: number;
      serviceProvider?: string;
      notes?: string;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }> {
    const client = await pool.connect();
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 100);
      const offset = (page - 1) * limit;

      let whereClause = "WHERE 1=1";
      const params: unknown[] = [];
      let paramIndex = 1;

      if (options.vehicleId) {
        whereClause += ` AND mr.vehicle_id = $${paramIndex++}`;
        params.push(options.vehicleId);
      }
      if (options.startDate) {
        whereClause += ` AND mr.maintenance_date >= $${paramIndex++}`;
        params.push(options.startDate);
      }
      if (options.endDate) {
        whereClause += ` AND mr.maintenance_date <= $${paramIndex++}`;
        params.push(options.endDate);
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM maintenance_records mr
        ${whereClause}
      `;
      const countResult = await client.queryObject(countQuery, params);
      const total = parseInt((countResult.rows[0] as { total: string }).total) || 0;

      // Get records
      const recordsQuery = `
        SELECT 
          mr.id,
          mr.vehicle_id as "vehicleId",
          CONCAT(v.year, ' ', v.make, ' ', v.model) as "vehicleName",
          vms.item_name as "itemName",
          mr.maintenance_date as "maintenanceDate",
          mr.mileage_at_service as "mileageAtService",
          mr.status,
          mr.actual_cost as "actualCost",
          mr.actual_hours as "actualHours",
          mr.service_provider as "serviceProvider",
          mr.notes
        FROM maintenance_records mr
        JOIN vehicles v ON v.id = mr.vehicle_id
        JOIN vehicle_maintenance_schedules vms ON vms.id = mr.schedule_id
        ${whereClause}
        ORDER BY mr.maintenance_date DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      params.push(limit, offset);
      const recordsResult = await client.queryObject(recordsQuery, params);

      return {
        records: recordsResult.rows as Array<{
          id: string;
          vehicleId: string;
          vehicleName: string;
          itemName: string;
          maintenanceDate: string;
          mileageAtService?: number;
          status: string;
          actualCost?: number;
          actualHours?: number;
          serviceProvider?: string;
          notes?: string;
        }>,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } finally {
      client.release();
    }
  }

  // Get cost analytics data
  async getCostAnalytics(options: {
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{
    totalSpent: number;
    averagePerService: number;
    totalServices: number;
    costByMonth: Array<{ month: string; cost: number; count: number }>;
    costByVehicle: Array<{ vehicleId: string; vehicleName: string; cost: number; count: number }>;
    costByCategory: Array<{ category: string; cost: number; count: number }>;
  }> {
    const client = await pool.connect();
    try {
      let whereClause = "WHERE 1=1";
      const params: unknown[] = [];
      let paramIndex = 1;

      if (options.vehicleId) {
        whereClause += ` AND mr.vehicle_id = $${paramIndex++}`;
        params.push(options.vehicleId);
      }
      if (options.startDate) {
        whereClause += ` AND mr.maintenance_date >= $${paramIndex++}`;
        params.push(options.startDate);
      }
      if (options.endDate) {
        whereClause += ` AND mr.maintenance_date <= $${paramIndex++}`;
        params.push(options.endDate);
      }

      // Get totals
      const totalsQuery = `
        SELECT 
          COALESCE(SUM(actual_cost), 0) as total_spent,
          COALESCE(AVG(actual_cost), 0) as avg_cost,
          COUNT(*) as total_services
        FROM maintenance_records mr
        ${whereClause}
      `;
      const totalsResult = await client.queryObject(totalsQuery, params);
      const totals = totalsResult.rows[0] as { total_spent: string; avg_cost: string; total_services: string };

      // Get cost by month (last 12 months)
      const monthlyQuery = `
        SELECT 
          TO_CHAR(mr.maintenance_date, 'YYYY-MM') as month,
          COALESCE(SUM(mr.actual_cost), 0) as cost,
          COUNT(*) as count
        FROM maintenance_records mr
        ${whereClause}
        AND mr.maintenance_date >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(mr.maintenance_date, 'YYYY-MM')
        ORDER BY month DESC
      `;
      const monthlyResult = await client.queryObject(monthlyQuery, params);

      // Get cost by vehicle
      const vehicleQuery = `
        SELECT 
          mr.vehicle_id as "vehicleId",
          CONCAT(v.year, ' ', v.make, ' ', v.model) as "vehicleName",
          COALESCE(SUM(mr.actual_cost), 0) as cost,
          COUNT(*) as count
        FROM maintenance_records mr
        JOIN vehicles v ON v.id = mr.vehicle_id
        ${whereClause}
        GROUP BY mr.vehicle_id, v.year, v.make, v.model
        ORDER BY cost DESC
      `;
      const vehicleResult = await client.queryObject(vehicleQuery, params);

      // Get cost by category (item name)
      const categoryQuery = `
        SELECT 
          vms.item_name as category,
          COALESCE(SUM(mr.actual_cost), 0) as cost,
          COUNT(*) as count
        FROM maintenance_records mr
        JOIN vehicle_maintenance_schedules vms ON vms.id = mr.schedule_id
        ${whereClause}
        GROUP BY vms.item_name
        ORDER BY cost DESC
        LIMIT 10
      `;
      const categoryResult = await client.queryObject(categoryQuery, params);

      return {
        totalSpent: parseFloat(totals.total_spent) || 0,
        averagePerService: parseFloat(totals.avg_cost) || 0,
        totalServices: parseInt(totals.total_services) || 0,
        costByMonth: monthlyResult.rows as Array<{ month: string; cost: number; count: number }>,
        costByVehicle: vehicleResult.rows as Array<{ vehicleId: string; vehicleName: string; cost: number; count: number }>,
        costByCategory: categoryResult.rows as Array<{ category: string; cost: number; count: number }>,
      };
    } finally {
      client.release();
    }
  }

  // Get maintenance schedules grouped by category for a vehicle
  async getMaintenanceByCategory(vehicleId: string): Promise<{
    category: string;
    items: Array<{
      id: string;
      itemName: string;
      description?: string;
      intervalType: string;
      mileageInterval?: number;
      timeIntervalMonths?: number;
      priority: number;
      estimatedCost?: number;
      nextDueDate?: string;
      nextDueMileage?: number;
      status?: string;
    }>;
    totalItems: number;
    overdueCount: number;
    upcomingCount: number;
  }[]> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject`
        SELECT 
          COALESCE(vms.category, 'General') as category,
          vms.id,
          vms.item_name as "itemName",
          vms.description,
          vms.interval_type as "intervalType",
          vms.mileage_interval as "mileageInterval",
          vms.time_interval_months as "timeIntervalMonths",
          vms.priority,
          vms.estimated_cost as "estimatedCost",
          md.next_due_date as "nextDueDate",
          md.next_due_mileage as "nextDueMileage",
          md.status
        FROM vehicle_maintenance_schedules vms
        LEFT JOIN maintenance_due md ON md.schedule_id = vms.id AND md.vehicle_id = vms.vehicle_id
        WHERE vms.vehicle_id = ${vehicleId}
        ORDER BY COALESCE(vms.category, 'General'), vms.priority, vms.item_name
      `;

      // Group by category
      const categoryMap = new Map<string, {
        items: Array<{
          id: string;
          itemName: string;
          description?: string;
          intervalType: string;
          mileageInterval?: number;
          timeIntervalMonths?: number;
          priority: number;
          estimatedCost?: number;
          nextDueDate?: string;
          nextDueMileage?: number;
          status?: string;
        }>;
        overdueCount: number;
        upcomingCount: number;
      }>();

      for (const row of result.rows as Array<{
        category: string;
        id: string;
        itemName: string;
        description?: string;
        intervalType: string;
        mileageInterval?: number;
        timeIntervalMonths?: number;
        priority: number;
        estimatedCost?: number;
        nextDueDate?: string;
        nextDueMileage?: number;
        status?: string;
      }>) {
        const category = row.category;
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { items: [], overdueCount: 0, upcomingCount: 0 });
        }
        const cat = categoryMap.get(category)!;
        cat.items.push({
          id: row.id,
          itemName: row.itemName,
          description: row.description,
          intervalType: row.intervalType,
          mileageInterval: row.mileageInterval,
          timeIntervalMonths: row.timeIntervalMonths,
          priority: row.priority,
          estimatedCost: row.estimatedCost,
          nextDueDate: row.nextDueDate,
          nextDueMileage: row.nextDueMileage,
          status: row.status,
        });
        if (row.status === "overdue") cat.overdueCount++;
        if (row.status === "pending") cat.upcomingCount++;
      }

      return Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        items: data.items,
        totalItems: data.items.length,
        overdueCount: data.overdueCount,
        upcomingCount: data.upcomingCount,
      }));
    } finally {
      client.release();
    }
  }

  // Get RV-specific maintenance summary
  async getRvMaintenanceSummary(vehicleId: string): Promise<{
    totalSchedules: number;
    overdueItems: number;
    upcomingItems: number;
    completedThisYear: number;
    estimatedAnnualCost: number;
    categoryBreakdown: Array<{
      category: string;
      total: number;
      overdue: number;
      upcoming: number;
      estimatedCost: number;
    }>;
    seasonalReminders: Array<{
      item: string;
      category: string;
      dueDate?: string;
      priority: number;
    }>;
  }> {
    const client = await pool.connect();
    try {
      // Get overall stats
      const statsResult = await client.queryObject`
        SELECT 
          COUNT(DISTINCT vms.id) as total_schedules,
          COUNT(*) FILTER (WHERE md.status = 'overdue') as overdue_items,
          COUNT(*) FILTER (WHERE md.status = 'pending') as upcoming_items,
          COALESCE(SUM(vms.estimated_cost), 0) as estimated_annual_cost
        FROM vehicle_maintenance_schedules vms
        LEFT JOIN maintenance_due md ON md.schedule_id = vms.id
        WHERE vms.vehicle_id = ${vehicleId}
      `;
      const stats = statsResult.rows[0] as {
        total_schedules: string;
        overdue_items: string;
        upcoming_items: string;
        estimated_annual_cost: string;
      };

      // Get completed this year
      const completedResult = await client.queryObject`
        SELECT COUNT(*) as completed
        FROM maintenance_records
        WHERE vehicle_id = ${vehicleId}
        AND maintenance_date >= DATE_TRUNC('year', CURRENT_DATE)
      `;
      const completed = (completedResult.rows[0] as { completed: string }).completed;

      // Get category breakdown
      const categoryResult = await client.queryObject`
        SELECT 
          COALESCE(vms.category, 'General') as category,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE md.status = 'overdue') as overdue,
          COUNT(*) FILTER (WHERE md.status = 'pending') as upcoming,
          COALESCE(SUM(vms.estimated_cost), 0) as estimated_cost
        FROM vehicle_maintenance_schedules vms
        LEFT JOIN maintenance_due md ON md.schedule_id = vms.id
        WHERE vms.vehicle_id = ${vehicleId}
        GROUP BY COALESCE(vms.category, 'General')
        ORDER BY total DESC
      `;

      // Get seasonal reminders (winterization, de-winterization, etc.)
      const seasonalResult = await client.queryObject`
        SELECT 
          vms.item_name as item,
          COALESCE(vms.category, 'General') as category,
          md.next_due_date as "dueDate",
          vms.priority
        FROM vehicle_maintenance_schedules vms
        LEFT JOIN maintenance_due md ON md.schedule_id = vms.id
        WHERE vms.vehicle_id = ${vehicleId}
        AND (
          vms.item_name ILIKE '%winteriz%'
          OR vms.item_name ILIKE '%seasonal%'
          OR vms.item_name ILIKE '%storage%'
          OR vms.category = 'Winterization'
        )
        ORDER BY md.next_due_date ASC NULLS LAST
      `;

      return {
        totalSchedules: parseInt(stats.total_schedules) || 0,
        overdueItems: parseInt(stats.overdue_items) || 0,
        upcomingItems: parseInt(stats.upcoming_items) || 0,
        completedThisYear: parseInt(completed) || 0,
        estimatedAnnualCost: parseFloat(stats.estimated_annual_cost) || 0,
        categoryBreakdown: categoryResult.rows as Array<{
          category: string;
          total: number;
          overdue: number;
          upcoming: number;
          estimatedCost: number;
        }>,
        seasonalReminders: seasonalResult.rows as Array<{
          item: string;
          category: string;
          dueDate?: string;
          priority: number;
        }>,
      };
    } finally {
      client.release();
    }
  }

  // Get available maintenance categories for a vehicle type
  async getMaintenanceCategories(vehicleType: "car" | "rv"): Promise<string[]> {
    const client = await pool.connect();
    try {
      const result = await client.queryObject`
        SELECT DISTINCT COALESCE(category, 'General') as category
        FROM maintenance_schedules
        WHERE vehicle_type = ${vehicleType}
        AND category IS NOT NULL
        ORDER BY category
      `;
      return (result.rows as Array<{ category: string }>).map(r => r.category);
    } finally {
      client.release();
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const client = await pool.connect();
      await client.queryObject`SELECT 1`;
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  // Cleanup method for graceful shutdown
  async close(): Promise<void> {
    try {
      await pool.end();
      console.log("Database connection pool closed successfully");
    } catch (error) {
      console.error("Error closing database connection pool:", error);
      throw error;
    }
  }
}

export const db = new DatabaseService();

// Handle graceful shutdown
if (typeof Deno !== "undefined") {
  // SIGTERM is not supported on Windows, only add it on Unix-like systems
  if (Deno.build.os !== "windows") {
    Deno.addSignalListener("SIGTERM", async () => {
      console.log("Received SIGTERM, closing database connections...");
      await db.close();
      Deno.exit(0);
    });
  }

  Deno.addSignalListener("SIGINT", async () => {
    console.log("Received SIGINT, closing database connections...");
    await db.close();
    Deno.exit(0);
  });
}
