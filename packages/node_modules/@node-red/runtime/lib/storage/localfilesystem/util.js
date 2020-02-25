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
var fspath = require('path');
var when = require('when');
var nodeFn = require('when/node/function');

var log = require("@node-red/util").log; // TODO: separate module

function parseJSON(data) {
    if (data.charCodeAt(0) === 0xFEFF) {
        data = data.slice(1)
    }
    return JSON.parse(data);
}
function readFile(path,backupPath,emptyResponse,type) {
    return when.promise(function(resolve) {
        fs.readFile(path,'utf8',function(err,data) {
            if (!err) {
                if (data.length === 0) {
                    log.warn(log._("storage.localfilesystem.empty",{type:type}));
                    try {
                        var backupStat = fs.statSync(backupPath);
                        if (backupStat.size === 0) {
                            // Empty flows, empty backup - return empty flow
                            return resolve(emptyResponse);
                        }
                        // Empty flows, restore backup
                        log.warn(log._("storage.localfilesystem.restore",{path:backupPath,type:type}));
                        fs.copy(backupPath,path,function(backupCopyErr) {
                            if (backupCopyErr) {
                                // Restore backup failed
                                log.warn(log._("storage.localfilesystem.restore-fail",{message:backupCopyErr.toString(),type:type}));
                                resolve([]);
                            } else {
                                // Loop back in to load the restored backup
                                resolve(readFile(path,backupPath,emptyResponse,type));
                            }
                        });
                        return;
                    } catch(backupStatErr) {
                        // Empty flow file, no back-up file
                        return resolve(emptyResponse);
                    }
                }
                try {
                    return resolve(parseJSON(data));
                } catch(parseErr) {
                    log.warn(log._("storage.localfilesystem.invalid",{type:type}));
                    return resolve(emptyResponse);
                }
            } else {
                if (type === 'flow') {
                    log.info(log._("storage.localfilesystem.create",{type:type}));
                }
                resolve(emptyResponse);
            }
        });
    });
}

module.exports = {
    /**
     * Write content to a file using UTF8 encoding.
     * This forces a fsync before completing to ensure
     * the write hits disk.
     */
     writeFile: function(path,content,backupPath) {
        if (backupPath) {
            if (fs.existsSync(path)) {
                fs.renameSync(path,backupPath);
            }
        }
        return when.promise(function(resolve,reject) {
            fs.ensureDir(fspath.dirname(path), (err)=>{
                if (err) {
                    reject(err);
                    return;
                }
                var stream = fs.createWriteStream(path);
                stream.on('open',function(fd) {
                    stream.write(content,'utf8',function() {
                        fs.fsync(fd,function(err) {
                            if (err) {
                                log.warn(log._("storage.localfilesystem.fsync-fail",{path: path, message: err.toString()}));
                            }
                            stream.end(resolve);
                        });
                    });
                });
                stream.on('error',function(err) {
                    reject(err);
                });
            });
        });
     },
    readFile: readFile,

    parseJSON: parseJSON
}
