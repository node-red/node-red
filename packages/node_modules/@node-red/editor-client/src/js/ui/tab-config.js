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
RED.sidebar.config = (function() {


    var content = document.createElement("div");
    content.className = "red-ui-sidebar-node-config";
    content.id = "red-ui-sidebar-node-config";
    content.tabIndex = 0;

    $('<div class="red-ui-sidebar-header"><span class="button-group">'+
      '<a class="red-ui-sidebar-header-button-toggle selected" id="red-ui-sidebar-config-filter-all" href="#"><span data-i18n="sidebar.config.filterAll"></span></a>'+
      '<a class="red-ui-sidebar-header-button-toggle" id="red-ui-sidebar-config-filter-unused" href="#"><span data-i18n="sidebar.config.filterUnused"></span></a> '+
      '</span></div>'
    ).appendTo(content);


    var toolbar = $('<div>'+
        '<a class="red-ui-footer-button" id="red-ui-sidebar-config-collapse-all" href="#"><i class="fa fa-angle-double-up"></i></a> '+
        '<a class="red-ui-footer-button" id="red-ui-sidebar-config-expand-all" href="#"><i class="fa fa-angle-double-down"></i></a>'+
        '</div>');

    var globalCategories = $("<div>").appendTo(content);
    var flowCategories = $("<div>").appendTo(content);
    var subflowCategories = $("<div>").appendTo(content);

    var showUnusedOnly = false;

    var categories = {};

    function getOrCreateCategory(name,parent,label) {
        name = name.replace(/\./i,"-");
        if (!categories[name]) {
            var container = $('<div class="red-ui-palette-category red-ui-sidebar-config-category" id="red-ui-sidebar-config-category-'+name+'"></div>').appendTo(parent);
            var header = $('<div class="red-ui-sidebar-config-tray-header red-ui-palette-header"><i class="fa fa-angle-down expanded"></i></div>').appendTo(container);
            if (label) {
                $('<span class="red-ui-palette-node-config-label"/>').text(label).appendTo(header);
            } else {
                $('<span class="red-ui-palette-node-config-label" data-i18n="sidebar.config.'+name+'">').appendTo(header);
            }
            $('<span class="red-ui-sidebar-node-config-filter-info"></span>').appendTo(header);
            category = $('<ul class="red-ui-palette-content red-ui-sidebar-node-config-list"></ul>').appendTo(container);
            category.on("click", function(e) {
                $(content).find(".red-ui-palette-node").removeClass("selected");
            });
            container.i18n();
            var icon = header.find("i");
            var result = {
                label: label,
                list: category,
                size: function() {
                    return result.list.find("li:not(.red-ui-palette-node-config-none)").length
                },
                open: function(snap) {
                    if (!icon.hasClass("expanded")) {
                        icon.addClass("expanded");
                        if (snap) {
                            result.list.show();
                        } else {
                            result.list.slideDown();
                        }
                    }
                },
                close: function(snap) {
                    if (icon.hasClass("expanded")) {
                        icon.removeClass("expanded");
                        if (snap) {
                            result.list.hide();
                        } else {
                            result.list.slideUp();
                        }
                    }
                },
                isOpen: function() {
                    return icon.hasClass("expanded");
                }
            };

            header.on('click', function(e) {
                if (result.isOpen()) {
                    result.close();
                } else {
                    result.open();
                }
            });
            categories[name] = result;
        } else {
            if (categories[name].label !== label) {
                categories[name].list.parent().find('.red-ui-palette-node-config-label').text(label);
                categories[name].label = label;
            }
        }
        return categories[name];
    }

    function createConfigNodeList(id,nodes) {
        var category = getOrCreateCategory(id.replace(/\./i,"-"))
        var list = category.list;

        nodes.sort(function(A,B) {
            if (A.type < B.type) { return -1;}
            if (A.type > B.type) { return 1;}
            return 0;
        });
        if (showUnusedOnly) {
            var hiddenCount = nodes.length;
            nodes = nodes.filter(function(n) {
                return n._def.hasUsers!==false && n.users.length === 0;
            })
            hiddenCount = hiddenCount - nodes.length;
            if (hiddenCount > 0) {
                list.parent().find('.red-ui-sidebar-node-config-filter-info').text(RED._('sidebar.config.filtered',{count:hiddenCount})).show();
            } else {
                list.parent().find('.red-ui-sidebar-node-config-filter-info').hide();
            }
        } else {
            list.parent().find('.red-ui-sidebar-node-config-filter-info').hide();
        }
        list.empty();
        if (nodes.length === 0) {
            $('<li class="red-ui-palette-node-config-none" data-i18n="sidebar.config.none">NONE</li>').i18n().appendTo(list);
            category.close(true);
        } else {
            var currentType = "";
            nodes.forEach(function(node) {
                var label = RED.utils.getNodeLabel(node,node.id);
                if (node.type != currentType) {
                    $('<li class="red-ui-palette-node-config-type">'+node.type+'</li>').appendTo(list);
                    currentType = node.type;
                }

                var entry = $('<li class="red-ui-palette-node_id_'+node.id.replace(/\./g,"-")+'"></li>').appendTo(list);
                var nodeDiv = $('<div class="red-ui-palette-node-config red-ui-palette-node"></div>').appendTo(entry);
                entry.data('node',node.id);
                var label = $('<div class="red-ui-palette-label"></div>').text(label).appendTo(nodeDiv);
                if (node.d) {
                    nodeDiv.addClass("red-ui-palette-node-config-disabled");
                    $('<i class="fa fa-ban"></i>').prependTo(label);
                }

                if (node._def.hasUsers !== false) {
                    var iconContainer = $('<div/>',{class:"red-ui-palette-icon-container red-ui-palette-icon-container-right"}).appendTo(nodeDiv);
                    if (node.users.length === 0) {
                        iconContainer.text(0);
                    } else {
                        $('<a href="#"/>').on("click", function(e) {
                            e.stopPropagation();
                            e.preventDefault();
                            RED.search.show(node.id);
                        }).text(node.users.length).appendTo(iconContainer);
                    }
                    RED.popover.tooltip(iconContainer,RED._('editor.nodesUse',{count:node.users.length}));
                    if (node.users.length === 0) {
                        nodeDiv.addClass("red-ui-palette-node-config-unused");
                    }
                }
                nodeDiv.on('click',function(e) {
                    e.stopPropagation();
                    RED.view.select(false);
                    if (e.metaKey) {
                        $(this).toggleClass("selected");
                    } else {
                        $(content).find(".red-ui-palette-node").removeClass("selected");
                        $(this).addClass("selected");
                    }
                    RED.sidebar.info.refresh(node);
                });
                nodeDiv.on('dblclick',function(e) {
                    e.stopPropagation();
                    RED.editor.editConfig("", node.type, node.id);
                });
                var userArray = node.users.map(function(n) { return n.id });
                nodeDiv.on('mouseover',function(e) {
                    RED.nodes.eachNode(function(node) {
                        if( userArray.indexOf(node.id) != -1) {
                            node.highlighted = true;
                            node.dirty = true;
                        }
                    });
                    RED.view.redraw();
                });
                nodeDiv.on('mouseout',function(e) {
                    RED.nodes.eachNode(function(node) {
                        if(node.highlighted) {
                            node.highlighted = false;
                            node.dirty = true;
                        }
                    });
                    RED.view.redraw();
                });
            });
            category.open(true);
        }
    }

    function refreshConfigNodeList() {
        var validList = {"global":true};

        getOrCreateCategory("global",globalCategories);

        RED.nodes.eachWorkspace(function(ws) {
            validList[ws.id.replace(/\./g,"-")] = true;
            getOrCreateCategory(ws.id,flowCategories,ws.label);
        })
        RED.nodes.eachSubflow(function(sf) {
            validList[sf.id.replace(/\./g,"-")] = true;
            getOrCreateCategory(sf.id,subflowCategories,sf.name);
        })
        $(".red-ui-sidebar-config-category").each(function() {
            var id = $(this).attr('id').substring("red-ui-sidebar-config-category-".length);
            if (!validList[id]) {
                $(this).remove();
                delete categories[id];
            }
        })
        var globalConfigNodes = [];
        var configList = {};
        RED.nodes.eachConfig(function(cn) {
            if (cn.z) {//} == RED.workspaces.active()) {
                configList[cn.z.replace(/\./g,"-")] = configList[cn.z.replace(/\./g,"-")]||[];
                configList[cn.z.replace(/\./g,"-")].push(cn);
            } else if (!cn.z) {
                globalConfigNodes.push(cn);
            }
        });
        for (var id in validList) {
            if (validList.hasOwnProperty(id)) {
                createConfigNodeList(id,configList[id]||[]);
            }
        }
        createConfigNodeList('global',globalConfigNodes);
    }

    function init() {
        RED.sidebar.addTab({
            id: "config",
            label: RED._("sidebar.config.label"),
            name: RED._("sidebar.config.name"),
            content: content,
            toolbar: toolbar,
            iconClass: "fa fa-cog",
            action: "core:show-config-tab",
            onchange: function() { refreshConfigNodeList(); }
        });
        RED.actions.add("core:show-config-tab", function() {RED.sidebar.show('config')});
        RED.actions.add("core:select-all-config-nodes", function() {
            $(content).find(".red-ui-palette-node").addClass("selected");
        })
        RED.actions.add("core:delete-config-selection", function() {
            var selectedNodes = [];
            $(content).find(".red-ui-palette-node.selected").each(function() {
                selectedNodes.push($(this).parent().data('node'));
            });
            if (selectedNodes.length > 0) {
                var historyEvent = {
                    t:'delete',
                    nodes:[],
                    changes: {},
                    dirty: RED.nodes.dirty()
                }
                selectedNodes.forEach(function(id) {
                    var node = RED.nodes.node(id);
                    try {
                        if (node._def.oneditdelete) {
                            node._def.oneditdelete.call(node);
                        }
                    } catch(err) {
                        console.log("oneditdelete",node.id,node.type,err.toString());
                    }
                    historyEvent.nodes.push(node);
                    for (var i=0;i<node.users.length;i++) {
                        var user = node.users[i];
                        historyEvent.changes[user.id] = {
                            changed: user.changed,
                            valid: user.valid
                        };
                        for (var d in user._def.defaults) {
                            if (user._def.defaults.hasOwnProperty(d) && user[d] == id) {
                                historyEvent.changes[user.id][d] = id
                                user[d] = "";
                                user.changed = true;
                                user.dirty = true;
                            }
                        }
                        RED.editor.validateNode(user);
                    }
                    RED.nodes.remove(id);
                })
                RED.nodes.dirty(true);
                RED.view.redraw(true);
                RED.history.push(historyEvent);
            }
        });


        RED.events.on("view:selection-changed",function() {
            $(content).find(".red-ui-palette-node").removeClass("selected");
        });

        $("#red-ui-sidebar-config-collapse-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categories) {
                if (categories.hasOwnProperty(cat)) {
                    categories[cat].close();
                }
            }
        });
        $("#red-ui-sidebar-config-expand-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categories) {
                if (categories.hasOwnProperty(cat)) {
                    if (categories[cat].size() > 0) {
                        categories[cat].open();
                    }
                }
            }
        });
        $('#red-ui-sidebar-config-filter-all').on("click",function(e) {
            e.preventDefault();
            if (showUnusedOnly) {
                $(this).addClass('selected');
                $('#red-ui-sidebar-config-filter-unused').removeClass('selected');
                showUnusedOnly = !showUnusedOnly;
                refreshConfigNodeList();
            }
        });
        $('#red-ui-sidebar-config-filter-unused').on("click",function(e) {
            e.preventDefault();
            if (!showUnusedOnly) {
                $(this).addClass('selected');
                $('#red-ui-sidebar-config-filter-all').removeClass('selected');
                showUnusedOnly = !showUnusedOnly;
                refreshConfigNodeList();
            }
        });
        RED.popover.tooltip($('#red-ui-sidebar-config-filter-all'), RED._("sidebar.config.showAllUnusedConfigNodes"));
        RED.popover.tooltip($('#red-ui-sidebar-config-filter-unused'), RED._("sidebar.config.showAllUnusedConfigNodes"));

    }
    function show(id) {
        if (typeof id === 'boolean') {
            if (id) {
                $('#red-ui-sidebar-config-filter-unused').trigger("click");
            } else {
                $('#red-ui-sidebar-config-filter-all').trigger("click");
            }
        }
        refreshConfigNodeList();
        if (typeof id === "string") {
            $('#red-ui-sidebar-config-filter-all').trigger("click");
            id = id.replace(/\./g,"-");
            setTimeout(function() {
                var node = $(".red-ui-palette-node_id_"+id);
                var y = node.position().top;
                var h = node.height();
                var scrollWindow = $(".red-ui-sidebar-node-config");
                var scrollHeight = scrollWindow.height();

                if (y+h > scrollHeight) {
                    scrollWindow.animate({scrollTop: '-='+(scrollHeight-(y+h)-30)},150);
                } else if (y<0) {
                    scrollWindow.animate({scrollTop: '+='+(y-10)},150);
                }
                var flash = 21;
                var flashFunc = function() {
                    if ((flash%2)===0) {
                        node.removeClass('node_highlighted');
                    } else {
                        node.addClass('node_highlighted');
                    }
                    flash--;
                    if (flash >= 0) {
                        setTimeout(flashFunc,100);
                    }
                }
                flashFunc();
            },100);
        }
        RED.sidebar.show("config");
    }
    return {
        init:init,
        show:show,
        refresh:refreshConfigNodeList
    }
})();
