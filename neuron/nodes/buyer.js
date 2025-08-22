// Load environment variables with configurable path
require('../services/NeuronEnvironment').load();
const waitForEnvReady = require('../services/WaitForEnvReady');

const path = require('path');
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
    isMonitoringActive,
    searchDeviceInCache,
    triggerCacheUpdate
} = require('./global-contract-monitor.js');
const { getConnectionMonitor, removeConnectionMonitor } = require('./connection-monitor.js');

// At the top of the file, add a global mapping
const templateToInstanceMap = new Map();

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

    // Add this helper function near the top of the file
    function waitForHederaService(maxWaitTime = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkService = () => {
                if (hederaService) {
                    resolve(hederaService);
                } else if (Date.now() - startTime > maxWaitTime) {
                    reject(new Error('Timeout waiting for HederaService to initialize'));
                } else {
                    setTimeout(checkService, 100); // Check every 100ms
                }
            };
            checkService();
        });
    }

    // Helper function to safely parse seller EVM addresses
    function safeParseSellerAddresses(value) {
        try {
            if (!value || value === '') {
                return [];
            }
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn(`Invalid sellerEvmAddress JSON: ${value}, using empty array`);
            return [];
        }
    }

    // --- ProcessManager handles all process spawning, port management, and environment setup ---

    // Initialize global contract monitoring service when module is loaded
    (async () => {
        await initializeGlobalContractMonitoring();
    })();

    // Shared HederaAccountService instance
    let hederaService;
    let hederaServiceInitialized = false;
    let hederaServiceError = null;
    
    try {
        waitForEnvReady(() => {
            console.log("Hedera credentials loaded for buyer");

            const operatorId = process.env.HEDERA_OPERATOR_ID;
            const operatorKey = process.env.HEDERA_OPERATOR_KEY;

            if (!operatorId || !operatorKey) {
                hederaServiceError = new Error('Missing required Hedera environment variables');
                console.error("Missing required Hedera environment variables");
                return;
            }

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
                hederaServiceInitialized = true;
                console.log("HederaAccountService initialized successfully for buyer");
            } catch (error) {
                console.error("Failed to initialize HederaAccountService for buyer:", error.message);
                hederaServiceError = error;
                hederaService = null;
            }
        });
    } catch (err) {
        console.error("Shared Hedera service initialization failed: " + err.message);
        hederaServiceError = err;
        hederaService = null;
    }

    function NeuronBuyerNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        // Store template-to-instance mapping for subflow nodes
        if (this._alias) {
            // This is a subflow instance, map the template ID to this instance ID
            templateToInstanceMap.set(this._alias, this.id);
            console.log(`[DEBUG] Mapped template ID ${this._alias} to instance ID ${this.id}`);
        }

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

        const persistDir = path.join(require('../services/NeuronUserHome').load(), 'devices');
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
                    node.status({ fill: "blue", shape: "dot", text: "Creating new device. Please wait..." });

                    const requiredFields = {
                        smartContract: config.smartContract,
                        deviceType: config.deviceType,
                        sellerEvmAddress: config.sellerEvmAddress
                    };

                    // Check for basic missing fields
                    const missingFields = Object.entries(requiredFields)
                        .filter(([key, value]) => {
                            if (key === 'sellerEvmAddress') {
                                // Don't check sellerEvmAddress here, we'll do it separately
                                return false;
                            }
                            return value == null || value === '';
                        })
                        .map(([key]) => key);

                    if (missingFields.length > 0) {
                        const errorMsg = `Missing required config fields for device creation: ${missingFields.join(', ')}.`;
                        node.error(errorMsg);
                        node.status({ fill: "red", shape: "ring", text: "Config error - missing required fields" });
                        return;
                    }

                    // Specific validation for seller addresses/devices
                    let sellerDevices = [];
                    if (config.sellerDevices && Array.isArray(config.sellerDevices)) {
                        // New format - device objects
                        sellerDevices = config.sellerDevices;
                    } else {
                        // Fallback to address list
                        const sellerAddresses = safeParseSellerAddresses(config.sellerEvmAddress);
                        sellerDevices = sellerAddresses.map(addr => ({ evmAddress: addr }));
                    }

                    if (!sellerDevices || sellerDevices.length === 0) {
                        const errorMsg = `Buyer node requires at least one seller device to be configured. Please add seller devices.`;
                        node.error(errorMsg);
                        node.status({ fill: "red", shape: "ring", text: "No sellers configured" });
                        return;
                    }

                    console.log(`Node ${node.id}: Validated ${sellerDevices.length} seller device(s)`);

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
                    const sellerEvmAddressesArray = safeParseSellerAddresses(config.sellerEvmAddress);
                    
                    if (sellerEvmAddressesArray.length === 0) {
                        node.error("No valid seller addresses found during device creation");
                        node.status({ fill: "red", shape: "ring", text: "No sellers configured" });
                        return;
                    }

                    console.log(`Node ${node.id}: Processing ${sellerEvmAddressesArray.length} seller address(es) for device creation`);
                    
                    // Wait for hederaService to be ready before proceeding
                    try {
                        await waitForHederaService(5000); // Wait up to 5 seconds
                    } catch (waitError) {
                        console.error(`Node ${node.id}: Failed to initialize HederaService: ${waitError.message}`);
                        node.status({ fill: "red", shape: "ring", text: "Hedera Service failed" });
                        return;
                    }
                    
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
                  //  console.log(`Node ${node.id}: Using global peer count: ${getGlobalPeerCount()}`);
                   // console.log(`Node ${node.id}: Global device count: ${getGlobalAllDevices().length}`);
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
                const initialSellerEvmAddresses = safeParseSellerAddresses(config.sellerEvmAddress);
                
                if (initialSellerEvmAddresses.length === 0) {
                    node.warn("No seller addresses configured for initialization");
                    node.status({ fill: "yellow", shape: "ring", text: "No sellers configured" });
                } else {
                    await updateSelectedSellers(node, initialSellerEvmAddresses, true);
                    console.log(`Node ${node.id}: Initialized with ${initialSellerEvmAddresses.length} seller address(es)`);
                }

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
                                        if (status.totalPeers > 0 && status.connectedPeers > 0) {
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
                                node.send({
                                    payload: { connection: "failed"}
                                });
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
        console.log(`[DEBUG] Connection status requested for node ID: ${nodeId}`);

        try {
            let buyerNode = RED.nodes.getNode(nodeId);
            let actualNodeId = nodeId;
            
            // If not found directly, check if this is a template ID that maps to an instance
            if (!buyerNode) {
                const instanceId = templateToInstanceMap.get(nodeId);
                if (instanceId) {
                    console.log(`[DEBUG] Template ID ${nodeId} maps to instance ID ${instanceId}`);
                    buyerNode = RED.nodes.getNode(instanceId);
                    actualNodeId = instanceId;
                }
            }
            
            console.log(`[DEBUG] Using node ID: ${actualNodeId}, Found node:`, buyerNode ? buyerNode.type : 'none');
            
            if (!buyerNode || buyerNode.type !== 'buyer config') {
                console.log(`[DEBUG] Node not found or wrong type`);
                return res.status(404).json({ 
                    error: 'Buyer node not found',
                    debug: {
                        requestedId: nodeId,
                        actualNodeId: actualNodeId,
                        foundNode: buyerNode ? buyerNode.type : 'none',
                        hasMapping: templateToInstanceMap.has(nodeId)
                    }
                });
            }

            if (!buyerNode.deviceInfo || !buyerNode.deviceInfo.wsPort) {
               // console.log(`[DEBUG] Node not ready - no WebSocket port`);
                return res.status(400).json({ 
                    error: 'Node not ready - no WebSocket port available',
                    debug: {
                        hasDeviceInfo: !!buyerNode.deviceInfo,
                        hasWsPort: !!(buyerNode.deviceInfo && buyerNode.deviceInfo.wsPort)
                    }
                });
            }

            // Use actualNodeId for the connection monitor
            const connectionMonitor = getConnectionMonitor(actualNodeId, 'buyer', buyerNode.deviceInfo.wsPort);
            const status = connectionMonitor.getStatus();

            //console.log(`[DEBUG] Returning connection status for ${actualNodeId}:`, status);
            res.json(status);
            
        } catch (error) {
            console.error(`Error getting connection status for buyer node ${nodeId}:`, error);
            res.status(500).json({ error: 'Failed to get connection status: ' + error.message });
        }
    });

    // Balance endpoint - Get operator account balance
    RED.httpAdmin.get('/neuron/balance', async function (req, res) {
        try {
            const operatorId = process.env.HEDERA_OPERATOR_ID;
            if (!operatorId) {
                return res.status(500).json({
                    success: false,
                    error: 'HEDERA_OPERATOR_ID not configured'
                });
            }

            if (!hederaService) {
                return res.status(500).json({
                    success: false,
                    error: 'Hedera service not initialized for ' + operatorId
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
      //  console.log(`[DEBUG] Refresh connections requested for node ID: ${nodeId}`);

        try {
            let buyerNode = RED.nodes.getNode(nodeId);
            let actualNodeId = nodeId;
            
            // If not found directly, check if this is a template ID that maps to an instance
            if (!buyerNode) {
                const instanceId = templateToInstanceMap.get(nodeId);
                if (instanceId) {
                 //   console.log(`[DEBUG] Template ID ${nodeId} maps to instance ID ${instanceId}`);
                    buyerNode = RED.nodes.getNode(instanceId);
                    actualNodeId = instanceId;
                }
            }
            
          //  console.log(`[DEBUG] Using node ID: ${actualNodeId}, Found node:`, buyerNode ? buyerNode.type : 'none');
            
            if (!buyerNode || buyerNode.type !== 'buyer config') {
               // console.log(`[DEBUG] Node not found or wrong type`);
                return res.status(404).json({ 
                    error: 'Buyer node not found',
                    debug: {
                        requestedId: nodeId,
                        actualNodeId: actualNodeId,
                        foundNode: buyerNode ? buyerNode.type : 'none',
                        hasMapping: templateToInstanceMap.has(nodeId)
                    }
                });
            }

            if (!buyerNode.deviceInfo || !buyerNode.deviceInfo.wsPort) {
               // console.log(`[DEBUG] Node not ready - no WebSocket port`);
                return res.status(400).json({ 
                    error: 'Node not ready - no WebSocket port available',
                    debug: {
                        hasDeviceInfo: !!buyerNode.deviceInfo,
                        hasWsPort: !!(buyerNode.deviceInfo && buyerNode.deviceInfo.wsPort)
                    }
                });
            }

            // Use actualNodeId for the connection monitor
            const connectionMonitor = getConnectionMonitor(actualNodeId, 'buyer', buyerNode.deviceInfo.wsPort);
            connectionMonitor.refresh()
                .then(() => {
                    const status = connectionMonitor.getStatus();
                   // console.log(`[DEBUG] Refresh completed for ${actualNodeId}:`, status);
                    res.json({ success: true, status: status });
                })
                .catch(error => {
                    console.error(`[DEBUG] Refresh failed for ${actualNodeId}:`, error);
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

            // Wait for hederaService to be ready before proceeding
            try {
                await waitForHederaService(5000); // Wait up to 5 seconds
            } catch (waitError) {
                console.error(`Node ${node.id}: Failed to initialize HederaService in updateSelectedSellers: ${waitError.message}`);
                node.status({ fill: "red", shape: "ring", text: "Hedera Service failed" });
                return;
            }

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

            const deviceFile = path.join(require('../services/NeuronUserHome').load(), 'devices', `${node.id}.json`);
            fs.writeFileSync(deviceFile, JSON.stringify(node.deviceInfo, null, 2), 'utf-8');

            // Only restart process if not initial spawn
            if (!isInitialSpawn) {
                try {
                   // console.log(`Node ${node.id}: Starting Go process with updated sellers via ProcessManager.`);
                    node.goProcess = await processManager.ensureProcess(node, node.deviceInfo, 'buyer');
                   // console.log(`Node ${node.id}: Seller update complete and new Go process spawned.`);
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
                   // console.log(`Node ${node.id}: Connecting to WebSocket at ${wsUrl} to send seller public keys`);

                    const ws = new WebSocket(wsUrl);

                    ws.on('open', function () {
                        const message = {
                            sellerPublicKeys: sellerPublicKeys
                        };

                      //  console.log(`Node ${node.id}: Sending seller public keys to process:`, message);
                        ws.send(JSON.stringify(message));
                        ws.close();
                    });

                    ws.on('error', function (error) {
                        console.error(`Node ${node.id}: WebSocket error when sending seller keys:`, error.message);
                    });

                    ws.on('close', function () {
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

    RED.httpAdmin.get('/buyer/device-info/:nodeId', async function (req, res) {
        const nodeId = req.params.nodeId;
       // console.log(`[DEBUG] Device info requested for node ID: ${nodeId}`);

        try {
            let buyerNode = RED.nodes.getNode(nodeId);
            let actualNodeId = nodeId;
            
            // Template mapping logic
            if (!buyerNode) {
                const instanceId = templateToInstanceMap.get(nodeId);
                if (instanceId) {
                //    console.log(`[DEBUG] Template ID ${nodeId} maps to instance ID ${instanceId}`);
                    buyerNode = RED.nodes.getNode(instanceId);
                    actualNodeId = instanceId;
                }
            }
            
            if (!buyerNode || buyerNode.type !== 'buyer config') {
                return res.status(404).json({ error: 'Buyer node not found' });
            }

            if (!buyerNode.deviceInfo) {
                return res.status(400).json({ error: 'Node not initialized' });
            }

            // Get publicKey (existing code)
            let publicKey = '';
            if (buyerNode.deviceInfo.adminAddress) {
                publicKey = buyerNode.deviceInfo.adminAddress;
            }

            
            let stdInTopic = '';
            let stdOutTopic = '';
            let stdErrTopic = '';
            
            if (buyerNode.deviceInfo) {
                stdInTopic = buyerNode.deviceInfo.topics[0] || '';
                stdOutTopic = buyerNode.deviceInfo.topics[1] || '';
                stdErrTopic = buyerNode.deviceInfo.topics[2] || '';
            }
            

            const response = {
               // evmAddress: buyerNode.deviceInfo.evmAddress || '',
                evmAddress: (() => {
                    const address = buyerNode.deviceInfo.evmAddress || '';
                    return address && !address.startsWith('0x') ? `0x${address}` : address;
                })(),
                wsPort: buyerNode.deviceInfo.wsPort || null,
                publicKey: publicKey,
                 stdInTopic: stdInTopic,
                 stdOutTopic: stdOutTopic,
                stdErrTopic: stdErrTopic,
                initialized: !!buyerNode.deviceInfo.evmAddress,
                nodeId: actualNodeId,
                privateKey: buyerNode.deviceInfo.privateKey || ''
            };

            res.json(response);
        } catch (error) {
            console.error(`Error getting device info for buyer node ${nodeId}:`, error);
            res.status(500).json({ error: 'Failed to get device info: ' + error.message });
        }
    });

    RED.httpAdmin.get('/buyer/device-balance/:nodeId', async function (req, res) {
        const nodeId = req.params.nodeId;
      //  console.log(`[DEBUG] Device balance requested for node ID: ${nodeId}`);

        try {
            let buyerNode = RED.nodes.getNode(nodeId);
            let actualNodeId = nodeId;
            
            // If not found directly, check if this is a template ID that maps to an instance
            if (!buyerNode) {
                const instanceId = templateToInstanceMap.get(nodeId);
                if (instanceId) {
                 //   console.log(`[DEBUG] Template ID ${nodeId} maps to instance ID ${instanceId}`);
                    buyerNode = RED.nodes.getNode(instanceId);
                    actualNodeId = instanceId;
                }
            }
            
          //  console.log(`[DEBUG] Using node ID: ${actualNodeId}, Found node:`, buyerNode ? buyerNode.type : 'none');
            
            if (!buyerNode || buyerNode.type !== 'buyer config') {
              //  console.log(`[DEBUG] Node not found or wrong type`);
                return res.status(404).json({ 
                    error: 'Buyer node not found',
                    debug: {
                        requestedId: nodeId,
                        actualNodeId: actualNodeId,
                        foundNode: buyerNode ? buyerNode.type : 'none',
                        hasMapping: templateToInstanceMap.has(nodeId)
                    }
                });
            }

            if (!buyerNode.deviceInfo || !buyerNode.deviceInfo.accountId) {
              //  console.log(`[DEBUG] Node not initialized or no account ID`);
                return res.status(400).json({ 
                    error: 'Node not initialized - no account ID available',
                    debug: {
                        hasDeviceInfo: !!buyerNode.deviceInfo,
                        hasAccountId: !!(buyerNode.deviceInfo && buyerNode.deviceInfo.accountId)
                    }
                });
            }

            if (!hederaService) {
                return res.status(500).json({ error: 'Hedera service not initialized' });
            }

            const balanceTinybars = await hederaService.getAccountBalanceTinybars(buyerNode.deviceInfo.accountId);

            // Convert tinybars to Hbars (1 Hbar = 100,000,000 tinybars)
            const balanceHbars = (balanceTinybars / 100000000).toFixed(2);

            const response = {
                success: true,
                balance: balanceHbars,
                balanceTinybars: balanceTinybars.toString(),
                accountId: buyerNode.deviceInfo.accountId,
                timestamp: new Date().toISOString()
            };

          //  console.log(`[DEBUG] Returning balance info for ${actualNodeId}:`, response);
            res.json(response);
            
        } catch (error) {
            console.error(`Error getting device balance for buyer node ${nodeId}:`, error);
            res.status(500).json({ error: 'Failed to get device balance: ' + error.message });
        }
    });

    // Add this new endpoint for fetching devices by EVM address
    RED.httpAdmin.get('/buyer/fetch-device-by-evm/:evmAddress', async function (req, res) {
        const evmAddress = req.params.evmAddress;
        try {
            const smartContract = req.query.smartContract || 'jetvision';
            if (!smartContract) {
                return res.status(400).json({
                    success: false,
                    error: 'Smart contract not configured for buyer node'
                });
            }
            // Import global contract monitor functions
            const {
                searchDeviceInCache,
                triggerCacheUpdate
            } = require('./global-contract-monitor.js');
            // Search cache first
            let device = searchDeviceInCache(smartContract, evmAddress);
            if (!device) {
                console.log(`[DEBUG] Device not found in cache, triggering update for ${smartContract}`);
                // Trigger cache update and retry
                const updateResult = await triggerCacheUpdate(smartContract);
                if (updateResult.success) {
                    device = searchDeviceInCache(smartContract, evmAddress);
                }
            }
            if (device) {
                console.log(`[DEBUG] Device found:`, device);
                return res.json({
                    success: true,
                    device: {
                        evmAddress: device.contract,
                        deviceName: device.deviceName || 'Unknown Device',
                        deviceType: device.deviceType || 'Unknown Type',
                        stdInTopic: device.stdInTopic,
                        stdOutTopic: device.stdOutTopic,
                        stdErrTopic: device.stdErrTopic
                    }
                });
            }
            // If not found, try direct contract fetch with retry logic
            const { HederaContractService } = require('neuron-js-registration-sdk');
            const contractEVM = process.env[`${smartContract.toUpperCase()}_CONTRACT_EVM`];
            if (!contractEVM) {
                return res.json({
                    success: false,
                    error: 'Contract ID not configured for smart contract'
                });
            }
            const contractService = new HederaContractService({
                network: process.env.HEDERA_NETWORK || 'testnet',
                operatorId: process.env.HEDERA_OPERATOR_ID,
                operatorKey: process.env.HEDERA_OPERATOR_KEY,
                contractEVM
            });
            let foundDevice = null;
            let lastError = null;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    console.log(`[DEBUG] Direct contract fetch attempt ${attempt} for EVM: ${evmAddress}`);
                    const devices = await contractService.getDevicesByOwner(contractEVM,evmAddress);
                    if (devices && devices.length > 0) {
                        foundDevice = devices[0];
                        foundDevice.contract = evmAddress;
                       // console.log(`[DEBUG] Device found in contract:`, foundDevice);
                        break;
                    }
                } catch (err) {
                    lastError = err;
                 //   console.error(`[DEBUG] Direct contract fetch failed (attempt ${attempt}):`, err);
                }
                if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            if (foundDevice) {
                // Update cache for future use
                try {
                    const { globalAllDevices, globalPeerCounts, saveContractDataToCache, searchDeviceInCache } = require('./global-contract-monitor.js');
                    if (!globalAllDevices[smartContract]) globalAllDevices[smartContract] = [];
                 //   console.log(`[DEBUG] Attempting to update cache for smartContract: ${smartContract}`);
                  //  console.log(`[DEBUG] foundDevice:`, JSON.stringify(foundDevice, (key, value) => typeof value === 'bigint' ? value.toString() : value));
                    // Use the evmAddress used in getDevicesByOwner for duplicate check
                    const exists = globalAllDevices[smartContract].some(d => {
                        const dAddress = d.contract || d.evmAddress || d.address;
                        return dAddress && evmAddress && dAddress.toLowerCase() === evmAddress.toLowerCase();
                    });
                    if (!exists) {
                      //  console.log(`[DEBUG] Device not found in cache, adding to globalAllDevices[${smartContract}]`);
                        globalAllDevices[smartContract].push(foundDevice);
                        globalPeerCounts[smartContract] = globalAllDevices[smartContract].length;
                        saveContractDataToCache(smartContract);
                        // Confirm device is now in cache
                        const check = searchDeviceInCache(smartContract, evmAddress);
                       // console.log(`[DEBUG] After save, device in cache:`, check ? 'YES' : 'NO', check ? JSON.stringify(check, (key, value) => typeof value === 'bigint' ? value.toString() : value) : '');
                        // Log the cache file path
                        const { cacheFiles } = require('./global-contract-monitor.js');
                        //console.log(`[DEBUG] Cache file path:`, cacheFiles[smartContract]);
                        //console.log(`[DEBUG] Updated cache for ${smartContract} with new device`);
                    } else {
                        console.log(`[DEBUG] Device already exists in cache for ${smartContract}`);
                    }
                } catch (cacheErr) {
                    console.error(`[DEBUG] Failed to update cache after direct contract fetch:`, cacheErr);
                }
                return res.json({
                    success: true,
                    device: {
                        evmAddress: foundDevice.contract || foundDevice.evmAddress || foundDevice.address,
                        deviceName: foundDevice.deviceName || 'Unknown Device',
                        deviceType: foundDevice.deviceType || 'Unknown Type',
                        stdInTopic: foundDevice.stdInTopic,
                        stdOutTopic: foundDevice.stdOutTopic,
                        stdErrTopic: foundDevice.stdErrTopic
                    }
                });
            }
            return res.json({
                success: false,
                error: 'Device not found in smart contract'
            });
        } catch (error) {
            console.error(`[DEBUG] Error fetching device:`, error);
            res.status(500).json({
                success: false,
                error: 'Internal server error: ' + error.message
            });
        }
    });

    // Simplified endpoint with correct timestamp field
    RED.httpAdmin.get('/buyer/last-seen/:topicId', async function (req, res) {
        const topicId = req.params.topicId;
        
        console.log(`[DEBUG] Last seen requested for topic: ${topicId}`);
        
        try {
            if (!hederaService) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'Hedera service not initialized' 
                });
            }
            
            // Fetch the last topic message
            const messages = await hederaService.getTopicMessages(topicId, 1, 1, "desc");
            
            if (messages && messages.length > 0) {
                const lastMessage = messages[0];
                
                // Handle timestamp format: '1753899626.468846000'
                // This is Unix timestamp in seconds with nanosecond precision
                const timestampString = lastMessage.timestamp;
                console.log(`[DEBUG] Raw timestamp: ${timestampString}`);
                
                // Parse the timestamp string as a float (seconds.nanoseconds)
                const timestampSeconds = parseFloat(timestampString);
                
                // Convert to milliseconds for JavaScript Date comparison
                const lastSeenTime = timestampSeconds * 1000;
                
                // Get current time in milliseconds
                const now = Date.now();
                
                // Calculate seconds ago
                const millisecondsAgo = now - lastSeenTime;
                const secondsAgo = Math.floor(millisecondsAgo / 1000);
                
                console.log(`[DEBUG] Timestamp: ${timestampString}, LastSeenTime: ${lastSeenTime}ms, Now: ${now}ms, SecondsAgo: ${secondsAgo}`);
                
                res.json({
                    success: true,
                    lastSeen: secondsAgo,
                    lastSeenFormatted: formatLastSeen(secondsAgo),
                    timestamp: timestampString
                });
            } else {
                res.json({
                    success: true,
                    lastSeen: null,
                    lastSeenFormatted: 'Never',
                    timestamp: null
                });
            }
            
        } catch (error) {
            console.error(`Error getting last seen for topic ${topicId}:`, error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to get last seen: ' + error.message 
            });
        }
    });

    // Helper function to format last seen time
    function formatLastSeen(seconds) {
        if (seconds === null || seconds === undefined) return 'Never';
        
        // Handle negative values (future timestamps - shouldn't happen but just in case)
        if (seconds < 0) return 'Just now';
        
        if (seconds < 60) {
            return `${seconds}s ago`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes}m ago`;
        } else if (seconds < 86400) {
            const hours = Math.floor(seconds / 3600);
            return `${hours}h ago`;
        } else {
            const days = Math.floor(seconds / 86400);
            return `${days}d ago`;
        }
    }

    // Add endpoint to convert EVM address to public key
    RED.httpAdmin.get('/buyer/evm-to-publickey/:evmAddress', async function (req, res) {
        const evmAddress = req.params.evmAddress;
        
       // console.log(`[DEBUG] EVM to public key conversion requested for: ${evmAddress}`);
        
        try {
            if (!hederaService) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'Hedera service not initialized' 
                });
            }
            
            // Get admin key from EVM address and extract public key
            const adminKeyDer = await hederaService.getAdminKeyFromEvmAddress(evmAddress);
            const publicKeyBytes = extractPublicKeyBytes(adminKeyDer);
            
            if (publicKeyBytes) {
                console.log(`[DEBUG] Successfully converted ${evmAddress} to public key: ${publicKeyBytes}`);
                res.json({
                    success: true,
                    evmAddress: evmAddress,
                    publicKey: publicKeyBytes
                });
            } else {
                console.log(`[DEBUG] Failed to extract public key from ${evmAddress}`);
                res.json({
                    success: false,
                    error: 'Could not extract public key from EVM address'
                });
            }
            
        } catch (error) {
            console.error(`[DEBUG] Error converting EVM to public key for ${evmAddress}:`, error);
            res.status(500).json({ 
                success: false, 
                error: 'Failed to convert EVM to public key: ' + error.message 
            });
        }
    });
    
    // Check Device File Exists endpoint - Check if device file exists for the given node
    RED.httpAdmin.get('/buyer/device-exists/:nodeId', function (req, res) {
        const nodeId = req.params.nodeId;
        
        try {
            const persistDir = path.join(require('../services/NeuronUserHome').load(), 'devices');
            const deviceFile = path.join(persistDir, `${nodeId}.json`);
            
            const exists = fs.existsSync(deviceFile);
            console.log(`[DEVICE EXISTS] Check for node ${nodeId}: ${exists ? 'found' : 'not found'}`);
            
            res.json({
                success: true,
                exists: exists
            });
            
        } catch (error) {
            console.error(`[DEVICE EXISTS] Error checking device file for node ${nodeId}:`, error);
            res.status(500).json({
                success: false,
                error: `Failed to check device file: ${error.message}`
            });
        }
    });
};