# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LifeOS is a full-stack, multi-tenant personal life management application for RV living, farming, and family management. The architecture follows **Hexagonal Architecture (Ports & Adapters)** with Domain-Driven Design principles.

**Tech Stack:**
- Backend: .NET 10 (F# domain + C# infrastructure/API)
- Frontend: Deno Fresh 2.2+ (Preact Islands Architecture)
- Database: ArangoDB 3.x (multi-model: document + graph)
- Storage: MinIO (S3-compatible object storage)
- Gateway: Caddy 2 (reverse proxy & routing)

## Architecture

### Backend Structure (.NET Solution)

```
LifeOS/src/
├── LifeOS.Domain/              # C# - Domain models (migrating from F#)
│   ├── Finance/                # Account, Transaction, Budget
│   ├── Garage/                 # Vehicle, Component, Maintenance
│   ├── Garden/                 # Species, CropBatch, GardenBed
│   ├── Academy/                # Skill, Task, Flashcard
│   ├── Dojo/                   # Habit, Identity
│   ├── Boardroom/              # KPI, KRA, Vision
│   ├── Home/                   # Household, Chore, Calendar
│   ├── Inventory/              # Item, Asset, Location, Stock
│   └── SharedKernel/           # Common domain types
├── LifeOS.RulesEngine.FSharp/  # F# - Business rules engine (target for F# code)
├── LifeOS.Application/         # C# - Use cases & orchestration
├── LifeOS.Infrastructure/      # C# - ArangoDB & MinIO adapters
└── LifeOS.API/                 # C# - ASP.NET Core REST API
```

**⚠️ Architecture Migration in Progress:**
- F# code is being migrated OUT of `LifeOS.Domain/`
- All F# business logic should go in `LifeOS.RulesEngine.FSharp/`
- `LifeOS.Domain/` is transitioning to pure C# domain models

### Multi-Frontend Architecture

Four separate Deno Fresh frontends share a single backend API:

- **Main Frontend** (`frontend/`) - Primary UI entry point
- **Garage Frontend** (`frontends/garage/`) - Vehicle maintenance tracking
- **Budget Frontend** (`frontends/budget/`) - Zero-based budgeting
- **Flashcards Frontend** (`frontends/flashcards/`) - Spaced repetition learning

**Routing:** Caddy gateway routes traffic:
- `/garage/*` → garage-frontend
- `/flashcards/*` → flashcards-frontend
- `/budget/*` → budget-frontend
- `/budget/api/*` → API (rewritten to `/api/*`)
- `/assets/*` → Smart routing based on Referer header
- `/` → main frontend

### F# Rules Engine & C# Interop

**Critical Pattern:** F# types (Option, Result, Discriminated Unions) are NEVER exposed to C#.

The F# Rules Engine uses an interop boundary pattern:
- `Option<T>` → `T` or `null`
- `Result<T, Error>` → `XxxResult<T>` wrapper (e.g., `GarageResult<T>`)
- Discriminated Unions → Plain C# classes/enums

This keeps F# rules pure while providing a clean C# boundary.

**⚠️ Migration Note:** Legacy `Interop.fs` files in `LifeOS.Domain/` are being phased out as domain models migrate to C#.

### F# Rules Engine

`LifeOS.RulesEngine.FSharp/` follows the same interop pattern:
- `Contracts/` - C#-friendly interfaces & DTOs
- `Internal/` - Pure F# domain logic (NEVER exposed)
- `Adapters/` - C# boundary implementations

## Development Commands

### Full Stack Development

```bash
# Start all services (recommended)
podman-compose up -d

# View logs
podman-compose logs -f

# Stop services
podman-compose down

# Rebuild specific service
podman-compose build api
podman-compose build garage-frontend
```

### Backend (.NET)

```bash
# From LifeOS/ directory
dotnet restore
dotnet build
dotnet test

# Run API (http://localhost:5120)
cd src/LifeOS.API
dotnet run

# Build for production
dotnet publish -c Release
```

### Frontend (Deno Fresh)

```bash
# Main frontend (http://localhost:8000)
cd frontend
deno task dev

# Garage frontend
cd frontends/garage
deno task dev

# Budget frontend
cd frontends/budget
deno task dev

# Flashcards frontend
cd frontends/flashcards
deno task dev

# Type checking
deno check **/*.tsx

# Lint & format
deno task check

# Production build
deno task build
```

### Database Setup

**Windows:**
```powershell
.\scripts\setup-arangodb.ps1
```

**Linux/macOS:**
```bash
chmod +x scripts/setup-arangodb.sh
./scripts/setup-arangodb.sh
```

**Manual initialization:**
```bash
# After ArangoDB is running
node scripts/init-arangodb.js
node scripts/seed-budget.js
node scripts/seed-people.js
```

### Testing

```bash
# .NET tests
cd LifeOS
dotnet test

# Frontend type checking
cd frontends/garage
deno check **/*.tsx
```

## Service Ports

| Service          | URL                          | Purpose                 |
|------------------|------------------------------|-------------------------|
| Caddy Gateway    | http://localhost:8000        | Single entry point      |
| API              | http://localhost:5120        | Backend REST API        |
| ArangoDB Web UI  | http://localhost:8529        | Database admin          |
| MinIO Console    | http://localhost:9001        | Object storage admin    |
| Budget Frontend  | http://localhost:8040        | Direct access (dev)     |
| Flashcards       | http://localhost:8030        | Direct access (dev)     |

## Key Architectural Patterns

### Hexagonal Architecture Layers

1. **API Layer** (`LifeOS.API/Endpoints/`) - Primary adapters, converts DTOs ↔ domain models
2. **Application Layer** (`LifeOS.Application/`) - Use cases, orchestration, MediatR domain events
3. **Domain Layer** (`LifeOS.Domain/`) - C# domain models with no external dependencies
4. **Rules Engine** (`LifeOS.RulesEngine.FSharp/`) - F# business rules and validation logic
5. **Infrastructure Layer** (`LifeOS.Infrastructure/`) - Secondary adapters (ArangoDB, MinIO)

### Domain-Driven Design

Eight bounded contexts represent distinct areas of life management:
- **Garage** (Active) - Vehicle maintenance
- **Finance** (Active) - Accounting & budgeting
- **Academy** (Active) - Learning & flashcards
- **Inventory** (Active) - Unified inventory system
- **Garden** (Planned) - Crop tracking
- **Dojo** (Planned) - Habit building
- **Boardroom** (Planned) - Strategic planning
- **Home** (In Progress) - Household management

### ArangoDB Graph Model

Uses ArangoDB as a multi-model database:
- **Document collections:** vehicles, components, users, transactions, accounts, etc.
- **Edge collections:** installed_on, serviced, people_relationships, etc.
- **Named graphs:** garage_graph, people_graph, dojo_graph, budget_graph

Graph traversals enable complex relationship queries across domains.

### Fresh Islands Architecture

Each frontend follows file-based routing:
- `routes/` - Server-side routes (SSR)
- `routes/api/` - Backend API proxy routes
- `islands/` - Client-side interactive components (hydrated)
- `components/` - Shared UI components
- `lib/` - API clients & utilities
- `static/` - Static assets

## Development Workflow

### Adding a New Feature

1. **Domain Models:** Define C# domain entities in `LifeOS.Domain/{Context}/`
2. **Business Rules:** Implement F# validation/rules in `LifeOS.RulesEngine.FSharp/`
3. **Interop Layer:** Add C# boundary in `LifeOS.RulesEngine.FSharp/Contracts/` if needed
4. **Repository:** Implement data access in `LifeOS.Infrastructure/{Context}/`
5. **API Endpoint:** Create endpoint in `LifeOS.API/Endpoints/{Context}Endpoints.cs`
6. **Frontend:** Add routes/islands in appropriate frontend

### Working with Domain Models

- Domain models are now C# classes in `LifeOS.Domain/`
- Keep domain models free of external dependencies
- Use MediatR for domain events

### Working with F# Rules Engine

- Business rules and validation logic goes in `LifeOS.RulesEngine.FSharp/`
- Rules use immutable types and pure functions
- Validation returns `Result<T, Error>` internally
- Never expose F# Option/Result/DU types to C# - use Contracts boundary

### Working with ArangoDB

- Collections and graphs defined in `scripts/init-arangodb.js`
- Repository pattern abstracts database access
- Use AQL for complex queries and graph traversals
- Document keys use format: `{collection}/{id}`

### Working with Fresh Frontends

- Routes map directly to file paths
- Use islands for interactive components only
- API calls go through Fresh API routes (proxy to backend)
- Shared UI components in `components/` directory
- Tailwind CSS 4.1+ with DaisyUI for styling

## Environment Variables

Required for development:

```bash
ARANGO_ROOT_PASSWORD=lifeos123
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
ASPNETCORE_ENVIRONMENT=Development
```

## Useful Scripts

- `scripts/fast-build.ps1` / `.sh` - Quick build for development
- `scripts/setup-arangodb.ps1` / `.sh` - Database container setup
- `scripts/init-arangodb.js` - Initialize database schema
- `scripts/seed-budget.js` - Seed sample budget data
- `scripts/seed-people.js` - Seed user data

## Important Notes

- **Architecture Migration:** F# code is being moved from `LifeOS.Domain/` to `LifeOS.RulesEngine.FSharp/`
  - Domain models → C# in `LifeOS.Domain/`
  - Business rules → F# in `LifeOS.RulesEngine.FSharp/`
  - Legacy `Interop.fs` files in domain contexts are being phased out
- **Never expose F# types to C#** - always use Contracts/Adapters boundary in Rules Engine
- **API runs on port 5120** (not 5000 as in older docs)
- **Caddy is the single entry point** in production (port 8000)
- **Budget dashboard** currently under active development (check current branch)
