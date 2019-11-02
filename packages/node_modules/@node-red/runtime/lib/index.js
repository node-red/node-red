/*!
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

var externalAPI = require("./api");

var redNodes = require("./nodes");
var storage = require("./storage");
var library = require("./library");
var events = require("./events");
var settings = require("./settings");
var exec = require("./exec");

var express = require("express");
var path = require('path');
var fs = require("fs");
var os = require("os");

var redUtil = require("@node-red/util");
var log = redUtil.log;
var i18n = redUtil.i18n;

var runtimeMetricInterval = null;

var started = false;

var stubbedExpressApp = {
    get: function() {},
    post: function() {},
    put: function() {},
    delete: function() {}
}
var adminApi = {
    auth: {
        needsPermission: function() {return function(req,res,next) {next()}}
    },
    adminApp: stubbedExpressApp,
    server: {}
}

var nodeApp;
var adminApp;
var server;


/**
 * Initialise the runtime module.
 * @param {Object} settings - the runtime settings object
 * @param {HTTPServer} server - the http server instance for the server to use
 * @param {AdminAPI} adminApi - an instance of @node-red/editor-api. <B>TODO</B>: This needs to be
 *                              better abstracted.
 * @memberof @node-red/runtime
 */
function init(userSettings,httpServer,_adminApi,__util) {
    server = httpServer;
    userSettings.version = getVersion();
    settings.init(userSettings);

    nodeApp = express();
    adminApp = express();

    if (_adminApi) {
        adminApi = _adminApi;
    }
    redNodes.init(runtime);
    library.init(runtime);
    externalAPI.init(runtime);
    exec.init(runtime);
    if (__util) {
        log = __util.log;
        i18n = __util.i18n;
    } else {
        log = redUtil.log;
        i18n = redUtil.i18n;
    }
}

var version;

function getVersion() {
    if (!version) {
        version = require(path.join(__dirname,"..","package.json")).version;
        /* istanbul ignore else */
        try {
            fs.statSync(path.join(__dirname,"..","..","..","..",".git"));
            version += "-git";
        } catch(err) {
            // No git directory
        }
    }
    return version;
}

/**
 * Start the runtime.
 * @return {Promise} - resolves when the runtime is started. This does not mean the
 *   flows will be running as they are started asynchronously.
 * @memberof @node-red/runtime
 */
function start() {
    return i18n.registerMessageCatalog("runtime",path.resolve(path.join(__dirname,"..","locales")),"runtime.json")
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
                log.error("* "+log._("runtime.unsupported_version",{component:"Node.js",version:process.version,requires: ">=8.9.0"})+" *");
                log.error("*****************************************************************");
                events.emit("runtime-event",{id:"runtime-unsupported-version",payload:{type:"error",text:"notification.errors.unsupportedVersion"},retain:true});
            }
            log.info(os.type()+" "+os.release()+" "+os.arch()+" "+os.endianness());
            return redNodes.load().then(function() {

                var i;
                var nodeErrors = redNodes.getNodeList(function(n) { return n.err!=null;});
                var nodeMissing = redNodes.getNodeList(function(n) { return n.module && n.enabled && !n.loaded && !n.err;});
                if (nodeErrors.length > 0) {
                    log.warn("------------------------------------------------------");
                    for (i=0;i<nodeErrors.length;i+=1) {
                        if (nodeErrors[i].err.code === "type_already_registered") {
                            log.warn("["+nodeErrors[i].id+"] "+log._("server.type-already-registered",{type:nodeErrors[i].err.details.type,module: nodeErrors[i].err.details.moduleA}));
                        } else {
                            log.warn("["+nodeErrors[i].id+"] "+nodeErrors[i].err);
                        }
                    }
                    log.warn("------------------------------------------------------");
                }
                if (nodeMissing.length > 0) {
                    log.warn(log._("server.missing-modules"));
                    var missingModules = {};
                    for (i=0;i<nodeMissing.length;i++) {
                        var missing = nodeMissing[i];
                        missingModules[missing.module] = missingModules[missing.module]||{
                            module:missing.module,
                            version:missing.pending_version||missing.version,
                            types:[]
                        }
                        missingModules[missing.module].types = missingModules[missing.module].types.concat(missing.types);
                    }
                    var moduleList = [];
                    var promises = [];
                    var installingModules = [];
                    for (i in missingModules) {
                        if (missingModules.hasOwnProperty(i)) {
                            log.warn(" - "+i+" ("+missingModules[i].version+"): "+missingModules[i].types.join(", "));
                            if (settings.autoInstallModules && i != "node-red") {
                                installingModules.push({id:i,version:missingModules[i].version});
                            }
                        }
                    }
                    if (!settings.autoInstallModules) {
                        log.info(log._("server.removing-modules"));
                        redNodes.cleanModuleList();
                    } else if (installingModules.length > 0) {
                        reinstallAttempts = 0;
                        reinstallModules(installingModules);
                    }
                }
                if (settings.settingsFile) {
                    log.info(log._("runtime.paths.settings",{path:settings.settingsFile}));
                }
                if (settings.httpStatic) {
                    log.info(log._("runtime.paths.httpStatic",{path:path.resolve(settings.httpStatic)}));
                }
                return redNodes.loadContextsPlugin().then(function () {
                    redNodes.loadFlows().then(redNodes.startFlows).catch(function(err) {});
                    started = true;
                });
            });
        });
}

var reinstallAttempts;
var reinstallTimeout;
function reinstallModules(moduleList) {
    var promises = [];
    var failedModules = [];
    for (var i=0;i<moduleList.length;i++) {
        if (settings.autoInstallModules && i != "node-red") {
            promises.push(redNodes.installModule(moduleList[i].id,moduleList[i].version));
        }
    }
    when.settle(promises).then(function(results) {
        var reinstallList = [];
        for (var i=0;i<results.length;i++) {
            if (results[i].state === 'rejected') {
                reinstallList.push(moduleList[i]);
            } else {
                events.emit("runtime-event",{id:"node/added",retain:false,payload:results[i].value.nodes});
            }
        }
        if (reinstallList.length > 0) {
            reinstallAttempts++;
            // First 5 at 1x timeout, next 5 at 2x, next 5 at 4x, then 8x
            var timeout = (settings.autoInstallModulesRetry||30000) * Math.pow(2,Math.min(Math.floor(reinstallAttempts/5),3));
            reinstallTimeout = setTimeout(function() {
                reinstallModules(reinstallList);
            },timeout);
        }
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

/**
 * Stops the runtime.
 * @return {Promise} - resolves when the runtime is stopped.
 * @memberof @node-red/runtime
 */
function stop() {
    if (runtimeMetricInterval) {
        clearInterval(runtimeMetricInterval);
        runtimeMetricInterval = null;
    }
    if (reinstallTimeout) {
        clearTimeout(reinstallTimeout);
    }
    started = false;
    return redNodes.stopFlows().then(function(){
        return redNodes.closeContextsPlugin();
    });
}

// This is the internal api
var runtime = {
    version: getVersion,
    get log() { return log },
    get i18n() { return i18n },
    settings: settings,
    storage: storage,
    events: events,
    nodes: redNodes,
    library: library,
    exec: exec,
    util: require("@node-red/util").util,
    get adminApi() { return adminApi },
    get adminApp() { return adminApp },
    get nodeApp() { return nodeApp },
    get server() { return server },
    isStarted: function() {
        return started;
    }
};

/**
 * This module provides the core runtime component of Node-RED.
 * It does *not* include the Node-RED editor. All interaction with
 * this module is done using the api provided.
 *
 * @namespace @node-red/runtime
 */
module.exports = {
    init: init,
    start: start,
    stop: stop,

    /**
    * @memberof @node-red/runtime
    * @mixes @node-red/runtime_comms
    */
    comms: externalAPI.comms,
    /**
    * @memberof @node-red/runtime
    * @mixes @node-red/runtime_flows
    */
    flows: externalAPI.flows,
    /**
    * @memberof @node-red/runtime
    * @mixes @node-red/runtime_library
    */
    library: externalAPI.library,
    /**
    * @memberof @node-red/runtime
    * @mixes @node-red/runtime_nodes
    */
    nodes: externalAPI.nodes,
    /**
    * @memberof @node-red/runtime
    * @mixes @node-red/runtime_settings
    */
    settings: externalAPI.settings,
    /**
    * @memberof @node-red/runtime
    * @mixes @node-red/runtime_projects
    */
    projects: externalAPI.projects,
    /**
    * @memberof @node-red/runtime
    * @mixes @node-red/runtime_context
    */
    context: externalAPI.context,

    /**
    * Returns whether the runtime is started
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @return {Promise<Boolean>} - whether the runtime is started
    * @function
    * @memberof @node-red/runtime
    */
    isStarted: externalAPI.isStarted,

    /**
    * Returns version number of the runtime
    * @param {Object} opts
    * @param {User} opts.user - the user calling the api
    * @return {Promise<String>} - the runtime version number
    * @function
    * @memberof @node-red/runtime
    */
    version: externalAPI.version,

    storage: storage,
    events: events,
    util: require("@node-red/util").util,
    get httpNode() { return nodeApp },
    get httpAdmin() { return adminApp },
    get server() { return server },

    "_": runtime
}


/**
 * A user accessing the API
 * @typedef User
 * @type {object}
 */
