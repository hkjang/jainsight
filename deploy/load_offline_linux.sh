#!/bin/bash

# Ensure script halts on first error
set -e

# Check if we are in the directory containing the images
if [ ! -f "jainsight-api.tar" ] || [ ! -f "jainsight-web.tar" ]; then
    echo "Error: Docker image tar files not found!"
    echo "Please run this script from the directory containing jainsight-api.tar and jainsight-web.tar"
    exit 1
fi

echo "Loading API image (jainsight-api.tar)..."
docker load -i jainsight-api.tar

echo "Loading Web image (jainsight-web.tar)..."
docker load -i jainsight-web.tar

echo "Images loaded successfully."

if [ -f "docker-compose.offline.yml" ]; then
    echo "Starting services using docker-compose.offline.yml..."
    docker-compose -f docker-compose.offline.yml up -d
    echo "Jainsight services started!"
    echo "Web Interface: http://localhost:4200"
    echo "API: http://localhost:3000"
else
    echo "Warning: docker-compose.offline.yml not found."
    echo "Please ensure the compose file is present to start the services."
fi
