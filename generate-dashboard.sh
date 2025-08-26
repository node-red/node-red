#!/bin/bash

# Configuration - Update these values
CONTAINER_TAG="nr-experiment"  # Replace with your container tag/label
TAILNET_DOMAIN="${TAILNET}.ts.net"  # Replace with your tailnet domain
GITHUB_REPO="dimitrieh/node-red"  # Your fork repository for branch/commit URLs
GITHUB_ISSUES_REPO="node-red/node-red"  # Upstream repository for issue URLs
OUTPUT_DIR="."
JSON_FILE="$OUTPUT_DIR/containers.json"
HTML_FILE="$OUTPUT_DIR/dashboard.html"

# Check if a JSON file is provided as argument
INPUT_JSON_FILE="$1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Generating Tailscale Container Dashboard${NC}"
echo "========================================="

# If JSON file is provided, use it instead of scanning containers
if [ ! -z "$INPUT_JSON_FILE" ] && [ -f "$INPUT_JSON_FILE" ]; then
    echo -e "${YELLOW}📄 Using provided JSON file: $INPUT_JSON_FILE${NC}"
    
    # Copy the input file to the expected location
    cp "$INPUT_JSON_FILE" "$JSON_FILE"
    
    # Update HTML filename based on input file
    BASE_NAME=$(basename "$INPUT_JSON_FILE" .json)
    HTML_FILE="$OUTPUT_DIR/$BASE_NAME.html"
    
    echo -e "${GREEN}✅ JSON file copied to: $JSON_FILE${NC}"
    
    # Skip container scanning and go directly to HTML generation
    container_count=$(jq '.containers | length' "$JSON_FILE" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ Found $container_count containers in JSON file${NC}"
    
    # Skip to HTML generation section
    skip_docker_scan=true
else
    skip_docker_scan=false
fi

# Only check Docker if we need to scan containers
if [ "$skip_docker_scan" = false ]; then
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is not installed or not available${NC}"
        exit 1
    fi
fi

# Function to fetch GitHub issue title
fetch_issue_title() {
    local issue_id=$1
    if [ -z "$issue_id" ]; then
        echo ""
        return
    fi
    
    # Try to fetch issue title from GitHub API
    local api_url="https://api.github.com/repos/$GITHUB_ISSUES_REPO/issues/$issue_id"
    local title=$(curl -s -f "$api_url" 2>/dev/null | grep '"title":' | sed 's/.*"title":"\([^"]*\)".*/\1/' | sed 's/\[NR Modernization Experiment\]\s*//')
    
    if [ ! -z "$title" ] && [ "$title" != "$api_url" ]; then
        echo "$title"
    else
        echo ""
    fi
}

# Function to get container info
get_container_info() {
    local container_id=$1
    local name=$(docker inspect --format='{{.Name}}' "$container_id" | sed 's/^\///')
    local image=$(docker inspect --format='{{.Config.Image}}' "$container_id")
    local status=$(docker inspect --format='{{.State.Status}}' "$container_id")
    local created=$(docker inspect --format='{{.Created}}' "$container_id")
    
    # Get exposed ports
    local ports=$(docker inspect --format='{{range $p, $conf := .NetworkSettings.Ports}}{{if $conf}}{{$p}} {{end}}{{end}}' "$container_id" | tr -d '/tcp' | tr -d '/udp')
    local main_port=$(echo $ports | awk '{print $1}')
    
    # Get labels for service info
    local service_name=$(docker inspect --format='{{index .Config.Labels "com.docker.compose.service"}}' "$container_id" 2>/dev/null || echo "$name")
    
    # Extract issue ID from container name (expecting format like "nr-issue-123")
    local issue_id=$(echo "$name" | sed -n 's/.*issue-\([0-9]\+\).*/\1/p')
    local experiment_name=""
    local issue_url=""
    local issue_title=""
    
    # Get current git branch and commit hash
    local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    local commit_hash=$(git rev-parse HEAD 2>/dev/null || echo "unknown")
    local commit_short=$(git rev-parse --short=8 HEAD 2>/dev/null || echo "unknown")
    local commit_url=""
    local branch_url=""
    
    if [ "$commit_hash" != "unknown" ] && [ ! -z "$GITHUB_REPO" ]; then
        commit_url="https://github.com/$GITHUB_REPO/commit/$commit_hash"
        branch_url="https://github.com/$GITHUB_REPO/tree/$branch"
    fi
    
    if [ ! -z "$issue_id" ]; then
        issue_url="https://github.com/$GITHUB_ISSUES_REPO/issues/$issue_id"
        issue_title=$(fetch_issue_title "$issue_id")
        
        if [ ! -z "$issue_title" ]; then
            experiment_name="$issue_title"
        else
            experiment_name="#$issue_id"
        fi
    else
        # Fallback to branch name if no issue ID found
        experiment_name="$branch"
        issue_url=""
    fi
    
    # Generate Tailscale URL
    local hostname="$name"
    local protocol="https"
    local url="$protocol://$hostname.$TAILNET_DOMAIN"
    if [ ! -z "$main_port" ] && [ "$main_port" != "80" ] && [ "$main_port" != "443" ]; then
        url="$url:$main_port"
    fi
    
    echo "{
        \"name\": \"$experiment_name\",
        \"image\": \"$image\",
        \"created\": \"$created\",
        \"url\": \"$url\",
        \"issue_url\": \"$issue_url\",
        \"issue_title\": \"$issue_title\",
        \"branch\": \"$branch\",
        \"commit\": \"$commit_short\",
        \"commit_url\": \"$commit_url\",
        \"branch_url\": \"$branch_url\"
    }"
}

# Only scan Docker containers if not using provided JSON
if [ "$skip_docker_scan" = false ]; then
    echo -e "${YELLOW}📦 Scanning Docker containers with tag/label: $CONTAINER_TAG${NC}"

    # Find containers with the specified tag/label
    # This checks both labels and image tags
    containers=$(docker ps -q --filter "label=nr-experiment=true" 2>/dev/null)

    if [ -z "$containers" ]; then
        echo -e "${YELLOW}⚠️  No containers found with label '$CONTAINER_TAG', trying image tag...${NC}"
        # Try to find by image tag
        containers=$(docker ps -q --filter "ancestor=*:$CONTAINER_TAG" 2>/dev/null)
    fi

    if [ -z "$containers" ]; then
        echo -e "${RED}❌ No running containers found with tag '$CONTAINER_TAG'${NC}"
        echo "Available containers:"
        docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | head -10
        exit 1
    fi

    container_count=$(echo "$containers" | wc -l | tr -d ' ')
    echo -e "${GREEN}✅ Found $container_count containers${NC}"

    # Generate JSON data
    echo -e "${BLUE}📝 Generating container data...${NC}"

    echo "{" > "$JSON_FILE"
    echo "  \"generated\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"," >> "$JSON_FILE"
    echo "  \"containers\": [" >> "$JSON_FILE"

    first=true
    for container in $containers; do
        if [ "$first" = false ]; then
            echo "," >> "$JSON_FILE"
        fi
        first=false
        
        container_info=$(get_container_info "$container")
        echo "$container_info" | sed 's/^/    /' >> "$JSON_FILE"
        
        # Extract name for logging
        name=$(echo "$container_info" | grep '"name"' | cut -d'"' -f4)
        url=$(echo "$container_info" | grep '"url"' | cut -d'"' -f4)
        echo -e "  ${GREEN}•${NC} $name -> $url"
    done

    echo "" >> "$JSON_FILE"
    echo "  ]" >> "$JSON_FILE"
    echo "}" >> "$JSON_FILE"

    echo -e "${GREEN}✅ Container data saved to: $JSON_FILE${NC}"
fi

# Generate HTML dashboard
echo -e "${BLUE}🎨 Generating HTML dashboard...${NC}"

cat > "$HTML_FILE" << 'EOF'
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

        .refresh-btn:focus {
            outline: none;
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
            align-items: anchor-center;
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

        .divider {
            display: none;
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

        .instance-card.unknown:hover {
            border-color: #ff9800;
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

        .instance-card.unknown::before {
            background: #ff9800;
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

        .status-running {
            background: #e8f5e8;
            color: #4CAF50;
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

        .status-unknown {
            background: #fff3e0;
            color: #ff9800;
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

        .instance-url {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            border-left: 3px solid #8f0000;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 0.9rem;
            word-break: break-all;
            margin-top: 10px;
            color: #495057;
        }

        .instance-url a {
            color: #0066cc;
            text-decoration: none;
            transition: color 0.2s ease;
        }

        .instance-url a:hover {
            color: #8f0000;
            text-decoration: underline;
        }

        @media (max-width: 900px) {
            .controls {
                flex-direction: column;
                align-items: stretch;
                gap: 15px;
            }

            .meta-info {
                width: 100%;
                text-align: center;
            }

            .control-buttons {
                justify-content: center;
                width: 100%;
            }

            .status-filter {
                flex: 1;
            }

            .refresh-btn {
                min-width: 120px;
            }
        }

        @media (max-width: 700px) {
            .controls {
                flex-direction: column;
                align-items: stretch;
                gap: 15px;
            }

            .control-buttons {
                flex-direction: column;
                gap: 10px;
                align-self: stretch;
            }

            .refresh-btn {
                width: 100%;
                align-self: stretch;
            }

            .status-filter {
                width: 100%;
                align-self: stretch;
            }
        }

        @media (max-width: 1024px) and (min-width: 769px) {
            .header h1 {
                font-size: 2.2rem;
            }
        }

        @media (max-width: 600px) {
            .header h1 {
                font-size: 2rem;
            }

            .filter-btn {
                min-width: 60px;
                padding: 10px 12px;
                font-size: 13px;
                flex: 1;
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
                    <div class="divider">|</div>
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

        // Function to get relative time string
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

        // Load containers data
        async function loadContainersData() {
            try {
                const response = await fetch('containers.json');
                containersData = await response.json();
                
                // Update meta info
                const metaInfo = document.getElementById('meta-info');
                const generatedDate = new Date(containersData.generated);
                const generated = generatedDate.toLocaleString();
                const relativeTime = getRelativeTime(generatedDate);
                metaInfo.innerHTML = `Generated: <code>${relativeTime}</code> (${generated})`;
                
                // Initialize status checking
                containersData.containers.forEach(container => {
                    container.urlStatus = 'checking';
                });
                
                displayContainers();
                updateStats();
                checkAllStatus();
            } catch (error) {
                console.error('Error loading containers data:', error);
                document.getElementById('instances').innerHTML = 
                    '<div style="grid-column: 1/-1; text-align: center; color: white; font-size: 1.2rem; margin: 50px 0;">❌ Failed to load containers data</div>';
            }
        }

        async function checkAllStatus() {
            if (!containersData) return;

            const promises = containersData.containers.map(async (container) => {
                container.urlStatus = 'checking';
                displayContainers(); // Update UI to show checking status
                
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
                container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: white; font-size: 1.2rem; margin: 50px 0;">No containers match the current filter</div>';
                return;
            }

            container.innerHTML = filteredContainers.map(cont => createContainerCard(cont)).join('');

            // Add click handlers
            container.querySelectorAll('.instance-card').forEach(card => {
                card.addEventListener('click', function(event) {
                    // Don't trigger card click if clicking on a link
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
            
            const deployed = new Date(container.created).toLocaleString();
            const imageName = container.image;
            
            // Build version info line
            let versionInfo = '';
            if (container.branch && container.commit && container.branch_url && container.commit_url) {
                versionInfo = `<a href="${container.branch_url}" target="_blank" rel="noopener noreferrer">${container.branch}</a> | <a href="${container.commit_url}" target="_blank" rel="noopener noreferrer">${container.commit}</a>`;
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
                            <span class="info-value">${deployed}</span>
                        </div>
                        ${versionInfo ? `
                        <div class="info-row">
                            <span class="info-label">Branch/Commit:</span>
                            <span class="info-value">${versionInfo}</span>
                        </div>
                        ` : ''}
                        <div class="info-row">
                            <span class="info-label">Image:</span>
                            <span class="info-value">${imageName}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Issue URL:</span>
                            <span class="info-value">${container.issue_url ? `<a href="${container.issue_url}" target="_blank" rel="noopener noreferrer">${container.issue_url}</a>` : 'no related GH issue'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Experiment URL:</span>
                            <span class="info-value"><a href="${container.url}" target="_blank" rel="noopener noreferrer">${container.url}</a></span>
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

        // Event listeners
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
EOF

echo -e "${GREEN}✅ HTML dashboard saved to: $HTML_FILE${NC}"

echo ""
echo -e "${GREEN}🎉 Dashboard generation complete!${NC}"
echo -e "${BLUE}📋 Summary:${NC}"
echo "   • Containers found: $container_count"
echo "   • JSON data: $JSON_FILE"  
echo "   • Dashboard: $HTML_FILE"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "   1. Update CONTAINER_TAG and TAILNET_DOMAIN in this script"
echo "   2. Add this script to your deployment process"
echo "   3. Serve the generated HTML file"
echo ""
echo -e "${BLUE}🔧 To customize:${NC}"
echo "   • Edit the script variables at the top"
echo "   • Add container labels for better descriptions"
echo "   • Integrate with your CI/CD pipeline"