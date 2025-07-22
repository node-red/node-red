const WebSocket = require('ws');

module.exports = function(RED) {
    function NeuronP2PNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.selectedNodeId = config.selectedNode;
        
        // Connection state
        let ws = null;
        let currentUrl = '';
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        const reconnectDelay = 2000;

        // Debug flag - set to true to enable verbose logging
        const DEBUG = true;

        function logDebug(...args) {
            if (DEBUG) {
                console.log('[P2P-DEBUG]', ...args);
            }
        }

        // Helper function to convert full node type names to simplified WebSocket endpoint names
        function getWebSocketNodeType(fullNodeType) {
            if (fullNodeType === 'buyer config') {
                return 'buyer';
            } else if (fullNodeType === 'seller config') {
                return 'seller';
            }
            // Fallback for any unexpected types
            return fullNodeType;
        }

        function getTargetInfo() {
            try {
                logDebug('Looking for target node with ID:', node.selectedNodeId);
                
                if (!node.selectedNodeId) {
                    throw new Error('No target node selected. Please edit the node and select a buyer or seller node.');
                }
                
                const targetNode = RED.nodes.getNode(node.selectedNodeId);
                if (!targetNode) {
                    throw new Error(`Target node not found (ID: ${node.selectedNodeId}). The selected node may have been deleted or the node configuration is corrupted.`);
                }
                
                logDebug('Found target node:', { id: targetNode.id, type: targetNode.type, name: targetNode.name });
                
                if (!targetNode.deviceInfo) {
                    throw new Error(`Target node missing deviceInfo (ID: ${node.selectedNodeId}). The selected node may not be fully initialized yet.`);
                }
                if (!targetNode.deviceInfo.wsPort) {
                    throw new Error(`Target node missing wsPort in deviceInfo (ID: ${node.selectedNodeId}). The selected node may not be running.`);
                }
                
                const info = {
                    wsPort: targetNode.deviceInfo.wsPort,
                    nodeType: getWebSocketNodeType(targetNode.type), // Convert to simplified type
                    fullNodeType: targetNode.type, // Keep original for other logic
                    publicKey: targetNode.deviceInfo.publicKey
                };
                
                logDebug('Target info:', info);
                return info;
            } catch (err) {
                logDebug('Error getting target info:', err.message);
                throw err;
            }
        }

        function connect() {
            if (ws) {
                logDebug('Cleaning up previous connection');
                ws.removeAllListeners();
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            }

            try {
                const { wsPort, nodeType } = getTargetInfo();
                currentUrl = `ws://localhost:${wsPort}/${nodeType}/p2p`;
                logDebug('Attempting connection to:', currentUrl);
                
                node.status({ fill: "yellow", shape: "ring", text: "Connecting..." });
                
                ws = new WebSocket(currentUrl);
                reconnectAttempts = 0;

                ws.on('open', () => {
                    logDebug('WebSocket connection established');
                    node.status({ fill: "green", shape: "dot", text: "Connected" });
                    node.log(`Connected to ${currentUrl}`);
                });

                ws.on('message', (data) => {
                    try {
                        logDebug('Raw message received:', data);
                        const msg = JSON.parse(data);
                        logDebug('Parsed message:', msg);
                        
                        // Enhanced message validation
                        if (typeof msg !== 'object' || msg === null) {
                            throw new Error('Invalid message format - not an object');
                        }
                        
                        const outputMsg = {
                            topic: 'incoming',
                            payload: msg.data || msg.payload || msg.message,
                            publicKey: msg.publicKey || msg.from,
                            timestamp: msg.timestamp || Date.now(),
                            raw: msg // Include original message for debugging
                        };
                        
                        logDebug('Sending to output:', outputMsg);
                        node.send(outputMsg);
                        
                    } catch (e) {
                        const errorMsg = `Error processing message: ${e.message}`;
                        logDebug(errorMsg, data);
                        node.error(errorMsg, { payload: data.toString() });
                    }
                });

                ws.on('close', (code, reason) => {
                    logDebug(`Connection closed (code: ${code}, reason: ${reason})`);
                    if (reconnectAttempts < maxReconnectAttempts) {
                        const attemptText = `Reconnecting (${reconnectAttempts+1}/${maxReconnectAttempts})`;
                        node.status({ fill: "yellow", shape: "ring", text: attemptText });
                        logDebug(attemptText);
                        setTimeout(connect, reconnectDelay);
                        reconnectAttempts++;
                    } else {
                        node.status({ fill: "red", shape: "ring", text: "Disconnected" });
                       // node.error(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
                    }
                });

                ws.on('error', (err) => {
                    logDebug('WebSocket error:', err);
                   // node.error('WebSocket error', err);
                });

            } catch (err) {
                logDebug('Connection error:', err);
                // Provide more specific error messages based on the error type
                let statusText = "Connection failed";
                if (err.message.includes('Target node not found')) {
                    statusText = "Node not found";
                } else if (err.message.includes('No target node selected')) {
                    statusText = "No node selected";
                } else if (err.message.includes('missing deviceInfo')) {
                    statusText = "Node not initialized";
                } else if (err.message.includes('missing wsPort')) {
                    statusText = "Node not running";
                }
                node.status({ fill: "red", shape: "ring", text: statusText });

                if (reconnectAttempts < 30) {
                    reconnectAttempts++;
                    logDebug(`Retrying getTargetInfo in ${reconnectDelay}ms (attempt ${reconnectAttempts}/30)`);
                    node.status({ fill: "yellow", shape: "ring", text: `Retrying getTargetInfo in ${reconnectDelay}ms (attempt ${reconnectAttempts}/30)` });
                    setTimeout(connect, reconnectDelay);
                } else {
                    logDebug("Max retry attempts reached. Giving up.");
                }

            }
        }

        // Initial connection attempt
        if (node.selectedNodeId) {
            logDebug('Initializing with node ID:', node.selectedNodeId);
            try {
                connect();
            } catch (err) {
                logDebug('Failed to initialize connection:', err.message);
                node.status({ fill: "red", shape: "ring", text: "Node not found" });
            }
        } else {
            node.status({ fill: "red", shape: "ring", text: "No node selected" });
        }

        node.on('input', function(msg) {
            logDebug('Input message received:', msg);
            
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                const errorMsg = 'No active connection - cannot send message';
                logDebug(errorMsg);
               // node.error(errorMsg);
                node.status({ fill: "red", shape: "ring", text: "No connection" });
                return;
            }

            try {
                const { publicKey: senderKey } = getTargetInfo();
                const targetNode = RED.nodes.getNode(node.selectedNodeId);
                const targetKey = msg.to || msg.publicKey;
                
                if (!targetKey) {
                    // Broadcast to all available peers based on node type
                    const nodeType = targetNode.type; // 'buyer config' or 'seller config'
                    const adminKeys = nodeType === 'buyer config' 
                        ? targetNode.deviceInfo.sellerAdminKeys 
                        : targetNode.deviceInfo.buyerAdminKeys;
                    
                    logDebug('Broadcast debug info:', {
                        nodeType: nodeType,
                        adminKeys: adminKeys,
                        adminKeysLength: adminKeys ? adminKeys.length : 'undefined',
                        sellerAdminKeys: targetNode.deviceInfo.sellerAdminKeys,
                        buyerAdminKeys: targetNode.deviceInfo.buyerAdminKeys
                    });
                    
                    if (adminKeys && adminKeys.length > 0) {
                        const availablePeers = adminKeys.filter(key => key !== null && key !== undefined);
                        
                        if (availablePeers.length > 0) {
                            node.status({ fill: "yellow", shape: "ring", text: `Broadcasting to ${availablePeers.length} ${nodeType === 'buyer config' ? 'sellers' : 'buyers'}...` });
                            
                            // Send message to all available peers
                            availablePeers.forEach((peerKey, index) => {
                                const payload = JSON.stringify(msg.payload || msg.message || msg.data || '');
                                const message = {
                                    type: msg.type || 'p2p',
                                    data: payload,
                                    timestamp: msg.timestamp || Date.now(),
                                    publicKey: peerKey,
                                   // sender: senderKey
                                };

                                logDebug(`Broadcasting to peer ${index + 1}/${availablePeers.length}:`, peerKey);
                                
                                ws.send(JSON.stringify(message), (err) => {
                                    if (err) {
                                        logDebug(`Broadcast to peer ${index + 1} failed:`, err);
                                        node.warn(`Failed to send to peer ${index + 1}: ${err.message}`);
                                    } else {
                                        logDebug(`Broadcast to peer ${index + 1} successful`);
                                        logDebug("message", message);
                                    }
                                });
                            });
                            
                            // Update status after sending to all peers
                            setTimeout(() => {
                                if (ws && ws.readyState === WebSocket.OPEN) {
                                    node.status({ fill: "green", shape: "dot", text: `Broadcast sent to ${availablePeers.length} peers` });
                                }
                            }, 1000);
                            
                        } else {
                            node.status({ fill: "red", shape: "ring", text: `No available ${nodeType === 'buyer config' ? 'sellers' : 'buyers'}` });
                            node.error(`No available ${nodeType === 'buyer config' ? 'sellers' : 'buyers'} to broadcast to`);
                        }
                    } else {
                        node.status({ fill: "red", shape: "ring", text: `No ${nodeType === 'buyer config' ? 'sellers' : 'buyers'} configured` });
                        node.error(`No ${nodeType === 'buyer config' ? 'sellers' : 'buyers'} configured for broadcasting`);
                    }
                    return; // Exit early for broadcast
                }
                
                // Original single-target logic
                const payload = JSON.stringify(msg.payload || msg.message || msg.data || '');
                const message = {
                    type: msg.type || 'p2p',
                    data: payload,
                    timestamp: msg.timestamp || Date.now(),
                    publicKey: targetKey,
                    sender: senderKey
                };

                logDebug('Preparing to send message:', message);
                
                ws.send(JSON.stringify(message), (err) => {
                    if (err) {
                        logDebug('Message send error:', err);
                        node.error('Send failed', err);
                        node.status({ fill: "red", shape: "ring", text: "Send failed" });
                    } else {
                        logDebug('Message sent successfully');
                        node.status({ fill: "green", shape: "dot", text: "Message sent" });
                        setTimeout(() => {
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                node.status({ fill: "green", shape: "dot", text: "Connected" });
                            }
                        }, 2000);
                    }
                });
            } catch (err) {
                logDebug('Message processing error:', err);
                node.error('Message processing error', err);
            }
        });

        node.on('close', function() {
            logDebug('Node closing - cleaning up');
            if (ws) {
                ws.removeAllListeners();
                ws.close();
            }
            node.status({});
        });
    }

    RED.nodes.registerType('neuron-p2p', NeuronP2PNode);
};