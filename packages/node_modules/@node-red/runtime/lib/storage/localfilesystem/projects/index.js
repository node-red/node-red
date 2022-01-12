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

var fs = require('fs-extra');
var fspath = require("path");
var crypto = require('crypto');

var storageSettings = require("../settings");
var util = require("../util");
var gitTools = require("./git");
var sshTools = require("./ssh");

var Projects = require("./Project");

var settings;
var runtime;
var log = require("@node-red/util").log;
const events = require("@node-red/util").events;

var projectsEnabled = false;
var projectLogMessages = [];

var projectsDir;
var activeProject;

var globalGitUser = false;

var usingHostName = false;

function init(_settings, _runtime) {
    settings = _settings;
    runtime = _runtime;

    try {
        if (settings.editorTheme.projects.enabled === true) {
            projectsEnabled = true;
        } else if (settings.editorTheme.projects.enabled === false) {
            projectLogMessages.push(log._("storage.localfilesystem.projects.disabled"))
        }
    } catch(err) {
        projectLogMessages.push(log._("storage.localfilesystem.projects.disabledNoFlag"))
        projectsEnabled = false;
    }

    if (settings.flowFile) {
        flowsFile = settings.flowFile;
        // handle Unix and Windows "C:\" and Windows "\\" for UNC.
        if (fspath.isAbsolute(flowsFile)) {
        //if (((flowsFile[0] == "\\") && (flowsFile[1] == "\\")) || (flowsFile[0] == "/") || (flowsFile[1] == ":")) {
            // Absolute path
            flowsFullPath = flowsFile;
        } else if (flowsFile.substring(0,2) === "./") {
            // Relative to cwd
            flowsFullPath = fspath.join(process.cwd(),flowsFile);
        } else {
            try {
                fs.statSync(fspath.join(process.cwd(),flowsFile));
                // Found in cwd
                flowsFullPath = fspath.join(process.cwd(),flowsFile);
            } catch(err) {
                // Use userDir
                flowsFullPath = fspath.join(settings.userDir,flowsFile);
            }
        }

    } else {
        flowsFile = 'flows_'+require('os').hostname()+'.json';
        flowsFullPath = fspath.join(settings.userDir,flowsFile);
        usingHostName = true;
    }
    var ffExt = fspath.extname(flowsFullPath);
    var ffBase = fspath.basename(flowsFullPath,ffExt);

    flowsFileBackup = getBackupFilename(flowsFullPath);
    credentialsFile = fspath.join(settings.userDir,ffBase+"_cred"+ffExt);
    credentialsFileBackup = getBackupFilename(credentialsFile)

    var setupProjectsPromise;

    if (projectsEnabled) {
        return sshTools.init(settings,runtime).then(function() {
            gitTools.init(_settings).then(function(gitConfig) {
                if (!gitConfig || /^1\./.test(gitConfig.version)) {
                    if (!gitConfig) {
                        projectLogMessages.push(log._("storage.localfilesystem.projects.git-not-found"))
                    } else {
                        projectLogMessages.push(log._("storage.localfilesystem.projects.git-version-old",{version:gitConfig.version}))
                    }
                    projectsEnabled = false;
                    try {
                        // As projects have to be turned on, we know this property
                        // must exist at this point, so turn it off.
                        // TODO: when on-by-default, this will need to do more
                        // work to disable.
                        settings.editorTheme.projects.enabled = false;
                    } catch(err) {
                    }
                } else {
                    // Ensure there's a default workflow mode set
                    settings.editorTheme.projects.workflow = {
                        mode: (settings.editorTheme.projects.workflow || {}).mode || "manual"
                    }
                    globalGitUser = gitConfig.user;
                    Projects.init(settings,runtime);
                    sshTools.init(settings);

                    projectsDir = fspath.resolve(fspath.join(settings.userDir,"projects"));

                    if(settings.editorTheme.projects.path) {
                      projectsDir = settings.editorTheme.projects.path;
                    }

                    if (!settings.readOnly) {
                        return fs.ensureDir(projectsDir)
                        //TODO: this is accessing settings from storage directly as settings
                        //      has not yet been initialised. That isn't ideal - can this be deferred?
                        .then(storageSettings.getSettings)
                        .then(function(globalSettings) {
                            var saveSettings = false;
                            if (!globalSettings.projects) {
                                globalSettings.projects = {
                                    projects: {}
                                }
                                saveSettings = true;
                            } else {
                                activeProject = globalSettings.projects.activeProject;
                            }
                            if (!globalSettings.projects.projects) {
                                globalSettings.projects.projects = {};
                                saveSettings = true;
                            }
                            if (settings.flowFile) {
                                // if flowFile is a known project name - use it
                                if (globalSettings.projects.projects.hasOwnProperty(settings.flowFile)) {
                                    activeProject = settings.flowFile;
                                    globalSettings.projects.activeProject = settings.flowFile;
                                    saveSettings = true;
                                } else {
                                    // if it resolves to a dir - use it
                                    try {
                                        var stat = fs.statSync(fspath.join(projectsDir,settings.flowFile));
                                        if (stat && stat.isDirectory()) {
                                            activeProject = settings.flowFile;
                                            globalSettings.projects.activeProject = activeProject;
                                            // Now check for a credentialSecret
                                            if (settings.credentialSecret !== undefined) {
                                                globalSettings.projects.projects[settings.flowFile] = {
                                                    credentialSecret: settings.credentialSecret
                                                }
                                                saveSettings = true;
                                            }
                                        }
                                    } catch(err) {
                                        // Doesn't exist, handle as a flow file to be created
                                    }
                                }
                            }
                            if (!activeProject) {
                                projectLogMessages.push(log._("storage.localfilesystem.no-active-project"))
                            }
                            if (saveSettings) {
                                return storageSettings.saveSettings(globalSettings);
                            }
                        });
                    }
                }
            });
        });
    }
    return Promise.resolve();
}

function listProjects() {
    return fs.readdir(projectsDir).then(function(fns) {
        var dirs = [];
        fns.sort(function(A,B) {
            return A.toLowerCase().localeCompare(B.toLowerCase());
        }).filter(function(fn) {
            var fullPath = fspath.join(projectsDir,fn);
            if (fn[0] != ".") {
                var stats = fs.lstatSync(fullPath);
                if (stats.isDirectory()) {
                    dirs.push(fn);
                }
            }
        });
        return dirs;
    });
}

function getUserGitSettings(user) {
    var username;
    if (!user) {
        username = "_";
    } else {
        username = user.username;
    }
    var userSettings = settings.getUserSettings(username)||{};
    return userSettings.git;
}

function getBackupFilename(filename) {
    var ffName = fspath.basename(filename);
    var ffDir = fspath.dirname(filename);
    return fspath.join(ffDir,"."+ffName+".backup");
}

function loadProject(name) {
    let fullPath = fspath.resolve(fspath.join(projectsDir,name));
    var projectPath = name;
    if (projectPath.indexOf(fspath.sep) === -1) {
        projectPath = fullPath;
    } else {
        // Ensure this project dir is under projectsDir;
        let relativePath = fspath.relative(projectsDir,fullPath);
        if (/^\.\./.test(relativePath)) {
            throw new Error("Invalid project name")
        }
    }
    return Projects.load(projectPath).then(function(project) {
        activeProject = project;
        flowsFullPath = project.getFlowFile();
        flowsFileBackup = project.getFlowFileBackup();
        credentialsFile = project.getCredentialsFile();
        credentialsFileBackup = project.getCredentialsFileBackup();
        return project;
    })
}

function getProject(user, name) {
    checkActiveProject(name);
    return Promise.resolve(activeProject.export());
}

function deleteProject(user, name) {
    if (activeProject && activeProject.name === name) {
        var e = new Error("NLS: Can't delete the active project");
        e.code = "cannot_delete_active_project";
        throw e;
    }
    var projectPath = fspath.join(projectsDir,name);
    let relativePath = fspath.relative(projectsDir,projectPath);
    if (/^\.\./.test(relativePath)) {
        throw new Error("Invalid project name")
    }
    return Projects.delete(user, projectPath);
}

function checkActiveProject(project) {
    if (!activeProject || activeProject.name !== project) {
        //TODO: throw better err
        throw new Error("Cannot operate on inactive project wanted:"+project+" current:"+(activeProject&&activeProject.name));
    }
}
function getFiles(user, project) {
    checkActiveProject(project);
    return activeProject.getFiles();
}
function stageFile(user, project,file) {
    checkActiveProject(project);
    return activeProject.stageFile(file);
}
function unstageFile(user, project,file) {
    checkActiveProject(project);
    return activeProject.unstageFile(file);
}
function commit(user, project,options) {
    checkActiveProject(project);
    var isMerging = activeProject.isMerging();
    return activeProject.commit(user, options).then(function() {
        // The project was merging, now it isn't. Lets reload.
        if (isMerging && !activeProject.isMerging()) {
            return reloadActiveProject("merge-complete");
        }
    })
}
function getFileDiff(user, project,file,type) {
    checkActiveProject(project);
    return activeProject.getFileDiff(file,type);
}
function getCommits(user, project,options) {
    checkActiveProject(project);
    return activeProject.getCommits(options);
}
function getCommit(user, project,sha) {
    checkActiveProject(project);
    return activeProject.getCommit(sha);
}

function getFile(user, project,filePath,sha) {
    checkActiveProject(project);
    return activeProject.getFile(filePath,sha);
}
function revertFile(user, project,filePath) {
    checkActiveProject(project);
    return activeProject.revertFile(filePath).then(function() {
        return reloadActiveProject("revert");
    })
}
function push(user, project,remoteBranchName,setRemote) {
    checkActiveProject(project);
    return activeProject.push(user,remoteBranchName,setRemote);
}
function pull(user, project,remoteBranchName,setRemote,allowUnrelatedHistories) {
    checkActiveProject(project);
    return activeProject.pull(user,remoteBranchName,setRemote,allowUnrelatedHistories).then(function() {
        return reloadActiveProject("pull");
    });
}
function getStatus(user, project, includeRemote) {
    checkActiveProject(project);
    return activeProject.status(user, includeRemote);
}
function resolveMerge(user, project,file,resolution) {
    checkActiveProject(project);
    return activeProject.resolveMerge(file,resolution);
}
function abortMerge(user, project) {
    checkActiveProject(project);
    return activeProject.abortMerge().then(function() {
        return reloadActiveProject("merge-abort")
    });
}
function getBranches(user, project,isRemote) {
    checkActiveProject(project);
    return activeProject.getBranches(user, isRemote);
}

function deleteBranch(user, project, branch, isRemote, force) {
    checkActiveProject(project);
    return activeProject.deleteBranch(user, branch, isRemote, force);
}

function setBranch(user, project,branchName,isCreate) {
    checkActiveProject(project);
    return activeProject.setBranch(branchName,isCreate).then(function() {
        return reloadActiveProject("change-branch");
    });
}
function getBranchStatus(user, project,branchName) {
    checkActiveProject(project);
    return activeProject.getBranchStatus(branchName);
}


function getRemotes(user, project) {
    checkActiveProject(project);
    return activeProject.getRemotes(user);
}
function addRemote(user, project, options) {
    checkActiveProject(project);
    return activeProject.addRemote(user, options.name, options);
}
function removeRemote(user, project, remote) {
    checkActiveProject(project);
    return activeProject.removeRemote(user, remote);
}
function updateRemote(user, project, remote, body) {
    checkActiveProject(project);
    return activeProject.updateRemote(user, remote, body);
}

function getActiveProject(user) {
    return activeProject;
}

function reloadActiveProject(action, clearContext) {
    // Stop the current flows
    return runtime.nodes.stopFlows().then(function() {
        if (clearContext) {
            // Reset context to remove any old values
            return runtime.nodes.clearContext()
        } else {
            return Promise.resolve()
        }
    }).then(function() {
        // Load the new project flows and start them
        return runtime.nodes.loadFlows(true).then(function() {
            events.emit("runtime-event",{id:"project-update", payload:{ project: activeProject.name, action:action}});
        }).catch(function(err) {
            // We're committed to the project change now, so notify editors
            // that it has changed.
            events.emit("runtime-event",{id:"project-update", payload:{ project: activeProject.name, action:action}});
            throw err;
        });
    }).catch(function(err) {
        console.log(err.stack);
        throw err;
    });
}
function createProject(user, metadata) {
    if (metadata.files && metadata.migrateFiles) {
        // We expect there to be no active project in this scenario
        if (activeProject) {
            throw new Error("Cannot migrate as there is an active project");
        }
        var currentEncryptionKey = settings.get('credentialSecret');
        if (currentEncryptionKey === undefined) {
            currentEncryptionKey = settings.get('_credentialSecret');
        }
        if (!metadata.hasOwnProperty('credentialSecret')) {
            metadata.credentialSecret = currentEncryptionKey;
        }
        if (!metadata.files.flow) {
            metadata.files.flow = fspath.basename(flowsFullPath);
        }
        if (!metadata.files.credentials) {
            metadata.files.credentials = fspath.basename(credentialsFile);
        }

        metadata.files.oldFlow = flowsFullPath;
        metadata.files.oldCredentials = credentialsFile;
        metadata.files.credentialSecret = currentEncryptionKey;
    }
    metadata.path = fspath.join(projectsDir,metadata.name);
    if (/^\.\./.test(fspath.relative(projectsDir,metadata.path))) {
        throw new Error("Invalid project name")
    }

    return Projects.create(user, metadata).then(function(p) {
        return setActiveProject(user, p.name);
    }).then(function() {
        return getProject(user, metadata.name);
    })
}
function setActiveProject(user, projectName, clearContext) {
    return loadProject(projectName).then(function(project) {
        var globalProjectSettings = settings.get("projects")||{};
        globalProjectSettings.activeProject = project.name;
        return settings.set("projects",globalProjectSettings).then(function() {
            log.info(log._("storage.localfilesystem.projects.changing-project",{project:(activeProject&&activeProject.name)||"none"}));
            log.info(log._("storage.localfilesystem.flows-file",{path:flowsFullPath}));
            // console.log("Updated file targets to");
            // console.log(flowsFullPath)
            // console.log(credentialsFile)
            return reloadActiveProject("loaded", clearContext);
        })
    });
}

function initialiseProject(user, project, data) {
    if (!activeProject || activeProject.name !== project) {
        // TODO standardise
        throw new Error("Cannot initialise inactive project");
    }
    return activeProject.initialise(user,data).then(function(result) {
        flowsFullPath = activeProject.getFlowFile();
        flowsFileBackup = activeProject.getFlowFileBackup();
        credentialsFile = activeProject.getCredentialsFile();
        credentialsFileBackup = activeProject.getCredentialsFileBackup();
        runtime.nodes.setCredentialSecret(activeProject.credentialSecret);
        return reloadActiveProject("updated");
    });
}
function updateProject(user, project, data) {
    if (!activeProject || activeProject.name !== project) {
        // TODO standardise
        throw new Error("Cannot update inactive project");
    }
    // In case this triggers a credential secret change
    var isReset = data.resetCredentialSecret;
    var wasInvalid = activeProject.credentialSecretInvalid;

    return activeProject.update(user,data).then(function(result) {

        if (result.flowFilesChanged) {
            flowsFullPath = activeProject.getFlowFile();
            flowsFileBackup = activeProject.getFlowFileBackup();
            credentialsFile = activeProject.getCredentialsFile();
            credentialsFileBackup = activeProject.getCredentialsFileBackup();
            return reloadActiveProject("updated");
        } else if (result.credentialSecretChanged) {
            if (isReset || !wasInvalid) {
                if (isReset) {
                    runtime.nodes.clearCredentials();
                }
                runtime.nodes.setCredentialSecret(activeProject.credentialSecret);
                return runtime.nodes.exportCredentials()
                    .then(runtime.storage.saveCredentials)
                    .then(function() {
                        if (wasInvalid) {
                            return reloadActiveProject("updated");
                        }
                    });
            } else if (wasInvalid) {
                return reloadActiveProject("updated");
            }
        }
    });
}
function setCredentialSecret(data) { //existingSecret,secret) {
    var isReset = data.resetCredentialSecret;
    var wasInvalid = activeProject.credentialSecretInvalid;
    return activeProject.update(data).then(function() {
        if (isReset || !wasInvalid) {
            if (isReset) {
                runtime.nodes.clearCredentials();
            }
            runtime.nodes.setCredentialSecret(activeProject.credentialSecret);
            return runtime.nodes.exportCredentials()
                .then(runtime.storage.saveCredentials)
                .then(function() {
                    if (wasInvalid) {
                        return reloadActiveProject("updated");
                    }
                });
        } else if (wasInvalid) {
            return reloadActiveProject("updated");
        }
    })
}


var initialFlowLoadComplete = false;

var flowsFile;
var flowsFullPath;
var flowsFileExists = false;
var flowsFileBackup;
var credentialsFile;
var credentialsFileBackup;

async function getFlows() {
    if (!initialFlowLoadComplete) {
        initialFlowLoadComplete = true;
        log.info(log._("storage.localfilesystem.user-dir",{path:settings.userDir}));

        if (projectsEnabled) {
            log.info(log._("storage.localfilesystem.projects.projects-directory", {projectsDirectory: projectsDir}));
        }

        if (activeProject) {
            // At this point activeProject will be a string, so go load it and
            // swap in an instance of Project
            return loadProject(activeProject).then(function() {
                log.info(log._("storage.localfilesystem.projects.active-project",{project:activeProject.name||"none"}));
                log.info(log._("storage.localfilesystem.flows-file",{path:flowsFullPath}));
                return getFlows();
            });
        } else {
            if (projectsEnabled) {
                log.warn(log._("storage.localfilesystem.projects.no-active-project"))
            } else {
                projectLogMessages.forEach(log.warn);
            }
            if (usingHostName) { log.warn(log._("storage.localfilesystem.warn_name")) };
            log.info(log._("storage.localfilesystem.flows-file",{path:flowsFullPath}));
        }
    }
    if (activeProject) {
        var error;
        if (activeProject.isEmpty()) {
            log.warn("Project repository is empty");
            error = new Error("Project repository is empty");
            error.code = "project_empty";
            throw error;
        }
        if (activeProject.missingFiles && activeProject.missingFiles.indexOf('package.json') !== -1) {
            log.warn("Project missing package.json");
            error = new Error("Project missing package.json");
            error.code = "missing_package_file";
            throw error;
        }
        if (!activeProject.getFlowFile()) {
            log.warn("Project has no flow file");
            error = new Error("Project has no flow file");
            error.code = "missing_flow_file";
            throw error;
        }
        if (activeProject.isMerging()) {
            log.warn("Project has unmerged changes");
            error = new Error("Project has unmerged changes. Cannot load flows");
            error.code = "git_merge_conflict";
            throw error;
        }

    }
    return util.readFile(flowsFullPath,flowsFileBackup,null,'flow').then(function(result) {
        if (result === null) {
            flowsFileExists = false;
            return [];
        }
        flowsFileExists = true;
        return result;
    });
}

async function saveFlows(flows, user) {
    if (settings.readOnly) {
        return
    }
    if (activeProject && activeProject.isMerging()) {
        var error = new Error("Project has unmerged changes. Cannot deploy new flows");
        error.code = "git_merge_conflict";
        throw error;
    }

    flowsFileExists = true;

    var flowData;

    if (settings.flowFilePretty || (activeProject && settings.flowFilePretty !== false) ) {
        // Pretty format if option enabled, or using Projects and not explicitly disabled
        flowData = JSON.stringify(flows,null,4);
    } else {
        flowData = JSON.stringify(flows);
    }
    return util.writeFile(flowsFullPath, flowData, flowsFileBackup).then(() => {
        var gitSettings = getUserGitSettings(user) || {};
        if (activeProject) {
            var workflowMode = (gitSettings.workflow||{}).mode || settings.editorTheme.projects.workflow.mode;
            if (workflowMode === 'auto') {
                return activeProject.stageFile([flowsFullPath, credentialsFile]).then(() => {
                    return activeProject.status(user, false).then((result) => {
                        const items = Object.values(result.files || {});
                        // check if saved flow make modification to repository
                        if (items.findIndex((item) => (item.status === "M ")) < 0) {
                            return Promise.resolve();
                        }
                        return activeProject.commit(user,{message:"Update flow files"})
                    });
                });
            }
        }
    });
}

function getCredentials() {
    return util.readFile(credentialsFile,credentialsFileBackup,{},'credentials');
}

async function saveCredentials(credentials) {
    if (settings.readOnly) {
        return;
    }

    var credentialData;
    if (settings.flowFilePretty || (activeProject && settings.flowFilePretty !== false) ) {
        // Pretty format if option enabled, or using Projects and not explicitly disabled
        credentialData = JSON.stringify(credentials,null,4);
    } else {
        credentialData = JSON.stringify(credentials);
    }
    return util.writeFile(credentialsFile, credentialData, credentialsFileBackup);
}

function getFlowFilename() {
    if (flowsFullPath) {
        return fspath.basename(flowsFullPath);
    }
}
function getCredentialsFilename() {
    if (flowsFullPath) {
        return fspath.basename(credentialsFile);
    }
}

module.exports = {
    init: init,
    listProjects: listProjects,
    getActiveProject: getActiveProject,
    setActiveProject: setActiveProject,
    getProject: getProject,
    deleteProject: deleteProject,
    createProject: createProject,
    initialiseProject: initialiseProject,
    updateProject: updateProject,
    getFiles: getFiles,
    getFile: getFile,
    revertFile: revertFile,
    stageFile: stageFile,
    unstageFile: unstageFile,
    commit: commit,
    getFileDiff: getFileDiff,
    getCommits: getCommits,
    getCommit: getCommit,
    push: push,
    pull: pull,
    getStatus:getStatus,
    resolveMerge: resolveMerge,
    abortMerge: abortMerge,
    getBranches: getBranches,
    deleteBranch: deleteBranch,
    setBranch: setBranch,
    getBranchStatus:getBranchStatus,
    getRemotes: getRemotes,
    addRemote: addRemote,
    removeRemote: removeRemote,
    updateRemote: updateRemote,
    getFlowFilename: getFlowFilename,
    flowFileExists: function() { return flowsFileExists },
    getCredentialsFilename: getCredentialsFilename,
    getGlobalGitUser: function() { return globalGitUser },
    getFlows: getFlows,
    saveFlows: saveFlows,
    getCredentials: getCredentials,
    saveCredentials: saveCredentials,

    ssh: sshTools

};
