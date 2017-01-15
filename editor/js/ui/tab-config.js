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
    content.className = "sidebar-node-config";

    $('<div class="button-group sidebar-header">'+
      '<a class="sidebar-header-button-toggle selected" id="workspace-config-node-filter-all" href="#"><span data-i18n="sidebar.config.filterAll"></span></a>'+
      '<a class="sidebar-header-button-toggle" id="workspace-config-node-filter-unused" href="#"><span data-i18n="sidebar.config.filterUnused"></span></a> '+
      '</div>'
    ).appendTo(content);


    var toolbar = $('<div>'+
        '<a class="sidebar-footer-button" id="workspace-config-node-collapse-all" href="#"><i class="fa fa-angle-double-up"></i></a> '+
        '<a class="sidebar-footer-button" id="workspace-config-node-expand-all" href="#"><i class="fa fa-angle-double-down"></i></a>'+
        '</div>');

    var globalCategories = $("<div>").appendTo(content);
    var flowCategories = $("<div>").appendTo(content);
    var subflowCategories = $("<div>").appendTo(content);

    var showUnusedOnly = false;

    var categories = {};

    function getOrCreateCategory(name,parent,label) {
        name = name.replace(/\./i,"-");
        if (!categories[name]) {
            var container = $('<div class="palette-category workspace-config-node-category" id="workspace-config-node-category-'+name+'"></div>').appendTo(parent);
            var header = $('<div class="workspace-config-node-tray-header palette-header"><i class="fa fa-angle-down expanded"></i></div>').appendTo(container);
            if (label) {
                $('<span class="config-node-label"/>').text(label).appendTo(header);
            } else {
                $('<span class="config-node-label" data-i18n="sidebar.config.'+name+'">').appendTo(header);
            }
            $('<span class="config-node-filter-info"></span>').appendTo(header);
            category = $('<ul class="palette-content config-node-list"></ul>').appendTo(container);
            container.i18n();
            var icon = header.find("i");
            var result = {
                label: label,
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
                categories[name].list.parent().find('.config-node-label').text(label);
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
                list.parent().find('.config-node-filter-info').text(RED._('sidebar.config.filtered',{count:hiddenCount})).show();
            } else {
                list.parent().find('.config-node-filter-info').hide();
            }
        } else {
            list.parent().find('.config-node-filter-info').hide();
        }
        list.empty();
        if (nodes.length === 0) {
            $('<li class="config_node_none" data-i18n="sidebar.config.none">NONE</li>').i18n().appendTo(list);
            category.close(true);
        } else {
            var currentType = "";
            nodes.forEach(function(node) {
                var label = "";
                if (typeof node._def.label == "function") {
                    try {
                        label = node._def.label.call(node);
                    } catch(err) {
                        console.log("Definition error: "+node._def.type+".label",err);
                        label = node._def.type;
                    }

                } else {
                    label = node._def.label;
                }
                label = label || node.id;
                if (node.type != currentType) {
                    $('<li class="config_node_type">'+node.type+'</li>').appendTo(list);
                    currentType = node.type;
                }

                var entry = $('<li class="palette_node config_node palette_node_id_'+node.id.replace(/\./g,"-")+'"></li>').appendTo(list);
                $('<div class="palette_label"></div>').text(label).appendTo(entry);
                if (node._def.hasUsers !== false) {
                    var iconContainer = $('<div/>',{class:"palette_icon_container  palette_icon_container_right"}).text(node.users.length).appendTo(entry);
                    if (node.users.length === 0) {
                        entry.addClass("config_node_unused");
                    }
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
            validList[ws.id.replace(/\./g,"-")] = true;
            getOrCreateCategory(ws.id,flowCategories,ws.label);
        })
        RED.nodes.eachSubflow(function(sf) {
            validList[sf.id.replace(/\./g,"-")] = true;
            getOrCreateCategory(sf.id,subflowCategories,sf.name);
        })
        $(".workspace-config-node-category").each(function() {
            var id = $(this).attr('id').substring("workspace-config-node-category-".length);
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
            closeable: true,
            visible: false,
            onchange: function() { refreshConfigNodeList(); }
        });
        RED.actions.add("core:show-config-tab",function() {RED.sidebar.show('config')});

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
        $('#workspace-config-node-filter-all').on("click",function(e) {
            e.preventDefault();
            if (showUnusedOnly) {
                $(this).addClass('selected');
                $('#workspace-config-node-filter-unused').removeClass('selected');
                showUnusedOnly = !showUnusedOnly;
                refreshConfigNodeList();
            }
        });
        $('#workspace-config-node-filter-unused').on("click",function(e) {
            e.preventDefault();
            if (!showUnusedOnly) {
                $(this).addClass('selected');
                $('#workspace-config-node-filter-all').removeClass('selected');
                showUnusedOnly = !showUnusedOnly;
                refreshConfigNodeList();
            }
        });


    }
    function show(id) {
        if (typeof id === 'boolean') {
            if (id) {
                $('#workspace-config-node-filter-unused').click();
            } else {
                $('#workspace-config-node-filter-all').click();
            }
        }
        refreshConfigNodeList();
        if (typeof id === "string") {
            $('#workspace-config-node-filter-all').click();
            id = id.replace(/\./g,"-");
            setTimeout(function() {
                var node = $(".palette_node_id_"+id);
                var y = node.position().top;
                var h = node.height();
                var scrollWindow = $(".sidebar-node-config");
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
