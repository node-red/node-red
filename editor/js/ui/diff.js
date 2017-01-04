RED.diff = (function() {

    var currentDiff = {};

    function init() {

        // RED.actions.add("core:show-current-diff",showLocalDiff);
        RED.actions.add("core:show-remote-diff",showRemoteDiff);

        // RED.keyboard.add("*","ctrl-shift-l","core:show-current-diff");
        RED.keyboard.add("*","ctrl-shift-r","core:show-remote-diff");


        var dialog = $('<div id="node-dialog-view-diff" class="hide"><div id="node-dialog-view-diff-headers"></div><ol id="node-dialog-view-diff-diff"></ol></div>').appendTo(document.body);

        var toolbar = $('<div class="node-diff-toolbar">'+
            '<span><span id="node-diff-toolbar-resolved-conflicts"></span></span> '+
            '</div>').prependTo(dialog);

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
                var conflicts = currentDiff.conflicts;

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
                        var remoteChanged = false;

                        if (!localDiff.newConfig.all[tab.id]) {
                            localNodeDiv.addClass("node-diff-empty");
                        } else if (localDiff.added[tab.id]) {
                            localNodeDiv.addClass("node-diff-node-added");
                            localChanged = true;
                            $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> <span data-i18n="diff.type.added"></span></span>').appendTo(localNodeDiv);
                        } else if (localDiff.changed[tab.id]) {
                            localNodeDiv.addClass("node-diff-node-changed");
                            localChanged = true;
                            $('<span class="node-diff-status"><i class="fa fa-square"></i> <span data-i18n="diff.type.changed"></span></span>').appendTo(localNodeDiv);
                        } else {
                            localNodeDiv.addClass("node-diff-node-unchanged");
                            $('<span class="node-diff-status"><i class="fa fa-square-o"></i> <span data-i18n="diff.type.unchanged"></span></span>').appendTo(localNodeDiv);
                        }

                        var remoteNodeDiv;
                        if (remoteDiff) {
                            remoteNodeDiv = $("<div>",{class:"node-diff-node-entry-cell node-diff-node-remote"}).appendTo(row);
                            if (!remoteDiff.newConfig.all[tab.id]) {
                                remoteNodeDiv.addClass("node-diff-empty");
                                if (remoteDiff.deleted[tab.id]) {
                                    remoteChanged = true;
                                }
                            } else if (remoteDiff.added[tab.id]) {
                                remoteNodeDiv.addClass("node-diff-node-added");
                                remoteChanged = true;
                                $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> <span data-i18n="diff.type.added"></span></span>').appendTo(remoteNodeDiv);
                            } else if (remoteDiff.changed[tab.id]) {
                                remoteNodeDiv.addClass("node-diff-node-changed");
                                remoteChanged = true;
                                $('<span class="node-diff-status"><i class="fa fa-square"></i> <span data-i18n="diff.type.changed"></span></span>').appendTo(remoteNodeDiv);
                            } else {
                                remoteNodeDiv.addClass("node-diff-node-unchanged");
                                $('<span class="node-diff-status"><i class="fa fa-square-o"></i> <span data-i18n="diff.type.unchanged"></span></span>').appendTo(remoteNodeDiv);
                            }
                        }
                        $('<span class="node-diff-chevron"><i class="fa fa-angle-down"></i></span>').appendTo(originalNodeDiv);
                        $('<span>').html("Flow Properties").appendTo(originalNodeDiv);

                        row.click(function(evt) {
                            evt.preventDefault();
                            $(this).parent().toggleClass('collapsed');
                        });

                        createNodePropertiesTable(def,tab,localTabNode,remoteTabNode,conflicts).appendTo(div);
                        selectState = "";
                        if (conflicts[tab.id]) {
                            flowStats.conflicts++;

                            if (!localNodeDiv.hasClass("node-diff-empty")) {
                                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span>').prependTo(localNodeDiv);
                            }
                            if (!remoteNodeDiv.hasClass("node-diff-empty")) {
                                $('<span class="node-diff-node-conflict"><span class="node-diff-status"><i class="fa fa-exclamation"></i></span></span>').prependTo(remoteNodeDiv);
                            }
                            div.addClass("node-diff-node-entry-conflict");
                        } else {
                            selectState = currentDiff.resolutions[tab.id];
                        }
                        // Tab properties row
                        createNodeConflictRadioBoxes(tab,div,localNodeDiv,remoteNodeDiv,true,!conflicts[tab.id],selectState);
                    }
                }
                // var stats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(titleRow);
                var localNodeCount = 0;
                var remoteNodeCount = 0;
                var seen = {};
                object.tab.nodes.forEach(function(node) {
                    seen[node.id] = true;
                    createNodeDiffRow(node,flowStats).appendTo(nodesDiv)
                });
                if (object.newTab) {
                    localNodeCount = object.newTab.nodes.length;
                    object.newTab.nodes.forEach(function(node) {
                        if (!seen[node.id]) {
                            seen[node.id] = true;
                            createNodeDiffRow(node,flowStats).appendTo(nodesDiv)
                        }
                    });
                }
                if (object.remoteTab) {
                    remoteNodeCount = object.remoteTab.nodes.length;
                    object.remoteTab.nodes.forEach(function(node) {
                        if (!seen[node.id]) {
                            createNodeDiffRow(node,flowStats).appendTo(nodesDiv)
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
                    $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> <span data-i18n="diff.type.flowDeleted"></span></span></span>').appendTo(localCell);
                } else if (object.newTab) {
                    if (localDiff.added[tab.id]) {
                        $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> <span data-i18n="diff.type.flowAdded"></span></span></span>').appendTo(localCell);
                    } else {
                        if (tab.id) {
                            if (localDiff.changed[tab.id]) {
                                flowStats.local.changedCount++;
                            } else {
                                flowStats.local.unchangedCount++;
                            }
                        }
                        var localStats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(localCell);
                        $('<span class="node-diff-status"></span>').html(RED._('diff.nodeCount',{count:localNodeCount})).appendTo(localStats);

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
                        $('<span class="node-diff-node-deleted"><span class="node-diff-status"><i class="fa fa-minus-square"></i> <span data-i18n="diff.type.flowDeleted"></span></span></span>').appendTo(remoteCell);
                    } else if (object.remoteTab) {
                        if (remoteDiff.added[tab.id]) {
                            $('<span class="node-diff-node-added"><span class="node-diff-status"><i class="fa fa-plus-square"></i> <span data-i18n="diff.type.flowAdded"></span></span></span>').appendTo(remoteCell);
                        } else {
                            if (tab.id) {
                                if (remoteDiff.changed[tab.id]) {
                                    flowStats.remote.changedCount++;
                                } else {
                                    flowStats.remote.unchangedCount++;
                                }
                            }
                            var remoteStats = $('<span>',{class:"node-diff-tab-stats"}).appendTo(remoteCell);
                            $('<span class="node-diff-status"></span>').html(RED._('diff.nodeCount',{count:remoteNodeCount})).appendTo(remoteStats);
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
                    selectState = "";
                    if (flowStats.conflicts > 0) {
                        titleRow.addClass("node-diff-node-entry-conflict");
                    } else {
                        selectState = currentDiff.resolutions[tab.id];
                    }
                    if (tab.id) {
                        var hide = !(flowStats.conflicts > 0 &&(localDiff.deleted[tab.id] || remoteDiff.deleted[tab.id]));
                        // Tab parent row
                        createNodeConflictRadioBoxes(tab,titleRow,localCell,remoteCell, false, hide, selectState);
                    }
                }

                if (tabDiv.find(".node-diff-node-entry").length === 0) {
                    tabDiv.addClass("node-diff-tab-empty");
                }
                container.i18n();
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
    function createNodeDiffRow(node,stats) {
        var localDiff = currentDiff.localDiff;
        var remoteDiff = currentDiff.remoteDiff;
        var conflicted = currentDiff.conflicts[node.id];

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
            $('<span class="node-diff-status"><i class="fa fa-square-o"></i> <span data-i18n="diff.type.unchanged"></span></span>').appendTo(localNodeDiv);
            if (remoteDiff) {
                stats.remote.unchangedCount++;
                remoteNodeDiv.addClass("node-diff-node-unchanged");
                $('<span class="node-diff-status"><i class="fa fa-square-o"></i> <span data-i18n="diff.type.unchanged"></span></span>').appendTo(remoteNodeDiv);
            }
            div.addClass("node-diff-node-unchanged");
        } else if (localDiff.added[node.id]) {
            localNodeDiv.addClass("node-diff-node-added");
            if (remoteNodeDiv) {
                remoteNodeDiv.addClass("node-diff-empty");
            }
            $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> <span data-i18n="diff.type.added"></span></span>').appendTo(localNodeDiv);
            createNode(node,def).appendTo(originalNodeDiv);
        } else if (remoteDiff && remoteDiff.added[node.id]) {
            localNodeDiv.addClass("node-diff-empty");
            remoteNodeDiv.addClass("node-diff-node-added");
            $('<span class="node-diff-status"><i class="fa fa-plus-square"></i> <span data-i18n="diff.type.added"></span></span>').appendTo(remoteNodeDiv);
            createNode(node,def).appendTo(originalNodeDiv);
        } else {
            createNode(node,def).appendTo(originalNodeDiv);
            if (localDiff.moved[node.id]) {
                var localN = localDiff.newConfig.all[node.id];
                if (!localDiff.deleted[node.z] && node.z !== localN.z && node.z !== "" && !localDiff.newConfig.all[node.z]) {
                    localNodeDiv.addClass("node-diff-empty");
                } else {
                    localNodeDiv.addClass("node-diff-node-moved");
                    var localMovedMessage = "";
                    if (node.z === localN.z) {
                        localMovedMessage = RED._("diff.type.movedFrom",{id:(localDiff.currentConfig.all[node.id].z||'global')});
                    } else {
                        localMovedMessage = RED._("diff.type.movedTo",{id:(localN.z||'global')});
                    }
                    $('<span class="node-diff-status"><i class="fa fa-caret-square-o-right"></i> '+localMovedMessage+'</span>').appendTo(localNodeDiv);
                }
                localChanged = true;
            } else if (localDiff.deleted[node.z]) {
                localNodeDiv.addClass("node-diff-empty");
                localChanged = true;
            } else if (localDiff.deleted[node.id]) {
                localNodeDiv.addClass("node-diff-node-deleted");
                $('<span class="node-diff-status"><i class="fa fa-minus-square"></i> <span data-i18n="diff.type.deleted"></span></span>').appendTo(localNodeDiv);
                localChanged = true;
            } else if (localDiff.changed[node.id]) {
                if (localDiff.newConfig.all[node.id].z !== node.z) {
                    localNodeDiv.addClass("node-diff-empty");
                } else {
                    localNodeDiv.addClass("node-diff-node-changed");
                    $('<span class="node-diff-status"><i class="fa fa-square"></i> <span data-i18n="diff.type.changed"></span></span>').appendTo(localNodeDiv);
                    localChanged = true;
                }
            } else {
                if (localDiff.newConfig.all[node.id].z !== node.z) {
                    localNodeDiv.addClass("node-diff-empty");
                } else {
                    stats.local.unchangedCount++;
                    localNodeDiv.addClass("node-diff-node-unchanged");
                    $('<span class="node-diff-status"><i class="fa fa-square-o"></i> <span data-i18n="diff.type.unchanged"></span></span>').appendTo(localNodeDiv);
                }
            }

            if (remoteDiff) {
                if (remoteDiff.moved[node.id]) {
                    var remoteN = remoteDiff.newConfig.all[node.id];
                    if (!remoteDiff.deleted[node.z] && node.z !== remoteN.z && node.z !== "" && !remoteDiff.newConfig.all[node.z]) {
                        remoteNodeDiv.addClass("node-diff-empty");
                    } else {
                        remoteNodeDiv.addClass("node-diff-node-moved");
                        var remoteMovedMessage = "";
                        if (node.z === remoteN.z) {
                            remoteMovedMessage = RED._("diff.type.movedFrom",{id:(remoteDiff.currentConfig.all[node.id].z||'global')});
                        } else {
                            remoteMovedMessage = RED._("diff.type.movedTo",{id:(remoteN.z||'global')});
                        }
                        $('<span class="node-diff-status"><i class="fa fa-caret-square-o-right"></i> '+remoteMovedMessage+'</span>').appendTo(remoteNodeDiv);
                    }
                } else if (remoteDiff.deleted[node.z]) {
                    remoteNodeDiv.addClass("node-diff-empty");
                } else if (remoteDiff.deleted[node.id]) {
                    remoteNodeDiv.addClass("node-diff-node-deleted");
                    $('<span class="node-diff-status"><i class="fa fa-minus-square"></i> <span data-i18n="diff.type.deleted"></span></span>').appendTo(remoteNodeDiv);
                } else if (remoteDiff.changed[node.id]) {
                    if (remoteDiff.newConfig.all[node.id].z !== node.z) {
                        remoteNodeDiv.addClass("node-diff-empty");
                    } else {
                        remoteNodeDiv.addClass("node-diff-node-changed");
                        $('<span class="node-diff-status"><i class="fa fa-square"></i> <span data-i18n="diff.type.changed"></span></span>').appendTo(remoteNodeDiv);
                    }
                } else {
                    if (remoteDiff.newConfig.all[node.id].z !== node.z) {
                        remoteNodeDiv.addClass("node-diff-empty");
                    } else {
                        stats.remote.unchangedCount++;
                        remoteNodeDiv.addClass("node-diff-node-unchanged");
                        $('<span class="node-diff-status"><i class="fa fa-square-o"></i> <span data-i18n="diff.type.unchanged"></span></span>').appendTo(remoteNodeDiv);
                    }
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
            selectState = currentDiff.resolutions[node.id];
        }
        // Node row
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

        row = $("<tr>").appendTo(nodePropertiesTable);
        $("<td>",{class:"node-diff-property-cell-label"}).html("id").appendTo(row);
        localCell = $("<td>",{class:"node-diff-property-cell node-diff-node-local"}).appendTo(row);
        if (localNode) {
            localCell.addClass("node-diff-node-unchanged");
            $('<span class="node-diff-status"></span>').appendTo(localCell);
            RED.utils.createObjectElement(localNode.id).appendTo(localCell);
        } else {
            localCell.addClass("node-diff-empty");
        }
        if (remoteNode !== undefined) {
            remoteCell = $("<td>",{class:"node-diff-property-cell node-diff-node-remote"}).appendTo(row);
            remoteCell.addClass("node-diff-node-unchanged");
            if (remoteNode) {
                $('<span class="node-diff-status"></span>').appendTo(remoteCell);
                RED.utils.createObjectElement(remoteNode.id).appendTo(remoteCell);
            } else {
                remoteCell.addClass("node-diff-empty");
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
        var resolutionCount = 0;
        $(".node-diff-selectbox>input:checked").each(function() {
            if (currentDiff.conflicts[$(this).data('node-id')]) {
                resolutionCount++;
            }
            currentDiff.resolutions[$(this).data('node-id')] = $(this).val();
        })
        var conflictCount = Object.keys(currentDiff.conflicts).length;
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
                remoteDiff.rev = nodes.rev;
                callback(resolveDiffs(localDiff,remoteDiff))
            }
        });

    }
    // function showLocalDiff() {
    //     var nns = RED.nodes.createCompleteNodeSet();
    //     var originalFlow = RED.nodes.originalFlow();
    //     var diff = generateDiff(originalFlow,nns);
    //     showDiff(diff);
    // }
    function showRemoteDiff(diff) {
        if (diff === undefined) {
            getRemoteDiff(showRemoteDiff);
        } else {
            showDiff(diff);
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
        var moved = {};

        Object.keys(currentConfig.all).forEach(function(id) {
            var node = RED.nodes.workspace(id)||RED.nodes.subflow(id)||RED.nodes.node(id);
            if (!newConfig.all.hasOwnProperty(id)) {
                deleted[id] = true;
            } else if (JSON.stringify(currentConfig.all[id]) !== JSON.stringify(newConfig.all[id])) {
                changed[id] = true;

                if (currentConfig.all[id].z !== newConfig.all[id].z) {
                    moved[id] = true;
                }
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
            moved: moved
        }
    }
    function resolveDiffs(localDiff,remoteDiff) {
        var conflicted = {};
        var resolutions = {};

        var diff = {
            localDiff: localDiff,
            remoteDiff: remoteDiff,
            conflicts: conflicted,
            resolutions: resolutions
        }
        var seen = {};
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
                if (!conflicted[id]) {
                    if (remoteDiff.added[id]||remoteDiff.changed[id]||remoteDiff.deleted[id]) {
                        resolutions[id] = 'remote';
                    } else {
                        resolutions[id] = 'local';
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
                } else {
                    resolutions[id] = 'local';
                }
            }
        }
        for (id in remoteDiff.added) {
            if (remoteDiff.added.hasOwnProperty(id)) {
                node = remoteDiff.newConfig.all[id];
                if (localDiff.deleted[node.z]) {
                    conflicted[id] = true;
                    // conflicted[node.z] = true;
                } else {
                    resolutions[id] = 'remote';
                }
            }
        }
        // console.log(diff.resolutions);
        // console.log(conflicted);
        return diff;
    }
    function showDiff(diff) {
        var localDiff = diff.localDiff;
        var remoteDiff = diff.remoteDiff;
        var conflicts = diff.conflicts;
        currentDiff = diff;
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
        refreshConflictHeader();

        $("#node-dialog-view-diff-headers").empty();
        // console.log("--------------");
        // console.log(localDiff);
        // console.log(remoteDiff);
        var currentConfig = localDiff.currentConfig;
        var newConfig = localDiff.newConfig;
        conflicts = conflicts || {};

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

            $('<div class="node-diff-node-entry-cell"></div><div class="node-diff-node-entry-cell" data-i18n="diff.local"></div><div class="node-diff-node-entry-cell" data-i18n="diff.remote"></div>').i18n().appendTo("#node-dialog-view-diff-headers");
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
                seenTabs[subflowId] = true;
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
    function mergeDiff(diff) {
        var currentConfig = diff.localDiff.currentConfig;
        var localDiff = diff.localDiff;
        var remoteDiff = diff.remoteDiff;
        var conflicts = diff.conflicts;
        var resolutions = diff.resolutions;
        var id;

        for (id in conflicts) {
            if (conflicts.hasOwnProperty(id)) {
                if (!resolutions.hasOwnProperty(id)) {
                    console.log(diff);
                    throw new Error("No resolution for conflict on node",id);
                }
            }
        }

        var newConfig = [];
        var node;
        var nodeChangedStates = {};
        var localChangedStates = {};
        for (id in localDiff.newConfig.all) {
            if (localDiff.newConfig.all.hasOwnProperty(id)) {
                node = RED.nodes.node(id);
                if (resolutions[id] === 'local') {
                    if (node) {
                        nodeChangedStates[id] = node.changed;
                    }
                    newConfig.push(localDiff.newConfig.all[id]);
                } else if (resolutions[id] === 'remote') {
                    if (!remoteDiff.deleted[id] && remoteDiff.newConfig.all.hasOwnProperty(id)) {
                        if (node) {
                            nodeChangedStates[id] = node.changed;
                        }
                        localChangedStates[id] = true;
                        newConfig.push(remoteDiff.newConfig.all[id]);
                    }
                } else {
                    console.log("Unresolved",id)
                }
            }
        }
        for (id in remoteDiff.added) {
            if (remoteDiff.added.hasOwnProperty(id)) {
                node = RED.nodes.node(id);
                if (node) {
                    nodeChangedStates[id] = node.changed;
                }
                if (!localDiff.added.hasOwnProperty(id)) {
                    localChangedStates[id] = true;
                    newConfig.push(remoteDiff.newConfig.all[id]);
                }
            }
        }
        var historyEvent = {
            t:"replace",
            config: RED.nodes.createCompleteNodeSet(),
            changed: nodeChangedStates,
            dirty: RED.nodes.dirty(),
            rev: RED.nodes.version()
        }

        RED.history.push(historyEvent);

        RED.nodes.clear();
        var imported = RED.nodes.import(newConfig);
        imported[0].forEach(function(n) {
            if (nodeChangedStates[n.id] || localChangedStates[n.id]) {
                n.changed = true;
            }
        })

        RED.nodes.version(remoteDiff.rev);

        RED.view.redraw(true);
        RED.palette.refresh();
        RED.workspaces.refresh();
        RED.sidebar.config.refresh();

    }
    return {
        init: init,
        getRemoteDiff: getRemoteDiff,
        showRemoteDiff: showRemoteDiff,
        mergeDiff: mergeDiff
    }
})();
