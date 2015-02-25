/**
 * Copyright 2014, 2015 IBM Corp.
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

var util = require("util");
var when = require("when");
var whenNode = require('when/node');
var fs = require("fs");
var path = require("path");
var crypto = require("crypto");
var UglifyJS = require("uglify-js");

var events = require("../events");

var Node;
var settings;

function filterNodeInfo(n) {
    var r = {
        id: n.id,
        name: n.name,
        types: n.types,
        enabled: n.enabled
    };
    if (n.hasOwnProperty("loaded")) {
        r.loaded = n.loaded;
    }
    if (n.hasOwnProperty("module")) {
        r.module = n.module;
    }
    if (n.hasOwnProperty("err")) {
        r.err = n.err.toString();
    }
    return r;
}

function getModule(id) {
    return id.split("/")[0];
}

function getNode(id) {
    return id.split("/")[1];
}

var registry = (function() {
    var nodeConfigCache = null;
    var moduleConfigs = {};
    var nodeList = [];
    var nodeConstructors = {};
    var nodeTypeToId = {};
    var moduleNodes = {};

    function saveNodeList() {
        var moduleList = {};

        for (var module in moduleConfigs) {
            if (moduleConfigs.hasOwnProperty(module)) {
                if (!moduleList[module]) {
                    moduleList[module] = {
                        name: module,
                        version: moduleConfigs[module].version,
                        nodes: {}
                    };
                }
                var nodes = moduleConfigs[module].nodes;
                for(var node in nodes) {
                    if (nodes.hasOwnProperty(node)) {
                        var config = nodes[node];
                        var n = filterNodeInfo(config);
                        delete n.loaded;
                        delete n.err;
                        delete n.file;
                        delete n.id;
                        moduleList[module].nodes[node] = n;
                    }
                }
            }
        }
        if (settings.available()) {
            return settings.set("nodes",moduleList);
        } else {
            return when.reject("Settings unavailable");
        }
    }

    function loadNodeConfigs() {
        var configs = settings.get("nodes");

        if (!configs) {
            return {};
        } else if (configs['node-red']) {
            return configs;
        } else {
            // Migrate from the 0.9.1 format of settings
            var newConfigs = {};
            for (var id in configs) {
                if (configs.hasOwnProperty(id)) {
                    var nodeConfig = configs[id];
                    var moduleName;
                    var nodeSetName;

                    if (nodeConfig.module) {
                        moduleName = nodeConfig.module;
                        nodeSetName = nodeConfig.name.split(":")[1];
                    } else {
                        moduleName = "node-red";
                        nodeSetName = nodeConfig.name.replace(/^\d+-/,"").replace(/\.js$/,"");
                    }

                    if (!newConfigs[moduleName]) {
                        newConfigs[moduleName] = {
                            name: moduleName,
                            nodes:{}
                        };
                    }
                    newConfigs[moduleName].nodes[nodeSetName] = {
                        name: nodeSetName,
                        types: nodeConfig.types,
                        enabled: nodeConfig.enabled,
                        module: moduleName
                    };
                }
            }
            settings.set("nodes",newConfigs);
            return newConfigs;
        }
    }

    return {
        init: function() {
            if (settings.available()) {
                moduleConfigs = loadNodeConfigs();
            } else {
                moduleConfigs = {};
            }
            moduleNodes = {};
            nodeTypeToId = {};
            nodeConstructors = {};
            nodeList = [];
            nodeConfigCache = null;
        },
        addNodeSet: function(id,set,version) {
            if (!set.err) {
                set.types.forEach(function(t) {
                    nodeTypeToId[t] = id;
                });
            }

            moduleNodes[set.module] = moduleNodes[set.module]||[];
            moduleNodes[set.module].push(set.name);

            if (!moduleConfigs[set.module]) {
                moduleConfigs[set.module] = {
                    name: set.module,
                    nodes: {}
                };
            }

            if (version) {
                moduleConfigs[set.module].version = version;
            }

            moduleConfigs[set.module].nodes[set.name] = set;
            nodeList.push(id);
            nodeConfigCache = null;
        },
        removeNode: function(id) {
            var config = moduleConfigs[getModule(id)].nodes[getNode(id)];
            if (!config) {
                throw new Error("Unrecognised id: "+id);
            }
            delete moduleConfigs[getModule(id)].nodes[getNode(id)];
            var i = nodeList.indexOf(id);
            if (i > -1) {
                nodeList.splice(i,1);
            }
            config.types.forEach(function(t) {
                delete nodeConstructors[t];
                delete nodeTypeToId[t];
            });
            config.enabled = false;
            config.loaded = false;
            nodeConfigCache = null;
            return filterNodeInfo(config);
        },
        removeModule: function(module) {
            if (!settings.available()) {
                throw new Error("Settings unavailable");
            }
            var nodes = moduleNodes[module];
            if (!nodes) {
                throw new Error("Unrecognised module: "+module);
            }
            var infoList = [];
            for (var i=0;i<nodes.length;i++) {
                infoList.push(registry.removeNode(module+"/"+nodes[i]));
            }
            delete moduleNodes[module];
            saveNodeList();
            return infoList;
        },
        getNodeInfo: function(typeOrId) {
            var id = typeOrId;
            if (nodeTypeToId[typeOrId]) {
                id = nodeTypeToId[typeOrId];
            }
            if (id) {
                var module = moduleConfigs[getModule(id)];
                if (module) {
                    var config = module.nodes[getNode(id)];
                    if (config) {
                        return filterNodeInfo(config);
                    }
                }
            }
            return null;
        },
        getNodeList: function() {
            var list = [];
            for (var module in moduleConfigs) {
                if (moduleConfigs.hasOwnProperty(module)) {
                    var nodes = moduleConfigs[module].nodes;
                    for (var node in nodes) {
                        if (nodes.hasOwnProperty(node)) {
                            list.push(filterNodeInfo(nodes[node]));
                        }
                    }
                }
            }
            return list;
        },
        getModuleList: function() {
            var list = [];
            for (var module in moduleNodes) {
                if (moduleNodes.hasOwnProperty(module)) {
                    var nodes = moduleNodes[module];
                    var m = {
                        name: module,
                        version: moduleConfigs[module].version,
                        nodes: []
                    };
                    for (var i = 0; i < nodes.length; ++i) {
                        m.nodes.push(filterNodeInfo(moduleConfigs[module].nodes[nodes[i]]));
                    }
                    list.push(m);
                }
            }
            return list;
        },
        getModuleInfo: function(module) {
            if (moduleNodes[module]) {
                var nodes = moduleNodes[module];
                var m = {
                    name: module,
                    version: moduleConfigs[module].version,
                    nodes: []
                };
                for (var i = 0; i < nodes.length; ++i) {
                    m.nodes.push(filterNodeInfo(moduleConfigs[module].nodes[nodes[i]]));
                }
                return m;
            } else {
                return null;
            }
        },
        getModuleVersion: function(module) {
            return moduleConfigs[module].version;
        },
        registerNodeConstructor: function(type,constructor) {
            if (nodeConstructors[type]) {
                throw new Error(type+" already registered");
            }
            //TODO: Ensure type is known - but doing so will break some tests
            //      that don't have a way to register a node template ahead
            //      of registering the constructor
            util.inherits(constructor,Node);
            nodeConstructors[type] = constructor;
            events.emit("type-registered",type);
        },

        /**
         * Gets all of the node template configs
         * @return all of the node templates in a single string
         */
        getAllNodeConfigs: function() {
            if (!nodeConfigCache) {
                var result = "";
                var script = "";
                for (var i=0;i<nodeList.length;i++) {
                    var id = nodeList[i];
                    var config = moduleConfigs[getModule(id)].nodes[getNode(id)];
                    if (config.enabled && !config.err) {
                        result += config.config;
                        script += config.script;
                    }
                }
                if (script.length > 0) {
                    result += '<script type="text/javascript">';
                    result += UglifyJS.minify(script, {fromString: true}).code;
                    result += '</script>';
                }
                nodeConfigCache = result;
            }
            return nodeConfigCache;
        },

        getNodeConfig: function(id) {
            var config = moduleConfigs[getModule(id)];
            if (!config) {
                return null;
            }
            config = config.nodes[getNode(id)];
            if (config) {
                var result = config.config;
                if (config.script) {
                    result += '<script type="text/javascript">'+config.script+'</script>';
                }
                return result;
            } else {
                return null;
            }
        },

        getNodeConstructor: function(type) {
            var id = nodeTypeToId[type];

            var config;
            if (typeof id === "undefined") {
                config = undefined;
            } else {
                config = moduleConfigs[getModule(id)].nodes[getNode(id)];
            }

            if (!config || (config.enabled && !config.err)) {
                return nodeConstructors[type];
            }
            return null;
        },

        clear: function() {
            nodeConfigCache = null;
            moduleConfigs = {};
            nodeList = [];
            nodeConstructors = {};
            nodeTypeToId = {};
        },

        getTypeId: function(type) {
            return nodeTypeToId[type];
        },

        getNodeModuleInfo: function(module) {
            return moduleNodes[module];
        },

        enableNodeSet: function(typeOrId) {
            if (!settings.available()) {
                throw new Error("Settings unavailable");
            }

            var id = typeOrId;
            if (nodeTypeToId[typeOrId]) {
                id = nodeTypeToId[typeOrId];
            }

            var config;
            try {
                config = moduleConfigs[getModule(id)].nodes[getNode(id)];
                delete config.err;
                config.enabled = true;
                if (!config.loaded) {
                    // TODO: honour the promise this returns
                    loadNodeModule(config);
                }
                nodeConfigCache = null;
                saveNodeList();
            } catch (err) {
                throw new Error("Unrecognised id: "+typeOrId);
            }
            return filterNodeInfo(config);
        },

        disableNodeSet: function(typeOrId) {
            if (!settings.available()) {
                throw new Error("Settings unavailable");
            }
            var id = typeOrId;
            if (nodeTypeToId[typeOrId]) {
                id = nodeTypeToId[typeOrId];
            }
            var config;
            try {
                config = moduleConfigs[getModule(id)].nodes[getNode(id)];
                // TODO: persist setting
                config.enabled = false;
                nodeConfigCache = null;
                saveNodeList();
            } catch (err) {
                throw new Error("Unrecognised id: "+id);
            }
            return filterNodeInfo(config);
        },

        saveNodeList: saveNodeList,

        cleanModuleList: function() {
            var removed = false;
            for (var mod in moduleConfigs) {
                if (moduleConfigs.hasOwnProperty(mod)) {
                    var nodes = moduleConfigs[mod].nodes;
                    var node;
                    if (mod == "node-red") {
                        // For core nodes, look for nodes that are enabled, !loaded and !errored
                        for (node in nodes) {
                            if (nodes.hasOwnProperty(node)) {
                                var n = nodes[node];
                                if (n.enabled && !n.err && !n.loaded) {
                                    registry.removeNode(mod+"/"+node);
                                    removed = true;
                                }
                            }
                        }
                    } else if (moduleConfigs[mod] && !moduleNodes[mod]) {
                        // For node modules, look for missing ones
                        for (node in nodes) {
                            if (nodes.hasOwnProperty(node)) {
                                registry.removeNode(mod+"/"+node);
                                removed = true;
                            }
                        }
                    }
                }
            }
            if (removed) {
                saveNodeList();
            }
        }
    };
})();



function init(_settings) {
    Node = require("./Node");
    settings = _settings;
    registry.init();
}

/**
 * Synchronously walks the directory looking for node files.
 * Emits 'node-icon-dir' events for an icon dirs found
 * @param dir the directory to search
 * @return an array of fully-qualified paths to .js files
 */
function getNodeFiles(dir) {
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
                var valid = true;
                if (settings.nodesExcludes) {
                    for (var i=0;i<settings.nodesExcludes.length;i++) {
                        if (settings.nodesExcludes[i] == fn) {
                            valid = false;
                            break;
                        }
                    }
                }
                valid = valid && fs.existsSync(path.join(dir,fn.replace(/\.js$/,".html")));

                if (valid) {
                    result.push(path.join(dir,fn));
                }
            }
        } else if (stats.isDirectory()) {
            // Ignore /.dirs/, /lib/ /node_modules/
            if (!/^(\..*|lib|icons|node_modules|test)$/.test(fn)) {
                result = result.concat(getNodeFiles(path.join(dir,fn)));
            } else if (fn === "icons") {
                events.emit("node-icon-dir",path.join(dir,fn));
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
            if (!registry.getNodeModuleInfo(fn)) {
                if (!moduleName || fn == moduleName) {
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
    var dir = __dirname+"/../../nodes";
    var results = [];
    var userDir;

    if (settings.userDir) {
        userDir = path.join(settings.userDir,"node_modules");
        results = results.concat(scanDirForNodesModules(userDir,moduleName));
    }
    
    var up = path.resolve(path.join(dir,".."));
    while (up !== dir) {
        var pm = path.join(dir,"node_modules");
        if (pm != userDir) {
            results = results.concat(scanDirForNodesModules(pm,moduleName));
        }
        dir = up;
        up = path.resolve(path.join(dir,".."));
    }
    return results;
}

/**
 * Loads the nodes provided in an npm package.
 * @param moduleDir the root directory of the package
 * @param pkg the module's package.json object
 */
function loadNodesFromModule(moduleDir,pkg) {
    var nodes = pkg['node-red'].nodes||{};
    var results = [];
    var iconDirs = [];
    for (var n in nodes) {
        if (nodes.hasOwnProperty(n)) {
            var file = path.join(moduleDir,nodes[n]);
            try {
                results.push(loadNodeConfig(file,pkg.name,n,pkg.version));
            } catch(err) {
            }
            var iconDir = path.join(moduleDir,path.dirname(nodes[n]),"icons");
            if (iconDirs.indexOf(iconDir) == -1) {
                if (fs.existsSync(iconDir)) {
                    events.emit("node-icon-dir",iconDir);
                    iconDirs.push(iconDir);
                }
            }
        }
    }
    return results;
}


/**
 * Loads a node's configuration
 * @param file the fully qualified path of the node's .js file
 * @param name the name of the node
 * @return the node object
 *         {
 *            id: a unqiue id for the node file
 *            name: the name of the node file, or label from the npm module
 *            file: the fully qualified path to the node's .js file
 *            template: the fully qualified path to the node's .html file
 *            config: the non-script parts of the node's .html file
 *            script: the script part of the node's .html file
 *            types: an array of node type names in this file
 *         }
 */
function loadNodeConfig(file,module,name,version) {
    var id = module + "/" + name;
    var info = registry.getNodeInfo(id);

    var isEnabled = true;

    if (info) {
        if (info.hasOwnProperty("loaded")) {
            throw new Error(file+" already loaded");
        }
        isEnabled = info.enabled;
    }

    var node = {
        id: id,
        module: module,
        name: name,
        file: file,
        template: file.replace(/\.js$/,".html"),
        enabled: isEnabled,
        loaded:false
    };

    try {
        var content = fs.readFileSync(node.template,'utf8');

        var types = [];

        var regExp = /<script ([^>]*)data-template-name=['"]([^'"]*)['"]/gi;
        var match = null;

        while((match = regExp.exec(content)) !== null) {
            types.push(match[2]);
        }
        node.types = types;
        node.config = content;

        // TODO: parse out the javascript portion of the template
        node.script = "";

        for (var i=0;i<node.types.length;i++) {
            if (registry.getTypeId(node.types[i])) {
                node.err = node.types[i]+" already registered";
                break;
            }
        }
    } catch(err) {
        node.types = [];
        if (err.code === 'ENOENT') {
            node.err = "Error: "+file+" does not exist";
        } else {
            node.err = err.toString();
        }
    }

    registry.addNodeSet(id,node,version);
    return node;
}

/**
 * Loads all palette nodes
 * @param defaultNodesDir optional parameter, when set, it overrides the default
 *                        location of nodeFiles - used by the tests
 * @return a promise that resolves on completion of loading
 */
function load(defaultNodesDir,disableNodePathScan) {
    return when.promise(function(resolve,reject) {
        // Find all of the nodes to load
        var nodeFiles;
        var dir;
        if(defaultNodesDir) {
            nodeFiles = getNodeFiles(path.resolve(defaultNodesDir));
        } else {
            nodeFiles = getNodeFiles(__dirname+"/../../nodes");
        }

        if (settings.userDir) {
            dir = path.join(settings.userDir,"nodes");
            nodeFiles = nodeFiles.concat(getNodeFiles(dir));
        }
        if (settings.nodesDir) {
            dir = settings.nodesDir;
            if (typeof settings.nodesDir == "string") {
                dir = [dir];
            }
            for (var i=0;i<dir.length;i++) {
                nodeFiles = nodeFiles.concat(getNodeFiles(dir[i]));
            }
        }
        var nodes = [];
        nodeFiles.forEach(function(file) {
            try {
                nodes.push(loadNodeConfig(file,"node-red",path.basename(file).replace(/^\d+-/,"").replace(/\.js$/,""),settings.version));
            } catch(err) {
                //
            }
        });

        // TODO: disabling npm module loading if defaultNodesDir set
        //       This indicates a test is being run - don't want to pick up
        //       unexpected nodes.
        //       Urgh.
        if (!disableNodePathScan) {
            // Find all of the modules containing nodes
            var moduleFiles = scanTreeForNodesModules();
            moduleFiles.forEach(function(moduleFile) {
                nodes = nodes.concat(loadNodesFromModule(moduleFile.dir,moduleFile.package));
            });
        }
        var promises = [];
        nodes.forEach(function(node) {
            if (!node.err) {
                promises.push(loadNodeModule(node));
            }
        });

        //resolve([]);
        when.settle(promises).then(function(results) {
            // Trigger a load of the configs to get it precached
            registry.getAllNodeConfigs();

            if (settings.available()) {
                resolve(registry.saveNodeList());
            } else {
                resolve();
            }
        });
    });
}

/**
 * Loads the specified node into the runtime
 * @param node a node info object - see loadNodeConfig
 * @return a promise that resolves to an update node info object. The object
 *         has the following properties added:
 *            err: any error encountered whilst loading the node
 *
 */
function loadNodeModule(node) {
    var nodeDir = path.dirname(node.file);
    var nodeFn = path.basename(node.file);
    if (!node.enabled) {
        return when.resolve(node);
    }
    try {
        var loadPromise = null;
        var r = require(node.file);
        if (typeof r === "function") {
            var promise = r(require('../red'));
            if (promise != null && typeof promise.then === "function") {
                loadPromise = promise.then(function() {
                    node.enabled = true;
                    node.loaded = true;
                    return node;
                }).otherwise(function(err) {
                    node.err = err;
                    return node;
                });
            }
        }
        if (loadPromise == null) {
            node.enabled = true;
            node.loaded = true;
            loadPromise = when.resolve(node);
        }
        return loadPromise;
    } catch(err) {
        node.err = err;
        return when.resolve(node);
    }
}

function loadNodeList(nodes) {
    var promises = [];
    nodes.forEach(function(node) {
        if (!node.err) {
            promises.push(loadNodeModule(node));
        } else {
            promises.push(node);
        }
    });

    return when.settle(promises).then(function(results) {
        return registry.saveNodeList().then(function() {
            var list = results.map(function(r) {
                return filterNodeInfo(r.value);
            });
            return list;
        });
    });
}

function addNode(file) {
    if (!settings.available()) {
        throw new Error("Settings unavailable");
    }
    var nodes = [];
    try {
        nodes.push(loadNodeConfig(file,"node-red",path.basename(file).replace(/^\d+-/,"").replace(/\.js$/,""),settings.version));
    } catch(err) {
        return when.reject(err);
    }
    return loadNodeList(nodes);
}

function addModule(module) {
    if (!settings.available()) {
        throw new Error("Settings unavailable");
    }
    var nodes = [];
    if (registry.getNodeModuleInfo(module)) {
        return when.reject(new Error("Module already loaded"));
    }
    var moduleFiles = scanTreeForNodesModules(module);
    if (moduleFiles.length === 0) {
        var err = new Error("Cannot find module '" + module + "'");
        err.code = 'MODULE_NOT_FOUND';
        return when.reject(err);
    }
    moduleFiles.forEach(function(moduleFile) {
        nodes = nodes.concat(loadNodesFromModule(moduleFile.dir,moduleFile.package));
    });
    return loadNodeList(nodes);
}

module.exports = {
    init:init,
    load:load,
    clear: registry.clear,
    registerType: registry.registerNodeConstructor,

    get: registry.getNodeConstructor,
    getNodeInfo: registry.getNodeInfo,
    getNodeList: registry.getNodeList,

    getNodeModuleInfo: registry.getNodeModuleInfo,

    getModuleInfo: registry.getModuleInfo,
    getModuleList: registry.getModuleList,
    getModuleVersion: registry.getModuleVersion,

    getNodeConfigs: registry.getAllNodeConfigs,
    getNodeConfig: registry.getNodeConfig,

    addNode: addNode,
    removeNode: registry.removeNode,
    enableNode: registry.enableNodeSet,
    disableNode: registry.disableNodeSet,

    addModule: addModule,
    removeModule: registry.removeModule,
    cleanModuleList: registry.cleanModuleList
};
