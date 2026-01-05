# LifeOS - Smart Assistant

A personal life operating system for RV living, farming, and family management.

## Architecture

This project follows **Hexagonal Architecture** with:

- **F# Domain Core** - Pure domain logic with no external dependencies
- **C# Infrastructure** - ArangoDB adapters implementing domain ports
- **C# API** - ASP.NET Core Minimal APIs
- **Deno Fresh Frontend** - Preact-based Islands Architecture

## Quick Start

### Prerequisites

- [Podman](https://podman.io/) or Docker
- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Deno](https://deno.land/)

### Option 1: Using Podman Compose (Recommended)

```bash
# Start all services
podman-compose up -d

# View logs
podman-compose logs -f

# Stop services
podman-compose down
```

### Option 2: Manual Setup

#### 1. Start ArangoDB

**Windows (PowerShell):**

```powershell
.\scripts\setup-arangodb.ps1
```

**Linux/macOS:**

```bash
chmod +x scripts/setup-arangodb.sh
./scripts/setup-arangodb.sh
```

#### 2. Start the API

```bash
cd LifeOS/src/LifeOS.API
dotnet run
```

#### 3. Start the Frontend

```bash
cd frontend
deno task dev
```

## Services

| Service  | URL                   | Description     |
| -------- | --------------------- | --------------- |
| Frontend | http://localhost:8000 | Deno Fresh UI   |
| API      | http://localhost:5000 | .NET REST API   |
| ArangoDB | http://localhost:8529 | Database Web UI |

## Project Structure

```
smart-assistant/
├── LifeOS/                     # .NET Backend
│   ├── src/
│   │   ├── LifeOS.Domain/      # F# Domain Core (Hexagon)
│   │   ├── LifeOS.Infrastructure/  # C# ArangoDB Adapters
│   │   └── LifeOS.API/         # C# REST API
│   └── Dockerfile
├── frontend/                   # Deno Fresh Frontend
│   ├── routes/                 # File-based routing
│   ├── islands/                # Interactive components
│   ├── lib/                    # API client
│   └── Dockerfile
├── scripts/                    # Setup scripts
│   ├── setup-arangodb.ps1      # Windows setup
│   ├── setup-arangodb.sh       # Linux/macOS setup
│   └── init-arangodb.js        # Database initialization
├── docker-compose.yml          # Podman/Docker compose
└── .env                        # Environment variables
```

## Domain Contexts

| Context      | Status     | Description                    |
| ------------ | ---------- | ------------------------------ |
| 🚗 Garage    | ✅ Active  | Vehicle & component management |
| 🌱 Garden    | 🚧 Planned | Crop & garden bed tracking     |
| 🥋 Dojo      | 🚧 Planned | Habit building & identity      |
| 📚 Academy   | 🚧 Planned | Learning & skill development   |
| 📊 Boardroom | 🚧 Planned | Strategic planning & KPIs      |

## API Endpoints

### Garage Domain

| Method | Endpoint                                 | Description          |
| ------ | ---------------------------------------- | -------------------- |
| GET    | `/api/v1/vehicles`                       | List all vehicles    |
| GET    | `/api/v1/vehicles/{id}`                  | Get vehicle by ID    |
| GET    | `/api/v1/vehicles/active`                | List active vehicles |
| POST   | `/api/v1/vehicles`                       | Create vehicle       |
| PUT    | `/api/v1/vehicles/{id}`                  | Update vehicle       |
| DELETE | `/api/v1/vehicles/{id}`                  | Delete vehicle       |
| GET    | `/api/v1/vehicles/search?term=`          | Search vehicles      |
| GET    | `/api/v1/vehicles/paged?page=&pageSize=` | Paginated list       |
| GET    | `/health`                                | Health check         |

## Environment Variables

| Variable                 | Default                 | Description            |
| ------------------------ | ----------------------- | ---------------------- |
| `ARANGO_ROOT_PASSWORD`   | `lifeos123`             | ArangoDB root password |
| `ASPNETCORE_ENVIRONMENT` | `Development`           | .NET environment       |
| `API_BASE_URL`           | `http://localhost:5000` | API URL for frontend   |

## Development

### Running Tests

```bash
# .NET tests
cd LifeOS
dotnet test

# Frontend type checking
cd frontend
deno check **/*.tsx
```

### Building for Production

```bash
# Build all containers
podman-compose build

# Run in production mode
podman-compose -f docker-compose.yml up -d
```

## License

MIT
