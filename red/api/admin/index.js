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

var express = require("express");

var nodes = require("./nodes");
var flows = require("./flows");
var flow = require("./flow");
var auth = require("../auth");

var apiUtil = require("../util");

module.exports = {
    init: function(runtime) {
        flows.init(runtime);
        flow.init(runtime);
        nodes.init(runtime);

        var needsPermission = auth.needsPermission;

        var adminApp = express();

        // Flows
        adminApp.get("/flows",needsPermission("flows.read"),flows.get,apiUtil.errorHandler);
        adminApp.post("/flows",needsPermission("flows.write"),flows.post,apiUtil.errorHandler);

        // Flow
        adminApp.get("/flow/:id",needsPermission("flows.read"),flow.get,apiUtil.errorHandler);
        adminApp.post("/flow",needsPermission("flows.write"),flow.post,apiUtil.errorHandler);
        adminApp.delete("/flow/:id",needsPermission("flows.write"),flow.delete,apiUtil.errorHandler);
        adminApp.put("/flow/:id",needsPermission("flows.write"),flow.put,apiUtil.errorHandler);

        // Nodes
        adminApp.get("/nodes",needsPermission("nodes.read"),nodes.getAll,apiUtil.errorHandler);
        adminApp.post("/nodes",needsPermission("nodes.write"),nodes.post,apiUtil.errorHandler);
        adminApp.get(/\/nodes\/((@[^\/]+\/)?[^\/]+)$/,needsPermission("nodes.read"),nodes.getModule,apiUtil.errorHandler);
        adminApp.put(/\/nodes\/((@[^\/]+\/)?[^\/]+)$/,needsPermission("nodes.write"),nodes.putModule,apiUtil.errorHandler);
        adminApp.delete(/\/nodes\/((@[^\/]+\/)?[^\/]+)$/,needsPermission("nodes.write"),nodes.delete,apiUtil.errorHandler);
        adminApp.get(/\/nodes\/((@[^\/]+\/)?[^\/]+)\/([^\/]+)$/,needsPermission("nodes.read"),nodes.getSet,apiUtil.errorHandler);
        adminApp.put(/\/nodes\/((@[^\/]+\/)?[^\/]+)\/([^\/]+)$/,needsPermission("nodes.write"),nodes.putSet,apiUtil.errorHandler);

        return adminApp;
    }
}
