#!/bin/bash
VERSION=$(grep -oE "\"version\": \"(\w*.\w*.\w*.\w*.\w*.)" package.json | cut -d\" -f4)
VOLUME_USERSPACE=""

CONTAINER_ENGINE=$1
if [ -z $CONTAINER_ENGINE ]; then
  CONTAINER_ENGINE=docker
elif [ $CONTAINER_ENGINE = "podman" ]; then
  # rootless podman will require mounting the volume as its uid/gid internally for proper permissions
  VOLUME_USERSPACE=":U"
fi

echo using $CONTAINER_ENGINE container engine...
echo Server now running at http://127.0.0.1:1880/

$CONTAINER_ENGINE run -d -p 1880:1880 -v "$(pwd)"/data:/home/appuser/.node-red$VOLUME_USERSPACE sparkle-guide:$VERSION