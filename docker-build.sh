VERSION=$(grep -oE "\"version\": \"(\w*.\w*.\w*.\w*.\w*.)" package.json | cut -d\" -f4)

docker build --rm --no-cache \
  --build-arg BUILD_DATE="$(date +"%Y-%m-%dT%H:%M:%SZ")" \
  --file Dockerfile \
  --tag sparkle-guide:$VERSION .