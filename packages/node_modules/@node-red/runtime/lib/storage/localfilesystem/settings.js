/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

const fs = require('fs-extra');
const fspath = require("path");

const log = require("@node-red/util").log;
const util = require("./util");

const configSections = ['nodes','users','projects'];

const settingsCache = {};

var globalSettingsFile;
var globalSettingsBackup;
var settings;

async function migrateToMultipleConfigFiles() {
    const nodesFilename = getSettingsFilename("nodes");
    if (fs.existsSync(nodesFilename)) {
        // We have both .config.json and .config.nodes.json
        // Use the more recently modified. This handles users going back to pre1.2
        // and up again.
        // We can remove this logic in 1.3+ and remove the old .config.json file entirely
        //
        const fsStatNodes = await fs.stat(nodesFilename);
        const fsStatGlobal = await fs.stat(globalSettingsFile);
        if (fsStatNodes.mtimeMs > fsStatGlobal.mtimeMs) {
            // .config.nodes.json is newer than .config.json - no migration needed
            return;
        }
    }
    const data = await util.readFile(globalSettingsFile,globalSettingsBackup,{});
    // In a later release we should remove the old settings file. But don't do
    // that *yet* otherwise users won't be able to downgrade easily.
    return writeSettings(data) // .then( () => fs.remove(globalSettingsFile) );
}


/**
 * Takes the single settings object and splits it into separate files. This makes
 * it easier to backup selected parts of the settings and also helps reduce the blast
 * radius if a file is lost.
 *
 * The settings are written to four files:
 *  - .config.nodes.json - the node registry
 *  - .config.users.json - user specific settings (eg editor settings)
 *  - .config.projects.json - project settings, including the active project
 *  - .config.runtime.json - everything else - most notable _credentialSecret
 */
function writeSettings(data) {
    const configKeys = Object.keys(data);
    const writePromises = [];
    configSections.forEach(key => {
        const sectionData = data[key] || {};
        delete data[key];
        const sectionFilename = getSettingsFilename(key);
        const sectionContent = JSON.stringify(sectionData,null,4);
        if (sectionContent !== settingsCache[key]) {
            settingsCache[key] = sectionContent;
            writePromises.push(util.writeFile(sectionFilename,sectionContent,sectionFilename+".backup"))
        }
    })
    // Having extracted nodes/users/projects, write whatever is left to the runtime config
    const sectionFilename = getSettingsFilename("runtime");
    const sectionContent = JSON.stringify(data,null,4);
    if (sectionContent !== settingsCache["runtime"]) {
        settingsCache["runtime"] = sectionContent;
        writePromises.push(util.writeFile(sectionFilename,sectionContent,sectionFilename+".backup"));
    }
    return Promise.all(writePromises);
}

async function readSettings() {
    // Read the 'runtime' settings file first
    const runtimeFilename = getSettingsFilename("runtime");
    const result = await util.readFile(runtimeFilename,runtimeFilename+".backup",{});
    settingsCache["runtime"] = JSON.stringify(result, null ,4);
    const readPromises = [];
    // Read the other settings files and add them into the runtime settings
    configSections.forEach(key => {
        const sectionFilename = getSettingsFilename(key);
        readPromises.push(util.readFile(sectionFilename,sectionFilename+".backup",{}).then(sectionData => {
            settingsCache[key] = JSON.stringify(sectionData, null ,4);
            if (Object.keys(sectionData).length > 0) {
                result[key] = sectionData;
            }
        }))
    });
    return Promise.all(readPromises).then(() => result);
}

function getSettingsFilename(section) {
    return fspath.join(settings.userDir,`.config.${section}.json`);
}

module.exports = {
    init: function(_settings) {
        settings = _settings;
        globalSettingsFile = fspath.join(settings.userDir,".config.json");
        globalSettingsBackup = fspath.join(settings.userDir,".config.json.backup");

        if (fs.existsSync(globalSettingsFile) && !settings.readOnly) {
            return migrateToMultipleConfigFiles();
        } else {
            return Promise.resolve();
        }
    },
    getSettings: function() {
        return readSettings()
    },
    saveSettings: function(newSettings) {
        if (settings.readOnly) {
            return Promise.resolve();
        }
        return writeSettings(newSettings);
    }
}
