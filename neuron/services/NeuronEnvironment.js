const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// Create an EventEmitter instance for environment changes
const envEventEmitter = new EventEmitter();

const determineEnvPath = () => {
    if (process.env.NEURON_ENV_PATH && fs.existsSync(process.env.NEURON_ENV_PATH)) {
        return process.env.NEURON_ENV_PATH;
    }

    const envPath = path.resolve(__dirname, '..', '..', '.env');

    if (!fs.existsSync(envPath)) {
        throw new Error(`Environment file not found at: ${envPath}`);
    }

    process.env.NEURON_ENV_PATH = envPath;

    return envPath;
}

module.exports.getPath = function getPath() {
    return determineEnvPath();
}

module.exports.load = function load() {
    const envPath = determineEnvPath();

    console.log(`🔧 Loading environment from: ${envPath}`);

    require('dotenv').config({
        path: envPath
    });
};

module.exports.reload = function reload() {
    const envPath = determineEnvPath();

    // Store current environment state before reloading
    const currentEnv = { ...process.env };

    require('dotenv').config({
        path: envPath
    });

    // Check if environment has actually changed
    const hasChanged = hasEnvironmentChanged(currentEnv, process.env);
    
    if (hasChanged) {
        console.log('✅ Environment variables changed, emitting change event');
        envEventEmitter.emit('change');
    }
}

// Helper function to detect environment changes
function hasEnvironmentChanged(oldEnv, newEnv) {
    // Get all unique keys from both environments
    const allKeys = new Set([...Object.keys(oldEnv), ...Object.keys(newEnv)]);
    
    for (const key of allKeys) {
        // Skip internal Node.js environment variables that might change
        if (key.startsWith('NODE_') || key === 'PWD' || key === 'OLDPWD') {
            continue;
        }
        
        const oldValue = oldEnv[key];
        const newValue = newEnv[key];
        
        // Check if value has changed
        if (oldValue !== newValue) {
            console.log(` Environment change detected: ${key} = "${oldValue}" → "${newValue}"`);
            return true;
        }
    }
    
    return false;
}

// Expose the onEnvChange event listener
module.exports.onEnvironmentChange = function onEnvironmentChange(callback) {
    envEventEmitter.on('change', callback);
};
