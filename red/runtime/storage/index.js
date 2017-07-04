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

var when = require('when');
var Path = require('path');
var crypto = require('crypto');

var log = require("../log");

var runtime;
var storageModule;
var settingsAvailable;
var sessionsAvailable;

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
        init: function(_runtime) {
            runtime = _runtime;
            try {
                storageModule = moduleSelector(runtime.settings);
                settingsAvailable = storageModule.hasOwnProperty("getSettings") && storageModule.hasOwnProperty("saveSettings");
                sessionsAvailable = storageModule.hasOwnProperty("getSessions") && storageModule.hasOwnProperty("saveSessions");
            } catch (e) {
                return when.reject(e);
            }
            return storageModule.init(runtime.settings);
        },
        getFlows: function() {
            return storageModule.getFlows().then(function(flows) {
                return storageModule.getCredentials().then(function(creds) {
                    var result = {
                        flows: flows,
                        credentials: creds
                    };
                    result.rev = crypto.createHash('md5').update(JSON.stringify(result)).digest("hex");
                    return result;
                })
            });
        },
        saveFlows: function(config) {
            var flows = config.flows;
            var credentials = config.credentials;
            var credentialSavePromise;
            if (config.credentialsDirty) {
                credentialSavePromise = storageModule.saveCredentials(credentials);
            } else {
                credentialSavePromise = when.resolve();
            }
            delete config.credentialsDirty;

            return credentialSavePromise.then(function() {
                return storageModule.saveFlows(flows).then(function() {
                    return crypto.createHash('md5').update(JSON.stringify(config)).digest("hex");
                })
            });
        },
        // getCredentials: function() {
        //     return storageModule.getCredentials();
        // },
        // saveCredentials: function(credentials) {
        //     return storageModule.saveCredentials(credentials);
        // },
        getSettings: function() {
            if (settingsAvailable) {
                return storageModule.getSettings();
            } else {
                return when.resolve(null);
            }
        },
        saveSettings: function(settings) {
            if (settingsAvailable) {
                return storageModule.saveSettings(settings);
            } else {
                return when.resolve();
            }
        },
        getSessions: function() {
            if (sessionsAvailable) {
                return storageModule.getSessions();
            } else {
                return when.resolve(null);
            }
        },
        saveSessions: function(sessions) {
            if (sessionsAvailable) {
                return storageModule.saveSessions(sessions);
            } else {
                return when.resolve();
            }
        },

        /* Library Functions */

        getLibraryEntry: function(type, path) {
            if (is_malicious(path)) {
                var err = new Error();
                err.code = "forbidden";
                return when.reject(err);
            }
            return storageModule.getLibraryEntry(type, path);
        },
        saveLibraryEntry: function(type, path, meta, body) {
            if (is_malicious(path)) {
                var err = new Error();
                err.code = "forbidden";
                return when.reject(err);
            }
            return storageModule.saveLibraryEntry(type, path, meta, body);
        },

/* Deprecated functions */
        getAllFlows: function() {
            if (storageModule.hasOwnProperty("getAllFlows")) {
                return storageModule.getAllFlows();
            } else {
                return listFlows("/");
            }
        },
        getFlow: function(fn) {
            if (is_malicious(fn)) {
                var err = new Error();
                err.code = "forbidden";
                return when.reject(err);
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
                return when.reject(err);
            }
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
        return when.promise(function(resolve) {
            var promises = [];
            res.forEach(function(r) {
                if (typeof r === "string") {
                    promises.push(listFlows(Path.join(path,r)));
                } else {
                    promises.push(when.resolve(r));
                }
            });
            var i=0;
            when.settle(promises).then(function(res2) {
                var result = {};
                res2.forEach(function(r) {
                    // TODO: name||fn
                    if (r.value.fn) {
                        var name = r.value.name;
                        if (!name) {
                            name = r.value.fn.replace(/\.json$/, "");
                        }
                        result.f = result.f || [];
                        result.f.push(name);
                    } else {
                        result.d = result.d || {};
                        result.d[res[i]] = r.value;
                        //console.log(">",r.value);
                    }
                    i++;
                });
                resolve(result);
            });
        });
    });
}



module.exports = storageModuleInterface;
