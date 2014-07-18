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
var registry = require("./registry");
var credentials = require("./credentials");
var flows = require("./flows");
var Node = require("./Node");

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

function createNode(node,def) {
    Node.call(node,def);
    var creds = credentials.get(node.id);
    if (creds) {
        node.credentials = creds;
    }
}

function init(_settings,storage) {
    credentials.init(storage);
    flows.init(storage);
    registry.init(_settings);
}


module.exports = {
    init: init,
    load: registry.load,
    
    createNode: createNode,
    registerType: registerType,
    
    getType: registry.get,
    getNodeConfigs: registry.getNodeConfigs,
    getNode: flows.get,
    
    loadFlows: flows.load,
    stopFlows: flows.stopFlows,
    setFlows: flows.setFlows,
    getFlows: flows.getFlows,
    
    // TODO: remove these from api - see #93
    addCredentials: credentials.add,
    getCredentials: credentials.get,
    deleteCredentials: credentials.delete
}

