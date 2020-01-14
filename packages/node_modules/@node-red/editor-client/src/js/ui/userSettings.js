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
        if (!RED.user.hasPermission("settings.write")) {
            RED.notify(RED._("user.errors.settings"),"error");
            return;
        }
        settingsVisible = true;

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
                var trayBody = tray.find('.red-ui-tray-body');
                var settingsContent = $('<div></div>').appendTo(trayBody);
                var tabContainer = $('<div></div>',{class:"red-ui-settings-tabs-container"}).appendTo(settingsContent);

                $('<ul></ul>',{id:"user-settings-tabs"}).appendTo(tabContainer);
                var settingsTabs = RED.tabs.create({
                    id: "user-settings-tabs",
                    vertical: true,
                    onchange: function(tab) {
                        setTimeout(function() {
                            tabContents.children().hide();
                            $("#" + tab.id).show();
                            if (tab.pane.focus) {
                                tab.pane.focus();
                            }
                        },50);
                    }
                });
                var tabContents = $('<div></div>',{class:"red-ui-settings-tabs-content"}).appendTo(settingsContent);

                panes.forEach(function(pane) {
                    settingsTabs.addTab({
                        id: "red-ui-settings-tab-"+pane.id,
                        label: pane.title,
                        pane: pane
                    });
                    pane.get().hide().appendTo(tabContents);
                });
                settingsContent.i18n();
                settingsTabs.activateTab("red-ui-settings-tab-"+(initialTab||'view'))
                $("#red-ui-sidebar-shade").show();
            },
            close: function() {
                settingsVisible = false;
                panes.forEach(function(pane) {
                    if (pane.close) {
                        pane.close();
                    }
                });
                $("#red-ui-sidebar-shade").hide();

            },
            show: function() {}
        }
        if (trayWidth !== null) {
            trayOptions.width = trayWidth;
        }
        RED.tray.show(trayOptions);
    }

    function localeToName(lc) {
        var name = RED._("languages."+lc);
        return {text: (name ? name : lc), val: lc};
    }

    function compText(a, b) {
        return a.text.localeCompare(b.text);
    }
    
    var viewSettings = [
        {
            options: [
                {setting:"editor-language",local: true, label:"menu.label.view.language",options:function(done){ done([{val:'',text:RED._('menu.label.view.browserDefault')}].concat(RED.settings.theme("languages").map(localeToName).sort(compText))) }},
            ]
        },{
            title: "menu.label.view.grid",
            options: [
                {setting:"view-show-grid",oldSetting:"menu-menu-item-view-show-grid",label:"menu.label.view.showGrid", default: true, toggle:true,onchange:"core:toggle-show-grid"},
                {setting:"view-snap-grid",oldSetting:"menu-menu-item-view-snap-grid",label:"menu.label.view.snapGrid", default: true, toggle:true,onchange:"core:toggle-snap-grid"},
                {setting:"view-grid-size",label:"menu.label.view.gridSize",type:"number",default: 20, onchange:RED.view.gridSize}
            ]
        },
        {
            title: "menu.label.nodes",
            options: [
                {setting:"view-node-status",oldSetting:"menu-menu-item-status",label:"menu.label.displayStatus",default: true, toggle:true,onchange:"core:toggle-status"},
                {setting:"view-node-show-label",label:"menu.label.showNodeLabelDefault",default: true, toggle:true}
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

        var pane = $('<div id="red-ui-settings-tab-view" class="red-ui-help"></div>');

        var currentEditorSettings = RED.settings.get('editor') || {};
        currentEditorSettings.view = currentEditorSettings.view || {};

        viewSettings.forEach(function(section) {
            if (section.title) {
                $('<h3></h3>').text(RED._(section.title)).appendTo(pane);
            }
            section.options.forEach(function(opt) {
                var initialState;
                if (opt.local) {
                    initialState = localStorage.getItem(opt.setting);
                } else {
                    initialState = currentEditorSettings.view[opt.setting];
                }
                var row = $('<div class="red-ui-settings-row"></div>').appendTo(pane);
                var input;
                if (opt.toggle) {
                    input = $('<label for="user-settings-'+opt.setting+'"><input id="user-settings-'+opt.setting+'" type="checkbox"> '+RED._(opt.label)+'</label>').appendTo(row).find("input");
                    input.prop('checked',initialState);
                } else if (opt.options) {
                    $('<label for="user-settings-'+opt.setting+'">'+RED._(opt.label)+'</label>').appendTo(row);
                    var select = $('<select id="user-settings-'+opt.setting+'"></select>').appendTo(row);
                    if (typeof opt.options === 'function') {
                        opt.options(function(options) {
                            options.forEach(function(opt) {
                                var val = opt;
                                var text = opt;
                                if (typeof opt !== 'string') {
                                    val = opt.val;
                                    text = opt.text;
                                }
                                $('<option>').val(val).text(text).appendTo(select);
                            })
                        })
                        select.val(initialState)
                    } else {
                        // TODO: support other option types
                    }
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
        if (opt.local) {
            localStorage.setItem(opt.setting,value);
        } else {
            var currentEditorSettings = RED.settings.get('editor') || {};
            currentEditorSettings.view = currentEditorSettings.view || {};
            currentEditorSettings.view[opt.setting] = value;
            RED.settings.set('editor', currentEditorSettings);
            var callback = opt.onchange;
            if (typeof callback === 'string') {
                callback = RED.actions.get(callback);
            }
            if (callback) {
                callback.call(opt,value);
            }
        }
    }
    function toggle(id) {
        var opt = allSettings[id];
        var currentEditorSettings = RED.settings.get('editor') || {};
        currentEditorSettings.view = currentEditorSettings.view || {};
        setSelected(id,!currentEditorSettings.view[opt.setting]);
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

        var currentEditorSettings = RED.settings.get('editor') || {};
        currentEditorSettings.view = currentEditorSettings.view || {};
        var editorSettingsChanged = false;
        viewSettings.forEach(function(section) {
            section.options.forEach(function(opt) {
                if (opt.local) {
                    allSettings[opt.setting] = opt;
                    return;
                }
                if (opt.oldSetting) {
                    var oldValue = RED.settings.get(opt.oldSetting);
                    if (oldValue !== undefined && oldValue !== null) {
                        currentEditorSettings.view[opt.setting] = oldValue;
                        editorSettingsChanged = true;
                        RED.settings.remove(opt.oldSetting);
                    }
                }
                allSettings[opt.setting] = opt;
                var value = currentEditorSettings.view[opt.setting];
                if ((value === null || value === undefined) && opt.hasOwnProperty('default')) {
                    value = opt.default;
                    currentEditorSettings.view[opt.setting] = value;
                    editorSettingsChanged = true;
                }

                if (opt.onchange) {
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
        if (editorSettingsChanged) {
            RED.settings.set('editor',currentEditorSettings);
        }

    }
    return {
        init: init,
        toggle: toggle,
        show: show,
        add: addPane
    };
})();
