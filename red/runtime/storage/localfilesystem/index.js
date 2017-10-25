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
var fspath = require("path");

var log = require("../../log");
var util = require("./util");
var library = require("./library");
var sessions = require("./sessions");
var runtimeSettings = require("./settings");
var projects = require("./projects");

var initialFlowLoadComplete = false;
var settings;

var localfilesystem = {
    init: function(_settings, runtime) {
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
                        promises.push(fs.ensureDir(fspath.join(settings.userDir,"node_modules")));
                    }
                }
            }
        }

        sessions.init(settings);
        runtimeSettings.init(settings);
        promises.push(library.init(settings));
        promises.push(projects.init(settings, runtime));

        var packageFile = fspath.join(settings.userDir,"package.json");
        var packagePromise = when.resolve();

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


    getFlows: projects.getFlows,
    saveFlows: projects.saveFlows,
    getCredentials: projects.getCredentials,
    saveCredentials: projects.saveCredentials,

    getSettings: runtimeSettings.getSettings,
    saveSettings: runtimeSettings.saveSettings,
    getSessions: sessions.getSessions,
    saveSessions: sessions.saveSessions,
    getLibraryEntry: library.getLibraryEntry,
    saveLibraryEntry: library.saveLibraryEntry,
    projects: projects
};

module.exports = localfilesystem;
