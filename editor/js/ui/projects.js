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
                var projectSummaryInput;
                var projectFlowFileInput;
                var projectSecretInput;
                var projectSecretSelect;
                var copyProject;
                var projectRepoInput;
                var emptyProjectCredentialInput;

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
                            } else if (projectType === 'empty') {
                                projectFlowFileInput.toggleClass("input-error",projectFlowFileInput.val()==='')
                                valid = valid && projectFlowFileInput.val()!=='';
                                var encryptionState = $("input[name=projects-encryption-type]:checked").val();
                                if (encryptionState === 'enabled') {
                                    var encryptionKeyType = $("input[name=projects-encryption-key]:checked").val();
                                    if (encryptionKeyType === 'custom') {
                                        valid = valid && emptyProjectCredentialInput.val()!==''
                                    }
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
                        projectNameInput.on("change keyup paste",function() { projectNameInputChanged = true; validateForm(); });
                        $('<label class="projects-edit-form-sublabel"><small>Must contain only A-Z 0-9 _ -</small></label>').appendTo(row);

                        // Empty Project
                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-empty"></div>').appendTo(container);
                        $('<label>Description</label>').appendTo(row);
                        projectSummaryInput = $('<input type="text">').appendTo(row);
                        $('<label class="projects-edit-form-sublabel"><small>Optional</small></label>').appendTo(row);

                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-empty"></div>').appendTo(container);
                        $('<label>Flow file</label>').appendTo(row);
                        projectFlowFileInput = $('<input type="text">').val("flow.json")
                            .on("change keyup paste",validateForm)
                            .appendTo(row);
                        $('<label class="projects-edit-form-sublabel"><small>*.json</small></label>').appendTo(row);

                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-empty"></div>').appendTo(container);
                        $('<label>Credentials</label>').appendTo(row);

                        var credentialsBox = $('<div style="width: 550px">').appendTo(row);
                        var credentialsRightBox = $('<div style="min-height:150px; box-sizing: border-box; float: right; vertical-align: top; width: 331px; margin-left: -1px; padding: 15px; margin-top: -15px; border: 1px solid #ccc; border-radius: 3px;  display: inline-block">').appendTo(credentialsBox);
                        var credentialsLeftBox = $('<div style="vertical-align: top; width: 220px;  display: inline-block">').appendTo(credentialsBox);

                        var credentialsEnabledBox = $('<div class="form-row" style="padding:  7px 8px 3px 8px;border: 1px solid #ccc;border-radius: 4px;border-top-right-radius: 0;border-bottom-right-radius: 0;border-right-color: white;"></div>').appendTo(credentialsLeftBox);
                        $('<label class="projects-edit-form-inline-label" style="margin-left: 5px"><input type="radio" checked style="vertical-align: middle; margin-top:0; margin-right: 10px;" name="projects-encryption-type" value="enabled"> <i style="font-size: 1.4em; margin-right: 8px; vertical-align: middle; color: #888;" class="fa fa-lock"></i> <span style="vertical-align: middle;">Enable encryption</span></label>').appendTo(credentialsEnabledBox);
                        var credentialsDisabledBox = $('<div class="form-row" style="padding:  7px 8px 3px 8px;border: 1px solid white;border-radius: 4px;border-top-right-radius: 0;border-bottom-right-radius: 0;border-right-color: #ccc; "></div>').appendTo(credentialsLeftBox);
                        $('<label class="projects-edit-form-inline-label" style="margin-left: 5px"><input type="radio" style="vertical-align: middle; margin-top:0; margin-right: 10px;" name="projects-encryption-type" value="disabled"> <i style="font-size: 1.4em; margin-right: 8px; vertical-align: middle; color: #888;" class="fa fa-unlock"></i> <span style="vertical-align: middle;">Disable encryption</span></label>').appendTo(credentialsDisabledBox);

                        credentialsLeftBox.find("input[name=projects-encryption-type]").click(function(e) {
                            var val = $(this).val();
                            var toEnable;
                            var toDisable;
                            if (val === 'enabled') {
                                toEnable = credentialsEnabledBox;
                                toDisable = credentialsDisabledBox;
                                $(".projects-encryption-enabled-row").show();
                                $(".projects-encryption-disabled-row").hide();
                            } else {
                                toDisable = credentialsEnabledBox;
                                toEnable = credentialsDisabledBox;
                                $(".projects-encryption-enabled-row").hide();
                                $(".projects-encryption-disabled-row").show();

                            }

                            toEnable.css({
                                borderColor: "#ccc",
                                borderRightColor: "white"
                            });
                            toDisable.css({
                                borderColor: "white",
                                borderRightColor: "#ccc"
                            })
                            validateForm();
                        })

                        row = $('<div class="form-row projects-encryption-enabled-row"></div>').appendTo(credentialsRightBox);
                        $('<label class="projects-edit-form-inline-label" style="margin-left: 5px"><input type="radio" checked style="vertical-align: middle; margin-top:0; margin-right: 10px;" value="default" name="projects-encryption-key"> <span style="vertical-align: middle;">Use default key</span></label>').appendTo(row);
                        row = $('<div class="form-row projects-encryption-enabled-row"></div>').appendTo(credentialsRightBox);
                        $('<label class="projects-edit-form-inline-label" style="margin-left: 5px"><input type="radio" style="vertical-align: middle; margin-top:0; margin-right: 10px;" value="custom" name="projects-encryption-key"> <span style="vertical-align: middle;">Use custom key</span></label>').appendTo(row);
                        row = $('<div class="projects-encryption-enabled-row"></div>').appendTo(credentialsRightBox);
                        emptyProjectCredentialInput = $('<input disabled type="password" style="margin-left: 25px; width: calc(100% - 30px);"></input>').appendTo(row);
                        emptyProjectCredentialInput.on("change keyup paste", validateForm);

                        row = $('<div class="form-row projects-encryption-disabled-row"></div>').hide().appendTo(credentialsRightBox);
                        $('<div class="form-tips form-warning" style="padding: 15px; margin: 5px;"><i class="fa fa-warning"></i> The credentials file will not be encrypted and its contents easily read</div>').appendTo(row);

                        credentialsRightBox.find("input[name=projects-encryption-key]").click(function() {
                            var val = $(this).val();
                            emptyProjectCredentialInput.attr("disabled",val === 'default');
                            validateForm();
                        })


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

                        // Secret - clone
                        row = $('<div class="hide form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-clone"></div>').appendTo(container);
                        $('<label>Credentials encryption key</label>').appendTo(row);
                        projectSecretInput = $('<input type="text"></input>').appendTo(row);

                        createAsEmpty.click();

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
                                    projectData.summary = projectSummaryInput.val();
                                    projectData.files = {
                                        flow: projectFlowFileInput.val()
                                    };
                                    var encryptionState = $("input[name=projects-encryption-type]:checked").val();
                                    if (encryptionState === 'enabled') {
                                        var encryptionKeyType = $("input[name=projects-encryption-key]:checked").val();
                                        if (encryptionKeyType === 'custom') {
                                            projectData.credentialSecret = emptyProjectCredentialInput.val();
                                        } else {
                                            // If 'use default', leave projectData.credentialSecret blank - as that will trigger
                                            // it to use the default (TODO: if its set...)
                                        }
                                    } else {
                                        // Disabled encryption by explicitly setting credSec to false
                                        projectData.credentialSecret = false;
                                    }


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


    function refresh(done) {
        $.getJSON("projects",function(data) {
            if (data.active) {
                $.getJSON("projects/"+data.active, function(project) {
                    activeProject = project;
                    // updateProjectSummary();
                    // updateProjectDescription();
                    // updateProjectDependencies();
                    RED.sidebar.versionControl.refresh(true);
                    if (done) {
                        done();
                    }
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
