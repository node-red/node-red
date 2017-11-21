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
var when = require('when');
var fspath = require("path");
var nodeFn = require('when/node/function');
var crypto = require('crypto');

var storageSettings = require("../settings");
var util = require("../util");
var gitTools = require("./git");

var Projects = require("./Project");

var settings;
var runtime;

var projectsDir;
var activeProject

function init(_settings, _runtime) {
    settings = _settings;
    runtime = _runtime;
    log = runtime.log;
    gitTools.init(_settings, _runtime);

    Projects.init(settings,runtime);

    projectsDir = fspath.join(settings.userDir,"projects");

    if (settings.flowFile) {
        flowsFile = settings.flowFile;
        // handle Unix and Windows "C:\"
        if ((flowsFile[0] == "/") || (flowsFile[1] == ":")) {
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
    }
    var ffExt = fspath.extname(flowsFullPath);
    var ffBase = fspath.basename(flowsFullPath,ffExt);

    flowsFileBackup = getBackupFilename(flowsFullPath);
    credentialsFile = fspath.join(settings.userDir,ffBase+"_cred"+ffExt);
    credentialsFileBackup = getBackupFilename(credentialsFile)

    if (!settings.readOnly) {
        return fs.ensureDir(projectsDir)
             //TODO: this is accessing settings from storage directly as settings
             //      has not yet been initialised. That isn't ideal - can this be deferred?
            .then(storageSettings.getSettings)
            .then(function(globalSettings) {
                if (!globalSettings.projects) {
                    // TODO: Migration Case
                    console.log("TODO: Migration from single file to project");
                    globalSettings.projects = {
                        activeProject: "",
                        projects: {}
                    }
                    return storageSettings.saveSettings(globalSettings);
                } else {
                    activeProject = globalSettings.projects.activeProject;
                }
            });
    } else {
        return when.resolve();
    }
}

function getBackupFilename(filename) {
    var ffName = fspath.basename(filename);
    var ffDir = fspath.dirname(filename);
    return fspath.join(ffDir,"."+ffName+".backup");
}

function loadProject(name) {
    return Projects.get(name).then(function(project) {
        activeProject = project;
        flowsFullPath = project.getFlowFile();
        flowsFileBackup = project.getFlowFileBackup();
        credentialsFile = project.getCredentialsFile();
        credentialsFileBackup = project.getCredentialsFileBackup();
        return project;
    })
}

function getProject(name) {
    checkActiveProject(name);
    //return when.resolve(activeProject.info);
    return Projects.get(name);
}

function checkActiveProject(project) {
    if (!activeProject || activeProject.name !== project) {
        //TODO: throw better err
        throw new Error("Cannot operate on inactive project wanted:"+project+" current:"+(activeProject&&activeProject.name));
    }
}
function getFiles(project) {
    checkActiveProject(project);
    return activeProject.getFiles();
}
function stageFile(project,file) {
    checkActiveProject(project);
    return activeProject.stageFile(file);
}
function unstageFile(project,file) {
    checkActiveProject(project);
    return activeProject.unstageFile(file);
}
function commit(project,options) {
    checkActiveProject(project);
    return activeProject.commit(options);
}
function getFileDiff(project,file,type) {
    checkActiveProject(project);
    return activeProject.getFileDiff(file,type);
}
function getCommits(project,options) {
    checkActiveProject(project);
    return activeProject.getCommits(options);
}
function getCommit(project,sha) {
    checkActiveProject(project);
    return activeProject.getCommit(sha);
}

function getFile(project,filePath,sha) {
    checkActiveProject(project);
    return activeProject.getFile(filePath,sha);
}
function push(project,remoteBranchName,setRemote) {
    checkActiveProject(project);
    return activeProject.push(remoteBranchName,setRemote);
}
function pull(project,remoteBranchName,setRemote) {
    checkActiveProject(project);
    return activeProject.pull(remoteBranchName,setRemote).then(reloadActiveProject);
}
function getStatus(project) {
    checkActiveProject(project);
    return activeProject.status();
}
function resolveMerge(project,file,resolution) {
    checkActiveProject(project);
    return activeProject.resolveMerge(file,resolution);
}
function abortMerge(project) {
    checkActiveProject(project);
    return activeProject.abortMerge().then(reloadActiveProject);
}
function getBranches(project,remote) {
    checkActiveProject(project);
    return activeProject.getBranches(remote);
}
function setBranch(project,branchName,isCreate) {
    checkActiveProject(project);
    return activeProject.setBranch(branchName,isCreate).then(reloadActiveProject);
}
function getBranchStatus(project,branchName) {
    checkActiveProject(project);
    return activeProject.getBranchStatus(branchName);
}
function getActiveProject() {
    return activeProject;
}

function reloadActiveProject() {
    return runtime.nodes.stopFlows().then(function() {
        return runtime.nodes.loadFlows(true).then(function() {
            runtime.events.emit("runtime-event",{id:"project-change",payload:{ project: activeProject.name}});
        }).catch(function(err) {
            // We're committed to the project change now, so notify editors
            // that it has changed.
            runtime.events.emit("runtime-event",{id:"project-change",payload:{ project: activeProject.name}});
            throw err;
        });
    });
}
function createProject(metadata) {
    return Projects.create(metadata).then(function(p) {
        return setActiveProject(p.name);
    }).then(function() {
        return getProject(metadata.name);
    })
}
function setActiveProject(projectName) {
    return loadProject(projectName).then(function(project) {
        var globalProjectSettings = settings.get("projects");
        globalProjectSettings.activeProject = project.name;
        return settings.set("projects",globalProjectSettings).then(function() {
            log.info(log._("storage.localfilesystem.changing-project",{project:activeProject||"none"}));
            log.info(log._("storage.localfilesystem.flows-file",{path:flowsFullPath}));

            // console.log("Updated file targets to");
            // console.log(flowsFullPath)
            // console.log(credentialsFile)
            return reloadActiveProject();
        })
    });
}
function updateProject(project,data) {
    if (!activeProject || activeProject.name !== project) {
        // TODO standardise
        throw new Error("Cannot update inactive project");
    }
    // In case this triggers a credential secret change
    var isReset = data.resetCredentialSecret;
    var wasInvalid = activeProject.credentialSecretInvalid;

    return activeProject.update(data).then(function(result) {

        if (result.flowFilesChanged) {
            flowsFullPath = activeProject.getFlowFile();
            flowsFileBackup = activeProject.getFlowFileBackup();
            credentialsFile = activeProject.getCredentialsFile();
            credentialsFileBackup = activeProject.getCredentialsFileBackup();
            return reloadActiveProject();
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
                            return reloadActiveProject();
                        }
                    });
            } else if (wasInvalid) {
                return reloadActiveProject();
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
                        return reloadActiveProject();
                    }
                });
        } else if (wasInvalid) {
            return reloadActiveProject();
        }
    })
}


var initialFlowLoadComplete = false;

var flowsFile;
var flowsFullPath;
var flowsFileBackup;
var credentialsFile;
var credentialsFileBackup;

function getFlows() {
    if (!initialFlowLoadComplete) {
        initialFlowLoadComplete = true;
        log.info(log._("storage.localfilesystem.user-dir",{path:settings.userDir}));
        if (activeProject) {
            return loadProject(activeProject).then(function() {
                log.info(log._("storage.localfilesystem.active-project",{project:activeProject.name||"none"}));
                log.info(log._("storage.localfilesystem.flows-file",{path:flowsFullPath}));
                return getFlows();
            });
        } else {
            log.info(log._("storage.localfilesystem.flows-file",{path:flowsFullPath}));
        }
    }
    if (activeProject) {
        if (!activeProject.getFlowFile()) {
            log.warn("NLS: project has no flow file");
            var error = new Error("NLS: project has no flow file");
            error.code = "missing_flow_file";
            return when.reject(error);
        }
    }
    return util.readFile(flowsFullPath,flowsFileBackup,[],'flow');
}

function saveFlows(flows) {
    if (settings.readOnly) {
        return when.resolve();
    }

    try {
        fs.renameSync(flowsFullPath,flowsFileBackup);
    } catch(err) {
    }

    var flowData;

    if (settings.flowFilePretty) {
        flowData = JSON.stringify(flows,null,4);
    } else {
        flowData = JSON.stringify(flows);
    }
    return util.writeFile(flowsFullPath, flowData);
}

function getCredentials() {
    return util.readFile(credentialsFile,credentialsFileBackup,{},'credentials');
}

function saveCredentials(credentials) {
    if (settings.readOnly) {
        return when.resolve();
    }

    try {
        fs.renameSync(credentialsFile,credentialsFileBackup);
    } catch(err) {
    }
    var credentialData;
    if (settings.flowFilePretty) {
        credentialData = JSON.stringify(credentials,null,4);
    } else {
        credentialData = JSON.stringify(credentials);
    }
    return util.writeFile(credentialsFile, credentialData);
}


module.exports = {
    init: init,
    listProjects: Projects.list,
    getActiveProject: getActiveProject,
    setActiveProject: setActiveProject,
    getProject: getProject,
    createProject: createProject,
    updateProject: updateProject,
    getFiles: getFiles,
    getFile: getFile,
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
    setBranch: setBranch,
    getBranchStatus:getBranchStatus,

    getFlows: getFlows,
    saveFlows: saveFlows,
    getCredentials: getCredentials,
    saveCredentials: saveCredentials

};
