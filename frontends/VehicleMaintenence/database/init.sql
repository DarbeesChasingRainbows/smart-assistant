-- Database initialization script
-- Run this to create the database and user

-- Create the database
CREATE DATABASE vehicle_maintenance;

-- Create application user
CREATE USER vm_user WITH PASSWORD 'vm_password_2024';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE vehicle_maintenance TO vm_user;

-- Connect to the new database
\c vehicle_maintenance;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO vm_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vm_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vm_user;

-- Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO vm_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO vm_user;
