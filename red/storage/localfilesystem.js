/**
 * Copyright 2013 IBM Corp.
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
var util = require('util');
var fspath = require("path");

var settings;
var flowsFile;
var credentialsFile;

var userDir;
var libDir;
var libFlowsDir;

function listFiles(dir) {
    var dirs = {};
    var files = [];
    var dirCount = 0;
    fs.readdirSync(dir).sort().filter(function(fn) {
            var stats = fs.lstatSync(dir+"/"+fn);
            if (stats.isDirectory()) {
                dirCount += 1;
                dirs[fn] = listFiles(dir+"/"+fn);
            } else {
                files.push(fn.split(".")[0]);
            }
    });
    var result = {};
    if (dirCount > 0) { result.d = dirs; }
    if (files.length > 0) { result.f = files; }
    return result;
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
    
    var parts = path.split("/");
    var dirname = root;
    for (var i = 0;i<parts.length-1;i+=1) {
        dirname = fspath.join(dirname,parts[i]);
        if (!fs.existsSync(dirname)) {
            fs.mkdirSync(dirname);
        }
    }
    
    var headers = "";
    for (var i in meta) {
        headers += "// "+i+": "+meta[i]+"\n";
    }
    fs.writeFile(fn,headers+body,function(err) {
            //TODO: handle error
            res.writeHead(204, {'Content-Type': 'text/plain'});
            res.end();
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
        credentialsFile = fspath.join(userDir,"credentials.json");
        
        libDir = fspath.join(userDir,"lib");
        libFlowsDir = fspath.join(libDir,"flows");
        
        if (!fs.existsSync(libDir)) {
            fs.mkdirSync(libDir);
        }
        if (!fs.existsSync(libFlowsDir)) {
            fs.mkdirSync(libFlowsDir);
        }
        var defer = when.defer();
        defer.resolve();
        return defer.promise;
    },
    getFlows: function() {
        var defer = when.defer();
        fs.exists(flowsFullPath, function(exists) {
            if (exists) {
                util.log("[red] Loading flows : "+flowsFile);
                fs.readFile(flowsFullPath,'utf8',function(err,data) {
                    if (err) {
                        defer.reject(err);
                    } else {
                        try {
                            defer.resolve(JSON.parse(data));
                        } catch(err) {
                            defer.reject(err);
                        }
                    }
                });
            } else {
                util.log("[red] Flows file not found : "+flowsFile   );
                defer.resolve([]);
            }
        });
        return defer.promise;
    },
    saveFlows: function(flows) {
        var defer = when.defer();
        fs.writeFile(flowsFullPath, JSON.stringify(flows), function(err) {
                if(err) {
                    defer.reject(err);
                } else {
                    defer.resolve();
                }
        });
        return defer.promise;
    },
    
    getCredentials: function() {
        var defer = when.defer();
        fs.exists(credentialsFile, function(exists) {
            if (exists) {
                fs.readFile(credentialsFile,'utf8',function(err,data) {
                    if (err) {
                        defer.reject(err);
                    } else {
                        try {
                            defer.resolve(JSON.parse(data));
                        } catch(err) {
                            defer.reject(err);
                        }
                    }
                });
            } else {
                defer.resolve({});
            }
        });
        return defer.promise;
    },
    
    saveCredentials: function(credentials) {
        var defer = when.defer();
        fs.writeFile(credentialsFile, JSON.stringify(credentials), function(err) {
                if(err) {
                    defer.reject(err);
                } else {
                    defer.resolve();
                }
        });
        return defer.promise;
    },
    
    getAllFlows: function() {
        var defer = when.defer();
        defer.resolve(listFiles(libFlowsDir));
        return defer.promise;
    },
    
    getFlow: function(fn) {
        var defer = when.defer();
        
        var file = fspath.join(libFlowsDir,fn+".json");
        fs.exists(file, function(exists) {
            if (exists) {
                fs.readFile(file,'utf8',function(err,data) {
                    if (err) {
                        defer.reject(err);
                    } else {
                        defer.resolve(data);
                    }
                });
            } else {
                defer.reject();
            }
        });
        
        return defer.promise;
    },
    
    saveFlow: function(fn,data) {
        var defer = when.defer();
        var file = fspath.join(libFlowsDir,fn+".json");
        var parts = file.split("/");
        for (var i = 0;i<parts.length;i+=1) {
            var dirname = parts.slice(0,i).join("/");
            if (dirname != "" ){
                if (!fs.existsSync(dirname)) {
                    fs.mkdirSync(dirname);
                }
            }
        }
        fs.writeFile(file,data,function(err) {
            if (err) {
                defer.reject(err);
            } else {
                defer.resolve();
            }
        });
        return defer.promise;
    },
    
    getLibraryEntry: function(type,path) {
        var defer = when.defer();
        var root = fspath.join(libDir,type);
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root);
        }
        var rootPath = fspath.join(libDir,type,path);
        
        fs.lstat(rootPath,function(err,stats) {
            if (err) {
                defer.reject(err);
            } else if (stats.isFile()) {
                defer.resolve(getFileBody(root,path));
            } else {
                if (path.substr(-1) == '/') {
                    path = path.substr(0,path.length-1);
                }
                fs.readdir(rootPath,function(err,fns) {
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
                    defer.resolve(dirs.concat(files));
                });
            }
        });
        return defer.promise;
    },
    saveLibraryEntry: function(type,path,meta,body) {
        var defer = when.defer();
        
        var root = fspath.join(libDir,type);
        if (!fs.existsSync(root)) {
            fs.mkdirSync(root);
        }
        var fn = fspath.join(root,path);
        var parts = path.split("/");
        var dirname = root;
        for (var i=0;i<parts.length-1;i+=1) {
            dirname = fspath.join(dirname,parts[i]);
            if (!fs.existsSync(dirname)) {
                fs.mkdirSync(dirname);
            }
        }
        
        var headers = "";
        for (var i in meta) {
            headers += "// "+i+": "+meta[i]+"\n";
        }
        fs.writeFile(fn,headers+body,function(err) {
            if (err) {
                defer.reject(err);
            } else {
                defer.resolve();
            }
        });
        return defer.promise;
    }
};

module.exports = localfilesystem;
