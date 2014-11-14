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
var express = require('express');
var fs = require("fs");
var path = require("path");
var when = require('when');
var util = require('util');

var events = require("../events");
var redNodes = require("../nodes");
var comms = require("../comms");
var server = require("../server");

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
            res.json(info);
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
        var id = req.params.id;
        var removedNodes = [];
        try {
            var node = redNodes.getNodeInfo(id);
            var promise = null;
            if (!node) {
                var module = redNodes.getNodeModuleInfo(id);
                if (!module) {
                    res.send(404);
                    return;
                } else {
                    promise = server.uninstallModule(id);
                }
            } else {
                promise = when.resolve([redNodes.removeNode(id)]).then(server.reportRemovedModules);
            }
            
            promise.then(function(removedNodes) {
                res.json(removedNodes);
            }).otherwise(function(err) {
                res.send(400,err.toString());
            });
        } catch(err) {
            res.send(400,err.toString());
        }
    },
    
    get: function(req,res) {
        var id = req.params.id;
        var result = null;
        if (req.get("accept") == "application/json") {
            result = redNodes.getNodeInfo(id);
        } else {
            result = redNodes.getNodeConfig(id);
        }
        if (result) {
            res.send(result);
        } else {
            res.send(404);
        }
    },
    
    put: function(req,res) {
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
            var info;
            var id = req.params.id;
            var node = redNodes.getNodeInfo(id);
            if (!node) {
                res.send(404);
            } else if (!node.err && node.enabled === body.enabled) {
                res.json(node);
            } else {
                if (body.enabled) {
                    info = redNodes.enableNode(id);
                } else {
                    info = redNodes.disableNode(id);
                }
                if (info.enabled == body.enabled && !info.err) {
                    comms.publish("node/"+(body.enabled?"enabled":"disabled"),info,false);
                    util.log("[red] "+(body.enabled?"Enabled":"Disabled")+" node types:");
                    for (var i=0;i<info.types.length;i++) {
                        util.log("[red] - "+info.types[i]);
                    }
                } else if (body.enabled && info.err) {
                    util.log("[red] Failed to enable node:");
                    util.log("[red] - "+info.name+" : "+info.err);
                }
                res.json(info);
            }
        } catch(err) {
            res.send(400,err.toString());
        }            
    }
}
