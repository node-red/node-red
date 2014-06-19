/**
 * Copyright 2014 IBM Corp.
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
var when = require("when");
 
var typeRegistry = require("./registry");
var credentials = require("./credentials");
var log = require("../log");
var events = require("../events");

var storage = null;

var nodes = {};
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


var parseConfig = function() {
    missingTypes = [];
    for (var i in activeConfig) {
        var type = activeConfig[i].type;
        // TODO: remove workspace in next release+1
        if (type != "workspace" && type != "tab") {
            var nt = typeRegistry.get(type);
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
            var nt = typeRegistry.get(activeConfig[i].type);
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
    credentials.clean(flowNodes.get);
    events.emit("nodes-started");
}


function stopFlows() {
    if (activeConfig&&activeConfig.length > 0) {
        util.log("[red] Stopping flows");
    }
    return flowNodes.clear();
}

var flowNodes = module.exports = {
    init: function(_storage) {
        storage = _storage;
    },
    load: function() {
        return storage.getFlows().then(function(flows) {
            return credentials.load().then(function() {
                activeConfig = flows;
                if (activeConfig && activeConfig.length > 0) {
                    parseConfig();
                }
            });
        }).otherwise(function(err) {
            util.log("[red] Error loading flows : "+err);
        });
    },
    add: function(n) {
        nodes[n.id] = n;
        n.on("log",log.log);
    },
    get: function(i) {
        return nodes[i];
    },
    clear: function() {
        return when.promise(function(resolve) {
            events.emit("nodes-stopping");
            var promises = [];
            for (var n in nodes) {
                try {
                    var p = nodes[n].close();
                    if (p) {
                        promises.push(p);
                    }
                } catch(err) {
                    nodes[n].error(err);
                }
            }
            when.settle(promises).then(function() {
                events.emit("nodes-stopped");
                nodes = {};
                resolve();
            });
        });
    },
    each: function(cb) {
        for (var n in nodes) {
            cb(nodes[n]);
        }
    },
    addLogHandler: function(handler) {
        logHandlers.push(handler);
    },
    
    getFlows: function() {
        return activeConfig;
    },
    setFlows: function(conf) {
        return storage.saveFlows(conf).then(function() {
            return stopFlows().then(function() {
                activeConfig = conf;
                parseConfig();
            });
        })
    },
    stopFlows: stopFlows
}
