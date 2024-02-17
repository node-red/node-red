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

var Path = require('path');
var crypto = require('crypto');

var log = require("@node-red/util").log;

var runtime;
var storageModule;
var settingsAvailable;
var sessionsAvailable;

var Mutex = require('async-mutex').Mutex;
const settingsSaveMutex = new Mutex();

var libraryFlowsCachedResult = null;

function moduleSelector(aSettings) {
    var toReturn;
    if (aSettings.storageModule) {
        if (typeof aSettings.storageModule === "string") {
            // TODO: allow storage modules to be specified by absolute path
            toReturn = require("./"+aSettings.storageModule);
        } else {
            toReturn = aSettings.storageModule;
        }
    } else {
        toReturn = require("./localfilesystem");
    }
    return toReturn;
}

function is_malicious(path) {
    return path.indexOf('../') != -1 || path.indexOf('..\\') != -1;
}

var storageModuleInterface = {
        init: async function(_runtime) {
            runtime = _runtime;
            // Any errors thrown by the module will get passed up to the called
            // as a rejected promise
            storageModule = moduleSelector(runtime.settings);
            settingsAvailable = storageModule.hasOwnProperty("getSettings") && storageModule.hasOwnProperty("saveSettings");
            sessionsAvailable = storageModule.hasOwnProperty("getSessions") && storageModule.hasOwnProperty("saveSessions");
            if (!!storageModule.projects) {
                var projectsEnabled = false;
                if (runtime.settings.hasOwnProperty("editorTheme") && runtime.settings.editorTheme.hasOwnProperty("projects")) {
                    projectsEnabled = runtime.settings.editorTheme.projects.enabled === true;
                }
                if (projectsEnabled) {
                    storageModuleInterface.projects = storageModule.projects;
                }
            }
            if (storageModule.sshkeys) {
                storageModuleInterface.sshkeys = storageModule.sshkeys;
            }
            return storageModule.init(runtime.settings,runtime);
        },
        getFlows: async function() {
            return storageModule.getFlows().then(function(flows) {
                return storageModule.getCredentials().then(function(creds) {
                    var result = {
                        flows: flows,
                        credentials: creds
                    };
                    result.rev = crypto.createHash('sha256').update(JSON.stringify(result.flows)).digest("hex");
                    return result;
                })
            });
        },
        saveFlows: async function(config, user) {
            var flows = config.flows;
            var credentials = config.credentials;
            var credentialSavePromise;
            if (config.credentialsDirty) {
                credentialSavePromise = storageModule.saveCredentials(credentials);
            } else {
                credentialSavePromise = Promise.resolve();
            }
            delete config.credentialsDirty;

            return credentialSavePromise.then(function() {
                return storageModule.saveFlows(flows, user).then(function() {
                    return crypto.createHash('sha256').update(JSON.stringify(config.flows)).digest("hex");
                })
            });
        },
        // getCredentials: function() {
        //     return storageModule.getCredentials();
        // },
        saveCredentials: async function(credentials) {
            return storageModule.saveCredentials(credentials);
        },
        getSettings: async function() {
            if (settingsAvailable) {
                return storageModule.getSettings();
            } else {
                return null
            }
        },
        saveSettings: async function(settings) {
            if (settingsAvailable) {
                return settingsSaveMutex.runExclusive(() => storageModule.saveSettings(settings))
            }
        },
        getSessions: async function() {
            if (sessionsAvailable) {
                return storageModule.getSessions();
            } else {
                return null
            }
        },
        saveSessions: async function(sessions) {
            if (sessionsAvailable) {
                return storageModule.saveSessions(sessions);
            }
        },

        /* Library Functions */

        getLibraryEntry: async function(type, path) {
            if (is_malicious(path)) {
                var err = new Error();
                err.code = "forbidden";
                throw err;
            }
            return storageModule.getLibraryEntry(type, path);
        },
        saveLibraryEntry: async function(type, path, meta, body) {
            if (is_malicious(path)) {
                var err = new Error();
                err.code = "forbidden";
                throw err;
            }
            return storageModule.saveLibraryEntry(type, path, meta, body);
        },

/* Deprecated functions */
        getAllFlows: async function() {
            if (storageModule.hasOwnProperty("getAllFlows")) {
                return storageModule.getAllFlows();
            } else {
                if (libraryFlowsCachedResult) {
                    return libraryFlowsCachedResult;
                } else {
                    return listFlows("/").then(function(result) {
                        libraryFlowsCachedResult = result;
                        return result;
                    });
                }
            }
        },
        getFlow: function(fn) {
            if (is_malicious(fn)) {
                var err = new Error();
                err.code = "forbidden";
                throw err;
            }
            if (storageModule.hasOwnProperty("getFlow")) {
                return storageModule.getFlow(fn);
            } else {
                return storageModule.getLibraryEntry("flows",fn);
            }

        },
        saveFlow: function(fn, data) {
            if (is_malicious(fn)) {
                var err = new Error();
                err.code = "forbidden";
                throw err;
            }
            libraryFlowsCachedResult = null;
            if (storageModule.hasOwnProperty("saveFlow")) {
                return storageModule.saveFlow(fn, data);
            } else {
                return storageModule.saveLibraryEntry("flows",fn,{},data);
            }
        }
/* End deprecated functions */

}


function listFlows(path) {
    return storageModule.getLibraryEntry("flows",path).then(function(res) {
        const promises = [];
        res.forEach(function(r) {
            if (typeof r === "string") {
                promises.push(listFlows(Path.join(path,r)));
            } else {
                promises.push(Promise.resolve(r));
            }
        });
        return Promise.all(promises).then(res2 => {
            let i = 0;
            const result = {};
            res2.forEach(function(r) {
                // TODO: name||fn
                if (r.fn) {
                    var name = r.name;
                    if (!name) {
                        name = r.fn.replace(/\.json$/, "");
                    }
                    result.f = result.f || [];
                    result.f.push(name);
                } else {
                    result.d = result.d || {};
                    result.d[res[i]] = r;
                    //console.log(">",r.value);
                }
                i++;
            });
            return result;
        });
    });
}

module.exports = storageModuleInterface;
