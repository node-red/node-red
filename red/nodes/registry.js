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
var node_scripts = [];

function loadTemplate(templateFilename) {
    return when.promise(function(resolve,reject) {
        whenNode.call(fs.readFile,templateFilename,'utf8').done(function(content) {
            try {
                registerConfig(content);
            } catch(err) {
                reject("invalid template file: "+err.message);
            }
            resolve();
        }, function(err) {
            reject("missing template file");
        });
        
    });
}

// Return a promise that resolves to:
//  success: {fn,path}
//  failure: {fn.path,err}
function loadNode(nodeDir, nodeFn, nodeLabel) {
    return when.promise(function(resolve,reject) {
        if (settings.nodesExcludes) {
            for (var i=0;i<settings.nodesExcludes.length;i++) {
                if (settings.nodesExcludes[i] == nodeFn) {
                    //resolve({fn:nodeFn,path:nodeFilename,err:"nodesExcludes"});
                    resolve();
                    return;
                }
            }
        }
        var nodeFilename = path.join(nodeDir,nodeFn);
        try {
            var r = require(nodeFilename);
            if (typeof r === "function") {
                var promise = r(require('../red'));
                if (promise != null && typeof promise.then === "function") {
                    promise.then(function() {
                        resolve({fn:nodeLabel||nodeFn,path:nodeFilename});
                    },function(err) {
                        resolve({fn:nodeLabel||nodeFn,path:nodeFilename,err:err});
                    });
                } else {
                    resolve({fn:nodeLabel||nodeFn,path:nodeFilename});
                }
            } else {
                resolve({fn:nodeLabel||nodeFn,path:nodeFilename});
            }
        } catch(err) {
            resolve({fn:nodeLabel||nodeFn,path:nodeFilename,err:err});
        }
    });
        
}

function loadNodesFromModule(moduleDir,pkg) {
    var nodes = pkg['node-red'].nodes||{};
    var promises = [];
    var iconDirs = [];
    for (var n in nodes) {
        promises.push(loadNode(moduleDir,nodes[n],pkg.name+":"+n));
        var iconDir = path.join(moduleDir,path.dirname(nodes[n]),"icons");
        if (iconDirs.indexOf(iconDir) == -1) {
            if (fs.existsSync(iconDir)) {
                events.emit("node-icon-dir",iconDir);
                iconDirs.push(iconDir);
            };
        }
    }
    return promises;
}

function scanForNodes(dir) {
    var pm = path.join(dir,"node_modules");
    return when.promise(function(resolve,reject) {
        whenNode.call(fs.readdir,pm).then(function(files) {
            var promises = [];
            files.forEach(function(fn) {
                var pkgfn = path.join(pm,fn,"package.json");
                try {
                    var pkg = require(pkgfn);
                    if (pkg['node-red']) {
                        var moduleDir = path.join(pm,fn);
                        promises = promises.concat(loadNodesFromModule(moduleDir,pkg));
                    }
                } catch(err) {
                    if (err.code != "MODULE_NOT_FOUND") {
                        // TODO: handle unexpected error
                    }
                }
            });
            when.settle(promises).then(function(results) {
                var promises = [];
                results.forEach(function(result) {
                    promises = promises.concat(result.value);
                });
                resolve(promises);
            });
        },function(err) {
            resolve([]);
        });
    });
}

function scanTreeForNodes(dir) {
    return when.promise(function(resolve) {
        var promises = [];
        var up = path.resolve(path.join(dir,".."));
        while (up !== dir) {
            promises.push(scanForNodes(dir));
            dir = up;
            up = path.resolve(path.join(dir,".."));
        }
        
        when.settle(promises).then(function(results) {
            var promises = [];
            results.forEach(function(result) {
                promises = promises.concat(result.value);
            });
            resolve(promises);
        });
    });
}
    

// Returns a promise that resolves to an array of node results
function loadNodes(dir) {
    return when.promise(function(resolve,reject) {
        var promises = [];
        
        whenNode.call(fs.readdir,dir).done(function(files) {
            files = files.sort();
            files.forEach(function(fn) {
                var stats = fs.statSync(path.join(dir,fn));
                if (stats.isFile()) {
                    if (/\.js$/.test(fn)) {
                        promises.push(loadNode(dir,fn));
                    }
                } else if (stats.isDirectory()) {
                    // Ignore /.dirs/, /lib/ /node_modules/ 
                    if (!/^(\..*|lib|icons|node_modules|test)$/.test(fn)) {
                        promises.push(loadNodes(path.join(dir,fn)));
                    } else if (fn === "icons") {
                        events.emit("node-icon-dir",path.join(dir,fn));
                    }
                }
            });
            
            when.settle(promises).then(function(results) {
                var errors = [];
                results.forEach(function(result) {
                    if (result.state == 'fulfilled' && result.value) {
                        errors = errors.concat(result.value);
                    }
                });
                resolve(errors);
            });
            
        }, function(err) { 
            resolve([]);
            // non-existant dir 
        });
    });
}

function init(_settings) {
    Node = require("./Node");
    settings = _settings;
}

function load() {
    return when.promise(function(resolve,reject) {
        var RED = require("../red.js");
        
        loadNodes(__dirname+"/../../nodes").then(function(loadedNodes) {
            var promises = [];
            promises.push(scanTreeForNodes(__dirname+"/../../nodes"));
            if (settings.nodesDir) {
                var dir = settings.nodesDir;
                if (typeof settings.nodesDir == "string") {
                    dir = [dir];
                }
                for (var i=0;i<dir.length;i++) {
                    promises.push(loadNodes(dir[i]));
                }
            }
            when.settle(promises).then(function(results) {
                results.forEach(function(result) {
                    if (result.state == 'fulfilled' && result.value) {
                        loadedNodes = loadedNodes.concat(result.value);
                    }
                });
                var promises = [];
                loadedNodes.forEach(function(v) {
                    if (v.err == null) {
                        var templateFilename = v.path.replace(/\.js$/,".html");
                        promises.push(loadTemplate(templateFilename));
                    } else {
                        promises.push(when());
                    }
                });
                when.settle(promises).then(function(results) {
                    for (var i=0;i<loadedNodes.length;i++) {
                        if (results[i].state == "rejected") {
                            loadedNodes[i].err = results[i].reason;
                        }
                    }
                    var errors = loadedNodes.filter(function(v) { return v.err != null;});
                    resolve(errors);
                });
            });
        });
    });
}


function registerConfig(config) {
    $ = cheerio.load(config);
    var template = "";
    $("*").each(function(i,el) {
        if (el.type == "script" && el.attribs.type == "text/javascript") {
            var content = el.children[0].data;
            el.children[0].data = UglifyJS.minify(content, {fromString: true}).code;
            node_scripts.push($(this).text());
        } else if (el.name == "script" || el.name == "style") {
            var openTag = "<"+el.name;
            var closeTag = "</"+el.name+">";
            if (el.attribs) {
                for (var i in el.attribs) {
                    openTag += " "+i+'="'+el.attribs[i]+'"';
                }
            }
            openTag += ">";
            
            template += openTag+$(el).text()+closeTag;
        }
    });
    node_configs.push(template);
}


var typeRegistry = module.exports = {
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
    getNodeConfigs: function() {
        var result = "";
        for (var i=0;i<node_configs.length;i++) {
            result += node_configs[i];
        }
        result += '<script type="text/javascript">';
        for (var i=0;i<node_scripts.length;i++) {
            result += node_scripts[i];
        }
        result += '</script>';
        return result;
    }
}

