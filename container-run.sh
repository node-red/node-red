#!/bin/bash
VERSION=$(grep -oE "\"version\": \"(\w*.\w*.\w*.\w*.\w*.)" package.json | cut -d\" -f4)

CONTAINER_ENGINE=$1
if [ -z $CONTAINER_ENGINE ]; then
  CONTAINER_ENGINE=docker
fi

echo using $CONTAINER_ENGINE container engine...

$CONTAINER_ENGINE run -p 1880:1880 -v "$(pwd)"/data/:/root/.node-red/ sparkle-guide:$VERSION &