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

    var expandedSections = {
        "node": true,
        "property": false,
        "info": true,
        "subflow": true
    };

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
        $('<tr class="blank"><th colspan="2"><a href="#" class="node-info-node-header'+(expandedSections.node?" expanded":"")+'"><i class="fa fa-angle-right"></i> '+RED._("sidebar.info.node")+'</a></th></tr>').appendTo(tableBody);


        if (node.type != "subflow" && node.name) {
            $('<tr class="node-info-node-row'+(expandedSections.node?"":" hide")+'"><td>'+RED._("common.label.name")+'</td><td>&nbsp;<span class="bidiAware" dir="'+RED.text.bidi.resolveBaseTextDir(node.name)+'">'+node.name+'</span></td></tr>').appendTo(tableBody);
        }
        $('<tr class="node-info-node-row'+(expandedSections.node?"":" hide")+'"><td>'+RED._("sidebar.info.type")+"</td><td>&nbsp;"+node.type+"</td></tr>").appendTo(tableBody);
        $('<tr class="node-info-node-row'+(expandedSections.node?"":" hide")+'"><td>'+RED._("sidebar.info.id")+"</td><td>&nbsp;"+node.id+"</td></tr>").appendTo(tableBody);

        var m = /^subflow(:(.+))?$/.exec(node.type);
        var subflowNode;
        if (m) {
            if (m[2]) {
                subflowNode = RED.nodes.subflow(m[2]);
            } else {
                subflowNode = node;
            }

            $('<tr class="blank"><th colspan="2"><a href="#" class="node-info-subflow-header'+(expandedSections.subflow?" expanded":"")+'"><i class="fa fa-angle-right"></i> '+RED._("sidebar.info.subflow")+'</a></th></tr>').appendTo(tableBody);

            var userCount = 0;
            var subflowType = "subflow:"+subflowNode.id;
            RED.nodes.eachNode(function(n) {
                if (n.type === subflowType) {
                    userCount++;
                }
            });
            $('<tr class="node-info-subflow-row'+(expandedSections.subflow?"":" hide")+'"><td>'+RED._("common.label.name")+'</td><td><span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(subflowNode.name)+'">'+subflowNode.name+'</span></td></tr>').appendTo(tableBody);
            $('<tr class="node-info-subflow-row'+(expandedSections.subflow?"":" hide")+'"><td>'+RED._("sidebar.info.instances")+"</td><td>"+userCount+'</td></tr>').appendTo(tableBody);
        }

        if (!m && node.type != "subflow" && node.type != "comment") {
            $('<tr class="blank"><th colspan="2"><a href="#" class="node-info-property-header'+(expandedSections.property?" expanded":"")+'"><i class="fa fa-angle-right"></i> '+RED._("sidebar.info.properties")+'</a></th></tr>').appendTo(tableBody);
            if (node._def) {
                for (var n in node._def.defaults) {
                    if (n != "name" && node._def.defaults.hasOwnProperty(n)) {
                        var val = node[n];
                        var type = typeof val;
                        var propRow = $('<tr class="node-info-property-row'+(expandedSections.property?"":" hide")+'"><td>'+n+"</td><td></td></tr>").appendTo(tableBody);
                        RED.utils.createObjectElement(val).appendTo(propRow.children()[1]);
                    }
                }
            }
        }
        $(table).appendTo(content);

        var infoText = "";

        if (!subflowNode && node.type != "comment") {
            var helpText = $("script[data-help-name$='"+node.type+"']").html()||"";
            infoText = helpText;
        }
        if (subflowNode) {
            infoText = marked(subflowNode.info||"");
        } else if (node._def && node._def.info) {
            var info = node._def.info;
            var textInfo = (typeof info === "function" ? info.call(node) : info);
            infoText = marked(textInfo);
        }
        if (infoText) {
            $('<tr class="blank"><th colspan="2"><a href="#" class="node-info-info-header'+(expandedSections.info?" expanded":"")+'"><i class="fa fa-angle-right"></i> '+RED._("sidebar.info.info")+'</a></th></tr>').appendTo(tableBody);
            addTargetToExternalLinks($('<tr class="blank node-info-info-row'+(expandedSections.info?"":" hide")+'"><td colspan="2"><div class="node-help"><span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(infoText)+'">'+infoText+'</span></div></td></tr>')).appendTo(tableBody);
        }


        ["node","subflow","property","info"].forEach(function(t) {
            $(".node-info-"+t+"-header").click(function(e) {
                e.preventDefault();
                console.log(t,expandedSections[t]);
                expandedSections[t] = !expandedSections[t];
                $(this).toggleClass("expanded",expandedSections[t]);
                $(".node-info-"+t+"-row").toggle(expandedSections[t]);

            })
        })
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
