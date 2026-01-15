#!/bin/bash

# Rebuild budget frontend container
echo "Rebuilding budget frontend container..."

# Set variables
IMAGE_NAME="smart-assistant_budget-frontend"
GIT_REVISION=$(git rev-parse HEAD 2>/dev/null || echo "local")

# Build the image
echo "Building Docker image..."
docker build \
  --build-arg GIT_REVISION=$GIT_REVISION \
  -t $IMAGE_NAME:latest \
  -t $IMAGE_NAME:$GIT_REVISION \
  .

echo "Build completed successfully!"
echo "Image: $IMAGE_NAME:$GIT_REVISION"

# Run the container (optional)
read -p "Do you want to run the container now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running container..."
    docker run -d -p 8040:8000 --name budget-frontend --rm -e VITE_API_URL=http://host.containers.internal:5120 $IMAGE_NAME:latest
    echo "Container running on http://localhost:8040"
fi
