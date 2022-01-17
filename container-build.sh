VERSION=$(grep -oE "\"version\": \"(\w*.\w*.\w*.\w*.\w*.)" package.json | cut -d\" -f4)

CONTAINER_ENGINE=$1
if [ -z $CONTAINER_ENGINE ]; then
  CONTAINER_ENGINE=docker
fi

echo using $CONTAINER_ENGINE container engine...

$CONTAINER_ENGINE build --rm --no-cache \
  --build-arg BUILD_DATE="$(date +"%Y-%m-%dT%H:%M:%SZ")" \
  --file Containerfile \
  --tag sparkle-guide:$VERSION .