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
        log.audit({event: "flows.get"},req);
        res.json(redNodes.getFlows());
    },
    post: function(req,res) {
        var flows = req.body;
        var deploymentType = req.get("Node-RED-Deployment-Type")||"full";
        log.audit({event: "flows.set",type:deploymentType},req);
        if (deploymentType === 'reload') {
            redNodes.loadFlows().then(function() {
                res.status(204).end();
            }).otherwise(function(err) {
                log.warn(log._("api.flows.error-reload",{message:err.message}));
                log.warn(err.stack);
                res.status(500).json({error:"unexpected_error", message:err.message});
            });
        } else {
            redNodes.setFlows(flows,deploymentType).then(function() {
                res.status(204).end();
            }).otherwise(function(err) {
                log.warn(log._("api.flows.error-save",{message:err.message}));
                log.warn(err.stack);
                res.status(500).json({error:"unexpected_error", message:err.message});
            });
        }
    }
}
