#!/bin/bash
set -e

# Check if running from project root
if [ ! -f "nx.json" ]; then
    echo -e "\033[0;31mPlease run this script from the project root directory.\033[0m"
    exit 1
fi

# Create deploy directory if not exists
mkdir -p deploy

echo -e "\033[0;32mBuilding API image...\033[0m"
docker build -f apps/api/Dockerfile -t jainsight-api:latest .

echo -e "\033[0;32mSaving API image to deploy/jainsight-api.tar...\033[0m"
docker save jainsight-api:latest -o deploy/jainsight-api.tar

echo -e "\033[0;32mBuilding Web image...\033[0m"
docker build -f apps/web/Dockerfile -t jainsight-web:latest .

echo -e "\033[0;32mSaving Web image to deploy/jainsight-web.tar...\033[0m"
docker save jainsight-web:latest -o deploy/jainsight-web.tar

echo -e "\033[0;36mDone! Images are in deploy/ folder.\033[0m"
