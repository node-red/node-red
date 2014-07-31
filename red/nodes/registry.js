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
var cheerio = require("cheerio");
var UglifyJS = require("uglify-js");

var events = require("../events");

var Node;
var settings;

var node_types = {};
var node_configs = [];

//TODO: clear this cache whenever a node type is added/removed
var node_config_cache = null;

/**
 * Synchronously walks the directory looking for node files.
 * Emits 'node-icon-dir' events for an icon dirs found
 * @param dir the directory to search
 * @return an array of fully-qualified paths to .js files
 */
function getNodeFiles(dir) {
    var result = [];
    var files = fs.readdirSync(dir);
    files.sort();
    files.forEach(function(fn) {
        var stats = fs.statSync(path.join(dir,fn));
        if (stats.isFile()) {
            if (/\.js$/.test(fn)) {
                result.push(path.join(dir,fn));
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
 * @return an array of promises returned by loadNode
 */
function loadNodesFromModule(moduleDir,pkg) {
    var nodes = pkg['node-red'].nodes||{};
    var promises = [];
    var iconDirs = [];
    for (var n in nodes) {
        if (nodes.hasOwnProperty(n)) {
            promises.push(loadNode(path.join(moduleDir,nodes[n]),pkg.name,n));
            var iconDir = path.join(moduleDir,path.dirname(nodes[n]),"icons");
            if (iconDirs.indexOf(iconDir) == -1) {
                if (fs.existsSync(iconDir)) {
                    events.emit("node-icon-dir",iconDir);
                    iconDirs.push(iconDir);
                }
            }
        }
    }
    return promises;
}


/**
 * Loads the specified node into the registry.
 * @param nodeFile the fully qualified path of the node's .js file
 * @param nodeModule the name of the module (npm nodes only)
 * @param nodeName the name of the node (npm nodes only)
 * @return a promise that resolves to a node info object
 *         {
 *            name: the name of the node file, or label from the npm module
 *            module: the name of the node npm module (npm nodes only)
 *            path: the fully qualified path to the node's .js file
 *            template: the fully qualified path to the node's .html file
 *            config: the non-script parts of the node's .html file
 *            script: the script part of the node's .html file
 *            err: any error encountered whilst loading the node
 *         }
 * The node info object must be added to the node_config array by the caller.
 * This allows nodes to be added in a defined order, regardless of how async
 * their loading becomes.
 */
function loadNode(nodeFile, nodeModule, nodeName) {
    var nodeDir = path.dirname(nodeFile);
    var nodeFn = path.basename(nodeFile);

    if (settings.nodesExcludes) {
        for (var i=0;i<settings.nodesExcludes.length;i++) {
            if (settings.nodesExcludes[i] == nodeFn) {
                return when.resolve();
            }
        }
    }
    var nodeFilename = path.join(nodeDir,nodeFn);
    var nodeInfo = {name:nodeFn, path:nodeFilename};
    if (nodeModule) {
        nodeInfo.name = nodeModule+":"+nodeName;
        nodeInfo.module = nodeModule;
    }
    try {
        var loadPromise = null;
        var r = require(nodeFilename);
        if (typeof r === "function") {
            var promise = r(require('../red'));
            if (promise != null && typeof promise.then === "function") {
                loadPromise = promise.then(function() {
                    nodeInfo = loadTemplate(nodeInfo);
                    return when.resolve(nodeInfo);
                }).otherwise(function(err) {
                    nodeInfo.err = err;
                    return when.resolve(nodeInfo);
                });
            }
        }
        if (loadPromise == null) {
            nodeInfo = loadTemplate(nodeInfo);
            loadPromise = when.resolve(nodeInfo);
        }
        return loadPromise;
    } catch(err) {
        nodeInfo.err = err;
        return when.resolve(nodeInfo);
    }
}

/**
 * Loads the html template file for a node
 * @param templateFilanem
 */
function loadTemplate(nodeInfo) {
    
    var templateFilename = nodeInfo.path.replace(/\.js$/,".html");

    var content = fs.readFileSync(templateFilename,'utf8');
    
    $ = cheerio.load(content);
    var template = "";
    var script = "";
    $("*").each(function(i,el) {
        if (el.type == "script" && el.attribs.type == "text/javascript") {
            script += el.children[0].data;
        } else if (el.name == "script" || el.name == "style") {
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
    
    nodeInfo.template = templateFilename;
    nodeInfo.config = template;
    nodeInfo.script = script;
    return nodeInfo;
}

function init(_settings) {
    Node = require("./Node");
    settings = _settings;
}

/**
 * Loads all palette nodes
 * @param defaultNodesDir optional parameter, when set, it overrides the default location
 * of nodeFiles
 * @return a promise that resolves to a list of any errors encountered loading nodes
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
        
        // Find all of the modules containing nodes
        var moduleFiles = scanTreeForNodesModules();
        
        // Load all of the nodes in the order they were discovered
        var loadPromises = [];
        nodeFiles.forEach(function(file) {
            loadPromises.push(loadNode(file));
        });
        
        moduleFiles.forEach(function(file) {
            loadPromises = loadPromises.concat(loadNodesFromModule(file.dir,file.package));
        });
        
        when.settle(loadPromises).then(function(results) {
            var errors = [];
            results.forEach(function(result) {
                if (result.value.err) {
                    // Store the error to pass up
                    errors.push(result.value);
                } else {
                    node_configs.push(result.value);
                }
            });
            // Trigger a load of the configs to get it precached
            getNodeConfigs();
            
            resolve(errors);
        });
    });
}

/**
 * Gets all of the node template configs
 * @return all of the node templates in a single string
 */
function getNodeConfigs() {
    if (!node_config_cache) {
        var result = "";
        var script = "";
        for (var i=0;i<node_configs.length;i++) {
            var config = node_configs[i];
            result += config.config||"";
            script += config.script||"";
        }
        result += '<script type="text/javascript">';
        result += UglifyJS.minify(script, {fromString: true}).code;
        result += '</script>';
        node_config_cache = result;
    }
    return node_config_cache;
}


module.exports = {
    init:init,
    load:load,
    registerType: function(type,node) {
        util.inherits(node,Node);
        node_types[type] = node;
        events.emit("type-registered",type);
    },
    get: function(type) {
        return node_types[type];
    },
    getNodeConfigs: getNodeConfigs,
    
    loadNode: function(filename) {
        
    },
    removeNode: function(filename) {
        
    }
}
