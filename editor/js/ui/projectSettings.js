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

RED.projects.settings = (function() {

    var trayWidth = 700;
    var settingsVisible = false;

    var panes = [];

    function addPane(options) {
        panes.push(options);
    }

    // TODO: DRY - tab-info.js
    function addTargetToExternalLinks(el) {
        $(el).find("a").each(function(el) {
            var href = $(this).attr('href');
            if (/^https?:/.test(href)) {
                $(this).attr('target','_blank');
            }
        });
        return el;
    }

    function show(initialTab) {
        if (settingsVisible) {
            return;
        }
        settingsVisible = true;
        var tabContainer;

        var trayOptions = {
            title: "NLS: Project Information",// RED._("menu.label.userSettings"),
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
                var project = RED.projects.getActiveProject();
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
                        id: "project-settings-tab-"+pane.id,
                        label: pane.title,
                        pane: pane
                    });
                    pane.get(project).hide().appendTo(tabContents);
                });
                settingsContent.i18n();
                settingsTabs.activateTab("project-settings-tab-"+(initialTab||'view'))
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

    function addSpinnerOverlay(container) {
        var spinner = $('<div class="projects-dialog-spinner projects-dialog-spinner-sidebar"><img src="red/images/spin.svg"/></div>').appendTo(container);
        return spinner;
    }
    function editDescription(activeProject, container) {
        RED.editor.editMarkdown({
            title: RED._('sidebar.project.editDescription'),
            value: activeProject.description,
            complete: function(v) {
                container.empty();
                var spinner = addSpinnerOverlay(container);
                var done = function(err,res) {
                    if (err) {
                        return editDescription(activeProject, container);
                    }
                    activeProject.description = v;
                    updateProjectDescription(activeProject, container);
                }
                utils.sendRequest({
                    url: "projects/"+activeProject.name,
                    type: "PUT",
                    responses: {
                        0: function(error) {
                            done(error,null);
                        },
                        200: function(data) {
                            done(null,data);
                        },
                        400: {
                            'unexpected_error': function(error) {
                                done(error,null);
                            }
                        },
                    }
                },{description:v}).always(function() {
                    spinner.remove();
                });
            }
        });
    }
    function updateProjectDescription(activeProject, container) {
        container.empty();
        var desc = marked(activeProject.description||"");
        var description = addTargetToExternalLinks($('<span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(desc)+'">'+desc+'</span>')).appendTo(container);
        description.find(".bidiAware").contents().filter(function() { return this.nodeType === 3 && this.textContent.trim() !== "" }).wrap( "<span></span>" );
    }

    function editSummary(activeProject, summary, container) {
        var editButton = container.prev();
        editButton.hide();
        container.empty();
        var bg = $('<span class="button-group" style="position: relative; float: right; margin-right:0;"></span>').appendTo(container);
        var input = $('<input type="text" style="width: calc(100% - 150px); margin-right: 10px;">').val(summary||"").appendTo(container);
        $('<button class="editor-button">Cancel</button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                updateProjectSummary(activeProject.summary, container);
                editButton.show();
            });
        $('<button class="editor-button">Done</button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                var v = input.val();
                updateProjectSummary(v, container);
                var spinner = addSpinnerOverlay(container);
                var done = function(err,res) {
                    if (err) {
                        spinner.remove();
                        return editSummary(activeProject, summary, container);
                    }
                    activeProject.summary = v;
                    spinner.remove();
                    updateProjectSummary(activeProject.summary, container);
                    editButton.show();
                }
                utils.sendRequest({
                    url: "projects/"+activeProject.name,
                    type: "PUT",
                    responses: {
                        0: function(error) {
                            done(error,null);
                        },
                        200: function(data) {
                            done(null,data);
                        },
                        400: {
                            'unexpected_error': function(error) {
                                done(error,null);
                            }
                        },
                    }
                },{summary:v});
            });
    }
    function updateProjectSummary(summary, container) {
        container.empty();
        if (summary) {
            container.text(summary).removeClass('node-info-node');
        } else {
            container.text("NLS: No summary available").addClass('node-info-none');
        }
    }

    function createViewPane(activeProject) {

        var pane = $('<div id="project-settings-tab-main" class="project-settings-tab-pane node-help"></div>');
        $('<h1>').text(activeProject.name).appendTo(pane);
        var summary = $('<div style="position: relative">').appendTo(pane);
        var summaryContent = $('<div></div>',{style:"color: #999"}).appendTo(summary);
        updateProjectSummary(activeProject.summary, summaryContent);
        $('<button class="editor-button editor-button-small" style="float: right;">edit</button>')
            .prependTo(summary)
            .click(function(evt) {
                evt.preventDefault();
                editSummary(activeProject, activeProject.summary, summaryContent);
            });
        $('<hr>').appendTo(pane);

        var description = $('<div class="node-help" style="position: relative"></div>').appendTo(pane);
        var descriptionContent = $('<div>',{style:"min-height: 200px"}).appendTo(description);

        updateProjectDescription(activeProject, descriptionContent);

        $('<button class="editor-button editor-button-small" style="float: right;">edit</button>')
            .prependTo(description)
            .click(function(evt) {
                evt.preventDefault();
                editDescription(activeProject, descriptionContent);
            });

        return pane;
    }

    var utils;
    function init(_utils) {
        utils = _utils;
        addPane({
            id:'main',
            title: "NLS: Project",
            get: createViewPane,
            close: function() { }
        })
    }
    return {
        init: init,
        show: show
    };
})();
