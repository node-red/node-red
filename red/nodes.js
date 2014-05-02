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
var util = require("util");
var EventEmitter = require("events").EventEmitter;
var fs = require("fs");
var path = require("path");
var clone = require("clone");
var when = require("when");
var whenNode = require('when/node');

var events = require("./events");
var storage = null;
var settings = null;

var registry = (function() {
        var nodes = {};
        var logHandlers = [];
        var obj = {
            add: function(n) {
                nodes[n.id] = n;
                n.on("log",function(msg) {
                    for (var i in logHandlers) {
                        logHandlers[i].emit("log",msg);
                    }
                });
            },
            get: function(i) {
                return nodes[i];
            },
            clear: function() {
                events.emit("nodes-stopping");
                for (var n in nodes) {
                    nodes[n].close();
                }
                events.emit("nodes-stopped");
                nodes = {};
            },
            each: function(cb) {
                for (var n in nodes) {
                    cb(nodes[n]);
                }
            },
            addLogHandler: function(handler) {
                logHandlers.push(handler);
            }
        }
        return obj;
})();

var ConsoleLogHandler = new EventEmitter();
ConsoleLogHandler.on("log",function(msg) {
        util.log("["+msg.level+"] ["+msg.type+":"+(msg.name||msg.id)+"] "+msg.msg);
});

registry.addLogHandler(ConsoleLogHandler);

var node_type_registry = (function() {
        var node_types = {};
        var node_configs = [];
        var obj = {
            register: function(type,node) {
                util.inherits(node, Node);
                node_types[type] = node;
                events.emit("type-registered",type);
            },
            registerConfig: function(config) {
                node_configs.push(config);
            },
            get: function(type) {
                return node_types[type];
            },
            getNodeConfigs: function() {
                var result = "";
                for (var i=0;i<node_configs.length;i++) {
                    result += node_configs[i];
                }
                return result;
            },
            count: function() {
                return Object.keys(node_types).length;
            }
        }
        return obj;
})();

function Node(n) {
    this.id = n.id;
    registry.add(this);
    this.type = n.type;
    if (n.name) {
        this.name = n.name;
    }
    this.wires = n.wires||[];
}
util.inherits(Node,EventEmitter);

Node.prototype.close = function() {
    // called when a node is removed
    this.emit("close");
}


Node.prototype.send = function(msg) {
    // instanceof doesn't work for some reason here
    if (msg == null) {
        msg = [];
    } else if (!util.isArray(msg)) {
        msg = [msg];
    }
    for (var i in this.wires) {
        var wires = this.wires[i];
        if (i < msg.length) {
            if (msg[i] != null) {
                var msgs = msg[i];
                if (!util.isArray(msg[i])) {
                    msgs = [msg[i]];
                }
                //if (wires.length == 1) {
                //    // Single recipient, don't need to clone the message
                //    var node = registry.get(wires[0]);
                //    if (node) {
                //        for (var k in msgs) {
                //            var mm = msgs[k];
                //            node.receive(mm);
                //        }
                //    }
                //} else {
                    // Multiple recipients, must send message copies
                    for (var j in wires) {
                        var node = registry.get(wires[j]);
                        if (node) {
                            for (var k in msgs) {
                                var mm = msgs[k];
                                // Temporary fix for #97
                                // TODO: remove this http-node-specific fix somehow
                                var req = mm.req;
                                var res = mm.res;
                                delete mm.req;
                                delete mm.res;
                                var m = clone(mm);
                                if (req) {
                                    m.req = req;
                                    mm.req = req;
                                }
                                if (res) {
                                    m.res = res;
                                    mm.res = res;
                                }
                                node.receive(m);
                            }
                        }
                    }
                //}
            }
        }
    }
}

Node.prototype.receive = function(msg) {
    this.emit("input",msg);
}

Node.prototype.log = function(msg) {
    var o = {level:'log',id:this.id, type:this.type, msg:msg};
    if (this.name) o.name = this.name;
    this.emit("log",o);
}
Node.prototype.warn = function(msg) {
    var o = {level:'warn',id:this.id, type:this.type, msg:msg};
    if (this.name) o.name = this.name;
    this.emit("log",o);
}
Node.prototype.error = function(msg) {
    var o = {level:'error',id:this.id, type:this.type, msg:msg};
    if (this.name) o.name = this.name;
    this.emit("log",o);
}

var credentials = {};

function addCredentials(id,creds) {
    credentials[id] = creds;
    if (!storage) {
        // Do this lazily to ensure the storage provider as been initialised
        storage = require("./storage");
    }
    storage.saveCredentials(credentials);
}
function getCredentials(id) {
    return credentials[id];
}
function deleteCredentials(id) {
    delete credentials[id];
    storage.saveCredentials(credentials);
}
function createNode(node,def) {
    Node.call(node,def);
}

function load(_settings) {
    return when.promise(function(resolve,reject) {
        settings = _settings;
        
        var RED = require("./red.js");
        
        function loadTemplate(templateFilename) {
            return when.promise(function(resolve,reject) {
                    
                whenNode.call(fs.readFile,templateFilename,'utf8').done(function(content) {
                    node_type_registry.registerConfig(content);
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
                        var promise = r(RED);
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
        
        var promises = [];
        promises.push(loadNodes(__dirname+"/../nodes"));
        promises.push(scanForNodes(__dirname+"/../nodes"));
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

var activeConfig = [];
var missingTypes = [];

events.on('type-registered',function(type) {
        if (missingTypes.length > 0) {
            var i = missingTypes.indexOf(type);
            if (i != -1) {
                missingTypes.splice(i,1);
                util.log("[red] Missing type registered: "+type);
            }
            if (missingTypes.length == 0) {
                parseConfig();
            }
        }
});

function getNode(nid) {
    return registry.get(nid);
}

function stopFlows() {
    if (activeConfig&&activeConfig.length > 0) {
        util.log("[red] Stopping flows");
    }
    registry.clear();
}

function setConfig(conf) {
    stopFlows();
    activeConfig = conf;
    
    if (!storage) {
        // Do this lazily to ensure the storage provider as been initialised
        storage = require("./storage");
    }
    storage.getCredentials().then(function(creds) {
        credentials = creds;
        parseConfig();
    }).otherwise(function(err) {
        util.log("[red] Error loading credentials : "+err);
    });
}

function getConfig() {
    return activeConfig;
}

var parseConfig = function() {
    missingTypes = [];
    for (var i in activeConfig) {
        var type = activeConfig[i].type;
        // TODO: remove workspace in next release+1
        if (type != "workspace" && type != "tab") {
            var nt = node_type_registry.get(type);
            if (!nt && missingTypes.indexOf(type) == -1) {
                missingTypes.push(type);
            }
        }
    };
    if (missingTypes.length > 0) {
        util.log("[red] Waiting for missing types to be registered:");
        for (var i in missingTypes) {
            util.log("[red]  - "+missingTypes[i]);
        }
        return;
    }

    util.log("[red] Starting flows");
    events.emit("nodes-starting");
    for (var i in activeConfig) {
        var nn = null;
        // TODO: remove workspace in next release+1
        if (activeConfig[i].type != "workspace" && activeConfig[i].type != "tab") {
            var nt = node_type_registry.get(activeConfig[i].type);
            if (nt) {
                try {
                    nn = new nt(activeConfig[i]);
                }
                catch (err) {
                    util.log("[red] "+activeConfig[i].type+" : "+err);
                }
            }
            // console.log(nn);
            if (nn == null) {
                util.log("[red] unknown type: "+activeConfig[i].type);
            }
        }
    }
    // Clean up any orphaned credentials
    var deletedCredentials = false;
    for (var c in credentials) {
        var n = registry.get(c);
        if (!n) {
            deletedCredentials = true;
            delete credentials[c];
        }
    }
    if (deletedCredentials) {
        storage.saveCredentials(credentials);
    }
    events.emit("nodes-started");
}


module.exports = {
    Node:Node,
    addCredentials: addCredentials,
    getCredentials: getCredentials,
    deleteCredentials: deleteCredentials,
    createNode: createNode,
    registerType: node_type_registry.register,
    getType: node_type_registry.get,
    getNodeConfigs: node_type_registry.getNodeConfigs,
    addLogHandler: registry.addLogHandler,
    load: load,
    getNode: getNode,
    stopFlows: stopFlows,
    setConfig: setConfig,
    getConfig: getConfig
}

