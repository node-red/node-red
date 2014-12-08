/**
 * Copyright 2013, 2014 IBM Corp.
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
var child_process = require('child_process');

var redNodes = require("./nodes");
var comms = require("./comms");
var storage = require("./storage");

var app = null;
var nodeApp = null;
var server = null;
var settings = null;

function init(_server,_settings) {
    server = _server;
    settings = _settings;

    comms.init(_server,_settings);

    nodeApp = express();
    app = express();

    if (settings.httpAdminRoot !== false) {
        require("./api").init(app);
    }
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
                        redNodes.cleanModuleList();
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
        var child = child_process.exec('npm install --production '+module, function(err, stdin, stdout) {
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
    return when.promise(function(resolve,reject) {
        if (/[\s;]/.test(module)) {
            reject(new Error("Invalid module name"));
            return;
        }
        var list = redNodes.removeModule(module);
        util.log("[red] Removing module: "+module);
        var child = child_process.exec('npm remove '+module, function(err, stdin, stdout) {
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



function stop() {
    redNodes.stopFlows();
    comms.stop();
}

module.exports = {
    init: init,
    start: start,
    stop: stop,

    reportAddedModules: reportAddedModules,
    reportRemovedModules: reportRemovedModules,
    installModule: installModule,
    uninstallModule: uninstallModule
}

module.exports.__defineGetter__("app", function() { return app });
module.exports.__defineGetter__("nodeApp", function() { return nodeApp });
module.exports.__defineGetter__("server", function() { return server });
