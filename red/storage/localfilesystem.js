/**
 * Copyright 2013, 2014 IBM Corp.
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

var fs = require('fs');
var when = require('when');
var nodeFn = require('when/node/function');
var keys = require('when/keys');
var util = require('util');
var fspath = require("path");
var mkdirp = require("mkdirp");

var promiseDir = nodeFn.lift(mkdirp);

var settings;
var flowsFile;
var flowsFullPath;
var flowsPrev;
var credentialsFile;
var oldCredentialsFile;
var userDir;
var libDir;
var libFlowsDir;

function listFiles(dir) {
    var dirs = {};
    var files = [];
    var dirCount = 0;
    return nodeFn.call(fs.readdir, dir).then(function (contents) {
        contents.sort().forEach(function(fn) {
            var stats = fs.lstatSync(dir+"/"+fn);
            if (stats.isDirectory()) {
                dirCount += 1;
                dirs[fn] = listFiles(dir+"/"+fn)
            } else {
                files.push(fn.split(".")[0]);
            }
        })
        var result = {};
        if (dirCount > 0) { result.d = keys.all(dirs); }
        if (files.length > 0) { result.f = when.resolve(files); }
        return keys.all(result);
    })
}

function getFileMeta(root,path) {
    var fn = fspath.join(root,path);
    var fd = fs.openSync(fn,"r");
    var size = fs.fstatSync(fd).size;
    var meta = {};
    var scanning = true;
    var read = 0;
    var length = 10;
    var offset = 0;
    var remaining = "";
    var buffer = Buffer(length);
    while(read < size) {
        read+=fs.readSync(fd,buffer,0,length);
        var data = remaining+buffer.toString();
        var parts = data.split("\n");
        remaining = parts.splice(-1);
        for (var i=0;i<parts.length;i+=1) {
            var match = /^\/\/ (\w+): (.*)/.exec(parts[i]);
            if (match) {
                meta[match[1]] = match[2];
            } else {
                read = size;
                break;
            }
        }
    }
    fs.closeSync(fd);
    return meta;
}

function getFileBody(root,path) {
    var body = "";
    var fn = fspath.join(root,path);
    var fd = fs.openSync(fn,"r");
    var size = fs.fstatSync(fd).size;
    var scanning = true;
    var read = 0;
    var length = 50;
    var offset = 0;
    var remaining = "";
    var buffer = Buffer(length);
    while(read < size) {
        var thisRead = fs.readSync(fd,buffer,0,length);
        read += thisRead;
        if (scanning) {
            var data = remaining+buffer.slice(0,thisRead).toString();
            var parts = data.split("\n");
            remaining = parts.splice(-1)[0];
            for (var i=0;i<parts.length;i+=1) {
                if (! /^\/\/ \w+: /.test(parts[i])) {
                    scanning = false;
                    body += parts[i]+"\n";
                }
            }
            if (! /^\/\/ \w+: /.test(remaining)) {
                scanning = false;
            }
            if (!scanning) {
                body += remaining;
            }
        } else {
            body += buffer.slice(0,thisRead).toString();
        }
    }
    fs.closeSync(fd);
    return body;
}

function writeFile(root,path,meta,body,res) {
    var fn = fspath.join(root,path);
    var headers = "";
    for (var i in meta) {
        headers += "// "+i+": "+meta[i]+"\n";
    }
    mkdirp(fspath.dirname(fn), function (err) {
        fs.writeFile(fn,headers+body,function(err) {
            //TODO: handle error
            res.writeHead(204, {'Content-Type': 'text/plain'});
            res.end();
        });
    });
}

var localfilesystem = {
    init: function(_settings) {
        settings = _settings;
        userDir = settings.userDir || process.env.NODE_RED_HOME;

        if (settings.flowFile) {
            flowsFile = settings.flowFile;
            flowsFullPath = flowsFile;
        } else {
            flowsFile = 'flows_'+require('os').hostname()+'.json';
            flowsFullPath = fspath.join(userDir,flowsFile);
        }
        var fsext = fspath.extname(flowsFile);
        credentialsFile = fspath.join(userDir,fspath.basename(flowsFile,fsext)+"_cred"+fsext);
        oldCredentialsFile = fspath.join(userDir,"credentials.json");
        flowsPrev = fspath.join(userDir,"flows.backup");

        libDir = fspath.join(userDir,"lib");
        libFlowsDir = fspath.join(libDir,"flows");

        return promiseDir(libFlowsDir);
    },

    getFlows: function() {
        var defer = when.defer();
        fs.exists(flowsFullPath, function(exists) {
            if (exists) {
                util.log("[red] Loading flows : "+flowsFile);
                defer.resolve(nodeFn.call(fs.readFile,flowsFullPath,'utf8').then(function(data) {
                    return JSON.parse(data);
                }));
            } else {
                util.log("[red] Flows file not found : "+flowsFile   );
                defer.resolve([]);
            }
        });
        return defer.promise;
    },

    saveFlows: function(flows) {
        if (fs.existsSync(flowsFullPath)) {
            fs.renameSync(flowsFullPath,flowsPrev);
        }
        
        var flowData;
        
        if (settings.flowFilePretty) {
            flowData = JSON.stringify(flows,null,4);
        } else {
            flowData = JSON.stringify(flows);
        }
        
        return nodeFn.call(fs.writeFile, flowsFullPath, flowData);
    },

    getCredentials: function() {
        var defer = when.defer();
        fs.exists(credentialsFile, function(exists) {
            if (exists) {
                defer.resolve(nodeFn.call(fs.readFile, credentialsFile, 'utf8').then(function(data) {
                    return JSON.parse(data)
                }));
            } else {
                fs.exists(oldCredentialsFile, function(exists) {
                    if (exists) {
                        defer.resolve(nodeFn.call(fs.readFile, oldCredentialsFile, 'utf8').then(function(data) {
                            return JSON.parse(data)
                        }));
                    } else {
                        defer.resolve({});
                    }
                });
            }
        });
        return defer.promise;
    },

    saveCredentials: function(credentials) {
        var credentialData;
        if (settings.flowFilePretty) {
            credentialData = JSON.stringify(credentials,null,4);
        } else {
            credentialData = JSON.stringify(credentials);
        }
        
        return nodeFn.call(fs.writeFile, credentialsFile, credentialData)
    },

    getAllFlows: function() {
        return listFiles(libFlowsDir);
    },

    getFlow: function(fn) {
        var defer = when.defer();
        var file = fspath.join(libFlowsDir,fn+".json");
        fs.exists(file, function(exists) {
            if (exists) {
                defer.resolve(nodeFn.call(fs.readFile,file,'utf8'));
            } else {
                defer.reject();
            }
        });
        return defer.promise;
    },

    saveFlow: function(fn,data) {
        var file = fspath.join(libFlowsDir,fn+".json");
        return promiseDir(fspath.dirname(file)).then(function () {
            return nodeFn.call(fs.writeFile, file, data);
        });
    },

    getLibraryEntry: function(type,path) {
        var root = fspath.join(libDir,type);
        var rootPath = fspath.join(libDir,type,path);
        return promiseDir(root).then(function () {
            return nodeFn.call(fs.lstat, rootPath).then(function(stats) {
                if (stats.isFile()) return getFileBody(root,path);
                if (path.substr(-1) == '/') {
                    path = path.substr(0,path.length-1);
                }
                return nodeFn.call(fs.readdir, rootPath).then(function(fns) {
                    var dirs = [];
                    var files = [];
                    fns.sort().filter(function(fn) {
                        var fullPath = fspath.join(path,fn);
                        var absoluteFullPath = fspath.join(root,fullPath);
                        if (fn[0] != ".") {
                            var stats = fs.lstatSync(absoluteFullPath);
                            if (stats.isDirectory()) {
                                dirs.push(fn);
                            } else {
                                var meta = getFileMeta(root,fullPath);
                                meta.fn = fn;
                                files.push(meta);
                            }
                        }
                    });
                    return dirs.concat(files);
                });
            });
        });
    },

    saveLibraryEntry: function(type,path,meta,body) {
        var fn = fspath.join(libDir, type, path);
        var headers = "";
        for (var i in meta) {
            headers += "// "+i+": "+meta[i]+"\n";
        }
        return promiseDir(fspath.dirname(fn)).then(function () {
            nodeFn.call(fs.writeFile, fn, headers+body);
        });
    }
};

module.exports = localfilesystem;
