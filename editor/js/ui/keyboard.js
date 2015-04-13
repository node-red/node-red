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

    var active = true;
    var handlers = {};

    d3.select(window).on("keydown",function() {
        if (!active) { return; }
        var handler = handlers[d3.event.keyCode];
        if (handler && handler.ondown) {
            if (!handler.modifiers ||
                ((!handler.modifiers.shift || d3.event.shiftKey) &&
                 (!handler.modifiers.ctrl  || d3.event.ctrlKey || d3.event.metaKey) &&
                 (!handler.modifiers.alt   || d3.event.altKey) )) {
                handler.ondown();
            }
        }
    });

    d3.select(window).on("keyup",function() {
        if (!active) { return; }
        var handler = handlers[d3.event.keyCode];
        if (handler && handler.onup) {
            if (!handler.modifiers ||
                ((!handler.modifiers.shift || d3.event.shiftKey) &&
                 (!handler.modifiers.ctrl  || d3.event.ctrlKey || d3.event.metaKey) &&
                 (!handler.modifiers.alt   || d3.event.altKey) )) {
                handler.onup();
            }
        }
    });
    function addHandler(key,modifiers,ondown,onup) {
        var mod = modifiers;
        var cbdown = ondown;
        var cbup = onup;
        if (typeof modifiers == "function") {
            mod = {};
            cbdown = modifiers;
            cbup = ondown;
        }
        handlers[key] = {modifiers:mod, ondown:cbdown, onup:cbup};
    }
    function removeHandler(key) {
        delete handlers[key];
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
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">a</span></td><td>Select all nodes</td></tr>'+
                        '<tr><td><span class="help-key">Shift</span> + <span class="help-key">Click</span></td><td>Select all connected nodes</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">Click</span></td><td>Add/remove node from selection</td></tr>'+
                        '<tr><td><span class="help-key">Delete</span></td><td>Delete selected nodes or link</td></tr>'+
                        '<tr><td>&nbsp;</td><td></td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">i</span></td><td>Import nodes</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">e</span></td><td>Export selected nodes</td></tr>'+
                    '</table>'+
                '</div>'+
                '<div style="vertical-align: top;display:inline-block; box-sizing: border-box; width:50%; padding: 10px;">'+
                    '<table class="keyboard-shortcuts">'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">Space</span></td><td>Toggle sidebar</td></tr>'+
                        '<tr><td></td><td></td></tr>'+
                        '<tr><td><span class="help-key">Delete</span></td><td>Delete selected nodes or link</td></tr>'+
                        '<tr><td></td><td></td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">c</span></td><td>Copy selected nodes</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">x</span></td><td>Cut selected nodes</td></tr>'+
                        '<tr><td><span class="help-key">Ctrl/&#8984;</span> + <span class="help-key">v</span></td><td>Paste nodes</td></tr>'+
                    '</table>'+
                '</div>'+
                '</div>')
            .appendTo("body")
            .dialog({
                modal: true,
                autoOpen: false,
                width: "800",
                title:"Keyboard shortcuts",
                resizable: false,
                open: function() {
                    RED.keyboard.disable();
                },
                close: function() {
                    RED.keyboard.enable();
                }
            });
        }
        
        dialog.dialog("open");
    }
    
    return {
        add: addHandler,
        remove: removeHandler,
        disable: function(){ active = false;},
        enable: function(){ active = true; },
        
        showHelp: showKeyboardHelp
    }

})();
