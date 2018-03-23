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
var util = require("../../util");

var settings;
var contexts = {};
var globalContext = null;
var externalContexts = {};

function init(_settings) {
    settings = _settings;
    externalContexts = {};

    // init meomory plugin
    externalContexts["_"] = require("./memory");
    externalContexts["_"].init();
    globalContext = createContext("global",settings.functionGlobalContext || {});
}

function load() {
    // load & init plugins in settings.contextStorage
    var plugins = settings.contextStorage;
    var alias = null;
    if (plugins) {
        for(var pluginName in plugins){
            if(pluginName === "_"){
                continue;
            }
            if(pluginName === "default" && typeof plugins[pluginName] === "string"){
                alias = plugins[pluginName];
                continue;
            }
            var plugin;
            if(plugins[pluginName].hasOwnProperty("module")){
                var config = plugins[pluginName].config || {};
                copySettings(config, settings);
                try{
                    plugin = require("./"+plugins[pluginName].module);
                }catch(err){
                    throw new Error(plugins[pluginName].module + " could not be loaded");
                }
                plugin.init(config);
                externalContexts[pluginName] = plugin;
            }else{
                throw new Error("module is is not defined in settings.contextStorage." + plugins[pluginName] );
            }
        }
        if(alias){
            if(externalContexts.hasOwnProperty(alias)){
                externalContexts["default"] = externalContexts[alias];
            }else{
                throw new Error("default is invalid" + plugins["default"])
            }
        }
    }
}

function copySettings(config, settings){
    var copy = ["userDir"]
    config.settings = {};
    copy.forEach(function(setting){
        config.settings[setting] = clone(settings[setting]);
    });
}

function createContext(id,seed) {
    var scope = id;
    var obj = seed || {};

    obj.get = function(key) {
        var result = parseKey(key);
        if(!result){
            return externalContexts["_"].get(key, scope);
        }
        if(externalContexts.hasOwnProperty(result[0])){
            return externalContexts[result[0]].get(result[1], scope);
        }else if(externalContexts.hasOwnProperty("defalut")){
            return externalContexts["defalut"].get(result[1], scope);
        }else{
            throw new Error(result[0] + " is not defined in setting.js");
        }  
    };
    obj.set = function(key, value) {
        var result = parseKey(key);
        if(!result){
            return externalContexts["_"].set(key, value, scope);
        }
        if(externalContexts.hasOwnProperty(result[0])){
            externalContexts[result[0]].set(result[1], value, scope);
        }else if(externalContexts.hasOwnProperty("defalut")){
            externalContexts["defalut"].set(result[1], value, scope);
        }else{
            throw new Error(result[0] + " is not defined in setting.js");
        }
    };
    obj.keys = function() {
        //TODO: discuss about keys() behavior
        var keys = [];
        for(var plugin in externalContexts){
            keys.concat(externalContexts[plugin].keys(scope));
        }
        return keys;
    };
    if(id === "global"){
        externalContexts["_"].setGlobalContext(seed);
    }
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
    var contextId = id;
    if (flowId) {
        contextId = id+":"+flowId;
    }
    for(var plugin in externalContexts){
        externalContexts[plugin].delete(contextId);
    }
    delete contexts[contextId];
}

function clean(flowConfig) {
    var activeIds = {};
    var contextId;
    var node;
    for (var id in contexts) {
        if (contexts.hasOwnProperty(id)) {
            var idParts = id.split(":");
            if (!flowConfig.allNodes.hasOwnProperty(idParts[0])) {
                for(var plugin in externalContexts){
                    externalContexts[plugin].delete(id);
                }
                delete contexts[id];
            }
        }
    }
}

function parseKey(key){
    var keys = null;
    if(!key){
        return null;
    }
    var index_$ = key.indexOf("$");
    var index_dot = key.indexOf(".", 1);
    if(index_$ === 0 && index_dot){
        keys = [];
        keys[0] = key.substring(1,index_dot);
        keys[1] = key.substring(index_dot + 1);
        keys[0] = keys[0] || "default";
    }
    return keys;
}

module.exports = {
    init: init,
    load: load,
    get: getContext,
    delete: deleteContext,
    clean:clean
};
