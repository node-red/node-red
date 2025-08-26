#!/usr/bin/env bash

set -e

# Source Tailscale configuration if it exists
if [ -f ~/.localtailscalerc ]; then
    source ~/.localtailscalerc
fi

# Source Hetzner configuration if it exists
if [ -f ~/.localhetznerrc ]; then
    source ~/.localhetznerrc
fi

# Get current git branch and sanitize it for Docker/Tailscale naming
BRANCH_NAME=$(git branch --show-current | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]')

# Validate branch name
if [ -z "$BRANCH_NAME" ]; then
    echo "Error: Could not determine git branch"
    exit 1
fi

echo "=== Node-RED Deployment for Branch: $BRANCH_NAME ==="
echo
echo "Docker Configuration:"
echo "  - Node-RED Container:    nr-$BRANCH_NAME"
echo "  - Tailscale Container:   nr-$BRANCH_NAME-tailscale"
echo "  - Network:               nr-$BRANCH_NAME-net"
echo "  - Node-RED Data Volume:  nr_${BRANCH_NAME}_data"
echo "  - Tailscale Volume:      nr_${BRANCH_NAME}_tailscale"
echo
echo "Networking:"
echo "  - Internal Node-RED:     http://node-red:1880 (within Docker network)"
echo "  - Tailscale Hostname:    nr-$BRANCH_NAME"
echo "  - External Access:       https://nr-$BRANCH_NAME.${TAILNET:-[your-tailnet]}.ts.net"
echo
echo "Tailscale Configuration:"
echo "  - Tag: nr-experiment"
echo "  - Serves HTTPS on port 443"
echo "  - Proxies all requests (/) to internal Node-RED on port 1880"
echo

# Export for docker-compose
export BRANCH_NAME

# Deployment mode selection
DEPLOY_MODE="${DEPLOY_MODE:-local}"
GCP_VM_NAME="${GCP_VM_NAME:-nr-vps}"
GCP_ZONE="${GCP_ZONE:-europe-west1-b}"
GCP_PROJECT="${GCP_PROJECT:-nr-experiments}"
HETZNER_HOST="${HETZNER_HOST:-your-server-ip}"
HETZNER_USER="${HETZNER_USER:-root}"

# Check if TS_AUTHKEY is set
if [ -z "$TS_AUTHKEY" ]; then
    echo "⚠️  WARNING: TS_AUTHKEY not set!"
    echo "   Set with: export TS_AUTHKEY=your-tailscale-auth-key"
    echo
fi


if [ "$DEPLOY_MODE" = "gcp" ] || [ "$DEPLOY_MODE" = "hetzner" ]; then
    # Ensure we have clean working tree before deploying
    if [ -n "$(git status --porcelain)" ]; then
        echo "📝 Uncommitted changes detected. Committing..."
        git add .
        git commit -m "Auto-commit before GCP deployment - branch: $BRANCH_NAME"
    fi
    
    # Push current branch to origin
    echo "📤 Pushing to origin..."
    git push --force-with-lease origin "$BRANCH_NAME" || echo "⚠️  Push failed"
    
    # Create branch-specific docker-compose file
    COMPOSE_FILE="docker-compose-$BRANCH_NAME.yml"
    echo "Creating $COMPOSE_FILE for remote deployment ($DEPLOY_MODE)"
    sed -e "s/BRANCH_PLACEHOLDER/$BRANCH_NAME/g" \
        docker-compose.template.yml > "$COMPOSE_FILE"
    
    # Use cd.sh for remote deployment (GCP or Hetzner)
    DEPLOY_MODE="$DEPLOY_MODE" ./cd.sh "$BRANCH_NAME" "$COMPOSE_FILE" "$@"
    
else
    # Local deployment (original behavior)
    echo "🏠 Local Deployment Mode"
    echo
    
    # Build Docker image if it doesn't exist or if deploying with 'up'
    if [ "$1" = "up" ] || [ "$1" = "" ] || ! docker image inspect "nr-demo:$BRANCH_NAME" >/dev/null 2>&1; then
        echo "Building Docker image for branch: $BRANCH_NAME"
        echo "  - Base Image:        node:18-alpine"
        echo "  - Target Image:      nr-demo:$BRANCH_NAME"
        echo "  - Security:          Non-root user, read-only filesystem"
        echo "  - Demo Settings:     Included (user-settings.js, start-demo.sh)"
        echo
        docker build -t "nr-demo:$BRANCH_NAME" .
        echo "✅ Docker image built: nr-demo:$BRANCH_NAME"
        echo
    fi

    # Create branch-specific docker-compose file from template
    COMPOSE_FILE="docker-compose-$BRANCH_NAME.yml"
    echo "Creating $COMPOSE_FILE from template for branch: $BRANCH_NAME"
    sed -e "s/BRANCH_PLACEHOLDER/$BRANCH_NAME/g" \
        docker-compose.template.yml > "$COMPOSE_FILE"
    echo "✅ $COMPOSE_FILE created for branch: $BRANCH_NAME"

    # Run docker-compose with branch-specific file and project name
    echo "Running: docker compose -f $COMPOSE_FILE -p nr-$BRANCH_NAME $*"
    docker compose -f "$COMPOSE_FILE" -p "nr-$BRANCH_NAME" "$@"
    
    if [ "$1" = "up" ] || [ "$1" = "" ]; then
        echo
        echo "✅ Local Deployment complete!"
        echo "   Access Node-RED at: https://nr-$BRANCH_NAME.${TAILNET:-[your-tailnet]}.ts.net"
    fi
fi