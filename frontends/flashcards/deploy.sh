#!/bin/bash

# Build and deploy the flashcards frontend using Podman

# Set variables
IMAGE_NAME="flashcards-frontend"
CONTAINER_NAME="flashcards-app"
PORT=8000
BACKEND_URL="http://host.containers.internal:5120"

# Build the image
echo "Building the Docker image..."
podman build --build-arg GIT_REVISION=$(git rev-parse HEAD 2>/dev/null || echo "local") -t $IMAGE_NAME .

# Stop and remove existing container if it exists
if podman ps -a --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
    echo "Stopping and removing existing container..."
    podman stop $CONTAINER_NAME
    podman rm $CONTAINER_NAME
fi

# Run the new container
echo "Starting the container..."
podman run -d \
    --name $CONTAINER_NAME \
    -p $PORT:8000 \
    -e VITE_API_URL=$BACKEND_URL \
    -e VITE_UPLOADS_URL=$BACKEND_URL \
    --restart unless-stopped \
    $IMAGE_NAME

# Show container status
echo -e "\nContainer status:"
podman ps -f name=$CONTAINER_NAME

echo -e "\nDeployment complete!"
echo "Flashcards frontend is running at: http://localhost:$PORT"
echo "Make sure the LifeOS backend is running at: $BACKEND_URL"
