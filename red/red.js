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

var fs = require("fs");
var path = require('path');

var runtime = require("./runtime");
var api = require("./api");

process.env.NODE_RED_HOME = process.env.NODE_RED_HOME || path.resolve(__dirname+"/..");

var nodeApp = null;
var adminApp = null;
var server = null;
var apiEnabled = false;

function checkVersion(userSettings) {
    var semver = require('semver');
    if (!semver.satisfies(process.version,">=4.0.0")) {
        // TODO: in the future, make this a hard error.
        // var e = new Error("Unsupported version of node.js");
        // e.code = "unsupported_version";
        // throw e;
        userSettings.UNSUPPORTED_VERSION = process.version;
    }
}

function checkBuild() {
    var editorFile = path.resolve(path.join(__dirname,"..","public","red","red.min.js"));
    try {
        var stats = fs.statSync(editorFile);
    } catch(err) {
        var e = new Error("Node-RED not built");
        e.code = "not_built";
        throw e;
    }
}

module.exports = {
    init: function(httpServer,userSettings) {
        if (!userSettings) {
            userSettings = httpServer;
            httpServer = null;
        }

        if (!userSettings.SKIP_BUILD_CHECK) {
            checkVersion(userSettings);
            checkBuild();
        }

        if (!userSettings.coreNodesDir) {
            userSettings.coreNodesDir = path.resolve(path.join(__dirname,"..","nodes"));
        }

        if (userSettings.httpAdminRoot !== false) {
            runtime.init(userSettings,api);
            api.init(httpServer,runtime);
            apiEnabled = true;
        } else {
            runtime.init(userSettings);
            apiEnabled = false;
        }
        adminApp = runtime.adminApi.adminApp;
        nodeApp = runtime.nodeApp;
        server = runtime.adminApi.server;
        return;
    },
    start: function() {
        return runtime.start().then(function() {
            if (apiEnabled) {
                return api.start();
            }
        });
    },
    stop: function() {
        return runtime.stop().then(function() {
            if (apiEnabled) {
                return api.stop();
            }
        })
    },
    nodes: runtime.nodes,
    log: runtime.log,
    settings:runtime.settings,
    util: runtime.util,
    version: runtime.version,

    comms: api.comms,
    library: api.library,
    auth: api.auth,

    get app() { console.log("Deprecated use of RED.app - use RED.httpAdmin instead"); return runtime.app },
    get httpAdmin() { return adminApp },
    get httpNode() { return nodeApp },
    get server() { return server }
};
