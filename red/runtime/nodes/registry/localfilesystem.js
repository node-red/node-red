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

var when = require("when");
var fs = require("fs");
var path = require("path");

var events;
var log;
var i18n;

var settings;
var disableNodePathScan = false;

function init(runtime) {
    settings = runtime.settings;
    events = runtime.events;
    log = runtime.log;
    i18n = runtime.i18n;
}

function isIncluded(name) {
    if (settings.nodesIncludes) {
        for (var i=0;i<settings.nodesIncludes.length;i++) {
            if (settings.nodesIncludes[i] == name) {
                return true;
            }
        }
    } else {
        return true;
    }
    return false;
}

function isExcluded(name) {
     if (settings.nodesExcludes) {
        for (var i=0;i<settings.nodesExcludes.length;i++) {
            if (settings.nodesExcludes[i] == name) {
                return true;
            }
        }
    }
    return false;
}
function getLocalFile(file) {
    if (!isIncluded(path.basename(file)) || isExcluded(path.basename(file))) {
        return null;
    }
    try {
        fs.statSync(file.replace(/\.js$/,".html"));
        return {
            file:    file,
            module:  "node-red",
            name:    path.basename(file).replace(/^\d+-/,"").replace(/\.js$/,""),
            version: settings.version
        };
    } catch(err) {
        return null;
    }
}


/**
 * Synchronously walks the directory looking for node files.
 * Emits 'node-icon-dir' events for an icon dirs found
 * @param dir the directory to search
 * @return an array of fully-qualified paths to .js files
 */
function getLocalNodeFiles(dir) {
    dir = path.resolve(dir);

    var result = [];
    var files = [];
    try {
        files = fs.readdirSync(dir);
    } catch(err) {
        return result;
    }
    files.sort();
    files.forEach(function(fn) {
        var stats = fs.statSync(path.join(dir,fn));
        if (stats.isFile()) {
            if (/\.js$/.test(fn)) {
                var info = getLocalFile(path.join(dir,fn));
                if (info) {
                    result.push(info);
                }
            }
        } else if (stats.isDirectory()) {
            // Ignore /.dirs/, /lib/ /node_modules/
            if (!/^(\..*|lib|icons|node_modules|test|locales)$/.test(fn)) {
                result = result.concat(getLocalNodeFiles(path.join(dir,fn)));
            } else if (fn === "icons") {
                events.emit("node-icon-dir",{name:'node-red',path:path.join(dir,fn)});
            }
        }
    });
    return result;
}

function scanDirForNodesModules(dir,moduleName) {
    var results = [];
    try {
        var files = fs.readdirSync(dir);
        for (var i=0;i<files.length;i++) {
            var fn = files[i];
            if (/^@/.test(fn)) {
                results = results.concat(scanDirForNodesModules(path.join(dir,fn),moduleName));
            } else {
                if (isIncluded(fn) && !isExcluded(fn) && (!moduleName || fn == moduleName)) {
                    var pkgfn = path.join(dir,fn,"package.json");
                    try {
                        var pkg = require(pkgfn);
                        if (pkg['node-red']) {
                            var moduleDir = path.join(dir,fn);
                            results.push({dir:moduleDir,package:pkg});
                        }
                    } catch(err) {
                        if (err.code != "MODULE_NOT_FOUND") {
                            // TODO: handle unexpected error
                        }
                    }
                    if (fn == moduleName) {
                        break;
                    }
                }
            }
        }
    } catch(err) {
    }
    return results;
}

/**
 * Scans the node_modules path for nodes
 * @param moduleName the name of the module to be found
 * @return a list of node modules: {dir,package}
 */
function scanTreeForNodesModules(moduleName) {
    var dir = settings.coreNodesDir;
    var results = [];
    var userDir;

    if (settings.userDir) {
        userDir = path.join(settings.userDir,"node_modules");
        results = scanDirForNodesModules(userDir,moduleName);
        results.forEach(function(r) { r.local = true; });
    }

    if (dir) {
        var up = path.resolve(path.join(dir,".."));
        while (up !== dir) {
            var pm = path.join(dir,"node_modules");
            if (pm != userDir) {
                results = results.concat(scanDirForNodesModules(pm,moduleName));
            }
            dir = up;
            up = path.resolve(path.join(dir,".."));
        }
    }
    return results;
}

function getModuleNodeFiles(module) {

    var moduleDir = module.dir;
    var pkg = module.package;

    var nodes = pkg['node-red'].nodes||{};
    var results = [];
    var iconDirs = [];

    for (var n in nodes) {
        /* istanbul ignore else */
        if (nodes.hasOwnProperty(n)) {
            var file = path.join(moduleDir,nodes[n]);
            results.push({
                file:    file,
                module:  pkg.name,
                name:    n,
                version: pkg.version
            });
            var iconDir = path.join(moduleDir,path.dirname(nodes[n]),"icons");
            if (iconDirs.indexOf(iconDir) == -1) {
                try {
                    fs.statSync(iconDir);
                    events.emit("node-icon-dir",{name:pkg.name,path:iconDir});
                    iconDirs.push(iconDir);
                } catch(err) {
                }
            }
        }
    }
    var examplesDir = path.join(moduleDir,"examples");
    try {
        fs.statSync(examplesDir)
        events.emit("node-examples-dir",{name:pkg.name,path:examplesDir});
    } catch(err) {
    }
    return results;
}

function getNodeFiles(disableNodePathScan) {
    var dir;
    // Find all of the nodes to load
    var nodeFiles = [];

    if (settings.coreNodesDir) {
        nodeFiles = getLocalNodeFiles(path.resolve(settings.coreNodesDir));
        var defaultLocalesPath = path.join(settings.coreNodesDir,"core","locales");
        i18n.registerMessageCatalog("node-red",defaultLocalesPath,"messages.json");
    }

    if (settings.userDir) {
        dir = path.join(settings.userDir,"nodes");
        nodeFiles = nodeFiles.concat(getLocalNodeFiles(dir));
    }
    if (settings.nodesDir) {
        dir = settings.nodesDir;
        if (typeof settings.nodesDir == "string") {
            dir = [dir];
        }
        for (var i=0;i<dir.length;i++) {
            nodeFiles = nodeFiles.concat(getLocalNodeFiles(dir[i]));
        }
    }

    var nodeList = {
        "node-red": {
            name: "node-red",
            version: settings.version,
            nodes: {}
        }
    }
    nodeFiles.forEach(function(node) {
        nodeList["node-red"].nodes[node.name] = node;
    });

    if (!disableNodePathScan) {
        var moduleFiles = scanTreeForNodesModules();
        moduleFiles.forEach(function(moduleFile) {
            var nodeModuleFiles = getModuleNodeFiles(moduleFile);
            nodeList[moduleFile.package.name] = {
                name: moduleFile.package.name,
                version: moduleFile.package.version,
                local: moduleFile.local||false,
                nodes: {}
            };
            if (moduleFile.package['node-red'].version) {
                nodeList[moduleFile.package.name].redVersion = moduleFile.package['node-red'].version;
            }
            nodeModuleFiles.forEach(function(node) {
                node.local = moduleFile.local||false;
                nodeList[moduleFile.package.name].nodes[node.name] = node;
            });
            nodeFiles = nodeFiles.concat(nodeModuleFiles);
        });
    } else {
        console.log("node path scan disabled");
    }
    return nodeList;
}

function getModuleFiles(module) {
    var nodeList = {};

    var moduleFiles = scanTreeForNodesModules(module);
    if (moduleFiles.length === 0) {
        var err = new Error(log._("nodes.registry.localfilesystem.module-not-found", {module:module}));
        err.code = 'MODULE_NOT_FOUND';
        throw err;
    }

    moduleFiles.forEach(function(moduleFile) {
        var nodeModuleFiles = getModuleNodeFiles(moduleFile);
        nodeList[moduleFile.package.name] = {
            name: moduleFile.package.name,
            version: moduleFile.package.version,
            nodes: {}
        };
        if (moduleFile.package['node-red'].version) {
            nodeList[moduleFile.package.name].redVersion = moduleFile.package['node-red'].version;
        }
        nodeModuleFiles.forEach(function(node) {
            nodeList[moduleFile.package.name].nodes[node.name] = node;
            nodeList[moduleFile.package.name].nodes[node.name].local = moduleFile.local || false;
        });
    });
    return nodeList;
}


module.exports = {
    init: init,
    getNodeFiles: getNodeFiles,
    getLocalFile: getLocalFile,
    getModuleFiles: getModuleFiles
}
