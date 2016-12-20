RED.diff = (function() {

    var currentDiff = {};

    function init() {

        RED.actions.add("core:show-current-diff",showLocalDiff);
        RED.actions.add("core:show-remote-diff",showRemoteDiff);

        RED.keyboard.add("*","ctrl-shift-l","core:show-current-diff");
        RED.keyboard.add("*","ctrl-shift-r","core:show-remote-diff");


        var dialog = $('<div id="node-dialog-view-diff" class="hide"><div id="node-dialog-view-diff-headers"></div><ol id="node-dialog-view-diff-diff"></ol></div>').appendTo(document.body);

        var toolbar = $('<div class="node-diff-toolbar">'+
            '<span><span id="node-diff-toolbar-resolved-conflicts"></span></span> '+
            // '<span class="button-group">'+
            //     '<a class="sidebar-header-button" href="#"><span data-i18n="">previous</span></a>'+
            //     '<a class="sidebar-header-button" href="#"><span data-i18n="">next</span></a>'+
            // '</span>'+
            '</div>').prependTo(dialog);
        //
        // toolbar.find(".node-diff-filter").click(function(evt) {
        //     evt.preventDefault();
        //     if (!$(this).hasClass('selected')) {
        //         $(this).siblings().removeClass('selected');
        //         $(this).addClass('selected');
        //     }
        //     if ($(this).attr('id') === 'node-diff-filter-all') {
        //         diffList.find('.node-diff-node-unchanged').parent().removeClass('hide');
        //         diffList.find('.node-diff-tab-unchanged').parent().removeClass('hide');
        //     } else {
        //         diffList.find('.node-diff-node-unchanged').parent().addClass('hide');
        //         diffList.find('.node-diff-tab-unchanged').parent().addClass('hide');
        //         $(".node-diff-tab.node-diff-tab-unchanged").addClass("collapsed");
        //     }
        // })

        $("#node-dialog-view-diff").dialog({
            title: RED._('deploy.confirm.button.review'),
            modal: true,
            autoOpen: false,
            buttons: [
                {
                    text: RED._("common.label.cancel"),
                    click: function() {
                        $( this ).dialog( "close" );
                    }
                },
                {
                    id: "node-diff-view-diff-merge",
                    text: RED._("deploy.confirm.button.merge"),
                    class: "primary disabled",
                    click: function() {
                        if (!$("#node-diff-view-diff-merge").hasClass('disabled')) {
                            refreshConflictHeader();
                            mergeDiff(currentDiff);
                            $( this ).dialog( "close" );
                        }
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
                tabDiv.addClass('collapsed');
                var titleRow = $('<div>',{class:"node-diff-tab-title"}).appendTo(tabDiv);
                var nodesDiv = $('<div>').appendTo(tabDiv);
                var originalCell = $('<div>',{class:"node-diff-node-entry-cell"}).appendTo(titleRow);
                var localCell = $('<div>',{class:"node-diff-node-entry-cell node-diff-node-local"}).appendTo(titleRow);
                var remoteCell;
                var selectState;

                if (remoteDiff) {
                    remoteCell = $('<div>',{class:"node-diff-node-entry-cell node-diff-node-remote"}).appendTo(titleRow);
                }
                $('<span class="node-diff-chevron"><i class="fa fa-angle-down"></i></span>').appendTo(originalCell);
                createNodeIcon(tab,def).appendTo(originalCell);
                var tabForLabel = (object.newTab || object.tab).n;
                var titleSpan = $('<span>',{class:"node-diff-tab-title-meta"}).appendTo(originalCell);
                if (tabForLabel.type === 'tab') {
                    titleSpan.html(tabForLabel.label||tabForLabel.id);
                } else if (tab.type === 'subflow') {
                    titleSpan.html((tabForLabel.name||tabForLabel.id));
                } else {
                    titleSpan.html("Global nodes");
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
                        var localNodeDiv = $("<div>",{class:"node-diff-node-entry-cell node-diff-node-local"}).appendTo(row);
                        var localChanged = false;

                        if (!localDiff.newConfig.all[tab.id]) {
                            localNodeDiv.addClass("node-diff-empty");
                        } else if (localDiff.added[tab.id]) {
                            localNodeDiv.addClass("node-diff-node-added");
                            localChanged = true;
                            $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> added</span>').appendTo(localNodeDiv);
                        } else if (localDiff.changed[tab.id]) {
                            localNodeDiv.addClass("node-diff-node-changed");
                            localChanged = true;
                            $('<span class="node-diff-status"><i class="fa fa-square"></i> changed</span>').appendTo(localNodeDiv);
                        } else {
                            localNodeDiv.addClass("node-diff-node-unchanged");
                            $('<span class="node-diff-status"><i class="fa fa-square-o"></i> unchanged</span>').appendTo(localNodeDiv);
                        }

                        var remoteNodeDiv;
                        if (remoteDiff) {
                            remoteNodeDiv = $("<div>",{class:"node-diff-node-entry-cell node-diff-node-remote"}).appendTo(row);
                            if (!remoteDiff.newConfig.all[tab.id]) {
                                remoteNodeDiv.addClass("node-diff-empty");
                            } else if (remoteDiff.added[tab.id]) {
                                remoteNodeDiv.addClass("node-diff-node-added");
                                $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> added</span>').appendTo(remoteNodeDiv);
                            } else if (remoteDiff.changed[tab.id]) {
                                remoteNodeDiv.addClass("node-diff-node-changed");
                                $('<span class="node-diff-status"><i class="fa fa-square"></i> changed</span>').appendTo(remoteNodeDiv);
                            } else {
                                remoteNodeDiv.addClass("node-diff-node-unchanged");
                                $('<span class="node-diff-status"><i class="fa fa-square-o"></i> unchanged</span>').appendTo(remoteNodeDiv);
                            }
                        }
                        $('<span class="node-diff-chevron"><i class="fa fa-angle-down"></i></span>').appendTo(originalNodeDiv);
                        $('<span>').html("Flow Properties").appendTo(originalNodeDiv);

                        row.click(function(evt) {
                            evt.preventDefault();
                            $(this).parent().toggleClass('collapsed');
                        });

                        createNodePropertiesTable(def,tab,localTabNode,remoteTabNode,object.conflicts).appendTo(div);
                        selectState = "";
                        if (object.conflicts[tab.id]) {
                            flowStats.conflicts++;

                            if (!localNodeDiv.hasClass("node-diff-empty")) {
                                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span>').prependTo(localNodeDiv);
                            }
                            if (!remoteNodeDiv.hasClass("node-diff-empty")) {
                                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span>').prependTo(remoteNodeDiv);
                            }
                            div.addClass("node-diff-node-entry-conflict");
                        } else {
                            if (!localChanged) {
                                selectState = "remote";
                            } else {
                                selectState = "local";
                            }
                        }

                        createNodeConflictRadioBoxes(tab,div,localNodeDiv,remoteNodeDiv,true,!object.conflicts[tab.id],selectState);
                    }
                }
                // var stats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(titleRow);
                var localNodeCount = 0;
                var remoteNodeCount = 0;
                var seen = {};
                object.tab.nodes.forEach(function(node) {
                    seen[node.id] = true;
                    createNodeDiffRow(node,flowStats,localDiff,remoteDiff,object.conflicts[node.id]).appendTo(nodesDiv)
                });
                if (object.newTab) {
                    localNodeCount = object.newTab.nodes.length;
                    object.newTab.nodes.forEach(function(node) {
                        if (!seen[node.id]) {
                            seen[node.id] = true;
                            createNodeDiffRow(node,flowStats,localDiff,remoteDiff,object.conflicts[node.id]).appendTo(nodesDiv)
                        }
                    });
                }
                if (object.remoteTab) {
                    remoteNodeCount = object.remoteTab.nodes.length;
                    object.remoteTab.nodes.forEach(function(node) {
                        if (!seen[node.id]) {
                            createNodeDiffRow(node,flowStats,localDiff,remoteDiff,object.conflicts[node.id]).appendTo(nodesDiv)
                        }
                    });
                }
                titleRow.click(function(evt) {
                    // if (titleRow.parent().find(".node-diff-node-entry:not(.hide)").length > 0) {
                    titleRow.parent().toggleClass('collapsed');
                    if ($(this).parent().hasClass('collapsed')) {
                        $(this).parent().find('.node-diff-node-entry').addClass('collapsed');
                        $(this).parent().find('.debug-message-element').addClass('collapsed');
                    }
                    // }
                })

                if (localDiff.deleted[tab.id]) {
                    $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> flow deleted</span></span>').appendTo(localCell);
                } else if (object.newTab) {
                    if (localDiff.added[tab.id]) {
                        $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> flow added</span></span>').appendTo(localCell);
                    } else {
                        if (tab.id) {
                            if (localDiff.changed[tab.id]) {
                                flowStats.local.changedCount++;
                            } else {
                                flowStats.local.unchangedCount++;
                            }
                        }
                        var localStats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(localCell);
                        $('<span class="node-diff-status">'+localNodeCount+' nodes</span>').appendTo(localStats);

                        if (flowStats.conflicts + flowStats.local.addedCount + flowStats.local.changedCount + flowStats.local.deletedCount > 0) {
                            $('<span class="node-diff-status"> [ </span>').appendTo(localStats);
                            if (flowStats.conflicts > 0) {
                                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i> '+flowStats.conflicts+'</span></span>').appendTo(localStats);
                            }
                            if (flowStats.local.addedCount > 0) {
                                $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> '+flowStats.local.addedCount+'</span></span>').appendTo(localStats);
                            }
                            if (flowStats.local.changedCount > 0) {
                                $('<span class="node-diff-node-changed"><span class="node-diff-status"><i class="fa fa-square"></i> '+flowStats.local.changedCount+'</span></span>').appendTo(localStats);
                            }
                            if (flowStats.local.deletedCount > 0) {
                                $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> '+flowStats.local.deletedCount+'</span></span>').appendTo(localStats);
                            }
                            $('<span class="node-diff-status"> ] </span>').appendTo(localStats);
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
                                    flowStats.remote.changedCount++;
                                } else {
                                    flowStats.remote.unchangedCount++;
                                }
                            }
                            var remoteStats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(remoteCell);
                            $('<span class="node-diff-status">'+remoteNodeCount+' nodes</span>').appendTo(remoteStats);
                            if (flowStats.conflicts + flowStats.remote.addedCount + flowStats.remote.changedCount + flowStats.remote.deletedCount > 0) {
                                $('<span class="node-diff-status"> [ </span>').appendTo(remoteStats);
                                if (flowStats.conflicts > 0) {
                                    $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i> '+flowStats.conflicts+'</span></span>').appendTo(remoteStats);
                                }
                                if (flowStats.remote.addedCount > 0) {
                                    $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> '+flowStats.remote.addedCount+'</span></span>').appendTo(remoteStats);
                                }
                                if (flowStats.remote.changedCount > 0) {
                                    $('<span class="node-diff-node-changed"><span class="node-diff-status"><i class="fa fa-square"></i> '+flowStats.remote.changedCount+'</span></span>').appendTo(remoteStats);
                                }
                                if (flowStats.remote.deletedCount > 0) {
                                    $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> '+flowStats.remote.deletedCount+'</span></span>').appendTo(remoteStats);
                                }
                                $('<span class="node-diff-status"> ] </span>').appendTo(remoteStats);
                            }
                        }
                    } else {
                        remoteCell.addClass("node-diff-empty");
                    }
                    if (flowStats.conflicts > 0) {
                        titleRow.addClass("node-diff-node-entry-conflict");
                    }
                    if (tab.id) {
                        selectState = "";
                        createNodeConflictRadioBoxes(tab,titleRow,localCell,remoteCell, false, !(flowStats.conflicts > 0 &&(localDiff.deleted[tab.id] || remoteDiff.deleted[tab.id])),selectState);
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
    function createNodeDiffRow(node,stats,localDiff,remoteDiff,conflicted) {
        var hasChanges = false; // exists in original and local/remote but with changes
        var unChanged = true; // existing in original,local,remote unchanged
        var localChanged = false;

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
        // console.log(node.id,localDiff.added[node.id],remoteDiff.added[node.id],localDiff.deleted[node.id],remoteDiff.deleted[node.id],localDiff.changed[node.id],remoteDiff.changed[node.id])
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
        var row = $("<div>",{class:"node-diff-node-entry-header"}).appendTo(div);

        var originalNodeDiv = $("<div>",{class:"node-diff-node-entry-cell"}).appendTo(row);
        var localNodeDiv = $("<div>",{class:"node-diff-node-entry-cell node-diff-node-local"}).appendTo(row);
        var remoteNodeDiv;
        var chevron;
        if (remoteDiff) {
            remoteNodeDiv = $("<div>",{class:"node-diff-node-entry-cell node-diff-node-remote"}).appendTo(row);
        }
        $('<span class="node-diff-chevron"><i class="fa fa-angle-down"></i></span>').appendTo(originalNodeDiv);

        if (unChanged) {
            stats.local.unchangedCount++;
            createNode(node,def).appendTo(originalNodeDiv);
            localNodeDiv.addClass("node-diff-node-unchanged");
            $('<span class="node-diff-status"><i class="fa fa-square-o"></i> unchanged</span>').appendTo(localNodeDiv);
            if (remoteDiff) {
                stats.remote.unchangedCount++;
                remoteNodeDiv.addClass("node-diff-node-unchanged");
                $('<span class="node-diff-status"><i class="fa fa-square-o"></i> unchanged</span>').appendTo(remoteNodeDiv);
            }
        } else if (localDiff.added[node.id]) {
            localNodeDiv.addClass("node-diff-node-added");
            if (remoteNodeDiv) {
                remoteNodeDiv.addClass("node-diff-empty");
            }
            $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> added</span>').appendTo(localNodeDiv);
            createNode(node,def).appendTo(originalNodeDiv);
        } else if (remoteDiff && remoteDiff.added[node.id]) {
            localNodeDiv.addClass("node-diff-empty");
            remoteNodeDiv.addClass("node-diff-node-added");
            $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> added</span>').appendTo(remoteNodeDiv);
            createNode(node,def).appendTo(originalNodeDiv);
        } else {
            createNode(node,def).appendTo(originalNodeDiv);
            if (localDiff.deleted[node.z]) {
                localNodeDiv.addClass("node-diff-empty");
                localChanged = true;
            } else if (localDiff.deleted[node.id]) {
                localNodeDiv.addClass("node-diff-node-deleted");
                $('<span class="node-diff-status"><i class="fa fa-minus-square"></i> deleted</span>').appendTo(localNodeDiv);
                localChanged = true;
            } else if (localDiff.changed[node.id]) {
                localNodeDiv.addClass("node-diff-node-changed");
                $('<span class="node-diff-status"><i class="fa fa-square"></i> changed</span>').appendTo(localNodeDiv);
                localChanged = true;
            } else {
                stats.local.unchangedCount++;
                localNodeDiv.addClass("node-diff-node-unchanged");
                $('<span class="node-diff-status"><i class="fa fa-square-o"></i> unchanged</span>').appendTo(localNodeDiv);
            }

            if (remoteDiff) {
                if (remoteDiff.deleted[node.z]) {
                    remoteNodeDiv.addClass("node-diff-empty");
                } else if (remoteDiff.deleted[node.id]) {
                    remoteNodeDiv.addClass("node-diff-node-deleted");
                    $('<span class="node-diff-status"><i class="fa fa-minus-square"></i> deleted</span>').appendTo(remoteNodeDiv);
                } else if (remoteDiff.changed[node.id]) {
                    remoteNodeDiv.addClass("node-diff-node-changed");
                    $('<span class="node-diff-status"><i class="fa fa-square"></i> changed</span>').appendTo(remoteNodeDiv);
                } else {
                    stats.remote.unchangedCount++;
                    remoteNodeDiv.addClass("node-diff-node-unchanged");
                    $('<span class="node-diff-status"><i class="fa fa-square-o"></i> unchanged</span>').appendTo(remoteNodeDiv);
                }
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
        createNodePropertiesTable(def,node,localNode,remoteNode).appendTo(div);

        var selectState = "";

        if (conflicted) {
            stats.conflicts++;
            if (!localNodeDiv.hasClass("node-diff-empty")) {
                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span>').prependTo(localNodeDiv);
            }
            if (!remoteNodeDiv.hasClass("node-diff-empty")) {
                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span>').prependTo(remoteNodeDiv);
            }
            div.addClass("node-diff-node-entry-conflict");
        } else {
            if (!localChanged) {
                selectState = "remote";
            } else {
                selectState = "local";
            }
        }
        createNodeConflictRadioBoxes(node,div,localNodeDiv,remoteNodeDiv,false,!conflicted,selectState);
        row.click(function(evt) {
            $(this).parent().toggleClass('collapsed');
        });

        return div;
    }
    function createNodePropertiesTable(def,node,localNodeObj,remoteNodeObj) {
        var localNode = localNodeObj.node;
        var remoteNode;
        if (remoteNodeObj) {
            remoteNode = remoteNodeObj.node;
        }

        var nodePropertiesDiv = $("<div>",{class:"node-diff-node-entry-properties"});
        var nodePropertiesTable = $("<table>").appendTo(nodePropertiesDiv);
        var row;
        var localCell, remoteCell;
        var currentValue, localValue, remoteValue;
        var localChanged = false;
        var remoteChanged = false;
        var localChanges = 0;
        var remoteChanges = 0;
        var conflict = false;
        var status;

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
            if ( (remoteChanged && localChanged && (localNode.x !== remoteNode.x || localNode.y !== remoteNode.y)) ||
                (!localChanged && remoteChanged && localNodeObj.diff.deleted[node.id]) ||
                (localChanged && !remoteChanged && remoteNodeObj.diff.deleted[node.id])
            ) {
                conflict = true;
            }
            row = $("<tr>").appendTo(nodePropertiesTable);
            $("<td>",{class:"node-diff-property-cell-label"}).html("position").appendTo(row);
            localCell = $("<td>",{class:"node-diff-property-cell node-diff-node-local"}).appendTo(row);
            if (localNode) {
                localCell.addClass("node-diff-node-"+(localChanged?"changed":"unchanged"));
                $('<span class="node-diff-status">'+(localChanged?'<i class="fa fa-square"></i>':'')+'</span>').appendTo(localCell);
                RED.utils.createObjectElement({x:localNode.x,y:localNode.y}).appendTo(localCell);
            } else {
                localCell.addClass("node-diff-empty");
            }

            if (remoteNode !== undefined) {
                remoteCell = $("<td>",{class:"node-diff-property-cell node-diff-node-remote"}).appendTo(row);
                remoteCell.addClass("node-diff-node-"+(remoteChanged?"changed":"unchanged"));
                if (remoteNode) {
                    $('<span class="node-diff-status">'+(remoteChanged?'<i class="fa fa-square"></i>':'')+'</span>').appendTo(remoteCell);
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
                conflict = true;
            }
            row = $("<tr>").appendTo(nodePropertiesTable);
            $("<td>",{class:"node-diff-property-cell-label"}).html("wires").appendTo(row);
            localCell = $("<td>",{class:"node-diff-property-cell node-diff-node-local"}).appendTo(row);
            if (localNode) {
                if (!conflict) {
                    localCell.addClass("node-diff-node-"+(localChanged?"changed":"unchanged"));
                    $('<span class="node-diff-status">'+(localChanged?'<i class="fa fa-square"></i>':'')+'</span>').appendTo(localCell);
                } else {
                    localCell.addClass("node-diff-node-conflict");
                    $('<span class="node-diff-status"><i class="fa fa-exclamation"></i></span>').appendTo(localCell);
                }
                formatWireProperty(localNode.wires,localNodeObj.all).appendTo(localCell);
            } else {
                localCell.addClass("node-diff-empty");
            }

            if (remoteNode !== undefined) {
                remoteCell = $("<td>",{class:"node-diff-property-cell node-diff-node-remote"}).appendTo(row);
                if (remoteNode) {
                    if (!conflict) {
                        remoteCell.addClass("node-diff-node-"+(remoteChanged?"changed":"unchanged"));
                        $('<span class="node-diff-status">'+(remoteChanged?'<i class="fa fa-square"></i>':'')+'</span>').appendTo(remoteCell);
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
                conflict = true;
            }

            row = $("<tr>").appendTo(nodePropertiesTable);
            $("<td>",{class:"node-diff-property-cell-label"}).html(d).appendTo(row);
            localCell = $("<td>",{class:"node-diff-property-cell node-diff-node-local"}).appendTo(row);
            if (localNode) {
                if (!conflict) {
                    localCell.addClass("node-diff-node-"+(localChanged?"changed":"unchanged"));
                    $('<span class="node-diff-status">'+(localChanged?'<i class="fa fa-square"></i>':'')+'</span>').appendTo(localCell);
                } else {
                    localCell.addClass("node-diff-node-conflict");
                    $('<span class="node-diff-status"><i class="fa fa-exclamation"></i></span>').appendTo(localCell);
                }
                RED.utils.createObjectElement(localNode[d]).appendTo(localCell);
            } else {
                localCell.addClass("node-diff-empty");
            }
            if (remoteNode !== undefined) {
                remoteCell = $("<td>",{class:"node-diff-property-cell node-diff-node-remote"}).appendTo(row);
                if (remoteNode) {
                    if (!conflict) {
                        remoteCell.addClass("node-diff-node-"+(remoteChanged?"changed":"unchanged"));
                        $('<span class="node-diff-status">'+(remoteChanged?'<i class="fa fa-square"></i>':'')+'</span>').appendTo(remoteCell);
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
        return nodePropertiesDiv;
    }
    function createNodeConflictRadioBoxes(node,row,localDiv,remoteDiv,propertiesTable,hide,state) {
        var safeNodeId = "node-diff-selectbox-"+node.id.replace(/\./g,'-')+(propertiesTable?"-props":"");
        var className = "";
        if (node.z||propertiesTable) {
            className = "node-diff-selectbox-tab-"+(propertiesTable?node.id:node.z).replace(/\./g,'-');
        }
        var titleRow = !propertiesTable && (node.type === 'tab' || node.type === 'subflow');
        var changeHandler = function(evt) {
            var className;
            if (node.type === undefined) {
                // TODO: handle globals
            } else if (titleRow) {
                className = "node-diff-selectbox-tab-"+node.id.replace(/\./g,'-');
                $("."+className+"-"+this.value).prop('checked',true);
                if (this.value === 'local') {
                    $("."+className+"-"+this.value).closest(".node-diff-node-entry").addClass("node-diff-select-local");
                    $("."+className+"-"+this.value).closest(".node-diff-node-entry").removeClass("node-diff-select-remote");
                } else {
                    $("."+className+"-"+this.value).closest(".node-diff-node-entry").removeClass("node-diff-select-local");
                    $("."+className+"-"+this.value).closest(".node-diff-node-entry").addClass("node-diff-select-remote");
                }
            } else {
                // Individual node or properties table
                var parentId = "node-diff-selectbox-"+(propertiesTable?node.id:node.z).replace(/\./g,'-');
                $('#'+parentId+"-local").prop('checked',false);
                $('#'+parentId+"-remote").prop('checked',false);
                var titleRowDiv = $('#'+parentId+"-local").closest(".node-diff-tab").find(".node-diff-tab-title");
                titleRowDiv.removeClass("node-diff-select-local");
                titleRowDiv.removeClass("node-diff-select-remote");
            }
            if (this.value === 'local') {
                row.removeClass("node-diff-select-remote");
                row.addClass("node-diff-select-local");
            } else if (this.value === 'remote') {
                row.addClass("node-diff-select-remote");
                row.removeClass("node-diff-select-local");
            }
            refreshConflictHeader();
        }

        var localSelectDiv = $('<label>',{class:"node-diff-selectbox",for:safeNodeId+"-local"}).click(function(e) { e.stopPropagation();}).appendTo(localDiv);
        var localRadio = $('<input>',{id:safeNodeId+"-local",type:'radio',value:"local",name:safeNodeId,class:className+"-local"+(titleRow?"":" node-diff-select-node")}).data('node-id',node.id).change(changeHandler).appendTo(localSelectDiv);
        var remoteSelectDiv = $('<label>',{class:"node-diff-selectbox",for:safeNodeId+"-remote"}).click(function(e) { e.stopPropagation();}).appendTo(remoteDiv);
        var remoteRadio = $('<input>',{id:safeNodeId+"-remote",type:'radio',value:"remote",name:safeNodeId,class:className+"-remote"+(titleRow?"":" node-diff-select-node")}).data('node-id',node.id).change(changeHandler).appendTo(remoteSelectDiv);
        if (state === 'local') {
            localRadio.prop('checked',true);
        } else if (state === 'remote') {
            remoteRadio.prop('checked',true);
        }
        if (hide||localDiv.hasClass("node-diff-empty") || remoteDiv.hasClass("node-diff-empty")) {
            localSelectDiv.hide();
            remoteSelectDiv.hide();
        }

    }
    function refreshConflictHeader() {
        currentDiff.resolutions = {};
        var resolutionCount = 0;
        $(".node-diff-selectbox>input:checked").each(function() {
            if (currentDiff.conflicts[$(this).data('node-id')]) {
                resolutionCount++;
            }
            currentDiff.resolutions[$(this).data('node-id')] = $(this).val();
            // console.log($(this).data('node-id'),$(this).val())
        })
        var conflictCount = Object.keys(currentDiff.conflicts).length;
        // console.log(resolutionCount,"of",conflictCount,"conflicts resolve");
        if (conflictCount - resolutionCount === 0) {
            $("#node-diff-toolbar-resolved-conflicts").html('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-check"></i></span></span> '+RED._("diff.unresolvedCount",{count:conflictCount - resolutionCount}));
        } else {
            $("#node-diff-toolbar-resolved-conflicts").html('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span> '+RED._("diff.unresolvedCount",{count:conflictCount - resolutionCount}));
        }
        if (conflictCount === resolutionCount) {
            $("#node-diff-view-diff-merge").removeClass('disabled');
        }
    }
    function getRemoteDiff(callback) {
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
                var conflicts = identifyConflicts(localDiff,remoteDiff);
                console.log(conflicts);
                callback({
                    localDiff:localDiff,
                    remoteDiff:remoteDiff,
                    conflicts: conflicts
                });
            }
        });

    }
    function showLocalDiff() {
        var nns = RED.nodes.createCompleteNodeSet();
        var originalFlow = RED.nodes.originalFlow();
        var diff = generateDiff(originalFlow,nns);
        showDiff(diff);
    }
    function showRemoteDiff(diff) {
        if (diff === undefined) {
            getRemoteDiff(showRemoteDiff);
        } else {
            showDiff(diff.localDiff,diff.remoteDiff,diff.conflicts);
        }
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
        var added = {};
        var deleted = {};
        var changed = {};

        Object.keys(currentConfig.all).forEach(function(id) {
            var node = RED.nodes.workspace(id)||RED.nodes.subflow(id)||RED.nodes.node(id);
            if (!newConfig.all.hasOwnProperty(id)) {
                deleted[id] = true;
            } else if (JSON.stringify(currentConfig.all[id]) !== JSON.stringify(newConfig.all[id])) {
                changed[id] = true;
            }
        });
        Object.keys(newConfig.all).forEach(function(id) {
            if (!currentConfig.all.hasOwnProperty(id)) {
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
    function identifyConflicts(localDiff,remoteDiff) {
        var seen = {};
        var conflicted = {};
        var id,node;

        for (id in localDiff.currentConfig.all) {
            if (localDiff.currentConfig.all.hasOwnProperty(id)) {
                seen[id] = true;
                var localNode = localDiff.newConfig.all[id];
                if (localDiff.changed[id] && remoteDiff.deleted[id]) {
                    conflicted[id] = true;
                } else if (localDiff.deleted[id] && remoteDiff.changed[id]) {
                    conflicted[id] = true;
                } else if (localDiff.changed[id] && remoteDiff.changed[id]) {
                    var remoteNode = remoteDiff.newConfig.all[id];
                    if (JSON.stringify(localNode) !== JSON.stringify(remoteNode)) {
                        conflicted[id] = true;
                    }
                }
            }
        }
        for (id in localDiff.added) {
            if (localDiff.added.hasOwnProperty(id)) {
                node = localDiff.newConfig.all[id];
                if (remoteDiff.deleted[node.z]) {
                    conflicted[id] = true;
                    // conflicted[node.z] = true;
                }
            }
        }
        for (id in remoteDiff.added) {
            if (remoteDiff.added.hasOwnProperty(id)) {
                node = remoteDiff.newConfig.all[id];
                if (localDiff.deleted[node.z]) {
                    conflicted[id] = true;
                    // conflicted[node.z] = true;
                }
            }
        }
        // console.log(conflicted);
        return conflicted;
    }
    function showDiff(localDiff,remoteDiff,conflicts) {
        var list = $("#node-dialog-view-diff-diff");
        list.editableList('empty');

        if (remoteDiff) {
            $("#node-diff-view-diff-merge").show();
            if (Object.keys(conflicts).length === 0) {
                $("#node-diff-view-diff-merge").removeClass('disabled');
            } else {
                $("#node-diff-view-diff-merge").addClass('disabled');
            }
        } else {
            $("#node-diff-view-diff-merge").hide();
        }
        currentDiff = {
            localDiff: localDiff,
            remoteDiff: remoteDiff,
            conflicts: conflicts,
            resolutions: {}
        }
        refreshConflictHeader();

        $("#node-dialog-view-diff-headers").empty();
        // console.log("--------------");
        // console.log(localDiff);
        // console.log(remoteDiff);
        var currentConfig = localDiff.currentConfig;
        var newConfig = localDiff.newConfig;
        conflicts = conflicts || {};

        var el = {
            conflicts: conflicts,
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
                conflicts: conflicts,
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
                    conflicts: conflicts,
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
                        conflicts: conflicts,
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
                    conflicts: conflicts,
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
                    conflicts: conflicts,
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
                        conflicts: conflicts,
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
    function mergeDiff(diff) {
        var currentConfig = diff.localDiff.currentConfig;

        var localDiff = diff.localDiff;
        var remoteDiff = diff.remoteDiff;
        var conflicts = diff.conflicts;
        var resolutions = diff.resolutions;

        var toAdd = [];
        var toRemove = [];
        var toMerge = [];

        var id;
        for (id in remoteDiff.added) {
            if (remoteDiff.added.hasOwnProperty(id) && !localDiff.added.hasOwnProperty(id)) {
                toAdd.push(remoteDiff.newConfig.all[id]);
            }
        }
        for (id in currentConfig.all) {
            if (currentConfig.all.hasOwnProperty(id)) {
                var node = currentConfig.all[id];
                if (resolutions[id] === 'local') {
                    // use local - nothing to change then
                } else {
                    if (remoteDiff.deleted[id]) {
                        toRemove.push(id);
                    } else if (remoteDiff.changed[id]) {
                        if (localDiff.deleted[id]) {
                            toAdd.push(remoteDiff.newConfig.all[id]);
                        } else {
                            toMerge.push(remoteDiff.newConfig.all[id]);
                        }
                    }
                }
            }
        }
        console.log("adding",toAdd);
        console.log("deleting",toRemove);
        console.log("replacing",toMerge);

        var imported = RED.nodes.import(toAdd);
        var removed = [];
        toRemove.forEach(function(id) {
            var node = currentConfig.all[id];
            if (node.type === 'tab') {
                console.log("removing tab",id);
                RED.workspaces.remove(node);
                removed.push(RED.nodes.removeWorkspace(id));
            } else if (node.type === 'subflow') {
                console.log("removing subflow",id);
                removed.push(RED.subflow.removeSubflow(id));
            } else {
                console.log("removing node",id);
                var r = RED.nodes.remove(id);
                if (r.links.length > 0 || r.nodes.length > 0) {
                    removed.push(r);
                }
            }
        });
        toMerge.forEach(function(newNode) {
            console.log("merging node",newNode.id);
            if (newNode.type !== 'tab' && newNode.type !== 'subflow') {
                var currentNode = RED.nodes.node(newNode.id);
                var def = RED.nodes.getType(currentNode.type);
                currentNode.x = newNode.x;
                currentNode.y = newNode.y;
                for (var d in def.defaults) {
                    if (def.defaults.hasOwnProperty(d)) {
                        currentNode[d] = newNode[d];
                    }
                }
            }


        })


        RED.view.redraw(true);

    }
    return {
        init: init,
        getRemoteDiff: getRemoteDiff,
        showRemoteDiff: showRemoteDiff
    }
})();
