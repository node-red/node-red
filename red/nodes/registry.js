/**
 * Copyright 2014 IBM Corp.
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
    }
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

var registry = (function() {
    var nodeConfigCache = null;
    var nodeConfigs = {};
    var nodeList = [];
    var nodeConstructors = {};
    var nodeTypeToId = {};
    var nodeModules = {};
    
    function saveNodeList() {
        var nodeList = {};
        
        for (var i in nodeConfigs) {
            if (nodeConfigs.hasOwnProperty(i)) {
                var nodeConfig = nodeConfigs[i];
                var n = filterNodeInfo(nodeConfig);
                n.file = nodeConfig.file;
                delete n.loaded;
                delete n.err;
                delete n.file;
                delete n.id;
                nodeList[i] = n;
            }
        }
        if (settings.available()) {
            return settings.set("nodes",nodeList);
        } else {
            return when.reject("Settings unavailable");
        }
    }
    
    return {
        init: function() {
            if (settings.available()) {
                nodeConfigs = settings.get("nodes")||{};
                // Restore the node id property to individual entries
                for (var id in nodeConfigs) {
                    if (nodeConfigs.hasOwnProperty(id)) {
                        nodeConfigs[id].id = id;
                    }
                }
            } else {
                nodeConfigs = {};
            }
            nodeModules = {};
            nodeTypeToId = {};
            nodeConstructors = {};
            nodeList = [];
            nodeConfigCache = null;
        },
        
        addNodeSet: function(id,set) {
            if (!set.err) {
                set.types.forEach(function(t) {
                    nodeTypeToId[t] = id;
                });
            }
            
            if (set.module) {
                nodeModules[set.module] = nodeModules[set.module]||{nodes:[]};
                nodeModules[set.module].nodes.push(id);
            }
            
            nodeConfigs[id] = set;
            nodeList.push(id);
            nodeConfigCache = null;
        },
        removeNode: function(id) {
            var config = nodeConfigs[id];
            if (!config) {
                throw new Error("Unrecognised id: "+id);
            }
            delete nodeConfigs[id];
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
            var nodes = nodeModules[module];
            if (!nodes) {
                throw new Error("Unrecognised module: "+module);
            }
            var infoList = [];
            for (var i=0;i<nodes.nodes.length;i++) {
                infoList.push(registry.removeNode(nodes.nodes[i]));
            }
            delete nodeModules[module];
            saveNodeList();
            return infoList;
        },
        getNodeInfo: function(typeOrId) {
            if (nodeTypeToId[typeOrId]) {
                return filterNodeInfo(nodeConfigs[nodeTypeToId[typeOrId]]);
            } else if (nodeConfigs[typeOrId]) {
                return filterNodeInfo(nodeConfigs[typeOrId]);
            }
            return null;
        },
        getNodeList: function() {
            var list = [];
            for (var id in nodeConfigs) {
                if (nodeConfigs.hasOwnProperty(id)) {
                    list.push(filterNodeInfo(nodeConfigs[id]))
                }
            }
            return list;
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
                    var config = nodeConfigs[nodeList[i]];
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
            var config = nodeConfigs[id];
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
            var config = nodeConfigs[nodeTypeToId[type]];
            if (!config || (config.enabled && !config.err)) {
                return nodeConstructors[type];
            }
            return null;
        },
        
        clear: function() {
            nodeConfigCache = null;
            nodeConfigs = {};
            nodeList = [];
            nodeConstructors = {};
            nodeTypeToId = {};
        },
        
        getTypeId: function(type) {
            return nodeTypeToId[type];
        },
        
        getModuleInfo: function(type) {
            return nodeModules[type];
        },
        
        enableNodeSet: function(id) {
            if (!settings.available()) {
                throw new Error("Settings unavailable");
            }
            var config = nodeConfigs[id];
            if (config) {
                delete config.err;
                config.enabled = true;
                if (!config.loaded) {
                    // TODO: honour the promise this returns
                    loadNodeModule(config);
                }
                nodeConfigCache = null;
                saveNodeList();
            } else {
                throw new Error("Unrecognised id: "+id);
            }
            return filterNodeInfo(config);
        },
        
        disableNodeSet: function(id) {
            if (!settings.available()) {
                throw new Error("Settings unavailable");
            }
            var config = nodeConfigs[id];
            if (config) {
                // TODO: persist setting
                config.enabled = false;
                nodeConfigCache = null;
                saveNodeList();
            } else {
                throw new Error("Unrecognised id: "+id);
            }
            return filterNodeInfo(config);
        },
        
        saveNodeList: saveNodeList,
        
        cleanNodeList: function() {
            var removed = false;
            for (var id in nodeConfigs) {
                if (nodeConfigs.hasOwnProperty(id)) {
                    if (nodeConfigs[id].module && !nodeModules[nodeConfigs[id].module]) {
                        registry.removeNode(id);
                        removed = true;
                    }
                }
            }
            if (removed) {
                saveNodeList();
            }
        }
    }
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
                valid = valid && fs.existsSync(path.join(dir,fn.replace(/\.js$/,".html")))
                
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

/**
 * Scans the node_modules path for nodes
 * @param moduleName the name of the module to be found
 * @return a list of node modules: {dir,package}
 */
function scanTreeForNodesModules(moduleName) {
    var dir = __dirname+"/../../nodes";
    var results = [];
    var up = path.resolve(path.join(dir,".."));
    while (up !== dir) {
        var pm = path.join(dir,"node_modules");
        try {
            var files = fs.readdirSync(pm);
            for (var i=0;i<files.length;i++) {
                var fn = files[i];
                if (!registry.getModuleInfo(fn)) {
                    if (!moduleName || fn == moduleName) {
                        var pkgfn = path.join(pm,fn,"package.json");
                        try {
                            var pkg = require(pkgfn);
                            if (pkg['node-red']) {
                                var moduleDir = path.join(pm,fn);
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
                results.push(loadNodeConfig(file,pkg.name,n));
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
function loadNodeConfig(file,module,name) {
    var id = crypto.createHash('sha1').update(file).digest("hex");
    if (module && name) {
        var newid = crypto.createHash('sha1').update(module+":"+name).digest("hex");
        var existingInfo = registry.getNodeInfo(id);
        if (existingInfo) {
            // For a brief period, id for modules were calculated incorrectly.
            // To prevent false-duplicates, this removes the old id entry
            registry.removeNode(id);
            registry.saveNodeList();
        }
        id = newid;

    }
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
        file: file,
        template: file.replace(/\.js$/,".html"),
        enabled: isEnabled,
        loaded:false
    }
    
    if (module) {
        node.name = module+":"+name;
        node.module = module;
    } else {
        node.name = path.basename(file)
    }
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
    registry.addNodeSet(id,node);
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
        if(defaultNodesDir) {
            nodeFiles = getNodeFiles(path.resolve(defaultNodesDir));
        } else {
            nodeFiles = getNodeFiles(__dirname+"/../../nodes");
        }
        
        if (settings.nodesDir) {
            var dir = settings.nodesDir;
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
                nodes.push(loadNodeConfig(file));
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
        nodes.push(loadNodeConfig(file));
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
    if (registry.getModuleInfo(module)) {
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
    getNodeModuleInfo: registry.getModuleInfo,
    getNodeList: registry.getNodeList,
    getNodeConfigs: registry.getAllNodeConfigs,
    getNodeConfig: registry.getNodeConfig,
    addNode: addNode,
    removeNode: registry.removeNode,
    enableNode: registry.enableNodeSet,
    disableNode: registry.disableNodeSet,
    
    addModule: addModule,
    removeModule: registry.removeModule,
    cleanNodeList: registry.cleanNodeList
}
