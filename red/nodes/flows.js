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

var typeRegistry = require("./registry");
var credentials = require("./credentials");
var Flow = require("./Flow");
var log = require("../log");
var events = require("../events");
var redUtil = require("../util");
var storage = null;


var activeFlow = null;

var nodes = {};
var subflows = {};
var activeConfig = [];
var activeConfigNodes = {};

events.on('type-registered',function(type) {
    if (activeFlow) {
        activeFlow.typeRegistered(type);
        log.info("Missing type registered: "+type);
    }
});

var flowNodes = module.exports = {
    init: function(_storage) {
        storage = _storage;
    },
    
    /**
     * Load the current activeConfig from storage and start it running
     * @return a promise for the loading of the config
     */
    load: function() {
        return storage.getFlows().then(function(flows) {
            return credentials.load().then(function() {
                activeFlow = new Flow(flows);
                flowNodes.startFlows();
            });
        }).otherwise(function(err) {
            log.warn("Error loading flows : "+err);
            console.log(err.stack);
        });
    },
    
    /**
     * Get a node
     * @param i the node id
     * @return the node
     */
    get: function(i) {
        return activeFlow.getNode(i);
    },
    
    eachNode: function(cb) {
        activeFlow.eachNode(cb);
    },
    
    /**
     * @return the active configuration
     */
    getFlows: function() {
        return activeFlow.getFlow();
    },
    
    /**
     * Sets the current active config.
     * @param config the configuration to enable
     * @param type the type of deployment to do: full (default), nodes, flows
     * @return a promise for the starting of the new flow
     */
    setFlows: function (config,type) {
        
        type = type||"full";
        
        var credentialsChanged = false;
        
        var credentialSavePromise = null;
        
        
        // Clone config and extract credentials prior to saving
        // Original config needs to retain credentials so that flow.applyConfig
        // knows which nodes have had changes.
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
        if (type=="full") {
            return credentialSavePromise
                .then(function() { return storage.saveFlows(cleanConfig);})
                .then(function() { return flowNodes.stopFlows(); })
                .then(function() { activeFlow = new Flow(config); flowNodes.startFlows();});
        } else {
            return credentialSavePromise
                .then(function() { return storage.saveFlows(cleanConfig);})
                .then(function() { 
                    var configDiff = activeFlow.diffConfig(config,type);
                    return flowNodes.stopFlows(configDiff).then(function() {
                        activeFlow.parseConfig(config);
                        flowNodes.startFlows(configDiff);
                    });
                });
        }
    },
    startFlows: function(configDiff) {
        if (configDiff) {
            log.info("Starting modified "+configDiff.type);
        } else {
            log.info("Starting flows");
        }
        try {
            activeFlow.start(configDiff);
            if (configDiff) {
                log.info("Started modified "+configDiff.type);
            } else {
                log.info("Started flows");
            }
        } catch(err) {
            var missingTypes = activeFlow.getMissingTypes();
            if (missingTypes.length > 0) {
                log.info("Waiting for missing types to be registered:");
                for (var i=0;i<missingTypes.length;i++) {
                    log.info(" - "+missingTypes[i]);
                }
            }
        }
    },
    stopFlows: function(configDiff) {
        if (configDiff) {
            log.info("Stopping modified "+configDiff.type);
        } else {
            log.info("Stopping flows");
        }
        if (activeFlow) {
            return activeFlow.stop(configDiff).then(function() {
                if (configDiff) {
                    log.info("Stopped modified "+configDiff.type);
                } else {
                    log.info("Stopped flows");
                }
                return;
            });
        } else {
            log.info("Stopped");
            return;
        }
    },
    handleError: function(node,logMessage,msg) {
        activeFlow.handleError(node,logMessage,msg);
    }
};

var activeFlow = null;
