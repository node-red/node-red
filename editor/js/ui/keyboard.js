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
RED.keyboard = (function() {

    var isMac = /Mac/i.test(window.navigator.platform);

    var handlers = {};
    var partialState;

    var keyMap = {
        "left":37,
        "up":38,
        "right":39,
        "down":40,
        "escape":27,
        "enter": 13,
        "backspace": 8,
        "delete": 46,
        "space": 32,
        ";":186,
        "=":187,
        ",":188,
        "-":189,
        ".":190,
        "/":191,
        "\\":220,
        "'":222,
        "?":191 // <- QWERTY specific
    }
    var metaKeyCodes = {
        16:true,
        17:true,
        18: true,
        91:true,
        93: true
    }
    var actionToKeyMap = {}

    // FF generates some different keycodes because reasons.
    var firefoxKeyCodeMap = {
        59:186,
        61:187,
        173:189
    }

    function init() {
        $.getJSON("red/keymap.json",function(data) {
            for (var scope in data) {
                if (data.hasOwnProperty(scope)) {
                    var keys = data[scope];
                    for (var key in keys) {
                        if (keys.hasOwnProperty(key)) {
                            addHandler(scope,key,keys[key]);
                        }
                    }
                }
            }
        })
        RED.actions.add("core:show-help", showKeyboardHelp);

    }
    function parseKeySpecifier(key) {
        var parts = key.toLowerCase().split("-");
        var modifiers = {};
        var keycode;
        var blank = 0;
        for (var i=0;i<parts.length;i++) {
            switch(parts[i]) {
                case "ctrl":
                case "cmd":
                    modifiers.ctrl = true;
                    modifiers.meta = true;
                    break;
                case "alt":
                    modifiers.alt = true;
                    break;
                case "shift":
                    modifiers.shift = true;
                    break;
                case "":
                    blank++;
                    keycode = keyMap["-"];
                    break;
                default:
                    if (keyMap.hasOwnProperty(parts[i])) {
                        keycode = keyMap[parts[i]];
                    } else if (parts[i].length > 1) {
                        return null;
                    } else {
                        keycode = parts[i].toUpperCase().charCodeAt(0);
                    }
                    break;
            }
        }
        return [keycode,modifiers];
    }

    function resolveKeyEvent(evt) {
        var slot = partialState||handlers;
        if (evt.ctrlKey || evt.metaKey) {
            slot = slot.ctrl;
        }
        if (slot && evt.shiftKey) {
            slot = slot.shift;
        }
        if (slot && evt.altKey) {
            slot = slot.alt;
        }
        var keyCode = firefoxKeyCodeMap[evt.keyCode] || evt.keyCode;
        if (slot && slot[keyCode]) {
            var handler = slot[keyCode];
            if (!handler.scope) {
                if (partialState) {
                    partialState = null;
                    return resolveKeyEvent(evt);
                } else {
                    partialState = handler;
                    evt.preventDefault();
                    return null;
                }
            } else if (handler.scope && handler.scope !== "*") {
                var target = evt.target;
                while (target.nodeName !== 'BODY' && target.id !== handler.scope) {
                    target = target.parentElement;
                }
                if (target.nodeName === 'BODY') {
                    handler = null;
                }
            }
            partialState = null;
            return handler;
        } else if (partialState) {
            partialState = null;
            return resolveKeyEvent(evt);
        }
    }
    d3.select(window).on("keydown",function() {
        if (metaKeyCodes[d3.event.keyCode]) {
            return;
        }
        var handler = resolveKeyEvent(d3.event);
        if (handler && handler.ondown) {
            if (typeof handler.ondown === "string") {
                RED.actions.invoke(handler.ondown);
            } else {
                handler.ondown();
            }
            d3.event.preventDefault();
        }
    });

    function addHandler(scope,key,modifiers,ondown) {
        var mod = modifiers;
        var cbdown = ondown;
        if (typeof modifiers == "function" || typeof modifiers === "string") {
            mod = {};
            cbdown = modifiers;
        }
        var keys = [];
        var i=0;
        if (typeof key === 'string') {
            if (typeof cbdown === 'string') {
                actionToKeyMap[cbdown] = {scope:scope,key:key};
            }
            var parts = key.split(" ");
            for (i=0;i<parts.length;i++) {
                var parsedKey = parseKeySpecifier(parts[i]);
                if (parsedKey) {
                    keys.push(parsedKey);
                } else {
                    console.log("Unrecognised key specifier:",key)
                    return;
                }
            }
        } else {
            keys.push([key,mod])
        }
        var slot = handlers;
        for (i=0;i<keys.length;i++) {
            key = keys[i][0];
            mod = keys[i][1];
            if (mod.ctrl) {
                slot.ctrl = slot.ctrl||{};
                slot = slot.ctrl;
            }
            if (mod.shift) {
                slot.shift = slot.shift||{};
                slot = slot.shift;
            }
            if (mod.alt) {
                slot.alt = slot.alt||{};
                slot = slot.alt;
            }
            slot[key] = slot[key] || {};
            slot = slot[key];
            //slot[key] = {scope: scope, ondown:cbdown};
        }
        slot.scope = scope;
        slot.ondown = cbdown;
    }

    function removeHandler(key,modifiers) {
        var mod = modifiers || {};
        var keys = [];
        var i=0;
        if (typeof key === 'string') {
            delete actionToKeyMap[key];
            var parts = key.split(" ");
            for (i=0;i<parts.length;i++) {
                var parsedKey = parseKeySpecifier(parts[i]);
                if (parsedKey) {
                    keys.push(parsedKey);
                } else {
                    console.log("Unrecognised key specifier:",key)
                    return;
                }
            }
        } else {
            keys.push([key,mod])
        }
        var slot = handlers;
        for (i=0;i<keys.length;i++) {
            key = keys[i][0];
            mod = keys[i][1];
            if (mod.ctrl) {
                slot = slot.ctrl;
            }
            if (slot && mod.shift) {
                slot = slot.shift;
            }
            if (slot && mod.alt) {
                slot = slot.alt;
            }
            if (!slot[key]) {
                return;
            }
            slot = slot[key];
        }
        delete slot.scope;
        delete slot.ondown;
    }

    var shortcutDialog = null;

    var cmdCtrlKey = '<span class="help-key">'+(isMac?'&#8984;':'Ctrl')+'</span>';

    function showKeyboardHelp() {
        if (!RED.settings.theme("menu.menu-item-keyboard-shortcuts",true)) {
            return;
        }
        if (!shortcutDialog) {
            shortcutDialog = $('<div id="keyboard-help-dialog" class="hide">'+
                '<div class="keyboard-shortcut-entry keyboard-shortcut-list-header">'+
                    '<div class="keyboard-shortcut-entry-key">shortcut</div>'+
                    '<div class="keyboard-shortcut-entry-key">action</div>'+
                    '<div class="keyboard-shortcut-entry-scope">scope</div>'+
                '</div>'+
                '<ol id="keyboard-shortcut-list"></ol>'+
                '</div>')
            .appendTo("body");

            var shortcutList = $('#keyboard-shortcut-list').editableList({
                addButton: false,
                scrollOnAdd: false,
                addItem: function(container,i,object) {
                    var item = $('<div class="keyboard-shortcut-entry">').appendTo(container);

                    var key = $('<div class="keyboard-shortcut-entry-key">').appendTo(item);
                    if (object.key) {
                        key.append(formatKey(object.key));
                    } else {
                        item.addClass("keyboard-shortcut-entry-unassigned");
                        key.html(RED._('keyboard.unassigned'));
                    }

                    var text = object.id.replace(/(^.+:([a-z]))|(-([a-z]))/g,function() {
                        if (arguments[5] === 0) {
                            return arguments[2].toUpperCase();
                        } else {
                            return " "+arguments[4].toUpperCase();
                        }
                    });
                    var label = $('<div>').html(text).appendTo(item);
                    if (object.scope) {
                        $('<div class="keyboard-shortcut-entry-scope">').html(object.scope).appendTo(item);
                    }


                },
            });
            var shortcuts = RED.actions.list();
            shortcuts.sort(function(A,B) {
                return A.id.localeCompare(B.id);
            });
            shortcuts.forEach(function(s) {
                shortcutList.editableList('addItem',s);
            })

            shortcutDialog.dialog({
                modal: true,
                autoOpen: false,
                width: "800",
                height: "400",
                title:RED._("keyboard.title"),
                resizable: false
            });
        }

        shortcutDialog.dialog("open");
    }
    function formatKey(key) {
        var formattedKey = isMac?key.replace(/ctrl-?/,"&#8984;"):key;
        formattedKey = isMac?formattedKey.replace(/alt-?/,"&#8997;"):key;
        formattedKey = formattedKey.replace(/shift-?/,"&#8679;")
        formattedKey = formattedKey.replace(/left/,"&#x2190;")
        formattedKey = formattedKey.replace(/up/,"&#x2191;")
        formattedKey = formattedKey.replace(/right/,"&#x2192;")
        formattedKey = formattedKey.replace(/down/,"&#x2193;")
        return '<span class="help-key-block"><span class="help-key">'+formattedKey.split(" ").join('</span> <span class="help-key">')+'</span></span>';
    }

    return {
        init: init,
        add: addHandler,
        remove: removeHandler,
        getShortcut: function(actionName) {
            return actionToKeyMap[actionName];
        },
        formatKey: formatKey
    }

})();
