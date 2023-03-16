#!/bin/bash

VERSION=$1

echo "Logging in the docker registry $DOCKER_REGISTRY_URL..."
docker login "$DOCKER_REGISTRY_URL" -u "$DOCKER_USERNAME" -p "$DOCKER_PASSWORD"

echo "Building the docker image v$VERSION..."
echo "Image name: $DOCKER_REGISTRY_URL/$DOCKER_IMAGE_NAME:$VERSION"
docker build -t "$DOCKER_REGISTRY_URL/$DOCKER_IMAGE_NAME:$VERSION" .

echo "Pushing the docker image to $DOCKER_REGISTRY_URL..."
docker push "$DOCKER_REGISTRY_URL/$DOCKER_IMAGE_NAME:$VERSION"
