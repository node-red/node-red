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

    $('<div class="palette-category">'+
      '<div class="workspace-config-node-tray-header palette-header"><i class="fa fa-angle-down expanded"></i><span data-i18n="sidebar.config.local"></span></div>'+
    '<ul id="workspace-config-node-tray-locals" class="palette-content config-node-list"></ul>'+
    '</div>'+
    '<div class="palette-category">'+
        '<div class="workspace-config-node-tray-header palette-header"><i class="fa fa-angle-down expanded"></i><span data-i18n="sidebar.config.global"></span></div>'+
        '<ul id="workspace-config-node-tray-globals" class="palette-content config-node-list"></ul>'+
    '</div>').appendTo(content);

    function createConfigNodeList(nodes,list) {
        nodes.sort(function(A,B) {
            if (A.type < B.type) { return -1;}
            if (A.type > B.type) { return 1;}
            return 0;
        });
        list.empty();
        if (nodes.length === 0) {
            $('<li class="config_node_none" data-i18n="sidebar.config.none">NONE</li>').i18n().appendTo(list);
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
        }
    }

    function refreshConfigNodeList() {

        var localConfigNodes = [];
        var globalConfigNodes = [];

        RED.nodes.eachConfig(function(cn) {
            if (cn.z == RED.workspaces.active()) {
                localConfigNodes.push(cn);
            } else if (!cn.z) {
                globalConfigNodes.push(cn);
            }
        });
        createConfigNodeList(localConfigNodes,$("#workspace-config-node-tray-locals"));
        createConfigNodeList(globalConfigNodes,$("#workspace-config-node-tray-globals"));
    }

    function init() {
        RED.sidebar.addTab({
            id: "config",
            label: RED._("sidebar.config.label"),
            name: RED._("sidebar.config.name"),
            content: content,
            closeable: true,
            visible: false,
            onchange: function() { refreshConfigNodeList(); }
        });

        $(".workspace-config-node-tray-header").on('click', function(e) {
            var icon = $(this).find("i");
            if (icon.hasClass("expanded")) {
                icon.removeClass("expanded");
                $(this).next().slideUp();
            } else {
                icon.addClass("expanded");
                $(this).next().slideDown();
            }

        });

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
