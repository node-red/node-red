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

var gitTools = require("./git");
var util = require("../util");
var defaultFileSet = require("./defaultFileSet");

var settings;
var runtime;
var log;

var projectsDir;

function Project(name) {
    this.name = name;
    this.path = fspath.join(projectsDir,name);
    this.paths = {};
    this.info = {
        name: name,
        settings: {}
    };
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
// console.log(this.name,"credSec",this.credentialSecret )
    if (typeof projectSettings.credentialSecret === "string") {
        this.info.settings.credentialsEncrypted = true;
    } else {
        this.info.settings.credentialsEncrypted = false;
    }
    var promises = [];
    return checkProjectFiles(project.name).then(function(missingFiles) {
        if (missingFiles.length > 0) {
            project.info.missingFiles = missingFiles;
        }
        if (missingFiles.indexOf('package.json') === -1) {
            project.paths['package.json'] = fspath.join(project.path,"package.json");
            promises.push(fs.readFile(project.paths['package.json'],"utf8").then(function(content) {
                project.package = util.parseJSON(content);
                project.info.summary = project.package.description||"";
                project.info.dependencies = project.package.dependencies||{};
            }));
        }
        if (missingFiles.indexOf('README.md') === -1) {
            project.paths['README.md'] = fspath.join(project.path,"README.md");
            promises.push(fs.readFile(project.paths['README.md'],"utf8").then(function(content) {
                project.info.description = content;
            }));
        } else {
            project.info.description = "";
        }

        return when.settle(promises).then(function() {
            return project;
        })
    });
};

Project.prototype.update = function (data) {
    var filesToUpdate = {};
    var promises = [];
    var project = this;

    if (data.credentialSecret) {
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
            !this.info.settings.credentialSecretInvalid && // key not invalid
            this.credentialSecret !== existingSecret) { // key doesn't match provided existing key
                var e = new Error("Cannot change credentialSecret without current key");
                e.code = "missing_current_credential_key";
                throw e;
        }
        this.credentialSecret = secret;

        var globalProjectSettings = settings.get("projects");
        globalProjectSettings.projects[this.name] = globalProjectSettings.projects[this.name]||{}
        globalProjectSettings.projects[this.name].credentialSecret = project.credentialSecret;
        delete this.info.settings.credentialSecretInvalid;

        return settings.set("projects",globalProjectSettings);
    }

    if (data.hasOwnProperty('description')) {
        filesToUpdate[this.paths['README.md']] = function() {
            return data.description;
        };
        this.info.description = data.description;
    }
    if (data.hasOwnProperty('dependencies')) {
        filesToUpdate[this.paths['package.json']] = function() {
            return JSON.stringify(project.package,"",4)
        };
        this.package.dependencies = data.dependencies;
        this.info.dependencies = data.dependencies;
    }
    if (data.hasOwnProperty('summary')) {
        filesToUpdate[this.paths['package.json']] = function() {
            return JSON.stringify(project.package,"",4)
        };
        this.package.description = data.summary;
        this.info.summary = data.summary;
    }

    var files = Object.keys(filesToUpdate);
    files.forEach(function(f) {
        promises.push(util.writeFile(f,filesToUpdate[f]()));
    });
    return when.settle(promises);
};

Project.prototype.getFiles = function () {
    return gitTools.getFiles(this.path);
};
Project.prototype.stageFile = function(file) {
    return gitTools.stageFile(this.path,file);
};
Project.prototype.unstageFile = function(file) {
    return gitTools.unstageFile(this.path,file);
}
Project.prototype.commit = function(options) {
    return gitTools.commit(this.path,options.message);
}
Project.prototype.getFileDiff = function(file,type) {
    return gitTools.getFileDiff(this.path,file,type);
}
Project.prototype.getCommits = function(options) {
    return gitTools.getCommits(this.path,options);
}
Project.prototype.getCommit = function(sha) {
    return gitTools.getCommit(this.path,sha);
}

Project.prototype.getFlowFile = function() {
    return fspath.join(this.path,"flow.json");
}
Project.prototype.getFlowFileBackup = function() {
    return getBackupFilename(this.getFlowFile());
}
Project.prototype.getCredentialsFile = function() {
    return fspath.join(this.path,"flow_cred.json");
}
Project.prototype.getCredentialsFileBackup = function() {
    return getBackupFilename(this.getCredentialsFile());
}

function getBackupFilename(filename) {
    var ffName = fspath.basename(filename);
    var ffDir = fspath.dirname(filename);
    return fspath.join(ffDir,"."+ffName+".backup");
}

function checkProjectExists(project) {
    var projectPath = fspath.join(projectsDir,project);
    return fs.pathExists(projectPath).then(function(exists) {
        if (!exists) {
            var e = new Error("NLD: project not found");
            e.code = "project_not_found";
            throw e;
        }
    });
}

function createProjectDirectory(project) {
    var projectPath = fspath.join(projectsDir,project);
    return fs.ensureDir(projectPath);
}

function createDefaultProject(project) {
    var projectPath = fspath.join(projectsDir,project.name);
    // Create a basic skeleton of a project
    return gitTools.initRepo(projectPath).then(function() {
        var promises = [];
        for (var file in defaultFileSet) {
            if (defaultFileSet.hasOwnProperty(file)) {
                promises.push(util.writeFile(fspath.join(projectPath,file),defaultFileSet[file](project)));
            }
        }
        return when.all(promises);
    });
}

function checkProjectFiles(project) {
    var projectPath = fspath.join(projectsDir,project);
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

function createProject(metadata) {
    var project = metadata.name;
    return when.promise(function(resolve,reject) {
        var projectPath = fspath.join(projectsDir,project);
        fs.stat(projectPath, function(err,stat) {
            if (!err) {
                var e = new Error("NLS: Project already exists");
                e.code = "project_exists";
                return reject(e);
            }
            createProjectDirectory(project).then(function() {
                var projects = settings.get('projects');
                projects.projects[project] = {};
                if (metadata.credentialSecret) {
                    projects.projects[project].credentialSecret = metadata.credentialSecret;
                }
                return settings.set('projects',projects);
            }).then(function() {
                if (metadata.remote) {
                    return gitTools.clone(metadata.remote,projectPath).then(function(result) {
                        // Check this is a valid project
                        // If it is empty
                        //  - if 'populate' flag is set, call populateProject
                        //  - otherwise reject with suitable error to allow UI to confirm population
                        // If it is missing package.json/flow.json/flow_cred.json
                        //  - reject as invalid project

                        // checkProjectFiles(project).then(function(results) {
                        //     console.log("checkProjectFiles");
                        //     console.log(results);
                        // });

                        resolve(getProject(project));
                    }).catch(function(error) {
                        fs.remove(projectPath,function() {
                            reject(error);
                        });
                    })
                } else {
                    createDefaultProject(metadata).then(function() { resolve(getProject(project))}).catch(reject);
                }
            }).catch(reject);
        })
    })
}

var currentProject;

function getProject(name) {
    return checkProjectExists(name).then(function() {
        if (currentProject && currentProject.name === name) {
            return currentProject;
        }
        currentProject = new Project(name);
        return currentProject.load();
    })

}

function listProjects() {
    return fs.readdir(projectsDir).then(function(fns) {
        var dirs = [];
        fns.sort().filter(function(fn) {
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
}

module.exports = {
    init: init,
    get: getProject,
    create: createProject,
    list: listProjects

}
