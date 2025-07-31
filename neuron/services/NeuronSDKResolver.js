const fs = require('fs');
const path = require('path');
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const os = require('os');
const NeuronEnvironment = require('./NeuronEnvironment');

const pipelineAsync = promisify(pipeline);

class NeuronSDKResolver {
    #repoUrl = 'https://api.github.com/repos/NeuronInnovations/neuron-sdk-websocket-wrapper/releases';
    #buildDir = path.resolve(__dirname, '..', '..', 'build', 'bin');

    constructor() {
    }

    async resolve() {
        if (process.env.NEURON_SDK_PATH && fs.existsSync(process.env.NEURON_SDK_PATH)) {
            console.log('✅ Neuron SDK already resolved at:', process.env.NEURON_SDK_PATH);
            return;
        }

        console.log('🔍 Resolving Neuron SDK...');

        try {
            // Ensure build directory exists
            this.#ensureBuildDirectory();

            // Get latest release
            const latestRelease = await this.#getLatestRelease();
            console.log(` Latest release: ${latestRelease.tag_name}`);

            // Find appropriate asset for current platform
            const asset = this.#findPlatformAsset(latestRelease.assets);
            if (!asset) {
                throw new Error(`No compatible binary found for platform: ${os.platform()} ${os.arch()}`);
            }

            console.log(` Selected asset: ${asset.name} (${this.#formatBytes(asset.size)})`);

            // Download the binary
            const binaryPath = await this.#downloadBinary(asset, latestRelease.tag_name);
            
            // Set executable permissions on Unix systems
            if (os.platform() !== 'win32') {
                fs.chmodSync(binaryPath, '755');
            }

            // Set environment variable
            process.env.NEURON_SDK_PATH = binaryPath;
            NeuronEnvironment.updateEnvValue('NEURON_SDK_PATH', binaryPath);

            console.log('✅ Neuron SDK resolved successfully');
            console.log(`📍 Binary location: ${binaryPath}`);

        } catch (error) {
            console.error('❌ Failed to resolve Neuron SDK:', error.message);
            throw error;
        }
    }

    #ensureBuildDirectory() {
        if (!fs.existsSync(this.#buildDir)) {
            fs.mkdirSync(this.#buildDir, { recursive: true });
            console.log(`📁 Created build directory: ${this.#buildDir}`);
        }
    }

    async #getLatestRelease() {
        return new Promise((resolve, reject) => {
            const url = new URL(this.#repoUrl);
            
            const options = {
                hostname: url.hostname,
                path: url.pathname,
                method: 'GET',
                headers: {
                    'User-Agent': 'Neuron-Node-Builder/1.0',
                    'Accept': 'application/vnd.github.v3+json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const releases = JSON.parse(data);
                            // Get the first (latest) release from the array
                            const latestRelease = releases[0];
                            if (!latestRelease) {
                                reject(new Error('No releases found'));
                                return;
                            }
                            resolve(latestRelease);
                        } catch (error) {
                            reject(new Error(`Failed to parse release data: ${error.message}`));
                        }
                    } else {
                        reject(new Error(`GitHub API returned status ${res.statusCode}: ${data}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Failed to fetch latest release: ${error.message}`));
            });

            req.setTimeout(30000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    #findPlatformAsset(assets) {
        const platform = os.platform();
        const arch = os.arch();
        
        // Map Node.js platform/arch to GitHub asset naming
        const platformMap = {
            'win32': {
                'x64': 'win64',
                'ia32': 'win32'
            },
            'linux': {
                'x64': 'linux64',
                'ia32': 'linux32'
            },
            'darwin': {
                'x64': 'darwin64',
                'arm64': 'darwin64' // Assuming ARM64 builds are named the same
            }
        };

        const targetPlatform = platformMap[platform]?.[arch];
        if (!targetPlatform) {
            throw new Error(`Unsupported platform: ${platform} ${arch}`);
        }

        // Find asset that matches our platform
        const asset = assets.find(asset => 
            asset.name.includes(`neuron-wrapper-${targetPlatform}`)
        );

        return asset;
    }

    async #downloadBinary(asset, version) {
        const fileName = asset.name;
        const filePath = path.join(this.#buildDir, fileName);
        
        // Check if file already exists and has correct size
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            if (stats.size === asset.size) {
                console.log(`📄 Binary already exists and matches expected size: ${fileName}`);
                return filePath;
            } else {
                console.log(`🔄 Binary exists but size mismatch, re-downloading: ${fileName}`);
                fs.unlinkSync(filePath);
            }
        }

        console.log(`⬇️ Downloading ${fileName}...`);
        
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath);
            let downloadedBytes = 0;
            const totalBytes = asset.size;

            const downloadWithRedirect = (url, maxRedirects = 5) => {
                const urlObj = new URL(url);
                
                const options = {
                    hostname: urlObj.hostname,
                    path: urlObj.pathname + urlObj.search,
                    method: 'GET',
                    headers: {
                        'User-Agent': 'Neuron-Node-Builder/1.0'
                    }
                };

                const req = https.request(options, (res) => {
                    // Handle redirects
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        if (maxRedirects > 0) {
                            console.log(` Following redirect to: ${res.headers.location}`);
                            req.destroy();
                            downloadWithRedirect(res.headers.location, maxRedirects - 1);
                        } else {
                            reject(new Error('Too many redirects'));
                        }
                        return;
                    }

                    if (res.statusCode !== 200) {
                        reject(new Error(`Download failed with status ${res.statusCode}`));
                        return;
                    }

                    res.on('data', (chunk) => {
                        downloadedBytes += chunk.length;
                        const progress = ((downloadedBytes / totalBytes) * 100).toFixed(1);
                        process.stdout.write(`\r Download progress: ${progress}% (${this.#formatBytes(downloadedBytes)}/${this.#formatBytes(totalBytes)})`);
                    });

                    res.pipe(file);

                    file.on('finish', () => {
                        file.close();
                        process.stdout.write('\n'); // New line after progress
                        console.log(`✅ Download completed: ${fileName}`);
                        resolve(filePath);
                    });
                });

                req.on('error', (error) => {
                    fs.unlink(filePath, () => {}); // Clean up partial file
                    reject(new Error(`Download failed: ${error.message}`));
                });

                req.setTimeout(60000, () => {
                    req.destroy();
                    fs.unlink(filePath, () => {}); // Clean up partial file
                    reject(new Error('Download timeout'));
                });

                req.end();
            };

            // Start the download with redirect handling
            downloadWithRedirect(asset.browser_download_url);
        });
    }

    #formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = NeuronSDKResolver;