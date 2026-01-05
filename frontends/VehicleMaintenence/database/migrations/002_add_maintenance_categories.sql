-- Migration: Add maintenance categories for better organization
-- Run this after the initial schema

-- Add category column to maintenance_schedules
ALTER TABLE maintenance_schedules 
ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Add category column to vehicle_maintenance_schedules
ALTER TABLE vehicle_maintenance_schedules 
ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_maintenance_schedules_category 
ON maintenance_schedules(category);

CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_schedules_category 
ON vehicle_maintenance_schedules(category);

-- Update existing car maintenance items with categories
UPDATE maintenance_schedules SET category = 'Engine' WHERE vehicle_type = 'car' AND item_name IN ('Oil Change', 'Air Filter Replacement', 'Spark Plugs', 'Timing Belt');
UPDATE maintenance_schedules SET category = 'Drivetrain' WHERE vehicle_type = 'car' AND item_name IN ('Transmission Fluid');
UPDATE maintenance_schedules SET category = 'Cooling' WHERE vehicle_type = 'car' AND item_name IN ('Coolant Flush');
UPDATE maintenance_schedules SET category = 'Brakes' WHERE vehicle_type = 'car' AND item_name IN ('Brake Inspection');
UPDATE maintenance_schedules SET category = 'Tires' WHERE vehicle_type = 'car' AND item_name IN ('Tire Rotation');

-- Update existing RV maintenance items with categories
UPDATE maintenance_schedules SET category = 'Engine' WHERE vehicle_type = 'rv' AND item_name LIKE '%Oil Change%' AND item_name NOT LIKE '%Generator%';
UPDATE maintenance_schedules SET category = 'Generator' WHERE vehicle_type = 'rv' AND item_name LIKE '%Generator%';
UPDATE maintenance_schedules SET category = 'Exterior' WHERE vehicle_type = 'rv' AND item_name LIKE '%Roof%';
UPDATE maintenance_schedules SET category = 'Electrical' WHERE vehicle_type = 'rv' AND item_name LIKE '%Battery%';
UPDATE maintenance_schedules SET category = 'Propane' WHERE vehicle_type = 'rv' AND item_name LIKE '%Propane%';
UPDATE maintenance_schedules SET category = 'Tires' WHERE vehicle_type = 'rv' AND item_name LIKE '%Tire%';
UPDATE maintenance_schedules SET category = 'Water System' WHERE vehicle_type = 'rv' AND item_name LIKE '%Water%';
UPDATE maintenance_schedules SET category = 'Brakes' WHERE vehicle_type = 'rv' AND item_name LIKE '%Brake%';
