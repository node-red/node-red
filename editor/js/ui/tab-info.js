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
RED.sidebar.info = (function() {

    marked.setOptions({
        renderer: new marked.Renderer(),
        gfm: true,
        tables: true,
        breaks: false,
        pedantic: false,
        sanitize: true,
        smartLists: true,
        smartypants: false
    });

    var content = document.createElement("div");
    content.style.paddingTop = "4px";
    content.style.paddingLeft = "4px";
    content.style.paddingRight = "4px";
    content.className = "sidebar-node-info"

    var propertiesExpanded = false;

    function init() {
        RED.sidebar.addTab({
            id: "info",
            label: RED._("sidebar.info.label"),
            name: RED._("sidebar.info.name"),
            content: content
        });

    }

    function show() {
        RED.sidebar.show("info");
    }

    function jsonFilter(key,value) {
        if (key === "") {
            return value;
        }
        var t = typeof value;
        if ($.isArray(value)) {
            return "[array:"+value.length+"]";
        } else if (t === "object") {
            return "[object]"
        } else if (t === "string") {
            if (value.length > 30) {
                return value.substring(0,30)+" ...";
            }
        }
        return value;
    }

    function refresh(node) {
        var table = '<table class="node-info"><tbody>';
        table += '<tr class="blank"><td colspan="2">'+RED._("sidebar.info.node")+'</td></tr>';
        if (node.type != "subflow" && node.name) {
            table += "<tr><td>"+RED._("common.label.name")+"</td><td>&nbsp;"+node.name+"</td></tr>";
        }
        table += "<tr><td>"+RED._("sidebar.info.type")+"</td><td>&nbsp;"+node.type+"</td></tr>";
        table += "<tr><td>"+RED._("sidebar.info.id")+"</td><td>&nbsp;"+node.id+"</td></tr>";

        var m = /^subflow(:(.+))?$/.exec(node.type);
        var subflowNode;
        if (m) {
            if (m[2]) {
                subflowNode = RED.nodes.subflow(m[2]);
            } else {
                subflowNode = node;
            }

            table += '<tr class="blank"><td colspan="2">'+RED._("sidebar.info.subflow")+'</td></tr>';

            var userCount = 0;
            var subflowType = "subflow:"+subflowNode.id;
            RED.nodes.eachNode(function(n) {
                if (n.type === subflowType) {
                    userCount++;
                }
            });
            table += "<tr><td>"+RED._("common.label.name")+"</td><td>"+subflowNode.name+"</td></tr>";
            table += "<tr><td>"+RED._("sidebar.info.instances")+"</td><td>"+userCount+"</td></tr>";
        }

        if (!m && node.type != "subflow" && node.type != "comment") {
            table += '<tr class="blank"><td colspan="2"><a href="#" class="node-info-property-header"><i style="width: 10px; text-align: center;" class="fa fa-caret-'+(propertiesExpanded?"down":"right")+'"></i> '+RED._("sidebar.info.properties")+'</a></td></tr>';
            if (node._def) {
                for (var n in node._def.defaults) {
                    if (n != "name" && node._def.defaults.hasOwnProperty(n)) {
                        var val = node[n]||"";
                        var type = typeof val;
                        if (type === "string") {
                            if (val.length === 0) {
                                val += '<span style="font-style: italic; color: #ccc;">'+RED._("sidebar.info.blank")+'</span>';
                            } else {
                                if (val.length > 30) {
                                    val = val.substring(0,30)+" ...";
                                }
                                val = val.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                            }
                        } else if (type === "number") {
                            val = val.toString();
                        } else if ($.isArray(val)) {
                            val = "[<br/>";
                            for (var i=0;i<Math.min(node[n].length,10);i++) {
                                var vv = JSON.stringify(node[n][i],jsonFilter," ").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                                val += "&nbsp;"+i+": "+vv+"<br/>";
                            }
                            if (node[n].length > 10) {
                                val += "&nbsp;... "+RED._("sidebar.info.arrayItems",{count:node[n].length})+"<br/>";
                            }
                            val += "]";
                        } else {
                            val = JSON.stringify(val,jsonFilter," ");
                            val = val.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
                        }

                        table += '<tr class="node-info-property-row'+(propertiesExpanded?"":" hide")+'"><td>'+n+"</td><td>"+val+"</td></tr>";
                    }
                }
            }
        }
        table += "</tbody></table><hr/>";
        if (!subflowNode && node.type != "comment") {
            var helpText = $("script[data-help-name|='"+node.type+"']").html()||"";
            table  += '<div class="node-help">'+helpText+"</div>";
        }
        if (subflowNode) {
            table += '<div class="node-help">'+marked(subflowNode.info||"")+'</div>';
        } else if (node._def && node._def.info) {
            var info = node._def.info;
            table += '<div class="node-help">'+marked(typeof info === "function" ? info.call(node) : info)+'</div>';
            //table += '<div class="node-help">'+(typeof info === "function" ? info.call(node) : info)+'</div>';
        }

        $(content).html(table);

        $(".node-info-property-header").click(function(e) {
            var icon = $(this).find("i");
            if (icon.hasClass("fa-caret-right")) {
                icon.removeClass("fa-caret-right");
                icon.addClass("fa-caret-down");
                $(".node-info-property-row").show();
                propertiesExpanded = true;
            } else {
                icon.addClass("fa-caret-right");
                icon.removeClass("fa-caret-down");
                $(".node-info-property-row").hide();
                propertiesExpanded = false;
            }

            e.preventDefault();
        });
    }

    function clear() {
        $(content).html("");
    }

    function set(html) {
        $(content).html(html);
    }

    RED.events.on("view:selection-changed",function(selection) {
        if (selection.nodes) {
            if (selection.nodes.length == 1) {
                var node = selection.nodes[0];
                if (node.type === "subflow" && node.direction) {
                    refresh(RED.nodes.subflow(node.z));
                } else {
                    refresh(node);
                }
            }
        } else {
            var subflow = RED.nodes.subflow(RED.workspaces.active());
            if (subflow) {
                refresh(subflow);
            } else {
                clear();
            }
        }
    });

    return {
        init: init,
        show: show,
        refresh:refresh,
        clear: clear,
        set: set
    }
})();
