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

var when = require('when');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;


function execCommand(command,args,cwd) {
    return when.promise(function(resolve,reject) {
        var fullCommand = command+" "+args.join(" ");
        child = exec(fullCommand, {cwd: cwd, timeout:3000, killSignal: 'SIGTERM'}, function (error, stdout, stderr) {
            if (error) {
                reject(error);
            } else {
                resolve(stdout);
            }
        });
    });
}

function runCommand(command,args,cwd) {
    console.log(cwd,command,args);
    return when.promise(function(resolve,reject) {
        var child = spawn(command, args, {cwd:cwd, detached:true});
        var stdout = "";
        var stderr = "";
        child.stdout.on('data', function(data) {
            stdout += data;
        });

        child.stderr.on('data', function(data) {
            stderr += data;
        });

        child.on('close', function(code) {
            if (code !== 0) {
                var err = new Error(stderr);
                if (/fatal: could not read Username/.test(stderr)) {
                    err.code = "git_auth_failed";
                } else if(/HTTP Basic: Access denied/.test(stderr)) {
                    err.code = "git_auth_failed";
                } else {
                    err.code = "git_error";
                }
                return reject(err);
            }
            resolve(stdout);
        });
    });
}
function isAuthError(err) {
    // var lines = err.toString().split("\n");
    // lines.forEach(console.log);
}

function cleanFilename(name) {
    if (name[0] !== '"') {
        return name;
    }
    return name.substring(1,name.length-1);
}
function parseFilenames(name) {
    var re = /([^ "]+|(".*?"))($| -> ([^ ]+|(".*"))$)/;
    var m = re.exec(name);
    var result = [];
    if (m) {
        result.push(cleanFilename(m[1]));
        if (m[4]) {
            result.push(cleanFilename(m[4]));
        }
    }
    return result;
}

function getFiles(localRepo) {
    // parseFilename('"test with space"');
    // parseFilename('"test with space" -> knownFile.txt');
    // parseFilename('"test with space" -> "un -> knownFile.txt"');
    var files = {};
    return runCommand(gitCommand,["ls-files","--cached","--others","--exclude-standard"],localRepo).then(function(output) {
        var lines = output.split("\n");
        lines.forEach(function(l) {
            if (l==="") {
                return;
            }
            var fullName = cleanFilename(l);
            // parseFilename(l);
            var parts = fullName.split("/");
            var p = files;
            var name;
            for (var i = 0;i<parts.length-1;i++) {
                var name = parts.slice(0,i+1).join("/")+"/";
                if (!p.hasOwnProperty(name)) {
                    p[name] = {
                        type:"d"
                    }
                }
            }
            files[fullName] = {
                type: /\/$/.test(fullName)?"d":"f"
            }
        })
        return runCommand(gitCommand,["status","--porcelain"],localRepo).then(function(output) {
            var lines = output.split("\n");
            var unknownDirs = [];
            lines.forEach(function(line) {
                if (line==="") {
                    return;
                }
                if (line[0] === "#") {
                    return;
                }
                var status = line.substring(0,2);
                var fileName;
                var names;
                if (status !== '??') {
                    names = parseFilenames(line.substring(3));
                } else {
                    names = [cleanFilename(line.substring(3))];
                }
                fileName = names[0];
                if (names.length > 1) {
                    fileName = names[1];
                }

                // parseFilename(fileName);
                if (fileName.charCodeAt(0) === 34) {
                    fileName = fileName.substring(1,fileName.length-1);
                }
                if (files.hasOwnProperty(fileName)) {
                    files[fileName].status = status;
                } else {
                    files[fileName] = {
                        type: "f",
                        status: status
                    };
                }
                if (names.length > 1) {
                    files[fileName].oldName = names[0];
                }
                if (status === "??" && fileName[fileName.length-1] === '/') {
                    unknownDirs.push(fileName);
                }
            })
            var allFilenames = Object.keys(files);
            allFilenames.forEach(function(f) {
                var entry = files[f];
                if (!entry.hasOwnProperty('status')) {
                    unknownDirs.forEach(function(uf) {
                        if (f.startsWith(uf)) {
                            entry.status = "??"
                        }
                    });
                }
            })
            // console.log(files);
            return files;
        })
    })
}

function parseLog(log) {
    var lines = log.split("\n");
    var currentCommit = null;
    var commits = [];
    lines.forEach(function(l) {
        if (/^sha: /.test(l)) {
            if (currentCommit) {
                commits.push(currentCommit);
            }
            currentCommit = {}
        }
        var m = /^(.*): (.*)$/.exec(l);
        if (m) {
            currentCommit[m[1]] = m[2];
        }
    });
    if (currentCommit) {
        commits.push(currentCommit);
    }
    return {commits: commits};
}

var gitCommand = "git";
module.exports = {
    initRepo: function(cwd) {
        return runCommand(gitCommand,["init"],cwd);
    },
    pull: function(repo, cwd) {
        if (repo.url) {
            repo = repo.url;
        }
        var args = ["pull",repo,"master"];
        return runCommand(gitCommand,args,cwd);
    },
    clone: function(repo, cwd) {
        if (repo.url) {
            repo = repo.url;
        }
        var args = ["clone",repo,"."];
        return runCommand(gitCommand,args,cwd);
    },
    getFiles: getFiles,
    stageFile: function(cwd,file) {
        var args = ["add"];
        if (Array.isArray(file)) {
            args = args.concat(file);
        } else {
            args.push(file);
        }
        return runCommand(gitCommand,args,cwd);
    },
    unstageFile: function(cwd, file) {
        var args = ["reset","--"];
        if (file) {
            args.push(file);
        }
        return runCommand(gitCommand,args,cwd);
    },
    commit: function(cwd, message) {
        var args = ["commit","-m",message];
        return runCommand(gitCommand,args,cwd);
    },
    getFileDiff(cwd,file,type) {
        var args = ["diff"];
        if (type === "tree") {
            // nothing else to do
        } else if (type === "index") {
            args.push("--cached");
        }
        args.push(file);
        return runCommand(gitCommand,args,cwd);
    },
    getCommits: function(cwd,options) {
        var args = ["log", "--format=sha: %H%nauthor: %an%ndate: %ct%nsubject: %s","-n 10"];
        return runCommand(gitCommand,args,cwd).then(parseLog);
    },
    getCommit: function(cwd,sha) {
        var args = ["show",sha];
        return runCommand(gitCommand,args,cwd);
    }
}
