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

var fs = require("fs");
var fspath = require("path");
var redApp = null;

function init() {
    redApp = require("./server").app;
    // -------- Flow Library --------
    redApp.post(new RegExp("/library/flows\/(.*)"), function(req,res) {
            var fullBody = '';
            req.on('data', function(chunk) {
                    fullBody += chunk.toString();
            });
            req.on('end', function() {
                    var fn = "lib/flows/"+req.params[0]+".json";
                    var parts = fn.split("/");
                    for (var i = 3;i<parts.length;i+=1) {
                        var dirname = parts.slice(0,i).join("/");
                        if (!fs.existsSync(dirname)) {
                            fs.mkdirSync(dirname);
                        }
                    }
                    fs.writeFile(fn,fullBody,function(err) {
                            res.writeHead(204, {'Content-Type': 'text/plain'});
                            res.end();
                    });
                    
            });
    });
    
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
    
    redApp.get("/library/flows",function(req,res) {
            var flows = {};
            if (fs.existsSync("lib/flows")) {
                flows = listFiles("lib/flows");
            } else {
                fs.mkdirSync("lib/flows");
            }
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(JSON.stringify(flows));
            res.end();
            
    });
    
    redApp.get(new RegExp("/library/flows\/(.*)"), function(req,res) {
            var fn = "lib/flows/"+req.params[0]+".json";
            if (fs.existsSync(fn)) {
                fs.readFile(fn,function(err,data) {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.write(data);
                        res.end();
                });
            } else {
                res.send(404);
            }
    });
    
    // ------------------------------
}    

function createLibrary(type) {
    
    //TODO: use settings.library as the base root
    
    var root = fspath.join("lib",type)+"/";
    
    fs.exists(root,function(exists) {
            if (!exists) {
                fs.mkdir(root);
            }
    });
    redApp.get(new RegExp("/library/"+type+"($|\/(.*))"),function(req,res) {
            var path = req.params[1]||"";
            var rootPath = fspath.join(root,path);
            
            fs.exists(rootPath,function(exists) {
                    fs.lstat(rootPath,function(err,stats) {
                            if (stats.isFile()) {
                                getFileBody(root,path,res);
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
                                        res.writeHead(200, {'Content-Type': 'text/plain'});
                                        res.write(JSON.stringify(dirs.concat(files)));
                                        res.end();
                                });
                            }
                            
                    });
            });
    });
    
    redApp.post(new RegExp("/library/"+type+"\/(.*)"),function(req,res) {
            var path = req.params[0];
            var fullBody = '';
            req.on('data', function(chunk) {
                    fullBody += chunk.toString();
            });
            req.on('end', function() {
                    writeFile(root,path,req.query,fullBody,res);
            });
    });
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
function getFileBody(root,path,res) {
    var fn = fspath.join(root,path);
    res.writeHead(200, {'Content-Type': 'text/plain'});
    var fd = fs.openSync(fn,"r");
    var size = fs.fstatSync(fd).size;
    var scanning = true;
    var read = 0;
    var length = 10;
    var offset = 0;
    var remaining = "";
    var buffer = Buffer(length);
    while(read < size) {
        var thisRead = fs.readSync(fd,buffer,0,length);
        read += thisRead;
        if (scanning) {
            var data = remaining+buffer.toString();
            var parts = data.split("\n");
            remaining = parts.splice(-1)[0];
            for (var i=0;i<parts.length;i+=1) {
                if (! /^\/\/ \w+: /.test(parts[i])) {
                    scanning = false;
                    res.write(parts[i]+"\n");
                }
            }
            if (! /^\/\/ \w+: /.test(remaining)) {
                scanning = false;
            }
            
            if (!scanning) {
                res.write(remaining);
            }
        } else {
            res.write(buffer.slice(0,thisRead));
        }
    }
    fs.closeSync(fd);
    res.end();
}

module.exports.init = init;
module.exports.register = createLibrary;
