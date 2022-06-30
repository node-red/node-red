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


RED.workspaces = (function() {

    var activeWorkspace = 0;
    var workspaceIndex = 0;

    var viewStack = [];
    var hideStack = [];
    var viewStackPos = 0;

    let flashingTab;
    let flashingTabTimer;

    function addToViewStack(id) {
        if (viewStackPos !== viewStack.length) {
            viewStack.splice(viewStackPos);
        }
        viewStack.push(id);
        viewStackPos = viewStack.length;
    }

    function removeFromHideStack(id) {
        hideStack = hideStack.filter(function(v) {
            if (v === id) {
                return false;
            } else if (Array.isArray(v)) {
                var i = v.indexOf(id);
                if (i > -1) {
                    v.splice(i,1);
                }
                if (v.length === 0) {
                    return false;
                }
                return true
            }
            return true;
        })
    }

    function addWorkspace(ws,skipHistoryEntry,targetIndex) {
        if (ws) {
            if (!ws.closeable) {
                ws.hideable = true;
            }
            workspace_tabs.addTab(ws,targetIndex);

            var hiddenTabs = JSON.parse(RED.settings.getLocal("hiddenTabs")||"{}");
            if (hiddenTabs[ws.id]) {
                workspace_tabs.hideTab(ws.id);
            }
            workspace_tabs.resize();
        } else {
            var tabId = RED.nodes.id();
            do {
                workspaceIndex += 1;
            } while ($("#red-ui-workspace-tabs li[flowname='"+RED._('workspace.defaultName',{number:workspaceIndex})+"']").size() !== 0);

            ws = {
                type: "tab",
                id: tabId,
                disabled: false,
                info: "",
                label: RED._('workspace.defaultName',{number:workspaceIndex}),
                env: [],
                hideable: true
            };
            RED.nodes.addWorkspace(ws,targetIndex);
            workspace_tabs.addTab(ws,targetIndex);

            workspace_tabs.activateTab(tabId);
            if (!skipHistoryEntry) {
                RED.history.push({t:'add',workspaces:[ws],dirty:RED.nodes.dirty()});
                RED.nodes.dirty(true);
            }
        }
        $("#red-ui-tab-"+(ws.id.replace(".","-"))).attr("flowname",ws.label)

        RED.view.focus();
        return ws;
    }

    function deleteWorkspace(ws) {
        if (workspaceTabCount === 1) {
            return;
        }
        var workspaceOrder = RED.nodes.getWorkspaceOrder();
        ws._index = workspaceOrder.indexOf(ws.id);
        removeWorkspace(ws);
        var historyEvent = RED.nodes.removeWorkspace(ws.id);
        historyEvent.t = 'delete';
        historyEvent.dirty = RED.nodes.dirty();
        historyEvent.workspaces = [ws];
        RED.history.push(historyEvent);
        RED.nodes.dirty(true);
        RED.sidebar.config.refresh();
    }

    function showEditWorkspaceDialog(id) {
        var workspace = RED.nodes.workspace(id);
        if (!workspace) {
            var subflow = RED.nodes.subflow(id);
            if (subflow) {
                RED.editor.editSubflow(subflow);
            }
        } else {
            RED.editor.editFlow(workspace);
        }
    }


    var workspace_tabs;
    var workspaceTabCount = 0;
    function createWorkspaceTabs() {
        workspace_tabs = RED.tabs.create({
            id: "red-ui-workspace-tabs",
            onchange: function(tab) {
                var event = {
                    old: activeWorkspace
                }
                if (tab) {
                    $("#red-ui-workspace-chart").show();
                    activeWorkspace = tab.id;
                    window.location.hash = 'flow/'+tab.id;
                    $("#red-ui-workspace").toggleClass("red-ui-workspace-disabled",!!tab.disabled);
                    } else {
                    $("#red-ui-workspace-chart").hide();
                    activeWorkspace = 0;
                    window.location.hash = '';
                }
                event.workspace = activeWorkspace;
                RED.events.emit("workspace:change",event);
                RED.sidebar.config.refresh();
                RED.view.focus();
            },
            onclick: function(tab) {
                if (tab.id !== activeWorkspace) {
                    addToViewStack(activeWorkspace);
                }
                RED.view.focus();
            },
            ondblclick: function(tab) {
                if (tab.type != "subflow") {
                    showEditWorkspaceDialog(tab.id);
                } else {
                    RED.editor.editSubflow(RED.nodes.subflow(tab.id));
                }
            },
            onadd: function(tab) {
                if (tab.type === "tab") {
                    workspaceTabCount++;
                }
                $('<span class="red-ui-workspace-disabled-icon"><i class="fa fa-ban"></i> </span>').prependTo("#red-ui-tab-"+(tab.id.replace(".","-"))+" .red-ui-tab-label");
                if (tab.disabled) {
                    $("#red-ui-tab-"+(tab.id.replace(".","-"))).addClass('red-ui-workspace-disabled');
                }
                RED.menu.setDisabled("menu-item-workspace-delete",activeWorkspace === 0 || workspaceTabCount <= 1);
                if (workspaceTabCount === 1) {
                    showWorkspace();
                }
            },
            onremove: function(tab) {
                if (tab.type === "tab") {
                    workspaceTabCount--;
                } else {
                    hideStack.push(tab.id);
                }
                RED.menu.setDisabled("menu-item-workspace-delete",activeWorkspace === 0 || workspaceTabCount <= 1);
                if (workspaceTabCount === 0) {
                    hideWorkspace();
                }
            },
            onreorder: function(oldOrder, newOrder) {
                RED.history.push({
                    t:'reorder',
                    workspaces: {
                        from:oldOrder,
                        to:newOrder
                    },
                    dirty:RED.nodes.dirty()
                });
                RED.nodes.dirty(true);
                setWorkspaceOrder(newOrder);
            },
            onselect: function(selectedTabs) {
                RED.view.select(false)
                if (selectedTabs.length === 0) {
                    $("#red-ui-workspace-chart svg").css({"pointer-events":"auto",filter:"none"})
                    $("#red-ui-workspace-toolbar").css({"pointer-events":"auto",filter:"none"})
                    $("#red-ui-palette-container").css({"pointer-events":"auto",filter:"none"})
                    $(".red-ui-sidebar-shade").hide();
                } else {
                    RED.view.select(false)
                    $("#red-ui-workspace-chart svg").css({"pointer-events":"none",filter:"opacity(60%)"})
                    $("#red-ui-workspace-toolbar").css({"pointer-events":"none",filter:"opacity(60%)"})
                    $("#red-ui-palette-container").css({"pointer-events":"none",filter:"opacity(60%)"})
                    $(".red-ui-sidebar-shade").show();
                }
            },
            onhide: function(tab) {
                hideStack.push(tab.id);

                var hiddenTabs = JSON.parse(RED.settings.getLocal("hiddenTabs")||"{}");
                hiddenTabs[tab.id] = true;
                RED.settings.setLocal("hiddenTabs",JSON.stringify(hiddenTabs));

                RED.events.emit("workspace:hide",{workspace: tab.id})
            },
            onshow: function(tab) {
                removeFromHideStack(tab.id);

                var hiddenTabs = JSON.parse(RED.settings.getLocal("hiddenTabs")||"{}");
                delete hiddenTabs[tab.id];
                RED.settings.setLocal("hiddenTabs",JSON.stringify(hiddenTabs));

                RED.events.emit("workspace:show",{workspace: tab.id})
            },
            minimumActiveTabWidth: 150,
            scrollable: true,
            addButton: "core:add-flow",
            addButtonCaption: RED._("workspace.addFlow"),
            menu: function() {
                var menuItems = [
                    {
                        id:"red-ui-tabs-menu-option-search-flows",
                        label: RED._("workspace.listFlows"),
                        onselect: "core:list-flows"
                    },
                    {
                        id:"red-ui-tabs-menu-option-search-subflows",
                        label: RED._("workspace.listSubflows"),
                        onselect: "core:list-subflows"
                    },
                    null,
                    {
                        id:"red-ui-tabs-menu-option-add-flow",
                        label: RED._("workspace.addFlow"),
                        onselect: "core:add-flow"
                    },
                    {
                        id:"red-ui-tabs-menu-option-add-flow-right",
                        label: RED._("workspace.addFlowToRight"),
                        onselect: "core:add-flow-to-right"
                    },
                    null,
                    {
                        id:"red-ui-tabs-menu-option-add-hide-flows",
                        label: RED._("workspace.hideFlow"),
                        onselect: "core:hide-flow"
                    },
                    {
                        id:"red-ui-tabs-menu-option-add-hide-other-flows",
                        label: RED._("workspace.hideOtherFlows"),
                        onselect: "core:hide-other-flows"
                    },
                    {
                        id:"red-ui-tabs-menu-option-add-show-all-flows",
                        label: RED._("workspace.showAllFlows"),
                        onselect: "core:show-all-flows"
                    },
                    {
                        id:"red-ui-tabs-menu-option-add-hide-all-flows",
                        label: RED._("workspace.hideAllFlows"),
                        onselect: "core:hide-all-flows"
                    },
                    {
                        id:"red-ui-tabs-menu-option-add-show-last-flow",
                        label: RED._("workspace.showLastHiddenFlow"),
                        onselect: "core:show-last-hidden-flow"
                    }
                ]
                let hiddenFlows = new Set()
                for (let i = 0; i < hideStack.length; i++) {
                    let ids = hideStack[i]
                    if (!Array.isArray(ids)) {
                        ids = [ids]
                    }
                    ids.forEach(id => {
                        if (RED.nodes.workspace(id)) {
                            hiddenFlows.add(id)
                        }
                    })
                }
                const flowCount = hiddenFlows.size;
                if (flowCount > 0) {
                    menuItems.unshift({
                        label: RED._("workspace.hiddenFlows",{count: flowCount}),
                        onselect: "core:list-hidden-flows"
                    })
                }
                return menuItems;
            }
        });
        workspaceTabCount = 0;
    }
    function showWorkspace() {
        $("#red-ui-workspace .red-ui-tabs").show()
        $("#red-ui-workspace-chart").show()
        $("#red-ui-workspace-footer").children().show()
    }
    function hideWorkspace() {
        $("#red-ui-workspace .red-ui-tabs").hide()
        $("#red-ui-workspace-chart").hide()
        $("#red-ui-workspace-footer").children().hide()
    }

    function init() {
        $('<ul id="red-ui-workspace-tabs"></ul>').appendTo("#red-ui-workspace");
        $('<div id="red-ui-workspace-tabs-shade" class="hide"></div>').appendTo("#red-ui-workspace");
        $('<div id="red-ui-workspace-chart" tabindex="1"></div>').appendTo("#red-ui-workspace");
        $('<div id="red-ui-workspace-toolbar"></div>').appendTo("#red-ui-workspace");
        $('<div id="red-ui-workspace-footer" class="red-ui-component-footer"></div>').appendTo("#red-ui-workspace");
        $('<div id="red-ui-editor-shade" class="hide"></div>').appendTo("#red-ui-workspace");


        createWorkspaceTabs();
        RED.events.on("sidebar:resize",workspace_tabs.resize);

        RED.actions.add("core:show-next-tab",function() {
            var oldActive = activeWorkspace;
            workspace_tabs.nextTab();
            if (oldActive !== activeWorkspace) {
                addToViewStack(oldActive)
            }
        });
        RED.actions.add("core:show-previous-tab",function() {
            var oldActive = activeWorkspace;
            workspace_tabs.previousTab();
            if (oldActive !== activeWorkspace) {
                addToViewStack(oldActive)
            }
        });

        RED.menu.setAction('menu-item-workspace-delete',function() {
            deleteWorkspace(RED.nodes.workspace(activeWorkspace));
        });

        $(window).on("resize", function() {
            workspace_tabs.resize();
        });

        RED.actions.add("core:add-flow",function(opts) { addWorkspace(undefined,undefined,opts?opts.index:undefined)});
        RED.actions.add("core:add-flow-to-right",function(opts) { addWorkspace(undefined,undefined,workspace_tabs.activeIndex()+1)});
        RED.actions.add("core:edit-flow",editWorkspace);
        RED.actions.add("core:remove-flow",removeWorkspace);
        RED.actions.add("core:enable-flow",enableWorkspace);
        RED.actions.add("core:disable-flow",disableWorkspace);

        RED.actions.add("core:hide-flow", function() {
            var selection = workspace_tabs.selection();
            if (selection.length === 0) {
                selection = [{id:activeWorkspace}]
            }
            var hiddenTabs = [];
            selection.forEach(function(ws) {
                RED.workspaces.hide(ws.id);
                hideStack.pop();
                hiddenTabs.push(ws.id);
            })
            if (hiddenTabs.length > 0) {
                hideStack.push(hiddenTabs);
            }
            workspace_tabs.clearSelection();
        })

        RED.actions.add("core:hide-other-flows", function() {
            var selection = workspace_tabs.selection();
            if (selection.length === 0) {
                selection = [{id:activeWorkspace}]
            }
            var selected = new Set(selection.map(function(ws) { return ws.id }))

            var currentTabs = workspace_tabs.listTabs();
            var hiddenTabs = [];
            currentTabs.forEach(function(id) {
                if (!selected.has(id)) {
                    RED.workspaces.hide(id);
                    hideStack.pop();
                    hiddenTabs.push(id);
                }
            })
            if (hiddenTabs.length > 0) {
                hideStack.push(hiddenTabs);
            }
        })

        RED.actions.add("core:hide-all-flows", function() {
            var currentTabs = workspace_tabs.listTabs();
            currentTabs.forEach(function(id) {
                RED.workspaces.hide(id);
                hideStack.pop();
            })
            if (currentTabs.length > 0) {
                hideStack.push(currentTabs);
            }
            workspace_tabs.clearSelection();
        })
        RED.actions.add("core:show-all-flows", function() {
            var currentTabs = workspace_tabs.listTabs();
            currentTabs.forEach(function(id) {
                RED.workspaces.show(id, null, true)
            })
        })
        // RED.actions.add("core:toggle-flows", function() {
        //     var currentTabs = workspace_tabs.listTabs();
        //     var visibleCount = workspace_tabs.count();
        //     currentTabs.forEach(function(id) {
        //         if (visibleCount === 0) {
        //             RED.workspaces.show(id)
        //         } else {
        //             RED.workspaces.hide(id)
        //         }
        //     })
        // })
        RED.actions.add("core:show-last-hidden-flow", function() {
            var id = hideStack.pop();
            if (id) {
                if (typeof id === 'string') {
                    RED.workspaces.show(id);
                } else {
                    var last = id.pop();
                    id.forEach(function(i) {
                        RED.workspaces.show(i, null, true);
                    })
                    setTimeout(function() {
                        RED.workspaces.show(last);
                    },150)

                }
            }
        })
        RED.actions.add("core:list-modified-nodes",function() {
            RED.actions.invoke("core:search","is:modified ");
        })
        RED.actions.add("core:list-hidden-flows",function() {
            RED.actions.invoke("core:search","is:hidden ");
        })
        RED.actions.add("core:list-flows",function() {
            RED.actions.invoke("core:search","type:tab ");
        })
        RED.actions.add("core:list-subflows",function() {
            RED.actions.invoke("core:search","type:subflow ");
        })
        RED.actions.add("core:go-to-previous-location", function() {
            if (viewStackPos > 0) {
                if (viewStackPos === viewStack.length) {
                    // We're at the end of the stack. Remember the activeWorkspace
                    // so we can come back to it.
                    viewStack.push(activeWorkspace);
                }
                RED.workspaces.show(viewStack[--viewStackPos],true);
            }
        })
        RED.actions.add("core:go-to-next-location", function() {
            if (viewStackPos < viewStack.length - 1) {
                RED.workspaces.show(viewStack[++viewStackPos],true);
            }
        })
        hideWorkspace();
    }

    function editWorkspace(id) {
        showEditWorkspaceDialog(id||activeWorkspace);
    }

    function enableWorkspace(id) {
        setWorkspaceState(id,false);
    }
    function disableWorkspace(id) {
        setWorkspaceState(id,true);
    }
    function setWorkspaceState(id,disabled) {
        var workspace = RED.nodes.workspace(id||activeWorkspace);
        if (!workspace) {
            return;
        }
        if (workspace.disabled !== disabled) {
            var changes = { disabled: workspace.disabled };
            workspace.disabled = disabled;
            $("#red-ui-tab-"+(workspace.id.replace(".","-"))).toggleClass('red-ui-workspace-disabled',!!workspace.disabled);
            if (!id || (id === activeWorkspace)) {
                $("#red-ui-workspace").toggleClass("red-ui-workspace-disabled",!!workspace.disabled);
            }
            var historyEvent = {
                t: "edit",
                changes:changes,
                node: workspace,
                dirty: RED.nodes.dirty()
            }
            workspace.changed = true;
            RED.history.push(historyEvent);
            RED.events.emit("flows:change",workspace);
            RED.nodes.dirty(true);
            RED.sidebar.config.refresh();
            var selection = RED.view.selection();
            if (!selection.nodes && !selection.links && workspace.id === activeWorkspace) {
                RED.sidebar.info.refresh(workspace);
            }
            if (changes.hasOwnProperty('disabled')) {
                RED.nodes.eachNode(function(n) {
                    if (n.z === workspace.id) {
                        n.dirty = true;
                    }
                });
                RED.view.redraw();
            }
        }
    }

    function removeWorkspace(ws) {
        if (!ws) {
            deleteWorkspace(RED.nodes.workspace(activeWorkspace));
        } else {
            if (workspace_tabs.contains(ws.id)) {
                workspace_tabs.removeTab(ws.id);
            }
            if (ws.id === activeWorkspace) {
                activeWorkspace = 0;
            }
        }
    }

    function setWorkspaceOrder(order) {
        var newOrder = order.filter(function(id) {
            return RED.nodes.workspace(id) !== undefined;
        })
        var currentOrder = RED.nodes.getWorkspaceOrder();
        if (JSON.stringify(newOrder) !== JSON.stringify(currentOrder)) {
            RED.nodes.setWorkspaceOrder(newOrder);
            RED.events.emit("flows:reorder",newOrder);
        }
        workspace_tabs.order(order);
    }

    function flashTab(tabId) {
        if(flashingTab && flashingTab.length) {
            //cancel current flashing node before flashing new node
            clearInterval(flashingTabTimer);
            flashingTabTimer = null;
            flashingTab.removeClass('highlighted');
            flashingTab = null;
        }
        let tab = $("#red-ui-tab-" + tabId);
        if(!tab || !tab.length) { return; }

        flashingTabTimer = setInterval(function(flashEndTime) {
            if (flashEndTime >= Date.now()) {
                const highlighted = tab.hasClass("highlighted");
                tab.toggleClass('highlighted', !highlighted)
            } else {
                clearInterval(flashingTabTimer);
                flashingTabTimer = null;
                flashingTab = null;
                tab.removeClass('highlighted');
            }
        }, 100, Date.now() + 2200);
        flashingTab = tab;
        tab.addClass('highlighted');
    }
    return {
        init: init,
        add: addWorkspace,
        // remove: remove workspace without editor history etc
        remove: removeWorkspace,
        // delete: remove workspace and update editor history
        delete: deleteWorkspace,
        order: setWorkspaceOrder,
        edit: editWorkspace,
        contains: function(id) {
            return workspace_tabs.contains(id);
        },
        count: function() {
            return workspaceTabCount;
        },
        active: function() {
            return activeWorkspace
        },
        selection: function() {
            return workspace_tabs.selection();
        },
        hide: function(id) {
            if (!id) {
                id = activeWorkspace;
            }
            if (workspace_tabs.contains(id)) {
                workspace_tabs.hideTab(id);
            }
        },
        isHidden: function(id) {
            return hideStack.includes(id)
        },
        show: function(id,skipStack,unhideOnly,flash) {
            if (!workspace_tabs.contains(id)) {
                var sf = RED.nodes.subflow(id);
                if (sf) {
                    addWorkspace(
                        {type:"subflow",id:id,icon:"red/images/subflow_tab.svg",label:sf.name, closeable: true},
                        null,
                        workspace_tabs.activeIndex()+1
                    );
                    removeFromHideStack(id);
                } else {
                    return;
                }
            }
            if (unhideOnly) {
                workspace_tabs.showTab(id);
            } else {
                if (!skipStack && activeWorkspace !== id) {
                    addToViewStack(activeWorkspace)
                }
                workspace_tabs.activateTab(id);
            }
            if(flash) {
                flashTab(id.replace(".","-"))
            }
        },
        refresh: function() {
            RED.nodes.eachWorkspace(function(ws) {
                workspace_tabs.renameTab(ws.id,ws.label);
                $("#red-ui-tab-"+(ws.id.replace(".","-"))).attr("flowname",ws.label)
            })
            RED.nodes.eachSubflow(function(sf) {
                if (workspace_tabs.contains(sf.id)) {
                    workspace_tabs.renameTab(sf.id,sf.name);
                }
            });
            RED.sidebar.config.refresh();
        },
        resize: function() {
            workspace_tabs.resize();
        },
        enable: enableWorkspace,
        disable: disableWorkspace
    }
})();
