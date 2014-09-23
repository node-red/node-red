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

var express = require('express');
var util = require('util');
var when = require('when');
var exec = require('child_process').exec;

var createUI = require("./ui");
var redNodes = require("./nodes");
var comms = require("./comms");
var storage = require("./storage");

var app = null;
var nodeApp = null;
var server = null;
var settings = null;

function createServer(_server,_settings) {
    server = _server;
    settings = _settings;

    comms.init(_server,_settings);
    
    nodeApp = express();
    app = express();
        
    if (settings.httpAdminRoot !== false) {
        
        
        if (!settings.disableEditor) {
            createUI(settings,app);
        }
        
        app.get("/flows",function(req,res) {
            res.json(redNodes.getFlows());
        });
        
        app.post("/flows",
            express.json(),
            function(req,res) {
                var flows = req.body;
                redNodes.setFlows(flows).then(function() {
                    res.send(204);
                }).otherwise(function(err) {
                    util.log("[red] Error saving flows : "+err);
                    res.send(500,err.message);
                });
            },
            function(error,req,res,next) {
                res.send(400,"Invalid Flow");
            }
        );
            
        app.get("/nodes",function(req,res) {
            if (req.get("accept") == "application/json") {
                res.json(redNodes.getNodeList());
            } else {
                res.send(redNodes.getNodeConfigs());
            }
        });
        
        app.post("/nodes",
            express.json(),
            function(req,res) {
                if (!settings.available()) {
                    res.send(400,new Error("Settings unavailable").toString());
                    return;
                }
                var node = req.body;
                var promise;
                if (node.file) {
                    promise = redNodes.addNode(node.file).then(reportAddedModules);
                } else if (node.module) {
                    var module = redNodes.getNodeModuleInfo(node.module);
                    if (module) {
                        res.send(400,"Module already loaded");
                        return;
                    }
                    promise = installModule(node.module);
                } else {
                    res.send(400,"Invalid request");
                    return;
                }
                promise.then(function(info) {
                    res.json(info);
                }).otherwise(function(err) {
                    if (err.code === 404) {
                        res.send(404);
                    } else {
                        res.send(400,err.toString());
                    }
                });
            },
            function(err,req,res,next) {
                console.log(err.toString());
                res.send(400,err);
            }
        );
        
        app.delete("/nodes/:id",
            function(req,res) {
                if (!settings.available()) {
                    res.send(400,new Error("Settings unavailable").toString());
                    return;
                }
                var id = req.params.id;
                var removedNodes = [];
                try {
                    var node = redNodes.getNodeInfo(id);
                    var promise = null;
                    if (!node) {
                        var module = redNodes.getNodeModuleInfo(id);
                        if (!module) {
                            res.send(404);
                            return;
                        } else {
                            promise = uninstallModule(id);
                        }
                    } else {
                        promise = when.resolve([redNodes.removeNode(id)]).then(reportRemovedModules);
                    }
                    
                    promise.then(function(removedNodes) {
                        res.json(removedNodes);
                    }).otherwise(function(err) {
                        console.log(err.stack);
                        res.send(400,err.toString());
                    });
                } catch(err) {
                    res.send(400,err.toString());
                }
            },
            function(err,req,res,next) {
                res.send(400,err);
            }
        );
        
        app.get("/nodes/:id", function(req,res) {
            var id = req.params.id;
            var result = null;
            if (req.get("accept") == "application/json") {
                result = redNodes.getNodeInfo(id);
            } else {
                result = redNodes.getNodeConfig(id);
            }
            if (result) {
                res.send(result);
            } else {
                res.send(404);
            }
        });
        
        app.put("/nodes/:id", 
            express.json(),
            function(req,res) {
                if (!settings.available()) {
                    res.send(400,new Error("Settings unavailable").toString());
                    return;
                }
                var body = req.body;
                if (!body.hasOwnProperty("enabled")) {
                    res.send(400,"Invalid request");
                    return;
                }
                try {
                    var info;
                    var id = req.params.id;
                    var node = redNodes.getNodeInfo(id);
                    if (!node) {
                        res.send(404);
                    } else if (!node.err && node.enabled === body.enabled) {
                        res.json(node);
                    } else {
                        if (body.enabled) {
                            info = redNodes.enableNode(id);
                        } else {
                            info = redNodes.disableNode(id);
                        }
                        if (info.enabled == body.enabled && !info.err) {
                            comms.publish("node/"+(body.enabled?"enabled":"disabled"),info,false);
                            util.log("[red] "+(body.enabled?"Enabled":"Disabled")+" node types:");
                            for (var i=0;i<info.types.length;i++) {
                                util.log("[red] - "+info.types[i]);
                            }
                        } else if (body.enabled && info.err) {
                            util.log("[red] Failed to enable node:");
                            util.log("[red] - "+info.name+" : "+info.err);
                        }
                        res.json(info);
                    }
                } catch(err) {
                    res.send(400,err.toString());
                }            
            }
        );
    }
}
function reportAddedModules(info) {
    comms.publish("node/added",info,false);
    if (info.length > 0) {
        util.log("[red] Added node types:");
        for (var i=0;i<info.length;i++) {
            for (var j=0;j<info[i].types.length;j++) {
                util.log("[red] - "+
                    (info[i].module?info[i].module+":":"")+
                    info[i].types[j]+
                    (info[i].err?" : "+info[i].err:"")
                    );
            }
        }
    }
    return info;
}

function reportRemovedModules(removedNodes) {
    comms.publish("node/removed",removedNodes,false);
    util.log("[red] Removed node types:");
    for (var j=0;j<removedNodes.length;j++) {
        for (var i=0;i<removedNodes[j].types.length;i++) {
            util.log("[red] - "+(removedNodes[i].module?removedNodes[i].module+":":"")+removedNodes[j].types[i]);
        }
    }
    return removedNodes;
}

function installModule(module) { 
    //TODO: ensure module is 'safe'
    return when.promise(function(resolve,reject) {
        if (/[\s;]/.test(module)) {
            reject(new Error("Invalid module name"));
            return;
        }
        util.log("[red] Installing module: "+module);
        var child = exec('npm install --production '+module, function(err, stdin, stdout) {
            if (err) {
                var lookFor404 = new RegExp(" 404 .*"+module+"$","m");
                if (lookFor404.test(stdout)) {
                    util.log("[red] Installation of module "+module+" failed: module not found");
                    var e = new Error();
                    e.code = 404;
                    reject(e);
                } else {
                    util.log("[red] Installation of module "+module+" failed:");
                    util.log("------------------------------------------");
                    console.log(err.toString());
                    util.log("------------------------------------------");
                    reject(new Error("Install failed"));
                }
            } else {
                util.log("[red] Installed module: "+module);
                resolve(redNodes.addModule(module).then(reportAddedModules));
            }
        });
    });
}

function uninstallModule(module) {
    var list = redNodes.removeModule(module);
    return when.promise(function(resolve,reject) {
        if (/[\s;]/.test(module)) {
            reject(new Error("Invalid module name"));
            return;
        }
        util.log("[red] Removing module: "+module);
        var child = exec('npm remove '+module, function(err, stdin, stdout) {
            if (err) {
                util.log("[red] Removal of module "+module+" failed:");
                util.log("------------------------------------------");
                console.log(err.toString());
                util.log("------------------------------------------");
                reject(new Error("Removal failed"));
            } else {
                util.log("[red] Removed module: "+module);
                reportRemovedModules(list);
                resolve(list);
            }
        });
    });
}

function start() {
    var defer = when.defer();
    
    storage.init(settings).then(function() {
        settings.load(storage).then(function() {
            console.log("\nWelcome to Node-RED\n===================\n");
            if (settings.version) {
                util.log("[red] Version: "+settings.version);
            }
            util.log("[red] Loading palette nodes");
            redNodes.init(settings,storage);
            redNodes.load().then(function() {
                var i;
                var nodes = redNodes.getNodeList();
                var nodeErrors = nodes.filter(function(n) { return n.err!=null;});
                var nodeMissing = nodes.filter(function(n) { return n.module && n.enabled && !n.loaded && !n.err;});
                if (nodeErrors.length > 0) {
                    util.log("------------------------------------------");
                    if (settings.verbose) {
                        for (i=0;i<nodeErrors.length;i+=1) {
                            util.log("["+nodeErrors[i].name+"] "+nodeErrors[i].err);
                        }
                    } else {
                        util.log("[red] Failed to register "+nodeErrors.length+" node type"+(nodeErrors.length==1?"":"s"));
                        util.log("[red] Run with -v for details");
                    }
                    util.log("------------------------------------------");
                }
                if (nodeMissing.length > 0) {
                    util.log("[red] Missing node modules:");
                    var missingModules = {};
                    for (i=0;i<nodeMissing.length;i++) {
                        var missing = nodeMissing[i];
                        missingModules[missing.module] = (missingModules[missing.module]||[]).concat(missing.types);
                    }
                    var promises = [];
                    for (i in missingModules) {
                        if (missingModules.hasOwnProperty(i)) {
                            util.log("[red] - "+i+": "+missingModules[i].join(", "));
                            if (settings.autoInstallModules) {
                                installModule(i).otherwise(function(err) {
                                    // Error already reported. Need the otherwise handler
                                    // to stop the error propagating any further
                                });
                            }
                        }
                    }
                    if (!settings.autoInstallModules) {
                        util.log("[red] Removing modules from config");
                        redNodes.cleanNodeList();
                    }
                }
                defer.resolve();
                
                redNodes.loadFlows();
            }).otherwise(function(err) {
                console.log(err);
            });
            comms.start();
        });
    }).otherwise(function(err) {
        defer.reject(err);
    });
    
    return defer.promise;
}

function stop() {
    redNodes.stopFlows();
    comms.stop();
}

module.exports = { 
    init: createServer,
    start: start,
    stop: stop
}

module.exports.__defineGetter__("app", function() { return app });
module.exports.__defineGetter__("nodeApp", function() { return nodeApp });
module.exports.__defineGetter__("server", function() { return server });
