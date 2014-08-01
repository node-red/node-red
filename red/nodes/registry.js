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
var cheerio = require("cheerio");
var UglifyJS = require("uglify-js");

var events = require("../events");

var Node;
var settings;

var registry = (function() {
    var nodeConfigCache = null;
    var nodeConfigs = {};
    var nodeList = [];
    var nodeConstructors = {};
    
    return {
        addNodeSet: function(id,set) {
            nodeConfigs[id] = set;
            nodeList.push(id);
        },
        getNodeList: function() {
            return nodeList.map(function(id) {
                var n = nodeConfigs[id];
                var r = {
                    id: n.id,
                    types: n.types,
                    name: n.name,
                    enabled: n.enabled
                }
                if (n.err) {
                    r.err = n.err.toString();
                }
                return r;
            });
        },
        registerNodeConstructor: function(type,constructor) {
            if (nodeConstructors[type]) {
                throw new Error(type+" already registered");
            }
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
                    if (config.enabled) {
                        result += config.config||"";
                        script += config.script||"";
                    }
                }
                result += '<script type="text/javascript">';
                result += UglifyJS.minify(script, {fromString: true}).code;
                result += '</script>';
                nodeConfigCache = result;
            }
            return nodeConfigCache;
        },
        
        getNodeConfig: function(id) {
            var config = nodeConfigs[id];
            if (config) {
                var result = config.config||"";
                result += '<script type="text/javascript">'+(config.script||"")+'</script>';
                return result;
            } else {
                return null;
            }
        },
        
        getNodeConstructor: function(type) {
            return nodeConstructors[type];
        },
        
        clear: function() {
            nodeConfigCache = null;
            nodeConfigs = {};
            nodeList = [];
            nodeConstructors = {};
        }
    }
})();



function init(_settings) {
    Node = require("./Node");
    settings = _settings;
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
            files.forEach(function(fn) {
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
                }
            });
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
            results.push(loadNodeConfig(path.join(moduleDir,nodes[n]),pkg.name+":"+n));
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
function loadNodeConfig(file,name) {
    var id = crypto.createHash('sha1').update(file).digest("hex");

    var node = {
        id: id,
        file: file,
        name: name||path.basename(file),
        template: file.replace(/\.js$/,".html"),
        enabled: true
    }
    
    var content = fs.readFileSync(node.template,'utf8');
    
    var $ = cheerio.load(content);
    var template = "";
    var script = "";
    var types = [];
    
    $("*").each(function(i,el) {
        if (el.type == "script" && el.attribs.type == "text/javascript") {
            script += el.children[0].data;
        } else if (el.name == "script" || el.name == "style") {
            if (el.attribs.type == "text/x-red" && el.attribs['data-template-name']) {
                types.push(el.attribs['data-template-name'])
            }
            var openTag = "<"+el.name;
            var closeTag = "</"+el.name+">";
            if (el.attribs) {
                for (var j in el.attribs) {
                    if (el.attribs.hasOwnProperty(j)) {
                        openTag += " "+j+'="'+el.attribs[j]+'"';
                    }
                }
            }
            openTag += ">";
            template += openTag+$(el).text()+closeTag;
        }
    });
    node.types = types;
    node.config = template;
    node.script = script;
    
    registry.addNodeSet(id,node);
    return node;
}

/**
 * Loads all palette nodes
 * @param defaultNodesDir optional parameter, when set, it overrides the default
 *                        location of nodeFiles - used by the tests
 * @return a promise that resolves on completion of loading
 */
function load(defaultNodesDir) {
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
            nodes.push(loadNodeConfig(file));
        });
        
        // TODO: disabling npm module loading if defaultNodesDir set
        //       This indicates a test is being run - don't want to pick up
        //       unexpected nodes.
        //       Urgh.
        if (!defaultNodesDir) {
            // Find all of the modules containing nodes
            var moduleFiles = scanTreeForNodesModules();
            moduleFiles.forEach(function(moduleFile) {
                nodes = nodes.concat(loadNodesFromModule(moduleFile.dir,moduleFile.package));
            });
        }
        var promises = [];
        nodes.forEach(function(node) {
            promises.push(loadNode(node));
        });
        
        //resolve([]);
        when.settle(promises).then(function(results) {
            // Trigger a load of the configs to get it precached
            registry.getAllNodeConfigs();
            
            resolve();
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
function loadNode(node) {
    var nodeDir = path.dirname(node.file);
    var nodeFn = path.basename(node.file);
    try {
        var loadPromise = null;
        var r = require(node.file);
        if (typeof r === "function") {
            var promise = r(require('../red'));
            if (promise != null && typeof promise.then === "function") {
                loadPromise = promise.then(function() {
                    node.enabled = true;
                    return node;
                }).otherwise(function(err) {
                    node.err = err;
                    node.enabled = false;
                    return node;
                });
            }
        }
        if (loadPromise == null) {
            node.enabled = true;
            loadPromise = when.resolve(node);
        }
        return loadPromise;
    } catch(err) {
        node.err = err;
        node.enabled = false;
        return when.resolve(node);
    }
}


module.exports = {
    init:init,
    load:load,
    clear: registry.clear,
    registerType: registry.registerNodeConstructor,
    get: registry.getNodeConstructor,
    getNodeList: registry.getNodeList,
    getNodeConfigs: registry.getAllNodeConfigs,
    getNodeConfig: registry.getNodeConfig,
}
