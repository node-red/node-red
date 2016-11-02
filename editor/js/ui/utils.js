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

RED.utils = (function() {

    function formatString(str) {
        return str.replace(/\r?\n/g,"&crarr;").replace(/\t/g,"&rarr;");
    }

    function buildMessageSummaryValue(value) {
        var result;
        if (Array.isArray(value)) {
            result = $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('array['+value.length+']');
        } else if (value === null) {
            result = $('<span class="debug-message-object-value debug-message-type-null">null</span>');
        } else if (typeof value === 'object') {
            if (value.hasOwnProperty('type') && value.type === 'Buffer' && value.hasOwnProperty('data')) {
                result = $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('buffer['+value.data.length+']');
            } else if (value.hasOwnProperty('type') && value.type === 'array' && value.hasOwnProperty('data')) {
                result = $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('array['+value.length+']');
            } else {
                result = $('<span class="debug-message-object-value debug-message-type-meta">object</span>');
            }
        } else if (typeof value === 'string') {
            subvalue = value;
            if (subvalue.length > 30) {
                subvalue = subvalue.substring(0,30)+"&hellip;";
            }
            result = $('<span class="debug-message-object-value debug-message-type-string"></span>').html('"'+formatString(subvalue)+'"');
        } else {
            result = $('<span class="debug-message-object-value debug-message-type-other"></span>').text(""+value);
        }
        return result;
    }
    function makeExpandable(el,onexpand) {
        el.addClass("debug-message-expandable");
        el.click(function(e) {
            var parent = $(this).parent();
            if (parent.hasClass('collapsed')) {
                if (onexpand && !parent.hasClass('built')) {
                    onexpand();
                    parent.addClass('built');
                }
                parent.removeClass('collapsed');
            } else {
                parent.addClass('collapsed');
            }
            e.preventDefault();
        });
    }

    function buildMessageElement(obj,key,typeHint,hideKey) {
        var i;
        var e;
        var entryObj;
        var header;
        var headerHead;
        var value,subvalue;
        var element = $('<span class="debug-message-element"></span>');
        if (!key) {
            element.addClass("debug-message-top-level");
        }

        header = $('<span></span>').appendTo(element);

        if (key && !hideKey) {
            $('<span class="debug-message-object-key"></span>').text(key).appendTo(header);
            $('<span>: </span>').appendTo(header);
        }
        entryObj = $('<span class="debug-message-object-value"></span>').appendTo(header);

        var isArray = Array.isArray(obj);
        var isArrayObject = false;
        if (obj && typeof obj === 'object' && obj.hasOwnProperty('type') && obj.hasOwnProperty('data')) {
            isArray = true;
            isArrayObject = true;
        }

        if (obj === null || obj === undefined) {
            $('<span class="debug-message-type-null">'+obj+'</span>').appendTo(entryObj);
        } else if (typeof obj === 'string') {
            element.addClass('collapsed');
            $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').prependTo(header);
            $('<span class="debug-message-type-string debug-message-object-header"></span>').html('"'+formatString(obj)+'"').appendTo(entryObj);
            makeExpandable(header, function() {
                $('<span class="debug-message-type-meta debug-message-object-type-header"></span>').html(typeHint||'string').appendTo(header);
                var row = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(element);
                $('<pre class="debug-message-type-string"></pre>').html(obj).appendTo(row);
            });


        } else if (typeof obj === 'number') {
            e = $('<span class="debug-message-type-number"></span>').text(""+obj).appendTo(entryObj);
            e.click(function(evt) {
                var format = $(this).data('format');
                if (format === 'hex') {
                    $(this).text(""+obj).data('format','dec');
                } else {
                    $(this).text("0x"+(obj).toString(16)).data('format','hex');
                }
                evt.preventDefault();
            });
        } else if (isArray) {
            element.addClass('collapsed');

            var originalLength = obj.length;
            if (typeHint) {
                var m = /\[(\d+)\]/.exec(typeHint);
                if (m) {
                    originalLength = parseInt(m[1]);
                }
            }
            var data = obj;
            var type = 'array';
            if (isArrayObject) {
                data = obj.data;
                if (originalLength === undefined) {
                    originalLength = data.length;
                }
                type = obj.type.toLowerCase();
            } else if (/buffer/.test(typeHint)) {
                type = 'buffer';
            }
            var fullLength = data.length;

            if (originalLength > 0) {
                $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').prependTo(header);
                var arrayRows = $('<div class="debug-message-array-rows"></div>').appendTo(element);
                element.addClass('debug-message-buffer-raw');
                makeExpandable(header,function() {
                    if (!key) {
                        headerHead = $('<span class="debug-message-type-meta debug-message-object-type-header"></span>').html(typeHint||(type+'['+originalLength+']')).appendTo(header);
                    }
                    if (type === 'buffer') {
                        var stringRow = $('<div class="debug-message-string-rows"></div>').appendTo(element);
                        var sr = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(stringRow);
                        var stringEncoding = "";
                        try {
                            stringEncoding = String.fromCharCode.apply(null, new Uint16Array(data))
                        } catch(err) {
                            console.log(err);
                        }
                        $('<pre class="debug-message-type-string"></pre>').html(stringEncoding).appendTo(sr);
                        var bufferOpts = $('<span class="debug-message-buffer-opts"></span>').appendTo(headerHead);
                        $('<a href="#"></a>').addClass('selected').html('raw').appendTo(bufferOpts).click(function(e) {
                            if ($(this).text() === 'raw') {
                                $(this).text('string');
                                element.addClass('debug-message-buffer-string').removeClass('debug-message-buffer-raw');
                            } else {
                                $(this).text('raw');
                                element.removeClass('debug-message-buffer-string').addClass('debug-message-buffer-raw');
                            }
                            e.preventDefault();
                            e.stopPropagation();
                        })
                    }
                    var row;
                    if (fullLength <= 10) {
                        for (i=0;i<fullLength;i++) {
                            row = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(arrayRows);
                            buildMessageElement(data[i],""+i,false).appendTo(row);
                        }
                    } else {
                        for (i=0;i<fullLength;i+=10) {
                            var minRange = i;
                            row = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(arrayRows);
                            header = $('<span></span>').appendTo(row);
                            $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').appendTo(header);
                            makeExpandable(header, (function() {
                                var min = minRange;
                                var max = Math.min(fullLength-1,(minRange+9));
                                var parent = row;
                                return function() {
                                    for (var i=min;i<=max;i++) {
                                        var row = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(parent);
                                        buildMessageElement(data[i],""+i,false).appendTo(row);
                                    }
                                }
                            })());
                            $('<span class="debug-message-object-key"></span>').html("["+minRange+" &hellip; "+Math.min(fullLength-1,(minRange+9))+"]").appendTo(header);
                        }
                        if (fullLength < originalLength) {
                             $('<div class="debug-message-object-entry collapsed"><span class="debug-message-object-key">['+fullLength+' &hellip; '+originalLength+']</span></div>').appendTo(arrayRows);
                        }
                    }
                });
            }
            if (key) {
                headerHead = $('<span class="debug-message-type-meta f"></span>').html(typeHint||(type+'['+originalLength+']')).appendTo(entryObj);
            } else {
                headerHead = $('<span class="debug-message-object-header"></span>').appendTo(entryObj);
                $('<span>[ </span>').appendTo(headerHead);
                var arrayLength = Math.min(originalLength,10);
                for (i=0;i<arrayLength;i++) {
                    buildMessageSummaryValue(data[i]).appendTo(headerHead);
                    if (i < arrayLength-1) {
                        $('<span>, </span>').appendTo(headerHead);
                    }
                }
                if (originalLength > arrayLength) {
                    $('<span> &hellip;</span>').appendTo(headerHead);
                }
                if (arrayLength === 0) {
                    $('<span class="debug-message-type-meta">empty</span>').appendTo(headerHead);
                }
                $('<span> ]</span>').appendTo(headerHead);
            }

        } else if (typeof obj === 'object') {
            element.addClass('collapsed');
            var keys = Object.keys(obj);
            if (key || keys.length > 0) {
                $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').prependTo(header);
                makeExpandable(header, function() {
                    if (!key) {
                        $('<span class="debug-message-type-meta debug-message-object-type-header"></span>').html('object').appendTo(header);
                    }
                    for (i=0;i<keys.length;i++) {
                        var row = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(element);
                        buildMessageElement(obj[keys[i]],keys[i],false).appendTo(row);
                    }
                    if (keys.length === 0) {
                        $('<div class="debug-message-object-entry debug-message-type-meta collapsed"></div>').text("empty").appendTo(element);
                    }
                });
            }
            if (key) {
                $('<span class="debug-message-type-meta"></span>').html('object').appendTo(entryObj);
            } else {
                headerHead = $('<span class="debug-message-object-header"></span>').appendTo(entryObj);
                $('<span>{ </span>').appendTo(headerHead);
                var keysLength = Math.min(keys.length,5);
                for (i=0;i<keysLength;i++) {
                    $('<span class="debug-message-object-key"></span>').text(keys[i]).appendTo(headerHead);
                    $('<span>: </span>').appendTo(headerHead);
                    buildMessageSummaryValue(obj[keys[i]]).appendTo(headerHead);
                    if (i < keysLength-1) {
                        $('<span>, </span>').appendTo(headerHead);
                    }
                }
                if (keys.length > keysLength) {
                    $('<span> &hellip;</span>').appendTo(headerHead);
                }
                if (keysLength === 0) {
                    $('<span class="debug-message-type-meta">empty</span>').appendTo(headerHead);
                }
                $('<span> }</span>').appendTo(headerHead);
            }
        } else {
            $('<span class="debug-message-type-other"></span>').text(""+obj).appendTo(entryObj);
        }
        return element;
    }

    return {
        createObjectElement: buildMessageElement,
    }
})();
