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

    function createRemoteRepositorySection(pane) {

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
    }

    function createSettingsPane(activeProject) {
        var pane = $('<div id="user-settings-tab-gitconfig" class="project-settings-tab-pane node-help"></div>');
        createRemoteRepositorySection(pane);
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
