const path = require('path');
// Load environment variables with configurable path
const envPath = process.env.NEURON_ENV_PATH || path.resolve(__dirname, '../../.env');
require('dotenv').config({
    path: envPath
});
const fs = require('fs');
const WebSocket = require('ws');
const net = require('net');
const ProcessManager = require('./process-manager.js');
const { HederaAccountService } = require('neuron-js-registration-sdk');
const { 
    initializeGlobalContractMonitoring, 
    cleanupGlobalContractMonitoring,
    getGlobalPeerCount,
    getGlobalAllDevices,
    isContractLoading,
    isMonitoringActive
} = require('./global-contract-monitor.js');
const { getConnectionMonitor, removeConnectionMonitor } = require('./connection-monitor.js');

// Create ProcessManager instance
const processManager = new ProcessManager();

// Global process tracking for cleanup (outside module.exports but needs helper from inside)
const globalProcesses = new Set();

// Placeholder for the cleanup function that will be provided by module.exports
let performCleanup = () => {
    console.log("Cleanup handler not yet initialized.");
};

// Global cleanup handler for process events (SIGINT, SIGTERM, exit)
// This must be outside module.exports to be registered directly with process
function globalProcessCleanup() {
    console.log("Global process cleanup triggered.");
    cleanupGlobalContractMonitoring(); // Cleanup contract monitoring
    performCleanup(); // Call the internally provided cleanup logic
}

process.on('SIGINT', globalProcessCleanup);
process.on('SIGTERM', globalProcessCleanup);
process.on('exit', globalProcessCleanup);


module.exports = function (RED) {
    // --- LEGACY VARIABLES CLEANUP (ProcessManager handles process management now) ---

    // --- INTERNAL CLEANUP LOGIC (accessible by globalProcessCleanup) ---
    performCleanup = () => {
        console.log('Terminating buyer processes via ProcessManager cleanup...');
        
        try {
            // Use ProcessManager's cross-platform emergency cleanup
            const ProcessManager = require('./process-manager');
            const processManager = new ProcessManager();
            
            processManager.emergencyCleanupAllProcesses().then(() => {
                console.log('Emergency cleanup completed successfully');
            }).catch(error => {
                console.error('Emergency cleanup error:', error.message);
                
                // Fallback to legacy cleanup if ProcessManager fails
                console.log("Falling back to legacy cleanup method...");
                legacyCleanup();
            });

            } catch (error) {
            console.error('Error during ProcessManager cleanup:', error.message);
            
            // Fallback to legacy cleanup
            console.log("Falling back to legacy cleanup method...");
            legacyCleanup();
        }
    };

    // Legacy cleanup function for fallback
    function legacyCleanup() {
        console.log(`Terminating ${globalProcesses.size} Go processes managed by Node-RED...`);
        globalProcesses.forEach(process => {
            try {
                if (process && !process.killed) {
                    console.log(`Sending SIGTERM to Go process (PID: ${process.pid}) for cleanup.`);
                    process.kill('SIGTERM');
                    // ProcessManager handles port management now
                }
            } catch (error) {
                console.error('Error terminating process during cleanup:', error.message);
            }
        });
        globalProcesses.clear();
    }

    // --- HELPER FUNCTIONS (moved inside module.exports) ---
    // New helper to extract public key bytes (moved inside module.exports)
    function extractPublicKeyBytes(derEncodedKey) {
        if (!derEncodedKey) {
            return null;
        }
        const buffer = Buffer.from(derEncodedKey, 'hex');

        if (buffer[0] !== 0x30) {
            console.warn('Not a valid DER sequence for public key extraction.');
            return null;
        }

        let i = 0;
        while (i < buffer.length) {
            if (buffer[i] === 0x03) { // BIT STRING tag
                const bitStringLength = buffer[i + 1];
                const unusedBits = buffer[i + 2];
                const keyStart = i + 3;
                const keyBytes = buffer.slice(keyStart, keyStart + bitStringLength - 1);
                return keyBytes.toString('hex');
            }
            i++;
        }
        console.warn('BIT STRING (public key) not found in DER for public key extraction.');
        return null;
    }

    // New helper to extract private key from DER (moved inside module.exports)
    function extractPrivateKeyFromDer(derEncodedKey) {
        if (!derEncodedKey) {
            return null;
        }
        const buffer = Buffer.from(derEncodedKey, 'hex');
        if (buffer.length >= 32) {
            return buffer.slice(buffer.length - 32).toString('hex');
        }
        console.warn("Could not extract 32-byte private key from DER. Length:", buffer.length);
        return null;
    }

    // --- ProcessManager handles all process spawning, port management, and environment setup ---

    // Initialize global contract monitoring service when module is loaded
    (async () => {
        await initializeGlobalContractMonitoring();
    })();

    // Shared HederaAccountService instance
    let hederaService;
    try {
        hederaService = new HederaAccountService({
            network: process.env.HEDERA_NETWORK || 'testnet',
            operatorId: process.env.HEDERA_OPERATOR_ID,
            operatorKey: process.env.HEDERA_OPERATOR_KEY,
            contracts: {
                "jetvision": process.env.JETVISION_CONTRACT_ID,
                "chat": process.env.CHAT_CONTRACT_ID,
                "challenges": process.env.CHALLENGES_CONTRACT_ID,
                //"radiation": process.env.RADIATION_CONTRACT_ID
            }
        });
    } catch (err) {
        console.error("Shared Hedera service initialization failed: " + err.message);
        hederaService = null;
    }

    function NeuronBuyerNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const context = this.context();
        const requiredCredentials = [
            'HEDERA_OPERATOR_ID',
            'HEDERA_OPERATOR_KEY',
           // 'HEDERA_OPERATOR_EVM',
            'JETVISION_CONTRACT_ID',
            'CHAT_CONTRACT_ID',
            'CHALLENGES_CONTRACT_ID',
            //'RADIATION_CONTRACT_ID',
            'JETVISION_CONTRACT_EVM',
            'CHAT_CONTRACT_EVM',
            'CHALLENGES_CONTRACT_EVM',
            //'RADIATION_CONTRACT_EVM'
        ];

        node.goProcess = null;

        node.on('close', function (removed, done) {
            console.log(`Closing buyer node ${node.id}.`);
            
            // Clean up connection monitor
            try {
                removeConnectionMonitor(node.id);
            } catch (error) {
                console.error(`Error cleaning up connection monitor for node ${node.id}:`, error.message);
            }
            
            if (removed) {
                // Node is being deleted - stop the process
                console.log(`Buyer node ${node.id} is being deleted - stopping process`);
                processManager.stopProcess(node.id)
                    .then(() => {
                        console.log(`Process stopped for deleted buyer node ${node.id}`);
                    done();
                    })
                    .catch(error => {
                        console.error(`Error stopping process for deleted buyer node ${node.id}:`, error.message);
                    done();
                });
            } else {
                // Node is being redeployed - preserve the process
                console.log(`Buyer node ${node.id} is being redeployed - preserving process`);
                processManager.preserveProcess(node.id);
                done();
            }
        });

        const missingCreds = requiredCredentials.filter(cred => !process.env[cred]);
        if (missingCreds.length > 0) {
            const errorMsg = `Missing environment credentials: ${missingCreds.join(', ')}. Please check your .env file.`;
            node.error(errorMsg);
            node.status({ fill: "red", shape: "ring", text: "Config error - missing credentials" });
            return;
        }

        const persistDir = path.join(__dirname, 'devices');
        const deviceFile = path.join(persistDir, `${node.id}.json`);
        if (!fs.existsSync(persistDir)) {
            try {
                fs.mkdirSync(persistDir, { recursive: true });
            } catch (err) {
                node.error(`Failed to create devices directory: ${err.message}`);
                node.status({ fill: "red", shape: "ring", text: "Dir creation failed" });
                return;
            }
        }

        (async () => {
            let loadedDeviceInfo = null;

            const contextDevice = context.get('deviceInfo');
            if (contextDevice) {
                loadedDeviceInfo = contextDevice;
                console.log(`Node ${node.id}: Device loaded from context.`);
            }

            if (!loadedDeviceInfo && fs.existsSync(deviceFile)) {
                try {
                    const rawData = fs.readFileSync(deviceFile, 'utf-8');
                    loadedDeviceInfo = JSON.parse(rawData);
                    console.log(`Node ${node.id}: Device loaded from disk.`);
                } catch (err) {
                    node.warn(`Node ${node.id}: Failed to read persisted device info from ${deviceFile}. Proceeding to create new device. Error: ${err.message}`);
                }
            }

            if (loadedDeviceInfo) {
                loadedDeviceInfo.sellerEvmAddress = config.sellerEvmAddress;
                loadedDeviceInfo.description = config.description;
                loadedDeviceInfo.deviceName = config.deviceName;
                loadedDeviceInfo.deviceRole = config.deviceRole;
                loadedDeviceInfo.serialNumber = config.serialNumber;
                loadedDeviceInfo.deviceType = config.deviceType;
                loadedDeviceInfo.price = config.price;
                node.deviceInfo = loadedDeviceInfo;
                fs.writeFileSync(deviceFile, JSON.stringify(node.deviceInfo, null, 2), 'utf-8');
                context.set('deviceInfo', node.deviceInfo);
                node.status({ fill: "green", shape: "dot", text: "Device loaded." });
            }

            if (!node.deviceInfo) {
                try {
                    node.status({ fill: "blue", shape: "dot", text: "Creating new device..." });

                    const requiredFields = {
                       // deviceName: config.deviceName,
                        smartContract: config.smartContract,
                      //  deviceRole: config.deviceRole,
                      //  serialNumber: config.serialNumber,
                        deviceType: config.deviceType,
                     //   price: config.price,
                        sellerEvmAddress: config.sellerEvmAddress
                    };
                    const missingFields = Object.entries(requiredFields)
                        .filter(([key, value]) => value == null || value === '' || (key === 'sellerEvmAddress' && JSON.parse(value || '[]').length === 0))
                        .map(([key]) => key);

                    if (missingFields.length > 0) {
                        const errorMsg = `Missing required config fields for device creation: ${missingFields.join(', ')}.`;
                        node.error(errorMsg);
                        node.status({ fill: "red", shape: "ring", text: "Config error - missing required fields" });
                        return;
                    }

                    const contracts = {
                        "jetvision": process.env.JETVISION_CONTRACT_EVM,
                        "chat": process.env.CHAT_CONTRACT_EVM,
                        "challenges": process.env.CHALLENGES_CONTRACT_EVM,
                        //"radiation": process.env.RADIATION_CONTRACT_EVM
                    };
                    const deviceRole = 'buyer';
                    const serialNumber = 'buyer device';
                    const deviceName = 'buyer device';
                    const price = Number(0);
                    let device;
                    try {

                        
                        device = await hederaService.createDeviceAccountAndTopics(
                            deviceName,
                            config.smartContract,
                            deviceRole,
                            serialNumber,
                            config.deviceType,
                            price,
                            process.env.HEDERA_OPERATOR_ID,
                            process.env.HEDERA_OPERATOR_EVM
                        );
                        console.log("createDeviceAccountAndTopics completed successfully");
                    } catch (createError) {
                        console.error("Error in createDeviceAccountAndTopics:", createError);
                        console.error("Error stack:", createError.stack);
                        node.status({ fill: "red", shape: "ring", text: "Account Creation failed" });
                        throw createError;
                    }

                    device.smartContract = contracts[config.smartContract.toLowerCase()];
                    device.extractedPrivateKey = extractPrivateKeyFromDer(device.privateKey);
                    device.description = '';
                    device.deviceName = config.deviceName;
                    device.deviceRole = deviceRole;
                    device.serialNumber = serialNumber;
                    device.deviceType = config.deviceType;
                    device.price = price;
                    device.sellerAdminKeys = [];
                    const sellerEvmAddressesArray = JSON.parse(config.sellerEvmAddress || '[]');
                    for (const sellerEvm of sellerEvmAddressesArray) {
                        try {
                            const adminKeyDer = await hederaService.getAdminKeyFromEvmAddress(sellerEvm);
                            const publicKeyBytes = extractPublicKeyBytes(adminKeyDer);
                            if (publicKeyBytes) {
                                device.sellerAdminKeys.push(publicKeyBytes);
                            } else {
                                console.warn(`Node ${node.id}: Admin public key not extracted for seller ${sellerEvm}.`);
                                device.sellerAdminKeys.push(null);
                            }
                        } catch (error) {
                            console.warn(`Node ${node.id}: Failed to get admin key for seller ${sellerEvm}: ${error.message}`);
                            device.sellerAdminKeys.push(null);
                        }
                    }

                    try {
                        let selfAdminKeyDer = await hederaService.getAdminKeyFromEvmAddress(device.evmAddress);
                        let selfPublicKeyBytes = extractPublicKeyBytes(selfAdminKeyDer);
                        device.adminAddress = selfPublicKeyBytes;
                    } catch (error) {
                        console.error(`Node ${node.id}: Failed to get self admin key from EVM address ${device.evmAddress}: ${error.message}`);
                        node.error(`Failed to set buyer's own admin address: ${error.message}`);
                        device.adminAddress = null;
                    }


                    node.deviceInfo = device;
                    context.set('deviceInfo', device);
                    fs.writeFileSync(deviceFile, JSON.stringify(device, null, 2), 'utf-8');
                    node.status({ fill: "green", shape: "dot", text: "Device created and saved." });
                    node.send({
                        payload: {
                            evmAddress: device.evmAddress,
                            publicKey: device.adminAddress,
                            accountId: device.accountId,
                            topics: device.topics,
                            privateKey: device.extractedPrivateKey,
                        }
                    });
                    // Use global contract data instead of individual calls
                    console.log(`Node ${node.id}: Using global peer count: ${getGlobalPeerCount()}`);
                    console.log(`Node ${node.id}: Global device count: ${getGlobalAllDevices().length}`);
                    if (getGlobalAllDevices().length > 0) {
                        console.log("Global devices sample:", JSON.stringify(getGlobalAllDevices().slice(0, 2)));
                    }
                    node.status({ fill: "green", shape: "dot", text: `Device created. Global peer count: ${getGlobalPeerCount()}` });

                } catch (error) {
                    node.error("Buyer device creation failed: " + error.message);
                    node.status({ fill: "red", shape: "ring", text: "Creation failed " });
                    return;
                }
            }

            if (node.deviceInfo) {
                const initialSellerEvmAddresses = JSON.parse(config.sellerEvmAddress || '[]');
                await updateSelectedSellers(node, initialSellerEvmAddresses, true); // ← Add isInitialSpawn = true
                
                console.log(`Node ${node.id}: Starting Go process via ProcessManager.`);
                
                try {
                    node.status({ fill: "blue", shape: "dot", text: "Starting process..." });
                    node.goProcess = await processManager.ensureProcess(node, node.deviceInfo, 'buyer');
                    
                    // Initialize connection monitoring after a brief delay
                    setTimeout(async () => {
                        try {
                            const connectionMonitor = getConnectionMonitor(node.id, 'buyer', node.deviceInfo.wsPort);
                            const connected = await connectionMonitor.connect();
                            
                            if (connected) {
                                // Set up status update callback to update node status
                                connectionMonitor.onStatusUpdate((status) => {
                                    if (status.isConnected) {
                                        const peerText = status.totalPeers > 0 ? ` (${status.connectedPeers}/${status.totalPeers} peers)` : ' - no peers';
                                        if(status.totalPeers > 0 && status.connectedPeers > 0) {
                                            node.status({ fill: "green", shape: "dot", text: `Connected${peerText}` });
                                        } else {
                                            node.status({ fill: "yellow", shape: "ring", text: "Connected - no peers" });
                                        }
                                    } else {
                                        node.status({ fill: "yellow", shape: "ring", text: "Connecting..." });
                                    }
                                });
                                
                                console.log(`Connection monitoring initialized for buyer node ${node.id}`);
                            } else {
                                console.warn(`WebSocket connection failed for buyer node ${node.id}`);
                                node.status({ fill: "orange", shape: "ring", text: "WebSocket failed - process running" });
                            }
                        } catch (error) {
                            console.error(`Connection monitoring failed for buyer node ${node.id}:`, error.message);
                        }
                    }, 2000); // 2 second delay
                    
                    console.log(`Node ${node.id}: Go process started successfully via ProcessManager.`);
                } catch (error) {
                    console.error(`Node ${node.id}: Error starting Go process via ProcessManager:`, error.message);
                    node.error(`Failed to start Go process for node ${node.id}: ${error.message}`);
                    node.status({ fill: "red", shape: "ring", text: "Process start failed" });
                }
            } else {
                node.error(`Node ${node.id}: No device information available to spawn process.`);
                node.status({ fill: "red", shape: "ring", text: "No device info" });
            }

        })();

        node.on('input', async function (msg) {
            try {
                msg.payload = {
                    ...msg.payload,
                    ...node.config
                };
                msg.payload.connection = "connect to neuron network";
                msg.payload.deviceInfo = node.deviceInfo;
                node.send(msg);
            } catch (error) {
                node.error("Hedera operation failed: " + error.message, msg);
            }
        });
    }

    RED.nodes.registerType('buyer config', NeuronBuyerNode);

    // Helper function to serialize BigInt values in any object structure
    function serializeBigInts(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        
        if (typeof obj === 'bigint') {
            return obj.toString();
        }
        
        if (Array.isArray(obj)) {
            return obj.map(item => serializeBigInts(item));
        }
        
        if (typeof obj === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = serializeBigInts(value);
            }
            return result;
        }
        
        return obj;
    }

    RED.httpAdmin.get('/buyer/devices', function (req, res) {
        const contract = req.query.contract || 'jetvision';
        const devices = getGlobalAllDevices(contract);
        const isLoading = isContractLoading(contract);
        const peerCount = getGlobalPeerCount(contract);
        const monitoringActive = isMonitoringActive();
        
        console.log(`/buyer/devices endpoint called for contract ${contract}. Returning ${devices.length} devices, loading: ${isLoading}`);
        
        // Use the robust BigInt serialization function
        const serializedDevices = serializeBigInts(devices);
        
        // Ensure all response values are JSON-serializable
        const response = serializeBigInts({
            contract: contract,
            devices: serializedDevices,
            loading: isLoading,
            peerCount: peerCount,
            monitoringActive: monitoringActive
        });
        
        res.json(response);
    });

    // Test endpoint to check global contract monitor status
    RED.httpAdmin.get('/buyer/test-monitor', function (req, res) {
        const contract = req.query.contract || 'jetvision';
        const devices = getGlobalAllDevices(contract);
        
        // Convert BigInt values to strings for JSON serialization
        const serializedDevices = devices.map(device => {
            const serializedDevice = { ...device };
            
            // Convert all BigInt fields to strings
            Object.keys(serializedDevice).forEach(key => {
                if (typeof serializedDevice[key] === 'bigint') {
                    serializedDevice[key] = serializedDevice[key].toString();
                }
            });
            
            return serializedDevice;
        });
        
        const status = {
            contract: contract,
            monitoringActive: isMonitoringActive(),
            peerCount: getGlobalPeerCount(contract),
            deviceCount: devices.length,
            devices: serializedDevices,
            timestamp: new Date().toISOString()
        };
        console.log(`Global contract monitor status for ${contract}:`, status);
        res.json(status);
    });

    // Global contract data endpoints for both buyer and seller nodes
    RED.httpAdmin.get('/neuron/contract/peer-count', function (req, res) {
        const contract = req.query.contract || 'jetvision';
        res.json({ contract: contract, peerCount: getGlobalPeerCount(contract) });
    });

    RED.httpAdmin.get('/neuron/contract/all-devices', function (req, res) {
        const contract = req.query.contract || 'jetvision';
        const devices = getGlobalAllDevices(contract);
        
        // Convert BigInt values to strings for JSON serialization
        const serializedDevices = devices.map(device => {
            const serializedDevice = { ...device };
            
            // Convert all BigInt fields to strings
            Object.keys(serializedDevice).forEach(key => {
                if (typeof serializedDevice[key] === 'bigint') {
                    serializedDevice[key] = serializedDevice[key].toString();
                }
            });
            
            return serializedDevice;
        });
        
        res.json({ contract: contract, devices: serializedDevices });
    });

    RED.httpAdmin.get('/neuron/contract/status', function (req, res) {
        const contract = req.query.contract || 'jetvision';
        const devices = getGlobalAllDevices(contract);
        res.json({ 
            contract: contract,
            peerCount: getGlobalPeerCount(contract), 
            deviceCount: devices.length,
            monitoringActive: isMonitoringActive(),
            lastUpdate: new Date().toISOString()
        });
    });

    // Connection status endpoints
    RED.httpAdmin.get('/buyer/connection-status/:nodeId', function (req, res) {
        const nodeId = req.params.nodeId;
        const { getConnectionMonitor } = require('./connection-monitor.js');
        
        try {
            const buyerNode = RED.nodes.getNode(nodeId);
            if (!buyerNode || buyerNode.type !== 'buyer config') {
                return res.status(404).json({ error: 'Buyer node not found' });
            }

            if (!buyerNode.deviceInfo || !buyerNode.deviceInfo.wsPort) {
                return res.status(400).json({ error: 'Node not ready - no WebSocket port available' });
            }

            const connectionMonitor = getConnectionMonitor(nodeId, 'buyer', buyerNode.deviceInfo.wsPort);
            const status = connectionMonitor.getStatus();
            
            res.json(status);
        } catch (error) {
            console.error(`Error getting connection status for buyer node ${nodeId}:`, error);
            res.status(500).json({ error: 'Failed to get connection status: ' + error.message });
        }
    });

    // Balance endpoint - Get operator account balance
    RED.httpAdmin.get('/neuron/balance', async function (req, res) {
        try {
            if (!hederaService) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'Hedera service not initialized' 
                });
            }

            const operatorId = process.env.HEDERA_OPERATOR_ID;
            if (!operatorId) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'HEDERA_OPERATOR_ID not configured' 
                });
            }

           // console.log(`Fetching balance for operator account: ${operatorId}`);
            const balanceTinybars = await hederaService.getAccountBalanceTinybars(operatorId);
            
            //console.log(`Balance retrieved: ${balanceTinybars} tinybars`);
          //  node.send({ payload: `${operatorId} balance ${balanceTinybars.toString()}` });

            res.json({
                success: true,
                balance: balanceTinybars.toString(),
                accountId: operatorId,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('Error fetching account balance:', error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch balance: ' + error.message 
            });
        }
    });

    RED.httpAdmin.post('/buyer/refresh-connections/:nodeId', function (req, res) {
        const nodeId = req.params.nodeId;
        const { getConnectionMonitor } = require('./connection-monitor.js');
        
        try {
            const buyerNode = RED.nodes.getNode(nodeId);
            if (!buyerNode || buyerNode.type !== 'buyer config') {
                return res.status(404).json({ error: 'Buyer node not found' });
            }

            if (!buyerNode.deviceInfo || !buyerNode.deviceInfo.wsPort) {
                return res.status(400).json({ error: 'Node not ready - no WebSocket port available' });
            }

            const connectionMonitor = getConnectionMonitor(nodeId, 'buyer', buyerNode.deviceInfo.wsPort);
            connectionMonitor.refresh()
                .then(() => {
                    res.json({ success: true, status: connectionMonitor.getStatus() });
                })
                .catch(error => {
                    res.status(500).json({ error: 'Failed to refresh connections: ' + error.message });
                });
        } catch (error) {
            console.error(`Error refreshing connections for buyer node ${nodeId}:`, error);
            res.status(500).json({ error: 'Failed to refresh connections: ' + error.message });
        }
    });

 

    async function updateSelectedSellers(node, newSellerEvmAddresses, isInitialSpawn = false) {
        try {
            console.log(`Updating selected sellers for buyer node: ${node.id}`);
            
            node.status({ fill: "yellow", shape: "ring", text: "Updating sellers..." });

            node.deviceInfo.sellerEvmAddress = JSON.stringify(newSellerEvmAddresses);
            node.deviceInfo.sellerAdminKeys = [];

            // Fetch admin keys for new sellers
            for (const sellerEvmAddress of newSellerEvmAddresses) {
                try {
                    let adminKey = await hederaService.getAdminKeyFromEvmAddress(sellerEvmAddress);
                    let publicKeyBytes = extractPublicKeyBytes(adminKey);
                    if (publicKeyBytes) {
                        node.deviceInfo.sellerAdminKeys.push(publicKeyBytes);
                    } else {
                        console.warn(`Node ${node.id}: Admin key extraction failed for seller ${sellerEvmAddress}.`);
                        node.deviceInfo.sellerAdminKeys.push(null);
                    }
                } catch (error) {
                    console.error(`Node ${node.id}: Failed to get admin key for seller ${sellerEvmAddress}: ${error.message}`);
                    node.warn(`Failed to get admin key for seller ${sellerEvmAddress}: ${error.message}`);
                    node.deviceInfo.sellerAdminKeys.push(null);
                }
            }

            const deviceFile = path.join(__dirname, 'devices', `${node.id}.json`);
            fs.writeFileSync(deviceFile, JSON.stringify(node.deviceInfo, null, 2), 'utf-8');

            // Only restart process if not initial spawn
            if (!isInitialSpawn) {
                try {
                    console.log(`Node ${node.id}: Starting Go process with updated sellers via ProcessManager.`);
                    node.goProcess = await processManager.ensureProcess(node, node.deviceInfo, 'buyer');
                    console.log(`Node ${node.id}: Seller update complete and new Go process spawned.`);
                    node.status({ fill: "green", shape: "dot", text: "Sellers updated & process restarted" });
                } catch (error) {
                    console.error(`Node ${node.id}: Error in updateSelectedSellers (ProcessManager spawn):`, error.message);
                    throw error;
                }
            }

            // Send seller public keys to WebSocket regardless of isInitialSpawn
            try {
                const WebSocket = require('ws');
                
                // Filter out null values from sellerAdminKeys
                const sellerPublicKeys = node.deviceInfo.sellerAdminKeys.filter(key => key !== null);
                
                if (sellerPublicKeys.length > 0) {
                    const wsUrl = `ws://localhost:${node.deviceInfo.wsPort}/buyer/commands`;
                    console.log(`Node ${node.id}: Connecting to WebSocket at ${wsUrl} to send seller public keys`);
                    
                    const ws = new WebSocket(wsUrl);
                    
                    ws.on('open', function() {
                        const message = {
                            sellerPublicKeys: sellerPublicKeys
                        };
                        
                        console.log(`Node ${node.id}: Sending seller public keys to process:`, message);
                        ws.send(JSON.stringify(message));
                        ws.close();
                    });
                    
                    ws.on('error', function(error) {
                        console.error(`Node ${node.id}: WebSocket error when sending seller keys:`, error.message);
                    });
                    
                    ws.on('close', function() {
                        console.log(`Node ${node.id}: WebSocket connection closed after sending seller keys`);
                    });
                } else {
                    console.log(`Node ${node.id}: No valid seller public keys to send`);
                }
            } catch (wsError) {
                console.error(`Node ${node.id}: Error sending seller keys via WebSocket:`, wsError.message);
                // Don't throw here - the process update was successful, WebSocket is just additional
            }

        } catch (error) {
            console.error(`Node ${node.id}: Error in updateSelectedSellers: ${error.message}`);
            node.error(`Failed to update sellers for node ${node.id}: ${error.message}`);
            node.status({ fill: "red", shape: "ring", text: "Seller update failed" });
            throw error;
        }
    }

    RED.httpAdmin.get('/buyer/device-info/:nodeId', function (req, res) {
        const nodeId = req.params.nodeId;
        console.log(`[DEBUG] Device info requested for node ID: ${nodeId}`); // Debug log
        
        try {
            const buyerNode = RED.nodes.getNode(nodeId);
            if (!buyerNode || buyerNode.type !== 'buyer config') {
                console.log(`[DEBUG] Node ${nodeId} not found or wrong type`); // Debug log
                return res.status(404).json({ error: 'Buyer node not found' });
            }

            if (!buyerNode.deviceInfo) {
                console.log(`[DEBUG] Node ${nodeId} has no deviceInfo`); // Debug log
                return res.status(400).json({ error: 'Node not initialized - no device info available' });
            }

            const response = {
                evmAddress: buyerNode.deviceInfo.evmAddress || '',
                wsPort: buyerNode.deviceInfo.wsPort || null,
                publicKey: buyerNode.deviceInfo.publicKey || '',
                initialized: !!buyerNode.deviceInfo.evmAddress,
                nodeId: nodeId // Add this for debugging
            };
            
            console.log(`[DEBUG] Returning device info for ${nodeId}:`, response); // Debug log
            res.json(response);
        } catch (error) {
            console.error(`Error getting device info for buyer node ${nodeId}:`, error);
            res.status(500).json({ error: 'Failed to get device info: ' + error.message });
        }
    });

    RED.httpAdmin.get('/buyer/device-balance/:nodeId', async function (req, res) {
        const nodeId = req.params.nodeId;
        
        try {
            const buyerNode = RED.nodes.getNode(nodeId);
            if (!buyerNode || buyerNode.type !== 'buyer config') {
                return res.status(404).json({ error: 'Buyer node not found' });
            }

            if (!buyerNode.deviceInfo || !buyerNode.deviceInfo.accountId) {
                return res.status(400).json({ error: 'Node not initialized - no account ID available' });
            }

            if (!hederaService) {
                return res.status(500).json({ error: 'Hedera service not initialized' });
            }

            const balanceTinybars = await hederaService.getAccountBalanceTinybars(buyerNode.deviceInfo.accountId);
            
            // Convert tinybars to Hbars (1 Hbar = 100,000,000 tinybars)
            const balanceHbars = (balanceTinybars / 100000000).toFixed(2);
            
            res.json({
                success: true,
                balance: balanceHbars,
                balanceTinybars: balanceTinybars.toString(),
                accountId: buyerNode.deviceInfo.accountId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`Error getting device balance for buyer node ${nodeId}:`, error);
            res.status(500).json({ error: 'Failed to get device balance: ' + error.message });
        }
    });
};