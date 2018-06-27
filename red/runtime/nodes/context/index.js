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

var settings;
var contexts = {};
var globalContext = null;
var externalContexts = {};
var noContextStorage = true;

function init(_settings) {
    settings = _settings;
    externalContexts = {};

    // init memory plugin
    var seed = settings.functionGlobalContext || {};
    externalContexts["_"] = memory();
    externalContexts["_"].setGlobalContext(seed);
    globalContext = createContext("global",seed);
    contexts['global'] = globalContext;
}

function load() {
    // load & init plugins in settings.contextStorage
    var plugins = settings.contextStorage;
    var isAlias = false;
    if (plugins) {
        var promises = [];
        noContextStorage = false;
        for(var pluginName in plugins){
            if(pluginName === "_"){
                continue;
            }
            if(pluginName === "default" && typeof plugins[pluginName] === "string"){
                isAlias = true;
                continue;
            }
            var plugin;
            if(plugins[pluginName].hasOwnProperty("module")){
                var config = plugins[pluginName].config || {};
                copySettings(config, settings);
                if(typeof plugins[pluginName].module === "string") {
                    try{
                        plugin = require("./"+plugins[pluginName].module);
                    }catch(err){
                        return Promise.reject(new Error(log._("context.error-module-not-loaded", {module:plugins[pluginName].module})));
                    }
                } else {
                    plugin = plugins[pluginName].module;
                }
                externalContexts[pluginName] = plugin(config);
            }else{
                return Promise.reject(new Error(log._("context.error-module-not-defined", {storage:pluginName})));
            }
        }
        for(var plugin in externalContexts){
            if(externalContexts.hasOwnProperty(plugin)){
                promises.push(externalContexts[plugin].open());
            }
        }
        if(isAlias){
            if(externalContexts.hasOwnProperty(plugins["default"])){
                externalContexts["default"] =  externalContexts[plugins["default"]];
            }else{
                return Promise.reject(new Error(log._("context.error-invalid-default-module", {storage:plugins["default"]})));
            }
        }
        return Promise.all(promises);
    } else {
        noContextStorage = true;
        return externalContexts["_"].open();
    }
}

function copySettings(config, settings){
    var copy = ["userDir"]
    config.settings = {};
    copy.forEach(function(setting){
        config.settings[setting] = clone(settings[setting]);
    });
}

function getContextStorage(storage) {
    if (externalContexts.hasOwnProperty(storage)) {
        return externalContexts[storage];
    } else if (externalContexts.hasOwnProperty("default")) {
        return externalContexts["default"];
    } else {
        var contextError = new Error(log._("context.error-use-undefined-storage", {storage:storage}));
        contextError.name = "ContextError";
        throw contextError;
    }
}

function createContext(id,seed) {
    var scope = id;
    var obj = seed || {};

    obj.get = function(key, storage, callback) {
        var context;
        if (!storage && !callback) {
            context = externalContexts["_"];
        } else {
            if (typeof storage === 'function') {
                callback = storage;
                storage = "default";
            }
            if (typeof callback !== 'function'){
                throw new Error("Callback must be a function");
            }
            context = getContextStorage(storage);
        }
        return context.get(scope, key, callback);
    };
    obj.set = function(key, value, storage, callback) {
        var context;
        if (!storage && !callback) {
            context = externalContexts["_"];
        } else {
            if (typeof storage === 'function') {
                callback = storage;
                storage = "default";
            }
            if (callback && typeof callback !== 'function') {
                throw new Error("Callback must be a function");
            }
            context = getContextStorage(storage);
        }
        context.set(scope, key, value, callback);
    };
    obj.keys = function(storage, callback) {
        var context;
        if (!storage && !callback) {
            context = externalContexts["_"];
        } else {
            if (typeof storage === 'function') {
                callback = storage;
                storage = "default";
            }
            if (typeof callback !== 'function') {
                throw new Error("Callback must be a function");
            }
            context = getContextStorage(storage);
        }
        return context.keys(scope, callback);
    };
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
        newContext.flow = getContext(flowId);
    }
    if (globalContext) {
        newContext.global = globalContext;
    }
    contexts[contextId] = newContext;
    return newContext;
}

function deleteContext(id,flowId) {
    if(noContextStorage){
        var contextId = id;
        if (flowId) {
            contextId = id+":"+flowId;
        }
        delete contexts[contextId];
        return externalContexts["_"].delete(contextId);
    }else{
        return Promise.resolve();
    }
}

function clean(flowConfig) {
    var promises = [];
    for(var plugin in externalContexts){
        if(externalContexts.hasOwnProperty(plugin)){
            promises.push(externalContexts[plugin].clean(Object.keys(flowConfig.allNodes)));
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
    for(var plugin in externalContexts){
        if(externalContexts.hasOwnProperty(plugin)){
            promises.push(externalContexts[plugin].close());
        }
    }
    return Promise.all(promises);
}

module.exports = {
    init: init,
    load: load,
    get: getContext,
    delete: deleteContext,
    clean: clean,
    close: close
};
