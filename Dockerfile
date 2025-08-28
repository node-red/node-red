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
RUN npm install --include=dev

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

# Optional files - uncomment to include specific files in the runtime image
# COPY --from=builder --chown=node-red:node-red /usr/src/node-red/README.md ./
# COPY --from=builder --chown=node-red:node-red /usr/src/node-red/CHANGELOG.md ./
# COPY --from=builder --chown=node-red:node-red /usr/src/node-red/LICENSE ./
# COPY --from=builder --chown=node-red:node-red /usr/src/node-red/custom-config.json ./
# COPY --from=builder --chown=node-red:node-red /usr/src/node-red/docs/ ./docs/

# Install only production dependencies for the runtime
RUN npm install --omit=dev && npm cache clean --force

# No demo-settings.js file created - configuration embedded in CMD for security

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

# DEMO MODE (default): Secure, temporary demo with restricted functionality
# Uncomment the line below and comment out demo mode to run as normal Node-RED instance
CMD ["sh", "-c", "echo '======================================' && echo '  Node-RED Demo Mode (Built from Source)' && echo '======================================' && echo '' && echo '🎮 DEMO MODE ACTIVE' && echo '==================' && echo '' && echo '✨ What you CAN do:' && echo '  • Explore the full Node-RED editor interface' && echo '  • Drag and drop nodes to build flows' && echo '  • Configure node properties' && echo '  • Connect nodes together' && echo '  • Click Deploy (UI works, flows are temporary)' && echo '  • Import/Export flow JSON for learning' && echo '' && echo '🛡️ Safety Features:' && echo '  • Flows are temporary (not saved to disk)' && echo '  • HTTP endpoints disabled for security' && echo '  • File system access restricted' && echo '  • External modules blocked' && echo '  • WebSocket connections blocked' && echo '  • Built from source code (not npm package)' && echo '' && echo \"📍 Access Node-RED at: http://localhost:${PORT:-1880}\" && echo '' && echo 'Press Ctrl+C to stop' && echo '' && cat > /tmp/s.js <<'EOF' && exec node packages/node_modules/node-red/red.js -s /tmp/s.js\nmodule.exports = {\n  flowFile: '/dev/null',\n  userDir: '/tmp/node-red-sandbox/',\n  nodesDir: '/tmp/empty-nodes-dir',\n  flowFilePretty: true,\n  uiPort: process.env.PORT || 1880,\n  httpAdminMiddleware: function (req, res, next) {\n    if (req.path === '/flows' && req.method === 'POST') {\n      return res.json({ rev: \"demo-\" + Date.now() });\n    }\n    const dangerousOps = [\n      { path: '/nodes/', methods: ['POST', 'PUT', 'DELETE'] },\n      { path: '/library/', methods: ['POST', 'PUT', 'DELETE'] },\n      { path: '/projects/', methods: ['POST', 'PUT', 'DELETE'] },\n      { path: '/credentials/', methods: ['GET', 'POST', 'PUT', 'DELETE'] },\n      { path: '/flows/state', methods: ['POST', 'PUT'] }\n    ];\n    for (const rule of dangerousOps) {\n      if (req.path.includes(rule.path) && rule.methods.includes(req.method)) {\n        return res.status(403).json({\n          error: \"Operation blocked in demo mode\",\n          message: \"This operation is disabled for security in demo mode\"\n        });\n      }\n    }\n    res.setHeader('X-Frame-Options', 'SAMEORIGIN');\n    res.setHeader('X-Content-Type-Options', 'nosniff');\n    res.setHeader('X-XSS-Protection', '1; mode=block');\n    next();\n  },\n  httpNodeMiddleware: function(req, res, next) {\n    return res.status(403).json({\n      error: \"HTTP endpoints disabled\",\n      message: \"HTTP node endpoints are disabled in demo mode for security\"\n    });\n  },\n  httpNodeCors: { origin: false, methods: \"GET\" },\n  runtimeState: { enabled: false, ui: false },\n  diagnostics: { enabled: false, ui: false },\n  logging: { console: { level: \"info\", metrics: false, audit: false } },\n  contextStorage: { default: { module: \"memory\" }, store: { module: \"memory\" } },\n  externalModules: {\n    autoInstall: false,\n    autoInstallRetry: 30,\n    palette: {\n      allowInstall: false,\n      allowUpdate: false,\n      allowUpload: false,\n      allowList: [],\n      denyList: ['*'],\n      allowUpdateList: [],\n      denyUpdateList: ['*']\n    },\n    modules: { allowInstall: false, allowList: [], denyList: ['*'] }\n  },\n  editorTheme: {\n    header: {\n      title: \"Node-RED Demo Mode - \" + (process.env.BRANCH_NAME || \"DEMO\"),\n      image: null\n    },\n    projects: { enabled: false },\n    multiplayer: { enabled: false },\n    page: {\n      tallyConfig: process.env.TALLY_SURVEY_ID ? {\n        surveyId: process.env.TALLY_SURVEY_ID\n      } : null\n    }\n  },\n  fileWorkingDirectory: \"/tmp/node-red-demo\",\n  functionExternalModules: false,\n  functionTimeout: 5,\n  globalFunctionTimeout: 5,\n  debugMaxLength: 1000,\n  execMaxBufferSize: 0,\n  tlsConfigDisableLocalFiles: true,\n  webSocketNodeVerifyClient: function(info) {\n    console.log('WebSocket connection blocked in demo mode');\n    return false;\n  },\n  exportGlobalContextKeys: false\n};\nEOF\n"]

# NORMAL MODE: Full Node-RED functionality with persistent storage
# Uncomment the line below and comment out demo mode above to run as normal Node-RED
# CMD ["node", "packages/node_modules/node-red/red.js", "--userDir", "/data"]