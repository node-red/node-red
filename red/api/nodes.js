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
var express = require('express');
var fs = require("fs");
var path = require("path");
var when = require('when');

var events = require("../events");
var redNodes = require("../nodes");
var comms = require("../comms");
var server = require("../server");
var log = require("../log");

var settings = require("../settings");

module.exports = {
    getAll: function(req,res) {
        if (req.get("accept") == "application/json") {
            res.json(redNodes.getNodeList());
        } else {
            res.send(redNodes.getNodeConfigs());
        }
    },

    post: function(req,res) {
        if (!settings.available()) {
            res.send(400,new Error("Settings unavailable").toString());
            return;
        }
        var node = req.body;
        var promise;
        if (node.file) {
            promise = redNodes.addNode(node.file).then(server.reportAddedModules);
        } else if (node.module) {
            var module = redNodes.getNodeModuleInfo(node.module);
            if (module) {
                res.send(400,"Module already loaded");
                return;
            }
            promise = server.installModule(node.module);
        } else {
            res.send(400,"Invalid request");
            return;
        }
        promise.then(function(info) {
            res.json(redNodes.getModuleInfo(node.module));
        }).otherwise(function(err) {
            if (err.code === 404) {
                res.send(404);
            } else {
                res.send(400,err.toString());
            }
        });
    },

    delete: function(req,res) {
        if (!settings.available()) {
            res.send(400,new Error("Settings unavailable").toString());
            return;
        }
        var mod = req.params.mod;
        try {
            var promise = null;
            var module = redNodes.getNodeModuleInfo(mod);
            if (!module) {
                res.send(404);
                return;
            } else {
                promise = server.uninstallModule(mod);
            }

            promise.then(function() {
                res.send(204);
            }).otherwise(function(err) {
                res.send(400,err.toString());
            });
        } catch(err) {
            res.send(400,err.toString());
        }
    },

    getSet: function(req,res) {
        var id = req.params.mod + "/" + req.params.set;
        var result = null;
        if (req.get("accept") === "application/json") {
            result = redNodes.getNodeInfo(id);
            if (result) {
                result.version = redNodes.getModuleVersion(req.params.mod);
            }
        } else {
            result = redNodes.getNodeConfig(id);
        }
        if (result) {
            res.send(result);
        } else {
            res.send(404);
        }
    },

    getModule: function(req,res) {
        var module = req.params.mod;
        var result = redNodes.getModuleInfo(module);
        if (result) {
            res.send(result);
        } else {
            // check if module is actually a node-set
            var matching = getMatchingNodes(module);
            if (matching.length > 0) {
                res.json(matching);
            } else {
                res.send(404);
            }
        }
    },

    putSet: function(req,res) {
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
            var id = req.params.mod + "/" + req.params.set;
            var node = redNodes.getNodeInfo(id);
            var info;
            if (!node) {
                res.send(404);
            } else {
                res.json(putNode(node, body.enabled));
            }
        } catch(err) {
            res.send(400,err.toString());
        }
    },

    putModule: function(req,res) {
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
            var mod = req.params.mod;
            var module = redNodes.getModuleInfo(mod);
            if (!module) {
                var matching = getMatchingNodes(mod);
                if (matching.length === 1) {
                    // One match, assume correct
                    res.json(putNode(matching[0], body.enabled));
                    return;
                } else if (matching.length > 1) {
                    // Multiple matches, need clarification
                    result = {
                        multipleMatches: true,
                        matches: matching
                    };
                    res.json(result);
                    return;
                } else {
                    // Doesn't exist
                    res.send(404);
                    return;
                }
            }

            var nodes = module.nodes;
            for (var i = 0; i < nodes.length; ++i) {
                var node = nodes[i];
                var info;
                if (node.err || node.enabled !== body.enabled) {
                    if (body.enabled) {
                        info = redNodes.enableNode(node.id);
                    } else {
                        info = redNodes.disableNode(node.id);
                    }
                    if (info.enabled === body.enabled && !info.err) {
                        comms.publish("node/"+(body.enabled?"enabled":"disabled"),info,false);
                        log.info(" "+(body.enabled?"Enabled":"Disabled")+" node types:");
                        for (var j = 0; j < info.types.length; j++) {
                            log.info(" - " + info.types[j]);
                        }
                    } else if (body.enabled && info.err) {
                        log.warn("Failed to enable node:");
                        log.warn(" - "+info.name+" : "+info.err);
                    }
                }
            }
            res.json(redNodes.getModuleInfo(mod));
        } catch(err) {
            res.send(400,err.toString());
        }
    }
};

function getMatchingNodes(node) {
    var nodes = redNodes.getNodeList();
    var matching = [];

    nodes.forEach(function(n) {
        if (n.name === node) {
            n.version = redNodes.getModuleVersion(n.module);
            matching.push(n);
        }
    });

    return matching;
}

function putNode(node, enabled) {
    var info;

    if (!node.err && node.enabled === enabled) {
        info = node;
    } else {
        if (enabled) {
            info = redNodes.enableNode(node.id);
        } else {
            info = redNodes.disableNode(node.id);
        }

        if (info.enabled === enabled && !info.err) {
            comms.publish("node/"+(enabled?"enabled":"disabled"),info,false);
            log.info(" "+(enabled?"Enabled":"Disabled")+" node types:");
            for (var i=0;i<info.types.length;i++) {
                log.info(" - "+info.types[i]);
            }
        } else if (enabled && info.err) {
            log.warn("Failed to enable node:");
            log.warn(" - "+info.name+" : "+info.err);
        }
    }

    return info;
}
