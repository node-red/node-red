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

    function search(val) {
        activeFilter = val.toLowerCase();
        var visible = searchResults.editableList('filter');
        setTimeout(function() {
            selected = 0;
            searchResults.children().removeClass('selected');
            searchResults.children(":visible:first").addClass('selected');
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

    function createDialog() {
        //shade = $('<div>',{class:"red-ui-type-search-shade"}).appendTo("#main-container");
        dialog = $("<div>",{id:"red-ui-type-search",class:"red-ui-search red-ui-type-search"}).appendTo("#main-container");
        var searchDiv = $("<div>",{class:"red-ui-search-container"}).appendTo(dialog);
        searchInput = $('<input type="text" placeholder="add a node...">').appendTo(searchDiv).searchBox({
            delay: 50,
            change: function() {
                search($(this).val());
            }
        });
        searchInput.on('keydown',function(evt) {
            var children = searchResults.children(":visible");
            if (children.length > 0) {
                if (evt.keyCode === 40) {
                    // Down
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
                    var index = Math.max(0,selected);
                    if (index < children.length) {
                        // TODO: dips into editableList impl details
                        confirm($(children[index]).find(".red-ui-editableList-item-content").data('data'));
                    }
                }
            }
        });

        searchResultsDiv = $("<div>",{class:"red-ui-search-results-container"}).appendTo(dialog);
        searchResults = $('<ol>',{id:"search-result-list", style:"position: absolute;top: 0;bottom: 0;left: 0;right: 0;"}).appendTo(searchResultsDiv).editableList({
            addButton: false,
            filter: function(data) {
                if (activeFilter === "" ) {
                    return true;
                }

                return (activeFilter==="")||(data.index.indexOf(activeFilter) > -1);
            },
            addItem: function(container,i,object) {
                var def = object.def;
                object.index = object.type.toLowerCase();
                var div = $('<a>',{href:'#',class:"red-ui-search-result"}).appendTo(container);

                var nodeDiv = $('<div>',{class:"red-ui-search-result-node"}).appendTo(div);
                var colour = def.color;
                var icon_url = "arrow-in.png";
                if (def.category === 'config') {
                    icon_url = "cog.png";
                } else {
                    try {
                        icon_url = (typeof def.icon === "function" ? def.icon.call({}) : def.icon);
                    } catch(err) {
                        console.log("Definition error: "+object.type+".icon",err);
                    }
                }
                nodeDiv.css('backgroundColor',colour);

                var iconContainer = $('<div/>',{class:"palette_icon_container"}).appendTo(nodeDiv);
                $('<div/>',{class:"palette_icon",style:"background-image: url(icons/"+icon_url+")"}).appendTo(iconContainer);

                var contentDiv = $('<div>',{class:"red-ui-search-result-description"}).appendTo(div);

                var label = object.type;
                if (typeof def.paletteLabel !== "undefined") {
                    try {
                        label = (typeof def.paletteLabel === "function" ? def.paletteLabel.call(def) : def.paletteLabel)||"";
                        label += " ("+object.type+")";
                        object.index += "|"+label.toLowerCase();
                    } catch(err) {
                        console.log("Definition error: "+object.type+".paletteLabel",err);
                    }
                }


                $('<div>',{class:"red-ui-search-result-node-label"}).html(label).appendTo(contentDiv);

                div.click(function(evt) {
                    evt.preventDefault();
                    confirm(object);
                });
            },
            scrollOnAdd: false
        });

    }
    function confirm(def) {
        hide();
        addCallback(def.type);
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
        }
    }
    function show(opts) {
        if (!visible) {
            RED.keyboard.add("*",/* ESCAPE */ 27,function(){hide();d3.event.preventDefault();});
            if (dialog === null) {
                createDialog();
            }
            visible = true;
            setTimeout(function() {
                $(document).on('mousedown.type-search',handleMouseActivity);
                $(document).on('mouseup.type-search',handleMouseActivity);
                $(document).on('click.type-search',handleMouseActivity);
            },200);
        } else {
            dialog.hide();
            searchResultsDiv.hide();
        }
        refreshTypeList();
        addCallback = opts.add;
        RED.events.emit("type-search:open");
        //shade.show();
        dialog.css({left:opts.x+"px",top:opts.y+"px"}).show();
        searchResultsDiv.slideDown();
        setTimeout(function() {
            searchResultsDiv.find(".red-ui-editableList-container").scrollTop(0);
            searchInput.focus();
        },100);
    }
    function hide(fast) {
        if (visible) {
            RED.keyboard.remove(/* ESCAPE */ 27);
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
            $(document).off('mousedown.type-search');
            $(document).off('mouseup.type-search');
            $(document).off('click.type-search');
        }
    }
    function refreshTypeList() {
        searchResults.editableList('empty');
        searchInput.searchBox('value','');
        selected = -1;
        var common = {
            "debug"   : false,
            "inject"  : false,
            "function": false
        };
        var nodeTypes = RED.nodes.registry.getNodeTypes().filter(function(n) {
            if (common.hasOwnProperty(n)) {
                common[n] = true;
                return false;
            }
            return true;
        });
        // Just in case a core node has been disabled
        if (common["function"]) {
            nodeTypes.unshift("function");
        }
        if (common["inject"]) {
            nodeTypes.unshift("inject");
        }
        if (common["debug"]) {
            nodeTypes.unshift("debug");
        }


        var i;
        for (i=0;i<nodeTypes.length;i++) {
            var t = nodeTypes[i];
            var def = RED.nodes.getType(t);
            if (def.category !== 'config' && t !== 'unknown') {
                searchResults.editableList('addItem',{type:t,def: def})
            }
        }
        setTimeout(function() {
            selected = 0;
            searchResults.children(":first").addClass('selected');
        },100);
    }

    function init() {
        // RED.keyboard.add("*",/* . */ 190,{ctrl:true},function(){if (!disabled) { show(); } d3.event.preventDefault();});
        // RED.events.on("editor:open",function() { disabled = true; });
        // RED.events.on("editor:close",function() { disabled = false; });
        // RED.events.on("palette-editor:open",function() { disabled = true; });
        // RED.events.on("palette-editor:close",function() { disabled = false; });
        //
        //
        //
        // $("#header-shade").on('mousedown',hide);
        // $("#editor-shade").on('mousedown',hide);
        // $("#palette-shade").on('mousedown',hide);
        // $("#sidebar-shade").on('mousedown',hide);
    }

    return {
        init: init,
        show: show,
        hide: hide
    };

})();
