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


function createNode(node,def) {
    Node.call(node,def);
}

function init(_settings,storage) {
    credentials.init(storage);
    flows.init(storage);
    registry.init(_settings);
}


module.exports = {
    init: init,
    load: registry.load,
    addCredentials: credentials.add,
    getCredentials: credentials.get,
    deleteCredentials: credentials.delete,
    createNode: createNode,
    registerType: registry.registerType,
    getType: registry.get,
    getNodeConfigs: registry.getNodeConfigs,
    getNode: flows.get,
    
    loadFlows: flows.load,
    stopFlows: flows.stopFlows,
    setFlows: flows.setFlows,
    getFlows: flows.getFlows
}

