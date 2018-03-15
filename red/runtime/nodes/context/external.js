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
var log = require("../../log");

var re = /^(\$.*?)\.(.+)|^(\$.*)/;
var externalContexts;

function parseKey(key){
    var keys = null;
    var temp = re.exec(key);
    if(temp){
        keys = [];
        if(temp[3]){
            keys[0] = temp[3];
            keys[1] = null;
        } else {
            keys[0] = temp[1];
            keys[1] = temp[2];
        }
        keys[0] = keys[0] === "$" ? "default" : keys[0].substring(1);
    }
    return keys;
}

function hasContextStorage(plugin) {
    return externalContexts.hasOwnProperty(plugin);
}

var contextModuleInterface ={
    init: function (settings) {
        var plugins = settings.contextStorage;
        externalContexts = {};
        if (plugins) {
            for(var pluginName in plugins){
                var plugin;
                if(plugins[pluginName].hasOwnProperty("module") && plugins[pluginName].hasOwnProperty("config")) {
                    if(typeof plugins[pluginName].module === "string") {
                        try{
                            plugin = require(plugins[pluginName].module);
                        }catch(err){
                            log.error(err);
                            continue;
                        }
                    } else {
                        plugin = plugins[pluginName].module;
                    }
                    plugin.init(plugins[pluginName].config);
                    externalContexts[pluginName] = plugin;
                }
            }
        }
    },
    get: function(key, flowId) {
        var result = parseKey(key);
        if(!result){
            throw new Error("Invalid key");
        }
        if(hasContextStorage(result[0])){
            return externalContexts[result[0]].get(result[1], flowId);
        }else if(hasContextStorage("default")) {
            // log.warn(result[1] " is got from default context storage");
            return externalContexts["default"].get(result[1], flowId);
        }else{
            throw new Error(result[0] + " is not defined in setting.js");
        }
        
    },
    set: function(key, value, flowId) {
        var result = parseKey(key);
        if(!result){
            throw new Error("Invalid key");
        }
        if(hasContextStorage(result[0])){
            externalContexts[result[0]].set(result[1], value, flowId);
        }else if(hasContextStorage("default")) {
            // log.warn(result[1] " is set to default context storage");
            externalContexts["default"].set(result[1], value, flowId);
        }else{
            throw new Error(result[0] + " is not defined in setting.js");
        }
    },
    keys: function(key, flowId) {
        var result = parseKey(key);
        if(!result){
            throw new Error("Invalid key");
        }
        if(hasContextStorage(result[0])){
            return externalContexts[result[0]].keys(flowId);
        }else if(hasContextStorage("default")) {
            // log.warn("keys are got from default context storage");
            externalContexts["default"].keys(flowId);
        }else{
            throw new Error(result[0] + " is not defined in setting.js");
        }
    },
    // run: function(command,key,value,flowId) {
    //     //todo: run custom method in plugin
    // },
    // close: function(){
    //     //todo: close connections, streams, etc...
    // },
    canUse: function(key){
        var result = parseKey(key);
        if(!result){
            return false;
        }else{
            if(hasContextStorage(result[0]) || hasContextStorage("default")){
                return true;
            }else{
                return false;
            }
        }
    },
    hasContextStorage: hasContextStorage,
    parseKey: parseKey
};

module.exports = contextModuleInterface;