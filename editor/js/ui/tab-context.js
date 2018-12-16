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
RED.sidebar.context = (function() {

    var content;
    var sections;

    var localCache = {};


    var nodeSection;
    // var subflowSection;
    var flowSection;
    var globalSection;

    var currentNode;
    var currentFlow;

    function init() {

        content = $("<div>").css({"position":"relative","height":"100%"});
        content.className = "sidebar-context"
        // var toolbar = $('<div class="sidebar-header">'+
        //     '</div>').appendTo(content);

        var footerToolbar = $('<div>'+
            // '<span class="button-group"><a class="sidebar-footer-button" href="#" data-i18n="[title]node-red:debug.sidebar.openWindow"><i class="fa fa-desktop"></i></a></span> ' +
            '</div>');



        var stackContainer = $("<div>",{class:"sidebar-context-stack"}).appendTo(content);
        sections = RED.stack.create({
            container: stackContainer
        });

        nodeSection = sections.add({
            title: RED._("sidebar.context.node"),
            collapsible: true,
            // onexpand: function() {
            //     updateNode(currentNode,true);
            // }
        });
        nodeSection.expand();
        nodeSection.content.css({height:"100%"});
        nodeSection.timestamp = $('<div class="sidebar-context-updated">&nbsp;</div>').appendTo(nodeSection.content);
        var table = $('<table class="node-info"></table>').appendTo(nodeSection.content);
        nodeSection.table = $('<tbody>').appendTo(table);
        var bg = $('<div style="float: right"></div>').appendTo(nodeSection.header);
        $('<button class="editor-button editor-button-small"><i class="fa fa-refresh"></i></button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                updateNode(currentNode, true);
            })

        // subflowSection  = sections.add({
        //     title: "Subflow",
        //     collapsible: true
        // });
        // subflowSection.expand();
        // subflowSection.content.css({height:"100%"});
        // bg = $('<div style="float: right"></div>').appendTo(subflowSection.header);
        // $('<button class="editor-button editor-button-small"><i class="fa fa-refresh"></i></button>')
        //     .appendTo(bg)
        //     .click(function(evt) {
        //         evt.stopPropagation();
        //         evt.preventDefault();
        //     })
        //
        // subflowSection.container.hide();

        flowSection = sections.add({
            title: RED._("sidebar.context.flow"),
            collapsible: true
        });
        flowSection.expand();
        flowSection.content.css({height:"100%"});
        flowSection.timestamp = $('<div class="sidebar-context-updated">&nbsp;</div>').appendTo(flowSection.content);
        var table = $('<table class="node-info"></table>').appendTo(flowSection.content);
        flowSection.table = $('<tbody>').appendTo(table);
        bg = $('<div style="float: right"></div>').appendTo(flowSection.header);
        $('<button class="editor-button editor-button-small"><i class="fa fa-refresh"></i></button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                updateFlow(currentFlow);
            })

        globalSection = sections.add({
            title: RED._("sidebar.context.global"),
            collapsible: true
        });
        globalSection.expand();
        globalSection.content.css({height:"100%"});
        globalSection.timestamp = $('<div class="sidebar-context-updated">&nbsp;</div>').appendTo(globalSection.content);
        var table = $('<table class="node-info"></table>').appendTo(globalSection.content);
        globalSection.table = $('<tbody>').appendTo(table);

        bg = $('<div style="float: right"></div>').appendTo(globalSection.header);
        $('<button class="editor-button editor-button-small"><i class="fa fa-refresh"></i></button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                updateEntry(globalSection,"context/global","global");
            })


        RED.actions.add("core:show-context-tab",show);

        RED.sidebar.addTab({
            id: "context",
            label: RED._("sidebar.context.label"),
            name: RED._("sidebar.context.name"),
            iconClass: "fa fa-database",
            content: content,
            toolbar: footerToolbar,
            // pinned: true,
            enableOnEdit: true
        });

        // var toggleLiveButton = $("#sidebar-context-toggle-live");
        // toggleLiveButton.click(function(evt) {
        //     evt.preventDefault();
        //     if ($(this).hasClass("selected")) {
        //         $(this).removeClass("selected");
        //         $(this).find("i").removeClass("fa-pause");
        //         $(this).find("i").addClass("fa-play");
        //     } else {
        //         $(this).addClass("selected");
        //         $(this).find("i").removeClass("fa-play");
        //         $(this).find("i").addClass("fa-pause");
        //     }
        // });
        // RED.popover.tooltip(toggleLiveButton, function() {
        //     if (toggleLiveButton.hasClass("selected")) {
        //         return "Pause live updates"
        //     } else {
        //         return "Start live updates"
        //     }
        // });


        RED.events.on("view:selection-changed", function(event) {
            var selectedNode = event.nodes && event.nodes.length === 1 && event.nodes[0];
            updateNode(selectedNode);
        })

        RED.events.on("workspace:change", function(event) {
            updateFlow(RED.nodes.workspace(event.workspace));
        })

        updateEntry(globalSection,"context/global","global");

    }

    function updateNode(node,force) {
        currentNode = node;
        if (force) {
            if (node) {
                updateEntry(nodeSection,"context/node/"+node.id,node.id);
                // if (/^subflow:/.test(node.type)) {
                //     subflowSection.container.show();
                //     updateEntry(subflowSection,"context/flow/"+node.id,node.id);
                // } else {
                //     subflowSection.container.hide();
                // }
            } else {
                // subflowSection.container.hide();
                updateEntry(nodeSection)
            }
        } else {
            $(nodeSection.table).empty();
            if (node) {
                $('<tr class="node-info-node-row red-ui-search-empty blank" colspan="2"><td data-i18n="sidebar.context.refresh"></td></tr>').appendTo(nodeSection.table).i18n();
            } else {
                $('<tr class="node-info-node-row red-ui-search-empty blank" colspan="2"><td data-i18n="sidebar.context.none"></td></tr>').appendTo(nodeSection.table).i18n();
            }
            nodeSection.timestamp.html("&nbsp;");

        }
    }
    function updateFlow(flow) {
        currentFlow = flow;
        if (flow) {
            updateEntry(flowSection,"context/flow/"+flow.id,flow.id);
        } else {
            updateEntry(flowSection)
        }
    }

    function refreshEntry(section,baseUrl,id) {

        var contextStores = RED.settings.context.stores;
        var container = section.table;

        $.getJSON(baseUrl, function(data) {
            $(container).empty();
            var sortedData = {};
            for (var store in data) {
                if (data.hasOwnProperty(store)) {
                    for (var key in data[store]) {
                        if (data[store].hasOwnProperty(key)) {
                            if (!sortedData.hasOwnProperty(key)) {
                                sortedData[key] = [];
                            }
                            data[store][key].store = store;
                            sortedData[key].push(data[store][key])
                        }
                    }
                }
            }
            var keys = Object.keys(sortedData);
            keys.sort();
            var l = keys.length;
            for (var i = 0; i < l; i++) {
                sortedData[keys[i]].forEach(function(v) {
                    var k = keys[i];
                    var l2 = sortedData[k].length;
                    var propRow = $('<tr class="node-info-node-row"><td class="sidebar-context-property"></td><td></td></tr>').appendTo(container);
                    var obj = $(propRow.children()[0]);
                    obj.text(k);
                    var tools = $('<span class="debug-message-tools button-group"></span>').appendTo(obj);
                    var refreshItem = $('<button class="editor-button editor-button-small"><i class="fa fa-refresh"></i></button>').appendTo(tools).click(function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        $.getJSON(baseUrl+"/"+k+"?store="+v.store, function(data) {
                            $(propRow.children()[1]).empty();
                            var payload = data.msg;
                            var format = data.format;
                            payload = RED.utils.decodeObject(payload,format);
                            RED.utils.createObjectElement(payload, {
                                typeHint: data.format,
                                sourceId: id+"."+k
                            }).appendTo(propRow.children()[1]);
                        })
                    });


                    var payload = v.msg;
                    var format = v.format;
                    payload = RED.utils.decodeObject(payload,format);
                    RED.utils.createObjectElement(payload, {
                        typeHint: v.format,
                        sourceId: id+"."+k
                    }).appendTo(propRow.children()[1]);
                    if (contextStores.length > 1) {
                        $("<span>",{class:"sidebar-context-property-storename"}).text(v.store).appendTo($(propRow.children()[0]))
                    }
                });
            }
            if (l === 0) {
                $('<tr class="node-info-node-row red-ui-search-empty blank" colspan="2"><td data-i18n="sidebar.context.empty"></td></tr>').appendTo(container).i18n();
            }
            $(section.timestamp).text(new Date().toLocaleString());
        });
    }
    function updateEntry(section,baseUrl,id) {
        var container = section.table;
        if (id) {
            refreshEntry(section,baseUrl,id);
        } else {
            $(container).empty();
            $('<tr class="node-info-node-row red-ui-search-empty blank" colspan="2"><td data-i18n="sidebar.context.none"></td></tr>').appendTo(container).i18n();
        }
    }



    function show() {
        RED.sidebar.show("context");
    }
    return {
        init: init
    }
})();
