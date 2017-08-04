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

RED.utils = (function() {

    function formatString(str) {
        return str.replace(/\r?\n/g,"&crarr;").replace(/\t/g,"&rarr;");
    }
    function sanitize(m) {
        return m.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    function buildMessageSummaryValue(value) {
        var result;
        if (Array.isArray(value)) {
            result = $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('array['+value.length+']');
        } else if (value === null) {
            result = $('<span class="debug-message-object-value debug-message-type-null">null</span>');
        } else if (typeof value === 'object') {
            if (value.hasOwnProperty('type') && value.type === 'Buffer' && value.hasOwnProperty('data')) {
                result = $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('buffer['+value.length+']');
            } else if (value.hasOwnProperty('type') && value.type === 'array' && value.hasOwnProperty('data')) {
                result = $('<span class="debug-message-object-value debug-message-type-meta"></span>').html('array['+value.length+']');
            } else {
                result = $('<span class="debug-message-object-value debug-message-type-meta">object</span>');
            }
        } else if (typeof value === 'string') {
            var subvalue;
            if (value.length > 30) {
                subvalue = sanitize(value.substring(0,30))+"&hellip;";
            } else {
                subvalue = sanitize(value);
            }
            result = $('<span class="debug-message-object-value debug-message-type-string"></span>').html('"'+formatString(subvalue)+'"');
        } else {
            result = $('<span class="debug-message-object-value debug-message-type-other"></span>').text(""+value);
        }
        return result;
    }
    function makeExpandable(el,onbuild,ontoggle,expand) {
        el.addClass("debug-message-expandable");
        el.prop('toggle',function() {
            return function(state) {
                var parent = el.parent();
                if (parent.hasClass('collapsed')) {
                    if (state) {
                        if (onbuild && !parent.hasClass('built')) {
                            onbuild();
                            parent.addClass('built');
                        }
                        parent.removeClass('collapsed');
                        return true;
                    }
                } else {
                    if (!state) {
                        parent.addClass('collapsed');
                        return true;
                    }
                }
                return false;
            }
        });
        el.click(function(e) {
            var parent = $(this).parent();
            var currentState = !parent.hasClass('collapsed');
            if ($(this).prop('toggle')(!currentState)) {
                if (ontoggle) {
                    ontoggle(!currentState);
                }
            }
            // if (parent.hasClass('collapsed')) {
            //     if (onbuild && !parent.hasClass('built')) {
            //         onbuild();
            //         parent.addClass('built');
            //     }
            //     if (ontoggle) {
            //         ontoggle(true);
            //     }
            //     parent.removeClass('collapsed');
            // } else {
            //     parent.addClass('collapsed');
            //     if (ontoggle) {
            //         ontoggle(false);
            //     }
            // }
            e.preventDefault();
        });
        if (expand) {
            el.click();
        }

    }

    var pinnedPaths = {};
    var formattedPaths = {};

    function addMessageControls(obj,sourceId,key,msg,rootPath,strippedKey) {
        if (!pinnedPaths.hasOwnProperty(sourceId)) {
            pinnedPaths[sourceId] = {}
        }
        var tools = $('<span class="debug-message-tools"></span>').appendTo(obj);
        var copyTools = $('<span class="debug-message-tools-copy button-group"></span>').appendTo(tools);
        if (!!key) {
            var copyPath = $('<button class="editor-button editor-button-small"><i class="fa fa-terminal"></i></button>').appendTo(copyTools).click(function(e) {
                e.preventDefault();
                e.stopPropagation();
                RED.clipboard.copyText(key,copyPath,"clipboard.copyMessagePath");
            })
        }
        var copyPayload = $('<button class="editor-button editor-button-small"><i class="fa fa-clipboard"></i></button>').appendTo(copyTools).click(function(e) {
            e.preventDefault();
            e.stopPropagation();
            RED.clipboard.copyText(msg,copyPayload,"clipboard.copyMessageValue");
        })
        if (strippedKey !== '') {
            var isPinned = pinnedPaths[sourceId].hasOwnProperty(strippedKey);

            var pinPath = $('<button class="editor-button editor-button-small debug-message-tools-pin"><i class="fa fa-map-pin"></i></button>').appendTo(tools).click(function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (pinnedPaths[sourceId].hasOwnProperty(strippedKey)) {
                    delete pinnedPaths[sourceId][strippedKey];
                    $(this).removeClass("selected");
                    obj.removeClass("debug-message-row-pinned");
                } else {
                    var rootedPath = "$"+(strippedKey[0] === '['?"":".")+strippedKey;
                    pinnedPaths[sourceId][strippedKey] = normalisePropertyExpression(rootedPath);
                    $(this).addClass("selected");
                    obj.addClass("debug-message-row-pinned");
                }
            }).toggleClass("selected",isPinned);
            obj.toggleClass("debug-message-row-pinned",isPinned);
        }
    }
    function checkExpanded(strippedKey,expandPaths,minRange,maxRange) {
        if (expandPaths && expandPaths.length > 0) {
            if (strippedKey === '' && minRange === undefined) {
                return true;
            }
            for (var i=0;i<expandPaths.length;i++) {
                var p = expandPaths[i];
                if (p.indexOf(strippedKey) === 0 && (p[strippedKey.length] === "." ||  p[strippedKey.length] === "[") ) {

                    if (minRange !== undefined && p[strippedKey.length] === "[") {
                        var subkey = p.substring(strippedKey.length);
                        var m = (/\[(\d+)\]/.exec(subkey));
                        if (m) {
                            var index = parseInt(m[1]);
                            return minRange<=index && index<=maxRange;
                        }
                    } else {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    function formatNumber(element,obj,sourceId,path,cycle,initialFormat) {
        var format = (formattedPaths[sourceId] && formattedPaths[sourceId][path]) || initialFormat || "dec";
        if (cycle) {
            if (format === 'dec') {
                if ((obj.toString().length===13) && (obj<=2147483647000)) {
                    format = 'dateMS';
                } else if ((obj.toString().length===10) && (obj<=2147483647)) {
                    format = 'dateS';
                } else {
                    format = 'hex'
                }
            } else if (format === 'dateMS' || format == 'dateS') {
                format = 'hex';
            } else {
                format = 'dec';
            }
            formattedPaths[sourceId] = formattedPaths[sourceId]||{};
            formattedPaths[sourceId][path] = format;
        } else if (initialFormat !== undefined){
            formattedPaths[sourceId] = formattedPaths[sourceId]||{};
            formattedPaths[sourceId][path] = format;
        }
        if (format === 'dec') {
            element.text(""+obj);
        } else if (format === 'dateMS') {
            element.text((new Date(obj)).toISOString());
        } else if (format === 'dateS') {
            element.text((new Date(obj*1000)).toISOString());
        } else if (format === 'hex') {
            element.text("0x"+(obj).toString(16));
        }
    }

    function formatBuffer(element,button,sourceId,path,cycle) {
        var format = (formattedPaths[sourceId] && formattedPaths[sourceId][path]) || "raw";
        if (cycle) {
            if (format === 'raw') {
                format = 'string';
            } else {
                format = 'raw';
            }
            formattedPaths[sourceId] = formattedPaths[sourceId]||{};
            formattedPaths[sourceId][path] = format;
        }
        if (format === 'raw') {
            button.text('raw');
            element.removeClass('debug-message-buffer-string').addClass('debug-message-buffer-raw');
        } else if (format === 'string') {
            button.text('string');
            element.addClass('debug-message-buffer-string').removeClass('debug-message-buffer-raw');
        }
    }

    function buildMessageElement(obj,options) {
        options = options || {};
        var key = options.key;
        var typeHint = options.typeHint;
        var hideKey = options.hideKey;
        var path = options.path;
        var sourceId = options.sourceId;
        var rootPath = options.rootPath;
        var expandPaths = options.expandPaths;
        var ontoggle = options.ontoggle;
        var exposeApi = options.exposeApi;

        var subElements = {};
        var i;
        var e;
        var entryObj;
        var expandableHeader;
        var header;
        var headerHead;
        var value;
        var strippedKey;
        if (path !== undefined && rootPath !== undefined) {
             strippedKey = path.substring(rootPath.length+(path[rootPath.length]==="."?1:0));
        }
        var element = $('<span class="debug-message-element"></span>');
        element.collapse = function() {
            element.find(".debug-message-expandable").parent().addClass("collapsed");
        }
        header = $('<span class="debug-message-row"></span>').appendTo(element);
        if (sourceId) {
            addMessageControls(header,sourceId,path,obj,rootPath,strippedKey);
        }
        if (!key) {
            element.addClass("debug-message-top-level");
            if (sourceId) {
                var pinned = pinnedPaths[sourceId];
                expandPaths = [];
                if (pinned) {
                    for (var pinnedPath in pinned) {
                        if (pinned.hasOwnProperty(pinnedPath)) {
                            try {
                                var res = getMessageProperty({$:obj},pinned[pinnedPath]);
                                if (res !== undefined) {
                                    expandPaths.push(pinnedPath);
                                }
                            } catch(err) {
                            }
                        }
                    }
                    expandPaths.sort();
                }
                element.clearPinned = function() {
                    element.find(".debug-message-row-pinned").removeClass("debug-message-row-pinned");
                    pinnedPaths[sourceId] = {};
                }
            }
        } else {
            if (!hideKey) {
                $('<span class="debug-message-object-key"></span>').text(key).appendTo(header);
                $('<span>: </span>').appendTo(header);
            }
        }
        entryObj = $('<span class="debug-message-object-value"></span>').appendTo(header);

        var isArray = Array.isArray(obj);
        var isArrayObject = false;
        if (obj && typeof obj === 'object' && obj.hasOwnProperty('type') && obj.hasOwnProperty('data') && ((obj.__encoded__ && obj.type === 'array') || obj.type === 'Buffer')) {
            isArray = true;
            isArrayObject = true;
        }

        if (obj === null || obj === undefined) {
            $('<span class="debug-message-type-null">'+obj+'</span>').appendTo(entryObj);
        } else if (typeof obj === 'string') {
            if (/[\t\n\r]/.test(obj)) {
                element.addClass('collapsed');
                $('<i class="fa fa-caret-right debug-message-object-handle"></i> ').prependTo(header);
                makeExpandable(header, function() {
                    $('<span class="debug-message-type-meta debug-message-object-type-header"></span>').html(typeHint||'string').appendTo(header);
                    var row = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(element);
                    $('<pre class="debug-message-type-string"></pre>').text(obj).appendTo(row);
                },function(state) {if (ontoggle) { ontoggle(path,state);}}, checkExpanded(strippedKey,expandPaths));
            }
            e = $('<span class="debug-message-type-string debug-message-object-header"></span>').html('"'+formatString(sanitize(obj))+'"').appendTo(entryObj);
            if (/^#[0-9a-f]{6}$/i.test(obj)) {
                $('<span class="debug-message-type-string-swatch"></span>').css('backgroundColor',obj).appendTo(e);
            }

        } else if (typeof obj === 'number') {
            e = $('<span class="debug-message-type-number"></span>').appendTo(entryObj);

            if (Number.isInteger(obj) && (obj >= 0)) { // if it's a +ve integer
                e.addClass("debug-message-type-number-toggle");
                e.click(function(evt) {
                    evt.preventDefault();
                    formatNumber($(this), obj, sourceId, path, true);
                });
            }
            formatNumber(e,obj,sourceId,path,false,typeHint==='hex'?'hex':undefined);

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
                if (data.__encoded__) {
                    data = data.data;
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
            }
            if (key) {
                headerHead = $('<span class="debug-message-type-meta"></span>').html(typeHint||(type+'['+originalLength+']')).appendTo(entryObj);
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
            if (originalLength > 0) {

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
                        $('<pre class="debug-message-type-string"></pre>').text(stringEncoding).appendTo(sr);
                        var bufferOpts = $('<span class="debug-message-buffer-opts"></span>').appendTo(headerHead);
                        var switchFormat = $('<a href="#"></a>').addClass('selected').html('raw').appendTo(bufferOpts).click(function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            formatBuffer(element,$(this),sourceId,path,true);
                        });
                        formatBuffer(element,switchFormat,sourceId,path,false);

                    }
                    var row;
                    if (fullLength <= 10) {
                        for (i=0;i<fullLength;i++) {
                            row = $('<div class="debug-message-object-entry collapsed"></div>').appendTo(arrayRows);
                            subElements[path+"["+i+"]"] = buildMessageElement(
                                data[i],
                                {
                                    key: ""+i,
                                    typeHint: type==='buffer'?'hex':false,
                                    hideKey: false,
                                    path: path+"["+i+"]",
                                    sourceId: sourceId,
                                    rootPath: rootPath,
                                    expandPaths: expandPaths,
                                    ontoggle: ontoggle,
                                    exposeApi: exposeApi
                                }
                            ).appendTo(row);
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
                                        subElements[path+"["+i+"]"] = buildMessageElement(
                                            data[i],
                                            {
                                                key: ""+i,
                                                typeHint: type==='buffer'?'hex':false,
                                                hideKey: false,
                                                path: path+"["+i+"]",
                                                sourceId: sourceId,
                                                rootPath: rootPath,
                                                expandPaths: expandPaths,
                                                ontoggle: ontoggle,
                                                exposeApi: exposeApi

                                            }
                                        ).appendTo(row);
                                    }
                                }
                            })(),
                            (function() { var path = path+"["+i+"]"; return function(state) {if (ontoggle) { ontoggle(path,state);}}})(),
                            checkExpanded(strippedKey,expandPaths,minRange,Math.min(fullLength-1,(minRange+9))));
                            $('<span class="debug-message-object-key"></span>').html("["+minRange+" &hellip; "+Math.min(fullLength-1,(minRange+9))+"]").appendTo(header);
                        }
                        if (fullLength < originalLength) {
                             $('<div class="debug-message-object-entry collapsed"><span class="debug-message-object-key">['+fullLength+' &hellip; '+originalLength+']</span></div>').appendTo(arrayRows);
                        }
                    }
                },
                function(state) {if (ontoggle) { ontoggle(path,state);}},
                checkExpanded(strippedKey,expandPaths));
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
                        var newPath = path;
                        if (newPath) {
                            if (/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(keys[i])) {
                                newPath += (newPath.length > 0?".":"")+keys[i];
                            } else {
                                newPath += "[\""+keys[i].replace(/"/,"\\\"")+"\"]"
                            }
                        }
                        subElements[newPath] = buildMessageElement(
                            obj[keys[i]],
                            {
                                key: keys[i],
                                typeHint: false,
                                hideKey: false,
                                path: newPath,
                                sourceId: sourceId,
                                rootPath: rootPath,
                                expandPaths: expandPaths,
                                ontoggle: ontoggle,
                                exposeApi: exposeApi

                            }
                        ).appendTo(row);
                    }
                    if (keys.length === 0) {
                        $('<div class="debug-message-object-entry debug-message-type-meta collapsed"></div>').text("empty").appendTo(element);
                    }
                },
                function(state) {if (ontoggle) { ontoggle(path,state);}},
                checkExpanded(strippedKey,expandPaths));
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
        if (exposeApi) {
            element.prop('expand', function() { return function(targetPath, state) {
                if (path === targetPath) {
                    if (header.prop('toggle')) {
                        header.prop('toggle')(state);
                    }
                } else if (subElements[targetPath] && subElements[targetPath].prop('expand') ) {
                    subElements[targetPath].prop('expand')(targetPath,state);
                } else {
                    for (var p in subElements) {
                        if (subElements.hasOwnProperty(p)) {
                            if (targetPath.indexOf(p) === 0) {
                                if (subElements[p].prop('expand') ) {
                                    subElements[p].prop('expand')(targetPath,state);
                                }
                                break;
                            }
                        }
                    }
                }
            }});
        }
        return element;
    }

    function normalisePropertyExpression(str) {
        // This must be kept in sync with validatePropertyExpression
        // in editor/js/ui/utils.js

        var length = str.length;
        if (length === 0) {
            throw new Error("Invalid property expression: zero-length");
        }
        var parts = [];
        var start = 0;
        var inString = false;
        var inBox = false;
        var quoteChar;
        var v;
        for (var i=0;i<length;i++) {
            var c = str[i];
            if (!inString) {
                if (c === "'" || c === '"') {
                    if (i != start) {
                        throw new Error("Invalid property expression: unexpected "+c+" at position "+i);
                    }
                    inString = true;
                    quoteChar = c;
                    start = i+1;
                } else if (c === '.') {
                    if (i===0) {
                        throw new Error("Invalid property expression: unexpected . at position 0");
                    }
                    if (start != i) {
                        v = str.substring(start,i);
                        if (/^\d+$/.test(v)) {
                            parts.push(parseInt(v));
                        } else {
                            parts.push(v);
                        }
                    }
                    if (i===length-1) {
                        throw new Error("Invalid property expression: unterminated expression");
                    }
                    // Next char is first char of an identifier: a-z 0-9 $ _
                    if (!/[a-z0-9\$\_]/i.test(str[i+1])) {
                        throw new Error("Invalid property expression: unexpected "+str[i+1]+" at position "+(i+1));
                    }
                    start = i+1;
                } else if (c === '[') {
                    if (i === 0) {
                        throw new Error("Invalid property expression: unexpected "+c+" at position "+i);
                    }
                    if (start != i) {
                        parts.push(str.substring(start,i));
                    }
                    if (i===length-1) {
                        throw new Error("Invalid property expression: unterminated expression");
                    }
                    // Next char is either a quote or a number
                    if (!/["'\d]/.test(str[i+1])) {
                        throw new Error("Invalid property expression: unexpected "+str[i+1]+" at position "+(i+1));
                    }
                    start = i+1;
                    inBox = true;
                } else if (c === ']') {
                    if (!inBox) {
                        throw new Error("Invalid property expression: unexpected "+c+" at position "+i);
                    }
                    if (start != i) {
                        v = str.substring(start,i);
                        if (/^\d+$/.test(v)) {
                            parts.push(parseInt(v));
                        } else {
                            throw new Error("Invalid property expression: unexpected array expression at position "+start);
                        }
                    }
                    start = i+1;
                    inBox = false;
                } else if (c === ' ') {
                    throw new Error("Invalid property expression: unexpected ' ' at position "+i);
                }
            } else {
                if (c === quoteChar) {
                    if (i-start === 0) {
                        throw new Error("Invalid property expression: zero-length string at position "+start);
                    }
                    parts.push(str.substring(start,i));
                    // If inBox, next char must be a ]. Otherwise it may be [ or .
                    if (inBox && !/\]/.test(str[i+1])) {
                        throw new Error("Invalid property expression: unexpected array expression at position "+start);
                    } else if (!inBox && i+1!==length && !/[\[\.]/.test(str[i+1])) {
                        throw new Error("Invalid property expression: unexpected "+str[i+1]+" expression at position "+(i+1));
                    }
                    start = i+1;
                    inString = false;
                }
            }

        }
        if (inBox || inString) {
            throw new Error("Invalid property expression: unterminated expression");
        }
        if (start < length) {
            parts.push(str.substring(start));
        }
        return parts;
    }

    function validatePropertyExpression(str) {
        try {
            var parts = normalisePropertyExpression(str);
            return true;
        } catch(err) {
            return false;
        }
    }

    function getMessageProperty(msg,expr) {
        var result = null;
        var msgPropParts;

        if (typeof expr === 'string') {
            if (expr.indexOf('msg.')===0) {
                expr = expr.substring(4);
            }
            msgPropParts = normalisePropertyExpression(expr);
        } else {
            msgPropParts = expr;
        }
        var m;
        msgPropParts.reduce(function(obj, key) {
            result = (typeof obj[key] !== "undefined" ? obj[key] : undefined);
            if (result === undefined && obj.hasOwnProperty('type') && obj.hasOwnProperty('data')&& obj.hasOwnProperty('length')) {
                result = (typeof obj.data[key] !== "undefined" ? obj.data[key] : undefined);
            }
            return result;
        }, msg);
        return result;
    }

    function getNodeIcon(def,node) {
        if (def.category === 'config') {
            return "icons/node-red/cog.png"
        } else if (node && node.type === 'tab') {
            return "icons/node-red/subflow.png"
        } else if (node && node.type === 'unknown') {
            return "icons/node-red/alert.png"
        } else if (node && node.type === 'subflow') {
            return "icons/node-red/subflow.png"
        }
        var icon_url;
        if (typeof def.icon === "function") {
            try {
                icon_url = def.icon.call(node);
            } catch(err) {
                console.log("Definition error: "+def.type+".icon",err);
                icon_url = "arrow-in.png";
            }
        } else {
            icon_url = def.icon;
        }
        return "icons/"+def.set.module+"/"+icon_url;
    }

    function getNodeLabel(node,defaultLabel) {
        defaultLabel = defaultLabel||"";
        var l;
        if (node.type === 'tab') {
            l = node.label || defaultLabel
        } else {
            l = node._def.label;
            try {
                l = (typeof l === "function" ? l.call(node) : l)||defaultLabel;
            } catch(err) {
                console.log("Definition error: "+node.type+".label",err);
                l = defaultLabel;
            }
        }
        return RED.text.bidi.enforceTextDirectionWithUCC(l);
    }

    return {
        createObjectElement: buildMessageElement,
        getMessageProperty: getMessageProperty,
        normalisePropertyExpression: normalisePropertyExpression,
        validatePropertyExpression: validatePropertyExpression,
        getNodeIcon: getNodeIcon,
        getNodeLabel: getNodeLabel,
    }
})();
