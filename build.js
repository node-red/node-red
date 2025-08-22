const fs = require('fs');
const { execSync } = require('child_process');
const axios = require('axios');
const { input } = require('@inquirer/prompts');
const chalk = require('chalk');
const path = require('path');

async function build() {
    const baseDirectory = path.dirname(__filename);

    const directories = [
        `${baseDirectory}/build/releases`,
        `${baseDirectory}/build/bin`,
        `${baseDirectory}/build/config`,
    ];

    console.log(chalk.grey(`Release directory: ${directories[0]}`));
    console.log(chalk.grey(`Downloaded binary directory: ${directories[1]}`));
    console.log(chalk.grey(`Config directory: ${directories[2]}`));

    if (!fs.existsSync(directories[0])) {
        fs.mkdirSync(directories[0], { recursive: true });
    }

    if (!fs.existsSync(directories[1])) {
        fs.mkdirSync(directories[1], { recursive: true });
    }

    if (!fs.existsSync(directories[2])) {
        fs.mkdirSync(directories[2], { recursive: true });
    }

    const ghToken = process.env.GH_BUILD_TOKEN;
    let obfGhToken = null;

    if (process.env.GH_BUILD_TOKEN === undefined) {
        console.log(chalk.yellow('ℹ️ You can set the environment variable GH_BUILD_TOKEN to set a default token'));
    } else {
        obfGhToken = ghToken.substring(0, 8) + '...' + ghToken.substring(ghToken.length - 4);
    }

    const tokenResponse = await input({
        message: 'Provide GitHub token with access to neuron-sdk-websocket-wrapper',
        default: obfGhToken,
    });

    const token = (tokenResponse === obfGhToken ? ghToken : tokenResponse);

    async function getLatestTag() {
        try {
            const response = await axios.get('https://api.github.com/repos/NeuronInnovations/neuron-sdk-websocket-wrapper/releases', {
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'Authorization': `Bearer ${token}`,
                    'X-GitHub-Api-Version': '2022-11-28',
                }
            });

            return response.data[0].tag_name;
        } catch (error) {
            console.error(chalk.red('Error fetching latest tag:'), error.message);

            process.exit(0);
        }
    }

    const tag = await input({
        message: 'Provide neuron-wrapper dependency version/tag',
        default: await getLatestTag(),
    });

    console.log(chalk.blue(`Building using neuron-wrapper tag: ${tag}`));

    console.log(chalk.green.underline('Finding Assets'));

    async function getAssets() {
        try {
            const response = await axios.get(`https://api.github.com/repos/NeuronInnovations/neuron-sdk-websocket-wrapper/releases/tags/${tag}`, {
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'Authorization': `Bearer ${token}`,
                    'X-GitHub-Api-Version': '2022-11-28',
                }
            });

            return response.data.assets.map((asset) => {
                return {
                    id: asset.id,
                    name: asset.name,
                };
            });
        } catch (error) {
            console.error(chalk.red('Error fetching assets:'), error.message);

            process.exit(0);
        }
    }

    const assets = await getAssets();

    console.log(chalk.blue(`Found ${assets.length} assets`));

    console.log(chalk.green.underline('Downloading Assets'));

    async function downloadAsset(asset) {
        try {
            console.log(chalk.blue(`Downloading asset: ${asset.name}`));

            const binDir = directories[1];

            if (!fs.existsSync(binDir)) {
                fs.mkdirSync(binDir, { recursive: true });
            }

            const downloadResponse = await axios.get(`https://api.github.com/repos/NeuronInnovations/neuron-sdk-websocket-wrapper/releases/assets/${asset.id}`, {
                headers: {
                    'Accept': 'application/octet-stream',
                    'Authorization': `Bearer ${token}`,
                    'X-GitHub-Api-Version': '2022-11-28',
                },
                responseType: 'stream',
            });

            const filePath = path.join(binDir, asset.name);
            const writer = fs.createWriteStream(filePath);

            downloadResponse.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(chalk.blue(`Downloaded ${asset.name} to ${filePath}`));
                    resolve(filePath);
                });
                writer.on('error', reject);
            });
        } catch (error) {
            console.error(chalk.red('Error downloading asset:'), error.message);

            process.exit(0);
        }
    }

    for (const asset of assets) {
        await downloadAsset(asset);
    }

    console.log(chalk.green.underline('Building Executables'));

    async function buildExecutable(target, bin, output) {
        try {
            console.log(chalk.blue(`Building ${target}`));

            const binPath = path.join(directories[1], bin);

            if (!fs.existsSync(binPath)) {
                console.error(chalk.red(`Binary ${bin} not found`));

                process.exit(0);
            }

            const outputPath = path.join(directories[0], output);

            console.log(chalk.grey(`Using binary: ${binPath}`));
            console.log(chalk.grey(`Output: ${outputPath}`));

            const pkgConfig = {
                scripts: [
                    "../../packages/node_modules/node-red/**",
                ],
                assets: [
                    "../../package.json",
                    "../../neuron/**",
                    "../../packages/node_modules/@node-red/**",
                    "../../packages/node_modules/node-red/**",
                    "../../flows.json",
                    `../../build/bin/${bin}`,
                    "../../neuron-settings.js",
                    "../../.env.example",
                ],
            }

            const configPath = path.join(directories[2], `pkg-${target}.json`);

            fs.writeFileSync(configPath, JSON.stringify(pkgConfig, null, 2));

            const command = `pkg --config ${configPath} -t ${target} -o ${outputPath} index.js`;

            console.log(chalk.grey(`Running: ${command}`));

            execSync(command);

            console.log(chalk.blue(`Built ${target}`));
        } catch (error) {
            console.error(chalk.red('Error building executable:'), error.message);

            process.exit(0);
        }
    }

    const targets = {
        'latest-win-x64': { bin: 'neuron-wrapper-win64.exe', output: 'latest-win-x64.exe' },
        'latest-macos-x64': { bin: 'neuron-wrapper-darwin64', output: 'latest-macos-x64' },
        'latest-linux-x64': { bin: 'neuron-wrapper-linux64', output: 'latest-linux-x64' },
    };

    for (const target of Object.keys(targets)) {
        buildExecutable(target, targets[target].bin, targets[target].output);
    }

    console.log(chalk.bold.red(`⚠️ Don't forget to commit the binary assets (build/bin folder) to GitHub before creating the release!`));
}

build();
