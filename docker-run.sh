#!/bin/bash
VERSION=$(grep -oE "\"version\": \"(\w*.\w*.\w*.\w*.\w*.)" package.json | cut -d\" -f4)

docker run -p 1880:1880 -v "$(pwd)"/data/:/root/.node-red/ sparkle-guide:$VERSION &