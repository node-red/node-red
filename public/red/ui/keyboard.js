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

    return {
        add: addHandler,
        remove: removeHandler,
        disable: function(){ active = false;},
        enable: function(){ active = true; }
    }

})();
