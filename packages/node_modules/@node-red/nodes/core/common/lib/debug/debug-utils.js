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
        var toolbar = $('<div class="red-ui-sidebar-header">'+
            '<span class="button-group"><a id="red-ui-sidebar-debug-filter" class="red-ui-sidebar-header-button" href="#"><i class="fa fa-filter"></i> <span></span></a></span>'+
            '<span class="button-group"><a id="red-ui-sidebar-debug-clear" class="red-ui-sidebar-header-button" href="#"><i class="fa fa-trash"></i></a></span></div>').appendTo(content);

        var footerToolbar = $('<div>'+
            // '<span class="button-group">'+
            //     '<a class="red-ui-footer-button-toggle text-button selected" id="red-ui-sidebar-debug-view-list" href="#"><span data-i18n="">list</span></a>'+
            //     '<a class="red-ui-footer-button-toggle text-button" id="red-ui-sidebar-debug-view-table" href="#"><span data-i18n="">table</span></a> '+
            // '</span>'+
            '<span class="button-group"><a id="red-ui-sidebar-debug-open" class="red-ui-footer-button" href="#"><i class="fa fa-desktop"></i></a></span> ' +
            '</div>');

        messageList = $('<div class="red-ui-debug-content red-ui-debug-content-list"/>').appendTo(content);
        sbc = messageList[0];
        messageTable = $('<div class="red-ui-debug-content  red-ui-debug-content-table hide"/>').appendTo(content);

        var filterDialog = $('<div class="red-ui-debug-filter-box hide">'+
            '<div class="red-ui-debug-filter-row">'+
            '<span class="button-group">'+
                '<a class="red-ui-sidebar-header-button-toggle red-ui-sidebar-debug-filter-option selected" id="red-ui-sidebar-debug-filterAll" href="#"><span data-i18n="node-red:debug.sidebar.filterAll"></span></a>'+
                '<a class="red-ui-sidebar-header-button-toggle red-ui-sidebar-debug-filter-option" id="red-ui-sidebar-debug-filterSelected" href="#"><span data-i18n="node-red:debug.sidebar.filterSelected"></span></a>'+
                '<a class="red-ui-sidebar-header-button-toggle red-ui-sidebar-debug-filter-option" id="red-ui-sidebar-debug-filterCurrent" href="#"><span data-i18n="node-red:debug.sidebar.filterCurrent"></span></a> '+
            '</span>'+
            '</div>'+
        '</div>').appendTo(toolbar);//content);

        // var filterTypeRow = $('<div class="red-ui-debug-filter-row"></div>').appendTo(filterDialog);
        // $('<select><option>Show all debug nodes</option><option>Show selected debug nodes</option><option>Show current flow only</option></select>').appendTo(filterTypeRow);

        var debugNodeListRow = $('<div class="red-ui-debug-filter-row hide" id="red-ui-sidebar-debug-filter-node-list-row"></div>').appendTo(filterDialog);
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
                    row.on("click", function(e) {
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
                    }).on("change", function(e) {
                        filteredNodes[node.id] = !$(this).prop('checked');
                        $(".red-ui-debug-msg-node-"+node.id.replace(/\./g,"_")).toggleClass('hide',filteredNodes[node.id]);
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

        toolbar.find('#red-ui-sidebar-debug-filter span').text(RED._('node-red:debug.sidebar.filterAll'));

        var filterButtonHandler = function(type) {
            return function(e) {
                e.preventDefault();
                if (filterType !== type) {
                    $('.red-ui-sidebar-debug-filter-option').removeClass('selected');
                    $(this).addClass('selected');
                    if (filterType === 'filterSelected') {
                        debugNodeListRow.slideUp();
                    }
                    filterType = type;
                    if (filterType === 'filterSelected') {
                        debugNodeListRow.slideDown();
                    }

                    $('#red-ui-sidebar-debug-filter span').text(RED._('node-red:debug.sidebar.'+filterType));
                    refreshMessageList();
                }
            }
        }
        filterDialog.find('#red-ui-sidebar-debug-filterAll').on("click",filterButtonHandler('filterAll'));
        filterDialog.find('#red-ui-sidebar-debug-filterSelected').on("click",filterButtonHandler('filterSelected'));
        filterDialog.find('#red-ui-sidebar-debug-filterCurrent').on("click",filterButtonHandler('filterCurrent'));


        // $('#red-ui-sidebar-debug-view-list').on("click",function(e) {
        //     e.preventDefault();
        //     if (!$(this).hasClass('selected')) {
        //         $(this).addClass('selected');
        //         $('#red-ui-sidebar-debug-view-table').removeClass('selected');
        //         showMessageList();
        //     }
        // });
        // $('#red-ui-sidebar-debug-view-table').on("click",function(e) {
        //     e.preventDefault();
        //     if (!$(this).hasClass('selected')) {
        //         $(this).addClass('selected');
        //         $('#red-ui-sidebar-debug-view-list').removeClass('selected');
        //         showMessageTable();
        //     }
        // });


        var hideFilterTimeout;
        toolbar.on('mouseleave',function() {
            if ($('#red-ui-sidebar-debug-filter').hasClass('selected')) {
                clearTimeout(hideFilterTimeout);
                hideFilterTimeout = setTimeout(function() {
                    filterVisible = false;
                    $('#red-ui-sidebar-debug-filter').removeClass('selected');
                    filterDialog.slideUp(200);
                },300);
            }
        });
        toolbar.on('mouseenter',function() {
            if ($('#red-ui-sidebar-debug-filter').hasClass('selected')) {
                clearTimeout(hideFilterTimeout);
            }
        })
        toolbar.find('#red-ui-sidebar-debug-filter').on("click",function(e) {
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
        });
        RED.popover.tooltip(toolbar.find('#red-ui-sidebar-debug-filter'),RED._('node-red:debug.sidebar.filterLog'));

        toolbar.find("#red-ui-sidebar-debug-clear").on("click", function(e) {
            e.preventDefault();
            clearMessageList(false);
        });
        RED.popover.tooltip(toolbar.find("#red-ui-sidebar-debug-clear"),RED._('node-red:debug.sidebar.clearLog'),"core:clear-debug-messages");



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
        candidateNodes = candidateNodes.filter(function(node) {
            return workspaceOrderMap.hasOwnProperty(node.z);
        })
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
            menuOptionMenu = RED.menu.init({id:"red-ui-debug-msg-option-menu",
                options: [
                    {id:"red-ui-debug-msg-menu-item-collapse",label:RED._("node-red:debug.messageMenu.collapseAll"),onselect:function(){
                        activeMenuMessage.collapse();
                    }},
                    {id:"red-ui-debug-msg-menu-item-clear-pins",label:RED._("node-red:debug.messageMenu.clearPinned"),onselect:function(){
                        activeMenuMessage.clearPinned();
                    }},
                    null,
                    {id:"red-ui-debug-msg-menu-item-filter", label:RED._("node-red:debug.messageMenu.filterNode"),onselect:function(){
                        var candidateNodes = RED.nodes.filterNodes({type:'debug'});
                        candidateNodes.forEach(function(n) {
                            filteredNodes[n.id] = true;
                        });
                        delete filteredNodes[sourceId];
                        $("#red-ui-sidebar-debug-filterSelected").trigger("click");
                        refreshMessageList();
                    }},
                    {id:"red-ui-debug-msg-menu-item-clear-filter",label:RED._("node-red:debug.messageMenu.clearFilter"),onselect:function(){
                        $("#red-ui-sidebar-debug-filterAll").trigger("click");
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
                config.messageMouseEnter(o._source.id);
                if (o._source._alias) {
                    config.messageMouseEnter(o._source._alias);
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
            $('<a>',{href:"#",class:"red-ui-debug-msg-name"}).text('node: '+sanitize(o.name||sourceNode.name||sourceNode.id))
            .appendTo(metaRow)
            .on("click", function(evt) {
                evt.preventDefault();
                config.messageSourceClick(sourceNode.id);
            });
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

    function clearMessageList(clearFilter) {
        $(".red-ui-debug-msg").remove();
        config.clear();
        if (!!clearFilter) {
            clearFilterSettings();
        }
        refreshDebugNodeList();
    }

    function clearFilterSettings() {
        filteredNodes = {};
        filterType = 'filterAll';
        $('.red-ui-sidebar-debug-filter-option').removeClass('selected');
        $('#red-ui-sidebar-debug-filterAll').addClass('selected');
        $('#red-ui-sidebar-debug-filter span').text(RED._('node-red:debug.sidebar.filterAll'));
        $('#red-ui-sidebar-debug-filter-node-list-row').slideUp();
    }

    return {
        init: init,
        refreshMessageList:refreshMessageList,
        handleDebugMessage: handleDebugMessage,
        clearMessageList: clearMessageList
    }
})();
