/**
 * Copyright 2013, 2014 IBM Corp.
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


RED.view = (function() {
    var space_width = 5000,
        space_height = 5000,
        lineCurveScale = 0.75,
        scaleFactor = 1,
        node_width = 100,
        node_height = 30;

    var touchLongPressTimeout = 1000,
        startTouchDistance = 0,
        startTouchCenter = [],
        moveTouchCenter = [],
        touchStartTime = 0;


    var activeWorkspace = 0;
    var activeSubflow = null;
    
    var workspaceScrollPositions = {};

    var selected_link = null,
        mousedown_link = null,
        mousedown_node = null,
        mousedown_port_type = null,
        mousedown_port_index = 0,
        mouseup_node = null,
        mouse_offset = [0,0],
        mouse_position = null,
        mouse_mode = 0,
        moving_set = [],
        dirty = false,
        lasso = null,
        showStatus = false,
        lastClickNode = null,
        dblClickPrimed = null,
        clickTime = 0,
        clickElapsed = 0;

    var clipboard = "";

    var status_colours = {
        "red":    "#c00",
        "green":  "#5a8",
        "yellow": "#F9DF31",
        "blue":   "#53A3F3",
        "grey":   "#d3d3d3"
    }

    var outer = d3.select("#chart")
        .append("svg:svg")
        .attr("width", space_width)
        .attr("height", space_height)
        .attr("pointer-events", "all")
        .style("cursor","crosshair");

     var vis = outer
        .append('svg:g')
        .on("dblclick.zoom", null)
        .append('svg:g')
        .on("mousemove", canvasMouseMove)
        .on("mousedown", canvasMouseDown)
        .on("mouseup", canvasMouseUp)
        .on("touchend", function() {
            clearTimeout(touchStartTime);
            touchStartTime = null;
            if  (RED.touch.radialMenu.active()) {
                return;
            }
            if (lasso) {
                outer_background.attr("fill","#fff");
            }
            canvasMouseUp.call(this);
        })
        .on("touchcancel", canvasMouseUp)
        .on("touchstart", function() {
            var touch0;
            if (d3.event.touches.length>1) {
                clearTimeout(touchStartTime);
                touchStartTime = null;
                d3.event.preventDefault();
                touch0 = d3.event.touches.item(0);
                var touch1 = d3.event.touches.item(1);
                var a = touch0['pageY']-touch1['pageY'];
                var b = touch0['pageX']-touch1['pageX'];

                var offset = $("#chart").offset();
                var scrollPos = [$("#chart").scrollLeft(),$("#chart").scrollTop()];
                startTouchCenter = [
                    (touch1['pageX']+(b/2)-offset.left+scrollPos[0])/scaleFactor,
                    (touch1['pageY']+(a/2)-offset.top+scrollPos[1])/scaleFactor
                ];
                moveTouchCenter = [
                    touch1['pageX']+(b/2),
                    touch1['pageY']+(a/2)
                ]
                startTouchDistance = Math.sqrt((a*a)+(b*b));
            } else {
                var obj = d3.select(document.body);
                touch0 = d3.event.touches.item(0);
                var pos = [touch0.pageX,touch0.pageY];
                startTouchCenter = [touch0.pageX,touch0.pageY];
                startTouchDistance = 0;
                var point = d3.touches(this)[0];
                touchStartTime = setTimeout(function() {
                    touchStartTime = null;
                    showTouchMenu(obj,pos);
                    //lasso = vis.append('rect')
                    //    .attr("ox",point[0])
                    //    .attr("oy",point[1])
                    //    .attr("rx",2)
                    //    .attr("ry",2)
                    //    .attr("x",point[0])
                    //    .attr("y",point[1])
                    //    .attr("width",0)
                    //    .attr("height",0)
                    //    .attr("class","lasso");
                    //outer_background.attr("fill","#e3e3f3");
                },touchLongPressTimeout);
            }
        })
        .on("touchmove", function(){
                if  (RED.touch.radialMenu.active()) {
                    d3.event.preventDefault();
                    return;
                }
                var touch0;
                if (d3.event.touches.length<2) {
                    if (touchStartTime) {
                        touch0 = d3.event.touches.item(0);
                        var dx = (touch0.pageX-startTouchCenter[0]);
                        var dy = (touch0.pageY-startTouchCenter[1]);
                        var d = Math.abs(dx*dx+dy*dy);
                        if (d > 64) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                        }
                    } else if (lasso) {
                        d3.event.preventDefault();
                    }
                    canvasMouseMove.call(this);
                } else {
                    touch0 = d3.event.touches.item(0);
                    var touch1 = d3.event.touches.item(1);
                    var a = touch0['pageY']-touch1['pageY'];
                    var b = touch0['pageX']-touch1['pageX'];
                    var offset = $("#chart").offset();
                    var scrollPos = [$("#chart").scrollLeft(),$("#chart").scrollTop()];
                    var moveTouchDistance = Math.sqrt((a*a)+(b*b));
                    var touchCenter = [
                        touch1['pageX']+(b/2),
                        touch1['pageY']+(a/2)
                    ];

                    if (!isNaN(moveTouchDistance)) {
                        oldScaleFactor = scaleFactor;
                        scaleFactor = Math.min(2,Math.max(0.3, scaleFactor + (Math.floor(((moveTouchDistance*100)-(startTouchDistance*100)))/10000)));

                        var deltaTouchCenter = [                             // Try to pan whilst zooming - not 100%
                            startTouchCenter[0]*(scaleFactor-oldScaleFactor),//-(touchCenter[0]-moveTouchCenter[0]),
                            startTouchCenter[1]*(scaleFactor-oldScaleFactor) //-(touchCenter[1]-moveTouchCenter[1])
                        ];

                        startTouchDistance = moveTouchDistance;
                        moveTouchCenter = touchCenter;

                        $("#chart").scrollLeft(scrollPos[0]+deltaTouchCenter[0]);
                        $("#chart").scrollTop(scrollPos[1]+deltaTouchCenter[1]);
                        redraw();
                    }
                }
        });

    var outer_background = vis.append('svg:rect')
        .attr('width', space_width)
        .attr('height', space_height)
        .attr('fill','#fff');

    //var gridScale = d3.scale.linear().range([0,2000]).domain([0,2000]);
    //var grid = vis.append('g');
    //
    //grid.selectAll("line.horizontal").data(gridScale.ticks(100)).enter()
    //    .append("line")
    //        .attr(
    //        {
    //            "class":"horizontal",
    //            "x1" : 0,
    //            "x2" : 2000,
    //            "y1" : function(d){ return gridScale(d);},
    //            "y2" : function(d){ return gridScale(d);},
    //            "fill" : "none",
    //            "shape-rendering" : "crispEdges",
    //            "stroke" : "#eee",
    //            "stroke-width" : "1px"
    //        });
    //grid.selectAll("line.vertical").data(gridScale.ticks(100)).enter()
    //    .append("line")
    //        .attr(
    //        {
    //            "class":"vertical",
    //            "y1" : 0,
    //            "y2" : 2000,
    //            "x1" : function(d){ return gridScale(d);},
    //            "x2" : function(d){ return gridScale(d);},
    //            "fill" : "none",
    //            "shape-rendering" : "crispEdges",
    //            "stroke" : "#eee",
    //            "stroke-width" : "1px"
    //        });


    var drag_line = vis.append("svg:path").attr("class", "drag_line");

    $("#workspace-subflow-edit").click(function(event) {
        showSubflowDialog(activeSubflow.id);
        event.preventDefault();
    });
    $("#workspace-subflow-add-input").click(function(event) {
        event.preventDefault();
        if ($(this).hasClass("disabled")) {
            return;
        }
        addSubflowInput(activeSubflow.id);
    });
    $("#workspace-subflow-add-output").click(function(event) {
        event.preventDefault();
        if ($(this).hasClass("disabled")) {
            return;
        }
        addSubflowOutput(activeSubflow.id);
    });
    
    $("#workspace-subflow-delete").click(function(event) {
        event.preventDefault();
        var removedNodes = [];
        var removedLinks = [];
        var startDirty = RED.view.dirty();
        
        RED.nodes.eachNode(function(n) {
            if (n.type == "subflow:"+activeSubflow.id) {
                removedNodes.push(n);
            }
            if (n.z == activeSubflow.id) {
                removedNodes.push(n);
            }
        });
        
        for (var i=0;i<removedNodes.length;i++) {
            var rmlinks = RED.nodes.remove(removedNodes[i].id);
            removedLinks = removedLinks.concat(rmlinks);
        }
        
        RED.nodes.removeSubflow(activeSubflow);
        
        RED.history.push({
                t:'delete',
                nodes:removedNodes,
                links:removedLinks,
                subflow: activeSubflow,
                dirty:startDirty
        });
        
        RED.view.removeWorkspace(activeSubflow);
        RED.view.dirty(true);
        RED.view.redraw();
    });
    
    var workspace_tabs = RED.tabs.create({
        id: "workspace-tabs",
        onchange: function(tab) {
            if (tab.type == "subflow") {
                $("#workspace-toolbar").show();
            } else {
                $("#workspace-toolbar").hide();
            }
            var chart = $("#chart");
            if (activeWorkspace !== 0) {
                workspaceScrollPositions[activeWorkspace] = {
                    left:chart.scrollLeft(),
                    top:chart.scrollTop()
                };
            }
            var scrollStartLeft = chart.scrollLeft();
            var scrollStartTop = chart.scrollTop();

            activeWorkspace = tab.id;
            activeSubflow = RED.nodes.subflow(activeWorkspace);
            if (activeSubflow) {
                $("#workspace-subflow-add-input").toggleClass("disabled",activeSubflow.in.length > 0);
            }
            if (workspaceScrollPositions[activeWorkspace]) {
                chart.scrollLeft(workspaceScrollPositions[activeWorkspace].left);
                chart.scrollTop(workspaceScrollPositions[activeWorkspace].top);
            } else {
                chart.scrollLeft(0);
                chart.scrollTop(0);
            }
            var scrollDeltaLeft = chart.scrollLeft() - scrollStartLeft;
            var scrollDeltaTop = chart.scrollTop() - scrollStartTop;
            if (mouse_position != null) {
                mouse_position[0] += scrollDeltaLeft;
                mouse_position[1] += scrollDeltaTop;
            }
            
            RED.menu.setDisabled("btn-workspace-edit", activeSubflow);
            RED.menu.setDisabled("btn-workspace-delete",workspace_tabs.count() == 1 || activeSubflow);

            clearSelection();
            RED.nodes.eachNode(function(n) {
                    n.dirty = true;
            });
            redraw();
        },
        ondblclick: function(tab) {
            if (tab.type != "subflow") {
                showRenameWorkspaceDialog(tab.id);
            } else {
                showSubflowDialog(tab.id);
            }
        },
        onadd: function(tab) {
            RED.menu.addItem("btn-workspace-menu",{
                id:"btn-workspace-menu-"+tab.id.replace(".","-"),
                label:tab.label,
                onselect:function() {
                    workspace_tabs.activateTab(tab.id);
                }
            });
            RED.menu.setDisabled("btn-workspace-delete",workspace_tabs.count() == 1);
        },
        onremove: function(tab) {
            RED.menu.setDisabled("btn-workspace-delete",workspace_tabs.count() == 1);
            RED.menu.removeItem("btn-workspace-menu-"+tab.id.replace(".","-"));
        }
    });

    var workspaceIndex = 0;

    function addWorkspace() {
        var tabId = RED.nodes.id();
        do {
            workspaceIndex += 1;
        } while($("#workspace-tabs a[title='Sheet "+workspaceIndex+"']").size() !== 0);

        var ws = {type:"tab",id:tabId,label:"Sheet "+workspaceIndex};
        RED.nodes.addWorkspace(ws);
        workspace_tabs.addTab(ws);
        workspace_tabs.activateTab(tabId);
        RED.history.push({t:'add',workspaces:[ws],dirty:dirty});
        RED.view.dirty(true);
    }
    
    function init() {
        $('#btn-workspace-add-tab').on("click",addWorkspace);
        
        RED.menu.setAction('btn-workspace-add',addWorkspace);
        RED.menu.setAction('btn-workspace-edit',function() {
            showRenameWorkspaceDialog(activeWorkspace);
        });
        RED.menu.setAction('btn-workspace-delete',function() {
            deleteWorkspace(activeWorkspace);
        });
    }

    function deleteWorkspace(id) {
        if (workspace_tabs.count() == 1) {
            return;
        }
        var ws = RED.nodes.workspace(id);
        $( "#node-dialog-delete-workspace" ).dialog('option','workspace',ws);
        $( "#node-dialog-delete-workspace-name" ).text(ws.label);
        $( "#node-dialog-delete-workspace" ).dialog('open');
    }

    function canvasMouseDown() {
        if (!mousedown_node && !mousedown_link) {
            selected_link = null;
            updateSelection();
        }
        if (mouse_mode === 0) {
            if (lasso) {
                lasso.remove();
                lasso = null;
            }

            if (!touchStartTime) {
                var point = d3.mouse(this);
                lasso = vis.append('rect')
                    .attr("ox",point[0])
                    .attr("oy",point[1])
                    .attr("rx",2)
                    .attr("ry",2)
                    .attr("x",point[0])
                    .attr("y",point[1])
                    .attr("width",0)
                    .attr("height",0)
                    .attr("class","lasso");
                d3.event.preventDefault();
            }
        }
    }

    function canvasMouseMove() {
        mouse_position = d3.touches(this)[0]||d3.mouse(this);
        // Prevent touch scrolling...
        //if (d3.touches(this)[0]) {
        //    d3.event.preventDefault();
        //}

        // TODO: auto scroll the container
        //var point = d3.mouse(this);
        //if (point[0]-container.scrollLeft < 30 && container.scrollLeft > 0) { container.scrollLeft -= 15; }
        //console.log(d3.mouse(this),container.offsetWidth,container.offsetHeight,container.scrollLeft,container.scrollTop);

        if (lasso) {
            var ox = parseInt(lasso.attr("ox"));
            var oy = parseInt(lasso.attr("oy"));
            var x = parseInt(lasso.attr("x"));
            var y = parseInt(lasso.attr("y"));
            var w;
            var h;
            if (mouse_position[0] < ox) {
                x = mouse_position[0];
                w = ox-x;
            } else {
                w = mouse_position[0]-x;
            }
            if (mouse_position[1] < oy) {
                y = mouse_position[1];
                h = oy-y;
            } else {
                h = mouse_position[1]-y;
            }
            lasso
                .attr("x",x)
                .attr("y",y)
                .attr("width",w)
                .attr("height",h)
            ;
            return;
        }

        if (mouse_mode != RED.state.IMPORT_DRAGGING && !mousedown_node && selected_link == null) {
            return;
        }

        var mousePos;
        if (mouse_mode == RED.state.JOINING) {
            // update drag line
            drag_line.attr("class", "drag_line");
            mousePos = mouse_position;
            var numOutputs = (mousedown_port_type === 0)?(mousedown_node.outputs || 1):1;
            var sourcePort = mousedown_port_index;
            var portY = -((numOutputs-1)/2)*13 +13*sourcePort;

            var sc = (mousedown_port_type === 0)?1:-1;

            var dy = mousePos[1]-(mousedown_node.y+portY);
            var dx = mousePos[0]-(mousedown_node.x+sc*mousedown_node.w/2);
            var delta = Math.sqrt(dy*dy+dx*dx);
            var scale = lineCurveScale;
            var scaleY = 0;

            if (delta < node_width) {
                scale = 0.75-0.75*((node_width-delta)/node_width);
            }
            if (dx*sc < 0) {
                scale += 2*(Math.min(5*node_width,Math.abs(dx))/(5*node_width));
                if (Math.abs(dy) < 3*node_height) {
                    scaleY = ((dy>0)?0.5:-0.5)*(((3*node_height)-Math.abs(dy))/(3*node_height))*(Math.min(node_width,Math.abs(dx))/(node_width)) ;
                }
            }

            drag_line.attr("d",
                "M "+(mousedown_node.x+sc*mousedown_node.w/2)+" "+(mousedown_node.y+portY)+
                " C "+(mousedown_node.x+sc*(mousedown_node.w/2+node_width*scale))+" "+(mousedown_node.y+portY+scaleY*node_height)+" "+
                (mousePos[0]-sc*(scale)*node_width)+" "+(mousePos[1]-scaleY*node_height)+" "+
                mousePos[0]+" "+mousePos[1]
                );
            d3.event.preventDefault();
        } else if (mouse_mode == RED.state.MOVING) {
            mousePos = d3.mouse(document.body);
            if (isNaN(mousePos[0])) {
                mousePos = d3.touches(document.body)[0];
            }
            var d = (mouse_offset[0]-mousePos[0])*(mouse_offset[0]-mousePos[0]) + (mouse_offset[1]-mousePos[1])*(mouse_offset[1]-mousePos[1]);
            if (d > 3) {
                mouse_mode = RED.state.MOVING_ACTIVE;
                clickElapsed = 0;
            }
        } else if (mouse_mode == RED.state.MOVING_ACTIVE || mouse_mode == RED.state.IMPORT_DRAGGING) {
            mousePos = mouse_position;
            var node;
            var i;
            var minX = 0;
            var minY = 0;
            for (var n = 0; n<moving_set.length; n++) {
                node = moving_set[n];
                if (d3.event.shiftKey) {
                    node.n.ox = node.n.x;
                    node.n.oy = node.n.y;
                }
                node.n.x = mousePos[0]+node.dx;
                node.n.y = mousePos[1]+node.dy;
                node.n.dirty = true;
                minX = Math.min(node.n.x-node.n.w/2-5,minX);
                minY = Math.min(node.n.y-node.n.h/2-5,minY);
            }
            if (minX !== 0 || minY !== 0) {
                for (i = 0; i<moving_set.length; i++) {
                    node = moving_set[i];
                    node.n.x -= minX;
                    node.n.y -= minY;
                }
            }
            if (d3.event.shiftKey && moving_set.length > 0) {
                var gridOffset =  [0,0];
                node = moving_set[0];
                gridOffset[0] = node.n.x-(20*Math.floor((node.n.x-node.n.w/2)/20)+node.n.w/2);
                gridOffset[1] = node.n.y-(20*Math.floor(node.n.y/20));
                if (gridOffset[0] !== 0 || gridOffset[1] !== 0) {
                    for (i = 0; i<moving_set.length; i++) {
                        node = moving_set[i];
                        node.n.x -= gridOffset[0];
                        node.n.y -= gridOffset[1];
                        if (node.n.x == node.n.ox && node.n.y == node.n.oy) {
                            node.dirty = false;
                        }
                    }
                }
            }
        }
        if (mouse_mode !== 0) {
            redraw();
        }
    }

    function canvasMouseUp() {
        if (mousedown_node && mouse_mode == RED.state.JOINING) {
            drag_line.attr("class", "drag_line_hidden");
        }
        if (lasso) {
            var x = parseInt(lasso.attr("x"));
            var y = parseInt(lasso.attr("y"));
            var x2 = x+parseInt(lasso.attr("width"));
            var y2 = y+parseInt(lasso.attr("height"));
            if (!d3.event.ctrlKey) {
                clearSelection();
            }
            RED.nodes.eachNode(function(n) {
                if (n.z == activeWorkspace && !n.selected) {
                    n.selected = (n.x > x && n.x < x2 && n.y > y && n.y < y2);
                    if (n.selected) {
                        n.dirty = true;
                        moving_set.push({n:n});
                    }
                }
            });
            if (activeSubflow) {
                activeSubflow.in.forEach(function(n) {
                    n.selected = (n.x > x && n.x < x2 && n.y > y && n.y < y2);
                    if (n.selected) {
                        n.dirty = true;
                        moving_set.push({n:n});
                    }
                });
                activeSubflow.out.forEach(function(n) {
                    n.selected = (n.x > x && n.x < x2 && n.y > y && n.y < y2);
                    if (n.selected) {
                        n.dirty = true;
                        moving_set.push({n:n});
                    }
                });
            }
            updateSelection();
            lasso.remove();
            lasso = null;
        } else if (mouse_mode == RED.state.DEFAULT && mousedown_link == null && !d3.event.ctrlKey ) {
            clearSelection();
            updateSelection();
        }
        if (mouse_mode == RED.state.MOVING_ACTIVE) {
            if (moving_set.length > 0) {
                var ns = [];
                for (var j=0;j<moving_set.length;j++) {
                    ns.push({n:moving_set[j].n,ox:moving_set[j].ox,oy:moving_set[j].oy});
                }
                RED.history.push({t:'move',nodes:ns,dirty:dirty});
            }
        }
        if (mouse_mode == RED.state.MOVING || mouse_mode == RED.state.MOVING_ACTIVE) {
            for (var i=0;i<moving_set.length;i++) {
                delete moving_set[i].ox;
                delete moving_set[i].oy;
            }
        }
        if (mouse_mode == RED.state.IMPORT_DRAGGING) {
            RED.keyboard.remove(/* ESCAPE */ 27);
            setDirty(true);
        }
        redraw();
        // clear mouse event vars
        resetMouseVars();
    }

    $('#btn-zoom-out').click(function() {zoomOut();});
    $('#btn-zoom-zero').click(function() {zoomZero();});
    $('#btn-zoom-in').click(function() {zoomIn();});
    $("#chart").on('DOMMouseScroll mousewheel', function (evt) {
        if ( evt.altKey ) {
            evt.preventDefault();
            evt.stopPropagation();
            var move = -(evt.originalEvent.detail) || evt.originalEvent.wheelDelta;
            if (move <= 0) { zoomOut(); }
            else { zoomIn(); }
        }
    });
    
    $("#chart").droppable({
            accept:".palette_node",
            drop: function( event, ui ) {
                d3.event = event;
                var selected_tool = ui.draggable[0].type;
                
                var m = /^subflow:(.+)$/.exec(selected_tool);
                
                if (activeSubflow && m) {
                    var subflowId = m[1];
                    if (subflowId === activeSubflow.id) {
                        RED.notify("<strong>Error</strong>: Cannot add subflow to itself","error");
                        return;
                    }
                    if (RED.nodes.subflowContains(m[1],activeSubflow.id)) {
                        RED.notify("<strong>Error</strong>: Cannot add subflow - circular reference detected","error");
                        return;
                    }
                    
                }
                
                var mousePos = d3.touches(this)[0]||d3.mouse(this);
                mousePos[1] += this.scrollTop;
                mousePos[0] += this.scrollLeft;
                mousePos[1] /= scaleFactor;
                mousePos[0] /= scaleFactor;

                var nn = { id:(1+Math.random()*4294967295).toString(16),x: mousePos[0],y:mousePos[1],w:node_width,z:activeWorkspace};

                nn.type = selected_tool;
                nn._def = RED.nodes.getType(nn.type);

                if (!m) {
                    nn.inputs = nn._def.inputs || 0;
                    nn.outputs = nn._def.outputs;
                    nn.changed = true;
    
                    for (var d in nn._def.defaults) {
                        if (nn._def.defaults.hasOwnProperty(d)) {
                            nn[d] = nn._def.defaults[d].value;
                        }
                    }
    
                    if (nn._def.onadd) {
                        nn._def.onadd.call(nn);
                    }
                } else {
                    var subflow = RED.nodes.subflow(m[1]);
                    nn.inputs = subflow.in.length;
                    nn.outputs = subflow.out.length;
                }

                nn.h = Math.max(node_height,(nn.outputs||0) * 15);
                RED.history.push({t:'add',nodes:[nn.id],dirty:dirty});
                RED.nodes.add(nn);
                RED.editor.validateNode(nn);
                setDirty(true);
                // auto select dropped node - so info shows (if visible)
                clearSelection();
                nn.selected = true;
                moving_set.push({n:nn});
                updateSelection();
                redraw();

                if (nn._def.autoedit) {
                    RED.editor.edit(nn);
                }
            }
    });

    function zoomIn() {
        if (scaleFactor < 2) {
            scaleFactor += 0.1;
            redraw();
        }
    }
    function zoomOut() {
        if (scaleFactor > 0.3) {
            scaleFactor -= 0.1;
            redraw();
        }
    }
    function zoomZero() {
        scaleFactor = 1;
        redraw();
    }

    function selectAll() {
        RED.nodes.eachNode(function(n) {
            if (n.z == activeWorkspace) {
                if (!n.selected) {
                    n.selected = true;
                    n.dirty = true;
                    moving_set.push({n:n});
                }
            }
        });
        if (activeSubflow) {
            activeSubflow.in.forEach(function(n) {
                if (!n.selected) {
                    n.selected = true;
                    n.dirty = true;
                    moving_set.push({n:n});
                }
            });
            activeSubflow.out.forEach(function(n) {
                if (!n.selected) {
                    n.selected = true;
                    n.dirty = true;
                    moving_set.push({n:n});
                }
            });
        }
        
        selected_link = null;
        updateSelection();
        redraw();
    }

    function clearSelection() {
        for (var i=0;i<moving_set.length;i++) {
            var n = moving_set[i];
            n.n.dirty = true;
            n.n.selected = false;
        }
        moving_set = [];
        selected_link = null;
    }

    function updateSelection() {
        if (moving_set.length === 0) {
            RED.menu.setDisabled("btn-export-menu",true);
            RED.menu.setDisabled("btn-export-clipboard",true);
            RED.menu.setDisabled("btn-export-library",true);
            RED.menu.setDisabled("btn-convert-subflow",true);
        } else {
            RED.menu.setDisabled("btn-export-menu",false);
            RED.menu.setDisabled("btn-export-clipboard",false);
            RED.menu.setDisabled("btn-export-library",false);
            RED.menu.setDisabled("btn-convert-subflow",false);
        }
        if (moving_set.length === 0 && selected_link == null) {
            RED.keyboard.remove(/* backspace */ 8);
            RED.keyboard.remove(/* delete */ 46);
            RED.keyboard.remove(/* c */ 67);
            RED.keyboard.remove(/* x */ 88);
        } else {
            RED.keyboard.add(/* backspace */ 8,function(){deleteSelection();d3.event.preventDefault();});
            RED.keyboard.add(/* delete */ 46,function(){deleteSelection();d3.event.preventDefault();});
            RED.keyboard.add(/* c */ 67,{ctrl:true},function(){copySelection();d3.event.preventDefault();});
            RED.keyboard.add(/* x */ 88,{ctrl:true},function(){copySelection();deleteSelection();d3.event.preventDefault();});
        }
        if (moving_set.length === 0) {
            RED.keyboard.remove(/* up   */ 38);
            RED.keyboard.remove(/* down */ 40);
            RED.keyboard.remove(/* left */ 37);
            RED.keyboard.remove(/* right*/ 39);
        } else {
            RED.keyboard.add(/* up   */ 38, function() { if(d3.event.shiftKey){moveSelection(  0,-20)}else{moveSelection( 0,-1);}d3.event.preventDefault();},endKeyboardMove);
            RED.keyboard.add(/* down */ 40, function() { if(d3.event.shiftKey){moveSelection(  0, 20)}else{moveSelection( 0, 1);}d3.event.preventDefault();},endKeyboardMove);
            RED.keyboard.add(/* left */ 37, function() { if(d3.event.shiftKey){moveSelection(-20,  0)}else{moveSelection(-1, 0);}d3.event.preventDefault();},endKeyboardMove);
            RED.keyboard.add(/* right*/ 39, function() { if(d3.event.shiftKey){moveSelection( 20,  0)}else{moveSelection( 1, 0);}d3.event.preventDefault();},endKeyboardMove);
        }
        if (moving_set.length == 1) {
            if (moving_set[0].n.type === "subflow" && moving_set[0].n.direction) {
                RED.sidebar.info.refresh(RED.nodes.subflow(moving_set[0].n.z));
            } else {
                RED.sidebar.info.refresh(moving_set[0].n);
            }
        } else if (moving_set.length === 0 && activeSubflow) {
            RED.sidebar.info.refresh(activeSubflow);
        } else {
            RED.sidebar.info.clear();
        }
    }
    function endKeyboardMove() {
        var ns = [];
        for (var i=0;i<moving_set.length;i++) {
            ns.push({n:moving_set[i].n,ox:moving_set[i].ox,oy:moving_set[i].oy});
            delete moving_set[i].ox;
            delete moving_set[i].oy;
        }
        RED.history.push({t:'move',nodes:ns,dirty:dirty});
    }
    function moveSelection(dx,dy) {
        var minX = 0;
        var minY = 0;
        var node;

        for (var i=0;i<moving_set.length;i++) {
            node = moving_set[i];
            if (node.ox == null && node.oy == null) {
                node.ox = node.n.x;
                node.oy = node.n.y;
            }
            node.n.x += dx;
            node.n.y += dy;
            node.n.dirty = true;
            minX = Math.min(node.n.x-node.n.w/2-5,minX);
            minY = Math.min(node.n.y-node.n.h/2-5,minY);
        }

        if (minX !== 0 || minY !== 0) {
            for (var n = 0; n<moving_set.length; n++) {
                node = moving_set[n];
                node.n.x -= minX;
                node.n.y -= minY;
            }
        }

        redraw();
    }
    function deleteSelection() {
        var removedNodes = [];
        var removedLinks = [];
        var removedSubflowOutputs = [];
        var removedSubflowInputs = [];
        
        var startDirty = dirty;
        if (moving_set.length > 0) {
            for (var i=0;i<moving_set.length;i++) {
                var node = moving_set[i].n;
                node.selected = false;
                if (node.type != "subflow") {
                    if (node.x < 0) {
                        node.x = 25
                    }
                    var rmlinks = RED.nodes.remove(node.id);
                    removedNodes.push(node);
                    removedLinks = removedLinks.concat(rmlinks);
                } else {
                    if (node.direction === "out") {
                        removedSubflowOutputs.push(node);
                    } else if (node.direction === "in") {
                        removedSubflowInputs.push(node);
                    }
                    node.dirty = true;
                }
            }
            if (removedSubflowOutputs.length > 0) {
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
            }
            // Assume 0/1 inputs
            if (removedSubflowInputs.length == 1) {
                var input = removedSubflowInputs[0];
                var subflowRemovedInputLinks = [];
                RED.nodes.eachLink(function(l) {
                    if (l.source.type == "subflow" && l.source.z == activeSubflow.id && l.source.i == input.i) {
                        subflowRemovedInputLinks.push(l);
                    } else if (l.target.type == "subflow:"+activeSubflow.id) {
                        subflowRemovedInputLinks.push(l);
                    }
                });
                subflowRemovedInputLinks.forEach(function(l) { RED.nodes.removeLink(l)});
                removedLinks = removedLinks.concat(subflowRemovedInputLinks);
                activeSubflow.in = [];
                $("#workspace-subflow-add-input").toggleClass("disabled",false);
            }
            
            if (activeSubflow) {
                RED.nodes.eachNode(function(n) {
                    if (n.type == "subflow:"+activeSubflow.id) {
                        n.changed = true;
                        n.inputs = activeSubflow.in.length;
                        n.outputs = activeSubflow.out.length;
                        while (n.outputs < n.ports.length) {
                            n.ports.pop();
                        }
                        n.resize = true;
                        n.dirty = true;
                    }
                });
            }
            
            moving_set = [];
            if (removedNodes.length > 0) {
                setDirty(true);
            }
        }
        if (selected_link) {
            RED.nodes.removeLink(selected_link);
            removedLinks.push(selected_link);
            setDirty(true);
        }
        RED.history.push({t:'delete',nodes:removedNodes,links:removedLinks,subflowOutputs:removedSubflowOutputs,subflowInputs:removedSubflowInputs,dirty:startDirty});

        selected_link = null;
        updateSelection();
        redraw();
    }

    function copySelection() {
        if (moving_set.length > 0) {
            var nns = [];
            for (var n=0;n<moving_set.length;n++) {
                var node = moving_set[n].n;
                if (node.type != "subflow") {
                    nns.push(RED.nodes.convertNode(node));
                }
            }
            clipboard = JSON.stringify(nns);
            RED.notify(nns.length+" node"+(nns.length>1?"s":"")+" copied");
        }
    }


    function calculateTextWidth(str, className, offset) {
        var sp = document.createElement("span");
        sp.className = className;
        sp.style.position = "absolute";
        sp.style.top = "-1000px";
        sp.innerHTML = (str||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
        document.body.appendChild(sp);
        var w = sp.offsetWidth;
        document.body.removeChild(sp);
        return offset+w;
    }

    function resetMouseVars() {
        mousedown_node = null;
        mouseup_node = null;
        mousedown_link = null;
        mouse_mode = 0;
        mousedown_port_type = 0;
    }

    function portMouseDown(d,portType,portIndex) {
        //console.log(d,portType,portIndex);
        // disable zoom
        //vis.call(d3.behavior.zoom().on("zoom"), null);
        mousedown_node = d;
        selected_link = null;
        mouse_mode = RED.state.JOINING;
        mousedown_port_type = portType;
        mousedown_port_index = portIndex || 0;
        document.body.style.cursor = "crosshair";
        d3.event.preventDefault();
    }

    function portMouseUp(d,portType,portIndex) {
        document.body.style.cursor = "";
        if (mouse_mode == RED.state.JOINING && mousedown_node) {
            if (typeof TouchEvent != "undefined" && d3.event instanceof TouchEvent) {
                RED.nodes.eachNode(function(n) {
                        if (n.z == activeWorkspace) {
                            var hw = n.w/2;
                            var hh = n.h/2;
                            if (n.x-hw<mouse_position[0] && n.x+hw> mouse_position[0] &&
                                n.y-hh<mouse_position[1] && n.y+hh>mouse_position[1]) {
                                    mouseup_node = n;
                                    portType = mouseup_node.inputs>0?1:0;
                                    portIndex = 0;
                            }
                        }
                });
            } else {
                mouseup_node = d;
            }
            if (portType == mousedown_port_type || mouseup_node === mousedown_node) {
                drag_line.attr("class", "drag_line_hidden");
                resetMouseVars();
                return;
            }
            var src,dst,src_port;
            if (mousedown_port_type === 0) {
                src = mousedown_node;
                src_port = mousedown_port_index;
                dst = mouseup_node;
            } else if (mousedown_port_type == 1) {
                src = mouseup_node;
                dst = mousedown_node;
                src_port = portIndex;
            }
            var existingLink = false;
            RED.nodes.eachLink(function(d) {
                existingLink = existingLink || (d.source === src && d.target === dst && d.sourcePort == src_port);
            });
            if (!existingLink) {
                var link = {source: src, sourcePort:src_port, target: dst};
                RED.nodes.addLink(link);
                RED.history.push({t:'add',links:[link],dirty:dirty});
                setDirty(true);
            } else {
            }
            selected_link = null;
            redraw();
        }
    }

    function nodeMouseUp(d) {
        if (dblClickPrimed && mousedown_node == d && clickElapsed > 0 && clickElapsed < 750) {
            mouse_mode = RED.state.DEFAULT;
            if (d.type != "subflow") {
                RED.editor.edit(d);
            } else {
                RED.editor.editSubflow(activeSubflow);
            }
            clickElapsed = 0;
            d3.event.stopPropagation();
            return;
        }
        var direction = d._def? (d.inputs > 0 ? 1: 0) : (d.direction == "in" ? 0: 1)
        portMouseUp(d, direction, 0);
    }

    function nodeMouseDown(d) {
        //var touch0 = d3.event;
        //var pos = [touch0.pageX,touch0.pageY];
        //RED.touch.radialMenu.show(d3.select(this),pos);
        if (mouse_mode == RED.state.IMPORT_DRAGGING) {
            RED.keyboard.remove(/* ESCAPE */ 27);
            updateSelection();
            setDirty(true);
            redraw();
            resetMouseVars();
            d3.event.stopPropagation();
            return;
        }
        mousedown_node = d;
        var now = Date.now();
        clickElapsed = now-clickTime;
        clickTime = now;

        dblClickPrimed = (lastClickNode == mousedown_node);
        lastClickNode = mousedown_node;

        var i;

        if (d.selected && d3.event.ctrlKey) {
            d.selected = false;
            for (i=0;i<moving_set.length;i+=1) {
                if (moving_set[i].n === d) {
                    moving_set.splice(i,1);
                    break;
                }
            }
        } else {
            if (d3.event.shiftKey) {
                clearSelection();
                var cnodes = RED.nodes.getAllFlowNodes(mousedown_node);
                for (var n=0;n<cnodes.length;n++) {
                    cnodes[n].selected = true;
                    cnodes[n].dirty = true;
                    moving_set.push({n:cnodes[n]});
                }
            } else if (!d.selected) {
                if (!d3.event.ctrlKey) {
                    clearSelection();
                }
                mousedown_node.selected = true;
                moving_set.push({n:mousedown_node});
            }
            selected_link = null;
            if (d3.event.button != 2) {
                mouse_mode = RED.state.MOVING;
                var mouse = d3.touches(this)[0]||d3.mouse(this);
                mouse[0] += d.x-d.w/2;
                mouse[1] += d.y-d.h/2;
                for (i=0;i<moving_set.length;i++) {
                    moving_set[i].ox = moving_set[i].n.x;
                    moving_set[i].oy = moving_set[i].n.y;
                    moving_set[i].dx = moving_set[i].n.x-mouse[0];
                    moving_set[i].dy = moving_set[i].n.y-mouse[1];
                }
                mouse_offset = d3.mouse(document.body);
                if (isNaN(mouse_offset[0])) {
                    mouse_offset = d3.touches(document.body)[0];
                }
            }
        }
        d.dirty = true;
        updateSelection();
        redraw();
        d3.event.stopPropagation();
    }

    function nodeButtonClicked(d) {
        if (d._def.button.toggle) {
            d[d._def.button.toggle] = !d[d._def.button.toggle];
            d.dirty = true;
        }
        if (d._def.button.onclick) {
            d._def.button.onclick.call(d);
        }
        if (d.dirty) {
            redraw();
        }
        d3.event.preventDefault();
    }

    function showTouchMenu(obj,pos) {
        var mdn = mousedown_node;
        var options = [];
        options.push({name:"delete",disabled:(moving_set.length===0),onselect:function() {deleteSelection();}});
        options.push({name:"cut",disabled:(moving_set.length===0),onselect:function() {copySelection();deleteSelection();}});
        options.push({name:"copy",disabled:(moving_set.length===0),onselect:function() {copySelection();}});
        options.push({name:"paste",disabled:(clipboard.length===0),onselect:function() {importNodes(clipboard,true);}});
        options.push({name:"edit",disabled:(moving_set.length != 1),onselect:function() { RED.editor.edit(mdn);}});
        options.push({name:"select",onselect:function() {selectAll();}});
        options.push({name:"undo",disabled:(RED.history.depth() === 0),onselect:function() {RED.history.pop();}});

        RED.touch.radialMenu.show(obj,pos,options);
        resetMouseVars();
    }
    function redraw() {
        vis.attr("transform","scale("+scaleFactor+")");
        outer.attr("width", space_width*scaleFactor).attr("height", space_height*scaleFactor);

        if (mouse_mode != RED.state.JOINING) {
            // Don't bother redrawing nodes if we're drawing links

            if (activeSubflow) {
                var subflowOutputs = vis.selectAll(".subflowoutput").data(activeSubflow.out,function(d,i){ return d.id;});
                subflowOutputs.exit().remove();
                var outGroup = subflowOutputs.enter().insert("svg:g").attr("class","node subflowoutput").attr("transform",function(d) { return "translate("+(d.x-20)+","+(d.y-20)+")"});
                outGroup.each(function(d,i) {
                    d.w=40;
                    d.h=40;
                });
                outGroup.append("rect").attr("class","subflowport").attr("rx",8).attr("ry",8).attr("width",40).attr("height",40)
                    // TODO: This is exactly the same set of handlers used for regular nodes - DRY 
                    .on("mouseup",nodeMouseUp)
                    .on("mousedown",nodeMouseDown)
                    .on("touchstart",function(d) {
                            var obj = d3.select(this);
                            var touch0 = d3.event.touches.item(0);
                            var pos = [touch0.pageX,touch0.pageY];
                            startTouchCenter = [touch0.pageX,touch0.pageY];
                            startTouchDistance = 0;
                            touchStartTime = setTimeout(function() {
                                    showTouchMenu(obj,pos);
                            },touchLongPressTimeout);
                            nodeMouseDown.call(this,d)       
                    })
                    .on("touchend", function(d) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                            if  (RED.touch.radialMenu.active()) {
                                d3.event.stopPropagation();
                                return;
                            }
                            nodeMouseUp.call(this,d);
                    });
                    
                outGroup.append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10).attr("x",-5).attr("y",15)
                    .on("mousedown", function(d,i){portMouseDown(d,1,0);} )
                    .on("touchstart", function(d,i){portMouseDown(d,1,0);} )
                    .on("mouseup", function(d,i){portMouseUp(d,1,0);})
                    .on("touchend",function(d,i){portMouseUp(d,1,0);} )
                    .on("mouseover",function(d,i) { var port = d3.select(this); port.classed("port_hovered",(mouse_mode!=RED.state.JOINING || mousedown_port_type !== 0 ));})
                    .on("mouseout",function(d,i) { var port = d3.select(this); port.classed("port_hovered",false);});

                outGroup.append("svg:text").attr('class','port_label').attr('x',20).attr('y',8).style("font-size","10px").text("output");
                outGroup.append("svg:text").attr('class','port_label port_index').attr('x',20).attr('y',24).text(function(d,i){ return i+1});

                var subflowInputs = vis.selectAll(".subflowinput").data(activeSubflow.in,function(d,i){ return d.id;});
                subflowInputs.exit().remove();
                var inGroup = subflowInputs.enter().insert("svg:g").attr("class","node subflowinput").attr("transform",function(d) { return "translate("+(d.x-20)+","+(d.y-20)+")"});
                inGroup.each(function(d,i) {
                    d.w=40;
                    d.h=40;
                });
                inGroup.append("rect").attr("class","subflowport").attr("rx",8).attr("ry",8).attr("width",40).attr("height",40)
                    // TODO: This is exactly the same set of handlers used for regular nodes - DRY 
                    .on("mouseup",nodeMouseUp)
                    .on("mousedown",nodeMouseDown)
                    .on("touchstart",function(d) {
                            var obj = d3.select(this);
                            var touch0 = d3.event.touches.item(0);
                            var pos = [touch0.pageX,touch0.pageY];
                            startTouchCenter = [touch0.pageX,touch0.pageY];
                            startTouchDistance = 0;
                            touchStartTime = setTimeout(function() {
                                    showTouchMenu(obj,pos);
                            },touchLongPressTimeout);
                            nodeMouseDown.call(this,d)       
                    })
                    .on("touchend", function(d) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                            if  (RED.touch.radialMenu.active()) {
                                d3.event.stopPropagation();
                                return;
                            }
                            nodeMouseUp.call(this,d);
                    });
                    
                inGroup.append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10).attr("x",35).attr("y",15)
                    .on("mousedown", function(d,i){portMouseDown(d,0,i);} )
                    .on("touchstart", function(d,i){portMouseDown(d,0,i);} )
                    .on("mouseup", function(d,i){portMouseUp(d,0,i);})
                    .on("touchend",function(d,i){portMouseUp(d,0,i);} )
                    .on("mouseover",function(d,i) { var port = d3.select(this); port.classed("port_hovered",(mouse_mode!=RED.state.JOINING || mousedown_port_type !== 0 ));})
                    .on("mouseout",function(d,i) { var port = d3.select(this); port.classed("port_hovered",false);});
                inGroup.append("svg:text").attr('class','port_label').attr('x',18).attr('y',20).style("font-size","10px").text("input");
                
                
                
                subflowOutputs.each(function(d,i) {
                    if (d.dirty) {
                        var output = d3.select(this);
                        output.selectAll(".subflowport").classed("node_selected",function(d) { return d.selected; })
                        output.selectAll(".port_index").text(function(d){ return d.i+1});
                        output.attr("transform", function(d) { return "translate(" + (d.x-d.w/2) + "," + (d.y-d.h/2) + ")"; });
                        d.dirty = false;
                    }
                });
                subflowInputs.each(function(d,i) {
                    if (d.dirty) {
                        var input = d3.select(this);
                        input.selectAll(".subflowport").classed("node_selected",function(d) { return d.selected; })
                        input.attr("transform", function(d) { return "translate(" + (d.x-d.w/2) + "," + (d.y-d.h/2) + ")"; });
                        d.dirty = false;
                    }
                });
            } else {
                vis.selectAll(".subflowoutput").remove();
                vis.selectAll(".subflowinput").remove();
            }
            
            var node = vis.selectAll(".nodegroup").data(RED.nodes.nodes.filter(function(d) { return d.z == activeWorkspace }),function(d){return d.id});
            node.exit().remove();

            var nodeEnter = node.enter().insert("svg:g").attr("class", "node nodegroup");
            nodeEnter.each(function(d,i) {
                    var node = d3.select(this);
                    node.attr("id",d.id);
                    var l = d._def.label;
                    l = (typeof l === "function" ? l.call(d) : l)||"";
                    d.w = Math.max(node_width,calculateTextWidth(l, "node_label", 50)+(d._def.inputs>0?7:0) );
                    d.h = Math.max(node_height,(d.outputs||0) * 15);

                    if (d._def.badge) {
                        var badge = node.append("svg:g").attr("class","node_badge_group");
                        var badgeRect = badge.append("rect").attr("class","node_badge").attr("rx",5).attr("ry",5).attr("width",40).attr("height",15);
                        badge.append("svg:text").attr("class","node_badge_label").attr("x",35).attr("y",11).attr('text-anchor','end').text(d._def.badge());
                        if (d._def.onbadgeclick) {
                            badgeRect.attr("cursor","pointer")
                                .on("click",function(d) { d._def.onbadgeclick.call(d);d3.event.preventDefault();});
                        }
                    }

                    if (d._def.button) {
                        var nodeButtonGroup = node.append('svg:g')
                            .attr("transform",function(d) { return "translate("+((d._def.align == "right") ? 94 : -25)+",2)"; })
                            .attr("class",function(d) { return "node_button "+((d._def.align == "right") ? "node_right_button" : "node_left_button"); });
                        nodeButtonGroup.append('rect')
                            .attr("rx",8)
                            .attr("ry",8)
                            .attr("width",32)
                            .attr("height",node_height-4)
                            .attr("fill","#eee");//function(d) { return d._def.color;})
                        nodeButtonGroup.append('rect')
                            .attr("x",function(d) { return d._def.align == "right"? 10:5})
                            .attr("y",4)
                            .attr("rx",5)
                            .attr("ry",5)
                            .attr("width",16)
                            .attr("height",node_height-12)
                            .attr("fill",function(d) { return d._def.color;})
                            .attr("cursor","pointer")
                            .on("mousedown",function(d) {if (!lasso) { d3.select(this).attr("fill-opacity",0.2);d3.event.preventDefault(); d3.event.stopPropagation();}})
                            .on("mouseup",function(d) {if (!lasso) { d3.select(this).attr("fill-opacity",0.4);d3.event.preventDefault();d3.event.stopPropagation();}})
                            .on("mouseover",function(d) {if (!lasso) { d3.select(this).attr("fill-opacity",0.4);}})
                            .on("mouseout",function(d) {if (!lasso) {
                                var op = 1;
                                if (d._def.button.toggle) {
                                    op = d[d._def.button.toggle]?1:0.2;
                                }
                                d3.select(this).attr("fill-opacity",op);
                            }})
                            .on("click",nodeButtonClicked)
                            .on("touchstart",nodeButtonClicked)
                    }

                    var mainRect = node.append("rect")
                        .attr("class", "node")
                        .classed("node_unknown",function(d) { return d.type == "unknown"; })
                        .attr("rx", 6)
                        .attr("ry", 6)
                        .attr("fill",function(d) { return d._def.color;})
                        .on("mouseup",nodeMouseUp)
                        .on("mousedown",nodeMouseDown)
                        .on("touchstart",function(d) {
                            var obj = d3.select(this);
                            var touch0 = d3.event.touches.item(0);
                            var pos = [touch0.pageX,touch0.pageY];
                            startTouchCenter = [touch0.pageX,touch0.pageY];
                            startTouchDistance = 0;
                            touchStartTime = setTimeout(function() {
                                showTouchMenu(obj,pos);
                            },touchLongPressTimeout);
                            nodeMouseDown.call(this,d)
                        })
                        .on("touchend", function(d) {
                            clearTimeout(touchStartTime);
                            touchStartTime = null;
                            if  (RED.touch.radialMenu.active()) {
                                d3.event.stopPropagation();
                                return;
                            }
                            nodeMouseUp.call(this,d);
                        })
                        .on("mouseover",function(d) {
                                if (mouse_mode === 0) {
                                    var node = d3.select(this);
                                    node.classed("node_hovered",true);
                                }
                        })
                        .on("mouseout",function(d) {
                                var node = d3.select(this);
                                node.classed("node_hovered",false);
                        });

                   //node.append("rect").attr("class", "node-gradient-top").attr("rx", 6).attr("ry", 6).attr("height",30).attr("stroke","none").attr("fill","url(#gradient-top)").style("pointer-events","none");
                   //node.append("rect").attr("class", "node-gradient-bottom").attr("rx", 6).attr("ry", 6).attr("height",30).attr("stroke","none").attr("fill","url(#gradient-bottom)").style("pointer-events","none");

                    if (d._def.icon) {

                        var icon_group = node.append("g")
                            .attr("class","node_icon_group")
                            .attr("x",0).attr("y",0);

                        var icon_shade = icon_group.append("rect")
                            .attr("x",0).attr("y",0)
                            .attr("class","node_icon_shade")
                            .attr("width","30")
                            .attr("stroke","none")
                            .attr("fill","#000")
                            .attr("fill-opacity","0.05")
                            .attr("height",function(d){return Math.min(50,d.h-4);});

                        var icon = icon_group.append("image")
                            .attr("xlink:href","icons/"+d._def.icon)
                            .attr("class","node_icon")
                            .attr("x",0)
                            .attr("width","30")
                            .attr("height","30");

                        var icon_shade_border = icon_group.append("path")
                            .attr("d",function(d) { return "M 30 1 l 0 "+(d.h-2)})
                            .attr("class","node_icon_shade_border")
                            .attr("stroke-opacity","0.1")
                            .attr("stroke","#000")
                            .attr("stroke-width","2");

                        if ("right" == d._def.align) {
                            icon_group.attr('class','node_icon_group node_icon_group_'+d._def.align);
                            icon_shade_border.attr("d",function(d) { return "M 0 1 l 0 "+(d.h-2)})
                            //icon.attr('class','node_icon node_icon_'+d._def.align);
                            //icon.attr('class','node_icon_shade node_icon_shade_'+d._def.align);
                            //icon.attr('class','node_icon_shade_border node_icon_shade_border_'+d._def.align);
                        }
                        
                        //if (d.inputs > 0 && d._def.align == null) {
                        //    icon_shade.attr("width",35);
                        //    icon.attr("transform","translate(5,0)");
                        //    icon_shade_border.attr("transform","translate(5,0)");
                        //}
                        //if (d._def.outputs > 0 && "right" == d._def.align) {
                        //    icon_shade.attr("width",35); //icon.attr("x",5);
                        //}

                        var img = new Image();
                        img.src = "icons/"+d._def.icon;
                        img.onload = function() {
                            icon.attr("width",Math.min(img.width,30));
                            icon.attr("height",Math.min(img.height,30));
                            icon.attr("x",15-Math.min(img.width,30)/2);
                            //if ("right" == d._def.align) {
                            //    icon.attr("x",function(d){return d.w-img.width-1-(d.outputs>0?5:0);});
                            //    icon_shade.attr("x",function(d){return d.w-30});
                            //    icon_shade_border.attr("d",function(d){return "M "+(d.w-30)+" 1 l 0 "+(d.h-2);});
                            //}
                        }

                        //icon.style("pointer-events","none");
                        icon_group.style("pointer-events","none");
                    }
                    var text = node.append('svg:text').attr('class','node_label').attr('x', 38).attr('dy', '.35em').attr('text-anchor','start');
                    if (d._def.align) {
                        text.attr('class','node_label node_label_'+d._def.align);
                        text.attr('text-anchor','end');
                    }

                    var status = node.append("svg:g").attr("class","node_status_group").style("display","none");

                    var statusRect = status.append("rect").attr("class","node_status")
                                        .attr("x",6).attr("y",1).attr("width",9).attr("height",9)
                                        .attr("rx",2).attr("ry",2).attr("stroke-width","3");

                    var statusLabel = status.append("svg:text")
                        .attr("class","node_status_label")
                        .attr('x',20).attr('y',9)
                        .style({
                                'stroke-width': 0,
                                'fill': '#888',
                                'font-size':'9pt',
                                'stroke':'#000',
                                'text-anchor':'start'
                        });

                    //node.append("circle").attr({"class":"centerDot","cx":0,"cy":0,"r":5});

                    //node.append("path").attr("class","node_error").attr("d","M 3,-3 l 10,0 l -5,-8 z");
                    node.append("image").attr("class","node_error hidden").attr("xlink:href","icons/node-error.png").attr("x",0).attr("y",-6).attr("width",10).attr("height",9);
                    node.append("image").attr("class","node_changed hidden").attr("xlink:href","icons/node-changed.png").attr("x",12).attr("y",-6).attr("width",10).attr("height",10);
            });

            node.each(function(d,i) {
                    if (d.dirty) {
                        //if (d.x < -50) deleteSelection();  // Delete nodes if dragged back to palette
                        if (d.resize) {
                            var l = d._def.label;
                            l = (typeof l === "function" ? l.call(d) : l)||"";
                            d.w = Math.max(node_width,calculateTextWidth(l, "node_label", 50)+(d._def.inputs>0?7:0) );
                            d.h = Math.max(node_height,(d.outputs||0) * 15);
                            d.resize = false;
                        }
                        var thisNode = d3.select(this);
                        //thisNode.selectAll(".centerDot").attr({"cx":function(d) { return d.w/2;},"cy":function(d){return d.h/2}});
                        thisNode.attr("transform", function(d) { return "translate(" + (d.x-d.w/2) + "," + (d.y-d.h/2) + ")"; });
                        thisNode.selectAll(".node")
                            .attr("width",function(d){return d.w})
                            .attr("height",function(d){return d.h})
                            .classed("node_selected",function(d) { return d.selected; })
                            .classed("node_highlighted",function(d) { return d.highlighted; })
                        ;
                        //thisNode.selectAll(".node-gradient-top").attr("width",function(d){return d.w});
                        //thisNode.selectAll(".node-gradient-bottom").attr("width",function(d){return d.w}).attr("y",function(d){return d.h-30});

                        thisNode.selectAll(".node_icon_group_right").attr('transform', function(d){return "translate("+(d.w-30)+",0)"});
                        thisNode.selectAll(".node_label_right").attr('x', function(d){return d.w-38});
                        //thisNode.selectAll(".node_icon_right").attr("x",function(d){return d.w-d3.select(this).attr("width")-1-(d.outputs>0?5:0);});
                        //thisNode.selectAll(".node_icon_shade_right").attr("x",function(d){return d.w-30;});
                        //thisNode.selectAll(".node_icon_shade_border_right").attr("d",function(d){return "M "+(d.w-30)+" 1 l 0 "+(d.h-2)});

                        var inputPorts = thisNode.selectAll(".port_input");
                        if (d.inputs === 0 && !inputPorts.empty()) {
                            inputPorts.remove();
                            //nodeLabel.attr("x",30);
                        } else if (d.inputs === 1 && inputPorts.empty()) {
                            var inputGroup = thisNode.append("g").attr("class","port_input");
                            inputGroup.append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10)
                                .on("mousedown",function(d){portMouseDown(d,1,0);})
                                .on("touchstart",function(d){portMouseDown(d,1,0);})
                                .on("mouseup",function(d){portMouseUp(d,1,0);} )
                                .on("touchend",function(d){portMouseUp(d,1,0);} )
                                .on("mouseover",function(d) { var port = d3.select(this); port.classed("port_hovered",(mouse_mode!=RED.state.JOINING || mousedown_port_type != 1 ));})
                                .on("mouseout",function(d) { var port = d3.select(this); port.classed("port_hovered",false);})
                        }
                        
                        var numOutputs = d.outputs;
                        var y = (d.h/2)-((numOutputs-1)/2)*13;
                        d.ports = d.ports || d3.range(numOutputs);
                        d._ports = thisNode.selectAll(".port_output").data(d.ports);
                        var output_group = d._ports.enter().append("g").attr("class","port_output");
                        
                        output_group.append("rect").attr("class","port").attr("rx",3).attr("ry",3).attr("width",10).attr("height",10)
                            .on("mousedown",(function(){var node = d; return function(d,i){portMouseDown(node,0,i);}})() )
                            .on("touchstart",(function(){var node = d; return function(d,i){portMouseDown(node,0,i);}})() )
                            .on("mouseup",(function(){var node = d; return function(d,i){portMouseUp(node,0,i);}})() )
                            .on("touchend",(function(){var node = d; return function(d,i){portMouseUp(node,0,i);}})() )
                            .on("mouseover",function(d,i) { var port = d3.select(this); port.classed("port_hovered",(mouse_mode!=RED.state.JOINING || mousedown_port_type !== 0 ));})
                            .on("mouseout",function(d,i) { var port = d3.select(this); port.classed("port_hovered",false);});
                            
                        d._ports.exit().remove();
                        if (d._ports) {
                            numOutputs = d.outputs || 1;
                            y = (d.h/2)-((numOutputs-1)/2)*13;
                            var x = d.w - 5;
                            d._ports.each(function(d,i) {
                                    var port = d3.select(this);
                                    //port.attr("y",(y+13*i)-5).attr("x",x);
                                    port.attr("transform", function(d) { return "translate("+x+","+((y+13*i)-5)+")";});
                            });
                        }
                        thisNode.selectAll('text.node_label').text(function(d,i){
                                if (d._def.label) {
                                    if (typeof d._def.label == "function") {
                                        return d._def.label.call(d);
                                    } else {
                                        return d._def.label;
                                    }
                                }
                                return "";
                            })
                            .attr('y', function(d){return (d.h/2)-1;})
                            .attr('class',function(d){
                                return 'node_label'+
                                (d._def.align?' node_label_'+d._def.align:'')+
                                (d._def.labelStyle?' '+(typeof d._def.labelStyle == "function" ? d._def.labelStyle.call(d):d._def.labelStyle):'') ;
                        });
                        thisNode.selectAll(".node_tools").attr("x",function(d){return d.w-35;}).attr("y",function(d){return d.h-20;});

                        thisNode.selectAll(".node_changed")
                            .attr("x",function(d){return d.w-10})
                            .classed("hidden",function(d) { return !d.changed; });

                        thisNode.selectAll(".node_error")
                            .attr("x",function(d){return d.w-10-(d.changed?13:0)})
                            .classed("hidden",function(d) { return d.valid; });

                        thisNode.selectAll(".port_input").each(function(d,i) {
                                var port = d3.select(this);
                                port.attr("transform",function(d){return "translate(-5,"+((d.h/2)-5)+")";})
                        });

                        thisNode.selectAll(".node_icon").attr("y",function(d){return (d.h-d3.select(this).attr("height"))/2;});
                        thisNode.selectAll(".node_icon_shade").attr("height",function(d){return d.h;});
                        thisNode.selectAll(".node_icon_shade_border").attr("d",function(d){ return "M "+(("right" == d._def.align) ?0:30)+" 1 l 0 "+(d.h-2)});


                        thisNode.selectAll('.node_right_button').attr("transform",function(d){
                                var x = d.w-6;
                                if (d._def.button.toggle && !d[d._def.button.toggle]) {
                                    x = x - 8;
                                }
                                return "translate("+x+",2)";
                        });
                        thisNode.selectAll('.node_right_button rect').attr("fill-opacity",function(d){
                                if (d._def.button.toggle) {
                                    return d[d._def.button.toggle]?1:0.2;
                                }
                                return 1;
                        });

                        //thisNode.selectAll('.node_right_button').attr("transform",function(d){return "translate("+(d.w - d._def.button.width.call(d))+","+0+")";}).attr("fill",function(d) {
                        //         return typeof d._def.button.color  === "function" ? d._def.button.color.call(d):(d._def.button.color != null ? d._def.button.color : d._def.color)
                        //});

                        thisNode.selectAll('.node_badge_group').attr("transform",function(d){return "translate("+(d.w-40)+","+(d.h+3)+")";});
                        thisNode.selectAll('text.node_badge_label').text(function(d,i) {
                            if (d._def.badge) {
                                if (typeof d._def.badge == "function") {
                                    return d._def.badge.call(d);
                                } else {
                                    return d._def.badge;
                                }
                            }
                            return "";
                        });
                        if (!showStatus || !d.status) {
                            thisNode.selectAll('.node_status_group').style("display","none");
                        } else {
                            thisNode.selectAll('.node_status_group').style("display","inline").attr("transform","translate(3,"+(d.h+3)+")");
                            var fill = status_colours[d.status.fill]; // Only allow our colours for now
                            if (d.status.shape == null && fill == null) {
                                thisNode.selectAll('.node_status').style("display","none");
                            } else {
                                var style;
                                if (d.status.shape == null || d.status.shape == "dot") {
                                    style = {
                                        display: "inline",
                                        fill: fill,
                                        stroke: fill
                                    };
                                } else if (d.status.shape == "ring" ){
                                    style = {
                                        display: "inline",
                                        fill: '#fff',
                                        stroke: fill
                                    }
                                }
                                thisNode.selectAll('.node_status').style(style);
                            }
                            if (d.status.text) {
                                thisNode.selectAll('.node_status_label').text(d.status.text);
                            } else {
                                thisNode.selectAll('.node_status_label').text("");
                            }
                        }

                        d.dirty = false;
                    }
            });
        }

        var link = vis.selectAll(".link").data(
            RED.nodes.links.filter(function(d) {
                return d.source.z == activeWorkspace && d.target.z == activeWorkspace;
            }),
            function(d) {
                return d.source.id+":"+d.sourcePort+":"+d.target.id+":"+d.target.i;
            }
        );

        var linkEnter = link.enter().insert("g",".node").attr("class","link");

        linkEnter.each(function(d,i) {
            var l = d3.select(this);
            l.append("svg:path").attr("class","link_background link_path")
               .on("mousedown",function(d) {
                    mousedown_link = d;
                    clearSelection();
                    selected_link = mousedown_link;
                    updateSelection();
                    redraw();
                    d3.event.stopPropagation();
                })
                .on("touchstart",function(d) {
                    mousedown_link = d;
                    clearSelection();
                    selected_link = mousedown_link;
                    updateSelection();
                    redraw();
                    d3.event.stopPropagation();
                });
            l.append("svg:path").attr("class","link_outline link_path");
            l.append("svg:path").attr("class","link_line link_path")
                .classed("link_subflow", function(d) { return activeSubflow && (d.source.type === "subflow" || d.target.type === "subflow") });
        });

        link.exit().remove();

        var links = vis.selectAll(".link_path")
        links.attr("d",function(d){
                var numOutputs = d.source.outputs || 1;
                var sourcePort = d.sourcePort || 0;
                var y = -((numOutputs-1)/2)*13 +13*sourcePort;

                var dy = d.target.y-(d.source.y+y);
                var dx = (d.target.x-d.target.w/2)-(d.source.x+d.source.w/2);
                var delta = Math.sqrt(dy*dy+dx*dx);
                var scale = lineCurveScale;
                var scaleY = 0;
                if (delta < node_width) {
                    scale = 0.75-0.75*((node_width-delta)/node_width);
                }

                if (dx < 0) {
                    scale += 2*(Math.min(5*node_width,Math.abs(dx))/(5*node_width));
                    if (Math.abs(dy) < 3*node_height) {
                        scaleY = ((dy>0)?0.5:-0.5)*(((3*node_height)-Math.abs(dy))/(3*node_height))*(Math.min(node_width,Math.abs(dx))/(node_width)) ;
                    }
                }

                d.x1 = d.source.x+d.source.w/2;
                d.y1 = d.source.y+y;
                d.x2 = d.target.x-d.target.w/2;
                d.y2 = d.target.y;

                return "M "+(d.source.x+d.source.w/2)+" "+(d.source.y+y)+
                    " C "+(d.source.x+d.source.w/2+scale*node_width)+" "+(d.source.y+y+scaleY*node_height)+" "+
                    (d.target.x-d.target.w/2-scale*node_width)+" "+(d.target.y-scaleY*node_height)+" "+
                    (d.target.x-d.target.w/2)+" "+d.target.y;
        })

        link.classed("link_selected", function(d) { return d === selected_link || d.selected; });
        link.classed("link_unknown",function(d) { return d.target.type == "unknown" || d.source.type == "unknown"});

        if (d3.event) {
            d3.event.preventDefault();
        }
        
    }

    RED.keyboard.add(/* z */ 90,{ctrl:true},function(){RED.history.pop();});
    RED.keyboard.add(/* a */ 65,{ctrl:true},function(){selectAll();d3.event.preventDefault();});
    RED.keyboard.add(/* = */ 187,{ctrl:true},function(){zoomIn();d3.event.preventDefault();});
    RED.keyboard.add(/* - */ 189,{ctrl:true},function(){zoomOut();d3.event.preventDefault();});
    RED.keyboard.add(/* 0 */ 48,{ctrl:true},function(){zoomZero();d3.event.preventDefault();});
    RED.keyboard.add(/* v */ 86,{ctrl:true},function(){importNodes(clipboard);d3.event.preventDefault();});
    RED.keyboard.add(/* e */ 69,{ctrl:true},function(){showExportNodesDialog();d3.event.preventDefault();});
    RED.keyboard.add(/* i */ 73,{ctrl:true},function(){showImportNodesDialog();d3.event.preventDefault();});

    // TODO: 'dirty' should be a property of RED.nodes - with an event callback for ui hooks
    function setDirty(d) {
        dirty = d;
        if (dirty) {
            $("#btn-deploy").removeClass("disabled");
        } else {
            $("#btn-deploy").addClass("disabled");
        }
    }

    /**
     * Imports a new collection of nodes from a JSON String.
     *  - all get new IDs assigned
     *  - all 'selected'
     *  - attached to mouse for placing - 'IMPORT_DRAGGING'
     */
    function importNodes(newNodesStr,touchImport) {
        try {
            var result = RED.nodes.import(newNodesStr,true);
            if (result) {
                var new_nodes = result[0];
                var new_links = result[1];
                var new_workspaces = result[2];
                var new_subflows = result[3];
                
                var new_ms = new_nodes.filter(function(n) { return n.z == activeWorkspace }).map(function(n) { return {n:n};});
                var new_node_ids = new_nodes.map(function(n){ return n.id; });

                // TODO: pick a more sensible root node
                if (new_ms.length > 0) {
                    var root_node = new_ms[0].n;
                    var dx = root_node.x;
                    var dy = root_node.y;

                    if (mouse_position == null) {
                        mouse_position = [0,0];
                    }

                    var minX = 0;
                    var minY = 0;
                    var i;
                    var node;

                    for (i=0;i<new_ms.length;i++) {
                        node = new_ms[i];
                        node.n.selected = true;
                        node.n.changed = true;
                        node.n.x -= dx - mouse_position[0];
                        node.n.y -= dy - mouse_position[1];
                        node.dx = node.n.x - mouse_position[0];
                        node.dy = node.n.y - mouse_position[1];
                        minX = Math.min(node.n.x-node_width/2-5,minX);
                        minY = Math.min(node.n.y-node_height/2-5,minY);
                    }
                    for (i=0;i<new_ms.length;i++) {
                        node = new_ms[i];
                        node.n.x -= minX;
                        node.n.y -= minY;
                        node.dx -= minX;
                        node.dy -= minY;
                    }
                    if (!touchImport) {
                        mouse_mode = RED.state.IMPORT_DRAGGING;
                    }

                    RED.keyboard.add(/* ESCAPE */ 27,function(){
                            RED.keyboard.remove(/* ESCAPE */ 27);
                            clearSelection();
                            RED.history.pop();
                            mouse_mode = 0;
                    });
                    clearSelection();
                    moving_set = new_ms;
                }

                RED.history.push({
                    t:'add',
                    nodes:new_node_ids,
                    links:new_links,
                    workspaces:new_workspaces,
                    subflows:new_subflows,
                    dirty:RED.view.dirty()
                });


                redraw();
            }
        } catch(error) {
            if (error.code != "NODE_RED") {
                console.log(error.stack);
                RED.notify("<strong>Error</strong>: "+error,"error");
            } else {
                RED.notify("<strong>Error</strong>: "+error.message,"error");
            }
        }
    }

    function showExportNodesDialog() {
        mouse_mode = RED.state.EXPORT;
        var nns = RED.nodes.createExportableNodeSet(moving_set);
        $("#dialog-form").html($("script[data-template-name='export-clipboard-dialog']").html());
        $("#node-input-export").val(JSON.stringify(nns));
        $("#node-input-export").focus(function() {
                var textarea = $(this);
                textarea.select();
                textarea.mouseup(function() {
                        textarea.unbind("mouseup");
                        return false;
                });
        });
        $( "#dialog" ).dialog("option","title","Export nodes to clipboard").dialog( "open" );
        $("#node-input-export").focus();
    }

    function showExportNodesLibraryDialog() {
        mouse_mode = RED.state.EXPORT;
        var nns = RED.nodes.createExportableNodeSet(moving_set);
        $("#dialog-form").html($("script[data-template-name='export-library-dialog']").html());
        $("#node-input-filename").attr('nodes',JSON.stringify(nns));
        $( "#dialog" ).dialog("option","title","Export nodes to library").dialog( "open" );
    }

    function showImportNodesDialog() {
        mouse_mode = RED.state.IMPORT;
        $("#dialog-form").html($("script[data-template-name='import-dialog']").html());
        $("#node-input-import").val("");
        $( "#dialog" ).dialog("option","title","Import nodes").dialog( "open" );
    }

    function showRenameWorkspaceDialog(id) {
        var ws = RED.nodes.workspace(id);
        $( "#node-dialog-rename-workspace" ).dialog("option","workspace",ws);

        if (workspace_tabs.count() == 1) {
            $( "#node-dialog-rename-workspace").next().find(".leftButton")
                .prop('disabled',true)
                .addClass("ui-state-disabled");
        } else {
            $( "#node-dialog-rename-workspace").next().find(".leftButton")
                .prop('disabled',false)
                .removeClass("ui-state-disabled");
        }

        $( "#node-input-workspace-name" ).val(ws.label);
        $( "#node-dialog-rename-workspace" ).dialog("open");
    }
    
    function showSubflowDialog(id) {
        RED.editor.editSubflow(RED.nodes.subflow(id));
    }
    function findAvailableSubflowIOPosition(subflow) {
        var pos = {x:70,y:70};
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
    
    function addSubflowInput(id) {
        var subflow = RED.nodes.subflow(id);
        var position = findAvailableSubflowIOPosition(subflow);
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
        var wasDirty = RED.view.dirty();
        var wasChanged = subflow.changed;
        subflow.changed = true;
        
        RED.nodes.eachNode(function(n) {
            if (n.type == "subflow:"+subflow.id) {
                n.changed = true;
                n.inputs = subflow.in.length;
                RED.editor.updateNodeProperties(n);
            }
        });
        var historyEvent = {
            t:'edit',
            node:subflow,
            dirty:wasDirty,
            changed:wasChanged,
            subflow: {
                inputCount: oldInCount
            }
        };
        RED.history.push(historyEvent);
        $("#workspace-subflow-add-input").toggleClass("disabled",true);
        updateSelection();
        RED.view.redraw();
    }
        
    function addSubflowOutput(id) {
        var subflow = RED.nodes.subflow(id);
        var position = findAvailableSubflowIOPosition(subflow);
        
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
        var wasDirty = RED.view.dirty();
        var wasChanged = subflow.changed;
        subflow.changed = true;
        
        RED.nodes.eachNode(function(n) {
            if (n.type == "subflow:"+subflow.id) {
                n.changed = true;
                n.outputs = subflow.out.length;
                RED.editor.updateNodeProperties(n);
            }
        });
        var historyEvent = {
            t:'edit',
            node:subflow,
            dirty:wasDirty,
            changed:wasChanged,
            subflow: {
                outputCount: oldOutCount
            }
        };
        RED.history.push(historyEvent);
        updateSelection();
        RED.view.redraw();
    }

    $("#node-dialog-rename-workspace form" ).submit(function(e) { e.preventDefault();});
    $( "#node-dialog-rename-workspace" ).dialog({
        modal: true,
        autoOpen: false,
        width: 500,
        title: "Rename sheet",
        buttons: [
            {
                class: 'leftButton',
                text: "Delete",
                click: function() {
                    var workspace = $(this).dialog('option','workspace');
                    $( this ).dialog( "close" );
                    deleteWorkspace(workspace.id);
                }
            },
            {
                text: "Ok",
                click: function() {
                    var workspace = $(this).dialog('option','workspace');
                    var label = $( "#node-input-workspace-name" ).val();
                    if (workspace.label != label) {
                        workspace_tabs.renameTab(workspace.id,label);
                        RED.view.dirty(true);
                        $("#btn-workspace-menu-"+workspace.id.replace(".","-")).text(label);
                        // TODO: update entry in menu
                    }
                    $( this ).dialog( "close" );
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $( this ).dialog( "close" );
                }
            }
        ],
        open: function(e) {
            RED.keyboard.disable();
        },
        close: function(e) {
            RED.keyboard.enable();
        }
    });
    $( "#node-dialog-delete-workspace" ).dialog({
        modal: true,
        autoOpen: false,
        width: 500,
        title: "Confirm delete",
        buttons: [
            {
                text: "Ok",
                click: function() {
                    var workspace = $(this).dialog('option','workspace');
                    RED.view.removeWorkspace(workspace);
                    var historyEvent = RED.nodes.removeWorkspace(workspace.id);
                    historyEvent.t = 'delete';
                    historyEvent.dirty = dirty;
                    historyEvent.workspaces = [workspace];
                    RED.history.push(historyEvent);
                    RED.view.dirty(true);
                    $( this ).dialog( "close" );
                }
            },
            {
                text: "Cancel",
                click: function() {
                    $( this ).dialog( "close" );
                }
            }
        ],
        open: function(e) {
            RED.keyboard.disable();
        },
        close: function(e) {
            RED.keyboard.enable();
        }

    });
    
    function hideDropTarget() {
        $("#dropTarget").hide();
        RED.keyboard.remove(/* ESCAPE */ 27);
    }

    $('#chart').on("dragenter",function(event) {
        if ($.inArray("text/plain",event.originalEvent.dataTransfer.types) != -1) {
            $("#dropTarget").css({display:'table'});
            RED.keyboard.add(/* ESCAPE */ 27,hideDropTarget);
        }
    });

    $('#dropTarget').on("dragover",function(event) {
        if ($.inArray("text/plain",event.originalEvent.dataTransfer.types) != -1) {
            event.preventDefault();
        }
    })
    .on("dragleave",function(event) {
        hideDropTarget();
    })
    .on("drop",function(event) {
        var data = event.originalEvent.dataTransfer.getData("text/plain");
        hideDropTarget();
        RED.view.importNodes(data);
        event.preventDefault();
    });
    
    return {
        init: init,
        state:function(state) {
            if (state == null) {
                return mouse_mode
            } else {
                mouse_mode = state;
            }
        },
        addWorkspace: function(ws) {
            workspace_tabs.addTab(ws);
            workspace_tabs.resize();
        },
        removeWorkspace: function(ws) {
            if (workspace_tabs.contains(ws.id)) {
                workspace_tabs.removeTab(ws.id);
            }
        },
        getWorkspace: function() {
            return activeWorkspace;
        },
        showWorkspace: function(id) {
            workspace_tabs.activateTab(id);
        },
        redraw: function() {
            RED.nodes.eachSubflow(function(sf) {
                if (workspace_tabs.contains(sf.id)) {
                    workspace_tabs.renameTab(sf.id,"Subflow: "+sf.name);
                }
            });
            redraw();   
        },
        dirty: function(d) {
            if (d == null) {
                return dirty;
            } else {
                setDirty(d);
            }
        },
        importNodes: importNodes,
        resize: function() {
            workspace_tabs.resize();
        },
        status: function(s) {
            showStatus = s;
            RED.nodes.eachNode(function(n) { n.dirty = true;});
            //TODO: subscribe/unsubscribe here
            redraw();
        },
        calculateTextWidth: calculateTextWidth,

        //TODO: should these move to an import/export module?
        showImportNodesDialog: showImportNodesDialog,
        showExportNodesDialog: showExportNodesDialog,
        showExportNodesLibraryDialog: showExportNodesLibraryDialog, 
        addFlow: function() {
            var ws = {type:"subflow",id:RED.nodes.id(),label:"Flow 1", closeable: true};
            RED.nodes.addWorkspace(ws);
            workspace_tabs.addTab(ws);
            workspace_tabs.activateTab(ws.id);
            return ws;
        },
        
        showSubflow: function(id) {
            if (!workspace_tabs.contains(id)) {
                var sf = RED.nodes.subflow(id);
                workspace_tabs.addTab({type:"subflow",id:id,label:"Subflow: "+sf.name, closeable: true});
                workspace_tabs.resize();
            }
            workspace_tabs.activateTab(id);
        },
        
        createSubflow: function() {
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
                in: [],
                out: []
            };
            RED.nodes.addSubflow(subflow);
            RED.history.push({
                t:'createSubflow',
                subflow: subflow,
                dirty:RED.view.dirty()
            });
            RED.view.showSubflow(subflowId);
        },
        
        convertToSubflow: function() {
            if (moving_set.length === 0) {
                RED.notify("<strong>Cannot create subflow</strong>: no nodes selected","error");
                return;
            }
            var i;
            var nodes = {};
            var new_links = [];
            var removedLinks = [];
            
            var candidateInputs = [];
            var candidateOutputs = [];
            
            var boundingBox = [moving_set[0].n.x,moving_set[0].n.y,moving_set[0].n.x,moving_set[0].n.y];
            
            for (i=0;i<moving_set.length;i++) {
                var n = moving_set[i];
                nodes[n.n.id] = {n:n.n,outputs:{}};
                boundingBox = [
                    Math.min(boundingBox[0],n.n.x),
                    Math.min(boundingBox[1],n.n.y),
                    Math.max(boundingBox[2],n.n.x),
                    Math.max(boundingBox[3],n.n.y)
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
            
            if (candidateInputs.length > 1) {
                 RED.notify("<strong>Cannot create subflow</strong>: multiple inputs to selection","error");
                 return;
            }
            //if (candidateInputs.length == 0) {
            //     RED.notify("<strong>Cannot create subflow</strong>: no input to selection","error");
            //     return;
            //}
            
            
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
                in: candidateInputs.map(function(v,i) { var index = i; return {
                    type:"subflow",
                    direction:"in",
                    x:v.target.x-(v.target.w/2)-80,
                    y:v.target.y,
                    z:subflowId,
                    i:index,
                    id:RED.nodes.id(),
                    wires:[{id:v.target.id}]
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
                z: activeWorkspace,
                inputs: subflow.in.length,
                outputs: subflow.out.length,
                h: Math.max(node_height,(subflow.out.length||0) * 15),
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
            
            for (i=0;i<moving_set.length;i++) {
                moving_set[i].n.z = subflow.id;
            }

            RED.history.push({
                t:'createSubflow',
                nodes:[subflowInstance.id],
                links:new_links,
                subflow: subflow,

                activeWorkspace: activeWorkspace,
                removedLinks: removedLinks,
                
                dirty:RED.view.dirty()
            });
            
            setDirty(true);
            redraw();
        }
    };
})();
