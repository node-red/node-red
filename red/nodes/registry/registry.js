/**
 * Copyright 2015 IBM Corp.
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

 //var UglifyJS = require("uglify-js");
var util = require("util");
var when = require("when");
var events = require("../../events");

var settings;

var Node;

var nodeConfigCache = null;
var moduleConfigs = {};
var nodeList = [];
var nodeConstructors = {};
var nodeTypeToId = {};
var moduleNodes = {};

function init(_settings) {
    settings = _settings;
    if (settings.available()) {
        moduleConfigs = loadNodeConfigs();
    } else {
        moduleConfigs = {};
    }
    moduleNodes = {};
    nodeTypeToId = {};
    nodeConstructors = {};
    nodeList = [];
    nodeConfigCache = null;
    Node = require("../Node");
}

function filterNodeInfo(n) {
    var r = {
        id: n.id||n.module+"/"+n.name,
        name: n.name,
        types: n.types,
        enabled: n.enabled
    };
    if (n.hasOwnProperty("module")) {
        r.module = n.module;
    }
    if (n.hasOwnProperty("err")) {
        r.err = n.err.toString();
    }
    return r;
}



function getModule(id) {
    return id.split("/")[0];
}

function getNode(id) {
    return id.split("/")[1];
}

function saveNodeList() {
    var moduleList = {};

    for (var module in moduleConfigs) {
        /* istanbul ignore else */
        if (moduleConfigs.hasOwnProperty(module)) {
            if (Object.keys(moduleConfigs[module].nodes).length > 0) {
                if (!moduleList[module]) {
                    moduleList[module] = {
                        name: module,
                        version: moduleConfigs[module].version,
                        nodes: {}
                    };
                }
                var nodes = moduleConfigs[module].nodes;
                for(var node in nodes) {
                    /* istanbul ignore else */
                    if (nodes.hasOwnProperty(node)) {
                        var config = nodes[node];
                        var n = filterNodeInfo(config);
                        delete n.err;
                        delete n.file;
                        delete n.id;
                        n.file = config.file;
                        moduleList[module].nodes[node] = n;
                    }
                }
            }
        }
    }
    if (settings.available()) {
        return settings.set("nodes",moduleList);
    } else {
        return when.reject("Settings unavailable");
    }
}

function loadNodeConfigs() {
    var configs = settings.get("nodes");

    if (!configs) {
        return {};
    } else if (configs['node-red']) {
        return configs;
    } else {
        // Migrate from the 0.9.1 format of settings
        var newConfigs = {};
        for (var id in configs) {
            /* istanbul ignore else */
            if (configs.hasOwnProperty(id)) {
                var nodeConfig = configs[id];
                var moduleName;
                var nodeSetName;

                if (nodeConfig.module) {
                    moduleName = nodeConfig.module;
                    nodeSetName = nodeConfig.name.split(":")[1];
                } else {
                    moduleName = "node-red";
                    nodeSetName = nodeConfig.name.replace(/^\d+-/,"").replace(/\.js$/,"");
                }

                if (!newConfigs[moduleName]) {
                    newConfigs[moduleName] = {
                        name: moduleName,
                        nodes:{}
                    };
                }
                newConfigs[moduleName].nodes[nodeSetName] = {
                    name: nodeSetName,
                    types: nodeConfig.types,
                    enabled: nodeConfig.enabled,
                    module: moduleName
                };
            }
        }
        settings.set("nodes",newConfigs);
        return newConfigs;
    }
}

function addNodeSet(id,set,version) {
    if (!set.err) {
        set.types.forEach(function(t) {
            nodeTypeToId[t] = id;
        });
    }
    moduleNodes[set.module] = moduleNodes[set.module]||[];
    moduleNodes[set.module].push(set.name);

    if (!moduleConfigs[set.module]) {
        moduleConfigs[set.module] = {
            name: set.module,
            nodes: {}
        };
    }

    if (version) {
        moduleConfigs[set.module].version = version;
    }

    moduleConfigs[set.module].nodes[set.name] = set;
    nodeList.push(id);
    nodeConfigCache = null;
}

function removeNode(id) {
    var config = moduleConfigs[getModule(id)].nodes[getNode(id)];
    if (!config) {
        throw new Error("Unrecognised id: "+id);
    }
    delete moduleConfigs[getModule(id)].nodes[getNode(id)];
    var i = nodeList.indexOf(id);
    if (i > -1) {
        nodeList.splice(i,1);
    }
    config.types.forEach(function(t) {
        delete nodeConstructors[t];
        delete nodeTypeToId[t];
    });
    config.enabled = false;
    config.loaded = false;
    nodeConfigCache = null;
    return filterNodeInfo(config);
}

function removeModule(module) {
    if (!settings.available()) {
        throw new Error("Settings unavailable");
    }
    var nodes = moduleNodes[module];
    if (!nodes) {
        throw new Error("Unrecognised module: "+module);
    }
    var infoList = [];
    for (var i=0;i<nodes.length;i++) {
        infoList.push(removeNode(module+"/"+nodes[i]));
    }
    delete moduleNodes[module];
    delete moduleConfigs[module];
    saveNodeList();
    return infoList;
}

function getNodeInfo(typeOrId) {
    var id = typeOrId;
    if (nodeTypeToId[typeOrId]) {
        id = nodeTypeToId[typeOrId];
    }
    /* istanbul ignore else */
    if (id) {
        var module = moduleConfigs[getModule(id)];
        if (module) {
            var config = module.nodes[getNode(id)];
            if (config) {
                var info = filterNodeInfo(config);
                if (config.hasOwnProperty("loaded")) {
                    info.loaded = config.loaded;
                }
                info.version = module.version;
                return info;
            }
        }
    }
    return null;
}

function getFullNodeInfo(typeOrId) {
    // Used by index.enableNodeSet so that .file can be retrieved to pass
    // to loader.loadNodeSet
    var id = typeOrId;
    if (nodeTypeToId[typeOrId]) {
        id = nodeTypeToId[typeOrId];
    }
    /* istanbul ignore else */
    if (id) {
        var module = moduleConfigs[getModule(id)];
        if (module) {
            return module.nodes[getNode(id)];
        }        
    }
    return null;
}

function getNodeList(filter) {
    var list = [];
    for (var module in moduleConfigs) {
        /* istanbul ignore else */
        if (moduleConfigs.hasOwnProperty(module)) {
            var nodes = moduleConfigs[module].nodes;
            for (var node in nodes) {
                /* istanbul ignore else */
                if (nodes.hasOwnProperty(node)) {
                    var nodeInfo = filterNodeInfo(nodes[node]);
                    nodeInfo.version = moduleConfigs[module].version;
                    if (!filter || filter(nodes[node])) {
                        list.push(nodeInfo);
                    }
                }
            }
        }
    }
    return list;
}

function getModuleList() {
    //var list = [];
    //for (var module in moduleNodes) {
    //    /* istanbul ignore else */
    //    if (moduleNodes.hasOwnProperty(module)) {
    //        list.push(registry.getModuleInfo(module));
    //    }
    //}
    //return list;
    return moduleConfigs;
        
}

function getModuleInfo(module) {
    if (moduleNodes[module]) {
        var nodes = moduleNodes[module];
        var m = {
            name: module,
            version: moduleConfigs[module].version,
            nodes: []
        };
        for (var i = 0; i < nodes.length; ++i) {
            var nodeInfo = filterNodeInfo(moduleConfigs[module].nodes[nodes[i]]);
            nodeInfo.version = m.version;
            m.nodes.push(nodeInfo);
        }
        return m;
    } else {
        return null;
    }
}

function registerNodeConstructor(type,constructor) {
    if (nodeConstructors[type]) {
        throw new Error(type+" already registered");
    }
    //TODO: Ensure type is known - but doing so will break some tests
    //      that don't have a way to register a node template ahead
    //      of registering the constructor
    util.inherits(constructor,Node);
    nodeConstructors[type] = constructor;
    events.emit("type-registered",type);
}

function getAllNodeConfigs() {
    if (!nodeConfigCache) {
        var result = "";
        var script = "";
        for (var i=0;i<nodeList.length;i++) {
            var id = nodeList[i];
            var config = moduleConfigs[getModule(id)].nodes[getNode(id)];
            if (config.enabled && !config.err) {
                result += config.config;
                //script += config.script;
            }
        }
        //if (script.length > 0) {
        //    result += '<script type="text/javascript">';
        //    result += UglifyJS.minify(script, {fromString: true}).code;
        //    result += '</script>';
        //}
        nodeConfigCache = result;
    }
    return nodeConfigCache;
}

function getNodeConfig(id) {
    var config = moduleConfigs[getModule(id)];
    if (!config) {
        return null;
    }
    config = config.nodes[getNode(id)];
    if (config) {
        var result = config.config;
        //if (config.script) {
        //    result += '<script type="text/javascript">'+config.script+'</script>';
        //}
        return result;
    } else {
        return null;
    }
}

function getNodeConstructor(type) {
    var id = nodeTypeToId[type];

    var config;
    if (typeof id === "undefined") {
        config = undefined;
    } else {
        config = moduleConfigs[getModule(id)].nodes[getNode(id)];
    }

    if (!config || (config.enabled && !config.err)) {
        return nodeConstructors[type];
    }
    return null;
}

function clear() {
    nodeConfigCache = null;
    moduleConfigs = {};
    nodeList = [];
    nodeConstructors = {};
    nodeTypeToId = {};
}

function getTypeId(type) {
    return nodeTypeToId[type];
}

function enableNodeSet(typeOrId) {
    if (!settings.available()) {
        throw new Error("Settings unavailable");
    }

    var id = typeOrId;
    if (nodeTypeToId[typeOrId]) {
        id = nodeTypeToId[typeOrId];
    }
    var config;
    try {
        config = moduleConfigs[getModule(id)].nodes[getNode(id)];
        delete config.err;
        config.enabled = true;
        nodeConfigCache = null;
        return saveNodeList().then(function() {
            return filterNodeInfo(config);
        });
    } catch (err) {
        throw new Error("Unrecognised id: "+typeOrId);
    }
}

function disableNodeSet(typeOrId) {
    if (!settings.available()) {
        throw new Error("Settings unavailable");
    }
    var id = typeOrId;
    if (nodeTypeToId[typeOrId]) {
        id = nodeTypeToId[typeOrId];
    }
    var config;
    try {
        config = moduleConfigs[getModule(id)].nodes[getNode(id)];
        // TODO: persist setting
        config.enabled = false;
        nodeConfigCache = null;
        return saveNodeList().then(function() {
            return filterNodeInfo(config);
        });
    } catch (err) {
        throw new Error("Unrecognised id: "+id);
    }
}

function cleanModuleList() {
    var removed = false;
    for (var mod in moduleConfigs) {
        /* istanbul ignore else */
        if (moduleConfigs.hasOwnProperty(mod)) {
            var nodes = moduleConfigs[mod].nodes;
            var node;
            if (mod == "node-red") {
                // For core nodes, look for nodes that are enabled, !loaded and !errored
                for (node in nodes) {
                    /* istanbul ignore else */
                    if (nodes.hasOwnProperty(node)) {
                        var n = nodes[node];
                        if (n.enabled && !n.err && !n.loaded) {
                            removeNode(mod+"/"+node);
                            removed = true;
                        }
                    }
                }
            } else {
                if (moduleConfigs[mod] && !moduleNodes[mod]) {
                    // For node modules, look for missing ones
                    for (node in nodes) {
                        /* istanbul ignore else */
                        if (nodes.hasOwnProperty(node)) {
                            removeNode(mod+"/"+node);
                            removed = true;
                        }
                    }
                    delete moduleConfigs[mod];
                }
            }
        }
    }
    if (removed) {
        saveNodeList();
    }
}

var registry = module.exports = {
    init: init,
    clear: clear,

    registerNodeConstructor: registerNodeConstructor,
    getNodeConstructor: getNodeConstructor,

    addNodeSet: addNodeSet,
    enableNodeSet: enableNodeSet,
    disableNodeSet: disableNodeSet,
    
    removeModule: removeModule,
    
    getNodeInfo: getNodeInfo,
    getFullNodeInfo: getFullNodeInfo,
    getNodeList: getNodeList,
    getModuleList: getModuleList,
    getModuleInfo: getModuleInfo,

    /**
     * Gets all of the node template configs
     * @return all of the node templates in a single string
     */
    getAllNodeConfigs: getAllNodeConfigs,
    getNodeConfig: getNodeConfig,

    getTypeId: getTypeId,

    saveNodeList: saveNodeList,

    cleanModuleList: cleanModuleList
};
