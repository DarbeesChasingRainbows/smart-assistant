-- RV-Specific Maintenance Schedules Seed Data
-- Comprehensive maintenance items for motorhomes, travel trailers, and fifth wheels
-- PostgreSQL 17

-- First, remove existing RV schedules to avoid duplicates (optional - comment out if you want to keep existing)
-- DELETE FROM maintenance_schedules WHERE vehicle_type = 'rv';

-- ============================================
-- ENGINE & DRIVETRAIN (Motorhomes)
-- ============================================
INSERT INTO maintenance_schedules (vehicle_type, item_name, description, interval_type, mileage_interval, time_interval_months, priority, estimated_cost, estimated_hours) VALUES
('rv', 'Engine Oil Change', 'Replace engine oil and filter - use manufacturer recommended weight', 'both', 3000, 6, 1, 85.00, 1.0),
('rv', 'Transmission Fluid Check', 'Check transmission fluid level and condition', 'both', 6000, 6, 1, 25.00, 0.5),
('rv', 'Transmission Fluid Change', 'Complete transmission fluid and filter change', 'mileage', 30000, NULL, 1, 250.00, 2.0),
('rv', 'Differential Fluid', 'Check and replace differential fluid', 'mileage', 30000, NULL, 2, 120.00, 1.0),
('rv', 'Transfer Case Fluid', 'Check and replace transfer case fluid (4WD units)', 'mileage', 30000, NULL, 2, 100.00, 1.0),
('rv', 'Engine Air Filter', 'Replace engine air filter element', 'both', 15000, 12, 2, 45.00, 0.3),
('rv', 'Fuel Filter', 'Replace fuel filter', 'both', 15000, 12, 1, 75.00, 0.5),
('rv', 'Coolant System Flush', 'Flush and replace engine coolant', 'both', 30000, 24, 1, 150.00, 1.5),
('rv', 'Serpentine Belt Inspection', 'Inspect serpentine belt for wear and cracks', 'both', 15000, 12, 2, 25.00, 0.3),
('rv', 'Serpentine Belt Replacement', 'Replace serpentine belt', 'mileage', 60000, NULL, 1, 150.00, 1.0),
('rv', 'Spark Plugs', 'Replace spark plugs (gas engines)', 'mileage', 30000, NULL, 2, 180.00, 2.0),
('rv', 'Glow Plugs', 'Inspect/replace glow plugs (diesel engines)', 'mileage', 100000, NULL, 2, 400.00, 3.0),

-- ============================================
-- GENERATOR MAINTENANCE
-- ============================================
('rv', 'Generator Oil Change', 'Change generator oil and filter', 'both', 100, 12, 1, 65.00, 0.75),
('rv', 'Generator Air Filter', 'Replace generator air filter', 'both', 200, 12, 2, 25.00, 0.25),
('rv', 'Generator Spark Plug', 'Replace generator spark plug', 'both', 450, 24, 2, 35.00, 0.5),
('rv', 'Generator Fuel Filter', 'Replace generator fuel filter', 'both', 400, 24, 2, 45.00, 0.5),
('rv', 'Generator Exercise', 'Run generator under load for 2+ hours', 'time', NULL, 1, 1, 0.00, 2.0),
('rv', 'Generator Carburetor Service', 'Clean or service generator carburetor', 'time', NULL, 24, 2, 150.00, 2.0),

-- ============================================
-- BRAKES & SUSPENSION
-- ============================================
('rv', 'Brake Inspection', 'Comprehensive brake pad, rotor, and drum inspection', 'both', 12000, 12, 1, 100.00, 1.5),
('rv', 'Brake Fluid Flush', 'Flush and replace brake fluid', 'time', NULL, 24, 1, 120.00, 1.0),
('rv', 'Brake Adjustment', 'Adjust drum brakes (if equipped)', 'both', 12000, 12, 2, 75.00, 1.0),
('rv', 'Wheel Bearing Repack', 'Repack wheel bearings with grease', 'both', 12000, 12, 1, 200.00, 2.5),
('rv', 'Shock Absorber Inspection', 'Inspect shocks for leaks and wear', 'both', 20000, 12, 2, 50.00, 0.5),
('rv', 'Air Bag Suspension Check', 'Inspect air bags and leveling system', 'time', NULL, 6, 2, 75.00, 1.0),
('rv', 'Steering Components', 'Inspect tie rods, ball joints, and steering linkage', 'both', 15000, 12, 1, 100.00, 1.0),

-- ============================================
-- TIRES & WHEELS
-- ============================================
('rv', 'Tire Pressure Check', 'Check and adjust tire pressure (including spare)', 'time', NULL, 1, 1, 0.00, 0.25),
('rv', 'Tire Inspection', 'Inspect tires for wear, cracks, and weather checking', 'both', 5000, 3, 1, 25.00, 0.5),
('rv', 'Tire Rotation', 'Rotate tires per manufacturer pattern', 'mileage', 6000, NULL, 2, 60.00, 1.0),
('rv', 'Wheel Alignment', 'Check and adjust wheel alignment', 'both', 15000, 12, 2, 150.00, 1.5),
('rv', 'Lug Nut Torque Check', 'Verify lug nut torque to specification', 'both', 5000, 6, 1, 0.00, 0.25),
('rv', 'Tire Age Check', 'Check tire DOT date - replace if over 5-7 years', 'time', NULL, 12, 1, 0.00, 0.25),

-- ============================================
-- ROOF & EXTERIOR
-- ============================================
('rv', 'Roof Inspection', 'Inspect entire roof surface for damage and wear', 'time', NULL, 3, 1, 0.00, 1.0),
('rv', 'Roof Seal Inspection', 'Check all roof seals, vents, and penetrations', 'time', NULL, 3, 1, 0.00, 0.75),
('rv', 'Roof Seal Maintenance', 'Reseal roof seams and penetrations as needed', 'time', NULL, 12, 1, 100.00, 3.0),
('rv', 'Roof Cleaning', 'Clean roof surface with appropriate cleaner', 'time', NULL, 3, 2, 25.00, 2.0),
('rv', 'Roof Coating', 'Apply protective roof coating', 'time', NULL, 36, 2, 300.00, 6.0),
('rv', 'Exterior Wash', 'Wash exterior including roof', 'time', NULL, 1, 3, 30.00, 2.0),
('rv', 'Exterior Wax/Sealant', 'Apply wax or sealant to exterior surfaces', 'time', NULL, 6, 2, 75.00, 4.0),
('rv', 'Window Seal Check', 'Inspect window seals for leaks and deterioration', 'time', NULL, 6, 2, 0.00, 0.5),
('rv', 'Door Seal Inspection', 'Check entry door seals and weatherstripping', 'time', NULL, 6, 2, 0.00, 0.25),

-- ============================================
-- SLIDE-OUTS
-- ============================================
('rv', 'Slide-Out Seal Inspection', 'Inspect slide-out seals for wear and damage', 'time', NULL, 3, 1, 0.00, 0.5),
('rv', 'Slide-Out Seal Conditioning', 'Clean and condition slide-out seals', 'time', NULL, 3, 2, 25.00, 0.5),
('rv', 'Slide-Out Mechanism Lubrication', 'Lubricate slide-out rails and mechanisms', 'time', NULL, 6, 1, 20.00, 0.5),
('rv', 'Slide-Out Motor/Gear Check', 'Inspect slide-out motor and gear mechanism', 'time', NULL, 12, 2, 50.00, 1.0),
('rv', 'Slide-Out Adjustment', 'Adjust slide-out for proper alignment and seal', 'time', NULL, 12, 2, 150.00, 2.0),

-- ============================================
-- AWNING
-- ============================================
('rv', 'Awning Inspection', 'Inspect awning fabric for tears and mildew', 'time', NULL, 3, 2, 0.00, 0.25),
('rv', 'Awning Cleaning', 'Clean awning fabric and hardware', 'time', NULL, 6, 2, 25.00, 1.0),
('rv', 'Awning Mechanism Lubrication', 'Lubricate awning arms and springs', 'time', NULL, 6, 2, 15.00, 0.5),
('rv', 'Awning Hardware Check', 'Check awning mounting hardware and brackets', 'time', NULL, 12, 2, 0.00, 0.25),

-- ============================================
-- ELECTRICAL SYSTEM
-- ============================================
('rv', 'House Battery Check', 'Check battery water levels and terminals', 'time', NULL, 1, 1, 0.00, 0.25),
('rv', 'House Battery Load Test', 'Perform load test on house batteries', 'time', NULL, 6, 1, 25.00, 0.5),
('rv', 'House Battery Equalization', 'Equalize flooded lead-acid batteries', 'time', NULL, 3, 2, 0.00, 4.0),
('rv', 'Chassis Battery Check', 'Check chassis battery condition and terminals', 'time', NULL, 3, 1, 0.00, 0.25),
('rv', 'Battery Terminal Cleaning', 'Clean and protect battery terminals', 'time', NULL, 6, 2, 10.00, 0.5),
('rv', 'Converter/Charger Check', 'Test converter/charger output and function', 'time', NULL, 12, 2, 50.00, 0.5),
('rv', 'Inverter Check', 'Test inverter function and output', 'time', NULL, 12, 2, 50.00, 0.5),
('rv', 'Solar Panel Inspection', 'Inspect solar panels and connections', 'time', NULL, 6, 2, 0.00, 0.5),
('rv', 'Shore Power Cord Inspection', 'Inspect shore power cord and connections', 'time', NULL, 6, 1, 0.00, 0.25),
('rv', 'GFCI Outlet Test', 'Test all GFCI outlets for proper function', 'time', NULL, 3, 1, 0.00, 0.25),
('rv', '12V System Check', 'Check all 12V lights and accessories', 'time', NULL, 6, 2, 0.00, 0.5),

-- ============================================
-- PROPANE SYSTEM
-- ============================================
('rv', 'Propane Leak Test', 'Test propane system for leaks', 'time', NULL, 6, 1, 0.00, 0.5),
('rv', 'Propane Regulator Check', 'Inspect propane regulator and replace if needed', 'time', NULL, 12, 1, 75.00, 0.5),
('rv', 'Propane Tank Inspection', 'Inspect propane tanks and mounting', 'time', NULL, 12, 2, 0.00, 0.25),
('rv', 'Propane Tank Recertification', 'Recertify propane tanks (required every 10-12 years)', 'time', NULL, 120, 1, 50.00, 0.5),
('rv', 'Propane Appliance Check', 'Test all propane appliances for proper operation', 'time', NULL, 6, 1, 50.00, 1.0),

-- ============================================
-- WATER SYSTEM
-- ============================================
('rv', 'Fresh Water Tank Sanitize', 'Sanitize fresh water tank and lines', 'time', NULL, 6, 1, 25.00, 2.0),
('rv', 'Water Filter Replacement', 'Replace inline water filter', 'time', NULL, 6, 2, 30.00, 0.25),
('rv', 'Water Pump Check', 'Test water pump operation and pressure', 'time', NULL, 6, 2, 0.00, 0.25),
('rv', 'Water Heater Anode Rod', 'Inspect and replace water heater anode rod', 'time', NULL, 12, 1, 35.00, 0.5),
('rv', 'Water Heater Flush', 'Flush water heater tank', 'time', NULL, 6, 2, 0.00, 0.5),
('rv', 'Water Heater Burner Clean', 'Clean water heater burner assembly', 'time', NULL, 12, 2, 50.00, 1.0),
('rv', 'Toilet Seal Check', 'Inspect toilet seal and replace if needed', 'time', NULL, 12, 2, 25.00, 0.5),
('rv', 'Black Tank Treatment', 'Add tank treatment after each dump', 'time', NULL, 1, 2, 10.00, 0.1),
('rv', 'Gray Tank Treatment', 'Treat gray tank to prevent odors', 'time', NULL, 1, 3, 10.00, 0.1),
('rv', 'Tank Valve Lubrication', 'Lubricate dump valve handles and seals', 'time', NULL, 6, 2, 10.00, 0.25),
('rv', 'Low Point Drain Check', 'Check low point drains for proper function', 'time', NULL, 6, 3, 0.00, 0.25),

-- ============================================
-- HVAC SYSTEM
-- ============================================
('rv', 'AC Filter Clean/Replace', 'Clean or replace air conditioner filter', 'time', NULL, 1, 2, 15.00, 0.25),
('rv', 'AC Coil Cleaning', 'Clean air conditioner coils', 'time', NULL, 12, 2, 75.00, 1.5),
('rv', 'AC Shroud Inspection', 'Inspect AC shroud for cracks and damage', 'time', NULL, 6, 2, 0.00, 0.25),
('rv', 'Furnace Inspection', 'Inspect furnace operation and venting', 'time', NULL, 12, 1, 100.00, 1.0),
('rv', 'Furnace Filter/Screen Clean', 'Clean furnace intake screen and filter', 'time', NULL, 6, 2, 0.00, 0.25),
('rv', 'Thermostat Check', 'Test thermostat operation', 'time', NULL, 12, 2, 0.00, 0.25),
('rv', 'Vent Fan Lubrication', 'Lubricate roof vent fan motors', 'time', NULL, 12, 3, 10.00, 0.5),

-- ============================================
-- REFRIGERATOR
-- ============================================
('rv', 'Refrigerator Burner Clean', 'Clean refrigerator burner and flue', 'time', NULL, 12, 1, 75.00, 1.0),
('rv', 'Refrigerator Level Check', 'Verify refrigerator is level when parked', 'time', NULL, 1, 2, 0.00, 0.1),
('rv', 'Refrigerator Vent Check', 'Inspect exterior vents for blockage', 'time', NULL, 6, 2, 0.00, 0.25),
('rv', 'Refrigerator Door Seal', 'Check door seal condition and alignment', 'time', NULL, 6, 2, 0.00, 0.25),
('rv', 'Refrigerator Defrost', 'Defrost freezer compartment', 'time', NULL, 3, 3, 0.00, 1.0),

-- ============================================
-- LEVELING SYSTEM
-- ============================================
('rv', 'Leveling Jack Inspection', 'Inspect leveling jacks for leaks and damage', 'time', NULL, 6, 2, 0.00, 0.5),
('rv', 'Leveling Jack Lubrication', 'Lubricate leveling jack mechanisms', 'time', NULL, 6, 2, 20.00, 0.5),
('rv', 'Hydraulic Fluid Check', 'Check hydraulic leveling system fluid level', 'time', NULL, 3, 1, 0.00, 0.25),
('rv', 'Hydraulic Fluid Change', 'Replace hydraulic leveling system fluid', 'time', NULL, 24, 2, 100.00, 1.5),
('rv', 'Leveling System Calibration', 'Calibrate automatic leveling system', 'time', NULL, 12, 2, 75.00, 1.0),

-- ============================================
-- SAFETY EQUIPMENT
-- ============================================
('rv', 'Smoke Detector Test', 'Test smoke detector operation', 'time', NULL, 1, 1, 0.00, 0.1),
('rv', 'Smoke Detector Battery', 'Replace smoke detector battery', 'time', NULL, 6, 1, 10.00, 0.1),
('rv', 'CO Detector Test', 'Test carbon monoxide detector operation', 'time', NULL, 1, 1, 0.00, 0.1),
('rv', 'CO Detector Replacement', 'Replace CO detector (5-7 year lifespan)', 'time', NULL, 60, 1, 50.00, 0.25),
('rv', 'LP Gas Detector Test', 'Test propane gas detector operation', 'time', NULL, 1, 1, 0.00, 0.1),
('rv', 'Fire Extinguisher Check', 'Check fire extinguisher charge and condition', 'time', NULL, 6, 1, 0.00, 0.1),
('rv', 'Fire Extinguisher Service', 'Professional fire extinguisher service', 'time', NULL, 72, 1, 30.00, 0.25),
('rv', 'Emergency Exit Check', 'Test emergency exit windows and latches', 'time', NULL, 6, 1, 0.00, 0.25),

-- ============================================
-- TOWING EQUIPMENT (Travel Trailers/Fifth Wheels)
-- ============================================
('rv', 'Hitch Inspection', 'Inspect hitch, coupler, and safety chains', 'time', NULL, 6, 1, 0.00, 0.5),
('rv', 'Hitch Lubrication', 'Lubricate hitch ball and coupler', 'time', NULL, 3, 2, 10.00, 0.25),
('rv', 'Fifth Wheel Pin Box', 'Inspect and lubricate fifth wheel pin box', 'time', NULL, 6, 1, 25.00, 0.5),
('rv', 'Breakaway Switch Test', 'Test trailer breakaway switch and battery', 'time', NULL, 6, 1, 0.00, 0.25),
('rv', 'Trailer Brake Controller', 'Test and adjust trailer brake controller', 'time', NULL, 6, 1, 0.00, 0.25),
('rv', 'Trailer Light Check', 'Check all trailer lights and connections', 'time', NULL, 3, 1, 0.00, 0.25),
('rv', 'Trailer Wiring Inspection', 'Inspect trailer wiring harness and connectors', 'time', NULL, 12, 2, 0.00, 0.5),

-- ============================================
-- WINTERIZATION / SEASONAL
-- ============================================
('rv', 'Winterization', 'Complete winterization of water system', 'time', NULL, 12, 1, 100.00, 2.0),
('rv', 'De-Winterization', 'De-winterize and prepare for season', 'time', NULL, 12, 1, 75.00, 1.5),
('rv', 'Fuel Stabilizer', 'Add fuel stabilizer before storage', 'time', NULL, 12, 2, 15.00, 0.25),
('rv', 'Battery Disconnect/Storage', 'Disconnect and store batteries properly', 'time', NULL, 12, 2, 0.00, 0.5),
('rv', 'Tire Cover Installation', 'Install tire covers for UV protection during storage', 'time', NULL, 12, 3, 0.00, 0.25),
('rv', 'Vent Cover Installation', 'Install vent covers for storage', 'time', NULL, 12, 3, 0.00, 0.25),

-- ============================================
-- INTERIOR
-- ============================================
('rv', 'Interior Deep Clean', 'Deep clean interior surfaces and fabrics', 'time', NULL, 6, 3, 50.00, 4.0),
('rv', 'Cabinet Hardware Check', 'Check cabinet latches and hinges', 'time', NULL, 12, 3, 0.00, 0.5),
('rv', 'Flooring Inspection', 'Inspect flooring for soft spots and damage', 'time', NULL, 12, 2, 0.00, 0.5),
('rv', 'Blinds/Shades Check', 'Check window blinds and shades operation', 'time', NULL, 12, 3, 0.00, 0.25);

-- ============================================
-- Add RV-specific categories for better organization
-- ============================================
-- Note: You may want to add a 'category' column to maintenance_schedules table
-- ALTER TABLE maintenance_schedules ADD COLUMN category VARCHAR(50);
-- Then update the records with appropriate categories

-- Display count of RV maintenance items
-- SELECT COUNT(*) as rv_maintenance_items FROM maintenance_schedules WHERE vehicle_type = 'rv';
