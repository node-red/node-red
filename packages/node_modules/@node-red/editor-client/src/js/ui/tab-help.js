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
RED.sidebar.help = (function() {

    var content;
    var toolbar;
    var helpSection;
    var panels;
    var panelRatio;
    var helpTopics = [];
    var treeList;
    var tocPanel;
    var helpIndex = {};


    function resizeStack() {
        var h = $(content).parent().height() - toolbar.outerHeight();
        panels.resize(h)
    }

    function init() {

        content = document.createElement("div");
        content.className = "red-ui-sidebar-info"

        toolbar = $("<div>", {class:"red-ui-sidebar-header red-ui-info-toolbar"}).appendTo(content);
        $('<span class="button-group"><a id="red-ui-sidebar-help-show-toc" class="red-ui-button red-ui-button-small selected" href="#"><i class="fa fa-list-ul"></i></a></span>').appendTo(toolbar)
        var showTOCButton = toolbar.find('#red-ui-sidebar-help-show-toc')
        RED.popover.tooltip(showTOCButton,RED._("sidebar.help.showTopics"));
        showTOCButton.on("click",function(e) {
            e.preventDefault();
            if ($(this).hasClass('selected')) {
                hideTOC();
            } else {
                showTOC();
            }
        });

        var stackContainer = $("<div>",{class:"red-ui-sidebar-help-stack"}).appendTo(content);

        tocPanel = $("<div>", {class: "red-ui-sidebar-help-toc"}).appendTo(stackContainer);
        var helpPanel = $("<div>").css({
            "overflow-y": "scroll"
        }).appendTo(stackContainer);

        panels = RED.panels.create({
            container: stackContainer
        })
        panels.ratio(0.3);

        helpSearch = $('<input type="text" data-i18n="[placeholder]sidebar.help.search">').appendTo(toolbar).searchBox({
            style: "compact",
            delay: 100,
            change: function() {
                var val = $(this).val().toLowerCase();
                if (val) {
                    showTOC();
                    var c = treeList.treeList('filter',function(item) {
                        if (item.depth === 0) {
                            return true;
                        }
                        return (item.nodeType &&  item.nodeType.indexOf(val) > -1) ||
                               (item.subflowLabel && item.subflowLabel.indexOf(val) > -1)
                    },true)
                } else {
                    treeList.treeList('filter',null);
                    var selected = treeList.treeList('selected');
                    if (selected.id) {
                        treeList.treeList('show',selected.id);
                    }

                }
            }
        })

        helpSection = $("<div>",{class:"red-ui-help"}).css({
            "padding":"6px",
        }).appendTo(helpPanel)

        $('<span class="red-ui-help-info-none">'+RED._("sidebar.help.noHelp")+'</span>').appendTo(helpSection);

        treeList = $("<div>").css({width: "100%"}).appendTo(tocPanel).treeList({data: []})
        treeList.on('treelistselect', function(e,item) {
            if (item.nodeType) {
                showHelp(item.nodeType);
            }
        })

        RED.sidebar.addTab({
            id: "help",
            label: RED._("sidebar.help.label"),
            name: RED._("sidebar.help.name"),
            iconClass: "fa fa-book",
            action:"core:show-help-tab",
            content: content,
            pinned: true,
            enableOnEdit: true,
            onchange: function() {
                resizeStack()
            }
        });

        $(window).on("resize", resizeStack);
        $(window).on("focus", resizeStack);

        RED.events.on('registry:node-type-added', queueRefresh);
        RED.events.on('registry:node-type-removed', queueRefresh);
        RED.events.on('subflows:change', refreshSubflow);

        RED.actions.add("core:show-help-tab",show);

    }

    var refreshTimer;
    function queueRefresh() {
        if (!refreshTimer) {
            refreshTimer = setTimeout(function() {
                refreshTimer = null;
                refreshHelpIndex();
            },500);
        }
    }

    function refreshSubflow(sf) {
        var item = treeList.treeList('get',"node-type:subflow:"+sf.id);
        item.subflowLabel = sf._def.label().toLowerCase();
        item.treeList.replaceElement(getNodeLabel({_def:sf._def,type:sf._def.label()}));
    }

    function hideTOC() {
        var tocButton = $('#red-ui-sidebar-help-show-toc')
        if (tocButton.hasClass('selected')) {
            tocButton.removeClass('selected');
            panelRatio = panels.ratio();
            tocPanel.css({"transition":"height 0.2s"})
            panels.ratio(0)
            setTimeout(function() {
                tocPanel.css({"transition":""})
            },250);
        }
    }
    function showTOC() {
        var tocButton = $('#red-ui-sidebar-help-show-toc')
        if (!tocButton.hasClass('selected')) {
            tocButton.addClass('selected');
            tocPanel.css({"transition":"height 0.2s"})
            panels.ratio(Math.max(0.3,Math.min(panelRatio,0.7)));
            setTimeout(function() {
                tocPanel.css({"transition":""})
                var selected = treeList.treeList('selected');
                if (selected.id) {
                    treeList.treeList('show',selected);
                }
            },250);
        }
    }

    function refreshHelpIndex() {
        helpTopics = [];
        var modules = RED.nodes.registry.getModuleList();
        var moduleNames = Object.keys(modules);
        moduleNames.sort();

        var helpData = [{
            label: RED._("sidebar.help.nodeHelp"),
            children: [],
            expanded: true
        }]

        var subflows = RED.nodes.registry.getNodeTypes().filter(function(t) {return /subflow/.test(t)});
        if (subflows.length > 0) {
            helpData[0].children.push({
                label: RED._("menu.label.subflows"),
                children: []
            })
            subflows.forEach(function(nodeType) {
                var sf = RED.nodes.getType(nodeType);
                helpData[0].children[0].children.push({
                    id:"node-type:"+nodeType,
                    nodeType: nodeType,
                    subflowLabel: sf.label().toLowerCase(),
                    element: getNodeLabel({_def:sf,type:sf.label()})
                })
            })
        }


        moduleNames.forEach(function(moduleName) {
            var module = modules[moduleName];
            var nodeTypes = [];

            var setNames = Object.keys(module.sets);
            setNames.forEach(function(setName) {
                module.sets[setName].types.forEach(function(nodeType) {
                    if ($("script[data-help-name='"+nodeType+"']").length) {
                        nodeTypes.push({
                            id: "node-type:"+nodeType,
                            nodeType: nodeType,
                            element:getNodeLabel({_def:RED.nodes.getType(nodeType),type:nodeType})
                        })
                    }
                })
            })
            if (nodeTypes.length > 0) {
                nodeTypes.sort(function(A,B) {
                    return A.nodeType.localeCompare(B.nodeType)
                })
                helpData[0].children.push({
                    id: moduleName,
                    icon: "fa fa-cube",
                    label: moduleName,
                    children: nodeTypes
                })
            }
        });
        treeList.treeList("data",helpData);
    }

    function getNodeLabel(n) {
        var div = $('<div>',{class:"red-ui-info-outline-item"});
        RED.utils.createNodeIcon(n).appendTo(div);
        var contentDiv = $('<div>',{class:"red-ui-search-result-description"}).appendTo(div);
        $('<div>',{class:"red-ui-search-result-node-label red-ui-info-outline-item-label"}).text(n.name||n.type).appendTo(contentDiv);
        return div;
    }

    function showHelp(nodeType) {
        helpSection.empty();
        var helpText;
        var title;
        var m = /^subflow(:(.+))?$/.exec(nodeType);
        if (m && m[2]) {
            var subflowNode = RED.nodes.subflow(m[2]);
            helpText = (RED.utils.renderMarkdown(subflowNode.info||"")||('<span class="red-ui-help-info-none">'+RED._("sidebar.info.none")+'</span>'));
            title = subflowNode.name || nodeType;
        } else {
            helpText = $("script[data-help-name='"+nodeType+"']").html()||('<span class="red-ui-help-info-none">'+RED._("sidebar.info.none")+'</span>');
            title = nodeType;
        }
        setInfoText(title, helpText, helpSection);

        var ratio = panels.ratio();
        if (ratio > 0.7) {
            panels.ratio(0.7)
        }
        treeList.treeList("show","node-type:"+nodeType)
        treeList.treeList("select","node-type:"+nodeType, false);

    }

    function show(type, bringToFront) {
        if (bringToFront !== false) {
            RED.sidebar.show("help");
        }
        if (type) {
            // hideTOC();
            showHelp(type);
        }
        resizeStack();
    }

    // TODO: DRY - projects.js
    function addTargetToExternalLinks(el) {
        $(el).find("a").each(function(el) {
            var href = $(this).attr('href');
            if (/^https?:/.test(href)) {
                $(this).attr('target','_blank');
            }
        });
        return el;
    }

    function setInfoText(title, infoText,target) {
        if (title) {
            $("<h1>",{class:"red-ui-help-title"}).text(title).appendTo(target);
        }
        var info = addTargetToExternalLinks($('<div class="red-ui-help"><span class="red-ui-text-bidi-aware" dir=\"'+RED.text.bidi.resolveBaseTextDir(infoText)+'">'+infoText+'</span></div>')).appendTo(target);
        info.find(".red-ui-text-bidi-aware").contents().filter(function() { return this.nodeType === 3 && this.textContent.trim() !== "" }).wrap( "<span></span>" );
        var foldingHeader = "H3";
        info.find(foldingHeader).wrapInner('<a class="red-ui-help-info-header expanded" href="#"></a>')
            .find("a").prepend('<i class="fa fa-angle-right">').on("click", function(e) {
                e.preventDefault();
                var isExpanded = $(this).hasClass('expanded');
                var el = $(this).parent().next();
                while(el.length === 1 && el[0].nodeName !== foldingHeader) {
                    el.toggle(!isExpanded);
                    el = el.next();
                }
                $(this).toggleClass('expanded',!isExpanded);
            })
        target.parent().scrollTop(0);
    }

    function set(html,title) {
        $(helpSection).empty();
        setInfoText(title,html,helpSection);
        hideTOC();
        show();
    }

    function refreshSelection(selection) {
        if (selection === undefined) {
            selection = RED.view.selection();
        }
        if (selection.nodes) {
            if (selection.nodes.length == 1) {
                var node = selection.nodes[0];
                if (node.type === "subflow" && node.direction) {
                    // ignore subflow virtual ports
                } else if (node.type !== 'group'){
                    showHelp(node.type);
                }
            }
        }
    }
    RED.events.on("view:selection-changed",refreshSelection);

    return {
        init: init,
        show: show,
        set: set
    }
})();
