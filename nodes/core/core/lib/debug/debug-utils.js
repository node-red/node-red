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

    var filterVisible = false;

    var debugNodeList;
    var debugNodeListExpandedFlows = {};

    function init(_config) {
        config = _config;

        var content = $("<div>").css({"position":"relative","height":"100%"});
        var toolbar = $('<div class="sidebar-header">'+
            '<span class="button-group"><a id="debug-tab-filter" class="sidebar-header-button" href="#"><i class="fa fa-filter"></i> <span></span></a></span>'+
            '<span class="button-group"><a id="debug-tab-clear" class="sidebar-header-button" href="#" data-i18n="[title]node-red:debug.sidebar.clearLog"><i class="fa fa-trash"></i></a></span></div>').appendTo(content);

        var footerToolbar = $('<div>'+
            // '<span class="button-group">'+
            //     '<a class="sidebar-footer-button-toggle text-button selected" id="debug-tab-view-list" href="#"><span data-i18n="">list</span></a>'+
            //     '<a class="sidebar-footer-button-toggle text-button" id="debug-tab-view-table" href="#"><span data-i18n="">table</span></a> '+
            // '</span>'+
            '<span class="button-group"><a id="debug-tab-open" class="sidebar-footer-button" href="#" data-i18n="[title]node-red:debug.sidebar.openWindow"><i class="fa fa-desktop"></i></a></span> ' +
            '</div>');

        messageList = $('<div class="debug-content debug-content-list"/>').appendTo(content);
        sbc = messageList[0];
        messageTable = $('<div class="debug-content  debug-content-table hide"/>').appendTo(content);

        var filterDialog = $('<div class="debug-filter-box hide">'+
            '<div class="debug-filter-row">'+
            '<span class="button-group">'+
                '<a class="sidebar-header-button-toggle debug-tab-filter-option selected" id="debug-tab-filterAll" href="#"><span data-i18n="node-red:debug.sidebar.filterAll"></span></a>'+
                '<a class="sidebar-header-button-toggle debug-tab-filter-option" id="debug-tab-filterSelected" href="#"><span data-i18n="node-red:debug.sidebar.filterSelected"></span></a>'+
                '<a class="sidebar-header-button-toggle debug-tab-filter-option" id="debug-tab-filterCurrent" href="#"><span data-i18n="node-red:debug.sidebar.filterCurrent"></span></a> '+
            '</span>'+
            '</div>'+
        '</div>').appendTo(toolbar);//content);

        // var filterTypeRow = $('<div class="debug-filter-row"></div>').appendTo(filterDialog);
        // $('<select><option>Show all debug nodes</option><option>Show selected debug nodes</option><option>Show current flow only</option></select>').appendTo(filterTypeRow);

        var debugNodeListRow = $('<div class="debug-filter-row hide" id="debug-filter-node-list-row"></div>').appendTo(filterDialog);
        var flowCheckboxes = {};
        var debugNodeListHeader = $('<div><span data-i18n="node-red:debug.sidebar.debugNodes"></span><span></span></div>');
        var headerCheckbox = $('<input type="checkbox">').appendTo(debugNodeListHeader.find("span")[1]).checkboxSet();

        debugNodeList = $('<ol>',{style:"text-align: left; min-height: 250px; max-height: 250px"}).appendTo(debugNodeListRow).editableList({
            header: debugNodeListHeader,
            class: 'red-ui-nodeList',
            addItem: function(container,i,node) {
                var row = $("<div>").appendTo(container);
                row.attr('id','debug-filter-node-list-node-'+node.id.replace(/\./g,"_"));
                if (node.type === 'tab') {
                    container.parent().addClass('red-ui-editableList-section-header');
                    if (!debugNodeListExpandedFlows.hasOwnProperty(node.id)) {
                        debugNodeListExpandedFlows[node.id] = true;
                    }
                    var chevron = $('<i class="fa fa-angle-right"></i>').appendTo(row);
                    $('<span>').text(RED.utils.getNodeLabel(node,node.id)).appendTo(row);
                    var muteControl = $('<input type="checkbox">').appendTo($('<span class="meta">').appendTo(row));
                    muteControl.checkboxSet({
                        parent: headerCheckbox
                    });
                    flowCheckboxes[node.id] = muteControl;
                    row.click(function(e) {
                        e.stopPropagation();
                        debugNodeListExpandedFlows[node.id] = !debugNodeListExpandedFlows[node.id];
                        row.toggleClass('expanded',debugNodeListExpandedFlows[node.id]);
                        debugNodeList.editableList('filter');
                    })
                    row.addClass("expandable");
                    if (node.disabled) {
                        container.addClass('disabled');
                        muteControl.checkboxSet('disable');
                        debugNodeListExpandedFlows[node.id] = false;
                    }
                    row.toggleClass('expanded',debugNodeListExpandedFlows[node.id]);
                } else {
                    $('<span>',{style: "margin-left: 20px"}).text(RED.utils.getNodeLabel(node,node.id)).appendTo(row);
                    row.on("mouseenter",function() {
                        config.messageMouseEnter(node.id);
                    });
                    row.on("mouseleave",function() {
                        config.messageMouseLeave(node.id);
                    });
                    var muteControl = $('<input type="checkbox">').prop('checked',!filteredNodes[node.id]).appendTo($('<span class="meta">').appendTo(row));
                    muteControl.checkboxSet({
                        parent: flowCheckboxes[node.z]
                    }).change(function(e) {
                        filteredNodes[node.id] = !$(this).prop('checked');
                        $(".debug-message-node-"+node.id.replace(/\./g,"_")).toggleClass('hide',filteredNodes[node.id]);
                    });
                    if (!node.active || RED.nodes.workspace(node.z).disabled) {
                        container.addClass('disabled');
                        muteControl.checkboxSet('disable');
                    }
                }
            },
            addButton: false,
            scrollOnAdd: false,
            filter: function(node) {
                return (node.type === 'tab' || debugNodeListExpandedFlows[node.z] )
            },
            sort: function(A,B) {

            }
        });

        try {
            content.i18n();
        } catch(err) {
            console.log("TODO: i18n library support");
        }

        toolbar.find('#debug-tab-filter span').text(RED._('node-red:debug.sidebar.filterAll'));

        var filterButtonHandler = function(type) {
            return function(e) {
                e.preventDefault();
                if (filterType !== type) {
                    $('.debug-tab-filter-option').removeClass('selected');
                    $(this).addClass('selected');
                    if (filterType === 'filterSelected') {
                        debugNodeListRow.slideUp();
                    }
                    filterType = type;
                    if (filterType === 'filterSelected') {
                        debugNodeListRow.slideDown();
                    }

                    $('#debug-tab-filter span').text(RED._('node-red:debug.sidebar.'+filterType));
                    refreshMessageList();
                }
            }
        }
        filterDialog.find('#debug-tab-filterAll').on("click",filterButtonHandler('filterAll'));
        filterDialog.find('#debug-tab-filterSelected').on("click",filterButtonHandler('filterSelected'));
        filterDialog.find('#debug-tab-filterCurrent').on("click",filterButtonHandler('filterCurrent'));


        // $('#debug-tab-view-list').on("click",function(e) {
        //     e.preventDefault();
        //     if (!$(this).hasClass('selected')) {
        //         $(this).addClass('selected');
        //         $('#debug-tab-view-table').removeClass('selected');
        //         showMessageList();
        //     }
        // });
        // $('#debug-tab-view-table').on("click",function(e) {
        //     e.preventDefault();
        //     if (!$(this).hasClass('selected')) {
        //         $(this).addClass('selected');
        //         $('#debug-tab-view-list').removeClass('selected');
        //         showMessageTable();
        //     }
        // });


        var hideFilterTimeout;
        toolbar.on('mouseleave',function() {
            if ($('#debug-tab-filter').hasClass('selected')) {
                clearTimeout(hideFilterTimeout);
                hideFilterTimeout = setTimeout(function() {
                    filterVisible = false;
                    $('#debug-tab-filter').removeClass('selected');
                    filterDialog.slideUp(200);
                },300);
            }
        });
        toolbar.on('mouseenter',function() {
            if ($('#debug-tab-filter').hasClass('selected')) {
                clearTimeout(hideFilterTimeout);
            }
        })
        toolbar.find('#debug-tab-filter').on("click",function(e) {
            e.preventDefault();
            if ($(this).hasClass('selected')) {
                filterVisible = false;
                $(this).removeClass('selected');
                clearTimeout(hideFilterTimeout);
                filterDialog.slideUp(200);
            } else {
                $(this).addClass('selected');
                filterVisible = true;
                refreshDebugNodeList();
                filterDialog.slideDown(200);
            }
        })

        toolbar.find("#debug-tab-clear").click(function(e) {
            e.preventDefault();
            clearMessageList(false);
        });


        return {
            content: content,
            footer: footerToolbar
        }

    }

    function refreshDebugNodeList() {
        debugNodeList.editableList('empty');
        var candidateNodes = RED.nodes.filterNodes({type:'debug'});
        var workspaceOrder = RED.nodes.getWorkspaceOrder();
        var workspaceOrderMap = {};
        workspaceOrder.forEach(function(ws,i) {
            workspaceOrderMap[ws] = i;
        });
        candidateNodes.sort(function(A,B) {
            var wsA = workspaceOrderMap[A.z];
            var wsB = workspaceOrderMap[B.z];
            if (wsA !== wsB) {
                return wsA-wsB;
            }
            var labelA = RED.utils.getNodeLabel(A,A.id);
            var labelB = RED.utils.getNodeLabel(B,B.id);
            return labelA.localeCompare(labelB);
        })
        var currentWs = null;
        var nodeList = [];
        candidateNodes.forEach(function(node) {
            if (currentWs !== node.z) {
                currentWs = node.z;
                nodeList.push(RED.nodes.workspace(node.z));
            }
            nodeList.push(node);
        })


        debugNodeList.editableList('addItems',nodeList)
    }

    function getTimestamp() {
        var d = new Date();
        return d.toLocaleString();
    }

    function sanitize(m) {
        return m.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    function refreshMessageList(_activeWorkspace) {
        if (_activeWorkspace) {
            activeWorkspace = _activeWorkspace.replace(/\./g,"_");
        }
        if (filterType === "filterAll") {
            $(".debug-message").removeClass("hide");
        } else {
            $(".debug-message").each(function() {
                if (filterType === 'filterCurrent') {
                    $(this).toggleClass('hide',!$(this).hasClass('debug-message-flow-'+activeWorkspace));
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
                var wrapper = $("<div>",{id:"debug-message-source-"+sourceNode.id.replace(/\./g,"_")}).appendTo(messageTable);
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
            menuOptionMenu = RED.menu.init({id:"debug-message-option-menu",
                options: [
                    {id:"debug-message-menu-item-collapse",label:RED._("node-red:debug.messageMenu.collapseAll"),onselect:function(){
                        activeMenuMessage.collapse();
                    }},
                    {id:"debug-message-menu-item-clear-pins",label:RED._("node-red:debug.messageMenu.clearPinned"),onselect:function(){
                        activeMenuMessage.clearPinned();
                    }},
                    null,
                    {id:"debug-message-menu-item-filter",label:RED._("node-red:debug.messageMenu.filterNode"),onselect:function(){
                        var candidateNodes = RED.nodes.filterNodes({type:'debug'});
                        candidateNodes.forEach(function(n) {
                            filteredNodes[n.id] = true;
                        });
                        delete filteredNodes[sourceId];
                        $("#debug-tab-filterSelected").click();
                        refreshMessageList();
                    }},
                    {id:"debug-message-menu-item-clear-filter",label:RED._("node-red:debug.messageMenu.clearFilter"),onselect:function(){
                        $("#debug-tab-filterAll").click();
                        refreshMessageList();
                    }}
                ]
            });
            menuOptionMenu.css({
                position: "absolute"
            })
            menuOptionMenu.on('mouseleave', function(){ $(this).hide() });
            menuOptionMenu.on('mouseup', function() { $(this).hide() });
            menuOptionMenu.appendTo("body");
        }
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
        var msg = document.createElement("div");
        var sourceNode = o._source;

        msg.onmouseenter = function() {
            $(msg).addClass('debug-message-hover');
            if (o._source) {
                config.messageMouseEnter(o._source.id);
            }
        };
        msg.onmouseleave = function() {
            $(msg).removeClass('debug-message-hover');
            if (o._source) {
                config.messageMouseLeave(o._source.id);
            }
        };
        var name = sanitize(((o.name?o.name:o.id)||"").toString());
        var topic = sanitize((o.topic||"").toString());
        var property = sanitize(o.property?o.property:'');
        var payload = o.msg;
        var format = sanitize((o.format||"").toString());
        msg.className = 'debug-message'+(o.level?(' debug-message-level-'+o.level):'')+
            (sourceNode?(
                " debug-message-node-"+sourceNode.id.replace(/\./g,"_")+
                (sourceNode.z?" debug-message-flow-"+sourceNode.z.replace(/\./g,"_"):"")
            ):"");

        if (sourceNode) {
            $(msg).data('source',sourceNode.id);
            if (filterType === "filterCurrent" && activeWorkspace) {
                if (sourceNode.z && sourceNode.z.replace(/\./g,"_") !== activeWorkspace) {
                    $(msg).addClass('hide');
                }
            } else if (filterType === 'filterSelected'){
                if (!!filteredNodes[sourceNode.id]) {
                    $(msg).addClass('hide');
                }
            }
        }

        var metaRow = $('<div class="debug-message-meta"></div>').appendTo(msg);
        $('<span class="debug-message-date">'+ getTimestamp()+'</span>').appendTo(metaRow);
        if (sourceNode) {
            $('<a>',{href:"#",class:"debug-message-name"}).html('node: '+(sourceNode.name||sourceNode.id))
            .appendTo(metaRow)
            .click(function(evt) {
                evt.preventDefault();
                config.messageSourceClick(sourceNode.id);
            });
        } else if (name) {
            $('<span class="debug-message-name">'+name+'</span>').appendTo(metaRow);
        }

        if ((format === 'number') && (payload === "NaN")) {
            payload = Number.NaN;
        } else if (format === 'Object' || /^array/.test(format) || format === 'boolean' || format === 'number' ) {
            payload = JSON.parse(payload);
        } else if (/error/i.test(format)) {
            payload = JSON.parse(payload);
            payload = (payload.name?payload.name+": ":"")+payload.message;
        } else if (format === 'null') {
            payload = null;
        } else if (format === 'undefined') {
            payload = undefined;
        } else if (/^buffer/.test(format)) {
            var buffer = payload;
            payload = [];
            for (var c = 0; c < buffer.length; c += 2) {
                payload.push(parseInt(buffer.substr(c, 2), 16));
            }
        }
        var el = $('<span class="debug-message-payload"></span>').appendTo(msg);
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
            $(msg).addClass('debug-message-level-' + errorLvl);
            $('<span class="debug-message-topic">function : (' + errorLvlType + ')</span>').appendTo(metaRow);
        } else {
            var tools = $('<span class="debug-message-tools button-group"></span>').appendTo(metaRow);
            var filterMessage = $('<button class="editor-button editor-button-small"><i class="fa fa-caret-down"></i></button>').appendTo(tools);
            filterMessage.click(function(e) {
                e.preventDefault();
                e.stopPropagation();
                showMessageMenu(filterMessage,debugMessage,sourceNode&&sourceNode.id);
            });
            $('<span class="debug-message-topic">'+
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
                var wrapper = $("#debug-message-source-"+sourceNode.id.replace(/\./g,"_"));
                if (wrapper.length === 0 ) {
                    wrapper = $("<div>",{id:"debug-message-source-"+sourceNode.id.replace(/\./g,"_")}).appendTo(messageTable);
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

    function clearMessageList(clearFilter) {
        $(".debug-message").remove();
        config.clear();
        if (!!clearFilter) {
            clearFilterSettings();
        }
        refreshDebugNodeList();
    }

    function clearFilterSettings() {
        filteredNodes = {};
        filterType = 'filterAll';
        $('.debug-tab-filter-option').removeClass('selected');
        $('#debug-tab-filterAll').addClass('selected');
        $('#debug-tab-filter span').text(RED._('node-red:debug.sidebar.filterAll'));
        $('#debug-filter-node-list-row').slideUp();
    }

    return {
        init: init,
        refreshMessageList:refreshMessageList,
        handleDebugMessage: handleDebugMessage,
        clearMessageList: clearMessageList
    }
})();
