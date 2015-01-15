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

var util = require("util");
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
        if (activeFlow.typeRegistered(type)) {
            util.log("[red] Missing type registered: "+type);
        }
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
            util.log("[red] Error loading flows : "+err);
            console.log(err.stack);
        });
    },
    
    /**
     * Add a node to the current active set
     * @param n the node to add
     */
    add: function(n) {
        //console.log("ADDED NODE:",n.id,n.type,n.name||"");
        n.on("log",log.log);
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
     * Stops all active nodes and clears the active set
     * @return a promise for the stopping of all active nodes
     */
    //clear: function(nodesToStop) {
    //    var stopList;
    //    if (nodesToStop == null) {
    //        stopList = Object.keys(nodes);
    //    } else {
    //        stopList = Object.keys(nodesToStop);
    //    }
    //    console.log(stopList);
    //    return when.promise(function(resolve) {
    //        events.emit("nodes-stopping");
    //        var promises = [];
    //        console.log("running nodes:",Object.keys(nodes).length);
    //        for (var i=0;i<stopList.length;i++) {
    //            var node = nodes[stopList[i]];
    //            if (node) {
    //                try {
    //                    var p = node.close();
    //                    if (p) {
    //                        promises.push(p);
    //                    }
    //                } catch(err) {
    //                    node.error(err);
    //                }
    //                delete nodes[stopList[i]];
    //                delete activeConfigNodes[stopList[i]];
    //            }
    //        }
    //        console.log("running nodes:",Object.keys(nodes).length);
    //        when.settle(promises).then(function() {
    //            events.emit("nodes-stopped");
    //            resolve();
    //        });
    //    });
    //},

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
        
        config.forEach(function(node) {
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
                    .then(function() { return storage.saveFlows(config);})
                    .then(function() { return flowNodes.stopFlows(); })
                    .then(function() { activeFlow = new Flow(config); flowNodes.startFlows();});
        } else {
            return credentialSavePromise
                    .then(function() { return storage.saveFlows(config);})
                    .then(function() { return activeFlow.applyConfig(config,type); });
        }
    },
    startFlows: function() {
        util.log("[red] Starting flows");
        try {
            activeFlow.start();
        } catch(err) {
            var missingTypes = activeFlow.getMissingTypes();
            if (missingTypes.length > 0) {
                util.log("[red] Waiting for missing types to be registered:");
                for (var i=0;i<missingTypes.length;i++) {
                    util.log("[red]  - "+missingTypes[i]);
                }
            }
        }
        
    },
    stopFlows: function() {
        util.log("[red] Stopping flows");
        return activeFlow.stop();
    }
};

var activeFlow = null;

