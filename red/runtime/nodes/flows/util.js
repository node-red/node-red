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
var clone = require("clone");
var redUtil = require("../../util");
var subflowInstanceRE = /^subflow:(.+)$/;
var typeRegistry = require("../registry");

function diffNodes(oldNode,newNode) {
    if (oldNode == null) {
        return true;
    }
    var oldKeys = Object.keys(oldNode).filter(function(p) { return p != "x" && p != "y" && p != "wires" });
    var newKeys = Object.keys(newNode).filter(function(p) { return p != "x" && p != "y" && p != "wires" });
    if (oldKeys.length != newKeys.length) {
        return true;
    }
    for (var i=0;i<newKeys.length;i++) {
        var p = newKeys[i];
        if (!redUtil.compareObjects(oldNode[p],newNode[p])) {
            return true;
        }
    }

    return false;
}

module.exports = {

    diffNodes: diffNodes,

    parseConfig: function(config) {
        var flow = {};
        flow.allNodes = {};
        flow.subflows = {};
        flow.configs = {};
        flow.flows = {};
        flow.missingTypes = [];

        config.forEach(function(n) {
            flow.allNodes[n.id] = clone(n);
            if (n.type === 'tab') {
                flow.flows[n.id] = n;
                flow.flows[n.id].subflows = {};
                flow.flows[n.id].configs = {};
                flow.flows[n.id].nodes = {};
            }
        });

        config.forEach(function(n) {
            if (n.type === 'subflow') {
                flow.subflows[n.id] = n;
                flow.subflows[n.id].configs = {};
                flow.subflows[n.id].nodes = {};
                flow.subflows[n.id].instances = [];
            }
        });

        config.forEach(function(n) {
            if (n.type !== 'subflow' && n.type !== 'tab') {
                var subflowDetails = subflowInstanceRE.exec(n.type);

                if ( (subflowDetails && !flow.subflows[subflowDetails[1]]) || (!subflowDetails && !typeRegistry.get(n.type)) ) {
                    if (flow.missingTypes.indexOf(n.type) === -1) {
                        flow.missingTypes.push(n.type);
                    }
                }
                var container = null;
                if (flow.flows[n.z]) {
                    container = flow.flows[n.z];
                } else if (flow.subflows[n.z]) {
                    container = flow.subflows[n.z];
                }
                if (n.hasOwnProperty('x') && n.hasOwnProperty('y')) {
                    if (subflowDetails) {
                        var subflowType = subflowDetails[1]
                        n.subflow = subflowType;
                        flow.subflows[subflowType].instances.push(n)
                    }
                    if (container) {
                        container.nodes[n.id] = n;
                    }
                } else {
                    if (container) {
                        container.configs[n.id] = n;
                    } else {
                        flow.configs[n.id] = n;
                        flow.configs[n.id]._users = [];
                    }
                }
            }
        });
        config.forEach(function(n) {
            if (n.type !== 'subflow' && n.type !== 'tab') {
                for (var prop in n) {
                    if (n.hasOwnProperty(prop) && prop !== 'id' && prop !== 'wires' && prop !== '_users' && flow.configs[n[prop]]) {
                        // This property references a global config node
                        flow.configs[n[prop]]._users.push(n.id)
                    }
                }
            }
        });

        return flow;
    },

    diffConfigs: function(oldConfig, newConfig) {
        var id;
        var node;
        var nn;
        var wires;
        var j,k;

        var changedSubflows = {};

        var added = {};
        var removed = {};
        var changed = {};
        var wiringChanged = {};

        var linkMap = {};

        for (id in oldConfig.allNodes) {
            if (oldConfig.allNodes.hasOwnProperty(id)) {
                node = oldConfig.allNodes[id];
                // build the map of what this node was previously wired to
                if (node.wires) {
                    linkMap[node.id] = linkMap[node.id] || [];
                    for (j=0;j<node.wires.length;j++) {
                        wires = node.wires[j];
                        for (k=0;k<wires.length;k++) {
                            linkMap[node.id].push(wires[k]);
                            nn = oldConfig.allNodes[wires[k]];
                            if (nn) {
                                linkMap[nn.id] = linkMap[nn.id] || [];
                                linkMap[nn.id].push(node.id);
                            }
                        }
                    }
                }
                // This node has been removed
                if (!newConfig.allNodes.hasOwnProperty(id)) {
                    removed[id] = node;
                    // Mark the container as changed
                    if (newConfig.allNodes[removed[id].z]) {
                        changed[removed[id].z] = newConfig.allNodes[removed[id].z];
                        if (changed[removed[id].z].type === "subflow") {
                            changedSubflows[removed[id].z] = changed[removed[id].z];
                            //delete removed[id];
                        }
                    }
                } else {
                    // This node has a material configuration change
                    if (diffNodes(node,newConfig.allNodes[id]) || newConfig.allNodes[id].credentials) {
                        changed[id] = newConfig.allNodes[id];
                        if (changed[id].type === "subflow") {
                            changedSubflows[id] = changed[id];
                        }
                        // Mark the container as changed
                        if (newConfig.allNodes[changed[id].z]) {
                            changed[changed[id].z] = newConfig.allNodes[changed[id].z];
                            if (changed[changed[id].z].type === "subflow") {
                                changedSubflows[changed[id].z] = changed[changed[id].z];
                                delete changed[id];
                            }
                        }
                    }
                    // This node's wiring has changed
                    if (!redUtil.compareObjects(node.wires,newConfig.allNodes[id].wires)) {
                        wiringChanged[id] = newConfig.allNodes[id];
                        // Mark the container as changed
                        if (newConfig.allNodes[wiringChanged[id].z]) {
                            changed[wiringChanged[id].z] = newConfig.allNodes[wiringChanged[id].z];
                            if (changed[wiringChanged[id].z].type === "subflow") {
                                changedSubflows[wiringChanged[id].z] = changed[wiringChanged[id].z];
                                delete wiringChanged[id];
                            }
                        }
                    }
                }
            }
        }
        // Look for added nodes
        for (id in newConfig.allNodes) {
            if (newConfig.allNodes.hasOwnProperty(id)) {
                node = newConfig.allNodes[id];
                // build the map of what this node is now wired to
                if (node.wires) {
                    linkMap[node.id] = linkMap[node.id] || [];
                    for (j=0;j<node.wires.length;j++) {
                        wires = node.wires[j];
                        for (k=0;k<wires.length;k++) {
                            if (linkMap[node.id].indexOf(wires[k]) === -1) {
                                linkMap[node.id].push(wires[k]);
                            }
                            nn = newConfig.allNodes[wires[k]];
                            if (nn) {
                                linkMap[nn.id] = linkMap[nn.id] || [];
                                if (linkMap[nn.id].indexOf(node.id) === -1) {
                                    linkMap[nn.id].push(node.id);
                                }
                            }
                        }
                    }
                }
                // This node has been added
                if (!oldConfig.allNodes.hasOwnProperty(id)) {
                    added[id] = node;
                    // Mark the container as changed
                    if (newConfig.allNodes[added[id].z]) {
                        changed[added[id].z] = newConfig.allNodes[added[id].z];
                        if (changed[added[id].z].type === "subflow") {
                            changedSubflows[added[id].z] = changed[added[id].z];
                            delete added[id];
                        }
                    }
                }
            }
        }

        for (id in newConfig.allNodes) {
            if (newConfig.allNodes.hasOwnProperty(id)) {
                node = newConfig.allNodes[id];
                for (var prop in node) {
                    if (node.hasOwnProperty(prop) && prop != "z" && prop != "id" && prop != "wires") {
                        // This node has a property that references a changed/removed node
                        // Assume it is a config node change and mark this node as
                        // changed.
                        if (changed[node[prop]] || removed[node[prop]]) {
                            if (!changed[node.id]) {
                                changed[node.id] = node;
                                if (newConfig.allNodes[node.z]) {
                                    changed[node.z] = newConfig.allNodes[node.z];
                                    if (changed[node.z].type === "subflow") {
                                        changedSubflows[node.z] = changed[node.z];
                                        delete changed[node.id];
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }


        // Recursively mark all instances of changed subflows as changed
        var changedSubflowStack = Object.keys(changedSubflows);
        while(changedSubflowStack.length > 0) {
            var subflowId = changedSubflowStack.pop();
            for (id in newConfig.allNodes) {
                if (newConfig.allNodes.hasOwnProperty(id)) {
                    node = newConfig.allNodes[id];
                    if (node.type === 'subflow:'+subflowId) {
                        if (!changed[node.id]) {
                            changed[node.id] = node;
                            if (!changed[changed[node.id].z] && newConfig.allNodes[changed[node.id].z]) {
                                changed[changed[node.id].z] = newConfig.allNodes[changed[node.id].z];
                                if (newConfig.allNodes[changed[node.id].z].type === "subflow") {
                                    // This subflow instance is inside a subflow. Add the
                                    // containing subflow to the stack to mark
                                    changedSubflowStack.push(changed[node.id].z);
                                    delete changed[node.id];
                                }
                            }
                        }
                    }
                }
            }
        }

        var diff = {
            added:Object.keys(added),
            changed:Object.keys(changed),
            removed:Object.keys(removed),
            rewired:Object.keys(wiringChanged),
            linked:[]
        }

        // Traverse the links of all modified nodes to mark the connected nodes
        var modifiedNodes = diff.added.concat(diff.changed).concat(diff.removed).concat(diff.rewired);
        var visited = {};
        while(modifiedNodes.length > 0) {
            node = modifiedNodes.pop();
            if (!visited[node]) {
                visited[node] = true;
                if (linkMap[node]) {
                    if (!changed[node] && !added[node] && !removed[node] && !wiringChanged[node]) {
                        diff.linked.push(node);
                    }
                    modifiedNodes = modifiedNodes.concat(linkMap[node]);
                }
            }
        }
        // for (id in newConfig.allNodes) {
        //     console.log(
        //         (added[id]?"+":(changed[id]?"!":" "))+(wiringChanged[id]?"w":" ")+(diff.linked.indexOf(id)!==-1?"~":" "),
        //         id,
        //         newConfig.allNodes[id].type,
        //         newConfig.allNodes[id].name||newConfig.allNodes[id].label||""
        //     );
        // }
        // for (id in removed) {
        //     console.log(
        //         "- "+(diff.linked.indexOf(id)!==-1?"~":" "),
        //         id,
        //         oldConfig.allNodes[id].type,
        //         oldConfig.allNodes[id].name||oldConfig.allNodes[id].label||""
        //     );
        // }

        return diff;
    }
}
