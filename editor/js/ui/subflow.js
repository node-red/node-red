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

RED.subflow = (function() {


    function getSubflow() {
        return RED.nodes.subflow(RED.workspaces.active());
    }

    function findAvailableSubflowIOPosition(subflow,isInput) {
        var pos = {x:50,y:30};
        if (!isInput) {
            pos.x += 110;
        }
        for (var i=0;i<subflow.out.length+subflow.in.length;i++) {
            var port;
            if (i < subflow.out.length) {
                port = subflow.out[i];
            } else {
                port = subflow.in[i-subflow.out.length];
            }
            if (port.x == pos.x && port.y == pos.y) {
                pos.x += 55;
                i=0;
            }
        }
        return pos;
    }

    function addSubflowInput() {
        var subflow = RED.nodes.subflow(RED.workspaces.active());
        if (subflow.in.length === 1) {
            return;
        }
        var position = findAvailableSubflowIOPosition(subflow,true);
        var newInput = {
            type:"subflow",
            direction:"in",
            z:subflow.id,
            i:subflow.in.length,
            x:position.x,
            y:position.y,
            id:RED.nodes.id()
        };
        var oldInCount = subflow.in.length;
        subflow.in.push(newInput);
        subflow.dirty = true;
        var wasDirty = RED.nodes.dirty();
        var wasChanged = subflow.changed;
        subflow.changed = true;
        var result = refresh(true);
        var historyEvent = {
            t:'edit',
            node:subflow,
            dirty:wasDirty,
            changed:wasChanged,
            subflow: {
                inputCount: oldInCount,
                instances: result.instances
            }
        };
        RED.history.push(historyEvent);
        RED.view.select();
        RED.nodes.dirty(true);
        RED.view.redraw();
        $("#workspace-subflow-input-add").addClass("active");
        $("#workspace-subflow-input-remove").removeClass("active");
    }

    function removeSubflowInput() {
        var activeSubflow = RED.nodes.subflow(RED.workspaces.active());
        if (activeSubflow.in.length === 0) {
            return;
        }
        var removedInput = activeSubflow.in[0];
        var removedInputLinks = [];
        RED.nodes.eachLink(function(l) {
            if (l.source.type == "subflow" && l.source.z == activeSubflow.id && l.source.i == removedInput.i) {
                removedInputLinks.push(l);
            } else if (l.target.type == "subflow:"+activeSubflow.id) {
                removedInputLinks.push(l);
            }
        });
        removedInputLinks.forEach(function(l) { RED.nodes.removeLink(l)});
        activeSubflow.in = [];
        $("#workspace-subflow-input-add").removeClass("active");
        $("#workspace-subflow-input-remove").addClass("active");
        activeSubflow.changed = true;
        return {subflowInputs: [ removedInput ], links:removedInputLinks};
    }

    function addSubflowOutput(id) {
        var subflow = RED.nodes.subflow(RED.workspaces.active());
        var position = findAvailableSubflowIOPosition(subflow,false);

        var newOutput = {
            type:"subflow",
            direction:"out",
            z:subflow.id,
            i:subflow.out.length,
            x:position.x,
            y:position.y,
            id:RED.nodes.id()
        };
        var oldOutCount = subflow.out.length;
        subflow.out.push(newOutput);
        subflow.dirty = true;
        var wasDirty = RED.nodes.dirty();
        var wasChanged = subflow.changed;
        subflow.changed = true;

        var result = refresh(true);

        var historyEvent = {
            t:'edit',
            node:subflow,
            dirty:wasDirty,
            changed:wasChanged,
            subflow: {
                outputCount: oldOutCount,
                instances: result.instances
            }
        };
        RED.history.push(historyEvent);
        RED.view.select();
        RED.nodes.dirty(true);
        RED.view.redraw();
        $("#workspace-subflow-output .spinner-value").html(subflow.out.length);
    }

    function removeSubflowOutput(removedSubflowOutputs) {
        var activeSubflow = RED.nodes.subflow(RED.workspaces.active());
        if (activeSubflow.out.length === 0) {
            return;
        }
        if (typeof removedSubflowOutputs === "undefined") {
            removedSubflowOutputs = [activeSubflow.out[activeSubflow.out.length-1]];
        }
        var removedLinks = [];
        removedSubflowOutputs.sort(function(a,b) { return b.i-a.i});
        for (i=0;i<removedSubflowOutputs.length;i++) {
            var output = removedSubflowOutputs[i];
            activeSubflow.out.splice(output.i,1);
            var subflowRemovedLinks = [];
            var subflowMovedLinks = [];
            RED.nodes.eachLink(function(l) {
                if (l.target.type == "subflow" && l.target.z == activeSubflow.id && l.target.i == output.i) {
                    subflowRemovedLinks.push(l);
                }
                if (l.source.type == "subflow:"+activeSubflow.id) {
                    if (l.sourcePort == output.i) {
                        subflowRemovedLinks.push(l);
                    } else if (l.sourcePort > output.i) {
                        subflowMovedLinks.push(l);
                    }
                }
            });
            subflowRemovedLinks.forEach(function(l) { RED.nodes.removeLink(l)});
            subflowMovedLinks.forEach(function(l) { l.sourcePort--; });

            removedLinks = removedLinks.concat(subflowRemovedLinks);
            for (var j=output.i;j<activeSubflow.out.length;j++) {
                activeSubflow.out[j].i--;
                activeSubflow.out[j].dirty = true;
            }
        }
        activeSubflow.changed = true;

        return {subflowOutputs: removedSubflowOutputs, links: removedLinks}
    }

    function refresh(markChange) {
        var activeSubflow = RED.nodes.subflow(RED.workspaces.active());
        refreshToolbar(activeSubflow);
        var subflowInstances = [];
        if (activeSubflow) {
            RED.nodes.filterNodes({type:"subflow:"+activeSubflow.id}).forEach(function(n) {
                subflowInstances.push({
                    id: n.id,
                    changed: n.changed
                });
                if (markChange) {
                    n.changed = true;
                }
                n.inputs = activeSubflow.in.length;
                n.outputs = activeSubflow.out.length;
                while (n.outputs < n.ports.length) {
                    n.ports.pop();
                }
                n.resize = true;
                n.dirty = true;
                RED.editor.updateNodeProperties(n);
            });
            RED.editor.validateNode(activeSubflow);
            return {
                instances: subflowInstances
            }
        }
    }
    function refreshToolbar(activeSubflow) {
        if (activeSubflow) {
            $("#workspace-subflow-input-add").toggleClass("active", activeSubflow.in.length !== 0);
            $("#workspace-subflow-input-remove").toggleClass("active",activeSubflow.in.length === 0);

            $("#workspace-subflow-output .spinner-value").html(activeSubflow.out.length);
        }
    }

    function showWorkspaceToolbar(activeSubflow) {
        var toolbar = $("#workspace-toolbar");
        toolbar.empty();

        $('<a class="button" id="workspace-subflow-edit" href="#" data-i18n="[append]subflow.editSubflowProperties"><i class="fa fa-pencil"></i> </a>').appendTo(toolbar);
        $('<span style="margin-left: 5px;" data-i18n="subflow.input"></span> '+
            '<div style="display: inline-block;" class="button-group">'+
            '<a id="workspace-subflow-input-remove" class="button active" href="#">0</a>'+
            '<a id="workspace-subflow-input-add" class="button" href="#">1</a>'+
            '</div>').appendTo(toolbar);

        $('<span style="margin-left: 5px;" data-i18n="subflow.output"></span> <div id="workspace-subflow-output" style="display: inline-block;" class="button-group spinner-group">'+
            '<a id="workspace-subflow-output-remove" class="button" href="#"><i class="fa fa-minus"></i></a>'+
            '<div class="spinner-value">3</div>'+
            '<a id="workspace-subflow-output-add" class="button" href="#"><i class="fa fa-plus"></i></a>'+
            '</div>').appendTo(toolbar);

        // $('<a class="button disabled" id="workspace-subflow-add-input" href="#" data-i18n="[append]subflow.input"><i class="fa fa-plus"></i> </a>').appendTo(toolbar);
        // $('<a class="button" id="workspace-subflow-add-output" href="#" data-i18n="[append]subflow.output"><i class="fa fa-plus"></i> </a>').appendTo(toolbar);
        $('<a class="button" id="workspace-subflow-delete" href="#" data-i18n="[append]subflow.deleteSubflow"><i class="fa fa-trash"></i> </a>').appendTo(toolbar);
        toolbar.i18n();


        $("#workspace-subflow-output-remove").click(function(event) {
            event.preventDefault();
            var wasDirty = RED.nodes.dirty();
            var wasChanged = activeSubflow.changed;
            var result = removeSubflowOutput();
            if (result) {
                var inst = refresh(true);
                RED.history.push({
                    t:'delete',
                    links:result.links,
                    subflowOutputs: result.subflowOutputs,
                    changed: wasChanged,
                    dirty:wasDirty,
                    subflow: {
                        instances: inst.instances
                    }
                });

                RED.view.select();
                RED.nodes.dirty(true);
                RED.view.redraw(true);
            }
        });
        $("#workspace-subflow-output-add").click(function(event) {
            event.preventDefault();
            addSubflowOutput();
        });

        $("#workspace-subflow-input-add").click(function(event) {
            event.preventDefault();
            addSubflowInput();
        });
        $("#workspace-subflow-input-remove").click(function(event) {
            event.preventDefault();
            var wasDirty = RED.nodes.dirty();
            var wasChanged = activeSubflow.changed;
            activeSubflow.changed = true;
            var result = removeSubflowInput();
            if (result) {
                var inst = refresh(true);
                RED.history.push({
                    t:'delete',
                    links:result.links,
                    changed: wasChanged,
                    subflowInputs: result.subflowInputs,
                    dirty:wasDirty,
                    subflow: {
                        instances: inst.instances
                    }
                });
                RED.view.select();
                RED.nodes.dirty(true);
                RED.view.redraw(true);
            }
        });

        $("#workspace-subflow-edit").click(function(event) {
            RED.editor.editSubflow(RED.nodes.subflow(RED.workspaces.active()));
            event.preventDefault();
        });

        $("#workspace-subflow-delete").click(function(event) {
            event.preventDefault();
            var removedNodes = [];
            var removedLinks = [];
            var startDirty = RED.nodes.dirty();

            var activeSubflow = getSubflow();

            RED.nodes.eachNode(function(n) {
                if (n.type == "subflow:"+activeSubflow.id) {
                    removedNodes.push(n);
                }
                if (n.z == activeSubflow.id) {
                    removedNodes.push(n);
                }
            });
            RED.nodes.eachConfig(function(n) {
                if (n.z == activeSubflow.id) {
                    removedNodes.push(n);
                }
            });

            var removedConfigNodes = [];
            for (var i=0;i<removedNodes.length;i++) {
                var removedEntities = RED.nodes.remove(removedNodes[i].id);
                removedLinks = removedLinks.concat(removedEntities.links);
                removedConfigNodes = removedConfigNodes.concat(removedEntities.nodes);
            }
            // TODO: this whole delete logic should be in RED.nodes.removeSubflow..
            removedNodes = removedNodes.concat(removedConfigNodes);

            RED.nodes.removeSubflow(activeSubflow);

            RED.history.push({
                    t:'delete',
                    nodes:removedNodes,
                    links:removedLinks,
                    subflow: {
                        subflow: activeSubflow
                    },
                    dirty:startDirty
            });

            RED.workspaces.remove(activeSubflow);
            RED.nodes.dirty(true);
            RED.view.redraw();
        });

        refreshToolbar(activeSubflow);

        $("#chart").css({"margin-top": "40px"});
        $("#workspace-toolbar").show();
    }
    function hideWorkspaceToolbar() {
        $("#workspace-toolbar").hide().empty();
        $("#chart").css({"margin-top": "0"});
    }


    function init() {
        RED.events.on("workspace:change",function(event) {
            var activeSubflow = RED.nodes.subflow(event.workspace);
            if (activeSubflow) {
                showWorkspaceToolbar(activeSubflow);
            } else {
                hideWorkspaceToolbar();
            }
        });
        RED.events.on("view:selection-changed",function(selection) {
            if (!selection.nodes) {
                RED.menu.setDisabled("menu-item-subflow-convert",true);
            } else {
                RED.menu.setDisabled("menu-item-subflow-convert",false);
            }
        });

    }

    function createSubflow() {
        var lastIndex = 0;
        RED.nodes.eachSubflow(function(sf) {
           var m = (new RegExp("^Subflow (\\d+)$")).exec(sf.name);
           if (m) {
               lastIndex = Math.max(lastIndex,m[1]);
           }
        });

        var name = "Subflow "+(lastIndex+1);

        var subflowId = RED.nodes.id();
        var subflow = {
            type:"subflow",
            id:subflowId,
            name:name,
            info:"",
            in: [],
            out: []
        };
        RED.nodes.addSubflow(subflow);
        RED.history.push({
            t:'createSubflow',
            subflow: {
                subflow:subflow
            },
            dirty:RED.nodes.dirty()
        });
        RED.workspaces.show(subflowId);
        RED.nodes.dirty(true);
    }

    function convertToSubflow() {
        var selection = RED.view.selection();
        if (!selection.nodes) {
            RED.notify(RED._("subflow.errors.noNodesSelected"),"error");
            return;
        }
        var i;
        var nodes = {};
        var new_links = [];
        var removedLinks = [];

        var candidateInputs = [];
        var candidateOutputs = [];
        var candidateInputNodes = {};


        var boundingBox = [selection.nodes[0].x,
            selection.nodes[0].y,
            selection.nodes[0].x,
            selection.nodes[0].y];

        for (i=0;i<selection.nodes.length;i++) {
            var n = selection.nodes[i];
            nodes[n.id] = {n:n,outputs:{}};
            boundingBox = [
                Math.min(boundingBox[0],n.x),
                Math.min(boundingBox[1],n.y),
                Math.max(boundingBox[2],n.x),
                Math.max(boundingBox[3],n.y)
            ]
        }

        var center = [(boundingBox[2]+boundingBox[0]) / 2,(boundingBox[3]+boundingBox[1]) / 2];

        RED.nodes.eachLink(function(link) {
            if (nodes[link.source.id] && nodes[link.target.id]) {
                // A link wholely within the selection
            }

            if (nodes[link.source.id] && !nodes[link.target.id]) {
                // An outbound link from the selection
                candidateOutputs.push(link);
                removedLinks.push(link);
            }
            if (!nodes[link.source.id] && nodes[link.target.id]) {
                // An inbound link
                candidateInputs.push(link);
                candidateInputNodes[link.target.id] = link.target;
                removedLinks.push(link);
            }
        });

        var outputs = {};
        candidateOutputs = candidateOutputs.filter(function(v) {
             if (outputs[v.source.id+":"+v.sourcePort]) {
                 outputs[v.source.id+":"+v.sourcePort].targets.push(v.target);
                 return false;
             }
             v.targets = [];
             v.targets.push(v.target);
             outputs[v.source.id+":"+v.sourcePort] = v;
             return true;
        });
        candidateOutputs.sort(function(a,b) { return a.source.y-b.source.y});

        if (Object.keys(candidateInputNodes).length > 1) {
             RED.notify(RED._("subflow.errors.multipleInputsToSelection"),"error");
             return;
        }

        var lastIndex = 0;
        RED.nodes.eachSubflow(function(sf) {
           var m = (new RegExp("^Subflow (\\d+)$")).exec(sf.name);
           if (m) {
               lastIndex = Math.max(lastIndex,m[1]);
           }
        });

        var name = "Subflow "+(lastIndex+1);

        var subflowId = RED.nodes.id();
        var subflow = {
            type:"subflow",
            id:subflowId,
            name:name,
            info:"",
            in: Object.keys(candidateInputNodes).map(function(v,i) { var index = i; return {
                type:"subflow",
                direction:"in",
                x:candidateInputNodes[v].x-(candidateInputNodes[v].w/2)-80,
                y:candidateInputNodes[v].y,
                z:subflowId,
                i:index,
                id:RED.nodes.id(),
                wires:[{id:candidateInputNodes[v].id}]
            }}),
            out: candidateOutputs.map(function(v,i) { var index = i; return {
                type:"subflow",
                direction:"in",
                x:v.source.x+(v.source.w/2)+80,
                y:v.source.y,
                z:subflowId,
                i:index,
                id:RED.nodes.id(),
                wires:[{id:v.source.id,port:v.sourcePort}]
            }})
        };

        RED.nodes.addSubflow(subflow);

        var subflowInstance = {
            id:RED.nodes.id(),
            type:"subflow:"+subflow.id,
            x: center[0],
            y: center[1],
            z: RED.workspaces.active(),
            inputs: subflow.in.length,
            outputs: subflow.out.length,
            h: Math.max(30/*node_height*/,(subflow.out.length||0) * 15),
            changed:true
        }
        subflowInstance._def = RED.nodes.getType(subflowInstance.type);
        RED.editor.validateNode(subflowInstance);
        RED.nodes.add(subflowInstance);

        candidateInputs.forEach(function(l) {
            var link = {source:l.source, sourcePort:l.sourcePort, target: subflowInstance};
            new_links.push(link);
            RED.nodes.addLink(link);
        });

        candidateOutputs.forEach(function(output,i) {
            output.targets.forEach(function(target) {
                var link = {source:subflowInstance, sourcePort:i, target: target};
                new_links.push(link);
                RED.nodes.addLink(link);
            });
        });

        subflow.in.forEach(function(input) {
            input.wires.forEach(function(wire) {
                var link = {source: input, sourcePort: 0, target: RED.nodes.node(wire.id) }
                new_links.push(link);
                RED.nodes.addLink(link);
            });
        });
        subflow.out.forEach(function(output,i) {
            output.wires.forEach(function(wire) {
                var link = {source: RED.nodes.node(wire.id), sourcePort: wire.port , target: output }
                new_links.push(link);
                RED.nodes.addLink(link);
            });
        });

        for (i=0;i<removedLinks.length;i++) {
            RED.nodes.removeLink(removedLinks[i]);
        }

        for (i=0;i<selection.nodes.length;i++) {
            selection.nodes[i].z = subflow.id;
        }

        RED.history.push({
            t:'createSubflow',
            nodes:[subflowInstance.id],
            links:new_links,
            subflow: {
                subflow: subflow
            },

            activeWorkspace: RED.workspaces.active(),
            removedLinks: removedLinks,

            dirty:RED.nodes.dirty()
        });

        RED.editor.validateNode(subflow);
        RED.nodes.dirty(true);
        RED.view.redraw(true);
    }



    return {
        init: init,
        createSubflow: createSubflow,
        convertToSubflow: convertToSubflow,
        refresh: refresh,
        removeInput: removeSubflowInput,
        removeOutput: removeSubflowOutput
    }
})();
