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

    var flowAutoRefresh;
    var nodeAutoRefresh;
    var nodeSection;
    // var subflowSection;
    var flowSection;
    var globalSection;

    var currentNode;
    var currentFlow;

    function init() {

        content = $("<div>").css({"position":"relative","height":"100%"});
        content.className = "red-ui-sidebar-context"

        var footerToolbar = $('<div></div>');

        var stackContainer = $("<div>",{class:"red-ui-sidebar-context-stack"}).appendTo(content);
        sections = RED.stack.create({
            container: stackContainer
        });

        nodeSection = sections.add({
            title: RED._("sidebar.context.node"),
            collapsible: true
        });
        nodeSection.expand();
        nodeSection.content.css({height:"100%"});
        nodeSection.timestamp = $('<div class="red-ui-sidebar-context-updated">&nbsp;</div>').appendTo(nodeSection.content);
        var table = $('<table class="red-ui-info-table"></table>').appendTo(nodeSection.content);
        nodeSection.table = $('<tbody>').appendTo(table);
        var bg = $('<div style="float: right"></div>').appendTo(nodeSection.header);

        var nodeAutoRefreshSetting = RED.settings.get("editor.context.nodeRefresh",false);
        nodeAutoRefresh = $('<input type="checkbox">').prop("checked",nodeAutoRefreshSetting).appendTo(bg).toggleButton({
            baseClass: "red-ui-sidebar-header-button red-ui-button-small",
            enabledLabel: "",
            disabledLabel: ""
        }).on("change", function() {
            var value = $(this).prop("checked");
            RED.settings.set("editor.context.flowRefresh",value);
        });
        RED.popover.tooltip(nodeAutoRefresh.next(),RED._("sidebar.context.autoRefresh"));


        var manualRefreshNode = $('<button class="red-ui-button red-ui-button-small" style="margin-left: 5px"><i class="fa fa-refresh"></i></button>')
            .appendTo(bg)
            .on("click", function(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                updateNode(currentNode, true);
            })
        RED.popover.tooltip(manualRefreshNode,RED._("sidebar.context.refrsh"));

        flowSection = sections.add({
            title: RED._("sidebar.context.flow"),
            collapsible: true
        });
        flowSection.expand();
        flowSection.content.css({height:"100%"});
        flowSection.timestamp = $('<div class="red-ui-sidebar-context-updated">&nbsp;</div>').appendTo(flowSection.content);
        var table = $('<table class="red-ui-info-table"></table>').appendTo(flowSection.content);
        flowSection.table = $('<tbody>').appendTo(table);
        bg = $('<div style="float: right"></div>').appendTo(flowSection.header);

        var flowAutoRefreshSetting = RED.settings.get("editor.context.flowRefresh",false);
        flowAutoRefresh = $('<input type="checkbox">').prop("checked",flowAutoRefreshSetting).appendTo(bg).toggleButton({
            baseClass: "red-ui-sidebar-header-button red-ui-button-small",
            enabledLabel: "",
            disabledLabel: ""
        }).on("change", function() {
            var value = $(this).prop("checked");
            RED.settings.set("editor.context.flowRefresh",value);
        });
        RED.popover.tooltip(flowAutoRefresh.next(),RED._("sidebar.context.autoRefresh"));

        var manualRefreshFlow = $('<button class="red-ui-button red-ui-button-small" style="margin-left: 5px"><i class="fa fa-refresh"></i></button>')
            .appendTo(bg)
            .on("click", function(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                updateFlow(currentFlow, true);
            })
        RED.popover.tooltip(manualRefreshFlow,RED._("sidebar.context.refrsh"));

        globalSection = sections.add({
            title: RED._("sidebar.context.global"),
            collapsible: true
        });
        globalSection.expand();
        globalSection.content.css({height:"100%"});
        globalSection.timestamp = $('<div class="red-ui-sidebar-context-updated">&nbsp;</div>').appendTo(globalSection.content);
        var table = $('<table class="red-ui-info-table"></table>').appendTo(globalSection.content);
        globalSection.table = $('<tbody>').appendTo(table);

        bg = $('<div style="float: right"></div>').appendTo(globalSection.header);
        $('<button class="red-ui-button red-ui-button-small"><i class="fa fa-refresh"></i></button>')
            .appendTo(bg)
            .on("click", function(evt) {
                evt.stopPropagation();
                evt.preventDefault();
                updateEntry(globalSection,"context/global","global");
            })
        RED.popover.tooltip(bg,RED._("sidebar.context.refrsh"));

        RED.actions.add("core:show-context-tab",show);

        RED.sidebar.addTab({
            id: "context",
            label: RED._("sidebar.context.label"),
            name: RED._("sidebar.context.name"),
            iconClass: "fa fa-database",
            content: content,
            toolbar: footerToolbar,
            // pinned: true,
            enableOnEdit: true,
            action: "core:show-context-tab"
        });

        RED.events.on("view:selection-changed", function(event) {
            var selectedNode = event.nodes && event.nodes.length === 1 && event.nodes[0];
            updateNode(selectedNode);
        })

        RED.events.on("workspace:change", function(event) {
            updateFlow(RED.nodes.workspace(event.workspace));
        })

        $(globalSection.table).empty();
        $('<tr class="red-ui-help-info-row red-ui-search-empty blank" colspan="2"><td data-i18n="sidebar.context.refresh"></td></tr>').appendTo(globalSection.table).i18n();
        globalSection.timestamp.html("&nbsp;");
    }

    function updateNode(node,force) {
        currentNode = node;
        if (force || nodeAutoRefresh.prop("checked")) {
            if (node) {
                updateEntry(nodeSection,"context/node/"+node.id,node.id);
            } else {
                updateEntry(nodeSection)
            }
        } else {
            $(nodeSection.table).empty();
            if (node) {
                $('<tr class="red-ui-help-info-row red-ui-search-empty blank" colspan="2"><td data-i18n="sidebar.context.refresh"></td></tr>').appendTo(nodeSection.table).i18n();
            } else {
                $('<tr class="red-ui-help-info-row red-ui-search-empty blank" colspan="2"><td data-i18n="sidebar.context.none"></td></tr>').appendTo(nodeSection.table).i18n();
            }
            nodeSection.timestamp.html("&nbsp;");
        }
    }
    function updateFlow(flow, force) {
        currentFlow = flow;
        if (force || flowAutoRefresh.prop("checked")) {
            if (flow) {
                updateEntry(flowSection,"context/flow/"+flow.id,flow.id);
            } else {
                updateEntry(flowSection)
            }
        } else {
            $(flowSection.table).empty();
            $('<tr class="red-ui-help-info-row red-ui-search-empty blank" colspan="2"><td data-i18n="sidebar.context.refresh"></td></tr>').appendTo(flowSection.table).i18n();
            flowSection.timestamp.html("&nbsp;");
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
                    var propRow = $('<tr class="red-ui-help-info-row"><td class="red-ui-sidebar-context-property"></td><td></td></tr>').appendTo(container);
                    var obj = $(propRow.children()[0]);
                    obj.text(k);
                    var tools = $('<span class="button-group"></span>');

                    var refreshItem = $('<button class="red-ui-button red-ui-button-small"><i class="fa fa-refresh"></i></button>').appendTo(tools).on("click", function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        $.getJSON(baseUrl+"/"+k+"?store="+v.store, function(data) {
                            if (data.msg !== payload || data.format !== format) {
                                payload = data.msg;
                                format = data.format;
                                tools.detach();
                                $(propRow.children()[1]).empty();
                                RED.utils.createObjectElement(RED.utils.decodeObject(payload,format), {
                                    typeHint: data.format,
                                    sourceId: id+"."+k,
                                    tools: tools,
                                    path: ""
                                }).appendTo(propRow.children()[1]);
                            }
                        })
                    });
                    RED.popover.tooltip(refreshItem,RED._("sidebar.context.refrsh"));
                    var deleteItem = $('<button class="red-ui-button red-ui-button-small"><i class="fa fa-trash"></i></button>').appendTo(tools).on("click", function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        var popover = RED.popover.create({
                            trigger: 'modal',
                            target: propRow,
                            direction: "left",
                            content: function() {
                                var content = $('<div>');
                                $('<p data-i18n="sidebar.context.deleteConfirm"></p>').appendTo(content);
                                var row = $('<p>').appendTo(content);
                                var bg = $('<span class="button-group"></span>').appendTo(row);
                                $('<button class="red-ui-button" data-i18n="common.label.cancel"></button>').appendTo(bg).on("click", function(e) {
                                    e.preventDefault();
                                    popover.close();
                                });
                                bg = $('<span class="button-group"></span>').appendTo(row);
                                $('<button class="red-ui-button primary" data-i18n="common.label.delete"></button>').appendTo(bg).on("click", function(e) {
                                    e.preventDefault();
                                    popover.close();
                                    $.ajax({
                                        url: baseUrl+"/"+k+"?store="+v.store,
                                        type: "DELETE"
                                    }).done(function(data,textStatus,xhr) {
                                        $.getJSON(baseUrl+"/"+k+"?store="+v.store, function(data) {
                                            if (data.format === 'undefined') {
                                                propRow.remove();
                                                if (container.children().length === 0) {
                                                    $('<tr class="red-ui-help-info-row red-ui-search-empty blank" colspan="2"><td data-i18n="sidebar.context.empty"></td></tr>').appendTo(container).i18n();
                                                }
                                            } else {
                                                payload = data.msg;
                                                format = data.format;
                                                tools.detach();
                                                $(propRow.children()[1]).empty();
                                                RED.utils.createObjectElement(RED.utils.decodeObject(payload,format), {
                                                    typeHint: data.format,
                                                    sourceId: id+"."+k,
                                                    tools: tools,
                                                    path: ""
                                                }).appendTo(propRow.children()[1]);
                                            }
                                        });
                                    }).fail(function(xhr,textStatus,err) {

                                    })
                                });
                                return content.i18n();
                            }
                        });
                        popover.open();

                    });
                    RED.popover.tooltip(deleteItem,RED._("sidebar.context.delete"));
                    var payload = v.msg;
                    var format = v.format;
                    RED.utils.createObjectElement(RED.utils.decodeObject(payload,format), {
                        typeHint: v.format,
                        sourceId: id+"."+k,
                        tools: tools,
                        path: ""
                    }).appendTo(propRow.children()[1]);
                    if (contextStores.length > 1) {
                        $("<span>",{class:"red-ui-sidebar-context-property-storename"}).text(v.store).appendTo($(propRow.children()[0]))
                    }
                });
            }
            if (l === 0) {
                $('<tr class="red-ui-help-info-row red-ui-search-empty blank" colspan="2"><td data-i18n="sidebar.context.empty"></td></tr>').appendTo(container).i18n();
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
            $('<tr class="red-ui-help-info-row red-ui-search-empty blank" colspan="2"><td data-i18n="sidebar.context.none"></td></tr>').appendTo(container).i18n();
        }
    }



    function show() {
        RED.sidebar.show("context");
    }
    return {
        init: init
    }
})();
