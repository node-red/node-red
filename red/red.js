/**
 * Copyright 2013 IBM Corp.
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

var server = require("./server");
var nodes = require("./nodes");
var library = require("./library");
var comms = require("./comms");
var log = require("./log");
var util = require("./util");
var fs = require("fs");
var settings = require("./settings");
var credentials = require("./nodes/credentials");

var path = require('path');

process.env.NODE_RED_HOME = process.env.NODE_RED_HOME || path.resolve(__dirname+"/..");

var events = require("events");

var RED = {

    init: function(httpServer,userSettings) {
        userSettings.version = this.version();
        settings.init(userSettings);
        server.init(httpServer,settings);
        library.init();
        return server.app;
    },
    
    start: server.start,
    stop: server.stop,
    nodes: nodes,
    library: library,
    credentials: credentials,
    events: events,
    log: log,
    comms: comms,
    settings:settings,
    util: util,
    version: function () {
        var p = require(path.join(process.env.NODE_RED_HOME,"package.json"));
        if (fs.existsSync(path.join(process.env.NODE_RED_HOME,".git"))) {
            return p.version+".git";
        } else {
            return p.version;
        }
    }
};

RED.__defineGetter__("app", function() { console.log("Deprecated use of RED.app - use RED.httpAdmin instead"); return server.app });
RED.__defineGetter__("httpAdmin", function() { return server.app });
RED.__defineGetter__("httpNode", function() { return server.nodeApp });
RED.__defineGetter__("server", function() { return server.server });

module.exports = RED;
