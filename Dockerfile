FROM node:18-alpine

# Install git and other necessary packages for Node-RED
RUN apk add --no-cache git python3 make g++

WORKDIR /usr/src/node-red

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies (matching original docker-compose)
RUN npm install

# Copy ALL source code including demo configuration files
COPY . .

# Build the application (all build artifacts stay in image)
RUN npm run build

# Create temp directories for sandbox mode
RUN mkdir -p /tmp/node-red-sandbox /tmp/node-red-demo /tmp/empty-nodes-dir

# Set ownership for the node user
RUN chown -R node:node /usr/src/node-red /tmp/node-red-sandbox /tmp/node-red-demo /tmp/empty-nodes-dir

# Switch to non-root user
USER node

# Environment variables that match current setup
ENV NODE_PATH=/usr/src/node-red/node_modules
ENV FLOWS=flows.json

EXPOSE 1880

# Use the existing demo startup script that includes:
# - user-settings.js with all sandbox security  
# - start-demo.sh with sandbox environment setup
CMD ["/bin/sh", "start-demo.sh"]