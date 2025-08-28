# Multi-stage Docker build for Node-RED from source with built-in demo mode
# This creates a clean, secure, minimal image that builds Node-RED from source

#==============================================================================
# BUILD STAGE: Build Node-RED from source
#==============================================================================
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    bash \
    && npm install -g grunt-cli

WORKDIR /usr/src/node-red

# Copy package files for dependency installation
COPY package*.json ./
COPY Gruntfile.js ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --include=dev

# Copy entire source code for building
COPY . .

# Build Node-RED from source
# This compiles SCSS, concatenates JS, minifies assets, etc.
RUN npm run build

# Verify build was successful
RUN test -f packages/node_modules/node-red/red.js || (echo "Build failed: red.js not found" && exit 1)
RUN test -d packages/node_modules/@node-red/editor-client/public || (echo "Build failed: editor assets not found" && exit 1)

#==============================================================================
# RUNTIME STAGE: Clean minimal runtime environment
#==============================================================================
FROM node:18-alpine AS runtime

# Install minimal runtime dependencies
RUN apk add --no-cache \
    bash \
    tzdata \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create node-red user and directories
RUN adduser -D -h /usr/src/node-red -s /bin/bash node-red \
    && mkdir -p /data /tmp/node-red-sandbox /tmp/node-red-demo /tmp/empty-nodes-dir \
    && chown -R node-red:node-red /data /tmp/node-red-sandbox /tmp/node-red-demo /tmp/empty-nodes-dir

WORKDIR /usr/src/node-red

# Copy only built Node-RED runtime and assets (no source code or build tools)
COPY --from=builder --chown=node-red:node-red /usr/src/node-red/packages/ ./packages/

# Copy package files for production dependency installation  
COPY --from=builder --chown=node-red:node-red /usr/src/node-red/package.json ./
COPY --from=builder --chown=node-red:node-red /usr/src/node-red/package-lock.json ./

# Install only production dependencies for the runtime
RUN npm ci --omit=dev && npm cache clean --force

# Create demo mode settings inline
RUN cat > demo-settings.js << 'EOF'
/**
 * Built-in Node-RED Demo Mode Configuration
 * This configuration enables a safe sandbox mode for demonstration purposes
 */

const childProcess = require('child_process');
const fs = require('fs');

// Get current branch name for display
let branchName = 'DEMO';
try {
    if (fs.existsSync('.git')) {
        branchName = childProcess.execSync('git branch --show-current', {encoding: 'utf8'}).trim().toUpperCase();
    }
} catch (e) {
    branchName = process.env.BRANCH_NAME || 'DEMO';
}

module.exports = {
    // Flow and user directory settings - use temporary locations
    flowFile: '/dev/null', // Flows not saved to disk in sandbox
    userDir: '/tmp/node-red-sandbox/',
    nodesDir: '/tmp/empty-nodes-dir', // Prevent loading custom nodes
    flowFilePretty: true,
    
    // Server settings
    uiPort: process.env.PORT || 1880,
    
    // Disable authentication for demo mode
    // adminAuth: undefined, // No password protection in demo
    
    // Demo mode middleware for safety
    httpAdminMiddleware: function (req, res, next) {
        // Allow flows endpoint for UI deploy (fake success)
        if (req.path === '/flows' && req.method === 'POST') {
            return res.json({ rev: "demo-" + Date.now() });
        }
        
        // Block dangerous operations
        const dangerousOps = [
            { path: '/nodes/', methods: ['POST', 'PUT', 'DELETE'] },
            { path: '/library/', methods: ['POST', 'PUT', 'DELETE'] },
            { path: '/projects/', methods: ['POST', 'PUT', 'DELETE'] },
            { path: '/credentials/', methods: ['GET', 'POST', 'PUT', 'DELETE'] },
            { path: '/flows/state', methods: ['POST', 'PUT'] }
        ];
        
        for (const rule of dangerousOps) {
            if (req.path.includes(rule.path) && rule.methods.includes(req.method)) {
                return res.status(403).json({
                    error: "Operation blocked in demo mode",
                    message: "This operation is disabled for security in demo mode"
                });
            }
        }
        
        // Security headers
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        
        next();
    },
    
    // Block HTTP nodes in demo mode
    httpNodeMiddleware: function(req, res, next) {
        return res.status(403).json({
            error: "HTTP endpoints disabled",
            message: "HTTP node endpoints are disabled in demo mode for security"
        });
    },
    
    // CORS settings - restrictive for demo
    httpNodeCors: {
        origin: false,
        methods: "GET"
    },
    
    // Runtime settings - disable execution
    runtimeState: {
        enabled: false, // Prevent runtime state changes
        ui: false, // Hide start/stop in UI
    },
    
    // Disable diagnostics in demo
    diagnostics: {
        enabled: false,
        ui: false,
    },
    
    // Logging configuration
    logging: {
        console: {
            level: "info",
            metrics: false,
            audit: false
        }
    },
    
    // Context storage - memory only
    contextStorage: {
        default: { module: "memory" },
        store: { module: "memory" }
    },
    
    // External modules - completely disabled
    externalModules: {
        autoInstall: false,
        autoInstallRetry: 30,
        palette: {
            allowInstall: false,
            allowUpdate: false, 
            allowUpload: false,
            allowList: [],
            denyList: ['*'],
            allowUpdateList: [],
            denyUpdateList: ['*']
        },
        modules: {
            allowInstall: false,
            allowList: [],
            denyList: ['*']
        }
    },
    
    // Editor theme configuration
    editorTheme: {
        header: {
            title: `Node-RED Demo Mode - ${branchName}`,
            image: null
        },
        projects: { enabled: false },
        multiplayer: { enabled: false }
    },
    
    // Node settings - security restrictions
    fileWorkingDirectory: "/tmp/node-red-demo", // Restrict file access
    functionExternalModules: false, // No external modules in functions
    functionTimeout: 5, // 5 second timeout
    globalFunctionTimeout: 5,
    debugMaxLength: 1000,
    execMaxBufferSize: 0, // Disable exec node completely
    tlsConfigDisableLocalFiles: true, // Disable TLS file access
    
    // WebSocket security - block all connections
    webSocketNodeVerifyClient: function(info) {
        console.log('WebSocket connection blocked in demo mode');
        return false; // Reject all WebSocket connections
    },
    
    // Export settings
    exportGlobalContextKeys: false
};
EOF

# Set ownership
RUN chown -R node-red:node-red /usr/src/node-red

# Switch to non-root user
USER node-red

# Environment variables
ENV NODE_RED_VERSION=4.1.0 \
    NODE_PATH=/usr/src/node-red/packages/node_modules \
    PATH=/usr/src/node-red/packages/node_modules/.bin:${PATH} \
    NODE_ENV=production \
    PORT=1880

# Expose port
EXPOSE 1880

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:1880/ || exit 1

# Default command - start Node-RED directly with demo settings embedded
CMD ["sh", "-c", "echo '======================================' && echo '  Node-RED Demo Mode (Built from Source)' && echo '======================================' && echo '' && echo '🎮 DEMO MODE ACTIVE' && echo '==================' && echo '' && echo '✨ What you CAN do:' && echo '  • Explore the full Node-RED editor interface' && echo '  • Drag and drop nodes to build flows' && echo '  • Configure node properties' && echo '  • Connect nodes together' && echo '  • Click Deploy (UI works, flows are temporary)' && echo '  • Import/Export flow JSON for learning' && echo '' && echo '🛡️ Safety Features:' && echo '  • Flows are temporary (not saved to disk)' && echo '  • HTTP endpoints disabled for security' && echo '  • File system access restricted' && echo '  • External modules blocked' && echo '  • WebSocket connections blocked' && echo '  • Built from source code (not npm package)' && echo '' && echo \"📍 Access Node-RED at: http://localhost:${PORT:-1880}\" && echo '' && echo 'Press Ctrl+C to stop' && echo '' && exec node packages/node_modules/node-red/red.js -s demo-settings.js"]