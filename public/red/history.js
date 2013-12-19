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
RED.history = function() {
    var undo_history = [];
    
    return {
        //TODO: this function is a placeholder until there is a 'save' event that can be listened to
        markAllDirty: function() {
            for (var i in undo_history) {
                undo_history[i].dirty = true;
            }
        },
        push: function(ev) {
            undo_history.push(ev);
        },
        pop: function() {
            var ev = undo_history.pop();
            if (ev) {
                if (ev.t == 'add') {
                    for (var i in ev.nodes) {
                        RED.nodes.remove(ev.nodes[i]);
                    }
                    for (var i in ev.links) {
                        RED.nodes.removeLink(ev.links[i]);
                    }
                    for (var i in ev.workspaces) {
                        RED.nodes.removeWorkspace(ev.workspaces[i].id);
                        RED.view.removeWorkspace(ev.workspaces[i]);
                    }
                } else if (ev.t == "delete") {
                    for (var i in ev.workspaces) {
                        RED.nodes.addWorkspace(ev.workspaces[i]);
                        RED.view.addWorkspace(ev.workspaces[i]);
                    }
                    for (var i in ev.nodes) {
                        RED.nodes.add(ev.nodes[i]);
                    }
                    for (var i in ev.links) {
                        RED.nodes.addLink(ev.links[i]);
                    }
                } else if (ev.t == "move") {
                    for (var i in ev.nodes) {
                        var n = ev.nodes[i];
                        n.n.x = n.ox;
                        n.n.y = n.oy;
                        n.n.dirty = true;
                    }
                } else if (ev.t == "edit") {
                    for (var i in ev.changes) {
                        ev.node[i] = ev.changes[i];
                    }
                    RED.editor.updateNodeProperties(ev.node);
                    for (var i in ev.links) {
                        RED.nodes.addLink(ev.links[i]);
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

}();
