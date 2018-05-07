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
    function reportUnexpectedError(error) {
        var notification;
        if (error.error === 'git_missing_user') {
            notification = RED.notify("<p>You Git client is not configured with a username/email.</p>",{
                fixed: true,
                type:'error',
                buttons: [
                    {
                        text: "Cancel",
                        click: function() {
                            notification.close();
                        }
                    },
                    {
                        text: "Configure Git client",
                        click: function() {
                            RED.userSettings.show('gitconfig');
                            notification.close();
                        }
                    }
                ]
            })
        } else {
            console.log(error);
            notification = RED.notify("<p>An unexpected error occurred:</p><p>"+error.message+"</p><small>code: "+error.error+"</small>",{
                fixed: true,
                modal: true,
                type: 'error',
                buttons: [
                    {
                        text: "Close",
                        click: function() {
                            notification.close();
                        }
                    }
                ]
            })
        }
    }
    var screens = {};
    function initScreens() {
        var migrateProjectHeader = $('<div class="projects-dialog-screen-start-hero"></div>');
        $('<span><i class="fa fa-files-o fa-2x"></i> &nbsp; &nbsp; <i class="fa fa-long-arrow-right fa-2x"></i> &nbsp; &nbsp; <i class="fa fa-archive fa-2x"></i></span>').appendTo(migrateProjectHeader)
        $('<hr>').appendTo(migrateProjectHeader);

        var createProjectOptions = {};

        screens = {
            'welcome': {
                content: function(options) {

                    var container = $('<div class="projects-dialog-screen-start"></div>');

                    migrateProjectHeader.appendTo(container);

                    var body = $('<div class="projects-dialog-screen-start-body"></div>').appendTo(container);
                    $('<p>').text("Hello! We have introduced 'projects' to Node-RED.").appendTo(body);
                    $('<p>').text("This is a new way for you to manage your flow files and includes version control of your flows.").appendTo(body);
                    $('<p>').text("To get started you can create your first project or clone an existing project from a git repository.").appendTo(body);
                    $('<p>').text("If you are not sure, you can skip this for now. You will still be able to create your first project from the 'Projects' menu at any time.").appendTo(body);

                    var row = $('<div style="text-align: center"></div>').appendTo(body);
                    var createAsEmpty = $('<button data-type="empty" class="editor-button projects-dialog-screen-create-type"><i class="fa fa-archive fa-2x"></i><i style="position: absolute;" class="fa fa-asterisk"></i><br/>Create Project</button>').appendTo(row);
                    var createAsClone = $('<button data-type="clone" class="editor-button projects-dialog-screen-create-type"><i class="fa fa-archive fa-2x"></i><i style="position: absolute;" class="fa fa-git"></i><br/>Clone Repository</button>').appendTo(row);

                    createAsEmpty.click(function(e) {
                        e.preventDefault();
                        createProjectOptions = {
                            action: "create"
                        }
                        show('git-config');
                    })

                    createAsClone.click(function(e) {
                        e.preventDefault();
                        createProjectOptions = {
                            action: "clone"
                        }
                        show('git-config');
                    })

                    return container;
                },
                buttons: [
                    {
                        // id: "clipboard-dialog-cancel",
                        text: "Not right now",
                        click: function() {
                            createProjectOptions = {};
                            $( this ).dialog( "close" );
                        }
                    }
                ]
            },
            'git-config': (function() {
                var gitUsernameInput;
                var gitEmailInput;
                return {
                    content: function(options) {
                        var isGlobalConfig = false;
                        var existingGitSettings = RED.settings.get('git');
                        if (existingGitSettings && existingGitSettings.user) {
                            existingGitSettings = existingGitSettings.user;
                        } else if (RED.settings.git && RED.settings.git.globalUser) {
                            isGlobalConfig = true;
                            existingGitSettings = RED.settings.git.globalUser;
                        }

                        var validateForm = function() {
                            var name = gitUsernameInput.val().trim();
                            var email = gitEmailInput.val().trim();
                            var valid = name.length > 0 && email.length > 0;
                            $("#projects-dialog-git-config").prop('disabled',!valid).toggleClass('disabled ui-button-disabled ui-state-disabled',!valid);

                        }

                        var container = $('<div class="projects-dialog-screen-start"></div>');
                        migrateProjectHeader.appendTo(container);
                        var body = $('<div class="projects-dialog-screen-start-body"></div>').appendTo(container);

                        $('<p>').text("Setup your version control client").appendTo(body);
                        $('<p>').text("Node-RED uses the open source tool Git for version control. It tracks changes to your project files and lets you push them to remote repositories.").appendTo(body);
                        $('<p>').text("When you commit a set of changes, Git records who made the changes with a username and email address. The Username can be anything you want - it does not need to be your real name.").appendTo(body);

                        if (isGlobalConfig) {
                            $('<p>').text("Your Git client is already configured with the details below.").appendTo(body);
                        }
                        $('<p>').text("You can change these settings later under the 'Git config' tab of the settings dialog.").appendTo(body);

                        var row = $('<div class="form-row"></div>').appendTo(body);
                        $('<label for="">Username</label>').appendTo(row);
                        gitUsernameInput = $('<input type="text">').val((existingGitSettings&&existingGitSettings.name)||"").appendTo(row);
                        // $('<div style="position:relative;"></div>').text("This does not need to be your real name").appendTo(row);
                        gitUsernameInput.on("change keyup paste",validateForm);

                        row = $('<div class="form-row"></div>').appendTo(body);
                        $('<label for="">Email</label>').appendTo(row);
                        gitEmailInput = $('<input type="text">').val((existingGitSettings&&existingGitSettings.email)||"").appendTo(row);
                        gitEmailInput.on("change keyup paste",validateForm);
                        // $('<div style="position:relative;"></div>').text("Something something email").appendTo(row);
                        setTimeout(function() {
                            gitUsernameInput.focus();
                            validateForm();
                        },50);
                        return container;
                    },
                    buttons: [
                        {
                            // id: "clipboard-dialog-cancel",
                            text: "Back",
                            click: function() {
                                show('welcome');
                            }
                        },
                        {
                            id: "projects-dialog-git-config",
                            text: "Next", // TODO: nls
                            class: "primary",
                            click: function() {
                                var currentGitSettings = RED.settings.get('git') || {};
                                currentGitSettings.user = currentGitSettings.user || {};
                                currentGitSettings.user.name = gitUsernameInput.val();
                                currentGitSettings.user.email = gitEmailInput.val();
                                RED.settings.set('git', currentGitSettings);
                                if (createProjectOptions.action === "create") {
                                    show('project-details');
                                } else if (createProjectOptions.action === "clone") {
                                    show('clone-project');
                                }
                            }
                        }
                    ]
                };
            })(),
            'project-details': (function() {
                var projectNameInput;
                var projectSummaryInput;
                return {
                    content: function(options) {
                        var projectList = null;
                        var projectNameValid;

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
                        var container = $('<div class="projects-dialog-screen-start"></div>');
                        migrateProjectHeader.appendTo(container);
                        var body = $('<div class="projects-dialog-screen-start-body"></div>').appendTo(container);

                        $('<p>').text("Create your project").appendTo(body);
                        $('<p>').text("A project is maintained as a Git repository. It makes it much easier to share your flows with others and to collaborate on them.").appendTo(body);
                        $('<p>').text("You can create multiple projects and quickly switch between them from the editor.").appendTo(body);
                        $('<p>').text("To begin, your project needs a name and an optional description.").appendTo(body);

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
                            $("#projects-dialog-create-name").prop('disabled',!valid).toggleClass('disabled ui-button-disabled ui-state-disabled',!valid);
                        }

                        var row = $('<div class="form-row"></div>').appendTo(body);
                        $('<label for="projects-dialog-screen-create-project-name">Project name</label>').appendTo(row);

                        var subrow = $('<div style="position:relative;"></div>').appendTo(row);
                        projectNameInput = $('<input id="projects-dialog-screen-create-project-name" type="text"></input>').val(createProjectOptions.name||"").appendTo(subrow);
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
                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-empty"></div>').appendTo(body);
                        $('<label for="projects-dialog-screen-create-project-desc">Description</label>').appendTo(row);
                        projectSummaryInput = $('<input id="projects-dialog-screen-create-project-desc" type="text">').val(createProjectOptions.summary||"").appendTo(row);
                        $('<label class="projects-edit-form-sublabel"><small>Optional</small></label>').appendTo(row);

                        setTimeout(function() {
                            projectNameInput.focus();
                            projectNameInput.change();
                        },50);
                        return container;
                    },
                    buttons: function(options) {
                        return [
                            {
                                text: "Back",
                                click: function() {
                                    show('git-config');
                                }
                            },
                            {
                                id: "projects-dialog-create-name",
                                disabled: true,
                                text: "Next", // TODO: nls
                                class: "primary disabled",
                                click: function() {
                                    createProjectOptions.name = projectNameInput.val();
                                    createProjectOptions.summary = projectSummaryInput.val();
                                    show('default-files', options);
                                }
                            }
                        ]
                    }
                };
            })(),
            'clone-project': (function() {
                var projectNameInput;
                var projectSummaryInput;
                var projectFlowFileInput;
                var projectSecretInput;
                var projectSecretSelect;
                var copyProject;
                var projectRepoInput;
                var projectCloneSecret;
                var emptyProjectCredentialInput;
                var projectRepoUserInput;
                var projectRepoPasswordInput;
                var projectNameSublabel;
                var projectRepoSSHKeySelect;
                var projectRepoPassphrase;
                var projectRepoRemoteName
                var projectRepoBranch;
                var selectedProject;

                return {
                    content: function(options) {
                        var container = $('<div class="projects-dialog-screen-start"></div>');
                        migrateProjectHeader.appendTo(container);
                        var body = $('<div class="projects-dialog-screen-start-body"></div>').appendTo(container);
                        $('<p>').text("Clone a project").appendTo(body);
                        $('<p>').text("If you already have a git repository containing a project, you can clone it to get started.").appendTo(body);

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

                            var repo = projectRepoInput.val();

                            // var validRepo = /^(?:file|git|ssh|https?|[\d\w\.\-_]+@[\w\.]+):(?:\/\/)?[\w\.@:\/~_-]+(?:\/?|\#[\d\w\.\-_]+?)$/.test(repo);
                            var validRepo = repo.length > 0 && !/\s/.test(repo);
                            if (/^https?:\/\/[^/]+@/i.test(repo)) {
                                $("#projects-dialog-screen-create-project-repo-label small").text("Do not include the username/password in the url");
                                validRepo = false;
                            }
                            if (!validRepo) {
                                if (projectRepoChanged) {
                                    projectRepoInput.addClass("input-error");
                                }
                                valid = false;
                            } else {
                                projectRepoInput.removeClass("input-error");
                            }
                            if (/^https?:\/\//.test(repo)) {
                                $(".projects-dialog-screen-create-row-creds").show();
                                $(".projects-dialog-screen-create-row-sshkey").hide();
                            } else if (/^(?:ssh|[\S]+?@[\S]+?):(?:\/\/)?/.test(repo)) {
                                $(".projects-dialog-screen-create-row-creds").hide();
                                $(".projects-dialog-screen-create-row-sshkey").show();
                                // if ( !getSelectedSSHKey(projectRepoSSHKeySelect) ) {
                                //     valid = false;
                                // }
                            } else {
                                $(".projects-dialog-screen-create-row-creds").hide();
                                $(".projects-dialog-screen-create-row-sshkey").hide();
                            }

                            $("#projects-dialog-clone-project").prop('disabled',!valid).toggleClass('disabled ui-button-disabled ui-state-disabled',!valid);
                        }

                        var row;

                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-empty projects-dialog-screen-create-row-clone"></div>').appendTo(body);
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

                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-clone"></div>').appendTo(body);
                        $('<label for="projects-dialog-screen-create-project-repo">Git repository URL</label>').appendTo(row);
                        projectRepoInput = $('<input id="projects-dialog-screen-create-project-repo" type="text" placeholder="https://git.example.com/path/my-project.git"></input>').appendTo(row);
                        $('<label id="projects-dialog-screen-create-project-repo-label" class="projects-edit-form-sublabel"><small>https://, ssh:// or file://</small></label>').appendTo(row);
                        var projectRepoChanged = false;
                        var lastProjectRepo = "";
                        projectRepoInput.on("change keyup paste",function() {
                            projectRepoChanged = true;
                            var repo = $(this).val();
                            if (lastProjectRepo !== repo) {
                                $("#projects-dialog-screen-create-project-repo-label small").text("https://, ssh:// or file://");
                            }
                            lastProjectRepo = repo;

                            var m = /\/([^/]+?)(?:\.git)?$/.exec(repo);
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

                        var cloneAuthRows = $('<div class="projects-dialog-screen-create-row"></div>').appendTo(body);
                        row = $('<div class="form-row projects-dialog-screen-create-row-auth-error"></div>').hide().appendTo(cloneAuthRows);
                        $('<div><i class="fa fa-warning"></i> Authentication failed</div>').appendTo(row);

                        // Repo credentials - username/password ----------------
                        row = $('<div class="hide form-row projects-dialog-screen-create-row-creds"></div>').hide().appendTo(cloneAuthRows);

                        var subrow = $('<div style="width: calc(50% - 10px); display:inline-block;"></div>').appendTo(row);
                        $('<label for="projects-dialog-screen-create-project-repo-user">Username</label>').appendTo(subrow);
                        projectRepoUserInput = $('<input id="projects-dialog-screen-create-project-repo-user" type="text"></input>').appendTo(subrow);

                        subrow = $('<div style="width: calc(50% - 10px); margin-left: 20px; display:inline-block;"></div>').appendTo(row);
                        $('<label for="projects-dialog-screen-create-project-repo-pass">Password</label>').appendTo(subrow);
                        projectRepoPasswordInput = $('<input id="projects-dialog-screen-create-project-repo-pass" type="password"></input>').appendTo(subrow);
                        // -----------------------------------------------------

                        // Repo credentials - key/passphrase -------------------
                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-sshkey"></div>').hide().appendTo(cloneAuthRows);
                        subrow = $('<div style="width: calc(50% - 10px); display:inline-block;"></div>').appendTo(row);
                        $('<label for="projects-dialog-screen-create-project-repo-passphrase">SSH Key</label>').appendTo(subrow);
                        projectRepoSSHKeySelect = $("<select>",{style:"width: 100%"}).appendTo(subrow);

                        $.getJSON("settings/user/keys", function(data) {
                            var count = 0;
                            data.keys.forEach(function(key) {
                                projectRepoSSHKeySelect.append($("<option></option>").val(key.name).text(key.name));
                                count++;
                            });
                            if (count === 0) {
                                projectRepoSSHKeySelect.addClass("input-error");
                                projectRepoSSHKeySelect.attr("disabled",true);
                                sshwarningRow.show();
                            } else {
                                projectRepoSSHKeySelect.removeClass("input-error");
                                projectRepoSSHKeySelect.attr("disabled",false);
                                sshwarningRow.hide();
                            }
                        });
                        subrow = $('<div style="width: calc(50% - 10px); margin-left: 20px; display:inline-block;"></div>').appendTo(row);
                        $('<label for="projects-dialog-screen-create-project-repo-passphrase">Passphrase</label>').appendTo(subrow);
                        projectRepoPassphrase = $('<input id="projects-dialog-screen-create-project-repo-passphrase" type="password"></input>').appendTo(subrow);

                        subrow = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-sshkey"></div>').appendTo(cloneAuthRows);
                        var sshwarningRow = $('<div class="projects-dialog-screen-create-row-auth-error-no-keys"></div>').hide().appendTo(subrow);
                        $('<div class="form-row"><i class="fa fa-warning"></i> Before you can clone a repository over ssh you must add an SSH key to access it.</div>').appendTo(sshwarningRow);
                        subrow = $('<div style="text-align: center">').appendTo(sshwarningRow);
                        $('<button class="editor-button">Add an ssh key</button>').appendTo(subrow).click(function(e) {
                            e.preventDefault();
                            $('#projects-dialog-cancel').click();
                            RED.userSettings.show('gitconfig');
                            setTimeout(function() {
                                $("#user-settings-gitconfig-add-key").click();
                            },500);
                        });
                        // -----------------------------------------------------


                        // Secret - clone
                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-clone"></div>').appendTo(body);
                        $('<label>Credentials encryption key</label>').appendTo(row);
                        projectSecretInput = $('<input type="password"></input>').appendTo(row);



                        return container;
                    },
                    buttons: function(options) {
                        return [
                            {
                                text: "Back",
                                click: function() {
                                    show('git-config');
                                }
                            },
                            {
                                id: "projects-dialog-clone-project",
                                disabled: true,
                                text: "Clone project", // TODO: nls
                                class: "primary disabled",
                                click: function() {
                                    var projectType = $(".projects-dialog-screen-create-type.selected").data('type');
                                    var projectData = {
                                        name: projectNameInput.val(),
                                    }
                                    projectData.credentialSecret = projectSecretInput.val();
                                    var repoUrl = projectRepoInput.val();
                                    var metaData = {};
                                    if (/^(?:ssh|[\d\w\.\-_]+@[\w\.]+):(?:\/\/)?/.test(repoUrl)) {
                                        var selected = projectRepoSSHKeySelect.val();//false;//getSelectedSSHKey(projectRepoSSHKeySelect);
                                        if ( selected ) {
                                            projectData.git = {
                                                remotes: {
                                                    'origin': {
                                                        url: repoUrl,
                                                        keyFile: selected,
                                                        passphrase: projectRepoPassphrase.val()
                                                    }
                                                }
                                            };
                                        }
                                        else {
                                            console.log("Error! Can't get selected SSH key path.");
                                            return;
                                        }
                                    }
                                    else {
                                        projectData.git = {
                                            remotes: {
                                                'origin': {
                                                    url: repoUrl,
                                                    username: projectRepoUserInput.val(),
                                                    password: projectRepoPasswordInput.val()
                                                }
                                            }
                                        };
                                    }

                                    $(".projects-dialog-screen-create-row-auth-error").hide();
                                    $("#projects-dialog-screen-create-project-repo-label small").text("https://, ssh:// or file://");

                                    projectRepoUserInput.removeClass("input-error");
                                    projectRepoPasswordInput.removeClass("input-error");
                                    projectRepoSSHKeySelect.removeClass("input-error");
                                    projectRepoPassphrase.removeClass("input-error");

                                    RED.deploy.setDeployInflight(true);
                                    RED.projects.settings.switchProject(projectData.name);

                                    sendRequest({
                                        url: "projects",
                                        type: "POST",
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
                                                    $("#projects-dialog-screen-create-project-repo-label small").text("Connection failed");
                                                },
                                                'git_not_a_repository': function(error) {
                                                    projectRepoInput.addClass("input-error");
                                                    $("#projects-dialog-screen-create-project-repo-label small").text("Not a git repository");
                                                },
                                                'git_repository_not_found': function(error) {
                                                    projectRepoInput.addClass("input-error");
                                                    $("#projects-dialog-screen-create-project-repo-label small").text("Repository not found");
                                                },
                                                'git_auth_failed': function(error) {
                                                    $(".projects-dialog-screen-create-row-auth-error").show();

                                                    projectRepoUserInput.addClass("input-error");
                                                    projectRepoPasswordInput.addClass("input-error");
                                                    // getRepoAuthDetails(req);
                                                    projectRepoSSHKeySelect.addClass("input-error");
                                                    projectRepoPassphrase.addClass("input-error");
                                                },
                                                'missing_flow_file': function(error) {
                                                    // This is handled via a runtime notification.
                                                    dialog.dialog("close");
                                                },
                                                'project_empty': function(error) {
                                                    // This is handled via a runtime notification.
                                                    dialog.dialog("close");
                                                },
                                                'credentials_load_failed': function(error) {
                                                    // This is handled via a runtime notification.
                                                    dialog.dialog("close");
                                                },
                                                '*': function(error) {
                                                    reportUnexpectedError(error);
                                                    $( dialog ).dialog( "close" );
                                                }
                                            }
                                        }
                                    },projectData).then(function() {
                                        RED.events.emit("project:change", {name:name});
                                    }).always(function() {
                                        setTimeout(function() {
                                            RED.deploy.setDeployInflight(false);
                                        },500);
                                    })

                                }
                            }
                        ]
                    }
                }
            })(),
            'default-files': (function() {
                var projectFlowFileInput;
                var projectCredentialFileInput;
                return {
                    content: function(options) {
                        var container = $('<div class="projects-dialog-screen-start"></div>');
                        migrateProjectHeader.appendTo(container);
                        var body = $('<div class="projects-dialog-screen-start-body"></div>').appendTo(container);

                        $('<p>').text("Create your project files").appendTo(body);
                        $('<p>').text("A project contains your flow files, a README file and a package.json file.").appendTo(body);
                        $('<p>').text("It can contain any other files you want to maintain in the Git repository.").appendTo(body);
                        if (!options.existingProject && RED.settings.files) {
                            $('<p>').text("Your existing flow and credential files will be copied into the project.").appendTo(body);
                        }

                        var validateForm = function() {
                            var valid = true;
                            var flowFile = projectFlowFileInput.val();
                            if (flowFile === "" || !/\.json$/.test(flowFile)) {
                                valid = false;
                                if (!projectFlowFileInput.hasClass("input-error")) {
                                    projectFlowFileInput.addClass("input-error");
                                    projectFlowFileInput.next().empty().append('<i style="margin-top: 8px;" class="fa fa-exclamation-triangle"></i>');
                                }
                                projectCredentialFileInput.text("");
                                if (!projectCredentialFileInput.hasClass("input-error")) {
                                    projectCredentialFileInput.addClass("input-error");
                                    projectCredentialFileInput.next().empty().append('<i style="margin-top: 8px;" class="fa fa-exclamation-triangle"></i>');
                                }
                            } else {
                                if (projectFlowFileInput.hasClass("input-error")) {
                                    projectFlowFileInput.removeClass("input-error");
                                    projectFlowFileInput.next().empty();
                                }
                                if (projectCredentialFileInput.hasClass("input-error")) {
                                    projectCredentialFileInput.removeClass("input-error");
                                    projectCredentialFileInput.next().empty();
                                }
                                projectCredentialFileInput.text(flowFile.substring(0,flowFile.length-5)+"_cred.json");
                            }
                            $("#projects-dialog-create-default-files").prop('disabled',!valid).toggleClass('disabled ui-button-disabled ui-state-disabled',!valid);
                        }
                        var row = $('<div class="form-row"></div>').appendTo(body);
                        $('<label for="projects-dialog-screen-create-project-file">Flow file</label>').appendTo(row);
                        var subrow = $('<div style="position:relative;"></div>').appendTo(row);
                        var defaultFlowFile = (createProjectOptions.files &&createProjectOptions.files.flow) || (RED.settings.files && RED.settings.files.flow)||"flow.json";
                        projectFlowFileInput = $('<input id="projects-dialog-screen-create-project-file" type="text">').val(defaultFlowFile)
                            .on("change keyup paste",validateForm)
                            .appendTo(subrow);
                        $('<div class="projects-dialog-screen-input-status"></div>').appendTo(subrow);
                        $('<label class="projects-edit-form-sublabel"><small>*.json</small></label>').appendTo(row);

                        var defaultCredentialsFile = (createProjectOptions.files &&createProjectOptions.files.credentials) || (RED.settings.files && RED.settings.files.credentials)||"flow_cred.json";
                        row = $('<div class="form-row"></div>').appendTo(body);
                        $('<label for="projects-dialog-screen-create-project-credfile">Credentials file</label>').appendTo(row);
                        subrow = $('<div style="position:relative;"></div>').appendTo(row);
                        projectCredentialFileInput = $('<div style="width: 100%" class="uneditable-input" id="projects-dialog-screen-create-project-credentials">').text(defaultCredentialsFile)
                            .appendTo(subrow);
                        $('<div class="projects-dialog-screen-input-status"></div>').appendTo(subrow);

                        setTimeout(function() {
                            projectFlowFileInput.focus();
                            validateForm();
                        },50);

                        return container;
                    },
                    buttons: function(options) {
                        return [
                            {
                                // id: "clipboard-dialog-cancel",
                                text: options.existingProject?"Cancel":"Back",
                                click: function() {
                                    if (options.existingProject) {
                                        $(this).dialog('close');
                                    } else {
                                        show('project-details',options);
                                    }
                                }
                            },
                            {
                                id: "projects-dialog-create-default-files",
                                text: "Next", // TODO: nls
                                class: "primary",
                                click: function() {
                                    createProjectOptions.files = {
                                        flow: projectFlowFileInput.val(),
                                        credentials: projectCredentialFileInput.text()
                                    }
                                    if (!options.existingProject) {
                                        createProjectOptions.migrateFiles = true;
                                    }
                                    show('encryption-config',options);
                                }
                            }
                        ]
                    }
                }
            })(),
            'encryption-config': (function() {
                var emptyProjectCredentialInput;
                return {
                    content: function(options) {

                        var container = $('<div class="projects-dialog-screen-start"></div>');
                        migrateProjectHeader.appendTo(container);
                        var body = $('<div class="projects-dialog-screen-start-body"></div>').appendTo(container);

                        $('<p>').text("Setup encryption of your credentials file").appendTo(body);
                        if (options.existingProject) {
                            $('<p>').text("Your flow credentials file can be encrypted to keep its contents secure.").appendTo(body);
                            $('<p>').text("If you want to store these credentials in a public Git repository, you must encrypt them by providing a secret key phrase.").appendTo(body);
                        } else {
                            if (RED.settings.flowEncryptionType === 'disabled') {
                                $('<p>').text("Your flow credentials file is not currently encrypted.").appendTo(body);
                                $('<p>').text("That means its contents, such as passwords and access tokens, can be read by anyone with access to the file.").appendTo(body);
                                $('<p>').text("If you want to store these credentials in a public Git repository, you must encrypt them by providing a secret key phrase.").appendTo(body);
                            } else {
                                if (RED.settings.flowEncryptionType === 'user') {
                                    $('<p>').text("Your flow credentials file is currently encrypted using the credentialSecret property from your settings file as the key.").appendTo(body);
                                } else if (RED.settings.flowEncryptionType === 'system') {
                                    $('<p>').text("Your flow credentials file is currently encrypted using a system-generated key. You should provide a new secret key for this project.").appendTo(body);
                                }
                                $('<p>').text("The key will be stored separately from your project files. You will need to provide the key to use this project in another instance of Node-RED.").appendTo(body);
                            }
                        }

                        // var row = $('<div class="form-row"></div>').appendTo(body);
                        // $('<label for="">Username</label>').appendTo(row);
                        // var gitUsernameInput = $('<input type="text">').val(currentGitSettings.user.name||"").appendTo(row);
                        // // $('<div style="position:relative;"></div>').text("This does not need to be your real name").appendTo(row);
                        //
                        // row = $('<div class="form-row"></div>').appendTo(body);
                        // $('<label for="">Email</label>').appendTo(row);
                        // var gitEmailInput = $('<input type="text">').val(currentGitSettings.user.email||"").appendTo(row);
                        // // $('<div style="position:relative;"></div>').text("Something something email").appendTo(row);

                        var validateForm = function() {
                            var valid = true;
                            var encryptionState = $("input[name=projects-encryption-type]:checked").val();
                            if (encryptionState === 'enabled') {
                                var encryptionKeyType = $("input[name=projects-encryption-key]:checked").val();
                                if (encryptionKeyType === 'custom') {
                                    valid = valid && emptyProjectCredentialInput.val()!=='';
                                }
                            }
                            $("#projects-dialog-create-encryption").prop('disabled',!valid).toggleClass('disabled ui-button-disabled ui-state-disabled',!valid);
                        }


                        var row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-empty"></div>').appendTo(body);
                        $('<label>Credentials</label>').appendTo(row);

                        var credentialsBox = $('<div style="width: 550px">').appendTo(row);
                        var credentialsRightBox = $('<div style="min-height:150px; box-sizing: border-box; float: right; vertical-align: top; width: 331px; margin-left: -1px; padding: 15px; margin-top: -15px; border: 1px solid #ccc; border-radius: 3px;  display: inline-block">').appendTo(credentialsBox);
                        var credentialsLeftBox = $('<div style="vertical-align: top; width: 220px;  display: inline-block">').appendTo(credentialsBox);

                        var credentialsEnabledBox = $('<div class="form-row" style="padding:  7px 8px 3px 8px;border: 1px solid #ccc;border-radius: 4px;border-top-right-radius: 0;border-bottom-right-radius: 0;border-right-color: white;"></div>').appendTo(credentialsLeftBox);
                        $('<label class="projects-edit-form-inline-label" style="margin-left: 5px"><input type="radio" style="vertical-align: middle; margin-top:0; margin-right: 10px;" name="projects-encryption-type" value="enabled"> <i style="font-size: 1.4em; margin-right: 8px; vertical-align: middle; color: #888;" class="fa fa-lock"></i> <span style="vertical-align: middle;">Enable encryption</span></label>').appendTo(credentialsEnabledBox);
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
                                if ($("input[name=projects-encryption-key]:checked").val() === 'custom') {
                                    emptyProjectCredentialInput.focus();
                                }

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
                            });

                            validateForm();
                        })

                        row = $('<div class="form-row projects-encryption-enabled-row"></div>').appendTo(credentialsRightBox);
                        $('<label class="projects-edit-form-inline-label '+((RED.settings.flowEncryptionType !== 'user')?'disabled':'')+'" style="margin-left: 5px"><input '+((RED.settings.flowEncryptionType !== 'user')?'disabled':'')+' type="radio" style="vertical-align: middle; margin-top:0; margin-right: 10px;" value="default" name="projects-encryption-key"> <span style="vertical-align: middle;">Copy over existing key</span></label>').appendTo(row);
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
                            if (val === "custom") {
                                emptyProjectCredentialInput.focus();
                            }
                            validateForm();
                        });

                        setTimeout(function() {
                            credentialsLeftBox.find("input[name=projects-encryption-type][value=enabled]").click();
                            if (RED.settings.flowEncryptionType !== 'user') {
                                credentialsRightBox.find("input[name=projects-encryption-key][value=custom]").click();
                            } else {
                                credentialsRightBox.find("input[name=projects-encryption-key][value=default]").click();
                            }
                            validateForm();
                        },100);

                        return container;
                    },
                    buttons: function(options) {
                            return [
                            {
                                // id: "clipboard-dialog-cancel",
                                text: "Back",
                                click: function() {
                                    show('default-files',options);
                                }
                            },
                            {
                                id: "projects-dialog-create-encryption",
                                text: options.existingProject?"Create project files":"Create project", // TODO: nls
                                class: "primary disabled",
                                disabled: true,
                                click: function() {
                                    var encryptionState = $("input[name=projects-encryption-type]:checked").val();
                                    if (encryptionState === 'enabled') {
                                        var encryptionKeyType = $("input[name=projects-encryption-key]:checked").val();
                                        if (encryptionKeyType === 'custom') {
                                            createProjectOptions.credentialSecret = emptyProjectCredentialInput.val();
                                        } else {
                                            // If 'use existing', leave createProjectOptions.credentialSecret blank
                                            // - that will trigger it to use the existing key
                                            // TODO: this option should be disabled if encryption is disabled
                                        }
                                    } else {
                                        // Disabled encryption by explicitly setting credSec to false
                                        createProjectOptions.credentialSecret = false;
                                    }
                                    RED.deploy.setDeployInflight(true);
                                    RED.projects.settings.switchProject(createProjectOptions.name);

                                    var method = "POST";
                                    var url = "projects";

                                    if (options.existingProject) {
                                        createProjectOptions.initialise = true;
                                        method = "PUT";
                                        url = "projects/"+activeProject.name;
                                    }
                                    var self = this;
                                    sendRequest({
                                        url: url,
                                        type: method,
                                        requireCleanWorkspace: true,
                                        handleAuthFail: false,
                                        responses: {
                                            200: function(data) {
                                                createProjectOptions = {};
                                                if (options.existingProject) {
                                                    $( self ).dialog( "close" );
                                                } else {
                                                    show('create-success');
                                                    RED.menu.setDisabled('menu-item-projects-open',false);
                                                    RED.menu.setDisabled('menu-item-projects-settings',false);
                                                }
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
                                                '*': function(error) {
                                                    reportUnexpectedError(error);
                                                    $( dialog ).dialog( "close" );
                                                }
                                            }
                                        }
                                    },createProjectOptions).always(function() {
                                        setTimeout(function() {
                                            RED.deploy.setDeployInflight(false);
                                        },500);
                                    })
                                }
                            }
                        ];
                    }
                }
            })(),
            'create-success': {
                content: function(options) {

                    var container = $('<div class="projects-dialog-screen-start"></div>');
                    migrateProjectHeader.appendTo(container);
                    var body = $('<div class="projects-dialog-screen-start-body"></div>').appendTo(container);

                    $('<p>').text("You have successfully created your first project!").appendTo(body);
                    $('<p>').text("You can now continue to use Node-RED just as you always have.").appendTo(body);
                    $('<p>').text("The 'info' tab in the sidebar shows you what your current active project is. "+
                    "The button next to the name can be used to access the project settings view.").appendTo(body);
                    $('<p>').text("The 'history' tab in the sidebar can be used to view files that have changed "+
                    "in your project and to commit them. It shows you a complete history of your commits and "+
                    "allows you to push your changes to a remote repository.").appendTo(body);

                    return container;
                },
                buttons: [
                    {
                        text: "Done",
                        click: function() {
                            $( this ).dialog( "close" );
                        }
                    }
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
                var projectCloneSecret;
                var emptyProjectCredentialInput;
                var projectRepoUserInput;
                var projectRepoPasswordInput;
                var projectNameSublabel;
                var projectRepoSSHKeySelect;
                var projectRepoPassphrase;
                var projectRepoRemoteName
                var projectRepoBranch;
                var selectedProject;

                return {
                    title: "Projects", // TODO: NLS
                    content: function(options) {
                        var projectList = null;
                        selectedProject = null;
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

                                // var validRepo = /^(?:file|git|ssh|https?|[\d\w\.\-_]+@[\w\.]+):(?:\/\/)?[\w\.@:\/~_-]+(?:\/?|\#[\d\w\.\-_]+?)$/.test(repo);
                                var validRepo = repo.length > 0 && !/\s/.test(repo);
                                if (/^https?:\/\/[^/]+@/i.test(repo)) {
                                    $("#projects-dialog-screen-create-project-repo-label small").text("Do not include the username/password in the url");
                                    validRepo = false;
                                }
                                if (!validRepo) {
                                    if (projectRepoChanged) {
                                        projectRepoInput.addClass("input-error");
                                    }
                                    valid = false;
                                } else {
                                    projectRepoInput.removeClass("input-error");
                                }
                                if (/^https?:\/\//.test(repo)) {
                                    $(".projects-dialog-screen-create-row-creds").show();
                                    $(".projects-dialog-screen-create-row-sshkey").hide();
                                } else if (/^(?:ssh|[\S]+?@[\S]+?):(?:\/\/)?/.test(repo)) {
                                    $(".projects-dialog-screen-create-row-creds").hide();
                                    $(".projects-dialog-screen-create-row-sshkey").show();
                                    // if ( !getSelectedSSHKey(projectRepoSSHKeySelect) ) {
                                    //     valid = false;
                                    // }
                                } else {
                                    $(".projects-dialog-screen-create-row-creds").hide();
                                    $(".projects-dialog-screen-create-row-sshkey").hide();
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
                            } else if (projectType === 'open') {
                                valid = !!selectedProject;
                            }

                            $("#projects-dialog-create").prop('disabled',!valid).toggleClass('disabled ui-button-disabled ui-state-disabled',!valid);
                        }

                        row = $('<div class="form-row button-group"></div>').appendTo(container);

                        var openProject = $('<button data-type="open" class="editor-button projects-dialog-screen-create-type toggle"><i class="fa fa-archive fa-2x"></i><i style="position: absolute;" class="fa fa-folder-open"></i><br/>Open Project</button>').appendTo(row);
                        var createAsEmpty = $('<button data-type="empty" class="editor-button projects-dialog-screen-create-type toggle"><i class="fa fa-archive fa-2x"></i><i style="position: absolute;" class="fa fa-asterisk"></i><br/>Create Project</button>').appendTo(row);
                        // var createAsCopy = $('<button data-type="copy" class="editor-button projects-dialog-screen-create-type toggle"><i class="fa fa-archive fa-2x"></i><i class="fa fa-long-arrow-right fa-2x"></i><i class="fa fa-archive fa-2x"></i><br/>Copy existing</button>').appendTo(row);
                        var createAsClone = $('<button data-type="clone" class="editor-button projects-dialog-screen-create-type toggle"><i class="fa fa-archive fa-2x"></i><i style="position: absolute;" class="fa fa-git"></i><br/>Clone Repository</button>').appendTo(row);
                        // var createAsClone = $('<button data-type="clone" class="editor-button projects-dialog-screen-create-type toggle"><i class="fa fa-git fa-2x"></i><i class="fa fa-arrows-h fa-2x"></i><i class="fa fa-archive fa-2x"></i><br/>Clone Repository</button>').appendTo(row);
                        row.find(".projects-dialog-screen-create-type").click(function(evt) {
                            evt.preventDefault();
                            container.find(".projects-dialog-screen-create-type").removeClass('selected');
                            $(this).addClass('selected');
                            container.find(".projects-dialog-screen-create-row").hide();
                            container.find(".projects-dialog-screen-create-row-"+$(this).data('type')).show();
                            validateForm();
                            projectNameInput.focus();
                            switch ($(this).data('type')) {
                                case "open": $("#projects-dialog-create").text("Open project"); break;
                                case "empty": $("#projects-dialog-create").text("Create project"); break;
                                case "clone": $("#projects-dialog-create").text("Clone project"); break;
                            }
                        })

                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-open"></div>').hide().appendTo(container);
                        createProjectList({
                            canSelectActive: false,
                            dblclick: function(project) {
                                selectedProject = project;
                                $("#projects-dialog-create").click();
                            },
                            select: function(project) {
                                selectedProject = project;
                                validateForm();
                            },
                            delete: function(project) {
                                if (projectList) {
                                    delete projectList[project.name];
                                }
                                selectedProject = null;

                                validateForm();
                            }
                        }).appendTo(row);

                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-empty projects-dialog-screen-create-row-clone"></div>').appendTo(container);
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
                                if ($("input[name=projects-encryption-key]:checked").val() === 'custom') {
                                    emptyProjectCredentialInput.focus();
                                }
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
                        $('<label class="projects-edit-form-inline-label">Encryption key</label>').appendTo(row);
                        // row = $('<div class="projects-encryption-enabled-row"></div>').appendTo(credentialsRightBox);
                        emptyProjectCredentialInput = $('<input type="password"></input>').appendTo(row);
                        emptyProjectCredentialInput.on("change keyup paste", validateForm);
                        $('<label class="projects-edit-form-sublabel"><small>A phrase to secure your credentials with</small></label>').appendTo(row);


                        row = $('<div class="form-row projects-encryption-disabled-row"></div>').hide().appendTo(credentialsRightBox);
                        $('<div class="" style="padding: 5px 20px;"><i class="fa fa-warning"></i> The credentials file will not be encrypted and its contents easily read</div>').appendTo(row);

                        credentialsRightBox.find("input[name=projects-encryption-key]").click(function() {
                            var val = $(this).val();
                            emptyProjectCredentialInput.attr("disabled",val === 'default');
                            if (val === "custom") {
                                emptyProjectCredentialInput.focus();
                            }
                            validateForm();
                        })

                        // Clone Project
                        row = $('<div class="hide form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-clone"></div>').appendTo(container);
                        $('<label for="projects-dialog-screen-create-project-repo">Git repository URL</label>').appendTo(row);
                        projectRepoInput = $('<input id="projects-dialog-screen-create-project-repo" type="text" placeholder="https://git.example.com/path/my-project.git"></input>').appendTo(row);
                        $('<label id="projects-dialog-screen-create-project-repo-label" class="projects-edit-form-sublabel"><small>https://, ssh:// or file://</small></label>').appendTo(row);

                        var projectRepoChanged = false;
                        var lastProjectRepo = "";
                        projectRepoInput.on("change keyup paste",function() {
                            projectRepoChanged = true;
                            var repo = $(this).val();
                            if (lastProjectRepo !== repo) {
                                $("#projects-dialog-screen-create-project-repo-label small").text("https://, ssh:// or file://");
                            }
                            lastProjectRepo = repo;

                            var m = /\/([^/]+?)(?:\.git)?$/.exec(repo);
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


                        var cloneAuthRows = $('<div class="hide projects-dialog-screen-create-row projects-dialog-screen-create-row-clone"></div>').hide().appendTo(container);
                        row = $('<div class="form-row projects-dialog-screen-create-row-auth-error"></div>').hide().appendTo(cloneAuthRows);
                        $('<div><i class="fa fa-warning"></i> Authentication failed</div>').appendTo(row);

                        // Repo credentials - username/password ----------------
                        row = $('<div class="hide form-row projects-dialog-screen-create-row-creds"></div>').hide().appendTo(cloneAuthRows);

                        var subrow = $('<div style="width: calc(50% - 10px); display:inline-block;"></div>').appendTo(row);
                        $('<label for="projects-dialog-screen-create-project-repo-user">Username</label>').appendTo(subrow);
                        projectRepoUserInput = $('<input id="projects-dialog-screen-create-project-repo-user" type="text"></input>').appendTo(subrow);

                        subrow = $('<div style="width: calc(50% - 10px); margin-left: 20px; display:inline-block;"></div>').appendTo(row);
                        $('<label for="projects-dialog-screen-create-project-repo-pass">Password</label>').appendTo(subrow);
                        projectRepoPasswordInput = $('<input id="projects-dialog-screen-create-project-repo-pass" type="password"></input>').appendTo(subrow);
                        // -----------------------------------------------------

                        // Repo credentials - key/passphrase -------------------
                        row = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-sshkey"></div>').hide().appendTo(cloneAuthRows);
                        subrow = $('<div style="width: calc(50% - 10px); display:inline-block;"></div>').appendTo(row);
                        $('<label for="projects-dialog-screen-create-project-repo-passphrase">SSH Key</label>').appendTo(subrow);
                        projectRepoSSHKeySelect = $("<select>",{style:"width: 100%"}).appendTo(subrow);

                        $.getJSON("settings/user/keys", function(data) {
                            var count = 0;
                            data.keys.forEach(function(key) {
                                projectRepoSSHKeySelect.append($("<option></option>").val(key.name).text(key.name));
                                count++;
                            });
                            if (count === 0) {
                                projectRepoSSHKeySelect.addClass("input-error");
                                projectRepoSSHKeySelect.attr("disabled",true);
                                sshwarningRow.show();
                            } else {
                                projectRepoSSHKeySelect.removeClass("input-error");
                                projectRepoSSHKeySelect.attr("disabled",false);
                                sshwarningRow.hide();
                            }
                        });
                        subrow = $('<div style="width: calc(50% - 10px); margin-left: 20px; display:inline-block;"></div>').appendTo(row);
                        $('<label for="projects-dialog-screen-create-project-repo-passphrase">Passphrase</label>').appendTo(subrow);
                        projectRepoPassphrase = $('<input id="projects-dialog-screen-create-project-repo-passphrase" type="password"></input>').appendTo(subrow);

                        subrow = $('<div class="form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-sshkey"></div>').appendTo(cloneAuthRows);
                        var sshwarningRow = $('<div class="projects-dialog-screen-create-row-auth-error-no-keys"></div>').hide().appendTo(subrow);
                        $('<div class="form-row"><i class="fa fa-warning"></i> Before you can clone a repository over ssh you must add an SSH key to access it.</div>').appendTo(sshwarningRow);
                        subrow = $('<div style="text-align: center">').appendTo(sshwarningRow);
                        $('<button class="editor-button">Add an ssh key</button>').appendTo(subrow).click(function(e) {
                            e.preventDefault();
                            $('#projects-dialog-cancel').click();
                            RED.userSettings.show('gitconfig');
                            setTimeout(function() {
                                $("#user-settings-gitconfig-add-key").click();
                            },500);
                        });
                        // -----------------------------------------------------


                        // Secret - clone
                        row = $('<div class="hide form-row projects-dialog-screen-create-row projects-dialog-screen-create-row-clone"></div>').appendTo(container);
                        $('<label>Credentials encryption key</label>').appendTo(row);
                        projectSecretInput = $('<input type="password"></input>').appendTo(row);


                        switch(options.screen||"empty") {
                            case "empty": createAsEmpty.click(); break;
                            case "open":  openProject.click(); break;
                            case "clone": createAsClone.click(); break;
                        }

                        setTimeout(function() {
                            if ((options.screen||"empty") !== "open") {
                                projectNameInput.focus();
                            } else {
                                $("#projects-dialog-project-list-search").focus();
                            }
                        },50);
                        return container;
                    },
                    buttons: function(options) {
                        var initialLabel;
                        switch (options.screen||"empty") {
                            case "open": initialLabel = "Open project"; break;
                            case "empty": initialLabel = "Create project"; break;
                            case "clone": initialLabel = "Clone project"; break;
                        }
                        return [
                            {
                                id: "projects-dialog-cancel",
                                text: RED._("common.label.cancel"),
                                click: function() {
                                    $( this ).dialog( "close" );
                                }
                            },
                            {
                                id: "projects-dialog-create",
                                text: initialLabel,
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
                                            projectData.credentialSecret = emptyProjectCredentialInput.val();
                                        } else {
                                            // Disabled encryption by explicitly setting credSec to false
                                            projectData.credentialSecret = false;
                                        }


                                    } else if (projectType === 'copy') {
                                        projectData.copy = copyProject.name;
                                    } else if (projectType === 'clone') {
                                        projectData.credentialSecret = projectSecretInput.val();
                                        var repoUrl = projectRepoInput.val();
                                        var metaData = {};
                                        if (/^(?:ssh|[\d\w\.\-_]+@[\w\.]+):(?:\/\/)?/.test(repoUrl)) {
                                            var selected = projectRepoSSHKeySelect.val();//false;//getSelectedSSHKey(projectRepoSSHKeySelect);
                                            if ( selected ) {
                                                projectData.git = {
                                                    remotes: {
                                                        'origin': {
                                                            url: repoUrl,
                                                            keyFile: selected,
                                                            passphrase: projectRepoPassphrase.val()
                                                        }
                                                    }
                                                };
                                            }
                                            else {
                                                console.log("Error! Can't get selected SSH key path.");
                                                return;
                                            }
                                        }
                                        else {
                                            projectData.git = {
                                                remotes: {
                                                    'origin': {
                                                        url: repoUrl,
                                                        username: projectRepoUserInput.val(),
                                                        password: projectRepoPasswordInput.val()
                                                    }
                                                }
                                            };
                                        }
                                    } else if (projectType === 'open') {
                                        return switchProject(selectedProject.name,function(err,data) {
                                            dialog.dialog( "close" );
                                            if (err) {
                                                if (err.error !== 'credentials_load_failed') {
                                                    console.log("unexpected_error",err)
                                                }
                                            }
                                        })
                                    }

                                    $(".projects-dialog-screen-create-row-auth-error").hide();
                                    $("#projects-dialog-screen-create-project-repo-label small").text("https://, ssh:// or file://");

                                    projectRepoUserInput.removeClass("input-error");
                                    projectRepoPasswordInput.removeClass("input-error");
                                    projectRepoSSHKeySelect.removeClass("input-error");
                                    projectRepoPassphrase.removeClass("input-error");

                                    RED.deploy.setDeployInflight(true);
                                    RED.projects.settings.switchProject(projectData.name);

                                    sendRequest({
                                        url: "projects",
                                        type: "POST",
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
                                                    $("#projects-dialog-screen-create-project-repo-label small").text("Connection failed");
                                                },
                                                'git_not_a_repository': function(error) {
                                                    projectRepoInput.addClass("input-error");
                                                    $("#projects-dialog-screen-create-project-repo-label small").text("Not a git repository");
                                                },
                                                'git_repository_not_found': function(error) {
                                                    projectRepoInput.addClass("input-error");
                                                    $("#projects-dialog-screen-create-project-repo-label small").text("Repository not found");
                                                },
                                                'git_auth_failed': function(error) {
                                                    $(".projects-dialog-screen-create-row-auth-error").show();

                                                    projectRepoUserInput.addClass("input-error");
                                                    projectRepoPasswordInput.addClass("input-error");
                                                    // getRepoAuthDetails(req);
                                                    projectRepoSSHKeySelect.addClass("input-error");
                                                    projectRepoPassphrase.addClass("input-error");
                                                },
                                                'missing_flow_file': function(error) {
                                                    // This is handled via a runtime notification.
                                                    dialog.dialog("close");
                                                },
                                                'project_empty': function(error) {
                                                    // This is handled via a runtime notification.
                                                    dialog.dialog("close");
                                                },
                                                'credentials_load_failed': function(error) {
                                                    // This is handled via a runtime notification.
                                                    dialog.dialog("close");
                                                },
                                                '*': function(error) {
                                                    reportUnexpectedError(error);
                                                    $( dialog ).dialog( "close" );
                                                }
                                            }
                                        }
                                    },projectData).then(function() {
                                        RED.events.emit("project:change", {name:name});
                                    }).always(function() {
                                        setTimeout(function() {
                                            RED.deploy.setDeployInflight(false);
                                        },500);
                                    })
                                }
                            }
                        ]
                    }
                }
            })()
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
                    '*': done
                },
            }
        },{active:true}).then(function() {
            RED.events.emit("project:change", {name:name});
        }).always(function() {
            setTimeout(function() {
                RED.deploy.setDeployInflight(false);
            },500);
        })
    }

    function deleteProject(row,name,done) {
        var cover = $('<div>').css({
            background:"white",
            position:"absolute",
            top:0,right:0,bottom:0,left:"100%",
            overflow:"hidden",
            padding: "5px 20px",
            transition: "left 0.4s",
            whitespace: "nowrap",
            width:"1000px"
        }).click(function(evt) { evt.stopPropagation(); }).appendTo(row);
        $('<span>').css({"lineHeight":"40px"}).text("Are you sure you want to delete this project?").appendTo(cover);
        $('<button style="margin-left:20px" class="editor-button">Cancel</button>')
            .appendTo(cover)
            .click(function(e) {
                e.stopPropagation();
                cover.remove();
                done(true);
            });
        $('<button style="margin-left:20px" class="editor-button primary">Delete</button>')
            .appendTo(cover)
            .click(function(e) {
                e.stopPropagation();
                cover.remove();
                sendRequest({
                    url: "projects/"+name,
                    type: "DELETE",
                    responses: {
                        200: function(data) {
                            done(false);
                        },
                        400: {
                            'unexpected_error': function(error) {
                                cover.remove();
                                done(true);
                            }
                        }
                    }
                });
            });

        setTimeout(function() {
            cover.css("left",0);
        },50);
        //
    }

    function show(s,options) {
        if (!dialog) {
            RED.projects.init();
        }
        var screen = screens[s];
        var container = screen.content(options||{});

        dialogBody.empty();
        var buttons = screen.buttons;
        if (typeof buttons === 'function') {
            buttons = buttons(options||{});
        }
        dialog.dialog('option','buttons',buttons);
        dialogBody.append(container);
        dialog.dialog('option','title',screen.title||"");
        dialog.dialog("open");
        dialog.dialog({position: { 'my': 'center top', 'at': 'center top+10%', 'of': window }});
    }

    function createProjectList(options) {
        options = options||{};
        var height = options.height || "300px";
        var container = $('<div></div>',{class:"projects-dialog-project-list-container" });
        var filterTerm = "";

        var searchDiv = $("<div>",{class:"red-ui-search-container"}).appendTo(container);
        var searchInput = $('<input id="projects-dialog-project-list-search" type="text" placeholder="search your projects">').appendTo(searchDiv).searchBox({
            //data-i18n="[placeholder]menu.label.searchInput"
            delay: 200,
            change: function() {
                filterTerm = $(this).val().toLowerCase();
                list.editableList('filter');
                if (selectedListItem && !selectedListItem.is(":visible")) {
                    selectedListItem.children().children().removeClass('selected');
                    selectedListItem = list.children(":visible").first();
                    selectedListItem.children().children().addClass('selected');
                    if (options.select) {
                        options.select(selectedListItem.children().data('data'));
                    }
                } else {
                    selectedListItem = list.children(":visible").first();
                    selectedListItem.children().children().addClass('selected');
                    if (options.select) {
                        options.select(selectedListItem.children().data('data'));
                    }
                }
                ensureSelectedIsVisible();
            }
        });
        var selectedListItem;

        searchInput.on('keydown',function(evt) {
            if (evt.keyCode === 40) {
                evt.preventDefault();
                // Down
                var next = selectedListItem;
                if (selectedListItem) {
                    do {
                        next = next.next();
                    } while(next.length !== 0 && !next.is(":visible"));
                    if (next.length === 0) {
                        return;
                    }
                    selectedListItem.children().children().removeClass('selected');
                } else {
                    next = list.children(":visible").first();
                }
                selectedListItem = next;
                selectedListItem.children().children().addClass('selected');
                if (options.select) {
                    options.select(selectedListItem.children().data('data'));
                }
                ensureSelectedIsVisible();
            } else if (evt.keyCode === 38) {
                evt.preventDefault();
                // Up
                var prev = selectedListItem;
                if (selectedListItem) {
                    do {
                        prev = prev.prev();
                    } while(prev.length !== 0 && !prev.is(":visible"));
                    if (prev.length === 0) {
                        return;
                    }
                    selectedListItem.children().children().removeClass('selected');
                } else {
                    prev = list.children(":visible").first();
                }
                selectedListItem = prev;
                selectedListItem.children().children().addClass('selected');
                if (options.select) {
                    options.select(selectedListItem.children().data('data'));
                }
                ensureSelectedIsVisible();
            } else if (evt.keyCode === 13) {
                evt.preventDefault();
                // Enter
                if (selectedListItem) {
                    if (options.dblclick) {
                        options.dblclick(selectedListItem.children().data('data'));
                    }
                }
            }
        });

        searchInput.i18n();

        var ensureSelectedIsVisible = function() {
            var selectedEntry = list.find(".projects-dialog-project-list-entry.selected").parent().parent();
            if (selectedEntry.length === 1) {
                var scrollWindow = listContainer;
                var scrollHeight = scrollWindow.height();
                var scrollOffset = scrollWindow.scrollTop();
                var y = selectedEntry.position().top;
                var h = selectedEntry.height();
                if (y+h > scrollHeight) {
                    scrollWindow.animate({scrollTop: '-='+(scrollHeight-y-h)},50);
                } else if (y<0) {
                    scrollWindow.animate({scrollTop: '+='+y},50);
                }
            }
        }

        var listContainer = $('<div></div>',{class:"projects-dialog-project-list-inner-container" }).appendTo(container);

        var list = $('<ol>',{class:"projects-dialog-project-list"}).appendTo(listContainer).editableList({
            addButton: false,
            height:"auto",
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

                var tools = $('<div class="projects-dialog-project-list-entry-tools"></div>').appendTo(header);
                $('<button class="editor-button editor-button-small" style="float: right;"><i class="fa fa-trash"></i></button>')
                    .appendTo(tools)
                    .click(function(e) {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteProject(row,entry.name, function(cancelled) {
                            if (!cancelled) {
                                row.fadeOut(300,function() {
                                    list.editableList('removeItem',entry);
                                    if (options.delete) {
                                        options.delete(entry);
                                    }
                                });
                            }
                        })
                    });


                row.click(function(evt) {
                    $('.projects-dialog-project-list-entry').removeClass('selected');
                    header.addClass('selected');
                    selectedListItem = row.parent();
                    if (options.select) {
                        options.select(entry);
                    }
                    ensureSelectedIsVisible();
                    searchInput.focus();
                })
                if (options.dblclick) {
                    row.dblclick(function(evt) {
                        evt.preventDefault();
                        options.dblclick(entry);
                    })
                }
            },
            filter: function(data) {
                if (filterTerm === "") { return true; }
                return data.name.toLowerCase().indexOf(filterTerm) !== -1;
            }
        });
        $.getJSON("projects", function(data) {
            data.projects.forEach(function(project) {
                list.editableList('addItem',{name:project});
            });
        })
        return container;
    }



    function requireCleanWorkspace(done) {
        if (RED.nodes.dirty()) {
            var message = '<p>You have undeployed changes that will be lost.</p><p>Do you want to continue?</p>';
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
                            done(true);
                        }
                    },{
                        text: 'Continue',
                        click: function() {
                            cleanNotification.close();
                            done(false);
                        }
                    }
                ]
            });

        }
    }

    function sendRequest(options,body) {
        // dialogBody.hide();
        // console.log(options.url,body);

        if (options.requireCleanWorkspace && RED.nodes.dirty()) {
            var thenCallback;
            var alwaysCallback;
            requireCleanWorkspace(function(cancelled) {
                if (cancelled) {
                    if (options.cancel) {
                        options.cancel();
                        if (alwaysCallback) {
                            alwaysCallback();
                        }
                    }
                } else {
                    delete options.requireCleanWorkspace;
                    sendRequest(options,body).then(function() {
                        if (thenCallback) {
                            thenCallback();
                        }
                    }).always(function() {
                        if (alwaysCallback) {
                            alwaysCallback();
                        }

                    })
                }
            })
            // What follows is a very hacky Promise-like api thats good enough
            // for our needs.
            return {
                then: function(done) {
                    thenCallback = done;
                    return { always: function(done) { alwaysCallback = done; }}
                 },
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
                    var url = activeProject.git.remotes[xhr.responseJSON.remote||options.remote||'origin'].fetch;

                    var message = $('<div>'+
                        '<div class="form-row">Authentication required for repository:</div>'+
                        '<div class="form-row"><div style="margin-left: 20px;">'+url+'</div></div>'+
                        '</div>');

                    var isSSH = false;
                    if (/^https?:\/\//.test(url)) {
                        $('<div class="form-row"><label for="projects-user-auth-username">Username</label><input id="projects-user-auth-username" type="text"></input></div>'+
                        '<div class="form-row"><label for=projects-user-auth-password">Password</label><input id="projects-user-auth-password" type="password"></input></div>').appendTo(message);
                    } else if (/^(?:ssh|[\d\w\.\-_]+@[\w\.]+):(?:\/\/)?/.test(url)) {
                        isSSH = true;
                        var row = $('<div class="form-row"></div>').appendTo(message);
                        $('<label for="projects-user-auth-key">SSH Key</label>').appendTo(row);
                        var projectRepoSSHKeySelect = $('<select id="projects-user-auth-key">').width('70%').appendTo(row);
                        $.getJSON("settings/user/keys", function(data) {
                            var count = 0;
                            data.keys.forEach(function(key) {
                                projectRepoSSHKeySelect.append($("<option></option>").val(key.name).text(key.name));
                                count++;
                            });
                            if (count === 0) {
                                //TODO: handle no keys yet setup
                            }
                        });
                        row = $('<div class="form-row"></div>').appendTo(message);
                        $('<label for="projects-user-auth-passphrase">Passphrase</label>').appendTo(row);
                        $('<input id="projects-user-auth-passphrase" type="password"></input>').appendTo(row);
                    }

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
                                    body = body || {};
                                    var authBody = {};
                                    if (isSSH) {
                                        authBody.keyFile = $('#projects-user-auth-key').val();
                                        authBody.passphrase = $('#projects-user-auth-passphrase').val();
                                    } else {
                                        authBody.username = $('#projects-user-auth-username').val();
                                        authBody.password = $('#projects-user-auth-password').val();
                                    }
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
                                        url: "projects/"+activeProject.name+"/remotes/"+(xhr.responseJSON.remote||options.remote||'origin'),
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
                                    },{auth:authBody});
                                }
                            }
                        ]
                    });
                    return;
                } else if (responses[xhr.responseJSON.error]) {
                    resultCallback = responses[xhr.responseJSON.error];
                    resultCallbackArgs = xhr.responseJSON;
                    return;
                } else if (responses['*']) {
                    resultCallback = responses['*'];
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
                if (!entry.hasOwnProperty('commit')) {
                    branchFilterCreateItem = container;
                    $('<i class="fa fa-code-fork"></i>').appendTo(container);
                    $('<span>').text("Create branch:").appendTo(container);
                    $('<div class="sidebar-version-control-branch-list-entry-create-name" style="margin-left: 10px;">').text(entry.name).appendTo(container);
                } else {
                    $('<i class="fa fa-code-fork"></i>').appendTo(container);
                    $('<span>').text(entry.name).appendTo(container);
                    if (entry.current) {
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
                    if (!entry.hasOwnProperty('commit')) {
                        body.name = branchFilter.val();
                        body.create = true;
                        if (options.remote) {
                            body.name = options.remote()+"/"+body.name;
                        }
                    } else {
                        if ($(this).hasClass('selected')) {
                            body.current = true;
                        }
                        body.name = entry.name;
                    }
                    if (options.onselect) {
                        options.onselect(body);
                    }
                });
            },
            filter: function(data) {
                var isCreateEntry = (!data.hasOwnProperty('commit'));
                return (
                            isCreateEntry &&
                            (
                                branchFilterTerm !== "" &&
                                branches.indexOf(branchPrefix+branchFilterTerm) === -1
                            )
                     ) ||
                     (
                         !isCreateEntry &&
                         data.name.indexOf(branchFilterTerm) !== -1
                     );
            }
        });
        return {
            refresh: function(url) {
                branchFilter.searchBox("value","");
                branchList.editableList('empty');
                var start = Date.now();
                var spinner = addSpinnerOverlay(container).addClass("projects-dialog-spinner-contain");
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
                            'git_connection_failed': function(error) {
                                RED.notify(error.message,'error');
                            },
                            'git_not_a_repository': function(error) {
                                RED.notify(error.message,'error');
                            },
                            'git_repository_not_found': function(error) {
                                RED.notify(error.message,'error');
                            },
                            'unexpected_error': function(error) {
                                reportUnexpectedError(error);
                            }
                        }
                    }
                })
            },
            // addItem: function(data) { branchList.editableList('addItem',data) },
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
        RED.actions.add("core:show-project-settings",RED.projects.settings.show);
        var projectsAPI = {
            sendRequest:sendRequest,
            createBranchList:createBranchList,
            addSpinnerOverlay:addSpinnerOverlay,
            reportUnexpectedError:reportUnexpectedError
        };
        RED.projects.settings.init(projectsAPI);
        RED.projects.userSettings.init(projectsAPI);
        RED.sidebar.versionControl.init(projectsAPI);
        initScreens();
        // initSidebar();
    }

    function createDefaultFileSet() {
        if (!activeProject) {
            throw new Error("Cannot create default file set without an active project");
        } else if (!activeProject.empty) {
            throw new Error("Cannot create default file set on a non-empty project");
        }
        if (!RED.user.hasPermission("projects.write")) {
            RED.notify(RED._("user.errors.notAuthorized"),"error");
            return;
        }
        createProjectOptions = {};
        show('default-files',{existingProject: true});
    }
    function createDefaultPackageFile() {
        RED.deploy.setDeployInflight(true);
        RED.projects.settings.switchProject(activeProject.name);

        var method = "PUT";
        var url = "projects/"+activeProject.name;
        var createProjectOptions = {
            initialise: true
        };
        sendRequest({
            url: url,
            type: method,
            requireCleanWorkspace: true,
            handleAuthFail: false,
            responses: {
                200: function(data) { },
                400: {
                    'git_error': function(error) {
                        console.log("git error",error);
                    },
                    'missing_flow_file': function(error) {
                        // This is a natural next error - but let the runtime event
                        // trigger the dialog rather than double-report it.
                        $( dialog ).dialog( "close" );
                    },
                    '*': function(error) {
                        reportUnexpectedError(error);
                        $( dialog ).dialog( "close" );
                    }
                }
            }
        },createProjectOptions).always(function() {
            setTimeout(function() {
                RED.deploy.setDeployInflight(false);
            },500);
        })
    }

    function refresh(done) {
        $.getJSON("projects",function(data) {
            if (data.active) {
                $.getJSON("projects/"+data.active, function(project) {
                    activeProject = project;
                    RED.sidebar.versionControl.refresh(true);
                    if (done) {
                        done(activeProject);
                    }
                });
            } else {
                if (done) {
                    done(null);
                }
            }
        });
    }


    function showNewProjectScreen() {
        createProjectOptions = {};
        if (!activeProject) {
            show('welcome');
        } else {
            show('create',{screen:'empty'})
        }
    }

    return {
        init: init,
        showStartup: function() {
            if (!RED.user.hasPermission("projects.write")) {
                RED.notify(RED._("user.errors.notAuthorized"),"error");
                return;
            }
            show('welcome');
        },
        newProject: function() {
            if (!RED.user.hasPermission("projects.write")) {
                RED.notify(RED._("user.errors.notAuthorized"),"error");
                return;
            }

            if (RED.nodes.dirty()) {
                return requireCleanWorkspace(function(cancelled) {
                    if (!cancelled) {
                        showNewProjectScreen();
                    }
                })
            } else {
                showNewProjectScreen();
            }
        },
        selectProject: function() {
            if (!RED.user.hasPermission("projects.write")) {
                RED.notify(RED._("user.errors.notAuthorized"),"error");
                return;
            }
            show('create',{screen:'open'})
        },
        showCredentialsPrompt: function() { //TODO: rename this function
            if (!RED.user.hasPermission("projects.write")) {
                RED.notify(RED._("user.errors.notAuthorized"),"error");
                return;
            }
            RED.projects.settings.show('settings');
        },
        showFilesPrompt: function() { //TODO: rename this function
            if (!RED.user.hasPermission("projects.write")) {
                RED.notify(RED._("user.errors.notAuthorized"),"error");
                return;
            }
            RED.projects.settings.show('settings');
        },
        showProjectDependencies: function() {
            RED.projects.settings.show('deps');
        },
        createDefaultFileSet: createDefaultFileSet,
        createDefaultPackageFile: createDefaultPackageFile,
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
