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

RED.userSettings = (function() {

    var trayWidth = null;
    var settingsVisible = false;

    function show() {
        if (settingsVisible) {
            return;
        }
        settingsVisible = true;

        var trayOptions = {
            title: "User Settings",
            buttons: [
                {
                    id: "node-dialog-ok",
                    text: RED._("common.label.close"),
                    class: "primary",
                    click: function() {
                        RED.tray.close();
                    }
                }
            ],
            resize: function(dimensions) {
                trayWidth = dimensions.width;
            },
            open: function(tray) {
                var trayBody = tray.find('.editor-tray-body');

                $('<ul></ul>',{id:"user-settings-tabs"}).appendTo(trayBody);
                var tabContents = $('<div></div>',{id:"user-settings-tabs-content"}).appendTo(trayBody);

                $('<div class="hide" id="user-settings-tab-view">View Tab</div>').appendTo(tabContents);
                $('<div class="hide" id="user-settings-tab-keyboard">Keyboard Tab</div>').appendTo(tabContents);
                $('<div class="hide" id="user-settings-tab-something">Something Tab</div>').appendTo(tabContents);


                var tabs = RED.tabs.create({
                    id: "user-settings-tabs",
                    onchange: function(tab) {
                        $("#user-settings-tabs-content").children().hide();
                        $("#" + tab.id).show();
                    }
                });
                tabs.addTab({
                    id: "user-settings-tab-view",
                    label: "View"
                });
                tabs.addTab({
                    id: "user-settings-tab-keyboard",
                    label: "Keyboard Shortcuts"
                });
                tabs.addTab({
                    id: "user-settings-tab-something",
                    label: "Something Else"
                });
            },
            close: function() {
                settingsVisible = false;
            },
            show: function() {}
        }
        if (trayWidth !== null) {
            trayOptions.width = trayWidth;
        }
        RED.tray.show(trayOptions);
    }

    function init() {
        RED.actions.add("core:show-user-settings",show);
    }
    return {
        init: init
    };
})();
