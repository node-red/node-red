/**
 * Copyright 2013 IBM Corp.
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
    content.id = "tab-config";
    content.style.paddingTop = "4px";
    content.style.paddingLeft = "4px";
    content.style.paddingRight = "4px";
    
    var list = $("<ul>",{class:"tab-config-list"}).appendTo(content);
    
    function show() {
        if (!RED.sidebar.containsTab("config")) {
            RED.sidebar.addTab("config",content,true);
        }
        refresh();
        RED.sidebar.show("config");
    }
    
    function refresh() {
        list.empty();
        RED.nodes.eachConfig(function(node) {
            var li = list.find("#tab-config-list-type-"+node.type);
            if (li.length === 0) {
                li = $("<li>",{id:"tab-config-list-type-"+node.type}).appendTo(list);
                $('<div class="tab-config-list-type">'+node.type+'</div>').appendTo(li);
            }
            var label = "";
            if (typeof node._def.label == "function") {
                label = node._def.label.call(node);
            } else {
                label = node._def.label;
            }
            label = label || "&nbsp;";
            
            var entry = $('<div class="tab-config-list-entry"></div>').appendTo(li);
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
            
            $('<div class="tab-config-list-label">'+label+'</div>').appendTo(entry);
            $('<div class="tab-config-list-users">'+node.users.length+'</div>').appendTo(entry);
        });
    }
    return {
        show:show,
        refresh:refresh
    }
})();
