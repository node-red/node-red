const NeuronEnv = require('./NeuronEnvironment');

const REQUIRED_VARS = ['HEDERA_OPERATOR_ID', 'HEDERA_OPERATOR_KEY', 'NEURON_SDK_PATH'];

function hasCredentials() {
    return REQUIRED_VARS.every((key) => process.env[key]);
}

function waitForEnvReady(callback) {
    console.log("🔁 Waiting for environment credentials...");

    const interval = setInterval(() => {
        NeuronEnv.reload();
        if (hasCredentials()) {
            clearInterval(interval);
            callback();  
        }
    }, 500);  
}

module.exports = waitForEnvReady;
