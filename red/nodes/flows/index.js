/**
 * Copyright 2014, 2015 IBM Corp.
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

var clone = require("clone");
var when = require("when");

var Flow = require('./Flow');

var typeRegistry = require("../registry");
var credentials = require("../credentials");

var flowUtil = require("./util");
var log = require("../../log");
var events = require("../../events");
var redUtil = require("../../util");
var deprecated = require("../registry/deprecated");

var storage = null;
var settings = null;

var activeConfig = null;
var activeFlowConfig = null;

var activeFlows = {};
var started = false;

var activeNodesToFlow = {};

function init(_settings, _storage) {
    settings = _settings;
    storage = _storage;
    started = false;
    events.on('type-registered',function(type) {
        if (activeFlowConfig && activeFlowConfig.missingTypes.length > 0) {
            var i = activeFlowConfig.missingTypes.indexOf(type);
            if (i != -1) {
                log.info(log._("nodes.flows.registered-missing", {type:type}));
                activeFlowConfig.missingTypes.splice(i,1);
                if (activeFlowConfig.missingTypes.length === 0 && started) {
                    start();
                }
            }
        }
    });
}
function load() {
    return storage.getFlows().then(function(flows) {
        return credentials.load().then(function() {
            return setConfig(flows,"load");
        });
    }).otherwise(function(err) {
        log.warn(log._("nodes.flows.error",{message:err.toString()}));
        console.log(err.stack);
    });
}

function setConfig(config,type) {
    type = type||"full";

    var credentialsChanged = false;
    var credentialSavePromise = null;
    var configSavePromise = null;

    var cleanConfig = clone(config);
    cleanConfig.forEach(function(node) {
        if (node.credentials) {
            credentials.extract(node);
            credentialsChanged = true;
        }
    });

    if (credentialsChanged) {
        credentialSavePromise = credentials.save();
    } else {
        credentialSavePromise = when.resolve();
    }
    if (type === 'load') {
        configSavePromise = credentialSavePromise;
        type = 'full';
    } else {
        configSavePromise = credentialSavePromise.then(function() {
            return storage.saveFlows(cleanConfig);
        });
    }

    return configSavePromise
        .then(function() {
            var diff;
            activeConfig = cleanConfig;
            if (type === 'full') {
                activeFlowConfig = flowUtil.parseConfig(clone(config));
            } else {
                var newConfig = flowUtil.parseConfig(clone(config));
                diff = flowUtil.diffConfigs(activeFlowConfig,newConfig);
                activeFlowConfig = newConfig;
            }
            credentials.clean(activeConfig).then(function() {
                if (started) {
                    return stop(type,diff).then(function() {
                        start(type,diff);
                    }).otherwise(function(err) {
                        console.log(err);
                    })
                }
            });
        });
}

function getNode(id) {
    var node;
    if (activeNodesToFlow[id]) {
        return activeFlows[activeNodesToFlow[id]].getNode(id);
    }
    for (var flowId in activeFlows) {
        if (activeFlows.hasOwnProperty(flowId)) {
            node = activeFlows[flowId].getNode(id);
            if (node) {
                return node;
            }
        }
    }
    return null;
}

function eachNode(cb) {
    for (var id in activeFlowConfig.nodes) {
        if (activeFlowConfig.nodes.hasOwnProperty(id)) {
            cb(activeFlowConfig.nodes[id]);
        }
    }
}

function getConfig() {
    return activeConfig;
}

function handleError(node,logMessage,msg) {
    if (activeFlows[node.z]) {
        activeFlows[node.z].handleError(node,logMessage,msg);
    } else if (activeNodesToFlow[node.z]) {
        activeFlows[activeNodesToFlow[node.z]].handleError(node,logMessage,msg);
    }
}

function handleStatus(node,statusMessage) {
    if (activeFlows[node.z]) {
        activeFlows[node.z].handleStatus(node,statusMessage);
    }
}


function start(type,diff) {
    type = type||"full";
    started = true;
    var i;
    if (activeFlowConfig.missingTypes.length > 0) {
        log.info(log._("nodes.flows.missing-types"));
        var knownUnknowns = 0;
        for (i=0;i<activeFlowConfig.missingTypes.length;i++) {
            var nodeType = activeFlowConfig.missingTypes[i];
            var info = deprecated.get(nodeType);
            if (info) {
                log.info(log._("nodes.flows.missing-type-provided",{type:activeFlowConfig.missingTypes[i],module:info.module}));
                knownUnknowns += 1;
            } else {
                log.info(" - "+activeFlowConfig.missingTypes[i]);
            }
        }
        if (knownUnknowns > 0) {
            log.info(log._("nodes.flows.missing-type-install-1"));
            log.info("  npm install <module name>");
            log.info(log._("nodes.flows.missing-type-install-2"));
            log.info("  "+settings.userDir);
        }
        return;
    }
    if (diff) {
        log.info(log._("nodes.flows.starting-modified-"+type));
    } else {
        log.info(log._("nodes.flows.starting-flows"));
    }
    var id;
    if (!diff) {
        activeFlows['_GLOBAL_'] = Flow.create(activeFlowConfig);
        for (id in activeFlowConfig.flows) {
            if (activeFlowConfig.flows.hasOwnProperty(id)) {
                activeFlows[id] = Flow.create(activeFlowConfig,activeFlowConfig.flows[id]);
            }
        }
    } else {
        activeFlows['_GLOBAL_'].update(activeFlowConfig,activeFlowConfig);
        for (id in activeFlowConfig.flows) {
            if (activeFlowConfig.flows.hasOwnProperty(id)) {
                if (activeFlows[id]) {
                    activeFlows[id].update(activeFlowConfig,activeFlowConfig.flows[id]);
                } else {
                    activeFlows[id] = Flow.create(activeFlowConfig,activeFlowConfig.flows[id]);
                }
            }
        }
    }

    for (id in activeFlows) {
        if (activeFlows.hasOwnProperty(id)) {
            activeFlows[id].start(diff);
            var activeNodes = activeFlows[id].getActiveNodes();
            Object.keys(activeNodes).forEach(function(nid) {
                activeNodesToFlow[nid] = id;
            });
        }
    }
    events.emit("nodes-started");
    if (diff) {
        log.info(log._("nodes.flows.started-modified-"+type));
    } else {
        log.info(log._("nodes.flows.started-flows"));
    }
}

function stop(type,diff) {
    type = type||"full";
    if (diff) {
        log.info(log._("nodes.flows.stopping-modified-"+type));
    } else {
        log.info(log._("nodes.flows.stopping-flows"));
    }
    started = false;
    var promises = [];
    var stopList;
    if (type === 'nodes') {
        stopList = diff.changed.concat(diff.removed);
    } else if (type === 'flows') {
        stopList = diff.changed.concat(diff.removed).concat(diff.linked);
    }
    for (var id in activeFlows) {
        if (activeFlows.hasOwnProperty(id)) {
            promises = promises.concat(activeFlows[id].stop(stopList));
            if (!diff || diff.removed[id]) {
                delete activeFlows[id];
            }
        }
    }

    return when.promise(function(resolve,reject) {
        when.settle(promises).then(function() {
            for (id in activeNodesToFlow) {
                if (activeNodesToFlow.hasOwnProperty(id)) {
                    if (!activeFlows[activeNodesToFlow[id]]) {
                        delete activeNodesToFlow[id];
                    }
                }
            }
            if (diff) {
                log.info(log._("nodes.flows.stopped-modified-"+type));
            } else {
                log.info(log._("nodes.flows.stopped-flows"));
            }
            resolve();
        });
    });
}




module.exports = {
    init: init,

    /**
     * Load the current flow configuration from storage
     * @return a promise for the loading of the config
     */
    load: load,

    get:getNode,
    eachNode: eachNode,

    /**
     * Gets the current flow configuration
     */
    getFlows: getConfig,

    /**
     * Sets the current active config.
     * @param config the configuration to enable
     * @param type the type of deployment to do: full (default), nodes, flows, load
     * @return a promise for the saving/starting of the new flow
     */
    setFlows: setConfig,

    /**
     * Starts the current flow configuration
     */
    startFlows: start,

    /**
     * Stops the current flow configuration
     * @return a promise for the stopping of the flow
     */
    stopFlows: stop,


    handleError: handleError,
    handleStatus: handleStatus
};
