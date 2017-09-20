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
        var args = ["clone",repo,"."];
        return runCommand(gitCommand,args,cwd);
    }
}
