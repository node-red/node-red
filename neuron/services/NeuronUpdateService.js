const path = require('node:path');
const fs = require('node:fs');
const https = require('node:https');

const releasesUrl = 'https://raw.githubusercontent.com/NeuronInnovations/neuron-node-builder-installer/refs/heads/main/releases.json';

class NeuronUpdateService {
    #updateFlagsPath;

    constructor() {
        this.#updateFlagsPath = path.resolve(require('./NeuronUserHome').load(), 'update-flags.json');
    }

    async #getUpdateFlags() {
        if (!fs.existsSync(this.#updateFlagsPath)) {
            fs.writeFileSync(this.#updateFlagsPath, JSON.stringify({}, null, 2));

            return {};
        }

        return JSON.parse(fs.readFileSync(this.#updateFlagsPath, 'utf-8'));
    }

    async #setUpdateFlags(updateFlags) {
        fs.writeFileSync(this.#updateFlagsPath, JSON.stringify(updateFlags, null, 2));
    }

    async #getVersion() {
        try {
            const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');

            return JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')).version;
        } catch (error) {
            console.error('Error reading package.json version:', error);

            return 'unknown';
        }
    }

    async #getLatestUpdate() {
        return new Promise((resolve, reject) => {
            return resolve({
                version: '4.1.0',
                isMandatory: false
            });

            https.get(releasesUrl, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const releases = JSON.parse(data);

                        if (Array.isArray(releases) && releases.length > 0) {
                            // Get the last object in the array (latest release)
                            const latestRelease = releases[releases.length - 1];
                            console.log(' - 📦 Latest release fetched:', latestRelease);
                            resolve(latestRelease);
                        } else {
                            console.log(' - ⚠️ No releases found in releases.json');
                            resolve(null);
                        }
                    } catch (error) {
                        console.error(' - ❌ Error parsing releases.json:', error.message);
                        resolve(null);
                    }
                });
            }).on('error', (error) => {
                console.error(' - ❌ Error fetching releases.json:', error.message);
                resolve(null);
            });
        });
    }

    async checkForUpdates(searchParams) {
        console.log(`🔍 Checking for updates`);

        // Get the update flags, current version, and latest update
        const updateFlags = await this.#getUpdateFlags();
        const currentVersion = await this.#getVersion();
        const latestUpdate = await this.#getLatestUpdate();

        console.log(` - 📦 Current version: ${currentVersion}`);

        // Check if a new update is available
        if (latestUpdate === null) {
            console.log(' - ✅ No updates found');

            return { type: 'continue' };
        }

        // Check if the current version is the latest version
        if (currentVersion === latestUpdate.version) {
            console.log(' - ✅ No updates found');

            return { type: 'continue' };
        }

        // Check if the update is mandatory
        if (latestUpdate.isMandatory) {
            console.log(' - 🚨 Mandatory update required:', latestUpdate.version);

            return { type: 'redirect', url: `/neuron/pages/mandatory-update.html?current=${currentVersion}&required=${latestUpdate.version}` };
        }

        console.log(' - 🚨 Optional update available:', latestUpdate.version);

        // Check if the user wants to skip the update
        if (searchParams.get('skip') === 'true') {
            if (updateFlags.skippedVersions === undefined) {
                updateFlags.skippedVersions = [];
            }

            updateFlags.skippedVersions.push(latestUpdate.version);

            await this.#setUpdateFlags(updateFlags);

            console.log(` - 📋 Skipping version ${latestUpdate.version}`);

            return { type: 'redirect', url: `/` };
        }

        // Check if the user wants to be reminded about the update
        if (searchParams.get('remind') === 'true') {
            if (updateFlags.remindedVersions === undefined) {
                updateFlags.remindedVersions = [];
            }

            updateFlags.remindedVersions.push({
                version: latestUpdate.version,
                remindAt: Date.now() + (24 * 60 * 60 * 1000)
            });

            await this.#setUpdateFlags(updateFlags);

            console.log(` - 📋 Setting reminder for version ${latestUpdate.version}`);

            return { type: 'redirect', url: `/` };
        }

        // Check if this version was previously skipped
        const skippedVersion = updateFlags.skippedVersions?.find(skippedVersion => skippedVersion === latestUpdate.version);

        if (skippedVersion) {
            console.log(` - 📋 Version ${latestUpdate.version} was previously skipped, not showing again`);

            return { type: 'continue' };
        }

        // Check if reminder is still active
        const updateReminder = updateFlags.remindedVersions?.find(remindedVersion => remindedVersion.version === latestUpdate.version);

        if (updateReminder) {
            if (Date.now() < updateReminder.remindAt) {
                console.log(' - ⏰ Update reminder still active, not showing update notification');

                return { type: 'continue' };
            } else {
                // Clear expired reminder and remove from array
                updateFlags.remindedVersions = updateFlags.remindedVersions.filter(reminder => reminder.version !== latestUpdate.version);

                await this.#setUpdateFlags(updateFlags);

                console.log(' - ⏰ Update reminder expired, redirecting to update page');
            }
        }

        // Redirect to optional update page with version parameters
        return { type: 'redirect', url: `/neuron/pages/optional-update.html?current=${currentVersion}&available=${latestUpdate.version}` };
    }
}

module.exports = NeuronUpdateService;
