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
var path = require("path");
var fs = require("fs");
var clone = require("clone");

var registry = require("./registry");
var credentials = require("./credentials");
var flows = require("./flows");
var flowUtil = require("./flows/util")
var context = require("./context");
var Node = require("./Node");
var log = null;
var library = require("./library");

var events = require("../events");

var settings;

/**
 * Registers a node constructor
 * @param nodeSet - the nodeSet providing the node (module/set)
 * @param type - the string type name
 * @param constructor - the constructor function for this node type
 * @param opts - optional additional options for the node
 */
function registerType(nodeSet,type,constructor,opts) {
    if (typeof type !== "string") {
        // This is someone calling the api directly, rather than via the
        // RED object provided to a node. Log a warning
        log.warn("["+nodeSet+"] Deprecated call to RED.runtime.nodes.registerType - node-set name must be provided as first argument");
        opts = constructor;
        constructor = type;
        type = nodeSet;
        nodeSet = "";
    }
    if (opts) {
        if (opts.credentials) {
            credentials.register(type,opts.credentials);
        }
        if (opts.settings) {
            try {
                settings.registerNodeSettings(type,opts.settings);
            } catch(err) {
                log.warn("["+type+"] "+err.message);
            }
        }
    }
    registry.registerType(nodeSet,type,constructor);
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
        creds = clone(creds);
        //console.log("Attaching credentials to ",node.id);
        // allow $(foo) syntax to substitute env variables for credentials also...
        for (var p in creds) {
            if (creds.hasOwnProperty(p)) {
                flowUtil.mapEnvVarProperties(creds,p);
            }
        }
        node.credentials = creds;
    } else if (credentials.getDefinition(node.type)) {
        node.credentials = {};
    }
}

function init(runtime) {
    settings = runtime.settings;
    log = runtime.log;
    credentials.init(runtime);
    flows.init(runtime);
    registry.init(runtime);
    context.init(runtime.settings);
    library.init(runtime);
}

function disableNode(id) {
    flows.checkTypeInUse(id);
    return registry.disableNode(id);
}

function uninstallModule(module) {
    var info = registry.getModuleInfo(module);
    if (!info) {
        throw new Error(log._("nodes.index.unrecognised-module", {module:module}));
    } else {
        for (var i=0;i<info.nodes.length;i++) {
            flows.checkTypeInUse(module+"/"+info.nodes[i].name);
        }
        return registry.uninstallModule(module);
    }
}

module.exports = {
    // Lifecycle
    init: init,
    load: registry.load,

    // Node registry
    createNode: createNode,
    getNode: flows.get,
    eachNode: flows.eachNode,

    paletteEditorEnabled: registry.paletteEditorEnabled,
    installModule: registry.installModule,
    uninstallModule: uninstallModule,

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
    getNodeIconPath: registry.getNodeIconPath,
    getNodeIcons: registry.getNodeIcons,
    getNodeExampleFlows: library.getExampleFlows,
    getNodeExampleFlowPath: library.getExampleFlowPath,

    clearRegistry: registry.clear,
    cleanModuleList: registry.cleanModuleList,

    // Flow handling
    loadFlows:  flows.load,
    startFlows: flows.startFlows,
    stopFlows:  flows.stopFlows,
    setFlows:   flows.setFlows,
    getFlows:   flows.getFlows,

    addFlow:     flows.addFlow,
    getFlow:     flows.getFlow,
    updateFlow:  flows.updateFlow,
    removeFlow:  flows.removeFlow,
    // disableFlow: flows.disableFlow,
    // enableFlow:  flows.enableFlow,

    // Credentials
    addCredentials: credentials.add,
    getCredentials: credentials.get,
    deleteCredentials: credentials.delete,
    getCredentialDefinition: credentials.getDefinition,
    setCredentialSecret: credentials.setKey,
    clearCredentials: credentials.clear,
    exportCredentials: credentials.export,
    getCredentialKeyType: credentials.getKeyType
};
