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
RED.sidebar.versionControl = (function() {

    var sidebarContent;
    var sections;

    var allChanges = {};

    var unstagedChangesList;
    var stageAllButton;
    var stagedChangesList;
    var unstageAllButton;
    var unstagedChanges;
    var stagedChanges;
    var bulkChangeSpinner;
    var unmergedContent;
    var unmergedChangesList;
    var commitButton;
    var localChanges;

    var localCommitList;
    var localCommitListShade;
    // var remoteCommitList;

    var isMerging;

    function viewFileDiff(entry,state) {
        var activeProject = RED.projects.getActiveProject();
        var diffTarget = (state === 'staged')?"index":"tree";
        utils.sendRequest({
            url: "projects/"+activeProject.name+"/diff/"+diffTarget+"/"+encodeURIComponent(entry.file),
            type: "GET",
            responses: {
                0: function(error) {
                    console.log(error);
                    // done(error,null);
                },
                200: function(data) {
                    var title;
                    if (state === 'unstaged') {
                        title = 'Unstaged changes : '+entry.file
                    } else if (state === 'staged') {
                        title = 'Staged changes : '+entry.file
                    } else {
                        title = 'Resolve conflicts : '+entry.file
                    }
                    var options = {
                        diff: data.diff,
                        title: title,
                        unmerged: state === 'unmerged',
                        project: activeProject
                    }
                    if (state == 'unstaged') {
                        options.oldRevTitle = entry.indexStatus === " "?"HEAD":"Staged";
                        options.newRevTitle = "Unstaged";
                        options.oldRev = entry.indexStatus === " "?"@":":0";
                        options.newRev = "_";
                    } else if (state === 'staged') {
                        options.oldRevTitle = "HEAD";
                        options.newRevTitle = "Staged";
                        options.oldRev = "@";
                        options.newRev = ":0";
                    } else {
                        options.oldRevTitle = "Local";
                        options.newRevTitle = "Remote";
                        options.commonRev = ":1";
                        options.oldRev = ":2";
                        options.newRev = ":3";
                        options.onresolve = function(resolution) {
                            utils.sendRequest({
                                url: "projects/"+activeProject.name+"/resolve/"+encodeURIComponent(entry.file),
                                type: "POST",
                                responses: {
                                    0: function(error) {
                                        console.log(error);
                                        // done(error,null);
                                    },
                                    200: function(data) {
                                        refresh(true);
                                    },
                                    400: {
                                        'unexpected_error': function(error) {
                                            console.log(error);
                                            // done(error,null);
                                        }
                                    },
                                }
                            },{resolutions:resolution.resolutions[entry.file]});
                        }
                    }
                    RED.diff.showUnifiedDiff(options);
                },
                400: {
                    'unexpected_error': function(error) {
                        console.log(error);
                        // done(error,null);
                    }
                }
            }
        })
    }

    function createChangeEntry(row, entry, status, state) {
        row.addClass("sidebar-version-control-change-entry");
        var container = $('<div>').appendTo(row);
        if (entry.label) {
            row.addClass('node-info-none');
            container.text(entry.label);
            if (entry.button) {
                container.css({
                    display: "inline-block",
                    maxWidth: "300px",
                    textAlign: "left"
                })
                var toolbar = $('<div style="float: right; margin: 5px; height: 50px;"></div>').appendTo(container);

                $('<button class="editor-button editor-button-small"></button>').text(entry.button.label)
                    .appendTo(toolbar)
                    .click(entry.button.click);
            }
            return;
        }


        var icon = $('<i class=""></i>').appendTo(container);
        var entryLink = $('<a href="#">')
            .appendTo(container)
            .click(function(e) {
                e.preventDefault();
                viewFileDiff(entry,state);
            });
        var label = $('<span>').appendTo(entryLink);

        var entryTools = $('<div class="sidebar-version-control-change-entry-tools">').appendTo(row);
        var bg;
        var revertButton;
        if (state === 'unstaged') {
            bg = $('<span class="button-group" style="margin-right: 5px;"></span>').appendTo(entryTools);
            revertButton = $('<button class="editor-button editor-button-small"><i class="fa fa-reply"></i></button>')
                .appendTo(bg)
                .click(function(evt) {
                    evt.preventDefault();

                    var spinner = utils.addSpinnerOverlay(container).addClass('projects-dialog-spinner-contain');
                    var notification = RED.notify("Are you sure you want to revert the changes to '"+entry.file+"'? This cannot be undone.", {
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
                                text: 'Revert changes',
                                click: function() {
                                    notification.close();
                                    var activeProject = RED.projects.getActiveProject();
                                    var url = "projects/"+activeProject.name+"/files/_/"+entry.file;
                                    var options = {
                                        url: url,
                                        type: "DELETE",
                                        responses: {
                                            200: function(data) {
                                                spinner.remove();
                                            },
                                            400: {
                                                'unexpected_error': function(error) {
                                                    spinner.remove();
                                                    console.log(error);
                                                    // done(error,null);
                                                }
                                            }
                                        }
                                    }
                                    RED.deploy.setDeployInflight(true);
                                    utils.sendRequest(options).always(function() {
                                        setTimeout(function() {
                                            RED.deploy.setDeployInflight(false);
                                        },500);
                                    });
                                }
                            }

                        ]
                    })

                });
        }
        bg = $('<span class="button-group"></span>').appendTo(entryTools);
        if (state !== 'unmerged') {
            $('<button class="editor-button editor-button-small"><i class="fa fa-'+((state==='unstaged')?"plus":"minus")+'"></i></button>')
                .appendTo(bg)
                .click(function(evt) {
                    evt.preventDefault();
                    var activeProject = RED.projects.getActiveProject();
                    entry.spinner = utils.addSpinnerOverlay(row).addClass('projects-version-control-spinner-sidebar');
                    utils.sendRequest({
                        url: "projects/"+activeProject.name+"/stage/"+encodeURIComponent(entry.file),
                        type: (state==='unstaged')?"POST":"DELETE",
                        responses: {
                            0: function(error) {
                                console.log(error);
                                // done(error,null);
                            },
                            200: function(data) {
                                refreshFiles(data);
                            },
                            400: {
                                'unexpected_error': function(error) {
                                    console.log(error);
                                    // done(error,null);
                                }
                            },
                        }
                    },{});
                });
        }
        entry["update"+((state==='unstaged')?"Unstaged":"Staged")] = function(entry,status) {
            container.removeClass();
            var iconClass = "";
            if (status === 'A') {
                container.addClass("node-diff-added");
                iconClass = "fa-plus-square";
            } else if (status === '?') {
                container.addClass("node-diff-unchanged");
                iconClass = "fa-question-circle-o";
            } else if (status === 'D') {
                container.addClass("node-diff-deleted");
                iconClass = "fa-minus-square";
            } else if (status === 'M') {
                container.addClass("node-diff-changed");
                iconClass = "fa-square";
            } else if (status === 'R') {
                container.addClass("node-diff-changed");
                iconClass = "fa-toggle-right";
            } else if (status === 'U') {
                container.addClass("node-diff-conflicted");
                iconClass = "fa-exclamation-triangle";
            } else {
                iconClass = "fa-exclamation-triangle"
            }
            label.empty();
            $('<span>').text(entry.file.replace(/\\(.)/g,"$1")).appendTo(label);

            if (entry.oldName) {
                $('<i class="fa fa-long-arrow-right"></i>').prependTo(label);
                $('<span>').text(entry.oldName.replace(/\\(.)/g,"$1")).prependTo(label);
                // label.text(entry.oldName+" -> "+entry.file);
            }
            // console.log(entry.file,status,iconClass);

            icon.removeClass();
            icon.addClass("fa "+iconClass);
            if (entry.spinner) {
                entry.spinner.remove();
                delete entry.spinner;
            }

            if (revertButton) {
                revertButton.toggle(status !== '?');
            }
            entryLink.toggleClass("disabled",(status === 'D' || status === '?'));
        }
        entry["update"+((state==='unstaged')?"Unstaged":"Staged")](entry, status);
    }
    var utils;
    function init(_utils) {
        utils = _utils;

        RED.actions.add("core:show-version-control-tab",show);
        RED.events.on("deploy", function() {
            var activeProject = RED.projects.getActiveProject();
            if (activeProject) {
                // TODO: this is a full refresh of the files - should be able to
                //       just do an incremental refresh
                allChanges = {};
                unstagedChangesList.editableList('empty');
                stagedChangesList.editableList('empty');
                unmergedChangesList.editableList('empty');

                $.getJSON("projects/"+activeProject.name+"/status",function(result) {
                    refreshFiles(result);
                });
            }
        });
        RED.events.on("login",function() {
            refresh(true);
        });
        sidebarContent = $('<div>', {class:"sidebar-version-control"});
        var stackContainer = $("<div>",{class:"sidebar-version-control-stack"}).appendTo(sidebarContent);
        sections = RED.stack.create({
            container: stackContainer,
            fill: true,
            singleExpanded: true
        });

        localChanges = sections.add({
            title: "Local Changes",
            collapsible: true
        });
        localChanges.expand();
        localChanges.content.css({height:"100%"});

        var bg = $('<div style="float: right"></div>').appendTo(localChanges.header);
        $('<button class="editor-button editor-button-small"><i class="fa fa-refresh"></i></button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                refresh(true);
            })


        var unstagedContent = $('<div class="sidebar-version-control-change-container"></div>').appendTo(localChanges.content);
        var header = $('<div class="sidebar-version-control-change-header">Local files</div>').appendTo(unstagedContent);
        stageAllButton = $('<button class="editor-button editor-button-small" style="float: right"><i class="fa fa-plus"></i> all</button>')
            .appendTo(header)
            .click(function(evt) {
                evt.preventDefault();
                evt.stopPropagation();
                var toStage = Object.keys(allChanges).filter(function(fn) {
                    return allChanges[fn].treeStatus !== ' ';
                });
                updateBulk(toStage,true);
            });
        unstagedChangesList = $("<ol>",{style:"position: absolute; top: 30px; bottom: 0; right:0; left:0;"}).appendTo(unstagedContent);
        unstagedChangesList.editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(row,index,entry) {
                createChangeEntry(row,entry,entry.treeStatus,'unstaged');
            },
            sort: function(A,B) {
                if (A.treeStatus === '?' && B.treeStatus !== '?') {
                    return 1;
                } else if (A.treeStatus !== '?' && B.treeStatus === '?') {
                    return -1;
                }
                return A.file.localeCompare(B.file);
            }

        })

        unmergedContent = $('<div class="sidebar-version-control-change-container"></div>').appendTo(localChanges.content);

        header = $('<div class="sidebar-version-control-change-header">Unmerged changes</div>').appendTo(unmergedContent);
        bg = $('<div style="float: right"></div>').appendTo(header);
        var abortMergeButton = $('<button class="editor-button editor-button-small" style="margin-right: 5px;">abort merge</button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                evt.stopPropagation();
                var spinner = utils.addSpinnerOverlay(unmergedContent);
                var activeProject = RED.projects.getActiveProject();
                RED.deploy.setDeployInflight(true);
                utils.sendRequest({
                    url: "projects/"+activeProject.name+"/merge",
                    type: "DELETE",
                    responses: {
                        0: function(error) {
                            console.log(error);
                        },
                        200: function(data) {
                            spinner.remove();
                            refresh(true);
                        },
                        400: {
                            'unexpected_error': function(error) {
                                console.log(error);
                            }
                        },
                    }
                }).always(function() {
                    setTimeout(function() {
                        RED.deploy.setDeployInflight(false);
                    },500);
                });
            });
        unmergedChangesList = $("<ol>",{style:"position: absolute; top: 30px; bottom: 0; right:0; left:0;"}).appendTo(unmergedContent);
        unmergedChangesList.editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(row,index,entry) {
                if (entry === emptyMergedItem) {
                    entry.button = {
                        label: 'commit',
                        click: function(evt) {
                            evt.preventDefault();
                            evt.stopPropagation();
                            showCommitBox();
                        }
                    }
                }
                createChangeEntry(row,entry,entry.treeStatus,'unmerged');
            },
            sort: function(A,B) {
                if (A.treeStatus === '?' && B.treeStatus !== '?') {
                    return 1;
                } else if (A.treeStatus !== '?' && B.treeStatus === '?') {
                    return -1;
                }
                return A.file.localeCompare(B.file);
            }

        })


        var stagedContent = $('<div class="sidebar-version-control-change-container"></div>').appendTo(localChanges.content);

        header = $('<div class="sidebar-version-control-change-header">Changes to commit</div>').appendTo(stagedContent);

        bg = $('<div style="float: right"></div>').appendTo(header);
        var showCommitBox = function() {
            commitMessage.val("");
            submitCommitButton.attr("disabled",true);
            unstagedContent.css("height","30px");
            if (unmergedContent.is(":visible")) {
                unmergedContent.css("height","30px");
                stagedContent.css("height","calc(100% - 60px - 175px)");
            } else {
                stagedContent.css("height","calc(100% - 30px - 175px)");
            }
            commitBox.show();
            setTimeout(function() {
                commitBox.css("height","175px");
            },10);
            stageAllButton.attr("disabled",true);
            unstageAllButton.attr("disabled",true);
            commitButton.attr("disabled",true);
            abortMergeButton.attr("disabled",true);
            commitMessage.focus();
        }
        commitButton = $('<button class="editor-button editor-button-small" style="margin-right: 5px;">commit</button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                evt.stopPropagation();
                showCommitBox();
            });
        unstageAllButton = $('<button class="editor-button editor-button-small"><i class="fa fa-minus"></i> all</button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                evt.stopPropagation();
                var toUnstage = Object.keys(allChanges).filter(function(fn) {
                    return allChanges[fn].indexStatus !== ' ' && allChanges[fn].indexStatus !== '?';
                });
                updateBulk(toUnstage,false);

            });


        stagedChangesList = $("<ol>",{style:"position: absolute; top: 30px; bottom: 0; right:0; left:0;"}).appendTo(stagedContent);
        stagedChangesList.editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(row,index,entry) {
                createChangeEntry(row,entry,entry.indexStatus,'staged');
            },
            sort: function(A,B) {
                return A.file.localeCompare(B.file);
            }
        })

        commitBox = $('<div class="sidebar-version-control-slide-box sidebar-version-control-slide-box-bottom"></div>').hide().appendTo(localChanges.content);

        var commitMessage = $('<textarea placeholder="Enter your commit message"></textarea>')
            .appendTo(commitBox)
            .on("change keyup paste",function() {
                submitCommitButton.attr('disabled',$(this).val().trim()==="");
            });
        var commitToolbar = $('<div class="sidebar-version-control-slide-box-toolbar button-group">').appendTo(commitBox);

        var cancelCommitButton = $('<button class="editor-button">Cancel</button>')
            .appendTo(commitToolbar)
            .click(function(evt) {
                evt.preventDefault();
                commitMessage.val("");
                unstagedContent.css("height","");
                unmergedContent.css("height","");
                stagedContent.css("height","");
                commitBox.css("height",0);
                setTimeout(function() {
                    commitBox.hide();
                },200);
                stageAllButton.attr("disabled",false);
                unstageAllButton.attr("disabled",false);
                commitButton.attr("disabled",false);
                abortMergeButton.attr("disabled",false);

            })
        var submitCommitButton = $('<button class="editor-button">Commit</button>')
            .appendTo(commitToolbar)
            .click(function(evt) {
                evt.preventDefault();
                var spinner = utils.addSpinnerOverlay(submitCommitButton).addClass('projects-dialog-spinner-sidebar');
                var activeProject = RED.projects.getActiveProject();
                RED.deploy.setDeployInflight(true);
                utils.sendRequest({
                    url: "projects/"+activeProject.name+"/commit",
                    type: "POST",
                    responses: {
                        0: function(error) {
                            console.log(error);
                        },
                        200: function(data) {
                            spinner.remove();
                            cancelCommitButton.click();
                            refresh(true);
                        },
                        400: {
                            '*': function(error) {
                                utils.reportUnexpectedError(error);
                            }
                        },
                    }
                },{
                    message:commitMessage.val()
                }).always(function() {
                    setTimeout(function() {
                        RED.deploy.setDeployInflight(false);
                    },500);
                })
            })


        var localHistory = sections.add({
            title: "Commit History",
            collapsible: true
        });

        var bg = $('<div style="float: right"></div>').appendTo(localHistory.header);
        $('<button class="editor-button editor-button-small"><i class="fa fa-refresh"></i></button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                refresh(true,true);
            })

        var localBranchToolbar = $('<div class="sidebar-version-control-change-header" style="text-align: right;"></div>').appendTo(localHistory.content);

        var localBranchButton = $('<button class="editor-button editor-button-small"><i class="fa fa-code-fork"></i> Branch: <span id="sidebar-version-control-local-branch"></span></button>')
            .appendTo(localBranchToolbar)
            .click(function(evt) {
                evt.preventDefault();
                if ($(this).hasClass('selected')) {
                    closeBranchBox();
                } else {
                    closeRemoteBox();
                    localCommitListShade.show();
                    $(this).addClass('selected');
                    var activeProject = RED.projects.getActiveProject();
                    localBranchList.refresh("projects/"+activeProject.name+"/branches");
                    localBranchBox.show();
                    setTimeout(function() {
                        localBranchBox.css("height","215px");
                        localBranchList.focus();
                    },100);
                }
            })
        var repoStatusButton = $('<button class="editor-button editor-button-small" style="margin-left: 10px;" id="sidebar-version-control-repo-status-button">'+
                                 '<span id="sidebar-version-control-repo-status-stats">'+
                                    '<i class="fa fa-long-arrow-up"></i> <span id="sidebar-version-control-commits-ahead"></span> '+
                                    '<i class="fa fa-long-arrow-down"></i> <span id="sidebar-version-control-commits-behind"></span>'+
                                 '</span>'+
                                 '<span id="sidebar-version-control-repo-status-auth-issue">'+
                                    '<i class="fa fa-warning"></i>'+
                                 '</span>'+
                                 '</button>')
            .appendTo(localBranchToolbar)
            .click(function(evt) {
                evt.preventDefault();
                if ($(this).hasClass('selected')) {
                    closeRemoteBox();
                } else {
                    closeBranchBox();
                    localCommitListShade.show();
                    $(this).addClass('selected');
                    var activeProject = RED.projects.getActiveProject();
                    $("#sidebar-version-control-repo-toolbar-set-upstream-row").toggle(!!activeProject.git.branches.remoteAlt);
                    remoteBox.show();

                    setTimeout(function() {
                        remoteBox.css("height","265px");
                    },100);

                }
            });

        localCommitList = $("<ol>",{style:"position: absolute; top: 30px; bottom: 0px; right:0; left:0;"}).appendTo(localHistory.content);
        localCommitListShade = $('<div class="component-shade" style="z-Index: 3"></div>').css('top',"30px").hide().appendTo(localHistory.content);
        localCommitList.editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(row,index,entry) {
                row.addClass('sidebar-version-control-commit-entry');
                if (entry.url) {
                    row.addClass('sidebar-version-control-commit-more');
                    row.text("+ "+(entry.total-entry.totalKnown)+" more commit(s)");
                    row.click(function(e) {
                        e.preventDefault();
                        getCommits(entry.url,localCommitList,row,entry.limit,entry.before);
                    })
                } else {
                    row.click(function(e) {
                        var activeProject = RED.projects.getActiveProject();
                        if (activeProject) {
                            $.getJSON("projects/"+activeProject.name+"/commits/"+entry.sha,function(result) {
                                result.project = activeProject;
                                result.parents = entry.parents;
                                result.oldRev = entry.sha+"~1";
                                result.newRev = entry.sha;
                                result.oldRevTitle = "Commit "+entry.sha.substring(0,7)+"~1";
                                result.newRevTitle = "Commit "+entry.sha.substring(0,7);
                                result.date = humanizeSinceDate(parseInt(entry.date));
                                RED.diff.showCommitDiff(result);
                            });
                        }
                    });
                    var container = $('<div>').appendTo(row);
                    $('<div class="sidebar-version-control-commit-subject">').text(entry.subject).appendTo(container);
                    if (entry.refs) {
                        var refDiv = $('<div class="sidebar-version-control-commit-refs">').appendTo(container);
                        entry.refs.forEach(function(ref) {
                            var label = ref;
                            if (/HEAD -> /.test(ref)) {
                                label = ref.substring(8);
                            }
                            $('<span class="sidebar-version-control-commit-ref">').text(label).appendTo(refDiv);
                        });
                        row.addClass('sidebar-version-control-commit-head');
                    }
                    $('<div class="sidebar-version-control-commit-sha">').text(entry.sha.substring(0,7)).appendTo(container);
                    // $('<div class="sidebar-version-control-commit-user">').text(entry.author).appendTo(container);
                    $('<div class="sidebar-version-control-commit-date">').text(humanizeSinceDate(parseInt(entry.date))).appendTo(container);
                }
            }
        });


        var closeBranchBox = function(done) {
            localBranchButton.removeClass('selected')
            localBranchBox.css("height","0");
            localCommitListShade.hide();

            setTimeout(function() {
                localBranchBox.hide();
                if (done) { done() }
            },200);
        }
        var localBranchBox = $('<div class="sidebar-version-control-slide-box sidebar-version-control-slide-box-top" style="top:30px;"></div>').hide().appendTo(localHistory.content);

        $('<div class="sidebar-version-control-slide-box-header"></div>').text("Change local branch").appendTo(localBranchBox);

        var localBranchList = utils.createBranchList({
            placeholder: "Find or create a branch",
            container: localBranchBox,
            onselect: function(body) {
                if (body.current) {
                    return closeBranchBox();
                }
                var spinner = utils.addSpinnerOverlay(localBranchBox);
                var activeProject = RED.projects.getActiveProject();
                RED.deploy.setDeployInflight(true);
                utils.sendRequest({
                    url: "projects/"+activeProject.name+"/branches",
                    type: "POST",
                    requireCleanWorkspace: true,
                    cancel: function() {
                        spinner.remove();
                    },
                    responses: {
                        0: function(error) {
                            spinner.remove();
                            console.log(error);
                            // done(error,null);
                        },
                        200: function(data) {
                            // Changing branch will trigger a runtime event
                            // that leads to a project refresh.
                            closeBranchBox(function() {
                                spinner.remove();
                            });
                        },
                        400: {
                            'git_local_overwrite': function(error) {
                                spinner.remove();
                                RED.notify("You have local changes that would be overwritten by changing the branch. You must either commit or undo those changes first.",{
                                    type:'error',
                                    timeout: 8000
                                });
                            },
                            'unexpected_error': function(error) {
                                spinner.remove();
                                console.log(error);
                                // done(error,null);
                            }
                        },
                    }
                },body).always(function(){
                    setTimeout(function() {
                        RED.deploy.setDeployInflight(false);
                    },500);
                });
            }
        });

        var remoteBox = $('<div class="sidebar-version-control-slide-box sidebar-version-control-slide-box-top" style="top:30px"></div>').hide().appendTo(localHistory.content);
        var closeRemoteBox = function() {
            $("#sidebar-version-control-repo-toolbar-set-upstream").prop('checked',false);
            repoStatusButton.removeClass('selected')
            remoteBox.css("height","0");
            localCommitListShade.hide();
            setTimeout(function() {
                remoteBox.hide();
                closeRemoteBranchBox();
            },200);
        }

        var closeRemoteBranchBox = function(done) {
            if (remoteBranchButton.hasClass('selected')) {
                remoteBranchButton.removeClass('selected');
                remoteBranchSubRow.height(0);
                remoteBox.css("height","265px");
                setTimeout(function() {
                    remoteBranchSubRow.hide();
                    if (done) { done(); }
                },200);
            }
        }
        $('<div class="sidebar-version-control-slide-box-header"></div>').text("Manage remote branch").appendTo(remoteBox);

        var remoteBranchRow = $('<div style="margin-bottom: 5px;"></div>').appendTo(remoteBox);
        var remoteBranchButton = $('<button id="sidebar-version-control-repo-branch" class="sidebar-version-control-repo-action editor-button"><i class="fa fa-code-fork"></i> Remote: <span id="sidebar-version-control-remote-branch"></span></button>')
            .appendTo(remoteBranchRow)
            .click(function(evt) {
                evt.preventDefault();
                if ($(this).hasClass('selected')) {
                    closeRemoteBranchBox();
                } else {
                    $(this).addClass('selected');
                    var activeProject = RED.projects.getActiveProject();
                    remoteBranchList.refresh("projects/"+activeProject.name+"/branches/remote");
                    remoteBranchSubRow.show();
                    setTimeout(function() {
                        remoteBranchSubRow.height(180);
                        remoteBox.css("height","445px");
                        remoteBranchList.focus();
                    },100);
                }
            });

        $('<div id="sidebar-version-control-repo-toolbar-message" class="sidebar-version-control-slide-box-header" style="min-height: 100px;"></div>').appendTo(remoteBox);


        var errorMessage = $('<div id="sidebar-version-control-repo-toolbar-error-message" class="sidebar-version-control-slide-box-header" style="min-height: 100px;"></div>').hide().appendTo(remoteBox);
        $('<div style="margin-top: 10px;"><i class="fa fa-warning"></i> Unable to access remote repository</div>').appendTo(errorMessage)
        var buttonRow = $('<div style="margin: 10px 30px; text-align: center"></div>').appendTo(errorMessage);
        $('<button class="editor-button" style="width: 80%;"><i class="fa fa-refresh"></i> Retry</button>')
            .appendTo(buttonRow)
            .click(function(e) {
                e.preventDefault();
                var activeProject = RED.projects.getActiveProject();
                var spinner = utils.addSpinnerOverlay(remoteBox).addClass("projects-dialog-spinner-contain");
                utils.sendRequest({
                    url: "projects/"+activeProject.name+"/branches/remote",
                    type: "GET",
                    responses: {
                        0: function(error) {
                            console.log(error);
                            // done(error,null);
                        },
                        200: function(data) {
                            refresh(true);
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
                                console.log(error);
                                // done(error,null);
                            }
                        }
                    }
                }).always(function() {
                    spinner.remove();
                });
            })

        $('<div class="sidebar-version-control-slide-box-header" style="height: 20px;"><label id="sidebar-version-control-repo-toolbar-set-upstream-row" for="sidebar-version-control-repo-toolbar-set-upstream" class="hide"><input type="checkbox" id="sidebar-version-control-repo-toolbar-set-upstream"> Set as upstream branch</label></div>').appendTo(remoteBox);

        var remoteBranchSubRow = $('<div style="height: 0;overflow:hidden; transition: height 0.2s ease-in-out;"></div>').hide().appendTo(remoteBranchRow);
        var remoteBranchList = utils.createBranchList({
            placeholder: "Find or create a remote branch",
            currentLabel: "upstream",
            remote: function() {
                var project = RED.projects.getActiveProject();
                var remotes = Object.keys(project.git.remotes);
                return remotes[0];
            },
            container: remoteBranchSubRow,
            onselect: function(body) {
                $("#sidebar-version-control-repo-toolbar-set-upstream").prop('checked',false);
                $("#sidebar-version-control-repo-toolbar-set-upstream").prop('disabled',false);
                $("#sidebar-version-control-remote-branch").text(body.name+(body.create?" *":""));
                var activeProject = RED.projects.getActiveProject();
                if (activeProject.git.branches.remote === body.name) {
                    delete activeProject.git.branches.remoteAlt;
                } else {
                    activeProject.git.branches.remoteAlt = body.name;
                }
                $("#sidebar-version-control-repo-toolbar-set-upstream-row").toggle(!!activeProject.git.branches.remoteAlt);
                closeRemoteBranchBox(function() {
                    if (!body.create) {
                        var start = Date.now();
                        var spinner = utils.addSpinnerOverlay($('#sidebar-version-control-repo-toolbar-message')).addClass("projects-dialog-spinner-contain");
                        $.getJSON("projects/"+activeProject.name+"/branches/remote/"+body.name+"/status", function(result) {
                            setTimeout(function() {
                                updateRemoteStatus(result.commits.ahead, result.commits.behind);
                                spinner.remove();
                            },Math.max(400-(Date.now() - start),0));
                        })
                    } else {
                        if (!activeProject.git.branches.remote) {
                            $('#sidebar-version-control-repo-toolbar-message').text("The created branch will be set as the tracked upstream branch.");
                            $("#sidebar-version-control-repo-toolbar-set-upstream").prop('checked',true);
                            $("#sidebar-version-control-repo-toolbar-set-upstream").prop('disabled',true);
                        } else {
                            $('#sidebar-version-control-repo-toolbar-message').text("The branch will be created. Select below to set it as the tracked upstream branch.");
                        }
                        $("#sidebar-version-control-repo-pull").attr('disabled',true);
                        $("#sidebar-version-control-repo-push").attr('disabled',false);
                    }
                });
            }
        });


        var row = $('<div style="margin-bottom: 5px;"></div>').appendTo(remoteBox);

        $('<button id="sidebar-version-control-repo-push" class="sidebar-version-control-repo-sub-action editor-button"><i class="fa fa-long-arrow-up"></i> <span>push</span></button>')
            .appendTo(row)
            .click(function(e) {
                e.preventDefault();
                var spinner = utils.addSpinnerOverlay(remoteBox).addClass("projects-dialog-spinner-contain");
                var activeProject = RED.projects.getActiveProject();
                var url = "projects/"+activeProject.name+"/push";
                if (activeProject.git.branches.remoteAlt) {
                    url+="/"+activeProject.git.branches.remoteAlt;
                }
                var setUpstream = $("#sidebar-version-control-repo-toolbar-set-upstream").prop('checked');
                if (setUpstream) {
                    url+="?u=true"
                }
                utils.sendRequest({
                    url: url,
                    type: "POST",
                    responses: {
                        0: function(error) {
                            console.log(error);
                            // done(error,null);
                        },
                        200: function(data) {
                            if (setUpstream && activeProject.git.branches.remoteAlt) {
                                activeProject.git.branches.remote = activeProject.git.branches.remoteAlt;
                                delete activeProject.git.branches.remoteAlt;
                            }
                            refresh(true);
                            closeRemoteBox();
                        },
                        400: {
                            'git_push_failed': function(err) {
                                // TODO: better message + NLS
                                RED.notify("NLS: Push failed as the remote has more recent commits. Pull first and write a better error message!","error");
                            },
                            'unexpected_error': function(error) {
                                console.log(error);
                                // done(error,null);
                            }
                        },
                    }
                },{}).always(function() {
                    spinner.remove();
                });
            });

        var pullRemote = function(options) {
            options = options || {};
            var spinner = utils.addSpinnerOverlay(remoteBox).addClass("projects-dialog-spinner-contain");
            var activeProject = RED.projects.getActiveProject();
            var url = "projects/"+activeProject.name+"/pull";
            if (activeProject.git.branches.remoteAlt) {
                url+="/"+activeProject.git.branches.remoteAlt;
            }
            if (options.setUpstream || options.allowUnrelatedHistories) {
                url+="?";
            }
            if (options.setUpstream) {
                url += "setUpstream=true"
                if (options.allowUnrelatedHistories) {
                    url += "&";
                }
            }
            if (options.allowUnrelatedHistories) {
                url += "allowUnrelatedHistories=true"
            }
            utils.sendRequest({
                url: url,
                type: "POST",
                responses: {
                    0: function(error) {
                        console.log(error);
                        // done(error,null);
                    },
                    200: function(data) {
                        if (options.setUpstream && activeProject.git.branches.remoteAlt) {
                            activeProject.git.branches.remote = activeProject.git.branches.remoteAlt;
                            delete activeProject.git.branches.remoteAlt;
                        }
                        refresh(true);
                        closeRemoteBox();
                    },
                    400: {
                        'git_local_overwrite': function(err) {
                            RED.notify("<p>Unable to pull remote changes; your unstaged local changes would be overwritten.</p><p>Commit your changes and try again.</p>"+
                                '<p><a href="#" onclick="RED.sidebar.versionControl.showLocalChanges(); return false;">'+'Show unstaged changes'+'</a></p>',"error",false,10000000);
                        },
                        'git_pull_merge_conflict': function(err) {
                            refresh(true);
                            closeRemoteBox();
                        },
                        'git_connection_failed': function(err) {
                            RED.notify("Could not connect to remote repository: "+err.toString(),"warning")
                        },
                        'git_pull_unrelated_history': function(error) {
                            var notification = RED.notify("<p>The remote has an unrelated history of commits.</p><p>Are you sure you want to pull the changes into your local repository?</p>",{
                                type: 'error',
                                modal: true,
                                fixed: true,
                                buttons: [
                                    {
                                        text: RED._("common.label.cancel"),
                                        click: function() {
                                            notification.close();
                                        }
                                    },{
                                        text: 'Pull changes',
                                        click: function() {
                                            notification.close();
                                            options.allowUnrelatedHistories = true;
                                            pullRemote(options)
                                        }
                                    }
                                ]
                            });
                        },
                        '*': function(error) {
                            utils.reportUnexpectedError(error);
                        }
                    },
                }
            },{}).always(function() {
                spinner.remove();
            });
        }
        $('<button id="sidebar-version-control-repo-pull" class="sidebar-version-control-repo-sub-action editor-button"><i class="fa fa-long-arrow-down"></i> <span>pull</span></button>')
            .appendTo(row)
            .click(function(e) {
                e.preventDefault();
                pullRemote({
                    setUpstream: $("#sidebar-version-control-repo-toolbar-set-upstream").prop('checked')
                });
            });

        $('<div class="component-shade sidebar-version-control-shade">').appendTo(sidebarContent);

        RED.sidebar.addTab({
            id: "version-control",
            label: "history",
            name: "Project History",
            content: sidebarContent,
            enableOnEdit: false,
            onchange: function() {
                setTimeout(function() {
                    sections.resize();
                },10);
            }
        });

    }

    function humanizeSinceDate(date) {
        var delta = (Date.now()/1000) - date;

        var daysDelta = Math.floor(delta / (60*60*24));
        if (daysDelta > 30) {
            return (new Date(date*1000)).toLocaleDateString();
        } else if (daysDelta > 0) {
            return daysDelta+" day"+(daysDelta>1?"s":"")+" ago";
        }
        var hoursDelta = Math.floor(delta / (60*60));
        if (hoursDelta > 0) {
            return hoursDelta+" hour"+(hoursDelta>1?"s":"")+" ago";
        }
        var minutesDelta = Math.floor(delta / 60);
        if (minutesDelta > 0) {
            return minutesDelta+" minute"+(minutesDelta>1?"s":"")+" ago";
        }
        return "Seconds ago";
    }

    function updateBulk(files,unstaged) {
        var activeProject = RED.projects.getActiveProject();
        if (unstaged) {
            bulkChangeSpinner = utils.addSpinnerOverlay(unstagedChangesList.parent());
        } else {
            bulkChangeSpinner = utils.addSpinnerOverlay(stagedChangesList.parent());
        }
        bulkChangeSpinner.addClass('projects-dialog-spinner-sidebar');
        var body = unstaged?{files:files}:undefined;
        utils.sendRequest({
            url: "projects/"+activeProject.name+"/stage",
            type: unstaged?"POST":"DELETE",
            responses: {
                0: function(error) {
                    console.log(error);
                    // done(error,null);
                },
                200: function(data) {
                    refreshFiles(data);
                },
                400: {
                    'unexpected_error': function(error) {
                        console.log(error);
                        // done(error,null);
                    }
                },
            }
        },body);
    }

    var refreshInProgress = false;

    var emptyStagedItem = { label:"None" };
    var emptyMergedItem = { label:"All conflicts resolved. Commit the changes to complete the merge." };

    function getCommits(url,targetList,spinnerTarget,limit,before) {
        var spinner = utils.addSpinnerOverlay(spinnerTarget);
        var fullUrl = url+"?limit="+(limit||20);
        if (before) {
            fullUrl+="&before="+before;
        }
        utils.sendRequest({
            url: fullUrl,
            type: "GET",
            responses: {
                0: function(error) {
                    console.log(error);
                    // done(error,null);
                },
                200: function(result) {
                    var lastSha;
                    result.commits.forEach(function(c) {
                        targetList.editableList('addItem',c);
                        lastSha = c.sha;
                    })
                    if (targetList.loadMoreItem) {
                        targetList.editableList('removeItem',targetList.loadMoreItem);
                        delete targetList.loadMoreItem;
                    }
                    var totalKnown = targetList.editableList('length');
                    if (totalKnown < result.total) {
                        targetList.loadMoreItem = {
                            totalKnown: totalKnown,
                            total: result.total,
                            url: url,
                            before: lastSha+"~1",
                            limit: limit,
                        };
                        targetList.editableList('addItem',targetList.loadMoreItem);
                    }
                    spinner.remove();
                },
                400: {
                    'unexpected_error': function(error) {
                        console.log(error);
                        // done(error,null);
                    }
                }
            }
        });
    }
    function refreshLocalCommits() {
        localCommitList.editableList('empty');
        var activeProject = RED.projects.getActiveProject();
        if (activeProject) {
            getCommits("projects/"+activeProject.name+"/commits",localCommitList,localCommitList.parent());
        }
    }
    // function refreshRemoteCommits() {
    //     remoteCommitList.editableList('empty');
    //     var spinner = utils.addSpinnerOverlay(remoteCommitList);
    //     var activeProject = RED.projects.getActiveProject();
    //     if (activeProject) {
    //         getCommits("projects/"+activeProject.name+"/commits/origin",remoteCommitList,remoteCommitList.parent());
    //     }
    // }

    function refreshFiles(result) {
        var files = result.files;
        if (bulkChangeSpinner) {
            bulkChangeSpinner.remove();
            bulkChangeSpinner = null;
        }
        isMerging = !!result.merging;
        if (isMerging) {
            sidebarContent.addClass("sidebar-version-control-merging");
            unmergedContent.show();
        } else {
            sidebarContent.removeClass("sidebar-version-control-merging");
            unmergedContent.hide();
        }
        unstagedChangesList.editableList('removeItem',emptyStagedItem);
        stagedChangesList.editableList('removeItem',emptyStagedItem);
        unmergedChangesList.editableList('removeItem',emptyMergedItem);

        var fileNames = Object.keys(files).filter(function(f) { return files[f].type === 'f'})
        fileNames.sort();
        var updateIndex = Date.now()+Math.floor(Math.random()*100);
        fileNames.forEach(function(fn) {
            var entry = files[fn];
            var addEntry = false;
            if (entry.status) {
                entry.file = fn;
                entry.indexStatus = entry.status[0];
                entry.treeStatus = entry.status[1];
                if ((entry.indexStatus === 'A' && /[AU]/.test(entry.treeStatus)) ||
                    (entry.indexStatus === 'U' && /[DAU]/.test(entry.treeStatus)) ||
                    (entry.indexStatus === 'D' && /[DU]/.test(entry.treeStatus))) {
                        entry.unmerged = true;
                }
                if (allChanges[fn]) {
                    if (allChanges[fn].unmerged && !entry.unmerged) {
                        unmergedChangesList.editableList('removeItem', allChanges[fn])
                        addEntry = true;
                    } else if (!allChanges[fn].unmerged && entry.unmerged) {
                        unstagedChangesList.editableList('removeItem', allChanges[fn])
                        stagedChangesList.editableList('removeItem', allChanges[fn])
                    }
                    // Known file
                    if (allChanges[fn].status !== entry.status) {
                        // Status changed.
                        if (allChanges[fn].treeStatus !== ' ') {
                            // Already in the unstaged list
                            if (entry.treeStatus === ' ') {
                                unstagedChangesList.editableList('removeItem', allChanges[fn])
                            } else if (entry.treeStatus !== allChanges[fn].treeStatus) {
                                allChanges[fn].updateUnstaged(entry,entry.treeStatus);
                            }
                        } else {
                            addEntry = true;
                        }
                        if (allChanges[fn].indexStatus !== ' ' && allChanges[fn].indexStatus !== '?') {
                            // Already in the staged list
                            if (entry.indexStatus === ' '||entry.indexStatus === '?') {
                                stagedChangesList.editableList('removeItem', allChanges[fn])
                            } else if (entry.indexStatus !== allChanges[fn].indexStatus) {
                                allChanges[fn].updateStaged(entry,entry.indexStatus);
                            }
                        } else {
                            addEntry = true;
                        }
                    }
                    allChanges[fn].status = entry.status;
                    allChanges[fn].indexStatus = entry.indexStatus;
                    allChanges[fn].treeStatus = entry.treeStatus;
                    allChanges[fn].oldName = entry.oldName;
                    allChanges[fn].unmerged = entry.unmerged;

                } else {
                    addEntry = true;
                    allChanges[fn] = entry;
                }
                allChanges[fn].updateIndex = updateIndex;
                if (addEntry) {
                    if (entry.unmerged) {
                        unmergedChangesList.editableList('addItem', allChanges[fn]);
                    } else {
                        if (entry.treeStatus !== ' ') {
                            unstagedChangesList.editableList('addItem', allChanges[fn])
                        }
                        if (entry.indexStatus !== ' ' && entry.indexStatus !== '?') {
                            stagedChangesList.editableList('addItem', allChanges[fn])
                        }
                    }
                }
            }
        });
        Object.keys(allChanges).forEach(function(fn) {
            if (allChanges[fn].updateIndex !== updateIndex) {
                unstagedChangesList.editableList('removeItem', allChanges[fn]);
                stagedChangesList.editableList('removeItem', allChanges[fn]);
                delete allChanges[fn];
            }
        });

        var stagedCount = stagedChangesList.editableList('length');
        var unstagedCount = unstagedChangesList.editableList('length');
        var unmergedCount = unmergedChangesList.editableList('length');

        commitButton.attr('disabled',(isMerging && unmergedCount > 0)||(!isMerging && stagedCount === 0));
        stageAllButton.attr('disabled',unstagedCount === 0);
        unstageAllButton.attr('disabled',stagedCount === 0);

        if (stagedCount === 0) {
            stagedChangesList.editableList('addItem',emptyStagedItem);
        }
        if (unstagedCount === 0) {
            unstagedChangesList.editableList('addItem',emptyStagedItem);
        }
        if (unmergedCount === 0) {
            unmergedChangesList.editableList('addItem',emptyMergedItem);
        }
    }

    function refresh(full, includeRemote) {
        if (refreshInProgress) {
            return;
        }
        if (full) {
            allChanges = {};
            unstagedChangesList.editableList('empty');
            stagedChangesList.editableList('empty');
            unmergedChangesList.editableList('empty');
        }
        if (!RED.user.hasPermission("projects.write")) {
            return;
        }


        refreshInProgress = true;
        refreshLocalCommits();

        var activeProject = RED.projects.getActiveProject();
        if (activeProject) {
            var url = "projects/"+activeProject.name+"/status";
            if (includeRemote) {
                url += "?remote=true"
            }
            $.getJSON(url,function(result) {
                refreshFiles(result);

                $('#sidebar-version-control-local-branch').text(result.branches.local);
                $('#sidebar-version-control-remote-branch').text(result.branches.remote||"none");

                var commitsAhead = result.commits.ahead || 0;
                var commitsBehind = result.commits.behind || 0;

                if (activeProject.git.hasOwnProperty('remotes')) {
                    if (result.branches.hasOwnProperty("remoteError") && result.branches.remoteError.code !== 'git_remote_gone') {
                        $("#sidebar-version-control-repo-status-auth-issue").show();
                        $("#sidebar-version-control-repo-status-stats").hide();
                        $('#sidebar-version-control-repo-branch').attr('disabled',true);
                        $("#sidebar-version-control-repo-pull").attr('disabled',true);
                        $("#sidebar-version-control-repo-push").attr('disabled',true);
                        $('#sidebar-version-control-repo-toolbar-message').hide();
                        $('#sidebar-version-control-repo-toolbar-error-message').show();
                    } else {
                        $('#sidebar-version-control-repo-toolbar-message').show();
                        $('#sidebar-version-control-repo-toolbar-error-message').hide();

                        $("#sidebar-version-control-repo-status-auth-issue").hide();
                        $("#sidebar-version-control-repo-status-stats").show();

                        $('#sidebar-version-control-repo-branch').attr('disabled',false);

                        $("#sidebar-version-control-repo-status-button").show();
                        if (result.branches.hasOwnProperty('remote')) {
                            updateRemoteStatus(commitsAhead, commitsBehind);
                        } else {
                            $('#sidebar-version-control-commits-ahead').text("");
                            $('#sidebar-version-control-commits-behind').text("");

                            $('#sidebar-version-control-repo-toolbar-message').text("Your local branch is not currently tracking a remote branch.");
                            $("#sidebar-version-control-repo-pull").attr('disabled',true);
                            $("#sidebar-version-control-repo-push").attr('disabled',true);
                        }
                    }
                } else {
                    $("#sidebar-version-control-repo-status-button").hide();
                }
                refreshInProgress = false;
                $('.sidebar-version-control-shade').hide();
            }).fail(function() {
                refreshInProgress = false;
            });
        } else {
            $('.sidebar-version-control-shade').show();
            unstagedChangesList.editableList('empty');
            stagedChangesList.editableList('empty');
            unmergedChangesList.editableList('empty');
        }
    }


    function updateRemoteStatus(commitsAhead, commitsBehind) {
        $('#sidebar-version-control-commits-ahead').text(commitsAhead);
        $('#sidebar-version-control-commits-behind').text(commitsBehind);
        if (isMerging) {
            $('#sidebar-version-control-repo-toolbar-message').text("Your repository has unmerged changes. You need to fix the conflicts and commit the result.");
            $("#sidebar-version-control-repo-pull").attr('disabled',true);
            $("#sidebar-version-control-repo-push").attr('disabled',true);
        } else if (commitsAhead > 0 && commitsBehind === 0) {
            $('#sidebar-version-control-repo-toolbar-message').text("Your repository is "+commitsAhead+" commit"+(commitsAhead===1?'':'s')+" ahead of the remote. You can push "+(commitsAhead===1?'this commit':'these commits')+" now.");
            $("#sidebar-version-control-repo-pull").attr('disabled',true);
            $("#sidebar-version-control-repo-push").attr('disabled',false);
        } else if (commitsAhead === 0 && commitsBehind > 0) {
            $('#sidebar-version-control-repo-toolbar-message').text("Your repository is "+commitsBehind+" commit"+(commitsBehind===1?'':'s')+" behind of the remote. You can pull "+(commitsBehind===1?'this commit':'these commits')+" now.");
            $("#sidebar-version-control-repo-pull").attr('disabled',false);
            $("#sidebar-version-control-repo-push").attr('disabled',true);
        } else if (commitsAhead > 0 && commitsBehind > 0) {
            $('#sidebar-version-control-repo-toolbar-message').text("Your repository is "+commitsBehind+" commit"+(commitsBehind===1?'':'s')+" behind and "+commitsAhead+" commit"+(commitsAhead===1?'':'s')+" ahead of the remote. You must pull the remote commit"+(commitsBehind===1?'':'s')+" down before pushing.");
            $("#sidebar-version-control-repo-pull").attr('disabled',false);
            $("#sidebar-version-control-repo-push").attr('disabled',true);
        } else if (commitsAhead === 0 && commitsBehind === 0) {
            $('#sidebar-version-control-repo-toolbar-message').text("Your repository is up to date.");
            $("#sidebar-version-control-repo-pull").attr('disabled',true);
            $("#sidebar-version-control-repo-push").attr('disabled',true);
        }
    }
    function show() {
        refresh();
        RED.sidebar.show("version-control");
    }
    function showLocalChanges() {
        RED.sidebar.show("version-control");
        localChanges.expand();
    }
    return {
        init: init,
        show: show,
        refresh: refresh,
        showLocalChanges: showLocalChanges
    }
})();
