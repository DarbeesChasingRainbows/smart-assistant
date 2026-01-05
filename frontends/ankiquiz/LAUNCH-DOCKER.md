# AnkiQuiz Application Launcher (Docker Version)

This document explains how to use the Docker-based launch scripts to start the entire AnkiQuiz application stack.

## Quick Start

### Linux/macOS (Bash)
```bash
# Make the script executable
chmod +x launch-docker.sh

# Start all services in development mode
./launch-docker.sh

# Or start in production mode (requires secrets)
./launch-docker.sh prod
```

### Windows (PowerShell)
```powershell
# Start all services in development mode
.\launch-docker.ps1

# Or start in production mode (requires secrets)
.\launch-docker.ps1 prod
```

## Prerequisites

1. **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
2. **Docker Compose** (included with Docker Desktop)
3. **Git** (for cloning the repository)

## Commands

| Command | Description |
|---------|-------------|
| (no args) | Start all services in development mode |
| `prod` | Start in production mode (requires Docker secrets) |
| `stop` | Stop all services |
| `restart` | Restart all services |
| `clean` | Stop services and clean up containers/images |
| `status` | Show service status and access URLs |
| `logs [service]` | Show logs for all services or specific service |
| `help` | Show help message |

## Examples

```bash
# Start in development mode
./launch-docker.sh

# Start in production mode
./launch-docker.sh prod

# Show service status
./launch-docker.sh status

# View backend logs
./launch-docker.sh logs backend

# View all logs
./launch-docker.sh logs

# Restart services
./launch-docker.sh restart

# Stop everything
./launch-docker.sh stop

# Clean up containers and images
./launch-docker.sh clean
```

## Production Mode Setup

For production mode, you need to create Docker secrets:

```bash
# Create PostgreSQL password secret
printf 'your_secure_password' | docker secret create postgres_password -

# Create connection string secret
printf 'Host=postgres;Port=5432;Database=ankiquizdb;Username=postgres;Password=your_secure_password' | docker secret create postgres_connection_string -
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
./launch-docker.sh status

# View logs
./launch-docker.sh logs

# Clean and restart
./launch-docker.sh clean
./launch-docker.sh
```

### Docker daemon not running
- **Windows**: Start Docker Desktop
- **Linux**: Start Docker service with `sudo systemctl start docker`
- **macOS**: Start Docker Desktop

### Permission denied (Linux/macOS)
```bash
# Make script executable
chmod +x launch-docker.sh

# Add user to docker group (Linux)
sudo usermod -aG docker $USER
# Then log out and log back in
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

### Build failures
```bash
# Clean up and rebuild
./launch-docker.sh clean
./launch-docker.sh
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
- Uses Docker secrets for sensitive data
- More secure for production deployments
- Requires manual secret creation

## Manual Docker Commands

If you prefer to use Docker directly:

```bash
# Start services
docker-compose -f docker-compose.yml up --build -d

# Stop services
docker-compose -f docker-compose.yml down

# View logs
docker-compose -f docker-compose.yml logs -f

# Production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

## Files Created

The Docker setup includes:

- `docker-compose.yml` - Main compose file for development
- `docker-compose.prod.yml` - Production override with secrets
- `launch-docker.sh` - Bash launcher script
- `launch-docker.ps1` - PowerShell launcher script
- `LAUNCH-DOCKER.md` - This documentation

## Migration from Podman

If you were previously using the Podman version:

1. The Docker version uses the same service configurations
2. Commands are identical (just replace `podman-compose` with `docker-compose`)
3. Environment variables and secrets work the same way
4. Port mappings are identical

## Performance Tips

- **First startup**: Initial build may take 5-10 minutes
- **Subsequent startups**: Much faster with cached layers
- **Resource usage**: Services use ~2GB RAM total
- **Disk space**: Images take ~1GB disk space

## Security Considerations

- Development mode uses default password - change it for production
- Production mode uses Docker secrets for secure credential management
- Network is isolated to internal containers except for exposed ports
- Containers run with minimal privileges (no root access where possible)
