#!/bin/bash
# Bash script to setup ArangoDB with Podman
# Run this script to start ArangoDB locally for development

PASSWORD="${1:-lifeos123}"
CONTAINER_NAME="lifeos-arangodb"
VOLUME_NAME="lifeos-arangodb-data"

echo "LifeOS ArangoDB Setup"
echo "====================="

# Check if Podman is available
if ! command -v podman &> /dev/null; then
    echo "Error: Podman is not installed or not in PATH"
    exit 1
fi

# Check if container already exists
if podman ps -a --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
    echo "Container '$CONTAINER_NAME' already exists"
    
    # Check if it's running
    if podman ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
        echo "Container is already running"
    else
        echo "Starting existing container..."
        podman start "$CONTAINER_NAME"
    fi
else
    # Create volume if it doesn't exist
    if ! podman volume ls --filter "name=$VOLUME_NAME" --format "{{.Name}}" | grep -q "$VOLUME_NAME"; then
        echo "Creating volume '$VOLUME_NAME'..."
        podman volume create "$VOLUME_NAME"
    fi

    # Run ArangoDB container
    echo "Starting ArangoDB container..."
    podman run -d \
        --name "$CONTAINER_NAME" \
        -e ARANGO_ROOT_PASSWORD="$PASSWORD" \
        -p 8529:8529 \
        -v "${VOLUME_NAME}:/var/lib/arangodb3" \
        arangodb:latest

    if [ $? -eq 0 ]; then
        echo "ArangoDB container started successfully!"
    else
        echo "Failed to start ArangoDB container"
        exit 1
    fi
fi

# Wait for ArangoDB to be ready
echo "Waiting for ArangoDB to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    sleep 2
    attempt=$((attempt + 1))
    if curl -s "http://localhost:8529/_api/version" > /dev/null 2>&1; then
        echo "ArangoDB is ready!"
        break
    fi
    echo "  Attempt $attempt/$max_attempts - waiting..."
done

if [ $attempt -ge $max_attempts ]; then
    echo "Timeout waiting for ArangoDB to start"
    exit 1
fi

# Display connection info
echo ""
echo "ArangoDB Connection Info:"
echo "  Web UI:    http://localhost:8529"
echo "  Username:  root"
echo "  Password:  $PASSWORD"
echo ""
echo "To initialize the database, run:"
echo "  podman exec -it $CONTAINER_NAME arangosh --server.password $PASSWORD --javascript.execute /scripts/init-arangodb.js"
