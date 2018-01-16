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

var child_process = require('child_process');

var sshkeygenCommand = "ssh-keygen";

var log;

function runSshKeygenCommand(args,cwd,env) {
    return new Promise(function(resolve, reject) {
        var child = child_process.spawn(sshkeygenCommand, args, {cwd: cwd, detached: true, env: env});
        var stdout = "";
        var stderr = "";

        child.stdout.on('data', function(data) {
            stdout += data;
        });
        child.stderr.on('data', function(data) {
            stderr += data;
        });
        child.on('close', function(code, signal) {
            if (code !== 0) {
                var err = new Error(stderr);
                err.stdout = stdout;
                err.stderr = stderr;
                if (/passphrase is too short/.test(stderr)) {
                    err.code = "key_passphrase_too_short";
                } else if(/Key must at least be 1024 bits/.test(stderr)) {
                    err.code = "key_length_too_short";
                }
                reject(err);
            }
            else {
                resolve(stdout);
            }
        });
    });
}

function init(_settings, _runtime) {
    log = _runtime.log;
}

function generateKey(options) {
    var args = ['-q', '-t', 'rsa'];
    if (options.size) {
        args.push('-b', options.size);
    }
    if (options.location) {
        args.push('-f', options.location);
    }
    if (options.comment) {
        args.push('-C', options.comment);
    }
    if (options.password) {
        args.push('-N', options.password);
    }
    return runSshKeygenCommand(args,__dirname);
}

module.exports = {
    init: init,
    generateKey: generateKey,
};
