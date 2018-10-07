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
        if (!RED.user.hasPermission("projects.write")) {
            RED.notify(RED._("user.errors.notAuthorized"),"error");
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

    function editDescription(activeProject, container) {
        RED.editor.editMarkdown({
            title: RED._('sidebar.project.editDescription'),
            header: $('<span><i class="fa fa-book"></i> README.md</span>'),
            value: activeProject.description,
            complete: function(v) {
                container.empty();
                var spinner = utils.addSpinnerOverlay(container);
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
                            RED.sidebar.versionControl.refresh(true);
                        },
                        400: {
                            '*': function(error) {
                                utils.reportUnexpectedError(error);
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
        var desc;
        if (activeProject.description) {
            desc = marked(activeProject.description);
        } else {
            desc = '<span class="node-info-none">'+'No description available'+'</span>';
        }
        var description = addTargetToExternalLinks($('<span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(desc)+'">'+desc+'</span>')).appendTo(container);
        description.find(".bidiAware").contents().filter(function() { return this.nodeType === 3 && this.textContent.trim() !== "" }).wrap( "<span></span>" );
    }

    function editSummary(activeProject, summary, container) {
        var editButton = container.prev();
        editButton.hide();
        container.empty();
        var bg = $('<span class="button-row" style="position: relative; float: right; margin-right:0;"></span>').appendTo(container);
        var input = $('<input type="text" style="width: calc(100% - 150px); margin-right: 10px;">').val(summary||"").appendTo(container);
        $('<button class="editor-button">' + RED._("common.label.cancel") + '</button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                updateProjectSummary(activeProject.summary, container);
                editButton.show();
            });
        $('<button class="editor-button">' + RED._("common.label.save") + '</button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                var v = input.val();
                updateProjectSummary(v, container);
                var spinner = utils.addSpinnerOverlay(container);
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
                            RED.sidebar.versionControl.refresh(true);
                            done(null,data);
                        },
                        400: {
                            '*': function(error) {
                                utils.reportUnexpectedError(error);
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
            container.text(RED._("sidebar.project.projectSettings.noSummaryAvailable")).addClass('node-info-none');
        }
    }

    function createMainPane(activeProject) {

        var pane = $('<div id="project-settings-tab-main" class="project-settings-tab-pane node-help"></div>');
        $('<h1>').text(activeProject.name).appendTo(pane);
        var summary = $('<div style="position: relative">').appendTo(pane);
        var summaryContent = $('<div></div>',{style:"color: #999"}).appendTo(summary);
        updateProjectSummary(activeProject.summary, summaryContent);
        if (RED.user.hasPermission("projects.write")) {
            $('<button class="editor-button editor-button-small" style="float: right;">' + RED._('sidebar.project.editDescription') + '</button>')
                .prependTo(summary)
                .click(function(evt) {
                    evt.preventDefault();
                    editSummary(activeProject, activeProject.summary, summaryContent);
                });
        }
        $('<hr>').appendTo(pane);

        var description = $('<div class="node-help" style="position: relative"></div>').appendTo(pane);
        var descriptionContent = $('<div>',{style:"min-height: 200px"}).appendTo(description);

        updateProjectDescription(activeProject, descriptionContent);

        if (RED.user.hasPermission("projects.write")) {
            $('<button class="editor-button editor-button-small" style="float: right;">' + RED._('sidebar.project.editReadme') + '</button>')
                .prependTo(description)
                .click(function(evt) {
                    evt.preventDefault();
                    editDescription(activeProject, descriptionContent);
                });
        }
        return pane;
    }
    function updateProjectDependencies(activeProject,depsList) {
        depsList.editableList('empty');

        var totalCount = 0;
        var unknownCount = 0;
        var unusedCount = 0;
        var notInstalledCount = 0;

        for (var m in modulesInUse) {
            if (modulesInUse.hasOwnProperty(m)) {
                depsList.editableList('addItem',{
                    id: modulesInUse[m].module,
                    version: modulesInUse[m].version,
                    count: modulesInUse[m].count,
                    known: activeProject.dependencies.hasOwnProperty(m),
                    installed: true
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
                    var installed = !!RED.nodes.registry.getModule(m);
                    depsList.editableList('addItem',{
                        id: m,
                        version: activeProject.dependencies[m], //RED.nodes.registry.getModule(module).version,
                        count: 0,
                        known: true,
                        installed: installed
                    });
                    totalCount++;
                    if (installed) {
                        unusedCount++;
                    } else {
                        notInstalledCount++;
                    }
                }
            }
        }
        // if (notInstalledCount > 0) {
        //     depsList.editableList('addItem',{index:1, label:"Missing dependencies"}); // TODO: nls
        // }
        // if (unknownCount > 0) {
        //     depsList.editableList('addItem',{index:1, label:"Unlisted dependencies"}); // TODO: nls
        // }
        // if (unusedCount > 0) {
        //     depsList.editableList('addItem',{index:3, label:"Unused dependencies"}); // TODO: nls
        // }
        if (totalCount === 0) {
            depsList.editableList('addItem',{index:0, label:RED._("sidebar.project.projectSettings.none")});
        }

    }

    function saveDependencies(depsList,container,dependencies,complete) {
        var activeProject = RED.projects.getActiveProject();
        var spinner = utils.addSpinnerOverlay(container).addClass('projects-dialog-spinner-contain');
        var done = function(err,res) {
            spinner.remove();
            if (err) {
                return complete(err);
            }
            activeProject.dependencies = dependencies;
            RED.sidebar.versionControl.refresh(true);
            complete();
        }
        utils.sendRequest({
            url: "projects/"+activeProject.name,
            type: "PUT",
            responses: {
                0: function(error) {
                    done(error,null);
                },
                200: function(data) {
                    RED.sidebar.versionControl.refresh(true);
                    done(null,data);
                },
                400: {
                    '*': function(error) {
                        done(error,null);
                    }
                },
            }
        },{dependencies:dependencies});
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
                    saveDependencies(depsList,container,parsed,function(err) {
                        if (err) {
                            return editDependencies(activeProject,v,container,depsList);
                        }
                        activeProject.dependencies = parsed;
                        updateProjectDependencies(activeProject,depsList);
                    });
                } catch(err) {
                    editDependencies(activeProject,v,container,depsList);
                }
            }
        });
    }

    function createDependenciesPane(activeProject) {
        var pane = $('<div id="project-settings-tab-deps" class="project-settings-tab-pane node-help"></div>');
        if (RED.user.hasPermission("projects.write")) {
            $('<button class="editor-button editor-button-small" style="margin-top:10px;float: right;">' + RED._("sidebar.project.projectSettings.edit") + '</button>')
                .appendTo(pane)
                .click(function(evt) {
                    evt.preventDefault();
                    editDependencies(activeProject,null,pane,depsList)
                });
        }
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
                    // if (RED.user.hasPermission("projects.write")) {
                    //     if (entry.index === 1) {
                    //         var addButton = $('<button class="editor-button editor-button-small palette-module-button">add to project</button>').appendTo(headerRow).click(function(evt) {
                    //             evt.preventDefault();
                    //             var deps = $.extend(true, {}, activeProject.dependencies);
                    //             for (var m in modulesInUse) {
                    //                 if (modulesInUse.hasOwnProperty(m) && !modulesInUse[m].known) {
                    //                     deps[m] = modulesInUse[m].version;
                    //                 }
                    //             }
                    //             editDependencies(activeProject,JSON.stringify(deps,"",4),pane,depsList);
                    //         });
                    //     } else if (entry.index === 3) {
                    //         var removeButton = $('<button class="editor-button editor-button-small palette-module-button">remove from project</button>').appendTo(headerRow).click(function(evt) {
                    //             evt.preventDefault();
                    //             var deps = $.extend(true, {}, activeProject.dependencies);
                    //             for (var m in activeProject.dependencies) {
                    //                 if (activeProject.dependencies.hasOwnProperty(m) && !modulesInUse.hasOwnProperty(m)) {
                    //                     delete deps[m];
                    //                 }
                    //             }
                    //             editDependencies(activeProject,JSON.stringify(deps,"",4),pane,depsList);
                    //         });
                    //     }
                    // }
                } else {
                    headerRow.addClass("palette-module-header");
                    if (!entry.installed) {
                        headerRow.addClass("palette-module-not-installed");
                    } else if (entry.count === 0) {
                        headerRow.addClass("palette-module-unused");
                    } else if (!entry.known) {
                        headerRow.addClass("palette-module-unknown");
                    }

                    entry.element = headerRow;
                    var titleRow = $('<div class="palette-module-meta palette-module-name"></div>').appendTo(headerRow);
                    var iconClass = "fa-cube";
                    if (!entry.installed) {
                        iconClass = "fa-warning";
                    }
                    var icon = $('<i class="fa '+iconClass+'"></i>').appendTo(titleRow);
                    entry.icon = icon;
                    $('<span>').text(entry.id).appendTo(titleRow);
                    var metaRow = $('<div class="palette-module-meta palette-module-version"><i class="fa fa-tag"></i></div>').appendTo(headerRow);
                    var versionSpan = $('<span>').text(entry.version).appendTo(metaRow);
                    metaRow = $('<div class="palette-module-meta"></div>').appendTo(headerRow);
                    var buttons = $('<div class="palette-module-button-group"></div>').appendTo(metaRow);
                    if (RED.user.hasPermission("projects.write")) {
                        if (!entry.installed && RED.settings.theme('palette.editable') !== false) {
                            $('<a href="#" class="editor-button editor-button-small">' + RED._("sidebar.project.projectSettings.install") + '</a>').appendTo(buttons)
                                .click(function(evt) {
                                    evt.preventDefault();
                                    RED.palette.editor.install(entry,row,function(err) {
                                        if (!err) {
                                            entry.installed = true;
                                            var spinner = RED.utils.addSpinnerOverlay(row,true);
                                            setTimeout(function() {
                                                depsList.editableList('removeItem',entry);
                                                refreshModuleInUseCounts();
                                                if (modulesInUse.hasOwnProperty(entry.id)) {
                                                    entry.count = modulesInUse[entry.id].count;
                                                } else {
                                                    entry.count = 0;
                                                }
                                                depsList.editableList('addItem',entry);
                                            },500);
                                        }
                                    });
                                })
                        } else if (entry.known && entry.count === 0) {
                            $('<a href="#" class="editor-button editor-button-small">' + RED._("sidebar.project.projectSettings.removeFromProject") + '</a>').appendTo(buttons)
                                .click(function(evt) {
                                    evt.preventDefault();
                                    var deps = $.extend(true, {}, activeProject.dependencies);
                                    delete deps[entry.id];
                                    saveDependencies(depsList,row,deps,function(err) {
                                        if (!err) {
                                            row.fadeOut(200,function() {
                                                depsList.editableList('removeItem',entry);
                                            });
                                        } else {
                                            console.log(err);
                                        }
                                    });
                                });
                        } else if (!entry.known) {
                            $('<a href="#" class="editor-button editor-button-small">' + RED._("sidebar.project.projectSettings.addToProject") + '</a>').appendTo(buttons)
                                .click(function(evt) {
                                    evt.preventDefault();
                                    var deps = $.extend(true, {}, activeProject.dependencies);
                                    deps[entry.id] = modulesInUse[entry.id].version;
                                    saveDependencies(depsList,row,deps,function(err) {
                                        if (!err) {
                                            buttons.remove();
                                            headerRow.removeClass("palette-module-unknown");
                                        } else {
                                            console.log(err);
                                        }
                                    });
                                });
                        }
                    }
                }
            },
            sort: function(A,B) {
                return A.id.localeCompare(B.id);
                // if (A.index && B.index) {
                //     return A.index - B.index;
                // }
                // var Acategory = A.index?A.index:(A.known?(A.count>0?0:4):2);
                // var Bcategory = B.index?B.index:(B.known?(B.count>0?0:4):2);
                // if (Acategory === Bcategory) {
                //     return A.id.localeCompare(B.id);
                // } else {
                //     return Acategory - Bcategory;
                // }
            }
        });

        updateProjectDependencies(activeProject,depsList);
        return pane;

    }

    function showProjectFileListing(row,activeProject,current,filter,done) {
        var dialog;
        var dialogBody;
        var filesList;
        var selected;
        var container = $('<div class="project-file-listing-container"></div>',{style:"position: relative; min-height: 175px; height: 175px;"}).hide().appendTo(row);
        var spinner = utils.addSpinnerOverlay(container);
        $.getJSON("projects/"+activeProject.name+"/files",function(result) {
            var fileNames = Object.keys(result);
            fileNames = fileNames.filter(function(fn) {
                return !result[fn].status || !/D/.test(result[fn].status);
            })
            var files = {};
            fileNames.sort();
            fileNames.forEach(function(file) {
                file.split("/").reduce(function(r,v,i,arr) { if (v) { if (i<arr.length-1) { r[v] = r[v]||{};} else { r[v] = true }return r[v];}},files);
            });
            var sortFiles = function(key,value,fullPath) {
                var result = {
                    name: key||"/",
                    path: fullPath+(fullPath?"/":"")+key,
                };
                if (value === true) {
                    result.type = 'f';
                    return result;
                }
                result.type = 'd';
                result.children = [];
                result.path = result.path;
                var files = Object.keys(value);
                files.forEach(function(file) {
                    result.children.push(sortFiles(file,value[file],result.path));
                })
                result.children.sort(function(A,B) {
                    if (A.hasOwnProperty("children") && !B.hasOwnProperty("children")) {
                        return -1;
                    } else if (!A.hasOwnProperty("children") && B.hasOwnProperty("children")) {
                        return 1;
                    }
                    return A.name.localeCompare(B.name);
                })
                return result;
            }
            var files = sortFiles("",files,"");
            createFileSubList(container,files.children,current,filter,done,"height: 175px");
            spinner.remove();
        });
        return container;
    }

    function createFileSubList(container, files, current, filter, onselect, style) {
        style = style || "";
        var list = $('<ol>',{class:"projects-dialog-file-list", style:style}).appendTo(container).editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(row,index,entry) {
                var header = $('<div></div>',{class:"projects-dialog-file-list-entry"}).appendTo(row);
                if (entry.children) {
                    $('<span class="projects-dialog-file-list-entry-folder"><i class="fa fa-angle-right"></i> <i class="fa fa-folder-o"></i></span>').appendTo(header);
                    if (entry.children.length > 0) {
                        var children = $('<div></div>',{style:"padding-left: 20px;"}).appendTo(row);
                        if (current.indexOf(entry.path+"/") === 0) {
                            header.addClass("expanded");
                        } else {
                            children.hide();
                        }
                        createFileSubList(children,entry.children,current,filter,onselect);
                        header.addClass("selectable");
                        header.click(function(e) {
                            if ($(this).hasClass("expanded")) {
                                $(this).removeClass("expanded");
                                children.slideUp(200);
                            } else {
                                $(this).addClass("expanded");
                                children.slideDown(200);
                            }

                        });

                    }
                } else {
                    var fileIcon = "fa-file-o";
                    var fileClass = "";
                    if (/\.json$/i.test(entry.name)) {
                        fileIcon = "fa-file-code-o"
                    } else if (/\.md$/i.test(entry.name)) {
                        fileIcon = "fa-book";
                    } else if (/^\.git/i.test(entry.name)) {
                        fileIcon = "fa-code-fork";
                        header.addClass("projects-dialog-file-list-entry-file-type-git");
                    }
                    $('<span class="projects-dialog-file-list-entry-file"> <i class="fa '+fileIcon+'"></i></span>').appendTo(header);
                    if (filter.test(entry.name)) {
                        header.addClass("selectable");
                        if (entry.path === current) {
                            header.addClass("selected");
                        }
                        header.click(function(e) {
                            $(".projects-dialog-file-list-entry.selected").removeClass("selected");
                            $(this).addClass("selected");
                            onselect(entry.path);
                        })
                        header.dblclick(function(e) {
                            e.preventDefault();
                            onselect(entry.path,true);
                        })
                    } else {
                        header.addClass("unselectable");
                    }
                }
                $('<span class="projects-dialog-file-list-entry-name" style=""></span>').text(entry.name).appendTo(header);
            }
        });
        if (!style) {
            list.parent().css("overflow-y","");
        }
        files.forEach(function(f) {
            list.editableList('addItem',f);
        })
    }

    // function editFiles(activeProject, container,flowFile, flowFileLabel) {
    //     var editButton = container.children().first();
    //     editButton.hide();
    //
    //     var flowFileInput = $('<input id="" type="text" style="width: calc(100% - 300px);">').val(flowFile).insertAfter(flowFileLabel);
    //
    //     var flowFileInputSearch = $('<button class="editor-button" style="margin-left: 10px"><i class="fa fa-folder-open-o"></i></button>')
    //         .insertAfter(flowFileInput)
    //         .click(function(e) {
    //             showProjectFileListing(activeProject,'Select flow file',flowFileInput.val(),function(result) {
    //                 flowFileInput.val(result);
    //                 checkFiles();
    //             })
    //         })
    //
    //     var checkFiles = function() {
    //         saveButton.toggleClass('disabled',flowFileInput.val()==="");
    //         saveButton.prop('disabled',flowFileInput.val()==="");
    //     }
    //     flowFileInput.on("change keyup paste",checkFiles);
    //     flowFileLabel.hide();
    //
    //     var bg = $('<span class="button-group" style="position: relative; float: right; margin-right:0;"></span>').prependTo(container);
    //     $('<button class="editor-button">Cancel</button>')
    //         .appendTo(bg)
    //         .click(function(evt) {
    //             evt.preventDefault();
    //
    //             flowFileLabel.show();
    //             flowFileInput.remove();
    //             flowFileInputSearch.remove();
    //             bg.remove();
    //             editButton.show();
    //         });
    //     var saveButton = $('<button class="editor-button">Save</button>')
    //         .appendTo(bg)
    //         .click(function(evt) {
    //             evt.preventDefault();
    //             var newFlowFile = flowFileInput.val();
    //             var newCredsFile = credentialsFileInput.val();
    //             var spinner = utils.addSpinnerOverlay(container);
    //             var done = function(err,res) {
    //                 if (err) {
    //                     spinner.remove();
    //                     return;
    //                 }
    //                 activeProject.summary = v;
    //                 spinner.remove();
    //                 flowFileLabel.text(newFlowFile);
    //                 flowFileLabel.show();
    //                 flowFileInput.remove();
    //                 flowFileInputSearch.remove();
    //                 bg.remove();
    //                 editButton.show();
    //             }
    //             // utils.sendRequest({
    //             //     url: "projects/"+activeProject.name,
    //             //     type: "PUT",
    //             //     responses: {
    //             //         0: function(error) {
    //             //             done(error,null);
    //             //         },
    //             //         200: function(data) {
    //             //             done(null,data);
    //             //         },
    //             //         400: {
    //             //             'unexpected_error': function(error) {
    //             //                 done(error,null);
    //             //             }
    //             //         },
    //             //     }
    //             // },{summary:v});
    //         });
    //
    //
    //     checkFiles();
    //
    // }

    function createFilesSection(activeProject,pane) {
        var title = $('<h3></h3>').text(RED._("sidebar.project.projectSettings.files")).appendTo(pane);
        var filesContainer = $('<div class="user-settings-section"></div>').appendTo(pane);
        if (RED.user.hasPermission("projects.write")) {
            var editFilesButton = $('<button class="editor-button editor-button-small" style="float: right;">' + RED._('sidebar.project.projectSettings.edit') + '</button>')
                .appendTo(title)
                .click(function(evt) {
                    evt.preventDefault();
                    formButtons.show();
                    editFilesButton.hide();
                    flowFileLabelText.hide();
                    flowFileInput.show();
                    flowFileInputSearch.show();
                    credFileLabel.hide();
                    credFileInput.show();
                    flowFileInput.focus();
                    // credentialStateLabel.parent().hide();
                    credentialStateLabel.addClass("uneditable-input");
                    $(".user-settings-row-credentials").show();
                    credentialStateLabel.css('height','auto');
                    credentialFormRows.hide();
                    credentialSecretButtons.show();
                });
        }
        var row;

        // Flow files
        row = $('<div class="user-settings-row"></div>').appendTo(filesContainer);
        $('<label for=""></label>').text(RED._("sidebar.project.projectSettings.flow")).appendTo(row);
        var flowFileLabel = $('<div class="uneditable-input" style="padding:0">').appendTo(row);
        var flowFileLabelText = $('<span style="display:inline-block; padding: 6px">').text(activeProject.files.flow).appendTo(flowFileLabel);

        var flowFileInput = $('<input id="" type="text" style="margin-bottom: 0;width: 100%; border: none;">').val(activeProject.files.flow).hide().appendTo(flowFileLabel);
        var flowFileInputSearch = $('<button class="editor-button" style="border-top-right-radius: 4px; border-bottom-right-radius: 4px; width: 36px; height: 34px; position: absolute; top: -1px; right: -1px;"><i class="fa fa-folder-open-o"></i></button>')
            .hide()
            .appendTo(flowFileLabel)
            .click(function(e) {
                if ($(this).hasClass('selected')) {
                    $(this).removeClass('selected');
                    flowFileLabel.find('.project-file-listing-container').slideUp(200,function() {
                         $(this).remove();
                         flowFileLabel.css('height','');
                     });
                    flowFileLabel.css('color','');
                } else {
                    $(this).addClass('selected');
                    flowFileLabel.css('color','inherit');
                    var fileList = showProjectFileListing(flowFileLabel,activeProject,flowFileInput.val(), /.*\.json$/,function(result,isDblClick) {
                        if (result) {
                            flowFileInput.val(result);
                        }
                        if (isDblClick) {
                            $(flowFileInputSearch).click();
                        }
                        checkFiles();
                    });
                    flowFileLabel.css('height','auto');
                    setTimeout(function() {
                        fileList.slideDown(200);
                    },50);

                }
            })

        row = $('<div class="user-settings-row"></div>').appendTo(filesContainer);
        $('<label for=""></label>').text(RED._("sidebar.project.projectSettings.credentials")).appendTo(row);
        var credFileLabel = $('<div class="uneditable-input">').text(activeProject.files.credentials).appendTo(row);
        var credFileInput = $('<div class="uneditable-input">').text(activeProject.files.credentials).hide().insertAfter(credFileLabel);

        var checkFiles = function() {
            var saveDisabled;
            var currentFlowValue = flowFileInput.val();
            var m = /^(.+?)(\.[^.]*)?$/.exec(currentFlowValue);
            if (m) {
                credFileInput.text(m[1]+"_cred"+(m[2]||".json"));
            } else if (currentFlowValue === "") {
                credFileInput.text("");
            }
            var isFlowInvalid = currentFlowValue==="" ||
                                /\.\./.test(currentFlowValue) ||
                                /\/$/.test(currentFlowValue);

            saveDisabled = isFlowInvalid || credFileInput.text()==="";

            if (credentialSecretExistingInput.is(":visible")) {
                credentialSecretExistingInput.toggleClass("input-error", credentialSecretExistingInput.val() === "");
                saveDisabled = saveDisabled || credentialSecretExistingInput.val() === "";
            }
            if (credentialSecretNewInput.is(":visible")) {
                credentialSecretNewInput.toggleClass("input-error", credentialSecretNewInput.val() === "");
                saveDisabled = saveDisabled || credentialSecretNewInput.val() === "";
            }


            flowFileInput.toggleClass("input-error", isFlowInvalid);
            credFileInput.toggleClass("input-error",credFileInput.text()==="");
            saveButton.toggleClass('disabled',saveDisabled);
            saveButton.prop('disabled',saveDisabled);
        }
        flowFileInput.on("change keyup paste",checkFiles);


        if (!activeProject.files.flow) {
            $('<span class="form-warning"><i class="fa fa-warning"></i> Missing</span>').appendTo(flowFileLabelText);
        }
        if (!activeProject.files.credentials) {
            $('<span class="form-warning"><i class="fa fa-warning"></i> Missing</span>').appendTo(credFileLabel);
        }


        row = $('<div class="user-settings-row"></div>').appendTo(filesContainer);

        $('<label></label>').appendTo(row);
        var credentialStateLabel = $('<span><i class="user-settings-credentials-state-icon fa"></i> <span class="user-settings-credentials-state"></span></span>').appendTo(row);
        var credentialSecretButtons = $('<span class="button-group" style="margin-left: -72px;">').hide().appendTo(row);

        credentialStateLabel.css('color','#666');
        credentialSecretButtons.css('vertical-align','top');
        var credentialSecretResetButton = $('<button class="editor-button" style="vertical-align: top; width: 36px; margin-bottom: 10px"><i class="fa fa-trash-o"></i></button>')
            .appendTo(credentialSecretButtons)
            .click(function(e) {
                e.preventDefault();
                if (!$(this).hasClass('selected')) {
                    credentialSecretNewInput.val("");
                    credentialSecretExistingRow.hide();
                    credentialSecretNewRow.show();
                    $(this).addClass("selected");
                    credentialSecretEditButton.removeClass("selected");
                    credentialResetLabel.show();
                    credentialResetWarning.show();
                    credentialSetLabel.hide();
                    credentialChangeLabel.hide();

                    credentialFormRows.show();
                } else {
                    $(this).removeClass("selected");
                    credentialFormRows.hide();
                }
                checkFiles();
            });
        var credentialSecretEditButton = $('<button class="editor-button" style="border-top-right-radius: 4px; border-bottom-right-radius: 4px; vertical-align: top; width: 36px; margin-bottom: 10px"><i class="fa fa-pencil"></i></button>')
            .appendTo(credentialSecretButtons)
            .click(function(e) {
                e.preventDefault();
                if (!$(this).hasClass('selected')) {
                    credentialSecretExistingInput.val("");
                    credentialSecretNewInput.val("");
                    if (activeProject.settings.credentialSecretInvalid || !activeProject.settings.credentialsEncrypted) {
                        credentialSetLabel.show();
                        credentialChangeLabel.hide();
                        credentialSecretExistingRow.hide();
                    } else {
                        credentialSecretExistingRow.show();
                        credentialSetLabel.hide();
                        credentialChangeLabel.show();
                    }
                    credentialSecretNewRow.show();
                    credentialSecretEditButton.addClass("selected");
                    credentialSecretResetButton.removeClass("selected");

                    credentialResetLabel.hide();
                    credentialResetWarning.hide();
                    credentialFormRows.show();
                } else {
                    $(this).removeClass("selected");
                    credentialFormRows.hide();
                }
                checkFiles();
            })


        row = $('<div class="user-settings-row user-settings-row-credentials"></div>').hide().appendTo(filesContainer);



        var credentialFormRows = $('<div>',{style:"margin-top:10px"}).hide().appendTo(credentialStateLabel);

        var credentialSetLabel = $('<div style="margin: 20px 0 10px 5px;">' + RED._("sidebar.project.projectSettings.setTheEncryptionKey") + '</div>').hide().appendTo(credentialFormRows);
        var credentialChangeLabel = $('<div style="margin: 20px 0 10px 5px;">' + RED._("sidebar.project.projectSettings.changeTheEncryptionKey") + '</div>').hide().appendTo(credentialFormRows);
        var credentialResetLabel = $('<div style="margin: 20px 0 10px 5px;">' + RED._("sidebar.project.projectSettings.resetTheEncryptionKey") + '</div>').hide().appendTo(credentialFormRows);

        var credentialSecretExistingRow = $('<div class="user-settings-row user-settings-row-credentials"></div>').appendTo(credentialFormRows);
        $('<label for=""></label>').text(RED._("sidebar.project.projectSettings.currentKey")).appendTo(credentialSecretExistingRow);
        var credentialSecretExistingInput = $('<input type="password">').appendTo(credentialSecretExistingRow)
            .on("change keyup paste",function() {
                if (popover) {
                    popover.close();
                    popover = null;
                }
                checkFiles();
            });

        var credentialSecretNewRow = $('<div class="user-settings-row user-settings-row-credentials"></div>').appendTo(credentialFormRows);


        $('<label for=""></label>').text(RED._("sidebar.project.projectSettings.newKey")).appendTo(credentialSecretNewRow);
        var credentialSecretNewInput = $('<input type="password">').appendTo(credentialSecretNewRow).on("change keyup paste",checkFiles);

        var credentialResetWarning = $('<div class="form-tips form-warning" style="margin: 10px;"><i class="fa fa-warning"></i>' + RED._("sidebar.project.projectSettings.credentialsAlert") + '</div>').hide().appendTo(credentialFormRows);


        var hideEditForm = function() {
            editFilesButton.show();
            formButtons.hide();
            flowFileLabelText.show();
            flowFileInput.hide();
            flowFileInputSearch.hide();
            credFileLabel.show();
            credFileInput.hide();
            // credentialStateLabel.parent().show();
            credentialStateLabel.removeClass("uneditable-input");
            credentialStateLabel.css('height','');

            flowFileInputSearch.removeClass('selected');
            flowFileLabel.find('.project-file-listing-container').remove();
            flowFileLabel.css('height','');
            flowFileLabel.css('color','');

            $(".user-settings-row-credentials").hide();
            credentialFormRows.hide();
            credentialSecretButtons.hide();
            credentialSecretResetButton.removeClass("selected");
            credentialSecretEditButton.removeClass("selected");


        }

        var formButtons = $('<span class="button-row" style="position: relative; float: right; margin-right:0;"></span>').hide().appendTo(filesContainer);
        $('<button class="editor-button">' + RED._("common.label.cancel") + '</button>')
            .appendTo(formButtons)
            .click(function(evt) {
                evt.preventDefault();
                hideEditForm();
            });
        var saveButton = $('<button class="editor-button">' + RED._("common.label.save") + '</button>')
            .appendTo(formButtons)
            .click(function(evt) {
                evt.preventDefault();
                var spinner = utils.addSpinnerOverlay(filesContainer);
                var done = function(err) {
                    spinner.remove();
                    if (err) {
                        utils.reportUnexpectedError(err);
                        return;
                    }
                    flowFileLabelText.text(flowFileInput.val());
                    credFileLabel.text(credFileInput.text());
                    hideEditForm();
                }
                var payload = {
                    files: {
                        flow: flowFileInput.val(),
                        credentials: credFileInput.text()
                    }
                }

                if (credentialSecretResetButton.hasClass('selected')) {
                    payload.resetCredentialSecret = true;
                }
                if (credentialSecretResetButton.hasClass('selected') || credentialSecretEditButton.hasClass('selected')) {
                    payload.credentialSecret = credentialSecretNewInput.val();
                    if (credentialSecretExistingInput.is(":visible")) {
                        payload.currentCredentialSecret = credentialSecretExistingInput.val();
                    }
                }

                // console.log(JSON.stringify(payload,null,4));
                RED.deploy.setDeployInflight(true);
                utils.sendRequest({
                    url: "projects/"+activeProject.name,
                    type: "PUT",
                    responses: {
                        0: function(error) {
                            done(error);
                        },
                        200: function(data) {
                            activeProject = data;
                            RED.sidebar.versionControl.refresh(true);
                            updateForm();
                            done();
                        },
                        400: {
                            'credentials_load_failed': function(error) {
                                done(error);
                            },
                            'missing_current_credential_key':  function(error) {
                                credentialSecretExistingInput.addClass("input-error");
                                popover = RED.popover.create({
                                    target: credentialSecretExistingInput,
                                    direction: 'right',
                                    size: 'small',
                                    content: "Incorrect key",
                                    autoClose: 3000
                                }).open();
                                done(error);
                            },
                            '*': function(error) {
                                done(error);
                            }
                        },
                    }
                },payload).always(function() {
                    setTimeout(function() {
                        RED.deploy.setDeployInflight(false);
                    },500);
                });
            });
        var updateForm = function() {
            if (activeProject.settings.credentialSecretInvalid) {
                credentialStateLabel.find(".user-settings-credentials-state-icon").removeClass().addClass("user-settings-credentials-state-icon fa fa-warning");
                credentialStateLabel.find(".user-settings-credentials-state").text(RED._("sidebar.project.projectSettings.invalidEncryptionKey"));
            } else if (activeProject.settings.credentialsEncrypted) {
                credentialStateLabel.find(".user-settings-credentials-state-icon").removeClass().addClass("user-settings-credentials-state-icon fa fa-lock");
                credentialStateLabel.find(".user-settings-credentials-state").text(RED._("sidebar.project.projectSettings.encryptionEnabled"));
            } else {
                credentialStateLabel.find(".user-settings-credentials-state-icon").removeClass().addClass("user-settings-credentials-state-icon fa fa-unlock");
                credentialStateLabel.find(".user-settings-credentials-state").text(RED._("sidebar.project.projectSettings.encryptionDisabled"));
            }
            credentialSecretResetButton.toggleClass('disabled',!activeProject.settings.credentialSecretInvalid && !activeProject.settings.credentialsEncrypted);
            credentialSecretResetButton.prop('disabled',!activeProject.settings.credentialSecretInvalid && !activeProject.settings.credentialsEncrypted);
        }

        checkFiles();
        updateForm();
    }

    function createLocalBranchListSection(activeProject,pane) {
        var localBranchContainer = $('<div class="user-settings-section"></div>').appendTo(pane);
        $('<h4></h4>').text(RED._("sidebar.project.projectSettings.branches")).appendTo(localBranchContainer);

        var row = $('<div class="user-settings-row projects-dialog-list"></div>').appendTo(localBranchContainer);


        var branchList = $('<ol>').appendTo(row).editableList({
            height: 'auto',
            addButton: false,
            scrollOnAdd: false,
            addItem: function(row,index,entry) {
                var container = $('<div class="projects-dialog-list-entry">').appendTo(row);
                if (entry.empty) {
                    container.addClass('red-ui-search-empty');
                    container.text(RED._("sidebar.project.projectSettings.noBranches"));
                    return;
                }
                if (entry.current) {
                    container.addClass("current");
                }
                $('<span class="entry-icon"><i class="fa fa-code-fork"></i></span>').appendTo(container);
                var content = $('<span>').appendTo(container);
                var topRow = $('<div>').appendTo(content);
                $('<span class="entry-name">').text(entry.name).appendTo(topRow);
                if (entry.commit) {
                    $('<span class="entry-detail">').text(entry.commit.sha).appendTo(topRow);
                }
                if (entry.remote) {
                    var bottomRow = $('<div>').appendTo(content);

                    $('<span class="entry-detail entry-remote-name">').text(entry.remote||"").appendTo(bottomRow);
                    if (entry.status.ahead+entry.status.behind > 0) {
                        $('<span class="entry-detail">'+
                            '<i class="fa fa-long-arrow-up"></i> <span>'+entry.status.ahead+'</span> '+
                            '<i class="fa fa-long-arrow-down"></i> <span>'+entry.status.behind+'</span>'+
                            '</span>').appendTo(bottomRow);
                    }
                }

                if (!entry.current) {
                    var tools = $('<span class="entry-tools">').appendTo(container);
                    $('<button class="editor-button editor-button-small"><i class="fa fa-trash"></i></button>')
                        .appendTo(tools)
                        .click(function(e) {
                            e.preventDefault();
                            var spinner = utils.addSpinnerOverlay(row).addClass('projects-dialog-spinner-contain');
                            var notification = RED.notify(RED._("sidebar.project.projectSettings.deleteConfirm", { name: entry.name }), {
                                type: "warning",
                                modal: true,
                                fixed: true,
                                buttons: [
                                    {
                                        text: RED._("common.label.cancel"),
                                        click: function() {
                                            spinner.remove();
                                            notification.close();
                                        }
                                    },{
                                        text: 'Delete branch',
                                        click: function() {
                                            notification.close();
                                            var url = "projects/"+activeProject.name+"/branches/"+entry.name;
                                            var options = {
                                                url: url,
                                                type: "DELETE",
                                                responses: {
                                                    200: function(data) {
                                                        row.fadeOut(200,function() {
                                                            branchList.editableList('removeItem',entry);
                                                            spinner.remove();
                                                        });
                                                    },
                                                    400: {
                                                        'git_delete_branch_unmerged': function(error) {
                                                            notification = RED.notify(RED._("sidebar.project.projectSettings.unmergedConfirm", { name: entry.name }), {
                                                                type: "warning",
                                                                modal: true,
                                                                fixed: true,
                                                                buttons: [
                                                                    {
                                                                        text: RED._("common.label.cancel"),
                                                                        click: function() {
                                                                            spinner.remove();
                                                                            notification.close();
                                                                        }
                                                                    },{
                                                                        text: RED._("sidebar.project.projectSettings.deleteUnmergedBranch"),
                                                                        click: function() {
                                                                            options.url += "?force=true";
                                                                            notification.close();
                                                                            utils.sendRequest(options);
                                                                        }
                                                                    }
                                                                ]
                                                            });
                                                        },
                                                        '*': function(error) {
                                                            utils.reportUnexpectedError(error);
                                                            spinner.remove();
                                                        }
                                                    },
                                                }
                                            }
                                            utils.sendRequest(options);
                                        }
                                    }

                                ]
                            })
                        })
                }

            }
        });

        $.getJSON("projects/"+activeProject.name+"/branches",function(result) {
            if (result.branches) {
                if (result.branches.length > 0) {
                    result.branches.sort(function(A,B) {
                        if (A.current) { return -1 }
                        if (B.current) { return 1 }
                        return A.name.localeCompare(B.name);
                    });
                    result.branches.forEach(function(branch) {
                        branchList.editableList('addItem',branch);
                    })
                } else {
                    branchList.editableList('addItem',{empty:true});
                }
            }
        })
    }

    function createRemoteRepositorySection(activeProject,pane) {
        $('<h3></h3>').text(RED._("sidebar.project.projectSettings.versionControl")).appendTo(pane);

        createLocalBranchListSection(activeProject,pane);

        var repoContainer = $('<div class="user-settings-section"></div>').appendTo(pane);
        var title = $('<h4></h4>').text(RED._("sidebar.project.projectSettings.gitRemotes")).appendTo(repoContainer);

        var editRepoButton = $('<button class="editor-button editor-button-small" style="float: right; margin-right: 10px;">' + RED._("sidebar.project.projectSettings.addRemote") + '</button>')
            .appendTo(title)
            .click(function(evt) {
                editRepoButton.attr('disabled',true);
                addRemoteDialog.slideDown(200, function() {
                    addRemoteDialog[0].scrollIntoView();
                    if (isEmpty) {
                        remoteNameInput.val('origin');
                        remoteURLInput.focus();
                    } else {
                        remoteNameInput.focus();
                    }
                    validateForm();
                });
            });


        var emptyItem = { empty: true };
        var isEmpty = true;
        var row = $('<div class="user-settings-row"></div>').appendTo(repoContainer);
        var addRemoteDialog = $('<div class="projects-dialog-list-dialog"></div>').hide().appendTo(row);
        row = $('<div class="user-settings-row projects-dialog-list"></div>').appendTo(repoContainer);
        var remotesList = $('<ol>').appendTo(row);
        remotesList.editableList({
            addButton: false,
            height: 'auto',
            addItem: function(row,index,entry) {

                var container = $('<div class="projects-dialog-list-entry">').appendTo(row);
                if (entry.empty) {
                    container.addClass('red-ui-search-empty');
                    container.text(RED._("sidebar.project.projectSettings.noRemotes"));
                    return;
                } else {
                    $('<span class="entry-icon"><i class="fa fa-globe"></i></span>').appendTo(container);
                    var content = $('<span>').appendTo(container);
                    $('<div class="entry-name">').text(entry.name).appendTo(content);
                    if (entry.urls.fetch === entry.urls.push) {
                        $('<div class="entry-detail">').text(entry.urls.fetch).appendTo(content);
                    } else {
                        $('<div class="entry-detail">').text("fetch: "+entry.urls.fetch).appendTo(content);
                        $('<div class="entry-detail">').text("push: "+entry.urls.push).appendTo(content);

                    }
                    var tools = $('<span class="entry-tools">').appendTo(container);
                    $('<button class="editor-button editor-button-small"><i class="fa fa-trash"></i></button>')
                        .appendTo(tools)
                        .click(function(e) {
                            e.preventDefault();
                            var spinner = utils.addSpinnerOverlay(row).addClass('projects-dialog-spinner-contain');
                            var notification = RED.notify(RED._("sidebar.project.projectSettings.deleteRemoteConfrim", { name: entry.name }), {
                                type: "warning",
                                modal: true,
                                fixed: true,
                                buttons: [
                                    {
                                        text: RED._("common.label.cancel"),
                                        click: function() {
                                            spinner.remove();
                                            notification.close();
                                        }
                                    },{
                                        text: RED._("sidebar.project.projectSettings.deleteRemote"),
                                        click: function() {
                                            notification.close();

                                            if (activeProject.git.branches.remote && activeProject.git.branches.remote.indexOf(entry.name+"/") === 0) {
                                                delete activeProject.git.branches.remote;
                                            }
                                            if (activeProject.git.branches.remoteAlt && activeProject.git.branches.remoteAlt.indexOf(entry.name+"/") === 0) {
                                                delete activeProject.git.branches.remoteAlt;
                                            }

                                            var url = "projects/"+activeProject.name+"/remotes/"+entry.name;
                                            var options = {
                                                url: url,
                                                type: "DELETE",
                                                responses: {
                                                    200: function(data) {
                                                        row.fadeOut(200,function() {
                                                            remotesList.editableList('removeItem',entry);
                                                            setTimeout(spinner.remove, 100);
                                                            if (data.remotes.length === 0) {
                                                                delete activeProject.git.remotes;
                                                                isEmpty = true;
                                                                remotesList.editableList('addItem',emptyItem);
                                                            } else {
                                                                activeProject.git.remotes = {};
                                                                data.remotes.forEach(function(remote) {
                                                                    var name = remote.name;
                                                                    delete remote.name;
                                                                    activeProject.git.remotes[name] = remote;
                                                                });
                                                            }
                                                            delete activeProject.git.branches.remoteAlt;
                                                            RED.sidebar.versionControl.refresh();
                                                        });
                                                    },
                                                    400: {
                                                        '*': function(error) {
                                                            utils.reportUnexpectedError(error);
                                                            spinner.remove();
                                                        }
                                                    },
                                                }
                                            }
                                            utils.sendRequest(options);
                                        }
                                    }

                                ]
                            })
                        });
                }


            }
        });

        var validateForm = function() {
            var validName = /^[a-zA-Z0-9\-_]+$/.test(remoteNameInput.val());
            var repo = remoteURLInput.val();
            // var validRepo = /^(?:file|git|ssh|https?|[\d\w\.\-_]+@[\w\.]+):(?:\/\/)?[\w\.@:\/~_-]+(?:\.git)?(?:\/?|\#[\d\w\.\-_]+?)$/.test(remoteURLInput.val());
            var validRepo = repo.length > 0 && !/\s/.test(repo);
            if (/^https?:\/\/[^/]+@/i.test(repo)) {
                remoteURLLabel.text(RED._("sidebar.project.projectSettings.urlRule2"));
                validRepo = false;
            } else {
                remoteURLLabel.text(RED._("sidebar.project.projectSettings.urlRule"));
            }
            saveButton.attr('disabled',(!validName || !validRepo))
            remoteNameInput.toggleClass('input-error',remoteNameInputChanged&&!validName);
            remoteURLInput.toggleClass('input-error',remoteURLInputChanged&&!validRepo);
            if (popover) {
                popover.close();
                popover = null;
            }
        };
        var popover;
        var remoteNameInputChanged = false;
        var remoteURLInputChanged = false;

        $('<div class="projects-dialog-list-dialog-header">').text(RED._('sidebar.project.projectSettings.addRemote2')).appendTo(addRemoteDialog);

        row = $('<div class="user-settings-row"></div>').appendTo(addRemoteDialog);
        $('<label for=""></label>').text(RED._("sidebar.project.projectSettings.remoteName")).appendTo(row);
        var remoteNameInput = $('<input type="text">').appendTo(row).on("change keyup paste",function() {
            remoteNameInputChanged = true;
            validateForm();
        });
        $('<label class="projects-edit-form-sublabel"><small>' + RED._("sidebar.project.projectSettings.nameRule") + '</small></label>').appendTo(row).find("small");
        row = $('<div class="user-settings-row"></div>').appendTo(addRemoteDialog);
        $('<label for=""></label>').text(RED._("sidebar.project.projectSettings.url")).appendTo(row);
        var remoteURLInput = $('<input type="text">').appendTo(row).on("change keyup paste",function() {
            remoteURLInputChanged = true;
            validateForm()
        });
        var remoteURLLabel = $('<label class="projects-edit-form-sublabel"><small>' + RED._("sidebar.project.projectSettings.urlRule") +'</small></label>').appendTo(row).find("small");

        var hideEditForm = function() {
            editRepoButton.attr('disabled',false);
            addRemoteDialog.hide();
            remoteNameInput.val("");
            remoteURLInput.val("");
            if (popover) {
                popover.close();
                popover = null;
            }
        }
        var formButtons = $('<span class="button-row" style="position: relative; float: right; margin: 10px;"></span>')
            .appendTo(addRemoteDialog);
        $('<button class="editor-button">' + RED._("common.label.cancel") + '</button>')
            .appendTo(formButtons)
            .click(function(evt) {
                evt.preventDefault();
                hideEditForm();
            });
        var saveButton = $('<button class="editor-button">' + RED._("sidebar.project.projectSettings.addRemote2") + '</button>')
            .appendTo(formButtons)
            .click(function(evt) {
                evt.preventDefault();
                var spinner = utils.addSpinnerOverlay(addRemoteDialog).addClass('projects-dialog-spinner-contain');

                var payload = {
                    name: remoteNameInput.val(),
                    url: remoteURLInput.val()
                }
                var done = function(err) {
                    spinner.remove();
                    if (err) {
                        return;
                    }
                    hideEditForm();
                }
                // console.log(JSON.stringify(payload,null,4));
                RED.deploy.setDeployInflight(true);
                utils.sendRequest({
                    url: "projects/"+activeProject.name+"/remotes",
                    type: "POST",
                    responses: {
                        0: function(error) {
                            done(error);
                        },
                        200: function(data) {
                            activeProject.git.remotes = {};
                            data.remotes.forEach(function(remote) {
                                var name = remote.name;
                                delete remote.name;
                                activeProject.git.remotes[name] = remote;
                            });
                            updateForm();
                            RED.sidebar.versionControl.refresh();
                            done();
                        },
                        400: {
                            'git_remote_already_exists': function(error) {
                                popover = RED.popover.create({
                                    target: remoteNameInput,
                                    direction: 'right',
                                    size: 'small',
                                    content: "Remote already exists",
                                    autoClose: 6000
                                }).open();
                                remoteNameInput.addClass('input-error');
                                done(error);
                            },
                            '*': function(error) {
                                utils.reportUnexpectedError(error);
                                done(error);
                            }
                        },
                    }
                },payload);
            });

        var updateForm = function() {
            remotesList.editableList('empty');
            var count = 0;
            if (activeProject.git.hasOwnProperty('remotes')) {
                for (var name in activeProject.git.remotes) {
                    if (activeProject.git.remotes.hasOwnProperty(name)) {
                        count++;
                        remotesList.editableList('addItem',{name:name,urls:activeProject.git.remotes[name]});
                    }
                }
            }
            isEmpty = (count === 0);
            if (isEmpty) {
                remotesList.editableList('addItem',emptyItem);
            }
        }
        updateForm();
    }



    function createSettingsPane(activeProject) {
        var pane = $('<div id="project-settings-tab-settings" class="project-settings-tab-pane node-help"></div>');
        createFilesSection(activeProject,pane);
        // createLocalRepositorySection(activeProject,pane);
        createRemoteRepositorySection(activeProject,pane);
        return pane;
    }

    function refreshModuleInUseCounts() {
        modulesInUse = {};
        RED.nodes.eachNode(_updateModulesInUse);
        RED.nodes.eachConfig(_updateModulesInUse);
    }

    function _updateModulesInUse(n) {
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
    }

    var popover;
    var utils;
    var modulesInUse = {};
    function init(_utils) {
        utils = _utils;
        addPane({
            id:'main',
            title: RED._("sidebar.project.name"),
            get: createMainPane,
            close: function() { }
        });
        addPane({
            id:'deps',
            title: RED._("sidebar.project.dependencies"),
            get: createDependenciesPane,
            close: function() { }
        });
        addPane({
            id:'settings',
            title: RED._("sidebar.project.settings"),
            get: createSettingsPane,
            close: function() {
                if (popover) {
                    popover.close();
                    popover = null;
                }
            }
        });

        RED.events.on('nodes:add', _updateModulesInUse);
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
