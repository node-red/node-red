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
            registerConfig(content);
            resolve();
        }, function(err) {
            reject("missing template file");
        });
        
    });
}

function loadNode(nodeDir, nodeFn) {
    return when.promise(function(resolve,reject) {
        if (settings.nodesExcludes) {
            for (var i=0;i<settings.nodesExcludes.length;i++) {
                if (settings.nodesExcludes[i] == nodeFn) {
                    resolve();
                    return;
                }
            }
        }
        var nodeFilename = path.join(nodeDir,nodeFn);
        var templateFilename = nodeFilename.replace(/\.js$/,".html");
        var r = require(nodeFilename);
        if (typeof r === "function") {
            try {
                var promise = r(require('../red'));
                if (promise != null && typeof promise.then === "function") {
                    promise.then(function() {
                        resolve(loadTemplate(templateFilename));
                    },function(err) {
                        reject(err);
                    });
                } else {
                    resolve(loadTemplate(templateFilename));
                }
            } catch(err) {
                reject(err);
            }
        } else {
            resolve(loadTemplate(templateFilename));
        }
    });
        
}

function loadNodesFromModule(moduleDir,pkg) {
    var nodes = pkg['node-red'].nodes||{};
    var promises = [];
    for (var n in nodes) {
        promises.push(when.promise(function(resolve) {
            loadNode(moduleDir,nodes[n]).then(resolve, function(err) {
                resolve({'fn':pkg.name+":"+n,err:err});
            });
        }));
    }
    return when.promise(function(resolve,reject) {
        var errors = [];
        when.settle(promises).then(function(results) {
            var errors = [];
            results.forEach(function(result) {
                if (result.state == 'fulfilled' && result.value) {
                    errors = errors.concat(result.value);
                }
            });
            resolve(errors); 
        });
    });
}

function scanForNodes(dir) {
    return when.promise(function(resolve,reject) {
            
        var pm = path.join(dir,"node_modules");
        var promises = [];
        promises.push(when.promise(function(resolve,reject) {
            whenNode.call(fs.readdir,pm).then(function(files) {
                var promises = [];
                files.forEach(function(fn) {
                    var pkgfn = path.join(pm,fn,"package.json");
                    try {
                        var pkg = require(pkgfn);
                        if (pkg['node-red']) {
                            var moduleDir = path.join(pm,fn);
                            promises.push(loadNodesFromModule(moduleDir,pkg));
                        }
                    } catch(err) {
                        if (err.code != "MODULE_NOT_FOUND") {
                            // TODO: handle unexpected error
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
            },function(err) {
                resolve([]); 
            })
        
        }));
        var up = path.resolve(path.join(dir,".."));
        if (up !== dir) {
            promises.push(scanForNodes(up))
        }
        when.settle(promises).then(function(results) {
            var errors = [];
            results.forEach(function(result) {
                if (result.state == 'fulfilled' && result.value) {
                    errors = errors.concat(result.value);
                }
            });
            resolve(errors);
        });
        
    });
}

function loadNodes(dir) {
    return when.promise(function(resolve,reject) {
        var promises = [];
        
        whenNode.call(fs.readdir,dir).done(function(files) {
            files = files.sort();
            files.forEach(function(fn) {
                var stats = fs.statSync(path.join(dir,fn));
                if (stats.isFile()) {
                    if (/\.js$/.test(fn)) {
                        promises.push(when.promise(function(resolve,reject) {
                            loadNode(dir,fn).then(resolve, function(err) {
                                resolve({'fn':fn,err:err});
                            });
                        }));
                    }
                } else if (stats.isDirectory()) {
                    // Ignore /.dirs/, /lib/ /node_modules/ 
                    if (!/^(\..*|lib|icons|node_modules|test)$/.test(fn)) {
                        promises.push(when.promise(function(resolve,reject) {
                            loadNodes(path.join(dir,fn)).then(function(errs) {
                                resolve(errs);
                            });
                        }));
                        
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
    settings = _settings;
}

function load() {
    Node = require("./Node");
    return when.promise(function(resolve,reject) {
        var RED = require("../red.js");
        
        loadNodes(__dirname+"/../../nodes").then(function(errors) {
            var promises = [];
            promises.push(scanForNodes(__dirname+"/../../nodes"));
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
                        errors = errors.concat(result.value);
                    }
                });
                resolve(errors);
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

