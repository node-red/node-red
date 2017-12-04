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

RED.gitconfig = (function() {
    
        var trayWidth = 700;
        var settingsVisible = false;
    
        function createRemoteRepositorySection(pane) {
            var title = $('<h3></h3>').text("Version Control").appendTo(pane);
            var editRepoButton = $('<button class="editor-button editor-button-small" style="float: right;">edit</button>')
                .appendTo(title)
                .click(function(evt) {
                    editRepoButton.hide();
                    formButtons.show();
    
                    // $('.projects-dialog-remote-list-entry-delete').show();
                    // remoteListAddButton.show();
    
                    gitUsernameLabel.hide();
                    gitUsernameInput.show();
                    gitEmailLabel.hide();
                    gitEmailInput.show();
                });
    
            var gitconfigContainer = $('<div class="user-settings-section"></div>').appendTo(pane);
            var subtitle = $('<h4></h4>').text("Committer Details").appendTo(gitconfigContainer);
            $('<div style="display: inline-block; margin-left: 20px;"><small style="color:#aaa;"></small></div>').appendTo(subtitle).find('small').text("Leave blank to use system default");
    
            var row = $('<div class="user-settings-row"></div>').appendTo(gitconfigContainer);
            $('<label for=""></label>').text('Username').appendTo(row);
            var gitUsernameLabel = $('<div class="uneditable-input">').appendTo(row);
            var gitUsernameInput = $('<input type="text">').hide().appendTo(row);
    
            row = $('<div class="user-settings-row"></div>').appendTo(gitconfigContainer);
            $('<label for=""></label>').text('Email').appendTo(row);
            var gitEmailLabel = $('<div class="uneditable-input">').appendTo(row);
            var gitEmailInput = $('<input type="text">').hide().appendTo(row);
    
            // if (activeProject.git.user) {
            //     gitUsernameLabel.text(activeProject.git.user.name);
            //     gitUsernameInput.val(activeProject.git.user.name);
    
            //     gitEmailLabel.text(activeProject.git.user.email);
            //     gitEmailInput.val(activeProject.git.user.email);
            // }
            // var formButtons = $('<span class="button-group" style="position: relative; float: right; margin-right:0;"></span>')
            var formButtonArea = $('<div style="width: 100%; height: 35px;"></div>').appendTo(gitconfigContainer);
            var formButtons = $('<span class="button-group" style="position: absolute; right: 0px; margin-right:0;"></span>')
                .hide().appendTo(formButtonArea);

    
            var sshkeyTitle = $('<h4></h4>').text("SSH Keys").appendTo(gitconfigContainer);
            var generateSshKeyButton = $('<button class="editor-button editor-button-small" style="float: right;">generate new ssh key</button>')
                .appendTo(sshkeyTitle)
                .click(function(evt) {
                    console.log('click generateSshKeyButton');
                });

            row = $('<div class="user-settings-row projects-dialog-remote-list"></div>').appendTo(gitconfigContainer);
            var sshkeysList = $('<ol>').appendTo(row);
            sshkeysList.editableList({
                addButton: false,
                height: 'auto',
                addItem: function(outer,index,entry) {
    
                    var header = $('<div class="projects-dialog-remote-list-entry-header"></div>').appendTo(outer);
                    entry.header = $('<span>').text(entry.path||"Add new remote").appendTo(header);
                    var body = $('<div>').appendTo(outer);
                    entry.body = body;
                    if (entry.path) {
                        if (entry.data) {
                            entry.copyToClipboard = $('<button class="editor-button editor-button-small projects-dialog-remote-list-entry-copy">copy</button>')
                                .hide()
                                .appendTo(header)
                                .clip(function(e) {
                                    var textarea = $('textarea').hide().value(entry.data);
                                    textarea.select();
                                    document.execCommand('copy')
                                });
                        }
                        entry.removeButton = $('<button class="editor-button editor-button-small projects-dialog-remote-list-entry-delete">remove</button>')
                            // .hide()
                            .appendTo(header)
                            .click(function(e) {
                                entry.removed = true;
                                body.fadeOut(100);
                                entry.header.css("text-decoration","line-through")
                                entry.header.css("font-style","italic")
                                $(this).hide();
                            });
                        // if (entry.urls.fetch === entry.urls.push) {
                        //     row = $('<div class="user-settings-row"></div>').appendTo(body);
                        //     $('<label for=""></label>').text('URL').appendTo(row);
                        //     $('<div class="uneditable-input">').text(entry.urls.fetch).appendTo(row);
                        // }
                    }
                }
            });
    
            // var remoteListAddButton = row.find(".red-ui-editableList-addButton").hide();
    
            var hideEditForm = function() {
                editRepoButton.show();
                formButtons.hide();
                // $('.projects-dialog-remote-list-entry-delete').hide();
                // remoteListAddButton.hide();
    
                gitUsernameLabel.show();
                gitUsernameInput.hide();
                gitEmailLabel.show();
                gitEmailInput.hide();
    
            }
    
            $('<button class="editor-button">Cancel</button>')
                .appendTo(formButtons)
                .click(function(evt) {
                    evt.preventDefault();
    
                    var items = sshkeysList.editableList('items');
                    items.each(function() {
                        var data = $(this).data('data');
                        if (!data.path) {
                            sshkeysList.editableList('removeItem',data);
                        } else if (data.removed) {
                            delete data.removed;
                            data.body.show();
                            data.header.css("text-decoration","");
                            data.header.css("font-style","");
                        }
                    })
    
                    hideEditForm();
                });
            var saveButton = $('<button class="editor-button">Save</button>')
                .appendTo(formButtons)
                .click(function(evt) {
                    evt.preventDefault();
                    var spinner = utils.addSpinnerOverlay(gitconfigContainer);
    
                    var body = {
                        user: {
                            name: gitUsernameInput.val(),
                            email: gitEmailInput.val()
                        },
                        remotes: {}
                    }
    
                    var items = sshkeysList.editableList('items');
                    items.each(function() {
                        var data = $(this).data('data');
                        if (!data.name) {
                            body.remotes[data.nameInput.val()] = {
                                url: data.urlInput.val()
                            };
                            sshkeysList.editableList('removeItem',data);
                        } else if (data.removed) {
                            body.remotes[data.name] = {
                                removed: true
                            };
                            delete data.removed;
                            data.body.show();
                            data.header.css("text-decoration","");
                            data.header.css("font-style","");
                        }
                    })
    
                    var done = function(err) {
                        spinner.remove();
                        if (err) {
                            console.log(err);
                            return;
                        }
                        hideEditForm();
                    }
                    var payload = { git: body };
    
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
                                activeProject.git.remotes = data.git.remotes;
                                activeProject.git.user = data.git.user;
                                if (activeProject.git.user) {
                                    gitUsernameLabel.text(activeProject.git.user.name);
                                    gitUsernameInput.val(activeProject.git.user.name);
                                    gitEmailLabel.text(activeProject.git.user.email);
                                    gitEmailInput.val(activeProject.git.user.email);
                                }
    
                                updateForm();
                                done();
                            },
                            400: {
                                'unexpected_error': function(error) {
                                    console.log(error);
                                    done(error);
                                }
                            },
                        }
                    },payload);
                });
            var updateForm = function() {
                sshkeysList.editableList('empty');
                // if (activeProject.git.hasOwnProperty('remotes')) {
                //     for (var name in activeProject.git.remotes) {
                //         if (activeProject.git.remotes.hasOwnProperty(name)) {
                //             remotesList.editableList('addItem',{name:name,urls:activeProject.git.remotes[name]});
                //         }
                //     }
                // }
                var sshkeyFiles = ["/User/hideki/.node-red/sshkeys/node-red-ssh-test01", "/User/hideki/.node-red/sshkeys/node-red-ssh-test02"];
                if ( sshkeyFiles ) {
                    sshkeyFiles.map(function(sshkeyFilePath) {
                        sshkeysList.editableList('addItem', {path: sshkeyFilePath, data: 'XXXXXXX'});
                    });
                }
            }
            updateForm();
        }

        function createSettingsPane(activeProject) {
            var pane = $('<div id="user-settings-tab-gitconfig" class="project-settings-tab-pane node-help"></div>');
            createRemoteRepositorySection(pane);
            return pane;
        }
    
        var popover;
    
        var utils;
        // var modulesInUse = {};
        function init(_utils) {
            utils = _utils;
            RED.userSettings.add({
                id:'gitconfig',
                title: "Git config", // TODO: nls
                get: createSettingsPane,
                close: function() {
                    if (popover) {
                        popover.close();
                        popover = null;
                    }
                }
            });
    
        }
        return {
            init: init,
        };
    })();
    