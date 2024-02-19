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

if (!RED) {
    var RED = {}
}
RED.debug = (function() {
    var config;
    var messageList;
    var messageTable;
    var filterType = "filterAll";
    var filteredNodes = {}; // id->true means hide, so default to all visible

    var view = 'list';
    var messages = [];
    var messagesByNode = {};
    var sbc;
    var activeWorkspace;
    var numMessages = 100;  // Hardcoded number of message to show in debug window scrollback

    var debugNodeTreeList;

    function init(_config) {
        config = _config;

        var content = $("<div>").css({"position":"relative","height":"100%"});
        var toolbar = $('<div class="red-ui-sidebar-header">'+
            '<span class="button-group">'+
                '<a id="red-ui-sidebar-debug-filter" style="padding-right: 5px" class="red-ui-sidebar-header-button" href="#"><i class="fa fa-filter"></i> <span></span> <i style="padding-left: 5px;" class="fa fa-caret-down"></i></a>'+
            '</span>'+
            '<span class="button-group">'+
                '<a id="red-ui-sidebar-debug-clear" style="border-right: none; padding-right: 6px" class="red-ui-sidebar-header-button" href="#" data-clear-type="all"><i class="fa fa-trash"></i> <span>all</span></a>' +
                '<a id="red-ui-sidebar-debug-clear-opts" style="padding: 5px; border-left: none;" class="red-ui-sidebar-header-button" href="#"><i class="fa fa-caret-down"></i></a>'+
            '</span></div>').appendTo(content);

        var footerToolbar = $('<div>'+
            '<span class="button-group"><a id="red-ui-sidebar-debug-open" class="red-ui-footer-button" href="#"><i class="fa fa-desktop"></i></a></span> ' +
            '</div>');

        messageList = $('<div class="red-ui-debug-content red-ui-debug-content-list"/>').appendTo(content);
        sbc = messageList[0];
        messageTable = $('<div class="red-ui-debug-content  red-ui-debug-content-table hide"/>').appendTo(content);

        var filterDialogCloseTimeout;
        var filterDialogShown = false;
        var filterDialog = $('<div class="red-ui-debug-filter-box hide"></div>').appendTo(toolbar);//content);
        filterDialog.on('mouseleave' ,function(evt) {
            if (filterDialogShown) {
                filterDialogCloseTimeout = setTimeout(function() {
                    filterDialog.slideUp(200);
                    filterDialogShown = false;
                },500)
            }
        })
        filterDialog.on('mouseenter' ,function(evt) {
            clearTimeout(filterDialogCloseTimeout)
        })
        var filterToolbar = $('<div style="margin-bottom: 3px; display: flex;">'+
            '<span style="flex-grow:1; text-align: left;">'+
                '<span class="button-group"><button type="button" id="red-ui-sidebar-filter-select-all" class="red-ui-sidebar-header-button red-ui-button-small" data-i18n="node-red:debug.sidebar.selectAll"></button></span>' +
                '<span class="button-group"><button type="button" id="red-ui-sidebar-filter-select-none" class="red-ui-sidebar-header-button red-ui-button-small" data-i18n="node-red:debug.sidebar.selectNone"></button></span>' +
            '</span>'+
            '<span class="button-group"><button type="button" id="red-ui-sidebar-filter-select-close" class="red-ui-sidebar-header-button red-ui-button-small"><i class="fa fa-times"></i></button></span>'+
            '</div>').appendTo(filterDialog);

        filterToolbar.find("#red-ui-sidebar-filter-select-close").on('click', function(evt) {
            clearTimeout(filterDialogCloseTimeout)
            filterDialogShown = false;
            filterDialog.slideUp(200);
        })

        filterToolbar.find("#red-ui-sidebar-filter-select-all").on('click', function(evt) {
            evt.preventDefault();
            var data = debugNodeTreeList.treeList('data');
            data.forEach(function(flow) {
                if (!flow.selected) {
                    if (flow.treeList.checkbox) {
                        flow.treeList.checkbox.trigger('click')
                    }
                } else {
                    flow.children.forEach(function(item) {
                        if (!item.selected) {
                            item.treeList.select();
                        }
                    })
                }
            });
            refreshMessageList();
        })

        filterToolbar.find("#red-ui-sidebar-filter-select-none").on('click', function(evt) {
            evt.preventDefault();
            debugNodeTreeList.treeList('clearSelection');
            var data = debugNodeTreeList.treeList('data');
            data.forEach(function(flow) {
                if (flow.children) {
                    flow.children.forEach(function(item) {
                        filteredNodes[item.node.id] = true;
                    })
                }
            });
            RED.settings.set('debug.filteredNodes',Object.keys(filteredNodes))
            refreshMessageList();
        })
        var debugNodeListRow = $('<div class="red-ui-debug-filter-row" id="red-ui-sidebar-debug-filter-node-list-row"></div>').appendTo(filterDialog);
        debugNodeTreeList = $("<div></div>").appendTo(debugNodeListRow).css({width: "100%", height: "300px"})
            .treeList({autoSelect: false}).on("treelistitemmouseover", function(e, item) {
                if (item.node) {
                    item.node.highlighted = true;
                    item.node.dirty = true;
                    RED.view.redraw();
                }
            }).on("treelistitemmouseout", function(e, item) {
                if (item.node) {
                    item.node.highlighted = false;
                    item.node.dirty = true;
                    RED.view.redraw();
                }
            }).on("treelistselect", function(e, item) {
                if (item.children) {
                    item.children.forEach(function(child) {
                        if (child.checkbox) {
                            child.treeList.select(item.selected)
                        }
                    })
                } else {
                    if (item.node) {
                        if (item.selected) {
                            delete filteredNodes[item.node.id]
                        } else {
                            filteredNodes[item.node.id] = true;
                        }
                        RED.settings.set('debug.filteredNodes',Object.keys(filteredNodes))
                        refreshMessageList();
                    }
                }
            })

        try {
            content.i18n();
        } catch(err) {
            console.log("TODO: i18n library support");
        }

        toolbar.find('#red-ui-sidebar-debug-filter span').text(RED._('node-red:debug.sidebar.filterAll'));

        toolbar.find('#red-ui-sidebar-debug-filter').on("click",function(e) {
            e.preventDefault();
            var options = [
                { label: $('<span data-i18n="[append]node-red:debug.sidebar.filterAll"><input type="radio" value="filterAll" name="filter-type" style="margin-top:0"> </span>').i18n() , value: "filterAll" },
                { label: $('<span><span data-i18n="[append]node-red:debug.sidebar.filterSelected"><input type="radio" value="filterSelected" name="filter-type" style="margin-top:0"> </span>...</span>').i18n(), value: "filterSelected" },
                { label: $('<span data-i18n="[append]node-red:debug.sidebar.filterCurrent"><input type="radio" value="filterCurrent" name="filter-type" style="margin-top:0"> </span>').i18n(), value: "filterCurrent" }
            ]
            var menu = RED.popover.menu({
                options: options,
                onselect: function(item) {
                    setFilterType(item.value)
                    if (filterType === 'filterSelected') {
                        config.requestDebugNodeList(filteredNodes);
                        filterDialog.slideDown(200);
                        filterDialogShown = true;
                        debugNodeTreeList.focus();
                    }
                }
            });
            menu.show({
                target: $("#red-ui-sidebar-debug-filter"),
                align: "left",
                offset: [$("#red-ui-sidebar-debug-filter").outerWidth()-2, -1]
            })
            $('input[name="filter-type"][value="'+RED.settings.get("debug.filter","filterAll")+'"]').prop("checked", true)
        });
        RED.popover.tooltip(toolbar.find('#red-ui-sidebar-debug-filter'),RED._('node-red:debug.sidebar.filterLog'));

        toolbar.find("#red-ui-sidebar-debug-clear").on("click", function(e) {
            e.preventDefault();
            var action = RED.settings.get("debug.clearType","all")
            clearMessageList(false, action === 'filtered');
        });
        var clearTooltip = RED.popover.tooltip(toolbar.find("#red-ui-sidebar-debug-clear"),RED._('node-red:debug.sidebar.clearLog'),"core:clear-debug-messages");
        toolbar.find("#red-ui-sidebar-debug-clear-opts").on("click", function(e) {
            e.preventDefault();
            var options = [
                { label: $('<span data-i18n="[append]node-red:debug.sidebar.clearLog"><input type="radio" value="all" name="clear-type" style="margin-top:0"> </span>').i18n() , value: "all" },
                { label: $('<span data-i18n="[append]node-red:debug.sidebar.clearFilteredLog"><input type="radio" value="filtered" name="clear-type" style="margin-top:0"> </span>').i18n(), value: "filtered" }
            ]
            var menu = RED.popover.menu({
                options: options,
                onselect: function(item) {
                    if (item.value === "all") {
                        $("#red-ui-sidebar-debug-clear > span").text(RED._('node-red:debug.sidebar.all'));
                        clearTooltip.setAction("core:clear-debug-messages");
                        clearTooltip.setContent(RED._('node-red:debug.sidebar.clearLog'))
                        RED.settings.set("debug.clearType","all")
                    } else {
                        $("#red-ui-sidebar-debug-clear > span").text(RED._('node-red:debug.sidebar.filtered'));
                        clearTooltip.setAction("core:clear-filtered-debug-messages");
                        clearTooltip.setContent(RED._('node-red:debug.sidebar.clearFilteredLog'))
                        RED.settings.set("debug.clearType","filtered")
                    }
                }
            });
            menu.show({
                target: $("#red-ui-sidebar-debug-clear-opts"),
                align: "left",
                offset: [$("#red-ui-sidebar-debug-clear-opts").outerWidth()-2, -1]
            })
            $('input[name="clear-type"][value="'+RED.settings.get("debug.clearType","all")+'"]').prop("checked", true)
        })

        var clearType = RED.settings.get("debug.clearType","all");
        if (clearType === "all") {
            toolbar.find("#red-ui-sidebar-debug-clear > span").text(RED._('node-red:debug.sidebar.all'));
            clearTooltip.setAction("core:clear-debug-messages");
            clearTooltip.setContent(RED._('node-red:debug.sidebar.clearLog'))
        } else {
            toolbar.find("#red-ui-sidebar-debug-clear > span").text(RED._('node-red:debug.sidebar.filtered'));
            clearTooltip.setAction("core:clear-filtered-debug-messages");
            clearTooltip.setContent(RED._('node-red:debug.sidebar.clearFilteredLog'))
        }

        filterType = RED.settings.get("debug.filter","filterAll")
        var filteredNodeList = RED.settings.get("debug.filteredNodes",[]);
        filteredNodes = {}
        filteredNodeList.forEach(function(id) {
            filteredNodes[id] = true
        })
        toolbar.find('#red-ui-sidebar-debug-filter span').text(RED._('node-red:debug.sidebar.'+filterType));
        refreshMessageList();

        return {
            content: content,
            footer: footerToolbar
        };

    }

    function refreshDebugNodeList(data) {
        debugNodeTreeList.treeList("data", data);
    }

    function getTimestamp() {
        var d = new Date();
        return d.toLocaleString();
    }

    function sanitize(m) {
        return m.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    var refreshTimeout;
    function refreshMessageList(_activeWorkspace) {
        if (refreshTimeout) {
            clearTimeout(refreshTimeout);
        }
        refreshTimeout = setTimeout(function() {
            _refreshMessageList(_activeWorkspace);
        },200);
    }
    function _refreshMessageList(_activeWorkspace) {
        if (typeof _activeWorkspace === 'string') {
            activeWorkspace = _activeWorkspace.replace(/\./g,"_");
        }
        if (filterType === "filterAll") {
            $(".red-ui-debug-msg").removeClass("hide");
        } else {
            $(".red-ui-debug-msg").each(function() {
                if (filterType === 'filterCurrent') {
                    $(this).toggleClass('hide',!$(this).hasClass('red-ui-debug-msg-flow-'+activeWorkspace));
                } else if (filterType === 'filterSelected') {
                    var id = $(this).data('source');
                    if (id) {
                        $(this).toggleClass('hide',!!filteredNodes[id]);
                    }
                }
            });
        }
    }
    function refreshMessageTable() {

    }

    function showMessageList() {
        view = 'list';
        messageTable.hide();
        messageTable.empty();

        messages.forEach(function(m) {
            messageList.append(m.el);
        })
        messageList.show();
    }
    function showMessageTable() {
        view = 'table';
        messageList.hide();
        messageList.empty();

        Object.keys(messagesByNode).forEach(function(id) {
            var m = messagesByNode[id];
            var msg = m.el;
            var sourceNode = m.source;
            if (sourceNode) {
                var wrapper = $("<div>",{id:"red-ui-debug-msg-source-"+sourceNode.id.replace(/\./g,"_")}).appendTo(messageTable);
                wrapper.append(msg);
            }
        });
        messageTable.show();
    }
    function formatString(str) {
        return str.replace(/\n/g,"&crarr;").replace(/\t/g,"&rarr;");
    }


    var menuOptionMenu;
    var activeMenuMessage;
    function showMessageMenu(button,dbgMessage,sourceId) {
        activeMenuMessage = dbgMessage;
        if (!menuOptionMenu) {
            var opts = [
                {id:"red-ui-debug-msg-menu-item-collapse",label:RED._("node-red:debug.messageMenu.collapseAll"),onselect:function(){
                    activeMenuMessage.collapse();
                }},
            ];
            if (activeMenuMessage.clearPinned) {
                opts.push(
                    {id:"red-ui-debug-msg-menu-item-clear-pins",label:RED._("node-red:debug.messageMenu.clearPinned"),onselect:function(){
                        activeMenuMessage.clearPinned();
                    }},
                );
            }
            opts.push(
                null,
                {id:"red-ui-debug-msg-menu-item-filter", label:RED._("node-red:debug.messageMenu.filterNode"),onselect:function(){
                    var candidateNodes = RED.nodes.filterNodes({type:'debug'});
                    candidateNodes.forEach(function(n) {
                        filteredNodes[n.id] = true;
                    });
                    delete filteredNodes[sourceId];
                    RED.settings.set('debug.filteredNodes',Object.keys(filteredNodes))
                    setFilterType('filterSelected')
                    refreshMessageList();
                }},
                {id:"red-ui-debug-msg-menu-item-clear-filter",label:RED._("node-red:debug.messageMenu.clearFilter"),onselect:function(){
                    clearFilterSettings()
                    refreshMessageList();
                }}
            );

            menuOptionMenu = RED.menu.init({id:"red-ui-debug-msg-option-menu",
                options: opts
            });
            menuOptionMenu.css({
                position: "absolute"
            })
            menuOptionMenu.on('mouseleave', function(){ $(this).hide() });
            menuOptionMenu.on('mouseup', function() { $(this).hide() });
            menuOptionMenu.appendTo("body");
        }

        var filterOptionDisabled = false;
        var sourceNode = RED.nodes.node(sourceId);
        if (sourceNode && sourceNode.type !== 'debug') {
            filterOptionDisabled = true;
        }
        RED.menu.setDisabled('red-ui-debug-msg-menu-item-filter',filterOptionDisabled);
        RED.menu.setDisabled('red-ui-debug-msg-menu-item-clear-filter',filterOptionDisabled);

        var elementPos = button.offset();
        menuOptionMenu.css({
            top: elementPos.top+"px",
            left: (elementPos.left - menuOptionMenu.width() + 20)+"px"
        })
        menuOptionMenu.show();
    }

    var stack = [];
    var busy = false;
    function handleDebugMessage(o) {
        if (o) { stack.push(o); }
        if (!busy && (stack.length > 0)) {
            busy = true;
            processDebugMessage(stack.shift());
            setTimeout(function() {
                busy = false;
                handleDebugMessage();
            }, 15);  // every 15mS = 66 times a second
            if (stack.length > numMessages) { stack = stack.splice(-numMessages); }
        }
    }

    function processDebugMessage(o) {
        var msg = $("<div/>");
        var sourceNode = o._source;

        msg.on("mouseenter", function() {
            msg.addClass('red-ui-debug-msg-hover');
            if (o._source) {
                // highlight the top-level node (could be subflow instance)
                config.messageMouseEnter(o._source.id);
                if (o._source._alias) {
                    // this is inside a subflow - highlight the node itself
                    config.messageMouseEnter(o._source._alias);
                }
                // if path.length > 2, we are nested - highlight subflow instances
                for (var i=2;i<o._source.path.length;i++) {
                    config.messageMouseEnter(o._source.path[i]);
                }
            }
        });
        msg.on("mouseleave", function() {
            msg.removeClass('red-ui-debug-msg-hover');
            if (o._source) {
                config.messageMouseLeave(o._source.id);
                if (o._source._alias) {
                    config.messageMouseLeave(o._source._alias);
                }
                for (var i=2;i<o._source.path.length;i++) {
                    config.messageMouseLeave(o._source.path[i]);
                }
            }
        });
        var name = sanitize(((o.name?o.name:o.id)||"").toString());
        var topic = sanitize((o.topic||"").toString());
        var property = sanitize(o.property?o.property:'');
        var payload = o.msg;
        var format = sanitize((o.format||"").toString());
        msg.attr("class", 'red-ui-debug-msg'+(o.level?(' red-ui-debug-msg-level-'+o.level):'')+
            (sourceNode?(
                " red-ui-debug-msg-node-"+sourceNode.id.replace(/\./g,"_")+
                (sourceNode.z?" red-ui-debug-msg-flow-"+sourceNode.z.replace(/\./g,"_"):"")
            ):""));

        if (sourceNode) {
            msg.data('source',sourceNode.id);
            if (filterType === "filterCurrent" && activeWorkspace) {
                if (sourceNode.z && sourceNode.z.replace(/\./g,"_") !== activeWorkspace) {
                    msg.addClass('hide');
                }
            } else if (filterType === 'filterSelected'){
                if (!!filteredNodes[sourceNode.id]) {
                    msg.addClass('hide');
                }
            }
        }

        var metaRow = $('<div class="red-ui-debug-msg-meta"></div>').appendTo(msg);
        $('<span class="red-ui-debug-msg-date">'+ getTimestamp()+'</span>').appendTo(metaRow);
        if (sourceNode) {

            var nodeLink = $('<a>',{href:"#",class:"red-ui-debug-msg-name"}).text(RED._("node-red:debug.node")+": "+(o.name||sourceNode.name||sourceNode.id))
            .appendTo(metaRow)
            .on("click", function(evt) {
                evt.preventDefault();
                config.messageSourceClick(sourceNode.id, sourceNode._alias, sourceNode.path);
            });

            if (sourceNode.pathHierarchy) {
                RED.popover.create({
                    tooltip: true,
                    target:nodeLink,
                    trigger: "hover",
                    size: "small",
                    direction: "bottom",
                    interactive: true,
                    content: function() {
                        const content = $("<div>")
                        sourceNode.pathHierarchy.forEach((pathPart,idx) => {
                            const link = $("<a>", {href:"#" ,style:'display: block'})
                                .css({
                                    paddingLeft:((idx*10)+((idx === sourceNode.pathHierarchy.length - 1)?10:0))+"px",
                                    paddingRight:'2px'
                                })
                                .text(pathPart.label)
                                .appendTo(content)
                                .on("click", function(evt) {
                                    evt.preventDefault();
                                    config.messageSourceClick(pathPart.id);
                                })
                            if (idx < sourceNode.pathHierarchy.length - 1) {
                                $('<i class="fa fa-angle-down" style="margin-right: 3px"></i>').prependTo(link)
                            }
                        })
                        return content
                    },
                    delay: { show: 50, hide: 150 }
                });
            }
        } else if (name) {
            $('<span class="red-ui-debug-msg-name">'+name+'</span>').appendTo(metaRow);
        }

        payload = RED.utils.decodeObject(payload,format);

        var el = $('<span class="red-ui-debug-msg-payload"></span>').appendTo(msg);
        var path = o.property||'';
        var debugMessage = RED.utils.createObjectElement(payload, {
            key: /*true*/null,
            typeHint: format,
            hideKey: false,
            path: path,
            sourceId: sourceNode&&sourceNode.id,
            rootPath: path
        });
        // Do this in a separate step so the element functions aren't stripped
        debugMessage.appendTo(el);
        // NOTE: relying on function error to have a "type" that all other msgs don't
        if (o.hasOwnProperty("type") && (o.type === "function")) {
            var errorLvlType = 'error';
            var errorLvl = 20;
            if (o.hasOwnProperty("level") && o.level === 30) {
                errorLvl = 30;
                errorLvlType = 'warn';
            }
            msg.addClass('red-ui-debug-msg-level-' + errorLvl);
            $('<span class="red-ui-debug-msg-topic">function : (' + errorLvlType + ')</span>').appendTo(metaRow);
        } else {
            var tools = $('<span class="red-ui-debug-msg-tools button-group"></span>').appendTo(metaRow);
            var filterMessage = $('<button class="red-ui-button red-ui-button-small"><i class="fa fa-caret-down"></i></button>').appendTo(tools);
            filterMessage.on("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                showMessageMenu(filterMessage,debugMessage,sourceNode&&sourceNode.id);
            });
            $('<span class="red-ui-debug-msg-topic">'+
                (o.topic?topic+' : ':'')+
                (o.property?'msg.'+property:'msg')+" : "+format+
                '</span>').appendTo(metaRow);
        }

        var atBottom = (sbc.scrollHeight-messageList.height()-sbc.scrollTop) < 5;
        var m = {
            el: msg
        };
        messages.push(m);
        if (sourceNode) {
            m.source = sourceNode;
            messagesByNode[sourceNode.id] = m;
        }
        if (view == "list") {
            messageList.append(msg);
        } else {
            if (sourceNode) {
                var wrapper = $("#red-ui-debug-msg-source-"+sourceNode.id.replace(/\./g,"_"));
                if (wrapper.length === 0 ) {
                    wrapper = $("<div>",{id:"red-ui-debug-msg-source-"+sourceNode.id.replace(/\./g,"_")}).appendTo(messageTable);
                }
                wrapper.empty();
                wrapper.append(msg);
            }
        }

        if (messages.length === numMessages) {
            m = messages.shift();
            if (view === "list") {
                m.el.remove();
            }
        }
        if (atBottom) {
            messageList.scrollTop(sbc.scrollHeight);
        }
    }

    function clearMessageList(clearFilter, filteredOnly) {
        if (!filteredOnly) {
            $(".red-ui-debug-msg").remove();
        } else {
            $(".red-ui-debug-msg:not(.hide)").remove();
        }
        config.clear();
        if (!!clearFilter) {
            clearFilterSettings();
        }
        config.requestDebugNodeList(filteredNodes);
    }

    function setFilterType(type) {
        if (type !== filterType) {
            filterType = type;
            $('#red-ui-sidebar-debug-filter span').text(RED._('node-red:debug.sidebar.'+filterType));
            refreshMessageList();
            RED.settings.set("debug.filter",filterType)
        }
    }
    function clearFilterSettings() {
        filteredNodes = {};
        filterType = 'filterAll';
        RED.settings.set("debug.filter",filterType);
        RED.settings.set('debug.filteredNodes',Object.keys(filteredNodes))
        $('#red-ui-sidebar-debug-filter span').text(RED._('node-red:debug.sidebar.filterAll'));
    }

    return {
        init: init,
        refreshMessageList:refreshMessageList,
        handleDebugMessage: handleDebugMessage,
        clearMessageList: clearMessageList,
        refreshDebugNodeList: refreshDebugNodeList
    }
})();
