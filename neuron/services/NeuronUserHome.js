const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const directory = '.neuron-node-builder';

module.exports.load = function load() {
    let homePath = process.env.NEURON_USER_PATH;

    if (!homePath || !fs.existsSync(homePath)) {
        homePath = path.resolve(os.homedir(), directory);
    }

    if (!fs.existsSync(homePath)) {
        console.log(`📁 Creating user home directory at: ${homePath}`);

        fs.mkdirSync(homePath, { recursive: true });
    }

    const nodeRedPath = path.resolve(homePath, 'node-red-userdir');

    if (!fs.existsSync(nodeRedPath)) {
        fs.mkdirSync(nodeRedPath, { recursive: true });
    }

    process.env.NEURON_USER_PATH = homePath;

    console.log(`🏠 User home directory: ${homePath}`);

    return homePath;
}
