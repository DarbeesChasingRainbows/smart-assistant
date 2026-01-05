# Flashcards Frontend Deployment

This document explains how to deploy the Flashcards frontend using Podman or Docker.

## Prerequisites

1. [Podman](https://podman.io/) or [Docker](https://www.docker.com/) installed
2. LifeOS backend running on port 5120
3. Git (for tracking deployment revisions)

## Configuration

The frontend is configured to communicate with the LifeOS backend through the following environment variables:

- `VITE_API_URL`: The base URL for API requests (default: `http://host.containers.internal:5120`)
- `VITE_UPLOADS_URL`: The base URL for file uploads (default: `http://host.containers.internal:5120`)

## Development

To run the frontend in development mode:

```bash
deno task dev
```

This will start the Vite dev server on http://localhost:5173 with API proxy to http://localhost:5120.

## Deployment Options

### Option 1: Using Deno Tasks

#### Build and run with Podman:
```bash
deno task podman:build
deno task podman:run
```

#### Build and run with Docker:
```bash
deno task docker:build
deno task docker:run
```

### Option 2: Using Deployment Scripts

#### PowerShell (Windows):
```powershell
.\deploy.ps1
```

#### Bash (Linux/Mac):
```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 3: Using Docker Compose

```bash
docker-compose up -d
```

## Container Management

### View running containers:
```bash
podman ps
# or
docker ps
```

### View logs:
```bash
podman logs flashcards-app
# or
docker logs flashcards-app
```

### Stop the container:
```bash
podman stop flashcards-app
# or
docker stop flashcards-app
```

### Remove the container:
```bash
podman rm flashcards-app
# or
docker rm flashcards-app
```

## Production Considerations

1. **HTTPS**: Configure HTTPS in production by updating the environment variables to use `https://` URLs
2. **CORS**: Ensure the LifeOS backend allows requests from your frontend domain
3. **Authentication**: The frontend expects authentication to be handled by the backend
4. **Static Files**: Static files are served from the `/static` directory

## Troubleshooting

### Container cannot connect to backend

If the container cannot reach the backend, ensure:

1. The backend is running and accessible
2. The firewall allows connections between containers
3. You're using the correct host address:
   - For Podman: `host.containers.internal`
   - For Docker: `host.docker.internal`
   - For local development: `localhost`

### Build fails

Ensure all dependencies are installed:

```bash
deno install
```

### Health check fails

The health check expects the application to respond on port 8000. If it fails, check:

1. The application started successfully
2. No errors in the container logs
3. The port is correctly exposed

## API Endpoints

The frontend communicates with the following backend endpoints:

- `/api/v1/flashcards/*` - Flashcard operations
- `/api/v1/decks/*` - Deck management
- `/api/v1/users/*` - User management
- `/api/v1/files/*` - File uploads
- `/health` - Health check

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DENO_DEPLOYMENT_ID` | Git revision | Deployment identifier for caching |
| `VITE_API_URL` | `http://host.containers.internal:5120` | Backend API URL |
| `VITE_UPLOADS_URL` | `http://host.containers.internal:5120` | File upload URL |
| `DENO_NODE_MODULES_DIR` | `auto` | Node modules directory setting |
