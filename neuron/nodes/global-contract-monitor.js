// Load environment variables with configurable path
require('../services/NeuronEnvironment').load();

const path = require('path');
const fs = require('fs');
const { HederaContractService } = require('neuron-js-registration-sdk');

// --- GLOBAL CONTRACT MONITORING SERVICE (Singleton) ---
// Separate data structures for each contract
let globalPeerCounts = {
    jetvision: 0,
    chat: 0,
    challenges: 0
};
let globalAllDevices = {
    jetvision: [],
    chat: [],
    challenges: []
};
let contractLoadingStates = {
    jetvision: false,
    chat: false,
    challenges: false
};
let contractMonitoringInterval = null;
let isContractMonitoringActive = false;
let contractServices = {};

// Cache file paths for persistent storage
const cacheDir = path.join(require('../services/NeuronUserHome').load(), 'cache');
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}
const cacheFiles = {
    jetvision: 'contract-data-jetvision.json',
    chat: 'contract-data-chat.json',
    challenges: 'contract-data-challenges.json'
};
for (let cacheFile in cacheFiles) {
    const cacheFilePath = path.join(cacheDir, cacheFiles[cacheFile]);

    if (!fs.existsSync(cacheFilePath)) {
        let cacheSampleData = {};

        if (fs.existsSync(path.join(__dirname, 'cache', cacheFiles[cacheFile]))) {
            cacheSampleData = fs.readFileSync(path.join(__dirname, 'cache', cacheFiles[cacheFile]), 'utf-8');
            cacheSampleData = JSON.parse(cacheSampleData);
        }

        fs.writeFileSync(cacheFilePath, JSON.stringify(cacheSampleData, null, 2));
    }

    cacheFiles[cacheFile] = cacheFilePath;
}

// Contract configuration
const contracts = ['jetvision', 'chat', 'challenges'];
const contractConfigs = {
    jetvision: {
        contractId: process.env.JETVISION_CONTRACT_ID,
        contractEvm: process.env.JETVISION_CONTRACT_EVM
    },
    chat: {
        contractId: process.env.CHAT_CONTRACT_ID,
        contractEvm: process.env.CHAT_CONTRACT_EVM
    },
    challenges: {
        contractId: process.env.CHALLENGES_CONTRACT_ID,
        contractEvm: process.env.CHALLENGES_CONTRACT_EVM
    }
};

// Load cached contract data for a specific contract
function loadCachedContractData(contract) {
    try {
        const cacheFile = cacheFiles[contract];
        if (fs.existsSync(cacheFile)) {
            const cachedData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
            globalPeerCounts[contract] = cachedData.peerCount || 0;
            globalAllDevices[contract] = cachedData.allDevices || [];
            
            const lastUpdated = new Date(cachedData.lastUpdated);
            const hoursSinceUpdate = (new Date() - lastUpdated) / (1000 * 60 * 60);
            
            console.log(`Loaded cached ${contract} contract data: ${globalPeerCounts[contract]} peers, ${globalAllDevices[contract].length} devices (updated ${hoursSinceUpdate.toFixed(1)} hours ago)`);
            return true;
        }
    } catch (error) {
        console.error(`Failed to load cached ${contract} contract data:`, error.message);
    }
    return false;
}

// Save contract data to cache for a specific contract
function saveContractDataToCache(contract) {
    try {
        const cacheData = {
            peerCount: globalPeerCounts[contract],
            allDevices: globalAllDevices[contract],
            lastUpdated: new Date().toISOString()
        };
        
        // Custom JSON serializer to handle BigInt values
        const jsonString = JSON.stringify(cacheData, (key, value) => {
            if (typeof value === 'bigint') {
                return value.toString();
            }
            return value;
        }, 2);
        
        fs.writeFileSync(cacheFiles[contract], jsonString, 'utf-8');
        console.log(`Saved ${contract} contract data to cache: ${globalPeerCounts[contract]} peers, ${globalAllDevices[contract].length} devices`);
    } catch (error) {
        console.error(`Failed to save ${contract} contract data to cache:`, error.message);
    }
}

// Fetch data for a specific contract
async function fetchContractData(contract) {
    try {
        console.log(`Fetching fresh ${contract} contract data...`);
        contractLoadingStates[contract] = true;
        
        const contractService = contractServices[contract];
        if (!contractService) {
            console.error(`Cannot fetch data - no service for ${contract}`);
            return;
        }   
        const contractId = contractConfigs[contract].contractId;
        const contractEvm = contractConfigs[contract].contractEvm;
        
        const freshPeerCount = await contractService.getPeerArraySize(contractEvm);
        console.log(`Fresh ${contract} peer count: ${freshPeerCount}`);
        
        if (freshPeerCount <= globalPeerCounts[contract]) {
            console.log(`No changes in ${contract} peer count (${freshPeerCount}). Skipping fetch.`);
            contractLoadingStates[contract] = false;
            return;
        }
        
        if (freshPeerCount > 0) {
            // Start from existing peer count + 1 to avoid re-fetching known devices
            const startIndex = globalPeerCounts[contract] > 0 ? globalPeerCounts[contract]  : 0;
            console.log(`Fetching ${contract} devices starting from index: ${startIndex}`);
            
            const freshAllDevices = await contractService.getAllDevices(
                contractEvm,
                startIndex
            );
            console.log(`Fresh ${contract} device count: ${freshAllDevices.length}`);
            
            // If we started from an index > 0, merge with existing devices
            if (startIndex > 0) {
                globalAllDevices[contract] = [...globalAllDevices[contract], ...freshAllDevices];
                console.log(`Total ${contract} devices after merge: ${globalAllDevices[contract].length}`);
            } else {
                globalAllDevices[contract] = freshAllDevices;
            }
            
            // Update global variables
            globalPeerCounts[contract] = freshPeerCount;
            
            // Save to cache
            saveContractDataToCache(contract);
            
            console.log(`Fresh ${contract} contract data loaded and cached successfully`);
        } else {
            console.log(`No peers found in fresh ${contract} data`);
            globalPeerCounts[contract] = 0;
            globalAllDevices[contract] = [];
            saveContractDataToCache(contract);
        }
    } catch (error) {
        console.error(`Failed to fetch fresh ${contract} contract data:`, error.message);
        // Continue with empty data for failed contracts
        globalPeerCounts[contract] = 0;
        globalAllDevices[contract] = [];
        saveContractDataToCache(contract);
    } finally {
        contractLoadingStates[contract] = false;
    }
}

// Initialize global contract monitoring service
async function initializeGlobalContractMonitoring() {
    if (isContractMonitoringActive) {
        console.log('Global contract monitoring service already active');
        return; // Already initialized and running
    }

    console.log('Initializing global contract monitoring service for all contracts...');
    
    // Step 1: Load cached data immediately for fast startup
    const hasCachedData = {};
    contracts.forEach(contract => {
        hasCachedData[contract] = loadCachedContractData(contract);
    });
    
    try {
        // Initialize HederaContractService for each contract
        const HederaContractServiceClass = HederaContractService.default || HederaContractService;
        
        contracts.forEach(contract => {
            try {
                const setup = () => {
                    const operatorId = process.env.HEDERA_OPERATOR_ID;
                    const operatorKey = process.env.HEDERA_OPERATOR_KEY;
                    const contractId = contractConfigs[contract].contractId
                    if (!operatorId || !operatorKey || !contractId) {
                        console.error(`Missing required environment variables for ${contract} contract`);
                        return;
                    }
                    contractServices[contract] = new HederaContractServiceClass({
                        network: process.env.HEDERA_NETWORK || 'testnet',
                        operatorId: process.env.HEDERA_OPERATOR_ID,
                        operatorKey: process.env.HEDERA_OPERATOR_KEY,
                        contractId: contractConfigs[contract].contractId
                    });
                };

                setup();
                
                console.log(`Initialized ${contract} contract service`);

                require('../services/NeuronEnvironment').onEnvironmentChange(() => {
                    console.log('Environment changed, reloading contract service for ' + contract);
                    
                    setup();
                });
            } catch (error) {
                console.error(`Failed to initialize ${contract} contract service:`, error.message);
                contractServices[contract] = null;
            }
        });

        const validContracts = contracts.filter(contract => contractServices[contract] !== null);
    
        if (validContracts.length === 0) {
            throw new Error('No contract services initialized successfully');
        }

        // Step 2: Fetch fresh data for all contracts sequentially (to avoid rate limiting)
        const fetchAllContractsData = async () => {
            console.log('Fetching fresh data for all contracts sequentially...');
            for (const contract of contracts) {
                try {
                    console.log(`Fetching data for ${contract} contract...`);
                    await fetchContractData(contract);
                    // Add a small delay between contracts to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`Failed to fetch data for ${contract} contract:`, error.message);
                }
            }
            console.log('Completed fetching fresh data for all contracts');
        };

        // Start fresh data fetch in background (non-blocking)
        fetchAllContractsData();

        // Step 3: Set up monitoring interval (every 5 minutes) for all contracts
        contractMonitoringInterval = setInterval(async () => {
            try {
                console.log('Contract monitoring: Checking all contracts for updates...');
                
                for (const contract of contracts) {
                    try {
                        const contractService = contractServices[contract];
                        if (!contractService) {
                            console.warn(`No service available for ${contract} contract`);
                            continue;
                        }
                        
                        const contractId = contractConfigs[contract].contractId;
                        const currentPeerCount = await contractService.getPeerArraySize(contractId);
                        console.log(`Contract monitoring: Current ${contract} peer count: ${currentPeerCount}, Previous: ${globalPeerCounts[contract]}`);
                        
                        if (currentPeerCount !== globalPeerCounts[contract]) {
                            console.log(`${contract} peer count changed from ${globalPeerCounts[contract]} to ${currentPeerCount}. Updating device list...`);
                            
                            if (currentPeerCount > 0) {
                                // Start from existing peer count + 1 to avoid re-fetching known devices
                                const startIndex = globalPeerCounts[contract] > 0 ? globalPeerCounts[contract]  : 0;
                                console.log(`Fetching new ${contract} devices starting from index: ${startIndex}`);
                                
                                const contractEvm = contractConfigs[contract].contractEvm;
                                const newDevices = await contractService.getAllDevices(
                                    contractEvm,
                                    startIndex
                                );
                                console.log(`New ${contract} device count: ${newDevices.length}`);
                                
                                // If we started from an index > 0, merge with existing devices
                                if (startIndex > 0) {
                                    globalAllDevices[contract] = [...globalAllDevices[contract], ...newDevices];
                                    console.log(`Total ${contract} devices after merge: ${globalAllDevices[contract].length}`);
                                } else {
                                    globalAllDevices[contract] = newDevices;
                                }
                            } else {
                                globalAllDevices[contract] = [];
                                console.log(`No peers found in ${contract}, cleared device list`);
                            }
                            
                            globalPeerCounts[contract] = currentPeerCount;
                            
                            // Save updated data to cache
                            saveContractDataToCache(contract);
                        }
                        
                        // Add a small delay between contracts to avoid rate limiting
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (error) {
                        console.error(`Error monitoring ${contract} contract:`, error.message);
                    }
                }
            } catch (error) {
                console.error('Error in contract monitoring interval:', error.message);
            }
        }, 5 * 60 * 1000); // 5 minutes

        isContractMonitoringActive = true;
        console.log('Global contract monitoring service initialized successfully for all contracts');
        
    } catch (error) {
        console.error('Failed to initialize global contract monitoring service:', error.message);
        const hasAnyCachedData = Object.values(hasCachedData).some(hasData => hasData);
        if (!hasAnyCachedData) {
            console.error('No cached data available. Contract monitoring service failed to initialize.');
        } else {
            console.log('Using cached data only. Contract monitoring service partially initialized.');
            isContractMonitoringActive = true;
        }
    }
}

// Cleanup function for contract monitoring
function cleanupGlobalContractMonitoring() {
    if (contractMonitoringInterval) {
        clearInterval(contractMonitoringInterval);
        contractMonitoringInterval = null;
        console.log('Global contract monitoring service stopped');
    }
    isContractMonitoringActive = false;
}

// Getter functions for accessing global data (with contract parameter)
function getGlobalPeerCount(contract = 'jetvision') {
    const count = globalPeerCounts[contract] || 0;
    console.log(`getGlobalPeerCount called for ${contract}. Returning: ${count}`);
    return count;
}

function getGlobalAllDevices(contract = 'jetvision') {
    const devices = globalAllDevices[contract] || [];
    console.log(`getGlobalAllDevices called for ${contract}. Returning ${devices.length} devices:`, devices);
    return devices;
}

function isContractLoading(contract = 'jetvision') {
    const loading = contractLoadingStates[contract] || false;
    console.log(`isContractLoading called for ${contract}. Returning: ${loading}`);
    return loading;
}

function isMonitoringActive() {
    console.log(`isMonitoringActive called. Returning: ${isContractMonitoringActive}`);
    return isContractMonitoringActive;
}

// Export the singleton interface
module.exports = {
    initializeGlobalContractMonitoring,
    cleanupGlobalContractMonitoring,
    getGlobalPeerCount,
    getGlobalAllDevices,
    isContractLoading,
    isMonitoringActive
}; 