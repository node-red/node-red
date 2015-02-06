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

    var deploymentTypes = {
        "full":{img:"images/deploy-full-o.png"},
        "nodes":{img:"images/deploy-nodes-o.png"},
        "flows":{img:"images/deploy-flows-o.png"}
    }
    var deploymentType = "full";
    
    function save(force) {
        if (RED.view.dirty()) {
            //$("#debug-tab-clear").click();  // uncomment this to auto clear debug on deploy

            if (!force) {
                var invalid = false;
                var unknownNodes = [];
                RED.nodes.eachNode(function(node) {
                    invalid = invalid || !node.valid;
                    if (node.type === "unknown") {
                        if (unknownNodes.indexOf(node.name) == -1) {
                            unknownNodes.push(node.name);
                        }
                        invalid = true;
                    }
                });
                if (invalid) {
                    if (unknownNodes.length > 0) {
                        $( "#node-dialog-confirm-deploy-config" ).hide();
                        $( "#node-dialog-confirm-deploy-unknown" ).show();
                        var list = "<li>"+unknownNodes.join("</li><li>")+"</li>";
                        $( "#node-dialog-confirm-deploy-unknown-list" ).html(list);
                    } else {
                        $( "#node-dialog-confirm-deploy-config" ).show();
                        $( "#node-dialog-confirm-deploy-unknown" ).hide();
                    }
                    $( "#node-dialog-confirm-deploy" ).dialog( "open" );
                    return;
                }
            }
            var nns = RED.nodes.createCompleteNodeSet();

            $("#btn-icn-deploy").removeClass('fa-download');
            $("#btn-icn-deploy").addClass('spinner');
            RED.view.dirty(false);

            $.ajax({
                url:"flows",
                type: "POST",
                data: JSON.stringify(nns),
                contentType: "application/json; charset=utf-8",
                headers: {
                    "Node-RED-Deployment-Type":deploymentType
                }
            }).done(function(data,textStatus,xhr) {
                RED.notify("Successfully deployed","success");
                RED.nodes.eachNode(function(node) {
                    if (node.changed) {
                        node.dirty = true;
                        node.changed = false;
                    }
                    if(node.credentials) {
                        delete node.credentials;
                    }
                });
                RED.nodes.eachConfig(function (confNode) {
                    if (confNode.credentials) {
                        delete confNode.credentials;
                    }
                });
                // Once deployed, cannot undo back to a clean state
                RED.history.markAllDirty();
                RED.view.redraw();
            }).fail(function(xhr,textStatus,err) {
                RED.view.dirty(true);
                if (xhr.responseText) {
                    RED.notify("<strong>Error</strong>: "+xhr.responseText,"error");
                } else {
                    RED.notify("<strong>Error</strong>: no response from server","error");
                }
            }).always(function() {
                $("#btn-icn-deploy").removeClass('spinner');
                $("#btn-icn-deploy").addClass('fa-download');
            });
        }
    }

    $('#btn-deploy').click(function() { save(); });

    $( "#node-dialog-confirm-deploy" ).dialog({
            title: "Confirm deploy",
            modal: true,
            autoOpen: false,
            width: 530,
            height: 230,
            buttons: [
                {
                    text: "Confirm deploy",
                    click: function() {
                        save(true);
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: "Cancel",
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                }
            ]
    });

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
                RED.view.dirty(false);
                RED.view.redraw();
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

    function showHelp() {

        var dialog = $('#node-help');

        //$("#node-help").draggable({
        //        handle: ".modal-header"
        //});

        dialog.on('show',function() {
            RED.keyboard.disable();
        });
        dialog.on('hidden',function() {
            RED.keyboard.enable();
        });

        dialog.modal();
    }
    
    function changeDeploymentType(type) {
        deploymentType = type;
        $("#btn-deploy img").attr("src",deploymentTypes[type].img);
    }

    function loadEditor() {
        RED.menu.init({id:"btn-sidemenu",
            options: [
                {id:"btn-sidebar",label:"Sidebar",toggle:true,onselect:RED.sidebar.toggleSidebar, selected: true},
                {id:"btn-node-status",label:"Display node status",toggle:true,onselect:toggleStatus, selected: true},
                null,
                {id:"btn-import-menu",label:"Import",options:[
                    {id:"btn-import-clipboard",label:"Clipboard",onselect:RED.view.showImportNodesDialog},
                    {id:"btn-import-library",label:"Library",options:[]}
                ]},
                {id:"btn-export-menu",label:"Export",disabled:true,options:[
                    {id:"btn-export-clipboard",label:"Clipboard",disabled:true,onselect:RED.view.showExportNodesDialog},
                    {id:"btn-export-library",label:"Library",disabled:true,onselect:RED.view.showExportNodesLibraryDialog}
                ]},
                null,
                {id:"btn-config-nodes",label:"Configuration nodes",onselect:RED.sidebar.config.show},
                null,
                {id:"btn-subflow-menu",label:"Subflows", options: [
                    {id:"btn-create-subflow",label:"Create subflow",onselect:RED.view.createSubflow},
                    {id:"btn-convert-subflow",label:"Selection to subflow",disabled:true,onselect:RED.view.convertToSubflow},
                ]},
                null,
                {id:"btn-workspace-menu",label:"Workspaces",options:[
                    {id:"btn-workspace-add",label:"Add"},
                    {id:"btn-workspace-edit",label:"Rename"},
                    {id:"btn-workspace-delete",label:"Delete"},
                    null
                ]},
                null,
                {id:"btn-keyboard-shortcuts",label:"Keyboard Shortcuts",onselect:showHelp},
                {id:"btn-help",label:"Node-RED Website", href:"http://nodered.org/docs"}
            ]
        });
        
        RED.menu.init({id:"btn-deploy-options",
            options: [
                {id:"btn-deploy-full",toggle:"deploy-type",icon:"images/deploy-full.png",label:"Full",sublabel:"Deploys everything in the workspace",onselect:function(s) { if(s){changeDeploymentType("full")}}},
                {id:"btn-deploy-flow",toggle:"deploy-type",icon:"images/deploy-flows.png",label:"Modified Flows",sublabel:"Only deploys flows that contain changed nodes", onselect:function(s) {if(s){changeDeploymentType("flows")}}},
                {id:"btn-deploy-node",toggle:"deploy-type",icon:"images/deploy-nodes.png",label:"Modified Nodes",sublabel:"Only deploys nodes that have changed",onselect:function(s) { if(s){changeDeploymentType("nodes")}}}
            ]
        });
        
        if (RED.settings.user) {
            RED.menu.init({id:"btn-usermenu",
                options: []
            });
            
            var updateUserMenu = function() {
                $("#btn-usermenu-submenu li").remove();
                if (RED.settings.user.anonymous) {
                    RED.menu.addItem("btn-usermenu",{
                        id:"btn-login",
                        label:"Login",
                        onselect: function() {
                            RED.user.login({cancelable:true},function() {
                                RED.settings.load(function() {
                                    RED.notify("Logged in as "+RED.settings.user.username,"success");
                                    updateUserMenu();
                                });
                            });
                        }
                    });
                } else {
                    RED.menu.addItem("btn-usermenu",{
                        id:"btn-username",
                        label:"<b>"+RED.settings.user.username+"</b>"
                    });
                    RED.menu.addItem("btn-usermenu",{
                        id:"btn-logout",
                        label:"Logout",
                        onselect: function() {
                            RED.user.logout();
                        }
                    });
                }
                    
            }
            updateUserMenu();
        } else {
            $("#btn-usermenu").parent().hide();
        }
    
        $("#main-container").show();
        $(".header-toolbar").show();
        
        RED.library.init();
        RED.palette.init();
        RED.sidebar.init();
        RED.view.init();
        
        RED.keyboard.add(/* ? */ 191,{shift:true},function(){showHelp();d3.event.preventDefault();});
        RED.comms.connect();
        loadNodeList();
    }

    $(function() {
            
        if ((window.location.hostname !== "localhost") && (window.location.hostname !== "127.0.0.1")) {
            document.title = "Node-RED : "+window.location.hostname;
        }
        
        RED.settings.init(loadEditor);
    });


    return {
    };
})();
