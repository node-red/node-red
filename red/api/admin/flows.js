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

var log;
var redNodes;
var settings;

module.exports = {
    init: function(runtime) {
        settings = runtime.settings;
        redNodes = runtime.nodes;
        log = runtime.log;
    },
    get: function(req,res) {
        var version = req.get("Node-RED-API-Version")||"v1";
        if (version === "v1") {
            log.audit({event: "flows.get",version:"v1"},req);
            res.json(redNodes.getFlows().flows);
        } else if (version === "v2") {
            log.audit({event: "flows.get",version:"v2"},req);
            res.json(redNodes.getFlows());
        } else {
            log.audit({event: "flows.get",version:version,error:"invalid_api_version"},req);
            res.status(400).json({code:"invalid_api_version", message:"Invalid API Version requested"});
        }
    },
    post: function(req,res) {
        var version = req.get("Node-RED-API-Version")||"v1";
        if (!/^v[12]$/.test(version)) {
            log.audit({event: "flows.set",version:version,error:"invalid_api_version"},req);
            res.status(400).json({code:"invalid_api_version", message:"Invalid API Version requested"});
            return;
        }
        var flows = req.body;
        var deploymentType = req.get("Node-RED-Deployment-Type")||"full";
        log.audit({event: "flows.set",type:deploymentType,version:version},req);
        if (deploymentType === 'reload') {
            redNodes.loadFlows().then(function(flowId) {
                if (version === "v1") {
                    res.status(204).end();
                } else {
                    res.json({rev:flowId});
                }
            }).otherwise(function(err) {
                log.warn(log._("api.flows.error-reload",{message:err.message}));
                log.warn(err.stack);
                res.status(500).json({error:"unexpected_error", message:err.message});
            });
        } else {
            var flowConfig = flows;
            if (version === "v2") {
                flowConfig = flows.flows;
                if (flows.hasOwnProperty('rev')) {
                    var currentVersion = redNodes.getFlows().rev;
                    if (currentVersion !== flows.rev) {
                        //TODO: log warning
                        return res.status(409).json({code:"version_mismatch"});
                    }
                }
            }
            redNodes.setFlows(flowConfig,deploymentType).then(function(flowId) {
                if (version === "v1") {
                    res.status(204).end();
                } else if (version === "v2") {
                    res.json({rev:flowId});
                }
            }).otherwise(function(err) {
                log.warn(log._("api.flows.error-save",{message:err.message}));
                log.warn(err.stack);
                res.status(500).json({error:"unexpected_error", message:err.message});
            });
        }
    }
}
