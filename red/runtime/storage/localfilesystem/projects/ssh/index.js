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
var keygen = require("./keygen");

var settings;
var runtime;
var log;
var sshkeyDir;
var userSSHKeyDir;

function init(_settings, _runtime) {
    settings = _settings;
    runtime = _runtime;
    log = runtime.log;
    sshkeyDir = fspath.resolve(fspath.join(settings.userDir, "projects", ".sshkeys"));
    userSSHKeyDir = fspath.join(process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH, ".ssh");
    // console.log('sshkeys.init()');
    return fs.ensureDir(sshkeyDir);
}

function listSSHKeys(username) {
    return listSSHKeysInDir(sshkeyDir,username + '_').then(function(customKeys) {
        return listSSHKeysInDir(userSSHKeyDir).then(function(existingKeys) {
            existingKeys.forEach(function(k){
                k.system = true;
                customKeys.push(k);
            })
            return customKeys;
        });
    });
}

function listSSHKeysInDir(dir,startStr) {
    startStr = startStr || "";
    return fs.readdir(dir).then(function(fns) {
        var ret = fns.sort()
            .filter(function(fn) {
                var fullPath = fspath.join(dir,fn);
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
    }).then(function(result) {
        return result;
    }).catch(function() {
        return []
    });
}

function getSSHKey(username, name) {
    return checkSSHKeyFileAndGetPublicKeyFileName(username, name)
    .then(function(publicSSHKeyPath) {
        return fs.readFile(publicSSHKeyPath, 'utf-8');
    }).catch(function() {
        var privateKeyPath = fspath.join(userSSHKeyDir,name);
        var publicKeyPath = privateKeyPath+".pub";
        return checkFilePairExist(privateKeyPath,publicKeyPath).then(function() {
            return fs.readFile(publicKeyPath, 'utf-8');
        }).catch(function() {
            return null
        });
    });
}

function generateSSHKey(username, options) {
    options = options || {};
    var name = options.name || "";
    return checkExistSSHKeyFiles(username, name)
        .then(function(result) {
            if ( result ) {
                var e = new Error("SSH Key name exists");
                e.code = "key_exists";
                throw e;
            } else {
                var comment = options.comment || "";
                var password = options.password || "";
                var size = options.size || 2048;
                var sshKeyFileBasename = username + '_' + name;
                var privateKeyFilePath = fspath.normalize(fspath.join(sshkeyDir, sshKeyFileBasename));
                return generateSSHKeyPair(name, privateKeyFilePath, comment, password, size)
            }
        })
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
    return checkFilePairExist(privateKeyFilePath,publicKeyFilePath)
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
    return checkFilePairExist(privateKeyFilePath,publicKeyFilePath).then(function() {
        return publicKeyFilePath;
    });
}

function checkFilePairExist(privateKeyFilePath,publicKeyFilePath) {
    return Promise.all([
        fs.access(privateKeyFilePath, (fs.constants || fs).R_OK),
        fs.access(publicKeyFilePath , (fs.constants || fs).R_OK)
    ])
}

function deleteSSHKeyFiles(username, name) {
    var sshKeyFileBasename = username + '_' + name;
    var privateKeyFilePath = fspath.join(sshkeyDir, sshKeyFileBasename);
    var publicKeyFilePath  = fspath.join(sshkeyDir, sshKeyFileBasename + '.pub');
    return Promise.all([
        fs.remove(privateKeyFilePath),
        fs.remove(publicKeyFilePath)
    ])
}

function generateSSHKeyPair(name, privateKeyPath, comment, password, size) {
    log.trace("ssh-keygen["+[name,privateKeyPath,comment,size,"hasPassword?"+!!password].join(",")+"]");
    return keygen.generateKey({location: privateKeyPath, comment: comment, password: password, size: size})
            .then(function(stdout) {
                return name;
            })
            .catch(function(err) {
                log.log('[SSHKey generation] error:', err);
                throw err;
            });
}

function getPrivateKeyPath(username, name) {
    var sshKeyFileBasename = username + '_' + name;
    var privateKeyFilePath = fspath.normalize(fspath.join(sshkeyDir, sshKeyFileBasename));
    try {
        fs.accessSync(privateKeyFilePath, (fs.constants || fs).R_OK);
    } catch(err) {
        privateKeyFilePath = fspath.join(userSSHKeyDir,name);
        try {
            fs.accessSync(privateKeyFilePath, (fs.constants || fs).R_OK);
        } catch(err2) {
            return null;
        }
    }
    if (fspath.sep === '\\') {
        privateKeyFilePath = privateKeyFilePath.replace(/\\/g,'\\\\');
    }
    return privateKeyFilePath;
}

module.exports = {
    init: init,
    listSSHKeys: listSSHKeys,
    getSSHKey: getSSHKey,
    getPrivateKeyPath: getPrivateKeyPath,
    generateSSHKey: generateSSHKey,
    deleteSSHKey: deleteSSHKey
};
