/**
 * Copyright JS Foundation and other contributors, http://js.foundation
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

var when = require('when');

var redNodes = require("./nodes");
var storage = require("./storage");
var log = require("./log");
var i18n = require("./i18n");
var events = require("./events");
var settings = require("./settings");

var express = require("express");
var path = require('path');
var fs = require("fs");
var os = require("os");

var runtimeMetricInterval = null;

var started = false;

var stubbedExpressApp = {
    get: function() {},
    post: function() {},
    put: function() {},
    delete: function() {}
}
var adminApi = {
    library: {
        register: function() {}
    },
    auth: {
        needsPermission: function() {}
    },
    comms: {
        publish: function() {}
    },
    adminApp: stubbedExpressApp,
    server: {}
}

var nodeApp;

function init(userSettings,_adminApi) {
    userSettings.version = getVersion();
    log.init(userSettings);
    settings.init(userSettings);

    nodeApp = express();

    if (_adminApi) {
        adminApi = _adminApi;
    }
    redNodes.init(runtime);
}

var version;

function getVersion() {
    if (!version) {
        version = require(path.join(__dirname,"..","..","package.json")).version;
        /* istanbul ignore else */
        try {
            fs.statSync(path.join(__dirname,"..","..",".git"));
            version += "-git";
        } catch(err) {
            // No git directory
        }
    }
    return version;
}

function start() {
    return i18n.init()
        .then(function() {
            return i18n.registerMessageCatalog("runtime",path.resolve(path.join(__dirname,"locales")),"runtime.json")
        })
        .then(function() { return storage.init(runtime)})
        .then(function() { return settings.load(storage)})
        .then(function() {

            if (log.metric()) {
                runtimeMetricInterval = setInterval(function() {
                    reportMetrics();
                }, settings.runtimeMetricInterval||15000);
            }
            log.info("\n\n"+log._("runtime.welcome")+"\n===================\n");
            if (settings.version) {
                log.info(log._("runtime.version",{component:"Node-RED",version:"v"+settings.version}));
            }
            log.info(log._("runtime.version",{component:"Node.js ",version:process.version}));
            if (settings.UNSUPPORTED_VERSION) {
                log.error("*****************************************************************");
                log.error("* "+log._("runtime.unsupported_version",{component:"Node.js",version:process.version,requires: ">=4"})+" *");
                log.error("*****************************************************************");
                events.emit("runtime-event",{id:"runtime-unsupported-version",type:"error",text:"notification.errors.unsupportedVersion"});
            }
            log.info(os.type()+" "+os.release()+" "+os.arch()+" "+os.endianness());
            return redNodes.load().then(function() {

                var i;
                var nodeErrors = redNodes.getNodeList(function(n) { return n.err!=null;});
                var nodeMissing = redNodes.getNodeList(function(n) { return n.module && n.enabled && !n.loaded && !n.err;});
                if (nodeErrors.length > 0) {
                    log.warn("------------------------------------------------------");
                    for (i=0;i<nodeErrors.length;i+=1) {
                        log.warn("["+nodeErrors[i].name+"] "+nodeErrors[i].err);
                    }
                    log.warn("------------------------------------------------------");
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
                if (settings.settingsFile) {
                    log.info(log._("runtime.paths.settings",{path:settings.settingsFile}));
                }
                redNodes.loadFlows().then(redNodes.startFlows);
                started = true;
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
    started = false;
    return redNodes.stopFlows();
}

var runtime = module.exports = {
    init: init,
    start: start,
    stop: stop,

    version: getVersion,

    log: log,
    i18n: i18n,
    settings: settings,
    storage: storage,
    events: events,
    nodes: redNodes,
    util: require("./util"),
    get adminApi() { return adminApi },
    get nodeApp() { return nodeApp },
    isStarted: function() {
        return started;
    }
}
