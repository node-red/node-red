/**
 * Copyright 2016 IBM Corp.
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
    var debuggerView;
    var filter = false;
    var view = 'list';
    var messages = [];
    var messagesByNode = {};
    var sbc;
    var activeWorkspace;
    var breakpointList;

    var debuggerEnabled = false;

    function init(_config) {
        config = _config;
        var content = $("<div>").css({"position":"relative","height":"100%"});
        var toolbar = $('<div class="sidebar-header">'+
            '<span class="button-group" style="float: left"><button id="debug-tab-view-console" class="sidebar-header-button-toggle selected">console</button><button id="debug-tab-view-debugger" class="sidebar-header-button-toggle">debugger</button></span>'+
            '<span class="debug-tab-view-console-buttons">'+
                '<span class="button-group"><button id="debug-tab-filter" class="sidebar-header-button"><i class="fa fa-filter"></i></button></span>'+
                '<span class="button-group"><button id="debug-tab-clear" title="clear log" class="sidebar-header-button"><i class="fa fa-trash"></i></button></span>'+
            '</span>'+
            '<span class="debug-tab-view-dbgr-buttons hide">'+
                '<span class="button-group"><button id="debug-tab-dbgr-toggle" class="sidebar-header-button"><i class="fa fa-toggle-off"></i></button></span>'+
            '</span>'+
            '</div>').appendTo(content);

        var footerToolbar = $('<div>'+
            // '<span class="button-group">'+
            //     '<a class="sidebar-footer-button-toggle text-button selected" id="debug-tab-view-list" href="#"><span data-i18n="">list</span></a>'+
            //     '<a class="sidebar-footer-button-toggle text-button" id="debug-tab-view-table" href="#"><span data-i18n="">table</span></a> '+
            // '</span>'+
            '<span class="button-group"><button id="debug-tab-open" title="open in new window" class="sidebar-footer-button"><i class="fa fa-desktop"></i></button></span> ' +
            '</div>');

        messageList = $('<div class="debug-content debug-content-list"/>').appendTo(content);
        sbc = messageList[0];
        messageTable = $('<div class="debug-content  debug-content-table hide"/>').appendTo(content);

        var filterDialog = $('<div class="debug-filter-box hide">'+
            '<div class="debug-filter-row">'+
                '<span class="button-group">'+
                    '<button class="sidebar-header-button-toggle selected" id="debug-tab-filter-all"><span data-i18n="node-red:debug.sidebar.filterAll">all flows</span></button>'+
                    '<button class="sidebar-header-button-toggle" id="debug-tab-filter-current"><span data-i18n="node-red:debug.sidebar.filterCurrent">current flow</span></button> '+
                '</span>'+
            '</div>'+
        '</div>').appendTo(content);



        debuggerView = $('<div class="debug-content hide"/>').appendTo(content);

        var dbgrDisabled = $('<div class="debug-content debug-dbgr-content debug-dbgr-content-disabled">Debugger is disabled</div>').appendTo(debuggerView);
        var dbgrPanel = $('<div class="debug-content debug-dbgr-content"></div>').hide().appendTo(debuggerView);

        var dbgrToolbar = $('<div class="sidebar-header" style="text-align:left">'+
            '<span>'+
                '<button id="" class="sidebar-header-button"><i class="fa fa-pause"></i></button>'+
                '<button id="" class="sidebar-header-button"><i class="fa fa-play"></i></button>'+
                '<button id="" class="sidebar-header-button"><i class="fa fa-step-forward"></i></button>'+
            '</span>'+
        '</div>').appendTo(dbgrPanel);

        /************ Breakpoints ************/

        var breakpointPanel = $('<div class="palette-category">'+
            '<div class="palette-header">'+
                '<i class="fa fa-angle-down expanded"></i>'+
                '<span>Breakpoints</span>'+
                '<span id="debug-dbgr-breakpoint-count" class="config-node-filter-info"></span>'+
            '</div>'+
        '</div>').appendTo(dbgrPanel);



        var breakPointContent = $('<div>',{class:"palette-content debug-dbgr-breakpoints"}).appendTo(breakpointPanel);

        // var buttonGroup = $('<div>').css({position:"absolute", right: 0,top:0}).appendTo(breakPointContent);
        // $('<button class="editor-button editor-button-small"><i class="fa fa-plus"></i> breakpoint</button>')
        //     .click(function(evt) {
        //         breakpointList.editableList('addItem',{});
        //     })
        //     .appendTo(buttonGroup);

        var emptyItem = {};

        breakpointList = $("<ol>").css({height: "200px"}).appendTo(breakPointContent).editableList({
            addButton: false,
            addItem: function(container,i,breakpoint) {
                if (breakpoint === emptyItem) {
                    $('<div>',{class:"red-ui-search-empty"}).html('Double click on a port to add a breakpoint').appendTo(container);
                    return;
                }
                var currentCount = breakpointList.find('.debug-dbgr-breakpoint').length;
                if (currentCount === 0) {
                    console.log("out with the old")
                    breakpointList.editableList('removeItem',emptyItem);
                }
                var id = "breakpoint_"+breakpoint.key;
                var label = $('<label>',{for:id}).appendTo(container);
                var cb = $('<input class="debug-dbgr-breakpoint" id="'+id+'" type="checkbox" checked></input>').appendTo(label);


                $('<span>').html(RED.utils.getNodeLabel(breakpoint.node,breakpoint.node.id)).appendTo(label);

                var workspace = RED.nodes.workspace(breakpoint.node.z);
                if (!workspace) {
                    workspace = RED.nodes.subflow(breakpoint.node.z);
                    workspace = "subflow:"+workspace.name;
                } else {
                    workspace = "flow:"+workspace.label;
                }
                var flowMeta = $('<div>',{class:"red-ui-search-result-node-flow"}).appendTo(label);

                $('<div>').html(workspace).appendTo(flowMeta);
                $('<div>').html((breakpoint.portType === 0?"output":"input")+" "+(breakpoint.portIndex+1)).appendTo(flowMeta);


                $('<div>',{class:"red-ui-search-result-node-type"}).html(breakpoint.node.type).appendTo(label);

                //+" : "+breakpoint.portType+" : "+breakpoint.portIndex).appendTo(label);
                cb.on('change',function(evt) {
                    if ($(this).is(":checked")) {
                        delete breakpoint.disabled;
                    } else {
                        breakpoint.disabled = true;
                    }
                    breakpoint.node.dirty = true;
                    RED.view.redraw();
                    refreshBreakpointCount();
                });
                label.on('mouseenter',function() {
                    config.messageMouseEnter(breakpoint.node.id);
                });
                label.on('mouseleave',function() {
                    config.messageMouseLeave(breakpoint.node.id);
                });
                refreshBreakpointCount();
                console.log(breakpointList.editableList('length'));
            },
            removeItem: function(breakpoint) {
                refreshBreakpointCount();
                if (breakpoint !== emptyItem) {
                    var currentCount = breakpointList.find('.debug-dbgr-breakpoint').length;
                    if (currentCount === 0) {
                        breakpointList.editableList('addItem',emptyItem);
                    }
                }

            }
        });
        breakpointList.editableList('addItem',emptyItem);



        /************ Something else ************/

        $('<div class="palette-category">'+
            '<div class="palette-header">'+
                '<i class="fa fa-angle-down expanded"></i>'+
                '<span>Messages</span>'+
            '</div>'+
            '<div class="palette-content"></div>'+
        '</div>').appendTo(dbgrPanel);

        /************ Something else ************/

        $('<div class="palette-category">'+
            '<div class="palette-header">'+
                '<i class="fa fa-angle-down expanded"></i>'+
                '<span>Context</span>'+
            '</div>'+
            '<div class="palette-content"></div>'+
        '</div>').appendTo(dbgrPanel);


        /****************************************/


        try {
            content.i18n();
        } catch(err) {
            console.log("TODO: i18n library support");
        }

        dbgrPanel.find(".palette-header").on('click', function(e) {
            var icon = $(this).find("i");
            var content = $(this).next();
            if (icon.hasClass("expanded")) {
                icon.removeClass("expanded");
                content.slideUp();
            } else {
                icon.addClass("expanded");
                content.slideDown();
            }
        });


        toolbar.find('#debug-tab-filter-all').on("click",function(e) {
            e.preventDefault();
            if (filter) {
                $(this).addClass('selected');
                $('#debug-tab-filter-current').removeClass('selected');
                filter = !filter;
                refreshMessageList();
            }
        });
        toolbar.find('#debug-tab-filter-current').on("click",function(e) {
            e.preventDefault();
            if (!filter) {
                $(this).addClass('selected');
                $('#debug-tab-filter-all').removeClass('selected');
                filter = !filter;
                refreshMessageList();
            }
        });
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


        toolbar.find('#debug-tab-filter').on("click",function(e) {
            e.preventDefault();
            if ($(this).hasClass('selected')) {
                $(this).removeClass('selected');
                filterDialog.slideUp(200);
            } else {
                $(this).addClass('selected');
                filterDialog.slideDown(200);
            }
        })



        toolbar.find('#debug-tab-view-debugger').on("click",function(e) {
            if ($(messageList).is(":visible")) {
                messageList.hide();
                debuggerView.show();
                toolbar.find(".debug-tab-view-console-buttons").hide();
                toolbar.find(".debug-tab-view-dbgr-buttons").show();
                $(this).siblings().removeClass('selected');
                $(this).addClass('selected');

            }
        });
        toolbar.find('#debug-tab-view-console').on("click",function(e) {
            if ($(debuggerView).is(":visible")) {
                messageList.show();
                debuggerView.hide();
                toolbar.find(".debug-tab-view-console-buttons").show();
                toolbar.find(".debug-tab-view-dbgr-buttons").hide();
                $(this).siblings().removeClass('selected');
                $(this).addClass('selected');

            }
        });

        toolbar.find('#debug-tab-dbgr-toggle').on("click",function(e) {
            var i = $(this).find("i");
            if (i.hasClass('fa-toggle-off')) {
                i.addClass('fa-toggle-on');
                i.removeClass('fa-toggle-off');
                dbgrPanel.show();
                dbgrDisabled.hide();
                debuggerEnabled = true;
            } else {
                i.addClass('fa-toggle-off');
                i.removeClass('fa-toggle-on');
                dbgrPanel.hide();
                dbgrDisabled.show();
                debuggerEnabled = false;
            }
            RED.view.redraw(true);
        })


        toolbar.find("#debug-tab-clear").click(function(e) {
            e.preventDefault();
            $(".debug-message").remove();
            messageCount = 0;
            config.clear();
        });


        return {
            content: content,
            footer: footerToolbar
        }

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
            activeWorkspace = _activeWorkspace;
        }
        $(".debug-message").each(function() {
            $(this).toggleClass('hide',filter&&!$(this).hasClass('debug-message-flow-'+activeWorkspace));
        });
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

    function handleDebugMessage(o) {
        var msg = document.createElement("div");

        var sourceNode = o._source;

        msg.onmouseenter = function() {
            msg.style.borderRightColor = "#999";
            if (o._source) {
                config.messageMouseEnter(o._source.id);
            }
        };
        msg.onmouseleave = function() {
            msg.style.borderRightColor = "";
            if (o._source) {
                config.messageMouseLeave(o._source.id);
            }
        };
        var name = sanitize(((o.name?o.name:o.id)||"").toString());
        var topic = sanitize((o.topic||"").toString());
        var property = sanitize(o.property?o.property:'');
        var payload = sanitize((o.msg||"").toString());
        var format = sanitize((o.format||"").toString());
        msg.className = 'debug-message'+(o.level?(' debug-message-level-'+o.level):'') +
        ((sourceNode&&sourceNode.z)?((" debug-message-flow-"+sourceNode.z+((filter&&(activeWorkspace!==sourceNode.z))?" hide":""))):"");
        var metaRow = $('<div class="debug-message-meta"></div>').appendTo(msg);
        $('<span class="debug-message-date">'+ getTimestamp()+'</span>').appendTo(metaRow);
        if (sourceNode) {
            $('<a>',{href:"#",class:"debug-message-name"}).html('node: '+sourceNode.id)
            .appendTo(metaRow)
            .click(function(evt) {
                evt.preventDefault();
                config.messageSourceClick(sourceNode.id);
            });
        } else if (name) {
            $('<span class="debug-message-name">'+name+'</span>').appendTo(metaRow);
        }
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
            $('<span class="debug-message-topic">'+
                (o.topic?topic+' : ':'')+
                (o.property?'msg.'+property:'msg')+" : "+format+
                '</span>').appendTo(metaRow);
        }
        if (format === 'Object' || /^array/.test(format) || format === 'boolean' || format === 'number'||/error/i.test(format) ) {
            payload = JSON.parse(payload);
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
        RED.utils.createObjectElement(payload,/*true*/null,format).appendTo(el);
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

        if (messages.length === 100) {
            m = messages.shift();
            if (view === "list") {
                m.el.remove();
            }
        }
        if (atBottom) {
            messageList.scrollTop(sbc.scrollHeight);
        }
    }

    var breakpoints = {};

    function getBreakpointKey(node,portType,portIndex) {
        return (node.id+"_"+portType+"_"+portIndex).replace(/\./,"_");
    }
    function toggleBreakpoint(node,portType,portIndex) {
        if (!debuggerEnabled) {
            return false;
        }
        var key = getBreakpointKey(node,portType,portIndex);
        if (breakpoints.hasOwnProperty(key)) {
            node.dirty = true;
            if (breakpoints[key].disabled) {
                delete breakpoints[key].disabled;
                $("#breakpoint_"+key).prop('checked',true);
                refreshBreakpointCount();
                return true;
            } else {
                breakpointList.editableList('removeItem',breakpoints[key]);
                delete breakpoints[key];
                return false;
            }
        } else {
            breakpoints[key] = {
                key: key,
                node: node,
                portType: portType,
                portIndex: portIndex
            }
            breakpointList.editableList('addItem',breakpoints[key]);
            node.dirty = true;
            return true;
        }
    }
    function checkBreakpoint(node,portType,portIndex) {
        var key = getBreakpointKey(node,portType,portIndex);
        return debuggerEnabled && breakpoints.hasOwnProperty(key) && !breakpoints[key].disabled;
    }
    function refreshBreakpointCount() {
        var total = 0;
        var checked = 0;
        breakpointList.find('.debug-dbgr-breakpoint').each(function() {
            total++;
            if ($(this).is(":checked")) {
                checked++;
            }
        });
        var label = "";
        if (total > 0) {
            if (total === checked) {
                label = total;
            } else {
                label = checked+"/"+total;
            }
        }
        $("#debug-dbgr-breakpoint-count").html(label);

    }


    return {
        init: init,
        refreshMessageList:refreshMessageList,
        handleDebugMessage: handleDebugMessage,
        toggleBreakpoint: toggleBreakpoint,
        checkBreakpoint: checkBreakpoint
    }
})();
