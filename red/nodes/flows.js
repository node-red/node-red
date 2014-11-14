/**
 * Copyright 2014 IBM Corp.
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

var util = require("util");
var clone = require("clone");
var when = require("when");

var typeRegistry = require("./registry");
var credentials = require("./credentials");
var log = require("../log");
var events = require("../events");

var storage = null;

var nodes = {};
var subflows = {};
var activeConfig = [];
var missingTypes = [];

events.on('type-registered',function(type) {
        if (missingTypes.length > 0) {
            var i = missingTypes.indexOf(type);
            if (i != -1) {
                missingTypes.splice(i,1);
                util.log("[red] Missing type registered: "+type);
                if (missingTypes.length === 0) {
                    parseConfig();
                }
            }
        }
});
    
function getID() {
    return (1+Math.random()*4294967295).toString(16);
}

function createSubflow(sf,sfn) {
    var node_map = {};
    var newNodes = [];
    var node;
    var wires;
    var i,j,k;
    
    // Clone all of the subflow node definitions and give them new IDs
    for (i=0;i<sf.nodes.length;i++) {
        node = clone(sf.nodes[i]);
        var nid = getID();
        node_map[node.id] = node;
        node.id = nid;
        newNodes.push(node);
    }
    // Update all subflow interior wiring to reflect new node IDs
    for (i=0;i<newNodes.length;i++) {
        node = newNodes[i];
        var outputs = node.wires;
        
        for (j=0;j<outputs.length;j++) {
            wires = outputs[j];
            for (k=0;k<wires.length;k++) {
                outputs[j][k] = node_map[outputs[j][k]].id
            }
        }
    }
    
    // Create a subflow node to accept inbound messages and route appropriately
    var Node = require("./Node");
    var subflowInstance = {
        id: sfn.id,
        type: sfn.type,
        name: sfn.name,
        wires: []
    }
    if (sf.in) {
        subflowInstance.wires = sf.in.map(function(n) { return n.wires.map(function(w) { return node_map[w.id].id;})})
    }
    var subflowNode = new Node(subflowInstance);
    subflowNode.on("input", function(msg) { this.send(msg);});

    // Wire the subflow outputs
    if (sf.out) {
        for (i=0;i<sf.out.length;i++) {
            wires = sf.out[i].wires;
            for (j=0;j<wires.length;j++) {
                if (wires[j].id === sf.id) {
                    node = subflowNode;
                    delete subflowNode._wire;
                } else {
                    node = node_map[wires[j].id];
                }
                node.wires[wires[j].port] = node.wires[wires[j].port].concat(sfn.wires[i]);
            }
        }
    }
    
    // Instantiate the nodes
    for (i=0;i<newNodes.length;i++) {
        node = newNodes[i];
        var nn = null;
        var type = node.type;
        
        var m = /^subflow:(.+)$/.exec(type);
        if (!m) {
            var nt = typeRegistry.get(type);
            if (nt) {
                try {
                    nn = new nt(node);
                }
                catch (err) {
                    util.log("[red] "+type+" : "+err);
                }
            }
            if (nn === null) {
                util.log("[red] unknown type: "+type);
            }
        } else {
            var subflowId = m[1];
            createSubflow(subflows[subflowId],node);
        }
    }
    
}

/**
 * Parses the current activeConfig and creates the required node instances
 */ 
function parseConfig() {
    var i;
    var nt;
    var type;
    var subflow;
    missingTypes = [];
    
    // Scan the configuration for any unknown node types
    for (i=0;i<activeConfig.length;i++) {
        type = activeConfig[i].type;
        // TODO: remove workspace in next release+1
        if (type != "workspace" && type != "tab" && !/^subflow($|:.+$)/.test(type)) {
            nt = typeRegistry.get(type);
            if (!nt && missingTypes.indexOf(type) == -1) {
                missingTypes.push(type);
            }
        }
    }
    // Abort if there are any missing types
    if (missingTypes.length > 0) {
        util.log("[red] Waiting for missing types to be registered:");
        for (i=0;i<missingTypes.length;i++) {
            util.log("[red]  - "+missingTypes[i]);
        }
        return;
    }

    util.log("[red] Starting flows");
    events.emit("nodes-starting");

    for (i=0;i<activeConfig.length;i++) {
        type = activeConfig[i].type;
        if (type === "subflow") {
            subflow = activeConfig[i];
            subflow.nodes = [];
            subflow.instances = [];
            subflows[subflow.id] = subflow;
            
        }
    }
    
    for (i=0;i<activeConfig.length;i++) {
        if (subflows[activeConfig[i].z]) {
            subflow = subflows[activeConfig[i].z];
            subflow.nodes.push(activeConfig[i]);
        }
    }
    
    // Instantiate each node in the flow
    for (i=0;i<activeConfig.length;i++) {
        var nn = null;
        type = activeConfig[i].type;
        
        var m = /^subflow:(.+)$/.exec(type);
        if (!m) {
            // TODO: remove workspace in next release+1
            if (type != "workspace" && type != "tab" && type != "subflow" && !subflows[activeConfig[i].z]) {
                nt = typeRegistry.get(type);
                if (nt) {
                    try {
                        nn = new nt(activeConfig[i]);
                    }
                    catch (err) {
                        util.log("[red] "+type+" : "+err);
                    }
                }
                if (nn === null) {
                    util.log("[red] unknown type: "+type);
                }
            }
        } else {
            var subflowId = m[1];
            createSubflow(subflows[subflowId],activeConfig[i]);
        }
    }
    // Clean up any orphaned credentials
    credentials.clean(flowNodes.get);
    events.emit("nodes-started");
}

/**
 * Stops the current activeConfig
 */
function stopFlows() {
    if (activeConfig&&activeConfig.length > 0) {
        util.log("[red] Stopping flows");
    }
    return flowNodes.clear();
}

var flowNodes = module.exports = {
    init: function(_storage) {
        storage = _storage;
    },
    
    /**
     * Load the current activeConfig from storage and start it running
     * @return a promise for the loading of the config
     */
    load: function() {
        return storage.getFlows().then(function(flows) {
            return credentials.load().then(function() {
                activeConfig = flows;
                if (activeConfig && activeConfig.length > 0) {
                    parseConfig();
                }
            });
        }).otherwise(function(err) {
            util.log("[red] Error loading flows : "+err);
        });
    },
    
    /**
     * Add a node to the current active set
     * @param n the node to add
     */
    add: function(n) {
        nodes[n.id] = n;
        n.on("log",log.log);
    },
    
    /**
     * Get a node
     * @param i the node id
     * @return the node
     */
    get: function(i) {
        return nodes[i];
    },
    
    /**
     * Stops all active nodes and clears the active set
     * @return a promise for the stopping of all active nodes
     */
    clear: function() {
        return when.promise(function(resolve) {
            events.emit("nodes-stopping");
            var promises = [];
            for (var n in nodes) {
                if (nodes.hasOwnProperty(n)) {
                    try {
                        var p = nodes[n].close();
                        if (p) {
                            promises.push(p);
                        }
                    } catch(err) {
                        nodes[n].error(err);
                    }
                }
            }
            when.settle(promises).then(function() {
                events.emit("nodes-stopped");
                nodes = {};
                resolve();
            });
        });
    },
    
    /**
     * Provides an iterator over the active set of nodes
     * @param cb a function to be called for each node in the active set
     */
    each: function(cb) {
        for (var n in nodes) {
            if (nodes.hasOwnProperty(n)) {
                cb(nodes[n]);
            }
        }
    },

    /**
     * @return the active configuration
     */
    getFlows: function() {
        return activeConfig;
    },
    
    /**
     * Sets the current active config.
     * @param config the configuration to enable
     * @return a promise for the starting of the new flow
     */
    setFlows: function (config) {
        // Extract any credential updates
        for (var i=0; i<config.length; i++) {
            var node = config[i];
            if (node.credentials) {
                credentials.extract(node);
                delete node.credentials;
            }
        }
        return credentials.save()
            .then(function() { return storage.saveFlows(config);})
            .then(function() { return stopFlows();})
            .then(function () {
                activeConfig = config;
                parseConfig();
            });
    },
    stopFlows: stopFlows
};
