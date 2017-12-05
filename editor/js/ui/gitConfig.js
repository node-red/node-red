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
            var editGitUserButton = $('<button class="editor-button editor-button-small" style="float: right;">edit</button>')
                .appendTo(title)
                .click(function(evt) {
                    editGitUserButton.hide();
                    formButtons.show();
    
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
    
            // var formButtons = $('<span class="button-group" style="position: relative; float: right; margin-right:0;"></span>')
            var formButtonArea = $('<div style="width: 100%; height: 35px;"></div>').appendTo(gitconfigContainer);
            var formButtons = $('<span class="button-group" style="position: absolute; right: 0px; margin-right:0;"></span>')
                .hide().appendTo(formButtonArea);

    
            // var sshkeyTitle = $('<h4></h4>').text("SSH Keys").appendTo(gitconfigContainer);
            // var generateSshKeyButton = $('<button class="editor-button editor-button-small" style="float: right;">generate new ssh key</button>')
            //     .appendTo(sshkeyTitle)
            //     .click(function(evt) {
            //         console.log('click generateSshKeyButton');
            //     });

            // row = $('<div class="user-settings-row projects-dialog-remote-list"></div>').appendTo(gitconfigContainer);
            // var sshkeysList = $('<ol>').appendTo(row);
            // sshkeysList.editableList({
            //     addButton: false,
            //     height: 'auto',
            //     addItem: function(outer,index,entry) {
    
            //         var header = $('<div class="projects-dialog-remote-list-entry-header"></div>').appendTo(outer);
            //         entry.header = $('<span>').text(entry.path||"Add new remote").appendTo(header);
            //         var body = $('<div>').appendTo(outer);
            //         entry.body = body;
            //         if (entry.path) {
            //             entry.removeButton = $('<button class="editor-button editor-button-small projects-dialog-remote-list-entry-delete">remove</button>')
            //             // .hide()
            //             .appendTo(header)
            //             .click(function(e) {
            //                 entry.removed = true;
            //                 body.fadeOut(100);
            //                 entry.header.css("text-decoration","line-through")
            //                 entry.header.css("font-style","italic")
            //                 if (entry.copyToClipboard) {
            //                     entry.copyToClipboard.hide();
            //                 }
            //                 $(this).hide();
            //             });
            //             if (entry.data) {
            //                 entry.copyToClipboard = $('<button class="editor-button editor-button-small projects-dialog-remote-list-entry-copy">copy</button>')
            //                     // .hide()
            //                     .appendTo(header)
            //                     .click(function(e) {
            //                         var textarea = document.createElement("textarea");
            //                         textarea.style.position = 'fixed';
            //                         textarea.style.top = 0;
            //                         textarea.style.left = 0;
            //                         textarea.style.width = '2em';
            //                         textarea.style.height = '2em';
            //                         textarea.style.padding = 0;
            //                         textarea.style.border = 'none';
            //                         textarea.style.outline = 'none';
            //                         textarea.style.boxShadow = 'none';
            //                         textarea.style.background = 'transparent';
            //                         textarea.value = entry.data;
            //                         document.body.appendChild(textarea);
            //                         textarea.select();
            //                         try {
            //                             var ret = document.execCommand('copy');
            //                             var msg = ret ? 'successful' : 'unsuccessful';
            //                             console.log('Copy text command was ' + msg);
            //                         } catch (err) {
            //                             console.log('Oops unable to copy');
            //                         }
            //                         document.body.removeChild(textarea);
            //                     });
            //             }
            //         }
            //     }
            // });
    
            // var remoteListAddButton = row.find(".red-ui-editableList-addButton").hide();
    
            var hideGitUserEditForm = function() {
                editGitUserButton.show();
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
                    hideGitUserEditForm();
                });
            
            var saveButton = $('<button class="editor-button">Save</button>')
                .appendTo(formButtons)
                .click(function(evt) {
                    evt.preventDefault();
                    var spinner = addSpinnerOverlay(gitconfigContainer);
    
                    var body = {
                        name: gitUsernameInput.val(),
                        email: gitEmailInput.val()
                    }
    
                    var done = function(err) {
                        spinner.remove();
                        if (err) {
                            console.log(err);
                            return;
                        }
                        hideGitUserEditForm();
                    }
    
                    sendRequest({
                        url: "settings/user",
                        type: "POST",
                        responses: {
                            0: function(error) {
                                done(error);
                            },
                            200: function(data) {
                                gitUsernameLabel.text(body.name);
                                gitEmailLabel.text(body.email);
                                done();
                            },
                            400: {
                                'unexpected_error': function(error) {
                                    console.log(error);
                                    done(error);
                                }
                            },
                        }
                    },body);
                });
            var updateForm = function() {
                // sshkeysList.editableList('empty');
                // if (activeProject.git.hasOwnProperty('remotes')) {
                //     for (var name in activeProject.git.remotes) {
                //         if (activeProject.git.remotes.hasOwnProperty(name)) {
                //             remotesList.editableList('addItem',{name:name,urls:activeProject.git.remotes[name]});
                //         }
                //     }
                // }
                // var sshkeyFiles = ["/User/hideki/.node-red/sshkeys/node-red-ssh-test01", "/User/hideki/.node-red/sshkeys/node-red-ssh-test02"];
                // if ( sshkeyFiles ) {
                //     sshkeyFiles.map(function(sshkeyFilePath) {
                //         sshkeysList.editableList('addItem', {path: sshkeyFilePath, data: 'XXXXXXX'});
                //     });
                // }
            }

            sendRequest({
                url: "settings/user",
                type: "GET",
                responses: {
                    0: function(error) {
                        console.log(error);
                    },
                    200: function(result) {
                        console.log(result);
                        if ( result ) {
                            gitUsernameLabel.text(result.name);
                            gitUsernameInput.val(result.name);
                            gitEmailLabel.text(result.email);
                            gitEmailInput.val(result.email);
                        }
                    },
                    400: {
                        'unexpected_error': function(error) {
                            console.log(error);
                        }
                    }
                }
            })

            updateForm();
        }

        function createSettingsPane(activeProject) {
            var pane = $('<div id="user-settings-tab-gitconfig" class="project-settings-tab-pane node-help"></div>');
            createRemoteRepositorySection(pane);
            return pane;
        }
    
        var popover;
    
        var utils;
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

        function addSpinnerOverlay(container) {
            var spinner = $('<div class="projects-dialog-spinner"><img src="red/images/spin.svg"/></div>').appendTo(container);
            return spinner;
        }
            
        function sendRequest(options,body) {
            // dialogBody.hide();
            console.log(options.url,body);
    
            var start = Date.now();
            // TODO: this is specific to the dialog-based requests
            $(".projects-dialog-spinner").show();
            // $("#projects-dialog").parent().find(".ui-dialog-buttonset").children().css("visibility","hidden")
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
                console.log('[sendRequest] --- always');
                var delta = Date.now() - start;
                delta = Math.max(0,500-delta);
                setTimeout(function() {
                    // dialogBody.show();
                    // $("#projects-dialog").parent().find(".ui-dialog-buttonset").children().css("visibility","")
                    if (resultCallback) {
                        resultCallback(resultCallbackArgs)
                    }
                },delta);
            });
        }
    
        return {
            init: init,
        };
    })();
    