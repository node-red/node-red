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

var settings;
var runtime;

var projectsDir;


function init(_settings, _runtime) {
    settings = _settings;
    runtime = _runtime;
    log = runtime.log;

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
        return util.promiseDir(projectsDir)
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
                    var projectPath = fspath.join(projectsDir,activeProject);
                    flowsFullPath = fspath.join(projectPath,"flow.json");
                    flowsFileBackup = getBackupFilename(flowsFullPath);
                    credentialsFile = fspath.join(projectPath,"flow_cred.json");
                    credentialsFileBackup = getBackupFilename(credentialsFile);
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

function listProjects() {
    return nodeFn.call(fs.readdir, projectsDir).then(function(fns) {
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

function getProject(project) {

    return when.promise(function(resolve,reject) {
        if (project === "") {
            return reject(new Error("NLS: No active project set"));
        }
        var projectPath = fspath.join(projectsDir,project);
        var globalProjectSettings = settings.get("projects");
        var projectSettings = {};
        if (globalProjectSettings.projects) {
            projectSettings = globalProjectSettings.projects[project]||{};
        }

        var projectData = {
            name: project,
            settings: {}
        };

        if (typeof projectSettings.credentialSecret === "string") {
            projectData.settings.credentialsEncrypted = true;
        } else {
            projectData.settings.credentialsEncrypted = false;
        }
        if (projectSettings.credentialSecretInvalid) {
            projectData.settings.credentialsInvalid = true;
        }

        var promises = [];
        checkProjectFiles(project).then(function(missingFiles) {
            if (missingFiles.length > 0) {
                projectData.missingFiles = missingFiles;
            }
            if (missingFiles.indexOf('package.json') === -1) {
                promises.push(nodeFn.call(fs.readFile,fspath.join(projectPath,"package.json"),"utf8").then(function(content) {
                    var package = util.parseJSON(content);
                    projectData.summary = package.description||"";
                    projectData.dependencies = package.dependencies||{};
                }));
            }
            if (missingFiles.indexOf('README.md') === -1) {
                promises.push(nodeFn.call(fs.readFile,fspath.join(projectPath,"README.md"),"utf8").then(function(content) {
                    projectData.description = content;
                }));
            } else {
                projectData.description = "";
            }

            when.settle(promises).then(function() {
                resolve(projectData);
            })
        });

        // fs.stat(projectPath,function(err,stat) {
        //     if (err) {
        //         return resolve(null);
        //     }
        //     resolve(nodeFn.call(fs.readFile,projectPackage,'utf8').then(util.parseJSON));
        // })
    }).otherwise(function(err) {
        console.log(err);
        var e = new Error("NLD: project not found");
        e.code = "project_not_found";
        throw e;
    });
}

function setCredentialSecret(project,data) { //existingSecret,secret) {
    var existingSecret = data.currentCredentialSecret;
    var isReset = data.resetCredentialSecret;
    var secret = data.credentialSecret;
    var wasInvalid = false;

    var globalProjectSettings = settings.get("projects");
    globalProjectSettings.projects = globalProjectSettings.projects || {};
    if (globalProjectSettings.projects.hasOwnProperty(project)) {
        if (!isReset &&
            globalProjectSettings.projects[project].credentialSecret &&
            !globalProjectSettings.projects[project].credentialSecretInvalid &&
            globalProjectSettings.projects[project].credentialSecret !== existingSecret) {
                var e = new Error("Cannot change credentialSecret without current key");
                e.code = "missing_current_credential_key";
                throw e;
        }
    } else {
        globalProjectSettings.projects[project] = {};
    }

    globalProjectSettings.projects[project].credentialSecret = secret;
    wasInvalid = globalProjectSettings.projects[project].credentialSecretInvalid;
    delete globalProjectSettings.projects[project].credentialSecretInvalid;

    return settings.set("projects",globalProjectSettings).then(function() {
        if (isReset || !wasInvalid) {
            if (isReset) {
                runtime.nodes.clearCredentials();
            }
            runtime.nodes.setCredentialSecret(secret);
            return runtime.nodes.exportCredentials()
                .then(runtime.storage.saveCredentials)
                .then(function() {
                    return wasInvalid;
                });
        }
        return wasInvalid;
    });
}

function createProject(metadata) {
    var project = metadata.name;
    return when.promise(function(resolve,reject) {
        if (project === "") {
            return reject(new Error("NLS: No project set"));
        }
        var projectPath = fspath.join(projectsDir,project);
        fs.stat(projectPath, function(err,stat) {
            if (!err) {
                var e = new Error("NLS: Project already exists");
                e.code = "project_exists";
                return reject(e);
            }
            createProjectDirectory(project).then(function() {
                if (metadata.credentialSecret) {
                    return setCredentialSecret(project,{credentialSecret: credentialSecret});
                }
                return when.resolve();
            }).then(function() {
                if (metadata.remote) {
                    return gitTools.pull(metadata.remote,projectPath).then(function(result) {
                        // Check this is a valid project
                        // If it is empty
                        //  - if 'populate' flag is set, call populateProject
                        //  - otherwise reject with suitable error to allow UI to confirm population
                        // If it is missing package.json/flow.json/flow_cred.json
                        //  - reject as invalid project

                        checkProjectFiles(project).then(function(results) {
                            console.log("checkProjectFiles");
                            console.log(results);
                        });

                        resolve(project);
                    }).otherwise(function(error) {
                        fs.remove(projectPath,function() {
                            reject(error);
                        });
                    })
                } else {
                    createDefaultProject(metadata).then(function() { resolve(project)}).otherwise(reject);
                }
            }).otherwise(reject);
        })
    })
}

function createProjectDirectory(project) {
    var projectPath = fspath.join(projectsDir,project);
    return util.promiseDir(projectPath).then(function() {
        return gitTools.initRepo(projectPath)
    });
}

var defaultFileSet = {
    "package.json": function(project) {
        return JSON.stringify({
            "name": project.name,
            "description": project.summary||"A Node-RED Project",
            "version": "0.0.1",
            "dependencies": {}
        },"",4);
    },
    "README.md": function(project) {
        return project.name+"\n"+("=".repeat(project.name.length))+"\n\n"+(project.summary||"A Node-RED Project")+"\n\n";
    },
    "settings.json": function() { return "{}" },
    "flow.json": function() { return "[]" },
    "flow_cred.json": function() { return "{}" }
}

function createDefaultProject(project) {
    var projectPath = fspath.join(projectsDir,project.name);
    // Create a basic skeleton of a project
    var promises = [];
    for (var file in defaultFileSet) {
        if (defaultFileSet.hasOwnProperty(file)) {
            promises.push(util.writeFile(fspath.join(projectPath,file),defaultFileSet[file](project)));
        }
    }
    return when.all(promises);
}
function checkProjectExists(project) {
    var projectPath = fspath.join(projectsDir,project);
    return nodeFn.call(fs.stat,projectPath).otherwise(function(err) {
        var e = new Error("NLD: project not found");
        e.code = "project_not_found";
        throw e;
    });
}
function checkProjectFiles(project) {
    var projectPath = fspath.join(projectsDir,project);
    var promises = [];
    var paths = [];
    for (var file in defaultFileSet) {
        if (defaultFileSet.hasOwnProperty(file)) {
            paths.push(file);
            promises.push(nodeFn.call(fs.stat,fspath.join(projectPath,file)));
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


function getFiles(project) {
    var projectPath = fspath.join(projectsDir,project);
    return nodeFn.call(listFiles,projectPath,"/");
}
function getFile(project,path) {

}

function listFiles(root,path,done) {
    var entries = [];
    var fullPath = fspath.join(root,path);
    fs.readdir(fullPath, function(err,fns) {
        var childCount = fns.length;
        fns.sort().forEach(function(fn) {
            if (fn === ".git") {
                childCount--;
                return;
            }
            var child = {
                path: fspath.join(path,fn),
                name: fn
            };
            entries.push(child);
            var childFullPath = fspath.join(fullPath,fn);
            fs.lstat(childFullPath, function(err, stats) {
                if (stats.isDirectory()) {
                    child.type = 'd';
                    listFiles(root,child.path,function(err,children) {
                        child.children = children;
                        childCount--;
                        if (childCount === 0) {
                            done(null,entries);
                        }
                    })
                } else {
                    child.type = 'f';
                    childCount--;
                    console.log(child,childCount)
                    if (childCount === 0) {
                        done(null,entries);
                    }
                }
            });
        });
    });
}

var activeProject
function getActiveProject() {
    return activeProject;
}

function reloadActiveProject(project) {
    return runtime.nodes.stopFlows().then(function() {
        return runtime.nodes.loadFlows(true).then(function() {
            runtime.events.emit("runtime-event",{id:"project-change",payload:{ project: project}});
        }).otherwise(function(err) {
            // We're committed to the project change now, so notify editors
            // that it has changed.
            runtime.events.emit("runtime-event",{id:"project-change",payload:{ project: project}});
            throw err;
        });
    });
}

function setActiveProject(project) {
    return checkProjectExists(project).then(function() {
        activeProject = project;
        var globalProjectSettings = settings.get("projects");
        globalProjectSettings.activeProject = project;
        return settings.set("projects",globalProjectSettings).then(function() {
            var projectPath = fspath.join(projectsDir,project);
            flowsFullPath = fspath.join(projectPath,"flow.json");
            flowsFileBackup = getBackupFilename(flowsFullPath);
            credentialsFile = fspath.join(projectPath,"flow_cred.json");
            credentialsFileBackup = getBackupFilename(credentialsFile);

            log.info(log._("storage.localfilesystem.changing-project",{project:activeProject||"none"}));
            log.info(log._("storage.localfilesystem.flows-file",{path:flowsFullPath}));

            console.log("Updated file targets to");
            console.log(flowsFullPath)
            console.log(credentialsFile)

            return reloadActiveProject(project);

        })
        // return when.promise(function(resolve,reject) {
        //     console.log("Activating project");
        //     resolve();
        // });
    });
}
function updateProject(project,data) {
    return checkProjectExists(project).then(function() {
        if (data.credentialSecret) {
            // TODO: this path assumes we aren't trying to migrate the secret
            return setCredentialSecret(project,data).then(function(wasInvalid) {
                if (wasInvalid) {
                    return reloadActiveProject(project);
                }
            })
        } else if (data.hasOwnProperty('description')) {
            var projectPath = fspath.join(projectsDir,project);
            var readmeFile = fspath.join(projectPath,"README.md");
            return util.writeFile(readmeFile, data.description);
        } else if (data.hasOwnProperty('dependencies') || data.hasOwnProperty('summary')) {
            var projectPath = fspath.join(projectsDir,project);
            var packageJSON = fspath.join(projectPath,"package.json");
            return nodeFn.call(fs.readFile,packageJSON,"utf8").then(function(content) {
                var package = util.parseJSON(content);
                if (data.dependencies) {
                    package.dependencies = data.dependencies;
                }
                if (data.summary) {
                    package.description = data.summary;
                }

                return util.writeFile(packageJSON,JSON.stringify(package,"",4));
            });
        }
    });
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
        log.info(log._("storage.localfilesystem.flows-file",{path:flowsFullPath}));
        log.info(log._("storage.localfilesystem.active-project",{project:activeProject||"none"}));
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
    listProjects: listProjects,
    getActiveProject: getActiveProject,
    setActiveProject: setActiveProject,
    getProject: getProject,
    createProject: createProject,
    updateProject: updateProject,
    getFiles: getFiles,

    getFlows: getFlows,
    saveFlows: saveFlows,
    getCredentials: getCredentials,
    saveCredentials: saveCredentials

};
