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

var fs = require('fs-extra');
var when = require('when');
var nodeFn = require('when/node/function');
var fspath = require("path");

var log = require("../../log");
var util = require("./util");
var library = require("./library");
var sessions = require("./sessions");
var runtimeSettings = require("./settings");

var initialFlowLoadComplete = false;
var settings;
var flowsFile;
var flowsFullPath;
var flowsFileBackup;
var credentialsFile;
var credentialsFileBackup;
var oldCredentialsFile;

var localfilesystem = {
    init: function(_settings) {
        settings = _settings;

        var promises = [];

        if (!settings.userDir) {
            try {
                fs.statSync(fspath.join(process.env.NODE_RED_HOME,".config.json"));
                settings.userDir = process.env.NODE_RED_HOME;
            } catch(err) {
                try {
                    // Consider compatibility for older versions
                    if (process.env.HOMEPATH) {
                        fs.statSync(fspath.join(process.env.HOMEPATH,".node-red",".config.json"));
                        settings.userDir = fspath.join(process.env.HOMEPATH,".node-red");
                    }
                } catch(err) {
                }
                if (!settings.userDir) {
                    settings.userDir = fspath.join(process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || process.env.NODE_RED_HOME,".node-red");
                    if (!settings.readOnly) {
                        promises.push(util.promiseDir(fspath.join(settings.userDir,"node_modules")));
                    }
                }
            }
        }

        if (settings.flowFile) {
            flowsFile = settings.flowFile;
            // handle Unix and Windows "C:\"
            if ((flowsFile[0] == "/") || (flowsFile[1] == ":")) {
                // Absolute path
                flowsFullPath = flowsFile;
            } else if (flowsFile.substring(0,2) === "./") {
                // Relative to cwd
                flowsFullPath = fspath.join(process.cwd(),flowsFile);
            } else {
                try {
                    fs.statSync(fspath.join(process.cwd(),flowsFile));
                    // Found in cwd
                    flowsFullPath = fspath.join(process.cwd(),flowsFile);
                } catch(err) {
                    // Use userDir
                    flowsFullPath = fspath.join(settings.userDir,flowsFile);
                }
            }

        } else {
            flowsFile = 'flows_'+require('os').hostname()+'.json';
            flowsFullPath = fspath.join(settings.userDir,flowsFile);
        }
        var ffExt = fspath.extname(flowsFullPath);
        var ffName = fspath.basename(flowsFullPath);
        var ffBase = fspath.basename(flowsFullPath,ffExt);
        var ffDir = fspath.dirname(flowsFullPath);

        credentialsFile = fspath.join(settings.userDir,ffBase+"_cred"+ffExt);
        credentialsFileBackup = fspath.join(settings.userDir,"."+ffBase+"_cred"+ffExt+".backup");

        oldCredentialsFile = fspath.join(settings.userDir,"credentials.json");

        flowsFileBackup = fspath.join(ffDir,"."+ffName+".backup");

        sessions.init(settings);
        runtimeSettings.init(settings);

        var packageFile = fspath.join(settings.userDir,"package.json");
        var packagePromise = when.resolve();

        promises.push(library.init(settings));

        if (!settings.readOnly) {
            packagePromise = function() {
                try {
                    fs.statSync(packageFile);
                } catch(err) {
                    var defaultPackage = {
                        "name": "node-red-project",
                        "description": "A Node-RED Project",
                        "version": "0.0.1"
                    };
                    return util.writeFile(packageFile,JSON.stringify(defaultPackage,"",4));
                }
                return true;
            }
        }
        return when.all(promises).then(packagePromise);
    },

    getFlows: function() {
        if (!initialFlowLoadComplete) {
            initialFlowLoadComplete = true;
            log.info(log._("storage.localfilesystem.user-dir",{path:settings.userDir}));
            log.info(log._("storage.localfilesystem.flows-file",{path:flowsFullPath}));
        }
        return util.readFile(flowsFullPath,flowsFileBackup,[],'flow');
    },

    saveFlows: function(flows) {
        if (settings.readOnly) {
            return when.resolve();
        }

        try {
            fs.renameSync(flowsFullPath,flowsFileBackup);
        } catch(err) {
        }

        var flowData;

        if (settings.flowFilePretty) {
            flowData = JSON.stringify(flows,null,4);
        } else {
            flowData = JSON.stringify(flows);
        }
        return util.writeFile(flowsFullPath, flowData);
    },

    getCredentials: function() {
        return util.readFile(credentialsFile,credentialsFileBackup,{},'credentials');
    },

    saveCredentials: function(credentials) {
        if (settings.readOnly) {
            return when.resolve();
        }

        try {
            fs.renameSync(credentialsFile,credentialsFileBackup);
        } catch(err) {
        }
        var credentialData;
        if (settings.flowFilePretty) {
            credentialData = JSON.stringify(credentials,null,4);
        } else {
            credentialData = JSON.stringify(credentials);
        }
        return util.writeFile(credentialsFile, credentialData);
    },
    
    getSettings: runtimeSettings.getSettings,
    saveSettings: runtimeSettings.saveSettings,
    getSessions: sessions.getSessions,
    saveSessions: sessions.saveSessions,
    getLibraryEntry: library.getLibraryEntry,
    saveLibraryEntry: library.saveLibraryEntry

};

module.exports = localfilesystem;
