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
RED.nodes = (function() {

    var node_defs = {};
    var nodes = [];
    var configNodes = {};
    var links = [];
    var defaultWorkspace;
    var workspaces = {};
    var workspacesOrder =[];
    var subflows = {};
    var loadedFlowVersion = null;

    var initialLoad;

    var dirty = false;

    function setDirty(d) {
        dirty = d;
        RED.events.emit("nodes:change",{dirty:dirty});
    }

    var registry = (function() {
        var moduleList = {};
        var nodeList = [];
        var nodeSets = {};
        var typeToId = {};
        var nodeDefinitions = {};

        var exports = {
            getModule: function(module) {
                return moduleList[module];
            },
            getNodeSetForType: function(nodeType) {
                return exports.getNodeSet(typeToId[nodeType]);
            },
            getModuleList: function() {
                return moduleList;
            },
            getNodeList: function() {
                return nodeList;
            },
            getNodeTypes: function() {
                return Object.keys(nodeDefinitions);
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

                moduleList[ns.module] = moduleList[ns.module] || {
                    name:ns.module,
                    version:ns.version,
                    local:ns.local,
                    sets:{}
                };
                moduleList[ns.module].sets[ns.name] = ns;
                RED.events.emit("registry:node-set-added",ns);
            },
            removeNodeSet: function(id) {
                var ns = nodeSets[id];
                for (var j=0;j<ns.types.length;j++) {
                    delete typeToId[ns.types[j]];
                }
                delete nodeSets[id];
                for (var i=0;i<nodeList.length;i++) {
                    if (nodeList[i].id === id) {
                        nodeList.splice(i,1);
                        break;
                    }
                }
                delete moduleList[ns.module].sets[ns.name];
                if (Object.keys(moduleList[ns.module].sets).length === 0) {
                    delete moduleList[ns.module];
                }
                RED.events.emit("registry:node-set-removed",ns);
                return ns;
            },
            getNodeSet: function(id) {
                return nodeSets[id];
            },
            enableNodeSet: function(id) {
                var ns = nodeSets[id];
                ns.enabled = true;
                RED.events.emit("registry:node-set-enabled",ns);
            },
            disableNodeSet: function(id) {
                var ns = nodeSets[id];
                ns.enabled = false;
                RED.events.emit("registry:node-set-disabled",ns);
            },
            registerNodeType: function(nt,def) {
                nodeDefinitions[nt] = def;
                if (def.category != "subflows") {
                    def.set = nodeSets[typeToId[nt]];
                    nodeSets[typeToId[nt]].added = true;
                    nodeSets[typeToId[nt]].enabled = true;

                    var ns;
                    if (def.set.module === "node-red") {
                        ns = "node-red";
                    } else {
                        ns = def.set.id;
                    }
                    def["_"] = function() {
                        var args = Array.prototype.slice.call(arguments, 0);
                        if (args[0].indexOf(":") === -1) {
                            args[0] = ns+":"+args[0];
                        }
                        return RED._.apply(null,args);
                    }

                    // TODO: too tightly coupled into palette UI
                }
                RED.events.emit("registry:node-type-added",nt);
            },
            removeNodeType: function(nt) {
                if (nt.substring(0,8) != "subflow:") {
                    // NON-NLS - internal debug message
                    throw new Error("this api is subflow only. called with:",nt);
                }
                delete nodeDefinitions[nt];
                RED.events.emit("registry:node-type-removed",nt);
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
        if (n.type.indexOf("subflow") !== 0) {
            n["_"] = n._def._;
        }
        if (n._def.category == "config") {
            configNodes[n.id] = n;
        } else {
            n.ports = [];
            if (n.wires && (n.wires.length > n.outputs)) { n.outputs = n.wires.length; }
            if (n.outputs) {
                for (var i=0;i<n.outputs;i++) {
                    n.ports.push(i);
                }
            }
            n.dirty = true;
            updateConfigNodeUsers(n);
            if (n._def.category == "subflows" && typeof n.i === "undefined") {
                var nextId = 0;
                RED.nodes.eachNode(function(node) {
                    nextId = Math.max(nextId,node.i||0);
                });
                n.i = nextId+1;
            }
            nodes.push(n);
        }
        RED.events.emit('nodes:add',n);
    }
    function addLink(l) {
        links.push(l);
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
        var removedNodes = [];
        var node;
        if (id in configNodes) {
            node = configNodes[id];
            delete configNodes[id];
            RED.events.emit('nodes:remove',node);
            RED.workspaces.refresh();
        } else {
            node = getNode(id);
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
                                    if (configNode._def.exclusive) {
                                        removeNode(node[d]);
                                        removedNodes.push(configNode);
                                    } else {
                                        var users = configNode.users;
                                        users.splice(users.indexOf(node),1);
                                    }
                                }
                            }
                        }
                    }
                }
                if (updatedConfigNode) {
                    RED.workspaces.refresh();
                }
                RED.events.emit('nodes:remove',node);
            }
        }
        if (node && node._def.onremove) {
            node._def.onremove.call(n);
        }
        return {links:removedLinks,nodes:removedNodes};
    }

    function removeLink(l) {
        var index = links.indexOf(l);
        if (index != -1) {
            links.splice(index,1);
        }
    }

    function addWorkspace(ws) {
        workspaces[ws.id] = ws;
        ws._def = {
            defaults: {
                label: {value:""}
            }
        };

        workspacesOrder.push(ws.id);
    }
    function getWorkspace(id) {
        return workspaces[id];
    }
    function removeWorkspace(id) {
        delete workspaces[id];
        workspacesOrder.splice(workspacesOrder.indexOf(id),1);

        var removedNodes = [];
        var removedLinks = [];
        var n;
        var node;
        for (n=0;n<nodes.length;n++) {
            node = nodes[n];
            if (node.z == id) {
                removedNodes.push(node);
            }
        }
        for(n in configNodes) {
            if (configNodes.hasOwnProperty(n)) {
                node = configNodes[n];
                if (node.z == id) {
                    removedNodes.push(node);
                }
            }
        }
        for (n=0;n<removedNodes.length;n++) {
            var result = removeNode(removedNodes[n].id);
            removedLinks = removedLinks.concat(result.links);
        }
        return {nodes:removedNodes,links:removedLinks};
    }

    function addSubflow(sf, createNewIds) {
        if (createNewIds) {
            var subflowNames = Object.keys(subflows).map(function(sfid) {
                return subflows[sfid].name;
            });

            subflowNames.sort();
            var copyNumber = 1;
            var subflowName = sf.name;
            subflowNames.forEach(function(name) {
                if (subflowName == name) {
                    copyNumber++;
                    subflowName = sf.name+" ("+copyNumber+")";
                }
            });
            sf.name = subflowName;
        }
        sf._def = {
            defaults:{},
            icon:"subflow.png",
            category: "subflows",
            color: "#da9",
            inputs: sf.in.length,
            outputs: sf.out.length
        }
        subflows[sf.id] = sf;
        RED.nodes.registerType("subflow:"+sf.id, {
            defaults:{name:{value:""}},
            info: sf.info,
            icon:"subflow.png",
            category: "subflows",
            inputs: sf.in.length,
            outputs: sf.out.length,
            color: "#da9",
            label: function() { return this.name||RED.nodes.subflow(sf.id).name },
            labelStyle: function() { return this.name?"node_label_italic":""; },
            paletteLabel: function() { return RED.nodes.subflow(sf.id).name },
            set:{
                module: "node-red"
            }
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

    function convertWorkspace(n) {
        var node = {};
        node.id = n.id;
        node.type = n.type;
        for (var d in n._def.defaults) {
            if (n._def.defaults.hasOwnProperty(d)) {
                node[d] = n[d];
            }
        }
        return node;
    }
    /**
     * Converts a node to an exportable JSON Object
     **/
    function convertNode(n, exportCreds) {
        if (n.type === 'tab') {
            return convertWorkspace(n);
        }
        exportCreds = exportCreds || false;
        var node = {};
        node.id = n.id;
        node.type = n.type;
        node.z = n.z;
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
                            if (!n.credentials._ ||
                                n.credentials["has_"+cred] != n.credentials._["has_"+cred] ||
                                (n.credentials["has_"+cred] && n.credentials[cred])) {
                                credentialSet[cred] = n.credentials[cred];
                            }
                        } else if (n.credentials[cred] != null && (!n.credentials._ || n.credentials[cred] != n.credentials._[cred])) {
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
        node.info = n.info;
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
            var node = set[n];
            if (node.type.substring(0,8) == "subflow:") {
                var subflowId = node.type.substring(8);
                if (!exportedSubflows[subflowId]) {
                    exportedSubflows[subflowId] = true;
                    var subflow = getSubflow(subflowId);
                    var subflowSet = [subflow];
                    RED.nodes.eachNode(function(n) {
                        if (n.z == subflowId) {
                            subflowSet.push(n);
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
                                set.push(confNode);
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
    function createCompleteNodeSet(exportCredentials) {
        if (exportCredentials === undefined) {
            exportCredentials = true;
        }
        var nns = [];
        var i;
        for (i=0;i<workspacesOrder.length;i++) {
            if (workspaces[workspacesOrder[i]].type == "tab") {
                nns.push(convertWorkspace(workspaces[workspacesOrder[i]]));
            }
        }
        for (i in subflows) {
            if (subflows.hasOwnProperty(i)) {
                nns.push(convertSubflow(subflows[i]));
            }
        }
        for (i in configNodes) {
            if (configNodes.hasOwnProperty(i)) {
                nns.push(convertNode(configNodes[i], exportCredentials));
            }
        }
        for (i=0;i<nodes.length;i++) {
            var node = nodes[i];
            nns.push(convertNode(node, exportCredentials));
        }
        return nns;
    }

    function checkForMatchingSubflow(subflow,subflowNodes) {
        var i;
        var match = null;
        try {
            RED.nodes.eachSubflow(function(sf) {
                if (sf.name != subflow.name ||
                    sf.info != subflow.info ||
                    sf.in.length != subflow.in.length ||
                    sf.out.length != subflow.out.length) {
                        return;
                }
                var sfNodes = RED.nodes.filterNodes({z:sf.id});
                if (sfNodes.length != subflowNodes.length) {
                    return;
                }

                var subflowNodeSet = [subflow].concat(subflowNodes);
                var sfNodeSet = [sf].concat(sfNodes);

                var exportableSubflowNodes = JSON.stringify(subflowNodeSet);
                var exportableSFNodes = JSON.stringify(createExportableNodeSet(sfNodeSet));
                var nodeMap = {};
                for (i=0;i<sfNodes.length;i++) {
                    exportableSubflowNodes = exportableSubflowNodes.replace(new RegExp("\""+subflowNodes[i].id+"\"","g"),'"'+sfNodes[i].id+'"');
                }
                exportableSubflowNodes = exportableSubflowNodes.replace(new RegExp("\""+subflow.id+"\"","g"),'"'+sf.id+'"');

                if (exportableSubflowNodes !== exportableSFNodes) {
                    return;
                }

                match = sf;
                throw new Error();
            });
        } catch(err) {
            console.log(err.stack);
        }
        return match;
    }
    function compareNodes(nodeA,nodeB,idMustMatch) {
        if (idMustMatch && nodeA.id != nodeB.id) {
            return false;
        }
        if (nodeA.type != nodeB.type) {
            return false;
        }
        var def = nodeA._def;
        for (var d in def.defaults) {
            if (def.defaults.hasOwnProperty(d)) {
                var vA = nodeA[d];
                var vB = nodeB[d];
                if (typeof vA !== typeof vB) {
                    return false;
                }
                if (vA === null || typeof vA === "string" || typeof vA === "number") {
                    if (vA !== vB) {
                        return false;
                    }
                } else {
                    if (JSON.stringify(vA) !== JSON.stringify(vB)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function importNodes(newNodesObj,createNewIds,createMissingWorkspace) {
        var i;
        var n;
        var newNodes;
        var nodeZmap = {};
        if (typeof newNodesObj === "string") {
            if (newNodesObj === "") {
                return;
            }
            try {
                newNodes = JSON.parse(newNodesObj);
            } catch(err) {
                var e = new Error(RED._("clipboard.invalidFlow",{message:err.message}));
                e.code = "NODE_RED";
                throw e;
            }
        } else {
            newNodes = newNodesObj;
        }

        if (!$.isArray(newNodes)) {
            newNodes = [newNodes];
        }
        if (!initialLoad) {
            initialLoad = JSON.parse(JSON.stringify(newNodes));
        }
        var unknownTypes = [];
        for (i=0;i<newNodes.length;i++) {
            n = newNodes[i];
            // TODO: remove workspace in next release+1
            if (n.type != "workspace" &&
                n.type != "tab" &&
                n.type != "subflow" &&
                !registry.getNodeType(n.type) &&
                n.type.substring(0,8) != "subflow:" &&
                unknownTypes.indexOf(n.type)==-1) {
                    unknownTypes.push(n.type);
            }
            if (n.z) {
                nodeZmap[n.z] = nodeZmap[n.z] || [];
                nodeZmap[n.z].push(n);
            }

        }
        if (unknownTypes.length > 0) {
            var typeList = "<ul><li>"+unknownTypes.join("</li><li>")+"</li></ul>";
            var type = "type"+(unknownTypes.length > 1?"s":"");
            RED.notify("<strong>"+RED._("clipboard.importUnrecognised",{count:unknownTypes.length})+"</strong>"+typeList,"error",false,10000);
        }

        var activeWorkspace = RED.workspaces.active();
        //TODO: check the z of the subflow instance and check _that_ if it exists
        var activeSubflow = getSubflow(activeWorkspace);
        for (i=0;i<newNodes.length;i++) {
            var m = /^subflow:(.+)$/.exec(newNodes[i].type);
            if (m) {
                var subflowId = m[1];
                var parent = getSubflow(newNodes[i].z || activeWorkspace);
                if (parent) {
                    var err;
                    if (subflowId === parent.id) {
                        err = new Error(RED._("notification.errors.cannotAddSubflowToItself"));
                    }
                    if (subflowContains(subflowId,parent.id)) {
                        err = new Error(RED._("notification.errors.cannotAddCircularReference"));
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
        var subflow_blacklist = {};
        var node_map = {};
        var new_nodes = [];
        var new_links = [];
        var nid;
        var def;
        var configNode;
        var missingWorkspace = null;
        var d;

        // Find all tabs and subflow templates
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
                RED.workspaces.add(n);
                new_workspaces.push(n);
            } else if (n.type === "subflow") {
                var matchingSubflow = checkForMatchingSubflow(n,nodeZmap[n.id]);
                if (matchingSubflow) {
                    subflow_blacklist[n.id] = matchingSubflow;
                } else {
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
                    addSubflow(n,createNewIds);
                }
            }
        }

        // Add a tab if there isn't one there already
        if (defaultWorkspace == null) {
            defaultWorkspace = { type:"tab", id:getID(), label:RED._('workspace.defaultName',{number:1})};
            addWorkspace(defaultWorkspace);
            RED.workspaces.add(defaultWorkspace);
            new_workspaces.push(defaultWorkspace);
            activeWorkspace = RED.workspaces.active();
        }

        // Find all config nodes and add them
        for (i=0;i<newNodes.length;i++) {
            n = newNodes[i];
            def = registry.getNodeType(n.type);
            if (def && def.category == "config") {
                var existingConfigNode = null;
                if (createNewIds) {
                    if (n.z) {
                        if (subflow_blacklist[n.z]) {
                            continue;
                        } else if (subflow_map[n.z]) {
                            n.z = subflow_map[n.z].id;
                        } else {
                            n.z = workspace_map[n.z];
                            if (!workspaces[n.z]) {
                                if (createMissingWorkspace) {
                                    if (missingWorkspace === null) {
                                        missingWorkspace = RED.workspaces.add(null,true);
                                        new_workspaces.push(missingWorkspace);
                                    }
                                    n.z = missingWorkspace.id;
                                } else {
                                    n.z = activeWorkspace;
                                }
                            }
                        }
                    }
                    existingConfigNode = RED.nodes.node(n.id);
                    if (existingConfigNode) {
                        if (n.z && existingConfigNode.z !== n.z) {
                            existingConfigNode = null;
                            // Check the config nodes on n.z
                            for (var cn in configNodes) {
                                if (configNodes.hasOwnProperty(cn)) {
                                    if (configNodes[cn].z === n.z && compareNodes(configNodes[cn],n,false)) {
                                        existingConfigNode = configNodes[cn];
                                        node_map[n.id] = configNodes[cn];
                                        break;
                                    }
                                }
                            }
                        }
                    }

                }

                if (!existingConfigNode) { //} || !compareNodes(existingConfigNode,n,true) || existingConfigNode._def.exclusive || existingConfigNode.z !== n.z) {
                    configNode = {id:n.id, z:n.z, type:n.type, users:[], _config:{}};
                    for (d in def.defaults) {
                        if (def.defaults.hasOwnProperty(d)) {
                            configNode[d] = n[d];
                            configNode._config[d] = JSON.stringify(n[d]);
                        }
                    }
                    if (def.hasOwnProperty('credentials') && n.hasOwnProperty('credentials')) {
                        configNode.credentials = {};
                        for (d in def.credentials) {
                            if (def.credentials.hasOwnProperty(d) && n.credentials.hasOwnProperty(d)) {
                                configNode.credentials[d] = n.credentials[d];
                            }
                        }
                    }
                    configNode.label = def.label;
                    configNode._def = def;
                    if (createNewIds) {
                        configNode.id = getID();
                    }
                    node_map[n.id] = configNode;
                    new_nodes.push(configNode);
                    RED.nodes.add(configNode);
                }
            }
        }

        // Find regular flow nodes and subflow instances
        for (i=0;i<newNodes.length;i++) {
            n = newNodes[i];
            // TODO: remove workspace in next release+1
            if (n.type !== "workspace" && n.type !== "tab" && n.type !== "subflow") {
                def = registry.getNodeType(n.type);
                if (!def || def.category != "config") {
                    var node = {x:n.x,y:n.y,z:n.z,type:0,wires:n.wires,changed:false,_config:{}};
                    if (createNewIds) {
                        if (subflow_blacklist[n.z]) {
                            continue;
                        } else if (subflow_map[node.z]) {
                            node.z = subflow_map[node.z].id;
                        } else {
                            node.z = workspace_map[node.z];
                            if (!workspaces[node.z]) {
                                if (createMissingWorkspace) {
                                    if (missingWorkspace === null) {
                                        missingWorkspace = RED.workspaces.add(null,true);
                                        new_workspaces.push(missingWorkspace);
                                    }
                                    node.z = missingWorkspace.id;
                                } else {
                                    node.z = activeWorkspace;
                                }
                            }
                        }
                        node.id = getID();
                    } else {
                        node.id = n.id;
                        if (node.z == null || (!workspaces[node.z] && !subflow_map[node.z])) {
                            if (createMissingWorkspace) {
                                if (missingWorkspace === null) {
                                    missingWorkspace = RED.workspaces.add(null,true);
                                    new_workspaces.push(missingWorkspace);
                                }
                                node.z = missingWorkspace.id;
                            } else {
                                node.z = activeWorkspace;
                            }
                        }
                    }
                    node.type = n.type;
                    node._def = def;
                    if (n.type.substring(0,7) === "subflow") {
                        var parentId = n.type.split(":")[1];
                        var subflow = subflow_blacklist[parentId]||subflow_map[parentId]||getSubflow(parentId);
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
                                    outputs: n.outputs||n.wires.length,
                                    set: registry.getNodeSet("node-red/unknown")
                                }
                            } else {
                                node._def = {
                                    category:"config",
                                    set: registry.getNodeSet("node-red/unknown")
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
                            for (d in node._def.defaults) {
                                if (node._def.defaults.hasOwnProperty(d)) {
                                    node[d] = n[d];
                                    node._config[d] = JSON.stringify(n[d]);
                                }
                            }
                            node._config.x = node.x;
                            node._config.y = node.y;
                            if (node._def.hasOwnProperty('credentials') && n.hasOwnProperty('credentials')) {
                                node.credentials = {};
                                for (d in node._def.credentials) {
                                    if (node._def.credentials.hasOwnProperty(d) && n.credentials.hasOwnProperty(d)) {
                                        node.credentials[d] = n.credentials[d];
                                    }
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
        // TODO: make this a part of the node definition so it doesn't have to
        //       be hardcoded here
        var nodeTypeArrayReferences = {
            "catch":"scope",
            "status":"scope",
            "link in":"links",
            "link out":"links"
        }

        // Remap all wires and config node references
        for (i=0;i<new_nodes.length;i++) {
            n = new_nodes[i];
            if (n.wires) {
                for (var w1=0;w1<n.wires.length;w1++) {
                    var wires = (n.wires[w1] instanceof Array)?n.wires[w1]:[n.wires[w1]];
                    for (var w2=0;w2<wires.length;w2++) {
                        if (node_map.hasOwnProperty(wires[w2])) {
                            if (n.z === node_map[wires[w2]].z) {
                                var link = {source:n,sourcePort:w1,target:node_map[wires[w2]]};
                                addLink(link);
                                new_links.push(link);
                            } else {
                                console.log("Warning: dropping link that crosses tabs:",n.id,"->",node_map[wires[w2]].id);
                            }
                        }
                    }
                }
                delete n.wires;
            }
            for (var d3 in n._def.defaults) {
                if (n._def.defaults.hasOwnProperty(d3)) {
                    if (n._def.defaults[d3].type && node_map[n[d3]]) {
                        n[d3] = node_map[n[d3]].id;
                        configNode = RED.nodes.node(n[d3]);
                        if (configNode && configNode.users.indexOf(n) === -1) {
                            configNode.users.push(n);
                        }
                    } else if (nodeTypeArrayReferences.hasOwnProperty(n.type) && nodeTypeArrayReferences[n.type] === d3 && n[d3] !== undefined && n[d3] !== null) {
                        for (var j = 0;j<n[d3].length;j++) {
                            if (node_map[n[d3][j]]) {
                                n[d3][j] = node_map[n[d3][j]].id;
                            }
                        }

                    }
                }
            }
            // If importing into a subflow, ensure an outbound-link doesn't
            // get added
            if (activeSubflow && /^link /.test(n.type) && n.links) {
                n.links = n.links.filter(function(id) {
                    var otherNode = RED.nodes.node(id);
                    return (otherNode && otherNode.z === activeWorkspace)
                });
            }

            // With all properties now remapped to point at valid nodes,
            // we can validate the node
            RED.editor.validateNode(n);
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
                    if (subflow_map[wire.id] && subflow_map[wire.id].id == n.id) {
                        link = {source:n.in[wire.port], sourcePort:wire.port,target:output};
                    } else {
                        link = {source:node_map[wire.id]||subflow_map[wire.id], sourcePort:wire.port,target:output};
                    }
                    addLink(link);
                    new_links.push(link);
                });
                delete output.wires;
            });
        }

        RED.workspaces.refresh();
        return [new_nodes,new_links,new_workspaces,new_subflows,missingWorkspace];
    }

    // TODO: supports filter.z|type
    function filterNodes(filter) {
        var result = [];

        for (var n=0;n<nodes.length;n++) {
            var node = nodes[n];
            if (filter.hasOwnProperty("z") && node.z !== filter.z) {
                continue;
            }
            if (filter.hasOwnProperty("type") && node.type !== filter.type) {
                continue;
            }
            result.push(node);
        }
        return result;
    }
    function filterLinks(filter) {
        var result = [];

        for (var n=0;n<links.length;n++) {
            var link = links[n];
            if (filter.source) {
                if (filter.source.hasOwnProperty("id") && link.source.id !== filter.source.id) {
                    continue;
                }
                if (filter.source.hasOwnProperty("z") && link.source.z !== filter.source.z) {
                    continue;
                }
            }
            if (filter.target) {
                if (filter.target.hasOwnProperty("id") && link.target.id !== filter.target.id) {
                    continue;
                }
                if (filter.target.hasOwnProperty("z") && link.target.z !== filter.target.z) {
                    continue;
                }
            }
            if (filter.hasOwnProperty("sourcePort") && link.sourcePort !== filter.sourcePort) {
                continue;
            }
            result.push(link);
        }
        return result;
    }

    // Update any config nodes referenced by the provided node to ensure their 'users' list is correct
    function updateConfigNodeUsers(n) {
        for (var d in n._def.defaults) {
            if (n._def.defaults.hasOwnProperty(d)) {
                var property = n._def.defaults[d];
                if (property.type) {
                    var type = registry.getNodeType(property.type);
                    if (type && type.category == "config") {
                        var configNode = configNodes[n[d]];
                        if (configNode) {
                            if (configNode.users.indexOf(n) === -1) {
                                configNode.users.push(n);
                            }
                        }
                    }
                }
            }
        }
    }

    function flowVersion(version) {
        if (version !== undefined) {
            loadedFlowVersion = version;
        } else {
            return loadedFlowVersion;
        }
    }

    function clear() {
        nodes = [];
        links = [];
        configNodes = {};
        workspacesOrder = [];
        var subflowIds = Object.keys(subflows);
        subflowIds.forEach(function(id) {
            RED.subflow.removeSubflow(id)
        });
        var workspaceIds = Object.keys(workspaces);
        workspaceIds.forEach(function(id) {
            RED.workspaces.remove(workspaces[id]);
        });
        defaultWorkspace = null;

        RED.nodes.dirty(true);
        RED.view.redraw(true);
        RED.palette.refresh();
        RED.workspaces.refresh();
        RED.sidebar.config.refresh();

        // var node_defs = {};
        // var nodes = [];
        // var configNodes = {};
        // var links = [];
        // var defaultWorkspace;
        // var workspaces = {};
        // var workspacesOrder =[];
        // var subflows = {};
        // var loadedFlowVersion = null;
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
        clear: clear,

        addLink: addLink,
        removeLink: removeLink,

        addWorkspace: addWorkspace,
        removeWorkspace: removeWorkspace,
        getWorkspaceOrder: function() { return workspacesOrder },
        setWorkspaceOrder: function(order) { workspacesOrder = order; },
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
        eachWorkspace: function(cb) {
            for (var i=0;i<workspacesOrder.length;i++) {
                cb(workspaces[workspacesOrder[i]]);
            }
        },

        node: getNode,

        version: flowVersion,
        originalFlow: function(flow) {
            if (flow === undefined) {
                return initialLoad;
            } else {
                initialLoad = flow;
            }
        },

        filterNodes: filterNodes,
        filterLinks: filterLinks,

        import: importNodes,

        getAllFlowNodes: getAllFlowNodes,
        createExportableNodeSet: createExportableNodeSet,
        createCompleteNodeSet: createCompleteNodeSet,
        updateConfigNodeUsers: updateConfigNodeUsers,
        id: getID,
        dirty: function(d) {
            if (d == null) {
                return dirty;
            } else {
                setDirty(d);
            }
        }
    };
})();
