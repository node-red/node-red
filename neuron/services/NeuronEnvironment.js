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

    console.log(`🔄 Reloading environment from: ${envPath}`);

    require('dotenv').config({
        path: envPath
    });

    // Emit the envChange event after reloading
    envEventEmitter.emit('change');
}

// Expose the onEnvChange event listener
module.exports.onEnvironmentChange = function onEnvironmentChange(callback) {
    envEventEmitter.on('change', callback);
};
