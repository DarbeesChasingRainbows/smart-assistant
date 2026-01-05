# Vehicle Maintenance Tracker

A comprehensive vehicle maintenance tracking application built with Deno Fresh,
PostgreSQL, and Tailwind CSS. Supports both cars and RVs with VIN lookup,
maintenance scheduling, and cost tracking.

## Features

- 🚗 **Vehicle Management**: Add and manage cars and RVs with detailed
  information
- 🔍 **VIN Lookup**: Automatic vehicle data lookup using NHTSA API (US vehicles)
- 📅 **Maintenance Scheduling**: Automatic schedule initialization based on
  vehicle type
- 💰 **Cost Tracking**: Track maintenance costs and time spent
- 📊 **Due Reminders**: Automatic calculation of upcoming maintenance
- 🏕️ **RV Support**: Specialized maintenance schedules for RVs (generator,
  propane, etc.)
- 📱 **Responsive Design**: Mobile-friendly interface with Tailwind CSS

## Tech Stack

- **Backend**: Deno Fresh with TypeScript
- **Database**: PostgreSQL 17 with optimized schema
- **Frontend**: Preact with Tailwind CSS
- **APIs**: NHTSA VIN Decoder API
- **Architecture**: Clean architecture with service layer

## Setup

### Prerequisites

- Deno 1.40+
- PostgreSQL 17
- Node.js (for tailwindcss during development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd VehicleMaintenence
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Set up the database**
   ```bash
   # Create database
   createdb vehicle_maintenance

   # Run schema
   psql vehicle_maintenance < database/schema.sql
   ```

4. **Install dependencies and start development**
   ```bash
   deno task dev
   ```

The application will be available at `http://localhost:8000`

## Database Schema

The application uses a comprehensive PostgreSQL schema with:

- **Vehicles**: Polymorphic table supporting cars and RVs
- **Maintenance Schedules**: Template-based system with mileage/time intervals
- **Maintenance Records**: Complete service history with cost tracking
- **Due Calculations**: Automated next due calculations with triggers

## API Endpoints

### VIN Lookup

- `POST /api/vin-lookup` - Decode VIN and retrieve vehicle information

### Vehicle Management

- `GET /vehicles` - List all vehicles
- `GET /vehicles/add` - Add new vehicle form
- `POST /vehicles/add` - Create new vehicle
- `GET /vehicles/[id]` - Vehicle details and maintenance overview
- `GET /vehicles/[id]/maintenance` - Add maintenance record

## Configuration

### Environment Variables

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=vehicle_maintenance

# Application
DENO_ENV=development
PORT=8000
```

### Database Connection Pooling

The application uses PostgreSQL connection pooling with:

- Maximum 10 connections (adjust based on hosting limits)
- Retry logic with exponential backoff
- Graceful shutdown handling

## Security Features

- **Input Validation**: Comprehensive validation and sanitization
- **XSS Protection**: HTML sanitization for user inputs
- **SQL Injection Prevention**: Parameterized queries throughout
- **Error Handling**: Proper error responses without information leakage

## Performance Optimizations

- **VIN Caching**: 30-day cache for VIN lookups
- **Database Indexes**: Optimized queries for maintenance due calculations
- **Connection Pooling**: Efficient database connection management
- **Lazy Loading**: On-demand data loading for better performance

## Vehicle Types Supported

### Cars

- Oil changes, tire rotations, brake inspections
- Transmission fluid, coolant flushes, spark plugs
- Timing belts, air filters, and more

### RVs

- Generator service and maintenance
- Roof inspections and seal checks
- Propane system inspections
- Water system sanitization
- Battery monitoring (house and chassis)

## Development

### Project Structure

```
├── database/
│   └── schema.sql          # PostgreSQL schema
├── services/
│   ├── database.ts         # Database service layer
│   ├── vin.ts             # VIN lookup service
│   └── cache.ts           # In-memory caching
├── utils/
│   ├── validation.ts      # Input validation utilities
│   └── utils.ts           # Shared utilities
├── routes/
│   ├── api/               # API endpoints
│   └── vehicles/          # Vehicle management pages
└── static/                # Static assets
```

### Available Scripts

```bash
deno task dev      # Start development server
deno task build    # Build for production
deno task start    # Start production server
deno task check    # Run linting and type checking
```

## Production Deployment

### Environment Setup

1. Set production environment variables
2. Configure PostgreSQL connection limits (adjust pool size as needed)
3. Ensure proper SSL configuration for database connections
4. Set up proper logging and monitoring

### Database Considerations

- Adjust connection pool size based on hosting provider limits
- Consider read replicas for scaling if needed
- Set up automated backups
- Monitor connection usage and query performance

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `deno task check` to ensure code quality
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

1. Check the existing documentation
2. Review the database schema for data structure questions
3. Ensure all environment variables are properly configured
4. Verify database connectivity and permissions
