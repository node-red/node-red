RED.diff = (function() {

    function init() {

        RED.actions.add("core:show-current-diff",showlocalDiff);
        RED.keyboard.add("*","ctrl-shift-l","core:show-current-diff");


        var dialog = $('<div id="node-dialog-view-diff" class="hide"><ol id="node-dialog-view-diff-diff"></ol></div>').appendTo(document.body);

        var toolbar = $('<div class="node-diff-toolbar">'+
            '<span class="button-group">'+
                '<a class="sidebar-header-button-toggle node-diff-filter" id="node-diff-filter-all" href="#"><span data-i18n="">all nodes</span></a>'+
                '<a class="sidebar-header-button-toggle node-diff-filter selected" id="node-diff-filter-changed" href="#"><span data-i18n="">changed nodes</span></a>'+
            '</span>'+
            '</div>').prependTo(dialog);

        toolbar.find(".node-diff-filter").click(function(evt) {
            evt.preventDefault();
            if (!$(this).hasClass('selected')) {
                $(this).siblings().removeClass('selected');
                $(this).addClass('selected');
            }
            if ($(this).attr('id') === 'node-diff-filter-all') {
                diffList.find('.node-diff-node-unchanged').parent().removeClass('hide');
                diffList.find('.node-diff-tab-unchanged').parent().removeClass('hide');
            } else {
                diffList.find('.node-diff-node-unchanged').parent().addClass('hide');
                diffList.find('.node-diff-tab-unchanged').parent().addClass('hide');
                $(".node-diff-tab.node-diff-tab-unchanged").addClass("collapsed");
            }
        })

        $("#node-dialog-view-diff").dialog({
            title: RED._('deploy.confirm.button.review'),
            modal: true,
            autoOpen: false,
            buttons: [
                // {
                //     text: RED._("deploy.confirm.button.cancel"),
                //     click: function() {
                //         $( this ).dialog( "close" );
                //     }
                // },
                {
                    text: RED._("common.label.close"),
                    class: "primary",
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                }
            ],
            open: function() {
                $(this).dialog({width:Math.min($(window).width(),900),height:Math.min($(window).height(),600)});
            }
        });

        var diffList = $("#node-dialog-view-diff-diff").editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(container,i,object) {
                var localDiff = object.diff;
                var tab = object.tab.n;
                var def = object.def;
                var tabDiv = $('<div>',{class:"node-diff-tab"}).appendTo(container);
                var titleRow = $('<div>',{class:"node-diff-tab-title"}).appendTo(tabDiv);
                if (localDiff.added[tab.id]) {
                    titleRow.addClass("node-diff-node-added");
                } else if (localDiff.deleted[tab.id]) {
                    titleRow.addClass("node-diff-node-deleted");
                }
                var status = $('<span class="node-diff-status"></span>').appendTo(titleRow);

                $('<span class="node-diff-chevron"><i class="fa fa-angle-down"></i></span>').appendTo(titleRow);
                createNodeIcon(tab,def).appendTo(titleRow);
                var tabForLabel = (object.newTab || object.tab).n;
                if (tabForLabel.type === 'tab') {
                    $('<span>').html(tabForLabel.label||tabForLabel.id).appendTo(titleRow);
                } else if (tab.type === 'subflow') {
                    $('<span>').html((tabForLabel.name||tabForLabel.id)).appendTo(titleRow);
                } else {
                    $('<span>').html("Global configuration nodes").appendTo(titleRow);
                }

                if (object.newTab) {
                    if (localDiff.changed[tab.id]) {
                        titleRow.addClass("node-diff-node-changed");
                        var propTab = $('<div>',{class:"node-diff-node-entry node-diff-node-props"}).appendTo(tabDiv);
                        var props = createNodePropertiesTable(tab,object.newTab.n,def).appendTo(propTab);
                    }
                }

                var stats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(titleRow);

                var flowStats = {
                    addedCount:0,
                    deletedCount:0,
                    changedCount:0,
                    conflictedCount:0
                }
                var seen = {};
                object.tab.nodes.forEach(function(node) {
                    seen[node.id] = true;
                    createNodeDiffRow(node,flowStats,localDiff).appendTo(tabDiv)
                });
                if (object.newTab) {
                    object.newTab.nodes.forEach(function(node) {
                        if (!seen[node.id]) {
                            createNodeDiffRow(node,flowStats,localDiff).appendTo(tabDiv)
                        }
                    });
                }
                titleRow.click(function(evt) {
                    evt.preventDefault();

                    if (titleRow.parent().find(".node-diff-node-entry:not(.hide)").length > 0) {
                        titleRow.parent().toggleClass('collapsed');
                    }
                })

                var changesCount = flowStats.addedCount+flowStats.deletedCount+flowStats.changedCount+flowStats.conflictedCount;
                var tabModified = localDiff.added[tab.id] || localDiff.deleted[tab.id] || localDiff.changed[tab.id];
                if (changesCount === 0) {
                    tabDiv.addClass("collapsed");
                    if (!tabModified) {
                        tabDiv.parent().addClass("hide");
                        tabDiv.addClass("node-diff-tab-unchanged");
                    }
                }
                if (localDiff.deleted[tab.id]) {
                    $('<i class="fa fa-minus-square"></i>').appendTo(status);
                } else if (localDiff.added[tab.id]) {
                    $('<i class="fa fa-plus-square"></i>').appendTo(status);
                } else if (localDiff.changed[tab.id]) {
                    $('<i class="fa fa-dot-circle-o"></i>').appendTo(status);
                }
                if (tabDiv.find(".node-diff-node-entry").length === 0) {
                    tabDiv.addClass("node-diff-tab-empty");
                }

                var statsInfo = ((flowStats.addedCount > 0)?'<span class="node-diff-added">'+flowStats.addedCount+' added</span> ':'')+
                                ((flowStats.deletedCount > 0)?'<span class="node-diff-deleted">'+flowStats.deletedCount+' deleted</span> ':'')+
                                ((flowStats.changedCount > 0)?'<span class="node-diff-changed">'+flowStats.changedCount+' changed</span> ':'')+
                                ((flowStats.conflictedCount > 0)?'<span class="node-diff-conflicted">'+flowStats.conflictedCount+' conflicts</span>':'');
                stats.html(statsInfo);



                //
                //
                //
                // var node = object.node;
                // var realNode = RED.nodes.node(node.id);
                // var def = RED.nodes.getType(object.node.type)||{};
                // var l = "";
                // if (def && def.label && realNode) {
                //     l = def.label;
                //     try {
                //         l = (typeof l === "function" ? l.call(realNode) : l);
                //     } catch(err) {
                //         console.log("Definition error: "+node.type+".label",err);
                //     }
                // }
                // l = l||node.label||node.name||node.id||"";
                // console.log(node);
                // var div = $('<div>').appendTo(container);
                // div.html(l);
            }
        });
    }

    function formatWireProperty(wires) {
        var result = $("<ol></ol>");
        wires.forEach(function(p,i) {
            var port = $("<li>").appendTo(result);
            if (p && p.length > 0) {
                var links = $("<ul>").appendTo(port);
                p.forEach(function(d) {
                    var entry = $("<li>").text(d).appendTo(links);
                })
            } else {
                port.html('none');
            }
        })
        return result;
    }
    function createNodeIcon(node,def) {
        var nodeDiv = $("<div>",{class:"node-diff-node-entry-node"});
        var colour = def.color;
        var icon_url = "arrow-in.png";
        if (node.type === 'tab') {
            colour = "#C0DEED";
            icon_url = "subflow.png";
        } else if (def.category === 'config') {
            icon_url = "cog.png";
        } else if (node.type === 'unknown') {
            icon_url = "alert.png";
        } else {
            icon_url = def.icon;
        }
        nodeDiv.css('backgroundColor',colour);

        var iconContainer = $('<div/>',{class:"palette_icon_container"}).appendTo(nodeDiv);
        $('<div/>',{class:"palette_icon",style:"background-image: url(icons/"+icon_url+")"}).appendTo(iconContainer);

        return nodeDiv;
    }
    function createNodeDiffRow(node,stats,localDiff) {
        var realNode = RED.nodes.node(node.id);
        var hasChanges = false;
        if (localDiff.added[node.id]) {
            stats.addedCount++;
        }
        if (localDiff.deleted[node.id]) {
            stats.deletedCount++;
        }
        if (localDiff.changed[node.id]) {
            stats.changedCount++;
            hasChanges = true;
        }

        var def = RED.nodes.getType(node.type)||{};
        var div = $("<div>",{class:"node-diff-node-entry collapsed"});
        var nodeTitleDiv = $("<div>",{class:"node-diff-node-entry-title"}).appendTo(div);
        var status = $('<span class="node-diff-status"></span>').appendTo(nodeTitleDiv);
        var nodeLabel = node.label || node.name || node.id;

        if (hasChanges) {
            nodeTitleDiv.addClass("node-diff-node-changed");
            $('<i class="fa fa-dot-circle-o"></i>').appendTo(status);
            var newNode = localDiff.newConfig.all[node.id];
            if (newNode) {
                nodeLabel = newNode.label || newNode.name || newNode.id;
                nodeTitleDiv.click(function(evt) {
                    evt.preventDefault();
                    $(this).parent().toggleClass('collapsed');
                })
                createNodePropertiesTable(node,newNode,def).appendTo(div);
                $('<span class="node-diff-chevron"><i class="fa fa-angle-down"></i></span>').appendTo(nodeTitleDiv);
            }
        } else if (localDiff.deleted[node.id]){
            $('<span class="node-diff-chevron">').appendTo(nodeTitleDiv);
            nodeTitleDiv.addClass("node-diff-node-deleted");
            $('<i class="fa fa-minus-square"></i>').appendTo(status);
        } else if (localDiff.added[node.id]) {
            $('<span class="node-diff-chevron">').appendTo(nodeTitleDiv);
            nodeTitleDiv.addClass("node-diff-node-added")
            $('<i class="fa fa-plus-square"></i>').appendTo(status);
        } else {
            $('<span class="node-diff-chevron">').appendTo(nodeTitleDiv);
            nodeTitleDiv.addClass("node-diff-node-unchanged");
            div.addClass("hide");
        }

        createNodeIcon(node,def).appendTo(nodeTitleDiv);

        var contentDiv = $('<div>',{class:"node-diff-node-description"}).appendTo(nodeTitleDiv);

        $('<span>',{class:"node-diff-node-label"}).html(nodeLabel).appendTo(contentDiv);
        $('<span>',{class:"node-diff-node-meta"}).html(node.id).appendTo(nodeTitleDiv);

        //$('<div>',{class:"red-ui-search-result-node-type"}).html(node.type).appendTo(contentDiv);
        //$('<div>',{class:"red-ui-search-result-node-id"}).html(node.id).appendTo(contentDiv);

        return div;
    }
    function createNodePropertiesTable(node,newNode,def) {
        var nodePropertiesDiv = $("<div>",{class:"node-diff-node-entry-properties"});

        var nodePropertiesTable = $("<table>").appendTo(nodePropertiesDiv);
        var row;
        if (node.hasOwnProperty('x')) {
            if (newNode.x !== node.x || newNode.y !== node.y) {
                var currentPosition = RED.utils.createObjectElement({x:node.x,y:node.y});
                var newPosition = RED.utils.createObjectElement({x:newNode.x,y:newNode.y});
                row = $("<tr><td>position</td><td></td><td></td></tr>").appendTo(nodePropertiesTable);
                currentPosition.appendTo(row.children()[1]);
                newPosition.appendTo(row.children()[2]);

            }
        }
        if (node.hasOwnProperty('wires')) {
            var localValue = JSON.stringify(node.wires);
            var remoteValue = JSON.stringify(newNode.wires);
            if (localValue !== remoteValue) {
                row = $("<tr><td>wires</td><td></td><td></td></tr>").appendTo(nodePropertiesTable);
                formatWireProperty(node.wires).appendTo(row.children()[1]);
                formatWireProperty(newNode.wires).appendTo(row.children()[2]);
            }

        }
        var properties = Object.keys(node).filter(function(p) { return p!='z'&&p!='wires'&&p!=='x'&&p!=='y'&&p!=='id'&&p!=='type'&&(!def.defaults||!def.defaults.hasOwnProperty(p))});
        if (def.defaults) {
            properties = properties.concat(Object.keys(def.defaults));
        }
        properties.forEach(function(d) {
            var localValue = JSON.stringify(node[d]);
            var remoteValue = JSON.stringify(newNode[d]);

            if (remoteValue !== localValue) {
                var formattedProperty = RED.utils.createObjectElement(node[d]);
                var newFormattedProperty = RED.utils.createObjectElement(newNode[d]);
                var row = $("<tr><td>"+d+'</td><td class=""></td><td class="node-diff-property-changed"></td></tr>').appendTo(nodePropertiesTable);
                formattedProperty.appendTo(row.children()[1]);
                newFormattedProperty.appendTo(row.children()[2]);
            }
        })
        return nodePropertiesDiv;
    }



    function showlocalDiff() {
        var nns = RED.nodes.createCompleteNodeSet();
        var originalFlow = RED.nodes.originalFlow();
        var diff = generateDiff(originalFlow,nns);
        showDiff(diff);
    }


    function parseNodes(nodeList) {
        var tabOrder = [];
        var tabs = {};
        var subflows = {};
        var globals = [];
        var all = {};

        nodeList.forEach(function(node) {
            all[node.id] = node;
            if (node.type === 'tab') {
                tabOrder.push(node.id);
                tabs[node.id] = {n:node,nodes:[]};
            } else if (node.type === 'subflow') {
                subflows[node.id] = {n:node,nodes:[]};
            }
        });

        nodeList.forEach(function(node) {
            if (node.type !== 'tab' && node.type !== 'subflow') {
                if (tabs[node.z]) {
                    tabs[node.z].nodes.push(node);
                } else if (subflows[node.z]) {
                    subflows[node.z].nodes.push(node);
                } else {
                    globals.push(node);
                }
            }
        });

        return {
            all: all,
            tabOrder: tabOrder,
            tabs: tabs,
            subflows: subflows,
            globals: globals
        }
    }

    function generateDiff(currentNodes,newNodes) {
        var currentConfig = parseNodes(currentNodes);
        var newConfig = parseNodes(newNodes);
        var pending = RED.nodes.pending();
        var added = {};
        var deleted = {};
        var changed = {};
        var conflicted = {};

        Object.keys(currentConfig.all).forEach(function(id) {
            var node = RED.nodes.workspace(id)||RED.nodes.subflow(id)||RED.nodes.node(id);
            if (!newConfig.all.hasOwnProperty(id)) {
                if (!pending.added.hasOwnProperty(id)) {
                    deleted[id] = true;
                    conflicted[id] = node&&node.changed;
                }
            } else if (JSON.stringify(currentConfig.all[id]) !== JSON.stringify(newConfig.all[id])) {
                changed[id] = true;
                conflicted[id] = node.changed;
            }
        });
        Object.keys(newConfig.all).forEach(function(id) {
            if (!currentConfig.all.hasOwnProperty(id) && !pending.deleted.hasOwnProperty(id)) {
                added[id] = true;
            }
        });

        // console.log("Added",added);
        // console.log("Deleted",deleted);
        // console.log("Changed",changed);
        // console.log("Conflicted",conflicted);
        //
        // var formatString = function(id) {
        //     return conflicted[id]?"!":(added[id]?"+":(deleted[id]?"-":(changed[id]?"~":" ")));
        // }
        // newConfig.tabOrder.forEach(function(tabId) {
        //     var tab = newConfig.tabs[tabId];
        //     console.log(formatString(tabId),"Flow:",tab.n.label, "("+tab.n.id+")");
        //     tab.nodes.forEach(function(node) {
        //         console.log(" ",formatString(node.id),node.type,node.name || node.id);
        //     })
        //     if (currentConfig.tabs[tabId]) {
        //         currentConfig.tabs[tabId].nodes.forEach(function(node) {
        //             if (deleted[node.id]) {
        //                 console.log(" ",formatString(node.id),node.type,node.name || node.id);
        //             }
        //         })
        //     }
        // });
        // currentConfig.tabOrder.forEach(function(tabId) {
        //     if (deleted[tabId]) {
        //         var tab = currentConfig.tabs[tabId];
        //         console.log(formatString(tabId),"Flow:",tab.n.label, "("+tab.n.id+")");
        //     }
        // });

        return {
            currentConfig: currentConfig,
            newConfig: newConfig,
            added: added,
            deleted: deleted,
            changed: changed,
            conflicted: conflicted
        }
    }

    function formatNodeProperty(prop) {
        var formattedProperty = prop;
        if (formattedProperty === null) {
            formattedProperty = 'null';
        } else if (formattedProperty === undefined) {
            formattedProperty = 'undefined';
        } else if (typeof formattedProperty === 'object') {
            formattedProperty = JSON.stringify(formattedProperty);
        }
        if (/\n/.test(formattedProperty)) {
            formattedProperty = "<pre>"+formattedProperty+"</pre>"
        }
        return formattedProperty;
    }

    function showDiff(localDiff) {
        var el;
        var list = $("#node-dialog-view-diff-diff");
        list.editableList('empty');

        var currentConfig = localDiff.currentConfig;
        var newConfig = localDiff.newConfig;

        list.editableList('addItem',{
            diff: localDiff,
            def: {
                category: 'config',
                color: '#f0f0f0'
            },
            tab: {
                n: {},
                nodes: currentConfig.globals
            },
            newTab: {
                n: {},
                nodes: newConfig.globals
            }
        });

        var seenTabs = {};

        currentConfig.tabOrder.forEach(function(tabId) {
            var tab = currentConfig.tabs[tabId];
            var el = {
                diff: localDiff,
                def: {},
                tab:tab
            };
            if (newConfig.tabs.hasOwnProperty(tabId)) {
                el.newTab = newConfig.tabs[tabId];
            }
            seenTabs[tabId] = true;
            list.editableList('addItem',el)
        });
        newConfig.tabOrder.forEach(function(tabId) {
            if (!seenTabs[tabId]) {
                var tab = newConfig.tabs[tabId];
                var el = {
                    diff: localDiff,
                    def: {},
                    tab:tab
                };
                list.editableList('addItem',el)
            }
        })
        var subflowId;
        for (subflowId in currentConfig.subflows) {
            if (currentConfig.subflows.hasOwnProperty(subflowId)) {
                seenTabs[subflowId] = true;
                el = {
                    diff: localDiff,
                    def: {
                        defaults:{},
                        icon:"subflow.png",
                        category: "subflows",
                        color: "#da9"
                    },
                    tab:currentConfig.subflows[subflowId]
                }
                if (newConfig.subflows.hasOwnProperty(subflowId)) {
                    el.newTab = newConfig.subflows[subflowId];
                }
                list.editableList('addItem',el)
            }
        }
        for (subflowId in newConfig.subflows) {
            if (newConfig.subflows.hasOwnProperty(subflowId) && !seenTabs[subflowId]) {
                el = {
                    diff: localDiff,
                    def: {
                        defaults:{},
                        icon:"subflow.png",
                        category: "subflows",
                        color: "#da9"
                    },
                    tab:newConfig.subflows[subflowId]
                }
                list.editableList('addItem',el)
            }
        }

        $("#node-diff-filter-changed").addClass("selected");
        $("#node-diff-filter-all").removeClass("selected");

        $("#node-dialog-view-diff").dialog("open");
    }


    return {
        init: init
    }
})();
