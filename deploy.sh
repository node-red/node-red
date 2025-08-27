#!/usr/bin/env bash

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Source configuration files
if [ -f ~/.localtailscalerc ]; then
    source ~/.localtailscalerc
fi

if [ -f ~/.localhetznerrc ]; then
    source ~/.localhetznerrc
fi

# Get current git branch and sanitize it for Docker/Tailscale naming
BRANCH_NAME=$(git branch --show-current | sed 's/[^a-zA-Z0-9]/-/g' | tr '[:upper:]' '[:lower:]')

# Validate branch name
if [ -z "$BRANCH_NAME" ]; then
    echo -e "${RED}❌ Error: Could not determine git branch${NC}"
    exit 1
fi

# Configuration
DEPLOY_MODE="${DEPLOY_MODE:-local}"
HETZNER_HOST="${HETZNER_HOST:-your-server-ip}"
HETZNER_USER="${HETZNER_USER:-root}"
HETZNER_SSH_KEY="${HETZNER_SSH_KEY:-~/.ssh/id_rsa}"
CONTAINER_TAG="nr-experiment"
GITHUB_REPO="${GITHUB_REPO:-dimitrieh/node-red}"
GITHUB_ISSUES_REPO="${GITHUB_ISSUES_REPO:-node-red/node-red}"

# Function to log with timestamp
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check for uncommitted changes
check_uncommitted_changes() {
    if [ -n "$(git status --porcelain)" ]; then
        echo -e "${RED}❌ Error: Uncommitted changes detected!${NC}"
        echo "Please commit and push your changes before deploying:"
        echo
        git status --short
        echo
        echo "Run the following commands:"
        echo "  git add ."
        echo "  git commit -m 'Your commit message'"
        echo "  git push origin $BRANCH_NAME"
        exit 1
    fi
}

# Function to check if local and remote branches are in sync
check_branch_sync() {
    # Fetch latest from remote
    git fetch origin "$BRANCH_NAME" 2>/dev/null || {
        echo -e "${YELLOW}⚠️  Warning: Could not fetch from remote. Branch may not exist on remote.${NC}"
        echo "Please push your branch to remote first:"
        echo "  git push -u origin $BRANCH_NAME"
        exit 1
    }
    
    # Get commit hashes
    LOCAL_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse "origin/$BRANCH_NAME" 2>/dev/null || echo "")
    
    if [ -z "$REMOTE_COMMIT" ]; then
        echo -e "${YELLOW}⚠️  Warning: Remote branch origin/$BRANCH_NAME does not exist.${NC}"
        echo "Please push your branch to remote first:"
        echo "  git push -u origin $BRANCH_NAME"
        exit 1
    fi
    
    if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
        echo -e "${RED}❌ Error: Local and remote branches are out of sync!${NC}"
        echo "Local:  $LOCAL_COMMIT"
        echo "Remote: $REMOTE_COMMIT"
        echo
        echo "Please sync your branches:"
        echo "  git push origin $BRANCH_NAME  # if local is ahead"
        echo "  git pull origin $BRANCH_NAME  # if remote is ahead"
        exit 1
    fi
    
    log "${GREEN}✅ Local and remote branches are in sync${NC}"
}

# Function to display deployment info
show_deployment_info() {
    echo -e "${BLUE}=== Node-RED Deployment for Branch: $BRANCH_NAME ===${NC}"
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
}

# Function to check if TS_AUTHKEY is set
check_ts_authkey() {
    if [ -z "$TS_AUTHKEY" ]; then
        echo -e "${YELLOW}⚠️  WARNING: TS_AUTHKEY not set!${NC}"
        echo "   Set with: export TS_AUTHKEY=your-tailscale-auth-key"
        echo
        return 1
    fi
    return 0
}

# Function for local deployment
deploy_local() {
    log "${GREEN}🏠 Local Deployment Mode${NC}"
    
    # Build Docker image if needed
    if [ "$1" = "up" ] || [ "$1" = "" ] || ! docker image inspect "nr-demo:$BRANCH_NAME" >/dev/null 2>&1; then
        log "${BLUE}Building Docker image for branch: $BRANCH_NAME${NC}"
        echo "  - Base Image:        node:18-alpine"
        echo "  - Target Image:      nr-demo:$BRANCH_NAME"
        echo "  - Security:          Non-root user, read-only filesystem"
        echo "  - Demo Settings:     Included (user-settings.js, start-demo.sh)"
        echo
        docker build -t "nr-demo:$BRANCH_NAME" .
        log "${GREEN}✅ Docker image built: nr-demo:$BRANCH_NAME${NC}"
    fi
    
    # Create branch-specific docker-compose file from template
    COMPOSE_FILE="docker-compose-$BRANCH_NAME.yml"
    log "Creating $COMPOSE_FILE from template"
    sed -e "s/BRANCH_PLACEHOLDER/$BRANCH_NAME/g" \
        docker-compose.template.yml > "$COMPOSE_FILE"
    
    # Run docker-compose
    log "Running: docker compose -f $COMPOSE_FILE -p nr-$BRANCH_NAME $*"
    docker compose -f "$COMPOSE_FILE" -p "nr-$BRANCH_NAME" "$@"
    
    if [ "$1" = "up" ] || [ "$1" = "" ]; then
        echo
        log "${GREEN}✅ Local Deployment complete!${NC}"
        echo "   Access Node-RED at: https://nr-$BRANCH_NAME.${TAILNET:-[your-tailnet]}.ts.net"
    fi
}

# Function for remote deployment to Hetzner
deploy_remote() {
    log "${GREEN}🚀 Remote Deployment Mode (Hetzner)${NC}"
    echo "  - Host: $HETZNER_HOST"
    echo "  - User: $HETZNER_USER"
    echo "  - Branch: $BRANCH_NAME"
    echo
    
    # Check if required environment variables are set
    if [ -z "$HETZNER_HOST" ] || [ "$HETZNER_HOST" = "your-server-ip" ]; then
        log "${RED}❌ HETZNER_HOST not set!${NC}"
        echo "   Set with: export HETZNER_HOST=your-server-ip"
        exit 1
    fi
    
    if ! check_ts_authkey; then
        log "${RED}❌ TS_AUTHKEY is required for remote deployment!${NC}"
        exit 1
    fi
    
    # Validate other required variables
    if [ -z "$GITHUB_REPO" ]; then
        log "${RED}❌ GITHUB_REPO not set!${NC}"
        exit 1
    fi
    
    if [ -z "$GITHUB_ISSUES_REPO" ]; then
        log "${RED}❌ GITHUB_ISSUES_REPO not set!${NC}"
        exit 1
    fi
    
    # Get git remote URL
    GIT_REMOTE=$(git config --get remote.origin.url 2>/dev/null || echo "")
    if [ -z "$GIT_REMOTE" ]; then
        log "${RED}❌ No git remote origin found. Cannot deploy via git.${NC}"
        exit 1
    fi
    
    # Convert SSH URL to HTTPS for public repos
    if [[ "$GIT_REMOTE" == git@github.com:* ]]; then
        GIT_REMOTE="https://github.com/${GIT_REMOTE#git@github.com:}"
        log "📡 Git remote (converted to HTTPS): $GIT_REMOTE"
    else
        log "📡 Git remote: $GIT_REMOTE"
    fi
    
    # Note: Safety checks already ensure working tree is clean and synced
    
    # Deploy via single SSH session
    log "${BLUE}🔨 Deploying to Hetzner server...${NC}"
    
    # Ensure TAILNET has a reasonable default
    TAILNET_TO_PASS="${TAILNET:-your-tailnet}"
    
    log "📋 Deployment variables:"
    log "   Branch: $BRANCH_NAME"
    log "   Tailnet: $TAILNET_TO_PASS"
    log "   Git Remote: $GIT_REMOTE"
    log "   GitHub Repo: $GITHUB_REPO"
    echo
    
    # Pass all required variables as arguments to remote script
    ssh -i "$HETZNER_SSH_KEY" "$HETZNER_USER@$HETZNER_HOST" bash -s -- \
        "$BRANCH_NAME" \
        "$TS_AUTHKEY" \
        "$TAILNET_TO_PASS" \
        "$GIT_REMOTE" \
        "$GITHUB_REPO" \
        "$GITHUB_ISSUES_REPO" \
        "$@" << 'REMOTE_SCRIPT'
    
    set -euo pipefail
    
    # Get arguments passed from local script
    if [ "$#" -lt 6 ]; then
        echo "❌ Remote script requires at least 6 arguments: BRANCH_NAME TS_AUTHKEY TAILNET GIT_REMOTE GITHUB_REPO GITHUB_ISSUES_REPO [DOCKER_ARGS...]"
        exit 1
    fi
    
    BRANCH_NAME="$1"
    TS_AUTHKEY="$2"
    TAILNET="$3"
    GIT_REMOTE="$4"
    GITHUB_REPO="$5"
    GITHUB_ISSUES_REPO="$6"
    shift 6
    DOCKER_ARGS="$@"
    
    # Validate required variables
    if [ -z "$BRANCH_NAME" ] || [ -z "$TS_AUTHKEY" ] || [ -z "$GIT_REMOTE" ]; then
        echo "❌ Missing required variables in remote script"
        exit 1
    fi
    
    # Colors for remote output
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
    
    # Function to log with timestamp
    log() {
        echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    }
    
    log "${BLUE}=== Remote Script Started ===${NC}"
    log "📋 Received variables:"
    log "   Branch: $BRANCH_NAME"
    log "   Tailnet: $TAILNET"
    log "   Git Remote: $GIT_REMOTE"
    log "   Docker Args: $DOCKER_ARGS"
    echo
    
    # Set deployment directory
    REPO_DIR=~/node-red-deployments-$BRANCH_NAME
    LOG_FILE="$REPO_DIR/deployment.log"
    
    # Create deployment directory if it doesn't exist
    mkdir -p "$REPO_DIR"
    
    # Start logging
    exec 1> >(tee -a "$LOG_FILE")
    exec 2>&1
    
    log "${BLUE}=== Starting deployment for branch: $BRANCH_NAME ===${NC}"
    log "Arguments: $DOCKER_ARGS"
    
    # Ensure Docker is installed
    if ! command -v docker &> /dev/null; then
        log "${YELLOW}🐳 Installing Docker...${NC}"
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        systemctl enable docker
        systemctl start docker
    fi
    
    # Wait for Docker to be ready
    while ! docker version &> /dev/null; do
        log "Waiting for Docker to be ready..."
        systemctl start docker 2>/dev/null || true
        sleep 5
    done
    log "${GREEN}✅ Docker is ready${NC}"
    
    # Ensure git is installed
    if ! command -v git &> /dev/null; then
        log "${YELLOW}📦 Installing git...${NC}"
        if command -v apt-get &> /dev/null; then
            apt-get update && apt-get install -y git jq curl
        elif command -v yum &> /dev/null; then
            yum install -y git jq curl
        fi
    fi
    
    # Only build and deploy for 'up' commands
    if [[ "$DOCKER_ARGS" == *"up"* ]]; then
        log "${BLUE}🔄 Updating code and building...${NC}"
        
        # Clone or update repository
        if [ -d "$REPO_DIR/.git" ]; then
            log "Repository exists, updating..."
            cd "$REPO_DIR"
            git fetch origin
            git checkout "$BRANCH_NAME"
            git reset --hard "origin/$BRANCH_NAME"
        else
            log "Cloning repository..."
            git clone "$GIT_REMOTE" "$REPO_DIR"
            cd "$REPO_DIR"
            git checkout "$BRANCH_NAME"
        fi
        
        # Generate docker-compose file from template
        log "Generating docker-compose.yml from template..."
        sed -e "s/BRANCH_PLACEHOLDER/$BRANCH_NAME/g" \
            docker-compose.template.yml > docker-compose.yml
        
        # Generate Tailscale serve configuration for Node-RED
        log "Generating Tailscale serve configuration..."
        cat > tailscale-serve.json << TAILSCALE_CONFIG
{
  "TCP": {
    "443": {
      "HTTPS": true
    }
  },
  "Web": {
    "nr-${BRANCH_NAME}.${TAILNET}.ts.net:443": {
      "Handlers": {
        "/": {
          "Proxy": "http://node-red:1880"
        }
      }
    }
  },
  "AllowFunnel": {
    "nr-${BRANCH_NAME}.${TAILNET}.ts.net:443": false
  }
}
TAILSCALE_CONFIG
        
        # Generate Tailscale serve configuration for dashboard
        log "Generating Tailscale dashboard serve configuration..."
        cat > tailscale-serve-dashboard.json << DASHBOARD_CONFIG
{
  "TCP": {
    "443": {
      "HTTPS": true
    }
  },
  "Web": {
    "dashboard.${TAILNET}.ts.net:443": {
      "Handlers": {
        "/": {
          "Proxy": "http://dashboard:80"
        }
      }
    }
  },
  "AllowFunnel": {
    "dashboard.${TAILNET}.ts.net:443": false
  }
}
DASHBOARD_CONFIG
        
        # Build Docker image
        log "${BLUE}Building Docker image: nr-demo:$BRANCH_NAME${NC}"
        docker build -f Dockerfile -t "nr-demo:$BRANCH_NAME" .
        
        # Clean up dangling images
        docker system prune -f
        
        # Deploy with docker-compose
        log "${BLUE}Deploying with docker-compose...${NC}"
        if env TS_AUTHKEY="$TS_AUTHKEY" docker compose -f docker-compose.yml -p "nr-$BRANCH_NAME" up -d; then
            log "${GREEN}✅ Main deployment successful${NC}"
        else
            log "${RED}❌ Main deployment failed${NC}"
            exit 1
        fi
        
        # Deploy dashboard if dashboard config exists
        if [ -f "docker-compose-dashboard.yml" ]; then
            log "${BLUE}Generating and deploying dashboard...${NC}"
            
            # Generate dashboard data
            log "Scanning containers for dashboard..."
            
            # Find containers with the nr-experiment label
            containers=$(docker ps -q --filter "label=nr-experiment=true" 2>/dev/null || true)
            
            if [ -n "$containers" ]; then
                # Generate containers.json
                echo "{" > containers.json
                echo "  \"generated\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> containers.json
                echo "  \"containers\": [" >> containers.json
                
                first=true
                for container in $containers; do
                    if [ "$first" = false ]; then
                        echo "," >> containers.json
                    fi
                    first=false
                    
                    name=$(docker inspect --format='{{.Name}}' "$container" | sed 's/^\///')
                    image=$(docker inspect --format='{{.Config.Image}}' "$container")
                    created=$(docker inspect --format='{{.State.StartedAt}}' "$container")
                    
                    # Extract issue ID from container name
                    issue_id=$(echo "$name" | sed -n 's/.*issue-\([0-9]\+\).*/\1/p')
                    issue_url=""
                    issue_title=""
                    
                    if [ -n "$issue_id" ]; then
                        issue_url="https://github.com/$GITHUB_ISSUES_REPO/issues/$issue_id"
                        # Try to fetch issue title
                        api_url="https://api.github.com/repos/$GITHUB_ISSUES_REPO/issues/$issue_id"
                        response=$(curl -s -f "$api_url" 2>/dev/null || echo "{}")
                        issue_title=$(echo "$response" | grep '"title":' | head -1 | sed 's/.*"title": *"\([^"]*\)".*/\1/' | sed 's/\[NR Modernization Experiment\] *//')
                    fi
                    
                    # Get git info
                    branch=$(cd "$REPO_DIR" && git branch --show-current 2>/dev/null || echo "$BRANCH_NAME")
                    commit_short=$(cd "$REPO_DIR" && git rev-parse --short=8 HEAD 2>/dev/null || echo "unknown")
                    commit_hash=$(cd "$REPO_DIR" && git rev-parse HEAD 2>/dev/null || echo "unknown")
                    
                    commit_url=""
                    branch_url=""
                    if [ "$commit_hash" != "unknown" ]; then
                        commit_url="https://github.com/$GITHUB_REPO/commit/$commit_hash"
                        branch_url="https://github.com/$GITHUB_REPO/tree/$branch"
                    fi
                    
                    # Generate container entry
                    cat >> containers.json << CONTAINER_EOF
    {
        "name": "${issue_title:-$branch}",
        "image": "$image",
        "created": "$created",
        "url": "https://$name.${TAILNET}.ts.net",
        "issue_url": "$issue_url",
        "issue_title": "$issue_title",
        "branch": "$branch",
        "commit": "$commit_short",
        "commit_url": "$commit_url",
        "branch_url": "$branch_url"
    }
CONTAINER_EOF
                done
                
                echo "" >> containers.json
                echo "  ]" >> containers.json
                echo "}" >> containers.json
                
                log "Generated containers.json with $(echo "$containers" | wc -l) containers"
                
                # Generate dashboard HTML
                log "Generating dashboard.html..."
                cat > dashboard.html << 'DASHBOARD_HTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Container Dashboard</title>
    
    <!-- Tally popup widget -->
    <script async src="https://tally.so/widgets/embed.js"></script>
    <script>
    window.TallyConfig = {
      "formId": "31L4dW",
      "popup": {
        "emoji": {
          "text": "👋",
          "animation": "wave"
        },
        "hideTitle": true,
        "open": {
          "trigger": "time",
          "ms": 30000
        }
      }
    };
    </script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f0f0f0;
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 20px;
            background: #8f0000;
            color: white;
            padding: 40px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            font-weight: 400;
            letter-spacing: -0.5px;
            display: inline;
            line-height: 1.2;
        }

        .header h1 .logo {
            height: 1em;
            width: auto;
            vertical-align: middle;
            margin-right: 0.2em;
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.95;
            margin-bottom: 15px;
        }

        .header-links {
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }

        .header-link {
            color: white;
            text-decoration: none;
            padding: 8px 16px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.1);
        }

        .header-link:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.6);
            transform: translateY(-1px);
        }

        .meta-info {
            color: #666;
            font-size: 0.9rem;
            background: white;
            padding: 10px 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            white-space: nowrap;
        }
        
        .meta-info code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            color: #8f0000;
            font-weight: 500;
        }

        .controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 15px;
        }

        .refresh-btn {
            background: white;
            color: #666;
            border: 2px solid #ddd;
            padding: 0 16px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            white-space: nowrap;
            min-width: 120px;
        }

        .refresh-btn:hover {
            background: rgba(143, 0, 0, 0.05);
            color: #8f0000;
            border-color: #8f0000;
        }

        .control-buttons {
            display: flex;
            align-items: center;
            gap: 20px;
            flex-wrap: wrap;
        }

        .status-filter {
            display: flex;
            align-items: center;
            background: white;
            border-radius: 8px;
            border: 2px solid #ddd;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            height: 40px;
        }

        .filter-btn {
            background: transparent;
            color: #666;
            border: none;
            padding: 0 15px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
            font-weight: 500;
            line-height: 1;
            min-width: 70px;
            border-right: 1px solid #ddd;
            position: relative;
            white-space: nowrap;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: 1;
        }

        .filter-btn:last-child {
            border-right: none;
        }

        .filter-btn:hover {
            background: rgba(143, 0, 0, 0.05);
            color: #8f0000;
        }

        .filter-btn.active {
            background: #8f0000;
            color: white;
        }

        .instances-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .instance-card {
            background: white;
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            border: 1px solid #e0e0e0;
        }

        .instance-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
            border-color: #8f0000;
        }

        .instance-card.online:hover {
            border-color: #4CAF50;
        }

        .instance-card.checking:hover {
            border-color: #2196F3;
        }

        .instance-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: #4CAF50;
        }

        .instance-card.checking::before {
            background: #2196F3;
        }

        .instance-card.offline::before {
            background: #f44336;
        }

        .instance-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }

        .instance-name {
            font-size: 1.3rem;
            font-weight: 600;
            color: #333;
            margin: 0;
        }

        .status-badge {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-online {
            background: #e8f5e8;
            color: #4CAF50;
        }

        .status-offline {
            background: #ffebee;
            color: #f44336;
        }

        .status-checking {
            background: #e3f2fd;
            color: #2196F3;
        }

        .instance-info {
            margin-bottom: 20px;
        }

        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 0.9rem;
        }

        .info-label {
            color: #666;
            font-weight: 500;
        }

        .info-value {
            color: #333;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 0.85rem;
            text-align: right;
            flex: 1;
            margin-left: 10px;
            word-break: break-all;
        }

        .info-value a {
            color: #0066cc;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .info-value a:hover {
            color: #8f0000;
            text-decoration: underline;
        }

        @media (max-width: 900px) {
            .controls {
                flex-direction: column;
                align-items: stretch;
            }

            .meta-info {
                width: 100%;
                text-align: center;
            }

            .control-buttons {
                justify-content: center;
                width: 100%;
            }
        }

        @media (max-width: 600px) {
            .header h1 {
                font-size: 2rem;
            }

            .instances-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><img src="https://us1.discourse-cdn.com/flex026/uploads/nodered/original/1X/778549404735e222c89ce5449482a189ace8cdae.png" alt="Node-RED" class="logo"> Node-RED Modernization Project Experiment Dashboard</h1>
            <p>Live status of all currently running Node-RED experiments | Feel free to test the other experiments!</p>
            <div class="header-links">
                <a href="https://discourse.nodered.org/t/node-red-survey-shaping-the-future-of-node-reds-user-experience/98346" target="_blank" rel="noopener noreferrer" class="header-link">Modernization Project</a>
                <a href="https://github.com/node-red/node-red/issues" target="_blank" rel="noopener noreferrer" class="header-link">Issue Tracker</a>
            </div>
        </div>

        <div class="controls">
            <div class="meta-info" id="meta-info">Loading...</div>
            <div class="control-buttons">
                <button class="refresh-btn" onclick="checkAllStatus()">Check status</button>
                <div class="status-filter">
                    <button class="filter-btn active" data-filter="all" id="all-btn">All (<span id="total-count">0</span>)</button>
                    <button class="filter-btn" data-filter="online" id="online-btn">Online (<span id="online-count">0</span>)</button>
                    <button class="filter-btn" data-filter="offline" id="offline-btn">Offline (<span id="offline-count">0</span>)</button>
                </div>
            </div>
        </div>
        <div id="instances" class="instances-grid"></div>
    </div>

    <script>
        let containersData = null;
        let currentFilter = 'all';

        function getRelativeTime(date) {
            const now = new Date();
            const diffMs = now - date;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffSecs < 60) return `${diffSecs} seconds ago`;
            if (diffMins < 60) return `${diffMins} minutes ago`;
            if (diffHours < 24) return `${diffHours} hours ago`;
            return `${diffDays} days ago`;
        }

        async function loadContainersData() {
            try {
                const response = await fetch('containers.json');
                containersData = await response.json();
                
                const metaInfo = document.getElementById('meta-info');
                const generatedDate = new Date(containersData.generated);
                const generated = generatedDate.toLocaleString();
                const relativeTime = getRelativeTime(generatedDate);
                metaInfo.innerHTML = `Generated: <code>${relativeTime}</code> (${generated})`;
                
                containersData.containers.forEach(container => {
                    container.urlStatus = 'checking';
                });
                
                displayContainers();
                updateStats();
                checkAllStatus();
            } catch (error) {
                console.error('Error loading containers data:', error);
                document.getElementById('instances').innerHTML = 
                    '<div style="grid-column: 1/-1; text-align: center; color: #666; font-size: 1.2rem; margin: 50px 0;">❌ Failed to load containers data</div>';
            }
        }

        async function checkAllStatus() {
            if (!containersData) return;

            const promises = containersData.containers.map(async (container) => {
                container.urlStatus = 'checking';
                displayContainers();
                
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    
                    const response = await fetch(container.url, { 
                        method: 'HEAD',
                        signal: controller.signal,
                        mode: 'no-cors'
                    });
                    
                    clearTimeout(timeoutId);
                    container.urlStatus = 'online';
                } catch (error) {
                    container.urlStatus = 'offline';
                }
                return container;
            });

            await Promise.all(promises);
            displayContainers();
            updateStats();
        }

        function displayContainers() {
            if (!containersData) return;
            
            const container = document.getElementById('instances');
            const filteredContainers = getFilteredContainers();

            if (filteredContainers.length === 0) {
                container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #666; font-size: 1.2rem; margin: 50px 0;">No containers match the current filter</div>';
                return;
            }

            container.innerHTML = filteredContainers.map(cont => createContainerCard(cont)).join('');

            container.querySelectorAll('.instance-card').forEach(card => {
                card.addEventListener('click', function(event) {
                    if (event.target.tagName === 'A' || event.target.closest('a')) {
                        return;
                    }
                    const url = this.getAttribute('data-url');
                    window.open(url, '_blank');
                });
            });
        }

        function createContainerCard(container) {
            const urlStatus = container.urlStatus || 'unknown';
            const statusClass = urlStatus === 'online' ? 'online' : urlStatus === 'checking' ? 'checking' : urlStatus;
            
            const deployedDate = new Date(container.created);
            const deployedTime = deployedDate.toLocaleString();
            const deployedRelative = getRelativeTime(deployedDate);
            
            let versionInfo = '';
            if (container.branch && container.commit && container.branch_url && container.commit_url) {
                versionInfo = `<a href="${container.branch_url}" target="_blank">${container.branch}</a> | <a href="${container.commit_url}" target="_blank">${container.commit}</a>`;
            }
            
            return `
                <div class="instance-card ${statusClass}" data-url="${container.url}">
                    <div class="instance-header">
                        <h3 class="instance-name">${container.issue_title ? container.issue_title.replace(/^\[NR Modernization Experiment\]\s*/, '') : container.name}</h3>
                        <span class="status-badge status-${urlStatus}">${urlStatus}</span>
                    </div>
                    <div class="instance-info">
                        <div class="info-row">
                            <span class="info-label">Deployed:</span>
                            <span class="info-value" title="${deployedTime}">${deployedRelative}</span>
                        </div>
                        ${versionInfo ? `
                        <div class="info-row">
                            <span class="info-label">Version:</span>
                            <span class="info-value">${versionInfo}</span>
                        </div>
                        ` : ''}
                        <div class="info-row">
                            <span class="info-label">Image:</span>
                            <span class="info-value">${container.image}</span>
                        </div>
                        ${container.issue_url ? `
                        <div class="info-row">
                            <span class="info-label">Issue:</span>
                            <span class="info-value"><a href="${container.issue_url}" target="_blank">${container.issue_url}</a></span>
                        </div>
                        ` : ''}
                        <div class="info-row">
                            <span class="info-label">URL:</span>
                            <span class="info-value"><a href="${container.url}" target="_blank">${container.url}</a></span>
                        </div>
                    </div>
                </div>
            `;
        }

        function getFilteredContainers() {
            if (!containersData) return [];
            
            if (currentFilter === 'all') {
                return containersData.containers;
            }
            
            return containersData.containers.filter(container => {
                return container.urlStatus === currentFilter;
            });
        }

        function updateStats() {
            if (!containersData) return;
            
            const stats = {
                total: containersData.containers.length,
                online: containersData.containers.filter(c => c.urlStatus === 'online').length,
                offline: containersData.containers.filter(c => c.urlStatus === 'offline').length
            };

            document.getElementById('total-count').textContent = stats.total;
            document.getElementById('online-count').textContent = stats.online;
            document.getElementById('offline-count').textContent = stats.offline;
        }

        document.addEventListener('DOMContentLoaded', loadContainersData);

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelector('.filter-btn.active').classList.remove('active');
                this.classList.add('active');
                currentFilter = this.getAttribute('data-filter');
                displayContainers();
            });
        });
    </script>
</body>
</html>
DASHBOARD_HTML
                
                # Deploy dashboard container
                log "Stopping existing dashboard containers..."
                docker compose -f docker-compose-dashboard.yml down 2>/dev/null || true
                
                log "Deploying dashboard container..."
                if env TS_AUTHKEY="$TS_AUTHKEY" docker compose -f docker-compose-dashboard.yml up -d; then
                    log "${GREEN}✅ Dashboard deployed successfully${NC}"
                else
                    log "${YELLOW}⚠️  Dashboard deployment failed${NC}"
                fi
            else
                log "${YELLOW}⚠️  No containers found for dashboard${NC}"
            fi
        else
            log "${YELLOW}⚠️  docker-compose-dashboard.yml not found, skipping dashboard deployment${NC}"
        fi
        
        # Clean up old resources
        log "${BLUE}🧹 Cleaning up old resources...${NC}"
        cd ~
        # Keep only last 3 deployment directories
        ls -dt node-red-deployments-* 2>/dev/null | tail -n +4 | xargs -r rm -rf
        # Clean up old Tailscale configs in home directory
        rm -f tailscale-serve-*.json 2>/dev/null || true
        log "Cleanup completed"
        
    else
        log "${BLUE}⏭️  Skipping build for '$DOCKER_ARGS' command${NC}"
        
        # Just run the docker command
        cd "$REPO_DIR" 2>/dev/null || {
            log "${YELLOW}⚠️  No deployment directory found for branch $BRANCH_NAME${NC}"
            exit 1
        }
        
        log "Running: docker compose -p nr-$BRANCH_NAME $DOCKER_ARGS"
        env TS_AUTHKEY="$TS_AUTHKEY" docker compose -f docker-compose.yml -p "nr-$BRANCH_NAME" $DOCKER_ARGS
    fi
    
    log "${GREEN}=== Deployment script completed ===${NC}"
    
REMOTE_SCRIPT
    
    # Check SSH command exit status
    SSH_EXIT_CODE=$?
    if [ $SSH_EXIT_CODE -eq 0 ]; then
        # SSH command succeeded
        if [ "$1" = "up" ] || [ "$1" = "" ]; then
            echo
            log "${GREEN}✅ Remote Deployment complete!${NC}"
            echo "   Server: $HETZNER_HOST"
            echo "   Node-RED: https://nr-$BRANCH_NAME.${TAILNET:-[your-tailnet]}.ts.net"
            echo "   Dashboard: https://dashboard.${TAILNET:-[your-tailnet]}.ts.net"
        fi
    else
        # SSH command failed
        log "${RED}❌ Remote deployment failed! (Exit code: $SSH_EXIT_CODE)${NC}"
        exit $SSH_EXIT_CODE
    fi
}

# Main script execution
# Run safety checks first
check_uncommitted_changes
check_branch_sync

show_deployment_info

# Export for docker-compose
export BRANCH_NAME

# Determine deployment mode and execute
if [ "$DEPLOY_MODE" = "remote" ] || [ "$DEPLOY_MODE" = "hetzner" ]; then
    deploy_remote "$@"
else
    deploy_local "$@"
fi