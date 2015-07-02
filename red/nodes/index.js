/**
 * Copyright 2013, 2015 IBM Corp.
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
var registry = require("./registry");
var credentials = require("./credentials");
var flows = require("./flows");
var Node = require("./Node");
var log = require("../log");

/**
 * Registers a node constructor
 * @param type - the string type name
 * @param constructor - the constructor function for this node type
 * @param opts - optional additional options for the node
 */
function registerType(type,constructor,opts) {
    if (opts && opts.credentials) {
        credentials.register(type,opts.credentials);
    }
    registry.registerType(type,constructor);
}

/**
 * Called from a Node's constructor function, invokes the super-class
 * constructor and attaches any credentials to the node.
 * @param node the node object being created
 * @param def the instance definition for the node
 */
function createNode(node,def) {
    Node.call(node,def);
    var id = node.id;
    if (def._alias) {
        id = def._alias;
    }
    var creds = credentials.get(id);
    if (creds) {
        //console.log("Attaching credentials to ",node.id);
        node.credentials = creds;
    } else if (credentials.getDefinition(node.type)) {
        node.credentials = {};
    }
}

function init(_settings,storage,app) {
    credentials.init(storage,app);
    flows.init(_settings,storage);
    registry.init(_settings);
}

function checkTypeInUse(id) {
    var nodeInfo = registry.getNodeInfo(id);
    if (!nodeInfo) {
        throw new Error(log._("nodes.index.unrecognised-id", {id:id}));
    } else {
        var inUse = {};
        var config = flows.getFlows();
        config.forEach(function(n) {
            inUse[n.type] = (inUse[n.type]||0)+1;
        });
        var nodesInUse = [];
        nodeInfo.types.forEach(function(t) {
            if (inUse[t]) {
                nodesInUse.push(t);
            }
        });
        if (nodesInUse.length > 0) {
            var msg = nodesInUse.join(", ");
            var err = new Error(log._("nodes.index.type-in-use", {msg:msg}));
            err.code = "type_in_use";
            throw err;
        }
    }
}

function removeNode(id) {
    checkTypeInUse(id);
    return registry.removeNode(id);
}

function removeModule(module) {
    var info = registry.getModuleInfo(module);
    if (!info) {
        throw new Error(log._("nodes.index.unrecognised-module", {module:module}));
    } else {
        for (var i=0;i<info.nodes.length;i++) {
            checkTypeInUse(module+"/"+info.nodes[i].name);
        }
        return registry.removeModule(module);
    }
}

function disableNode(id) {
    checkTypeInUse(id);
    return registry.disableNode(id);
}

module.exports = {
    // Lifecycle
    init: init,
    load: registry.load,

    // Node registry
    createNode: createNode,
    getNode: flows.get,
    eachNode: flows.eachNode,

    addFile: registry.addFile,
    addModule: registry.addModule,
    removeModule: removeModule,

    enableNode: registry.enableNode,
    disableNode: disableNode,

    // Node type registry
    registerType: registerType,
    getType: registry.get,

    getNodeInfo: registry.getNodeInfo,
    getNodeList: registry.getNodeList,

    getModuleInfo: registry.getModuleInfo,

    getNodeConfigs: registry.getNodeConfigs,
    getNodeConfig: registry.getNodeConfig,

    clearRegistry: registry.clear,
    cleanModuleList: registry.cleanModuleList,

    // Flow handling
    loadFlows: flows.load,
    stopFlows: flows.stopFlows,
    setFlows: flows.setFlows,
    getFlows: flows.getFlows,

    // Credentials
    addCredentials: credentials.add,
    getCredentials: credentials.get,
    deleteCredentials: credentials.delete
};

