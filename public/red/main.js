/** This file was modified by Sathya Laufer */

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
(function() {

    function loadNodeList() {
        $.ajax({
            headers: {
                "Accept":"application/json"
            },
            cache: false,
            url: 'nodes',
            success: function(data) {
                RED.nodes.setNodeList(data);
                RED.i18n.loadNodeCatalogs(loadNodes);
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

                var persistentNotifications = {};
                RED.comms.subscribe("notification/#",function(topic,msg) {
                    var parts = topic.split("/");
                    var notificationId = parts[1];
                    if (notificationId === "runtime-deploy") {
                        // handled in ui/deploy.js
                        return;
                    }
                    if (msg.text) {
                        var text = RED._(msg.text,{default:msg.text});
                        if (!persistentNotifications.hasOwnProperty(notificationId)) {
                            persistentNotifications[notificationId] = RED.notify(text,msg.type,msg.timeout === undefined,msg.timeout);
                        } else {
                            persistentNotifications[notificationId].update(text,msg.timeout);
                        }
                    } else if (persistentNotifications.hasOwnProperty(notificationId)) {
                        persistentNotifications[notificationId].close();
                        delete persistentNotifications[notificationId];
                    }
                });
                RED.comms.subscribe("statusTop/#",function(topic,msg) {
                    var parts = topic.split("/");
                    var node = RED.nodes.node(parts[1]);
                    if (node) {
                        if (msg.hasOwnProperty("text")) {
                            if (msg.text[0] !== ".") {
                                msg.text = node._(msg.text.toString(),{defaultValue:msg.text.toString()});
                            }
                        }
                        node.statusTop = msg;
                        node.dirty = true;
                        RED.view.redraw();
                    }
                });
                RED.comms.subscribe("statusBottom/#",function(topic,msg) {
                    var parts = topic.split("/");
                    var node = RED.nodes.node(parts[1]);
                    if (node) {
                        if (msg.hasOwnProperty("text")) {
                            if (msg.text[0] !== ".") {
                                msg.text = node._(msg.text.toString(),{defaultValue:msg.text.toString()});
                            }
                        }
                        node.statusBottom = msg;
                        node.dirty = true;
                        RED.view.redraw();
                    }
                });
                RED.comms.subscribe("highlightLink/#",function(topic,msg) {
                    var nodeId = topic.split("/")[1];
                    if(nodeId.indexOf(":") > -1) {
                        nodeId = nodeId.split(":")[0];
                    }
                    var node = RED.nodes.node(nodeId);
                    if (node) {
                        var index = 0;
                        if (msg.hasOwnProperty("index")) {
                            index = msg.index;
                        }
                        activeLinks = RED.nodes.filterLinks({
                            source:node,
                            sourcePort:index                            
                        });
                        for(var i = 0; i < activeLinks.length; i++) {
                            activeLinks[i].working = true;
                        }
                        setTimeout(function(activeLinks) {
                            for(var i = 0; i < activeLinks.length; i++) {
                                activeLinks[i].working = false;
                            }
                            node.dirty = true;
                            RED.view.redraw();
                        }, 500, activeLinks);
                        node.dirty = true;
                        RED.view.redraw();
                    }
                });
                RED.comms.subscribe("highlightNode/#",function(topic,msg) {
                    var nodeId = topic.split("/")[1];
                    if(nodeId.indexOf(":") > -1) {
                        nodeId = nodeId.split(":")[0];
                    }
                    var node = RED.nodes.node(nodeId);
                    if (node) {
                        var timeout = 500;
                        if (msg.hasOwnProperty("timeout")) {
                            timeout = msg.timeout;
                        }
                        node.working = true;
                        setTimeout(function(node) {
                            node.working = false;
                            node.dirty = true;
                            RED.view.redraw();
                        }, timeout, node);
                        node.dirty = true;
                        RED.view.redraw();
                    }
                });
                RED.comms.subscribe("node/#",function(topic,msg) {
                    var i,m;
                    var typeList;
                    var info;
                    if (topic == "node/added") {
                        var addedTypes = [];
                        msg.forEach(function(m) {
                            var id = m.id;
                            RED.nodes.addNodeSet(m);
                            addedTypes = addedTypes.concat(m.types);
                            RED.i18n.loadCatalog(id, function() {
                                $.get('nodes/'+id, function(data) {
                                    $("body").append(data);
                                });
                            });
                        });
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
                    } else if (topic == "node/upgraded") {
                        RED.notify(RED._("palette.event.nodeUpgraded", {module:msg.module,version:msg.version}),"success");
                        RED.nodes.registry.setModulePendingUpdated(msg.module,msg.version);
                    }
                    // Refresh flow library to ensure any examples are updated
                    RED.library.loadFlowLibrary();
                });
                RED.comms.getEvents();
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

    function homegearReady() {
        $("#main-container").show();
        $(".header-toolbar").show();

        loadNodeList();
    }

    function loadEditor() {
        var menuOptions = [];
        menuOptions.push({id:"menu-item-view-menu",label:RED._("menu.label.view.view"),options:[
            // {id:"menu-item-view-show-grid",setting:"view-show-grid",label:RED._("menu.label.view.showGrid"),toggle:true,onselect:"core:toggle-show-grid"},
            // {id:"menu-item-view-snap-grid",setting:"view-snap-grid",label:RED._("menu.label.view.snapGrid"),toggle:true,onselect:"core:toggle-snap-grid"},
            // {id:"menu-item-status",setting:"node-show-status",label:RED._("menu.label.displayStatus"),toggle:true,onselect:"core:toggle-status", selected: true},
            //null,
            // {id:"menu-item-bidi",label:RED._("menu.label.view.textDir"),options:[
            //     {id:"menu-item-bidi-default",toggle:"text-direction",label:RED._("menu.label.view.defaultDir"),selected: true, onselect:function(s) { if(s){RED.text.bidi.setTextDirection("")}}},
            //     {id:"menu-item-bidi-ltr",toggle:"text-direction",label:RED._("menu.label.view.ltr"), onselect:function(s) { if(s){RED.text.bidi.setTextDirection("ltr")}}},
            //     {id:"menu-item-bidi-rtl",toggle:"text-direction",label:RED._("menu.label.view.rtl"), onselect:function(s) { if(s){RED.text.bidi.setTextDirection("rtl")}}},
            //     {id:"menu-item-bidi-auto",toggle:"text-direction",label:RED._("menu.label.view.auto"), onselect:function(s) { if(s){RED.text.bidi.setTextDirection("auto")}}}
            // ]},
            // null,
            {id:"menu-item-sidebar",label:RED._("menu.label.sidebar.show"),toggle:true,onselect:"core:toggle-sidebar", selected: true},
            null
        ]});
        menuOptions.push(null);
        menuOptions.push({id:"menu-item-import",label:RED._("menu.label.import"),options:[
            {id:"menu-item-import-clipboard",label:RED._("menu.label.clipboard"),onselect:"core:show-import-dialog"}
        ]});
        menuOptions.push({id:"menu-item-export",label:RED._("menu.label.export"),disabled:true,options:[
            {id:"menu-item-export-clipboard",label:RED._("menu.label.clipboard"),disabled:true,onselect:"core:show-export-dialog"}
        ]});
        menuOptions.push(null);
        menuOptions.push({id:"menu-item-search",label:RED._("menu.label.search"),onselect:"core:search"});
        menuOptions.push(null);
        menuOptions.push({id:"menu-item-config-nodes",label:RED._("menu.label.displayConfig"),onselect:"core:show-config-tab"});
        menuOptions.push({id:"menu-item-workspace",label:RED._("menu.label.flows"),options:[
            {id:"menu-item-workspace-add",label:RED._("menu.label.add"),onselect:"core:add-flow"},
            {id:"menu-item-workspace-edit",label:RED._("menu.label.rename"),onselect:"core:edit-flow"},
            {id:"menu-item-workspace-delete",label:RED._("menu.label.delete"),onselect:"core:remove-flow"}
        ]});
        menuOptions.push({id:"menu-item-subflow",label:RED._("menu.label.subflows"), options: [
            {id:"menu-item-subflow-create",label:RED._("menu.label.createSubflow"),onselect:"core:create-subflow"},
            // {id:"menu-item-subflow-convert",label:RED._("menu.label.selectionToSubflow"),disabled:true,onselect:"core:convert-to-subflow"},
        ]});
        menuOptions.push(null);
        if (RED.settings.theme('palette.editable') !== false) {
            menuOptions.push({id:"menu-item-edit-palette",label:RED._("menu.label.editPalette"),onselect:"core:manage-palette"});
            menuOptions.push(null);
        }

        menuOptions.push({id:"menu-item-user-settings",label:RED._("menu.label.userSettings"),onselect:"core:show-user-settings"});
        menuOptions.push(null);

        menuOptions.push({id:"menu-item-keyboard-shortcuts",label:RED._("menu.label.keyboardShortcuts"),onselect:"core:show-help"});
        menuOptions.push({id:"menu-item-help",
            label: RED.settings.theme("menu.menu-item-help.label","Node-BLUE website"),
            href: RED.settings.theme("menu.menu-item-help.url","https://doc.homegear.eu/data/homegear-node-blue/")
        });
        menuOptions.push(null);
        menuOptions.push({id:"menu-item-node-red-version", label:"v"+RED.settings.version, onselect: "core:show-about" });
        menuOptions.push({id:"menu-item-node-red",
            label: RED.settings.theme("menu.menu-item-logout.label","Powered by Node-RED"),
            href: RED.settings.theme("menu.menu-item-logout.url","https://nodered.org/")
        });
        menuOptions.push(null);
        menuOptions.push({id:"menu-item-logout",
            label: RED.settings.theme("menu.menu-item-logout.label","Logout"),
            href: RED.settings.theme("menu.menu-item-logout.url","signin.php?logout=1")
        });


        RED.view.init();
        RED.userSettings.init();
        RED.user.init();
        RED.library.init();
        RED.keyboard.init();
        RED.palette.init();
        if (RED.settings.theme('palette.editable') !== false) {
            RED.palette.editor.init();
        }

        RED.sidebar.init();
        RED.subflow.init();
        RED.workspaces.init();
        RED.clipboard.init();
        RED.search.init();
        RED.editor.init();
        RED.diff.init();

        RED.menu.init({id:"btn-sidemenu",options: menuOptions});

        RED.deploy.init(RED.settings.theme("deployButton",null));

        RED.actions.add("core:show-about", showAbout);

        RED.comms.connect();
        RED.comms.homegear().ready(homegearReady);
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
})();
