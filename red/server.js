/**
 * Copyright 2013, 2015 IBM Corp.
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
var when = require('when');
var child_process = require('child_process');
var path = require("path");
var fs = require("fs");

var redNodes = require("./nodes");
var comms = require("./comms");
var storage = require("./storage");
var log = require("./log");

var app = null;
var nodeApp = null;
var server = null;
var settings = null;

var runtimeMetricInterval = null;


function init(_server,_settings) {
    server = _server;
    settings = _settings;

    comms.init(_server,_settings);

    nodeApp = express();
    app = express();
}

function start() {
    return storage.init(settings)
        .then(function() { return settings.load(storage)})
        .then(function() {
            if (settings.httpAdminRoot !== false) {
                require("./api").init(app,storage);
            }
            
            if (log.metric()) {
                runtimeMetricInterval = setInterval(function() {
                    reportMetrics();
                }, settings.runtimeMetricInterval||15000);
            }
            console.log("\n\nWelcome to Node-RED\n===================\n");
            if (settings.version) {
                log.info("Node-RED version: v"+settings.version);
            }
            log.info("Node.js  version: "+process.version);
            log.info("Loading palette nodes");
            redNodes.init(settings,storage,app);
            return redNodes.load().then(function() {
                    
                var i;
                var nodeErrors = redNodes.getNodeList(function(n) { return n.err!=null;});
                var nodeMissing = redNodes.getNodeList(function(n) { return n.module && n.enabled && !n.loaded && !n.err;});
                if (nodeErrors.length > 0) {
                    log.warn("------------------------------------------");
                    if (settings.verbose) {
                        for (i=0;i<nodeErrors.length;i+=1) {
                            log.warn("["+nodeErrors[i].name+"] "+nodeErrors[i].err);
                        }
                    } else {
                        log.warn("Failed to register "+nodeErrors.length+" node type"+(nodeErrors.length==1?"":"s"));
                        log.warn("Run with -v for details");
                    }
                    log.warn("------------------------------------------");
                }
                if (nodeMissing.length > 0) {
                    log.warn("Missing node modules:");
                    var missingModules = {};
                    for (i=0;i<nodeMissing.length;i++) {
                        var missing = nodeMissing[i];
                        missingModules[missing.module] = (missingModules[missing.module]||[]).concat(missing.types);
                    }
                    var promises = [];
                    for (i in missingModules) {
                        if (missingModules.hasOwnProperty(i)) {
                            log.warn(" - "+i+": "+missingModules[i].join(", "));
                            if (settings.autoInstallModules && i != "node-red") {
                                serverAPI.installModule(i).otherwise(function(err) {
                                    // Error already reported. Need the otherwise handler
                                    // to stop the error propagating any further
                                });
                            }
                        }
                    }
                    if (!settings.autoInstallModules) {
                        log.info("Removing modules from config");
                        redNodes.cleanModuleList();
                    }
                }
                log.info("Settings file  : "+settings.settingsFile);
                redNodes.loadFlows();
                comms.start();
            }).otherwise(function(err) {
                console.log(err);
            });
    });
}


function reportAddedModules(info) {
    comms.publish("node/added",info.nodes,false);
    if (info.nodes.length > 0) {
        log.info("Added node types:");
        for (var i=0;i<info.nodes.length;i++) {
            for (var j=0;j<info.nodes[i].types.length;j++) {
                log.info(" - "+
                    (info.nodes[i].module?info.nodes[i].module+":":"")+
                    info.nodes[i].types[j]+
                    (info.nodes[i].err?" : "+info.nodes[i].err:"")
                );
            }
        }
    }
    return info;
}

function reportRemovedModules(removedNodes) {
    comms.publish("node/removed",removedNodes,false);
    log.info("Removed node types:");
    for (var j=0;j<removedNodes.length;j++) {
        for (var i=0;i<removedNodes[j].types.length;i++) {
            log.info(" - "+(removedNodes[j].module?removedNodes[j].module+":":"")+removedNodes[j].types[i]);
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
        log.info("Installing module: "+module);
        var installDir = settings.userDir || process.env.NODE_RED_HOME || ".";
        var child = child_process.exec('npm install --production '+module,
            {
                cwd: installDir
            },
            function(err, stdin, stdout) {
                if (err) {
                    var lookFor404 = new RegExp(" 404 .*"+module+"$","m");
                    if (lookFor404.test(stdout)) {
                        log.warn("Installation of module "+module+" failed: module not found");
                        var e = new Error();
                        e.code = 404;
                        reject(e);
                    } else {
                        log.warn("Installation of module "+module+" failed:");
                        log.warn("------------------------------------------");
                        log.warn(err.toString());
                        log.warn("------------------------------------------");
                        reject(new Error("Install failed"));
                    }
                } else {
                    log.info("Installed module: "+module);
                    resolve(redNodes.addModule(module).then(reportAddedModules));
                }
            }
        );
    });
}

function uninstallModule(module) {
    return when.promise(function(resolve,reject) {
        if (/[\s;]/.test(module)) {
            reject(new Error("Invalid module name"));
            return;
        }
        var installDir = settings.userDir || process.env.NODE_RED_HOME || ".";
        var moduleDir = path.join(installDir,"node_modules",module);
        if (!fs.existsSync(moduleDir)) {
            return reject(new Error("Unabled to uninstall "+module+"."));
        }

        var list = redNodes.removeModule(module);
        log.info("Removing module: "+module);
        var child = child_process.exec('npm remove '+module,
            {
                cwd: installDir
            },
            function(err, stdin, stdout) {
                if (err) {
                    log.warn("Removal of module "+module+" failed:");
                    log.warn("------------------------------------------");
                    log.warn(err.toString());
                    log.warn("------------------------------------------");
                    reject(new Error("Removal failed"));
                } else {
                    log.info("Removed module: "+module);
                    reportRemovedModules(list);
                    resolve(list);
                }
            }
        );
    });
}

function reportMetrics() {
    var memUsage = process.memoryUsage();

    log.log({
        level: log.METRIC,
        event: "runtime.memory.rss",
        value: memUsage.rss
    });
    log.log({
        level: log.METRIC,
        event: "runtime.memory.heapTotal",
        value: memUsage.heapTotal
    });
    log.log({
        level: log.METRIC,
        event: "runtime.memory.heapUsed",
        value: memUsage.heapUsed
    });
}

function stop() {
    if (runtimeMetricInterval) {
        clearInterval(runtimeMetricInterval);
        runtimeMetricInterval = null;
    }
    redNodes.stopFlows();
    comms.stop();
}

var serverAPI = module.exports = {
    init: init,
    start: start,
    stop: stop,

    reportAddedModules: reportAddedModules,
    reportRemovedModules: reportRemovedModules,
    installModule: installModule,
    uninstallModule: uninstallModule,

    get app() { return app },
    get nodeApp() { return nodeApp },
    get server() { return server }
}
