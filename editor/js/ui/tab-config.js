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
RED.sidebar.config = (function() {


    var content = document.createElement("div");
    content.className = "sidebar-node-config"

    var toolbar = $('<div id="palette-footer">'+
        //'<a class="sidebar-button text-button" id="workspace-config-node-filter-unused" href="#"><i class="fa fa-square-o"></i> <span data-i18n="sidebar.config.filterUnused"></span></a> '+
        '<a class="sidebar-button" id="workspace-config-node-collapse-all" href="#"><i class="fa fa-angle-double-up"></i></a> '+
        '<a class="sidebar-button" id="workspace-config-node-expand-all" href="#"><i class="fa fa-angle-double-down"></i></a>'+
        '</div>');


    var flowCategories = $("<div>").appendTo(content);
    var subflowCategories = $("<div>").appendTo(content);
    var globalCategories = $("<div>").appendTo(content);

    var showUnusedOnly = false;

    // $('<div class="palette-category">'+
    //   '<div class="workspace-config-node-tray-header palette-header"><i class="fa fa-angle-down expanded"></i><span data-i18n="sidebar.config.local"></span></div>'+
    // '<ul id="workspace-config-node-tray-locals" class="palette-content config-node-list"></ul>'+
    // '</div>'+
    // '<div class="palette-category">'+
    //     '<div class="workspace-config-node-tray-header palette-header"><i class="fa fa-angle-down expanded"></i><span data-i18n="sidebar.config.global"></span></div>'+
    //     '<ul id="workspace-config-node-tray-globals" class="palette-content config-node-list"></ul>'+
    // '</div>').appendTo(content);

    var categories = {};

    function getOrCreateCategory(name,parent,label) {
        name = name.replace(/\./i,"-");
        if (!categories[name]) {
            var container = $('<div class="palette-category workspace-config-node-category" id="workspace-config-node-category-'+name+'"></div>').appendTo(parent);
            var header = $('<div class="workspace-config-node-tray-header palette-header"><i class="fa fa-angle-down expanded"></i></div>').appendTo(container);
            if (label) {
                $('<span/>').text(label).appendTo(header);
            } else {
                $('<span data-i18n="sidebar.config.'+name+'">').appendTo(header);
            }
            category = $('<ul class="palette-content config-node-list"></ul>').appendTo(container);
            container.i18n();
            var icon = header.find("i");
            var result = {
                list: category,
                size: function() {
                    return result.list.find("li:not(.config_node_none)").length
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
                }
            };

            header.on('click', function(e) {
                if (icon.hasClass("expanded")) {
                    result.close();
                } else {
                    result.open();
                }
            });
            categories[name] = result;
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
            nodes = nodes.filter(function(n) {
                return n.users.length === 0;
            })
        }
        // console.log(list);
        list.empty();
        if (nodes.length === 0) {
            $('<li class="config_node_none" data-i18n="sidebar.config.none">NONE</li>').i18n().appendTo(list);
            category.close(true);
        } else {
            var currentType = "";
            nodes.forEach(function(node) {
                var label = "";
                if (typeof node._def.label == "function") {
                    label = node._def.label.call(node);
                } else {
                    label = node._def.label;
                }
                label = label || node.id;
                if (node.type != currentType) {
                    $('<li class="config_node_type">'+node.type+'</li>').appendTo(list);
                    currentType = node.type;
                }

                var entry = $('<li class="palette_node config_node"></li>').appendTo(list);
                $('<div class="palette_label"></div>').text(label).appendTo(entry);

                var iconContainer = $('<div/>',{class:"palette_icon_container  palette_icon_container_right"}).text(node.users.length).appendTo(entry);
                if (node.users.length === 0) {
                    entry.addClass("config_node_unused");
                }
                entry.on('click',function(e) {
                    RED.sidebar.info.refresh(node);
                });
                entry.on('dblclick',function(e) {
                    RED.editor.editConfig("", node.type, node.id);
                });
                var userArray = node.users.map(function(n) { return n.id });
                entry.on('mouseover',function(e) {
                    RED.nodes.eachNode(function(node) {
                        if( userArray.indexOf(node.id) != -1) {
                            node.highlighted = true;
                            node.dirty = true;
                        }
                    });
                    RED.view.redraw();
                });

                entry.on('mouseout',function(e) {
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
            validList[ws.id] = true;
            getOrCreateCategory(ws.id,flowCategories,ws.label);
        })
        RED.nodes.eachSubflow(function(sf) {
            validList[sf.id] = true;
            getOrCreateCategory(sf.id,subflowCategories,sf.name);
        })
        // $(".workspace-config-node-category").each(function() {
        //     if (!validList[$(this).attr('id').substring("workspace-config-node-category-".length)]) {
        //         $(this).remove();
        //     }
        // })
        var globalConfigNodes = [];
        var configList = {};
        RED.nodes.eachConfig(function(cn) {
            if (cn.z) {//} == RED.workspaces.active()) {
                configList[cn.z] = configList[cn.z]||[];
                configList[cn.z].push(cn);
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
            closeable: true,
            visible: false,
            onchange: function() { refreshConfigNodeList(); }
        });

        RED.menu.setAction('menu-item-config-nodes',function() {
            RED.sidebar.show('config');
        })

        $("#workspace-config-node-collapse-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categories) {
                if (categories.hasOwnProperty(cat)) {
                    categories[cat].close();
                }
            }
        });
        $("#workspace-config-node-expand-all").on("click", function(e) {
            e.preventDefault();
            for (var cat in categories) {
                if (categories.hasOwnProperty(cat)) {
                    if (categories[cat].size() > 0) {
                        categories[cat].open();
                    }
                }
            }
        });
        $('#workspace-config-node-filter-unused').on("click",function(e) {
            e.preventDefault();
            if (showUnusedOnly) {
                $(this).find("i").addClass('fa-square-o').removeClass('fa-check-square-o');
            } else {
                $(this).find("i").removeClass('fa-square-o').addClass('fa-check-square-o');
            }
            showUnusedOnly = !showUnusedOnly;
            refreshConfigNodeList();
        })


    }
    function show() {
        refreshConfigNodeList();
        RED.sidebar.show("config");
    }
    return {
        init:init,
        show:show,
        refresh:refreshConfigNodeList
    }
})();
