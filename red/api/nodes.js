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

var when = require("when");
var comms = require("./comms");
var locales = require("./locales");
var redNodes;
var log;
var i18n;
var settings;

module.exports = {
    init: function(runtime) {
        redNodes = runtime.nodes;
        log = runtime.log;
        i18n = runtime.i18n;
        settings = runtime.settings;
    },
    getAll: function(req,res) {
        if (req.get("accept") == "application/json") {
            log.audit({event: "nodes.list.get"},req);
            res.json(redNodes.getNodeList());
        } else {
            var lang = locales.determineLangFromHeaders(req.acceptsLanguages());
            log.audit({event: "nodes.configs.get"},req);
            res.send(redNodes.getNodeConfigs(lang));
        }
    },

    post: function(req,res) {
        if (!settings.available()) {
            log.audit({event: "nodes.install",error:"settings_unavailable"},req);
            res.status(400).json({error:"settings_unavailable", message:"Settings unavailable"});
            return;
        }
        var node = req.body;
        var promise;
        if (node.module) {
            var module = redNodes.getModuleInfo(node.module);
            if (module) {
                log.audit({event: "nodes.install",module:node.module,error:"module_already_loaded"},req);
                res.status(400).json({error:"module_already_loaded", message:"Module already loaded"});
                return;
            }
            promise = redNodes.installModule(node.module);
        } else {
            log.audit({event: "nodes.install",module:node.module,error:"invalid_request"},req);
            res.status(400).json({error:"invalid_request", message:"Invalid request"});
            return;
        }
        promise.then(function(info) {
            comms.publish("node/added",info.nodes,false);
            if (node.module) {
                log.audit({event: "nodes.install",module:node.module},req);
                res.json(info);
            }
        }).otherwise(function(err) {
            if (err.code === 404) {
                log.audit({event: "nodes.install",module:node.module,error:"not_found"},req);
                res.status(404).end();
            } else if (err.code) {
                log.audit({event: "nodes.install",module:node.module,error:err.code},req);
                res.status(400).json({error:err.code, message:err.message});
            } else {
                log.audit({event: "nodes.install",module:node.module,error:err.code||"unexpected_error",message:err.toString()},req);
                res.status(400).json({error:err.code||"unexpected_error", message:err.toString()});
            }
        });
    },

    delete: function(req,res) {
        if (!settings.available()) {
            log.audit({event: "nodes.remove",error:"settings_unavailable"},req);
            res.status(400).json({error:"settings_unavailable", message:"Settings unavailable"});
            return;
        }
        var mod = req.params[0];
        try {
            var promise = null;
            var module = redNodes.getModuleInfo(mod);
            if (!module) {
                log.audit({event: "nodes.remove",module:mod,error:"not_found"},req);
                res.status(404).end();
                return;
            } else {
                promise = redNodes.uninstallModule(mod);
            }

            promise.then(function(list) {
                comms.publish("node/removed",list,false);
                log.audit({event: "nodes.remove",module:mod},req);
                res.status(204).end();
            }).otherwise(function(err) {
                log.audit({event: "nodes.remove",module:mod,error:err.code||"unexpected_error",message:err.toString()},req);
                res.status(400).json({error:err.code||"unexpected_error", message:err.toString()});
            });
        } catch(err) {
            log.audit({event: "nodes.remove",module:mod,error:err.code||"unexpected_error",message:err.toString()},req);
            res.status(400).json({error:err.code||"unexpected_error", message:err.toString()});
        }
    },

    getSet: function(req,res) {
        var id = req.params[0] + "/" + req.params[2];
        var result = null;
        if (req.get("accept") === "application/json") {
            result = redNodes.getNodeInfo(id);
            if (result) {
                log.audit({event: "nodes.info.get",id:id},req);
                delete result.loaded;
                res.send(result);
            } else {
                log.audit({event: "nodes.info.get",id:id,error:"not_found"},req);
                res.status(404).end();
            }
        } else {
            var lang = locales.determineLangFromHeaders(req.acceptsLanguages());
            result = redNodes.getNodeConfig(id,lang);
            if (result) {
                log.audit({event: "nodes.config.get",id:id},req);
                res.send(result);
            } else {
                log.audit({event: "nodes.config.get",id:id,error:"not_found"},req);
                res.status(404).end();
            }
        }
    },

    getModule: function(req,res) {
        var module = req.params[0];
        var result = redNodes.getModuleInfo(module);
        if (result) {
            log.audit({event: "nodes.module.get",module:module},req);
            res.json(result);
        } else {
            log.audit({event: "nodes.module.get",module:module,error:"not_found"},req);
            res.status(404).end();
        }
    },

    putSet: function(req,res) {
        if (!settings.available()) {
            log.audit({event: "nodes.info.set",error:"settings_unavailable"},req);
            res.status(400).json({error:"settings_unavailable", message:"Settings unavailable"});
            return;
        }
        var body = req.body;
        if (!body.hasOwnProperty("enabled")) {
            log.audit({event: "nodes.info.set",error:"invalid_request"},req);
            res.status(400).json({error:"invalid_request", message:"Invalid request"});
            return;
        }
        var id = req.params[0] + "/" + req.params[2];
        try {
            var node = redNodes.getNodeInfo(id);
            var info;
            if (!node) {
                log.audit({event: "nodes.info.set",id:id,error:"not_found"},req);
                res.status(404).end();
            } else {
                delete node.loaded;
                putNode(node, body.enabled).then(function(result) {
                    log.audit({event: "nodes.info.set",id:id,enabled:body.enabled},req);
                    res.json(result);
                });
            }
        } catch(err) {
            log.audit({event: "nodes.info.set",id:id,enabled:body.enabled,error:err.code||"unexpected_error",message:err.toString()},req);
            res.status(400).json({error:err.code||"unexpected_error", message:err.toString()});
        }
    },

    putModule: function(req,res) {
        if (!settings.available()) {
            log.audit({event: "nodes.module.set",error:"settings_unavailable"},req);
            res.status(400).json({error:"settings_unavailable", message:"Settings unavailable"});
            return;
        }
        var body = req.body;
        if (!body.hasOwnProperty("enabled")) {
            log.audit({event: "nodes.module.set",error:"invalid_request"},req);
            res.status(400).json({error:"invalid_request", message:"Invalid request"});
            return;
        }
        var mod = req.params[0];
        try {
            var module = redNodes.getModuleInfo(mod);
            if (!module) {
                log.audit({event: "nodes.module.set",module:mod,error:"not_found"},req);
                return res.status(404).end();
            }

            var nodes = module.nodes;
            var promises = [];
            for (var i = 0; i < nodes.length; ++i) {
                promises.push(putNode(nodes[i],body.enabled));
            }
            when.settle(promises).then(function() {
                res.json(redNodes.getModuleInfo(mod));
            });
        } catch(err) {
            log.audit({event: "nodes.module.set",module:mod,enabled:body.enabled,error:err.code||"unexpected_error",message:err.toString()},req);
            res.status(400).json({error:err.code||"unexpected_error", message:err.toString()});
        }
    }
};

function putNode(node, enabled) {
    var info;
    var promise;
    if (!node.err && node.enabled === enabled) {
        promise = when.resolve(node);
    } else {
        if (enabled) {
            promise = redNodes.enableNode(node.id);
        } else {
            promise = redNodes.disableNode(node.id);
        }

        return promise.then(function(info) {
            if (info.enabled === enabled && !info.err) {
                comms.publish("node/"+(enabled?"enabled":"disabled"),info,false);
                log.info(" "+log._("api.nodes."+(enabled?"enabled":"disabled")));
                for (var i=0;i<info.types.length;i++) {
                    log.info(" - "+info.types[i]);
                }
            } else if (enabled && info.err) {
            log.warn(log._("api.nodes.error-enable"));
                log.warn(" - "+info.name+" : "+info.err);
            }
            return info;
        });
    }

    return promise;
}
