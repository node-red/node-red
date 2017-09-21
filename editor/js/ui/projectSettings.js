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
            title: "Project Information",// RED._("menu.label.userSettings"),, // TODO: nls
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
            container.text("No summary available").addClass('node-info-none');// TODO: nls
        }
    }

    function createMainPane(activeProject) {

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
    function updateProjectDependencies(activeProject,depsList) {
        depsList.editableList('empty');
        depsList.editableList('addItem',{index:1, label:"Unknown Dependencies"}); // TODO: nls
        depsList.editableList('addItem',{index:3, label:"Unused dependencies"}); // TODO: nls

        for (var m in modulesInUse) {
            if (modulesInUse.hasOwnProperty(m)) {
                depsList.editableList('addItem',{
                    module: modulesInUse[m].module,
                    version: modulesInUse[m].version,
                    count: modulesInUse[m].count,
                    known: activeProject.dependencies.hasOwnProperty(m)
                });
            }
        }

        if (activeProject.dependencies) {
            for (var m in activeProject.dependencies) {
                if (activeProject.dependencies.hasOwnProperty(m) && !modulesInUse.hasOwnProperty(m)) {
                    depsList.editableList('addItem',{
                        module: m,
                        version: activeProject.dependencies[m], //RED.nodes.registry.getModule(module).version,
                        count: 0,
                        known: true
                    });
                }
            }
        }
    }

    function editDependencies(activeProject,depsJSON,container,depsList) {
        RED.editor.editJSON({
            title: RED._('sidebar.project.editDependencies'),
            value: depsJSON||JSON.stringify(activeProject.dependencies||{},"",4),
            requireValid: true,
            complete: function(v) {
                try {
                    var parsed = JSON.parse(v);
                    var spinner = addSpinnerOverlay(container);

                    var done = function(err,res) {
                        if (err) {
                            editDependencies(activeProject,v,container,depsList);
                        }
                        activeProject.dependencies = parsed;
                        updateProjectDependencies(activeProject,depsList);
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
                    },{dependencies:parsed}).always(function() {
                        spinner.remove();
                    });
                } catch(err) {
                    editDependencies(activeProject,v,container,depsList);
                }
            }
        });
    }

    function createDependenciesPane(activeProject) {
        var pane = $('<div id="project-settings-tab-deps" class="project-settings-tab-pane node-help"></div>');
        $('<button class="editor-button editor-button-small" style="margin-top:10px;float: right;">edit</button>')
            .appendTo(pane)
            .click(function(evt) {
                evt.preventDefault();
                editDependencies(activeProject,null,pane,depsList)
            });
        var depsList = $("<ol>",{style:"position: absolute;top: 60px;bottom: 20px;left: 20px;right: 20px;"}).appendTo(pane);
        depsList.editableList({
            addButton: false,
            addItem: function(row,index,entry) {
                // console.log(entry);
                var headerRow = $('<div>',{class:"palette-module-header"}).appendTo(row);
                if (entry.label) {
                    row.parent().addClass("palette-module-section");
                    headerRow.text(entry.label);
                    if (entry.index === 1) {
                        var addButton = $('<button class="editor-button editor-button-small palette-module-button">add to project</button>').appendTo(headerRow).click(function(evt) {
                            evt.preventDefault();
                            var deps = $.extend(true, {}, activeProject.dependencies);
                            for (var m in modulesInUse) {
                                if (modulesInUse.hasOwnProperty(m) && !modulesInUse[m].known) {
                                    deps[m] = modulesInUse[m].version;
                                }
                            }
                            editDependencies(activeProject,JSON.stringify(deps,"",4),pane,depsList);
                        });
                    } else if (entry.index === 3) {
                        var removeButton = $('<button class="editor-button editor-button-small palette-module-button">remove from project</button>').appendTo(headerRow).click(function(evt) {
                            evt.preventDefault();
                            var deps = $.extend(true, {}, activeProject.dependencies);
                            for (var m in activeProject.dependencies) {
                                if (activeProject.dependencies.hasOwnProperty(m) && !modulesInUse.hasOwnProperty(m)) {
                                    delete deps[m];
                                }
                            }
                            editDependencies(activeProject,JSON.stringify(deps,"",4),pane,depsList);
                        });
                    }
                } else {
                    headerRow.toggleClass("palette-module-unused",entry.count === 0);
                    entry.element = headerRow;
                    var titleRow = $('<div class="palette-module-meta palette-module-name"></div>').appendTo(headerRow);
                    var icon = $('<i class="fa fa-'+(entry.known?'cube':'warning')+'"></i>').appendTo(titleRow);
                    entry.icon = icon;
                    $('<span>').html(entry.module).appendTo(titleRow);
                    var metaRow = $('<div class="palette-module-meta palette-module-version"><i class="fa fa-tag"></i></div>').appendTo(headerRow);
                    var versionSpan = $('<span>').html(entry.version).appendTo(metaRow);
                    if (!entry.known) {
                        headerRow.addClass("palette-module-unknown");
                    } else if (entry.known && entry.count === 0) {

                    }
                }
            },
            sort: function(A,B) {
                if (A.index && B.index) {
                    return A.index - B.index;
                }
                var Acategory = A.index?A.index:(A.known?(A.count>0?0:4):2);
                var Bcategory = B.index?B.index:(B.known?(B.count>0?0:4):2);
                if (Acategory === Bcategory) {
                    return A.module.localeCompare(B.module);
                } else {
                    return Acategory - Bcategory;
                }
            }
        });

        updateProjectDependencies(activeProject,depsList);
        return pane;

    }

    var utils;
    var modulesInUse = {};
    function init(_utils) {
        utils = _utils;
        addPane({
            id:'main',
            title: "Project", // TODO: nls
            get: createMainPane,
            close: function() { }
        });
        addPane({
            id:'deps',
            title: "Dependencies", // TODO: nls
            get: createDependenciesPane,
            close: function() { }
        });

        RED.events.on('nodes:add', function(n) {
            if (!/^subflow:/.test(n.type)) {
                var module = RED.nodes.registry.getNodeSetForType(n.type).module;
                if (module !== 'node-red') {
                    if (!modulesInUse.hasOwnProperty(module)) {
                        modulesInUse[module] = {
                            module: module,
                            version: RED.nodes.registry.getModule(module).version,
                            count: 0,
                            known: false
                        }
                    }
                    modulesInUse[module].count++;
                }
            }
        })
        RED.events.on('nodes:remove', function(n) {
            if (!/^subflow:/.test(n.type)) {
                var module = RED.nodes.registry.getNodeSetForType(n.type).module;
                if (module !== 'node-red' && modulesInUse.hasOwnProperty(module)) {
                    modulesInUse[module].count--;
                    if (modulesInUse[module].count === 0) {
                        if (!modulesInUse[module].known) {
                            delete modulesInUse[module];
                        }
                    }
                }
            }
        })



    }
    return {
        init: init,
        show: show
    };
})();
