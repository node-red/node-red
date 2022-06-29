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

var runtimeAPI;
var apiUtils = require("../util");

module.exports = {
    init: function(_runtimeAPI) {
        runtimeAPI = _runtimeAPI;
    },
    get: function(req,res) {
        var version = req.get("Node-RED-API-Version")||"v1";
        if (!/^v[12]$/.test(version)) {
            return res.status(400).json({code:"invalid_api_version", message:"Invalid API Version requested"});
        }
        var opts = {
            user: req.user,
            req: apiUtils.getRequestLogObject(req)
        }
        runtimeAPI.flows.getFlows(opts).then(function(result) {
            if (version === "v1") {
                res.json(result.flows);
            } else if (version === "v2") {
                res.json(result);
            }
        }).catch(function(err) {
            apiUtils.rejectHandler(req,res,err);
        })
    },
    post: function(req,res) {
        var version = req.get("Node-RED-API-Version")||"v1";
        if (!/^v[12]$/.test(version)) {
            return res.status(400).json({code:"invalid_api_version", message:"Invalid API Version requested"});
        }
        var opts = {
            user: req.user,
            deploymentType: req.get("Node-RED-Deployment-Type")||"full",
            req: apiUtils.getRequestLogObject(req)
        }

        if (opts.deploymentType !== 'reload') {
            if (version === "v1") {
                opts.flows = {flows: req.body}
            } else {
                opts.flows = req.body;
            }
        }

        runtimeAPI.flows.setFlows(opts).then(function(result) {
            if (version === "v1") {
                res.status(204).end();
            } else {
                res.json(result);
            }
        }).catch(function(err) {
            apiUtils.rejectHandler(req,res,err);
        })
    },
    getState: function(req,res) {
        const opts = {
            user: req.user,
            req: apiUtils.getRequestLogObject(req)
        }
        runtimeAPI.flows.getState(opts).then(function(result) {
            res.json(result);
        }).catch(function(err) {
            apiUtils.rejectHandler(req,res,err);
        })
    },
    postState: function(req,res) {
        const opts = {
            user: req.user,
            state: req.body.state || "",
            req: apiUtils.getRequestLogObject(req)
        }
        runtimeAPI.flows.setState(opts).then(function(result) {
            res.json(result);
        }).catch(function(err) {
            apiUtils.rejectHandler(req,res,err);
        })
    }
}
