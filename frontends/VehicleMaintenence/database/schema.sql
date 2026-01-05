-- Vehicle Maintenance Database Schema
-- PostgreSQL 17

-- Vehicle types enumeration
CREATE TYPE vehicle_type AS ENUM ('car', 'rv');

-- Maintenance interval types
CREATE TYPE interval_type AS ENUM ('mileage', 'time', 'both');

-- Status for maintenance records
CREATE TYPE maintenance_status AS ENUM ('pending', 'completed', 'overdue');

-- Vehicles table - polymorphic design for cars and RVs
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vin VARCHAR(17) UNIQUE,
    vehicle_type vehicle_type NOT NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    trim VARCHAR(100),
    engine VARCHAR(100),
    transmission VARCHAR(100),
    license_plate VARCHAR(20),
    color VARCHAR(50),
    purchase_date DATE,
    purchase_mileage INTEGER,
    current_mileage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance schedule templates
CREATE TABLE maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_type vehicle_type NOT NULL,
    make VARCHAR(100),
    model VARCHAR(100),
    year_range_start INTEGER,
    year_range_end INTEGER,
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    interval_type interval_type NOT NULL,
    mileage_interval INTEGER,
    time_interval_months INTEGER,
    priority INTEGER DEFAULT 1, -- 1=high, 2=medium, 3=low
    estimated_cost DECIMAL(10,2),
    estimated_hours DECIMAL(4,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicle-specific maintenance schedules (copied from templates)
CREATE TABLE vehicle_maintenance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES maintenance_schedules(id),
    item_name VARCHAR(200) NOT NULL,
    description TEXT,
    interval_type interval_type NOT NULL,
    mileage_interval INTEGER,
    time_interval_months INTEGER,
    priority INTEGER DEFAULT 1,
    estimated_cost DECIMAL(10,2),
    estimated_hours DECIMAL(4,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance records
CREATE TABLE maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES vehicle_maintenance_schedules(id),
    maintenance_date DATE NOT NULL,
    mileage_at_service INTEGER, -- Optional for historical records where mileage is unknown
    status maintenance_status DEFAULT 'completed',
    actual_cost DECIMAL(10,2),
    actual_hours DECIMAL(4,2),
    service_provider VARCHAR(200),
    notes TEXT,
    receipt_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Next due calculations for each vehicle schedule
CREATE TABLE maintenance_due (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES vehicle_maintenance_schedules(id) ON DELETE CASCADE,
    next_due_mileage INTEGER,
    next_due_date DATE,
    last_mileage INTEGER DEFAULT 0,
    last_service_date DATE,
    status maintenance_status DEFAULT 'pending',
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vehicle_id, schedule_id)
);

-- Indexes for performance
CREATE INDEX idx_vehicles_vin ON vehicles(vin);
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type);
CREATE INDEX idx_maintenance_schedules_type ON maintenance_schedules(vehicle_type);
CREATE INDEX idx_vehicle_maintenance_schedules_vehicle ON vehicle_maintenance_schedules(vehicle_id);
CREATE INDEX idx_maintenance_records_vehicle ON maintenance_records(vehicle_id);
CREATE INDEX idx_maintenance_records_date ON maintenance_records(maintenance_date);
CREATE INDEX idx_maintenance_due_vehicle ON maintenance_due(vehicle_id);
CREATE INDEX idx_maintenance_due_status ON maintenance_due(status);
CREATE INDEX idx_maintenance_due_next_due_date ON maintenance_due(next_due_date);
CREATE INDEX idx_maintenance_due_next_due_mileage ON maintenance_due(next_due_mileage);

-- Function to update next due maintenance
CREATE OR REPLACE FUNCTION update_maintenance_due(
    p_vehicle_id UUID,
    p_schedule_id UUID
) RETURNS VOID AS $$
DECLARE
    v_schedule vehicle_maintenance_schedules%ROWTYPE;
    v_last_record maintenance_records%ROWTYPE;
    v_next_mileage INTEGER;
    v_next_date DATE;
    v_current_mileage INTEGER;
BEGIN
    -- Get schedule details
    SELECT * INTO v_schedule 
    FROM vehicle_maintenance_schedules 
    WHERE id = p_schedule_id;
    
    -- Get current vehicle mileage
    SELECT current_mileage INTO v_current_mileage
    FROM vehicles WHERE id = p_vehicle_id;
    
    -- Get last maintenance record (prefer records with mileage for mileage-based calculations)
    SELECT * INTO v_last_record
    FROM maintenance_records 
    WHERE vehicle_id = p_vehicle_id AND schedule_id = p_schedule_id
    ORDER BY maintenance_date DESC, mileage_at_service DESC NULLS LAST
    LIMIT 1;
    
    -- Calculate next due based on schedule intervals
    IF v_last_record IS NULL THEN
        -- No previous records, use current vehicle mileage
        v_next_mileage := CASE 
            WHEN v_schedule.mileage_interval IS NOT NULL 
            THEN v_current_mileage + v_schedule.mileage_interval
            ELSE NULL 
        END;
        v_next_date := CASE 
            WHEN v_schedule.time_interval_months IS NOT NULL 
            THEN CURRENT_DATE + (v_schedule.time_interval_months || ' months')::INTERVAL
            ELSE NULL 
        END;
    ELSE
        -- Calculate from last service
        -- For mileage: use last recorded mileage, or current mileage if not available
        v_next_mileage := CASE 
            WHEN v_schedule.mileage_interval IS NOT NULL 
            THEN COALESCE(v_last_record.mileage_at_service, v_current_mileage) + v_schedule.mileage_interval
            ELSE NULL 
        END;
        v_next_date := CASE 
            WHEN v_schedule.time_interval_months IS NOT NULL 
            THEN v_last_record.maintenance_date + (v_schedule.time_interval_months || ' months')::INTERVAL
            ELSE NULL 
        END;
    END IF;
    
    -- Update or insert due record
    INSERT INTO maintenance_due (
        vehicle_id, schedule_id, next_due_mileage, next_due_date,
        last_mileage, last_service_date, status, calculated_at
    ) VALUES (
        p_vehicle_id, p_schedule_id, v_next_mileage, v_next_date,
        COALESCE(v_last_record.mileage_at_service, 0),
        v_last_record.maintenance_date,
        'pending',
        NOW()
    )
    ON CONFLICT (vehicle_id, schedule_id) 
    DO UPDATE SET
        next_due_mileage = EXCLUDED.next_due_mileage,
        next_due_date = EXCLUDED.next_due_date,
        last_mileage = EXCLUDED.last_mileage,
        last_service_date = EXCLUDED.last_service_date,
        status = EXCLUDED.status,
        calculated_at = EXCLUDED.calculated_at;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update due dates when maintenance records are added
CREATE OR REPLACE FUNCTION trigger_update_maintenance_due()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_maintenance_due(NEW.vehicle_id, NEW.schedule_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintenance_records_after_insert
    AFTER INSERT ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_maintenance_due();

-- Sample data for common maintenance schedules
INSERT INTO maintenance_schedules (vehicle_type, item_name, description, interval_type, mileage_interval, time_interval_months, priority, estimated_cost, estimated_hours) VALUES
('car', 'Oil Change', 'Regular engine oil and filter replacement', 'both', 5000, 6, 1, 45.00, 0.5),
('car', 'Tire Rotation', 'Rotate tires to ensure even wear', 'both', 7500, 6, 2, 25.00, 0.3),
('car', 'Brake Inspection', 'Check brake pads, rotors, and fluid', 'mileage', 15000, NULL, 1, 80.00, 1.0),
('car', 'Air Filter Replacement', 'Replace engine air filter', 'mileage', 15000, NULL, 2, 20.00, 0.2),
('car', 'Transmission Fluid', 'Check and replace transmission fluid', 'mileage', 30000, NULL, 1, 150.00, 1.5),
('car', 'Coolant Flush', 'Flush and replace coolant', 'mileage', 40000, NULL, 1, 120.00, 1.0),
('car', 'Spark Plugs', 'Replace spark plugs', 'mileage', 60000, NULL, 2, 200.00, 2.0),
('car', 'Timing Belt', 'Replace timing belt', 'mileage', 90000, NULL, 1, 500.00, 4.0),

('rv', 'Oil Change', 'Regular engine oil and filter replacement', 'both', 3000, 6, 1, 75.00, 1.0),
('rv', 'Generator Service', 'Generator oil change and maintenance', 'both', 100, 12, 1, 100.00, 1.5),
('rv', 'RV Roof Inspection', 'Inspect roof seals and condition', 'time', NULL, 6, 1, 50.00, 1.0),
('rv', 'Battery Check', 'Check house and chassis batteries', 'time', NULL, 3, 2, 30.00, 0.5),
('rv', 'Propane System', 'Inspect propane lines and appliances', 'time', NULL, 12, 1, 80.00, 1.0),
('rv', 'Tire Inspection', 'Check RV tire pressure and condition', 'both', 5000, 3, 1, 40.00, 0.5),
('rv', 'Water System', 'Sanitize and inspect water system', 'time', NULL, 6, 2, 60.00, 1.0),
('rv', 'Brake System', 'Comprehensive brake inspection', 'mileage', 12000, NULL, 1, 200.00, 2.0);
