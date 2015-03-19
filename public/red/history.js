/**
 * Copyright 2013, 2015 IBM Corp.
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
RED.history = (function() {
    var undo_history = [];
    
    return {
        //TODO: this function is a placeholder until there is a 'save' event that can be listened to
        markAllDirty: function() {
            for (var i=0;i<undo_history.length;i++) {
                undo_history[i].dirty = true;
            }
        },
        depth: function() {
            return undo_history.length;
        },
        push: function(ev) {
            undo_history.push(ev);
        },
        pop: function() {
            var ev = undo_history.pop();
            var i;
            var node;
            var modifiedTabs = {};
            if (ev) {
                if (ev.t == 'add') {
                    if (ev.nodes) {
                        for (i=0;i<ev.nodes.length;i++) {
                            node = RED.nodes.node(ev.nodes[i]);
                            if (node.z) {
                                modifiedTabs[node.z] = true;
                            }
                            RED.nodes.remove(ev.nodes[i]);
                        }
                    }
                    if (ev.links) {
                        for (i=0;i<ev.links.length;i++) {
                            RED.nodes.removeLink(ev.links[i]);
                        }
                    }
                    if (ev.workspaces) {
                        for (i=0;i<ev.workspaces.length;i++) {
                            RED.nodes.removeWorkspace(ev.workspaces[i].id);
                            RED.workspaces.remove(ev.workspaces[i]);
                        }
                    }
                    if (ev.subflows) {
                        for (i=0;i<ev.subflows.length;i++) {
                            RED.nodes.removeSubflow(ev.subflows[i]);
                            RED.workspaces.remove(ev.subflows[i]);
                        }
                    }
                } else if (ev.t == "delete") {
                    if (ev.workspaces) {
                        for (i=0;i<ev.workspaces.length;i++) {
                            RED.nodes.addWorkspace(ev.workspaces[i]);
                            RED.workspaces.add(ev.workspaces[i]);
                        }
                    }
                    if (ev.subflow) {
                        RED.nodes.addSubflow(ev.subflow);
                    }
                    var subflow;
                    if (ev.subflowInputs && ev.subflowInputs.length > 0) {
                        subflow = RED.nodes.subflow(ev.subflowInputs[0].z);
                        subflow.in.push(ev.subflowInputs[0]);
                        subflow.in[0].dirty = true;
                    }
                    if (ev.subflowOutputs && ev.subflowOutputs.length > 0) {
                        subflow = RED.nodes.subflow(ev.subflowOutputs[0].z);
                        ev.subflowOutputs.sort(function(a,b) { return a.i-b.i});
                        for (i=0;i<ev.subflowOutputs.length;i++) {
                            var output = ev.subflowOutputs[i];
                            subflow.out.splice(output.i,0,output);
                            for (var j=output.i+1;j<subflow.out.length;j++) {
                                subflow.out[j].i++;
                                subflow.out[j].dirty = true;
                            }
                            RED.nodes.eachLink(function(l) {
                                if (l.source.type == "subflow:"+subflow.id) {
                                    if (l.sourcePort >= output.i) {
                                        l.sourcePort++;
                                    }
                                }
                            });
                        }
                    }
                    if (subflow) {
                        RED.nodes.filterNodes({type:"subflow:"+subflow.id}).forEach(function(n) {
                            n.changed = true;
                            n.inputs = subflow.in.length;
                            n.outputs = subflow.out.length;
                            while (n.outputs > n.ports.length) {
                                n.ports.push(n.ports.length);
                            }
                            n.resize = true;
                            n.dirty = true;
                        });
                    }
                    if (ev.nodes) {
                        for (i=0;i<ev.nodes.length;i++) {
                            RED.nodes.add(ev.nodes[i]);
                            modifiedTabs[ev.nodes[i].z] = true;
                        }
                    }
                    if (ev.links) {
                        for (i=0;i<ev.links.length;i++) {
                            RED.nodes.addLink(ev.links[i]);
                        }
                    }
                } else if (ev.t == "move") {
                    for (i=0;i<ev.nodes.length;i++) {
                        var n = ev.nodes[i];
                        n.n.x = n.ox;
                        n.n.y = n.oy;
                        n.n.dirty = true;
                    }
                } else if (ev.t == "edit") {
                    for (i in ev.changes) {
                        if (ev.changes.hasOwnProperty(i)) {
                            ev.node[i] = ev.changes[i];
                        }
                    }
                    if (ev.subflow) {
                        if (ev.subflow.hasOwnProperty('inputCount')) {
                            if (ev.node.in.length > ev.subflow.inputCount) {
                                ev.node.in.splice(ev.subflow.inputCount);
                            } else if (ev.subflow.inputs.length > 0) {
                                ev.node.in = ev.node.in.concat(ev.subflow.inputs);
                            }
                        }
                        if (ev.subflow.hasOwnProperty('outputCount')) {
                            if (ev.node.out.length > ev.subflow.outputCount) {
                                ev.node.out.splice(ev.subflow.outputCount);
                            } else if (ev.subflow.outputs.length > 0) {
                                ev.node.out = ev.node.out.concat(ev.subflow.outputs);
                            }
                        }
                        RED.nodes.filterNodes({type:"subflow:"+ev.node.id}).forEach(function(n) {
                            n.changed = ev.changed;
                            n.inputs = ev.node.in.length;
                            n.outputs = ev.node.out.length;
                            RED.editor.updateNodeProperties(n);
                        });
                        
                        RED.palette.refresh();
                    } else {
                        RED.editor.updateNodeProperties(ev.node);
                        RED.editor.validateNode(ev.node);
                    }
                    if (ev.links) {
                        for (i=0;i<ev.links.length;i++) {
                            RED.nodes.addLink(ev.links[i]);
                        }
                    }
                    ev.node.dirty = true;
                    ev.node.changed = ev.changed;
                } else if (ev.t == "createSubflow") {
                    if (ev.nodes) {
                        RED.nodes.filterNodes({z:ev.subflow.id}).forEach(function(n) {
                            n.z = ev.activeWorkspace;
                            n.dirty = true;
                        });
                        for (i=0;i<ev.nodes.length;i++) {
                            RED.nodes.remove(ev.nodes[i]);
                        }
                    }
                    if (ev.links) {
                        for (i=0;i<ev.links.length;i++) {
                            RED.nodes.removeLink(ev.links[i]);
                        }
                    }
                    
                    RED.nodes.removeSubflow(ev.subflow);
                    RED.workspaces.remove(ev.subflow);
                    
                    if (ev.removedLinks) {
                        for (i=0;i<ev.removedLinks.length;i++) {
                            RED.nodes.addLink(ev.removedLinks[i]);
                        }
                    }
                }
                Object.keys(modifiedTabs).forEach(function(id) {
                    var subflow = RED.nodes.subflow(id);
                    if (subflow) {
                        RED.editor.validateNode(subflow);
                    }
                });

                
                RED.nodes.dirty(ev.dirty);
                RED.view.redraw(true);
                RED.palette.refresh();
            }
        }
    }

})();
