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
    var filter = false;
    var view = 'list';
    var messages = [];
    var messagesByNode = {};
    var sbc;
    var activeWorkspace;

    function init(_config) {
        config = _config;

        var content = $("<div>").css({"position":"relative","height":"100%"});
        var toolbar = $('<div class="sidebar-header">'+
            '<span class="button-group"><a id="debug-tab-filter" class="sidebar-header-button" href="#"><i class="fa fa-filter"></i></a></span>'+
            '<span class="button-group"><a id="debug-tab-clear" title="clear log" class="sidebar-header-button" href="#"><i class="fa fa-trash"></i></a></span></div>').appendTo(content);


        var footerToolbar = $('<div>'+
            // '<span class="button-group">'+
            //     '<a class="sidebar-footer-button-toggle text-button selected" id="debug-tab-view-list" href="#"><span data-i18n="">list</span></a>'+
            //     '<a class="sidebar-footer-button-toggle text-button" id="debug-tab-view-table" href="#"><span data-i18n="">table</span></a> '+
            // '</span>'+
            '<span class="button-group"><a id="debug-tab-open" title="open in new window" class="sidebar-footer-button" href="#"><i class="fa fa-desktop"></i></a></span> ' +
            '</div>');

        messageList = $('<div class="debug-content debug-content-list"/>').appendTo(content);
        sbc = messageList[0];
        messageTable = $('<div class="debug-content  debug-content-table hide"/>').appendTo(content);

        var filterDialog = $('<div class="debug-filter-box hide">'+
            '<div class="debug-filter-row">'+
            '<span class="button-group">'+
                '<a class="sidebar-header-button-toggle selected" id="debug-tab-filter-all" href="#"><span data-i18n="node-red:debug.sidebar.filterAll">all flows</span></a>'+
                '<a class="sidebar-header-button-toggle" id="debug-tab-filter-current" href="#"><span data-i18n="node-red:debug.sidebar.filterCurrent">current flow</span></a> '+
            '</span>'+
            '</div>'+
        '</div>').appendTo(content);

        try {
            content.i18n();
        } catch(err) {
            console.log("TODO: i18n library support");
        }


        filterDialog.find('#debug-tab-filter-all').on("click",function(e) {
            e.preventDefault();
            if (filter) {
                $(this).addClass('selected');
                $('#debug-tab-filter-current').removeClass('selected');
                filter = !filter;
                refreshMessageList();
            }
        });
        filterDialog.find('#debug-tab-filter-current').on("click",function(e) {
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
        var payload = o.msg;
        var format = sanitize((o.format||"").toString());
        msg.className = 'debug-message'+(o.level?(' debug-message-level-'+o.level):'') +
        ((sourceNode&&sourceNode.z)?((" debug-message-flow-"+sourceNode.z+((filter&&(activeWorkspace!==sourceNode.z))?" hide":""))):"");
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
        if (format === 'Object' || /^array/.test(format) || format === 'boolean' || format === 'number' ) {
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
    return {
        init: init,
        refreshMessageList:refreshMessageList,
        handleDebugMessage: handleDebugMessage
    }
})();
