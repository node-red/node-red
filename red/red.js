/**
 * Copyright 2013, 2015 IBM Corp.
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

var RED = {
    init: function(httpServer,userSettings) {
        server = httpServer;

        if (!userSettings.SKIP_BUILD_CHECK) {
            checkBuild();
        }
        runtime.init(httpServer,userSettings);
        if (userSettings.httpAdminRoot !== false || userSettings.httpNodeRoot !== false) {
            api.init(runtime);
            adminApp = api.adminApp();
            nodeApp = api.nodeApp();
        }

        if (adminApp === null) {
            adminApp = {
                get:function(){},
                post: function(){},
                put: function(){},
                delete: function(){}
            }
        }
        return runtime.app;
    },
    start: runtime.start,
    stop: runtime.stop,
    nodes: runtime.api,
    events: runtime.events,
    log: runtime.log,
    comms: runtime.comms,
    settings:runtime.settings,
    util: runtime.util,
    version: runtime.version,
    library: api.library,
    auth: api.auth,

    get app() { console.log("Deprecated use of RED.app - use RED.httpAdmin instead"); return runtime.app },
    get httpAdmin() { return adminApp },
    get httpNode() { return nodeApp },
    get server() { return server }
};

module.exports = RED;
