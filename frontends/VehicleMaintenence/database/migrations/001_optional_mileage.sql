-- Migration: Make mileage_at_service optional for historical maintenance records
-- This allows users to add past maintenance without knowing the exact mileage

-- Make mileage_at_service nullable
ALTER TABLE maintenance_records 
ALTER COLUMN mileage_at_service DROP NOT NULL;

-- Update the function to handle NULL mileage values
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
