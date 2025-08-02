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

    const originalLog = console.log;
    console.log = () => {};

    require('dotenv').config({
        path: envPath
    });

    console.log = originalLog;

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

// Function to update a single .env value
module.exports.updateEnvValue = function updateEnvValue(key, value) {
    const envPath = determineEnvPath();
    
    try {
        // Read existing .env file
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf-8');
        }
        
        // Parse existing content
        const lines = envContent.split('\n');
        let keyFound = false;
        
        // Update existing key or add new one
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Skip empty lines and comments
            if (!line || line.startsWith('#')) {
                continue;
            }
            
            // Check if this line contains our key
            if (line.startsWith(`${key}=`)) {
                lines[i] = `${key}=${value}`;
                keyFound = true;
                break;
            }
        }
        
        // If key wasn't found, add it to the end
        if (!keyFound) {
            lines.push(`${key}=${value}`);
        }
        
        // Write updated content back to file
        const updatedContent = lines.join('\n');
        fs.writeFileSync(envPath, updatedContent, 'utf-8');
        
        console.log(`✅ Updated .env file: ${key}=${value}`);
        
        // Reload environment to apply changes
        this.reload();
        
        return true;
        
    } catch (error) {
        console.error(`❌ Failed to update .env value: ${error.message}`);
        throw error;
    }
}

// Expose the onEnvChange event listener
module.exports.onEnvironmentChange = function onEnvironmentChange(callback) {
    envEventEmitter.on('change', callback);
};
