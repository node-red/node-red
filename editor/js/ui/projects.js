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
                var projectRepoUserInput;
                var projectRepoPasswordInput;
                var projectNameSublabel;
                var projectRepoPassphrase;
                var projectRepoRemoteName
                var projectRepoBranch;

                return {
                    title: "Create a new project", // TODO: NLS
                    content: function() {
                        var projectList = null;
                        var pendingFormValidation = false;
                        $.getJSON("projects", function(data) {
                            projectList = {};
                            data.projects.forEach(function(p) {
                                projectList[p] = true;
                                if (pendingFormValidation) {
                                    pendingFormValidation = false;
                                    validateForm();
                                }
                            })
                        });

                        var container = $('<div class="projects-dialog-screen-create"></div>');
                        var row;

                        var validateForm = function() {
                            var projectName = projectNameInput.val();
                            var valid = true;
                            if (projectNameInputChanged) {
                                if (projectList === null) {
                                    pendingFormValidation = true;
                                    return;
                                }
                                projectNameStatus.empty();
                                if (!/^[a-zA-Z0-9\-_]+$/.test(projectName) || projectList[projectName]) {
                                    projectNameInput.addClass("input-error");
                                    $('<i style="margin-top: 8px;" class="fa fa-exclamation-triangle"></i>').appendTo(projectNameStatus);
                                    projectNameValid = false;
                                    valid = false;
                                    if (projectList[projectName]) {
                                        projectNameSublabel.text("Project already exists");
                                    } else {
                                        projectNameSublabel.text("Must contain only A-Z 0-9 _ -");
                                    }
                                } else {
                                    projectNameInput.removeClass("input-error");
                                    $('<i style="margin-top: 8px;" class="fa fa-check"></i>').appendTo(projectNameStatus);
                                    projectNameSublabel.text("Must contain only A-Z 0-9 _ -");
                                    projectNameValid = true;
                                }
                                projectNameLastChecked = projectName;
                            }
                            valid = projectNameValid;

                            var projectType = $(".projects-dialog-screen-create-type.selected").data('type');
                            if (projectType === 'copy') {
                                if (!copyProject) {
                                    valid = false;
                                }
                            } else if (projectType === 'clone') {
                                var repo = projectRepoInput.val();

                                var validRepo = /^(?:git|ssh|https?|[\d\w\.\-_]+@[\w\.]+):(?:\/\/)?[\w\.@:\/~_-]+\.git(?:\/?|\#[\d\w\.\-_]+?)$/.test(repo);
                                if (!validRepo) {
                                    if (projectRepoChanged) {
                                        projectRepoInput.addClass("input-error");
                                    }
                                    valid = false;
                                } else {
                                    projectRepoInput.removeClass("input-error");
                                }
                                if (/^(?:ssh|[\d\w\.\-_]+@[\w\.]+):(?:\/\/)?/.test(repo)) {
                                    $(".projects-dialog-screen-create-row-creds").hide();
                                    $(".projects-dialog-screen-create-row-passphrase").show();
                                } else if (/^https?:\/\//.test(repo)) {
                                    $(".projects-dialog-screen-create-row-creds").show();
                                    $(".projects-dialog-screen-create-row-passphrase").hide();
                                } else {
                                    $(".projects-dialog-screen-create-row-creds").show();
                                    $(".projects-dialog-screen-create-row-passphrase").hide();
                                }


                            } else if (projectType === 'empty') {
                                var flowFile = projectFlowFileInput.val();
                                if (flowFile === "" || !/\.json$/.test(flowFile)) {
                                    valid = false;
                                    if (!projectFlowFileInput.hasClass("input-error")) {
                                        projectFlowFileInput.addClass("input-error");
                                        projectFlowFileInput.next().empty().append('<i style="margin-top: 8px;" class="fa fa-exclamation-triangle"></i>');
                                    }
                                } else {
                                    if (projectFlowFileInput.hasClass("input-error")) {
                                        projectFlowFileInput.removeClass("input-error");
                                        projectFlowFileInput.next().empty();
                                    }
                                }

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
                        // var createAsCopy = $('<button data-type="copy" class="editor-button projects-dialog-screen-create-type toggle"><i class="fa fa-archive fa-2x"></i><i class="fa fa-long-arrow-right fa-2x"></i><i class="fa fa-archive fa-2x"></i><br/>Copy existing</button>').appendTo(row);
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
                        $('<label for="projects-dialog-screen-create-project-name">Project name</label>').appendTo(row);

                        var subrow = $('<div style="position:relative;"></div>').appendTo(row);
                        projectNameInput = $('<input id="projects-dialog-screen-create-project-name" type="text"></input>').appendTo(subrow);
                        var projectNameStatus = $('<div class="projects-dialog-screen-input-status"></div>').appendTo(subrow);

                        var projectNameInputChanged = false;
                        var projectNameLastChecked = "";
                        var projectNameValid;
                        var checkProjectName;
                        var autoInsertedName = "";


                        projectNameInput.on("change keyup paste",function() {
                            projectNameInputChanged = (projectNameInput.val() !== projectNameLastChecked);
                            if (checkProjectName) {
                                clearTimeout(checkProjectName);
                            } else if (projectNameInputChanged) {
                                projectNameStatus.empty();
                                $('<img src="red/images/spin.svg"/>').appendTo(projectNameStatus);
                                if (projectNameInput.val() === '') {
                                    validateForm();
                                    return;
                                }
                            }
                            checkProjectName = setTimeout(function() {
                                validateForm();
                                checkProjectName = null;
                            },300)
                        });
                        projectNameSublabel = $('<label class="projects-edit-form-sublabel"><small>Must contain only A-Z 0-9 _ -</small></label>').appendTo(row).find("small");

                        // Empty Project
                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-empty"></div>').appendTo(container);
                        $('<label for="projects-dialog-screen-create-project-desc">Description</label>').appendTo(row);
                        projectSummaryInput = $('<input id="projects-dialog-screen-create-project-desc" type="text">').appendTo(row);
                        $('<label class="projects-edit-form-sublabel"><small>Optional</small></label>').appendTo(row);

                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-empty"></div>').appendTo(container);
                        $('<label for="projects-dialog-screen-create-project-file">Flow file</label>').appendTo(row);
                        subrow = $('<div style="position:relative;"></div>').appendTo(row);
                        projectFlowFileInput = $('<input id="projects-dialog-screen-create-project-file" type="text">').val("flow.json")
                            .on("change keyup paste",validateForm)
                            .appendTo(subrow);
                        $('<div class="projects-dialog-screen-input-status"></div>').appendTo(subrow);
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
                        $('<div class="" style="padding: 5px 20px;"><i class="fa fa-warning"></i> The credentials file will not be encrypted and its contents easily read</div>').appendTo(row);

                        credentialsRightBox.find("input[name=projects-encryption-key]").click(function() {
                            var val = $(this).val();
                            emptyProjectCredentialInput.attr("disabled",val === 'default');
                            validateForm();
                        })


                        // Copy Project
                        // row = $('<div class="hide form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-copy"></div>').appendTo(container);
                        // $('<label> Select project to copy</label>').appendTo(row);
                        // createProjectList({
                        //     height: "250px",
                        //     small: true,
                        //     select: function(project) {
                        //         copyProject = project;
                        //         var projectName = projectNameInput.val();
                        //         if (projectName === "" || projectName === autoInsertedName) {
                        //             autoInsertedName = project.name+"-copy";
                        //             projectNameInput.val(autoInsertedName);
                        //         }
                        //         validateForm();
                        //     }
                        // }).appendTo(row);

                        // Clone Project
                        row = $('<div class="hide form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-clone"></div>').appendTo(container);
                        $('<label for="projects-dialog-screen-create-project-repo">Git repository URL</label>').appendTo(row);
                        projectRepoInput = $('<input id="projects-dialog-screen-create-project-repo" type="text" placeholder="https://git.example.com/path/my-project.git"></input>').appendTo(row);
                        $('<label class="projects-edit-form-sublabel"><small>https:// or ssh://</small></label>').appendTo(row);

                        var projectRepoChanged = false;
                        projectRepoInput.on("change keyup paste",function() {
                            projectRepoChanged = true;
                            var repo = $(this).val();
                            var m = /\/([^/]+)\.git/.exec(repo);
                            if (m) {
                                var projectName = projectNameInput.val();
                                if (projectName === "" || projectName === autoInsertedName) {
                                    autoInsertedName = m[1];
                                    projectNameInput.val(autoInsertedName);
                                    projectNameInput.change();
                                }
                            }
                            validateForm();
                        });

                        row = $('<div class="hide form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-clone projects-dialog-screen-create-row-creds"></div>').hide().appendTo(container);

                        var subrow = $('<div style="width: calc(50% - 10px); display:inline-block;"></div>').appendTo(row);
                        $('<label for="projects-dialog-screen-create-project-repo-user">Username</label>').appendTo(subrow);
                        projectRepoUserInput = $('<input id="projects-dialog-screen-create-project-repo-user" type="text"></input>').appendTo(subrow);

                        subrow = $('<div style="width: calc(50% - 10px); margin-left: 20px; display:inline-block;"></div>').appendTo(row);
                        $('<label for="projects-dialog-screen-create-project-repo-pass">Password</label>').appendTo(subrow);
                        projectRepoPasswordInput = $('<input id="projects-dialog-screen-create-project-repo-pass" type="password"></input>').appendTo(subrow);

                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-passphrase"></div>').hide().appendTo(container);
                        $('<label for="projects-dialog-screen-create-project-repo-passphrase">SSH key passphrase</label>').appendTo(row);
                        projectRepoPassphrase = $('<input id="projects-dialog-screen-create-project-repo-passphrase" type="password" style="width: calc(100% - 250px);"></input>').appendTo(row);

                        // row = $('<div style="width: calc(50% - 10px); display:inline-block;" class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-clone"></div>').hide().appendTo(container);
                        // $('<label for="projects-dialog-screen-create-project-repo-remote-name">Remote name</label>').appendTo(row);
                        // projectRepoRemoteName = $('<input id="projects-dialog-screen-create-project-repo-remote-name" type="text" style="width: 100%;"></input>').val("origin").appendTo(row);
                        //
                        // row = $('<div style="width: calc(50% - 10px); margin-left: 20px; display:inline-block;" class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-clone"></div>').hide().appendTo(container);
                        // $('<label for="projects-dialog-screen-create-project-repo-branch">Branch</label>').appendTo(row);
                        // projectRepoBranch = $('<input id="projects-dialog-screen-create-project-repo-branch" type="text"></input>').val('master').appendTo(row);




                        // // Secret - clone
                        // row = $('<div class="hide form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-clone"></div>').appendTo(container);
                        // $('<label>Credentials encryption key</label>').appendTo(row);
                        // projectSecretInput = $('<input type="text"></input>').appendTo(row);

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
                                    // projectData.credentialSecret = projectSecretInput.val();
                                    projectData.git = {
                                        remotes: {
                                            'origin': {
                                                url: projectRepoInput.val(),
                                                username: projectRepoUserInput.val(),
                                                password: projectRepoPasswordInput.val()
                                            }
                                        }
                                    }
                                }

                                RED.deploy.setDeployInflight(true);
                                RED.projects.settings.switchProject(projectData.name);

                                sendRequest({
                                        url: "projects",
                                        type: "POST",
                                        requireCleanWorkspace: true,
                                        handleAuthFail: false,
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
                                                'git_connection_failed': function(error) {
                                                    projectRepoInput.addClass("input-error");
                                                },
                                                'git_auth_failed': function(error) {
                                                    projectRepoUserInput.addClass("input-error");
                                                    projectRepoPasswordInput.addClass("input-error");
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
            requireCleanWorkspace: true,
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
        console.log(options.url,body);

        if (options.requireCleanWorkspace && RED.nodes.dirty()) {
            var message = 'You have undeployed changes that will be lost. Do you want to continue?';
            var alwaysCallback;
            var cleanNotification = RED.notify(message,{
                type:"info",
                fixed: true,
                modal: true,
                buttons: [
                    {
                        //id: "node-dialog-delete",
                        //class: 'leftButton',
                        text: RED._("common.label.cancel"),
                        click: function() {
                            cleanNotification.close();
                            if (options.cancel) {
                                options.cancel();
                            }
                            if (alwaysCallback) {
                                alwaysCallback();
                            }
                        }
                    },{
                        text: 'Continue',
                        click: function() {
                            cleanNotification.close();
                            delete options.requireCleanWorkspace;
                            sendRequest(options,body).always(function() {
                                if (alwaysCallback) {
                                    alwaysCallback();
                                }

                            })
                        }
                    }
                ]
            });
            return {
                always: function(done) { alwaysCallback = done; }
            }
        }

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
                } else if (options.handleAuthFail !== false && xhr.responseJSON.error === 'git_auth_failed') {
                    var url = activeProject.git.remotes.origin.fetch;
                    var message = $('<div>'+
                        '<div class="form-row">Authentication required for repository:</div>'+
                        '<div class="form-row"><div style="margin-left: 20px;">'+url+'</div></div>'+
                        '<div class="form-row"><label for="projects-user-auth-username">Username</label><input id="projects-user-auth-username" type="text"></input></div>'+
                        '<div class="form-row"><label for=projects-user-auth-password">Password</label><input id="projects-user-auth-password" type="password"></input></div>'+
                        '</div>');
                    var notification = RED.notify(message,{
                        type:"error",
                        fixed: true,
                        modal: true,
                        buttons: [
                            {
                                //id: "node-dialog-delete",
                                //class: 'leftButton',
                                text: RED._("common.label.cancel"),
                                click: function() {
                                    notification.close();
                                }
                            },{
                                text: $('<span><i class="fa fa-refresh"></i> Retry</span>'),
                                click: function() {
                                    var username = $('#projects-user-auth-username').val();
                                    var password = $('#projects-user-auth-password').val();
                                    body = body || {};
                                    var authBody = {git:{remotes:{}}};
                                    authBody.git.remotes[options.remote||'origin'] = {
                                        username: username,
                                        password: password
                                    };
                                    var done = function(err) {
                                        if (err) {
                                            console.log("Failed to update auth");
                                            console.log(err);
                                        } else {
                                            sendRequest(options,body);
                                            notification.close();
                                        }

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
                                    },authBody);
                                }
                            }
                        ]
                    });
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

    function createBranchList(options) {
        var branchFilterTerm = "";
        var branchFilterCreateItem;
        var branches = [];
        var currentBranch;
        var branchPrefix = "";
        var container = $('<div class="projects-branch-list">').appendTo(options.container);

        var branchFilter = $('<input type="text">').attr('placeholder',options.placeholder).appendTo(container).searchBox({
            delay: 200,
            change: function() {
                branchFilterTerm = $(this).val();
                if (/(\.\.|\/\.|[?*[~^: \\]|\/\/|\/.$|\/$)/.test(branchFilterTerm)) {
                    if (!branchFilterCreateItem.hasClass("input-error")) {
                        branchFilterCreateItem.addClass("input-error");
                        branchFilterCreateItem.find("i").addClass("fa-warning").removeClass("fa-code-fork");
                    }
                    branchFilterCreateItem.find("span").text("Invalid branch: "+branchPrefix+branchFilterTerm);
                } else {
                    if (branchFilterCreateItem.hasClass("input-error")) {
                        branchFilterCreateItem.removeClass("input-error");
                        branchFilterCreateItem.find("i").removeClass("fa-warning").addClass("fa-code-fork");
                    }
                    branchFilterCreateItem.find(".sidebar-version-control-branch-list-entry-create-name").text(branchPrefix+branchFilterTerm);
                }
                branchList.editableList("filter");
            }
        });
        var branchList = $("<ol>",{style:"height: 130px;"}).appendTo(container);
        branchList.editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(row,index,entry) {
                var container = $('<div class="sidebar-version-control-branch-list-entry">').appendTo(row);
                if (typeof entry !== "string") {
                    branchFilterCreateItem = container;
                    $('<i class="fa fa-code-fork"></i>').appendTo(container);
                    $('<span>').text("Create branch:").appendTo(container);
                    $('<div class="sidebar-version-control-branch-list-entry-create-name" style="margin-left: 10px;">').text(entry.name).appendTo(container);
                } else {
                    $('<i class="fa fa-code-fork"></i>').appendTo(container);
                    $('<span>').text(entry).appendTo(container);
                    if (currentBranch === entry) {
                        container.addClass("selected");
                        $('<span class="current"></span>').text(options.currentLabel||"current").appendTo(container);
                    }
                }
                container.click(function(evt) {
                    evt.preventDefault();
                    if ($(this).hasClass('input-error')) {
                        return;
                    }
                    var body = {};
                    if (typeof entry !== "string") {
                        body.name = branchFilter.val();
                        body.create = true;
                        if (options.remote) {
                            body.name = options.remote()+"/"+body.name;
                        }
                    } else {
                        if ($(this).hasClass('selected')) {
                            body.current = true;
                        }
                        body.name = entry;
                    }
                    if (options.onselect) {
                        options.onselect(body);
                    }
                });
            },
            filter: function(data) {
                var isCreateEntry = (typeof data !=="string");
                return (
                            isCreateEntry &&
                            (
                                branchFilterTerm !== "" &&
                                branches.indexOf(branchPrefix+branchFilterTerm) === -1
                            )
                     ) ||
                     (
                         !isCreateEntry &&
                         data.indexOf(branchFilterTerm) !== -1
                     );
            }
        });
        return {
            refresh: function(url) {
                branchFilter.searchBox("value","");
                branchList.editableList('empty');
                var start = Date.now();
                var spinner = addSpinnerOverlay(container).addClass("projects-dialog-spinner-contain");
                currentBranch = options.current();
                if (options.remote) {
                    branchPrefix = options.remote()+"/";
                } else {
                    branchPrefix = "";
                }


                sendRequest({
                    url: url,
                    type: "GET",
                    responses: {
                        0: function(error) {
                            console.log(error);
                        },
                        200: function(result) {
                            branches = result.branches;
                            result.branches.forEach(function(b) {
                                branchList.editableList('addItem',b);
                            });
                            branchList.editableList('addItem',{});
                            setTimeout(function() {
                                spinner.remove();
                            },Math.max(300-(Date.now() - start),0));
                        },
                        400: {
                            'unexpected_error': function(error) {
                                console.log(error);
                            }
                        }
                    }
                })
            },
            addItem: function(data) { branchList.editableList('addItem',data) },
            filter: function() { branchList.editableList('filter') },
            focus: function() { branchFilter.focus() }
        }
    }

    function addSpinnerOverlay(container) {
        var spinner = $('<div class="projects-dialog-spinner"><img src="red/images/spin.svg"/></div>').appendTo(container);
        return spinner;
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
        var projectsAPI = {
            sendRequest:sendRequest,
            createBranchList:createBranchList,
            addSpinnerOverlay:addSpinnerOverlay
        };
        RED.projects.settings.init(projectsAPI);
        RED.sidebar.versionControl.init(projectsAPI);
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
