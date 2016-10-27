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

    /**
     * messageMouseEnter
     * messageMouseLeave
     * messageSourceClick
     * clear
     *
     */
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
            console.log()
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



    function buildMessageElement(obj,topLevel,typeHint) {
        var i;
        var e;
        var entryObj;
        var header;
        var headerHead;
        var value;
        var element = $('<span class="debug-message-element"></span>').toggleClass('collapsed',topLevel);
        if (Array.isArray(obj)) {
            var length = Math.min(obj.length,10);
            if (!topLevel) {
                header = $('<span class="debug-message-type-meta"></span>').html(typeHint||('array['+obj.length+']')).appendTo(element);
            } else {
                header = $('<span>').appendTo(element);
                if (length > 0) {
                    $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').prependTo(header);
                    header.addClass("debug-message-expandable");
                    header.click(function(e) {
                        $(this).parent().toggleClass('collapsed');
                        //e.stopPropagation();
                        e.preventDefault();
                    });
                }
                $('<span class="debug-message-type-meta debug-message-object-type-header"></span>').html(typeHint||('array['+obj.length+']')).appendTo(header);
                headerHead = $('<span class="debug-message-object-header"></span>').appendTo(header);
                $('<span>[ </span>').appendTo(headerHead);
            }
            for (i=0;i<length;i++) {
                if (topLevel) {
                    value = obj[i];
                    if (Array.isArray(value)) {
                        $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('array['+value.length+']').appendTo(headerHead);
                    } else if (value === null) {
                        $('<span class="debug-message-object-value debug-message-type-null">null</span>').appendTo(headerHead);
                    } else if (typeof value === 'object') {
                        if (value.hasOwnProperty('type') && value.type === 'Buffer' && value.hasOwnProperty('data')) {
                            $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('buffer['+value.data.length+']').appendTo(headerHead);
                        } else {
                            $('<span class="debug-message-object-value debug-message-type-meta">object</span>').appendTo(headerHead);
                        }
                    } else if (typeof value === 'string') {
                        $('<span class="debug-message-object-value debug-message-type-string"></span>').text('"'+value+'"').appendTo(headerHead);
                    } else {
                        $('<span class="debug-message-object-value debug-message-type-other"></span>').text(""+value).appendTo(headerHead);
                    }
                    if (i < length -1) {
                        $('<span>, </span>').appendTo(headerHead);
                    }
                }
                entryObj = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(element);
                header = $('<span></span>').appendTo(entryObj);
                if (typeof obj[i] === 'object' && obj[i] !== null) {
                    $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').appendTo(header);
                    header.addClass("debug-message-expandable");
                    header.click(function(e) {
                        $(this).parent().toggleClass('collapsed');
                        //e.stopPropagation();
                        e.preventDefault();
                    });
                }
                $('<span class="debug-message-object-key"></span>').text(i).appendTo(header);
                $('<span>: </span>').appendTo(entryObj);
                e = $('<span class="debug-message-object-value"></span>').appendTo(entryObj);
                buildMessageElement(obj[i],false).appendTo(e);
            }
            if (length < obj.length) {
                if (topLevel) {
                    $('<span> ...</span>').appendTo(headerHead);
                }
                $('<div class="debug-message-object-entry"><span class="debug-message-object-key">...</span></div>').appendTo(element);
            }
            if (topLevel) {
                if (length === 0) {
                    $('<span class="debug-message-type-meta">empty</span>').appendTo(headerHead);
                }
                $('<span> ]</span>').appendTo(headerHead);
            }
        } else if (obj === null || obj === undefined) {
            $('<span class="debug-message-object-value debug-message-type-null">'+obj+'</span>').appendTo(element);
        } else if (typeof obj === 'object') {
            if (obj.hasOwnProperty('type') && obj.type === 'Buffer' && obj.hasOwnProperty('data')) {
                buildMessageElement(obj.data,false,'buffer['+obj.data.length+']').appendTo(element);

            } else {
                var keys = Object.keys(obj);
                if (topLevel) {
                    header = $('<span>').appendTo(element);
                    if (keys.length > 0) {
                        $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').prependTo(header);
                        header.addClass("debug-message-expandable");
                        header.click(function(e) {
                            $(this).parent().toggleClass('collapsed');
                            //e.stopPropagation();
                            e.preventDefault();
                        });
                    }
                } else {
                    header = $('<span class="debug-message-type-meta"></span>').html('object').appendTo(element);
                }
                if (topLevel) {
                    $('<span class="debug-message-type-meta debug-message-object-type-header"></span>').html('object').appendTo(header);
                    headerHead = $('<span class="debug-message-object-header"></span>').appendTo(header);
                    $('<span>{ </span>').appendTo(headerHead);
                }
                for (i=0;i<keys.length;i++) {
                    if (topLevel) {
                        if (i < 5) {
                            $('<span class="debug-message-object-key"></span>').text(keys[i]).appendTo(headerHead);
                            $('<span>: </span>').appendTo(headerHead);
                            value = obj[keys[i]];
                            if (Array.isArray(value)) {
                                $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('array['+value.length+']').appendTo(headerHead);
                            } else if (value === null) {
                                $('<span class="debug-message-object-value debug-message-type-null">null</span>').appendTo(headerHead);
                            } else if (typeof value === 'object') {
                                if (value.hasOwnProperty('type') && value.type === 'Buffer' && value.hasOwnProperty('data')) {
                                    $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('buffer['+value.data.length+']').appendTo(headerHead);
                                } else {
                                    $('<span class="debug-message-object-value debug-message-type-meta">object</span>').appendTo(headerHead);
                                }
                            } else if (typeof value === 'string') {
                                var subvalue = value;
                                if (subvalue.length > 20) {
                                    subvalue = subvalue.substring(0,50)+"...";
                                }
                                $('<span class="debug-message-object-value debug-message-type-string"></span>').text('"'+subvalue+'"').appendTo(headerHead);
                            } else {
                                $('<span class="debug-message-object-value debug-message-type-other"></span>').text(""+value).appendTo(headerHead);
                            }
                            if (i < keys.length -1) {
                                $('<span>, </span>').appendTo(headerHead);
                            }
                        }
                        if (i === 5) {
                            $('<span> ...</span>').appendTo(headerHead);
                        }
                    }
                    entryObj = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(element);
                    var entryHeader = $('<span></span>').appendTo(entryObj);
                    if (typeof obj[keys[i]] === 'object' && obj[keys[i]] !== null) {
                        $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').appendTo(entryHeader);
                        entryHeader.addClass("debug-message-expandable");
                        entryHeader.click(function(e) {
                            $(this).parent().toggleClass('collapsed');
                            //e.stopPropagation();
                            e.preventDefault();
                        });
                    }
                    $('<span class="debug-message-object-key"></span>').text(keys[i]).appendTo(entryHeader);
                    $('<span>: </span>').appendTo(entryHeader);
                    e = $('<span class="debug-message-object-value"></span>').appendTo(entryObj);
                    buildMessageElement(obj[keys[i]],false).appendTo(e);
                }
                if (keys.length === 0) {
                    $('<div class="debug-message-object-entry debug-message-type-meta collapsed"></div>').text("empty").appendTo(element);
                }
                if (topLevel) {
                    if (keys.length === 0) {
                        $('<span class="debug-message-type-meta">empty</span>').appendTo(headerHead);
                    }
                    $('<span> }</span>').appendTo(headerHead);
                }
            }
        } else if (typeof obj === 'string') {
            $('<span class="debug-message-object-value debug-message-type-string"></span>').text('"'+obj+'"').appendTo(element);
        } else {
            $('<span class="debug-message-object-value debug-message-type-other"></span>').text(""+obj).appendTo(element);
        }
        return element;
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
        $('<span class="debug-message-date">'+ getTimestamp()+'</span>').appendTo(msg);
        if (sourceNode) {
            $('<a>',{href:"#",class:"debug-message-name"}).html('node: '+sourceNode.id)
            .appendTo(msg)
            .click(function(evt) {
                evt.preventDefault();
                config.messageSourceClick(sourceNode.id);
            });
        } else if (name) {
            $('<span class="debug-message-name">'+name+'</span>').appendTo(msg);
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
            $('<span class="debug-message-topic">function : (' + errorLvlType + ')</span>').appendTo(msg);
        } else {
            $('<span class="debug-message-topic">'+
            (o.topic?topic+' : ':'')+
            (o.property?'msg.'+property:'msg')+" : "+format+
            '</span>').appendTo(msg);
        }
        if (format === 'Object' || /^array/.test(format) || format === 'boolean' || format === 'number' ) {
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
        buildMessageElement(payload,true,format).appendTo(el);
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
            var m = messages.shift();
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
        buildMessageElement: buildMessageElement,
        refreshMessageList:refreshMessageList,
        handleDebugMessage: handleDebugMessage
    }
})();
