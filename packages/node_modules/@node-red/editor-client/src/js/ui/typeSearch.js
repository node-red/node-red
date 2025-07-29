RED.typeSearch = (function() {

    var shade;

    var disabled = false;
    var dialog = null;
    var searchInput;
    var searchResults;
    var searchResultsDiv;
    var selected = -1;
    var visible = false;

    var activeFilter = "";
    var addCallback;
    var cancelCallback;
    var moveCallback;
    var suggestCallback

    var typesUsed = {};

    function search(val) {
        activeFilter = val.toLowerCase();
        var visible = searchResults.editableList('filter');
        searchResults.editableList('sort');
        setTimeout(function() {
            selected = 0;
            searchResults.children().removeClass('selected');
            searchResults.children(":visible:first").addClass('selected');
            const children = searchResults.children(":visible");
            const n = $(children[selected]).find(".red-ui-editableList-item-content").data('data');
            if (n) {
                updateSuggestion(n)
            }
        },100);

    }

    function ensureSelectedIsVisible() {
        var selectedEntry = searchResults.find("li.selected");
        if (selectedEntry.length === 1) {
            var scrollWindow = searchResults.parent();
            var scrollHeight = scrollWindow.height();
            var scrollOffset = scrollWindow.scrollTop();
            var y = selectedEntry.position().top;
            var h = selectedEntry.height();
            if (y+h > scrollHeight) {
                scrollWindow.animate({scrollTop: '-='+(scrollHeight-(y+h)-10)},50);
            } else if (y<0) {
                scrollWindow.animate({scrollTop: '+='+(y-10)},50);
            }
        }
    }

    function moveDialog(dx,dy) {
        var pos = dialog.position();
        pos.top = (pos.top + dy)+"px";
        pos.left = (pos.left + dx)+"px";
        dialog.css(pos);
        moveCallback(dx,dy);

    }
    function createDialog() {
        dialog = $("<div>",{id:"red-ui-type-search",class:"red-ui-search red-ui-type-search"}).appendTo("#red-ui-main-container");
        var searchDiv = $("<div>",{class:"red-ui-search-container"}).appendTo(dialog);
        searchInput = $('<input type="text" id="red-ui-type-search-input">').attr("placeholder",RED._("search.addNode")).appendTo(searchDiv).searchBox({
            delay: 50,
            change: function() {
                search($(this).val());
            }
        });
        searchInput.on('keydown',function(evt) {
            const children = searchResults.children(":visible");
            if (evt.keyCode === 40 && evt.shiftKey) {
                evt.preventDefault();
                moveDialog(0,10);
            } else if (evt.keyCode === 38 && evt.shiftKey) {
                evt.preventDefault();
                moveDialog(0,-10);
            } else if (evt.keyCode === 39 && evt.shiftKey) {
                evt.preventDefault();
                moveDialog(10,0);
            } else if (evt.keyCode === 37 && evt.shiftKey) {
                evt.preventDefault();
                moveDialog(-10,0);
            } else if (children.length > 0) {
                if (evt.keyCode === 40) {
                    // Down
                    if (selected < children.length-1) {
                        if (selected > -1) {
                            $(children[selected]).removeClass('selected');
                        }
                        selected++;
                    }
                    $(children[selected]).addClass('selected');
                    const n = $(children[selected]).find(".red-ui-editableList-item-content").data('data');
                    if (n) {
                        updateSuggestion(n)
                    }
                    ensureSelectedIsVisible();
                    evt.preventDefault();
                } else if (evt.keyCode === 38) {
                    // Up
                    if (selected > 0) {
                        if (selected < children.length) {
                            $(children[selected]).removeClass('selected');
                        }
                        selected--;
                    }
                    $(children[selected]).addClass('selected');
                    const n = $(children[selected]).find(".red-ui-editableList-item-content").data('data');
                    if (n) {
                        updateSuggestion(n)
                    }
                    ensureSelectedIsVisible();
                    evt.preventDefault();
                } else if ((evt.metaKey || evt.ctrlKey) && evt.keyCode === 13 ) {
                    evt.preventDefault();
                    // (ctrl or cmd) and enter
                    var index = Math.max(0,selected);
                    if (index < children.length) {
                        const n = $(children[index]).find(".red-ui-editableList-item-content").data('data');
                        if (!n.nodes && !/^_action_:/.test(n.type)) {
                            typesUsed[n.type] = Date.now();
                        }
                        if (n.def.outputs === 0) {
                            confirm(n);
                        } else {
                            addCallback(n, true);
                        }
                        $("#red-ui-type-search-input").val("").trigger("keyup");
                        setTimeout(function() {
                            $("#red-ui-type-search-input").focus();
                        },100);
                    }
                } else if (evt.keyCode === 13) {
                    evt.preventDefault();
                    // Enter
                    var index = Math.max(0,selected);
                    if (index < children.length) {
                        // TODO: dips into editableList impl details
                        confirm($(children[index]).find(".red-ui-editableList-item-content").data('data'));
                    }
                }
            } else {
                if (evt.keyCode === 13 ) {
                    // Stop losing focus if [Cmd]-Enter is pressed on an empty list
                    evt.stopPropagation();
                    evt.preventDefault();
                }
            }
        });

        searchResultsDiv = $("<div>",{class:"red-ui-search-results-container"}).appendTo(dialog);
        searchResults = $('<ol>',{style:"position: absolute;top: 0;bottom: 0;left: 0;right: 0;"}).appendTo(searchResultsDiv).editableList({
            addButton: false,
            filter: function(data) {
                if (activeFilter === "" ) {
                    return true;
                }
                if (data.recent || data.common || data.suggestion) {
                    return false;
                }
                return (activeFilter==="")||(data.index.indexOf(activeFilter) > -1);
            },
            sort: function(A,B) {
                if (activeFilter === "") {
                    return A.i - B.i;
                }
                var Ai = A.index.indexOf(activeFilter);
                var Bi = B.index.indexOf(activeFilter);
                if (Ai === -1) {
                    return 1;
                }
                if (Bi === -1) {
                    return -1;
                }
                if (Ai === Bi) {
                    return sortTypeLabels(A,B);
                }
                return Ai-Bi;
            },
            addItem: function(container, i, nodeItem) {
                // nodeItem can take multiple forms
                // - A node type: {type: "inject", def: RED.nodes.getType("inject"), label: "Inject"}
                // - A placeholder suggestion: { suggestionPlaceholder: true, label: 'loading suggestions...' }

                let nodeDef = nodeItem.def;
                let nodeType = nodeItem.type;
                if (nodeItem.suggestion && nodeItem.nodes.length > 0) {
                    nodeDef = RED.nodes.getType(nodeItem.nodes[0].type);
                    nodeType = nodeItem.nodes[0].type;
                }

                nodeItem.index = nodeItem.type?.toLowerCase() || '';
                if (nodeItem.separator) {
                    container.addClass("red-ui-search-result-separator")
                }
                const div = $('<div>',{class:"red-ui-search-result"}).appendTo(container);
                const nodeDiv = $('<div>',{class:"red-ui-search-result-node"}).appendTo(div);
                
                if (nodeItem.suggestionPlaceholder) {
                    nodeDiv.addClass("red-ui-palette-icon-suggestion")
                    const iconContainer = $('<div/>',{class:"red-ui-palette-icon-container"}).appendTo(nodeDiv);
                    $('<i class="spinner" style="margin-top: -1px">').appendTo(iconContainer);
                } else if (nodeType === "junction") {
                    nodeDiv.addClass("red-ui-palette-icon-junction");
                } else {
                    nodeDiv.css('backgroundColor', RED.utils.getNodeColor(nodeType, nodeDef));
                }

                if (nodeDef) {
                    // Add the node icon
                    const icon_url = RED.utils.getNodeIcon(nodeDef);
                    const iconContainer = $('<div/>',{class:"red-ui-palette-icon-container"}).appendTo(nodeDiv);
                    RED.utils.createIconElement(icon_url, iconContainer, false);
                }

                if (/^subflow:/.test(nodeType)) {
                    var sf = RED.nodes.subflow(nodeType.substring(8));
                    if (sf.in.length > 0) {
                        $('<div/>',{class:"red-ui-search-result-node-port"}).appendTo(nodeDiv);
                    }
                    if (sf.out.length > 0) {
                        $('<div/>',{class:"red-ui-search-result-node-port red-ui-search-result-node-output"}).appendTo(nodeDiv);
                    }
                } else if (nodeDef && nodeType !== "junction") {
                    if (nodeDef.inputs > 0) {
                        $('<div/>',{class:"red-ui-search-result-node-port"}).appendTo(nodeDiv);
                    }
                    if (nodeDef.outputs > 0) {
                        $('<div/>',{class:"red-ui-search-result-node-port red-ui-search-result-node-output"}).appendTo(nodeDiv);
                    }
                }

                var contentDiv = $('<div>',{class:"red-ui-search-result-description"}).appendTo(div);

                var label = nodeItem.label;
                nodeItem.index += "|"+label.toLowerCase();

                $('<div>',{class:"red-ui-search-result-node-label"}).text(label).appendTo(contentDiv);

                nodeItem.element = container;

                div.on("click", function(evt) {
                    evt.preventDefault();
                    confirm(nodeItem);
                });
                div.on('mouseenter', function() {
                    const children = searchResults.children(":visible");
                    if (selected > -1 && selected < children.length) {
                        $(children[selected]).removeClass('selected');
                    }
                    const editableListItem = container.parent()
                    selected = children.index(editableListItem);
                    $(children[selected]).addClass('selected');
                    updateSuggestion(nodeItem);                   
                })
            },
            scrollOnAdd: false
        });

    }

    let activeSuggestion
    function updateSuggestion(nodeItem) {
        if (nodeItem === activeSuggestion) {
            return
        }
        if (!visible && nodeItem) {
            // Do not update suggestion if the dialog is not visible
            // - for example, whilst the dialog is closing and the user mouses over a new item
            return
        }
        activeSuggestion = nodeItem
        if (suggestCallback) {
            if (!nodeItem) {
                suggestCallback(null);
            } else if (nodeItem.nodes) {
                // This is a multi-node suggestion
                suggestCallback({
                    nodes: nodeItem.nodes
                });
            } else if (nodeItem.type) {
                // Single node suggestion
                suggestCallback({
                    nodes: [{
                        x: 0,
                        y: 0,
                        type: nodeItem.type
                    }]
                });
            }
        }
    }
    function confirm(def) {
        if (!activeSuggestion) {
            // The user has hit Enter without selecting an entry in the list.
            // This means no suggestion has been shown yet - and the position recalculation
            // has not been done.
            // Trigger an update of the suggestion to get the position right before
            // applying.
            updateSuggestion(def)
        }
        hide();
        if (!def.nodes && !/^_action_:/.test(def.type)) {
            typesUsed[def.type] = Date.now();
        }
        addCallback(def);
    }

    function handleMouseActivity(evt) {
        if (visible) {
            var t = $(evt.target);
            while (t.prop('nodeName').toLowerCase() !== 'body') {
                if (t.attr('id') === 'red-ui-type-search') {
                    return;
                }
                t = t.parent();
            }
            hide(true);
            if (cancelCallback) {
                cancelCallback();
            }
        }
    }
    function show(opts) {
        if (!visible) {
            if (dialog === null) {
                createDialog();
                RED.keyboard.add("red-ui-type-search","escape",function(){
                    hide();
                    if (cancelCallback) {
                        cancelCallback();
                    }
                });
            }
            visible = true;
        } else {
            updateSuggestion(null)
            dialog.hide();
            searchResultsDiv.hide();
        }
        $(document).off('mousedown.red-ui-type-search');
        $(document).off('mouseup.red-ui-type-search');
        $(document).off('click.red-ui-type-search');
        $(document).off('touchstart.red-ui-type-search');
        $(document).off('mousedown.red-ui-type-search');
        setTimeout(function() {
            $(document).on('mousedown.red-ui-type-search',handleMouseActivity);
            $(document).on('mouseup.red-ui-type-search',handleMouseActivity);
            $(document).on('click.red-ui-type-search',handleMouseActivity);
            $(document).on('touchstart.red-ui-type-search',handleMouseActivity);
        },200);

        refreshTypeList(opts);
        addCallback = opts.add;
        cancelCallback = opts.cancel;
        moveCallback = opts.move;
        suggestCallback = opts.suggest;
        RED.events.emit("type-search:open");
        //shade.show();
        if ($("#red-ui-main-container").height() - opts.y - 195 < 0) {
            opts.y = opts.y - 275;
        }
        const dialogWidth = dialog.width() || 300 // default is 300 (defined in class .red-ui-search)
        const workspaceWidth = $('#red-ui-workspace').width()
        if (workspaceWidth > dialogWidth && workspaceWidth - opts.x - dialogWidth < 0) {
            opts.x = opts.x - (dialogWidth - RED.view.node_width)
        }
        dialog.css({left:opts.x+"px",top:opts.y+"px"}).show();
        searchResultsDiv.slideDown(300);
        setTimeout(function() {
            searchResultsDiv.find(".red-ui-editableList-container").scrollTop(0);
            if (!opts.disableFocus) {
                searchInput.trigger("focus");
            }
        },200);
    }
    function hide(fast) {
        updateSuggestion(null)
        if (visible) {
            visible = false;
            if (dialog !== null) {
                searchResultsDiv.slideUp(fast?50:200,function() {
                    dialog.hide();
                    searchInput.searchBox('value','');
                });
                //shade.hide();
            }
            RED.events.emit("type-search:close");
            RED.view.focus();
            $(document).off('mousedown.red-ui-type-search');
            $(document).off('mouseup.red-ui-type-search');
            $(document).off('click.red-ui-type-search');
            $(document).off('touchstart.red-ui-type-search');
        }
    }
    function getTypeLabel(type, def) {
        var label = type;
        if (typeof def.paletteLabel !== "undefined") {
            try {
                label = (typeof def.paletteLabel === "function" ? def.paletteLabel.call(def) : def.paletteLabel)||"";
                label += " ("+type+")";
            } catch(err) {
                console.log("Definition error: "+type+".paletteLabel",err);
            }
        }
        return label;
    }
    function sortTypeLabels(a,b) {
        var al = a.label.toLowerCase();
        var bl = b.label.toLowerCase();
        if (al < bl) {
            return -1;
        } else if (al === bl) {
            return 0;
        } else {
            return 1;
        }
    }
    function applyFilter(filter,type,def) {
        if (!filter) {
            // No filter; allow everything
            return true
        }
        if (type === 'junction') {
            // Only allow Junction is there's no specific type filter
            return !filter.type
        }
        if (filter.type) {
            // Handle explicit type filter
            return filter.type === type
        }
        if (!def) {
            // No node definition available - allow it
            return true
        }
        // Check if the filter is for input/outputs and apply
        return (!filter.input || def.inputs > 0) &&
                (!filter.output || def.outputs > 0)
    }
    function refreshTypeList(opts) {
        let i;
        searchResults.editableList('empty');
        searchInput.searchBox('value','').focus();
        selected = -1;
        const common = [
            'inject','debug','function','change','switch','junction'
        ].filter(function(t) { return applyFilter(opts.filter,t,RED.nodes.getType(t)); });

        // if (opts.filter && opts.filter.input && opts.filter.output && !opts.filter.type) {
        //     if (opts.filter.spliceMultiple) {
        //         common.push('_action_:core:split-wires-with-junctions')
        //     }
        //     common.push('_action_:core:split-wire-with-link-nodes')
        // }

        let recentlyUsed = Object.keys(typesUsed);
        recentlyUsed.sort(function(a,b) {
            return typesUsed[b]-typesUsed[a];
        });
        recentlyUsed = recentlyUsed.filter(function(t) {
            return applyFilter(opts.filter,t,RED.nodes.getType(t)) && common.indexOf(t) === -1;
        });

        const items = [];

        RED.nodes.registry.getNodeTypes().forEach(function(t) {
            const def = RED.nodes.getType(t);
            if (def.set?.enabled !== false && def.category !== 'config' && t !== 'unknown' && t !== 'tab') {
                items.push({type:t,def: def, label:getTypeLabel(t,def)});
            }
        });
        items.push({ type: 'junction', def: { inputs:1, outputs: 1, label: 'junction', type: 'junction'}, label: 'junction' })
        items.sort(sortTypeLabels);

        let index = 0;

        if (!opts.context?.virtualLink) {
            // Check for suggestion plugins
            const suggestionPlugins = RED.plugins.getPluginsByType('node-red-flow-suggestion-source');
            if (suggestionPlugins.length > 0) {
                const suggestionItem = {
                    suggestionPlaceholder: true,
                    label: RED._('palette.loadingSuggestions'),
                    separator: true,
                    i: index++
                }
                searchResults.editableList('addItem', suggestionItem);
                suggestionPlugins[0].getSuggestions(opts.context).then(function (suggestedFlows) {
                    searchResults.editableList('removeItem', suggestionItem);
                    if (!Array.isArray(suggestedFlows)) {
                        suggestedFlows = [suggestedFlows];
                    }
                    suggestedFlows.forEach(function(suggestion, index) {
                        const suggestedItem = {
                            suggestion: true,
                            separator: index === suggestedFlows.length - 1,
                            i: suggestionItem.i,
                            ...suggestion
                        }
                        if (!suggestion.label && suggestion.nodes && suggestion.nodes.length === 1 && suggestion.nodes[0].type) {
                            suggestedItem.label = getTypeLabel(suggestion.nodes[0].type, RED.nodes.getType(suggestion.nodes[0].type));
                        }
                        searchResults.editableList('addItem', suggestedItem);
                    })
                })
            }
        }

        for(i=0;i<common.length;i++) {
            let itemDef
            if (common[i] === 'junction') {
                itemDef = { inputs:1, outputs: 1, label: 'junction', type: 'junction'}
            } else if (/^_action_:/.test(common[i]) ) {
                itemDef = { inputs:1, outputs: 1, label: common[i], type: common[i]}
            } else {
                itemDef = RED.nodes.getType(common[i]);
            }
            if (itemDef) {
                const item = {
                    type: common[i],
                    common: true,
                    def: itemDef,
                    i: index++
                };
                item.label = getTypeLabel(item.type,item.def);
                if (i === common.length-1) {
                    item.separator = true;
                }
                searchResults.editableList('addItem', item);
            }
        }
        for(i=0;i<Math.min(5,recentlyUsed.length);i++) {
            const item = {
                type:recentlyUsed[i],
                def: RED.nodes.getType(recentlyUsed[i]),
                recent: true,
                i: index++
            };
            item.label = getTypeLabel(item.type,item.def);
            if (i === recentlyUsed.length-1) {
                item.separator = true;
            }
            searchResults.editableList('addItem', item);
        }
        for (i=0;i<items.length;i++) {
            if (applyFilter(opts.filter,items[i].type,items[i].def)) {
                items[i].i = index++;
                searchResults.editableList('addItem', items[i]);
            }
        }
        setTimeout(function() {
            selected = 0;
            searchResults.children(":first").addClass('selected');
        },100);
    }

    return {
        show,
        refresh: refreshTypeList,
        hide,
        isVisible: () => visible
    };

})();
