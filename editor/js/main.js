/**
 * Copyright 2013, 2016 IBM Corp.
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
var RED = (function() {


    function loadNodeList() {
        $.ajax({
            headers: {
                "Accept":"application/json"
            },
            cache: false,
            url: 'nodes',
            success: function(data) {
                RED.nodes.setNodeList(data);

                var nsCount = 0;
                for (var i=0;i<data.length;i++) {
                    var ns = data[i];
                    if (ns.module != "node-red") {
                        nsCount++;
                        RED.i18n.loadCatalog(ns.id, function() {
                            nsCount--;
                            if (nsCount === 0) {
                                loadNodes();
                            }
                        });
                    }
                }
                if (nsCount === 0) {
                    loadNodes();
                }
            }
        });
    }

    function loadNodes() {
        $.ajax({
            headers: {
                "Accept":"text/html"
            },
            cache: false,
            url: 'nodes',
            success: function(data) {
                $("body").append(data);
                $("body").i18n();
                $("#palette > .palette-spinner").hide();
                $(".palette-scroll").removeClass("hide");
                $("#palette-search").removeClass("hide");
                loadFlows();
            }
        });
    }

    function loadFlows() {
        $.ajax({
            headers: {
                "Accept":"application/json",
            },
            cache: false,
            url: 'flows',
            success: function(nodes) {
                var currentHash = window.location.hash;
                RED.nodes.version(nodes.rev);
                RED.nodes.import(nodes.flows);
                RED.nodes.dirty(false);
                RED.view.redraw(true);
                if (/^#flow\/.+$/.test(currentHash)) {
                    RED.workspaces.show(currentHash.substring(6));
                }
                RED.comms.subscribe("status/#",function(topic,msg) {
                    var parts = topic.split("/");
                    var node = RED.nodes.node(parts[1]);
                    if (node) {
                        if (msg.hasOwnProperty("text")) {
                            msg.text = node._(msg.text.toString(),{defaultValue:msg.text.toString()});
                        }
                        node.status = msg;
                        if (statusEnabled) {
                            node.dirty = true;
                            RED.view.redraw();
                        }
                    }
                });
                RED.comms.subscribe("node/#",function(topic,msg) {
                    var i,m;
                    var typeList;
                    var info;

                    if (topic == "node/added") {
                        var addedTypes = [];
                        for (i=0;i<msg.length;i++) {
                            m = msg[i];
                            var id = m.id;
                            RED.nodes.addNodeSet(m);
                            addedTypes = addedTypes.concat(m.types);
                            RED.i18n.loadCatalog(id, function() {
                                $.get('nodes/'+id, function(data) {
                                    $("body").append(data);
                                });
                            });
                        }
                        if (addedTypes.length) {
                            typeList = "<ul><li>"+addedTypes.join("</li><li>")+"</li></ul>";
                            RED.notify(RED._("palette.event.nodeAdded", {count:addedTypes.length})+typeList,"success");
                        }
                    } else if (topic == "node/removed") {
                        for (i=0;i<msg.length;i++) {
                            m = msg[i];
                            info = RED.nodes.removeNodeSet(m.id);
                            if (info.added) {
                                typeList = "<ul><li>"+m.types.join("</li><li>")+"</li></ul>";
                                RED.notify(RED._("palette.event.nodeRemoved", {count:m.types.length})+typeList,"success");
                            }
                        }
                    } else if (topic == "node/enabled") {
                        if (msg.types) {
                            info = RED.nodes.getNodeSet(msg.id);
                            if (info.added) {
                                RED.nodes.enableNodeSet(msg.id);
                                typeList = "<ul><li>"+msg.types.join("</li><li>")+"</li></ul>";
                                RED.notify(RED._("palette.event.nodeEnabled", {count:msg.types.length})+typeList,"success");
                            } else {
                                $.get('nodes/'+msg.id, function(data) {
                                    $("body").append(data);
                                    typeList = "<ul><li>"+msg.types.join("</li><li>")+"</li></ul>";
                                    RED.notify(RED._("palette.event.nodeAdded", {count:msg.types.length})+typeList,"success");
                                });
                            }
                        }
                    } else if (topic == "node/disabled") {
                        if (msg.types) {
                            RED.nodes.disableNodeSet(msg.id);
                            typeList = "<ul><li>"+msg.types.join("</li><li>")+"</li></ul>";
                            RED.notify(RED._("palette.event.nodeDisabled", {count:msg.types.length})+typeList,"success");
                        }
                    }
                    // Refresh flow library to ensure any examples are updated
                    RED.library.loadFlowLibrary();
                });
            }
        });
    }

    function showAbout() {
        $.get('red/about', function(data) {
            var aboutHeader = '<div style="text-align:center;">'+
                                '<img width="50px" src="red/images/node-red-icon.svg" />'+
                              '</div>';

            RED.sidebar.info.set(aboutHeader+marked(data));
            RED.sidebar.info.show();
        });
    }

    var statusEnabled = false;
    function toggleStatus(state) {
        statusEnabled = state;
        RED.view.status(statusEnabled);
    }

    function loadEditor() {

        var menuOptions = [];
        menuOptions.push({id:"menu-item-view-menu",label:RED._("menu.label.view.view"),options:[
            {id:"menu-item-view-show-grid",label:RED._("menu.label.view.showGrid"),toggle:true,onselect:RED.view.toggleShowGrid},
            {id:"menu-item-view-snap-grid",label:RED._("menu.label.view.snapGrid"),toggle:true,onselect:RED.view.toggleSnapGrid},
            {id:"menu-item-status",label:RED._("menu.label.displayStatus"),toggle:true,onselect:toggleStatus, selected: true},
            null,
            {id:"menu-item-bidi",label:RED._("menu.label.view.textDir"),options:[
                {id:"menu-item-bidi-default",toggle:"text-direction",label:RED._("menu.label.view.defaultDir"),selected: true, onselect:function(s) { if(s){RED.text.bidi.setTextDirection("")}}},
                {id:"menu-item-bidi-ltr",toggle:"text-direction",label:RED._("menu.label.view.ltr"), onselect:function(s) { if(s){RED.text.bidi.setTextDirection("ltr")}}},
                {id:"menu-item-bidi-rtl",toggle:"text-direction",label:RED._("menu.label.view.rtl"), onselect:function(s) { if(s){RED.text.bidi.setTextDirection("rtl")}}},
                {id:"menu-item-bidi-auto",toggle:"text-direction",label:RED._("menu.label.view.auto"), onselect:function(s) { if(s){RED.text.bidi.setTextDirection("auto")}}}
            ]},
            null,
            {id:"menu-item-sidebar",label:RED._("menu.label.sidebar.show"),toggle:true,onselect:RED.sidebar.toggleSidebar, selected: true}
        ]});
        menuOptions.push(null);
        menuOptions.push({id:"menu-item-import",label:RED._("menu.label.import"),options:[
            {id:"menu-item-import-clipboard",label:RED._("menu.label.clipboard"),onselect:RED.clipboard.import},
            {id:"menu-item-import-library",label:RED._("menu.label.library"),options:[]}
        ]});
        menuOptions.push({id:"menu-item-export",label:RED._("menu.label.export"),disabled:true,options:[
            {id:"menu-item-export-clipboard",label:RED._("menu.label.clipboard"),disabled:true,onselect:RED.clipboard.export},
            {id:"menu-item-export-library",label:RED._("menu.label.library"),disabled:true,onselect:RED.library.export}
        ]});
        menuOptions.push(null);
        menuOptions.push({id:"menu-item-search",label:RED._("menu.label.search"),onselect:RED.search.show});
        menuOptions.push(null);
        menuOptions.push({id:"menu-item-config-nodes",label:RED._("menu.label.displayConfig"),onselect:function() {}});
        menuOptions.push({id:"menu-item-workspace",label:RED._("menu.label.flows"),options:[
            {id:"menu-item-workspace-add",label:RED._("menu.label.add"),onselect:RED.workspaces.add},
            {id:"menu-item-workspace-edit",label:RED._("menu.label.rename"),onselect:RED.workspaces.edit},
            {id:"menu-item-workspace-delete",label:RED._("menu.label.delete"),onselect:RED.workspaces.remove}
        ]});
        menuOptions.push({id:"menu-item-subflow",label:RED._("menu.label.subflows"), options: [
            {id:"menu-item-subflow-create",label:RED._("menu.label.createSubflow"),onselect:RED.subflow.createSubflow},
            {id:"menu-item-subflow-convert",label:RED._("menu.label.selectionToSubflow"),disabled:true,onselect:RED.subflow.convertToSubflow},
        ]});
        menuOptions.push(null);
        if (RED.settings.theme('palette.editable') !== false) {
            RED.palette.editor.init();
            menuOptions.push({id:"menu-item-edit-palette",label:RED._("menu.label.editPalette"),onselect:RED.palette.editor.show});
            menuOptions.push(null);
        }

        menuOptions.push({id:"menu-item-keyboard-shortcuts",label:RED._("menu.label.keyboardShortcuts"),onselect:RED.keyboard.showHelp});
        menuOptions.push({id:"menu-item-help",
            label: RED.settings.theme("menu.menu-item-help.label","Node-RED website"),
            href: RED.settings.theme("menu.menu-item-help.url","http://nodered.org/docs")
        });
        menuOptions.push({id:"menu-item-node-red-version", label:"v"+RED.settings.version, onselect: showAbout });

        RED.menu.init({id:"btn-sidemenu",options: menuOptions});

        RED.user.init();

        RED.library.init();
        RED.palette.init();
        RED.sidebar.init();
        RED.subflow.init();
        RED.workspaces.init();
        RED.clipboard.init();
        RED.search.init();
        RED.view.init();
        RED.editor.init();

        RED.deploy.init(RED.settings.theme("deployButton",null));

        RED.keyboard.add("workspace", /* ? */ 191,{shift:true},function() {RED.keyboard.showHelp();d3.event.preventDefault();});
        RED.comms.connect();

        $("#main-container").show();
        $(".header-toolbar").show();

        loadNodeList();
    }

    $(function() {

        if ((window.location.hostname !== "localhost") && (window.location.hostname !== "127.0.0.1")) {
            document.title = document.title+" : "+window.location.hostname;
        }

        ace.require("ace/ext/language_tools");

        RED.i18n.init(function() {
            RED.settings.init(loadEditor);
        })
    });


    return {
    };
})();
