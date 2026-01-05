# Podman Containerization Setup

This guide explains how to run the AnkiQuiz application stack using Podman containers.

## Architecture

The stack consists of three services:

- **PostgreSQL 17**: Database server
- **Backend (.NET 10)**: Retention.App API service
- **Frontend (Deno Fresh)**: Assessment web application

## Prerequisites

1. Install Podman on your system:
   ```bash
   # Windows (via Chocolatey)
   choco install podman
   
   # macOS (via Homebrew)
   brew install podman
   
   # Linux (varies by distro)
   sudo apt install podman  # Ubuntu/Debian
   sudo dnf install podman  # Fedora
   ```

2. Install podman-compose (if not included with your Podman installation):
   ```bash
   pip install podman-compose
   ```

## Quick Start

1. **Clone and navigate to the repository:**
   ```bash
   cd d:\repos\ankiquiz
   ```

2. **Copy the environment file:**
   ```bash
   cp .env.container .env
   ```

3. **Start all services:**
   ```bash
   podman-compose up -d
   ```

4. **Access the applications:**
   - Frontend: http://localhost:8000
   - Backend API: http://localhost:8080
   - Backend Health: http://localhost:8080/health
   - API Documentation: http://localhost:8080/swagger

## Configuration

### Environment Variables

Key environment variables in `.env.container`:

```bash
# PostgreSQL
POSTGRES_PASSWORD=*Tx325z59aq
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DATABASE=ankiquizdb
POSTGRES_USER=postgres

# Backend
ASPNETCORE_ENVIRONMENT=Production
ASPNETCORE_URLS=http://+:8080

# Frontend
VITE_API_URL=http://localhost:8080
VITE_UPLOADS_URL=http://localhost:8080
```

### Volume Mounts

- **postgres_data**: Persistent PostgreSQL data storage
- **backend_uploads**: Persistent storage for uploaded media files (flashcard audio/images)

## Development Workflow

### Building Images

```bash
# Build backend only
podman build -t ankiquiz-backend ./Retention/src/Retention.App

# Build frontend only
podman build -t ankiquiz-frontend ./Assessment

# Build all services via compose
podman-compose build
```

### Running Services

```bash
# Start all services in background
podman-compose up -d

# Start with logs
podman-compose up

# Stop all services
podman-compose down

# Stop and remove volumes
podman-compose down -v
```

### Monitoring

```bash
# View logs for all services
podman-compose logs -f

# View logs for specific service
podman-compose logs -f backend
podman-compose logs -f frontend
podman-compose logs -f postgres

# Check service status
podman-compose ps

# Check resource usage
podman stats
```

## Service Details

### Backend (Retention.App)

- **Port**: 8080
- **Health Check**: `/health`
- **API Base**: `/api/v1/`
- **Features**:
  - Database migrations on startup
  - CORS configured for frontend
  - Static file serving for uploads
  - Swagger documentation

### Frontend (Assessment)

- **Port**: 8000
- **Framework**: Deno Fresh with Vite
- **Build Target**: Production optimized
- **Features**:
  - Environment-based API proxy configuration
  - Static asset optimization
  - Hot reload in development mode

### PostgreSQL

- **Port**: 5432
- **Version**: 17 Alpine
- **Persistence**: Automatic volume mounting
- **Health Checks**: Database connectivity verification

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using ports
   netstat -an | grep :8080
   netstat -an | grep :8000
   
   # Stop conflicting services or change ports in podman-compose.yml
   ```

2. **Database Connection Issues**
   ```bash
   # Check PostgreSQL logs
   podman-compose logs postgres
   
   # Verify database is accessible
   podman exec -it ankiquiz-postgres psql -U postgres -d ankiquizdb
   ```

3. **Build Failures**
   ```bash
   # Clean build without cache
   podman-compose build --no-cache
   
   # Check build logs
   podman-compose logs backend
   podman-compose logs frontend
   ```

4. **Permission Issues**
   ```bash
   # On Linux, ensure proper permissions for volume mounts
   sudo chown -R 1001:1001 ./uploads  # For backend uploads
   ```

### Debugging Commands

```bash
# Execute commands in running containers
podman exec -it ankiquiz-backend /bin/bash
podman exec -it ankiquiz-frontend /bin/sh
podman exec -it ankiquiz-postgres /bin/sh

# Inspect container configurations
podman inspect ankiquiz-backend
podman inspect ankiquiz-frontend
podman inspect ankiquiz-postgres

# Check network connectivity
podman exec ankiquiz-backend curl -f http://localhost:8080/health
podman exec ankiquiz-frontend curl -f http://backend:8080/health
```

## Production Considerations

### Security

1. **Change default passwords** in production
2. **Use secrets management** instead of environment files
3. **Enable HTTPS** with proper certificates
4. **Network isolation** for database access

### Performance

1. **Resource limits** can be added to podman-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1.0'
         memory: 512M
   ```

2. **Database optimization**:
   - Configure PostgreSQL settings for production
   - Set up connection pooling
   - Enable query logging if needed

### Backup and Recovery

```bash
# Backup PostgreSQL data
podman exec ankiquiz-postgres pg_dump -U postgres ankiquizdb > backup.sql

# Restore PostgreSQL data
podman exec -i ankiquiz-postgres psql -U postgres ankiquizdb < backup.sql

# Backup uploads volume
podman volume export backend_uploads > uploads-backup.tar
```

## Migration from Local Development

1. **Export existing data**:
   ```bash
   # Dump local PostgreSQL
   pg_dump -h localhost -U postgres ankiquizdb > local-data.sql
   
   # Copy local uploads
   cp -r ./Retention/src/Retention.App/wwwroot/uploads ./local-uploads
   ```

2. **Import into containers**:
   ```bash
   # Import data to container PostgreSQL
   podman exec -i ankiquiz-postgres psql -U postgres ankiquizdb < local-data.sql
   
   # Copy uploads to container volume
   podman cp ./local-uploads/* ankiquiz-backend:/app/wwwroot/uploads/
   ```

## Advanced Configuration

### Custom Networks

```yaml
# In podman-compose.yml
networks:
  ankiquiz-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### Environment-Specific Configs

```bash
# Development
podman-compose -f podman-compose.yml -f podman-compose.dev.yml up

# Production
podman-compose -f podman-compose.yml -f podman-compose.prod.yml up
```

### Scaling Services

```bash
# Scale backend (requires load balancer for production)
podman-compose up -d --scale backend=2
```

## Support

For issues with:
- **Podman**: Check [Podman Documentation](https://docs.podman.io/)
- **Application**: Review application logs and check this guide
- **Database**: Refer to PostgreSQL documentation and container logs
