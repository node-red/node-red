/**
 * Copyright 2013 IBM Corp.
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
RED.nodes = function() {

    var node_defs = {};
    var nodes = [];
    var configNodes = {};
    var links = [];
    var defaultWorkspace;
    var workspaces = {};

    function registerType(nt,def) {
        node_defs[nt] = def;
        // TODO: too tightly coupled into palette UI
        RED.palette.add(nt,def);
    }

    function getID() {
        return (1+Math.random()*4294967295).toString(16);
    }

    function getType(type) {
        return node_defs[type];
    }

    function addNode(n) {
        if (n._def.category == "config") {
            configNodes[n.id] = n;
            RED.sidebar.config.refresh();
        } else {
            n.dirty = true;
            nodes.push(n);
            var updatedConfigNode = false;
            for (var d in n._def.defaults) {
                var property = n._def.defaults[d];
                if (property.type) {
                    var type = getType(property.type)
                    if (type && type.category == "config") {
                        var configNode = configNodes[n[d]];
                        if (configNode) {
                            updatedConfigNode = true;
                            configNode.users.push(n);
                        }
                    }
                }
            }
            if (updatedConfigNode) {
                RED.sidebar.config.refresh();
            }
        }
    }
    function addLink(l) {
        links.push(l);
    }
    function addConfig(c) {
        configNodes[c.id] = c;
    }

    function getNode(id) {
        if (id in configNodes) {
            return configNodes[id];
        } else {
            for (var n in nodes) {
                if (nodes[n].id == id) {
                    return nodes[n];
                }
            }
        }
        return null;
    }

    function removeNode(id) {
        var removedLinks = [];
        if (id in configNodes) {
            delete configNodes[id];
            RED.sidebar.config.refresh();
        } else {
            var node = getNode(id);
            if (node) {
                nodes.splice(nodes.indexOf(node),1);
                removedLinks = links.filter(function(l) { return (l.source === node) || (l.target === node); });
                removedLinks.map(function(l) {links.splice(links.indexOf(l), 1); });
            }
            var updatedConfigNode = false;
            for (var d in node._def.defaults) {
                var property = node._def.defaults[d];
                if (property.type) {
                    var type = getType(property.type)
                    if (type && type.category == "config") {
                        var configNode = configNodes[node[d]];
                        if (configNode) {
                            updatedConfigNode = true;
                            var users = configNode.users;
                            users.splice(users.indexOf(node),1);
                        }
                    }
                }
            }
            if (updatedConfigNode) {
                RED.sidebar.config.refresh();
            }
        }
        return removedLinks;
    }

    function removeLink(l) {
        var index = links.indexOf(l);
        if (index != -1) {
            links.splice(index,1);
        }
    }

    function refreshValidation() {
        for (var n in nodes) {
            RED.editor.validateNode(nodes[n]);
        }
    }

    function addWorkspace(ws) {
        workspaces[ws.id] = ws;
    }
    function getWorkspace(id) {
        return workspaces[id];
    }
    function removeWorkspace(id) {
        delete workspaces[id];
        var removedNodes = [];
        var removedLinks = [];
        for (var n in nodes) {
            var node = nodes[n];
            if (node.z == id) {
                removedNodes.push(node);
            }
        }
        for (var n in removedNodes) {
            var rmlinks = removeNode(removedNodes[n].id);
            removedLinks = removedLinks.concat(rmlinks);
        }
        return {nodes:removedNodes,links:removedLinks};
    }

    function getAllFlowNodes(node) {
        var visited = {};
        visited[node.id] = true;
        var nns = [node];
        var stack = [node];
        while(stack.length != 0) {
            var n = stack.shift();
            var childLinks = links.filter(function(d) { return (d.source === n) || (d.target === n);});
            for (var i in childLinks) {
                var child = (childLinks[i].source === n)?childLinks[i].target:childLinks[i].source;
                if (!visited[child.id]) {
                    visited[child.id] = true;
                    nns.push(child);
                    stack.push(child);
                }
            }
        }
        return nns;
    }

    /**
     * Converts a node to an exportable JSON Object
     **/
    function convertNode(n) {
        var node = {};
        node.id = n.id;
        node.type = n.type;
        for (var d in n._def.defaults) {
            node[d] = n[d];
        }
        if (n._def.category != "config") {
            node.x = n.x;
            node.y = n.y;
            node.z = n.z;
            node.wires = [];
            for(var i=0;i<n.outputs;i++) {
                node.wires.push([]);
            }
            var wires = links.filter(function(d){return d.source === n;});
            for (var i in wires) {
                var w = wires[i];
                node.wires[w.sourcePort].push(w.target.id);
            }
        }
        return node;
    }

    /**
     * Converts the current node selection to an exportable JSON Object
     **/
    function createExportableNodeSet(set) {
        var nns = [];
        var exportedConfigNodes = {};
        for (var n in set) {
            var node = set[n].n;
            var convertedNode = RED.nodes.convertNode(node);
            for (var d in node._def.defaults) {
                if (node._def.defaults[d].type && node[d] in configNodes) {
                    var confNode = configNodes[node[d]];
                    var exportable = getType(node._def.defaults[d].type).exportable;
                    if ((exportable == null || exportable)) {
                        if (!(node[d] in exportedConfigNodes)) {
                            exportedConfigNodes[node[d]] = true;
                            nns.unshift(RED.nodes.convertNode(confNode));
                        }
                    } else {
                        convertedNode[d] = "";
                    }
                }
            }

            nns.push(convertedNode);
        }
        return nns;
    }

    //TODO: rename this (createCompleteNodeSet)
    function createCompleteNodeSet() {
        var nns = [];
        for (var i in workspaces) {
            nns.push(workspaces[i]);
        }
        for (var i in configNodes) {
            nns.push(convertNode(configNodes[i]));
        }
        for (var i in nodes) {
            var node = nodes[i];
            nns.push(convertNode(node));
        }
        return nns;
    }

    function importNodes(newNodesObj,createNewIds) {
        try {
            var newNodes;
            if (typeof newNodesObj === "string") {
                if (newNodesObj == "") {
                    return;
                }
                newNodes = JSON.parse(newNodesObj);
            } else {
                newNodes = newNodesObj;
            }

            if (!$.isArray(newNodes)) {
                newNodes = [newNodes];
            }
            var unknownTypes = [];
            for (var i=0;i<newNodes.length;i++) {
                var n = newNodes[i];
                // TODO: remove workspace in next release+1
                if (n.type != "workspace" && n.type != "tab" && !getType(n.type)) {
                    // TODO: get this UI thing out of here! (see below as well)
                    n.name = n.type;
                    n.type = "unknown";
                    if (unknownTypes.indexOf(n.name)==-1) {
                        unknownTypes.push(n.name);
                    }
                    if (n.x == null && n.y == null) {
                        // config node - remove it
                        newNodes.splice(i,1);
                        i--;
                    }
                }
            }
            if (unknownTypes.length > 0) {
                var typeList = "<ul><li>"+unknownTypes.join("</li><li>")+"</li></ul>";
                var type = "type"+(unknownTypes.length > 1?"s":"");
                RED.notify("<strong>Imported unrecognised "+type+":</strong>"+typeList,"error",false,10000);
                //"DO NOT DEPLOY while in this state.<br/>Either, add missing types to Node-RED, restart and then reload page,<br/>or delete unknown "+n.name+", rewire as required, and then deploy.","error");
            }

            for (var i in newNodes) {
                var n = newNodes[i];
                // TODO: remove workspace in next release+1
                if (n.type === "workspace" || n.type === "tab") {
                    if (n.type === "workspace") {
                        n.type = "tab";
                    }
                    if (defaultWorkspace == null) {
                        defaultWorkspace = n;
                    }
                    addWorkspace(n);
                    RED.view.addWorkspace(n);
                }
            }
            if (defaultWorkspace == null) {
                defaultWorkspace = { type:"tab", id:getID(), label:"Sheet 1" };
                addWorkspace(defaultWorkspace);
                RED.view.addWorkspace(defaultWorkspace);
            }

            var node_map = {};
            var new_nodes = [];
            var new_links = [];

            for (var i in newNodes) {
                var n = newNodes[i];
                // TODO: remove workspace in next release+1
                if (n.type !== "workspace" && n.type !== "tab") {
                    var def = getType(n.type);
                    if (def && def.category == "config") {
                        if (!RED.nodes.node(n.id)) {
                            var configNode = {id:n.id,type:n.type,users:[]};
                            for (var d in def.defaults) {
                                configNode[d] = n[d];
                            }
                            configNode.label = def.label;
                            configNode._def = def;
                            RED.nodes.add(configNode);
                        }
                    } else {
                        var node = {x:n.x,y:n.y,z:n.z,type:0,wires:n.wires,changed:false};
                        if (createNewIds) {
                            node.z = RED.view.getWorkspace();
                            node.id = getID();
                        } else {
                            node.id = n.id;
                            if (node.z == null || !workspaces[node.z]) {
                                node.z = RED.view.getWorkspace();
                            }
                        }
                        node.type = n.type;
                        node._def = def;
                        if (!node._def) {
                            node._def = {
                                color:"#fee",
                                defaults: {},
                                label: "unknown: "+n.type,
                                labelStyle: "node_label_italic",
                                outputs: n.outputs||n.wires.length
                            }
                        }
                        node.outputs = n.outputs||node._def.outputs;

                        for (var d in node._def.defaults) {
                            node[d] = n[d];
                        }

                        addNode(node);
                        RED.editor.validateNode(node);
                        node_map[n.id] = node;
                        new_nodes.push(node);
                    }
                }
            }
            for (var i in new_nodes) {
                var n = new_nodes[i];
                for (var w1 in n.wires) {
                    var wires = (n.wires[w1] instanceof Array)?n.wires[w1]:[n.wires[w1]];
                    for (var w2 in wires) {
                        if (wires[w2] in node_map) {
                            var link = {source:n,sourcePort:w1,target:node_map[wires[w2]]};
                            addLink(link);
                            new_links.push(link);
                        }
                    }
                }
                delete n.wires;
            }
            return [new_nodes,new_links];
        } catch(error) {
            //TODO: get this UI thing out of here! (see above as well)
            RED.notify("<strong>Error</strong>: "+error,"error");
            return null;
        }

    }

    return {
        registerType: registerType,
        getType: getType,
        convertNode: convertNode,
        add: addNode,
        addLink: addLink,
        remove: removeNode,
        removeLink: removeLink,
        addWorkspace: addWorkspace,
        removeWorkspace: removeWorkspace,
        workspace: getWorkspace,
        eachNode: function(cb) {
            for (var n in nodes) {
                cb(nodes[n]);
            }
        },
        eachLink: function(cb) {
            for (var l in links) {
                cb(links[l]);
            }
        },
        eachConfig: function(cb) {
            for (var id in configNodes) {
                cb(configNodes[id]);
            }
        },
        node: getNode,
        import: importNodes,
        refreshValidation: refreshValidation,
        getAllFlowNodes: getAllFlowNodes,
        createExportableNodeSet: createExportableNodeSet,
        createCompleteNodeSet: createCompleteNodeSet,
        id: getID,
        nodes: nodes, // TODO: exposed for d3 vis
        links: links  // TODO: exposed for d3 vis
    };
}();
