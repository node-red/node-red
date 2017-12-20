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
var keygen = require('ssh-keygen');

var settings;
var runtime;
var log;
var sshkeyDir;

function init(_settings, _runtime) {
    settings = _settings;
    runtime = _runtime;
    log = runtime.log;
    sshkeyDir = fspath.join(settings.userDir, "projects", ".sshkeys");
    // console.log('sshkeys.init()');
    return createSSHKeyDirectory();
}

function createSSHKeyDirectory() {
    return fs.ensureDir(sshkeyDir);
}

function listSSHKeys(username) {
    var startStr = username + '_';
    // console.log('sshkeyDir:', sshkeyDir);
    return fs.readdir(sshkeyDir).then(function(fns) {
        var ret = fns.sort()
            .filter(function(fn) {
                var fullPath = fspath.join(sshkeyDir,fn);
                if (fn.length > 2 || fn[0] != ".") {
                    var stats = fs.lstatSync(fullPath);
                    if (stats.isFile()) {
                        return fn.startsWith(startStr);
                    }
                }
                return false;
            })
            .map(function(filename) {
                return filename.substr(startStr.length);
            })
            .reduce(function(prev, current) {
                var parsePath = fspath.parse(current);
                if ( parsePath ) {
                    if ( parsePath.ext !== '.pub' ) {
                        // Private Keys
                        prev.keyFiles.push(parsePath.base);
                    }
                    else if ( parsePath.ext === '.pub' && (prev.keyFiles.some(function(elem){ return elem === parsePath.name; }))) {
                        prev.privateKeyFiles.push(parsePath.name);
                    }
                }
                return prev;
            }, { keyFiles: [], privateKeyFiles: [] });
        return ret.privateKeyFiles.map(function(filename) {
            return {
                name: filename
            };
        });
    });
}

function getSSHKey(username, name) {
    return checkSSHKeyFileAndGetPublicKeyFileName(username, name)
    .then(function(publicSSHKeyPath) {
        return fs.readFile(publicSSHKeyPath, 'utf-8');
    });
}

function generateSSHKey(username, options) {
    options = options || {};
    var name = options.name || "";
    return checkExistSSHKeyFiles(username, name)
        .then(function(result) {
            if ( result ) {
                throw new Error('Some SSH Keyfile exists');
            }
            else {
                var comment = options.comment || "";
                var password = options.password || "";
                var size = options.size || 2048;
                var sshKeyFileBasename = username + '_' + name;
                var privateKeyFilePath = fspath.join(sshkeyDir, sshKeyFileBasename);
                return generateSSHKeyPair(privateKeyFilePath, comment, password, size)
                    .then(function() {
                        return name;
                    });
            }
        })
        .then(function(keyfile_name) {
            return checkSSHKeyFileAndGetPublicKeyFileName(username, name)
                .then(function() {
                    return keyfile_name;
                })
                .catch(function() {
                    throw new Error('Failed to generate ssh key files');
                });
        });
}

function deleteSSHKey(username, name) {
    return checkSSHKeyFileAndGetPublicKeyFileName(username, name)
    .then(function() {
        return deleteSSHKeyFiles(username, name);
    });
}

function checkExistSSHKeyFiles(username, name) {
    var sshKeyFileBasename = username + '_' + name;
    var privateKeyFilePath = fspath.join(sshkeyDir, sshKeyFileBasename);
    var publicKeyFilePath  = fspath.join(sshkeyDir, sshKeyFileBasename + '.pub');
    return Promise.race([
        fs.access(privateKeyFilePath, (fs.constants || fs).R_OK),
        fs.access(publicKeyFilePath , (fs.constants || fs).R_OK)
    ])
    .then(function() {
        return true;
    })
    .catch(function() {
        return false;
    });
}

function checkSSHKeyFileAndGetPublicKeyFileName(username, name) {
    var sshKeyFileBasename = username + '_' + name;
    var privateKeyFilePath = fspath.join(sshkeyDir, sshKeyFileBasename);
    var publicKeyFilePath  = fspath.join(sshkeyDir, sshKeyFileBasename + '.pub');
    return Promise.all([
        fs.access(privateKeyFilePath, (fs.constants || fs).R_OK),
        fs.access(publicKeyFilePath , (fs.constants || fs).R_OK)
    ])
    .then(function() {
        return publicKeyFilePath;
    });
}

function deleteSSHKeyFiles(username, name) {
    var sshKeyFileBasename = username + '_' + name;
    var privateKeyFilePath = fspath.join(sshkeyDir, sshKeyFileBasename);
    var publicKeyFilePath  = fspath.join(sshkeyDir, sshKeyFileBasename + '.pub');
    return Promise.all([
        fs.remove(privateKeyFilePath),
        fs.remove(publicKeyFilePath)
    ])
    .then(function(retArray) {
        return true;
    });
}

function generateSSHKeyPair(privateKeyPath, comment, password, size) {
    return new Promise(function(resolve, reject) {
        keygen({
            location: privateKeyPath,
            comment: comment,
            password: password,
            size: size
        }, function(err, out) {
            if ( err ) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

module.exports = {
    init: init,
    listSSHKeys: listSSHKeys,
    getSSHKey: getSSHKey,
    generateSSHKey: generateSSHKey,
    deleteSSHKey: deleteSSHKey
};
