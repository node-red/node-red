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
            if (ev) {
                if (ev.t == 'add') {
                    if (ev.nodes) {
                        for (i=0;i<ev.nodes.length;i++) {
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
                            RED.view.removeWorkspace(ev.workspaces[i]);
                        }
                    }
                } else if (ev.t == "delete") {
                    if (ev.workspaces) {
                        for (i=0;i<ev.workspaces.length;i++) {
                            RED.nodes.addWorkspace(ev.workspaces[i]);
                            RED.view.addWorkspace(ev.workspaces[i]);
                        }
                    }
                    if (ev.nodes) {
                        for (i=0;i<ev.nodes.length;i++) {
                            RED.nodes.add(ev.nodes[i]);
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
                    RED.editor.updateNodeProperties(ev.node);
                    if (ev.links) {
                        for (i=0;i<ev.links.length;i++) {
                            RED.nodes.addLink(ev.links[i]);
                        }
                    }
                    RED.editor.validateNode(ev.node);
                    ev.node.dirty = true;
                    ev.node.changed = ev.changed;
                }
                RED.view.dirty(ev.dirty);
                RED.view.redraw();
            }
        }
    }

})();
