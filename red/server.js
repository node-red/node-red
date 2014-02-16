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
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(redNodes.getNodeConfigs());
            res.end();
    });
    
    app.get("/flows",function(req,res) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(JSON.stringify(redNodes.getConfig()));
            res.end();
    });
    
    app.post("/flows",function(req,res) {
            var fullBody = '';
            req.on('data', function(chunk) {
                    fullBody += chunk.toString();
            });
            req.on('end', function() {
                    try { 
                        var flows = JSON.parse(fullBody);
                        storage.saveFlows(flows).then(function() {
                                res.writeHead(204, {'Content-Type': 'text/plain'});
                                res.end();
                                redNodes.setConfig(flows);
                        }).otherwise(function(err) {
                            util.log("[red] Error saving flows : "+err);
                            res.send(500, err.message);
                        });
                    } catch(err) {
                        util.log("[red] Error saving flows : "+err);
                        res.send(400, "Invalid flow");
                    }
            });
    });
}

function start() {
    storage.init(settings).then(function() {
        console.log("\nWelcome to Node-RED\n===================\n");
        util.log("[red] Loading palette nodes");
        util.log("------------------------------------------");
        redNodes.load(settings);
        util.log("");
        util.log('You may ignore any errors above here if they are for');
        util.log('nodes you are not using. The nodes indicated will not');
        util.log('be available in the main palette until any missing');
        util.log('modules are installed, typically by running:');
        util.log('   npm install {the module name}');
        util.log('or any other errors are resolved');
        util.log("------------------------------------------");
        
        storage.getFlows().then(function(flows) {
                if (flows.length > 0) {
                    redNodes.setConfig(flows);
                }
        }).otherwise(function(err) {
                util.log("[red] Error loading flows : "+err);
        });
    });
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
