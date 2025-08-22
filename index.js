#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('node:os');

// Resolve path to the .env file
const envPath = path.resolve(os.homedir(), '.neuron-node-builder', '.env');

console.log(`Using .env file: ${envPath}`);

// Check if the .env file exists
if (fs.existsSync(envPath)) {
  console.log('Env path exists');
} else {
  console.log('Env path does not exist');

  const envTemplate = path.resolve(__dirname, '.env.example');
  fs.copyFileSync(envTemplate, envPath);
}

// Load .env file
require('dotenv').config({
  path: envPath,
});

// Construct binary map
const binaries = {
  'win32': 'neuron-wrapper-win64.exe',
  'darwin': 'neuron-wrapper-macos-arm64',
  'linux': 'neuron-wrapper-linux-arm64'
};

console.log(`Using binary for ${os.platform()}: ${binaries[os.platform()]}`);

// Resolve path to the neuron-wrapper binary
const binPath = path.resolve(__dirname, 'build', 'bin', binaries[os.platform()]);

console.log(`Using neuron-wrapper binary: ${binPath}`);

// Check if the binary exists
if (fs.existsSync(binPath)) {
  console.log('Binary path exists');
} else {
  console.log('Binary path does not exist');

  process.exit(0);
}

// Resolve path to the CLI JS file inside node_modules
const cliPath = path.resolve(__dirname, 'packages', 'node_modules', 'node-red', 'red.js');

// Pass command line args through to Node-RED
// const args = process.argv.slice(2);
const args = [
  '--settings',
  path.resolve(__dirname, 'neuron-settings.js')
];

console.log(process.execPath, cliPath, args);

fs.readdir(__dirname, (err, files) => {
  files.forEach(file => {
    // will also include directory names
    console.log(file);
  });
});

const child = spawn(process.execPath, [cliPath, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEURON_SDK_PATH: binPath,
    NEURON_ENV_PATH: envPath,
  }
});

child.on('exit', (code) => {
  console.log('Process Exited', code);
});