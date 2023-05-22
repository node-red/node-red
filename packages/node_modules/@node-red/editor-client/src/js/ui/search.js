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
RED.search = (function() {

    var disabled = false;
    var dialog = null;
    var searchInput;
    var searchResults;
    var selected = -1;
    var visible = false;

    var searchHistory = [];
    var index = {};
    var currentResults = [];
    var activeResults = [];
    var currentIndex = 0;
    var previousActiveElement;

    function indexProperty(node,label,property) {
        if (typeof property === 'string' || typeof property === 'number') {
            property = (""+property).toLowerCase();
            index[property] = index[property] || {};
            index[property][node.id] = {node:node,label:label};
        } else if (Array.isArray(property)) {
            property.forEach(function(prop) {
                indexProperty(node,label,prop);
            })
        } else if (typeof property === 'object') {
            for (var prop in property) {
                if (property.hasOwnProperty(prop)) {
                    indexProperty(node,label,property[prop])
                }
            }
        }
    }
    function indexNode(n) {
        var l = RED.utils.getNodeLabel(n);
        if (l) {
            l = (""+l).toLowerCase();
            index[l] = index[l] || {};
            index[l][n.id] = {node:n,label:l}
        }
        l = l||n.label||n.name||n.id||"";

        var properties = ['id','type','name','label','info'];
        const node_def = n && n._def;
        if (node_def) {
            if (node_def.defaults) {
                properties = properties.concat(Object.keys(node_def.defaults));
            }
            if (n.type !== "group" && node_def.paletteLabel && node_def.paletteLabel !== node_def.type) {
                try {
                    const label = ("" + (typeof node_def.paletteLabel === "function" ? node_def.paletteLabel.call(node_def) : node_def.paletteLabel)).toLowerCase();
                    if(label && label !== (""+node_def.type).toLowerCase()) {
                        indexProperty(n, l, label);
                    }
                } catch(err) {
                    console.warn(`error indexing ${l}`, err);
                }
            }
        }
        for (var i=0;i<properties.length;i++) {
            if (n.hasOwnProperty(properties[i])) {
                if (n.type === "group" && properties[i] === "nodes") {
                    continue;
                }
                indexProperty(n, l, n[properties[i]]);
            }
        }
    }

    function extractFlag(val, flagName, flags) {
        // is:XYZ

        var regEx = new RegExp("(?:^| )is:"+flagName+"(?: |$)");
        var m = regEx.exec(val);
        if (m) {
            val = val.replace(regEx," ").trim();
            flags[flagName] = true;
        }
        return val;
    }

    function extractValue(val, flagName, flags) {
        // flagName:XYZ
        var regEx = new RegExp("(?:^| )"+flagName+":([^ ]+)(?: |$)");
        var m
        while(!!(m = regEx.exec(val))) {
            val = val.replace(regEx," ").trim();
            flags[flagName] = flags[flagName] || [];
            flags[flagName].push(m[1]);
        }
        return val;
    }

    function extractType(val, flags) {
        // extracts:  type:XYZ  &  type:"X Y Z"
        const regEx = /(?:type):\s*(?:"([^"]+)"|([^" ]+))/;
        let m
        while ((m = regEx.exec(val)) !== null) {
            // avoid infinite loops with zero-width matches
            if (m.index === regEx.lastIndex) {
                regEx.lastIndex++;
            }
            val = val.replace(m[0]," ").trim()
            const flag = m[2] || m[1] // quoted entries in capture group 1, unquoted in capture group 2
            flags.type = flags.type || [];
            flags.type.push(flag);
        }
        return val;
    }

    function search(val) {
        const results = [];
        const flags = {};
        val = extractFlag(val,"invalid",flags);
        val = extractFlag(val,"unused",flags);
        val = extractFlag(val,"config",flags);
        val = extractFlag(val,"subflow",flags);
        val = extractFlag(val,"hidden",flags);
        val = extractFlag(val,"modified",flags);
        val = extractValue(val,"flow",flags);// flow:current or flow:<flow-id>
        val = extractValue(val,"uses",flags);// uses:<node-id>
        val = extractType(val,flags);// type:<node-type>
        val = val.trim();
        const hasFlags = Object.keys(flags).length > 0;
        const hasTypeFilter = flags.type && flags.type.length > 0
        if (flags.flow && flags.flow.indexOf("current") >= 0) {
            let idx = flags.flow.indexOf("current");
            flags.flow[idx] = RED.workspaces.active();//convert 'current' to active flow ID
        }
        if (flags.flow && flags.flow.length) {
            flags.flow = [ ...new Set(flags.flow) ]; //deduplicate
        }
        if (val.length > 0 || hasFlags) {
            val = val.toLowerCase();
            let i;
            let j;
            let list = [];
            const nodes = {};
            let keys = [];
            if (flags.uses) {
                keys = flags.uses;
            } else {
                keys = Object.keys(index);
            }
            for (i=0;i<keys.length;i++) {
                const key = keys[i];
                const kpos = val ? keys[i].indexOf(val) : -1;
                if (kpos > -1 || (val === "" && hasFlags)) {
                    const ids = Object.keys(index[key]||{});
                    for (j=0;j<ids.length;j++) {
                        var node = index[key][ids[j]];
                        var isConfigNode = node.node._def.category === "config" && node.node.type !== 'group';
                        if (flags.uses && key === node.node.id) {
                            continue;
                        }
                        if (flags.hasOwnProperty("invalid")) {
                            const nodeIsValid = !node.node.hasOwnProperty("valid") || node.node.valid;
                            if (flags.invalid === nodeIsValid) {
                                continue;
                            }
                        }
                        if (flags.hasOwnProperty("config")) {
                            if (flags.config !== isConfigNode) {
                                continue;
                            }
                        }
                        if (flags.hasOwnProperty("subflow")) {
                            if (flags.subflow !== (node.node.type === 'subflow')) {
                                continue;
                            }
                        }
                        if (flags.hasOwnProperty("modified")) {
                            if (!node.node.changed && !node.node.moved) {
                                continue;
                            }
                        }
                        if (flags.hasOwnProperty("hidden")) {
                            // Only tabs can be hidden
                            if (node.node.type !== 'tab') {
                                continue
                            }
                            if (!RED.workspaces.isHidden(node.node.id)) {
                                continue
                            }
                        }
                        if (flags.hasOwnProperty("unused")) {
                            const isUnused = (node.node.type === 'subflow' && node.node.instances.length === 0) ||
                                           (isConfigNode && node.node.users.length === 0 && node.node._def.hasUsers !== false)
                            if (flags.unused !== isUnused) {
                                continue;
                            }
                        }
                        if (flags.hasOwnProperty("flow")) {
                            if (flags.flow.indexOf(node.node.z || node.node.id) < 0) {
                                continue;
                            }
                        }
                        let typeIndex = -1
                        if(hasTypeFilter) {
                            typeIndex = flags.type.indexOf(node.node.type)
                        }
                        if (!hasTypeFilter || typeIndex > -1) {
                            nodes[node.node.id] = nodes[node.node.id] || {
                                node: node.node,
                                label: node.label
                            };
                            nodes[node.node.id].index = Math.min(nodes[node.node.id].index || Infinity, typeIndex > -1 ? typeIndex : kpos);
                        }
                    }
                }
            }
            list = Object.keys(nodes);
            list.sort(function(A,B) {
                return nodes[A].index - nodes[B].index;
            });

            for (i=0;i<list.length;i++) {
                results.push(nodes[list[i]]);
            }
        }
        return results;
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

    function populateSearchHistory() {
        if (searchHistory.length > 0) {
            searchResults.editableList('addItem',{
                historyHeader: true
            });
            searchHistory.forEach(function(entry) {
                searchResults.editableList('addItem',{
                    history: true,
                    value: entry
                });
            })
        }

    }
    function createDialog() {
        dialog = $("<div>",{id:"red-ui-search",class:"red-ui-search"}).appendTo("#red-ui-main-container");
        var searchDiv = $("<div>",{class:"red-ui-search-container"}).appendTo(dialog);
        searchInput = $('<input type="text" data-i18n="[placeholder]menu.label.searchInput">').appendTo(searchDiv).searchBox({
            delay: 200,
            change: function() {
                searchResults.editableList('empty');
                selected = -1;
                var value = $(this).val();
                if (value === "") {
                    populateSearchHistory();
                    return;
                }
                currentResults = search(value);
                if (currentResults.length > 0) {
                    for (let i=0;i<Math.min(currentResults.length,25);i++) {
                        searchResults.editableList('addItem',currentResults[i])
                    }
                    if (currentResults.length > 25) {
                        searchResults.editableList('addItem', {
                            more: {
                                results: currentResults,
                                start: 25
                            }
                        })
                    }
                } else {
                    searchResults.editableList('addItem',{});
                }
            },
            options: getSearchOptions()
        });
        var copySearchContainer = $('<button type="button" class="red-ui-button red-ui-button-small"><i class="fa fa-caret-right"></button>').appendTo(searchDiv).on('click', function(evt) {
            evt.preventDefault();
            RED.sidebar.info.outliner.search(searchInput.val())
            hide();
        });

        searchInput.on('keydown',function(evt) {
            var children;
            if (currentResults.length > 0) {
                if (evt.keyCode === 40) {
                    // Down
                    children = searchResults.children();
                    if (selected < children.length-1) {
                        if (selected > -1) {
                            $(children[selected]).removeClass('selected');
                        }
                        selected++;
                    }
                    $(children[selected]).addClass('selected');
                    ensureSelectedIsVisible();
                    evt.preventDefault();
                } else if (evt.keyCode === 38) {
                    // Up
                    children = searchResults.children();
                    if (selected > 0) {
                        if (selected < children.length) {
                            $(children[selected]).removeClass('selected');
                        }
                        selected--;
                    }
                    $(children[selected]).addClass('selected');
                    ensureSelectedIsVisible();
                    evt.preventDefault();
                } else if (evt.keyCode === 13) {
                    // Enter
                    children = searchResults.children();
                    if ($(children[selected]).hasClass("red-ui-search-more")) {
                        var object = $(children[selected]).find(".red-ui-editableList-item-content").data('data');
                        if (object) {
                            searchResults.editableList('removeItem',object);
                            for (i=object.more.start;i<Math.min(currentResults.length,object.more.start+25);i++) {
                                searchResults.editableList('addItem',currentResults[i])
                            }
                            if (currentResults.length > object.more.start+25) {
                                searchResults.editableList('addItem', {
                                    more: {
                                        results: currentResults,
                                        start: object.more.start+25
                                    }
                                })
                            }
                        }
                    } if ($(children[selected]).hasClass("red-ui-search-history")) {
                        var object = $(children[selected]).find(".red-ui-editableList-item-content").data('data');
                        if (object) {
                            searchInput.searchBox('value',object.value)
                        }
                    } else if (!$(children[selected]).hasClass("red-ui-search-historyHeader")) {
                        if (currentResults.length > 0) {
                            currentIndex = Math.max(0,selected);
                            reveal(currentResults[currentIndex].node);
                        }
                    }
                }
            }
        });
        searchInput.i18n();

        var searchResultsDiv = $("<div>",{class:"red-ui-search-results-container"}).appendTo(dialog);
        searchResults = $('<ol>',{style:"position: absolute;top: 5px;bottom: 5px;left: 5px;right: 5px;"}).appendTo(searchResultsDiv).editableList({
            addButton: false,
            addItem: function(container,i,object) {
                var node = object.node;
                var div;
                if (object.historyHeader) {
                    container.parent().addClass("red-ui-search-historyHeader")
                    $('<div>',{class:"red-ui-search-empty"}).text(RED._("search.history")).appendTo(container);
                    $('<button type="button" class="red-ui-button red-ui-button-small"></button>').text(RED._("search.clear")).appendTo(container).on("click", function(evt) {
                        evt.preventDefault();
                        searchHistory = [];
                        searchResults.editableList('empty');
                    });
                } else if (object.history) {
                    container.parent().addClass("red-ui-search-history")
                    div = $('<a>',{href:'#',class:"red-ui-search-result"}).appendTo(container);
                    div.text(object.value);
                    div.on("click", function(evt) {
                        evt.preventDefault();
                        searchInput.searchBox('value',object.value)
                        searchInput.focus();
                    })
                    $('<button type="button" class="red-ui-button red-ui-button-small"><i class="fa fa-remove"></i></button>').appendTo(container).on("click", function(evt) {
                        evt.preventDefault();
                        var index = searchHistory.indexOf(object.value);
                        searchHistory.splice(index,1);
                        searchResults.editableList('removeItem', object);
                    });


                } else if (object.more) {
                    container.parent().addClass("red-ui-search-more")
                    div = $('<a>',{href:'#',class:"red-ui-search-result red-ui-search-empty"}).appendTo(container);
                    div.text(RED._("palette.editor.more",{count:object.more.results.length-object.more.start}));
                    div.on("click", function(evt) {
                        evt.preventDefault();
                        searchResults.editableList('removeItem',object);
                        for (i=object.more.start;i<Math.min(currentResults.length,object.more.start+25);i++) {
                            searchResults.editableList('addItem',currentResults[i])
                        }
                        if (currentResults.length > object.more.start+25) {
                            searchResults.editableList('addItem', {
                                more: {
                                    results: currentResults,
                                    start: object.more.start+25
                                }
                            })
                        }
                    });

                } else if (node === undefined) {
                    $('<div>',{class:"red-ui-search-empty"}).text(RED._('search.empty')).appendTo(container);
                } else {
                    var def = node._def;
                    div = $('<a>',{href:'#',class:"red-ui-search-result"}).appendTo(container);

                    RED.utils.createNodeIcon(node).appendTo(div);
                    var contentDiv = $('<div>',{class:"red-ui-search-result-node-description"}).appendTo(div);
                    if (node.z) {
                        var workspace = RED.nodes.workspace(node.z);
                        if (!workspace) {
                            workspace = RED.nodes.subflow(node.z);
                            workspace = "subflow:"+workspace.name;
                        } else {
                            workspace = "flow:"+workspace.label;
                        }
                        $('<div>',{class:"red-ui-search-result-node-flow"}).text(workspace).appendTo(contentDiv);
                    }

                    $('<div>',{class:"red-ui-search-result-node-label"}).text(object.label || node.id).appendTo(contentDiv);
                    $('<div>',{class:"red-ui-search-result-node-type"}).text(node.type).appendTo(contentDiv);
                    $('<div>',{class:"red-ui-search-result-node-id"}).text(node.id).appendTo(contentDiv);

                    div.on("click", function(evt) {
                        evt.preventDefault();
                        currentIndex = i;
                        reveal(node);
                    });
                }
            },
            scrollOnAdd: false
        });

    }

    function reveal(node) {
        var searchVal = searchInput.val();
        var existingIndex = searchHistory.indexOf(searchVal);
        if (existingIndex > -1) {
            searchHistory.splice(existingIndex,1);
        }
        searchHistory.unshift(searchVal);
        $("#red-ui-view-searchtools-search").data("term", searchVal);
        activeResults = Object.assign([], currentResults);
        hide(null, activeResults.length > 0);
        RED.view.reveal(node.id);
    }

    function revealPrev() {
        if (disabled) {
            updateSearchToolbar();
            return;
        }
        if (!searchResults || !activeResults.length) {
            show();
            return;
        }
        if (currentIndex > 0) {
            currentIndex--;
        } else {
            currentIndex = activeResults.length - 1;
        }
        const n = activeResults[currentIndex];
        if (n && n.node && n.node.id) {
            RED.view.reveal(n.node.id);
            $("#red-ui-view-searchtools-prev").trigger("focus");
        }
        updateSearchToolbar();
    }
    function revealNext() {
        if (disabled) {
            updateSearchToolbar();
            return;
        }
        if (!searchResults || !activeResults.length) {
            show();
            return;
        }
        if (currentIndex < activeResults.length - 1) {
            currentIndex++
        } else {
            currentIndex = 0;
        }
        const n = activeResults[currentIndex];
        if (n && n.node && n.node.id) {
            RED.view.reveal(n.node.id);
            $("#red-ui-view-searchtools-next").trigger("focus");
        }
        updateSearchToolbar();
    }

    function show(v) {
        if (disabled) {
            updateSearchToolbar();
            return;
        }
        if (!visible) {
            previousActiveElement = document.activeElement;
            $("#red-ui-header-shade").show();
            $("#red-ui-editor-shade").show();
            $("#red-ui-palette-shade").show();
            $("#red-ui-sidebar-shade").show();
            $("#red-ui-sidebar-separator").hide();

            if (dialog === null) {
                createDialog();
            } else {
                searchResults.editableList('empty');
            }
            dialog.slideDown(300);
            searchInput.searchBox('value',v)
            if (!v || v === "") {
                populateSearchHistory();
            }
            RED.events.emit("search:open");
            visible = true;
        }
        searchInput.trigger("focus");
    }

    function hide(el, keepSearchToolbar) {
        if (visible) {
            visible = false;
            $("#red-ui-header-shade").hide();
            $("#red-ui-editor-shade").hide();
            $("#red-ui-palette-shade").hide();
            $("#red-ui-sidebar-shade").hide();
            $("#red-ui-sidebar-separator").show();
            if (dialog !== null) {
                dialog.slideUp(200,function() {
                    searchInput.searchBox('value','');
                });
            }
            RED.events.emit("search:close");
            if (previousActiveElement && (!keepSearchToolbar || !activeResults.length)) {
                $(previousActiveElement).trigger("focus");
            }
            previousActiveElement = null;
        }
        if(!keepSearchToolbar) {
            clearActiveSearch();
        }
        updateSearchToolbar();
        if(keepSearchToolbar && activeResults.length) {
            $("#red-ui-view-searchtools-next").trigger("focus");
        }
    }
    function updateSearchToolbar() {
        if (!disabled && currentIndex >= 0 && activeResults && activeResults.length) {
            let term = $("#red-ui-view-searchtools-search").data("term") || "";
            if (term.length > 16) {
                term = term.substring(0, 12) + "..."
            }
            const i18nSearchCounterData = {
                term: term,
                result: (currentIndex + 1),
                count: activeResults.length
            }
            $("#red-ui-view-searchtools-counter").text(RED._('actions.search-counter', i18nSearchCounterData));
            $("#view-search-tools > :not(:first-child)").show(); //show other tools
        } else {
            clearActiveSearch();
            $("#view-search-tools > :not(:first-child)").hide(); //hide all but search button
        }
    }
    function clearIndex() {
        index = {};
    }

    function addItemToIndex(item) {
        indexNode(item);
    }
    function removeItemFromIndex(item) {
        var keys = Object.keys(index);
        for (var i=0,l=keys.length;i<l;i++) {
            delete index[keys[i]][item.id];
            if (Object.keys(index[keys[i]]).length === 0) {
                delete index[keys[i]];
            }
        }
    }
    function updateItemOnIndex(item) {
        removeItemFromIndex(item);
        addItemToIndex(item);
    }

    function clearActiveSearch() {
        activeResults = [];
        currentIndex = 0;
        $("#red-ui-view-searchtools-search").data("term", "");
    }

    function getSearchOptions() {
        return [
            {label:RED._("search.options.configNodes"), value:"is:config"},
            {label:RED._("search.options.unusedConfigNodes"), value:"is:config is:unused"},
            {label:RED._("search.options.modifiedNodes"), value:"is:modified"},
            {label:RED._("search.options.invalidNodes"), value: "is:invalid"},
            {label:RED._("search.options.uknownNodes"), value: "type:unknown"},
            {label:RED._("search.options.unusedSubflows"), value:"is:subflow is:unused"},
            {label:RED._("search.options.hiddenFlows"), value:"is:hidden"},
            {label:RED._("search.options.thisFlow"), value:"flow:current"},
        ]
    }

    function init() {
        RED.actions.add("core:search",show);
        RED.actions.add("core:search-previous",revealPrev);
        RED.actions.add("core:search-next",revealNext);

        RED.events.on("editor:open",function() { disabled = true; });
        RED.events.on("editor:close",function() { disabled = false; });
        RED.events.on("type-search:open",function() { disabled = true; });
        RED.events.on("type-search:close",function() { disabled = false; });
        RED.events.on("actionList:open",function() { disabled = true; });
        RED.events.on("actionList:close",function() { disabled = false; });

        RED.keyboard.add("red-ui-search","escape",hide);

        RED.keyboard.add("view-search-tools","escape",function() {
            clearActiveSearch();
            updateSearchToolbar();
        });

        $("#red-ui-header-shade").on('mousedown',hide);
        $("#red-ui-editor-shade").on('mousedown',hide);
        $("#red-ui-palette-shade").on('mousedown',hide);
        $("#red-ui-sidebar-shade").on('mousedown',hide);

        $("#red-ui-view-searchtools-close").on("click", function close() {
            clearActiveSearch();
            updateSearchToolbar();
        });
        $("#red-ui-view-searchtools-close").trigger("click");

        RED.events.on("workspace:clear", clearIndex);

        RED.events.on("flows:add", addItemToIndex);
        RED.events.on("flows:remove", removeItemFromIndex);
        RED.events.on("flows:change", updateItemOnIndex);

        RED.events.on("subflows:add", addItemToIndex);
        RED.events.on("subflows:remove", removeItemFromIndex);
        RED.events.on("subflows:change", updateItemOnIndex);

        RED.events.on("nodes:add",addItemToIndex);
        RED.events.on("nodes:remove",removeItemFromIndex);
        RED.events.on("nodes:change",updateItemOnIndex);

        RED.events.on("groups:add",addItemToIndex);
        RED.events.on("groups:remove",removeItemFromIndex);
        RED.events.on("groups:change",updateItemOnIndex);

    }

    return {
        init: init,
        show: show,
        hide: hide,
        search: search,
        getSearchOptions: getSearchOptions
    };

})();
