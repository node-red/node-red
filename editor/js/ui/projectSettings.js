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
                settingsTabs.activateTab("project-settings-tab-"+(initialTab||'main'))
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

        var totalCount = 0;
        var unknownCount = 0;
        var unusedCount = 0;

        for (var m in modulesInUse) {
            if (modulesInUse.hasOwnProperty(m)) {
                depsList.editableList('addItem',{
                    module: modulesInUse[m].module,
                    version: modulesInUse[m].version,
                    count: modulesInUse[m].count,
                    known: activeProject.dependencies.hasOwnProperty(m)
                });
                totalCount++;
                if (modulesInUse[m].count === 0) {
                    unusedCount++;
                }
                if (!activeProject.dependencies.hasOwnProperty(m)) {
                    unknownCount++;
                }
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
                    totalCount++;
                    unusedCount++;
                }
            }
        }
        if (unknownCount > 0) {
            depsList.editableList('addItem',{index:1, label:"Unknown Dependencies"}); // TODO: nls
        }
        if (unusedCount > 0) {
            depsList.editableList('addItem',{index:3, label:"Unused dependencies"}); // TODO: nls
        }
        if (totalCount === 0) {
            depsList.editableList('addItem',{index:0, label:"None"}); // TODO: nls
        }

    }

    function editDependencies(activeProject,depsJSON,container,depsList) {
        var json = depsJSON||JSON.stringify(activeProject.dependencies||{},"",4);
        if (json === "{}") {
            json = "{\n\n}";
        }
        RED.editor.editJSON({
            title: RED._('sidebar.project.editDependencies'),
            value: json,
            requireValid: true,
            complete: function(v) {
                try {
                    var parsed = JSON.parse(v);
                    var spinner = addSpinnerOverlay(container);

                    var done = function(err,res) {
                        if (err) {
                            return editDependencies(activeProject,v,container,depsList);
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
                    if (entry.index === 0) {
                        headerRow.addClass("red-ui-search-empty")
                    } else {
                        row.parent().addClass("palette-module-section");
                    }
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
                    headerRow.addClass("palette-module-header");
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

    function createSettingsPane(activeProject) {
        var pane = $('<div id="project-settings-tab-settings" class="project-settings-tab-pane node-help"></div>');
        $('<h3></h3>').text("Credentials").appendTo(pane);
        var row = $('<div class="user-settings-row"></div>').appendTo(pane);
        if (activeProject.settings.credentialsEncrypted) {
            $('<span style="margin-right: 20px;"><i class="fa fa-lock"></i> Credentials are encrypted</span>').appendTo(row);
        } else {
            $('<span style="margin-right: 20px;"><i class="fa fa-unlock"></i> Credentials are not encrypted</span>').appendTo(row);
        }
        var resetButton;
        var action;
        var changeButton = $('<button id="" class="editor-button"></button>')
            .text(activeProject.settings.credentialsEncrypted?"Change key":"Enable encryption")
            .appendTo(row)
            .click(function(evt) {
                evt.preventDefault();
                newKey.val("");
                if (currentKey) {
                    currentKey.val("");
                    currentKey.removeClass("input-error");
                }
                checkInputs();
                saveButton.text("Save");

                $(".project-settings-credentials-row").show();
                $(".project-settings-credentials-current-row").show();
                $(this).prop('disabled',true);
                if (resetButton) {
                    resetButton.prop('disabled',true);
                }
                action = 'change';
            });
        if (activeProject.settings.credentialsEncrypted) {
            resetButton = $('<button id="" style="margin-left: 10px;" class="editor-button"></button>')
                .text("Reset key")
                .appendTo(row)
                .click(function(evt) {
                    evt.preventDefault();
                    newKey.val("");
                    if (currentKey) {
                        currentKey.val("");
                        currentKey.removeClass("input-error");
                    }
                    checkInputs();
                    saveButton.text("Reset key");

                    $(".project-settings-credentials-row").show();
                    $(".project-settings-credentials-reset-row").show();

                    $(this).prop('disabled',true);
                    changeButton.prop('disabled',true);
                    action = 'reset';
                });
        }

        if (activeProject.settings.credentialsInvalid) {
            row = $('<div class="user-settings-row"></div>').appendTo(pane);
            $('<div class="form-tips form-warning"><i class="fa fa-warning"></i> The current key is not valid. Set the correct key or reset credentials.</div>').appendTo(row);
        }

        var credentialsContainer = $('<div>',{style:"position:relative"}).appendTo(pane);
        var currentKey;
        var newKey;

        var checkInputs = function() {
            var valid = true;
            if (newKey.val().length === 0) {
                valid = false;
            }
            if (currentKey && currentKey.val() === 0) {
                valid = false;
            }
            saveButton.toggleClass('disabled',!valid);
        }

        if (activeProject.settings.credentialsEncrypted) {
            if  (!activeProject.settings.credentialsInvalid) {
                row = $('<div class="user-settings-row project-settings-credentials-current-row hide"></div>').appendTo(credentialsContainer);
                $('<label for="">Current key</label>').appendTo(row);
                currentKey = $('<input type="password">').appendTo(row);
                currentKey.on("change keyup paste",function() {
                    if (popover) {
                        popover.close();
                        popover = null;
                        $(this).removeClass('input-error');
                    }
                    checkInputs();
                });
            }
            row = $('<div class="user-settings-row project-settings-credentials-reset-row hide"></div>').appendTo(credentialsContainer);
            $('<div class="form-tips form-warning"><i class="fa fa-warning"></i> Resetting the key will delete all existing credentials</div>').appendTo(row);

        }
        // $('<label for="" style="margin-left:20px; width: auto;"><input type="radio" name="project-settings-credentials-current" value="lost"> Forgotten key?</label>').appendTo(row);

        row = $('<div class="user-settings-row project-settings-credentials-row hide"></div>').appendTo(credentialsContainer);
        $('<label for=""></label>').text((activeProject.settings.credentialsEncrypted&& !activeProject.settings.credentialsInvalid)?"New key":"Encryption key").appendTo(row);
        newKey = $('<input type="password">').appendTo(row).on("change keyup paste",checkInputs);

        row = $('<div class="user-settings-row project-settings-credentials-row hide"></div>').appendTo(credentialsContainer);
        var bg = $('<div class="button-group" style="text-align: right; margin-right:20px;"></div>').appendTo(row);
        $('<button class="editor-button">Cancel</button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                if (popover) {
                    popover.close();
                    popover = null;
                }
                changeButton.prop('disabled',false);
                if (resetButton) {
                    resetButton.prop('disabled',false);
                }
                $(".project-settings-credentials-row").hide();
                $(".project-settings-credentials-current-row").hide();
                $(".project-settings-credentials-reset-row").hide();
            });
        var saveButton = $('<button class="editor-button primary disabled"></button>')
            .text("Save")
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                if ($(this).hasClass('disabled')) {
                    return;
                }
                var spinner = addSpinnerOverlay(credentialsContainer);
                var payload = {
                    credentialSecret: newKey.val()
                };
                if (activeProject.settings.credentialsInvalid) {
                    RED.deploy.setDeployInflight(true);
                }

                if (activeProject.settings.credentialsEncrypted) {
                    if (action === 'reset') {
                        payload.resetCredentialSecret = true;
                    } else if (!activeProject.settings.credentialsInvalid) {
                        payload.currentCredentialSecret = currentKey.val();
                    }
                }
                var done = function(err,res) {
                    spinner.remove();
                    if (err) {
                        console.log(err);
                        return;
                    }
                }
                utils.sendRequest({
                    url: "projects/"+activeProject.name,
                    type: "PUT",
                    responses: {
                        0: function(error) {
                            done(error,null);
                        },
                        200: function(data) {
                            if (popover) {
                                popover.close();
                                popover = null;
                            }
                            changeButton.prop('disabled',false);
                            if (resetButton) {
                                resetButton.prop('disabled',false);
                            }
                            $(".project-settings-credentials-row").hide();
                            $(".project-settings-credentials-current-row").hide();
                            $(".project-settings-credentials-reset-row").hide();
                        },
                        400: {
                            'unexpected_error': function(error) {
                                done(error,null);
                            },
                            'missing_current_credential_key':  function(error) {
                                currentKey.addClass("input-error");
                                popover = RED.popover.create({
                                    target: currentKey,
                                    direction: 'right',
                                    size: 'small',
                                    content: "Incorrect key"
                                }).open();
                                done();
                            }
                        },
                    }
                },payload).always(function() {
                    if (activeProject.settings.credentialsInvalid) {
                        RED.deploy.setDeployInflight(false);
                    }
                });
            });



        // $('<h3></h3>').text("Credentials").appendTo(pane);
        // row = $('<div class="user-settings-row"></div>').appendTo(pane);
        // $('<span style="margin-right: 20px;"><i class="fa fa-unlock"></i> Credentials are not encrypted</span>').appendTo(row);
        // $('<button id="" class="editor-button">Set key</button>').appendTo(row);


        // $('<h3></h3>').text("Repository").appendTo(pane);
        // row = $('<div class="user-settings-row"></div>').appendTo(pane);
        // var input;
        // $('<label for="">'+'Remote'+'</label>').appendTo(row);
        // $('<input id="" type="text">').appendTo(row);


        return pane;
    }

    var popover;

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
        addPane({
            id:'settings',
            title: "Settings", // TODO: nls
            get: createSettingsPane,
            close: function() {
                if (popover) {
                    popover.close();
                    popover = null;
                }
            }
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
        show: show,
        switchProject: function(name) {
            // TODO: not ideal way to trigger this; should there be an editor-wide event?
            modulesInUse = {};
        }
    };
})();
