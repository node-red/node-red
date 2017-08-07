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

    var trayWidth = 700;
    var settingsVisible = false;

    var panes = [];

    function addPane(options) {
        panes.push(options);
    }

    function show(initialTab) {
        if (settingsVisible) {
            return;
        }
        settingsVisible = true;
        var tabContainer;

        var trayOptions = {
            title: RED._("menu.label.userSettings"),
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
                var settingsContent = $('<div></div>').appendTo(trayBody);
                var tabContainer = $('<div></div>',{id:"user-settings-tabs-container"}).appendTo(settingsContent);

                $('<ul></ul>',{id:"user-settings-tabs"}).appendTo(tabContainer);
                var settingsTabs = RED.tabs.create({
                    id: "user-settings-tabs",
                    vertical: true,
                    onchange: function(tab) {
                        setTimeout(function() {
                            $("#user-settings-tabs-content").children().hide();
                            $("#" + tab.id).show();
                            if (tab.pane.focus) {
                                tab.pane.focus();
                            }
                        },50);
                    }
                });
                var tabContents = $('<div></div>',{id:"user-settings-tabs-content"}).appendTo(settingsContent);

                panes.forEach(function(pane) {
                    settingsTabs.addTab({
                        id: "user-settings-tab-"+pane.id,
                        label: pane.title,
                        pane: pane
                    });
                    pane.get().hide().appendTo(tabContents);
                });
                settingsContent.i18n();
                settingsTabs.activateTab("user-settings-tab-"+(initialTab||'view'))
                $("#sidebar-shade").show();
            },
            close: function() {
                settingsVisible = false;
                panes.forEach(function(pane) {
                    if (pane.close) {
                        pane.close();
                    }
                });
                $("#sidebar-shade").hide();

            },
            show: function() {}
        }
        if (trayWidth !== null) {
            trayOptions.width = trayWidth;
        }
        RED.tray.show(trayOptions);
    }

    var viewSettings = [
        {
            title: "menu.label.view.grid",
            options: [
                {setting:"view-show-grid",oldSetting:"menu-menu-item-view-show-grid",label:"menu.label.view.showGrid",toggle:true,onchange:"core:toggle-show-grid"},
                {setting:"view-snap-grid",oldSetting:"menu-menu-item-view-snap-grid",label:"menu.label.view.snapGrid",toggle:true,onchange:"core:toggle-snap-grid"},
                {setting:"view-grid-size",label:"menu.label.view.gridSize",type:"number",default: 20, onchange:RED.view.gridSize}
            ]
        },
        {
            title: "menu.label.nodes",
            options: [
                {setting:"view-node-status",oldSetting:"menu-menu-item-status",label:"menu.label.displayStatus",default: true, toggle:true,onchange:"core:toggle-status"}
            ]
        },
        {
            title: "menu.label.other",
            options: [
                {setting:"view-show-tips",oldSettings:"menu-menu-item-show-tips",label:"menu.label.showTips",toggle:true,default:true,onchange:"core:toggle-show-tips"}
            ]
        }
    ];

    var allSettings = {};

    function createViewPane() {

        var pane = $('<div id="user-settings-tab-view" class="node-help"></div>');

        viewSettings.forEach(function(section) {
            $('<h3></h3>').text(RED._(section.title)).appendTo(pane);
            section.options.forEach(function(opt) {
                var initialState = RED.settings.get(opt.setting);
                var row = $('<div class="user-settings-row"></div>').appendTo(pane);
                var input;
                if (opt.toggle) {
                    input = $('<label for="user-settings-'+opt.setting+'"><input id="user-settings-'+opt.setting+'" type="checkbox"> '+RED._(opt.label)+'</label>').appendTo(row).find("input");
                    input.prop('checked',initialState);
                } else {
                    $('<label for="user-settings-'+opt.setting+'">'+RED._(opt.label)+'</label>').appendTo(row);
                    $('<input id="user-settings-'+opt.setting+'" type="'+(opt.type||"text")+'">').appendTo(row).val(initialState);
                }
            });
        })
        return pane;
    }

    function setSelected(id, value) {
        var opt = allSettings[id];
        RED.settings.set(opt.setting,value);
        var callback = opt.onchange;
        if (typeof callback === 'string') {
            callback = RED.actions.get(callback);
        }
        if (callback) {
            callback.call(opt,value);
        }
    }
    function toggle(id) {
        var opt = allSettings[id];
        var state = RED.settings.get(opt.setting);
        setSelected(id,!state);
    }


    function init() {
        RED.actions.add("core:show-user-settings",show);
        RED.actions.add("core:show-help", function() { show('keyboard')});

        addPane({
            id:'view',
            title: RED._("menu.label.view.view"),
            get: createViewPane,
            close: function() {
                viewSettings.forEach(function(section) {
                    section.options.forEach(function(opt) {
                        var input = $("#user-settings-"+opt.setting);
                        if (opt.toggle) {
                            setSelected(opt.setting,input.prop('checked'));
                        } else {
                            setSelected(opt.setting,input.val());
                        }
                    });
                })
            }
        })

        viewSettings.forEach(function(section) {
            section.options.forEach(function(opt) {
                if (opt.oldSetting) {
                    var oldValue = RED.settings.get(opt.oldSetting);
                    if (oldValue !== undefined && oldValue !== null) {
                        RED.settings.set(opt.setting,oldValue);
                        RED.settings.remove(opt.oldSetting);
                    }
                }
                allSettings[opt.setting] = opt;
                if (opt.onchange) {
                    var value = RED.settings.get(opt.setting);
                    if (value === null && opt.hasOwnProperty('default')) {
                        value = opt.default;
                        RED.settings.set(opt.setting,value);
                    }

                    var callback = opt.onchange;
                    if (typeof callback === 'string') {
                        callback = RED.actions.get(callback);
                    }
                    if (callback) {
                        callback.call(opt,value);
                    }
                }
            });
        });

    }
    return {
        init: init,
        toggle: toggle,
        show: show,
        add: addPane
    };
})();
