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
var RED = (function() {


    function loadSettings() {
        RED.settings.init(loadNodeList);
    }

    function loadNodeList() {
        $.ajax({
            headers: {
                "Accept":"application/json"
            },
            cache: false,
            url: 'nodes',
            success: function(data) {
                RED.nodes.setNodeList(data);
                loadNodes();
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
                $(".palette-spinner").hide();
                $(".palette-scroll").show();
                $("#palette-search").show();
                loadFlows();
            }
        });
    }

    function loadFlows() {
        $.ajax({
            headers: {
                "Accept":"application/json"
            },
            cache: false,
            url: 'flows',
            success: function(nodes) {
                RED.nodes.import(nodes);
                RED.nodes.dirty(false);
                RED.view.redraw(true);
                RED.comms.subscribe("status/#",function(topic,msg) {
                    var parts = topic.split("/");
                    var node = RED.nodes.node(parts[1]);
                    if (node) {
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
                            if (m.loaded) {
                                addedTypes = addedTypes.concat(m.types);
                                $.get('nodes/'+id, function(data) {
                                    $("body").append(data);
                                });
                            }
                        }
                        if (addedTypes.length) {
                            typeList = "<ul><li>"+addedTypes.join("</li><li>")+"</li></ul>";
                            RED.notify("Node"+(addedTypes.length!=1 ? "s":"")+" added to palette:"+typeList,"success");
                        }
                    } else if (topic == "node/removed") {
                        for (i=0;i<msg.length;i++) {
                            m = msg[i];
                            info = RED.nodes.removeNodeSet(m.id);
                            if (info.added) {
                                typeList = "<ul><li>"+m.types.join("</li><li>")+"</li></ul>";
                                RED.notify("Node"+(m.types.length!=1 ? "s":"")+" removed from palette:"+typeList,"success");
                            }
                        }
                    } else if (topic == "node/enabled") {
                        if (msg.types) {
                            info = RED.nodes.getNodeSet(msg.id);
                            if (info.added) {
                                RED.nodes.enableNodeSet(msg.id);
                                typeList = "<ul><li>"+msg.types.join("</li><li>")+"</li></ul>";
                                RED.notify("Node"+(msg.types.length!=1 ? "s":"")+" enabled:"+typeList,"success");
                            } else {
                                $.get('nodes/'+msg.id, function(data) {
                                    $("body").append(data);
                                    typeList = "<ul><li>"+msg.types.join("</li><li>")+"</li></ul>";
                                    RED.notify("Node"+(msg.types.length!=1 ? "s":"")+" added to palette:"+typeList,"success");
                                });
                            }
                        }
                    } else if (topic == "node/disabled") {
                        if (msg.types) {
                            RED.nodes.disableNodeSet(msg.id);
                            typeList = "<ul><li>"+msg.types.join("</li><li>")+"</li></ul>";
                            RED.notify("Node"+(msg.types.length!=1 ? "s":"")+" disabled:"+typeList,"success");
                        }
                    }
                });
            }
        });
    }

    var statusEnabled = false;
    function toggleStatus(state) {
        statusEnabled = state;
        RED.view.status(statusEnabled);
    }

    function loadEditor() {
        RED.menu.init({id:"btn-sidemenu",
            options: [
                {id:"btn-sidebar",label:"Sidebar",toggle:true,onselect:RED.sidebar.toggleSidebar, selected: true},
                {id:"btn-node-status",label:"Display node status",toggle:true,onselect:toggleStatus, selected: true},
                null,
                {id:"btn-import-menu",label:"Import",options:[
                    {id:"btn-import-clipboard",label:"Clipboard",onselect:RED.clipboard.import},
                    {id:"btn-import-library",label:"Library",options:[]}
                ]},
                {id:"btn-export-menu",label:"Export",disabled:true,options:[
                    {id:"btn-export-clipboard",label:"Clipboard",disabled:true,onselect:RED.clipboard.export},
                    {id:"btn-export-library",label:"Library",disabled:true,onselect:RED.library.export}
                ]},
                null,
                {id:"btn-config-nodes",label:"Configuration nodes",onselect:RED.sidebar.config.show},
                null,
                {id:"btn-subflow-menu",label:"Subflows", options: [
                    {id:"btn-create-subflow",label:"Create subflow",onselect:RED.subflow.createSubflow},
                    {id:"btn-convert-subflow",label:"Selection to subflow",disabled:true,onselect:RED.subflow.convertToSubflow},
                ]},
                null,
                {id:"btn-workspace-menu",label:"Workspaces",options:[
                    {id:"btn-workspace-add",label:"Add",onselect:RED.workspaces.add},
                    {id:"btn-workspace-edit",label:"Rename",onselect:RED.workspaces.edit},
                    {id:"btn-workspace-delete",label:"Delete",onselect:RED.workspaces.remove},
                    null
                ]},
                null,
                {id:"btn-keyboard-shortcuts",label:"Keyboard Shortcuts",onselect:RED.keyboard.showHelp},
                {id:"btn-help",label:"Node-RED Website", href:"http://nodered.org/docs"}
            ]
        });
        
        RED.user.init();
        
        RED.library.init();
        RED.palette.init();
        RED.sidebar.init();
        RED.subflow.init();
        RED.workspaces.init();
        RED.clipboard.init();
        RED.view.init();
        RED.deploy.init();
        
        RED.keyboard.add(/* ? */ 191,{shift:true},function(){RED.keyboard.showHelp();d3.event.preventDefault();});
        RED.comms.connect();

        $("#main-container").show();
        $(".header-toolbar").show();

        loadNodeList();
    }

    $(function() {
            
        if ((window.location.hostname !== "localhost") && (window.location.hostname !== "127.0.0.1")) {
            document.title = "Node-RED : "+window.location.hostname;
        }
        
        ace.require("ace/ext/language_tools");

        RED.settings.init(loadEditor);
    });


    return {
    };
})();
