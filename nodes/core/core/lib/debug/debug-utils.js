
RED.debug = (function() {
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
    return {
        buildMessageElement: buildMessageElement
    }
})();
