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

var fs = require('fs');
var util = require('util');
var createUI = require("./ui");
var redNodes = require("./nodes");
var host = require('os').hostname();

var app = null;
var server = null;

function createServer(_server,settings) {
    server = _server;
    app = createUI(settings);
    
    //TODO: relocated user dir
    var rulesfile = process.argv[2] || 'flows_'+host+'.json';
        
    app.get("/nodes",function(req,res) {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.write(redNodes.getNodeConfigs());
            res.end();
    });
    
    app.get("/flows",function(req,res) {
            fs.exists(rulesfile, function (exists) {
                    if (exists) {
                        res.sendfile(rulesfile);
                    } else {
                        res.writeHead(200, {'Content-Type': 'text/plain'});
                        res.write("[]");
                        res.end();
                    }
            });
    });
    
    app.post("/flows",function(req,res) {
            var fullBody = '';
            req.on('data', function(chunk) {
                    fullBody += chunk.toString();
            });
            req.on('end', function() {
                    res.writeHead(204, {'Content-Type': 'text/plain'});
                    res.end();
                    fs.writeFile(rulesfile, fullBody, function(err) {
                            if(err) {
                                util.log(err);
                            } else {
                                redNodes.setConfig(JSON.parse(fullBody));
                            }
                    });
            });
    });
    
    console.log("\nWelcome to Node-RED\n===================\n");
    util.log("[red] Loading palette nodes");
    util.log("------------------------------------------");
    redNodes.load();
    util.log("");
    util.log('You may ignore any errors above here if they are for');
    util.log('nodes you are not using. The nodes indicated will not');
    util.log('be available in the main palette until any missing');
    util.log('modules are installed, typically by running:');
    util.log('   npm install {the module name}');
    util.log('or any other errors are resolved');
    util.log("------------------------------------------");

    
    fs.exists(rulesfile, function (exists) {
            if (exists) {
                util.log("[red] Loading workspace flow : "+rulesfile);
                fs.readFile(rulesfile,'utf8',function(err,data) {
                        redNodes.setConfig(JSON.parse(data));
                });
            }
    });
    return app;
}
module.exports = { 
    init: createServer
}

module.exports.__defineGetter__("app", function() { return app });
module.exports.__defineGetter__("server", function() { return server });
