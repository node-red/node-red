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
            content: content,
            enableOnEdit: true
        });
        RED.actions.add("core:show-info-tab",show);
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

    function addTargetToExternalLinks(el) {
        $(el).find("a").each(function(el) {
            var href = $(this).attr('href');
            if (/^https?:/.test(href)) {
                $(this).attr('target','_blank');
            }
        });
        return el;
    }
    function refresh(node) {
        tips.stop();
        $(content).empty();
        var table = $('<table class="node-info"></table>');
        var tableBody = $('<tbody>').appendTo(table);
        $('<tr class="blank"><td colspan="2">'+RED._("sidebar.info.node")+'</td></tr>').appendTo(tableBody);
        if (node.type != "subflow" && node.name) {
            $('<tr><td>'+RED._("common.label.name")+'</td><td>&nbsp;<span class="bidiAware" dir="'+RED.text.bidi.resolveBaseTextDir(node.name)+'">'+node.name+'</span></td></tr>').appendTo(tableBody);
        }
        $("<tr><td>"+RED._("sidebar.info.type")+"</td><td>&nbsp;"+node.type+"</td></tr>").appendTo(tableBody);
        $("<tr><td>"+RED._("sidebar.info.id")+"</td><td>&nbsp;"+node.id+"</td></tr>").appendTo(tableBody);

        var m = /^subflow(:(.+))?$/.exec(node.type);
        var subflowNode;
        if (m) {
            if (m[2]) {
                subflowNode = RED.nodes.subflow(m[2]);
            } else {
                subflowNode = node;
            }

            $('<tr class="blank"><td colspan="2">'+RED._("sidebar.info.subflow")+'</td></tr>').appendTo(tableBody);

            var userCount = 0;
            var subflowType = "subflow:"+subflowNode.id;
            RED.nodes.eachNode(function(n) {
                if (n.type === subflowType) {
                    userCount++;
                }
            });
            $('<tr><td>'+RED._("common.label.name")+'</td><td><span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(subflowNode.name)+'">'+subflowNode.name+'</span></td></tr>').appendTo(tableBody);
            $("<tr><td>"+RED._("sidebar.info.instances")+"</td><td>"+userCount+"</td></tr>").appendTo(tableBody);
        }

        if (!m && node.type != "subflow" && node.type != "comment") {
            $('<tr class="blank"><td colspan="2"><a href="#" class="node-info-property-header"><i style="width: 10px; text-align: center;" class="fa fa-caret-'+(propertiesExpanded?"down":"right")+'"></i> '+RED._("sidebar.info.properties")+'</a></td></tr>').appendTo(tableBody);
            if (node._def) {
                for (var n in node._def.defaults) {
                    if (n != "name" && node._def.defaults.hasOwnProperty(n)) {
                        var val = node[n];
                        var type = typeof val;
                        var propRow = $('<tr class="node-info-property-row'+(propertiesExpanded?"":" hide")+'"><td>'+n+"</td><td></td></tr>").appendTo(tableBody);
                        RED.utils.createObjectElement(val).appendTo(propRow.children()[1]);
                    }
                }
            }
        }
        $(table).appendTo(content);
        $("<hr/>").appendTo(content);
        if (!subflowNode && node.type != "comment") {
            var helpText = $("script[data-help-name='"+node.type+"']").html()||"";
            addTargetToExternalLinks($('<div class="node-help"><span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(helpText)+'">'+helpText+'</span></div>').appendTo(content));
        }
        if (subflowNode) {
            addTargetToExternalLinks($('<div class="node-help"><span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(subflowNode.info||"")+'">'+marked(subflowNode.info||"")+'</span></div>').appendTo(content));
        } else if (node._def && node._def.info) {
            var info = node._def.info;
            var textInfo = (typeof info === "function" ? info.call(node) : info);
            addTargetToExternalLinks($('<div class="node-help"><span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(textInfo)+'">'+marked(textInfo)+'</span></div>').appendTo(content));
            //$('<div class="node-help">'+(typeof info === "function" ? info.call(node) : info)+'</div>';
        }

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


    var tips = (function() {
        var started = false;
        var enabled = true;
        var startDelay = 1000;
        var cycleDelay = 15000;
        var startTimeout;
        var refreshTimeout;
        var tipCount = -1;

        RED.actions.add("core:toggle-show-tips",function(state) {
            if (state === undefined) {
                RED.menu.toggleSelected("menu-item-show-tips");
            } else {
                enabled = state;
                if (enabled) {
                    if (started) {
                        startTips();
                    }
                } else {
                    stopTips();
                }
            }
        });

        function setTip() {
            var r = Math.floor(Math.random() * tipCount);
            var tip = RED._("infotips:info.tip"+r);

            var m;
            while ((m=/({{(.*?)}})/.exec(tip))) {
                var shortcut = RED.keyboard.getShortcut(m[2]);
                if (shortcut) {
                    tip = tip.replace(m[1],RED.keyboard.formatKey(shortcut.key));
                } else {
                    return;
                }
            }
            while ((m=/(\[(.*?)\])/.exec(tip))) {
                tip = tip.replace(m[1],RED.keyboard.formatKey(m[2]));
            }
            $('<div class="node-info-tip hide">'+tip+'</div>').appendTo(content).fadeIn(200);
            if (startTimeout) {
                startTimeout = null;
                refreshTimeout = setInterval(cycleTips,cycleDelay);
            }
        }
        function cycleTips() {
            $(".node-info-tip").fadeOut(300,function() {
                $(this).remove();
                setTip();
            })
        }
        function startTips() {
            started = true;
            if (enabled) {
                if (!startTimeout && !refreshTimeout) {
                    $(content).html("");
                    if (tipCount === -1) {
                        do {
                            tipCount++;
                        } while(RED._("infotips:info.tip"+tipCount)!=="infotips:info.tip"+tipCount);
                    }
                    startTimeout = setTimeout(setTip,startDelay);
                }
            }
        }
        function stopTips() {
            started = false;
            clearInterval(refreshTimeout);
            clearTimeout(startTimeout);
            refreshTimeout = null;
            startTimeout = null;
            $(".node-info-tip").remove();
        }
        return {
            start: startTips,
            stop: stopTips
        }
    })();

    function clear() {
        tips.start();
    }

    function set(html) {
        tips.stop();
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
        refresh: refresh,
        clear: clear,
        set: set
    }
})();
