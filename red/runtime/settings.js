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

var when = require("when");
var clone = require("clone");
var assert = require("assert");
var log = require("./log");
var util = require("./util");

// localSettings are those provided in the runtime settings.js file
var localSettings = null;
// globalSettings are provided by storage - .config.json on localfilesystem
var globalSettings = null;
// nodeSettings are those settings that a node module defines as being available
var nodeSettings = null;

// A subset of globalSettings that deal with per-user settings
var userSettings = null;

var disableNodeSettings = null;
var storage = null;

var persistentSettings = {
    init: function(settings) {
        localSettings = settings;
        for (var i in settings) {
            /* istanbul ignore else */
            if (settings.hasOwnProperty(i) && i !== 'load' && i !== 'get' && i !== 'set' && i !== 'available' && i !== 'reset') {
                // Don't allow any of the core functions get replaced via settings
                (function() {
                    var j = i;
                    persistentSettings.__defineGetter__(j,function() { return localSettings[j]; });
                    persistentSettings.__defineSetter__(j,function() { throw new Error("Property '"+j+"' is read-only"); });
                })();
            }
        }
        globalSettings = null;
        nodeSettings = {};
        disableNodeSettings = {};
    },
    load: function(_storage) {
        storage = _storage;
        return storage.getSettings().then(function(_settings) {
            globalSettings = _settings;
            if (globalSettings) {
                userSettings = globalSettings.users || {};
            }
            else {
                userSettings = {};
            }
        });
    },
    get: function(prop) {
        if (prop === 'users') {
            throw new Error("Do not access user settings directly. Use settings.getUserSettings");
        }
        if (localSettings.hasOwnProperty(prop)) {
            return clone(localSettings[prop]);
        }
        if (globalSettings === null) {
            throw new Error(log._("settings.not-available"));
        }
        return clone(globalSettings[prop]);
    },

    set: function(prop,value) {
        if (prop === 'users') {
            throw new Error("Do not access user settings directly. Use settings.setUserSettings");
        }
        if (localSettings.hasOwnProperty(prop)) {
            throw new Error(log._("settings.property-read-only", {prop:prop}));
        }
        if (globalSettings === null) {
            throw new Error(log._("settings.not-available"));
        }
        var current = globalSettings[prop];
        globalSettings[prop] = value;
        try {
            assert.deepEqual(current,value);
            return when.resolve();
        } catch(err) {
            return storage.saveSettings(globalSettings);
        }
    },
    delete: function(prop) {
        if (localSettings.hasOwnProperty(prop)) {
            throw new Error(log._("settings.property-read-only", {prop:prop}));
        }
        if (globalSettings === null) {
            throw new Error(log._("settings.not-available"));
        }
        if (globalSettings.hasOwnProperty(prop)) {
            delete globalSettings[prop];
            return storage.saveSettings(globalSettings);
        }
        return when.resolve();
    },

    available: function() {
        return (globalSettings !== null);
    },

    reset: function() {
        for (var i in localSettings) {
            /* istanbul ignore else */
            if (localSettings.hasOwnProperty(i)) {
                delete persistentSettings[i];
            }
        }
        localSettings = null;
        globalSettings = null;
        userSettings = null;
        storage = null;
    },
    registerNodeSettings: function(type, opts) {
        var normalisedType = util.normaliseNodeTypeName(type);
        for (var property in opts) {
            if (opts.hasOwnProperty(property)) {
                if (!property.startsWith(normalisedType)) {
                    throw new Error("Registered invalid property name '"+property+"'. Properties for this node must start with '"+normalisedType+"'");
                }
            }
        }
        nodeSettings[type] = opts;
    },
    exportNodeSettings: function(safeSettings) {
        for (var type in nodeSettings) {
            if (nodeSettings.hasOwnProperty(type) && !disableNodeSettings[type]) {
                var nodeTypeSettings = nodeSettings[type];
                for (var property in nodeTypeSettings) {
                    if (nodeTypeSettings.hasOwnProperty(property)) {
                        var setting = nodeTypeSettings[property];
                        if (setting.exportable) {
                            if (safeSettings.hasOwnProperty(property)) {
                                // Cannot overwrite existing setting
                            } else if (localSettings.hasOwnProperty(property)) {
                                safeSettings[property] = localSettings[property];
                            } else if (setting.hasOwnProperty('value')) {
                                safeSettings[property] = setting.value;
                            }
                        }
                    }
                }
            }
        }

        return safeSettings;
    },
    enableNodeSettings: function(types) {
        types.forEach(function(type) {
            disableNodeSettings[type] = false;
        });
    },
    disableNodeSettings: function(types) {
        types.forEach(function(type) {
            disableNodeSettings[type] = true;
        });
    },
    getUserSettings: function(username) {
        return clone(userSettings[username]);
    },
    setUserSettings: function(username,settings) {
        var current = userSettings[username];
        userSettings[username] = settings;
        try {
            assert.deepEqual(current,settings);
            return when.resolve();
        } catch(err) {
            globalSettings.users = userSettings;
            return storage.saveSettings(globalSettings);
        }
    }
}

module.exports = persistentSettings;
