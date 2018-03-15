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

var util = require("../../util");
var log = require("../../log");
var externalContext = require("./external");

var contexts = {};
var globalContext = null;

var re = /^(\$.*?)\.(.+)|^(\$.*)/;

function createContext(id,seed) {
    var flowId = id;
    var data = seed || {};
    var obj = seed || {};

    function get(key) {
        return util.getMessageProperty(data,key);
    };
    function set(key, value) {
        util.setMessageProperty(data,key,value);
    };
    function keys() {
        var keysData = Object.keys(data);
        if (seed == null) {
            return keysData;
        } else {
            return keysData.filter(function (key) {
                return key !== "set" && key !== "get" && key !== "keys";
            });
        }
    };

    obj.get = function(key) {
        if(externalContext.canUse(key)) {
            return externalContext.get(key, flowId);
        }else{
            return get(key);
        }
    };
    obj.set = function(key, value) {
        if(externalContext.canUse(key)) {
            externalContext.set(key, value, flowId);
        }else{
            set(key, value);
        }
    }
    obj.keys = function(key) {
        if(externalContext.canUse(key)) {
            return externalContext.keys(key, flowId);
        }else{
            return keys();
        }
    }
    return obj;
}

function getContext(localId,flowId) {
    var contextId = localId;
    if (flowId) {
        contextId = localId+"_"+flowId;
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
        contextId = id+"_"+flowId;
    }
    delete contexts[contextId];
}

function clean(flowConfig) {
    var activeIds = {};
    var contextId;
    var node;
    for (var id in contexts) {
        if (contexts.hasOwnProperty(id)) {
            var idParts = id.split("_");
            if (!flowConfig.allNodes.hasOwnProperty(idParts[0])) {
                delete contexts[id];
            }
        }
    }
}

module.exports = {
    init: function(settings) {
        globalContext = createContext("global",settings.functionGlobalContext || {});
        externalContext.init(settings);
    },
    get: getContext,
    delete: deleteContext,
    clean:clean
};
