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

    var gitUsernameInput;
    var gitEmailInput;

    function createGitUserSection(pane) {

        var currentGitSettings = RED.settings.get('git') || {};
        currentGitSettings.user = currentGitSettings.user || {};

        var title = $('<h3></h3>').text("Committer Details").appendTo(pane);

        var gitconfigContainer = $('<div class="user-settings-section"></div>').appendTo(pane);
        $('<div style="color:#aaa;"></div>').appendTo(gitconfigContainer).text("Leave blank to use system default");

        var row = $('<div class="user-settings-row"></div>').appendTo(gitconfigContainer);
        $('<label for=""></label>').text('Username').appendTo(row);
        gitUsernameInput = $('<input type="text">').appendTo(row);
        gitUsernameInput.val(currentGitSettings.user.name||"");

        row = $('<div class="user-settings-row"></div>').appendTo(gitconfigContainer);
        $('<label for=""></label>').text('Email').appendTo(row);
        gitEmailInput = $('<input type="text">').appendTo(row);
        gitEmailInput.val(currentGitSettings.user.email||"");
    }


    function createSSHKeySection(pane) {
        var container = $('<div class="user-settings-section"></div>').appendTo(pane);
        var popover;
        var title = $('<h4></h4>').text("SSH Keys").appendTo(container);

        var addKeyButton = $('<button class="editor-button editor-button-small" style="float: right; margin-right: 10px;">generate key</button>')
            .appendTo(title)
            .click(function(evt) {
                addKeyButton.attr('disabled',true);
                addKeyDialog.slideDown(200, function() {
                    // addKeyDialog[0].scrollIntoView();
                });
            });

        var validateForm = function() {
            var validName = /^[a-zA-Z0-9\-_]+$/.test(keyNameInput.val());
            saveButton.attr('disabled',!validName);
            keyNameInput.toggleClass('input-error',keyNameInputChanged&&!validName);
            if (popover) {
                popover.close();
                popover = null;
            }
        };

        var row = $('<div class="user-settings-row"></div>').appendTo(container);
        var addKeyDialog = $('<div class="projects-dialog-list-dialog"></div>').hide().appendTo(row);
        $('<div class="projects-dialog-list-dialog-header">').text('Generate SSH Key').appendTo(addKeyDialog);

        row = $('<div class="user-settings-row"></div>').appendTo(addKeyDialog);
        $('<label for=""></label>').text('Name').appendTo(row);
        var keyNameInput = $('<input type="text">').appendTo(row).on("change keyup paste",function() {
            keyNameInputChanged = true;
            validateForm();
        });
        var keyNameInputChanged = false;
        $('<label class="projects-edit-form-sublabel"><small>Must contain only A-Z 0-9 _ -</small></label>').appendTo(row).find("small");

        row = $('<div class="user-settings-row"></div>').appendTo(addKeyDialog);
        $('<label for=""></label>').text('Passphrase').appendTo(row);
        passphraseInput = $('<input type="password">').appendTo(row).on("change keyup paste",validateForm);
        $('<label class="projects-edit-form-sublabel"><small>Optional</small></label>').appendTo(row).find("small");

        var hideEditForm = function() {
            addKeyButton.attr('disabled',false);
            addKeyDialog.hide();
            keyNameInput.val("");
            passphraseInput.val("");
            if (popover) {
                popover.close();
                popover = null;
            }
        }
        var formButtons = $('<span class="button-row" style="position: relative; float: right; margin: 10px;"></span>').appendTo(addKeyDialog);
        $('<button class="editor-button">Cancel</button>')
            .appendTo(formButtons)
            .click(function(evt) {
                evt.preventDefault();
                hideEditForm();
            });
        var saveButton = $('<button class="editor-button">Generate key</button>')
            .appendTo(formButtons)
            .click(function(evt) {
                evt.preventDefault();
                var spinner = utils.addSpinnerOverlay(addKeyDialog).addClass('projects-dialog-spinner-contain');
                var payload = {
                    name: keyNameInput.val(),
                    comment: gitEmailInput.val(),
                    password: passphraseInput.val(),
                    size: 4096
                };
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
                    url: "settings/user/keys",
                    type: "POST",
                    responses: {
                        0: function(error) {
                            done(error);
                        },
                        200: function(data) {
                            refreshSSHKeyList();
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

        row = $('<div class="user-settings-row projects-dialog-list"></div>').appendTo(container);
        var emptyItem = { empty: true };
        var expandKey = function(container,entry) {
            var row = $('<div class="projects-dialog-ssh-public-key">',{style:"position:relative"}).appendTo(container);
            var keyBox = $('<pre>',{style:"min-height: 80px"}).appendTo(row);
            var spinner = utils.addSpinnerOverlay(keyBox).addClass('projects-dialog-spinner-contain');
            var options = {
                url: 'settings/user/keys/'+entry.name,
                type: "GET",
                responses: {
                    200: function(data) {
                        keyBox.text(data.publickey);
                        spinner.remove();
                    },
                    400: {
                        'unexpected_error': function(error) {
                            console.log(error);
                            spinner.remove();
                        }
                    },
                }
            }
            utils.sendRequest(options);

            var formButtons = $('<span class="button-row" style="position: relative; float: right; margin: 10px;"></span>').appendTo(row);
            $('<button class="editor-button editor-button-small">Copy to Clipboard</button>')
                .appendTo(formButtons)
                .click(function(evt) {
                    evt.preventDefault();
                    document.getSelection().selectAllChildren(keyBox[0]);
                    var ret = document.execCommand('copy');
                    document.getSelection().empty();
                });

            return row;
        }
        var keyList = $('<ol>').appendTo(row).editableList({
            height: 'auto',
            addButton: false,
            scrollOnAdd: false,
            addItem: function(row,index,entry) {
                var container = $('<div class="projects-dialog-list-entry">').appendTo(row);

                if (entry.empty) {
                    container.addClass('red-ui-search-empty');
                    container.text("No SSH keys");
                    return;
                }


                $('<span class="entry-icon"><i class="fa fa-key"></i></span>').appendTo(container);
                var content = $('<span>').appendTo(container);
                var topRow = $('<div>').appendTo(content);
                $('<span class="entry-name">').text(entry.name).appendTo(topRow);

                var tools = $('<span class="button-row entry-tools">').appendTo(container);
                var expandedRow;
                $('<button class="editor-button editor-button-small"><i class="fa fa-eye"></i></button>')
                    .appendTo(tools)
                    .click(function(e) {
                        if (expandedRow) {
                            expandedRow.slideUp(200,function() {
                                expandedRow.remove();
                                expandedRow = null;
                            })
                        } else {
                            expandedRow = expandKey(container,entry);
                        }
                    })
                $('<button class="editor-button editor-button-small"><i class="fa fa-trash"></i></button>')
                    .appendTo(tools)
                    .click(function(e) {
                        var spinner = utils.addSpinnerOverlay(row).addClass('projects-dialog-spinner-contain');
                        var notification = RED.notify("Are you sure you want to delete the SSH key '"+entry.name+"'? This cannot be undone.", {
                            type: 'warning',
                            modal: true,
                            fixed: true,
                            buttons: [
                                {
                                    text: RED._("common.label.cancel"),
                                    click: function() {
                                        spinner.remove();
                                        notification.close();
                                    }
                                },
                                {
                                    text: "Delete key",
                                    click: function() {
                                        notification.close();
                                        var url = "settings/user/keys/"+entry.name;
                                        var options = {
                                            url: url,
                                            type: "DELETE",
                                            responses: {
                                                200: function(data) {
                                                    row.fadeOut(200,function() {
                                                        keyList.editableList('removeItem',entry);
                                                        setTimeout(spinner.remove, 100);
                                                        if (keyList.editableList('length') === 0) {
                                                            keyList.editableList('addItem',emptyItem);
                                                        }
                                                    });
                                                },
                                                400: {
                                                    'unexpected_error': function(error) {
                                                        console.log(error);
                                                        spinner.remove();
                                                    }
                                                },
                                            }
                                        }
                                        utils.sendRequest(options);
                                    }
                                }
                            ]
                        });
                    });
            }
        });

        var refreshSSHKeyList = function() {
            $.getJSON("settings/user/keys",function(result) {
                if (result.keys) {
                    result.keys.sort(function(A,B) {
                        return A.name.localeCompare(B.name);
                    });
                    keyList.editableList('empty');
                    result.keys.forEach(function(key) {
                        keyList.editableList('addItem',key);
                    })
                }
            })
        }
        refreshSSHKeyList();

    }



    function sendSSHKeyManagementAPI(type, param, overlay, successCallback, failCallback) {
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
        // var spinner = utils.addSpinnerOverlay(gitconfigContainer);
        var spinner = overlay ? utils.addSpinnerOverlay(overlay) : null;

        var done = function(err) {
            if ( spinner ) {
                spinner.remove();
            }
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
        createGitUserSection(pane);
        createSSHKeySection(pane);

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
