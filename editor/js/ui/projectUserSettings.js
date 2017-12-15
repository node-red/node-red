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

RED.projects.userSettings = (function() {

    var gitconfigContainer;
    var gitUsernameInput;
    var gitEmailInput;

    function createRemoteRepositorySection(pane) {

        var currentGitSettings = RED.settings.get('git') || {};
        currentGitSettings.user = currentGitSettings.user || {};

        var title = $('<h3></h3>').text("Committer Details").appendTo(pane);

        gitconfigContainer = $('<div class="user-settings-section"></div>').appendTo(pane);
        $('<div style="color:#aaa;"></div>').appendTo(gitconfigContainer).text("Leave blank to use system default");

        var row = $('<div class="user-settings-row"></div>').appendTo(gitconfigContainer);
        $('<label for=""></label>').text('Username').appendTo(row);
        gitUsernameInput = $('<input type="text">').appendTo(row);
        gitUsernameInput.val(currentGitSettings.user.name||"");

        row = $('<div class="user-settings-row"></div>').appendTo(gitconfigContainer);
        $('<label for=""></label>').text('Email').appendTo(row);
        gitEmailInput = $('<input type="text">').appendTo(row);
        gitEmailInput.val(currentGitSettings.user.email||"");

        var sshkeyTitle = $('<h4></h4>').text("SSH Keys").appendTo(gitconfigContainer);
        var editSshKeyListButton = $('<button class="editor-button editor-button-small" style="float: right;">edit</button>')
            .appendTo(sshkeyTitle)
            .click(function(evt) {
                editSshKeyListButton.hide();
                formButtons.show();
                sshkeyInputRow.show();
                $(".projects-dialog-sshkey-list-button-remove").css('display', 'inline-block');
            });
        
        var sshkeyListOptions = {
            height: "300px",
            deleteAction: function(entry, header) {
                sendSSHKeyManagementAPI("DELETE_KEY", entry.name, function(data) {
                    hideSSHKeyGenerateForm();
                    utils.refreshSSHKeyList(sshkeysList);
                });
            },
            selectAction: function(entry, header) {
                sendSSHKeyManagementAPI("GET_KEY_DETAIL", entry.name, function(data) {
                    setDialogContext(entry.name, data.publickey);
                    dialog.dialog("open");
                });    
            }
        };
        var sshkeysListRow = $('<div class="user-settings-row projects-dialog-sshkeylist"></div>').appendTo(gitconfigContainer);
        var sshkeysList = utils.createSSHKeyList(sshkeyListOptions).appendTo(sshkeysListRow);

        var sshkeyInputRow = $('<div class="user-settings-row"></div>').hide().appendTo(gitconfigContainer);
        var sshkeyNameLabel = $('<label for=""></label>').text('Key Name').appendTo(sshkeyInputRow);
        var sshkeyNameInput = $('<input type="text">').appendTo(sshkeyInputRow);
        var sshkeyPassphraseLabel = $('<label for=""></label>').text('Passphrase').appendTo(sshkeyInputRow);
        var sshkeyPassphraseInput = $('<input type="password">').appendTo(sshkeyInputRow);
        var sshkeySamePassphraseLabel = $('<label for=""></label>').text('Same Passphrase').appendTo(sshkeyInputRow);
        var sshkeySamePassphraseInput = $('<input type="password">').appendTo(sshkeyInputRow);

        var formButtonArea = $('<div style="width: 100%; height: 35px;"></div>').appendTo(gitconfigContainer);
        var formButtons = $('<span class="button-group" style="position: absolute; right: 0px; margin-right: 0px;"></span>')
            .hide().appendTo(formButtonArea);
        
        function hideSSHKeyGenerateForm() {
            editSshKeyListButton.show();
            formButtons.hide();
            sshkeyInputRow.hide();
            sshkeyNameInput.val("");
            sshkeyPassphraseInput.val("");
            sshkeySamePassphraseInput.val("");
            if ( sshkeyNameInput.hasClass('input-error') ) {
                sshkeyNameInput.removeClass('input-error');
            }
            if ( sshkeyPassphraseInput.hasClass('input-error') ) {
                sshkeyPassphraseInput.removeClass('input-error');
            }
            if ( sshkeySamePassphraseInput.hasClass('input-error') ) {
                sshkeySamePassphraseInput.removeClass('input-error');
            }
            $(".projects-dialog-sshkey-list-button-remove").hide();
        }

        $('<button class="editor-button">Cancel</button>')
            .appendTo(formButtons)
            .click(function(evt) {
                evt.preventDefault();
                hideSSHKeyGenerateForm();
            });
        var generateButton = $('<button class="editor-button">Generate</button>')
            .appendTo(formButtons)
            .click(function(evt) {
                evt.preventDefault();
                if ( sshkeyNameInput.hasClass('input-error') ) {
                    sshkeyNameInput.removeClass('input-error');
                }
                if ( sshkeyPassphraseInput.hasClass('input-error') ) {
                    sshkeyPassphraseInput.removeClass('input-error');
                }
                if ( sshkeySamePassphraseInput.hasClass('input-error') ) {
                    sshkeySamePassphraseInput.removeClass('input-error');
                }
                var valid = true;
                if ( sshkeyNameInput.val() === "" ) {
                    sshkeyNameInput.addClass('input-error');
                    valid = false;
                }
                if ( sshkeyPassphraseInput.val() !== sshkeySamePassphraseInput.val() ) {
                    sshkeySamePassphraseInput.addClass('input-error');
                    valid = false;
                }
                if ( valid ) {
                    sendSSHKeyManagementAPI("GENERATE_KEY",
                        {
                            name: sshkeyNameInput.val(),
                            email: gitEmailInput.val(),
                            password: sshkeyPassphraseInput.val(),
                            size: 4096
                        }, 
                        function() {
                            hideSSHKeyGenerateForm();
                            utils.refreshSSHKeyList(sshkeysList);
                        },
                        function(err) {
                            console.log('err message:', err.message);
                            if ( err.message.includes('Some SSH Keyfile exists') ) {
                                sshkeyNameInput.addClass('input-error');
                            }
                            else if ( err.message.includes('Failed to generate ssh key files') ) {
                                sshkeyPassphraseInput.addClass('input-error');
                                sshkeySamePassphraseInput.addClass('input-error');
                            }
                        }
                    );
                }
            });
    }

    function sendSSHKeyManagementAPI(type, param, successCallback, failCallback) {
        var url;
        var method;
        var payload;
        switch(type) {
        case 'GET_KEY_LIST':
            method = 'GET';
            url    = "settings/user/keys";
            break;
        case 'GET_KEY_DETAIL':
            method = 'GET';
            url    = "settings/user/keys/" + param;
            break;
        case 'GENERATE_KEY':
            method = 'POST';
            url    = "settings/user/keys";
            payload= param;
            break;
        case 'DELETE_KEY':
            method = 'DELETE';
            url    = "settings/user/keys/" + param;
            break;
        default:
            console.error('Unexpected type....');
            return;
        }
        var spinner = utils.addSpinnerOverlay(gitconfigContainer);
        
        var done = function(err) {
            spinner.remove();
            if (err) {
                console.log(err);
                return;
            }
        };

        console.log('method:', method);
        console.log('url:', url);

        utils.sendRequest({
            url: url,
            type: method,
            responses: {
                0: function(error) {
                    if ( failCallback ) {
                        failCallback(error);
                    }
                    done(error);
                },
                200: function(data) {
                    if ( successCallback ) {
                        successCallback(data);
                    }
                    done();
                },
                400: {
                    'unexpected_error': function(error) {
                        console.log(error);
                        if ( failCallback ) {
                            failCallback(error);
                        }
                        done(error);
                    }
                },
            }
        },payload);        
    }

    var dialog;
    var dialogBody;
    function createPublicKeyDialog() {
        dialog = $('<div id="projects-dialog" class="hide node-red-dialog projects-edit-form"><form class="form-horizontal"></form></div>')
            .appendTo("body")
            .dialog({
                modal: true,
                autoOpen: false,
                width: 600,
                resize: false,
                open: function(e) {
                    $(this).parent().find(".ui-dialog-titlebar-close").hide();
                },
                close: function(e) {

                }
            });
        dialogBody = dialog.find("form");
        dialog.dialog('option', 'title', 'SSH public key');
        dialog.dialog('option', 'buttons', [
            {
                text: RED._("common.label.close"),
                click: function() {
                    $( this ).dialog( "close" );
                }
            },
            {
                text: "Copy to Clipboard",
                click: function() {
                    var target = document.getElementById('public-key-data');
                    document.getSelection().selectAllChildren(target);
                    var ret = document.execCommand('copy');
                    var msg = ret ? 'successful' : 'unsuccessful';
                    console.log('Copy text command was ' + msg);
                    $( this ).dialog("close");
                }
            }
        ]);
        dialog.dialog({position: { 'my': 'center', 'at': 'center', 'of': window }});
        var container = $('<div class="projects-dialog-screen-start"></div>');
        $('<div class="projects-dialog-ssh-public-key-name"></div>').appendTo(container);
        $('<div class="projects-dialog-ssh-public-key"><pre id="public-key-data"></pre></div>').appendTo(container);
        dialogBody.append(container);
    }

    function setDialogContext(name, data) {
        var title = dialog.find("div.projects-dialog-ssh-public-key-name");
        title.text(name);
        var context = dialog.find("div.projects-dialog-ssh-public-key>pre");
        context.text(data);
    }

    function createSettingsPane(activeProject) {
        var pane = $('<div id="user-settings-tab-gitconfig" class="project-settings-tab-pane node-help"></div>');
        createRemoteRepositorySection(pane);
        createPublicKeyDialog();
        return pane;
    }

    var utils;
    function init(_utils) {
        utils = _utils;
        RED.userSettings.add({
            id:'gitconfig',
            title: "Git config", // TODO: nls
            get: createSettingsPane,
            close: function() {
                var currentGitSettings = RED.settings.get('git') || {};
                currentGitSettings.user = currentGitSettings.user || {};
                currentGitSettings.user.name = gitUsernameInput.val();
                currentGitSettings.user.email = gitEmailInput.val();
                RED.settings.set('git', currentGitSettings);
            }
        });

    }

    return {
        init: init,
    };
})();
