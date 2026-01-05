# AnkiQuiz Application Launcher

This document explains how to use the launch scripts to start the entire AnkiQuiz application stack with Podman.

## Quick Start

### Linux/macOS (Bash)
```bash
# Make the script executable
chmod +x launch.sh

# Start all services in development mode
./launch.sh

# Or start in production mode (requires secrets)
./launch.sh prod
```

### Windows (PowerShell)
```powershell
# Start all services in development mode
.\launch.ps1

# Or start in production mode (requires secrets)
.\launch.ps1 prod
```

## Commands

| Command | Description |
|---------|-------------|
| (no args) | Start all services in development mode |
| `prod` | Start in production mode (requires Podman secrets) |
| `stop` | Stop all services |
| `restart` | Restart all services |
| `clean` | Stop services and clean up containers/images |
| `status` | Show service status and access URLs |
| `logs [service]` | Show logs for all services or specific service |
| `help` | Show help message |

## Examples

```bash
# Start in development mode
./launch.sh

# Start in production mode
./launch.sh prod

# Show service status
./launch.sh status

# View backend logs
./launch.sh logs backend

# View all logs
./launch.sh logs

# Restart services
./launch.sh restart

# Stop everything
./launch.sh stop

# Clean up containers and images
./launch.sh clean
```

## Production Mode Setup

For production mode, you need to create Podman secrets:

```bash
# Create PostgreSQL password secret
echo 'your_secure_password' | podman secret create postgres_password -

# Create connection string secret
echo 'Host=postgres;Port=5432;Database=ankiquizdb;Username=postgres;Password=your_secure_password' | podman secret create postgres_connection_string -
```

## Service URLs

Once started, you can access the application at:

- **Frontend**: http://localhost:8000
- **Backend API**: http://localhost:8080
- **Health Check**: http://localhost:8080/health

## Architecture

The launch script orchestrates three services:

1. **PostgreSQL Database** (port 5432)
   - Container: `ankiquiz-postgres`
   - Database: `ankiquizdb`
   - User: `postgres`

2. **.NET Backend API** (port 8080)
   - Container: `ankiquiz-backend`
   - Health endpoint: `/health`

3. **Deno Fresh Frontend** (port 8000)
   - Container: `ankiquiz-frontend`
   - Serves the web UI

## Troubleshooting

### Services not starting
```bash
# Check service status
./launch.sh status

# View logs
./launch.sh logs

# Clean and restart
./launch.sh clean
./launch.sh
```

### Permission denied (Linux/macOS)
```bash
# Make script executable
chmod +x launch.sh
```

### PowerShell execution policy (Windows)
```powershell
# Allow script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port conflicts
The script uses ports 5432, 8080, and 8000. Make sure these are available:
```bash
# Check what's using the ports
netstat -tulpn | grep -E ':(5432|8080|8000) '
```

## Environment Variables

The script will create a `.env` file if it doesn't exist with default values:

```env
# AnkiQuiz Environment Variables
POSTGRES_PASSWORD=ankiquiz123
```

You can modify this file to use your own password.

## Development vs Production

### Development Mode
- Uses environment variables for configuration
- Default password: `ankiquiz123`
- Suitable for local development

### Production Mode
- Uses Podman secrets for sensitive data
- More secure for production deployments
- Requires manual secret creation

## Manual Podman Commands

If you prefer to use Podman directly:

```bash
# Start services
podman-compose -f podman-compose.yml up --build -d

# Stop services
podman-compose -f podman-compose.yml down

# View logs
podman-compose -f podman-compose.yml logs -f

# Production mode
podman-compose -f podman-compose.yml -f podman-compose.prod.yml up --build -d
```
