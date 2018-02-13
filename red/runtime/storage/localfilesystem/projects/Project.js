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
var os = require('os');

var gitTools = require("./git");
var util = require("../util");
var defaultFileSet = require("./defaultFileSet");
var sshKeys = require("./ssh");
var settings;
var runtime;
var log;

var projectsDir;

var authCache = require("./git/authCache");

// TODO: DRY - red/api/editor/sshkeys !
function getSSHKeyUsername(userObj) {
    var username = '__default';
    if ( userObj && userObj.name ) {
        username = userObj.name;
    }
    return username;
}
function getGitUser(user) {
    var username;
    if (!user) {
        username = "_";
    } else {
        username = user.username;
    }
    var userSettings = settings.getUserSettings(username);
    if (userSettings && userSettings.git) {
        return userSettings.git.user;
    }
    return null;
}
function Project(name) {
    this.name = name;
    this.path = fspath.join(projectsDir,name);
    this.paths = {};
    this.files = {};
    this.auth = {origin:{}};

    this.missingFiles = [];

    this.credentialSecret = null;
}
Project.prototype.load = function () {
    var project = this;
    var globalProjectSettings = settings.get("projects");
// console.log(globalProjectSettings)
    var projectSettings = {};
    if (globalProjectSettings) {
        projectSettings = globalProjectSettings.projects[this.name]||{};
    }

    this.credentialSecret = projectSettings.credentialSecret;
    this.git = projectSettings.git || { user:{} };

    // this.paths.flowFile = fspath.join(this.path,"flow.json");
    // this.paths.credentialsFile = fspath.join(this.path,"flow_cred.json");

    var promises = [];
    return checkProjectFiles(project).then(function(missingFiles) {
        if (missingFiles.length > 0) {
            project.missingFiles = missingFiles;
        }
        if (missingFiles.indexOf('package.json') === -1) {
            project.paths['package.json'] = fspath.join(project.path,"package.json");
            promises.push(fs.readFile(project.paths['package.json'],"utf8").then(function(content) {
                try {
                    project.package = util.parseJSON(content);
                    if (project.package.hasOwnProperty('node-red')) {
                        if (project.package['node-red'].hasOwnProperty('settings')) {
                            project.paths.flowFile = project.package['node-red'].settings.flowFile;
                            project.paths.credentialsFile = project.package['node-red'].settings.credentialsFile;
                        }
                    } else {
                        // TODO: package.json doesn't have a node-red section
                        //       is that a bad thing?
                    }
                } catch(err) {
                    // package.json isn't valid JSON... is a merge underway?
                    project.package = {};
                }
            }));
        } else {
            project.package = {};
        }
        if (missingFiles.indexOf('README.md') === -1) {
            project.paths['README.md'] = fspath.join(project.path,"README.md");
            promises.push(fs.readFile(project.paths['README.md'],"utf8").then(function(content) {
                project.description = content;
            }));
        } else {
            project.description = "";
        }
        // if (missingFiles.indexOf('flow.json') !== -1) {
        //     console.log("MISSING FLOW FILE");
        // } else {
        //     project.paths.flowFile = fspath.join(project.path,"flow.json");
        // }
        // if (missingFiles.indexOf('flow_cred.json') !== -1) {
        //     console.log("MISSING CREDS FILE");
        // } else {
        //     project.paths.credentialsFile = fspath.join(project.path,"flow_cred.json");
        // }

        promises.push(project.loadRemotes());

        return when.settle(promises).then(function(results) {
            return project;
        })
    });
};

Project.prototype.initialise = function(user,data) {
    var project = this;
    if (!this.empty) {
        throw new Error("Cannot initialise non-empty project");
    }
    var files = Object.keys(defaultFileSet);
    var promises = [];

    if (data.hasOwnProperty('credentialSecret')) {
        var projects = settings.get('projects');
        projects.projects[project.name] = projects.projects[project.name] || {};
        projects.projects[project.name].credentialSecret = data.credentialSecret;
        promises.push(settings.set('projects',projects));
    }

    project.files.flow = data.files.flow;
    project.files.credentials = data.files.credentials;
    var flowFilePath = fspath.join(project.path,project.files.flow);
    var credsFilePath = getCredentialsFilename(flowFilePath);
    promises.push(util.writeFile(flowFilePath,"[]"));
    promises.push(util.writeFile(credsFilePath,"{}"));
    files.push(project.files.flow);
    files.push(project.files.credentials);
    for (var file in defaultFileSet) {
        if (defaultFileSet.hasOwnProperty(file)) {
            promises.push(util.writeFile(fspath.join(project.path,file),defaultFileSet[file](project)));
        }
    }

    return when.all(promises).then(function() {
        return gitTools.stageFile(project.path,files);
    }).then(function() {
        return gitTools.commit(project.path,"Create project files",getGitUser(user));
    }).then(function() {
        return project.load()
    })
}

Project.prototype.loadRemotes = function() {
    var project = this;
    return gitTools.getRemotes(project.path).then(function(remotes) {
        project.remotes = remotes;
    }).then(function() {
        project.branches = {};
        return project.status();
    }).then(function() {
        if (project.remotes) {
            var allRemotes = Object.keys(project.remotes);
            var match = "";
            if (project.branches.remote) {
                allRemotes.forEach(function(remote) {
                    if (project.branches.remote.indexOf(remote) === 0 && match.length < remote.length) {
                        match = remote;
                    }
                });
                project.currentRemote = project.parseRemoteBranch(project.branches.remote).remote;
            }
        } else {
            delete project.currentRemote;
        }
    });
}

Project.prototype.parseRemoteBranch = function (remoteBranch) {
    if (!remoteBranch) {
        return {}
    }
    var project = this;
    var allRemotes = Object.keys(project.remotes);
    var match = "";
    allRemotes.forEach(function(remote) {
        if (remoteBranch.indexOf(remote) === 0 && match.length < remote.length) {
            match = remote;
        }
    });
    return {
        remote: match,
        branch: remoteBranch.substring(match.length+1)
    }

};

Project.prototype.isEmpty = function () {
    return this.empty;
};
Project.prototype.isMerging = function() {
    return this.merging;
}

Project.prototype.update = function (user, data) {
    var username;
    if (!user) {
        username = "_";
    } else {
        username = user.username;
    }

    var promises = [];
    var project = this;
    var saveSettings = false;
    var saveREADME = false;
    var savePackage = false;
    var flowFilesChanged = false;
    var credentialSecretChanged = false;

    var globalProjectSettings = settings.get("projects");
    if (!globalProjectSettings.projects.hasOwnProperty(this.name)) {
        globalProjectSettings.projects[this.name] = {};
        saveSettings = true;
    }


    if (data.credentialSecret && data.credentialSecret !== this.credentialSecret) {
        var existingSecret = data.currentCredentialSecret;
        var isReset = data.resetCredentialSecret;
        var secret = data.credentialSecret;

        // console.log("updating credentialSecret");
        // console.log("request:");
        // console.log(JSON.stringify(data,"",4));
        // console.log(" this.credentialSecret",this.credentialSecret);
        // console.log(" this.info", this.info);

        if (!isReset && // not a reset
            this.credentialSecret && // key already set
            !this.credentialSecretInvalid && // key not invalid
            this.credentialSecret !== existingSecret) { // key doesn't match provided existing key
                var e = new Error("Cannot change credentialSecret without current key");
                e.code = "missing_current_credential_key";
                return when.reject(e);
        }
        this.credentialSecret = secret;

        globalProjectSettings.projects[this.name].credentialSecret = project.credentialSecret;
        delete this.credentialSecretInvalid;
        saveSettings = true;
        credentialSecretChanged = true;
    }

    if (data.hasOwnProperty('description')) {
        saveREADME = true;
        this.description = data.description;
    }
    if (data.hasOwnProperty('dependencies')) {
        savePackage = true;
        this.package.dependencies = data.dependencies;
    }
    if (data.hasOwnProperty('summary')) {
        savePackage = true;
        this.package.description = data.summary;
    }

    if (data.hasOwnProperty('git')) {
        if (data.git.hasOwnProperty('user')) {
            globalProjectSettings.projects[this.name].git = globalProjectSettings.projects[this.name].git || {};
            globalProjectSettings.projects[this.name].git.user = globalProjectSettings.projects[this.name].git.user || {};
            globalProjectSettings.projects[this.name].git.user[username] = {
                name: data.git.user.name,
                email: data.git.user.email
            }
            this.git.user[username] = {
                name: data.git.user.name,
                email: data.git.user.email
            }
            saveSettings = true;
        }
        if (data.git.hasOwnProperty('remotes')) {
            var remoteNames = Object.keys(data.git.remotes);
            var remotesChanged = false;
            var modifyRemotesPromise = Promise.resolve();
            remoteNames.forEach(function(name) {
                if (data.git.remotes[name].removed) {
                    remotesChanged = true;
                    modifyRemotesPromise = modifyRemotesPromise.then(function() { gitTools.removeRemote(project.path,name) });
                } else {
                    if (data.git.remotes[name].url) {
                        remotesChanged = true;
                        modifyRemotesPromise = modifyRemotesPromise.then(function() { gitTools.addRemote(project.path,name,data.git.remotes[name])});
                    }
                    if (data.git.remotes[name].username && data.git.remotes[name].password) {
                        var url = data.git.remotes[name].url || project.remotes[name].fetch;
                        authCache.set(project.name,url,username,data.git.remotes[name]);
                    }
                }
            })
            if (remotesChanged) {
                modifyRemotesPromise = modifyRemotesPromise.then(function() {
                    return project.loadRemotes();
                });
                promises.push(modifyRemotesPromise);
            }
        }
    }

    if (data.hasOwnProperty('files')) {
        this.package['node-red'] = this.package['node-red'] || { settings: {}};
        if (data.files.hasOwnProperty('flow') && this.package['node-red'].settings.flowFile !== data.files.flow) {
            this.paths.flowFile = data.files.flow;
            this.package['node-red'].settings.flowFile = data.files.flow;
            savePackage = true;
            flowFilesChanged = true;
        }
        if (data.files.hasOwnProperty('credentials') && this.package['node-red'].settings.credentialsFile !== data.files.credentials) {
            this.paths.credentialsFile = data.files.credentials;
            this.package['node-red'].settings.credentialsFile = data.files.credentials;
            // Don't know if the credSecret is invalid or not so clear the flag
            delete this.credentialSecretInvalid;

            savePackage = true;
            flowFilesChanged = true;
        }
    }
    if (saveSettings) {
        promises.push(settings.set("projects",globalProjectSettings));
    }
    if (saveREADME) {
        promises.push(util.writeFile(this.paths['README.md'], this.description));
    }
    if (savePackage) {
        promises.push(util.writeFile(this.paths['package.json'], JSON.stringify(this.package,"",4)));
    }
    return when.settle(promises).then(function(res) {
        return {
            flowFilesChanged: flowFilesChanged,
            credentialSecretChanged: credentialSecretChanged
        }
    })
};

Project.prototype.getFiles = function () {
    return gitTools.getFiles(this.path).catch(function(err) {
        if (/ambiguous argument/.test(err.message)) {
            return {};
        }
        throw err;
    });
};
Project.prototype.stageFile = function(file) {
    return gitTools.stageFile(this.path,file);
};
Project.prototype.unstageFile = function(file) {
    return gitTools.unstageFile(this.path,file);
}
Project.prototype.commit = function(user, options) {
    var self = this;
    return gitTools.commit(this.path,options.message,getGitUser(user)).then(function() {
        if (self.merging) {
            self.merging = false;
            return
        }
    });
}
Project.prototype.getFileDiff = function(file,type) {
    return gitTools.getFileDiff(this.path,file,type);
}
Project.prototype.getCommits = function(options) {
    return gitTools.getCommits(this.path,options).catch(function(err) {
        if (/bad default revision/i.test(err.message) || /ambiguous argument/i.test(err.message) || /does not have any commits yet/i.test(err.message)) {
            return {
                count:0,
                commits:[],
                total: 0
            }
        }
        throw err;
    })
}
Project.prototype.getCommit = function(sha) {
    return gitTools.getCommit(this.path,sha);
}
Project.prototype.getFile = function (filePath,treeish) {
    if (treeish !== "_") {
        return gitTools.getFile(this.path, filePath, treeish);
    } else {
        return fs.readFile(fspath.join(this.path,filePath),"utf8");
    }
};
Project.prototype.revertFile = function (filePath) {
    var self = this;
    return gitTools.revertFile(this.path, filePath).then(function() {
        return self.load();
    });
};



Project.prototype.status = function(user, includeRemote) {
    var self = this;

    var fetchPromise;
    if (this.remotes && includeRemote) {
        fetchPromise = gitTools.getRemoteBranch(self.path).then(function(remoteBranch) {
            if (remoteBranch) {
                var allRemotes = Object.keys(self.remotes);
                var match = "";
                allRemotes.forEach(function(remote) {
                    if (remoteBranch.indexOf(remote) === 0 && match.length < remote.length) {
                        match = remote;
                    }
                })
                return self.fetch(user, match);
            }
        });
    } else {
        fetchPromise = Promise.resolve();
    }

    var completeStatus = function(fetchError) {
        var promises = [
            gitTools.getStatus(self.path),
            fs.exists(fspath.join(self.path,".git","MERGE_HEAD"))
        ];
        return when.all(promises).then(function(results) {
            var result = results[0];
            if (results[1]) {
                result.merging = true;
                if (!self.merging) {
                    self.merging = true;
                    runtime.events.emit("runtime-event",{
                        id:"runtime-state",
                        payload:{
                            type:"warning",
                            error:"git_merge_conflict",
                            project:self.name,
                            text:"notification.warnings.git_merge_conflict"
                        },
                        retain:true}
                    );
                }
            } else {
                self.merging = false;
            }
            self.branches.local = result.branches.local;
            self.branches.remote = result.branches.remote;
            if (fetchError && !/ambiguous argument/.test(fetchError.message)) {
                result.branches.remoteError = {
                    remote: fetchError.remote,
                    code: fetchError.code
                }
            }
            if (result.commits.total === 0 && Object.keys(result.files).length === 0) {
                if (!self.empty) {
                    runtime.events.emit("runtime-event",{
                        id:"runtime-state",
                        payload:{
                            type:"warning",
                            error:"project_empty",
                            text:"notification.warnings.project_empty"},
                            retain:true
                        }
                    );
                }
                self.empty = true;
            } else {
                if (self.empty) {
                    if (self.paths.flowFile) {
                        runtime.events.emit("runtime-event",{id:"runtime-state",retain:true});
                    } else {
                        runtime.events.emit("runtime-event",{
                            id:"runtime-state",
                            payload:{
                                type:"warning",
                                error:"missing_flow_file",
                                text:"notification.warnings.missing_flow_file"},
                                retain:true
                            }
                        );
                    }
                }
                delete self.empty;
            }
            return result;
        }).catch(function(err) {
            if (/ambiguous argument/.test(err.message)) {
                return {
                    files:{},
                    commits:{total:0},
                    branches:{}
                };
            }
            throw err;
        });
    }
    return fetchPromise.then(completeStatus).catch(function(e) {
        // if (e.code !== 'git_auth_failed') {
        //     console.log("Fetch failed");
        //     console.log(e);
        // }
        return completeStatus(e);
    })
};

Project.prototype.push = function (user,remoteBranchName,setRemote) {
    var username;
    if (!user) {
        username = "_";
    } else {
        username = user.username;
    }
    var remote = this.parseRemoteBranch(remoteBranchName||this.branches.remote);
    return gitTools.push(this.path, remote.remote || this.currentRemote,remote.branch, setRemote, authCache.get(this.name,this.remotes[remote.remote || this.currentRemote].fetch,username));
};

Project.prototype.pull = function (user,remoteBranchName,setRemote,allowUnrelatedHistories) {
    var username;
    if (!user) {
        username = "_";
    } else {
        username = user.username;
    }
    var self = this;
    if (setRemote) {
        return gitTools.setUpstream(this.path, remoteBranchName).then(function() {
            self.currentRemote = self.parseRemoteBranch(remoteBranchName).remote;
            return gitTools.pull(self.path, null, null, allowUnrelatedHistories, authCache.get(self.name,self.remotes[self.currentRemote].fetch,username),getGitUser(user));
        })
    } else {
        var remote = this.parseRemoteBranch(remoteBranchName);
        return gitTools.pull(this.path, remote.remote, remote.branch, allowUnrelatedHistories, authCache.get(this.name,this.remotes[remote.remote||self.currentRemote].fetch,username),getGitUser(user));
    }
};

Project.prototype.resolveMerge = function (file,resolutions) {
    var filePath = fspath.join(this.path,file);
    var self = this;
    if (typeof resolutions === 'string') {
        return util.writeFile(filePath, resolutions).then(function() {
            return self.stageFile(file);
        })
    }
    return fs.readFile(filePath,"utf8").then(function(content) {
        var lines = content.split("\n");
        var result = [];
        var ignoreBlock = false;
        var currentBlock;
        for (var i=1;i<=lines.length;i++) {
            if (resolutions.hasOwnProperty(i)) {
                currentBlock = resolutions[i];
                if (currentBlock.selection === "A") {
                    ignoreBlock = false;
                } else {
                    ignoreBlock = true;
                }
                continue;
            }
            if (currentBlock) {
                if (currentBlock.separator === i) {
                    if (currentBlock.selection === "A") {
                        ignoreBlock = true;
                    } else {
                        ignoreBlock = false;
                    }
                    continue;
                } else if (currentBlock.changeEnd === i) {
                    currentBlock = null;
                    continue;
                } else if (ignoreBlock) {
                    continue;
                }
            }
            result.push(lines[i-1]);
        }
        var finalResult = result.join("\n");
        return util.writeFile(filePath,finalResult).then(function() {
            return self.stageFile(file);
        })
    });
};
Project.prototype.abortMerge = function () {
    var self = this;
    return gitTools.abortMerge(this.path).then(function() {
        self.merging = false;
    })
};

Project.prototype.getBranches = function (user, isRemote) {
    var self = this;
    var fetchPromise;
    if (isRemote) {
        fetchPromise = self.fetch(user);
    } else {
        fetchPromise = Promise.resolve();
    }
    return fetchPromise.then(function() {
        return gitTools.getBranches(self.path,isRemote);
    });
};

Project.prototype.deleteBranch = function (user, branch, isRemote, force) {
    // TODO: isRemote==true support
    // TODO: make sure we don't try to delete active branch
    return gitTools.deleteBranch(this.path,branch,isRemote, force);
};

Project.prototype.fetch = function(user,remoteName) {
    var username;
    if (!user) {
        username = "_";
    } else {
        username = user.username;
    }
    var project = this;
    if (remoteName) {
        return gitTools.fetch(project.path,remoteName,authCache.get(project.name,project.remotes[remoteName].fetch,username)).catch(function(err) {
            err.remote = remoteName;
            throw err;
        })
    } else {
        var remotes = Object.keys(this.remotes);
        var promise = Promise.resolve();
        remotes.forEach(function(remote) {
            promise = promise.then(function() {
                return gitTools.fetch(project.path,remote,authCache.get(project.name,project.remotes[remote].fetch,username))
            }).catch(function(err) {
                err.remote = remote;
                throw err;
            })
        });
        return promise;
    }
}

Project.prototype.setBranch = function (branchName, isCreate) {
    var self = this;
    return gitTools.checkoutBranch(this.path, branchName, isCreate).then(function() {
        return self.load();
    })
};
Project.prototype.getBranchStatus = function (branchName) {
    return gitTools.getBranchStatus(this.path,branchName);
};



Project.prototype.getRemotes = function (user) {
    return gitTools.getRemotes(this.path).then(function(remotes) {
        var result = [];
        for (var name in remotes) {
            if (remotes.hasOwnProperty(name)) {
                remotes[name].name = name;
                result.push(remotes[name]);
            }
        }
        return {remotes:result};
    })
};
Project.prototype.addRemote = function(user,remote,options) {
    var project = this;
    return gitTools.addRemote(this.path,remote,options).then(function() {
        return project.loadRemotes()
    });
}
Project.prototype.updateRemote = function(user,remote,options) {
    var username;
    if (!user) {
        username = "_";
    } else {
        username = user.username;
    }

    if (options.auth) {
        var url = this.remotes[remote].fetch;
        if (options.auth.keyFile) {
            options.auth.key_path = sshKeys.getPrivateKeyPath(getSSHKeyUsername(user), options.auth.keyFile);
        }
        authCache.set(this.name,url,username,options.auth);
    }
    return Promise.resolve();
}
Project.prototype.removeRemote = function(user, remote) {
    // TODO: if this was the last remote using this url, then remove the authCache
    // details.
    var project = this;
    return gitTools.removeRemote(this.path,remote).then(function() {
        return project.loadRemotes()
    });
}


Project.prototype.getFlowFile = function() {
    // console.log("Project.getFlowFile = ",this.paths.flowFile);
    if (this.paths.flowFile) {
        return fspath.join(this.path,this.paths.flowFile);
    } else {
        return null;
    }
}

Project.prototype.getFlowFileBackup = function() {
    var flowFile = this.getFlowFile();
    if (flowFile) {
        return getBackupFilename(flowFile);
    }
    return null;
}
Project.prototype.getCredentialsFile = function() {
    // console.log("Project.getCredentialsFile = ",this.paths.credentialsFile);
    if (this.paths.credentialsFile) {
        return fspath.join(this.path,this.paths.credentialsFile);
    } else {
        return this.paths.credentialsFile;
    }
}
Project.prototype.getCredentialsFileBackup = function() {
    return getBackupFilename(this.getCredentialsFile());
}

Project.prototype.toJSON = function () {

    return {
        name: this.name,
        summary: this.package.description,
        description: this.description,
        dependencies: this.package.dependencies||{},
        empty: this.empty,
        settings: {
            credentialsEncrypted: (typeof this.credentialSecret === "string"),
            credentialSecretInvalid: this.credentialSecretInvalid
        },
        files: {
            flow: this.paths.flowFile,
            credentials: this.paths.credentialsFile
        },
        git: {
            remotes: this.remotes,
            branches: this.branches
        }
    }
};


function getCredentialsFilename(filename) {
    filename = filename || "undefined";
    // TODO: DRY - ./index.js
    var ffDir = fspath.dirname(filename);
    var ffExt = fspath.extname(filename);
    var ffBase = fspath.basename(filename,ffExt);
    return fspath.join(ffDir,ffBase+"_cred"+ffExt);
}
function getBackupFilename(filename) {
    // TODO: DRY - ./index.js
    filename = filename || "undefined";
    var ffName = fspath.basename(filename);
    var ffDir = fspath.dirname(filename);
    return fspath.join(ffDir,"."+ffName+".backup");
}

function checkProjectExists(project) {
    var projectPath = fspath.join(projectsDir,project);
    return fs.pathExists(projectPath).then(function(exists) {
        if (!exists) {
            var e = new Error("Project not found: "+project);
            e.code = "project_not_found";
            e.project = project;
            throw e;
        }
    });
}

function createProjectDirectory(project) {
    var projectPath = fspath.join(projectsDir,project);
    return fs.ensureDir(projectPath);
}

function deleteProjectDirectory(project) {
    var projectPath = fspath.join(projectsDir,project);
    return fs.remove(projectPath);
}

function createDefaultProject(user, project) {
    var projectPath = fspath.join(projectsDir,project.name);
    // Create a basic skeleton of a project
    return gitTools.initRepo(projectPath).then(function() {
        var promises = [];
        var files = Object.keys(defaultFileSet);
        if (project.files) {
            if (project.files.flow && !/\.\./.test(project.files.flow)) {
                var flowFilePath;
                var credsFilePath;

                if (project.migrateFiles) {
                    var baseFlowFileName = project.files.flow || fspath.basename(project.files.oldFlow);
                    var baseCredentialFileName = project.files.credentials || fspath.basename(project.files.oldCredentials);
                    files.push(baseFlowFileName);
                    files.push(baseCredentialFileName);
                    flowFilePath = fspath.join(projectPath,baseFlowFileName);
                    credsFilePath = fspath.join(projectPath,baseCredentialFileName);
                    if (fs.existsSync(project.files.oldFlow)) {
                        log.trace("Migrating "+project.files.oldFlow+" to "+flowFilePath);
                        promises.push(fs.copy(project.files.oldFlow,flowFilePath));
                    } else {
                        log.trace(project.files.oldFlow+" does not exist - creating blank file");
                        promises.push(util.writeFile(flowFilePath,"[]"));
                    }
                    log.trace("Migrating "+project.files.oldCredentials+" to "+credsFilePath);
                    runtime.nodes.setCredentialSecret(project.credentialSecret);
                    promises.push(runtime.nodes.exportCredentials().then(function(creds) {
                        var credentialData;
                        if (settings.flowFilePretty) {
                            credentialData = JSON.stringify(creds,null,4);
                        } else {
                            credentialData = JSON.stringify(creds);
                        }
                        return util.writeFile(credsFilePath,credentialData);
                    }));
                    delete project.migrateFiles;
                    project.files.flow = baseFlowFileName;
                    project.files.credentials = baseCredentialFileName;
                } else {
                    project.files.credentials = project.files.credentials || getCredentialsFilename(project.files.flow);
                    files.push(project.files.flow);
                    files.push(project.files.credentials);
                    flowFilePath = fspath.join(projectPath,project.files.flow);
                    credsFilePath = getCredentialsFilename(flowFilePath);
                    promises.push(util.writeFile(flowFilePath,"[]"));
                    promises.push(util.writeFile(credsFilePath,"{}"));
                }
            }
        }
        for (var file in defaultFileSet) {
            if (defaultFileSet.hasOwnProperty(file)) {
                promises.push(util.writeFile(fspath.join(projectPath,file),defaultFileSet[file](project)));
            }
        }

        return when.all(promises).then(function() {
            return gitTools.stageFile(projectPath,files);
        }).then(function() {
            return gitTools.commit(projectPath,"Create project",getGitUser(user));
        })
    });
}

function checkProjectFiles(project) {
    var projectPath = project.path;
    var promises = [];
    var paths = [];
    for (var file in defaultFileSet) {
        if (defaultFileSet.hasOwnProperty(file)) {
            paths.push(file);
            promises.push(fs.stat(fspath.join(projectPath,file)));
        }
    }
    return when.settle(promises).then(function(results) {
        var missing = [];
        results.forEach(function(result,i) {
            if (result.state === 'rejected') {
                missing.push(paths[i]);
            }
        });
        return missing;
    }).then(function(missing) {
        // if (createMissing) {
        //     var promises = [];
        //     missing.forEach(function(file) {
        //         promises.push(util.writeFile(fspath.join(projectPath,file),defaultFileSet[file](project)));
        //     });
        //     return promises;
        // } else {
        return missing;
        // }
    });
}

function createProject(user, metadata) {
    var username;
    if (!user) {
        username = "_";
    } else {
        username = user.username;
    }

    var project = metadata.name;
    return new Promise(function(resolve,reject) {
        var projectPath = fspath.join(projectsDir,project);
        fs.stat(projectPath, function(err,stat) {
            if (!err) {
                var e = new Error("NLS: Project already exists");
                e.code = "project_exists";
                return reject(e);
            }
            createProjectDirectory(project).then(function() {
                var projects = settings.get('projects');
                if (!projects) {
                    projects = {
                        projects:{}
                    }
                }
                projects.projects[project] = {};
                if (metadata.hasOwnProperty('credentialSecret')) {
                    projects.projects[project].credentialSecret = metadata.credentialSecret;
                }
                return settings.set('projects',projects);
            }).then(function() {
                if (metadata.git && metadata.git.remotes && metadata.git.remotes.origin) {
                    var originRemote = metadata.git.remotes.origin;
                    var auth;
                    if (originRemote.hasOwnProperty("username") && originRemote.hasOwnProperty("password")) {
                        authCache.set(project,originRemote.url,username,{ // TODO: hardcoded remote name
                                username: originRemote.username,
                                password: originRemote.password
                            }
                        );
                        auth = authCache.get(project,originRemote.url,username);
                    }
                    else if (originRemote.hasOwnProperty("keyFile") && originRemote.hasOwnProperty("passphrase")) {
                        authCache.set(project,originRemote.url,username,{ // TODO: hardcoded remote name
                                key_path: sshKeys.getPrivateKeyPath(getSSHKeyUsername(user), originRemote.keyFile),
                                passphrase: originRemote.passphrase
                            }
                        );
                        auth = authCache.get(project,originRemote.url,username);
                    }
                    return gitTools.clone(originRemote,auth,projectPath);
                } else {
                    return createDefaultProject(user, metadata);
                }
            }).then(function() {
                resolve(getProject(project))
            }).catch(function(err) {
                fs.remove(projectPath,function() {
                    reject(err);
                });
            });
        })
    })
}

function deleteProject(user, name) {
    return checkProjectExists(name).then(function() {
        if (currentProject && currentProject.name === name) {
            var e = new Error("NLS: Can't delete the active project");
            e.code = "cannot_delete_active_project";
            throw e;
        }
        else {
            return deleteProjectDirectory(name).then(function() {
                var projects = settings.get('projects');
                delete projects.projects[name];
                return settings.set('projects', projects);
            });
        }
    });
}

var currentProject;

function getProject(name) {
    return checkProjectExists(name).then(function() {
        if (currentProject && currentProject.name === name) {
            return currentProject;
        }
        currentProject = new Project(name);
        return currentProject.load();
    });
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

function init(_settings, _runtime) {
    settings = _settings;
    runtime = _runtime;
    log = runtime.log;
    projectsDir = fspath.join(settings.userDir,"projects");
    authCache.init();
}

module.exports = {
    init: init,
    get: getProject,
    create: createProject,
    delete: deleteProject,
    list: listProjects

}
