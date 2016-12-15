RED.diff = (function() {

    function init() {

        RED.actions.add("core:show-current-diff",showLocalDiff);
        RED.actions.add("core:show-remote-diff",showRemoteDiff);

        RED.keyboard.add("*","ctrl-shift-l","core:show-current-diff");
        RED.keyboard.add("*","ctrl-shift-r","core:show-remote-diff");


        var dialog = $('<div id="node-dialog-view-diff" class="hide"><div id="node-dialog-view-diff-headers"></div><ol id="node-dialog-view-diff-diff"></ol></div>').appendTo(document.body);

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
                var remoteDiff = object.remoteDiff;
                var tab = object.tab.n;
                var def = object.def;
                var tabDiv = $('<div>',{class:"node-diff-tab"}).appendTo(container);
                var titleRow = $('<div>',{class:"node-diff-tab-title"}).appendTo(tabDiv);
                var nodesDiv = $('<div>').appendTo(tabDiv);
                var originalCell = $('<div>',{class:"node-diff-node-entry-cell"}).appendTo(titleRow);
                var localCell = $('<div>',{class:"node-diff-node-entry-cell"}).appendTo(titleRow);
                var remoteCell;
                if (remoteDiff) {
                    remoteCell = $('<div>',{class:"node-diff-node-entry-cell"}).appendTo(titleRow);
                }
                // if (localDiff.added[tab.id]) {
                //     titleRow.addClass("node-diff-node-added");
                // } else if (localDiff.deleted[tab.id]) {
                //     titleRow.addClass("node-diff-node-deleted");
                // }
                // var status = $('<span class="node-diff-status"></span>').appendTo(originalCell);

                // if (!object.newTab && object.remoteTab) {
                //     $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i></span></span>').appendTo(remoteCell);
                // //} else if (object.newTab && (remoteDiff && !object.remoteTab)) {
                // } else if (localDiff.added[tab.id]) {
                //     $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i></span></span>').appendTo(localCell);
                // }
                $('<span class="node-diff-chevron"><i class="fa fa-angle-down"></i></span>').appendTo(originalCell);
                createNodeIcon(tab,def).appendTo(originalCell);
                var tabForLabel = (object.newTab || object.tab).n;
                var titleSpan = $('<span>',{class:"node-diff-tab-title-meta"}).appendTo(originalCell);
                if (tabForLabel.type === 'tab') {
                    titleSpan.html(tabForLabel.label||tabForLabel.id);
                } else if (tab.type === 'subflow') {
                    titleSpan.html((tabForLabel.name||tabForLabel.id));
                } else {
                    titleSpan.html("Global configuration nodes");
                }
                var flowStats = {
                    local: {
                        addedCount:0,
                        deletedCount:0,
                        changedCount:0,
                        unchangedCount: 0
                    },
                    remote: {
                        addedCount:0,
                        deletedCount:0,
                        changedCount:0,
                        unchangedCount: 0
                    },
                    conflicts: 0
                }
                if (object.newTab || object.remoteTab) {
                    var localTabNode = {
                        node: localDiff.newConfig.all[tab.id],
                        all: localDiff.newConfig.all,
                        diff: localDiff
                    }
                    var remoteTabNode;
                    if (remoteDiff) {
                        remoteTabNode = {
                            node:remoteDiff.newConfig.all[tab.id]||null,
                            all: remoteDiff.newConfig.all,
                            diff: remoteDiff
                        }
                    }
                    if (tab.type !== undefined) {
                        var div = $("<div>",{class:"node-diff-node-entry node-diff-node-props collapsed"}).appendTo(nodesDiv);
                        var row = $("<div>",{class:"node-diff-node-entry-header"}).appendTo(div);
                        var originalNodeDiv = $("<div>",{class:"node-diff-node-entry-cell"}).appendTo(row);
                        var localNodeDiv = $("<div>",{class:"node-diff-node-entry-cell"}).appendTo(row);
                        var localChanged = false;
                        var remoteChanged = false;

                        if (!localDiff.newConfig.all[tab.id]) {
                            localNodeDiv.addClass("node-diff-empty");
                        } else if (localDiff.added[tab.id]) {
                            localNodeDiv.addClass("node-diff-node-added");
                            $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> added</span>').appendTo(localNodeDiv);
                        } else if (localDiff.changed[tab.id]) {
                            localNodeDiv.addClass("node-diff-node-changed");
                            $('<span class="node-diff-status"><i class="fa fa-dot-circle-o"></i> changed</span>').appendTo(localNodeDiv);
                        } else {
                            localNodeDiv.addClass("node-diff-node-unchanged");
                            $('<span class="node-diff-status"><i class="fa fa-circle-o"></i> unchanged</span>').appendTo(localNodeDiv);
                        }


                        var remoteNodeDiv;
                        if (remoteDiff) {
                            remoteNodeDiv = $("<div>",{class:"node-diff-node-entry-cell"}).appendTo(row);
                            if (!remoteDiff.newConfig.all[tab.id]) {
                                remoteNodeDiv.addClass("node-diff-empty");
                            } else if (remoteDiff.added[tab.id]) {
                                remoteNodeDiv.addClass("node-diff-node-added");
                                $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> added</span>').appendTo(remoteNodeDiv);
                            } else if (remoteDiff.changed[tab.id]) {
                                remoteNodeDiv.addClass("node-diff-node-changed");
                                $('<span class="node-diff-status"><i class="fa fa-dot-circle-o"></i> changed</span>').appendTo(remoteNodeDiv);
                            } else {
                                remoteNodeDiv.addClass("node-diff-node-unchanged");
                                $('<span class="node-diff-status"><i class="fa fa-circle-o"></i> unchanged</span>').appendTo(remoteNodeDiv);
                            }
                        }
                        $('<span class="node-diff-chevron"><i class="fa fa-angle-down"></i></span>').appendTo(originalNodeDiv);
                        $('<span>').html("Flow Properties").appendTo(originalNodeDiv);
                        row.click(function(evt) {
                            evt.preventDefault();
                            $(this).parent().toggleClass('collapsed');
                        });
                        createNodePropertiesTable(def,tab,localTabNode,remoteTabNode,flowStats).appendTo(div);
                    }
                }

                // var stats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(titleRow);


                var seen = {};
                object.tab.nodes.forEach(function(node) {
                    seen[node.id] = true;
                    createNodeDiffRow(node,flowStats,localDiff,remoteDiff).appendTo(nodesDiv)
                });
                if (object.newTab) {
                    object.newTab.nodes.forEach(function(node) {
                        if (!seen[node.id]) {
                            seen[node.id] = true;
                            createNodeDiffRow(node,flowStats,localDiff,remoteDiff).appendTo(nodesDiv)
                        }
                    });
                }
                if (object.remoteTab) {
                    object.remoteTab.nodes.forEach(function(node) {
                        if (!seen[node.id]) {
                            createNodeDiffRow(node,flowStats,localDiff,remoteDiff).appendTo(nodesDiv)
                        }
                    });
                }
                titleRow.click(function(evt) {
                    evt.preventDefault();

                    // if (titleRow.parent().find(".node-diff-node-entry:not(.hide)").length > 0) {
                    titleRow.parent().toggleClass('collapsed');
                    if ($(this).parent().hasClass('collapsed')) {
                        $(this).parent().find('.node-diff-node-entry').addClass('collapsed');
                        $(this).parent().find('.debug-message-element').addClass('collapsed');
                    }
                    // }
                })

                var localChangesCount = flowStats.local.addedCount+flowStats.local.deletedCount+flowStats.local.changedCount;
                var remoteChangesCount = flowStats.remote.addedCount+flowStats.remote.deletedCount+flowStats.remote.changedCount;

                if (localDiff.deleted[tab.id]) {
                    $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> flow deleted</span></span>').appendTo(localCell);
                } else if (object.newTab) {
                    if (localDiff.added[tab.id]) {
                        $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> flow added</span></span>').appendTo(localCell);
                    } else {
                        if (tab.id) {
                            if (localDiff.changed[tab.id]) {
                                localChangesCount++;
                                flowStats.local.changedCount++;
                            } else {
                                flowStats.local.unchangedCount++;
                            }
                        }
                        var localStats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(localCell);
                        if (flowStats.conflicts > 0) {
                            $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i> '+flowStats.conflicts+'</span></span>').appendTo(localStats);
                        }
                        if (flowStats.local.unchangedCount > 0) {
                            $('<span class="node-diff-node-unchanged"><span class="node-diff-status"><i class="fa fa-circle-o"></i> '+flowStats.local.unchangedCount+'</span></span>').appendTo(localStats);
                        }
                        if (flowStats.local.addedCount > 0) {
                            $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> '+flowStats.local.addedCount+'</span></span>').appendTo(localStats);
                        }
                        if (flowStats.local.changedCount > 0) {
                            $('<span class="node-diff-node-changed"><span class="node-diff-status"><i class="fa fa-dot-circle-o"></i> '+flowStats.local.changedCount+'</span></span>').appendTo(localStats);
                        }
                        if (flowStats.local.deletedCount > 0) {
                            $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> '+flowStats.local.deletedCount+'</span></span>').appendTo(localStats);
                        }
                    }
                } else {
                    localCell.addClass("node-diff-empty");
                }

                if (remoteDiff) {
                    if (remoteDiff.deleted[tab.id]) {
                        $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> flow deleted</span></span>').appendTo(remoteCell);
                    } else if (object.remoteTab) {
                        if (remoteDiff.added[tab.id]) {
                            $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> flow added</span></span>').appendTo(remoteCell);
                        } else {
                            if (tab.id) {
                                if (remoteDiff.changed[tab.id]) {
                                    remoteChangesCount++;
                                    flowStats.remote.changedCount++;
                                } else {
                                    flowStats.remote.unchangedCount++;
                                }
                            }
                            var remoteStats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(remoteCell);
                            if (flowStats.conflicts > 0) {
                                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i> '+flowStats.conflicts+'</span></span>').appendTo(remoteStats);
                            }
                            if (flowStats.remote.unchangedCount > 0) {
                                $('<span class="node-diff-node-unchanged"><span class="node-diff-status"><i class="fa fa-circle-o"></i> '+flowStats.remote.unchangedCount+'</span></span>').appendTo(remoteStats);
                            }
                            if (flowStats.remote.addedCount > 0) {
                                $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> '+flowStats.remote.addedCount+'</span></span>').appendTo(remoteStats);
                            }
                            if (flowStats.remote.changedCount > 0) {
                                $('<span class="node-diff-node-changed"><span class="node-diff-status"><i class="fa fa-dot-circle-o"></i> '+flowStats.remote.changedCount+'</span></span>').appendTo(remoteStats);
                            }
                            if (flowStats.remote.deletedCount > 0) {
                                $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> '+flowStats.remote.deletedCount+'</span></span>').appendTo(remoteStats);
                            }
                        }
                    } else {
                        remoteCell.addClass("node-diff-empty");
                    }
                }
                if (tabDiv.find(".node-diff-node-entry").length === 0) {
                    tabDiv.addClass("node-diff-tab-empty");
                }
                // var statsInfo = ((flowStats.addedCount > 0)?'<span class="node-diff-added">'+flowStats.addedCount+' added</span> ':'')+
                //                 ((flowStats.deletedCount > 0)?'<span class="node-diff-deleted">'+flowStats.deletedCount+' deleted</span> ':'')+
                //                 ((flowStats.changedCount > 0)?'<span class="node-diff-changed">'+flowStats.changedCount+' changed</span> ':'');
                // stats.html(statsInfo);
            }
        });
    }

    function formatWireProperty(wires,allNodes) {
        var result = $("<div>",{class:"node-diff-property-wires"})
        var list = $("<ol></ol>");
        var c = 0;
        wires.forEach(function(p,i) {
            var port = $("<li>").appendTo(list);
            if (p && p.length > 0) {
                $("<span>").html(i+1).appendTo(port);
                var links = $("<ul>").appendTo(port);
                p.forEach(function(d) {
                    c++;
                    var entry = $("<li>").appendTo(links);
                    var node = allNodes[d];
                    if (node) {
                        var def = RED.nodes.getType(node.type)||{};
                        createNode(node,def).appendTo(entry);
                    } else {
                        entry.html(d);
                    }
                })
            } else {
                port.html('none');
            }
        })
        if (c === 0) {
            result.html("none");
        } else {
            list.appendTo(result);
        }
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
    function createNode(node,def) {
        var nodeTitleDiv = $("<div>",{class:"node-diff-node-entry-title"})
        createNodeIcon(node,def).appendTo(nodeTitleDiv);
        var contentDiv = $('<div>',{class:"node-diff-node-description"}).appendTo(nodeTitleDiv);
        var nodeLabel = node.label || node.name || node.id;
        $('<span>',{class:"node-diff-node-label"}).html(nodeLabel).appendTo(contentDiv);
        return nodeTitleDiv;
    }
    function createNodeDiffRow(node,stats,localDiff,remoteDiff) {
        var hasChanges = false; // exists in original and local/remote but with changes
        var unChanged = true; // existing in original,local,remote unchanged
        var conflicted = false;

        if (localDiff.added[node.id]) {
            stats.local.addedCount++;
            unChanged = false;
        }
        if (remoteDiff && remoteDiff.added[node.id]) {
            stats.remote.addedCount++;
            unChanged = false;
        }
        if (localDiff.deleted[node.id]) {
            stats.local.deletedCount++;
            unChanged = false;
        }
        if (remoteDiff && remoteDiff.deleted[node.id]) {
            stats.remote.deletedCount++;
            unChanged = false;
        }
        if (localDiff.changed[node.id]) {
            stats.local.changedCount++;
            hasChanges = true;
            unChanged = false;
        }
        if (remoteDiff && remoteDiff.changed[node.id]) {
            stats.remote.changedCount++;
            hasChanges = true;
            unChanged = false;
        }

        var def = RED.nodes.getType(node.type);
        if (def === undefined) {
            if (/^subflow:/.test(node.type)) {
                def = {
                    icon:"subflow.png",
                    category: "subflows",
                    color: "#da9",
                    defaults:{name:{value:""}}
                }
            } else {
                def = {};
            }
        }
        var div = $("<div>",{class:"node-diff-node-entry collapsed"});
        var row = $("<div>").appendTo(div);

        var originalNodeDiv = $("<div>",{class:"node-diff-node-entry-cell"}).appendTo(row);
        var localNodeDiv = $("<div>",{class:"node-diff-node-entry-cell"}).appendTo(row);
        var remoteNodeDiv;
        var chevron;
        if (remoteDiff) {
            remoteNodeDiv = $("<div>",{class:"node-diff-node-entry-cell"}).appendTo(row);
        }
        $('<span class="node-diff-chevron"><i class="fa fa-angle-down"></i></span>').appendTo(originalNodeDiv);

        if (unChanged) {
            stats.local.unchangedCount++;
            // $('<span class="node-diff-chevron">').appendTo(originalNodeDiv);
            //$('<span class="node-diff-status"></span>').appendTo(originalNodeDiv);
            createNode(node,def).appendTo(originalNodeDiv);
            localNodeDiv.addClass("node-diff-node-unchanged");
            $('<span class="node-diff-status"><i class="fa fa-circle-o"></i> unchanged</span>').appendTo(localNodeDiv);
            if (remoteDiff) {
                stats.remote.unchangedCount++;
                remoteNodeDiv.addClass("node-diff-node-unchanged");
                $('<span class="node-diff-status"><i class="fa fa-circle-o"></i> unchanged</span>').appendTo(remoteNodeDiv);
            }

            //$('<span class="node-diff-status"></span>').appendTo(localNodeDiv);
            // createNode(node,def).appendTo(localNodeDiv);
            // if (remoteDiff) {
            //     //$('<span class="node-diff-status"></span>').appendTo(remoteNodeDiv);
            //     createNode(node,def).appendTo(remoteNodeDiv);
            // }
        } else if (localDiff.added[node.id]) {
            // $('<span class="node-diff-chevron">').appendTo(originalNodeDiv);
            localNodeDiv.addClass("node-diff-node-added");
            if (remoteNodeDiv) {
                remoteNodeDiv.addClass("node-diff-empty");
            }
            $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> added</span>').appendTo(localNodeDiv);
            createNode(node,def).appendTo(originalNodeDiv);
        } else if (remoteDiff && remoteDiff.added[node.id]) {
            // $('<span class="node-diff-chevron">').appendTo(originalNodeDiv);
            localNodeDiv.addClass("node-diff-empty");
            remoteNodeDiv.addClass("node-diff-node-added");
            $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> added</span>').appendTo(remoteNodeDiv);
            createNode(node,def).appendTo(originalNodeDiv);
        } else {
            // chevron = $('<span class="node-diff-chevron">').appendTo(originalNodeDiv);
            // if (localDiff.changed[node.id] || (remoteDiff && remoteDiff.changed[node.id])) {
            //     $('<i class="fa fa-angle-down"></i>').appendTo(chevron);
            // }
            //$('<span class="node-diff-status"></span>').appendTo(originalNodeDiv);
            createNode(node,def).appendTo(originalNodeDiv);
            if (localDiff.deleted[node.z]) {
                localNodeDiv.addClass("node-diff-empty");
            } else if (localDiff.deleted[node.id]) {
                localNodeDiv.addClass("node-diff-node-deleted");
                $('<span class="node-diff-status"><i class="fa fa-minus-square"></i> deleted</span>').appendTo(localNodeDiv);
            } else if (localDiff.changed[node.id]) {
                localNodeDiv.addClass("node-diff-node-changed");
                $('<span class="node-diff-status"><i class="fa fa-dot-circle-o"></i> changed</span>').appendTo(localNodeDiv);
            } else {
                stats.local.unchangedCount++;
                localNodeDiv.addClass("node-diff-node-unchanged");
                $('<span class="node-diff-status"><i class="fa fa-circle-o"></i> unchanged</span>').appendTo(localNodeDiv);
            }
            // createNode(node,def).appendTo(localNodeDiv);

            if (remoteDiff) {
                if (remoteDiff.deleted[node.z]) {
                    remoteNodeDiv.addClass("node-diff-empty");
                } else if (remoteDiff.deleted[node.id]) {
                    remoteNodeDiv.addClass("node-diff-node-deleted");
                    $('<span class="node-diff-status"><i class="fa fa-minus-square"></i> deleted</span>').appendTo(remoteNodeDiv);
                } else if (remoteDiff.changed[node.id]) {
                    remoteNodeDiv.addClass("node-diff-node-changed");
                    $('<span class="node-diff-status"><i class="fa fa-dot-circle-o"></i> changed</span>').appendTo(remoteNodeDiv);
                } else {
                    stats.remote.unchangedCount++;
                    remoteNodeDiv.addClass("node-diff-node-unchanged");
                    $('<span class="node-diff-status"><i class="fa fa-circle-o"></i> unchanged</span>').appendTo(remoteNodeDiv);
                }
                //createNode(node,def).appendTo(remoteNodeDiv);
            }
        }
        var localNode = {
            node: localDiff.newConfig.all[node.id],
            all: localDiff.newConfig.all,
            diff: localDiff
        };
        var remoteNode;
        if (remoteDiff) {
            remoteNode = {
                node:remoteDiff.newConfig.all[node.id]||null,
                all: remoteDiff.newConfig.all,
                diff: remoteDiff
            }
        }
        var currentConflictCount = stats.conflicts;
        createNodePropertiesTable(def,node,localNode,remoteNode,stats).appendTo(div);
        if (currentConflictCount !== stats.conflicts) {
            $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span>').prependTo(localNodeDiv);
            $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span>').prependTo(remoteNodeDiv);
        }
        row.click(function(evt) {
            evt.preventDefault();
            $(this).parent().toggleClass('collapsed');
        });

        return div;
    }
    function createNodePropertiesTable(def,node,localNodeObj,remoteNodeObj,stats) {
        var localNode = localNodeObj.node;
        var remoteNode;
        if (remoteNodeObj) {
            remoteNode = remoteNodeObj.node;
        }

        var nodePropertiesDiv = $("<div>",{class:"node-diff-node-entry-properties"});

        var nodePropertiesTable = $("<table>").appendTo(nodePropertiesDiv);
        //var nodePropertiesTable = $("<div>").appendTo(nodePropertiesDiv);
        var row;
        var localCell, remoteCell;
        var currentValue, localValue, remoteValue;
        var localChanged = false;
        var remoteChanged = false;
        var localChanges = 0;
        var remoteChanges = 0;
        var conflict = false;
        var conflicted = false;
        var status;

        if (remoteNodeObj) {
            if ( (remoteNodeObj.diff.changed[node.id] && localNodeObj.diff.deleted[node.id]) ||
                 (remoteNodeObj.diff.deleted[node.id] && localNodeObj.diff.changed[node.id])
             ) {
                 conflicted = true;
             }
        }
        if (node.hasOwnProperty('x')) {
            if (localNode) {
                if (localNode.x !== node.x || localNode.y !== node.y) {
                    localChanged = true;
                    localChanges++;
                }
            }
            if (remoteNode) {
                if (remoteNode.x !== node.x || remoteNode.y !== node.y) {
                    remoteChanged = true;
                    remoteChanges++;
                }
            }
            if ( (remoteChanged && localChanged && (localNode.x !== remoteNode.y || localNode.y !== remoteNode.x)) ||
                (!localChanged && remoteChanged && localNodeObj.diff.deleted[node.id]) ||
                (localChanged && !remoteChanged && remoteNodeObj.diff.deleted[node.id])
            ) {
                conflicted = true;
                conflict = true;
            }
            row = $("<tr>").appendTo(nodePropertiesTable);
            $("<td>",{class:"node-diff-property-cell-label"}).html("position").appendTo(row);
            localCell = $("<td>",{class:"node-diff-property-cell"}).appendTo(row);
            if (localNode) {
                localCell.addClass("node-diff-node-"+(localChanged?"changed":"unchanged"));
                $('<span class="node-diff-status">'+(localChanged?'<i class="fa fa-dot-circle-o"></i>':'')+'</span>').appendTo(localCell);
                RED.utils.createObjectElement({x:localNode.x,y:localNode.y}).appendTo(localCell);
            } else {
                localCell.addClass("node-diff-empty");
            }

            if (remoteNode !== undefined) {
                remoteCell = $("<td>",{class:"node-diff-property-cell"}).appendTo(row);
                remoteCell.addClass("node-diff-node-"+(remoteChanged?"changed":"unchanged"));
                if (remoteNode) {
                    $('<span class="node-diff-status">'+(remoteChanged?'<i class="fa fa-dot-circle-o"></i>':'')+'</span>').appendTo(remoteCell);
                    RED.utils.createObjectElement({x:remoteNode.x,y:remoteNode.y}).appendTo(remoteCell);
                } else {
                    remoteCell.addClass("node-diff-empty");
                }
            }
        }
        //
        localChanged = remoteChanged = conflict = false;
        if (node.hasOwnProperty('wires')) {
            currentValue = JSON.stringify(node.wires);
            if (localNode) {
                localValue = JSON.stringify(localNode.wires);
                if (currentValue !== localValue) {
                    localChanged = true;
                    localChanges++;
                }
            }
            if (remoteNode) {
                remoteValue = JSON.stringify(remoteNode.wires);
                if (currentValue !== remoteValue) {
                    remoteChanged = true;
                    remoteChanges++;
                }
            }
            if ( (remoteChanged && localChanged && (localValue !== remoteValue)) ||
                (!localChanged && remoteChanged && localNodeObj.diff.deleted[node.id]) ||
                (localChanged && !remoteChanged && remoteNodeObj.diff.deleted[node.id])
            ){
                conflicted = true;
                conflict = true;
            }
            row = $("<tr>").appendTo(nodePropertiesTable);
            $("<td>",{class:"node-diff-property-cell-label"}).html("wires").appendTo(row);
            localCell = $("<td>",{class:"node-diff-property-cell"}).appendTo(row);
            if (localNode) {
                if (!conflict) {
                    localCell.addClass("node-diff-node-"+(localChanged?"changed":"unchanged"));
                    $('<span class="node-diff-status">'+(localChanged?'<i class="fa fa-dot-circle-o"></i>':'')+'</span>').appendTo(localCell);
                } else {
                    localCell.addClass("node-diff-node-conflict");
                    $('<span class="node-diff-status"><i class="fa fa-exclamation"></i></span>').appendTo(localCell);
                }
                formatWireProperty(localNode.wires,localNodeObj.all).appendTo(localCell);
            } else {
                localCell.addClass("node-diff-empty");
            }

            if (remoteNode !== undefined) {
                remoteCell = $("<td>",{class:"node-diff-property-cell"}).appendTo(row);
                if (remoteNode) {
                    if (!conflict) {
                        remoteCell.addClass("node-diff-node-"+(remoteChanged?"changed":"unchanged"));
                        $('<span class="node-diff-status">'+(remoteChanged?'<i class="fa fa-dot-circle-o"></i>':'')+'</span>').appendTo(remoteCell);
                    } else {
                        remoteCell.addClass("node-diff-node-conflict");
                        $('<span class="node-diff-status"><i class="fa fa-exclamation"></i></span>').appendTo(remoteCell);
                    }
                    formatWireProperty(remoteNode.wires,remoteNodeObj.all).appendTo(remoteCell);
                } else {
                    remoteCell.addClass("node-diff-empty");
                }
            }
        }
        var properties = Object.keys(node).filter(function(p) { return p!='z'&&p!='wires'&&p!=='x'&&p!=='y'&&p!=='id'&&p!=='type'&&(!def.defaults||!def.defaults.hasOwnProperty(p))});
        if (def.defaults) {
            properties = properties.concat(Object.keys(def.defaults));
        }
        properties.forEach(function(d) {
            localChanged = false;
            remoteChanged = false;
            conflict = false;
            currentValue = JSON.stringify(node[d]);
            if (localNode) {
                localValue = JSON.stringify(localNode[d]);
                if (currentValue !== localValue) {
                    localChanged = true;
                    localChanges++;
                }
            }
            if (remoteNode) {
                remoteValue = JSON.stringify(remoteNode[d]);
                if (currentValue !== remoteValue) {
                    remoteChanged = true;
                    remoteChanges++;
                }
            }

            if ( (remoteChanged && localChanged && (localValue !== remoteValue)) ||
                (!localChanged &&  remoteChanged && localNodeObj.diff.deleted[node.id]) ||
                (localChanged && !remoteChanged && remoteNodeObj.diff.deleted[node.id])
            ){
                conflicted = true;
                conflict = true;
            }

            row = $("<tr>").appendTo(nodePropertiesTable);
            $("<td>",{class:"node-diff-property-cell-label"}).html(d).appendTo(row);
            localCell = $("<td>",{class:"node-diff-property-cell"}).appendTo(row);
            if (localNode) {
                if (!conflict) {
                    localCell.addClass("node-diff-node-"+(localChanged?"changed":"unchanged"));
                    $('<span class="node-diff-status">'+(localChanged?'<i class="fa fa-dot-circle-o"></i>':'')+'</span>').appendTo(localCell);
                } else {
                    localCell.addClass("node-diff-node-conflict");
                    $('<span class="node-diff-status"><i class="fa fa-exclamation"></i></span>').appendTo(localCell);
                }
                RED.utils.createObjectElement(localNode[d]).appendTo(localCell);
            } else {
                localCell.addClass("node-diff-empty");
            }
            if (remoteNode !== undefined) {
                remoteCell = $("<td>",{class:"node-diff-property-cell"}).appendTo(row);
                if (remoteNode) {
                    if (!conflict) {
                        remoteCell.addClass("node-diff-node-"+(remoteChanged?"changed":"unchanged"));
                        $('<span class="node-diff-status">'+(remoteChanged?'<i class="fa fa-dot-circle-o"></i>':'')+'</span>').appendTo(remoteCell);
                    } else {
                        remoteCell.addClass("node-diff-node-conflict");
                        $('<span class="node-diff-status"><i class="fa fa-exclamation"></i></span>').appendTo(remoteCell);
                    }
                    RED.utils.createObjectElement(remoteNode[d]).appendTo(remoteCell);
                } else {
                    remoteCell.addClass("node-diff-empty");
                }
            }
        });

        // row = $("<tr>",{class:"node-diff-property-header"}).prependTo(nodePropertiesTable);
        // $("<td>").appendTo(row);
        // var cell;
        // if (localNode) {
        //     if (localNodeObj.diff.added[node.id]) {
        //         $('<td class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> added</span></td>').appendTo(row);
        //     } else if (localChanges > 0) {
        //         cell = $('<td></td>').appendTo(row);
        //         if (conflicted) {
        //             $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i> conflict</span> </span>').appendTo(cell);
        //         }
        //         $('<span class="node-diff-node-changed"><span class="node-diff-status"><i class="fa fa-dot-circle-o"></i> changed</span></span>').appendTo(cell);
        //     } else {
        //         $('<td class="node-diff-node-unchanged"><span class="node-diff-status"><i class="fa fa-circle-o"></i> unchanged</span></td>').appendTo(row);
        //     }
        // } else if (localNodeObj.diff.deleted[node.id]) {
        //     cell = $('<td></td>').appendTo(row);
        //     if (conflicted) {
        //         $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i> conflict</span> </span>').appendTo(cell);
        //     }
        //     $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> deleted</span></span>').appendTo(cell);
        // } else {
        //     $('<td class="node-diff-empty"></td>').appendTo(row);
        // }
        // if (remoteNode) {
        //     if (remoteNodeObj.diff.added[node.id]) {
        //         $('<td class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> added</span></td>').appendTo(row);
        //     } else if (remoteChanges > 0) {
        //         cell = $('<td></td>').appendTo(row);
        //         if (conflicted) {
        //             $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i> conflict</span> </span>').appendTo(cell);
        //         }
        //         $('<span class="node-diff-node-changed"><span class="node-diff-status"><i class="fa fa-dot-circle-o"></i> changed</span></span>').appendTo(cell);
        //     } else {
        //         $('<td class="node-diff-node-unchanged"><span class="node-diff-status"><i class="fa fa-circle-o"></i> unchanged</span></td>').appendTo(row);
        //     }
        // } else if (remoteNodeObj.diff.deleted[node.id]) {
        //     cell = $('<td></td>').appendTo(row);
        //     if (conflicted) {
        //         $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i> conflict</span> </span>').appendTo(cell);
        //     }
        //     $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> deleted</span></span>').appendTo(cell);
        // } else {
        //     $('<td class="node-diff-empty"></td>').appendTo(row);
        // }
        if (conflicted) {
            stats.conflicts++;
        }
        return nodePropertiesDiv;
    }
    function showLocalDiff() {
        var nns = RED.nodes.createCompleteNodeSet();
        var originalFlow = RED.nodes.originalFlow();
        var diff = generateDiff(originalFlow,nns);
        showDiff(diff);
    }
    function showRemoteDiff() {
        $.ajax({
            headers: {
                "Accept":"application/json",
            },
            cache: false,
            url: 'flows',
            success: function(nodes) {
                var localFlow = RED.nodes.createCompleteNodeSet();
                var originalFlow = RED.nodes.originalFlow();
                var remoteFlow = nodes.flows;
                var localDiff = generateDiff(originalFlow,localFlow);
                var remoteDiff = generateDiff(originalFlow,remoteFlow);
                showDiff(localDiff,remoteDiff);
            }
        });
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

        Object.keys(currentConfig.all).forEach(function(id) {
            var node = RED.nodes.workspace(id)||RED.nodes.subflow(id)||RED.nodes.node(id);
            if (!newConfig.all.hasOwnProperty(id)) {
                if (!pending.added.hasOwnProperty(id)) {
                    deleted[id] = true;
                }
            } else if (JSON.stringify(currentConfig.all[id]) !== JSON.stringify(newConfig.all[id])) {
                changed[id] = true;
            }
        });
        Object.keys(newConfig.all).forEach(function(id) {
            if (!currentConfig.all.hasOwnProperty(id) && !pending.deleted.hasOwnProperty(id)) {
                added[id] = true;
            }
        });

        return {
            currentConfig: currentConfig,
            newConfig: newConfig,
            added: added,
            deleted: deleted,
            changed: changed,
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
    function showDiff(localDiff,remoteDiff) {
        var list = $("#node-dialog-view-diff-diff");
        list.editableList('empty');
        $("#node-dialog-view-diff-headers").empty();

        var currentConfig = localDiff.currentConfig;
        var newConfig = localDiff.newConfig;
        var el = {
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
        };

        if (remoteDiff !== undefined) {
            $('#node-dialog-view-diff').addClass('node-diff-three-way');

            $('<div class="node-diff-node-entry-cell"></div><div class="node-diff-node-entry-cell">Local</div><div class="node-diff-node-entry-cell">Remote</div>').appendTo("#node-dialog-view-diff-headers");
            el.remoteTab = {
                n:{},
                nodes:remoteDiff.newConfig.globals
            };
            el.remoteDiff = remoteDiff;
        } else {
            $('#node-dialog-view-diff').removeClass('node-diff-three-way');
        }

        list.editableList('addItem',el);

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
            if (remoteDiff !== undefined) {
                el.remoteTab = remoteDiff.newConfig.tabs[tabId];
                el.remoteDiff = remoteDiff;
            }
            seenTabs[tabId] = true;
            list.editableList('addItem',el)
        });
        newConfig.tabOrder.forEach(function(tabId) {
            if (!seenTabs[tabId]) {
                seenTabs[tabId] = true;
                var tab = newConfig.tabs[tabId];
                var el = {
                    diff: localDiff,
                    def: {},
                    tab:tab,
                    newTab: tab
                };
                if (remoteDiff !== undefined) {
                    el.remoteDiff = remoteDiff;
                }
                list.editableList('addItem',el)
            }
        });
        if (remoteDiff !== undefined) {
            remoteDiff.newConfig.tabOrder.forEach(function(tabId) {
                if (!seenTabs[tabId]) {
                    var tab = remoteDiff.newConfig.tabs[tabId];
                    // TODO how to recognise this is a remotely added flow
                    var el = {
                        diff: localDiff,
                        remoteDiff: remoteDiff,
                        def: {},
                        tab:tab,
                        remoteTab:tab
                    };
                    list.editableList('addItem',el)
                }
            });
        }
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
                if (remoteDiff !== undefined) {
                    el.remoteTab = remoteDiff.newConfig.subflows[subflowId];
                    el.remoteDiff = remoteDiff;
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
                    tab:newConfig.subflows[subflowId],
                    newTab:newConfig.subflows[subflowId]
                }
                if (remoteDiff !== undefined) {
                    el.remoteDiff = remoteDiff;
                }
                list.editableList('addItem',el)
            }
        }
        if (remoteDiff !== undefined) {
            for (subflowId in remoteDiff.newConfig.subflows) {
                if (remoteDiff.newConfig.subflows.hasOwnProperty(subflowId) && !seenTabs[subflowId]) {
                    // TODO how to recognise this is a remotely added flow
                    el = {
                        diff: localDiff,
                        remoteDiff: remoteDiff,
                        def: {
                            defaults:{},
                            icon:"subflow.png",
                            category: "subflows",
                            color: "#da9"
                        },
                        tab:remoteDiff.newConfig.subflows[subflowId],
                        remoteTab: remoteDiff.newConfig.subflows[subflowId]
                    }
                    list.editableList('addItem',el)
                }
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
