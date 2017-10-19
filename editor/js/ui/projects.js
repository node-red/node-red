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
RED.projects = (function() {

    var dialog;
    var dialogBody;

    var activeProject;

    var screens = {};
    function initScreens() {
        screens = {
            'welcome': {
                content: function() {
                    var container = $('<div class="projects-dialog-screen-start"></div>');
                    var buttons = $('<div style="margin: 30px"></div>').appendTo(container);
                    var createNew = $('<button class="editor-button"><i class="fa fa-archive fa-2x"></i><i class="fa fa-plus-circle" style="position:absolute"></i><br/>Create a project</button>').appendTo(buttons);
                    createNew.click(function(e) {
                        e.preventDefault();
                        show('create');
                    });
                    var openExisting = $('<button class="editor-button"><i class="fa fa-folder-open-o fa-2x"></i><br/>Open a project</button>').appendTo(buttons);
                    openExisting.click(function(e) {
                        e.preventDefault();
                        show('open')
                    });
                    return container;
                },
                buttons: [
                ]
            },
            'create': (function() {
                var projectNameInput;
                var projectSummaryEditor;
                var projectSecretInput;
                var projectSecretSelect;
                var copyProject;
                var projectRepoInput;

                return {
                    title: "Create a new project", // TODO: NLS
                    content: function() {
                        var container = $('<div class="projects-dialog-screen-create"></div>');
                        var row;

                        var validateForm = function() {
                            var projectName = projectNameInput.val();
                            var valid = true;
                            if (!/^[a-zA-Z0-9\-_]+$/.test(projectName)) {
                                if (projectNameInputChanged) {
                                    projectNameInput.addClass("input-error");
                                }
                                valid = false;
                            } else {
                                projectNameInput.removeClass("input-error");
                            }
                            var projectType = $(".projects-dialog-screen-create-type.selected").data('type');
                            if (projectType === 'copy') {
                                if (!copyProject) {
                                    valid = false;
                                }
                            } else if (projectType === 'clone') {
                                var repo = projectRepoInput.val();
                                if (repo.trim() === '') {
                                    // TODO: could do more url regex checking...
                                    if (projectRepoChanged) {
                                        projectRepoInput.addClass("input-error");
                                    }
                                    valid = false;
                                } else {
                                    projectRepoInput.removeClass("input-error");

                                }
                            }

                            $("#projects-dialog-create").prop('disabled',!valid).toggleClass('disabled ui-button-disabled ui-state-disabled',!valid);
                        }

                        row = $('<div class="form-row button-group"></div>').appendTo(container);
                        var createAsEmpty = $('<button data-type="empty" class="editor-button projects-dialog-screen-create-type toggle selected"><i class="fa fa-archive fa-2x"></i><i style="position: absolute;" class="fa fa-asterisk"></i><br/>Empty Project</button>').appendTo(row);
                        var createAsCopy = $('<button data-type="copy" class="editor-button projects-dialog-screen-create-type toggle"><i class="fa fa-archive fa-2x"></i><i class="fa fa-long-arrow-right fa-2x"></i><i class="fa fa-archive fa-2x"></i><br/>Copy existing</button>').appendTo(row);
                        var createAsClone = $('<button data-type="clone" class="editor-button projects-dialog-screen-create-type toggle"><i class="fa fa-git fa-2x"></i><i class="fa fa-arrows-h fa-2x"></i><i class="fa fa-archive fa-2x"></i><br/>Clone repository</button>').appendTo(row);
                        row.find(".projects-dialog-screen-create-type").click(function(evt) {
                            evt.preventDefault();
                            $(".projects-dialog-screen-create-type").removeClass('selected');
                            $(this).addClass('selected');
                            $(".projects-dialog-screen-create-row").hide();
                            $(".projects-dialog-screen-create-row-"+$(this).data('type')).show();
                            validateForm();
                        })


                        row = $('<div class="form-row"></div>').appendTo(container);
                        $('<label>Project name</label>').appendTo(row);

                        projectNameInput = $('<input type="text"></input>').appendTo(row);
                        var projectNameInputChanged = false;
                        projectNameInput.on("change keyup paste",function() { validateForm(); });

                        // Empty Project
                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-empty"></div>').appendTo(container);
                        $('<label>Summary <small>(optional)</small></label>').appendTo(row);
                        projectSummaryEditor = $('<input type="text">').appendTo(row);

                        // Copy Project
                        row = $('<div class="hide form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-copy"></div>').appendTo(container);
                        $('<label> Select project to copy</label>').appendTo(row);
                        var autoInsertedName = "";
                        createProjectList({
                            height: "250px",
                            small: true,
                            select: function(project) {
                                copyProject = project;
                                var projectName = projectNameInput.val();
                                if (projectName === "" || projectName === autoInsertedName) {
                                    autoInsertedName = project.name+"-copy";
                                    projectNameInput.val(autoInsertedName);
                                }
                                validateForm();
                            }
                        }).appendTo(row);

                        // Clone Project
                        row = $('<div class="hide form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-clone"></div>').appendTo(container);
                        $('<label>Git repository URL</label>').appendTo(row);
                        projectRepoInput = $('<input type="text" placeholder="https://git.example.com/path/my-project.git"></input>').appendTo(row);
                        var projectRepoChanged = false;
                        projectRepoInput.on("change keyup paste",function() {
                            var repo = $(this).val();
                            var m = /\/([^/]+)\.git/.exec(repo);
                            if (m) {
                                var projectName = projectNameInput.val();
                                if (projectName === "" || projectName === autoInsertedName) {
                                    autoInsertedName = m[1];
                                    projectNameInput.val(autoInsertedName);
                                }
                            }
                            validateForm();
                        });

                        // Secret - empty/clone
                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-empty projects-dialog-screen-create-row-clone"></div>').appendTo(container);
                        $('<label>Credentials key</label>').appendTo(row);
                        projectSecretInput = $('<input type="text"></input>').appendTo(row);

                        return container;
                    },
                    buttons: [
                        {
                            // id: "clipboard-dialog-cancel",
                            text: RED._("common.label.cancel"),
                            click: function() {
                                $( this ).dialog( "close" );
                            }
                        },
                        {
                            id: "projects-dialog-create",
                            text: "Create project", // TODO: nls
                            class: "primary disabled",
                            disabled: true,
                            click: function() {
                                var projectType = $(".projects-dialog-screen-create-type.selected").data('type');
                                var projectData = {
                                    name: projectNameInput.val(),
                                }
                                if (projectType === 'empty') {
                                    projectData.summary = projectSummaryEditor.val();
                                    projectData.credentialSecret = projectSecretInput.val();
                                } else if (projectType === 'copy') {
                                    projectData.copy = copyProject.name;
                                } else if (projectType === 'clone') {
                                    projectData.credentialSecret = projectSecretInput.val();
                                    projectData.remote = {
                                        url: projectRepoInput.val()
                                    }
                                }

                                RED.deploy.setDeployInflight(true);
                                RED.projects.settings.switchProject(projectData.name);

                                sendRequest({
                                        url: "projects",
                                        type: "POST",
                                        responses: {
                                            200: function(data) {
                                                dialog.dialog( "close" );
                                            },
                                            400: {
                                                'project_exists': function(error) {
                                                    console.log("already exists");
                                                },
                                                'git_error': function(error) {
                                                    console.log("git error",error);
                                                },
                                                'git_auth_failed': function(error) {
                                                    // getRepoAuthDetails(req);
                                                    console.log("git auth error",error);
                                                },
                                                'unexpected_error': function(error) {
                                                    console.log("unexpected_error",error)
                                                }
                                            }
                                        }
                                    },projectData).always(function() {
                                        RED.deploy.setDeployInflight(false);
                                    })



                                // if (projectType === 'empty') {
                                //     show('credentialSecret');
                                // } else if (projectType === 'copy') {
                                //     show('copy');
                                // } else if (projectType === 'clone') {
                                //     show('clone');
                                // }

                                // var projectName = projectNameInput.val().trim();
                                // var projectRepoEnabled = projectRepoEnabledInput.prop('checked');
                                // var projectRepo = projectRepoInput.val().trim();
                                // if (projectName !== '') {
                                //     var req = {
                                //         name:projectName
                                //     };
                                //     if (projectRepoEnabled && projectRepo !== '') {
                                //         req.remote = projectRepo;
                                //     }
                                //     console.log(req);
                                //     sendRequest({
                                //         url: "projects",
                                //         type: "POST",
                                //         responses: {
                                //             200: function(data) {
                                //                 console.log("Success!",data);
                                //             },
                                //             400: {
                                //                 'project_exists': function(error) {
                                //                     console.log("already exists");
                                //                 },
                                //                 'git_error': function(error) {
                                //                     console.log("git error",error);
                                //                 },
                                //                 'git_auth_failed': function(error) {
                                //                     // getRepoAuthDetails(req);
                                //                     console.log("git auth error",error);
                                //                 },
                                //                 'unexpected_error': function(error) {
                                //                     console.log("unexpected_error",error)
                                //                 }
                                //             }
                                //         }
                                //     },req)
                                // }


                                // $( this ).dialog( "close" );
                            }
                        }
                    ]
                }
            })(),
            'open': {
                content: function() {
                    return createProjectList({
                        canSelectActive: false,
                        dblclick: function() {
                            $("#projects-dialog-open").click();
                        }
                    })
                },
                buttons: [
                    {
                        // id: "clipboard-dialog-cancel",
                        text: RED._("common.label.cancel"),
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    },
                    {
                        id: "projects-dialog-open",
                        text: "Open project", // TODO: nls
                        class: "primary disabled",
                        disabled: true,
                        click: function() {
                            switchProject(selectedProject.name,function(err,data) {
                                if (err) {
                                    if (err.error === 'credentials_load_failed') {
                                        dialog.dialog( "close" );
                                    } else {
                                        console.log("unexpected_error",err)
                                    }
                                } else {
                                    dialog.dialog( "close" );
                                }
                            })
                        }
                    }
                ]
            }
        }
    }

    function switchProject(name,done) {
        RED.deploy.setDeployInflight(true);
        RED.projects.settings.switchProject(name);
        sendRequest({
            url: "projects/"+name,
            type: "PUT",
            responses: {
                200: function(data) {
                    done(null,data);
                },
                400: {
                    'credentials_load_failed': function(error) {
                        done(error,null);
                    },
                    'unexpected_error': function(error) {
                        done(error,null);
                    }
                },
            }
        },{active:true}).always(function() {
            RED.deploy.setDeployInflight(false);
        })
    }

    function show(s,options) {
        if (!dialog) {
            RED.projects.init();
        }
        var screen = screens[s];
        var container = screen.content();

        dialogBody.empty();
        dialog.dialog('option','buttons',screen.buttons);
        dialogBody.append(container);
        dialog.dialog('option','title',screen.title||"");
        dialog.dialog("open");
        dialog.dialog({position: { 'my': 'center', 'at': 'center', 'of': window }});
    }

    var selectedProject = null;

    function createProjectList(options) {
        options = options||{};
        var height = options.height || "300px";
        selectedProject = null;
        var container = $('<div></div>',{style:"min-height: "+height+"; height: "+height+";"});

        var list = $('<ol>',{class:"projects-dialog-project-list", style:"height:"+height}).appendTo(container).editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(row,index,entry) {
                var header = $('<div></div>',{class:"projects-dialog-project-list-entry"}).appendTo(row);
                $('<span class="projects-dialog-project-list-entry-icon"><i class="fa fa-archive"></i></span>').appendTo(header);
                $('<span class="projects-dialog-project-list-entry-name" style=""></span>').text(entry.name).appendTo(header);
                if (activeProject && activeProject.name === entry.name) {
                    header.addClass("projects-list-entry-current");
                    $('<span class="projects-dialog-project-list-entry-current">current</span>').appendTo(header);
                    if (options.canSelectActive === false) {
                        // active project cannot be selected; so skip the rest
                        return
                    }
                }
                header.addClass("selectable");
                row.click(function(evt) {
                    $('.projects-dialog-project-list-entry').removeClass('selected');
                    header.addClass('selected');
                    $("#projects-dialog-open").prop('disabled',false).removeClass('disabled ui-button-disabled ui-state-disabled');
                    selectedProject = entry;
                    if (options.select) {
                        options.select(entry);
                    }
                })
                if (options.dblclick) {
                    row.dblclick(function(evt) {
                        evt.preventDefault();
                        options.dblclick();
                    })
                }
            }
        });
        if (options.small) {
            list.addClass("projects-dialog-project-list-small")
        }
        $.getJSON("projects", function(data) {
            data.projects.forEach(function(project) {
                list.editableList('addItem',{name:project});
            });
        })
        return container;
    }

    function sendRequest(options,body) {
        // dialogBody.hide();
        console.log(options.url);
        var start = Date.now();
        // TODO: this is specific to the dialog-based requests
        $(".projects-dialog-spinner").show();
        $("#projects-dialog").parent().find(".ui-dialog-buttonset").children().css("visibility","hidden")
        if (body) {
            options.data = JSON.stringify(body);
            options.contentType = "application/json; charset=utf-8";
        }
        var resultCallback;
        var resultCallbackArgs;
        return $.ajax(options).done(function(data,textStatus,xhr) {
            if (options.responses && options.responses[200]) {
                resultCallback = options.responses[200];
                resultCallbackArgs = data;
            }
        }).fail(function(xhr,textStatus,err) {
            if (options.responses && options.responses[xhr.status]) {
                var responses = options.responses[xhr.status];
                if (typeof responses === 'function') {
                    resultCallback = responses;
                    resultCallbackArgs = {error:responses.statusText};
                    return;
                } else if (responses[xhr.responseJSON.error]) {
                    resultCallback = responses[xhr.responseJSON.error];
                    resultCallbackArgs = xhr.responseJSON;
                    return;
                }
            }
            console.log("Unhandled error response:");
            console.log(xhr);
            console.log(textStatus);
            console.log(err);
        }).always(function() {
            var delta = Date.now() - start;
            delta = Math.max(0,500-delta);
            setTimeout(function() {
                // dialogBody.show();
                $(".projects-dialog-spinner").hide();
                $("#projects-dialog").parent().find(".ui-dialog-buttonset").children().css("visibility","")
                if (resultCallback) {
                    resultCallback(resultCallbackArgs)
                }
            },delta);
        });
    }

    function init() {
        dialog = $('<div id="projects-dialog" class="hide node-red-dialog projects-edit-form"><form class="form-horizontal"></form><div class="projects-dialog-spinner hide"><img src="red/images/spin.svg"/></div></div>')
            .appendTo("body")
            .dialog({
                modal: true,
                autoOpen: false,
                width: 600,
                resizable: false,
                open: function(e) {
                    $(this).parent().find(".ui-dialog-titlebar-close").hide();
                    // $("#header-shade").show();
                    // $("#editor-shade").show();
                    // $("#palette-shade").show();
                    // $("#sidebar-shade").show();
                },
                close: function(e) {
                    // $("#header-shade").hide();
                    // $("#editor-shade").hide();
                    // $("#palette-shade").hide();
                    // $("#sidebar-shade").hide();
                }
            });
        dialogBody = dialog.find("form");

        RED.actions.add("core:new-project",RED.projects.newProject);
        RED.actions.add("core:open-project",RED.projects.selectProject);

        RED.projects.settings.init({sendRequest:sendRequest});
        RED.sidebar.versionControl.init({sendRequest:sendRequest});
        initScreens();
        // initSidebar();
    }

    // function getRepoAuthDetails(req) {
    //     var container = $('<div></div>');
    //
    //     var row = $('<div class="form-row"></div>').appendTo(container);
    //     $('<label>Username</label>').appendTo(row);
    //     var usernameInput = $('<input type="text"></input>').appendTo(row);
    //
    //     row = $('<div class="form-row"></div>').appendTo(container);
    //     $('<label>Password</label>').appendTo(row);
    //     var passwordInput = $('<input type="password"></input>').appendTo(row);
    //
    //     dialogBody.empty();
    //     dialogBody.append(container);
    //     dialog.dialog('option','buttons',[
    //         {
    //             // id: "clipboard-dialog-cancel",
    //             text: RED._("common.label.cancel"),
    //             click: function() {
    //                 // $( this ).dialog( "close" );
    //             }
    //         },
    //         {
    //             id: "projects-dialog-create",
    //             text: "Create project", // TODO: nls
    //             class: "primary",
    //             // disabled: true,
    //             click: function() {
    //                 var username = usernameInput.val();
    //                 var password = passwordInput.val();
    //
    //                 req.remote = parts[1]+username+":"+password+"@"+parts[3];
    //                 sendRequest({
    //                     url: "projects",
    //                     type: "POST",
    //                     responses: {
    //                         200: function(data) {
    //                             console.log("Success!",data);
    //                         },
    //                         400: {
    //                             'project_exists': function(error) {
    //                                 console.log("already exists");
    //                             },
    //                             'git_error': function(error) {
    //                                 console.log("git error",error);
    //                             },
    //                             'git_auth_failed': function(error) {
    //                                 console.log("git auth error",error);
    //                             },
    //                             'unexpected_error': function(error) {
    //                                 console.log("unexpected_error",error)
    //                             }
    //                         }
    //                     }
    //                 },req)
    //             }
    //         }
    //     ])
    // }

/*

    var sidebarContent;
    var sidebarSections;
    var sidebarSectionsInfo;
    var sidebarSectionsDesc;
    var sidebarSectionsDeps;
    var sidebarSectionsDepsList;
    var sidebarSectionsSettings;
    var modulesInUse = {};

    function initSidebar() {
        sidebarContent = $('<div>', {class:"sidebar-projects"});
        var infoStackContainer = $("<div>",{class:"sidebar-projects-stack-info"}).appendTo(sidebarContent);
        var stackContainer = $("<div>",{class:"sidebar-projects-stack"}).appendTo(sidebarContent);

        RED.actions.add("core:show-projects-tab",showSidebar);


        outerSections = RED.stack.create({
            container: infoStackContainer,
            fill: true
        });

        var a = outerSections.add({
            title: "Project",
            collapsible: false
        })

        sidebarSectionsInfo = $("<div>",{class:"node-help"}).appendTo(a.content);

        sidebarSections = RED.stack.create({
            container: stackContainer,
            singleExpanded: true,
            fill: true
        });

        sidebarSectionsDesc = sidebarSections.add({
            title: RED._("sidebar.project.description"),
            expanded: true
        });
        sidebarSectionsDesc.content.css({padding:"6px"});

        var editDescription = $('<button style="position: absolute; top: 8px; right: 8px;" class="editor-button editor-button-small">edit</button>').appendTo(sidebarSectionsDesc.header);
        var editDescriptionFunc = function() {
            RED.editor.editMarkdown({
                title: RED._('sidebar.project.editDescription'),
                value: activeProject.description,
                complete: function(v) {
                    var spinner = addSpinnerOverlay(sidebarSectionsDesc.content);
                    editDescription.addClass('disabled');
                    var done = function(err,res) {
                        if (err) {
                            editDescriptionFunc();
                        }
                        activeProject.description = v;
                        updateProjectDescription();
                    }
                    sendRequest({
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
                        editDescription.removeClass('disabled');
                    });
                }
            });
        }

        editDescription.click(function(evt) {
            evt.preventDefault();
            if ($(this).hasClass('disabled')) {
                return;
            }
            editDescriptionFunc();
        });




        sidebarSectionsDeps = sidebarSections.add({
            title:RED._("sidebar.project.dependencies")
        });
        sidebarSectionsDeps.content.addClass("sidebar-projects-dependencies");

        var editDependencies = $('<button style="position: absolute; top: 8px; right: 8px;" class="editor-button editor-button-small">edit</button>').appendTo(sidebarSectionsDeps.header);
        var editDependenciesFunc = function(depsJSON) {

            RED.editor.editJSON({
                title: RED._('sidebar.project.editDependencies'),
                value: JSON.stringify(depsJSON||activeProject.dependencies||{},"",4),
                complete: function(v) {
                    try {
                        var parsed = JSON.parse(v);
                        var spinner = addSpinnerOverlay(sidebarSectionsDeps.content);

                        editDependencies.addClass('disabled');
                        var done = function(err,res) {
                            if (err) {
                                editDependenciesFunc(depsJSON);
                            }
                            activeProject.dependencies = parsed;
                            updateProjectDependencies();
                        }
                        sendRequest({
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
                            editDependencies.removeClass('disabled');
                        });
                    } catch(err) {
                        editDependenciesFunc(depsJSON);
                    }
                }
            });
        }
        editDependencies.click(function(evt) {
            evt.preventDefault();
            editDependenciesFunc();
        });

        sidebarSectionsDepsList = $("<ol>",{style:"position: absolute;top: 0;bottom: 0;left: 0;right: 0;"}).appendTo(sidebarSectionsDeps.content);
        sidebarSectionsDepsList.editableList({
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
                            editDependenciesFunc(deps);
                        });
                    } else if (entry.index === 3) {
                        var removeButton = $('<button class="editor-button editor-button-small palette-module-button">remove from project</button>').appendTo(headerRow).click(function(evt) {
                            evt.preventDefault();
                            var deps = $.extend(true, {}, activeProject.dependencies);
                            for (var m in modulesInUse) {
                                if (modulesInUse.hasOwnProperty(m) && modulesInUse[m].known && modulesInUse[m].count === 0) {
                                    delete deps[m];
                                }
                            }
                            editDependenciesFunc(deps);
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
        sidebarSectionsDeps.container.css("border-bottom","none");

        // sidebarSectionsSettings = sidebarSections.add({
        //     title: RED._("sidebar.project.settings")
        // });
        // sidebarSectionsSettings.container.css("border-bottom","none");

        RED.sidebar.addTab({
            id: "project",
            label: RED._("sidebar.project.label"),
            name: RED._("sidebar.project.name"),
            content: sidebarContent,
            onchange: function() {
                setTimeout(function() {
                    sidebarSections.resize();
                },10);
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
                    if (modulesInUse[module].count === 1 && !modulesInUse[module].known) {
                        sidebarSectionsDepsList.editableList('addItem',modulesInUse[module]);
                    } else {
                        sidebarSectionsDepsList.editableList('sort');
                        if (modulesInUse[module].element) {
                            modulesInUse[module].element.removeClass("palette-module-unused");
                        }
                    }
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
                            sidebarSectionsDepsList.editableList('removeItem',modulesInUse[module]);
                            delete modulesInUse[module];
                        } else {
                            // TODO: a known dependency is now unused by the flow
                            sidebarSectionsDepsList.editableList('sort');
                            modulesInUse[module].element.addClass("palette-module-unused");
                        }
                    }
                }
            }
        })


    }
    function showSidebar() {
        RED.sidebar.show("project");
    }
    function addSpinnerOverlay(container) {
        var spinner = $('<div class="projects-dialog-spinner projects-dialog-spinner-sidebar"><img src="red/images/spin.svg"/></div>').appendTo(container);
        return spinner;
    }
    function updateProjectSummary() {
        sidebarSectionsInfo.empty();
        if (activeProject) {
            var table = $('<table class="node-info"></table>').appendTo(sidebarSectionsInfo);
            var tableBody = $('<tbody>').appendTo(table);
            var propRow;
            propRow = $('<tr class="node-info-node-row"><td>Project</td><td></td></tr>').appendTo(tableBody);
            $(propRow.children()[1]).html('&nbsp;'+(activeProject.name||""))
        }
    }
    function updateProjectDescription() {
        sidebarSectionsDesc.content.empty();
        if (activeProject) {
            var div = $('<div class="node-help"></div>').appendTo(sidebarSectionsDesc.content);
            var desc = marked(activeProject.description||"");
            var description = addTargetToExternalLinks($('<div class="node-help"><span class="bidiAware" dir=\"'+RED.text.bidi.resolveBaseTextDir(desc)+'">'+desc+'</span></div>')).appendTo(div);
            description.find(".bidiAware").contents().filter(function() { return this.nodeType === 3 && this.textContent.trim() !== "" }).wrap( "<span></span>" );
        }
    }
    function updateProjectDependencies() {
        if (activeProject) {
            sidebarSectionsDepsList.editableList('empty');
            sidebarSectionsDepsList.editableList('addItem',{index:1, label:"Unknown Dependencies"});
            sidebarSectionsDepsList.editableList('addItem',{index:3, label:"Unused dependencies"});
            var dependencies = activeProject.dependencies||{};
            var moduleList = Object.keys(dependencies);
            if (moduleList.length > 0) {
                moduleList.sort();
                moduleList.forEach(function(module) {
                    if (modulesInUse.hasOwnProperty(module)) {
                        // TODO: this module is used by not currently 'known'
                        modulesInUse[module].known = true;
                    } else {
                        modulesInUse[module] = {module:module,version:dependencies[module], known: true, count:0};
                    }
                })
            }
            for (var module in modulesInUse) {
                if (modulesInUse.hasOwnProperty(module)) {
                    var m = modulesInUse[module];
                    if (!dependencies.hasOwnProperty(module) && m.count === 0) {
                        delete modulesInUse[module];
                    } else {
                        sidebarSectionsDepsList.editableList('addItem',modulesInUse[module]);
                    }
                }
            }
        }
    }


    // function getUsedModules() {
    //     var inuseModules = {};
    //     var inuseTypes = {};
    //     var getNodeModule = function(node) {
    //         if (inuseTypes[node.type]) {
    //             return;
    //         }
    //         inuseTypes[node.type] = true;
    //         inuseModules[RED.nodes.registry.getNodeSetForType(node.type).module] = true;
    //     }
    //     RED.nodes.eachNode(getNodeModule);
    //     RED.nodes.eachConfig(getNodeModule);
    //     console.log(Object.keys(inuseModules));
    // }

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
*/

function refresh() {
    $.getJSON("projects",function(data) {
        if (data.active) {
            $.getJSON("projects/"+data.active, function(project) {
                activeProject = project;
                // updateProjectSummary();
                // updateProjectDescription();
                // updateProjectDependencies();
                RED.sidebar.info.refresh();
            });
        }
    });
}



    return {
        init: init,
        showStartup: function() {
            show('welcome');
        },
        newProject: function() {
            show('create')
        },
        selectProject: function() {
            show('open')
        },
        showCredentialsPrompt: function() { //TODO: rename this function
            RED.projects.settings.show('settings');
        },
        showFilesPrompt: function() { //TODO: rename this function
            RED.projects.settings.show('settings');
        },
        // showSidebar: showSidebar,
        refresh: refresh,
        editProject: function() {
            RED.projects.settings.show();
        },
        getActiveProject: function() {
            return activeProject;
        }
    }
})();
