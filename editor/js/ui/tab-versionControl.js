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

    var content;
    var sections;

    var allChanges = {};

    var unstagedChangesList;
    var stageAllButton;
    var stagedChangesList;
    var unstageAllButton;
    var unstagedChanges;
    var stagedChanges;
    var bulkChangeSpinner;
    var commitButton;

    var localCommitList;


    // TODO: DRY projectSummary.js
    function addSpinnerOverlay(container) {
        var spinner = $('<div class="projects-dialog-spinner"><img src="red/images/spin.svg"/></div>').appendTo(container);
        return spinner;
    }
    function createChangeEntry(row, entry, status, unstaged) {
        row.addClass("sidebar-version-control-change-entry");
        var container = $('<div>').appendTo(row);
        if (entry.label) {
            row.addClass('node-info-none');
            container.text(entry.label);
            return;
        }


        var icon = $('<i class=""></i>').appendTo(container);
        var label = $('<span>').appendTo(container);

        var bg = $('<div class="button-group"></div>').appendTo(row);
        var viewDiffButton = $('<button class="editor-button editor-button-small"><i class="fa fa-eye"></i></button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                var activeProject = RED.projects.getActiveProject();
                utils.sendRequest({
                    url: "projects/"+activeProject.name+"/diff/"+(unstaged?"tree":"index")+"/"+encodeURIComponent(entry.file),
                    type: "GET",
                    responses: {
                        0: function(error) {
                            console.log(error);
                            // done(error,null);
                        },
                        200: function(data) {
                            var options = {
                                diff: data.diff,
                                title: (unstaged?"Unstaged":"Staged")+" changes : "+entry.file,
                                oldRevTitle: unstaged?(entry.indexStatus === " "?"HEAD":"Staged"):"HEAD",
                                newRevTitle: unstaged?"Unstaged":"Staged",
                                oldRev: unstaged?(entry.indexStatus === " "?"@":":0"):"@",
                                newRev: unstaged?"_":":0",
                                project: activeProject
                            }
                            RED.diff.showUnifiedDiff(options);
                            // console.log(data.diff);
                        },
                        400: {
                            'unexpected_error': function(error) {
                                console.log(error);
                                // done(error,null);
                            }
                        },
                    }
                })

            })
        $('<button class="editor-button editor-button-small"><i class="fa fa-'+(unstaged?"plus":"minus")+'"></i></button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                var activeProject = RED.projects.getActiveProject();
                entry.spinner = addSpinnerOverlay(row).addClass('projects-version-control-spinner-sidebar');
                utils.sendRequest({
                    url: "projects/"+activeProject.name+"/stage/"+encodeURIComponent(entry.file),
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
                },{});
            });
        entry["update"+(unstaged?"Unstaged":"Staged")] = function(entry,status) {
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

            viewDiffButton.attr("disabled",(status === 'D' || status === '?'));
            viewDiffButton.find("i")
                .toggleClass('fa-eye',!(status === 'D' || status === '?'))
                .toggleClass('fa-eye-slash',(status === 'D' || status === '?'))

        }
        entry["update"+(unstaged?"Unstaged":"Staged")](entry, status);
    }
    var utils;
    function init(_utils) {
        utils = _utils;

        RED.actions.add("core:show-version-control-tab",show);

        content = $('<div>', {class:"sidebar-version-control"});
        var stackContainer = $("<div>",{class:"sidebar-version-control-stack"}).appendTo(content);
        sections = RED.stack.create({
            container: stackContainer,
            fill: true,
            singleExpanded: true
        });

        var localChanges = sections.add({
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
        var header = $('<div class="sidebar-version-control-change-header">Unstaged Changes</div>').appendTo(unstagedContent);
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
                createChangeEntry(row,entry,entry.treeStatus,true);
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

        var header = $('<div class="sidebar-version-control-change-header">Staged Changes</div>').appendTo(stagedContent);

        bg = $('<div style="float: right"></div>').appendTo(header);
        commitButton = $('<button class="editor-button editor-button-small" style="margin-right: 5px;">commit</button>')
            .appendTo(bg)
            .click(function(evt) {
                evt.preventDefault();
                evt.stopPropagation();
                commitMessage.val("");
                submitCommitButton.attr("disabled",true);
                unstagedContent.css("height","30px");
                stagedContent.css("height","calc(100% - 30px - 175px)");
                commitBox.show();
                commitBox.css("height","175px");
                stageAllButton.attr("disabled",true);
                unstageAllButton.attr("disabled",true);
                commitButton.attr("disabled",true);
                commitMessage.focus();
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
                createChangeEntry(row,entry,entry.indexStatus,false);
            },
            sort: function(A,B) {
                return A.file.localeCompare(B.file);
            }
        })

        commitBox = $('<div class="sidebar-version-control-change-commit-box"></div>').hide().appendTo(localChanges.content);

        var commitMessage = $('<textarea>')
            .appendTo(commitBox)
            .on("change keyup paste",function() {
                submitCommitButton.attr('disabled',$(this).val().trim()==="");
            });
        var commitToolbar = $('<div class="sidebar-version-control-change-commit-toolbar button-group">').appendTo(commitBox);

        var cancelCommitButton = $('<button class="editor-button">Cancel</button>')
            .appendTo(commitToolbar)
            .click(function(evt) {
                evt.preventDefault();
                commitMessage.val("");
                unstagedContent.css("height","");
                stagedContent.css("height","");
                commitBox.css("height","");
                setTimeout(function() {
                    commitBox.hide();
                },200);
                stageAllButton.attr("disabled",false);
                unstageAllButton.attr("disabled",false);
                commitButton.attr("disabled",false);
            })
        var submitCommitButton = $('<button class="editor-button">Commit</button>')
            .appendTo(commitToolbar)
            .click(function(evt) {
                evt.preventDefault();
                var spinner = addSpinnerOverlay(submitCommitButton).addClass('projects-dialog-spinner-sidebar');
                var activeProject = RED.projects.getActiveProject();
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
                            refreshFiles(data);
                            refreshLocalCommits();
                        },
                        400: {
                            'unexpected_error': function(error) {
                                console.log(error);
                            }
                        },
                    }
                },{
                    message:commitMessage.val()
                });



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
                refreshLocalCommits();
            })

        localCommitList = $("<ol>",{style:"position: absolute; top: 0px; bottom: 0; right:0; left:0;"}).appendTo(localHistory.content);
        localCommitList.editableList({
            addButton: false,
            scrollOnAdd: false,
            addItem: function(row,index,entry) {
                row.addClass('sidebar-version-control-commit-entry');
                row.click(function(e) {
                    var activeProject = RED.projects.getActiveProject();
                    if (activeProject) {
                        $.getJSON("/projects/"+activeProject.name+"/commits/"+entry.sha,function(result) {
                            result.project = activeProject;
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
                $('<div class="sidebar-version-control-commit-sha">').text(entry.sha.substring(0,7)).appendTo(container);
                $('<div class="sidebar-version-control-commit-subject">').text(entry.subject).appendTo(container);
                $('<div class="sidebar-version-control-commit-user">').text(entry.author).appendTo(container);
                $('<div class="sidebar-version-control-commit-date">').text(humanizeSinceDate(parseInt(entry.date))).appendTo(container);

            }
        });

        var remoteHistory = sections.add({
            title: "Remote History",
            collapsible: true
        });

        RED.sidebar.addTab({
            id: "version-control",
            label: "version control",
            name: "Version Control",
            content: content,
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
            bulkChangeSpinner = addSpinnerOverlay(unstagedChangesList.parent());
        } else {
            bulkChangeSpinner = addSpinnerOverlay(stagedChangesList.parent());
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

    function refreshLocalCommits() {
        localCommitList.editableList('empty');
        var spinner = addSpinnerOverlay(localCommitList);
        var activeProject = RED.projects.getActiveProject();
        if (activeProject) {
            $.getJSON("/projects/"+activeProject.name+"/commits",function(result) {
                result.commits.forEach(function(c) {
                    localCommitList.editableList('addItem',c);
                })
                spinner.remove();
            });
        }
    }


    function refreshFiles(result) {
        if (bulkChangeSpinner) {
            bulkChangeSpinner.remove();
            bulkChangeSpinner = null;
        }
        unstagedChangesList.editableList('removeItem',emptyStagedItem);
        stagedChangesList.editableList('removeItem',emptyStagedItem);

        var fileNames = Object.keys(result).filter(function(f) { return result[f].type === 'f'})
        fileNames.sort();
        var updateIndex = Date.now()+Math.floor(Math.random()*100);
        fileNames.forEach(function(fn) {
            var entry = result[fn];
            var addEntry = false;
            if (entry.status) {
                entry.file = fn;
                entry.indexStatus = entry.status[0];
                entry.treeStatus = entry.status[1];
                if (allChanges[fn]) {
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
                } else {
                    addEntry = true;
                    allChanges[fn] = entry;
                }
                allChanges[fn].updateIndex = updateIndex;
                if (addEntry) {
                    if (entry.treeStatus !== ' ') {
                        unstagedChangesList.editableList('addItem', allChanges[fn])
                    }
                    if (entry.indexStatus !== ' ' && entry.indexStatus !== '?') {
                        stagedChangesList.editableList('addItem', allChanges[fn])
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
        commitButton.attr('disabled',stagedCount === 0);
        stageAllButton.attr('disabled',unstagedCount === 0);
        unstageAllButton.attr('disabled',stagedCount === 0);

        if (stagedCount === 0) {
            stagedChangesList.editableList('addItem',emptyStagedItem);
        }
        if (unstagedCount === 0) {
            unstagedChangesList.editableList('addItem',emptyStagedItem);
        }


    }

    function refresh(full) {
        if (refreshInProgress) {
            return;
        }
        if (full) {
            allChanges = {};
            unstagedChangesList.editableList('empty');
            stagedChangesList.editableList('empty');
        }

        refreshInProgress = true;
        refreshLocalCommits();

        var activeProject = RED.projects.getActiveProject();
        if (activeProject) {
            $.getJSON("/projects/"+activeProject.name+"/files",function(result) {
                refreshFiles(result);
                refreshInProgress = false;
            });
        } else {
            unstagedChangesList.editableList('empty');
            stagedChangesList.editableList('empty');
        }
    }

    function show() {
        refresh();
        RED.sidebar.show("version-control");
    }
    return {
        init: init,
        show: show,
        refresh: refresh
    }
})();
