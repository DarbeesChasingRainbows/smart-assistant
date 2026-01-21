# LifeOS - Smart Assistant

## Project Overview

LifeOS is a comprehensive, full-stack personal life management system designed for RV living, farming, and family management. It employs a **Hexagonal Architecture** (Ports & Adapters) and **Domain-Driven Design (DDD)** principles.

**Key Technologies:**
*   **Backend:** .NET 10 Solution (`LifeOS/`)
    *   **API:** C# ASP.NET Core Minimal APIs
    *   **Domain:** C# Domain Models (migrating from F#)
    *   **Rules Engine:** F# (Pure business logic & validation)
    *   **Infrastructure:** C# Adapters for ArangoDB & MinIO
*   **Frontend:** Multiple Deno Fresh 2.2+ applications (Preact Islands Architecture)
    *   `frontend/` (Main Shell)
    *   `frontends/garage/`
    *   `frontends/budget/`
    *   `frontends/flashcards/`
*   **Database:** ArangoDB 3.x (Multi-model: Graph + Document)
*   **Storage:** MinIO (S3-compatible)
*   **Gateway:** Caddy 2 (Reverse Proxy)

## Architecture

### Hexagonal Layers
1.  **API Layer** (`LifeOS.API`): Primary adapters. Converts DTOs to/from Domain objects.
2.  **Application Layer** (`LifeOS.Application`): Use case orchestration, MediatR commands/queries.
3.  **Domain Layer** (`LifeOS.Domain`): Pure C# domain entities. No external dependencies.
4.  **Rules Engine** (`LifeOS.RulesEngine.FSharp`): F# business logic.
    *   **Strict Boundary:** F# types (`Option`, `Result`, Discriminated Unions) are **NEVER** exposed to C#.
    *   **Contracts:** Use C#-friendly interfaces/DTOs for the boundary.
5.  **Infrastructure Layer** (`LifeOS.Infrastructure`): Secondary adapters (Database, Storage).

### Multi-Frontend Routing
Caddy routes traffic based on URL paths:
*   `/` → `frontend` (Main Shell)
*   `/garage/*` → `garage-frontend`
*   `/budget/*` → `budget-frontend`
*   `/flashcards/*` → `flashcards-frontend`
*   `/api/*` → `api` (Backend)

## Building and Running

### Docker Compose (Recommended)
Run the full stack:
```bash
docker compose up -d
docker compose logs -f
```

### Backend Development (.NET)
Working directory: `LifeOS/`
```bash
# Restore & Build
dotnet restore
dotnet build

# Run API (defaults to http://localhost:5120)
cd src/LifeOS.API
dotnet run

# Run Tests
dotnet test
```

### Frontend Development (Deno)
Working directory: `frontend/` or `frontends/<app>/`
```bash
# Run Development Server
deno task dev

# Type Check
deno check **/*.tsx

# Lint & Format
deno task check

# Build for Production
deno task build
```

### Database Management
*   **Setup:** `scripts/setup-arangodb.ps1` (Windows) or `scripts/setup-arangodb.sh` (Linux/macOS)
*   **Init Schema:** `node scripts/init-arangodb.js`
*   **Seed Data:** `node scripts/seed-budget.js`, `node scripts/seed-people.js`
*   **Web UI:** http://localhost:8529 (User: `root`, Password: see `.env` or defaults to `lifeos123`)

## Development Conventions

*   **Code Style:** Follow existing patterns. Use `deno fmt` for TypeScript and standard .NET formatting for C#/F#.
*   **F# Interop:** When working in `LifeOS.RulesEngine.FSharp`, ensure all public APIs in `Contracts/` use standard C# types. Wrap F# `Result` types in C# classes (e.g., `GarageResult<T>`).
*   **Domain Models:** Place pure C# domain entities in `LifeOS.Domain/<Context>/`.
*   **State Management:** Use Fresh Islands for interactive UI components. Server-side rendering (SSR) is preferred for static content.
