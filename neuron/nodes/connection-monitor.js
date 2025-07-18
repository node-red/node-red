const WebSocket = require('ws');

class ConnectionMonitor {
    constructor(nodeId, nodeType, wsPort) {
        this.nodeId = nodeId;
        this.nodeType = nodeType;
        this.wsPort = wsPort;
        this.ws = null;
        this.isConnected = false;
        this.peers = [];
        this.lastUpdate = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 5000; // 5 seconds
        this.pollingInterval = null;
        this.pollingFrequency = 5000; // 5 seconds
        this.statusCallbacks = new Set();
        this.isPolling = false;
    }

    async connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            //console.log(`ConnectionMonitor [${this.nodeId}]: Already connected`);
            return true;
        }

        return new Promise((resolve) => {
            try {
                const wsUrl = `ws://localhost:${this.wsPort}/${this.nodeType}/commands`;
                //console.log(`ConnectionMonitor [${this.nodeId}]: Connecting to ${wsUrl}`);
                
                this.ws = new WebSocket(wsUrl);
                
                this.ws.on('open', () => {
                   // console.log(`ConnectionMonitor [${this.nodeId}]: WebSocket connected`);
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.startPolling();
                    resolve(true);
                });

                this.ws.on('message', (data) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleMessage(message);
                    } catch (error) {
                        console.error(`ConnectionMonitor [${this.nodeId}]: Error parsing message:`, error);
                    }
                });

                this.ws.on('close', (code, reason) => {
                    //console.log(`ConnectionMonitor [${this.nodeId}]: WebSocket closed (${code}: ${reason})`);
                    this.isConnected = false;
                    this.stopPolling();
                    this.attemptReconnect();
                });

                this.ws.on('error', (error) => {
                    console.error(`ConnectionMonitor [${this.nodeId}]: WebSocket error:`, error.message);
                    this.isConnected = false;
                });

                // Timeout after 10 seconds
                setTimeout(() => {
                    if (!this.isConnected) {
                        console.error(`ConnectionMonitor [${this.nodeId}]: Connection timeout`);
                        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
                            this.ws.close();
                        }
                        resolve(false);
                    }
                }, 10000);

            } catch (error) {
                console.error(`ConnectionMonitor [${this.nodeId}]: Connection error:`, error.message);
                resolve(false);
            }
        });
    }

    async disconnect() {
        //console.log(`ConnectionMonitor [${this.nodeId}]: Disconnecting`);
        this.stopPolling();
        
        if (this.ws) {
            this.ws.removeAllListeners();
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close();
            }
            this.ws = null;
        }
        
        this.isConnected = false;
        this.peers = [];
        this.lastUpdate = null;
    }

    async queryPeers() {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn(`ConnectionMonitor [${this.nodeId}]: Cannot query peers - not connected`);
            return false;
        }

        if (this.isPolling) {
            //console.log(`ConnectionMonitor [${this.nodeId}]: Polling already in progress, skipping`);
            return false;
        }

        this.isPolling = true;

        try {
            const command = {
                type: "showCurrentPeers",
                data: "",
                timestamp: Date.now()
            };

            this.ws.send(JSON.stringify(command));
            //console.log(`ConnectionMonitor [${this.nodeId}]: Sent showCurrentPeers command`);
            return true;
        } catch (error) {
            console.error(`ConnectionMonitor [${this.nodeId}]: Error querying peers:`, error.message);
            this.isPolling = false;
            return false;
        }
    }

    handleMessage(message) {
        console.log(`ConnectionMonitor [${this.nodeId}]: Received message:`, message);
        
        // Handle the actual response format from Go process
        if (message.type === 'currentPeers' || message.type === 'showCurrentPeers' || Array.isArray(message)) {
            let peers = [];
            
            if (Array.isArray(message)) {
                // Direct array response
                peers = message;
            } else if (message.data && Array.isArray(message.data)) {
                // Response with data array (actual format from Go process)
                peers = message.data;
            } else if (message.type === 'currentPeers' || message.type === 'showCurrentPeers') {
                // Response with type but no data array
                peers = message.peers || [];
            }
            
            // Normalize the peer data to ensure consistent field names
            this.peers = peers.map(peer => ({
                ...peer,
                // Normalize connectionStatus to lowercase for consistency
                connectionStatus: peer.connectionStatus ? peer.connectionStatus.toLowerCase() : 'unknown',
                // Ensure we have a publicKey field
                publicKey: peer.publicKey || peer.PublicKey || 'Unknown'
            }));
            
            this.lastUpdate = new Date();
            this.isPolling = false;
            
           // console.log(`ConnectionMonitor [${this.nodeId}]: Updated peers (${this.peers.length} peers)`);
           //   console.log(`ConnectionMonitor [${this.nodeId}]: Peer details:`, this.peers.map(p => ({
              //  publicKey: p.publicKey.substring(0, 16) + '...',
            //    status: p.connectionStatus,
            //    libP2PState: p.libP2PState
            //})));
            
            // Notify all registered callbacks
            this.statusCallbacks.forEach(callback => {
                try {
                    callback(this.getStatus());
                } catch (error) {
                    console.error(`ConnectionMonitor [${this.nodeId}]: Error in status callback:`, error);
                }
            });
        } else {
            console.warn(`ConnectionMonitor [${this.nodeId}]: Unhandled message type:`, message.type);
        }
    }

    startPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        
        this.pollingInterval = setInterval(() => {
            this.queryPeers();
        }, this.pollingFrequency);
        
    // console.log(`ConnectionMonitor [${this.nodeId}]: Started polling every ${this.pollingFrequency}ms`);
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            //console.log(`ConnectionMonitor [${this.nodeId}]: Stopped polling`);
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          //  console.error(`ConnectionMonitor [${this.nodeId}]: Max reconnection attempts reached`);
            return;
        }

        this.reconnectAttempts++;
        //console.log(`ConnectionMonitor [${this.nodeId}]: Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        setTimeout(() => {
            this.connect().catch(error => {
                //console.error(`ConnectionMonitor [${this.nodeId}]: Reconnection failed:`, error.message);
            });
        }, this.reconnectDelay);
    }

    getStatus() {
        return {
            nodeId: this.nodeId,
            nodeType: this.nodeType,
            isConnected: this.isConnected,
            peers: this.peers,
            lastUpdate: this.lastUpdate,
            reconnectAttempts: this.reconnectAttempts,
            totalPeers: this.peers.length,
            connectedPeers: this.peers.filter(peer => peer.connectionStatus === 'connected').length,
            disconnectedPeers: this.peers.filter(peer => peer.connectionStatus === 'disconnected').length
        };
    }

    onStatusUpdate(callback) {
        this.statusCallbacks.add(callback);
        return () => {
            this.statusCallbacks.delete(callback);
        };
    }

    // Manual refresh method
    async refresh() {
        //console.log(`ConnectionMonitor [${this.nodeId}]: Manual refresh requested`);
        return await this.queryPeers();
    }
}

// Global connection monitor registry
const connectionMonitors = new Map();

function getConnectionMonitor(nodeId, nodeType, wsPort) {
    if (!connectionMonitors.has(nodeId)) {
        connectionMonitors.set(nodeId, new ConnectionMonitor(nodeId, nodeType, wsPort));
    }
    return connectionMonitors.get(nodeId);
}

function removeConnectionMonitor(nodeId) {
    const monitor = connectionMonitors.get(nodeId);
    if (monitor) {
        monitor.disconnect();
        connectionMonitors.delete(nodeId);
       // console.log(`ConnectionMonitor: Removed monitor for node ${nodeId}`);
    }
}

function getAllConnectionMonitors() {
    return Array.from(connectionMonitors.values());
}

function getGlobalConnectionStatus() {
    const monitors = getAllConnectionMonitors();
    const status = {
        totalNodes: monitors.length,
        connectedNodes: monitors.filter(m => m.isConnected).length,
        totalPeers: 0,
        connectedPeers: 0,
        nodes: monitors.map(m => m.getStatus())
    };

    monitors.forEach(monitor => {
        status.totalPeers += monitor.peers.length;
        status.connectedPeers += monitor.peers.filter(p => p.connectionStatus === 'connected').length;
    });

    return status;
}

module.exports = {
    ConnectionMonitor,
    getConnectionMonitor,
    removeConnectionMonitor,
    getAllConnectionMonitors,
    getGlobalConnectionStatus
}; 