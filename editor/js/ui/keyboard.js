/**
 * Copyright 2013 IBM Corp.
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

    var handlers = {};

    function resolveKeyEvent(evt) {
        var slot = handlers;
        if (evt.ctrlKey || evt.metaKey) {
            slot = slot.ctrl;
        }
        if (slot && evt.shiftKey) {
            slot = slot.shift;
        }
        if (slot && evt.altKey) {
            slot = slot.alt;
        }
        if (slot && slot[evt.keyCode]) {
            var handler = slot[evt.keyCode];
            if (handler.scope && handler.scope !== "*") {
                var target = evt.target;
                while (target.nodeName !== 'BODY' && target.id !== handler.scope) {
                    target = target.parentElement;
                }
                if (target.nodeName === 'BODY') {
                    handler = null;
                }
            }
            return handler;
        }
    }
    d3.select(window).on("keydown",function() {
        var handler = resolveKeyEvent(d3.event);
        if (handler && handler.ondown) {
            handler.ondown();
        }
    });
    d3.select(window).on("keyup",function() {
        var handler = resolveKeyEvent(d3.event);
        if (handler && handler.onup) {
            handler.onup();
        }
    });

    function addHandler(scope,key,modifiers,ondown,onup) {
        var mod = modifiers;
        var cbdown = ondown;
        var cbup = onup;
        if (typeof modifiers == "function") {
            mod = {};
            cbdown = modifiers;
            cbup = ondown;
        }
        var slot = handlers;
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
        slot[key] = {scope: scope, ondown:cbdown, onup:cbup};
    }

    function removeHandler(key,modifiers) {
        var mod = modifiers || {};
        var slot = handlers;
        if (mod.ctrl) {
            slot = slot.ctrl;
        }
        if (slot && mod.shift) {
            slot = slot.shift;
        }
        if (slot && mod.alt) {
            slot = slot.alt;
        }
        if (slot) {
            delete slot[key];
        }
    }

    var dialog = null;

    function showKeyboardHelp() {
        if (!RED.settings.theme("menu.menu-item-keyboard-shortcuts",true)) {
            return;
        }
        if (!dialog) {
            dialog = $('<div id="keyboard-help-dialog" class="hide">'+
                '<div style="vertical-align: top;display:inline-block; box-sizing: border-box; width:50%; padding: 10px;">'+
                    '<table class="keyboard-shortcuts">'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">a</span></td><td>'+RED._("keyboard.selectAll")+'</td></tr>'+
                        '<tr><td><span class="help-key">Shift</span> + <span class="help-key">Click</span></td><td>'+RED._("keyboard.selectAllConnected")+'</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">Click</span></td><td>'+RED._("keyboard.addRemoveNode")+'</td></tr>'+
                        '<tr><td>&nbsp;</td><td></td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">i</span></td><td>'+RED._("keyboard.importNode")+'</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">e</span></td><td>'+RED._("keyboard.exportNode")+'</td></tr>'+
                        '<tr><td>&nbsp;</td><td></td></tr>'+
                        '<tr><td><span class="help-key"> &#x2190; </span> <span class="help-key"> &#x2191; </span> <span class="help-key"> &#x2192; </span> <span class="help-key"> &#x2193; </span></td><td>'+RED._("keyboard.nudgeNode")+'</td></tr>'+
                        '<tr><td><span class="help-key">Shift</span> + <span class="help-key"> &#x2190; </span></td><td rowspan="4">'+RED._("keyboard.moveNode")+'</td></tr>'+
                        '<tr><td><span class="help-key">Shift</span> + <span class="help-key"> &#x2191; </span></td></tr>'+
                        '<tr><td><span class="help-key">Shift</span> + <span class="help-key"> &#x2192; </span></td></tr>'+
                        '<tr><td><span class="help-key">Shift</span> + <span class="help-key"> &#x2193; </span></td></tr>'+
                    '</table>'+
                '</div>'+
                '<div style="vertical-align: top;display:inline-block; box-sizing: border-box; width:50%; padding: 10px;">'+
                    '<table class="keyboard-shortcuts">'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">Space</span></td><td>'+RED._("keyboard.toggleSidebar")+'</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">.</span></td><td>'+RED._("keyboard.searchBox")+'</td></tr>'+
                        '<tr><td></td><td></td></tr>'+
                        '<tr><td><span class="help-key">Delete</span></td><td rowspan="2">'+RED._("keyboard.deleteSelected")+'</td></tr>'+
                        '<tr><td><span class="help-key">Backspace</span></td></tr>'+
                        '<tr><td></td><td></td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">c</span></td><td>'+RED._("keyboard.copyNode")+'</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">x</span></td><td>'+RED._("keyboard.cutNode")+'</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">v</span></td><td>'+RED._("keyboard.pasteNode")+'</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">z</span></td><td>'+RED._("keyboard.undoChange")+'</td></tr>'+
                    '</table>'+
                '</div>'+
                '</div>')
            .appendTo("body")
            .dialog({
                modal: true,
                autoOpen: false,
                width: "800",
                title:"Keyboard shortcuts",
                resizable: false
            });
        }

        dialog.dialog("open");
    }

    return {
        add: addHandler,
        remove: removeHandler,
        showHelp: showKeyboardHelp
    }

})();
