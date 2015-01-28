/**
 * Copyright 2013, 2014 IBM Corp.
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
        init: function(settings) {
            try {
                storageModule = moduleSelector(settings);
                settingsAvailable = storageModule.hasOwnProperty("getSettings") && storageModule.hasOwnProperty("saveSettings");
                sessionsAvailable = storageModule.hasOwnProperty("getUserSessions") && storageModule.hasOwnProperty("saveUserSessions");
            } catch (e) {
                return when.reject(e);
            }
            return storageModule.init(settings);
        },
        getFlows: function() {
            return storageModule.getFlows();
        },
        saveFlows: function(flows) {
            return storageModule.saveFlows(flows);
        },
        getCredentials: function() {
            return storageModule.getCredentials();
        },
        saveCredentials: function(credentials) {
            return storageModule.saveCredentials(credentials);
        },
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
        
        /* Library Functions */
        getAllFlows: function() {
            return storageModule.getAllFlows();
        },
        getFlow: function(fn) {
            if (is_malicious(fn)) {
                return when.reject(new Error('forbidden flow name'));
            }
            return storageModule.getFlow(fn);
        },
        saveFlow: function(fn, data) {
            if (is_malicious(fn)) {
                return when.reject(new Error('forbidden flow name'));
            }
            return storageModule.saveFlow(fn, data);
        },
        getLibraryEntry: function(type, path) {
            if (is_malicious(path)) {
                return when.reject(new Error('forbidden flow name'));
            }
            return storageModule.getLibraryEntry(type, path);
        },
        saveLibraryEntry: function(type, path, meta, body) {
            if (is_malicious(path)) {
                return when.reject(new Error('forbidden flow name'));
            }
            return storageModule.saveLibraryEntry(type, path, meta, body);
        }
}

module.exports = storageModuleInterface;
