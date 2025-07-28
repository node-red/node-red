// Load environment variables with configurable path
require('../services/NeuronEnvironment').load();
const waitForEnvReady = require('../services/WaitForEnvReady');
const path = require('path');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const WebSocket = require('ws');
const net = require('net');
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
const ProcessManager = require('./process-manager.js');

// Global process manager instance
const processManager = new ProcessManager();

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
    // --- INTERNAL CLEANUP LOGIC (accessible by globalProcessCleanup) ---
    function performCleanup() {
        // console.log('Terminating seller processes via ProcessManager cleanup...');

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
    }

    // Legacy cleanup method as fallback
    function legacyCleanup() {
        const { exec } = require('child_process');

        console.log("Attempting legacy cleanup of 'go run . --port=' processes...");

        // Cross-platform process cleanup (legacy method)
        const isWindows = process.platform === 'win32';
        const killCommand = isWindows
            ? 'taskkill /F /IM go.exe'  // Windows: Force kill all go.exe processes
            : "pkill -f 'go run . --port='";  // Unix/Linux: Kill processes matching the pattern

        exec(killCommand, (error, stdout, stderr) => {
            if (error) {
                if (isWindows && error.message.includes('not found')) {
                    console.log('No additional Go processes found to terminate via taskkill.');
                } else if (!isWindows && error.message.includes('No processes found')) {
                    console.log('No additional Go processes found to terminate via pkill.');
                } else {
                    console.warn(`Legacy cleanup error (likely no matching processes): ${error.message}`);
                }
            } else {
                const command = isWindows ? 'taskkill' : 'pkill';
                console.log(`Additional Go processes terminated via legacy ${command}.`);
            }
        });
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

    // Initialize global contract monitoring service when module is loaded
    (async () => {
        await initializeGlobalContractMonitoring();
    })();

    // Check if global contract monitoring is available (shared with buyer.js)
    //console.log('Seller module loaded. Global peer count:', getGlobalPeerCount());
    //console.log('Seller module loaded. Global device count:', getGlobalAllDevices().length);

    // Modify the hederaService initialization section:
    
    // Shared HederaAccountService instance
    let hederaService;
    let hederaServiceInitialized = false;
    let hederaServiceError = null;
    
    try {
        waitForEnvReady(() => {
            console.log("Hedera credentials loaded for seller");

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
                console.log("HederaAccountService initialized successfully for seller");
            } catch (error) {
                console.error("Failed to initialize HederaAccountService for seller:", error.message);
                hederaServiceError = error;
                hederaService = null;
            }
        });
    } catch (err) {
        console.error("Shared Hedera service initialization failed: " + err.message);
        hederaServiceError = err;
        hederaService = null;
    }

    // Update the waitForHederaService function:
    function waitForHederaService(maxWaitTime = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkService = () => {
                if (hederaServiceError) {
                    reject(hederaServiceError);
                } else if (hederaServiceInitialized && hederaService) {
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

    function NeuronSellerNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        const context = this.context();
        const requiredCredentials = [
            'HEDERA_OPERATOR_ID',
            'HEDERA_OPERATOR_KEY',
            //  'HEDERA_OPERATOR_EVM',
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
            //console.log(`Closing seller node ${node.id}, removed: ${removed}`);

            // Clean up connection monitor
            try {
                removeConnectionMonitor(node.id);
            } catch (error) {
                console.error(`Error cleaning up connection monitor for node ${node.id}:`, error.message);
            }

            if (removed) {
                // Node is being deleted - stop the process
                // console.log(`Seller node ${node.id} is being deleted - stopping process`);
                processManager.stopProcess(node.id)
                    .then(() => {
                        console.log(`Process stopped for deleted seller node ${node.id}`);
                        done();
                    })
                    .catch(error => {
                        console.error(`Error stopping process for deleted seller node ${node.id}:`, error.message);
                        done();
                    });
            } else {
                // Node is being redeployed - preserve the process
                console.log(`Seller node ${node.id} is being redeployed - preserving process`);
                processManager.preserveProcess(node.id);
                done();
            }
        });

        const missingCreds = requiredCredentials.filter(cred => !process.env[cred]);
        if (missingCreds.length > 0) {
            const errorMsg = `Missing environment credentials: ${missingCreds.join(', ')}. Please check your .env file.`;
            node.error(errorMsg);
            node.status({ fill: "red", shape: "ring", text: "Config error" });
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
                loadedDeviceInfo.buyerEvmAddress = config.buyerEvmAddress;
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
                        deviceName: config.deviceName,
                        smartContract: config.smartContract,
                        deviceRole: config.deviceRole,
                        serialNumber: config.serialNumber,
                        deviceType: config.deviceType,
                        price: config.price,
                        //buyerEvmAddress: config.buyerEvmAddress
                    };
                    const missingFields = Object.entries(requiredFields)
                        .filter(([key, value]) => value == null || value === '' || (key === 'buyerEvmAddress' && JSON.parse(value || '[]').length === 0))
                        .map(([key]) => key);

                    if (missingFields.length > 0) {
                        const errorMsg = `Missing required config fields for device creation: ${missingFields.join(', ')}.`;
                        node.error(errorMsg);
                        node.status({ fill: "red", shape: "ring", text: "Config error" });
                        return;
                    }

                    const contracts = {
                        "jetvision": process.env.JETVISION_CONTRACT_EVM,
                        "chat": process.env.CHAT_CONTRACT_EVM,
                        "challenges": process.env.CHALLENGES_CONTRACT_EVM,
                        //"radiation": process.env.RADIATION_CONTRACT_EVM
                    };

                    let device;
                    try {
                        device = await hederaService.createDeviceAccountAndTopics(
                            config.deviceName,
                            config.smartContract,
                            config.deviceRole,
                            config.serialNumber,
                            config.deviceType,
                            Number(config.price),
                            process.env.HEDERA_OPERATOR_ID,
                            process.env.HEDERA_OPERATOR_EVM
                        );
                        console.log("createDeviceAccountAndTopics completed successfully");
                    } catch (createError) {
                        console.error("Error in createDeviceAccountAndTopics:", createError);
                        console.error("Error stack:", createError.stack);
                        throw createError;
                    }


                    device.smartContract = contracts[config.smartContract.toLowerCase()];
                    device.extractedPrivateKey = extractPrivateKeyFromDer(device.privateKey);
                    device.description = config.description;
                    device.deviceName = config.deviceName;
                    device.deviceRole = config.deviceRole;
                    device.serialNumber = config.serialNumber;
                    device.deviceType = config.deviceType;
                    device.price = config.price;

                    device.buyerAdminKeys = [];
                    const buyerEvmAddressesArray = JSON.parse(config.buyerEvmAddress || '[]');
                    
                    // Wait for hederaService to be ready before proceeding
                    try {
                        await waitForHederaService(5000); // Wait up to 5 seconds
                    } catch (waitError) {
                        console.error(`Node ${node.id}: Failed to initialize HederaService: ${waitError.message}`);
                        node.status({ fill: "red", shape: "ring", text: "Hedera Service failed" });
                        return;
                    }
                    
                    for (const buyerEvm of buyerEvmAddressesArray) {
                        try {
                            const adminKeyDer = await hederaService.getAdminKeyFromEvmAddress(buyerEvm);
                            const publicKeyBytes = extractPublicKeyBytes(adminKeyDer);
                            if (publicKeyBytes) {
                                device.buyerAdminKeys.push(publicKeyBytes);
                            } else {
                                console.warn(`Node ${node.id}: Admin public key not extracted for buyer ${buyerEvm}.`);
                                device.buyerAdminKeys.push(null);
                            }
                        } catch (error) {
                            console.warn(`Node ${node.id}: Failed to get admin key for buyer ${buyerEvm}: ${error.message}`);
                            device.buyerAdminKeys.push(null);
                        }
                    }

                    try {
                        let selfAdminKeyDer = await hederaService.getAdminKeyFromEvmAddress(device.evmAddress);
                        let selfPublicKeyBytes = extractPublicKeyBytes(selfAdminKeyDer);
                        device.adminAddress = selfPublicKeyBytes;
                    } catch (error) {
                        console.error(`Node ${node.id}: Failed to get self admin key from EVM address ${device.evmAddress}: ${error.message}`);
                        node.error(`Failed to set seller's own admin address: ${error.message}`);
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
                } catch (error) {
                    node.error("Seller device creation failed: " + error.message);
                    node.status({ fill: "red", shape: "ring", text: "Creation failed" });
                    return;
                }
            }

            if (node.deviceInfo) {
                const initialBuyerEvmAddresses = JSON.parse(config.buyerEvmAddress || '[]');
                await updateSelectedBuyers(node, initialBuyerEvmAddresses, true);
                //console.log(`Node ${node.id}: Starting Go process via ProcessManager.`);

                try {
                    node.status({ fill: "blue", shape: "dot", text: "Starting process..." });
                    node.goProcess = await processManager.ensureProcess(node, node.deviceInfo, 'seller');

                    // Initialize connection monitoring
                    try {
                        const connectionMonitor = getConnectionMonitor(node.id, 'seller', node.deviceInfo.wsPort);
                        await connectionMonitor.connect();

                        // Set up status update callback to update node status
                        connectionMonitor.onStatusUpdate((status) => {
                            if (status.isConnected) {
                                const peerText = ` (${status.connectedPeers}/${status.totalPeers} peers)`;
                                if (status.totalPeers > 0 && status.connectedPeers > 0) {
                                    node.status({ fill: "green", shape: "dot", text: `Connected${peerText}` });
                                } else {
                                    node.status({ fill: "yellow", shape: "ring", text: "Connected - no peers" });
                                }
                            } else {
                                node.status({ fill: "yellow", shape: "ring", text: "Connecting..." });
                            }
                        });

                        console.log(`Connection monitoring initialized for seller node ${node.id}`);
                    } catch (error) {
                        console.error(`Failed to initialize connection monitoring for seller node ${node.id}:`, error.message);
                    }

                } catch (error) {
                    console.error(`Error starting Go process for seller node ${node.id}:`, error.message);
                    node.error(`Go process startup failed: ${error.message}`);
                    node.status({ fill: "red", shape: "ring", text: "Process failed" });
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

    RED.nodes.registerType('seller config', NeuronSellerNode);

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

    RED.httpAdmin.get('/seller/devices', function (req, res) {
        const contract = req.query.contract || 'jetvision';
        const devices = getGlobalAllDevices(contract);
        const isLoading = isContractLoading(contract);
        const peerCount = getGlobalPeerCount(contract);
        const monitoringActive = isMonitoringActive();

        console.log(`/seller/devices endpoint called for contract ${contract}. Returning ${devices.length} devices, loading: ${isLoading}`);

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
    RED.httpAdmin.get('/seller/connection-status/:nodeId', function (req, res) {
        const nodeId = req.params.nodeId;
        const { getConnectionMonitor } = require('./connection-monitor.js');

        try {
            const sellerNode = RED.nodes.getNode(nodeId);
            if (!sellerNode || sellerNode.type !== 'seller config') {
                return res.status(404).json({ error: 'Seller node not found' });
            }

            if (!sellerNode.deviceInfo || !sellerNode.deviceInfo.wsPort) {
                return res.status(400).json({ error: 'Node not ready - no WebSocket port available' });
            }

            const connectionMonitor = getConnectionMonitor(nodeId, 'seller', sellerNode.deviceInfo.wsPort);
            const status = connectionMonitor.getStatus();

            res.json(status);
        } catch (error) {
            console.error(`Error getting connection status for seller node ${nodeId}:`, error);
            res.status(500).json({ error: 'Failed to get connection status: ' + error.message });
        }
    });

    RED.httpAdmin.post('/seller/refresh-connections/:nodeId', function (req, res) {
        const nodeId = req.params.nodeId;
        const { getConnectionMonitor } = require('./connection-monitor.js');

        try {
            const sellerNode = RED.nodes.getNode(nodeId);
            if (!sellerNode || sellerNode.type !== 'seller config') {
                return res.status(404).json({ error: 'Seller node not found' });
            }

            if (!sellerNode.deviceInfo || !sellerNode.deviceInfo.wsPort) {
                return res.status(400).json({ error: 'Node not ready - no WebSocket port available' });
            }

            const connectionMonitor = getConnectionMonitor(nodeId, 'seller', sellerNode.deviceInfo.wsPort);
            connectionMonitor.refresh()
                .then(() => {
                    res.json({ success: true, status: connectionMonitor.getStatus() });
                })
                .catch(error => {
                    res.status(500).json({ error: 'Failed to refresh connections: ' + error.message });
                });
        } catch (error) {
            console.error(`Error refreshing connections for seller node ${nodeId}:`, error);
            res.status(500).json({ error: 'Failed to refresh connections: ' + error.message });
        }
    });



    RED.httpAdmin.get('/seller/device-info/:nodeId', function (req, res) {
        const nodeId = req.params.nodeId;
        console.log(`[DEBUG] Seller device info requested for node ID: ${nodeId}`); // Debug log

        try {
            const sellerNode = RED.nodes.getNode(nodeId);
            if (!sellerNode || sellerNode.type !== 'seller config') {
                console.log(`[DEBUG] Seller node ${nodeId} not found or wrong type`); // Debug log
                return res.status(404).json({ error: 'Seller node not found' });
            }

            if (!sellerNode.deviceInfo) {
                console.log(`[DEBUG] Seller node ${nodeId} has no deviceInfo`); // Debug log
                return res.status(400).json({ error: 'Node not initialized - no device info available' });
            }

            const response = {
                evmAddress: sellerNode.deviceInfo.evmAddress || '',
                wsPort: sellerNode.deviceInfo.wsPort || null,
                publicKey: sellerNode.deviceInfo.publicKey || '',
                initialized: !!sellerNode.deviceInfo.evmAddress,
                nodeId: nodeId // Add this for debugging
            };

            console.log(`[DEBUG] Returning seller device info for ${nodeId}:`, response); // Debug log
            res.json(response);
        } catch (error) {
            console.error(`Error getting device info for seller node ${nodeId}:`, error);
            res.status(500).json({ error: 'Failed to get device info: ' + error.message });
        }
    });

    RED.httpAdmin.get('/seller/device-balance/:nodeId', async function (req, res) {
        const nodeId = req.params.nodeId;

        try {
            const sellerNode = RED.nodes.getNode(nodeId);
            if (!sellerNode || sellerNode.type !== 'seller config') {
                return res.status(404).json({ error: 'Seller node not found' });
            }

            if (!sellerNode.deviceInfo || !sellerNode.deviceInfo.accountId) {
                return res.status(400).json({ error: 'Node not initialized - no account ID available' });
            }

            if (!hederaService) {
                return res.status(500).json({ error: 'Hedera service not initialized' });
            }

            const balanceTinybars = await hederaService.getAccountBalanceTinybars(sellerNode.deviceInfo.accountId);

            // Convert tinybars to Hbars (1 Hbar = 100,000,000 tinybars)
            const balanceHbars = (balanceTinybars / 100000000).toFixed(2);

            res.json({
                success: true,
                balance: balanceHbars,
                balanceTinybars: balanceTinybars.toString(),
                accountId: sellerNode.deviceInfo.accountId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`Error getting device balance for seller node ${nodeId}:`, error);
            res.status(500).json({ error: 'Failed to get device balance: ' + error.message });
        }
    });

    async function updateSelectedBuyers(node, newBuyerEvmAddresses, isInitialSpawn = false) {
        try {
            // console.log(`Updating selected buyers for seller node: ${node.id}`);
            // node.status({ fill: "yellow", shape: "ring", text: "Updating buyers..." });

            node.deviceInfo.buyerEvmAddress = JSON.stringify(newBuyerEvmAddresses);
            node.deviceInfo.buyerAdminKeys = [];

            // Wait for hederaService to be ready before proceeding
            try {
                await waitForHederaService(5000); // Wait up to 5 seconds
            } catch (waitError) {
                console.error(`Node ${node.id}: Failed to initialize HederaService in updateSelectedBuyers: ${waitError.message}`);
                node.status({ fill: "red", shape: "ring", text: "Hedera Service failed" });
                return;
            }

            // console.log('Fetching admin keys for new buyers...');
            for (const buyerEvmAddress of newBuyerEvmAddresses) {
                try {
                    let adminKey = await hederaService.getAdminKeyFromEvmAddress(buyerEvmAddress);
                    let publicKeyBytes = extractPublicKeyBytes(adminKey);
                    if (publicKeyBytes) {
                        node.deviceInfo.buyerAdminKeys.push(publicKeyBytes);
                    } else {
                        console.warn(`Node ${node.id}: Admin key extraction failed for buyer ${buyerEvmAddress}.`);
                        node.deviceInfo.buyerAdminKeys.push(null);
                    }
                } catch (error) {
                    console.error(`Node ${node.id}: Failed to get admin key for buyer ${buyerEvmAddress}: ${error.message}`);
                    node.warn(`Failed to get admin key for buyer ${buyerEvmAddress}: ${error.message}`);
                    node.deviceInfo.buyerAdminKeys.push(null);
                }
            }

            const deviceFile = path.join(require('../services/NeuronUserHome').load(), 'devices', `${node.id}.json`);
            fs.writeFileSync(deviceFile, JSON.stringify(node.deviceInfo, null, 2), 'utf-8');

            if (!isInitialSpawn) {
                try {
                    node.status({ fill: "blue", shape: "dot", text: "Restarting process..." });
                    node.goProcess = await processManager.ensureProcess(node, node.deviceInfo, 'seller');
                    console.log(`Node ${node.id}: Buyer update complete and new Go process spawned.`);
                } catch (error) {
                    console.error(`Node ${node.id}: Error in updateSelectedBuyers (ProcessManager spawn):`, error.message);
                    node.error(`Failed to update buyers for node ${node.id}: ${error.message}`);
                    node.status({ fill: "red", shape: "ring", text: "Buyer update failed" });
                    throw error;
                }
            }

        } catch (error) {
            console.error(`Node ${node.id}: Error in updateSelectedBuyers: ${error.message}`);
            node.error(`Failed to update buyers for node ${node.id}: ${error.message}`);
            node.status({ fill: "red", shape: "ring", text: "Buyer update failed" });
            throw error;
        }
    }
};