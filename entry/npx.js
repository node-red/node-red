#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

async function main() {
    try {
        console.log('🚀 Starting Neuron Node-RED...');
   
        // Get the path to the node-red package
        const nodeRedPath = path.resolve(__dirname, '..', 'packages', 'node_modules', 'node-red');

        // Get the path to the settings file
        const settingsPath = path.resolve(__dirname, '..', 'neuron-settings.js');
        
        // Check if settings file exists
        const fs = require('fs');
        if (!fs.existsSync(settingsPath)) {
            throw new Error(`Settings file not found at: ${settingsPath}`);
        }
        
        console.log(` Using settings: ${settingsPath}`);
        
        // Spawn node-red process with our settings
        const nodeRedProcess = spawn('node', [
            nodeRedPath,
            '--settings',
            settingsPath
        ], {
            stdio: 'inherit', // This will show node-red output in real-time
            shell: true
        });
        
        // Handle process events
        nodeRedProcess.on('error', (error) => {
            console.error('❌ Failed to start Node-RED:', error.message);
            process.exit(1);
        });
        
        nodeRedProcess.on('close', (code) => {
            if (code !== 0) {
                console.error(`❌ Node-RED exited with code ${code}`);
                process.exit(code);
            }
            console.log('✅ Node-RED stopped');
        });
        
        // Handle SIGINT (Ctrl+C) to gracefully stop Node-RED
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping Node-RED...');
            nodeRedProcess.kill('SIGINT');
        });
        
        process.on('SIGTERM', () => {
            console.log('\n🛑 Stopping Node-RED...');
            nodeRedProcess.kill('SIGTERM');
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
    case 'start':
    case undefined:
        main();
        break;
    case '--help':
    case '-h':
        console.log(`
Neuron Node-RED

Usage:
  npx github:NeuronInnovations/neuron-node-builder [command]

Commands:
  start    Start Node-RED with Neuron settings (default)
  --help   Show this help message

Examples:
  npx github:NeuronInnovations/neuron-node-builder
  npx github:NeuronInnovations/neuron-node-builder start
  npx github:NeuronInnovations/neuron-node-builder#main
  npx github:NeuronInnovations/neuron-node-builder#v1.0.0
        `);
        break;
    default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "npx github:NeuronInnovations/neuron-node-builder --help" for usage information');
        process.exit(1);
}