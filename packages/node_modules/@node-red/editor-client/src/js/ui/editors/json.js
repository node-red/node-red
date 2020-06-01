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
(function() {


    // var template = '<script type="text/x-red" data-template-name="_json"></script>';
    var template = '<script type="text/x-red" data-template-name="_json">'+
        '<ul id="red-ui-editor-type-json-tabs"></ul>'+
        '<div id="red-ui-editor-type-json-tab-raw" class="red-ui-editor-type-json-tab-content hide">'+
            '<div class="form-row" style="margin-bottom: 3px; text-align: right;">'+
                '<button id="node-input-json-reformat" class="red-ui-button red-ui-button-small"><span data-i18n="jsonEditor.format"></span></button>'+
            '</div>'+
            '<div class="form-row node-text-editor-row">'+
                '<div style="height: 200px;min-height: 150px;" class="node-text-editor" id="node-input-json"></div>'+
            '</div>'+
        '</div>'+
        '<div id="red-ui-editor-type-json-tab-ui" class="red-ui-editor-type-json-tab-content hide">'+
            '<div id="red-ui-editor-type-json-tab-ui-container"></div>'+
        '</div>'+
    '</script>';

    var activeTab;

    function insertNewItem(parent,index,copyIndex) {
        var newValue = "";

        if (parent.children.length > 0) {
            switch (parent.children[Math.max(0,Math.min(parent.children.length-1,copyIndex))].type) {
                case 'string': newValue = ""; break;
                case 'number': newValue = 0; break;
                case 'boolean': newValue = true; break;
                case 'null': newValue = null; break;
                case 'object': newValue = {}; break;
                case 'array': newValue = []; break;
            }
        }
        var newKey;
        if (parent.type === 'array') {
            newKey = parent.children.length;
        } else {
            var usedKeys = {};
            parent.children.forEach(function(child) { usedKeys[child.key] = true })
            var keyRoot = "item";
            var keySuffix = 2;
            newKey = keyRoot;
            while(usedKeys[newKey]) {
                newKey = keyRoot+"-"+(keySuffix++);
            }
        }
        var newItem = handleItem(newKey,newValue,parent.depth+1,parent);
        parent.treeList.insertChildAt(newItem, index, true);
        parent.treeList.expand();
    }
    function showObjectMenu(button,item) {
        var elementPos = button.offset();
        var options = [];
        if (item.parent) {
            options.push({id:"red-ui-editor-type-json-menu-insert-above", icon:"fa fa-toggle-up", label:RED._('jsonEditor.insertAbove'),onselect:function(){
                var index = item.parent.children.indexOf(item);
                insertNewItem(item.parent,index,index);
            }});
            options.push({id:"red-ui-editor-type-json-menu-insert-below", icon:"fa fa-toggle-down", label:RED._('jsonEditor.insertBelow'),onselect:function(){
                var index = item.parent.children.indexOf(item)+1;
                insertNewItem(item.parent,index,index-1);
            }});
        }
        if (item.type === 'array' || item.type === 'object') {
            options.push({id:"red-ui-editor-type-json-menu-add-child", icon:"fa fa-plus", label:RED._('jsonEditor.addItem'),onselect:function(){
                insertNewItem(item,item.children.length,item.children.length-1);
            }});
        }
        if (item.parent) {
            options.push({id:"red-ui-editor-type-json-menu-copy-path", icon:"fa fa-terminal", label:RED._('jsonEditor.copyPath'),onselect:function(){
                var i = item;
                var path = "";
                var newPath;
                while(i.parent) {
                    if (i.parent.type === "array") {
                        newPath = "["+i.key+"]";
                    } else {
                        if (/^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(i.key)) {
                            newPath = i.key;
                        } else {
                            newPath = "[\""+i.key.replace(/"/,"\\\"")+"\"]"
                        }
                    }
                    path = newPath+(path.length>0 && path[0] !== "["?".":"")+path;
                    i = i.parent;
                }
                RED.clipboard.copyText(path,item.element,"clipboard.copyMessagePath");
            }});

            options.push({id:"red-ui-editor-type-json-menu-duplicate", icon:"fa fa-copy", label:RED._("jsonEditor.duplicate"),onselect:function(){
                var newKey = item.key;
                if (item.parent.type === 'array') {
                    newKey = item.parent.children.length;
                } else {
                    var m = /^(.*?)(-(\d+))?$/.exec(newKey);
                    var usedKeys = {};
                    item.parent.children.forEach(function(child) { usedKeys[child.key] = true })
                    var keyRoot = m[1];
                    var keySuffix = 2;
                    if (m[3] !== undefined) {
                        keySuffix = parseInt(m[3]);
                    }
                    newKey = keyRoot;
                    while(usedKeys[newKey]) {
                        newKey = keyRoot+"-"+(keySuffix++);
                    }
                }
                var newItem = handleItem(newKey,convertToObject(item),item.parent.depth+1,item.parent);
                var index = item.parent.children.indexOf(item)+1;

                item.parent.treeList.insertChildAt(newItem, index, true);
                item.parent.treeList.expand();
            }});

            options.push({id:"red-ui-editor-type-json-menu-delete", icon:"fa fa-times", label:RED._('common.label.delete'),onselect:function(){
                item.treeList.remove();
            }});
        }
        if (item.type === 'array' || item.type === 'object') {
            options.push(null)
            options.push({id:"red-ui-editor-type-json-menu-expand-children",icon:"fa fa-angle-double-down", label:RED._('jsonEditor.expandItems'),onselect:function(){
                item.treeList.expand();
                item.children.forEach(function(child) {
                    child.treeList.expand();
                })
            }});
            options.push({id:"red-ui-editor-type-json-menu-collapse-children",icon:"fa fa-angle-double-up", label:RED._('jsonEditor.collapseItems'),onselect:function(){
                item.treeList.collapse();
                item.children.forEach(function(child) {
                    child.treeList.collapse();
                })
            }});
        }

        var menuOptionMenu = RED.menu.init({
            id:"red-ui-editor-type-json-menu",
            options: options
        });
        menuOptionMenu.css({
            position: "absolute"
        })
        menuOptionMenu.on('mouseleave', function(){ $(this).hide() });
        menuOptionMenu.on('mouseup', function() { $(this).hide() });
        menuOptionMenu.appendTo("body");
        var top = elementPos.top;
        var height = menuOptionMenu.height();
        var winHeight = $(window).height();
        if (top+height > winHeight) {
            top -= (top+height)-winHeight + 20;
        }
        menuOptionMenu.css({
            top: top+"px",
            left: elementPos.left+"px"
        })
        menuOptionMenu.show();
    }

    function parseObject(obj,depth,parent) {
        var result = [];
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                result.push(handleItem(prop,obj[prop],depth,parent));
            }
        }
        return result;
    }
    function parseArray(obj,depth,parent) {
        var result = [];
        var l = obj.length;
        for (var i=0;i<l;i++) {
            result.push(handleItem(i,obj[i],depth,parent));
        }
        return result;
    }
    function handleItem(key,val,depth,parent) {
        var item = {depth:depth, type: typeof val};
        var container = $('<span class="red-ui-editor-type-json-editor-label">');
        if (key != null) {
            item.key = key;
            var keyText;
            if (typeof key === 'string') {
                keyText = '"'+key+'"';
            } else {
                keyText = key;
            }
            var keyLabel = $('<span class="red-ui-debug-msg-object-key red-ui-editor-type-json-editor-label-key">').text(keyText).appendTo(container);
            keyLabel.addClass('red-ui-debug-msg-type-'+(typeof key));
            if (parent && parent.type === "array") {
                keyLabel.addClass("red-ui-editor-type-json-editor-label-array-key")
            }

            keyLabel.on("click", function(evt) {
                if (item.parent.type === 'array') {
                    return;
                }
                evt.preventDefault();
                evt.stopPropagation();
                var w = Math.max(150,keyLabel.width());
                var keyInput = $('<input type="text" class="red-ui-editor-type-json-editor-key">').css({width:w+"px"}).val(""+item.key).insertAfter(keyLabel).typedInput({types:['str']});
                $(document).on("mousedown.nr-ui-json-editor", function(evt) {
                    var typedInputElement = keyInput.next(".red-ui-typedInput-container")[0];
                    var target = evt.target;
                    while (target.nodeName !== 'BODY' && target !== typedInputElement && !$(target).hasClass("red-ui-typedInput-options")) {
                        target = target.parentElement;
                    }
                    if (target.nodeName === 'BODY') {
                        var newKey = keyInput.typedInput("value");
                        item.key = newKey;
                        var keyText;
                        if (typeof newKey === 'string') {
                            keyText = '"'+newKey+'"';
                        } else {
                            keyText = newKey;
                        }
                        keyLabel.text(keyText);
                        keyInput.remove();
                        keyLabel.show();
                        $(document).off("mousedown.nr-ui-json-editor");
                        $(document).off("keydown.nr-ui-json-editor");
                    }
                });
                $(document).on("keydown.nr-ui-json-editor",function(evt) {
                    if (evt.keyCode === 27) {
                        // Escape
                        keyInput.remove();
                        keyLabel.show();
                        $(document).off("mousedown.nr-ui-json-editor");
                        $(document).off("keydown.nr-ui-json-editor");
                    }
                });
                keyLabel.hide();
            });
            $('<span>').text(" : ").appendTo(container);
        }

        if (Array.isArray(val)) {
            item.expanded = depth < 2;
            item.type = "array";
            item.deferBuild = depth >= 2;
            item.children = parseArray(val,depth+1,item);
        } else if (val !== null && item.type === "object") {
            item.expanded = depth < 2;
            item.children = parseObject(val,depth+1,item);
            item.deferBuild = depth >= 2;
        } else {
            item.value = val;
            if (val === null) {
                item.type = 'null'
            }
        }

        var valType;
        var valValue = "";
        var valClass;
        switch(item.type) {
            case 'string': valType = 'str'; valValue = '"'+item.value+'"'; valClass = "red-ui-debug-msg-type-string"; break;
            case 'number': valType = 'num'; valValue = item.value; valClass = "red-ui-debug-msg-type-number";break;
            case 'boolean': valType = 'bool'; valValue = item.value; valClass = "red-ui-debug-msg-type-other";break;
            case 'null': valType = item.type; valValue = item.type; valClass = "red-ui-debug-msg-type-null";break;
            case 'object':
                valType = item.type;
                valValue = item.type;//+"{"+item.children.length+"}";
                valClass = "red-ui-debug-msg-type-meta";
            break;
            case 'array':
                valType = item.type;
                valValue = item.type+"["+item.children.length+"]";
                valClass = "red-ui-debug-msg-type-meta";
            break;
        }
        //
        var orphanedChildren;
        var valueLabel = $('<span class="red-ui-editor-type-json-editor-label-value">').addClass(valClass).text(valValue).appendTo(container);
        valueLabel.on("click", function(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            if (valType === 'str') {
                valValue = valValue.substring(1,valValue.length-1);
            } else if (valType === 'array') {
                valValue = "";
            } else if (valType === 'object') {
                valValue = "";
            }
            var w = Math.max(150,valueLabel.width());
            var val = $('<input type="text" class="red-ui-editor-type-json-editor-value">').css({width:w+"px"}).val(""+valValue).insertAfter(valueLabel).typedInput({
                types:[
                    'str','num','bool',
                    {value:"null",label:RED._("common.type.null"),hasValue:false},
                    {value:"array",label:RED._("common.type.array"),hasValue:false,icon:"red/images/typedInput/json.png"},
                    {value:"object",label:RED._("common.type.object"),hasValue:false,icon:"red/images/typedInput/json.png"}
                ],
                default: valType
            });
            $(document).on("mousedown.nr-ui-json-editor", function(evt) {
                var typedInputElement = val.next(".red-ui-typedInput-container")[0];
                var target = evt.target;
                while (target.nodeName !== 'BODY' && target !== typedInputElement && !$(target).hasClass("red-ui-typedInput-options")) {
                    target = target.parentElement;
                }
                if (target.nodeName === 'BODY') {
                    valType = val.typedInput("type");
                    valValue = val.typedInput("value");
                    if (valType === 'num') {
                        valValue = valValue.trim();
                        if (isNaN(valValue)) {
                            valType = 'str';
                        } else if (valValue === "") {
                            valValue = 0;
                        }
                    }
                    item.value = valValue;
                    var valClass;
                    switch(valType) {
                        case 'str':    if (item.children) { orphanedChildren = item.children } item.treeList.makeLeaf(true); item.type = "string";  valClass = "red-ui-debug-msg-type-string"; valValue = '"'+valValue+'"'; break;
                        case 'num':    if (item.children) { orphanedChildren = item.children } item.treeList.makeLeaf(true); item.type = "number";  valClass = "red-ui-debug-msg-type-number"; break;
                        case 'bool':   if (item.children) { orphanedChildren = item.children } item.treeList.makeLeaf(true); item.type = "boolean"; valClass = "red-ui-debug-msg-type-other";  item.value = (valValue === "true"); break;
                        case 'null':   if (item.children) { orphanedChildren = item.children } item.treeList.makeLeaf(true); item.type = "null";    valClass = "red-ui-debug-msg-type-null"; item.value = valValue = "null"; break;
                        case 'object':
                            item.treeList.makeParent(orphanedChildren);
                            item.type = "object";
                            valClass = "red-ui-debug-msg-type-meta";
                            item.value = valValue = "object";
                            item.children.forEach(function(child,i) {
                                if (child.hasOwnProperty('_key')) {
                                    child.key = child._key;
                                    delete child._key;
                                    var keyText;
                                    var keyLabel = child.element.find(".red-ui-editor-type-json-editor-label-key");
                                    keyLabel.removeClass("red-ui-editor-type-json-editor-label-array-key");
                                    if (typeof child.key === 'string') {
                                        keyText = '"'+child.key+'"';
                                        keyLabel.addClass('red-ui-debug-msg-type-string');
                                        keyLabel.removeClass('red-ui-debug-msg-type-number');
                                    } else {
                                        keyText = child.key;
                                        keyLabel.removeClass('red-ui-debug-msg-type-string');
                                        keyLabel.addClass('red-ui-debug-msg-type-number');
                                    }
                                    keyLabel.text(keyText);
                                }
                            })
                            break;
                        case 'array':
                            item.treeList.makeParent(orphanedChildren);
                            item.type = "array";
                            valClass = "red-ui-debug-msg-type-meta";
                            item.value = valValue = "array["+(item.children.length)+"]";
                            item.children.forEach(function(child,i) {
                                child._key = child.key;
                                child.key = i;
                                child.element.find(".red-ui-editor-type-json-editor-label-key")
                                    .addClass("red-ui-editor-type-json-editor-label-array-key")
                                    .text(""+child.key)
                                    .removeClass('red-ui-debug-msg-type-string')
                                    .addClass('red-ui-debug-msg-type-number');
                            })
                            break;
                    }
                    valueLabel.text(valValue).removeClass().addClass("red-ui-editor-type-json-editor-label-value "+valClass);
                    val.remove();
                    valueLabel.show();
                    $(document).off("mousedown.nr-ui-json-editor");
                    $(document).off("keydown.nr-ui-json-editor");
                }
            })

            $(document).on("keydown.nr-ui-json-editor",function(evt) {
                if (evt.keyCode === 27) {
                    // Escape
                    val.remove();
                    valueLabel.show();
                    if (valType === 'str') {
                        valValue = '"'+valValue+'"';
                    }
                    $(document).off("mousedown.nr-ui-json-editor");
                    $(document).off("keydown.nr-ui-json-editor");
                }
            });
            valueLabel.hide();
        })
        item.gutter = $('<span class="red-ui-editor-type-json-editor-item-gutter"></span>');

        if (parent) {//red-ui-editor-type-json-editor-item-handle
            $('<span class="red-ui-editor-type-json-editor-item-handle"><i class="fa fa-bars"></span>').appendTo(item.gutter);
        } else {
            $('<span></span>').appendTo(item.gutter);
        }
        $('<button type="button" class="editor-button editor-button-small"><i class="fa fa-caret-down"></button>').appendTo(item.gutter).on("click", function(evt) {
            evt.preventDefault();
            evt.stopPropagation();
            showObjectMenu($(this), item);
        });
        item.element = container;
        return item;
    }
    function convertToObject(item) {
        var element;
        switch (item.type) {
            case 'string': element = item.value; break;
            case 'number': element = Number(item.value); break;
            case 'boolean': element = item.value; break;
            case 'null': element = null; break;
            case 'object':
                element = {};
                item.children.forEach(function(child) {
                    element[child.key] = convertToObject(child);
                })
            break;
            case 'array':
                element = item.children.map(function(child) {
                    return convertToObject(child);
                })
            break;
        }
        return element;
    }

    var definition = {
        show: function(options) {
            var value = options.value;
            var onComplete = options.complete;
            var type = "_json"
            if ($("script[data-template-name='"+type+"']").length === 0) {
                $(template).appendTo("#red-ui-editor-node-configs");
            }
            RED.view.state(RED.state.EDITING);
            var expressionEditor;
            var changeTimer;

            var checkValid = function() {
                var v = expressionEditor.getValue();
                try {
                    JSON.parse(v);
                    $("#node-dialog-ok").removeClass('disabled');
                    return true;
                } catch(err) {
                    $("#node-dialog-ok").addClass('disabled');
                    return false;
                }
            }
            var rootNode;

            var trayOptions = {
                title: options.title,
                width: options.width||700,
                buttons: [
                    {
                        id: "node-dialog-cancel",
                        text: RED._("common.label.cancel"),
                        click: function() {
                            RED.tray.close();
                        }
                    },
                    {
                        id: "node-dialog-ok",
                        text: RED._("common.label.done"),
                        class: "primary",
                        click: function() {
                            if (options.requireValid && !checkValid()) {
                                return;
                            }
                            var result;
                            if (activeTab === "json-ui") {
                                if (rootNode) {
                                    result = JSON.stringify(convertToObject(rootNode),null,4);
                                } else {
                                    result = expressionEditor.getValue();
                                }
                            } else if (activeTab === "json-raw") {
                                result = expressionEditor.getValue();
                            }
                            if (onComplete) { onComplete(result) }
                            RED.tray.close();
                        }
                    }
                ],
                resize: function(dimensions) {
                    var height = $(".red-ui-editor-type-json-tab-content").height();
                    $(".node-text-editor").css("height",(height-45)+"px");
                    expressionEditor.resize();
                },
                open: function(tray) {
                    var trayBody = tray.find('.red-ui-tray-body');
                    var dialogForm = RED.editor.buildEditForm(tray.find('.red-ui-tray-body'),'dialog-form',type,'editor');

                    var container = $("#red-ui-editor-type-json-tab-ui-container").css({"height":"100%"});
                    var filterDepth = Infinity;
                    var list = $('<div class="red-ui-debug-msg-payload red-ui-editor-type-json-editor">').appendTo(container).treeList({
                        rootSortable: false,
                        sortable: ".red-ui-editor-type-json-editor-item-handle",
                    }).on("treelistchangeparent", function(event, evt) {
                        if (evt.old.type === 'array') {
                            evt.old.element.find(".red-ui-editor-type-json-editor-label-type").text("array["+evt.old.children.length+"]");
                        }
                        if (evt.item.parent.type === 'array') {
                            evt.item.parent.element.find(".red-ui-editor-type-json-editor-label-type").text("array["+evt.item.parent.children.length+"]");
                        }
                    }).on("treelistsort", function(event, item) {
                        item.children.forEach(function(child,i) {
                            if (item.type === 'array') {
                                child.key = i;
                                child.element.find(".red-ui-editor-type-json-editor-label-key")
                                .text(child.key)
                                .removeClass('red-ui-debug-msg-type-string')
                                .addClass('red-ui-debug-msg-type-number');
                            } else {
                                child.element.find(".red-ui-editor-type-json-editor-label-key")
                                    .text('"'+child.key+'"')
                                    .removeClass('red-ui-debug-msg-type-number')
                                    .addClass('red-ui-debug-msg-type-string');
                            }
                        })
                    });


                    expressionEditor = RED.editor.createEditor({
                        id: 'node-input-json',
                        value: "",
                        mode:"ace/mode/json"
                    });
                    expressionEditor.getSession().setValue(value||"",-1);
                    if (options.requireValid) {
                        expressionEditor.getSession().on('change', function() {
                            clearTimeout(changeTimer);
                            changeTimer = setTimeout(checkValid,200);
                        });
                        checkValid();
                    }
                    $("#node-input-json-reformat").on("click", function(evt) {
                        evt.preventDefault();
                        var v = expressionEditor.getValue()||"";
                        try {
                            v = JSON.stringify(JSON.parse(v),null,4);
                        } catch(err) {
                            // TODO: do an optimistic auto-format
                        }
                        expressionEditor.getSession().setValue(v||"",-1);
                    });
                    dialogForm.i18n();

                    var finishedBuild = false;
                    var tabs = RED.tabs.create({
                        element: $("#red-ui-editor-type-json-tabs"),
                        onchange:function(tab) {
                            activeTab = tab.id;
                            $(".red-ui-editor-type-json-tab-content").hide();
                            if (finishedBuild) {
                                if (tab.id === "json-raw") {
                                    if (rootNode) {
                                        var result = JSON.stringify(convertToObject(rootNode),null,4);
                                        expressionEditor.getSession().setValue(result||"",-1);
                                    }

                                } else if (tab.id === "json-ui") {
                                    var raw = expressionEditor.getValue().trim() ||"{}";
                                    try {
                                        var parsed = JSON.parse(raw);
                                        rootNode = handleItem(null,parsed,0,null);
                                        rootNode.class = "red-ui-editor-type-json-root-node"
                                        list.treeList('data',[rootNode]);
                                    } catch(err) {
                                        rootNode = null;
                                        list.treeList('data',[{
                                            label: RED._("jsonEditor.error.invalidJSON")+err.toString()
                                        }]);
                                    }
                                }
                            }
                            tab.content.show();
                            trayOptions.resize();
                        }
                    })

                    tabs.addTab({
                        id: 'json-raw',
                        label: RED._('jsonEditor.rawMode'),
                        content: $("#red-ui-editor-type-json-tab-raw")
                    });
                    tabs.addTab({
                        id: 'json-ui',
                        label: RED._('jsonEditor.uiMode'),
                        content: $("#red-ui-editor-type-json-tab-ui")
                    });
                    finishedBuild = true;


                },
                close: function() {
                    // expressionEditor.destroy();
                    if (options.onclose) {
                        options.onclose();
                    }
                },
                show: function() {}
            }
            RED.tray.show(trayOptions);
        }
    }
    RED.editor.registerTypeEditor("_json", definition);
})();
