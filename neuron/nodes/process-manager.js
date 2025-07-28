const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const ProcessRegistry = require('./process-registry');
const PortManager = require('./port-manager');

/**
 * ProcessManager - Orchestrates Go process lifecycle management
 * Handles process discovery, spawning, and persistence across redeploys
 */
class ProcessManager {
    constructor() {
        this.registry = new ProcessRegistry();
        this.portManager = new PortManager();
        this.healthCheckInterval = 30000; // 30 seconds
        this.healthMonitors = new Map(); // nodeId -> interval
        this.activeProcesses = new Map(); // nodeId -> process object
        
        // Cleanup stale entries on startup
        this.registry.cleanupStaleEntries();
        this.portManager.cleanupExpiredReservations();
    }

    /**
     * Ensure a Go process is running for the given node
     * Will reuse existing process if available, otherwise spawn new one
     */
    async ensureProcess(node, deviceInfo, nodeType = 'buyer') {
        console.log(`Ensuring Go process for ${nodeType} node ${node.id}`);
        
        try {
            // Try to discover existing process first
            const existingProcess = await this.discoverExistingProcess(node.id);
            if (existingProcess) {
                // Reuse existing process
                node.goProcess = existingProcess.processObj;
                node.deviceInfo = existingProcess.deviceInfo;
                this.activeProcesses.set(node.id, existingProcess.processObj);
                this.startHealthMonitoring(node.id, existingProcess.processObj);
                
                console.log(`Reusing existing Go process for node ${node.id} on port ${existingProcess.port}`);
                node.status({ fill: "green", shape: "dot", text: `Reconnected to port ${existingProcess.port}` });
                
                return existingProcess.processObj;
            }

            // No existing process found, spawn new one
            return await this.spawnNewProcess(node, deviceInfo, nodeType);
            
        } catch (error) {
            console.error(`Error ensuring Go process for node ${node.id}:`, error.message);
            node.status({ fill: "red", shape: "ring", text: "Process setup failed" });
            throw error;
        }
    }

    /**
     * Discover existing Go process for a node
     */
    async discoverExistingProcess(nodeId) {
        const registryEntry = this.registry.getProcess(nodeId);
        if (!registryEntry) {
            console.log(`No registry entry found for node ${nodeId}`);
            return null;
        }

        console.log(`Found registry entry for node ${nodeId}: PID ${registryEntry.pid}, Port ${registryEntry.port}`);

        // Verify process is actually running
        if (!this.isProcessAlive(registryEntry.pid)) {
            console.log(`Process ${registryEntry.pid} for node ${nodeId} is not running`);
            this.registry.markProcessStopped(nodeId);
            return null;
        }

        // Test WebSocket connectivity
        const isWebSocketReady = await this.testWebSocketConnection(registryEntry.port, 60, registryEntry.nodeType);
        if (!isWebSocketReady) {
            console.log(`WebSocket not ready on port ${registryEntry.port} for node ${nodeId}`);
            this.registry.markProcessStopped(nodeId);
            return null;
        }

        // Create a process object reference (we can't get the original child_process)
        const processObj = {
            pid: registryEntry.pid,
            _assignedPort: registryEntry.port,
            killed: false,
            // We can't control processes we didn't spawn, so kill() uses cross-platform method
            kill: (signal) => {
                console.log(`Attempting to kill external process ${registryEntry.pid} with ${signal}`);
                // Use the ProcessManager's cross-platform kill method
                this.killProcessCrossPlatform(registryEntry.pid, signal).catch(error => {
                    console.error(`Failed to kill process ${registryEntry.pid}:`, error.message);
                });
            }
        };

        return {
            processObj: processObj,
            port: registryEntry.port,
            deviceInfo: registryEntry.deviceInfo
        };
    }

    /**
     * Spawn a new Go process for the node
     */
    async spawnNewProcess(node, deviceInfo, nodeType = 'buyer') {
        console.log(`Spawning new Go process for node ${node.id}`);
        
        // Reserve a port
        const port = await this.portManager.reservePort(node.id);
        console.log(`Reserved port ${port} for node ${node.id}`);
        
        // Update device info with port
        deviceInfo.uniquePort = port;
        deviceInfo.wsPort = port;
        
        // Save device info to file
        const deviceFile = path.join(require('../services/NeuronUserHome').load(), 'devices', `${node.id}.json`);
        const deviceDir = path.dirname(deviceFile);
        if (!fs.existsSync(deviceDir)) {
            fs.mkdirSync(deviceDir, { recursive: true });
        }
        fs.writeFileSync(deviceFile, JSON.stringify(deviceInfo, null, 2), 'utf-8');
        
        // Update environment file
        if (nodeType === 'seller') {
            this.updateSellerEnv(node, deviceInfo, port);
        } else {
            this.updateBuyerEnv(node, deviceInfo, port);
        }
        
        // Spawn the Go process
        const goProcess = await this.spawnGoProcess(node, port, nodeType);
        
        // Register the process
        this.registry.registerProcess(node.id, goProcess.pid, port, deviceInfo, nodeType);
        this.activeProcesses.set(node.id, goProcess);
        
        // Start health monitoring
        this.startHealthMonitoring(node.id, goProcess);
        
        // Wait for WebSocket to be ready
        const isReady = await this.testWebSocketConnection(port, 60, nodeType); // Wait up to 60 seconds
        if (isReady) {
            node.status({ fill: "green", shape: "dot", text: `Active on ${port}. EVM: ${deviceInfo.evmAddress}` });
            console.log(`Go process for node ${node.id} is ready on port ${port}`);
        } else {
            throw new Error(`Go process for node ${node.id} failed to become ready on port ${port}`);
        }
        
        return goProcess;
    }

    /**
     * Spawn the actual Go process
     */
    async spawnGoProcess(node, port, nodeType) {
        return new Promise((resolve, reject) => {
            console.log(`Spawning Go process for node ${node.id} on port ${port}`);
            
            // Get log folder from environment variable
            const logFolder = process.env.SDK_LOG_FOLDER;
            let stdoutLogFile = null;
            let stderrLogFile = null;

            if (logFolder && logFolder.trim() !== '') {
                if (!fs.existsSync(logFolder)) {
                    fs.mkdirSync(logFolder, { recursive: true });
                }
                stdoutLogFile = path.join(logFolder, `${nodeType}-${node.id}-stdout.log`);
                stderrLogFile = path.join(logFolder, `${nodeType}-${node.id}-stderr.log`);
            }

            // Get the executable path from environment variable
            const executablePath = process.env.NEURON_SDK_PATH;
            if (!executablePath) {
                throw new Error("NEURON_SDK_PATH environment variable is not set. Please set it to the path of the pre-compiled neuron-sdk executable.");
            }
            
            // Check if executable exists
            if (!fs.existsSync(executablePath)) {
                console.error(`Executable not found at: ${executablePath}`);
                throw new Error(`Executable not found at: ${executablePath}. Please ensure the pre-compiled binary is available at the specified path.`);
            }
            console.log(`Using pre-compiled executable from NEURON_SDK_PATH: ${executablePath}`);
            const envFilePath = path.join(require('../services/NeuronUserHome').load(), 'sdk_env_files', `.${nodeType}-env-${node.id}`);
            
            const args = [
                `--port=${port}`,
                //'--use-local-address',
                '--mode=peer',
                `--buyer-or-seller=${nodeType}`,
                nodeType === 'seller' ? '--list-of-buyers-source=env' : '--list-of-sellers-source=env',
                `--envFile=${envFilePath}`,
                `--ws-port=${port}`
            ];

            const goProcess = spawn(executablePath, args, {
                cwd: path.join(require('../services/NeuronUserHome').load(), 'sdk_env_files'),
                stdio: ['ignore', 'pipe', 'pipe']
            });

            // Store assigned port
            goProcess._assignedPort = port;

            // Handle process events
            goProcess.on('spawn', () => {
                console.log(`Go process spawned for node ${node.id} with PID ${goProcess.pid} on port ${port}`);
                resolve(goProcess);
            });

            goProcess.on('error', (error) => {
                console.error(`Go process spawn error for node ${node.id}:`, error);
                node.status({ fill: "red", shape: "ring", text: "SDK Process error" });
                reject(error);
            });

            goProcess.on('exit', (code, signal) => {
                console.log(`Go process for node ${node.id} exited with code ${code}, signal ${signal}`);
                node.status({ fill: "red", shape: "ring", text: "SDK Process exited" });
                this.handleProcessExit(node.id, code, signal);
            });

            // Handle logging
            if (stdoutLogFile) {
                const stdoutStream = fs.createWriteStream(stdoutLogFile, { flags: 'a' });
                goProcess.stdout.pipe(stdoutStream);
            } else {
                goProcess.stdout.on('data', (data) => {
                    console.log(`[Go-${node.id}] ${data.toString().trim()}`);
                });
            }

            if (stderrLogFile) {
                const stderrStream = fs.createWriteStream(stderrLogFile, { flags: 'a' });
                goProcess.stderr.pipe(stderrStream);
            } else {
                goProcess.stderr.on('data', (data) => {
                    console.error(`[Go-${node.id}] ${data.toString().trim()}`);
                });
            }
        });
    }

    /**
     * Handle process exit events
     */
    handleProcessExit(nodeId, code, signal) {
        console.log(`Process exit handler for node ${nodeId}: code=${code}, signal=${signal}`);
        
        // Update registry
        this.registry.updateProcessStatus(nodeId, 'stopped', { exitCode: code, exitSignal: signal });
        
        // Clean up active processes
        this.activeProcesses.delete(nodeId);
        
        // Stop health monitoring
        this.stopHealthMonitoring(nodeId);
        
        // If unexpected exit, try to restart (unless killed intentionally)
        if (signal !== 'SIGTERM' && signal !== 'SIGKILL') {
            console.log(`Unexpected exit for node ${nodeId}, marking for potential restart`);
            // Could implement auto-restart logic here
        }
    }

    /**
     * Start health monitoring for a process
     */
    startHealthMonitoring(nodeId, goProcess) {
        this.stopHealthMonitoring(nodeId); // Clear any existing monitor
        
        const monitor = setInterval(() => {
            if (!this.isProcessAlive(goProcess.pid)) {
                console.warn(`Health check failed: Process ${goProcess.pid} for node ${nodeId} is not running`);
                this.handleProcessExit(nodeId, null, 'health-check-failed');
            } else {
                // Update registry with last seen
                this.registry.updateProcessStatus(nodeId, 'running');
            }
        }, this.healthCheckInterval);
        
        this.healthMonitors.set(nodeId, monitor);
        console.log(`Started health monitoring for node ${nodeId}`);
    }

    /**
     * Stop health monitoring for a process
     */
    stopHealthMonitoring(nodeId) {
        const monitor = this.healthMonitors.get(nodeId);
        if (monitor) {
            clearInterval(monitor);
            this.healthMonitors.delete(nodeId);
            console.log(`Stopped health monitoring for node ${nodeId}`);
        }
    }

    /**
     * Check if a process is alive
     */
    isProcessAlive(pid) {
        try {
            // Sending signal 0 checks if process exists without killing it
            process.kill(pid, 0);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Test WebSocket connection
     */
    async testWebSocketConnection(port, maxRetries = 10, nodeType = 'buyer') {
        const retryDelayMs = 1000;
        const endpoint = nodeType === 'seller' ? '/seller/p2p' : '/buyer/p2p';
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const ws = new WebSocket(`ws://localhost:${port}${endpoint}`);
                
                const result = await new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        ws.close();
                        resolve(false);
                    }, 2000);
                    
                    ws.on('open', () => {
                        clearTimeout(timeout);
                        ws.close();
                        resolve(true);
                    });
                    
                    ws.on('error', () => {
                        clearTimeout(timeout);
                        resolve(false);
                    });
                });
                
                if (result) {
                    console.log(`WebSocket connection successful on port ${port} (attempt ${attempt})`);
                    return true;
                }
            } catch (error) {
                // Connection failed, continue to retry
            }
            
            if (attempt < maxRetries) {
                console.log(`WebSocket connection failed on port ${port}, retrying in ${retryDelayMs}ms (attempt ${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
            }
        }
        
        console.log(`WebSocket connection failed on port ${port} after ${maxRetries} attempts`);
        return false;
    }

    /**
     * Update buyer environment file
     */
    updateBuyerEnv(node, deviceInfo, uniquePort) {
        try {
            const envDir = path.join(require('../services/NeuronUserHome').load(), 'sdk_env_files');
            if (!fs.existsSync(envDir)) {
                fs.mkdirSync(envDir, { recursive: true });
            }

            const envFilePath = path.join(envDir, `.buyer-env-${node.id}`);
            
            // Create environment file in the format expected by the Go application
            const envLines = [
                `nodeid=${node.id}`,
                `hedera_evm_id=${deviceInfo.evmAddress}`,
                `hedera_id=${deviceInfo.accountId}`,
                `private_key=${deviceInfo.extractedPrivateKey}`,
                `smart_contract_address=${deviceInfo.smartContract}`,
                `list_of_sellers=${deviceInfo.sellerAdminKeys.filter(s => s !== null).join(',')}`,
                `unique_port=${uniquePort}`,
                `ws_port=${uniquePort}`,
                `eth_rpc_url=https://testnet.hashio.io/api`,
                `location={"lat":-2.1574851,"lon":101.7108034,"alt":0.000000}`,
                `mirror_api_url=https://testnet.mirrornode.hedera.com/api/v1`
            ];

            fs.writeFileSync(envFilePath, envLines.join('\n'), 'utf-8');
            console.log(`Updated buyer environment file: ${envFilePath}`);
        } catch (error) {
            console.error(`Error updating buyer environment file for node ${node.id}:`, error.message);
            throw error;
        }
    }

    /**
     * Update seller environment file
     */
    updateSellerEnv(node, deviceInfo, uniquePort) {
        try {
            const envDir = path.join(require('../services/NeuronUserHome').load(), 'sdk_env_files');
            if (!fs.existsSync(envDir)) {
                fs.mkdirSync(envDir, { recursive: true });
            }

            const envFilePath = path.join(envDir, `.seller-env-${node.id}`);
            
            // Create environment file in the format expected by the Go application
            const envLines = [
                `nodeid=${node.id}`,
                `hedera_evm_id=${deviceInfo.evmAddress}`,
                `hedera_id=${deviceInfo.accountId}`,
                `private_key=${deviceInfo.extractedPrivateKey}`,
                `smart_contract_address=${deviceInfo.smartContract}`,
                `list_of_buyers=${deviceInfo.buyerAdminKeys.filter(s => s !== null).join(',')}`,
                `unique_port=${uniquePort}`,
                `ws_port=${uniquePort}`,
                `eth_rpc_url=https://testnet.hashio.io/api`,
                `location={"lat":-2.1574851,"lon":101.7108034,"alt":0.000000}`,
                `mirror_api_url=https://testnet.mirrornode.hedera.com/api/v1`
            ];

            fs.writeFileSync(envFilePath, envLines.join('\n'), 'utf-8');
            console.log(`Updated seller environment file: ${envFilePath}`);
        } catch (error) {
            console.error(`Error updating seller environment file for node ${node.id}:`, error.message);
            throw error;
        }
    }

    /**
     * Cross-platform process termination
     * Handles Windows vs Unix signal differences
     */
    async killProcessCrossPlatform(pid, signal = 'SIGTERM', timeout = 5000) {
        return new Promise((resolve) => {
            const isWindows = process.platform === 'win32';
            
            try {
                if (isWindows) {
                    // Windows doesn't support POSIX signals the same way
                    if (signal === 'SIGKILL' || signal === 'SIGTERM') {
                        const { exec } = require('child_process');
                        const forceFlag = signal === 'SIGKILL' ? '/F' : '';
                        exec(`taskkill ${forceFlag} /PID ${pid}`, (error) => {
                            if (error) {
                                console.warn(`Windows taskkill failed for PID ${pid}: ${error.message}`);
                            } else {
                                console.log(`Windows process ${pid} terminated via taskkill`);
                            }
                            resolve();
                        });
                        return;
                    }
                }
                
                // Unix/Linux/macOS - use standard process.kill
                process.kill(pid, signal);
                console.log(`Process ${pid} signaled with ${signal}`);
                
                // For SIGTERM, set up timeout for SIGKILL
                if (signal === 'SIGTERM' && timeout > 0) {
                    setTimeout(() => {
                        try {
                            if (this.isProcessAlive(pid)) {
                                console.warn(`Process ${pid} didn't exit gracefully, force killing`);
                                this.killProcessCrossPlatform(pid, 'SIGKILL', 0);
                            }
                        } catch (error) {
                            // Process likely already dead
                        }
                        resolve();
                    }, timeout);
                } else {
                    resolve();
                }
                
            } catch (error) {
                console.warn(`Failed to kill process ${pid}: ${error.message}`);
                resolve();
            }
        });
    }

    /**
     * Emergency cleanup of all neuron SDK processes
     * Uses actual executable name from NEURON_SDK_PATH
     */
    async emergencyCleanupAllProcesses() {
        console.log('Emergency cleanup: Terminating all neuron SDK processes...');
        
        const { exec } = require('child_process');
        const executablePath = process.env.NEURON_SDK_PATH;
        
        if (!executablePath) {
            console.warn('NEURON_SDK_PATH not set, cannot perform emergency cleanup');
            return;
        }
        
        // Extract executable name from path
        const executableName = path.basename(executablePath);
        const isWindows = process.platform === 'win32';
        
        return new Promise((resolve) => {
            let killCommand;
            
            if (isWindows) {
                // Windows: Kill by executable name
                const exeName = executableName.endsWith('.exe') ? executableName : `${executableName}.exe`;
                killCommand = `taskkill /F /IM "${exeName}"`;
            } else {
                // Unix/Linux/macOS: Kill by process name pattern
                // Look for processes with our executable name and port arguments
                killCommand = `pkill -f "${executableName}.*--port="`;
            }
            
            console.log(`Executing emergency cleanup command: ${killCommand}`);
            
            exec(killCommand, (error, stdout, stderr) => {
                if (error) {
                    // Check for specific "not found" messages
                    const notFoundMessages = [
                        'not found',
                        'No processes found',
                        'no process found',
                        'The process could not be found'
                    ];
                    
                    const isNotFound = notFoundMessages.some(msg => 
                        error.message.toLowerCase().includes(msg.toLowerCase())
                    );
                    
                    if (isNotFound) {
                        console.log(`No ${executableName} processes found during emergency cleanup`);
                    } else {
                        console.warn(`Emergency cleanup warning: ${error.message}`);
                    }
                } else {
                    const command = isWindows ? 'taskkill' : 'pkill';
                    console.log(`Emergency cleanup completed via ${command}: ${stdout.trim()}`);
                }
                
                // Also cleanup any registered processes that might be stale
                this.cleanupStaleRegisteredProcesses();
                resolve();
            });
        });
    }

    /**
     * Cleanup stale processes from registry
     */
    cleanupStaleRegisteredProcesses() {
        const allProcesses = this.registry.getAllProcesses();
        
        for (const [nodeId, processInfo] of Object.entries(allProcesses)) {
            if (!this.isProcessAlive(processInfo.pid)) {
                console.log(`Cleaning up stale registry entry for node ${nodeId}, PID ${processInfo.pid}`);
                this.registry.markProcessStopped(nodeId);
                this.portManager.releasePort(nodeId);
            }
        }
    }

    /**
     * Stop a process (during node removal) - Enhanced with cross-platform support
     */
    async stopProcess(nodeId) {
        console.log(`Stopping process for node ${nodeId}`);
        
        const goProcess = this.activeProcesses.get(nodeId);
        if (goProcess && !goProcess.killed) {
            // Stop health monitoring first
            this.stopHealthMonitoring(nodeId);
            
            // Use cross-platform termination
            await this.killProcessCrossPlatform(goProcess.pid, 'SIGTERM', 5000);
            
            // Mark as killed to prevent further operations
            goProcess.killed = true;
        }
        
        // Also try to kill any process from registry (for discovered processes)
        const registryEntry = this.registry.getProcess(nodeId);
        if (registryEntry && this.isProcessAlive(registryEntry.pid)) {
            console.log(`Also terminating registry process PID ${registryEntry.pid} for node ${nodeId}`);
            await this.killProcessCrossPlatform(registryEntry.pid, 'SIGTERM', 5000);
        }
        
        // Update registry
        this.registry.markProcessStopped(nodeId);
        
        // Release port
        this.portManager.releasePort(nodeId);
        
        // Clean up
        this.activeProcesses.delete(nodeId);
    }

    /**
     * Preserve a process (during redeploy)
     */
    preserveProcess(nodeId) {
        console.log(`Preserving process for node ${nodeId} during redeploy`);
        
        // Update last seen in registry
        this.registry.updateProcessStatus(nodeId, 'running');
        
        // Keep the process running but remove from active tracking
        // It will be rediscovered when the new node instance starts
        this.activeProcesses.delete(nodeId);
        this.stopHealthMonitoring(nodeId);
    }

    /**
     * Manual process termination by PID
     * Useful for debugging or emergency situations
     */
    async killProcessByPid(pid, signal = 'SIGTERM') {
        console.log(`Manual termination requested for PID ${pid} with signal ${signal}`);
        
        if (!this.isProcessAlive(pid)) {
            console.log(`Process ${pid} is not running`);
            return false;
        }
        
        await this.killProcessCrossPlatform(pid, signal, 5000);
        return true;
    }

    /**
     * List all managed processes
     */
    listAllProcesses() {
        const activeProcesses = Array.from(this.activeProcesses.entries()).map(([nodeId, process]) => ({
            nodeId,
            pid: process.pid,
            port: process._assignedPort,
            killed: process.killed
        }));
        
        const registryProcesses = this.registry.getAllProcesses();
        
        return {
            active: activeProcesses,
            registry: registryProcesses,
            summary: {
                activeCount: activeProcesses.length,
                registryCount: Object.keys(registryProcesses).length,
                healthMonitors: this.healthMonitors.size
            }
        };
    }

    /**
     * Get process statistics
     */
    getStats() {
        return {
            registry: this.registry.getStats(),
            ports: this.portManager.getStats(),
            activeProcesses: this.activeProcesses.size,
            healthMonitors: this.healthMonitors.size
        };
    }
}

module.exports = ProcessManager;

// Export utility functions for direct use
module.exports.emergencyCleanup = async function(executablePath) {
    const manager = new ProcessManager();
    if (executablePath) {
        // Temporarily set NEURON_SDK_PATH if provided
        const originalPath = process.env.NEURON_SDK_PATH;
        process.env.NEURON_SDK_PATH = executablePath;
        await manager.emergencyCleanupAllProcesses();
        if (originalPath) {
            process.env.NEURON_SDK_PATH = originalPath;
        } else {
            delete process.env.NEURON_SDK_PATH;
        }
    } else {
        await manager.emergencyCleanupAllProcesses();
    }
};

module.exports.killPid = async function(pid, signal = 'SIGTERM') {
    const manager = new ProcessManager();
    return await manager.killProcessByPid(pid, signal);
};

module.exports.listProcesses = function() {
    const manager = new ProcessManager();
    return manager.listAllProcesses();
}; 