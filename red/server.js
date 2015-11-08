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

var redNodes = require("./nodes");
var comms = require("./comms");
var storage = require("./storage");
var log = require("./log");
var i18n = require("./i18n");

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
    return i18n.init()
        .then(function() { return storage.init(settings)})
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
            console.log("\n\n"+log._("runtime.welcome")+"\n===================\n");
            if (settings.version) {
                log.info(log._("runtime.version",{component:"Node-RED",version:"v"+settings.version}));
            }
            log.info(log._("runtime.version",{component:"Node.js ",version:process.version}));
            log.info(log._("server.loading"));
            redNodes.init(settings,storage);
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
                        log.warn(log._("server.errors",{count:nodeErrors.length}));
                        log.warn(log._("server.errors-help"));
                    }
                    log.warn("------------------------------------------");
                }
                if (nodeMissing.length > 0) {
                    log.warn(log._("server.missing-modules"));
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
                                redNodes.installModule(i).otherwise(function(err) {
                                    // Error already reported. Need the otherwise handler
                                    // to stop the error propagating any further
                                });
                            }
                        }
                    }
                    if (!settings.autoInstallModules) {
                        log.info(log._("server.removing-modules"));
                        redNodes.cleanModuleList();
                    }
                }
                log.info(log._("runtime.paths.settings",{path:settings.settingsFile}));
                redNodes.loadFlows().then(redNodes.startFlows);
                comms.start();
            }).otherwise(function(err) {
                console.log(err);
            });
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

    get app() { return app },
    get nodeApp() { return nodeApp },
    get server() { return server }
}
