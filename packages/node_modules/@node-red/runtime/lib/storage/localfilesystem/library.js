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

var util = require("./util");

var settings;
var libDir;
var libFlowsDir;

function getFileMeta(root, path) {
    var fn = fspath.join(root, path);
    var fd = fs.openSync(fn, 'r');
    var size = fs.fstatSync(fd).size;
    var meta = {};
    var read = 0;
    var length = 10;
    var remaining = Buffer.alloc(0);
    var buffer = Buffer.alloc(length);
    while (read < size) {
        read += fs.readSync(fd, buffer, 0, length);
        var data = Buffer.concat([remaining, buffer]);
        var index = data.lastIndexOf(0x0a);
        if (index !== -1) {
            var parts = data.slice(0, index).toString().split('\n');
            for (var i = 0; i < parts.length; i++) {
                var match = /^\/\/ (\w+): (.*)/.exec(parts[i]);
                if (match) {
                    meta[match[1]] = match[2];
                } else {
                    read = size;
                    break;
                }
            }
            remaining = data.slice(index + 1);
        } else {
            remaining = data;
        }
    }
    fs.closeSync(fd);
    return meta;
}

function getFileBody(root, path) {
    var body = '';
    var fn = fspath.join(root, path);
    var data = fs.readFileSync(fn, 'utf8');
    var parts = data.split('\n');
    var scanning = true;
    for (var i = 0; i < parts.length; i++) {
        if (! /^\/\/ \w+: /.test(parts[i]) || !scanning) {
            body += (body.length > 0 ? '\n' : '') + parts[i];
            scanning = false;
        }
    }
    return body;
}

function getLibraryEntry(type,path) {
    var root = fspath.join(libDir,type);
    var rootPath = fspath.join(libDir,type,path);

    // don't create the folder if it does not exist - we are only reading....
    return nodeFn.call(fs.lstat, rootPath).then(function(stats) {
        if (stats.isFile()) {
            return getFileBody(root,path);
        }
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
    }).catch(function(err) {
        // if path is empty, then assume it was a folder, return empty
        if (path === ""){
            return [];
        }

        // if path ends with slash, it was a folder
        // so return empty
        if (path.substr(-1) == '/') {
            return [];
        }

        // else path was specified, but did not exist,
        // check for path.json as an alternative if flows
        if (type === "flows" && !/\.json$/.test(path)) {
            return getLibraryEntry(type,path+".json")
            .catch(function(e) {
                throw err;
            });
        } else {
            throw err;
        }
    });
}

module.exports = {
    init: function(_settings) {
        settings = _settings;
        libDir = fspath.join(settings.userDir,"lib");
        libFlowsDir = fspath.join(libDir,"flows");
        if (!settings.readOnly) {
            return fs.ensureDir(libFlowsDir);
        } else {
            return when.resolve();
        }
    },
    getLibraryEntry: getLibraryEntry,

    saveLibraryEntry: function(type,path,meta,body) {
        if (settings.readOnly) {
            return when.resolve();
        }
        if (type === "flows" && !path.endsWith(".json")) {
            path += ".json";
        }
        var fn = fspath.join(libDir, type, path);
        var headers = "";
        for (var i in meta) {
            if (meta.hasOwnProperty(i)) {
                headers += "// "+i+": "+meta[i]+"\n";
            }
        }
        if (type === "flows" && settings.flowFilePretty) {
            body = JSON.stringify(JSON.parse(body),null,4);
        }
        return fs.ensureDir(fspath.dirname(fn)).then(function () {
            util.writeFile(fn,headers+body);
        });
    }
}
