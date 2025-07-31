#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Check for debug flag
const args = process.argv.slice(2);
const isDebug = args.includes('--debug') || args.includes('-d');

async function setupEnvironment() {
    const neuronDir = path.join(os.homedir(), '.neuron-node-builder');
    const envPath = path.join(neuronDir, '.env');
    const examplePath = path.resolve(__dirname, '..', '.env.example');

    // Create .neuron-node-builder directory if it doesn't exist
    if (!fs.existsSync(neuronDir)) {
        fs.mkdirSync(neuronDir, { recursive: true });
        console.log(`�� Created directory: ${neuronDir}`);
    }

    // If .env doesn't exist, copy from .env.example
    if (!fs.existsSync(envPath)) {
        fs.copyFileSync(examplePath, envPath);
        console.log(`📋 Copied .env.example to ${envPath}`);
    }

    // Set the environment path for NeuronEnvironment to use
    process.env.NEURON_ENV_PATH = envPath;
    return envPath;
}

async function checkNeedsBuild() {
    const projectRoot = path.resolve(__dirname, '..');
    const builtFile = path.join(projectRoot, 'packages', 'node_modules', '@node-red', 'editor-client', 'public', 'red', 'red.js');
    
    // Check if the built file exists
    if (!fs.existsSync(builtFile)) {
        console.log('🔨 Built file not found, build needed');
        return true;
    }
    
    console.log('✅ Built file exists, skipping build');
    return false;
}

async function runBuild() {
    return new Promise(async (resolve, reject) => {
        console.log('🔨 Running build...');
        
        try {
            // First, install dependencies if needed
            console.log('📦 Installing dependencies...');
            await new Promise((installResolve, installReject) => {
                const installProcess = spawn('npm', ['install'], {
                    stdio: isDebug ? 'inherit' : 'pipe', // Show output only in debug mode
                    shell: true,
                    cwd: path.resolve(__dirname, '..')
                });

                installProcess.on('close', (code) => {
                    if (code === 0) {
                        console.log('✅ Dependencies installed');
                        installResolve();
                    } else {
                        installReject(new Error(`Dependency installation failed with code ${code}`));
                    }
                });

                installProcess.on('error', (error) => {
                    installReject(new Error(`Installation process error: ${error.message}`));
                });
            });

            // Then run the build
            console.log('🔨 Building node-red assets...');
            const buildProcess = spawn('npm', ['run', 'build'], {
                stdio: isDebug ? 'inherit' : 'pipe', // Show output only in debug mode
                shell: true,
                cwd: path.resolve(__dirname, '..')
            });

            buildProcess.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Build completed successfully');
                  
                    resolve();
                } else {
                    // If build fails, try to continue anyway since Node-RED might work without the build
                    console.warn('⚠️ Build failed, but continuing with Node-RED startup...');
                    console.warn('Some UI features might not work correctly');
                    resolve();
                }
            });

            buildProcess.on('error', (error) => {
                console.warn('⚠️ Build process error, but continuing...');
                console.warn(error.message);
                resolve();
            });

        } catch (error) {
            console.warn('⚠️ Build setup failed, but continuing...');
            console.warn(error.message);
            resolve();
        }
    });
}

async function main() {
    try {
        console.log('🚀 Starting Neuron Node-RED...');
    
        // Setup environment file
        const envPath = await setupEnvironment();
        console.log(` Using environment: ${envPath}`);

        // 🔨 Check if build is needed and run if necessary
        if (await checkNeedsBuild()) {
            await runBuild();
        }

        // Get the path to the node-red package
        const nodeRedPath = path.resolve(__dirname, '..', 'packages', 'node_modules', 'node-red', 'red.js');

        // Get the path to the settings file
        const settingsPath = path.resolve(__dirname, '..', 'neuron-settings.js');
        
        // Check if settings file exists
        if (!fs.existsSync(settingsPath)) {
            throw new Error(`Settings file not found at: ${settingsPath}`);
        }

        // Check if node-red exists
        if (!fs.existsSync(nodeRedPath)) {
            throw new Error(`Node-RED not found at: ${nodeRedPath}`);
        }

        console.log(` Using settings: ${settingsPath}`);
        console.log(` Using Node-RED: ${nodeRedPath}`);
        
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
                console.error('This usually indicates an error in the settings file or Node-RED configuration');
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
const command = args.find(arg => !arg.startsWith('-')); // Get first non-flag argument

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
  npx github:NeuronInnovations/neuron-node-builder [command] [options]

Commands:
  start    Start Node-RED with Neuron settings (default)
  --help   Show this help message

Options:
  --debug, -d    Show detailed build output

Examples:
  npx github:NeuronInnovations/neuron-node-builder
  npx github:NeuronInnovations/neuron-node-builder start
  npx github:NeuronInnovations/neuron-node-builder --debug
  npx github:NeuronInnovations/neuron-node-builder#main
  npx github:NeuronInnovations/neuron-node-builder#v1.0.0

Environment:
  Configuration is stored in ~/.neuron-node-builder/.env
  If no .env exists, it will be created from .env.example
        `);
        break;
    default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "npx github:NeuronInnovations/neuron-node-builder --help" for usage information');
        process.exit(1);
}