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

var typeRegistry = require("./registry");
var credentials = require("./credentials");
var redUtil = require("../util");
var events = require("../events");
var log = require("../log");

function getID() {
    return (1+Math.random()*4294967295).toString(16);
}

function createNode(type,config) {
    var nn = null;
    var nt = typeRegistry.get(type);
    if (nt) {
        try {
            nn = new nt(clone(config));
        }
        catch (err) {
            log.warn(type+" : "+err);
        }
    } else {
        log.warn("unknown type: "+type);
    }
    return nn;
}


function createSubflow(sf,sfn,subflows) {
    //console.log("CREATE SUBFLOW",sf.config.id,sfn.id);
    var nodes = [];
    var node_map = {};
    var newNodes = [];
    var node;
    var wires;
    var i,j,k;
    
    // Clone all of the subflow node definitions and give them new IDs
    for (i=0;i<sf.nodes.length;i++) {
        node = clone(sf.nodes[i].config);
        var nid = getID();
        node_map[node.id] = node;
        node._alias = node.id;
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
    if (sf.config.in) {
        subflowInstance.wires = sf.config.in.map(function(n) { return n.wires.map(function(w) { return node_map[w.id].id;})})
        subflowInstance._originalWires = clone(subflowInstance.wires);
    }
    var subflowNode = new Node(subflowInstance);
    
    subflowNode.on("input", function(msg) { this.send(msg);});
    
    
    subflowNode._updateWires = subflowNode.updateWires;
    
    subflowNode.updateWires = function(newWires) {
        // Wire the subflow outputs
        if (sf.config.out) {
            var node,wires,i,j;
            // Restore the original wiring to the internal nodes
            
            subflowInstance.wires = clone(subflowInstance._originalWires);
            
            for (i=0;i<sf.config.out.length;i++) {
                wires = sf.config.out[i].wires;
                for (j=0;j<wires.length;j++) {
                    if (wires[j].id != sf.config.id) {
                        node = node_map[wires[j].id];
                        if (node._originalWires) {
                            node.wires = clone(node._originalWires);
                        }
                    }
                }
            }
            
            var modifiedNodes = {};
            var subflowInstanceModified = false;
            
            for (i=0;i<sf.config.out.length;i++) {
                wires = sf.config.out[i].wires;
                for (j=0;j<wires.length;j++) {
                    if (wires[j].id === sf.config.id) {
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
    if (sf.config.out) {
        var modifiedNodes = {};
        for (i=0;i<sf.config.out.length;i++) {
            wires = sf.config.out[i].wires;
            for (j=0;j<wires.length;j++) {
                if (wires[j].id === sf.config.id) {
                    // A subflow input wired straight to a subflow output
                    subflowInstance.wires[wires[j].port] = subflowInstance.wires[wires[j].port].concat(sfn.wires[i])
                    subflowNode._updateWires(subflowInstance.wires);
                } else {
                    node = node_map[wires[j].id];
                    modifiedNodes[node.id] = node;
                    if (!node._originalWires) {
                        node._originalWires = clone(node.wires);
                    }
                    node.wires[wires[j].port] = node.wires[wires[j].port].concat(sfn.wires[i]);
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
            nodes.push(createNode(type,node));
        } else {
            var subflowId = m[1];
            nodes = nodes.concat(createSubflow(subflows[subflowId],node,subflows));
        }
    }
    
    subflowNode.instanceNodes = {};
    
    nodes.forEach(function(node) {
       subflowNode.instanceNodes[node.id] = node;   
    });
    
    return nodes;
}


function diffNodeConfigs(oldNode,newNode) {
    if (oldNode == null) {
        return true;
    } else {
        for (var p in newNode) {
            if (newNode.hasOwnProperty(p) && p != "x" && p != "y" && p != "wires") {
                if (!redUtil.compareObjects(oldNode[p],newNode[p])) {
                    return true;
                }
            }
        }
    }
    return false;
}


var subflowInstanceRE = /^subflow:(.+)$/;

function Flow(config) {
    
    this.activeNodes = {};
    this.subflowInstanceNodes = {};
    this.started = false;

    this.parseConfig(config);
    
}

Flow.prototype.parseConfig = function(config) {
    var i;
    var nodeConfig;
    var nodeType;
    
    this.config = config;
    
    this.allNodes = {};
    
    this.nodes = {};
    this.subflows = {};
    
    this.configNodes = {};
    
    var unknownTypes = {};
    
    for (i=0;i<this.config.length;i++) {
        nodeConfig = this.config[i];
        nodeType = nodeConfig.type;
        this.allNodes[nodeConfig.id] = nodeConfig;
        if (nodeType == "subflow") {
            this.subflows[nodeConfig.id] = {
                type: "subflow",
                config: nodeConfig,
                nodes: []
            }
        }
        
    }
    //console.log("Known subflows:",Object.keys(this.subflows));
    for (i=0;i<this.config.length;i++) {
        nodeConfig = this.config[i];
        
        
        nodeType = nodeConfig.type;
        
        if (nodeConfig.credentials) {
            delete nodeConfig.credentials;
        }
        
        if (nodeType != "tab" && nodeType != "subflow") {
            var m = subflowInstanceRE.exec(nodeType);
            if ((m && !this.subflows[m[1]]) || (!m && !typeRegistry.get(nodeType))) {
                // This is an unknown subflow or an unknown type
                unknownTypes[nodeType] = true;
            } else {
                var nodeInfo = {
                    type: nodeType,
                    config:nodeConfig
                }
                if (m) {
                    nodeInfo.subflow = m[1];
                }
                if (this.subflows[nodeConfig.z]) {
                    this.subflows[nodeConfig.z].nodes.push(nodeInfo);
                } else {
                    this.nodes[nodeConfig.id] = nodeInfo;
                }
                for (var prop in nodeConfig) {
                    if (nodeConfig.hasOwnProperty(prop) &&
                        prop != "id" && 
                        prop != "z" && 
                        prop != "wires" &&
                        this.allNodes[nodeConfig[prop]]) {
                            this.configNodes[nodeConfig[prop]] = this.allNodes[nodeConfig[prop]];
                    }
                }
            }
        }
    }
    
    //console.log("NODES");
    //for (i in this.nodes) {
    //    if (this.nodes.hasOwnProperty(i)) {
    //        console.log(" ",i,this.nodes[i].type,this.nodes[i].config.name||"");
    //    }
    //}
    //console.log("SUBFLOWS");
    //for (i in this.subflows) {
    //    if (this.subflows.hasOwnProperty(i)) {
    //        console.log(" ",i,this.subflows[i].type,this.subflows[i].config.name||"");
    //        for (var j=0;j<this.subflows[i].nodes.length;j++) {
    //            console.log("     ",this.subflows[i].nodes[j].config.id,this.subflows[i].nodes[j].type,this.subflows[i].nodes[j].config.name||"");
    //        }
    //    }
    //}
    
    this.missingTypes = Object.keys(unknownTypes);    
}

Flow.prototype.start = function() {
    this.started = true;
    if (this.missingTypes.length > 0) {
        throw new Error("missing types");
    }
    events.emit("nodes-starting");
    
    var id;
    var node;
    
    for (id in this.configNodes) {
        if (this.configNodes.hasOwnProperty(id)) {
            node = this.configNodes[id];
            if (!this.activeNodes[id]) {
                this.activeNodes[id] = createNode(node.type,node);
            }
        }
    }
    
    for (id in this.nodes) {
        if (this.nodes.hasOwnProperty(id)) {
            node = this.nodes[id];
            if (!node.subflow) {
                if (!this.activeNodes[id]) {
                    this.activeNodes[id] = createNode(node.type,node.config);
                    //console.log(id,"created");
                } else {
                    //console.log(id,"already running");
                }
            } else {
                if (!this.subflowInstanceNodes[id]) {
                    var nodes = createSubflow(this.subflows[node.subflow],node.config,this.subflows);
                    this.subflowInstanceNodes[id] = nodes.map(function(n) { return n.id});
                    for (var i=0;i<nodes.length;i++) {
                        this.activeNodes[nodes[i].id] = nodes[i];
                    }
                    //console.log(id,"(sf) created");
                } else {
                    //console.log(id,"(sf) already running");
                }
            }
        }
    }
    credentials.clean(this.config);
    events.emit("nodes-started");
}

Flow.prototype.stop = function(nodeList) {
    nodeList = nodeList || Object.keys(this.activeNodes);
    var flow = this;
    return when.promise(function(resolve) {
        events.emit("nodes-stopping");
        var promises = [];
        for (var i=0;i<nodeList.length;i++) {
            var node = flow.activeNodes[nodeList[i]];
            if (node) {
                try {
                    var p = node.close();
                    if (p) {
                        promises.push(p);
                    }
                } catch(err) {
                    node.error(err);
                }
                delete flow.subflowInstanceNodes[nodeList[i]];
                delete flow.activeNodes[nodeList[i]];
            }
        }
        when.settle(promises).then(function() {
            events.emit("nodes-stopped");
            flow.started = false;
            resolve();
        });
    });
}

Flow.prototype.getMissingTypes = function() { 
    return this.missingTypes;
}

Flow.prototype.typeRegistered = function(type) {
    if (this.missingTypes.length > 0) {
        var i = this.missingTypes.indexOf(type);
        if (i != -1) {
            this.missingTypes.splice(i,1);
            if (this.missingTypes.length === 0 && this.started) {
                this.start();
            }
        }
    }
    
}

Flow.prototype.getNode = function(id) {
    return this.activeNodes[id];
}

Flow.prototype.getFlow = function() {
    //console.log(this.config);
    return this.config;
}

Flow.prototype.eachNode = function(callback) {
    for (var id in this.activeNodes) {
        if (this.activeNodes.hasOwnProperty(id)) {
            callback(this.activeNodes[id]);
        }
    }
}

Flow.prototype.applyConfig = function(config,type) {
    
    var activeNodesToStop = [];
    var nodesToRewire = [];
    
    if (type && type!="full") {
        var diff = this.diffFlow(config);
        //console.log(diff);
        //var diff = {
        //    deleted:[]
        //    changed:[]
        //    linked:[]
        //    wiringChanged: []
        //}
        
        var nodesToStop = [];
        var nodesToCreate = [];
        nodesToRewire = diff.wiringChanged;
        
        if (type == "nodes") {
            nodesToStop = diff.deleted.concat(diff.changed);
            nodesToCreate = diff.changed;
        } else if (type == "flows") {
            nodesToStop = diff.deleted.concat(diff.changed).concat(diff.linked);
            nodesToCreate = diff.changed.concat(diff.linked);
        }
        
        for (var i=0;i<nodesToStop.length;i++) {
            var id = nodesToStop[i];
            if (this.subflowInstanceNodes[id]) {
                activeNodesToStop = activeNodesToStop.concat(this.subflowInstanceNodes[id]);
            } else if (this.activeNodes[id]) {
                activeNodesToStop.push(id);
            }
        }
    } else {
        activeNodesToStop = Object.keys(this.activeNodes);
    }
        
    var flow = this;
    if (type != "full") {
        log.info("Stopping modified "+type);
    }
    return this.stop(activeNodesToStop).then(function() {
        if (type != "full") {
            log.info("Stopped modified "+type);
        }
        flow.parseConfig(config);
        for (var i=0;i<nodesToRewire.length;i++) {
            var node = flow.activeNodes[nodesToRewire[i]];
            if (node) {
                node.updateWires(flow.allNodes[node.id].wires);
            }
        }
        if (type != "full") {
            log.info("Starting modified "+type);
        }
        flow.start();
        if (type != "full") {
            log.info("Started modified "+type);
        }
    })
}

Flow.prototype.diffFlow = function(config) {
    var flow = this;
    var flowNodes = {};
    var changedNodes = {};
    var deletedNodes = {};
    var linkChangedNodes = {};
    
    var activeLinks = {};
    var newLinks = {};
    
    var changedSubflowStack = [];
    var changedSubflows = {};
    
    var buildNodeLinks = function(nodeLinks,n,nodes) {
        nodeLinks[n.id] = nodeLinks[n.id] || [];
        if (n.wires) {
            for (var j=0;j<n.wires.length;j++) {
                var wires = n.wires[j];
                for (var k=0;k<wires.length;k++) {
                    nodeLinks[n.id].push(wires[k]);
                    var nn = nodes[wires[k]];
                    if (nn) {
                        nodeLinks[nn.id] = nodeLinks[nn.id] || [];
                        nodeLinks[nn.id].push(n.id);
                    }
                }
            }
        }
    }
    
    config.forEach(function(node) {
        flowNodes[node.id] = node;
    });
    
    config.forEach(function(node) {
        var changed = false;
        if (node.credentials) {
            changed = true;
            delete node.credentials;
        } else {
            changed = diffNodeConfigs(flow.allNodes[node.id],node);
            if (!changed) {
                if (flowNodes[node.z] && flowNodes[node.z].type == "subflow") {
                    var originalNode = flow.allNodes[node.id];
                    if (originalNode && !redUtil.compareObjects(originalNode.wires,node.wires)) {
                        // This is a node in a subflow whose wiring has changed. Mark subflow as changed
                        changed = true;
                    }
                }
            }
        }
        if (changed) {
            changedNodes[node.id] = node;
        }
    });
    
    this.config.forEach(function(node) {
        if (!flowNodes[node.id] && node.type != "tab") {
            deletedNodes[node.id] = node;
        }
        buildNodeLinks(activeLinks,node,flow.allNodes);
    });
    
    this.config.forEach(function(node) {
        for (var prop in node) {
            if (node.hasOwnProperty(prop) && prop != "z" && prop != "id" && prop != "wires") {
                // This node has a property that references a changed node
                // Assume it is a config node change and mark this node as
                // changed.
                if (changedNodes[node[prop]]) {
                    changedNodes[node.id] = node;
                }
            }
        }
            
    });
    
    var checkSubflowMembership = function(nodes,id) {
        var node = nodes[id];
        if (node) {
            if (node.type == "subflow") {
                changedSubflows[id] = node;
                changedSubflowStack.push(id);
            } else if (nodes[node.z] && nodes[node.z].type == "subflow") {
                if (!changedSubflows[node.z]) {
                    changedSubflows[node.z] = nodes[node.z];
                    changedSubflowStack.push(node.z);
                }
            }
        }
    };
    
    Object.keys(changedNodes).forEach(function(n) { checkSubflowMembership(flowNodes,n)});
    Object.keys(deletedNodes).forEach(function(n) { checkSubflowMembership(flow.allNodes,n)});
    
    while (changedSubflowStack.length > 0) {
        var subflowId = changedSubflowStack.pop();
        
        config.forEach(function(node) {
            if (node.type == "subflow:"+subflowId) {
                if (!changedNodes[node.id]) {
                    changedNodes[node.id] = node;
                    checkSubflowMembership(flowNodes,node.id);
                }
            }
        });
        
    }
    
    config.forEach(function(node) {
        buildNodeLinks(newLinks,node,flowNodes);
    });
    
    var markLinkedNodes = function(linkChanged,otherChangedNodes,linkMap,allNodes) {
        var stack = Object.keys(changedNodes).concat(Object.keys(otherChangedNodes));
        var visited = {};
        
        while(stack.length > 0) {
            var id = stack.pop();
            var linkedNodes = linkMap[id];
            if (linkedNodes) {
                for (var i=0;i<linkedNodes.length;i++) {
                    var linkedNodeId = linkedNodes[i];
                    if (changedNodes[linkedNodeId] || deletedNodes[linkedNodeId] || otherChangedNodes[linkedNodeId] || linkChanged[linkedNodeId]) {
                        // Do nothing - this linked node is already marked as changed, so will get done
                    } else {
                        linkChanged[linkedNodeId] = true;
                        stack.push(linkedNodeId);
                    }
                }
            }
        }
    }
    markLinkedNodes(linkChangedNodes,{},newLinks,flowNodes);
    markLinkedNodes(linkChangedNodes,{},activeLinks,flow.allNodes);
    
    var modifiedLinkNodes = {};

    config.forEach(function(node) {
        if (!changedNodes[node.id]) {
            // only concerned about unchanged nodes whose wiring may have changed
            var newNodeLinks = newLinks[node.id];
            var oldNodeLinks = activeLinks[node.id];
            
            var newLinkMap = {};
            newNodeLinks.forEach(function(l) { newLinkMap[l] = (newLinkMap[l]||0)+1;});
            
            var oldLinkMap = {};
            oldNodeLinks.forEach(function(l) { oldLinkMap[l] = (oldLinkMap[l]||0)+1;});
            
            newNodeLinks.forEach(function(link) {
                if (newLinkMap[link] != oldLinkMap[link]) {
                    modifiedLinkNodes[node.id] = node;
                    linkChangedNodes[node.id] = node;
                    if (!changedNodes[link] && !deletedNodes[link]) {
                        modifiedLinkNodes[link] = flowNodes[link];
                        linkChangedNodes[link] = flowNodes[link];
                    }
                }
            });
            oldNodeLinks.forEach(function(link) {
                if (newLinkMap[link] != oldLinkMap[link]) {
                    modifiedLinkNodes[node.id] = node;
                    linkChangedNodes[node.id] = node;
                    if (!changedNodes[link] && !deletedNodes[link]) {
                        modifiedLinkNodes[link] = flowNodes[link];
                        linkChangedNodes[link] = flowNodes[link];
                    }
                }
            });
        }
    });

    markLinkedNodes(linkChangedNodes,modifiedLinkNodes,newLinks,flowNodes);
    
    //config.forEach(function(n) {
    //    console.log((changedNodes[n.id]!=null)?"[C]":"[ ]",(linkChangedNodes[n.id]!=null)?"[L]":"[ ]","[ ]",n.id,n.type,n.name);
    //});
    
    //Object.keys(deletedNodes).forEach(function(id) {
    //    var n = flow.allNodes[id];
    //    console.log("[ ] [ ] [D]",n.id,n.type);
    //});
    
    var diff = {
        deleted: Object.keys(deletedNodes).filter(function(id) { return deletedNodes[id].type != "subflow" && (!deletedNodes[id].z || flowNodes[deletedNodes[id].z].type != "subflow")}),
        changed: Object.keys(changedNodes).filter(function(id) { return changedNodes[id].type != "subflow" && (!changedNodes[id].z || flowNodes[changedNodes[id].z].type != "subflow")}),
        linked: Object.keys(linkChangedNodes).filter(function(id) { return linkChangedNodes[id].type != "subflow" && (!linkChangedNodes[id].z || flowNodes[linkChangedNodes[id].z].type != "subflow")}),
        wiringChanged: []
    }
    
    config.forEach(function(n) {
        if (!flowNodes[n.z] || flowNodes[n.z].type != "subflow") {
            var originalNode = flow.allNodes[n.id];
            if (originalNode && !redUtil.compareObjects(originalNode.wires,n.wires)) {
                diff.wiringChanged.push(n.id);
            }
        }
    });
    
    return diff;
    
}

module.exports = Flow;
