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

const fs = require("fs");
const path = require("path");
const log = require("@node-red/util").log;
const i18n = require("@node-red/util").i18n;
const registryUtil = require("./util");

// Default allow/deny lists
let loadAllowList = ['*'];
let loadDenyList = [];


var settings;
var disableNodePathScan = false;
var iconFileExtensions = [".png", ".gif", ".svg"];
var packageList = {};

function init(_settings) {
    settings = _settings;
    // TODO: This is duplicated in installer.js
    //       Should it *all* be managed by util?
    if (settings.externalModules && settings.externalModules.palette) {
        if (settings.externalModules.palette.allowList || settings.externalModules.palette.denyList) {
            loadAllowList = settings.externalModules.palette.allowList;
            loadDenyList = settings.externalModules.palette.denyList;
        }
    }
    loadAllowList = registryUtil.parseModuleList(loadAllowList);
    loadDenyList = registryUtil.parseModuleList(loadDenyList);
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
 * @param dir the directory to search
 * @return an array of fully-qualified paths to .js files
 */
function getLocalNodeFiles(dir) {
    dir = path.resolve(dir);

    var result = [];
    var files = [];
    var icons = [];
    try {
        files = fs.readdirSync(dir);
    } catch(err) {
        return {files: [], icons: []};
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
                var subDirResults = getLocalNodeFiles(path.join(dir,fn));
                result = result.concat(subDirResults.files);
                icons = icons.concat(subDirResults.icons);
            } else if (fn === "icons") {
                var iconList = scanIconDir(path.join(dir,fn));
                icons.push({path:path.join(dir,fn),icons:iconList});
            }
        }
    });
    return {files: result, icons: icons}
}

function scanDirForNodesModules(dir,moduleName) {
    var results = [];
    var scopeName;
    try {
        var files = fs.readdirSync(dir);
        if (moduleName) {
            var m = /^(?:(@[^/]+)[/])?([^@/]+)/.exec(moduleName);
            if (m) {
                scopeName = m[1];
                moduleName = m[2];
            }
        }
        for (var i=0;i<files.length;i++) {
            var fn = files[i];
            if (/^@/.test(fn)) {
                if (scopeName && scopeName === fn) {
                    // Looking for a specific scope/module
                    results = results.concat(scanDirForNodesModules(path.join(dir,fn),moduleName));
                    break;
                } else {
                    results = results.concat(scanDirForNodesModules(path.join(dir,fn),moduleName));
                }
            } else {
                if (isIncluded(fn) && !isExcluded(fn) && (!moduleName || fn == moduleName)) {
                    var pkgfn = path.join(dir,fn,"package.json");
                    try {
                        var pkg = require(pkgfn);
                        if (pkg['node-red']) {
                            if (!registryUtil.checkModuleAllowed(pkg.name,pkg.version,loadAllowList,loadDenyList)) {
                                log.debug("! Module: "+pkg.name+" "+pkg.version+ " *ignored due to denyList*");
                            } else {
                                var moduleDir = path.join(dir,fn);
                                results.push({dir:moduleDir,package:pkg});
                            }
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
        packageList = getPackageList();
        userDir = path.join(settings.userDir,"node_modules");
        results = scanDirForNodesModules(userDir,moduleName);
        results.forEach(function(r) {
            // If it was found in <userDir>/node_modules then it is considered
            // a local module.
            // Also check to see if it is listed in the package.json file as a user-installed
            // module. This distinguishes modules installed as a dependency
            r.local = true;
            r.user = !!packageList[r.package.name];
        });
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

    var iconDirs = [];
    var iconList = [];

    function scanTypes(types) {
        const files = [];
        for (var n in types) {
            /* istanbul ignore else */
            if (types.hasOwnProperty(n)) {
                var file = path.join(moduleDir,types[n]);
                files.push({
                    file:    file,
                    module:  pkg.name,
                    name:    n,
                    version: pkg.version
                });
                var iconDir = path.join(moduleDir,path.dirname(types[n]),"icons");
                if (iconDirs.indexOf(iconDir) == -1) {
                    try {
                        fs.statSync(iconDir);
                        var icons = scanIconDir(iconDir);
                        iconList.push({path:iconDir,icons:icons});
                        iconDirs.push(iconDir);
                    } catch(err) {
                    }
                }
            }
        }
        return files;
    }

    var result = {
        nodeFiles:scanTypes(pkg['node-red'].nodes||{}),
        pluginFiles:scanTypes(pkg['node-red'].plugins||{}),
        icons:iconList
    };

    var examplesDir = path.join(moduleDir,"examples");
    try {
        fs.statSync(examplesDir)
        result.examples = {path:examplesDir};
    } catch(err) {
    }

    var resourcesDir = path.join(moduleDir,"resources");
    try {
        fs.statSync(resourcesDir)
        result.resources = {path:resourcesDir};
    } catch(err) {
    }

    return result;
}

function getNodeFiles(disableNodePathScan) {
    var dir;
    // Find all of the nodes to load
    var nodeFiles = [];
    var results;

    var dir;
    var iconList = [];
    if (settings.coreNodesDir) {
        results = getLocalNodeFiles(path.resolve(settings.coreNodesDir));
        nodeFiles = nodeFiles.concat(results.files);
        iconList = iconList.concat(results.icons);
        var defaultLocalesPath = path.join(settings.coreNodesDir,"locales");
        i18n.registerMessageCatalog("node-red",defaultLocalesPath,"messages.json");
    }

    if (settings.userDir) {
        dir = path.join(settings.userDir,"lib","icons");
        var icons = scanIconDir(dir);
        if (icons.length > 0) {
            iconList.push({path:dir,icons:icons});
        }

        dir = path.join(settings.userDir,"nodes");
        results = getLocalNodeFiles(path.resolve(dir));
        nodeFiles = nodeFiles.concat(results.files);
        iconList = iconList.concat(results.icons);
    }
    if (settings.nodesDir) {
        dir = settings.nodesDir;
        if (typeof settings.nodesDir == "string") {
            dir = [dir];
        }
        for (var i=0;i<dir.length;i++) {
            results = getLocalNodeFiles(dir[i]);
            nodeFiles = nodeFiles.concat(results.files);
            iconList = iconList.concat(results.icons);
        }
    }

    var coreNodeEntry = {
        name: "node-red",
        version: settings.version,
        nodes: {},
        icons: iconList
    }
    var nodeList = {
        "node-red": coreNodeEntry
    };
    nodeFiles.forEach(function(node) {
        coreNodeEntry.nodes[node.name] = node;
    });
    if (settings.coreNodesDir) {
        var examplesDir = path.join(settings.coreNodesDir,"examples");
        coreNodeEntry.examples = {path: examplesDir};
    }

    if (!disableNodePathScan) {
        var moduleFiles = scanTreeForNodesModules();

        // Filter the module list to ignore global modules
        // that have also been installed locally - allowing the user to
        // update a module they may not otherwise be able to touch
        moduleFiles.sort(function(A,B) {
            if (A.local && !B.local) {
                return -1
            } else if (!A.local && B.local) {
                return 1
            }
            return 0;
        })
        var knownModules = {};
        moduleFiles = moduleFiles.filter(function(mod) {
            var result;
            if (!knownModules[mod.package.name]) {
                knownModules[mod.package.name] = mod;
                result = true;
            } else {
                result = false;
            }
            log.debug((result?"":"! ")+"Module: "+mod.package.name+" "+mod.package.version+" "+mod.dir+(result?"":" *ignored due to local copy*"));
            return result;
        });

        // Do a second pass to check we have all the declared node dependencies
        // As this is only done as part of the initial palette load, `knownModules` will
        // contain a list of everything discovered during this phase. This means
        // we can check for missing dependencies here.
        moduleFiles = moduleFiles.filter(function(mod) {
            if (Array.isArray(mod.package["node-red"].dependencies)) {
                const deps = mod.package["node-red"].dependencies;
                const missingDeps = mod.package["node-red"].dependencies.filter(dep => {
                    if (knownModules[dep]) {
                        knownModules[dep].usedBy = knownModules[dep].usedBy || [];
                        knownModules[dep].usedBy.push(mod.package.name)
                    } else {
                        return true;
                    }
                })
                if (missingDeps.length > 0) {
                    log.error(`Module: ${mod.package.name} missing dependencies:`);
                    missingDeps.forEach(m => { log.error(` - ${m}`)});
                    return false;
                }
            }
            return true;
        });
        nodeList = convertModuleFileListToObject(moduleFiles, nodeList);
    } else {
        // console.log("node path scan disabled");
    }
    return nodeList;
}

function getModuleFiles(module) {
    // Update the package list
    var moduleFiles = scanTreeForNodesModules(module);
    if (moduleFiles.length === 0) {
        var err = new Error(log._("nodes.registry.localfilesystem.module-not-found", {module:module}));
        err.code = 'MODULE_NOT_FOUND';
        throw err;
    }
    // Unlike when doing the initial palette load, this call cannot verify the
    // dependencies of the new module as it doesn't have visiblity of what
    // is in the registry. That will have to be done be the caller in loader.js
    return convertModuleFileListToObject(moduleFiles);
}

function convertModuleFileListToObject(moduleFiles,seedObject) {
    const nodeList = seedObject || {};
    moduleFiles.forEach(function(moduleFile) {

        var nodeModuleFiles = getModuleNodeFiles(moduleFile);
        nodeList[moduleFile.package.name] = {
            name: moduleFile.package.name,
            version: moduleFile.package.version,
            path: moduleFile.dir,
            local: moduleFile.local||false,
            user: moduleFile.user||false,
            nodes: {},
            plugins: {},
            resources: nodeModuleFiles.resources,
            icons: nodeModuleFiles.icons,
            examples: nodeModuleFiles.examples
        };
        if (moduleFile.package['node-red'].version) {
            nodeList[moduleFile.package.name].redVersion = moduleFile.package['node-red'].version;
        }
        if (moduleFile.package['node-red'].dependencies) {
            nodeList[moduleFile.package.name].dependencies = moduleFile.package['node-red'].dependencies;
        }
        if (moduleFile.usedBy) {
            nodeList[moduleFile.package.name].usedBy = moduleFile.usedBy;
        }
        nodeModuleFiles.nodeFiles.forEach(function(node) {
            nodeList[moduleFile.package.name].nodes[node.name] = node;
            nodeList[moduleFile.package.name].nodes[node.name].local = moduleFile.local || false;
        });
        nodeModuleFiles.pluginFiles.forEach(function(plugin) {
            nodeList[moduleFile.package.name].plugins[plugin.name] = plugin;
            nodeList[moduleFile.package.name].plugins[plugin.name].local = moduleFile.local || false;
        });
    });
    return nodeList;
}

// If this finds an svg and a png with the same name, it will only list the svg
function scanIconDir(dir) {
    var iconList = [];
    var svgs = {};
    try {
        var files = fs.readdirSync(dir);
        files.forEach(function(file) {
            var stats = fs.statSync(path.join(dir, file));
            var ext = path.extname(file).toLowerCase();
            if (stats.isFile() && iconFileExtensions.indexOf(ext) !== -1) {
                iconList.push(file);
                if (ext === ".svg") {
                    svgs[file.substring(0,file.length-4)] = true;
                }
            }
        });
    } catch(err) {
    }
    iconList = iconList.filter(f => {
        return /.svg$/i.test(f) || !svgs[f.substring(0,f.length-4)]
    })
    return iconList;
}
/**
 * Gets the list of modules installed in this runtime as reported by package.json
 * Note: these may include non-Node-RED modules
 */
function getPackageList() {
    var list = {};
    if (settings.userDir) {
        try {
            var userPackage = path.join(settings.userDir,"package.json");
            var pkg = JSON.parse(fs.readFileSync(userPackage,"utf-8"));
            return pkg.dependencies || {};
        } catch(err) {
            log.error(err);
        }
    }
    return list;
}

module.exports = {
    init: init,
    getNodeFiles: getNodeFiles,
    getLocalFile: getLocalFile,
    getModuleFiles: getModuleFiles
}
