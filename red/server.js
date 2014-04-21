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

var express = require('express');
var util = require('util');
var when = require('when');

var createUI = require("./ui");
var redNodes = require("./nodes");

var app = null;
var nodeApp = null;
var server = null;
var settings = null;
var storage = null;

function createServer(_server,_settings) {
    server = _server;
    settings = _settings;
    storage = require("./storage");
    app = createUI(settings);
    nodeApp = express();
    
    flowfile = settings.flowFile || 'flows_'+require('os').hostname()+'.json';
    
    app.get("/nodes",function(req,res) {
        res.json(redNodes.getNodeConfigs());
    });
    
    app.get("/flows",function(req,res) {
        res.json(redNodes.getConfig());
    });
    
    app.post("/flows",
        express.json(),
        function(req,res) {
            var flows = req.body;
            storage.saveFlows(flows).then(function() {
                    res.json(204);
                    redNodes.setConfig(flows);
            }).otherwise(function(err) {
                util.log("[red] Error saving flows : "+err);
                res.send(500,err.message);
            });
        },
        function(error,req,res,next) {
            res.send(400,"Invalid Flow");
        }
    );
}

function start() {
    var RED = require("./red");
    var defer = when.defer();
    
    storage.init(settings).then(function() {
        console.log("\nWelcome to Node-RED\n===================\n");
        util.log("[red] Version: "+RED.version());
        util.log("[red] Loading palette nodes");
        var nodeErrors = redNodes.load(settings);
        if (nodeErrors.length > 0) {
            util.log("------------------------------------------");
            if (settings.verbose) {
                for (var i=0;i<nodeErrors.length;i+=1) {
                    util.log("["+nodeErrors[i].fn+"] "+nodeErrors[i].err);
                }
            } else {
                util.log("[red] Failed to register "+nodeErrors.length+" node type"+(nodeErrors.length==1?"":"s"));
                util.log("[red] Run with -v for details");
            }
            util.log("------------------------------------------");
        }
        defer.resolve();
        storage.getFlows().then(function(flows) {
                if (flows.length > 0) {
                    redNodes.setConfig(flows);
                }
        }).otherwise(function(err) {
                util.log("[red] Error loading flows : "+err);
        });
    });
    
    return defer.promise;
}

function stop() {
    redNodes.stopFlows();
}

module.exports = { 
    init: createServer,
    start: start,
    stop: stop
}

module.exports.__defineGetter__("app", function() { return app });
module.exports.__defineGetter__("nodeApp", function() { return nodeApp });
module.exports.__defineGetter__("server", function() { return server });
