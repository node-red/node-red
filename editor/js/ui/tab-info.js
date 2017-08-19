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

    var content;
    var sections;
    var nodeSection;
    var infoSection;
    var tipBox;

    var expandedSections = {
        "property": false
    };

    function init() {

        content = document.createElement("div");
        content.className = "sidebar-node-info"

        RED.actions.add("core:show-info-tab",show);

        var stackContainer = $("<div>",{class:"sidebar-node-info-stack"}).appendTo(content);

        sections = RED.stack.create({
            container: stackContainer
        }).hide();

        nodeSection = sections.add({
            title: RED._("sidebar.info.node"),
            collapsible: false
        });
        infoSection = sections.add({
            title: RED._("sidebar.info.information"),
            collapsible: false
        });
        infoSection.content.css("padding","6px");
        infoSection.container.css("border-bottom","none");

        var tipContainer = $('<div class="node-info-tips"></div>').appendTo(content);
        tipBox = $('<div class="node-info-tip"></div>').appendTo(tipContainer);
        var tipButtons = $('<div class="node-info-tips-buttons"></div>').appendTo(tipContainer);

        var tipRefresh = $('<a href="#" class="workspace-footer-button"><i class="fa fa-refresh"></a>').appendTo(tipButtons);
        tipRefresh.click(function(e) {
            e.preventDefault();
            tips.next();
        })

        var tipClose = $('<a href="#" class="workspace-footer-button"><i class="fa fa-times"></a>').appendTo(tipButtons);
        tipClose.click(function(e) {
            e.preventDefault();
            RED.actions.invoke("core:toggle-show-tips");
            RED.notify(RED._("sidebar.info.showTips"));
        });

        RED.sidebar.addTab({
            id: "info",
            label: RED._("sidebar.info.label"),
            name: RED._("sidebar.info.name"),
            content: content,
            enableOnEdit: true
        });
        if (tips.enabled()) {
            tips.start();
        } else {
            tips.stop();
        }

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
        sections.show();
        $(nodeSection.content).empty();
        $(infoSection.content).empty();

        var table = $('<table class="node-info"></table>');
        var tableBody = $('<tbody>').appendTo(table);
        var propRow;
        var subflowNode;
        if (node.type === "tab") {
            nodeSection.title.html(RED._("sidebar.info.flow"));
            propRow = $('<tr class="node-info-node-row"><td>'+RED._("sidebar.info.tabName")+'</td><td></td></tr>').appendTo(tableBody);
            $(propRow.children()[1]).html('&nbsp;'+(node.label||""))
            propRow = $('<tr class="node-info-node-row"><td>'+RED._("sidebar.info.id")+"</td><td></td></tr>").appendTo(tableBody);
            RED.utils.createObjectElement(node.id).appendTo(propRow.children()[1]);
            propRow = $('<tr class="node-info-node-row"><td>'+RED._("sidebar.info.status")+'</td><td></td></tr>').appendTo(tableBody);
            $(propRow.children()[1]).html((!!!node.disabled)?RED._("sidebar.info.enabled"):RED._("sidebar.info.disabled"))
        } else {
            nodeSection.title.html(RED._("sidebar.info.node"));
            if (node.type !== "subflow" && node.name) {
                $('<tr class="node-info-node-row"><td>'+RED._("common.label.name")+'</td><td>&nbsp;<span class="bidiAware" dir="'+RED.text.bidi.resolveBaseTextDir(node.name)+'">'+node.name+'</span></td></tr>').appendTo(tableBody);
            }
            $('<tr class="node-info-node-row"><td>'+RED._("sidebar.info.type")+"</td><td>&nbsp;"+node.type+"</td></tr>").appendTo(tableBody);
            propRow = $('<tr class="node-info-node-row"><td>'+RED._("sidebar.info.id")+"</td><td></td></tr>").appendTo(tableBody);
            RED.utils.createObjectElement(node.id).appendTo(propRow.children()[1]);

            var m = /^subflow(:(.+))?$/.exec(node.type);

            if (!m && node.type != "subflow" && node.type != "comment") {
                if (node._def) {
                    var count = 0;
                    var defaults = node._def.defaults;
                    for (var n in defaults) {
                        if (n != "name" && defaults.hasOwnProperty(n)) {
                            var val = node[n];
                            var type = typeof val;
                            count++;
                            propRow = $('<tr class="node-info-property-row'+(expandedSections.property?"":" hide")+'"><td>'+n+"</td><td></td></tr>").appendTo(tableBody);
                            if (defaults[n].type) {
                                var configNode = RED.nodes.node(val);
                                if (!configNode) {
                                    RED.utils.createObjectElement(undefined).appendTo(propRow.children()[1]);
                                } else {
                                    var configLabel = RED.utils.getNodeLabel(configNode,val);
                                    var container = propRow.children()[1];

                                    var div = $('<span>',{class:""}).appendTo(container);
                                    var nodeDiv = $('<div>',{class:"palette_node palette_node_small"}).appendTo(div);
                                    var colour = configNode._def.color;
                                    var icon_url = RED.utils.getNodeIcon(configNode._def);
                                    nodeDiv.css({'backgroundColor':colour, "cursor":"pointer"});
                                    var iconContainer = $('<div/>',{class:"palette_icon_container"}).appendTo(nodeDiv);
                                    $('<div/>',{class:"palette_icon",style:"background-image: url("+icon_url+")"}).appendTo(iconContainer);
                                    var nodeContainer = $('<span></span>').css({"verticalAlign":"top","marginLeft":"6px"}).html(configLabel).appendTo(container);

                                    nodeDiv.on('dblclick',function() {
                                        RED.editor.editConfig("", configNode.type, configNode.id);
                                    })

                                }
                            } else {
                                RED.utils.createObjectElement(val).appendTo(propRow.children()[1]);
                            }
                        }
                    }
                    if (count > 0) {
                        $('<tr class="node-info-property-expand blank"><td colspan="2"><a href="#" class=" node-info-property-header'+(expandedSections.property?" expanded":"")+'"><span class="node-info-property-show-more">'+RED._("sidebar.info.showMore")+'</span><span class="node-info-property-show-less">'+RED._("sidebar.info.showLess")+'</span> <i class="fa fa-caret-down"></i></a></td></tr>').appendTo(tableBody);
                    }
                }
            }

            if (m) {
                if (m[2]) {
                    subflowNode = RED.nodes.subflow(m[2]);
                } else {
                    subflowNode = node;
                }

                $('<tr class="blank"><th colspan="2">'+RED._("sidebar.info.subflow")+'</th></tr>').appendTo(tableBody);

                var userCount = 0;
                var subflowType = "subflow:"+subflowNode.id;
                RED.nodes.eachNode(function(n) {
                    if (n.type === subflowType) {
                        userCount++;
                    }
                });
                $('<tr class="node-info-subflow-row"><td>'+RED._("common.label.name")+'</td><td><span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(subflowNode.name)+'">'+subflowNode.name+'</span></td></tr>').appendTo(tableBody);
                $('<tr class="node-info-subflow-row"><td>'+RED._("sidebar.info.instances")+"</td><td>"+userCount+'</td></tr>').appendTo(tableBody);
            }
        }
        $(table).appendTo(nodeSection.content);

        var infoText = "";

        if (!subflowNode && node.type !== "comment" && node.type !== "tab") {
            var helpText = $("script[data-help-name='"+node.type+"']").html()||"";
            infoText = helpText;
        } else if (node.type === "tab") {
            infoText = marked(node.info||"");
        }

        if (subflowNode) {
            infoText = infoText + marked(subflowNode.info||"");
        } else if (node._def && node._def.info) {
            var info = node._def.info;
            var textInfo = (typeof info === "function" ? info.call(node) : info);
            // TODO: help
            infoText = infoText + marked(textInfo);
        }
        if (infoText) {
            setInfoText(infoText);
        }


        $(".node-info-property-header").click(function(e) {
            e.preventDefault();
            expandedSections["property"] = !expandedSections["property"];
            $(this).toggleClass("expanded",expandedSections["property"]);
            $(".node-info-property-row").toggle(expandedSections["property"]);
        });
    }
    function setInfoText(infoText) {
        var info = addTargetToExternalLinks($('<div class="node-help"><span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(infoText)+'">'+infoText+'</span></div>')).appendTo(infoSection.content);
        info.find(".bidiAware").contents().filter(function() { return this.nodeType === 3 && this.textContent.trim() !== "" }).wrap( "<span></span>" );
        var foldingHeader = "H3";
        info.find(foldingHeader).wrapInner('<a class="node-info-header expanded" href="#"></a>')
            .find("a").prepend('<i class="fa fa-angle-right">').click(function(e) {
                e.preventDefault();
                var isExpanded = $(this).hasClass('expanded');
                var el = $(this).parent().next();
                while(el.length === 1 && el[0].nodeName !== foldingHeader) {
                    el.toggle(!isExpanded);
                    el = el.next();
                }
                $(this).toggleClass('expanded',!isExpanded);
            })
    }
    var tips = (function() {
        var enabled = true;
        var startDelay = 1000;
        var cycleDelay = 15000;
        var startTimeout;
        var refreshTimeout;
        var tipCount = -1;

        RED.actions.add("core:toggle-show-tips",function(state) {
            if (state === undefined) {
                RED.userSettings.toggle("view-show-tips");
            } else {
                enabled = state;
                if (enabled) {
                    startTips();
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
            tipBox.html(tip).fadeIn(200);
            if (startTimeout) {
                startTimeout = null;
                refreshTimeout = setInterval(cycleTips,cycleDelay);
            }
        }
        function cycleTips() {
            tipBox.fadeOut(300,function() {
                setTip();
            })
        }
        function startTips() {
            $(".sidebar-node-info").addClass('show-tips');
            if (enabled) {
                if (!startTimeout && !refreshTimeout) {
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
            $(".sidebar-node-info").removeClass('show-tips');
            clearInterval(refreshTimeout);
            clearTimeout(startTimeout);
            refreshTimeout = null;
            startTimeout = null;
        }
        function nextTip() {
            clearInterval(refreshTimeout);
            startTimeout = true;
            setTip();
        }
        return {
            start: startTips,
            stop: stopTips,
            next: nextTip,
            enabled: function() { return enabled; }
        }
    })();

    function clear() {
        sections.hide();
        //
    }

    function set(html) {
        // tips.stop();
        sections.show();
        nodeSection.container.hide();
        $(infoSection.content).empty();
        setInfoText(html);
        $(".sidebar-node-info-stack").scrollTop(0);
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
            var activeWS = RED.workspaces.active();

            var flow = RED.nodes.workspace(activeWS) || RED.nodes.subflow(activeWS);
            if (flow) {
                refresh(flow);
            } else {
                var workspace = RED.nodes.workspace(RED.workspaces.active());
                if (workspace && workspace.info) {
                    refresh(workspace);
                } else {
                    clear();
                }
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
