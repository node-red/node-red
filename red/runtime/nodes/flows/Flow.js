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

var when = require("when");
var clone = require("clone");
var typeRegistry = require("../registry");
var Log = require("../../log");
var redUtil = require("../../util");
var flowUtil = require("./util");

function Flow(global,flow) {
    if (typeof flow === 'undefined') {
        flow = global;
    }
    var activeNodes = {};
    var subflowInstanceNodes = {};
    var catchNodeMap = {};
    var statusNodeMap = {};

    this.start = function(diff) {
        var node;
        var newNode;
        var id;
        catchNodeMap = {};
        statusNodeMap = {};
        for (id in flow.configs) {
            if (flow.configs.hasOwnProperty(id)) {
                node = flow.configs[id];
                if (!activeNodes[id]) {
                    newNode = createNode(node.type,node);
                    if (newNode) {
                        activeNodes[id] = newNode;
                    }
                }
            }
        }
        if (diff && diff.rewired) {
            for (var j=0;j<diff.rewired.length;j++) {
                var rewireNode = activeNodes[diff.rewired[j]];
                if (rewireNode) {
                    rewireNode.updateWires(flow.nodes[rewireNode.id].wires);
                }
            }
        }

        for (id in flow.nodes) {
            if (flow.nodes.hasOwnProperty(id)) {
                node = flow.nodes[id];
                if (!node.subflow) {
                    if (!activeNodes[id]) {
                        newNode = createNode(node.type,node);
                        if (newNode) {
                            activeNodes[id] = newNode;
                        }
                    }
                } else {
                    if (!subflowInstanceNodes[id]) {
                        try {
                            var nodes = createSubflow(flow.subflows[node.subflow]||global.subflows[node.subflow],node,flow.subflows,global.subflows,activeNodes);
                            subflowInstanceNodes[id] = nodes.map(function(n) { return n.id});
                            for (var i=0;i<nodes.length;i++) {
                                if (nodes[i]) {
                                    activeNodes[nodes[i].id] = nodes[i];
                                }
                            }
                        } catch(err) {
                            console.log(err.stack)
                        }
                    }
                }
            }
        }

        for (id in activeNodes) {
            if (activeNodes.hasOwnProperty(id)) {
                node = activeNodes[id];
                if (node.type === "catch") {
                    catchNodeMap[node.z] = catchNodeMap[node.z] || [];
                    catchNodeMap[node.z].push(node);
                } else if (node.type === "status") {
                    statusNodeMap[node.z] = statusNodeMap[node.z] || [];
                    statusNodeMap[node.z].push(node);
                }
            }
        }
    }

    this.stop = function(stopList) {
        return when.promise(function(resolve) {
            var i;
            if (stopList) {
                for (i=0;i<stopList.length;i++) {
                    if (subflowInstanceNodes[stopList[i]]) {
                        // The first in the list is the instance node we already
                        // know about
                        stopList = stopList.concat(subflowInstanceNodes[stopList[i]].slice(1))
                    }
                }
            } else {
                stopList = Object.keys(activeNodes);
            }
            var promises = [];
            for (i=0;i<stopList.length;i++) {
                var node = activeNodes[stopList[i]];
                if (node) {
                    delete activeNodes[stopList[i]];
                    if (subflowInstanceNodes[stopList[i]]) {
                        delete subflowInstanceNodes[stopList[i]];
                    }
                    try {
                        var p = node.close();
                        if (p) {
                            promises.push(p);
                        }
                    } catch(err) {
                        node.error(err);
                    }
                }
            }
            when.settle(promises).then(function() {
                resolve();
            });
        });
    }

    this.update = function(_global,_flow) {
        global = _global;
        flow = _flow;
    }

    this.getNode = function(id) {
        return activeNodes[id];
    }

    this.getActiveNodes = function() {
        return activeNodes;
    }

    this.handleStatus = function(node,statusMessage) {
        var targetStatusNodes = null;
        var reportingNode = node;
        var handled = false;
        while(reportingNode && !handled) {
            targetStatusNodes = statusNodeMap[reportingNode.z];
            if (targetStatusNodes) {
                targetStatusNodes.forEach(function(targetStatusNode) {
                    if (targetStatusNode.scope && targetStatusNode.scope.indexOf(node.id) === -1) {
                        return;
                    }
                    var message = {
                        status: {
                            text: "",
                            source: {
                                id: node.id,
                                type: node.type,
                                name: node.name
                            }
                        }
                    };
                    if (statusMessage.text) {
                        message.status.text = statusMessage.text;
                    }
                    targetStatusNode.receive(message);
                    handled = true;
                });
            }
            if (!handled) {
                reportingNode = activeNodes[reportingNode.z];
            }
        }
    }

    this.handleError = function(node,logMessage,msg) {
        var count = 1;
        if (msg && msg.hasOwnProperty("error")) {
            if (msg.error.hasOwnProperty("source")) {
                if (msg.error.source.id === node.id) {
                    count = msg.error.source.count+1;
                    if (count === 10) {
                        node.warn(Log._("nodes.flow.error-loop"));
                        return;
                    }
                }
            }
        }
        var targetCatchNodes = null;
        var throwingNode = node;
        var handled = false;
        while (throwingNode && !handled) {
            targetCatchNodes = catchNodeMap[throwingNode.z];
            if (targetCatchNodes) {
                targetCatchNodes.forEach(function(targetCatchNode) {
                    if (targetCatchNode.scope && targetCatchNode.scope.indexOf(throwingNode.id) === -1) {
                        return;
                    }
                    var errorMessage;
                    if (msg) {
                        errorMessage = redUtil.cloneMessage(msg);
                    } else {
                        errorMessage = {};
                    }
                    if (errorMessage.hasOwnProperty("error")) {
                        errorMessage._error = errorMessage.error;
                    }
                    errorMessage.error = {
                        message: logMessage.toString(),
                        source: {
                            id: node.id,
                            type: node.type,
                            name: node.name,
                            count: count
                        }
                    };
                    targetCatchNode.receive(errorMessage);
                    handled = true;
                });
            }
            if (!handled) {
                throwingNode = activeNodes[throwingNode.z];
            }
        }
    }

}

var EnvVarPropertyRE = /^\$\((\S+)\)$/;

function mapEnvVarProperties(obj,prop) {
    if (Buffer.isBuffer(obj[prop])) {
        return;
    } else if (Array.isArray(obj[prop])) {
        for (var i=0;i<obj[prop].length;i++) {
            mapEnvVarProperties(obj[prop],i);
        }
    } else if (typeof obj[prop] === 'string') {
        var m;
        if ( (m = EnvVarPropertyRE.exec(obj[prop])) !== null) {
            if (process.env.hasOwnProperty(m[1])) {
                obj[prop] = process.env[m[1]];
            }
        }
    } else {
        for (var p in obj[prop]) {
            if (obj[prop].hasOwnProperty) {
                mapEnvVarProperties(obj[prop],p);
            }
        }
    }
}

function createNode(type,config) {
    var nn = null;
    var nt = typeRegistry.get(type);
    if (nt) {
        var conf = clone(config);
        delete conf.credentials;
        for (var p in conf) {
            if (conf.hasOwnProperty(p)) {
                mapEnvVarProperties(conf,p);
            }
        }
        try {
            nn = new nt(conf);
        }
        catch (err) {
            Log.log({
                level: Log.ERROR,
                id:conf.id,
                type: type,
                msg: err
            });
        }
    } else {
        Log.error(Log._("nodes.flow.unknown-type", {type:type}));
    }
    return nn;
}

function createSubflow(sf,sfn,subflows,globalSubflows,activeNodes) {
    //console.log("CREATE SUBFLOW",sf.id,sfn.id);
    var nodes = [];
    var node_map = {};
    var newNodes = [];
    var node;
    var wires;
    var i,j,k;

    var createNodeInSubflow = function(def) {
        node = clone(def);
        var nid = redUtil.generateId();
        node_map[node.id] = node;
        node._alias = node.id;
        node.id = nid;
        node.z = sfn.id;
        newNodes.push(node);
    }

    // Clone all of the subflow node definitions and give them new IDs
    for (i in sf.configs) {
        if (sf.configs.hasOwnProperty(i)) {
            createNodeInSubflow(sf.configs[i]);
        }
    }
    // Clone all of the subflow node definitions and give them new IDs
    for (i in sf.nodes) {
        if (sf.nodes.hasOwnProperty(i)) {
            createNodeInSubflow(sf.nodes[i]);
        }
    }

    // Look for any catch/status nodes and update their scope ids
    // Update all subflow interior wiring to reflect new node IDs
    for (i=0;i<newNodes.length;i++) {
        node = newNodes[i];
        if (node.wires) {
            var outputs = node.wires;
            for (j=0;j<outputs.length;j++) {
                wires = outputs[j];
                for (k=0;k<wires.length;k++) {
                    outputs[j][k] = node_map[outputs[j][k]].id
                }
            }
            if ((node.type === 'catch' || node.type === 'status') && node.scope) {
                node.scope = node.scope.map(function(id) {
                    return node_map[id]?node_map[id].id:""
                })
            } else {
                for (var prop in node) {
                    if (node.hasOwnProperty(prop) && prop !== '_alias') {
                        if (node_map[node[prop]]) {
                            //console.log("Mapped",node.type,node.id,prop,node_map[node[prop]].id);
                            node[prop] = node_map[node[prop]].id;
                        }
                    }
                }
            }
        }
    }

    // Create a subflow node to accept inbound messages and route appropriately
    var Node = require("../Node");
    var subflowInstance = {
        id: sfn.id,
        type: sfn.type,
        z: sfn.z,
        name: sfn.name,
        wires: []
    }
    if (sf.in) {
        subflowInstance.wires = sf.in.map(function(n) { return n.wires.map(function(w) { return node_map[w.id].id;})})
        subflowInstance._originalWires = clone(subflowInstance.wires);
    }
    var subflowNode = new Node(subflowInstance);

    subflowNode.on("input", function(msg) { this.send(msg);});


    subflowNode._updateWires = subflowNode.updateWires;

    subflowNode.updateWires = function(newWires) {
        // Wire the subflow outputs
        if (sf.out) {
            var node,wires,i,j;
            // Restore the original wiring to the internal nodes
            subflowInstance.wires = clone(subflowInstance._originalWires);
            for (i=0;i<sf.out.length;i++) {
                wires = sf.out[i].wires;
                for (j=0;j<wires.length;j++) {
                    if (wires[j].id != sf.id) {
                        node = node_map[wires[j].id];
                        if (node._originalWires) {
                            node.wires = clone(node._originalWires);
                        }
                    }
                }
            }

            var modifiedNodes = {};
            var subflowInstanceModified = false;

            for (i=0;i<sf.out.length;i++) {
                wires = sf.out[i].wires;
                for (j=0;j<wires.length;j++) {
                    if (wires[j].id === sf.id) {
                        subflowInstance.wires[wires[j].port] = subflowInstance.wires[wires[j].port].concat(newWires[i]);
                        subflowInstanceModified = true;
                    } else {
                        node = node_map[wires[j].id];
                        node.wires[wires[j].port] = node.wires[wires[j].port].concat(newWires[i]);
                        modifiedNodes[node.id] = node;
                    }
                }
            }
            Object.keys(modifiedNodes).forEach(function(id) {
                var node = modifiedNodes[id];
                subflowNode.instanceNodes[id].updateWires(node.wires);
            });
            if (subflowInstanceModified) {
                subflowNode._updateWires(subflowInstance.wires);
            }
        }
    }

    nodes.push(subflowNode);

    // Wire the subflow outputs
    if (sf.out) {
        var modifiedNodes = {};
        for (i=0;i<sf.out.length;i++) {
            wires = sf.out[i].wires;
            for (j=0;j<wires.length;j++) {
                if (wires[j].id === sf.id) {
                    // A subflow input wired straight to a subflow output
                    subflowInstance.wires[wires[j].port] = subflowInstance.wires[wires[j].port].concat(sfn.wires[i])
                    subflowNode._updateWires(subflowInstance.wires);
                } else {
                    node = node_map[wires[j].id];
                    modifiedNodes[node.id] = node;
                    if (!node._originalWires) {
                        node._originalWires = clone(node.wires);
                    }
                    node.wires[wires[j].port] = (node.wires[wires[j].port]||[]).concat(sfn.wires[i]);
                }
            }
        }
    }

    // Instantiate the nodes
    for (i=0;i<newNodes.length;i++) {
        node = newNodes[i];
        var type = node.type;

        var m = /^subflow:(.+)$/.exec(type);
        if (!m) {
            var newNode = createNode(type,node);
            if (newNode) {
                activeNodes[node.id] = newNode;
                nodes.push(newNode);
            }
        } else {
            var subflowId = m[1];
            nodes = nodes.concat(createSubflow(subflows[subflowId]||globalSubflows[subflowId],node,subflows,globalSubflows,activeNodes));
        }
    }

    subflowNode.instanceNodes = {};

    nodes.forEach(function(node) {
       subflowNode.instanceNodes[node.id] = node;
    });
    return nodes;
}

module.exports = {
    create: function(global,conf) {
        return new Flow(global,conf);
    }
}
