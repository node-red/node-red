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

RED.view.tools = (function() {

    function selectConnected(type) {
        var selection = RED.view.selection();
        var visited = new Set();
        if (selection.nodes && selection.nodes.length > 0) {
            selection.nodes.forEach(function(n) {
                if (!visited.has(n)) {
                    var connected;
                    if (type === 'all') {
                        connected = RED.nodes.getAllFlowNodes(n);
                    } else if (type === 'up') {
                        connected = [n].concat(RED.nodes.getAllUpstreamNodes(n));
                    } else if (type === 'down') {
                        connected = [n].concat(RED.nodes.getAllDownstreamNodes(n));
                    }
                    connected.forEach(function(nn) { visited.add(nn) })
                }
            });
            RED.view.select({nodes:Array.from(visited)});
        }

    }

    function alignToGrid() {
        var selection = RED.view.selection();
        if (selection.nodes) {
            var changedNodes = [];
            selection.nodes.forEach(function(n) {
                var x = n.w/2 + Math.round((n.x-n.w/2)/RED.view.gridSize())*RED.view.gridSize();
                var y = Math.round(n.y/RED.view.gridSize())*RED.view.gridSize();
                if (n.x !== x || n.y !== y) {
                    changedNodes.push({
                        n:n,
                        ox: n.x,
                        oy: n.y,
                        moved: n.moved
                    });
                    n.x = x;
                    n.y = y;
                    n.dirty = true;
                    n.moved = true;
                }
            });
            if (changedNodes.length > 0) {
                RED.history.push({t:"move",nodes:changedNodes,dirty:RED.nodes.dirty()});
                RED.nodes.dirty(true);
                RED.view.redraw(true);
            }
        }
    }

    var moving_set = null;
    var endMoveSet = false;
    function endKeyboardMove() {
        endMoveSet = false;
        if (moving_set.length > 0) {
            var ns = [];
            for (var i=0;i<moving_set.length;i++) {
                ns.push({n:moving_set[i].n,ox:moving_set[i].ox,oy:moving_set[i].oy,moved:moving_set[i].moved});
                moving_set[i].n.moved = true;
                moving_set[i].n.dirty = true;
                delete moving_set[i].ox;
                delete moving_set[i].oy;
            }
            RED.view.redraw();
            RED.history.push({t:"move",nodes:ns,dirty:RED.nodes.dirty()});
            RED.nodes.dirty(true);
            moving_set = null;
        }
    }

    function moveSelection(dx,dy) {
        if (moving_set === null) {
            moving_set = [];
            var selection = RED.view.selection();
            if (selection.nodes) {
                while (selection.nodes.length > 0) {
                    var n = selection.nodes.shift();
                    moving_set.push({n:n});
                    if (n.type === "group") {
                        selection.nodes = selection.nodes.concat(n.nodes);
                    }
                }
            }
        }
        if (moving_set && moving_set.length > 0) {
            if (!endMoveSet) {
                $(document).one('keyup',endKeyboardMove);
                endMoveSet = true;
            }
            var minX = 0;
            var minY = 0;
            var node;

            for (var i=0;i<moving_set.length;i++) {
                node = moving_set[i];
                if (node.ox == null && node.oy == null) {
                    node.ox = node.n.x;
                    node.oy = node.n.y;
                    node.moved = node.n.moved;
                }
                node.n.moved = true;
                node.n.dirty = true;
                node.n.x += dx;
                node.n.y += dy;
                node.n.dirty = true;
                if (node.n.type === "group") {
                    RED.group.markDirty(node.n);
                    minX = Math.min(node.n.x - 5,minX);
                    minY = Math.min(node.n.y - 5,minY);
                } else {
                    minX = Math.min(node.n.x-node.n.w/2-5,minX);
                    minY = Math.min(node.n.y-node.n.h/2-5,minY);
                }
            }
            if (minX !== 0 || minY !== 0) {
                for (var n = 0; n<moving_set.length; n++) {
                    node = moving_set[n];
                    node.n.x -= minX;
                    node.n.y -= minY;
                }
            }
            RED.view.redraw();
        } else {
            RED.view.scroll(dx*10,dy*10);
        }
    }

    function setSelectedNodeLabelState(labelShown) {
        var selection = RED.view.selection();
        var historyEvents = [];
        var nodes = [];
        if (selection.nodes) {
            selection.nodes.forEach(function(n) {
                if (n.type !== 'subflow' && n.type !== 'group') {
                    nodes.push(n);
                } else if (n.type === 'group') {
                    nodes = nodes.concat( RED.group.getNodes(n,true));
                }
            });
        }
        nodes.forEach(function(n) {
            var modified = false;
            var oldValue = n.l === undefined?true:n.l;
            var isLink = /^link (in|out)$/.test(n._def.type);

            if (labelShown) {
                if (n.l === false || (isLink && !n.hasOwnProperty('l'))) {
                    n.l = true;
                    modified = true;
                }
            } else {
                if ((!isLink && (!n.hasOwnProperty('l') || n.l === true)) || (isLink && n.l === true) ) {
                    n.l = false;
                    modified = true;
                }
            }
            if (modified) {
                historyEvents.push({
                    t: "edit",
                    node: n,
                    changed: n.changed,
                    changes: {
                        l: oldValue
                    }
                })
                n.changed = true;
                n.dirty = true;
                n.resize = true;
            }
        })

        if (historyEvents.length > 0) {
            RED.history.push({
                t: "multi",
                events: historyEvents,
                dirty: RED.nodes.dirty()
            })
            RED.nodes.dirty(true);
        }

        RED.view.redraw();


    }

    function selectFirstNode() {
        var canidates;
        var origin = {x:0, y:0};

        var activeGroup = RED.view.getActiveGroup();

        if (!activeGroup) {
            candidates = RED.view.getActiveNodes();
        } else {
            candidates = RED.group.getNodes(activeGroup,false);
            origin = activeGroup;
        }

        var distances = [];
        candidates.forEach(function(node) {
            var deltaX = node.x - origin.x;
            var deltaY = node.y - origin.x;
            var delta = deltaY*deltaY + deltaX*deltaX;
            distances.push({node: node, delta: delta})
        });
        if (distances.length > 0) {
            distances.sort(function(A,B) {
                return A.delta - B.delta
            })
            var newNode = distances[0].node;
            if (newNode) {
                RED.view.select({nodes:[newNode]});
                RED.view.reveal(newNode.id,false);
            }
        }
    }

    function gotoNextNode() {
        var selection = RED.view.selection();
        if (selection.nodes && selection.nodes.length === 1) {
            var origin = selection.nodes[0];
            var links = RED.nodes.filterLinks({source:origin});
            if (links.length > 0) {
                links.sort(function(A,B) {
                    return Math.abs(A.target.y - origin.y) - Math.abs(B.target.y - origin.y)
                })
                var newNode = links[0].target;
                if (newNode) {
                    RED.view.select({nodes:[newNode]});
                    RED.view.reveal(newNode.id,false);
                }
            }
        } else if (RED.workspaces.selection().length === 0) {
            selectFirstNode();
        }
    }
    function gotoPreviousNode() {
        var selection = RED.view.selection();
        if (selection.nodes && selection.nodes.length === 1) {
            var origin = selection.nodes[0];
            var links = RED.nodes.filterLinks({target:origin});
            if (links.length > 0) {
                links.sort(function(A,B) {
                    return Math.abs(A.source.y - origin.y) - Math.abs(B.source.y - origin.y)
                })
                var newNode = links[0].source;
                if (newNode) {
                    RED.view.select({nodes:[newNode]});
                    RED.view.reveal(newNode.id,false);
                }
            }
        } else if (RED.workspaces.selection().length === 0) {
            selectFirstNode();
        }
    }

    function getChildren(node) {
        return RED.nodes.filterLinks({source:node}).map(function(l) { return l.target})
    }
    function getParents(node) {
        return RED.nodes.filterLinks({target:node}).map(function(l) { return l.source})
    }

    function getSiblings(node) {
        var siblings = new Set();
        var parents = getParents(node);
        parents.forEach(function(p) {
            getChildren(p).forEach(function(c) { siblings.add(c) })
        });
        var children = getChildren(node);
        children.forEach(function(p) {
            getParents(p).forEach(function(c) { siblings.add(c) })
        });
        siblings.delete(node);
        return Array.from(siblings);
    }
    function gotoNextSibling() {
        // 'next' defined as nearest on the y-axis below this node
        var selection = RED.view.selection();
        if (selection.nodes && selection.nodes.length === 1) {
            var origin = selection.nodes[0];
            var siblings = getSiblings(origin);
            if (siblings.length > 0) {
                siblings = siblings.filter(function(n) { return n.y > origin. y})
                siblings.sort(function(A,B) {
                    return Math.abs(A.y - origin.y) - Math.abs(B.y - origin.y)
                })
                var newNode = siblings[0];
                if (newNode) {
                    RED.view.select({nodes:[newNode]});
                    RED.view.reveal(newNode.id,false);
                }
            }
        } else if (RED.workspaces.selection().length === 0) {
            selectFirstNode();
        }
    }
    function gotoPreviousSibling() {
        // 'next' defined as nearest on the y-axis above this node
        var selection = RED.view.selection();
        if (selection.nodes && selection.nodes.length === 1) {
            var origin = selection.nodes[0];
            var siblings = getSiblings(origin);
            if (siblings.length > 0) {
                siblings = siblings.filter(function(n) { return n.y < origin. y})
                siblings.sort(function(A,B) {
                    return Math.abs(A.y - origin.y) - Math.abs(B.y - origin.y)
                })
                var newNode = siblings[0];
                if (newNode) {
                    RED.view.select({nodes:[newNode]});
                    RED.view.reveal(newNode.id,false);
                }
            }
        } else if (RED.workspaces.selection().length === 0) {
            selectFirstNode();
        }

    }

    function addNode() {
        var selection = RED.view.selection();
        if (selection.nodes && selection.nodes.length === 1 && selection.nodes[0].outputs > 0) {
            var selectedNode = selection.nodes[0];
            RED.view.showQuickAddDialog([
                selectedNode.x + selectedNode.w + 50,selectedNode.y
            ])
        } else {
            RED.view.showQuickAddDialog();
        }
    }


    function gotoNearestNode(direction) {
        var selection = RED.view.selection();
        if (selection.nodes && selection.nodes.length === 1) {
            var origin = selection.nodes[0];

            var candidates = RED.nodes.filterNodes({z:origin.z});
            candidates = candidates.concat(RED.view.getSubflowPorts());
            var distances = [];
            candidates.forEach(function(node) {
                if (node === origin) {
                    return;
                }
                var deltaX = node.x - origin.x;
                var deltaY = node.y - origin.y;
                var delta = deltaY*deltaY + deltaX*deltaX;
                var angle = (180/Math.PI)*Math.atan2(deltaY,deltaX);
                if (angle < 0) { angle += 360 }
                if (angle > 360) { angle -= 360 }

                var weight;

                // 0 - right
                // 270 - above
                // 90 - below
                // 180 - left
                switch(direction) {
                    case 'up': if (angle < 210 || angle > 330) { return }
                        weight = Math.max(Math.abs(270 - angle)/60, 0.2);
                        break;
                    case 'down': if (angle < 30 || angle > 150) { return }
                        weight = Math.max(Math.abs(90 - angle)/60, 0.2);
                        break;
                    case 'left': if (angle < 140 || angle > 220) { return }
                        weight = Math.max(Math.abs(180 - angle)/40, 0.1 );
                        break;
                    case 'right': if (angle > 40 && angle < 320) { return }
                        weight = Math.max(Math.abs(angle)/40, 0.1);
                        break;
                }
                weight = Math.max(weight,0.1);
                distances.push({
                    node: node,
                    d: delta,
                    w: weight,
                    delta: delta*weight
                })
            })
            if (distances.length > 0) {
                distances.sort(function(A,B) {
                    return A.delta - B.delta
                })
                var newNode = distances[0].node;
                if (newNode) {
                    RED.view.select({nodes:[newNode]});
                    RED.view.reveal(newNode.id,false);
                }
            }
        } else if (RED.workspaces.selection().length === 0) {
            var candidates = RED.view.getActiveNodes();

            var distances = [];
            candidates.forEach(function(node) {
                var deltaX = node.x;
                var deltaY = node.y;
                var delta = deltaY*deltaY + deltaX*deltaX;
                distances.push({node: node, delta: delta})
            });
            if (distances.length > 0) {
                distances.sort(function(A,B) {
                    return A.delta - B.delta
                })
                var newNode = distances[0].node;
                if (newNode) {
                    RED.view.select({nodes:[newNode]});
                    RED.view.reveal(newNode.id,false);
                }
            }
        }


    }


    return {
        init: function() {
            RED.actions.add("core:show-selected-node-labels", function() { setSelectedNodeLabelState(true); })
            RED.actions.add("core:hide-selected-node-labels", function() { setSelectedNodeLabelState(false); })

            RED.actions.add("core:align-selection-to-grid", alignToGrid);

            RED.actions.add("core:scroll-view-up", function() { RED.view.scroll(0,-RED.view.gridSize());});
            RED.actions.add("core:scroll-view-right", function() { RED.view.scroll(RED.view.gridSize(),0);});
            RED.actions.add("core:scroll-view-down", function() { RED.view.scroll(0,RED.view.gridSize());});
            RED.actions.add("core:scroll-view-left", function() { RED.view.scroll(-RED.view.gridSize(),0);});

            RED.actions.add("core:step-view-up", function() { RED.view.scroll(0,-5*RED.view.gridSize());});
            RED.actions.add("core:step-view-right", function() { RED.view.scroll(5*RED.view.gridSize(),0);});
            RED.actions.add("core:step-view-down", function() { RED.view.scroll(0,5*RED.view.gridSize());});
            RED.actions.add("core:step-view-left", function() { RED.view.scroll(-5*RED.view.gridSize(),0);});

            RED.actions.add("core:move-selection-up", function() { moveSelection(0,-1);});
            RED.actions.add("core:move-selection-right", function() { moveSelection(1,0);});
            RED.actions.add("core:move-selection-down", function() { moveSelection(0,1);});
            RED.actions.add("core:move-selection-left", function() { moveSelection(-1,0);});

            RED.actions.add("core:step-selection-up", function() { moveSelection(0,-RED.view.gridSize());});
            RED.actions.add("core:step-selection-right", function() { moveSelection(RED.view.gridSize(),0);});
            RED.actions.add("core:step-selection-down", function() { moveSelection(0,RED.view.gridSize());});
            RED.actions.add("core:step-selection-left", function() { moveSelection(-RED.view.gridSize(),0);});

            RED.actions.add("core:select-connected-nodes", function() { selectConnected("all") });
            RED.actions.add("core:select-downstream-nodes", function() { selectConnected("down") });
            RED.actions.add("core:select-upstream-nodes", function() { selectConnected("up") });


            RED.actions.add("core:go-to-next-node", function() { gotoNextNode() })
            RED.actions.add("core:go-to-previous-node", function() { gotoPreviousNode() })
            RED.actions.add("core:go-to-next-sibling", function() { gotoNextSibling() })
            RED.actions.add("core:go-to-previous-sibling", function() { gotoPreviousSibling() })


            RED.actions.add("core:go-to-nearest-node-on-left", function() { gotoNearestNode('left')})
            RED.actions.add("core:go-to-nearest-node-on-right", function() { gotoNearestNode('right')})
            RED.actions.add("core:go-to-nearest-node-above", function() { gotoNearestNode('up') })
            RED.actions.add("core:go-to-nearest-node-below", function() { gotoNearestNode('down') })
            // RED.actions.add("core:add-node", function() { addNode() })
        },
        /**
         * Aligns all selected nodes to the current grid
         */
        alignSelectionToGrid: alignToGrid,
        /**
         * Moves all of the selected nodes by the specified amount
         * @param  {Number} dx
         * @param  {Number} dy
         */
        moveSelection: moveSelection
    }

})();
