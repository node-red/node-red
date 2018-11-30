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

var clone = require("clone");
var log = require("../../log");
var memory = require("./memory");
var util = require("../../util");

var settings;

// A map of scope id to context instance
var contexts = {};

// A map of store name to instance
var stores = {};
var storeList = [];
var defaultStore;

// Whether there context storage has been configured or left as default
var hasConfiguredStore = false;

// Unknown Stores
var unknownStores = {};

function logUnknownStore(name) {
    if (name) {
        var count = unknownStores[name] || 0;
        if (count == 0) {
            log.warn(log._("context.unknown-store", {name: name}));
            count++;
            unknownStores[name] = count;
        }
    }
}

function init(_settings) {
    settings = _settings;
    contexts = {};
    stores = {};
    storeList = [];
    hasConfiguredStore = false;
    var seed = settings.functionGlobalContext || {};
    contexts['global'] = createContext("global",seed);
    // create a default memory store - used by the unit tests that skip the full
    // `load()` initialisation sequence.
    // If the user has any stores configured, this will be disgarded
    stores["_"] = new memory();
    defaultStore = "memory";
}

function load() {
    return new Promise(function(resolve,reject) {
        // load & init plugins in settings.contextStorage
        var plugins = settings.contextStorage || {};
        var defaultIsAlias = false;
        var promises = [];
        if (plugins && Object.keys(plugins).length > 0) {
            var hasDefault = plugins.hasOwnProperty('default');
            var defaultName;
            for (var pluginName in plugins) {
                if (plugins.hasOwnProperty(pluginName)) {
                    // "_" is a reserved name - do not allow it to be overridden
                    if (pluginName === "_") {
                        continue;
                    }
                    if (!/^[a-zA-Z0-9_]+$/.test(pluginName)) {
                        return reject(new Error(log._("context.error-invalid-module-name", {name:pluginName})));
                    }

                    // Check if this is setting the 'default' context to be a named plugin
                    if (pluginName === "default" && typeof plugins[pluginName] === "string") {
                        // Check the 'default' alias exists before initialising anything
                        if (!plugins.hasOwnProperty(plugins[pluginName])) {
                            return reject(new Error(log._("context.error-invalid-default-module", {storage:plugins["default"]})));
                        }
                        defaultIsAlias = true;
                        continue;
                    }
                    if (!hasDefault && !defaultName) {
                        defaultName = pluginName;
                    }
                    var plugin;
                    if (plugins[pluginName].hasOwnProperty("module")) {
                        // Get the provided config and copy in the 'approved' top-level settings (eg userDir)
                        var config = plugins[pluginName].config || {};
                        copySettings(config, settings);

                        if (typeof plugins[pluginName].module === "string") {
                            // This config identifies the module by name - assume it is a built-in one
                            // TODO: check it exists locally, if not, try to require it as-is
                            try {
                                plugin = require("./"+plugins[pluginName].module);
                            } catch(err) {
                                return reject(new Error(log._("context.error-loading-module", {module:plugins[pluginName].module,message:err.toString()})));
                            }
                        } else {
                            // Assume `module` is an already-required module we can use
                            plugin = plugins[pluginName].module;
                        }
                        try {
                            // Create a new instance of the plugin by calling its module function
                            stores[pluginName] = plugin(config);
                            var moduleInfo = plugins[pluginName].module;
                            if (typeof moduleInfo !== 'string') {
                                if (moduleInfo.hasOwnProperty("toString")) {
                                    moduleInfo = moduleInfo.toString();
                                } else {
                                    moduleInfo = "custom";
                                }
                            }
                            log.info(log._("context.log-store-init", {name:pluginName, info:"module="+moduleInfo}));
                        } catch(err) {
                            return reject(new Error(log._("context.error-loading-module",{module:pluginName,message:err.toString()})));
                        }
                    } else {
                        // Plugin does not specify a 'module'
                        return reject(new Error(log._("context.error-module-not-defined", {storage:pluginName})));
                    }
                }
            }

            // Open all of the configured contexts
            for (var plugin in stores) {
                if (stores.hasOwnProperty(plugin)) {
                    promises.push(stores[plugin].open());
                }
            }
            // There is a 'default' listed in the configuration
            if (hasDefault) {
                // If 'default' is an alias, point it at the right module - we have already
                // checked that it exists. If it isn't an alias, then it will
                // already be set to a configured store
                if (defaultIsAlias) {
                    stores["_"] =  stores[plugins["default"]];
                    defaultStore = plugins["default"];
                } else {
                    stores["_"] = stores["default"];
                    defaultStore = "default";
                }
            } else if (defaultName) {
                // No 'default' listed, so pick first in list as the default
                stores["_"] = stores[defaultName];
                defaultStore = defaultName;
                defaultIsAlias = true;
            } else {
                // else there were no stores list the config object - fall through
                // to below where we default to a memory store
                storeList = ["memory"];
                defaultStore = "memory";
            }
            hasConfiguredStore = true;
            storeList = Object.keys(stores).filter(n=>!(defaultIsAlias && n==="default") && n!== "_");
        } else {
            // No configured plugins
            log.info(log._("context.log-store-init", {name:"default", info:"module=memory"}));
            promises.push(stores["_"].open())
            storeList = ["memory"];
            defaultStore = "memory";
        }
        return resolve(Promise.all(promises));
    }).catch(function(err) {
        throw new Error(log._("context.error-loading-module",{message:err.toString()}));
    });
}

function copySettings(config, settings){
    var copy = ["userDir"]
    config.settings = {};
    copy.forEach(function(setting){
        config.settings[setting] = clone(settings[setting]);
    });
}

function getContextStorage(storage) {
    if (stores.hasOwnProperty(storage)) {
        // A known context
        return stores[storage];
    } else if (stores.hasOwnProperty("_")) {
        // Not known, but we have a default to fall back to
        if (storage !== defaultStore) {
            // It isn't the default store either, so log it
            logUnknownStore(storage);
        }
        return stores["_"];
    }
}


function createContext(id,seed) {
    // Seed is only set for global context - sourced from functionGlobalContext
    var scope = id;
    var obj = seed || {};
    var seedKeys;
    var insertSeedValues;
    if (seed) {
        seedKeys = Object.keys(seed);
        insertSeedValues = function(keys,values) {
            if (!Array.isArray(keys)) {
                if (values[0] === undefined) {
                    values[0] = util.getObjectProperty(seed,keys);
                }
            } else {
                for (var i=0;i<keys.length;i++) {
                    if (values[i] === undefined) {
                        values[i] = util.getObjectProperty(seed,keys[i]);
                    }
                }
            }
        }
    }
    Object.defineProperties(obj, {
        get: {
            value: function(key, storage, callback) {
                var context;

                if (!callback && typeof storage === 'function') {
                    callback = storage;
                    storage = undefined;
                }
                if (callback && typeof callback !== 'function'){
                    throw new Error("Callback must be a function");
                }

                if (!Array.isArray(key)) {
                    var keyParts = util.parseContextStore(key);
                    key = keyParts.key;
                    if (!storage) {
                        storage = keyParts.store || "_";
                    }
                } else {
                    if (!storage) {
                        storage = "_";
                    }
                }
                context = getContextStorage(storage);

                if (callback) {
                    if (!seed) {
                        context.get(scope,key,callback);
                    } else {
                        context.get(scope,key,function() {
                            if (arguments[0]) {
                                callback(arguments[0]);
                                return;
                            }
                            var results = Array.prototype.slice.call(arguments,[1]);
                            insertSeedValues(key,results);
                            // Put the err arg back
                            results.unshift(undefined);
                            callback.apply(null,results);
                        });
                    }
                } else {
                    // No callback, attempt to do this synchronously
                    var results = context.get(scope,key);
                    if (seed) {
                        if (Array.isArray(key)) {
                            insertSeedValues(key,results);
                        } else if (results === undefined){
                            results = util.getObjectProperty(seed,key);
                        }
                    }
                    return results;
                }
            }
        },
        set: {
            value: function(key, value, storage, callback) {
                var context;

                if (!callback && typeof storage === 'function') {
                    callback = storage;
                    storage = undefined;
                }
                if (callback && typeof callback !== 'function'){
                    throw new Error("Callback must be a function");
                }

                if (!Array.isArray(key)) {
                    var keyParts = util.parseContextStore(key);
                    key = keyParts.key;
                    if (!storage) {
                        storage = keyParts.store || "_";
                    }
                } else {
                    if (!storage) {
                        storage = "_";
                    }
                }
                context = getContextStorage(storage);

                context.set(scope, key, value, callback);
            }
        },
        keys: {
            value: function(storage, callback) {
                var context;
                if (!storage && !callback) {
                    context = stores["_"];
                } else {
                    if (typeof storage === 'function') {
                        callback = storage;
                        storage = "_";
                    }
                    if (callback && typeof callback !== 'function') {
                        throw new Error("Callback must be a function");
                    }
                    context = getContextStorage(storage);
                }
                if (seed) {
                    if (callback) {
                        context.keys(scope, function(err,keys) {
                            callback(err,Array.from(new Set(seedKeys.concat(keys)).keys()));
                        });
                    } else {
                        var keys = context.keys(scope);
                        return Array.from(new Set(seedKeys.concat(keys)).keys())
                    }
                } else {
                    return context.keys(scope, callback);
                }
            }
        }
    });
    return obj;
}

function getContext(localId,flowId) {
    var contextId = localId;
    if (flowId) {
        contextId = localId+":"+flowId;
    }
    if (contexts.hasOwnProperty(contextId)) {
        return contexts[contextId];
    }
    var newContext = createContext(contextId);
    if (flowId) {
        Object.defineProperty(newContext, 'flow', {
            value: getContext(flowId)
        });
    }
    Object.defineProperty(newContext, 'global', {
        value: contexts['global']
    })
    contexts[contextId] = newContext;
    return newContext;
}

function deleteContext(id,flowId) {
    if(!hasConfiguredStore){
        // only delete context if there's no configured storage.
        var contextId = id;
        if (flowId) {
            contextId = id+":"+flowId;
        }
        delete contexts[contextId];
        return stores["_"].delete(contextId);
    }else{
        return Promise.resolve();
    }
}

function clean(flowConfig) {
    var promises = [];
    for(var plugin in stores){
        if(stores.hasOwnProperty(plugin)){
            promises.push(stores[plugin].clean(Object.keys(flowConfig.allNodes)));
        }
    }
    for (var id in contexts) {
        if (contexts.hasOwnProperty(id) && id !== "global") {
            var idParts = id.split(":");
            if (!flowConfig.allNodes.hasOwnProperty(idParts[0])) {
                delete contexts[id];
            }
        }
    }
    return Promise.all(promises);
}

function close() {
    var promises = [];
    for(var plugin in stores){
        if(stores.hasOwnProperty(plugin)){
            promises.push(stores[plugin].close());
        }
    }
    return Promise.all(promises);
}

function listStores() {
    return {default:defaultStore,stores:storeList};
}

module.exports = {
    init: init,
    load: load,
    listStores: listStores,
    get: getContext,
    delete: deleteContext,
    clean: clean,
    close: close
};
