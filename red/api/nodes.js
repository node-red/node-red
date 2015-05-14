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
            log.audit({event: "nodes.list.get"},req);
            res.json(redNodes.getNodeList());
        } else {
            log.audit({event: "nodes.configs.get"},req);
            res.send(redNodes.getNodeConfigs());
        }
    },

    post: function(req,res) {
        if (!settings.available()) {
            log.audit({event: "nodes.install",error:"settings_unavailable"},req);
            res.json(400,{error:"settings_unavailable", message:"Settings unavailable"});
            return;
        }
        var node = req.body;
        var promise;
        if (node.module) {
            var module = redNodes.getModuleInfo(node.module);
            if (module) {
                log.audit({event: "nodes.install",module:node.module,error:"module_already_loaded"},req);
                res.json(400,{error:"module_already_loaded", message:"Module already loaded"});
                return;
            }
            promise = server.installModule(node.module);
        } else {
            log.audit({event: "nodes.install",module:node.module,error:"invalid_request"},req);
            res.json(400,{error:"invalid_request", message:"Invalid request"});
            return;
        }
        promise.then(function(info) {
            log.audit({event: "nodes.install",module:node.module},req);
            res.json(redNodes.getModuleInfo(node.module));
        }).otherwise(function(err) {
            if (err.code === 404) {
                log.audit({event: "nodes.install",module:node.module,error:"not_found"},req);
                res.send(404);
            } else {
                log.audit({event: "nodes.install",module:node.module,error:err.code||"unexpected_error",message:err.toString()},req);
                res.json(400,{error:err.code||"unexpected_error", message:err.toString()});
            }
        });
    },

    delete: function(req,res) {
        if (!settings.available()) {
            log.audit({event: "nodes.remove",error:"settings_unavailable"},req);
            res.json(400,{error:"settings_unavailable", message:"Settings unavailable"});
            return;
        }
        var mod = req.params.mod;
        try {
            var promise = null;
            var module = redNodes.getModuleInfo(mod);
            if (!module) {
                log.audit({event: "nodes.remove",module:mod,error:"not_found"},req);
                res.send(404);
                return;
            } else {
                promise = server.uninstallModule(mod);
            }

            promise.then(function() {
                log.audit({event: "nodes.remove",module:mod},req);
                res.send(204);
            }).otherwise(function(err) {
                log.audit({event: "nodes.remove",module:mod,error:err.code||"unexpected_error",message:err.toString()},req);
                res.json(400,{error:err.code||"unexpected_error", message:err.toString()});
            });
        } catch(err) {
            log.audit({event: "nodes.remove",module:mod,error:err.code||"unexpected_error",message:err.toString()},req);
            res.json(400,{error:err.code||"unexpected_error", message:err.toString()});
        }
    },

    getSet: function(req,res) {
        var id = req.params.mod + "/" + req.params.set;
        var result = null;
        if (req.get("accept") === "application/json") {
            result = redNodes.getNodeInfo(id);
            if (result) {
                log.audit({event: "nodes.info.get",id:id},req);
                delete result.loaded;
                res.send(result);
            } else {
                log.audit({event: "nodes.info.get",id:id,error:"not_found"},req);
                res.send(404);
            }
        } else {
            result = redNodes.getNodeConfig(id);
            if (result) {
                log.audit({event: "nodes.config.get",id:id},req);
                res.send(result);
            } else {
                log.audit({event: "nodes.config.get",id:id,error:"not_found"},req);
                res.send(404);
            }
        }
    },

    getModule: function(req,res) {
        var module = req.params.mod;
        var result = redNodes.getModuleInfo(module);
        if (result) {
            log.audit({event: "nodes.module.get",module:module},req);
            res.json(result);
        } else {
            log.audit({event: "nodes.module.get",module:module,error:"not_found"},req);
            res.send(404);
        }
    },

    putSet: function(req,res) {
        if (!settings.available()) {
            log.audit({event: "nodes.info.set",error:"settings_unavailable"},req);
            res.json(400,{error:"settings_unavailable", message:"Settings unavailable"});
            return;
        }
        var body = req.body;
        if (!body.hasOwnProperty("enabled")) {
            log.audit({event: "nodes.info.set",error:"invalid_request"},req);
            res.json(400,{error:"invalid_request", message:"Invalid request"});
            return;
        }
        try {
            var id = req.params.mod + "/" + req.params.set;
            var node = redNodes.getNodeInfo(id);
            var info;
            if (!node) {
                log.audit({event: "nodes.info.set",id:id,error:"not_found"},req);
                res.send(404);
            } else {
                delete node.loaded;
                var result = putNode(node, body.enabled);
                log.audit({event: "nodes.info.set",id:id,enabled:body.enabled},req);
                res.json(result);
            }
        } catch(err) {
            log.audit({event: "nodes.info.set",id:id,enabled:body.enabled,error:err.code||"unexpected_error",message:err.toString()},req);
            res.json(400,{error:err.code||"unexpected_error", message:err.toString()});
        }
    },

    putModule: function(req,res) {
        if (!settings.available()) {
            log.audit({event: "nodes.module.set",error:"settings_unavailable"},req);
            res.json(400,{error:"settings_unavailable", message:"Settings unavailable"});
            return;
        }
        var body = req.body;
        if (!body.hasOwnProperty("enabled")) {
            log.audit({event: "nodes.module.set",error:"invalid_request"},req);
            res.json(400,{error:"invalid_request", message:"Invalid request"});
            return;
        }
        try {
            var mod = req.params.mod;
            var module = redNodes.getModuleInfo(mod);
            if (!module) {
                log.audit({event: "nodes.module.set",module:mod,error:"not_found"},req);
                return res.send(404);
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
            log.audit({event: "nodes.module.set",module:mod,enabled:body.enabled,error:err.code||"unexpected_error",message:err.toString()},req);
            res.json(400,{error:err.code||"unexpected_error", message:err.toString()});
        }
    }
};

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
