const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, '../../.env')
});
const fs = require('fs');
const { spawn, exec } = require('child_process');
const WebSocket = require('ws');
const net = require('net');
const HederaContractService = require('./neuron-registration/dist/core/hedera/ContractService.js');
const { HederaAccountService } = require('./neuron-registration/dist/core/hedera/AccountService.js');
const { 
    initializeGlobalContractMonitoring, 
    cleanupGlobalContractMonitoring,
    getGlobalPeerCount,
    getGlobalAllDevices,
    isContractLoading,
    isMonitoringActive
} = require('./global-contract-monitor.js');

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
    // --- GLOBAL STATE FOR PORT MANAGEMENT AND SPAWNING QUEUE (moved inside module.exports) ---
    const PORT_RANGE_START = 50000;
    const PORT_RANGE_END = 65535;

    let usedPorts = new Set();
    let spawnQueue = [];
    let isSpawningInProgress = false;

    // --- INTERNAL CLEANUP LOGIC (accessible by globalProcessCleanup) ---
    performCleanup = () => {
        console.log(`Terminating ${globalProcesses.size} Go processes managed by Node-RED...`);
        globalProcesses.forEach(process => {
            try {
                if (process && !process.killed) {
                    console.log(`Sending SIGTERM to Go process (PID: ${process.pid}) for cleanup.`);
                    process.kill('SIGTERM');
                    if (process._assignedPort) {
                        releasePort(process._assignedPort);
                    }
                }
            } catch (error) {
                console.error('Error terminating process during cleanup:', error.message);
            }
        });
        globalProcesses.clear();

        try {
            console.log("Attempting to find and terminate any lingering 'go run . --port=' processes via pkill...");
            exec("pkill -f 'go run . --port='", (error, stdout, stderr) => {
                if (error) {
                    if (!error.message.includes('No processes found')) {
                        console.warn(`pkill error (likely no matching processes): ${error.message}`);
                    } else {
                        console.log('No additional Go processes found to terminate via pkill.');
                    }
                } else {
                    console.log('Additional Go processes terminated via pkill.');
                }
                usedPorts.clear(); // Clear all Node-RED tracked ports at the very end of cleanup
            });
        } catch (error) {
            console.error('Error during pkill cleanup:', error.message);
            usedPorts.clear();
        }
    };

    // --- HELPER FUNCTIONS (moved inside module.exports) ---
    async function findAvailablePort(node) {
        node.status({ fill: "blue", shape: "dot", text: "Finding available port..." });
        const maxAttempts = 200;
        let attempts = 0;

        while (attempts < maxAttempts) {
            let port;
            do {
                port = Math.floor(Math.random() * (PORT_RANGE_END - PORT_RANGE_START + 1)) + PORT_RANGE_START;
            } while (usedPorts.has(port));

            attempts++;

            try {
                const server = net.createServer();
                await new Promise((resolve, reject) => {
                    server.once('error', (err) => {
                        server.close();
                        if (err.code === 'EADDRINUSE') {
                            reject(new Error('EADDRINUSE'));
                        } else {
                            reject(err);
                        }
                    });
                    server.listen(port, '127.0.0.1', () => {
                        server.close(() => {
                            usedPorts.add(port);
                            resolve();
                        });
                    });
                });
                console.log(`Found available port: ${port}`);
                return port;

            } catch (error) {
                if (error.message === 'EADDRINUSE') {
                    await new Promise(r => setTimeout(r, 20));
                    continue;
                } else {
                    node.error(`Error checking port ${port}: ${error.message}`);
                    throw error;
                }
            }
        }
        throw new Error(`Could not find an available port after ${maxAttempts} attempts.`);
    }

    function releasePort(port) {
        if (port) {
            usedPorts.delete(port);
            console.log(`Port ${port} released from Node-RED internal tracking.`);
        }
    }

    async function testWebSocketConnection(node, port, retryCount = 0) {
        const maxRetries = 60;
        const retryDelayMs = 500;
        const singleAttemptTimeout = 2000;

        return new Promise((resolve) => {
            if (retryCount >= maxRetries) {
                console.error(`WebSocket connection failed on port ${port} after ${maxRetries} attempts. Giving up.`);
                node.status({ fill: "red", shape: "ring", text: `Failed to connect to ${port}` });
                return resolve(false);
            }

            const testWs = new WebSocket(`ws://localhost:${port}/buyer/p2p`);
            let connectAttemptTimer = null;
            let success = false;

            const cleanUp = () => {
                if (connectAttemptTimer) clearTimeout(connectAttemptTimer);
                connectAttemptTimer = null;
                testWs.removeAllListeners();
                if (testWs.readyState === WebSocket.OPEN || testWs.readyState === WebSocket.CONNECTING) {
                    testWs.close();
                }
            };

            connectAttemptTimer = setTimeout(() => {
                if (!success) {
                    cleanUp();
                    console.log(`WebSocket connection attempt timed out for port ${port} (Attempt ${retryCount + 1}).`);
                    setTimeout(() => {
                        resolve(testWebSocketConnection(node, port, retryCount + 1));
                    }, retryDelayMs);
                }
            }, singleAttemptTimeout);

            testWs.on('open', () => {
                success = true;
                cleanUp();
                console.log(`WebSocket connection test successful on port ${port}.`);
                resolve(true);
            });

            testWs.on('error', (error) => {
                if (!success) {
                    cleanUp();
                    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                        console.log(`WebSocket connection refused/timed out for port ${port} (Attempt ${retryCount + 1}).`);
                    } else {
                        console.error(`WebSocket connection error on port ${port} (Attempt ${retryCount + 1}): ${error.message}.`);
                    }
                    setTimeout(() => {
                        resolve(testWebSocketConnection(node, port, retryCount + 1));
                    }, retryDelayMs);
                }
            });

            testWs.on('close', (code, reason) => {
                if (!success) {
                    cleanUp();
                    console.log(`WebSocket connection closed unexpectedly for port ${port} (Code: ${code}, Reason: ${reason}). Retrying...`);
                    setTimeout(() => {
                        resolve(testWebSocketConnection(node, port, retryCount + 1));
                    }, retryDelayMs);
                }
            });

            node.status({ fill: "yellow", shape: "dot", text: `Probing ${port}... (${retryCount + 1}/${maxRetries})` });
        });
    }

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

    async function processSpawnQueue() {
        if (isSpawningInProgress || spawnQueue.length === 0) {
            return;
        }

        isSpawningInProgress = true;
        const { node, deviceInfo, resolve, reject } = spawnQueue.shift();

        try {
            if (node.goProcess && !node.goProcess.killed) {
                console.log(`Node ${node.id} process already running. Skipping spawn and re-validating.`);
                const isReady = await testWebSocketConnection(node, node.deviceInfo.wsPort);
                if (isReady) {
                    node.status({ fill: "green", shape: "dot", text: `Active on ${node.deviceInfo.wsPort}. EVM: ${node.deviceInfo.evmAddress}` });
                    resolve(node.goProcess);
                } else {
                    console.warn(`Node ${node.id} process found but WebSocket not ready. Assuming stale process and attempting to respawn.`);
                    if (node.goProcess) {
                        node.goProcess.kill('SIGKILL');
                        releasePort(node.goProcess._assignedPort);
                        globalProcesses.delete(node.goProcess);
                        node.goProcess = null;
                    }
                }
            }

            if (!node.goProcess) {
                node.status({ fill: "blue", shape: "dot", text: "Finding port & spawning..." });

                const uniquePort = await findAvailablePort(node);
                const wsPort = uniquePort;

                deviceInfo.uniquePort = uniquePort;
                deviceInfo.wsPort = wsPort;

                const deviceFile = path.join(__dirname, 'devices', `${node.id}.json`);
                fs.writeFileSync(deviceFile, JSON.stringify(deviceInfo, null, 2), 'utf-8');

                // Pass the node-specific env file to the Go process
                updateBuyerEnv(node, deviceInfo, uniquePort);

                console.log(`Spawning Go process for node ${node.id} on port ${uniquePort}`);

                // Get log folder from environment variable
                const logFolder = process.env.SDK_LOG_FOLDER;
                let stdoutLogFile = null;
                let stderrLogFile = null;

                if (logFolder && logFolder.trim() !== '') {
                    // Create log directory if it doesn't exist
                    if (!fs.existsSync(logFolder)) {
                        fs.mkdirSync(logFolder, { recursive: true });
                    }
                    stdoutLogFile = path.join(logFolder, `buyer-${node.id}-stdout.log`);
                    stderrLogFile = path.join(logFolder, `buyer-${node.id}-stderr.log`);
                    console.log(`Logs will be written to: ${logFolder}`);
                } else {
                    console.log('SDK_LOG_FOLDER not set - suppressing process logs');
                }
                
                // Get the executable path from environment variable
                const executablePath = process.env.NEURON_SDK_PATH;
                if (!executablePath) {
                    throw new Error('NEURON_SDK_PATH environment variable is not set. Please set it to the path of the pre-compiled neuron-sdk executable.');
                }
                
                // Check if executable exists
                if (!fs.existsSync(executablePath)) {
                    console.error(`Executable not found at: ${executablePath}`);
                    throw new Error(`Executable not found at: ${executablePath}. Please ensure the pre-compiled binary is available at the specified path.`);
                }
                
                console.log(`Using pre-compiled executable: ${executablePath}`);

                // Construct the complete path for the environment file
                const envFilePath = path.resolve(__dirname, 'sdk_env_files', `.buyer-env-${node.id}`);

                const goProcess = spawn(executablePath, [`--port=${uniquePort}`, '--mode=peer', '--buyer-or-seller=buyer','--list-of-sellers-source=env', `--envFile=${envFilePath}`, '--use-local-address', `--ws-port=${wsPort}`], {
                    cwd: path.join(__dirname, 'sdk_env_files'),
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                node.goProcess = goProcess;
                globalProcesses.add(goProcess);
                goProcess._assignedPort = uniquePort; // Store assigned port

                // Redirect stdout to file if logging is enabled
                if (stdoutLogFile) {
                    const stdoutStream = fs.createWriteStream(stdoutLogFile, { flags: 'a' });
                    goProcess.stdout.pipe(stdoutStream);
                    goProcess.stdout.on('data', (data) => {
                        console.log(`Buyer Go process [${node.id}] stdout: ${data.toString().trim()}`);
                    });
                } else {
                    // Suppress stdout logging
                    goProcess.stdout.on('data', (data) => {
                        // Only log to console, not to file
                        console.log(`Buyer Go process [${node.id}] stdout: ${data.toString().trim()}`);
                    });
                }

                // Redirect stderr to file if logging is enabled
                if (stderrLogFile) {
                    const stderrStream = fs.createWriteStream(stderrLogFile, { flags: 'a' });
                    goProcess.stderr.pipe(stderrStream);
                    goProcess.stderr.on('data', (data) => {
                        console.error(`Buyer Go process [${node.id}] stderr: ${data.toString().trim()}`);
                    });
                } else {
                    // Suppress stderr logging
                    goProcess.stderr.on('data', (data) => {
                        // Only log to console, not to file
                        console.error(`Buyer Go process [${node.id}] stderr: ${data.toString().trim()}`);
                    });
                }

                goProcess.on('close', (code) => {
                    console.log(`Buyer Go process [${node.id}] exited with code ${code}.`);
                    globalProcesses.delete(goProcess);
                    releasePort(goProcess._assignedPort);
                    if (node.goProcess === goProcess) {
                        node.goProcess = null;
                        node.status({ fill: "red", shape: "ring", text: `Process exited (Code: ${code})` });
                        if (code !== 0) {
                            node.error(`Go process for node ${node.id} exited with error code: ${code}`);
                        }
                    }
                });

                goProcess.on('error', (error) => {
                    console.error(`Buyer Go process [${node.id}] error: ${error.message}`);
                    globalProcesses.delete(goProcess);
                    releasePort(goProcess._assignedPort);
                    if (node.goProcess === goProcess) {
                        node.goProcess = null;
                        node.error(`Go process for node ${node.id} error: ${error.message}`);
                        node.status({ fill: "red", shape: "ring", text: "Process error" });
                    }
                });

                const isReady = await testWebSocketConnection(node, wsPort);
                if (isReady) {
                    console.log(`Buyer process for node ${node.id} successfully connected on port ${uniquePort}.`);
                    node.status({ fill: "green", shape: "dot", text: `Connected to Neuron Network as ${node.deviceInfo.adminAddress} on ${uniquePort}` });
                    resolve(goProcess);
                } else {
                    console.error(`Buyer process for node ${node.id} failed to become ready on port ${uniquePort}. Terminating.`);
                    node.error(`Go process on port ${uniquePort} for node ${node.id} failed to become ready after multiple attempts.`);
                    node.status({ fill: "red", shape: "ring", text: `Failed to start on ${uniquePort}` });
                    if (goProcess && !goProcess.killed) {
                        goProcess.kill('SIGKILL');
                        releasePort(goProcess._assignedPort);
                    }
                    reject(new Error(`Go process for node ${node.id} failed to start on port ${uniquePort}`));
                }
            }
        } catch (error) {
            console.error(`Error during spawning process for node ${node.id}: ${error.message}`);
            node.error(`Go process spawning failed for node ${node.id}: ${error.message}`);
            node.status({ fill: "red", shape: "ring", text: "Spawn failed" });
            reject(error);
        } finally {
            isSpawningInProgress = false;
            processSpawnQueue();
        }
    }

    // Function to update the node-specific environment file for the Go application
    function updateBuyerEnv(node, deviceInfo, uniquePort) {
        try {
            const envFilePath = path.join(__dirname, 'sdk_env_files', `.buyer-env-${node.id}`);

            let envContent = '';
            if (fs.existsSync(envFilePath)) {
                envContent = fs.readFileSync(envFilePath, 'utf-8');
            }

            const hederaEvmIdLine = `hedera_evm_id=${deviceInfo.evmAddress}`;
            const hederaIdLine = `hedera_id=${deviceInfo.accountId}`;
            const privateKeyLine = `private_key=${deviceInfo.extractedPrivateKey}`;
            const smartContractLine = `smart_contract_address=${deviceInfo.smartContract}`;
            const uniquePortLine = `unique_port=${uniquePort}`;
            const wsPortLine = `ws_port=${uniquePort}`;
            const listOfSellersLine = `list_of_sellers=${deviceInfo.sellerAdminKeys.filter(s => s !== null).join(',')}`;
            const ethLine = `eth_rpc_url=https://testnet.hashio.io/api`;
            const locationLine = `location={"lat":-2.1574851,"lon":101.7108034,"alt":0.000000}`;
            const mirrorLine = `mirror_api_url=https://testnet.mirrornode.hedera.com/api/v1`;
            const deviceIdLine = `nodeid=${node.id}`;

            const lines = envContent.split('\n');
            const updates = [
                { key: 'nodeid', value: deviceIdLine },
                { key: 'hedera_evm_id', value: hederaEvmIdLine },
                { key: 'hedera_id', value: hederaIdLine },
                { key: 'private_key', value: privateKeyLine },
                { key: 'smart_contract_address', value: smartContractLine },
                { key: 'list_of_sellers', value: listOfSellersLine },
                { key: 'unique_port', value: uniquePortLine },
                { key: 'ws_port', value: wsPortLine },
                { key: 'eth_rpc_url', value: ethLine },
                { key: 'location', value: locationLine },
                { key: 'mirror_api_url', value: mirrorLine }
            ];

            updates.forEach(update => {
                let found = false;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith(`${update.key}=`)) {
                        lines[i] = update.value;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    lines.push(update.value);
                }
            });

            const updatedContent = lines.filter(line => line.trim() !== '').join('\n');
            fs.writeFileSync(envFilePath, updatedContent, 'utf-8');

            console.log(`Updated .buyer-env-${node.id} with nodeid=${node.id}, hedera_evm_id=${deviceInfo.evmAddress}, hedera_id=${deviceInfo.accountId}, list_of_sellers=${listOfSellersLine}, smart_contract_address=${deviceInfo.smartContract}, unique_port=${uniquePort}, ws_port=${uniquePort}`);
        } catch (error) {
            console.error(`Failed to update .buyer-env-${node.id}: ${error.message}`);
            node.error(`Failed to update .buyer-env-${node.id}: ${error.message}`);
        }
    }


    // Initialize global WebSocket connection when module is loaded
    // initializeGlobalWebSocket(); // Removed as per edit hint

    // Initialize global contract monitoring service when module is loaded
    initializeGlobalContractMonitoring();

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
            'HEDERA_OPERATOR_EVM',
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

        node.on('close', function (done) {
            console.log(`Closing buyer node ${node.id}.`);
            if (node.goProcess && !node.goProcess.killed) {
                console.log(`Terminating Go process for node ${node.id} (PID: ${node.goProcess.pid}).`);
                globalProcesses.delete(node.goProcess);
                releasePort(node.goProcess._assignedPort);
                node.goProcess.kill('SIGTERM');

                let closeTimer = setTimeout(() => {
                    if (node.goProcess && !node.goProcess.killed) {
                        console.warn(`Go process for node ${node.id} did not terminate gracefully after SIGTERM, sending SIGKILL.`);
                        node.goProcess.kill('SIGKILL');
                    }
                    done();
                }, 5000);

                node.goProcess.on('close', () => {
                    clearTimeout(closeTimer);
                    console.log(`Go process for node ${node.id} terminated cleanly.`);
                    node.goProcess = null;
                    done();
                });
            } else {
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
                // Enqueue the spawn request directly since initial seller admin keys are already set up
                await new Promise((resolve, reject) => {
                    spawnQueue.push({ node, deviceInfo: node.deviceInfo, resolve, reject });
                    processSpawnQueue(); // Trigger processing the queue
                });
                console.log(`Node ${node.id}: Go process spawn requested and queued.`);
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

    RED.nodes.registerType('buyer', NeuronBuyerNode, {
        oneditprepare: function () {
            const node = this;
            let selectedDevices = [];

            $('<style>')
                .text(`
                    .buyer-table tr.selected {
                        background-color: #DDD;
                        color: black;
                    }
                    .buyer-table tr:hover {
                        outline: 2px solid #4d90fe;
                    }
                    .seller-modal-content {
                        display: flex;
                        flex-direction: column;
                        height: 100%;
                    }
                    .seller-table-container {
                        flex-grow: 1;
                        overflow-y: auto;
                        margin-bottom: 10px;
                    }
                    .seller-table {
                        width: 100%;
                        border-collapse: collapse;
                    }
                    .seller-table th, .seller-table td {
                        border: 1px solid #ccc;
                        padding: 8px;
                        text-align: left;
                    }
                    .seller-table thead th {
                        position: sticky;
                        top: 0;
                        background-color: #f0f0f0;
                        z-index: 1;
                    }
                    .seller-modal-buttons {
                        flex-shrink: 0;
                        text-align: right;
                        padding-top: 10px;
                        border-top: 1px solid #eee;
                    }
                `)
                .appendTo('head');

            const initialSelectedAddresses = typeof node.sellerEvmAddress === 'string'
                ? JSON.parse(node.sellerEvmAddress || '[]')
                : [];
            $('#node-input-selectedAddresses').val(initialSelectedAddresses.join('\n'));

            if (node.sellerEvmAddress) {
                try {
                    const parsedAddresses = JSON.parse(node.sellerEvmAddress);
                    selectedDevices = parsedAddresses.map(address => ({ address }));
                } catch (e) {
                    console.error("Error parsing sellerEvmAddress on editprepare:", e);
                    selectedDevices = [];
                }
            }

            $('#select-sellers-btn').click(function () {
                $("#seller-modal").dialog({
                    autoOpen: false,
                    modal: true,
                    width: '80%',
                    maxWidth: 700,
                    height: 'auto',
                    maxHeight: 600,
                    resizable: true,
                    title: 'Select Sellers',
                    open: function () {
                        $(window).on('resize.sellerDialog', function () {
                            const dialogContent = $('#seller-modal .red-ui-dialog-content');
                            const tableContainer = $('#seller-table-container');
                            const headerHeight = $('#seller-table thead').outerHeight();
                            const buttonAreaHeight = $('#seller-modal-buttons').outerHeight();
                            const padding = 20;

                            tableContainer.css('max-height',
                                Math.max(100, dialogContent.height() - headerHeight - buttonAreaHeight - padding)
                            );
                        }).trigger('resize.sellerDialog');
                    },
                    close: function () {
                        $(window).off('resize.sellerDialog');
                        $(this).dialog("destroy");
                    }
                }).dialog('open');
            });

            $('#cancel-seller-selection').click(function () {
                $("#seller-modal").dialog("close");
            });

            $('#confirm-seller-selection').click(function () {
                const selectedAddresses = [];
                const currentSelectedDeviceObjects = [];

                $('#seller-table tbody input[type=checkbox]:checked').each(function () {
                    const row = $(this).closest('tr');
                    const address = row.data('address');
                    const device = row.data('device');
                    selectedAddresses.push(address);
                    currentSelectedDeviceObjects.push(device);
                });

                $('#node-input-sellerEvmAddress').val(JSON.stringify(selectedAddresses));
                $('#node-input-selectedAddresses').val(selectedAddresses.join('\n'));
                selectedDevices = currentSelectedDeviceObjects;

                $("#seller-modal").dialog("close");
            });

            const helpText = $('<div>')
                .addClass('form-row')
                .html(`
                    <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 10px; margin-top: 10px;">
                        <strong>About this Buyer Node:</strong><br>
                        This node manages a Go-based buyer application. It will:<br>
                        <ul>
                            <li>Generate a unique Hedera account for the buyer (if one doesn't exist).</li>
                            <li>Spawn a Go process that listens on a dynamically assigned, *available* port.</li>
                            <li>Establish a WebSocket connection to the Go process to confirm readiness.</li>
                            <li>Interact with selected seller nodes to consume data.</li>
                        </ul>
                        <strong>Selecting Sellers:</strong><br>
                        Use the "Select Sellers" button to choose which seller nodes this buyer should interact with. The buyer needs the admin keys of these sellers to communicate. These keys are fetched dynamically.<br><br>
                        <strong>Port Management:</strong><br>
                        The node intelligently finds a free port to avoid conflicts.
                    </div>
                `);

            $('#node-input-sellerEvmAddress').closest('.form-row').after(helpText);
        },
        oneditsave: function () {
            this.name = $('#node-input-name').val();
            this.sellerEvmAddress = $('#node-input-sellerEvmAddress').val() || '[]';
            this.description = $('#node-input-description').val();
            this.deviceName = $('#node-input-deviceName').val();
            this.smartContract = $('#node-input-smartContract').val();
            this.deviceRole = $('#node-input-deviceRole').val();
            this.serialNumber = $('#node-input-serialNumber').val();
            this.deviceType = $('#node-input-deviceType').val();
            this.price = $('#node-input-price').val();

            const node = RED.nodes.getNode(this.id);
            if (node && node.deviceInfo) {
                const newSellerEvmAddresses = JSON.parse(this.sellerEvmAddress);
                updateSelectedSellers(node, newSellerEvmAddresses)
                    .then(() => console.log(`Node ${node.id}: Sellers updated via oneditsave.`))
                    .catch(error => console.error(`Node ${node.id}: Error updating sellers via oneditsave:`, error.message));
            }
        }
    });

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

    RED.httpAdmin.post('/buyer/update-sellers/:nodeId', function (req, res) {
        const nodeId = req.params.nodeId;
        const newSellerEvmAddresses = req.body.sellerEvmAddresses;

        console.log(`Buyer update endpoint called with nodeId: ${nodeId}`);

        if (!newSellerEvmAddresses || !Array.isArray(newSellerEvmAddresses)) {
            return res.status(400).json({ error: 'Invalid seller addresses provided (must be an array)' });
        }

        if (!hederaService) {
            return res.status(500).json({ error: 'Hedera service not initialized. Check .env configuration.' });
        }

        const buyerNode = RED.nodes.getNode(nodeId);

        if (!buyerNode || buyerNode.type !== 'buyer') {
            return res.status(404).json({ error: 'Buyer node not found or not a "buyer" type.' });
        }

        updateSelectedSellers(buyerNode, newSellerEvmAddresses)
            .then(() => {
                res.json({ success: true, message: 'Sellers updated successfully. Buyer process will attempt to restart with new config.' });
            })
            .catch(error => {
                console.error(`Error updating sellers for node ${nodeId}:`, error);
                res.status(500).json({ error: 'Failed to update sellers: ' + error.message });
            });
    });

    async function updateSelectedSellers(node, newSellerEvmAddresses) {
        try {
            console.log(`Updating selected sellers for buyer node: ${node.id}`);
            
            if (!node.deviceInfo) {
                throw new Error('Device info not available. Node may not be fully initialized.');
            }
            
            node.status({ fill: "yellow", shape: "ring", text: "Updating sellers..." });

            node.deviceInfo.sellerEvmAddress = JSON.stringify(newSellerEvmAddresses);
            node.deviceInfo.sellerAdminKeys = [];

            console.log('Fetching admin keys for new sellers...');
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

            node.status({ fill: "yellow", shape: "ring", text: "Restarting process..." });

            // Always terminate existing process when updating sellers
            if (node.goProcess && !node.goProcess.killed) {
                console.log(`Node ${node.id}: Terminating old Go process for seller update.`);
                node.goProcess.kill('SIGTERM');
                await new Promise(resolve => {
                    node.goProcess.on('close', () => {
                        console.log(`Node ${node.id}: Old Go process terminated.`);
                        node.goProcess = null;
                        resolve();
                    });
                    setTimeout(() => {
                        if (node.goProcess && !node.goProcess.killed) {
                            console.warn(`Node ${node.id}: Old Go process hung during SIGTERM, forcing SIGKILL.`);
                            node.goProcess.kill('SIGKILL');
                        }
                        resolve();
                    }, 5000);
                });
            } else {
                console.log(`Node ${node.id}: No active Go process to terminate for seller update.`);
            }

            // Enqueue the spawn request
            await new Promise((resolve, reject) => {
                spawnQueue.push({ node, deviceInfo: node.deviceInfo, resolve, reject });
                processSpawnQueue(); // Trigger processing the queue
            });

            console.log(`Node ${node.id}: Seller update complete and new Go process spawned.`);
            node.status({ fill: "green", shape: "dot", text: "Sellers updated & process restarted" });

        } catch (error) {
            console.error(`Node ${node.id}: Error in updateSelectedSellers: ${error.message}`);
            node.error(`Failed to update sellers for node ${node.id}: ${error.message}`);
            node.status({ fill: "red", shape: "ring", text: "Seller update failed" });
            throw error;
        }
    }
};