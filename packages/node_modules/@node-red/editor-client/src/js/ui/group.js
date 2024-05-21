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

RED.group = (function() {

    var _groupEditTemplate = '<script type="text/x-red" data-template-name="group">'+
        '<div class="form-row">'+
            '<label for="node-input-name" data-i18n="[append]editor:common.label.name"><i class="fa fa-tag"></i> </label>'+
            '<input type="text" id="node-input-name" data-i18n="[placeholder]common.label.name">'+
        '</div>'+

        // '<div class="node-input-group-style-tools"><span class="button-group"><button class="red-ui-button red-ui-button-small">Use default style</button><button class="red-ui-button red-ui-button-small">Set as default style</button></span></div>'+

        '<div class="form-row" id="node-input-row-style-stroke">'+
            '<label data-i18n="editor:common.label.style"></label>'+
            '<label style="width: 70px;margin-right:10px" for="node-input-style-stroke" data-i18n="editor:common.label.line"></label>'+
        '</div>'+
        '<div class="form-row" style="padding-left: 100px;" id="node-input-row-style-fill">'+
            '<label style="width: 70px;margin-right: 10px "  for="node-input-style-fill" data-i18n="editor:common.label.fill"></label>'+
        '</div>'+
        '<div class="form-row">'+
            '<label for="node-input-style-label" data-i18n="editor:common.label.label"></label>'+
            '<input type="checkbox" id="node-input-style-label"/>'+
        '</div>'+
        '<div class="form-row" id="node-input-row-style-label-options">'+
            '<div style="margin-left: 100px; display: inline-block">'+
                '<div class="form-row">'+
                    '<span style="display: inline-block; min-width: 140px"  id="node-input-row-style-label-color">'+
                        '<label style="width: 70px;margin-right: 10px" for="node-input-style-fill" data-i18n="editor:common.label.color"></label>'+
                    '</span>'+
                '</div>'+
                '<div class="form-row">'+
                    '<span style="display: inline-block; min-width: 140px;" id="node-input-row-style-label-position">'+
                        '<label style="width: 70px;margin-right: 10px " for="node-input-style-label-position" data-i18n="editor:common.label.position"></label>'+
                    '</span>'+
                '</div>'+
            '</div>'+
        '</div>'+

        '</script>';

    var colorPalette = [
        "#ff0000",
        "#ffC000",
        "#ffff00",
        "#92d04f",
        "#0070c0",
        "#001f60",
        "#6f2fa0",
        "#000000",
        "#777777"
    ]
    var colorSteps = 3;
    var colorCount = colorPalette.length;
    for (var i=0,len=colorPalette.length*colorSteps;i<len;i++) {
        var ci = i%colorCount;
        var j = Math.floor(i/colorCount)+1;
        var c = colorPalette[ci];
        var r = parseInt(c.substring(1, 3), 16);
        var g = parseInt(c.substring(3, 5), 16);
        var b = parseInt(c.substring(5, 7), 16);
        var dr = (255-r)/(colorSteps+((ci===colorCount-1) ?0:1));
        var dg = (255-g)/(colorSteps+((ci===colorCount-1) ?0:1));
        var db = (255-b)/(colorSteps+((ci===colorCount-1) ?0:1));
        r = Math.min(255,Math.floor(r+j*dr));
        g = Math.min(255,Math.floor(g+j*dg));
        b = Math.min(255,Math.floor(b+j*db));
        var s = ((r<<16) + (g<<8) + b).toString(16);
        colorPalette.push('#'+'000000'.slice(0, 6-s.length)+s);
    }

    var defaultGroupStyle = {
        label: true,
        "label-position": "nw"
    };


    var groupDef = {
        defaults:{
            name:{value:""},
            style:{value:{label:true}},
            nodes:{value:[]},
            env: {value:[]},
        },
        category: "config",
        oneditprepare: function() {
            var style = this.style || {};
            RED.editor.colorPicker.create({
                id:"node-input-style-stroke",
                value: style.stroke || defaultGroupStyle.stroke || "#a4a4a4",
                defaultValue: "#a4a4a4",
                palette: colorPalette,
                cellPerRow: colorCount,
                cellWidth: 16,
                cellHeight: 16,
                cellMargin: 3,
                none: true,
                opacity: style.hasOwnProperty('stroke-opacity')?style['stroke-opacity']:(defaultGroupStyle.hasOwnProperty('stroke-opacity')?defaultGroupStyle['stroke-opacity']:1.0)
            }).appendTo("#node-input-row-style-stroke");
            RED.editor.colorPicker.create({
                id:"node-input-style-fill",
                value: style.fill || defaultGroupStyle.fill ||"none",
                defaultValue: "none",
                palette: colorPalette,
                cellPerRow: colorCount,
                cellWidth: 16,
                cellHeight: 16,
                cellMargin: 3,
                none: true,
                opacity: style.hasOwnProperty('fill-opacity')?style['fill-opacity']:(defaultGroupStyle.hasOwnProperty('fill-opacity')?defaultGroupStyle['fill-opacity']:1.0)
            }).appendTo("#node-input-row-style-fill");

            createLayoutPicker({
                id:"node-input-style-label-position",
                value:style["label-position"] || "nw"
            }).appendTo("#node-input-row-style-label-position");

            RED.editor.colorPicker.create({
                id:"node-input-style-color",
                value: style.color || defaultGroupStyle.color ||"#a4a4a4",
                defaultValue: "#a4a4a4",
                palette: colorPalette,
                cellPerRow: colorCount,
                cellWidth: 16,
                cellHeight: 16,
                cellMargin: 3
            }).appendTo("#node-input-row-style-label-color");

            $("#node-input-style-label").toggleButton({
                enabledLabel: RED._("editor.show"),
                disabledLabel: RED._("editor.show"),
            })

            $("#node-input-style-label").on("change", function(evt) {
                $("#node-input-row-style-label-options").toggle($(this).prop("checked"));
            })
            $("#node-input-style-label").prop("checked", this.style.label)
            $("#node-input-style-label").trigger("change");
        },
        oneditresize: function(size) {
        },
        oneditsave: function() {
            this.style.stroke = $("#node-input-style-stroke").val();
            this.style.fill = $("#node-input-style-fill").val();
            this.style["stroke-opacity"] = $("#node-input-style-stroke-opacity").val();
            this.style["fill-opacity"] = $("#node-input-style-fill-opacity").val();
            this.style.label = $("#node-input-style-label").prop("checked");
            if (this.style.label) {
                this.style["label-position"] = $("#node-input-style-label-position").val();
                this.style.color = $("#node-input-style-color").val();
            } else {
                delete this.style["label-position"];
                delete this.style.color;
            }

            var node = this;
            ['stroke','fill','stroke-opacity','fill-opacity','color','label-position'].forEach(function(prop) {
                if (node.style[prop] === defaultGroupStyle[prop]) {
                    delete node.style[prop]
                }
            })

            this.resize = true;
        },
        set:{
            module: "node-red"
        }
    }

    function init() {

        RED.events.on("view:selection-changed",function(selection) {
            var activateGroup = !!selection.nodes;
            var activateUngroup = false;
            var activateMerge = false;
            var activateRemove = false;
            var singleGroupSelected = false;
            var locked = RED.workspaces.isLocked()

            if (activateGroup) {
                singleGroupSelected = selection.nodes.length === 1 && selection.nodes[0].type === 'group';
                selection.nodes.forEach(function (n) {
                    if (n.type === "group") {
                        activateUngroup = true;
                    }
                    if (!!n.g) {
                        activateRemove = true;
                    }
                });
                if (activateUngroup) {
                    activateMerge = (selection.nodes.length > 1);
                }
            }
            RED.menu.setDisabled("menu-item-group-group", locked || !activateGroup);
            RED.menu.setDisabled("menu-item-group-ungroup", locked || !activateUngroup);
            RED.menu.setDisabled("menu-item-group-merge", locked || !activateMerge);
            RED.menu.setDisabled("menu-item-group-remove", locked || !activateRemove);
            RED.menu.setDisabled("menu-item-edit-copy-group-style", !singleGroupSelected);
            RED.menu.setDisabled("menu-item-edit-paste-group-style", locked || !activateUngroup);
        });

        RED.actions.add("core:group-selection", function() { groupSelection() })
        RED.actions.add("core:ungroup-selection", function() { ungroupSelection() })
        RED.actions.add("core:merge-selection-to-group", function() { mergeSelection() })
        RED.actions.add("core:remove-selection-from-group", function() { removeSelection() })
        RED.actions.add("core:copy-group-style", function() { copyGroupStyle() });
        RED.actions.add("core:paste-group-style", function() { pasteGroupStyle() });

        $(_groupEditTemplate).appendTo("#red-ui-editor-node-configs");

        var groupStyleDiv = $("<div>",{
            class:"red-ui-flow-group-body",
            style: "position: absolute; top: -1000px;"
        }).appendTo(document.body);
        var groupStyle = getComputedStyle(groupStyleDiv[0]);
        defaultGroupStyle = {
            stroke: convertColorToHex(groupStyle.stroke),
            "stroke-opacity": groupStyle.strokeOpacity,
            fill: convertColorToHex(groupStyle.fill),
            "fill-opacity": groupStyle.fillOpacity,
            label: true,
            "label-position": "nw"
        }
        groupStyleDiv.remove();
        groupStyleDiv = $("<div>",{
            class:"red-ui-flow-group-label",
            style: "position: absolute; top: -1000px;"
        }).appendTo(document.body);
        groupStyle = getComputedStyle(groupStyleDiv[0]);
        defaultGroupStyle.color = convertColorToHex(groupStyle.fill);
        groupStyleDiv.remove();
    }

    function convertColorToHex(c) {
        var m = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(c);
        if (m) {
            var s = ((parseInt(m[1])<<16) + (parseInt(m[2])<<8) + parseInt(m[3])).toString(16)
            return '#'+'000000'.slice(0, 6-s.length)+s;
        }
        return c;
    }


    var groupStyleClipboard;

    function copyGroupStyle() {
        if (RED.view.state() !== RED.state.DEFAULT) { return }
        var selection = RED.view.selection();
        if (selection.nodes && selection.nodes.length === 1 && selection.nodes[0].type === 'group') {
            groupStyleClipboard = JSON.parse(JSON.stringify(selection.nodes[0].style));
            RED.notify(RED._("clipboard.groupStyleCopied"),{id:"clipboard"})
            RED.menu.setDisabled("menu-item-edit-paste-group-style", false)
        }
    }
    function pasteGroupStyle() {
        if (RED.workspaces.isLocked()) { return }
        if (RED.view.state() !== RED.state.DEFAULT) { return }
        if (groupStyleClipboard) {
            var selection = RED.view.selection();
            if (selection.nodes) {
                var historyEvent = {
                    t:'multi',
                    events:[],
                    dirty: RED.nodes.dirty()
                }
                selection.nodes.forEach(function(n) {
                    if (n.type === 'group') {
                        historyEvent.events.push({
                            t: "edit",
                            node: n,
                            changes: {
                                style: JSON.parse(JSON.stringify(n.style))
                            },
                            dirty: RED.nodes.dirty()
                        });
                        n.style = JSON.parse(JSON.stringify(groupStyleClipboard));
                        n.dirty = true;

                    }
                })
                if (historyEvent.events.length > 0) {
                    RED.history.push(historyEvent);
                    RED.nodes.dirty(true);
                    RED.view.redraw();
                }
            }
        }
    }

    function groupSelection() {
        if (RED.workspaces.isLocked()) { return }
        if (RED.view.state() !== RED.state.DEFAULT) { return }
        var selection = RED.view.selection();
        if (selection.nodes) {
            var group = createGroup(selection.nodes);
            if (group) {
                var historyEvent = {
                    t:"createGroup",
                    groups: [ group ],
                    dirty: RED.nodes.dirty()
                }
                RED.history.push(historyEvent);
                RED.view.select({nodes:[group]});
                RED.nodes.dirty(true);
                RED.view.focus();
            }
        }
    }
    function ungroupSelection() {
        if (RED.workspaces.isLocked()) { return }
        if (RED.view.state() !== RED.state.DEFAULT) { return }
        var selection = RED.view.selection();
        if (selection.nodes) {
            var newSelection = [];
            let groups = selection.nodes.filter(function(n) { return n.type === "group" });

            var historyEvent = {
                t:"ungroup",
                groups: [ ],
                dirty: RED.nodes.dirty()
            }
            groups.forEach(function(g) {
                newSelection = newSelection.concat(ungroup(g))
                historyEvent.groups.push(g);
            })
            RED.history.push(historyEvent);
            RED.view.select({nodes:newSelection})
            RED.nodes.dirty(true);
            RED.view.focus();
        }
    }

    function ungroup(g) {
        if (RED.workspaces.isLocked()) { return }
        var nodes = [];
        var parentGroup = RED.nodes.group(g.g);
        g.nodes.forEach(function(n) {
            nodes.push(n);
            if (parentGroup) {
                // Move nodes to parent group
                n.g = parentGroup.id;
                parentGroup.nodes.push(n);
                parentGroup.dirty = true;
                n.dirty = true;
            } else {
                delete n.g;
            }
            if (n.type === 'group') {
                RED.events.emit("groups:change",n)
            } else if (n.type !== 'junction') {
                RED.events.emit("nodes:change",n)
            } else {
                RED.events.emit("junctions:change",n)
            }
        })
        RED.nodes.removeGroup(g);
        return nodes;
    }

    function mergeSelection() {
        if (RED.workspaces.isLocked()) { return }
        if (RED.view.state() !== RED.state.DEFAULT) { return }
        var selection = RED.view.selection();
        if (selection.nodes) {
            var nodes = [];

            var historyEvent = {
                t: "multi",
                events: []
            }
            var ungroupHistoryEvent = {
                t: "ungroup",
                groups: []
            }


            var n;
            var parentGroup;
            // First pass, check they are all in the same parent
            // TODO: DRY mergeSelection,removeSelection,...
            for (var i=0; i<selection.nodes.length; i++) {
                n = selection.nodes[i];
                if (i === 0) {
                    parentGroup = n.g;
                } else if (n.g !== parentGroup) {
                    RED.notify(RED._("group.errors.cannotCreateDiffGroups"),"error");
                    return;
                }
            }
            var existingGroup;
            var mergedEnv = {}
            // Second pass, ungroup any groups in the selection and add their contents
            // to the selection
            for (var i=0; i<selection.nodes.length; i++) {
                n = selection.nodes[i];
                if (n.type === "group") {
                    if (!existingGroup) {
                        existingGroup = n;
                    }
                    if (n.env && n.env.length > 0) {
                        n.env.forEach(env => {
                            mergedEnv[env.name] = env
                        })
                    }
                    ungroupHistoryEvent.groups.push(n);
                    nodes = nodes.concat(ungroup(n));
                } else {
                    nodes.push(n);
                }
                n.dirty = true;
            }
            if (ungroupHistoryEvent.groups.length > 0) {
                historyEvent.events.push(ungroupHistoryEvent);
            }
            // Finally, create the new group
            var group = createGroup(nodes);
            if (group) {
                if (existingGroup) {
                    group.style = existingGroup.style;
                    group.name = existingGroup.name;
                }
                group.env = Object.values(mergedEnv)
                RED.view.select({nodes:[group]})
            }
            historyEvent.events.push({
                t:"createGroup",
                groups: [ group ],
                dirty: RED.nodes.dirty()
            });
            RED.history.push(historyEvent);
            RED.nodes.dirty(true);
            RED.view.focus();
        }
    }

    function removeSelection() {
        if (RED.workspaces.isLocked()) { return }
        if (RED.view.state() !== RED.state.DEFAULT) { return }
        var selection = RED.view.selection();
        if (selection.nodes) {
            var nodes = [];
            var n;
            var parentGroup = RED.nodes.group(selection.nodes[0].g);
            if (parentGroup) {
                try {
                    removeFromGroup(parentGroup,selection.nodes,true);
                    var historyEvent = {
                        t: "removeFromGroup",
                        dirty: RED.nodes.dirty(),
                        group: parentGroup,
                        nodes: selection.nodes
                    }
                    RED.history.push(historyEvent);
                    RED.nodes.dirty(true);
                } catch(err) {
                    RED.notify(err,"error");
                    return;
                }
            }
            RED.view.select({nodes:selection.nodes})
            RED.view.focus();
        }
    }
    function createGroup(nodes) {
        if (RED.workspaces.isLocked()) { return }
        if (nodes.length === 0) {
            return;
        }
        const existingGroup = nodes[0].g
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i]
            if (n.type === 'subflow') {
                RED.notify(RED._("group.errors.cannotAddSubflowPorts"),"error");
                return;
            }
            if (n.g !== existingGroup) {
                console.warn("Cannot add nooes with different z properties")
                return
            }
        }
        // nodes is an array
        // each node must be on the same tab (z)
        var group = {
            id: RED.nodes.id(),
            type: 'group',
            nodes: [],
            style: JSON.parse(JSON.stringify(defaultGroupStyle)),
            x: Number.POSITIVE_INFINITY,
            y: Number.POSITIVE_INFINITY,
            w: 0,
            h: 0,
            _def: RED.group.def,
            changed: true
        }

        group.z = nodes[0].z;
        group = RED.nodes.addGroup(group);

        if (existingGroup) {
            addToGroup(RED.nodes.group(existingGroup), group)
        }

        try {
            addToGroup(group,nodes);
        } catch(err) {
            RED.notify(err,"error");
            return;
        }
        return group;
    }
    function addToGroup(group,nodes) {
        if (!Array.isArray(nodes)) {
            nodes = [nodes];
        }
        var i,n,z;
        var g;
        // First pass - validate we can safely add these nodes to the group
        for (i=0;i<nodes.length;i++) {
            n = nodes[i]
            if (!n.z) {
                throw new Error("Cannot add node without a z property to a group")
            }
            if (!z) {
                z = n.z;
            } else if (z !== n.z) {
                throw new Error("Cannot add nodes with different z properties")
            }
            if (n.g) {
                // This is already in a group.
                //  - check they are all in the same group
                if (!g) {
                    if (i!==0) {
                        // TODO: this might be ok when merging groups
                        throw new Error(RED._("group.errors.cannotCreateDiffGroups"))
                    }
                    g = n.g
                }
            }
            if (g !== n.g) {
                throw new Error(RED._("group.errors.cannotCreateDiffGroups"))
            }
        }
        // The nodes are already in a group - so we need to remove them first
        if (g) {
            g = RED.nodes.group(g);
            g.dirty = true;
        }
        // Second pass - add them to the group
        for (i=0;i<nodes.length;i++) {
            n = nodes[i];
            if (n.type !== "subflow") {
                if (g && n.g === g.id) {
                    var ni = g.nodes.indexOf(n);
                    if (ni > -1) {
                        g.nodes.splice(ni,1)
                    }
                }
                n.g = group.id;
                n.dirty = true;
                group.nodes.push(n);
                group.x = Math.min(group.x,n.x-n.w/2-25-((n._def.button && n._def.align!=="right")?20:0));
                group.y = Math.min(group.y,n.y-n.h/2-25);
                group.w = Math.max(group.w,n.x+n.w/2+25+((n._def.button && n._def.align=="right")?20:0) - group.x);
                group.h = Math.max(group.h,n.y+n.h/2+25-group.y);
                if (n.type === 'group') {
                    RED.events.emit("groups:change",n)
                } else if (n.type !== 'junction') {
                    RED.events.emit("nodes:change",n)
                } else {
                    RED.events.emit("junctions:change",n)
                }
            }
        }
        if (g) {
            RED.events.emit("groups:change",group)
        }
        markDirty(group);
    }
    function removeFromGroup(group, nodes, reparent) {
        if (RED.workspaces.isLocked()) { return }
        if (!Array.isArray(nodes)) {
            nodes = [nodes];
        }
        var n;
        // First pass, check they are all in the same parent
        // TODO: DRY mergeSelection,removeSelection,...
        for (var i=0; i<nodes.length; i++) {
            if (nodes[i].g !== group.id) {
                return;
            }
        }
        var parentGroup = RED.nodes.group(group.g);
        for (var i=0; i<nodes.length; i++) {
            n = nodes[i];
            n.dirty = true;
            var index = group.nodes.indexOf(n);
            group.nodes.splice(index,1);
            if (reparent && parentGroup) {
                n.g = group.g
                parentGroup.nodes.push(n);
            } else {
                delete n.g;
            }
            if (n.type === 'group') {
                RED.events.emit("groups:change",n)
            } else if (n.type !== 'junction') {
                RED.events.emit("nodes:change",n)
            } else {
                RED.events.emit("junctions:change",n)
            }
        }
        markDirty(group);
    }

    function getNodes(group,recursive,excludeGroup) {
        var nodes = [];
        group.nodes.forEach(function(n) {
            if (n.type !== 'group' || !excludeGroup) {
                nodes.push(n);
            }
            if (recursive && n.type === 'group') {
                nodes = nodes.concat(getNodes(n,recursive,excludeGroup))
            }
        })
        return nodes;
    }

    function groupContains(group,item) {
        if (item.g === group.id) {
            return true;
        }
        for (var i=0;i<group.nodes.length;i++) {
            if (group.nodes[i].type === "group") {
                if (groupContains(group.nodes[i],item)) {
                    return true;
                }
            }
        }
        return false;
    }
    function getRootGroup(group) {
        if (!group.g) {
            return group;
        }
        return getRootGroup(RED.nodes.group(group.g))
    }

    function createLayoutPicker(options) {

        var container = $("<div>",{style:"display:inline-block"});
        var layoutHiddenInput = $("<input/>", { id: options.id, type: "hidden", value: options.value }).appendTo(container);

        var layoutButton = $('<button type="button" class="red-ui-button red-ui-editor-node-appearance-button">').appendTo(container);
        $('<i class="fa fa-caret-down"></i>').appendTo(layoutButton);

        var layoutDispContainer = $('<div>',{class:"red-ui-search-result-node"}).appendTo(layoutButton);
        var layoutDisp = $('<div>',{class:"red-ui-group-layout-picker-cell-text red-ui-group-layout-text-pos-"}).appendTo(layoutDispContainer);

        var refreshDisplay = function() {
            var val = layoutHiddenInput.val();
            layoutDisp.removeClass().addClass("red-ui-group-layout-picker-cell-text red-ui-group-layout-text-pos-"+val)
        }
        layoutButton.on("click", function(e) {
            var picker = $("<div/>", {
                class: "red-ui-group-layout-picker"
            }).css({
                width: "126px"
            });

            var row = null;

            row = $("<div/>").appendTo(picker);
            var currentButton;
            for (var y=0;y<2;y++) { //red-ui-group-layout-text-pos
                var yComponent= "ns"[y];
                row = $("<div/>").appendTo(picker);
                for (var x=0;x<3;x++) {
                    var xComponent = ["w","","e"][x];
                    var val = yComponent+xComponent;
                    var button = $("<button/>", { class:"red-ui-search-result-node red-ui-button","data-pos":val }).appendTo(row);
                    button.on("click",  function (e) {
                        e.preventDefault();
                        layoutHiddenInput.val($(this).data("pos"));
                        layoutPanel.hide()
                        refreshDisplay();
                    });
                    $('<div>',{class:"red-ui-group-layout-picker-cell-text red-ui-group-layout-text-pos-"+val}).appendTo(button);
                    if (val === layoutHiddenInput.val()) {
                        currentButton = button;
                    }
                }
            }
            refreshDisplay();
            var layoutPanel = RED.popover.panel(picker);
            layoutPanel.show({
                target: layoutButton,
                onclose: function() {
                    layoutButton.focus();
                }
            });
            if (currentButton) {
                currentButton.focus();
            }
        })

        refreshDisplay();

        return container;

    }

    function markDirty(group) {
        group.dirty = true;
        while(group) {
            group.dirty = true;
            group = RED.nodes.group(group.g);
        }
    }


    return {
        def: groupDef,
        init: init,
        createGroup: createGroup,
        ungroup: ungroup,
        addToGroup: addToGroup,
        removeFromGroup: removeFromGroup,
        getNodes: getNodes,
        contains: groupContains,
        markDirty: markDirty
    }
})();
