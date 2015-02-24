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
RED.nodes = (function() {

    var node_defs = {};
    var nodes = [];
    var configNodes = {};
    var links = [];
    var defaultWorkspace;
    var workspaces = {};
    var subflows = {};
    
    var registry = (function() {
        var nodeList = [];
        var nodeSets = {};
        var typeToId = {};
        var nodeDefinitions = {};
        
        var exports = {
            getNodeList: function() {
                return nodeList;
            },
            setNodeList: function(list) {
                nodeList = [];
                for(var i=0;i<list.length;i++) {
                    var ns = list[i];
                    exports.addNodeSet(ns);
                }
            },
            addNodeSet: function(ns) {
                ns.added = false;
                nodeSets[ns.id] = ns;
                for (var j=0;j<ns.types.length;j++) {
                    typeToId[ns.types[j]] = ns.id;
                }
                nodeList.push(ns);
            },
            removeNodeSet: function(id) {
                var ns = nodeSets[id];
                for (var j=0;j<ns.types.length;j++) {
                    if (ns.added) {
                        // TODO: too tightly coupled into palette UI
                        RED.palette.remove(ns.types[j]);
                        var def = nodeDefinitions[ns.types[j]];
                        if (def.onpaletteremove && typeof def.onpaletteremove === "function") {
                            def.onpaletteremove.call(def);
                        }
                    }
                    delete typeToId[ns.types[j]];
                }
                delete nodeSets[id];
                for (var i=0;i<nodeList.length;i++) {
                    if (nodeList[i].id == id) {
                        nodeList.splice(i,1);
                        break;
                    }
                }
                return ns;
            },
            getNodeSet: function(id) {
                return nodeSets[id];
            },
            enableNodeSet: function(id) {
                var ns = nodeSets[id];
                ns.enabled = true;
                for (var j=0;j<ns.types.length;j++) {
                    // TODO: too tightly coupled into palette UI
                    RED.palette.show(ns.types[j]);
                    var def = nodeDefinitions[ns.types[j]];
                    if (def.onpaletteadd && typeof def.onpaletteadd === "function") {
                        def.onpaletteadd.call(def);
                    }
                }
            },
            disableNodeSet: function(id) {
                var ns = nodeSets[id];
                ns.enabled = false;
                for (var j=0;j<ns.types.length;j++) {
                    // TODO: too tightly coupled into palette UI
                    RED.palette.hide(ns.types[j]);
                    var def = nodeDefinitions[ns.types[j]];
                    if (def.onpaletteremove && typeof def.onpaletteremove === "function") {
                        def.onpaletteremove.call(def);
                    }
                }
            },
            registerNodeType: function(nt,def) {
                nodeDefinitions[nt] = def;
                if (def.category != "subflows") {
                    nodeSets[typeToId[nt]].added = true;
                    // TODO: too tightly coupled into palette UI
                }
                RED.palette.add(nt,def);
                if (def.onpaletteadd && typeof def.onpaletteadd === "function") {
                    def.onpaletteadd.call(def);
                }
            },
            removeNodeType: function(nt) {
                if (nt.substring(0,8) != "subflow:") {
                    throw new Error("this api is subflow only. called with:",nt);
                }
                delete nodeDefinitions[nt];
                RED.palette.remove(nt);
            },
            getNodeType: function(nt) {
                return nodeDefinitions[nt];
            }
        };
        return exports;
    })();
    
    function getID() {
        return (1+Math.random()*4294967295).toString(16);
    }

    function addNode(n) {
        if (n._def.category == "config") {
            configNodes[n.id] = n;
            RED.sidebar.config.refresh();
        } else {
            n.dirty = true;
            var updatedConfigNode = false;
            for (var d in n._def.defaults) {
                if (n._def.defaults.hasOwnProperty(d)) {
                    var property = n._def.defaults[d];
                    if (property.type) {
                        var type = registry.getNodeType(property.type);
                        if (type && type.category == "config") {
                            var configNode = configNodes[n[d]];
                            if (configNode) {
                                updatedConfigNode = true;
                                configNode.users.push(n);
                            }
                        }
                    }
                }
            }
            if (updatedConfigNode) {
                RED.sidebar.config.refresh();
            }
            if (n._def.category == "subflows" && typeof n.i === "undefined") {
                var nextId = 0;
                RED.nodes.eachNode(function(node) {
                    nextId = Math.max(nextId,node.i||0);
                });
                n.i = nextId+1;
            }
            nodes.push(n);
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
                removedLinks.forEach(function(l) {links.splice(links.indexOf(l), 1); });
                var updatedConfigNode = false;
                for (var d in node._def.defaults) {
                    if (node._def.defaults.hasOwnProperty(d)) {
                        var property = node._def.defaults[d];
                        if (property.type) {
                            var type = registry.getNodeType(property.type);
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
                }
                if (updatedConfigNode) {
                    RED.sidebar.config.refresh();
                }
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
        for (var n=0;n<nodes.length;n++) {
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
        var n;
        for (n=0;n<nodes.length;n++) {
            var node = nodes[n];
            if (node.z == id) {
                removedNodes.push(node);
            }
        }
        for (n=0;n<removedNodes.length;n++) {
            var rmlinks = removeNode(removedNodes[n].id);
            removedLinks = removedLinks.concat(rmlinks);
        }
        return {nodes:removedNodes,links:removedLinks};
    }

    function addSubflow(sf) {
        subflows[sf.id] = sf;
        RED.nodes.registerType("subflow:"+sf.id, {
            defaults:{name:{value:""}},
            icon:"subflow.png",
            category: "subflows",
            inputs: sf.in.length,
            outputs: sf.out.length,
            color: "#da9",
            label: function() { return this.name||RED.nodes.subflow(sf.id).name },
            labelStyle: function() { return this.name?"node_label_italic":""; },
            paletteLabel: function() { return RED.nodes.subflow(sf.id).name }
        });
        
        
    }
    function getSubflow(id) {
        return subflows[id];
    }
    function removeSubflow(sf) {
        delete subflows[sf.id];
        registry.removeNodeType("subflow:"+sf.id);
    }
    
    function subflowContains(sfid,nodeid) {
        for (var i=0;i<nodes.length;i++) {
            var node = nodes[i];
            if (node.z === sfid) {
                var m = /^subflow:(.+)$/.exec(node.type);
                if (m) {
                    if (m[1] === nodeid) {
                        return true;
                    } else {
                        var result = subflowContains(m[1],nodeid);
                        if (result) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }
    
    function getAllFlowNodes(node) {
        var visited = {};
        visited[node.id] = true;
        var nns = [node];
        var stack = [node];
        while(stack.length !== 0) {
            var n = stack.shift();
            var childLinks = links.filter(function(d) { return (d.source === n) || (d.target === n);});
            for (var i=0;i<childLinks.length;i++) {
                var child = (childLinks[i].source === n)?childLinks[i].target:childLinks[i].source;
                var id = child.id;
                if (!id) {
                    id = child.direction+":"+child.i;
                }
                if (!visited[id]) {
                    visited[id] = true;
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
    function convertNode(n, exportCreds) {
        exportCreds = exportCreds || false;
        var node = {};
        node.id = n.id;
        node.type = n.type;
        if (node.type == "unknown") {
            for (var p in n._orig) {
                if (n._orig.hasOwnProperty(p)) {
                    node[p] = n._orig[p];
                }
            }
        } else {
            for (var d in n._def.defaults) {
                if (n._def.defaults.hasOwnProperty(d)) {
                    node[d] = n[d];
                }
            }
            if(exportCreds && n.credentials) {
                var credentialSet = {};
                node.credentials = {};
                for (var cred in n._def.credentials) {
                    if (n._def.credentials.hasOwnProperty(cred)) {
                        if (n._def.credentials[cred].type == 'password') {
                            if (n.credentials["has_"+cred] != n.credentials._["has_"+cred] ||
                                (n.credentials["has_"+cred] && n.credentials[cred])) {
                                credentialSet[cred] = n.credentials[cred];
                            }
                        } else if (n.credentials[cred] != null && n.credentials[cred] != n.credentials._[cred]) {
                            credentialSet[cred] = n.credentials[cred];
                        }
                    }
                }
                if (Object.keys(credentialSet).length > 0) {
                    node.credentials = credentialSet;
                }
            }
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
            for (var j=0;j<wires.length;j++) {
                var w = wires[j];
                if (w.target.type != "subflow") {
                    node.wires[w.sourcePort].push(w.target.id);
                }
            }
        }
        return node;
    }

    function convertSubflow(n) {
        var node = {};
        node.id = n.id;
        node.type = n.type;
        node.name = n.name;
        node.in = [];
        node.out = [];
        
        n.in.forEach(function(p) {
            var nIn = {x:p.x,y:p.y,wires:[]};
            var wires = links.filter(function(d) { return d.source === p });
            for (var i=0;i<wires.length;i++) {
                var w = wires[i];
                if (w.target.type != "subflow") {
                    nIn.wires.push({id:w.target.id})
                }
            }
            node.in.push(nIn);
        });
        n.out.forEach(function(p,c) {
            var nOut = {x:p.x,y:p.y,wires:[]};
            var wires = links.filter(function(d) { return d.target === p });
            for (i=0;i<wires.length;i++) {
                if (wires[i].source.type != "subflow") {
                    nOut.wires.push({id:wires[i].source.id,port:wires[i].sourcePort})
                } else {
                    nOut.wires.push({id:n.id,port:0})
                }
            }
            node.out.push(nOut);
        });
            
                
        return node;
    }
    /**
     * Converts the current node selection to an exportable JSON Object
     **/
    function createExportableNodeSet(set) {
        var nns = [];
        var exportedConfigNodes = {};
        var exportedSubflows = {};
        for (var n=0;n<set.length;n++) {
            var node = set[n].n;
            if (node.type.substring(0,8) == "subflow:") {
                var subflowId = node.type.substring(8);
                if (!exportedSubflows[subflowId]) {
                    exportedSubflows[subflowId] = true;
                    var subflow = getSubflow(subflowId);
                    var subflowSet = [{n:subflow}];
                    RED.nodes.eachNode(function(n) {
                        if (n.z == subflowId) {
                            subflowSet.push({n:n});
                        }
                    });
                    var exportableSubflow = createExportableNodeSet(subflowSet);
                    nns = exportableSubflow.concat(nns);
                }
            }
            if (node.type != "subflow") {
                var convertedNode = RED.nodes.convertNode(node);
                for (var d in node._def.defaults) {
                    if (node._def.defaults[d].type && node[d] in configNodes) {
                        var confNode = configNodes[node[d]];
                        var exportable = registry.getNodeType(node._def.defaults[d].type).exportable;
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
            } else {
                var convertedSubflow = convertSubflow(node);
                nns.push(convertedSubflow);
            }
        }
        return nns;
    }

    //TODO: rename this (createCompleteNodeSet)
    function createCompleteNodeSet() {
        var nns = [];
        var i;
        for (i in workspaces) {
            if (workspaces.hasOwnProperty(i)) {
                if (workspaces[i].type == "tab") {
                    nns.push(workspaces[i]);
                }
            }
        }
        for (i in subflows) {
            if (subflows.hasOwnProperty(i)) {
                nns.push(convertSubflow(subflows[i]));
            }
        }
        for (i in configNodes) {
            if (configNodes.hasOwnProperty(i)) {
                nns.push(convertNode(configNodes[i], true));
            }
        }
        for (i=0;i<nodes.length;i++) {
            var node = nodes[i];
            nns.push(convertNode(node, true));
        }
        return nns;
    }

    function importNodes(newNodesObj,createNewIds) {
        try {
            var i;
            var n;
            var newNodes;
            if (typeof newNodesObj === "string") {
                if (newNodesObj === "") {
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
            for (i=0;i<newNodes.length;i++) {
                n = newNodes[i];
                // TODO: remove workspace in next release+1
                if (n.type != "workspace" && 
                    n.type != "tab" && 
                    n.type != "subflow" &&
                    !registry.getNodeType(n.type) &&
                    n.type.substring(0,8) != "subflow:") {
                    // TODO: get this UI thing out of here! (see below as well)
                    
                    if (unknownTypes.indexOf(n.type)==-1) {
                        unknownTypes.push(n.type);
                    }
                    //if (n.x == null && n.y == null) {
                    //    // config node - remove it
                    //    newNodes.splice(i,1);
                    //    i--;
                    //}
                }
            }
            if (unknownTypes.length > 0) {
                var typeList = "<ul><li>"+unknownTypes.join("</li><li>")+"</li></ul>";
                var type = "type"+(unknownTypes.length > 1?"s":"");
                RED.notify("<strong>Imported unrecognised "+type+":</strong>"+typeList,"error",false,10000);
                //"DO NOT DEPLOY while in this state.<br/>Either, add missing types to Node-RED, restart and then reload page,<br/>or delete unknown "+n.name+", rewire as required, and then deploy.","error");
            }

            var activeWorkspace = RED.view.getWorkspace();
            var activeSubflow = getSubflow(activeWorkspace);
            if (activeSubflow) {
                for (i=0;i<newNodes.length;i++) {
                    var m = /^subflow:(.+)$/.exec(newNodes[i].type);
                    if (m) {
                        var subflowId = m[1];
                        var err;
                        if (subflowId === activeSubflow.id) {
                            err = new Error("Cannot add subflow to itself");
                        }
                        if (subflowContains(m[1],activeSubflow.id)) {
                            err = new Error("Cannot add subflow - circular reference detected");
                        }
                        if (err) {
                            // TODO: standardise error codes
                            err.code = "NODE_RED";
                            throw err;
                        }
                        
                    }
                }
            }
            
            var new_workspaces = [];
            var workspace_map = {};
            var new_subflows = [];
            var subflow_map = {};
            var nid;
            var def;
            for (i=0;i<newNodes.length;i++) {
                n = newNodes[i];
                // TODO: remove workspace in next release+1
                if (n.type === "workspace" || n.type === "tab") {
                    if (n.type === "workspace") {
                        n.type = "tab";
                    }
                    if (defaultWorkspace == null) {
                        defaultWorkspace = n;
                    }
                    if (createNewIds) {
                        nid = getID();
                        workspace_map[n.id] = nid;
                        n.id = nid;
                    }
                    addWorkspace(n);
                    RED.view.addWorkspace(n);
                    new_workspaces.push(n);
                } else if (n.type === "subflow") {
                    subflow_map[n.id] = n;
                    if (createNewIds) {
                        nid = getID();
                        n.id = nid;
                    }
                    // TODO: handle createNewIds - map old to new subflow ids
                    n.in.forEach(function(input,i) {
                        input.type = "subflow";
                        input.direction = "in";
                        input.z = n.id;
                        input.i = i;
                        input.id = getID();
                    });
                    n.out.forEach(function(output,i) {
                        output.type = "subflow";
                        output.direction = "out";
                        output.z = n.id;
                        output.i = i;
                        output.id = getID();
                    });
                    new_subflows.push(n);
                    addSubflow(n);
                } else {
                    def = registry.getNodeType(n.type);
                    if (def && def.category == "config") {
                        if (!RED.nodes.node(n.id)) {
                            var configNode = {id:n.id,type:n.type,users:[]};
                            for (var d in def.defaults) {
                                if (def.defaults.hasOwnProperty(d)) {
                                    configNode[d] = n[d];
                                }
                            }
                            configNode.label = def.label;
                            configNode._def = def;
                            RED.nodes.add(configNode);
                        }
                    }
                }
            }
            if (defaultWorkspace == null) {
                defaultWorkspace = { type:"tab", id:getID(), label:"Sheet 1" };
                addWorkspace(defaultWorkspace);
                RED.view.addWorkspace(defaultWorkspace);
                new_workspaces.push(defaultWorkspace);
                activeWorkspace = RED.view.getWorkspace();
            }

            var node_map = {};
            var new_nodes = [];
            var new_links = [];

            for (i=0;i<newNodes.length;i++) {
                n = newNodes[i];
                // TODO: remove workspace in next release+1
                if (n.type !== "workspace" && n.type !== "tab" && n.type !== "subflow") {
                    def = registry.getNodeType(n.type);
                    if (!def || def.category != "config") {
                        var node = {x:n.x,y:n.y,z:n.z,type:0,wires:n.wires,changed:false};
                        if (createNewIds) {
                            if (subflow_map[node.z]) {
                                node.z = subflow_map[node.z].id;
                            } else {
                                node.z = workspace_map[node.z];
                                if (!workspaces[node.z]) {
                                    node.z = activeWorkspace;
                                }
                            }
                            node.id = getID();
                        } else {
                            node.id = n.id;
                            if (node.z == null || (!workspaces[node.z] && !subflow_map[node.z])) {
                                node.z = activeWorkspace;
                            }
                        }
                        node.type = n.type;
                        node._def = def;
                        if (n.type.substring(0,7) === "subflow") {
                            var parentId = n.type.split(":")[1];
                            var subflow = subflow_map[parentId]||getSubflow(parentId);
                            if (createNewIds) {
                                parentId = subflow.id;
                                node.type = "subflow:"+parentId;
                                node._def = registry.getNodeType(node.type);
                                delete node.i;
                            }
                            node.name = n.name;
                            node.outputs = subflow.out.length;
                            node.inputs = subflow.in.length;
                        } else {
                            if (!node._def) {
                                if (node.x && node.y) {
                                    node._def = {
                                        color:"#fee",
                                        defaults: {},
                                        label: "unknown: "+n.type,
                                        labelStyle: "node_label_italic",
                                        outputs: n.outputs||n.wires.length
                                    }
                                } else {
                                    node._def = {
                                        category:"config"
                                    };
                                    node.users = [];
                                }
                                var orig = {};
                                for (var p in n) {
                                    if (n.hasOwnProperty(p) && p!="x" && p!="y" && p!="z" && p!="id" && p!="wires") {
                                        orig[p] = n[p];
                                    }
                                }
                                node._orig = orig;
                                node.name = n.type;
                                node.type = "unknown";
                            }
                            if (node._def.category != "config") {
                                node.inputs = n.inputs||node._def.inputs;
                                node.outputs = n.outputs||node._def.outputs;
                                for (var d2 in node._def.defaults) {
                                    if (node._def.defaults.hasOwnProperty(d2)) {
                                        node[d2] = n[d2];
                                    }
                                }
                            }
                        }
                        addNode(node);
                        RED.editor.validateNode(node);
                        node_map[n.id] = node;
                        if (node._def.category != "config") {
                            new_nodes.push(node);
                        }
                    }
                }
            }
            for (i=0;i<new_nodes.length;i++) {
                n = new_nodes[i];
                for (var w1=0;w1<n.wires.length;w1++) {
                    var wires = (n.wires[w1] instanceof Array)?n.wires[w1]:[n.wires[w1]];
                    for (var w2=0;w2<wires.length;w2++) {
                        if (wires[w2] in node_map) {
                            var link = {source:n,sourcePort:w1,target:node_map[wires[w2]]};
                            addLink(link);
                            new_links.push(link);
                        }
                    }
                }
                delete n.wires;
            }
            for (i=0;i<new_subflows.length;i++) {
                n = new_subflows[i];
                n.in.forEach(function(input) {
                    input.wires.forEach(function(wire) {
                        var link = {source:input, sourcePort:0, target:node_map[wire.id]};
                        addLink(link);
                        new_links.push(link);
                    });
                    delete input.wires;
                });
                n.out.forEach(function(output) {
                    output.wires.forEach(function(wire) {
                        var link;
                        if (wire.id == n.id) {
                            link = {source:n.in[wire.port], sourcePort:wire.port,target:output};
                        } else {
                            link = {source:node_map[wire.id], sourcePort:wire.port,target:output};
                        }
                        addLink(link);
                        new_links.push(link);
                    });
                    delete output.wires;
                });
            }
            return [new_nodes,new_links,new_workspaces,new_subflows];
        } catch(error) {
            if (error.code != "NODE_RED") {
                console.log(error.stack);
                RED.notify("<strong>Error</strong>: "+error,"error");
            } else {
                RED.notify("<strong>Error</strong>: "+error.message,"error");
            }
            return null;
        }

    }

    return {
        registry:registry,
        setNodeList: registry.setNodeList,
        
        getNodeSet: registry.getNodeSet,
        addNodeSet: registry.addNodeSet,
        removeNodeSet: registry.removeNodeSet,
        enableNodeSet: registry.enableNodeSet,
        disableNodeSet: registry.disableNodeSet,
        
        registerType: registry.registerNodeType,
        getType: registry.getNodeType,
        convertNode: convertNode,
        
        add: addNode,
        remove: removeNode,
        
        addLink: addLink,
        removeLink: removeLink,
        
        addWorkspace: addWorkspace,
        removeWorkspace: removeWorkspace,
        workspace: getWorkspace,
        
        addSubflow: addSubflow,
        removeSubflow: removeSubflow,
        subflow: getSubflow,
        subflowContains: subflowContains,
        
        eachNode: function(cb) {
            for (var n=0;n<nodes.length;n++) {
                cb(nodes[n]);
            }
        },
        eachLink: function(cb) {
            for (var l=0;l<links.length;l++) {
                cb(links[l]);
            }
        },
        eachConfig: function(cb) {
            for (var id in configNodes) {
                if (configNodes.hasOwnProperty(id)) {
                    cb(configNodes[id]);
                }
            }
        },
        eachSubflow: function(cb) {
            for (var id in subflows) {
                if (subflows.hasOwnProperty(id)) {
                    cb(subflows[id]);
                }
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
})();
