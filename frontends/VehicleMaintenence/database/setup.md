# Database Setup Guide

This guide will help you set up PostgreSQL for the Vehicle Maintenance
application.

## Prerequisites

- PostgreSQL 17+ installed and running
- Database user with appropriate permissions

## Quick Setup (Windows)

### 1. Install PostgreSQL

Download and install PostgreSQL from:
https://www.postgresql.org/download/windows/

During installation, note the following:

- Port (default: 5432)
- Superuser password (default: postgres)
- Installation path

### 2. Create Database and User

Open `psql` or pgAdmin and run:

```sql
-- Create the database
CREATE DATABASE vehicle_maintenance;

-- Create user (optional - you can use existing postgres user)
CREATE USER vm_user WITH PASSWORD 'your_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE vehicle_maintenance TO vm_user;
```

### 3. Set Environment Variables

Create a `.env` file in the project root:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres          # or vm_user if you created one
DB_PASSWORD=your_password # replace with your actual password
DB_NAME=vehicle_maintenance
```

### 4. Run Schema Setup

Execute the schema file to create all tables:

```bash
# Using psql command line
psql -h localhost -U postgres -d vehicle_maintenance -f database/schema.sql

# Or using environment variables
PGPASSWORD=your_password psql -h localhost -U postgres -d vehicle_maintenance -f database/schema.sql
```

### 5. Verify Setup

Connect to the database and verify tables were created:

```sql
\c vehicle_maintenance
\dt
```

You should see these tables:

- vehicles
- maintenance_schedules
- vehicle_maintenance_schedules
- maintenance_records
- maintenance_due

## Alternative: Docker Setup

If you prefer using Docker:

```bash
# Start PostgreSQL container
docker run --name vm-postgres \
  -e POSTGRES_PASSWORD=your_password \
  -e POSTGRES_DB=vehicle_maintenance \
  -p 5432:5432 \
  -d postgres:17

# Run schema setup
docker exec -i vm-postgres psql -U postgres -d vehicle_maintenance < database/schema.sql
```

## Troubleshooting

### Connection Issues

- Verify PostgreSQL is running: `pg_isready`
- Check firewall settings for port 5432
- Ensure correct username/password

### Permission Issues

- Make sure the database user has CREATE, INSERT, SELECT, UPDATE, DELETE
  permissions
- For development, using the postgres superuser is acceptable

### Schema Issues

- Ensure you're running the schema on the correct database
- Check for any error messages during schema execution

## Development Notes

The application includes sample maintenance schedule data that will be
automatically loaded when you run the schema. This includes common maintenance
items for both cars and RVs.

The database connection is configured in `services/database.ts` using
environment variables. Make sure these are properly set before starting the
application.
