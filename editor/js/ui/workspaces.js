/**
 * Copyright 2015 IBM Corp.
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


RED.workspaces = (function() {

    var activeWorkspace = 0;
    var workspaceIndex = 0;

    function addWorkspace(ws) {
        if (ws) {
            workspace_tabs.addTab(ws);
            workspace_tabs.resize();
        } else {
            var tabId = RED.nodes.id();
            do {
                workspaceIndex += 1;
            } while($("#workspace-tabs a[title='"+RED._('workspace.defaultName',{number:workspaceIndex})+"']").size() !== 0);

            ws = {type:"tab",id:tabId,label:RED._('workspace.defaultName',{number:workspaceIndex})};
            RED.nodes.addWorkspace(ws);
            workspace_tabs.addTab(ws);
            workspace_tabs.activateTab(tabId);
            RED.history.push({t:'add',workspaces:[ws],dirty:RED.nodes.dirty()});
            RED.nodes.dirty(true);
        }
    }
    function deleteWorkspace(ws,force) {
        if (workspace_tabs.count() == 1) {
            return;
        }
        var nodes = [];
        if (!force) {
            nodes = RED.nodes.filterNodes({z:ws.id});
        }
        if (force || nodes.length === 0) {
            removeWorkspace(ws);
            var historyEvent = RED.nodes.removeWorkspace(ws.id);
            historyEvent.t = 'delete';
            historyEvent.dirty = RED.nodes.dirty();
            historyEvent.workspaces = [ws];
            RED.history.push(historyEvent);
            RED.nodes.dirty(true);
            RED.sidebar.config.refresh();
        } else {
            $( "#node-dialog-delete-workspace" ).dialog('option','workspace',ws);
            $( "#node-dialog-delete-workspace-content" ).text(RED._("workspace.delete",{label:ws.label}));
            $( "#node-dialog-delete-workspace" ).dialog('open');
        }
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

    var workspace_tabs;
    function createWorkspaceTabs(){
        workspace_tabs = RED.tabs.create({
            id: "workspace-tabs",
            onchange: function(tab) {
                var event = {
                    old: activeWorkspace
                }
                activeWorkspace = tab.id;
                event.workspace = activeWorkspace;
                RED.events.emit("workspace:change",event);
                RED.sidebar.config.refresh();
            },
            ondblclick: function(tab) {
                if (tab.type != "subflow") {
                    showRenameWorkspaceDialog(tab.id);
                } else {
                    RED.editor.editSubflow(RED.nodes.subflow(tab.id));
                }
            },
            onadd: function(tab) {
                RED.menu.addItem("menu-item-workspace",{
                    id:"menu-item-workspace-menu-"+tab.id.replace(".","-"),
                    label:tab.label,
                    onselect:function() {
                        workspace_tabs.activateTab(tab.id);
                    }
                });
                RED.menu.setDisabled("menu-item-workspace-delete",workspace_tabs.count() == 1);
            },
            onremove: function(tab) {
                RED.menu.setDisabled("menu-item-workspace-delete",workspace_tabs.count() == 1);
                RED.menu.removeItem("menu-item-workspace-menu-"+tab.id.replace(".","-"));
            },
            minimumActiveTabWidth: 150
        });


        $("#node-dialog-rename-workspace form" ).submit(function(e) { e.preventDefault();});
        $( "#node-dialog-rename-workspace" ).dialog({
            modal: true,
            autoOpen: false,
            width: 500,
            title: RED._("workspace.renameSheet"),
            buttons: [
                {
                    class: 'leftButton',
                    text: RED._("common.label.delete"),
                    click: function() {
                        var workspace = $(this).dialog('option','workspace');
                        $( this ).dialog( "close" );
                        deleteWorkspace(workspace);
                    }
                },
                {
                    text: RED._("common.label.ok"),
                    click: function() {
                        var workspace = $(this).dialog('option','workspace');
                        var label = $( "#node-input-workspace-name" ).val();
                        if (workspace.label != label) {
                            workspace_tabs.renameTab(workspace.id,label);
                            RED.nodes.dirty(true);
                            RED.sidebar.config.refresh();
                            $("#menu-item-workspace-menu-"+workspace.id.replace(".","-")).text(label);
                        }
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: RED._("common.label.cancel"),
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
            title: RED._("workspace.confirmDelete"),
            buttons: [
                {
                    text: RED._("common.label.ok"),
                    click: function() {
                        var workspace = $(this).dialog('option','workspace');
                        deleteWorkspace(workspace,true);
                        $( this ).dialog( "close" );
                    }
                },
                {
                    text: RED._("common.label.cancel"),
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
    }

    function init() {
        createWorkspaceTabs();
        $('#btn-workspace-add-tab').on("click",function(e) {addWorkspace(); e.preventDefault()});
        RED.events.on("sidebar:resize",workspace_tabs.resize);

        RED.menu.setAction('menu-item-workspace-delete',function() {
            deleteWorkspace(RED.nodes.workspace(activeWorkspace));
        });

        $(window).resize(function() {
            workspace_tabs.resize();
        });
    }

    function removeWorkspace(ws) {
        if (!ws) {
            deleteWorkspace(RED.nodes.workspace(activeWorkspace));
        } else {
            if (workspace_tabs.contains(ws.id)) {
                workspace_tabs.removeTab(ws.id);
            }
        }
    }

    return {
        init: init,
        add: addWorkspace,
        remove: removeWorkspace,

        edit: function(id) {
            showRenameWorkspaceDialog(id||activeWorkspace);
        },
        contains: function(id) {
            return workspace_tabs.contains(id);
        },
        count: function() {
            return workspace_tabs.count();
        },
        active: function() {
            return activeWorkspace
        },
        show: function(id) {
            if (!workspace_tabs.contains(id)) {
                var sf = RED.nodes.subflow(id);
                if (sf) {
                    addWorkspace({type:"subflow",id:id,icon:"red/images/subflow_tab.png",label:sf.name, closeable: true});
                }
            }
            workspace_tabs.activateTab(id);
        },
        refresh: function() {
            RED.nodes.eachSubflow(function(sf) {
                if (workspace_tabs.contains(sf.id)) {
                    workspace_tabs.renameTab(sf.id,sf.name);
                }
            });
            RED.sidebar.config.refresh();
        },
        resize: function() {
            workspace_tabs.resize();
        }
    }
})();
