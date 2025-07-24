const NeuronEnv = require('./NeuronEnvironment');

const REQUIRED_VARS = ['HEDERA_OPERATOR_ID', 'HEDERA_OPERATOR_KEY'];

function hasCredentials() {
    return REQUIRED_VARS.every((key) => process.env[key]);
}

function waitForEnvReady(callback) {
    const interval = setInterval(() => {
        console.log("🔁 Waiting for environment credentials...");
        NeuronEnv.reload();
        if (hasCredentials()) {
            clearInterval(interval);
            callback();  
        }
    }, 500);  
}

module.exports = waitForEnvReady;
